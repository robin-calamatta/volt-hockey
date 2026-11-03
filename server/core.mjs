/* Volt Hockey online services: accounts, saved preferences and progress, the global leaderboard, friends, direct messages and invites.
   Runs as one Netlify Function (netlify/functions/api.mjs, data in Netlify Blobs) or locally (server/dev-server.mjs, data in files).
   Realtime things (parties, lobby / game chat, voice) go straight between players over WebRTC and never touch this server.

   store: { get(key) -> object | null, set(key, object), del(key), list(prefix) -> [key] }   (JSON documents by key)
   Keys:  u/<name>            one player: password hash, age group, preferences, progress, friends, invites, presence
          s/<sha256(token)>   a login session
          dm/<a>~<b>          the messages between two friends (names sorted), newest 100
          lb                  the leaderboard: name -> career totals
          r/<time>-<rand>     a report, for a moderator to read

   Age: players declare their age when they sign up. Only "adult" (18+) or not is kept. Under-18 players can only text or voice chat with
   accepted friends: the game enforces that in rooms and parties, and direct messages are friends-only for everyone anyway. */
import crypto from 'node:crypto';
import ChatFilter from '../src/chatfilter.js';                  // the same filter the game uses (a plain script that also works as a module)

const LIMITS = { nameMin: 3, nameMax: 16, passMin: 6, passMax: 100, prefsBytes: 20000, progressBytes: 150000, dmKeep: 100, dmMax: 300, onlineMs: 30000, sessionDays: 120,
  inviteMs: 120000, friendsMax: 200, lbKeep: 2000, lbShow: 50, failMax: 8, lockMs: 10 * 60 * 1000, msgGapMs: 700 };
const NAME_RE = /^[A-Za-z0-9_]+$/;

const sha = t => crypto.createHash('sha256').update(String(t)).digest('hex');
const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => e ? rej(e) : res(k.toString('hex'))));
const key = name => 'u/' + String(name).toLowerCase();
const pairKey = (a, b) => 'dm/' + [a.toLowerCase(), b.toLowerCase()].sort().join('~');
const now = () => Date.now();
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (msg, status = 400) => { throw new HttpError(status, msg); };
const str = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';

export function createApi(store) {
  const getUser = name => name ? store.get(key(name)) : null;
  const saveUser = u => store.set(key(u.name), u);
  const online = u => !!u && now() - (u.lastSeen || 0) < LIMITS.onlineMs;
  const me = u => ({ name: u.name, adult: !!u.adult, created: u.created });

  async function auth(headers) {
    const h = headers.authorization || headers.Authorization || '', token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
    if (!token) bad('Please log in.', 401);
    const s = await store.get('s/' + sha(token));
    if (!s || now() - s.created > LIMITS.sessionDays * 864e5) bad('Your login has expired. Please log in again.', 401);
    const u = await getUser(s.user); if (!u) bad('Account not found.', 401);
    return { u, tokenKey: 's/' + sha(token) };
  }
  async function newSession(u) { const token = crypto.randomBytes(32).toString('hex'); await store.set('s/' + sha(token), { user: u.name, created: now() }); return token; }

  /* ---- accounts ---- */
  async function register(b) {
    const name = str(b.username, 40).trim(), pass = str(b.password, LIMITS.passMax + 1), age = Math.floor(+b.age);
    if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax || !NAME_RE.test(name)) bad(`Usernames are ${LIMITS.nameMin}-${LIMITS.nameMax} letters, numbers or _.`);
    if (!ChatFilter.ok(name)) bad('Please choose a different username.');
    if (pass.length < LIMITS.passMin || pass.length > LIMITS.passMax) bad(`Passwords are at least ${LIMITS.passMin} characters.`);
    if (!(age >= 5 && age <= 120)) bad('Please enter your age.');
    if (await getUser(name)) bad('That username is taken.', 409);
    const salt = crypto.randomBytes(16).toString('hex');
    const u = { name, salt, hash: await scrypt(pass, salt), adult: age >= 18, created: now(), prefs: null, progress: null, friends: {}, blocked: [], invites: [], unread: {}, lastSeen: now(), status: null };
    await saveUser(u);
    return { token: await newSession(u), user: me(u) };
  }
  async function login(b) {
    const u = await getUser(str(b.username, 40).trim()), pass = str(b.password, LIMITS.passMax + 1);
    if (!u) bad('Wrong username or password.', 401);
    if (u.lockUntil && u.lockUntil > now()) bad('Too many tries. Please wait a few minutes.', 429);
    if (await scrypt(pass, u.salt) !== u.hash) {
      u.failed = (u.failed || 0) + 1; if (u.failed >= LIMITS.failMax) { u.failed = 0; u.lockUntil = now() + LIMITS.lockMs; }
      await saveUser(u); bad('Wrong username or password.', 401);
    }
    u.failed = 0; u.lockUntil = 0; u.lastSeen = now(); await saveUser(u);
    return { token: await newSession(u), user: me(u), prefs: u.prefs, progress: u.progress };
  }
  async function changePassword(u, b) {
    if (await scrypt(str(b.old, LIMITS.passMax + 1), u.salt) !== u.hash) bad('Your current password is wrong.', 403);
    const pass = str(b.password, LIMITS.passMax + 1); if (pass.length < LIMITS.passMin) bad(`Passwords are at least ${LIMITS.passMin} characters.`);
    u.salt = crypto.randomBytes(16).toString('hex'); u.hash = await scrypt(pass, u.salt); await saveUser(u); return { ok: true };
  }

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
      const on = online(f); friends.push({ name: f.name, online: on, status: on ? f.status : null, adult: !!f.adult });
    }
    friends.sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
    return { me: me(u), friends, incoming, outgoing, invites: u.invites, unread: u.unread || {}, blocked: u.blocked || [] };
  }
  async function displayName(k) { const f = await store.get('u/' + k); return f ? f.name : k; }

  async function report(u, b) {
    await store.set('r/' + now() + '-' + crypto.randomBytes(3).toString('hex'), { by: u.name, about: str(b.username, 40), where: str(b.where, 40), text: str(b.text, 500), at: now() });
    return { ok: true };
  }

  /* ---- routing ---- */
  const routes = {
    'POST /register': (b) => register(b), 'POST /login': (b) => login(b),
    'POST /logout': async (b, q, h) => { const { tokenKey } = await auth(h); await store.del(tokenKey); return { ok: true }; },
    'GET /me': async (b, q, h) => { const { u } = await auth(h); return { user: me(u), prefs: u.prefs, progress: u.progress }; },
    'POST /password': async (b, q, h) => changePassword((await auth(h)).u, b),
    'PUT /prefs': async (b, q, h) => putPrefs((await auth(h)).u, b), 'PUT /progress': async (b, q, h) => putProgress((await auth(h)).u, b),
    'GET /leaderboard': () => leaderboard(), 'GET /profile': (b, q) => profile(q.name),
    'POST /sync': async (b, q, h) => sync((await auth(h)).u, b),
    'POST /friends/request': async (b, q, h) => friendRequest((await auth(h)).u, b), 'POST /friends/accept': async (b, q, h) => acceptFriend((await auth(h)).u, b),
    'POST /friends/remove': async (b, q, h) => removeFriend((await auth(h)).u, b),
    'POST /block': async (b, q, h) => block((await auth(h)).u, b, true), 'POST /unblock': async (b, q, h) => block((await auth(h)).u, b, false),
    'GET /dm': async (b, q, h) => getDm((await auth(h)).u, q), 'POST /dm': async (b, q, h) => sendDm((await auth(h)).u, b),
    'POST /invite': async (b, q, h) => invite((await auth(h)).u, b), 'POST /invite/dismiss': async (b, q, h) => dismissInvite((await auth(h)).u, b),
    'POST /report': async (b, q, h) => report((await auth(h)).u, b)
  };
  /* handle(method, path after /api, query object, body object, headers object) -> { status, body } */
  return async function handle(method, path, query, body, headers) {
    const fn = routes[method + ' ' + path.replace(/\/+$/, '')];
    if (!fn) return { status: 404, body: { error: 'Not found' } };
    try { return { status: 200, body: await fn(body || {}, query || {}, headers || {}) }; }
    catch (e) { if (e instanceof HttpError) return { status: e.status, body: { error: e.message } }; console.error(e); return { status: 500, body: { error: 'Server error' } }; }
  };
}
