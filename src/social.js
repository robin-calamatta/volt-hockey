/* Friends, invites and parties.
   Social    talks to the online services every few seconds while you are logged in: who of your friends is online and where, friend requests,
             invites, unread messages. It also says where YOU are, so friends can see you and join your room.
   Party     a group of friends who stick together: the leader hosts a room and everyone in the party is taken into it, each still able to
             bring local players on their own controllers. Party members talk to each other over WebRTC (PeerJS), like online rooms do.
   Toasts    small notices in the corner (friend requests, invites, messages) with buttons. */

/* The online room you are in right now (HostSession or ClientSession), for chat, voice and your status. Set by net.js. */
const Online = {
  current: null,
  set(session) { this.current = session; if (typeof Voice !== 'undefined') Voice.refresh(); if (typeof Chat !== 'undefined') Chat.refresh(); },
  clear(session) { if (!session || this.current === session) this.set(null); },
  roster() { return this.current ? this.current.roster || [] : []; },
  myId() { return this.current ? this.current.myId : 0; }
};

const PEER_OPTS = () => ({ ...CONFIG.online.peerServer, config: { iceServers: CONFIG.online.iceServers }, debug: 0 });
const randomId = (n = 10) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');

/* ---------------- notices ---------------- */
const Toasts = {
  root: null,
  ensure() {
    if (this.root) return this.root;
    const css = document.createElement('style');
    css.textContent = `#toasts{position:fixed;right:12px;top:118px;z-index:40;display:flex;flex-direction:column;gap:8px;max-width:min(360px,80vw);font-family:"Barlow Condensed",Arial,sans-serif;pointer-events:none}
      #toasts .t{pointer-events:auto;background:rgba(13,21,27,.94);border:1px solid #2f4a5c;border-left:4px solid #19c3ff;border-radius:10px;padding:10px 12px;color:#e8eef2;font-size:18px;box-shadow:0 6px 18px #0008}
      #toasts .t b{color:#ffe27a}#toasts .row{display:flex;gap:8px;margin-top:8px}#toasts button{font:inherit;font-size:16px;background:#1b2a35;color:#fff;border:1px solid #3c5566;border-radius:7px;padding:4px 12px;cursor:pointer}
      #toasts button.go{background:#19c3ff;color:#06222f;border-color:#19c3ff;font-weight:700}`;
    document.head.append(css); this.root = document.createElement('div'); this.root.id = 'toasts'; document.body.append(this.root); return this.root;
  },
  /* show('<b>Sam</b> invited you', [{ label: 'Join', go: true, fn }], ms) */
  show(html, actions = [], ms = 9000) {
    const box = document.createElement('div'); box.className = 't'; box.innerHTML = html;
    const close = () => box.remove();
    if (actions.length) { const row = document.createElement('div'); row.className = 'row'; for (const a of actions) { const b = document.createElement('button'); b.textContent = a.label; if (a.go) b.className = 'go'; b.onclick = e => { e.stopPropagation(); close(); a.fn && a.fn(); }; row.append(b); } box.append(row); }
    this.ensure().append(box); if (ms) setTimeout(close, ms); Sound.play('blip'); return close;
  }
};
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- friends, invites, presence ---------------- */
const Social = {
  data: { friends: [], incoming: [], outgoing: [], invites: [], unread: {}, blocked: [] }, timer: null, busy: false, seen: new Set(), listeners: new Set(), muted: new Set(), started: false,
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit() { for (const fn of this.listeners) { try { fn(); } catch (e) { console.error(e); } } },
  start() { if (this.started || !Account.loggedIn) return; this.started = true; this.tick(); },
  stop() { this.started = false; clearTimeout(this.timer); this.data = { friends: [], incoming: [], outgoing: [], invites: [], unread: {}, blocked: [] }; this.emit(); },
  isFriend(name) { const n = String(name || '').toLowerCase(); return !!n && this.data.friends.some(f => f.name.toLowerCase() === n); },
  isBlocked(name) { const n = String(name || '').toLowerCase(); return !!n && this.data.blocked.includes(n); },
  unreadTotal() { return Object.values(this.data.unread || {}).reduce((a, b) => a + b, 0); },
  /* where you are, for your friends' lists */
  status() {
    const s = Online.current, g = window.voltGame, inGame = g && g.scene.isActive('Game');
    return { where: inGame ? 'game' : s ? 'room' : Party.id ? 'party' : 'menu', room: s && s.code ? s.code : '', open: !!(s && s.state === 'lobby' && s.code), party: Party.role === 'leader' ? Party.id : '', peer: '' };
  },
  async tick() {
    clearTimeout(this.timer); if (!this.started || !Account.loggedIn) return;
    if (!this.busy) {
      this.busy = true;
      try { const d = await Account.req('POST', '/sync', { status: this.status() }); this.data = d; this.notice(d); this.emit(); this.fails = 0; }
      catch (e) { this.fails = (this.fails || 0) + 1; }                       // offline or a server problem: try again, more slowly each time
      this.busy = false;
    }
    const idle = document.hidden, C = CONFIG.server; this.timer = setTimeout(() => this.tick(), Math.min(120, (idle ? C.idleSyncSeconds : C.syncSeconds) * (1 + Math.min(5, this.fails || 0))) * 1000);
  },
  notice(d) {                                                  // pop a notice for anything new
    for (const name of d.incoming) if (!this.seen.has('req:' + name)) { this.seen.add('req:' + name); Toasts.show(`<b>${esc(name)}</b> wants to be your friend.`, [{ label: 'Accept', go: true, fn: () => this.accept(name) }, { label: 'Later' }]); }
    for (const inv of d.invites) if (!this.seen.has('inv:' + inv.id)) {
      this.seen.add('inv:' + inv.id);
      Toasts.show(`<b>${esc(inv.from)}</b> invited you to ${inv.kind === 'party' ? 'their party' : 'a game (room ' + esc(inv.code) + ')'}.`, [{ label: 'Join', go: true, fn: () => this.acceptInvite(inv) }, { label: 'No thanks', fn: () => this.dismiss(inv.id) }], 20000);
    }
    for (const [k, n] of Object.entries(d.unread || {})) if (n && !this.seen.has('dm:' + k + ':' + n) && !(Chat.dmWith && Chat.dmWith.toLowerCase() === k)) {
      this.seen.add('dm:' + k + ':' + n); const f = d.friends.find(x => x.name.toLowerCase() === k), who = f ? f.name : k;
      Toasts.show(`New message from <b>${esc(who)}</b>.`, [{ label: 'Open', go: true, fn: () => Chat.openDm(who) }, { label: 'Later' }]);
    }
  },
  async act(path, body, msg) { try { await Account.req('POST', path, body); if (msg) Toasts.show(msg, [], 3500); this.tick(); return true; } catch (e) { Toasts.show(esc(e.message), [], 5000); return false; } },
  request(name) { return this.act('/friends/request', { username: name }, `Friend request sent to <b>${esc(name)}</b>.`); },
  accept(name) { return this.act('/friends/accept', { username: name }, `You and <b>${esc(name)}</b> are friends.`); },
  remove(name) { return this.act('/friends/remove', { username: name }); },
  block(name) { this.muted.add(String(name).toLowerCase()); return this.act('/block', { username: name }, `<b>${esc(name)}</b> is blocked.`); },
  unblock(name) { this.muted.delete(String(name).toLowerCase()); return this.act('/unblock', { username: name }); },
  report(name, where, text) { return this.act('/report', { username: name, where, text }, 'Thanks. A moderator will take a look.'); },
  invite(name, kind, code) { return this.act('/invite', { to: name, kind, code }, `Invite sent to <b>${esc(name)}</b>.`); },
  dismiss(id) { return this.act('/invite/dismiss', { id }); },
  acceptInvite(inv) { this.dismiss(inv.id); if (inv.kind === 'party') Party.join(inv.code); else joinRoomFromAnywhere(inv.code); },
  isMuted(name) { const n = String(name || '').toLowerCase(); return this.muted.has(n) || this.isBlocked(n); },
  toggleMute(name) { const n = String(name || '').toLowerCase(); if (this.muted.has(n)) this.muted.delete(n); else this.muted.add(n); if (typeof Voice !== 'undefined') Voice.refresh(); }
};

/* Take you into a room from wherever you are in the menus (an invite, or your party leader opened one). */
function joinRoomFromAnywhere(code) {
  const g = window.voltGame; if (!g) return;
  if (g.scene.isActive('Game') || g.scene.isPaused('Game')) { Toasts.show('Finish or leave your match first, then accept the invite again.', [], 5000); return; }
  if (Online.current && Online.current.code === code) return;
  if (Online.current) { try { Online.current.role === 'host' ? Online.current.close() : Online.current.leave(); } catch (e) { /* gone */ } Online.clear(); }
  for (const s of g.scene.getScenes(true)) g.scene.stop(s.sys.settings.key);
  g.scene.start('OnlineMenu', { message: 'Joining room ' + code + '...', autoJoin: code });
}

/* ---------------- parties ----------------
   The leader's browser is the party's hub (a PeerJS id); members connect to it. Messages:
   member -> leader  { t:'hello', name, acct, adult, vid }  { t:'vid', vid }  { t:'chat', text, q, to }  { t:'bye' }
   leader -> member  { t:'members', list, you }  { t:'chat', from, acct, text, q }  { t:'room', code }  { t:'end' }  { t:'kick' } */
const Party = {
  role: null, id: '', peer: null, link: null, conns: new Map(), members: [], myKey: '', listeners: new Set(), max: 5, emoFns: new Set(),   // (a party is up to 5 people)
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit() { for (const fn of this.listeners) { try { fn(); } catch (e) { console.error(e); } } if (typeof Voice !== 'undefined') Voice.refresh(); if (typeof Chat !== 'undefined') Chat.refresh(); },
  get active() { return !!this.role; },
  meInfo() { return { name: Account.name || Settings.myName() || 'Player', acct: Account.name || '', adult: Account.adult, vid: typeof Voice !== 'undefined' ? Voice.myId() : '', look: typeof Progress !== 'undefined' ? Progress.look() : null, st: this.myStats() }; },
  myStats() { try { const C = Settings.career || {}, T = C.time || {}; return { lvl: Progress.level(), tier: Progress.tier(), games: C.games || 0, wins: C.wins || 0, goals: C.goals || 0, cups: C.cups || 0, volt: Math.round(T.volt || 0), mini: Math.round(T.mini || 0), br: Math.round(T.br || 0) }; } catch (e) { return null; } },   // (shown when a party member is picked on the lobby stage: no email, nothing private)
  cleanStats(o) { if (!o || typeof o !== 'object') return null; const n = v => Math.max(0, Math.min(1e9, Math.floor(+v || 0))); return { lvl: n(o.lvl), tier: n(o.tier), games: n(o.games), wins: n(o.wins), goals: n(o.goals), cups: n(o.cups), volt: n(o.volt), mini: n(o.mini), br: n(o.br) }; },
  create() {
    if (this.role) return Promise.resolve(this.id);
    if (!Account.loggedIn) { Toasts.show('Log in to start a party.', [], 4000); return Promise.reject(new Error('login')); }
    return new Promise((resolve, reject) => {
      const id = CONFIG.online.roomPrefix + 'party-' + randomId(), peer = new Peer(id, PEER_OPTS()); let opened = false;
      peer.on('open', () => { opened = true; this.role = 'leader'; this.id = id; this.peer = peer; this.myKey = 'L'; this.members = [{ key: 'L', leader: true, ...this.meInfo() }]; this.emit(); resolve(id); });
      peer.on('connection', conn => this.accept(conn));
      peer.on('error', e => { if (!opened) { peer.destroy(); Toasts.show('Could not start a party: ' + esc(netErrorText(e)), [], 5000); reject(e); } });
      peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
    });
  },
  accept(conn) {                                               // leader: someone joins
    const key = 'M' + randomId(4);
    conn.on('data', msg => this.fromMember(key, conn, msg));
    conn.on('close', () => { if (this.conns.delete(key)) { this.members = this.members.filter(m => m.key !== key); this.sendMembers(); } });
  },
  fromMember(key, conn, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'hello') {
      if (this.members.length >= this.max) { conn.send({ t: 'end', reason: 'full' }); setTimeout(() => conn.close(), 300); return; }
      this.conns.set(key, conn); this.members.push({ key, leader: false, name: cleanText(msg.name, 20) || 'Player', acct: cleanText(msg.acct, 20), adult: !!msg.adult, vid: cleanText(msg.vid, 80), look: typeof Avatar !== 'undefined' && msg.look ? Avatar.cleanLook(msg.look) : null , st: this.cleanStats(msg.st)});
      this.sendMembers(); Toasts.show(`<b>${esc(msg.name)}</b> joined your party.`, [], 3500);
      if (Online.current && Online.current.role === 'host' && Online.current.code) conn.send({ t: 'room', code: Online.current.code });   // you are already in a room: come along
    } else if (msg.t === 'vid') { const m = this.members.find(x => x.key === key); if (m) { m.vid = cleanText(msg.vid, 80); this.sendMembers(); } }
    else if (msg.t === 'chat') { const m = this.members.find(x => x.key === key); if (m) this.relayChat(m, msg); }
    else if (msg.t === 'look') { const m = this.members.find(x => x.key === key); if (m && typeof Avatar !== 'undefined') { m.look = Avatar.cleanLook(msg.look || {}); if (msg.st) m.st = this.cleanStats(msg.st); this.sendMembers(); } }
    else if (msg.t === 'emo') { const id = cleanText(msg.id, 16); this.gotEmote(key, id); for (const [k, c] of this.conns) if (k !== key) c.send({ t: 'emo', key, id }); }
    else if (msg.t === 'bye') conn.close();
  },
  relayChat(m, msg) {                                          // leader: pass a message on, only to the people it is for
    const out = { t: 'chat', from: m.name, acct: m.acct, text: ChatFilter.clean(cleanText(msg.text, 200)), q: msg.q | 0, key: m.key };
    const to = Array.isArray(msg.to) ? msg.to : null;
    for (const [k, c] of this.conns) if (k !== m.key && (!to || to.includes(k))) c.send(out);
    if (m.key !== 'L' && (!to || to.includes('L'))) Chat.receive({ channel: 'party', ...out });
  },
  sendMembers() { for (const [k, c] of this.conns) c.send({ t: 'members', list: this.members, you: k }); this.emit(); },
  join(id) {                                                   // member: join a friend's party
    if (this.role) this.leave(true);
    if (!Account.loggedIn) { Toasts.show('Log in to join a party.', [], 4000); return; }
    const peer = new Peer(PEER_OPTS()); this.peer = peer; let joined = false, failed = false;
    Toasts.show('Joining the party...', [], 3000);
    // before the link opens, every way it can fail ends in one clear message (it used to fail silently when the two computers could not connect)
    const fail = why => {
      if (joined || failed) return; failed = true; clearTimeout(timer);
      const text = why === 'ice' || why === 'timeout'
        ? 'Could not connect to the party. The two computers could not reach each other directly (a router or firewall is blocking it). Try again; if it keeps happening, the game needs a relay server (see DEPLOY.md, "TURN relay").'
        : why === 'gone' ? 'That party is no longer open (the leader may have left or restarted it).' : 'Could not join the party: ' + netErrorText(why);
      Toasts.show(esc(text), [], 9000); console.warn('[party] join failed:', why && why.type || why);
      try { peer.destroy(); } catch (e) { /* gone */ } if (this.peer === peer) this.reset();
    };
    const timer = setTimeout(() => fail('timeout'), 20000);
    peer.on('error', e => { if (!joined) fail(e && e.type === 'peer-unavailable' ? 'gone' : e); else Toasts.show('Party connection problem: ' + esc(netErrorText(e)), [], 5000); });
    peer.on('open', () => {
      const conn = peer.connect(id, { reliable: true, serialization: 'json' });
      const watch = (n = 0) => { const pc = conn.peerConnection; if (!pc) { if (n < 50 && !joined && !failed) setTimeout(() => watch(n + 1), 200); return; }
        pc.addEventListener('iceconnectionstatechange', () => { if (pc.iceConnectionState === 'failed') fail('ice'); }); };
      watch();
      conn.on('open', () => { if (failed) return; joined = true; clearTimeout(timer); this.role = 'member'; this.id = id; this.link = conn; conn.send({ t: 'hello', ...this.meInfo() }); this.emit(); });
      conn.on('error', e => fail(e));
      conn.on('data', msg => this.fromLeader(msg));
      conn.on('close', () => { if (!joined) return fail('ice'); if (this.role === 'member' && this.link === conn) { Toasts.show('You left the party (the leader is gone).', [], 4000); this.reset(); } });
    });
  },
  fromLeader(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'members') { this.members = Array.isArray(msg.list) ? msg.list : []; this.myKey = msg.you; this.emit(); }
    else if (msg.t === 'chat') Chat.receive({ channel: 'party', ...msg });
    else if (msg.t === 'emo') this.gotEmote(cleanText(msg.key, 12), cleanText(msg.id, 16));
    else if (msg.t === 'room') { const code = cleanCode(msg.code); if (code) { Toasts.show('Your party leader opened room ' + esc(code) + '. Joining...', [], 3500); joinRoomFromAnywhere(code); } }
    else if (msg.t === 'end' || msg.t === 'kick') { Toasts.show(msg.reason === 'full' ? 'That party is full.' : msg.t === 'kick' ? 'You were removed from the party.' : 'The party has ended.', [], 4000); this.reset(); }
  },
  /* leader: everyone into this room */
  goRoom(code) { if (this.role === 'leader') for (const c of this.conns.values()) c.send({ t: 'room', code }); },
  kick(key) { const c = this.conns.get(key); if (c) { c.send({ t: 'kick' }); setTimeout(() => c.close(), 300); } },
  sendChat(text, q, to) {
    const msg = { t: 'chat', text, q, to };
    if (this.role === 'leader') { const me = this.members.find(m => m.key === 'L'); this.relayChat(me, msg); }
    else if (this.link) this.link.send(msg);
  },
  updateVid() { const vid = Voice.myId(); if (this.role === 'leader') { const me = this.members.find(m => m.key === 'L'); if (me) { me.vid = vid; this.sendMembers(); } } else if (this.link) this.link.send({ t: 'vid', vid }); },
  leave(quiet) {
    if (this.role === 'leader') for (const c of this.conns.values()) { try { c.send({ t: 'end' }); } catch (e) { /* gone */ } }
    else if (this.link) { try { this.link.send({ t: 'bye' }); } catch (e) { /* gone */ } }
    const peer = this.peer; setTimeout(() => { try { peer && peer.destroy(); } catch (e) { /* gone */ } }, 300);
    this.reset(); if (!quiet) Toasts.show('You left the party.', [], 3000);
  },
  reset() { this.role = null; this.id = ''; this.peer = null; this.link = null; this.conns = new Map(); this.members = []; this.myKey = ''; this.emit(); },
  others() { return this.members.filter(m => m.key !== this.myKey); },
  /* the lobby: your look and your emotes, for the others in your party */
  updateLook() { const look = Progress.look(), st = this.myStats(); if (this.role === 'leader') { const me = this.members.find(m => m.key === 'L'); if (me) { me.look = look; me.st = st; this.sendMembers(); } } else if (this.link) this.link.send({ t: 'look', look, st }); },
  sendEmote(id) { if (this.role === 'leader') for (const c of this.conns.values()) c.send({ t: 'emo', key: 'L', id }); else if (this.link) this.link.send({ t: 'emo', id }); },
  gotEmote(key, id) { for (const fn of this.emoFns) { try { fn(key, id); } catch (e) { console.error(e); } } }
};
addEventListener('beforeunload', () => { try { if (Party.role) Party.leave(true); } catch (e) { /* closing */ } });
