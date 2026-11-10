/* Volt Hockey online services: accounts, saved preferences and progress, the global leaderboard, friends, direct messages and invites.
   Runs as one Netlify Function (netlify/functions/api.mjs, data in Netlify Blobs) or locally (server/dev-server.mjs, data in files).
   Realtime things (parties, lobby / game chat, voice) go straight between players over WebRTC and never touch this server.

   store: { get(key) -> object | null, set(key, object), del(key), list(prefix) -> [key] }   (JSON documents by key)
   Keys:  u/<name>            one player: password hash, age group, preferences, progress, friends, invites, presence
          s/<sha256(token)>   a login session
          dm/<a>~<b>          the messages between two friends (names sorted), newest 100
          lb                  the leaderboard: name -> career totals
          r/<time>-<rand>     a report, for a moderator to read
          names               every username (for the friend search as you type), with whether they are 18+
          e/<sha256(email)>   which account an email address belongs to (for "forgot password")
          pr/<sha256(token)>  a password-reset link, valid for 30 minutes

   Age: players declare their age when they sign up. Only "adult" (18+) or not is kept. Under-18 players can only text or voice chat with
   accepted friends: the game enforces that in rooms and parties, and direct messages are friends-only for everyone anyway.
   Email: every account has one, used only to send a password-reset link (opts.sendEmail; see netlify/functions/api.mjs). */
import crypto from 'node:crypto';
import ChatFilter from '../src/chatfilter.js';                  // the same filter the game uses (a plain script that also works as a module)

const LIMITS = { nameMin: 3, nameMax: 16, passMin: 6, passMax: 100, prefsBytes: 20000, progressBytes: 150000, dmKeep: 100, dmMax: 300, onlineMs: 30000, sessionDays: 120,
  inviteMs: 120000, friendsMax: 200, lbKeep: 2000, lbShow: 50, failMax: 8, lockMs: 10 * 60 * 1000, msgGapMs: 700, resetMs: 30 * 60 * 1000, resetGapMs: 60 * 1000, emailMax: 120 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const emailKey = e => 'e/' + crypto.createHash('sha256').update(String(e).trim().toLowerCase()).digest('hex');
const maskEmail = e => { const [a, d] = String(e).split('@'); return a ? a[0] + '•••' + (a.length > 1 ? a[a.length - 1] : '') + '@' + d : ''; };
const NAME_RE = /^[A-Za-z0-9_]+$/;

const sha = t => crypto.createHash('sha256').update(String(t)).digest('hex');
const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => e ? rej(e) : res(k.toString('hex'))));
const key = name => 'u/' + String(name).toLowerCase();
const pairKey = (a, b) => 'dm/' + [a.toLowerCase(), b.toLowerCase()].sort().join('~');
const now = () => Date.now();
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (msg, status = 400) => { throw new HttpError(status, msg); };
const str = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';

export function createApi(store, opts = {}) {
  /* TURN_CREDENTIALS_URL: a URL that returns an iceServers list, e.g. Metered's free Open Relay
     (https://<yourapp>.metered.live/api/v1/turn/credentials?apiKey=...). Fetched here so the key stays on the server; kept for 30 minutes. */
  let turnCache = { at: 0, list: [] };
  async function turnCredentials() {
    const url = typeof opts.turnUrl === 'function' ? opts.turnUrl() : opts.turnUrl; if (!url) return [];
    if (now() - turnCache.at < 30 * 60 * 1000) return turnCache.list;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(4000) }); const j = await r.json();
      const list = (Array.isArray(j) ? j : Array.isArray(j.iceServers) ? j.iceServers : []).filter(x => x && x.urls).slice(0, 8);
      turnCache = { at: now(), list }; return list;
    } catch (e) { console.error('TURN credentials:', e.message); return turnCache.list; }
  }
  const iceServers = () => { try { return JSON.parse((typeof opts.ice === 'function' ? opts.ice() : opts.ice) || 'null'); } catch (e) { return null; } };   // TURN relay for voice / parties on strict networks (ICE_SERVERS)
  const sendEmail = opts.sendEmail || null, siteUrl = () => (typeof opts.siteUrl === 'function' ? opts.siteUrl() : opts.siteUrl) || '';
  const getUser = name => name ? store.get(key(name)) : null;
  const saveUser = u => store.set(key(u.name), u);
  const online = u => !!u && now() - (u.lastSeen || 0) < LIMITS.onlineMs;
  const me = u => ({ name: u.name, adult: !!u.adult, br: canBR(u), created: u.created, email: u.email ? maskEmail(u.email) : '' });
  const GAME_DEFAULTS = { brThird: true };
  const canBR = u => !!(u && (u.adult || u.over16 || u.brOk));   // Volt Royale: 16 or over, or let in by an admin (v14)

  async function auth(headers) {
    const h = headers.authorization || headers.Authorization || '', token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
    if (!token) bad('Please log in.', 401);
    const s = await store.get('s/' + sha(token));
    if (!s || now() - s.created > LIMITS.sessionDays * 864e5) bad('Your login has expired. Please log in again.', 401);
    const u = await getUser(s.user); if (!u) bad('Account not found.', 401);
    if ((s.epoch || 0) !== (u.epoch || 0)) bad('Your password was changed. Please log in again.', 401);   // a password reset logs out every device
    if (u.banned) bad('This account is suspended.', 403);
    return { u, tokenKey: 's/' + sha(token) };
  }
  async function newSession(u) { const token = crypto.randomBytes(32).toString('hex'); await store.set('s/' + sha(token), { user: u.name, created: now(), epoch: u.epoch || 0 }); return token; }
  function checkEmail(e) { const email = str(e, LIMITS.emailMax + 1).trim(); if (!EMAIL_RE.test(email) || email.length > LIMITS.emailMax) bad('Please enter a valid email address.'); return email; }
  async function claimEmail(u, email) {                          // one account per email address
    const k = emailKey(email), owner = await store.get(k);
    if (owner && owner.user.toLowerCase() !== u.name.toLowerCase()) bad('That email is already used by another account.', 409);
    if (u.email && emailKey(u.email) !== k) await store.del(emailKey(u.email));
    await store.set(k, { user: u.name }); u.email = email;
  }

  /* ---- accounts ---- */
  async function register(b) {
    const name = str(b.username, 40).trim(), pass = str(b.password, LIMITS.passMax + 1), age = Math.floor(+b.age);
    if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax || !NAME_RE.test(name)) bad(`Usernames are ${LIMITS.nameMin}-${LIMITS.nameMax} letters, numbers or _.`);
    if (!ChatFilter.ok(name)) bad('Please choose a different username.');
    if (pass.length < LIMITS.passMin || pass.length > LIMITS.passMax) bad(`Passwords are at least ${LIMITS.passMin} characters.`);
    if (!(age >= 5 && age <= 120)) bad('Please enter your age.');
    const legal = str(b.legal, 40).trim(); if (!legal) bad('Please confirm your age is real and agree to the EULA and Privacy Notice.');   // v14.1.7: the sign-up agreement is required and recorded
    const email = checkEmail(b.email);
    if (await getUser(name)) bad('That username is taken.', 409);
    const taken = await store.get(emailKey(email)); if (taken) bad('That email is already used by another account.', 409);
    const salt = crypto.randomBytes(16).toString('hex');
    const u = { name, salt, hash: await scrypt(pass, salt), adult: age >= 18, over16: age >= 16, created: now(), prefs: null, progress: null, friends: {}, blocked: [], invites: [], unread: {}, lastSeen: now(), status: null, legal: { v: legal, at: now() } };
    await claimEmail(u, email); await saveUser(u);
    const idx = await names(); idx[name.toLowerCase()] = { n: name, a: u.adult ? 1 : 0 }; await store.set('names', idx);
    return { token: await newSession(u), user: me(u) };
  }
  async function login(b) {
    const who = str(b.username, 120).trim(), pass = str(b.password, LIMITS.passMax + 1);
    let u = who.includes('@') ? null : await getUser(who.slice(0, 40));
    if (!u && who.includes('@')) { const e = await store.get(emailKey(who)); u = e ? await getUser(e.user) : null; }   // log in with your email too
    if (!u) bad('Wrong username or password.', 401);
    if (u.banned) bad('This account is suspended.', 403);
    if (u.lockUntil && u.lockUntil > now()) bad('Too many tries. Please wait a few minutes.', 429);
    if (await scrypt(pass, u.salt) !== u.hash) {
      u.failed = (u.failed || 0) + 1; if (u.failed >= LIMITS.failMax) { u.failed = 0; u.lockUntil = now() + LIMITS.lockMs; }
      await saveUser(u); bad('Wrong username or password.', 401);
    }
    u.failed = 0; u.lockUntil = 0; u.lastSeen = now(); await saveUser(u);
    return { token: await newSession(u), user: me(u), prefs: u.prefs, progress: u.progress };
  }
  async function setEmail(u, b) {                                  // add or change your email (your password confirms it is you)
    if (await scrypt(str(b.password, LIMITS.passMax + 1), u.salt) !== u.hash) bad('Your password is wrong.', 403);
    await claimEmail(u, checkEmail(b.email)); await saveUser(u); return { ok: true, user: me(u) };
  }
  /* Forgot password: send a link with a one-time code to the account's email. The answer is the same whether or not the account exists. */
  async function requestReset(b) {
    if (!sendEmail) bad("Password reset by email isn't set up on this server yet. Ask the site owner.", 503);
    const who = str(b.who, 140).trim(); if (!who) bad('Enter your username or email.');
    let u = who.includes('@') ? null : await getUser(who);
    if (!u && who.includes('@')) { const e = await store.get(emailKey(who)); u = e ? await getUser(e.user) : null; }
    if (u && u.email && now() - (u.lastReset || 0) > LIMITS.resetGapMs) {
      const token = crypto.randomBytes(24).toString('hex'); u.lastReset = now(); await saveUser(u);
      await store.set('pr/' + sha(token), { user: u.name, created: now() });
      const link = (siteUrl() || str(b.origin, 200)).replace(/\/+$/, '') + '/?reset=' + token;
      try {
        await sendEmail({ to: u.email, subject: 'Reset your Volt Hockey password', text: `Hi ${u.name},\n\nSomeone (hopefully you) asked to reset your Volt Hockey password. Open this link within 30 minutes to choose a new one:\n\n${link}\n\nIf it wasn't you, you can ignore this email; your password stays the same.`,
          html: `<p>Hi ${u.name},</p><p>Someone (hopefully you) asked to reset your Volt Hockey password. Open this link within 30 minutes to choose a new one:</p><p><a href="${link}">Choose a new password</a></p><p>If it wasn't you, you can ignore this email; your password stays the same.</p>` });
      } catch (e) { console.error('email failed', e); bad('The reset email could not be sent. Please try again later.', 502); }
    }
    return { ok: true };
  }
  async function confirmReset(b) {
    const k = 'pr/' + sha(str(b.token, 100)), r = await store.get(k);
    if (!r || now() - r.created > LIMITS.resetMs) bad('This reset link has expired. Ask for a new one.', 410);
    const pass = str(b.password, LIMITS.passMax + 1); if (pass.length < LIMITS.passMin) bad(`Passwords are at least ${LIMITS.passMin} characters.`);
    const u = await getUser(r.user); if (!u) bad('Account not found.', 404);
    u.salt = crypto.randomBytes(16).toString('hex'); u.hash = await scrypt(pass, u.salt); u.epoch = (u.epoch || 0) + 1; u.failed = 0; u.lockUntil = 0;
    await saveUser(u); await store.del(k);
    return { token: await newSession(u), user: me(u), prefs: u.prefs, progress: u.progress };
  }
  async function changePassword(u, b) {
    if (await scrypt(str(b.old, LIMITS.passMax + 1), u.salt) !== u.hash) bad('Your current password is wrong.', 403);
    const pass = str(b.password, LIMITS.passMax + 1); if (pass.length < LIMITS.passMin) bad(`Passwords are at least ${LIMITS.passMin} characters.`);
    u.salt = crypto.randomBytes(16).toString('hex'); u.hash = await scrypt(pass, u.salt); await saveUser(u); return { ok: true };
  }
  // (changing your password keeps this device logged in; a reset by email logs out every device)

  /* ---- preferences and progress (career totals, the current season, the hall of fame) ---- */
  async function putPrefs(u, b) {
    const json = JSON.stringify(b.prefs || {}); if (json.length > LIMITS.prefsBytes) bad('Preferences too large.', 413);
    u.prefs = JSON.parse(json); await saveUser(u); return { ok: true };
  }
  async function putProgress(u, b) {
    const p = { career: b.career || null, season: b.season || null, history: Array.isArray(b.history) ? b.history.slice(-60) : [] }, json = JSON.stringify(p);
    if (json.length > LIMITS.progressBytes) bad('Progress too large.', 413);
    u.progress = JSON.parse(json); await saveUser(u);
    await updateLeaderboard(u);
    return { ok: true };
  }
  const num = (v, max = 1e7) => Math.max(0, Math.min(max, Math.floor(+v) || 0));
  async function updateLeaderboard(u) {
    const c = (u.progress && u.progress.career) || {}, h = (u.progress && u.progress.history) || [];
    const row = { name: u.name, games: num(c.games), wins: num(c.wins), goals: num(c.goals), shots: num(c.shots), cups: num(c.cups), seasons: num(h.length, 9999), at: now() };
    const lb = (await store.get('lb')) || {}; lb[u.name.toLowerCase()] = row;
    const rows = Object.values(lb); if (rows.length > LIMITS.lbKeep) { rows.sort((a, b) => (b.cups - a.cups) || (b.wins - a.wins)); for (const r of rows.slice(LIMITS.lbKeep)) delete lb[r.name.toLowerCase()]; }
    await store.set('lb', lb);
  }
  async function leaderboard() {
    const rows = Object.values((await store.get('lb')) || {}), top = (f, min = 0) => rows.filter(r => r.games >= min).sort((a, b) => f(b) - f(a) || b.games - a.games).slice(0, LIMITS.lbShow);
    return { cups: top(r => r.cups), wins: top(r => r.wins), goals: top(r => r.goals), winPct: top(r => r.games ? r.wins / r.games : 0, 10).map(r => ({ ...r, pct: Math.round(100 * r.wins / r.games) })), players: rows.length };
  }
  async function names() {                                        // the username index (rebuilt from the accounts if it is missing)
    let idx = await store.get('names'); if (idx) return idx; idx = {};
    for (const k of await store.list('u/')) { const u = await store.get(k); if (u) idx[u.name.toLowerCase()] = { n: u.name, a: u.adult ? 1 : 0 }; }
    await store.set('names', idx); return idx;
  }
  /* Friend search: usernames starting with (then containing) what you typed. Under-18 players only show up for an exact match. */
  async function search(u, q) {
    const t = str(q.q, 20).trim().toLowerCase(); if (t.length < 1) return { users: [] };
    const idx = await names(), mine = u.name.toLowerCase(), blocked = u.blocked || [], out = [];
    const ok = (k, v) => k !== mine && !blocked.includes(k) && (v.a || k === t);
    for (const [k, v] of Object.entries(idx)) if (k.startsWith(t) && ok(k, v)) out.push(v.n);
    if (out.length < 8) for (const [k, v] of Object.entries(idx)) if (!k.startsWith(t) && k.includes(t) && ok(k, v)) out.push(v.n);
    return { users: out.slice(0, 8).map(n => ({ name: n, friend: (u.friends || {})[n.toLowerCase()] || '' })) };
  }
  async function profile(name) {
    const u = await getUser(name); if (!u) bad('No player with that name.', 404);
    const c = (u.progress && u.progress.career) || {};
    return { name: u.name, created: u.created, career: { games: num(c.games), wins: num(c.wins), goals: num(c.goals), shots: num(c.shots), cups: num(c.cups) }, seasons: ((u.progress && u.progress.history) || []).length };
  }

  /* ---- friends ---- */
  const isFriend = (u, other) => u.friends && u.friends[other.toLowerCase()] === 'friends';
  async function other(name) { const o = await getUser(str(name, 40).trim()); if (!o) bad('No player with that name.', 404); return o; }
  async function friendRequest(u, b) {
    const o = await other(b.username); if (o.name === u.name) bad("That's you!");
    const k = o.name.toLowerCase(), mk = u.name.toLowerCase();
    if ((o.blocked || []).includes(mk)) return { ok: true };                     // quietly: a blocked player cannot tell they are blocked
    if (Object.keys(u.friends).length >= LIMITS.friendsMax) bad('Your friends list is full.');
    if (u.friends[k] === 'friends') return { ok: true, status: 'friends' };
    if (u.friends[k] === 'in') return acceptFriend(u, b);                         // they already asked you: that's a yes
    u.friends[k] = 'out'; o.friends = o.friends || {}; o.friends[mk] = 'in';
    await saveUser(u); await saveUser(o); return { ok: true, status: 'out' };
  }
  async function acceptFriend(u, b) {
    const o = await other(b.username), k = o.name.toLowerCase(), mk = u.name.toLowerCase();
    if (u.friends[k] !== 'in') bad('No friend request from that player.');
    u.friends[k] = 'friends'; o.friends = o.friends || {}; o.friends[mk] = 'friends';
    await saveUser(u); await saveUser(o); return { ok: true, status: 'friends' };
  }
  async function removeFriend(u, b) {                                             // also declines a request or cancels yours
    const o = await other(b.username), k = o.name.toLowerCase(), mk = u.name.toLowerCase();
    delete u.friends[k]; if (o.friends) delete o.friends[mk];
    await saveUser(u); await saveUser(o); return { ok: true };
  }
  async function block(u, b, on) {
    const o = await other(b.username), k = o.name.toLowerCase(); u.blocked = (u.blocked || []).filter(x => x !== k);
    if (on) { u.blocked.push(k); delete u.friends[k]; if (o.friends) { delete o.friends[u.name.toLowerCase()]; await saveUser(o); } }
    await saveUser(u); return { ok: true };
  }

  /* ---- direct messages (friends only) ---- */
  async function sendDm(u, b) {
    const o = await other(b.to); if (!isFriend(u, o.name)) bad('You can only message friends.', 403);
    const text = ChatFilter.clean(str(b.text, LIMITS.dmMax)).trim(); if (!text) bad('Empty message.');
    if (now() - (u.lastMsgAt || 0) < LIMITS.msgGapMs) bad('Slow down a little.', 429);
    u.lastMsgAt = now(); await saveUser(u);
    const k = pairKey(u.name, o.name), log = (await store.get(k)) || { msgs: [] }, msg = { from: u.name, text, at: now() };
    log.msgs.push(msg); log.msgs = log.msgs.slice(-LIMITS.dmKeep); await store.set(k, log);
    o.unread = o.unread || {}; o.unread[u.name.toLowerCase()] = (o.unread[u.name.toLowerCase()] || 0) + 1; await saveUser(o);
    return { ok: true, msg };
  }
  async function getDm(u, q) {
    const o = await other(q.with); if (!isFriend(u, o.name)) bad('You can only message friends.', 403);
    const after = +q.after || 0, log = (await store.get(pairKey(u.name, o.name))) || { msgs: [] };
    if (u.unread && u.unread[o.name.toLowerCase()]) { delete u.unread[o.name.toLowerCase()]; await saveUser(u); }
    return { msgs: log.msgs.filter(m => m.at > after) };
  }

  /* ---- invites to a party or a room (friends only) ---- */
  async function invite(u, b) {
    const o = await other(b.to); if (!isFriend(u, o.name)) bad('You can only invite friends.', 403);
    const kind = b.kind === 'room' ? 'room' : 'party', code = str(b.code, 80).replace(/[^A-Za-z0-9_-]/g, ''); if (!code) bad('Nothing to invite to.');
    o.invites = (o.invites || []).filter(i => now() - i.at < LIMITS.inviteMs && !(i.from === u.name && i.kind === kind));
    o.invites.push({ id: crypto.randomBytes(6).toString('hex'), from: u.name, kind, code, at: now() }); await saveUser(o); return { ok: true };
  }
  async function dismissInvite(u, b) { u.invites = (u.invites || []).filter(i => i.id !== b.id); await saveUser(u); return { ok: true }; }

  /* ---- presence: the game calls this every few seconds while you are logged in ---- */
  async function sync(u, b) {
    const st = b.status || {};
    u.lastSeen = now(); u.status = { where: str(st.where, 20), room: str(st.room, 12), party: str(st.party, 80), open: !!st.open, peer: str(st.peer, 80) };
    u.invites = (u.invites || []).filter(i => now() - i.at < LIMITS.inviteMs); await saveUser(u);
    const friends = [], incoming = [], outgoing = [];
    for (const [k, rel] of Object.entries(u.friends || {})) {
      if (rel === 'in') { incoming.push(await displayName(k)); continue; } if (rel === 'out') { outgoing.push(await displayName(k)); continue; }
      const f = await store.get('u/' + k); if (!f) continue;
      const on = online(f); friends.push({ name: f.name, online: on, status: on ? f.status : null, adult: !!f.adult, ago: f.lastSeen ? Math.max(0, now() - f.lastSeen) : null });   // ago: how long since they were last online (ms)
    }
    friends.sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
    return { me: me(u), friends, incoming, outgoing, invites: u.invites, unread: u.unread || {}, blocked: u.blocked || [] };
  }
  async function displayName(k) { const f = await store.get('u/' + k); return f ? f.name : k; }

  async function report(u, b) {
    await store.set('r/' + now() + '-' + crypto.randomBytes(3).toString('hex'), { by: u.name, about: str(b.username, 40), where: str(b.where, 40), text: str(b.text, 500), at: now() });
    return { ok: true };
  }

  /* ---- the admin pages (admin.html). Log in with ADMIN_USER / ADMIN_PASSWORD (set in Netlify); you get a signed pass for 12 hours. ---- */
  const adminCreds = () => (typeof opts.admin === 'function' ? opts.admin() : opts.admin) || {};
  const sign = (payload, secret) => crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  async function adminLogin(b) {
    const { user, pass } = adminCreds(); if (!user || !pass) bad('The admin login is not set up. Add ADMIN_USER and ADMIN_PASSWORD in Netlify (Site configuration > Environment variables) and redeploy.', 503);
    const f = (await store.get('admin/fails')) || { n: 0, until: 0 }; if (f.until > now()) bad('Too many tries. Wait 10 minutes.', 429);
    const same = (x, y) => { const a = Buffer.from(String(x)), c = Buffer.from(String(y)); return a.length === c.length && crypto.timingSafeEqual(a, c); };
    if (!same(str(b.user, 200), user) || !same(str(b.pass, 200), pass)) { f.n++; if (f.n >= 10) { f.n = 0; f.until = now() + 10 * 60 * 1000; } await store.set('admin/fails', f); bad('Wrong admin username or password.', 401); }
    await store.set('admin/fails', { n: 0, until: 0 });
    const payload = Buffer.from(JSON.stringify({ exp: now() + 12 * 3600 * 1000 })).toString('base64url');
    return { token: payload + '.' + sign(payload, pass + user) };
  }
  function adminAuth(h) {
    const { user, pass } = adminCreds(), t = String(h['x-admin-token'] || ''), [payload, mac] = t.split('.');
    if (!user || !pass || !payload || !mac || sign(payload, pass + user) !== mac) bad('Admin login needed.', 401);
    let exp = 0; try { exp = JSON.parse(Buffer.from(payload, 'base64url').toString()).exp; } catch (e) { exp = 0; } if (exp < now()) bad('Admin login expired. Log in again.', 401);
  }
  const strip = u => { if (!u) return null; const { hash, salt, ...rest } = u; return rest; };
  const row = u => { const c = (u.progress && u.progress.career) || {}; return { name: u.name, email: u.email || '', adult: !!u.adult, over16: !!(u.adult || u.over16), brOk: !!u.brOk, br: canBR(u), banned: !!u.banned, created: u.created, lastSeen: u.lastSeen, friends: Object.values(u.friends || {}).filter(x => x === 'friends').length, games: c.games || 0, wins: c.wins || 0, goals: c.goals || 0, cups: c.cups || 0 }; };
  const admin = {
    'GET /admin/stats': async () => { const idx = await names(), reports = await store.list('r/'); return { players: Object.keys(idx).length, reports: reports.length, leaderboard: Object.keys((await store.get('lb')) || {}).length }; },
    'GET /admin/users': async (b, q) => {
      const t = str(q.q, 60).trim().toLowerCase(), idx = await names(), keys = Object.keys(idx).filter(k => !t || k.includes(t)).sort().slice(0, 200), out = [];
      for (const k of keys) { const u = await store.get('u/' + k); if (u && (!t || k.includes(t) || (u.email || '').toLowerCase().includes(t))) out.push(row(u)); }
      return { users: out, total: Object.keys(idx).length };
    },
    'GET /admin/user': async (b, q) => { const u = await getUser(q.name); if (!u) bad('No such player.', 404); return { user: strip(u) }; },
    'POST /admin/user': async (b) => {                          // change age group, suspend, email or career totals
      const u = await getUser(b.name); if (!u) bad('No such player.', 404); const p = b.patch || {};
      if ('adult' in p) u.adult = !!p.adult; if ('brOk' in p) u.brOk = !!p.brOk; if ('over16' in p) u.over16 = !!p.over16; if ('banned' in p) { u.banned = !!p.banned; if (u.banned) u.epoch = (u.epoch || 0) + 1; }
      if (p.email) await claimEmail(u, checkEmail(p.email));
      if (p.career && typeof p.career === 'object') { u.progress = u.progress || {}; u.progress.career = Object.fromEntries(Object.entries(p.career).map(([k, v]) => [k, num(v)])); }
      await saveUser(u); const idx = await names(); idx[u.name.toLowerCase()] = { n: u.name, a: u.adult ? 1 : 0 }; await store.set('names', idx); await updateLeaderboard(u);
      return { user: strip(u) };
    },
    'POST /admin/user/password': async (b) => { const u = await getUser(b.name); if (!u) bad('No such player.', 404); const pass = str(b.password, LIMITS.passMax + 1); if (pass.length < LIMITS.passMin) bad(`At least ${LIMITS.passMin} characters.`); u.salt = crypto.randomBytes(16).toString('hex'); u.hash = await scrypt(pass, u.salt); u.epoch = (u.epoch || 0) + 1; await saveUser(u); return { ok: true }; },
    'POST /admin/user/delete': async (b) => {                   // removes the account, its email, its leaderboard row and it from everyone's friends
      const u = await getUser(b.name); if (!u) bad('No such player.', 404); const k = u.name.toLowerCase();
      for (const f of Object.keys(u.friends || {})) { const o = await store.get('u/' + f); if (o && o.friends && o.friends[k]) { delete o.friends[k]; await store.set('u/' + f, o); } }
      if (u.email) await store.del(emailKey(u.email)); await store.del('u/' + k);
      const idx = await names(); delete idx[k]; await store.set('names', idx); const lb = (await store.get('lb')) || {}; delete lb[k]; await store.set('lb', lb);
      return { ok: true };
    },
    'GET /admin/reports': async () => { const keys = (await store.list('r/')).sort().reverse().slice(0, 300), out = []; for (const k of keys) out.push({ key: k, ...(await store.get(k)) }); return { reports: out }; },
    'GET /admin/keys': async (b, q) => ({ keys: (await store.list(str(q.prefix, 100))).sort().slice(0, 1000) }),
    'GET /admin/raw': async (b, q) => ({ key: q.key, value: await store.get(str(q.key, 300)) }),
    'PUT /admin/raw': async (b) => { const k = str(b.key, 300); if (!k) bad('No key.'); await store.set(k, b.value); return { ok: true }; },
    'POST /admin/raw/delete': async (b) => { await store.del(str(b.key, 300)); return { ok: true }; },
    /* v14.2.6: game-wide switches (the Game tab). brThird: third person allowed in Volt Royale */
    'GET /admin/game': async () => ({ game: { ...GAME_DEFAULTS, ...((await store.get('cfg/game')) || {}) } }),
    'POST /admin/game': async (b) => { const cur = { ...GAME_DEFAULTS, ...((await store.get('cfg/game')) || {}) }; for (const k of Object.keys(GAME_DEFAULTS)) if (typeof b[k] === 'boolean') cur[k] = b[k]; await store.set('cfg/game', cur); return { game: cur }; }
  };

  /* ---- routing ---- */
  const routes = {
    'POST /register': (b) => register(b), 'POST /login': (b) => login(b),
    'POST /logout': async (b, q, h) => { const { tokenKey } = await auth(h); await store.del(tokenKey); return { ok: true }; },
    'GET /me': async (b, q, h) => { const { u } = await auth(h); return { user: me(u), prefs: u.prefs, progress: u.progress }; },
    'POST /password': async (b, q, h) => changePassword((await auth(h)).u, b), 'POST /email': async (b, q, h) => setEmail((await auth(h)).u, b),
    'POST /reset/request': (b) => requestReset(b), 'POST /reset/confirm': (b) => confirmReset(b),
    'PUT /prefs': async (b, q, h) => putPrefs((await auth(h)).u, b), 'PUT /progress': async (b, q, h) => putProgress((await auth(h)).u, b),
    'GET /ice': async () => ({ iceServers: [...(iceServers() || []), ...(await turnCredentials())] }),
    'GET /game': async () => ({ game: { ...GAME_DEFAULTS, ...((await store.get('cfg/game')) || {}) } }),   // (v14.2.6: game-wide switches the admin sets)
    'GET /leaderboard': () => leaderboard(), 'GET /profile': (b, q) => profile(q.name), 'GET /search': async (b, q, h) => search((await auth(h)).u, q),
    'POST /sync': async (b, q, h) => sync((await auth(h)).u, b),
    'POST /friends/request': async (b, q, h) => friendRequest((await auth(h)).u, b), 'POST /friends/accept': async (b, q, h) => acceptFriend((await auth(h)).u, b),
    'POST /friends/remove': async (b, q, h) => removeFriend((await auth(h)).u, b),
    'POST /block': async (b, q, h) => block((await auth(h)).u, b, true), 'POST /unblock': async (b, q, h) => block((await auth(h)).u, b, false),
    'GET /dm': async (b, q, h) => getDm((await auth(h)).u, q), 'POST /dm': async (b, q, h) => sendDm((await auth(h)).u, b),
    'POST /invite': async (b, q, h) => invite((await auth(h)).u, b), 'POST /invite/dismiss': async (b, q, h) => dismissInvite((await auth(h)).u, b),
    'POST /report': async (b, q, h) => report((await auth(h)).u, b)
  };
  /* handle(method, path after /api, query object, body object, headers object) -> { status, body } */
  for (const [k, fn] of Object.entries(admin)) routes[k] = async (b, q, h) => { adminAuth(h); return fn(b, q, h); };
  routes['POST /admin/login'] = b => adminLogin(b);
  return async function handle(method, path, query, body, headers) {
    const fn = routes[method + ' ' + path.replace(/\/+$/, '')];
    if (!fn) return { status: 404, body: { error: 'Not found' } };
    try { return { status: 200, body: await fn(body || {}, query || {}, headers || {}) }; }
    catch (e) { if (e instanceof HttpError) return { status: e.status, body: { error: e.message } }; console.error(method, path, e); return { status: 500, body: { error: 'Server error: ' + String(e && e.message || e).slice(0, 200) } }; }   // the reason helps when setting up (full details in Netlify's function log)
  };
}
