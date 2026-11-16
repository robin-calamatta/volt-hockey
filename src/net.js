/* ===== Online play =====
   One player HOSTS the match (their browser runs the real simulation, CPU carts included). Up to five others JOIN with a
   five-letter room code. Everything runs in browsers over WebRTC, using PeerJS's free public broker to introduce players:
   no game server to run. Layers, bottom to top:
     PeerTransport    the only code that touches PeerJS (swap it to change networking)
     HostSession      room, roster, receives player input, sends snapshots of the game ~30 times a second
     ClientSession    joins a room, receives the roster, snapshots and events
     ClientSim        on a joining player's machine: predicts their own cart so it feels instant, smooths everything else
   Messages are plain objects, listed in the comments below. All numbers (rates, delays) are in CONFIG.online. */

const PROTOCOL = CONFIG.online.protocol;
const STATE_CODE = { countdown: 0, play: 1, goal: 2, over: 3 }, STATE_NAME = ['countdown', 'play', 'goal', 'over'];
const r3 = v => Math.round(v * 1000) / 1000;
const randomCode = () => Array.from({ length: CONFIG.online.codeLength }, () => CONFIG.online.codeAlphabet[Math.floor(Math.random() * CONFIG.online.codeAlphabet.length)]).join('');
// Who you are, for other players' chat and voice rules (guests: no account, so quick chat only and no voice).
const accountTag = () => ({ party: typeof Party !== 'undefined' && Party.active ? Party.id : '', psize: typeof Party !== 'undefined' && Party.active ? Party.members.length : 1, look: typeof Progress !== 'undefined' ? Progress.look() : null, acct: typeof Account !== 'undefined' ? Account.name : '', adult: typeof Account !== 'undefined' && Account.adult, vid: typeof Voice !== 'undefined' ? Voice.myId() : '', nf: !!Settings.mmNoFill });   /* nf: v14.3.1 no fill (public matches) */
const cleanCode = text => String(text || '').toUpperCase().split('').filter(ch => CONFIG.online.codeAlphabet.includes(ch)).join('').slice(0, CONFIG.online.codeLength);

/* v14.3.13 🌐 ONLINE or 📶 LAN. On LAN the game connections use no outside servers to find a way through (no STUN, no relay), so they only
   go straight from device to device on the same network. Public rooms and matchmaking only show people on the same network (the server
   tells each player a code for their network: their internet address, hashed, never the address itself). Finding a room by its code
   still uses the usual introducer, and the room list too. Party and voice links are unchanged. */
const NetMode = {
  id: '', at: 0,
  lan() { return typeof Settings !== 'undefined' && Settings.netLan === true && !(typeof GameCfg !== 'undefined' && (GameCfg.lan === false || GameCfg.online === false)); },
  ice() { return this.lan() ? [] : CONFIG.online.iceServers; },
  async load(force) { if (!force && this.id && performance.now() - this.at < 120000) return this.id; try { const r = await Account.req('GET', '/net'); if (r && typeof r.net === 'string') { this.id = r.net; this.at = performance.now(); } } catch (e) { /* no server: no network code */ } return this.id; },
  name() { return this.lan() ? '📶 LAN' : '🌐 ONLINE'; }
};
/* ---- transport: a "connection" is { send(obj), close(), onMessage, onClose } ---- */
class PeerTransport {
  static available() { return typeof Peer === 'function'; }
  options() { return { ...CONFIG.online.peerServer, config: { iceServers: NetMode.ice() }, debug: 0 }; }   /* (v14.3.13: none on LAN) */
  wrap(conn, peer) {
    /* v14.2.13: a message over about 12 KB goes in pieces and is put back together at the other end. The data channel refuses anything much
       bigger ("message-too-big") and drops the connection: on the huge Volt Royale maps that dropped every guest as the game began */
    const CK = 12000; let ckN = 0; const parts = new Map();
    const w = { onMessage: null, onClose: null, send: o => { try { let str = null; try { str = JSON.stringify(o); } catch (e) { return; } if (str.length <= CK) { conn.send(o); return; }
        const k = ++ckN, n = Math.ceil(str.length / CK); for (let i = 0; i < n; i++) conn.send({ t: '_ck', k, i, n, d: str.slice(i * CK, (i + 1) * CK) }); } catch (e) { /* closed */ } },
      backlog: () => { try { return ((conn.dataChannel && conn.dataChannel.bufferedAmount) || 0) + (conn.bufferSize || 0) * 4000; } catch (e) { return 0; } },   // (bytes still waiting to go out)
      close: () => { try { if (w.fastDC) w.fastDC.close(); } catch (e) {} try { conn.close(); } catch (e) {} if (peer) peer.destroy(); },
      /* v14.3.11 the fast lane: snapshots and stick input go on a second channel that is unordered and never resent. On the main
         (reliable, in-order) channel one lost packet held up everything behind it until it was sent again: the game froze for a moment,
         then everything arrived at once, and the guest was always catching up. Now a lost snapshot is simply skipped (the next one,
         a 60th of a second later, has everything) and each input message carries the last few inputs again, so nothing is missed. */
      fastOpen: () => !!(w.fastDC && w.fastDC.readyState === 'open'),
      fastBacklog: () => { try { return w.fastDC ? w.fastDC.bufferedAmount : 0; } catch (e) { return 0; } },
      sendFast: o => { if (w.fastOpen()) { let s = null; try { s = JSON.stringify(o); } catch (e) { return; } if (s.length < 15000) { try { w.fastDC.send(s); return; } catch (e) { /* fall back */ } } } w.send(o); } };
    const mkFast = () => { if (w.fastDC) return; try { const pc = conn.peerConnection; if (!pc || pc.signalingState === 'closed') return; const dc = pc.createDataChannel('vfast', { negotiated: true, id: 101, ordered: false, maxRetransmits: 0 });
        dc.onmessage = e => { let o = null; try { o = JSON.parse(e.data); } catch (x) { return; } if (o && w.onMessage) w.onMessage(o); }; w.fastDC = dc; } catch (e) { /* no fast lane: everything goes the reliable way */ } };
    if (conn.open) mkFast(); else conn.on('open', mkFast);
    conn.on('data', d => { if (d && d.t === '_ck') { let P = parts.get(d.k); if (!P) { P = { got: 0, a: new Array(d.n | 0) }; parts.set(d.k, P); if (parts.size > 20) parts.delete(parts.keys().next().value); }
        if (P.a[d.i] === undefined && typeof d.d === 'string') { P.a[d.i] = d.d; P.got++; } if (P.got === P.a.length) { parts.delete(d.k); let o = null; try { o = JSON.parse(P.a.join('')); } catch (e) { return; } if (w.onMessage) w.onMessage(o); } return; }
      if (w.onMessage) w.onMessage(d); }); conn.on('close', () => w.onClose && w.onClose()); conn.on('error', e => { console.warn('[net] connection error:', e && (e.type || e.message) || e); w.onClose && w.onClose(); });
    return w;
  }
  host(code) {                                    // resolves to { onConnection, onError, close }
    return new Promise((resolve, reject) => {
      const peer = new Peer(CONFIG.online.roomPrefix + code, this.options()); let opened = false;
      const endpoint = { onConnection: null, onError: null, close: () => peer.destroy() };
      peer.on('open', () => { opened = true; resolve(endpoint); });
      peer.on('connection', conn => endpoint.onConnection && endpoint.onConnection(this.wrap(conn)));
      peer.on('error', e => { if (!opened) { peer.destroy(); reject(e); } else if (endpoint.onError) endpoint.onError(e); });
      peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });   // lost the introducer: existing players are unaffected
    });
  }
  join(code) {                                    // resolves to a connection
    return new Promise((resolve, reject) => {
      const peer = new Peer(this.options()); let done = false;
      const fail = e => { if (!done) { done = true; peer.destroy(); reject(e); } };
      peer.on('error', fail);
      peer.on('open', () => {
        const conn = peer.connect(CONFIG.online.roomPrefix + code, { reliable: true, serialization: 'json' });
        conn.on('open', () => { if (!done) { done = true; resolve(this.wrap(conn, peer)); } });
        conn.on('error', fail);
        watchIce(conn, () => fail({ type: 'ice' }));
      });
      setTimeout(() => fail({ type: 'timeout' }), CONFIG.online.joinTimeoutMs);
    });
  }
}

/* ===== Public room list =====
   Private rooms are joined only by code. A host can make a room PUBLIC and it shows up in everyone's Browse list. There is no game server, so the
   list is kept by one of the public hosts' browsers: the first one claims a well-known PeerJS id (the "directory"); every other public host
   registers its room with it, and Browse asks it for the list. If that host leaves, another public host takes over within a couple of seconds.
   No public rooms = no directory = an empty list. Messages:  host -> dir { t:'reg', room }  { t:'unreg', code }    browser -> dir { t:'list' }  dir -> { t:'rooms', rooms } */
const DIR = () => CONFIG.online.directory;
const dirId = () => CONFIG.online.roomPrefix + DIR().id;
const cleanText = (t, max) => String(t == null ? '' : t).replace(/[^\x20-\x7e]/g, '').trim().slice(0, max);
function sanitizeRoom(r) {                                       // whatever arrives over the network is untrusted: rebuild it field by field
  if (!r || typeof r !== 'object') return null;
  const code = cleanCode(r.code); if (code.length !== CONFIG.online.codeLength) return null;
  const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v) || 0));
  return { code, name: cleanText(r.name, DIR().nameMax) || 'Volt room', host: cleanText(r.host, 20) || 'Player 1', players: num(r.players, 0, CONFIG.online.maxPlayers), max: num(r.max, 1, CONFIG.online.maxPlayers),
    left: cleanText(r.left, 16), right: cleanText(r.right, 16), skill: cleanText(r.skill, 12), practice: !!r.practice, playing: !!r.playing, kind: cleanText(r.kind || '', 16), v: num(r.v, 0, 99), lan: cleanText(r.lan || '', 16).replace(/[^0-9a-fx]/g, '') };
}

class DirectoryPublisher {
  constructor(getInfo) { this.getInfo = getInfo; this.rooms = new Map(); this.peer = null; this.link = null; this.role = 'none'; this.stopped = true; this.timer = null; this.ownCode = null; }
  options() { return { ...CONFIG.online.peerServer, config: { iceServers: CONFIG.online.iceServers }, debug: 0 }; }
  start() { if (!this.stopped) return; this.stopped = false; this.claim(); this.timer = setInterval(() => this.beat(), DIR().heartbeatMs); }
  stop() {
    this.stopped = true; clearInterval(this.timer); this.timer = null;
    if (this.ownCode) { this.rooms.delete(this.ownCode); if (this.link) this.link.send({ t: 'unreg', code: this.ownCode }); }
    this.drop(); this.ownCode = null;
  }
  drop() { for (const x of [this.link, this.peer]) { try { x && (x.close ? x.close() : x.destroy()); } catch (e) { /* already gone */ } } this.link = null; this.peer = null; this.role = 'none'; }
  retry() { this.drop(); if (!this.stopped) setTimeout(() => this.claim(), 300 + Math.random() * 1500); }       // jitter: the first to try becomes the new directory
  claim() {                                                    // try to BE the directory; if somebody already is, register with them instead
    if (this.stopped || !PeerTransport.available()) return; this.drop();
    const peer = new Peer(dirId(), this.options()); this.peer = peer; this.role = 'pending';
    peer.on('open', () => { this.role = 'registry'; this.beat(); });
    peer.on('connection', conn => this.serve(conn));
    peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
    peer.on('error', e => { if (e && e.type === 'unavailable-id') { this.drop(); this.member(); } else this.retry(); });
  }
  member() {                                                   // register with the existing directory over a normal connection
    const peer = new Peer(this.options()); this.peer = peer; this.role = 'pending';
    peer.on('error', () => this.retry());
    peer.on('open', () => {
      const conn = peer.connect(dirId(), { reliable: true, serialization: 'json' });
      conn.on('open', () => { this.link = conn; this.role = 'member'; this.beat(); });
      conn.on('close', () => this.retry()); conn.on('error', () => this.retry());
    });
  }
  serve(conn) {                                                // the directory: take registrations and answer list requests
    const mine = new Set();
    conn.on('data', msg => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'reg') { const room = sanitizeRoom(msg.room); if (room && (this.rooms.has(room.code) || this.rooms.size < DIR().maxRooms)) { mine.add(room.code); this.rooms.set(room.code, { room, at: performance.now() }); } }
      else if (msg.t === 'unreg') { const code = cleanCode(msg.code); if (mine.has(code)) { this.rooms.delete(code); mine.delete(code); } }
      else if (msg.t === 'list') { try { conn.send({ t: 'rooms', rooms: this.live() }); } catch (e) { /* closed */ } }
    });
    conn.on('close', () => { for (const code of mine) this.rooms.delete(code); });
  }
  live() { const now = performance.now(); for (const [k, v] of this.rooms) if (now - v.at > DIR().expireMs) this.rooms.delete(k); return [...this.rooms.values()].map(v => v.room); }
  beat() {                                                     // say "my room is still here" (and what it looks like now)
    if (this.stopped) return; const info = this.getInfo(); if (!info) return;
    this.ownCode = info.code;
    if (this.role === 'registry') this.rooms.set(info.code, { room: sanitizeRoom(info), at: performance.now() });
    else if (this.role === 'member' && this.link) this.link.send({ t: 'reg', room: info });
  }
}

// Ask the directory for the public rooms. Always resolves: { rooms, error } (error is '' when the list is simply empty).
function listPublicRooms() {
  return new Promise(resolve => {
    if (!PeerTransport.available()) return resolve({ rooms: [], error: 'unsupported' });
    let done = false, peer;
    const finish = (rooms, error = '') => { if (done) return; done = true; clearTimeout(timer); try { peer && peer.destroy(); } catch (e) { /* ignore */ } resolve({ rooms, error }); };
    const timer = setTimeout(() => finish([], 'timeout'), DIR().listTimeoutMs);
    try { peer = new Peer({ ...CONFIG.online.peerServer, config: { iceServers: CONFIG.online.iceServers }, debug: 0 }); } catch (e) { return finish([], 'network'); }
    peer.on('error', e => finish([], e && e.type === 'peer-unavailable' ? '' : (e && e.type) || 'network'));       // no directory = nobody is hosting a public room
    peer.on('open', () => {
      const conn = peer.connect(dirId(), { reliable: true, serialization: 'json' });
      conn.on('open', () => conn.send({ t: 'list' }));
      conn.on('data', msg => { if (msg && msg.t === 'rooms' && Array.isArray(msg.rooms)) finish(msg.rooms.slice(0, DIR().maxRooms).map(sanitizeRoom).filter(Boolean)); });
      conn.on('error', () => finish([], 'network'));
    });
  });
}

// The direct link between two browsers failed (a router or firewall in the way): say so at once instead of waiting for a timeout.
function watchIce(conn, onFail, n = 0) {
  const pc = conn.peerConnection; if (!pc) { if (n < 50) setTimeout(() => watchIce(conn, onFail, n + 1), 200); return; }
  pc.addEventListener('iceconnectionstatechange', () => { if (pc.iceConnectionState === 'failed') onFail(); });
}
// Human-readable text for the errors PeerJS (or we) can produce.
function netErrorText(e) {
  if (NetMode.lan() && e && ['ice', 'timeout'].includes(e.type || e.reason)) return 'Could not reach that room on your local network. Both devices need to be on the same network (the same Wi-Fi), and the room has to be a 📶 LAN room. To play over the internet, switch to 🌐 ONLINE.';   /* (v14.3.13) */
  const t = (e && (e.type || e.reason)) || 'unknown';
  return ({
    'rejoin-over': 'That game has finished, so there is nothing to rejoin.', 'peer-unavailable': 'Room not found. Check the code.', timeout: 'Could not reach the room (timed out). Check the code. If it is right, a router or firewall may be blocking the connection between the two computers.',
    ice: 'Found the room, but the two computers could not connect to each other directly (a router or firewall is blocking it). The game needs a relay server for this network (DEPLOY.md, "TURN relay").',
    network: 'Could not reach the matchmaking server. Check your internet connection.', 'server-error': 'The matchmaking server had a problem. Try again in a moment.',
    'socket-error': 'Lost the matchmaking server. Try again.', 'socket-closed': 'Lost the matchmaking server. Try again.', 'unavailable-id': 'Could not create a room. Try again.',
    'browser-incompatible': 'This browser does not support online play.', full: 'That room is full.', 'party-too-big': 'Your party is bigger than this Volt Royale room\'s squads. Ask the host for bigger squads (duos or trios), or make your party smaller.', started: 'That match has already started. Ask the host to return to the lobby.',
    version: 'Different game versions. Everyone should reload the page.', unsupported: 'Online play is unavailable (the PeerJS library did not load).',
    host_left: 'The host left the room.', party_done: 'Your party leader finished that game. They will bring you into the next one.', lost: 'Lost connection to the host.', kicked: 'You were removed from the room.'
  })[t] || 'Connection problem (' + t + ').';
}

/* ===== Host =====
   Client -> host:  { t:'hello', v }   { t:'side', side }   { t:'in', q, x, y, ev:[...] }   { t:'ping', n }   { t:'bye' }
   Host -> client:  { t:'welcome', id, code, roster, cfg }  { t:'reject', reason }  { t:'roster', roster, cfg }
                    { t:'start', cfg, rules, players }  { t:'snap', ... }  { t:'lobby' }  { t:'pong', n }  { t:'bye', reason }
   An input event string is one of: cw ccw up down sw  (spin clockwise / counter-clockwise, speed up / down, switch cart). */
class HostSession {
  constructor(transport) {
    this.lanRoom = NetMode.lan(); if (this.lanRoom) NetMode.load();   /* (v14.3.13: a LAN room) */
    this.transport = transport; this.code = null; this.myId = 1; this.state = 'lobby'; this.entries = new Map(); this.nextId = 2; this.match = null; this.guestSrc = new Map();      // guestSrc: the devices of this machine's local guests (id -> input source)
    this.cfg = { teamA: Settings.teamA, teamB: Settings.teamB, sizes: [CONFIG.match.chairsPerTeam, CONFIG.match.chairsPerTeam], difficulty: Settings.difficulty, practice: false };
    this.roster = [{ id: 1, name: Settings.myName() || 'Player 1', side: 0, mid: true, host: true, ...accountTag() }]; this.snapAcc = 0;   // accountTag: username, adult, voice id (for chat and voice rules) this.tickNo = 0; this.closed = false;
    this.onChange = null; this.onPlayerLeft = null; this.onError = null;
    this.visibility = 'private'; this.lobbyName = DIR().names[0]; this.directory = null;       // public rooms appear in everyone's Browse list
  }
  publicInfo() {                                                  // what the room list shows (null while private)
    if (this.visibility !== 'public' || !this.code || this.closed) return null;
    return { code: this.code, name: this.lobbyName, host: this.roster[0].name, players: this.roster.length, max: Math.min(CONFIG.online.maxPlayers, this.cfg.sizes[0] + this.cfg.sizes[1]),
      left: TEAMS[this.cfg.teamA].name, right: TEAMS[this.cfg.teamB].name, skill: this.cfg.difficulty, practice: this.cfg.practice, playing: this.state !== 'lobby', kind: this.cfg.mini ? this.cfg.mini.kind : 'hockey', v: PROTOCOL, lan: this.lanRoom ? NetMode.id || 'x' : '' };   /* (lan: v14.3.13 the network code of a LAN room) */
  }
  setVisibility(v) {
    this.visibility = v === 'public' ? 'public' : 'private';
    if (this.visibility === 'public') { if (!this.directory) this.directory = new DirectoryPublisher(() => this.publicInfo()); this.directory.start(); this.directory.beat(); }
    else if (this.directory) this.directory.stop();
  }
  setLobbyName(name) { this.lobbyName = cleanText(name, DIR().nameMax) || DIR().names[0]; this.relist(); }
  relist() { if (this.directory && this.visibility === 'public') this.directory.beat(); }
  async open() {
    for (let attempt = 0; attempt < 6 && !this.code; attempt++) {
      const code = randomCode();
      try { this.endpoint = await this.transport.host(code); this.code = code; } catch (e) { if (!e || e.type !== 'unavailable-id') throw e; }
    }
    if (!this.code) throw { type: 'unavailable-id' };
    Online.set(this); Party.goRoom(this.code);                       // chat / voice use this room; your party follows you in
    this.endpoint.onConnection = conn => this.accept(conn);
    this.endpoint.onError = e => this.onError && this.onError(e);
    return this.code;
  }
  uniqueName(name, id) { let n = name, k = 2; while (this.roster.some(r => r.id !== id && r.name === n)) n = name.slice(0, CONFIG.nameMax - 2) + ' ' + k++; return n; }
  setName(id, name) { const p = this.roster.find(r => r.id === id), clean = Settings.cleanName(name); if (!p || !clean) return; if (p.acct || (p.id === this.myId && Settings.nameLocked())) return;   /* (v14.2.13: logged in: always your username) */ p.name = this.uniqueName(clean, id); this.sendRoster(); }
  count(side) { return this.roster.filter(p => p.side === side).length; }
  guestName(taken) { return CONFIG.playerNames.find(n => !taken.includes(n)) || 'Guest'; }
  openSide() { if (this.cfg.season) return this.count(this.cfg.season.side) < this.cfg.sizes[this.cfg.season.side] ? this.cfg.season.side : undefined; return [0, 1].filter(s => this.count(s) < this.cfg.sizes[s]).sort((a, b) => this.count(a) - this.count(b))[0]; }   // a season game: everyone plays for the leader's team
  claimedSources() { return [...this.guestSrc.values()]; }
  guestsOf(owner) { return this.roster.filter(r => r.own === owner); }
  /* A local guest: another person on the same machine as a player, with a controller of their own. They get a cart and a roster entry, but share the owner's connection. */
  addGuest(owner, name, k, preferSide) {
    if (this.state !== 'lobby' || this.roster.length >= (this.mmFill ? 100 : CONFIG.online.maxPlayers) || this.guestsOf(owner).length >= CONFIG.online.maxGuests) return null;
    const side = preferSide !== undefined && this.count(preferSide) < this.cfg.sizes[preferSide] ? preferSide : this.openSide(); if (side === undefined) return null;
    const g = { id: this.nextId++, name: this.uniqueName(Settings.cleanName(name) || this.guestName(this.roster.map(r => r.name))), side, mid: !this.cfg.season, own: owner, guest: true, k: k || 0 };   // mid: still in the middle of the side picker (v13.6)
    this.roster.push(g); this.sendRoster(); return g;
  }
  addLocalGuest(src) {                                            // the host's own guests: same side as the host if there is room
    const host = this.roster[0], g = this.addGuest(1, '', 0, host.side); if (g) this.guestSrc.set(g.id, src); return g;
  }
  removeGuest(id, owner) {
    const g = this.roster.find(r => r.id === id && r.own === owner); if (!g) return false;
    this.roster = this.roster.filter(r => r !== g); this.guestSrc.delete(id); this.sendRoster(); return true;
  }
  canEdit(entry, id) { const p = this.roster.find(r => r.id === id); return !!p && (p.id === entry.id || p.own === entry.id) ? p : null; }
  broadcast(msg) { for (const e of this.entries.values()) if (e.id) e.conn.send(msg); }
  sendRoster() { this.broadcast({ t: 'roster', roster: this.roster, cfg: this.cfg }); this.relist(); if (this.onChange) this.onChange(); Voice.refresh(); }

  accept(conn) {
    const entry = { conn, id: null, lastSeen: performance.now(), seq: 0, players: null };
    this.entries.set(conn, entry);
    entry.hello = setTimeout(() => { if (!entry.id) this.drop(entry); }, CONFIG.online.helloTimeoutMs);   // nobody lurks without saying hello
    conn.onMessage = msg => this.receive(entry, msg); conn.onClose = () => this.drop(entry);
  }
  reject(entry, reason) { entry.conn.send({ t: 'reject', reason }); setTimeout(() => this.drop(entry), 300); }
  receive(entry, msg) {
    if (!msg || typeof msg !== 'object') return;
    entry.lastSeen = performance.now();
    if (!entry.id) {                                              // the first message must be hello
      if (msg.t !== 'hello') return;
      if (msg.v !== PROTOCOL) return this.reject(entry, 'version');
      if (this.state !== 'lobby') {                                   /* v14: back into a game that's still going, in the same cart */
        const G = msg.rejoin && this.ghosts && this.ghosts.get(String(msg.rejoin));
        if (!G || this.state !== 'playing' || !this.match) return this.reject(entry, 'started');
        this.ghosts.delete(String(msg.rejoin)); clearTimeout(entry.hello); entry.id = G.id; entry.token = String(msg.rejoin); entry.players = G.players;
        this.roster.push(...G.rows.filter(r => !this.roster.some(q => q.id === r.id)));
        for (const p of G.players.values()) { const ch = G.chairs.get(p.id); if (ch && !ch.player) { ch.player = p; p.chair = ch; } if (!this.match.players.includes(p)) this.match.players.push(p); }
        entry.conn.send({ t: 'welcome', id: entry.id, code: this.code, roster: this.roster, cfg: this.cfg, token: entry.token, rejoined: true }); if (this.startMsg) entry.conn.send(this.startMsg);
        if (this.match && MG && MG.notice) { try { MG.notice(this.match, `${(G.rows[0] || {}).name || 'A PLAYER'} IS BACK`.toUpperCase(), 1.6); } catch (e) { /* not a minigame */ } }
        return this.sendRoster();
      }
      const side = this.openSide();
      if (this.roster.length >= (this.mmFill ? 100 : CONFIG.online.maxPlayers) || side === undefined) return this.reject(entry, 'full');
      if (this.cfg.mini && this.cfg.mini.kind === 'br' && (+msg.psize || 1) > (this.cfg.mini.squad || 1)) return this.reject(entry, 'party-too-big');   // Volt Royale: your party plays as one squad
      entry.id = this.nextId++; clearTimeout(entry.hello);
      this.roster.push({ id: entry.id, name: this.uniqueName(Settings.cleanName(msg.name) || 'Player ' + (this.roster.length + 1)), side, mid: !this.cfg.season, look: Avatar.cleanLook(msg.look), party: cleanText(msg.party, 80), acct: cleanText(msg.acct, 20), adult: !!msg.adult, vid: cleanText(msg.vid, 80), nf: !!msg.nf });
      entry.token = Math.random().toString(36).slice(2) + Date.now().toString(36);   // (keep it: it lets you back into a game if your connection drops)
      entry.conn.send({ t: 'welcome', id: entry.id, code: this.code, roster: this.roster, cfg: this.cfg, token: entry.token });
      return this.sendRoster();
    }
    switch (msg.t) {
      case 'side': if (this.state === 'lobby') { const p = this.canEdit(entry, msg.id === undefined ? entry.id : msg.id); if (p) { if (msg.side === -1) this.setMid(p.id); else this.setSide(p.id, msg.side); } } break;
      case 'lock': if (this.state === 'lobby') { const p = this.canEdit(entry, msg.id === undefined ? entry.id : msg.id); if (p) this.setLock(p.id, msg.lock); } break;
      case 'name': if (this.state === 'lobby') { const p = this.canEdit(entry, msg.id === undefined ? entry.id : msg.id); if (p) this.setName(p.id, msg.name); } break;
      case 'addGuest': this.addGuest(entry.id, msg.name, +msg.k || 0); break;
      case 'rmGuest': if (this.state === 'lobby') this.removeGuest(msg.id, entry.id); break;
      case 'in': this.applyInput(entry, msg); break;
      case 'chat': this.relayChat(entry.id, msg); break;
      case 'vid': { const p = this.roster.find(r => r.id === entry.id); if (p) { p.vid = cleanText(msg.vid, 80); this.sendRoster(); } break; }
      case 'ping': entry.conn.send({ t: 'pong', n: msg.n }); break;
      case 'bye': this.drop(entry); break;
    }
  }
  setLock(id, on) { const p = this.roster.find(r => r.id === id); if (!p) return false; p.lock = !!on; this.sendRoster(); return true; }   // a player locked to one cart for the whole game
  /* Chat: pass a message on to the players it is for (to = player ids; under-18 players only send to friends). The host's own messages too. */
  relayChat(fromId, msg) {
    const p = this.roster.find(r => r.id === fromId); if (!p || !msg) return;
    const out = { t: 'chat', id: p.id, from: p.name, acct: p.acct || '', text: ChatFilter.clean(cleanText(msg.text, 200)), q: msg.q | 0 }, to = Array.isArray(msg.to) ? msg.to.map(Number) : null;
    for (const e of this.entries.values()) if (e.id && e.id !== fromId && (!to || to.includes(e.id))) e.conn.send(out);
    if (fromId !== this.myId && (!to || to.includes(this.myId))) Chat.receive({ channel: 'room', ...out });
  }
  sendChat(text, q, to) { this.relayChat(this.myId, { text, q, to }); }
  setVid(vid) { const me = this.roster.find(r => r.id === this.myId); if (me) { me.vid = vid; this.sendRoster(); } }
  setMid(id) { const p = this.roster.find(r => r.id === id); if (!p || this.cfg.season || p.mid) return false; p.mid = true; this.sendRoster(); return true; }   // back to the middle: not picked a side yet
  setSide(id, side) {
    const p = this.roster.find(r => r.id === id);
    if (p && p.mid && p.side === side && !(this.cfg.season && side !== this.cfg.season.side)) { p.mid = false; this.sendRoster(); return true; }   // out of the middle onto the side you were held for
    if (!p || (side !== 0 && side !== 1) || p.side === side || this.count(side) >= this.cfg.sizes[side] || (this.cfg.season && side !== this.cfg.season.side)) return false;
    p.side = side; p.mid = false; this.sendRoster(); return true;
  }
  setConfig(patch) {                                              // host menu: teams, sizes, difficulty...
    Object.assign(this.cfg, patch);
    for (const s of [0, 1]) while (this.count(s) > this.cfg.sizes[s]) {   // a side got smaller than the people on it: move the newest to the other side, or remove them
      const p = [...this.roster].reverse().find(r => r.side === s && !r.host && !r.own) || [...this.roster].reverse().find(r => r.side === s && !r.host) || this.roster.find(r => r.side === s);
      if (this.count(1 - s) < this.cfg.sizes[1 - s]) p.side = 1 - s;
      else if (p.guest) { this.roster = this.roster.filter(r => r !== p); this.guestSrc.delete(p.id); }
      else { const e = [...this.entries.values()].find(x => x.id === p.id); if (e) { e.conn.send({ t: 'bye', reason: 'kicked' }); this.drop(e); } else break; }
    }
    this.sendRoster();
  }
  drop(entry) {
    if (!this.entries.delete(entry.conn)) return;
    clearTimeout(entry.hello); entry.conn.onClose = null; entry.conn.close();
    if (entry.id) {
      if (this.state === 'playing' && this.match && entry.token && entry.players) { this.ghosts = this.ghosts || new Map(); this.ghosts.set(entry.token, { id: entry.id, rows: this.roster.filter(r => r.id === entry.id || r.own === entry.id), players: entry.players, chairs: new Map([...entry.players.values()].map(p => [p.id, p.chair])) }); }   // (kept so they can come back)
      this.roster = this.roster.filter(r => r.id !== entry.id && r.own !== entry.id);   // their guests go with them
      if (entry.players && this.match) for (const p of entry.players.values()) this.match.removePlayer(p);            // a CPU takes over their carts
      if (this.onPlayerLeft) this.onPlayerLeft(entry.id);
      this.sendRoster();
    }
  }

  /* ---- in a match ---- */
  start(localSource) {                                           // returns the Match; call from the host's room screen
    /* v14.3.1 public matches: who plays with whom. NO FILL: only your party (and the players on your screen) are on your team, CPUs make up the
       rest. FILL: you can be teamed with other players from the queue (your party always stays together). */
    const ownerOf = r => (r.own && this.roster.find(q => q.id === r.own)) || r, grpOf = r => { const o = ownerOf(r); return o.party ? 'party:' + o.party : 'solo:' + o.id; };
    const nfOf = r => { const o = ownerOf(r); return o.party ? this.roster.some(q => q.party === o.party && q.nf) : !!o.nf; };
    const mmKeyOf = r => nfOf(r) ? grpOf(r) : 'fill:' + grpOf(r);
    if (this.mmFill && !(this.cfg.mini && (this.cfg.mini.kind === 'br' || this.cfg.mini.mode !== 'teams'))) {   /* two-team games: each group on one side, the fewest players first */
      const groups = new Map(); for (const r of this.roster) { const k = grpOf(r); (groups.get(k) || groups.set(k, []).get(k)).push(r); }
      const list = [...groups.values()].sort((a, b) => (nfOf(b[0]) - nfOf(a[0])) || b.length - a.length), n = [0, 0];
      for (const G of list) { if (nfOf(G[0])) { const sd = n[0] <= n[1] ? 0 : 1; for (const r of G) r.side = sd; n[sd] += G.length; } else for (const r of G) { const sd = n[0] <= n[1] ? 0 : 1; r.side = sd; n[sd]++; } }
    }
    const players = this.roster.map((r, i) => ({ id: r.id, name: r.name, side: r.side, locked: !!r.lock, tag: 'P' + (i + 1), speedLevel: Settings.speedLevel, chair: null, spinQueued: 0, look: r.host ? null : r.look || null, squadKey: this.mmFill ? mmKeyOf(r) : r.host ? (typeof Party !== 'undefined' && Party.active ? 'party:' + Party.id : null) : r.party ? 'party:' + r.party : null,
      remote: !(r.host || r.own === 1), src: r.host ? localSource : r.own === 1 ? this.guestSrc.get(r.id) : { ax: 0, ay: 0, pressed: {} } }));
    for (const e of this.entries.values()) e.players = new Map(players.filter(p => p.id === e.id || (this.roster.find(r => r.id === p.id) || {}).own === e.id).map(p => [p.id, p]));
    if (this.cfg.mini) { this.cfg.sizesRoom = this.cfg.sizesRoom || this.cfg.sizes; this.cfg.sizes = fitSizes(this.cfg.mini, players, this.cfg.sizesRoom); }   // no CPU carts: just the people in the room
    const se = this.cfg.season;                                    // a party season game: the season's length and each team's own skill
    this.match = makeMatch({ mini: this.cfg.mini || null, teamA: this.cfg.teamA, teamB: this.cfg.teamB, players, difficulty: this.cfg.difficulty, sizes: this.cfg.sizes, practice: this.cfg.practice, periodSeconds: se ? se.periodSeconds : undefined, diffBySide: se ? se.levels : undefined });
    this.match.sfxQueue = []; this.match.callQueue = []; this.state = 'playing'; this.snapAcc = 0; this.relist();
    this.mid = (this.mid || 0) + 1; for (const e of this.entries.values()) { e.seq = 0; e.qq = 0; }   /* (v14.3.12: a new match counts inputs from 0 again: the old count made the host ignore every guest's input after PLAY AGAIN) */
    this.ghosts = new Map(); this.broadcast(this.startMsg = { t: 'start', mid: this.mid, cfg: this.cfg, rules: Settings.rules(), players: players.map(p => ({ id: p.id, name: p.name, side: p.side, tag: p.tag, look: p.look || ((this.roster.find(r => r.id === p.id) || {}).host ? Progress.look() : null) })) });
    return this.match;
  }
  applyInput(entry, msg) {                                       // a player's stick and button events (plus those of their local guests, in msg.g)
    if (!entry.players || !this.match) return;
    if (msg.mid !== undefined && msg.mid !== this.mid) return;   /* (input from the last match, still on its way) */
    if (!(msg.q > entry.seq)) return;
    if (Array.isArray(msg.s)) {                                   /* v14.3.11: [[q, seconds, [[id, x, y], ...]], ...] (the newest few) and events [[q, id, ev], ...] */
      const prev = entry.seq; entry.seq = msg.q;
      for (const row of msg.s.slice(-10)) { if (!Array.isArray(row) || !(row[0] > (entry.qq || 0))) continue; entry.qq = row[0];
        for (const st of (Array.isArray(row[2]) ? row[2] : []).slice(0, 1 + CONFIG.online.maxGuests)) { const p = entry.players.get(st[0]); if (p) InPlay.push(p, row[0], +st[1] || 0, +st[2] || 0, +row[1] || 0); } }
      const evs = new Map(), SPN = { cw: 1, ccw: -1, hcw: 0.5, hccw: -0.5 }; for (const e of (Array.isArray(msg.e) ? msg.e : []).slice(0, 64)) { if (!Array.isArray(e) || !(e[0] > prev)) continue; const p = entry.players.get(e[1]); if (!p) continue; if (SPN[e[2]] && !this.match.mini && InPlay.spin(p, e[0], SPN[e[2]])) continue; (evs.get(p) || evs.set(p, []).get(p)).push(e[2]); }
      for (const [p, ev] of evs) this.applyTo(p, null, null, ev);
      return;
    }
    entry.seq = msg.q;
    this.applyTo(entry.players.get(entry.id), msg.x, msg.y, msg.ev);
    if (Array.isArray(msg.g)) for (const row of msg.g.slice(0, CONFIG.online.maxGuests)) if (Array.isArray(row)) this.applyTo(entry.players.get(row[0]), row[1], row[2], row[3]);
  }
  applyTo(p, x, y, events) {
    if (!p) return;
    if (x !== null) { x = +x || 0; y = +y || 0; const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } p.src.ax = x; p.src.ay = y; }
    for (const ev of Array.isArray(events) ? events.slice(0, 8) : []) {
      if (ev === 'cw') p.spinQueued = 1; else if (ev === 'ccw') p.spinQueued = -1; else if (ev === 'hcw') p.spinQueued = 0.5; else if (ev === 'hccw') p.spinQueued = -0.5;
      else if (ev === 'x') this.match.togglePress(p.side);
      else if (ev === 'use' && this.match.useBy) this.match.useBy(p);
      else if (ev === 'sw') this.match.switchChair(p);
      else if (typeof ev === 'string' && ev.startsWith('emo:') && p.chair) Emotes.recv(this.match, p.chair, ev.slice(4));   // a guest's emoji
      else if ((ev === 'cyc:1' || ev === 'cyc:-1') && p.chair && !p.chair.out && modeOf(this.match) && modeOf(this.match).cycle) modeOf(this.match).cycle(p.chair, this.match, ev === 'cyc:-1' ? -1 : 1);
      else if ((ev === 'ads:1' || ev === 'ads:0') && p.chair && p.chair.gs) { p.brAds = ev === 'ads:1' ? 1 : 0; p.chair.gs.ads = p.brAds; }
      else if ((ev === 'dr:1' || ev === 'dr:0') && p.chair) p.chair.driftHeld = ev === 'dr:1';   // drifting
      else if (ev === 'rl' && p.chair && modeOf(this.match) && (modeOf(this.match).xPress || modeOf(this.match).reload)) (modeOf(this.match).xPress || modeOf(this.match).reload).call(modeOf(this.match), p.chair, this.match);
      else if (ev === 'mel' && p.chair && modeOf(this.match) && modeOf(this.match).melee) modeOf(this.match).melee(p.chair, this.match);
      else if ((ev === 'int:1' || ev === 'int:0') && p.chair) { if (ev === 'int:1' && !p.chair.wantInt) p.chair.intPress = true; p.chair.wantInt = ev === 'int:1'; }
      else if (typeof ev === 'string' && ev.startsWith('take:') && p.chair && this.match.kind === 'br') { const sc = window.voltGame && voltGame.scene.getScene('Game'); if (sc && sc.brTakeOver) sc.brTakeOver(p, +ev.slice(5)); }
      else if (ev === 'jmp' && p.chair && modeOf(this.match) && modeOf(this.match).jump) modeOf(this.match).jump(p.chair, this.match);
      else if (typeof ev === 'string' && ev.startsWith('ap:') && p.chair && p.chair.gs) { const v = +ev.slice(3); if (isFinite(v)) { p.brAp = Math.max(BR_AIM.min, Math.min(BR_AIM.max, v)); p.chair.gs.ap = MG.r2(p.brAp); } }   // a guest tilting their gun
      else if (typeof ev === 'string' && ev.startsWith('inv:') && p.chair && modeOf(this.match) && modeOf(this.match).invAct) { const [, op, x, y] = ev.split(':'); modeOf(this.match).invAct(p.chair, { op, a: +x, b: +y }, this.match); }   // a guest rearranging their inventory
    }
  }
  tick(dt) {                                                      // call every frame during a match
    if (this.state !== 'playing' || !this.match) return;
    const now = performance.now(); if (this.matchFrom === undefined || this.matchOf !== this.match) { this.matchOf = this.match; this.matchFrom = now; for (const e of this.entries.values()) e.lastSeen = Math.max(e.lastSeen || 0, now); }   // (v14.2.14: the quiet clock starts with the match: time waiting in the room no longer counts, which dropped guests the moment a game began)
    const quiet = CONFIG.online.silenceTimeoutMs * (now - this.matchFrom < 20000 ? 4 : 1);     // the first seconds of a match: a slow device may still be building the 3D arena
    for (const e of [...this.entries.values()]) if (e.id && now - e.lastSeen > quiet) { e.conn.send({ t: 'bye', reason: 'lost' }); this.drop(e); }
    const ru = JSON.stringify(Settings.rules());                  // the host changed a rule in the pause menu: tell everyone straight away
    if (ru !== this.lastRules) { this.lastRules = ru; this.broadcast({ t: 'rules', rules: Settings.rules() }); }
    this.snapAcc += dt; const MM = this.match && this.match.mini && typeof modeOf === 'function' ? modeOf(this.match) : null, every = 1 / ((MM && MM.snapHz) || CONFIG.online.snapshotHz);   // (v14.2.14: a mode can send fewer, bigger snapshots: Volt Royale 30 a second)
    if (this.snapAcc >= every) { this.snapAcc %= every; this.sendSnapshots(); }
  }
  snapshot() {
    const m = this.match, b = m.ball;
    return { t: 'snap', n: ++this.tickNo, st: STATE_CODE[m.state], tm: r3(m.timer), ck: r3(m.clock), ot: m.overtime ? 1 : 0, pe: m.period, sc: m.score.slice(), sh: m.shots.slice(), pr: m.press.map(v => v ? 1 : 0),
      bn: m.bannerLeft > 0 ? m.banner : '', nt: m.noticeLeft > 0 ? m.notice : '',
      c: m.chairs.map(c => [r3(c.x), r3(c.y), r3(c.heading), r3(c.vx), r3(c.vy), r3(Math.max(0, c.binLeft)), c.player ? c.player.id : 0, c.dr && (c.dr.on || c.dr.boost > 0) ? [c.dr.on ? 1 : 0, r3(c.dr.ch), r3(c.dr.boost), c.dr.lvl, c.dr.dir] : 0]),   /* (v14.3.1: + the drift: see project()) */
      b: [r3(b.x), r3(b.y), r3(b.vx), r3(b.vy)], lv: m.players.map(p => [p.id, p.speedLevel]), sf: m.sfxQueue.splice(0), cm: m.callQueue.splice(0), em: m.emoQ && m.emoQ.length ? m.emoQ.splice(0) : undefined, mg: m.mini ? m.miniSnap() : undefined };
  }
  /* v14.2.14: a guest whose connection is still sending earlier snapshots is skipped this time (the sounds and calls in it are kept for
     their next one). Before, snapshots queued up behind a slow connection: the guest's game fell further and further behind (stutter, an
     inventory that didn't match) until the connection gave up and dropped them */
  sendSnapshots() { const snap = this.snapshot();
    for (const e of this.entries.values()) { if (!e.id) continue; const bl = e.conn.backlog ? e.conn.backlog() : 0;
      if (bl > 64000) { e.skipped = (e.skipped || 0) + 1; const P = e.pend || (e.pend = { sf: [], cm: [], em: [] }); P.sf.push(...(snap.sf || [])); P.cm.push(...(snap.cm || [])); P.em.push(...(snap.em || [])); continue; }
      let out = { ...snap, a: InPlay.ack(e), af: InPlay.part(e) || undefined }; if (e.pend) { out.sf = e.pend.sf.concat(snap.sf || []).slice(-60); out.cm = e.pend.cm.concat(snap.cm || []).slice(-20); const em = e.pend.em.concat(snap.em || []); out.em = em.length ? em.slice(-20) : undefined; e.pend = null; }
      /* v14.3.12 Volt Royale on the fast lane too: most of its snapshots only hold what changed since the last full one, so a lost one is
         made up by the next. The ones that must arrive still go the reliable way: the full cart state (every 15th), new loot, doors, the loot list */
      const G2 = out.mg || {}, mustArrive = this.match && this.match.kind === 'br' && !!(G2.csk || (G2.lp && ((G2.lp.f && G2.lp.f.length) || G2.lp.ids)) || (G2.gs && (G2.gs.dr || G2.gs.dh)));
      if (this.match && !mustArrive && e.conn.fastOpen && e.conn.fastOpen()) {
        if (e.conn.fastBacklog() > 32000) { e.skipped = (e.skipped || 0) + 1; const P = e.pend || (e.pend = { sf: [], cm: [], em: [] }); P.sf.push(...(out.sf || [])); P.cm.push(...(out.cm || [])); P.em.push(...(out.em || [])); continue; }
        if ((out.sf && out.sf.length) || (out.cm && out.cm.length) || (out.em && out.em.length)) e.conn.send({ t: 'fx', sf: out.sf, cm: out.cm, em: out.em });   // (these happen once: they must arrive)
        e.conn.sendFast({ ...out, sf: [], cm: [], em: undefined });
      } else e.conn.send(out); } }
  backToLobby() { this.state = 'lobby'; this.match = null; this.ghosts = new Map(); this.startMsg = null; for (const e of this.entries.values()) e.players = null; this.broadcast({ t: 'lobby' }); this.sendRoster(); }
  close(reason = 'host_left') {
    if (this.closed) return; this.closed = true; Online.clear(this);
    if (this.directory) this.directory.stop();
    this.broadcast({ t: 'bye', reason });
    setTimeout(() => { for (const e of this.entries.values()) e.conn.close(); if (this.endpoint) this.endpoint.close(); }, 200);
  }
}

/* ===== Client ===== */
class ClientSession {
  constructor(transport) {
    this.transport = transport; this.conn = null; this.myId = 0; this.code = ''; this.roster = []; this.cfg = null; this.state = 'lobby'; this.rtt = 0; this.lastHeard = 0; this.closed = false;
    this.guestSrc = new Map(); this.pendingGuests = new Map(); this.gk = 0;          // local guests: devices by player id (pending until the host confirms with a roster)
    this.onRoster = null; this.onStart = null; this.onSnapshot = null; this.onLobby = null; this.onClosed = null;
  }
  async join(code, rejoin) {
    this.code = code; this.conn = await this.transport.join(code);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.leave(); reject({ type: 'timeout' }); }, CONFIG.online.helloTimeoutMs);
      this.conn.onMessage = msg => {
        if (msg.t === 'welcome') { clearTimeout(timer); this.myId = msg.id; this.roster = msg.roster; this.cfg = msg.cfg; this.token = msg.token || null; this.rejoined = !!msg.rejoined; Rejoin.remember(code, this.token); this.lastHeard = performance.now(); this.conn.onMessage = m => this.receive(m); this.startPing(); resolve(); }
        else if (msg.t === 'reject') { clearTimeout(timer); this.leave(); reject({ type: msg.reason }); }
      };
      this.conn.onClose = () => { clearTimeout(timer); reject({ type: 'peer-unavailable' }); };
      this.conn.send({ t: 'hello', v: PROTOCOL, name: Settings.myName(), ...accountTag(), ...(rejoin ? { rejoin } : {}) });
    }).then(() => { this.conn.onClose = () => this.finish('lost'); Online.set(this); });
  }
  startPing() { this.pinger = setInterval(() => this.conn && this.conn.send({ t: 'ping', n: performance.now() }), CONFIG.online.pingEverySeconds * 1000); }
  receive(msg) {
    if (!msg || typeof msg !== 'object') return;
    this.lastHeard = performance.now();
    switch (msg.t) {
      case 'roster': this.roster = msg.roster; this.cfg = msg.cfg; this.matchGuests(); if (this.onRoster) this.onRoster(); Voice.refresh(); break;
      case 'start': this.state = 'playing'; if (this.onStart) this.onStart(msg); else this.pendingStart = msg; break;   // (a rejoin's start can arrive before the room screen is up)
      case 'snap': if (this.onSnapshot) this.onSnapshot(msg); break;
      case 'fx': if (this.onFx) this.onFx(msg); break;   /* (v14.3.11: a snapshot's sounds, calls and emotes, sent the reliable way) */
      case 'rules': Settings.applyRules(msg.rules || {}); break;
      case 'away': if (typeof Toasts !== 'undefined') Toasts.show(msg.on ? 'The host\'s screen turned off (or they switched apps), so the game is on hold until they come back.' : 'The host is back.', [], msg.on ? 6000 : 2500); this.lastHeard = performance.now() + (msg.on ? 60000 : 0); break;   /* (v14.3.1) */
      case 'lobby': this.state = 'lobby'; if (this.onLobby) this.onLobby(); break;
      case 'pong': this.rtt = performance.now() - msg.n; break;
      case 'chat': Chat.receive({ channel: 'room', ...msg }); break;
      case 'bye': this.finish(msg.reason || 'host_left'); break;
    }
  }
  setSide(side, id) { if (this.conn) this.conn.send({ t: 'side', side, id }); }
  setLock(on, id) { if (this.conn) this.conn.send({ t: 'lock', lock: !!on, id }); }
  sendChat(text, q, to) { if (this.conn) this.conn.send({ t: 'chat', text, q, to }); }
  setVid(vid) { if (this.conn) this.conn.send({ t: 'vid', vid }); }
  setName(name, id) { if (this.conn) this.conn.send({ t: 'name', name, id }); }
  addLocalGuest(src) { if (!this.conn) return; const k = ++this.gk; this.pendingGuests.set(k, { src, at: performance.now() }); this.conn.send({ t: 'addGuest', k, name: '' }); }
  removeGuest(id) { this.guestSrc.delete(id); if (this.conn) this.conn.send({ t: 'rmGuest', id }); }
  claimedSources() { const now = performance.now(); return [...this.guestSrc.values(), ...[...this.pendingGuests.values()].filter(p => now - p.at < 4000).map(p => p.src)]; }   // devices spoken for by guests
  matchGuests() {                                                 // the host's roster says which guest entries are ours: attach the devices we asked for
    for (const r of this.roster) if (r.own === this.myId && r.k && this.pendingGuests.has(r.k)) { this.guestSrc.set(r.id, this.pendingGuests.get(r.k).src); this.pendingGuests.delete(r.k); }
    for (const id of [...this.guestSrc.keys()]) if (!this.roster.some(r => r.id === id)) this.guestSrc.delete(id);
  }
  sendIn(msg) { if (this.conn) (this.conn.sendFast || this.conn.send)(msg); }
  sendInput(q, x, y, ev, g) { if (this.conn) this.conn.send({ t: 'in', q, x: r3(x), y: r3(y), ev, g: g && g.length ? g.map(r => [r[0], r3(r[1]), r3(r[2]), r[3]]) : undefined }); }
  silent() { const now = performance.now(); if (this.state !== this._sState) { this._sState = this.state; this._sAt = now; } return now - this.lastHeard > CONFIG.online.silenceTimeoutMs * (now - (this._sAt || 0) < 20000 ? 4 : 1); }   // (v14.2.14: more patience while a game is starting: a big map takes the host a moment to build)   // the scene checks this and calls finish('lost')
  finish(reason) { if (this.closed) return; this.closed = true; Online.clear(this); clearInterval(this.pinger); if (this.conn) { this.conn.onClose = null; this.conn.close(); } if (this.onClosed) this.onClosed(reason); }
  leave() { if (this.conn && !this.closed) this.conn.send({ t: 'bye' }); this.closed = true; Online.clear(this); clearInterval(this.pinger); if (this.conn) { this.conn.onClose = null; setTimeout(() => this.conn.close(), 150); } }
}

/* v14: what you need to get back into a game: the room code and your rejoin token (kept for 20 minutes, also across a page reload) */
const Rejoin = {
  remember(code, token) { if (!code || !token) return; this.cur = { code, token, at: Date.now() }; try { localStorage.setItem('volt-rejoin', JSON.stringify(this.cur)); } catch (e) { /* private mode */ } },
  get() { let r = this.cur; if (!r) { try { r = JSON.parse(localStorage.getItem('volt-rejoin') || 'null'); } catch (e) { r = null; } } return r && Date.now() - r.at < 20 * 60 * 1000 ? r : null; },
  forget() { this.cur = null; try { localStorage.removeItem('volt-rejoin'); } catch (e) { /* private mode */ } }
};

/* ===== ClientSim: what a joining player sees =====
   - Everything except your own cart is drawn slightly in the past (CONFIG.online.interpDelayMs), blended between host snapshots.
   - Your own cart is predicted locally with the same physics, so steering feels instant. Each snapshot says which of your inputs the
     host has processed (a); the predicted state at that moment is compared with the host's and your cart is nudged toward the host's. */
class ClientSim {
  /* How a joining player sees the match (the technique racing and Rocket League style games use: prediction by re-simulation).
     The host's snapshot is the truth, but it is already old when it arrives, and the host has not yet seen your last few inputs. So every frame we
     take the newest snapshot and run the game's real physics forward from it to "now": your cart with the inputs the host has not seen yet,
     the ball with the real ball physics against all carts, other carts on their last velocity. Your cart and the ball therefore always come from
     one consistent simulation, so the ball never moves before your cart touches it and never trails inside it. When a new snapshot disagrees,
     the difference is faded out over a few frames instead of popping. The host always wins. */
  constructor(session, match, players) {
    this.s = session; this.m = match; this.byId = new Map(players.map(p => [p.id, p])); this.snap = null; this.used = null; this.predIndex = -1;
    this.seq = 0; this.sendAcc = 0; this.clock = 0; this.off = null;
    // The people on this machine: you, then your local guests. Each has their own pending events, input history and predicted cart; they share one message and one ack.
    const ids = [session.myId, ...session.roster.filter(r => r.own === session.myId).map(r => r.id)];
    this.locals = ids.map(id => ({ id, me: this.byId.get(id) || { speedLevel: Settings.speedLevel }, pending: [], frames: [], spins: [], predIndex: -1 }));
    this.localIds = new Set(ids);
    this.evOut = []; this.inHist = []; this.dAcc = 0;
    session.onSnapshot = s => this.onSnap(s); session.onFx = s => this.fx(s);
  }
  fx(s) {                                                          // the one-off things: sounds, commentary, emotes
    const m = this.m;
    if (s.cm) for (const t of s.cm) m.hear(t);
    if (s.em) for (const [i, e] of s.em) if (m.chairs[i] && !(this.localIds.has(m.chairs[i].player && m.chairs[i].player.id))) Emotes.show(m.chairs[i], e);   // emojis (your own already showed)
    for (const [name, pid, x, y, z] of s.sf || []) if (!this.localIds.has(pid)) Sound.playAt(name, x === undefined ? null : { x, y, z });   /* (v14.3.9: from where it happened) */          // your own spin screech already played locally
  }
  onSnap(s) {
    if (this.snap && s.n !== undefined && this.snap.s.n !== undefined && s.n < this.snap.s.n) return;        // an older snapshot overtaken on the way: ignore
    const m = this.m;
    m.state = STATE_NAME[s.st] || 'play'; m.timer = s.tm; m.clock = s.ck; m.overtime = !!s.ot; m.period = s.pe; m.score = s.sc; if (s.sh) m.shots = s.sh; if (s.pr) m.press = s.pr.map(v => !!v);
    m.banner = s.bn; m.bannerLeft = s.bn ? 1 : 0; m.notice = s.nt; m.noticeLeft = s.nt ? 1 : 0;
    for (const [id, lv] of s.lv) { const p = this.byId.get(id); if (p && !this.localIds.has(id)) p.speedLevel = lv; }
    this.fx(s);
    if (s.mg && m.miniApply) m.miniApply(s.mg);
    if (s.a !== undefined) this.evOut = this.evOut.filter(e => e[0] > s.a);   /* (v14.3.11: events the host has had) */
    for (const L of this.locals) L.predIndex = s.c.findIndex(row => row[6] === L.id);
    this.snap = { s };
  }
  frame(dt, inputs) {                                                                      // call every render frame with each local player's input: [{ id, input }], you first
    const C = CONFIG.online; dt = Math.min(dt, 0.05); this.clock += dt;
    for (const L of this.locals) {
      const found = inputs.find(x => x.id === L.id), input = found ? found.input : { ax: 0, ay: 0, pressed: {} }, p = input.pressed || {}; let spin = 0;
      const MD = this.m.mini && modeOf(this.m), BRP = MD && MD.jumpOnA, SP = BRP;   // Volt Royale: its own buttons (modes_br2.js)
      const dh = input.held && input.held.b && !(L.me && L.me.invOpen) ? 1 : 0;   /* (Volt Royale drifts on B) */ if (dh !== (L.drSent || 0)) { L.pending.push('dr:' + dh); L.drSent = dh; } if (L.me && L.me.chair) L.me.chair.driftHeld = !!dh;   // A (hold): drift
      if (SP && L.me) { const ads = !L.me.invOpen && input.held && input.held.spinCCW ? 1 : 0; if (ads !== (L.me.brAds || 0)) L.pending.push('ads:' + ads); L.me.brAds = ads; }   // LT: aim (zoom, slower)
      if (SP) { if (!(L.me && L.me.invOpen) && (p.halfCW || p.halfCCW)) L.pending.push(p.halfCCW ? 'cyc:-1' : 'cyc:1'); }
      else { if (p.halfCW) { L.pending.push('hcw'); spin = 0.5; } if (p.halfCCW) { L.pending.push('hccw'); spin = -0.5; }
      if (!this.m.mini) { if (p.spinCW) { L.pending.push('cw'); spin = 1; } if (p.spinCCW) { L.pending.push('ccw'); spin = -1; } }   /* (v14.2.15: RT / LT turn 90 degrees again in Volt Hockey) */ }
      const MJ = this.m.mini && modeOf(this.m) && modeOf(this.m).jump;         // Volt Royale: X jumps; your gun's tilt goes to the host when it changes
      if (MJ && L.me && !L.me.invOpen) { brAimInput(L.me, input, dt); const ap = MG.r2(L.me.brAp || 0); if (Math.abs(ap - (L.sentAp || 0)) > 0.015 || (ap !== L.sentAp && this.clock - (L.apAt || 0) > 0.3)) { L.pending.push('ap:' + ap); L.sentAp = ap; L.apAt = this.clock; } }
      if (BRP) brPadEvents(L, input, dt, this.clock);
      else if (this.m.mini && !(L.me && L.me.invOpen)) { const M = modeOf(this.m), hold = M && M.holdFire && input.held && input.held.spinCW && this.clock - (L.holdAt || 0) > 0.08; if (p.spinCW || hold) { L.pending.push('use'); L.holdAt = this.clock; } } else if (p.x) L.pending.push('x');
      if (spin) { Sound.play('screech'); L.spins.push({ t: this.clock, dir: Math.sign(spin), amt: Math.abs(spin) }); if (L.spins.length > 8) L.spins.shift(); }
      if (p.y && !BRP && !(L.me && L.me.invOpen)) L.pending.push('sw');
      const v = screenToCourt(input.ax, input.ay, L.me && L.me.chair && L.me.chair.x, L.me && L.me.chair && L.me.chair.y, L.me);                            // the stick is read on screen; the host (and our prediction) work in court directions
      L.in = { ax: v.x, ay: v.y };
      L.frames.push({ seq: this.seq, t: this.clock, dt, ax: v.x, ay: v.y, spin, speed: Math.min(CONFIG.speedLevels[L.me.speedLevel - 1], Settings.maxSpeed()) });
      while (L.frames.length > 90) L.frames.shift();
    }
    this.sendAcc += dt; this.dAcc += dt;
    if (this.sendAcc >= 1 / C.inputHz) {
      /* v14.3.11: each message has the stick for the time since the last one (and how long that was), the last few of those again
         (in case one is lost on the way), and every button event the host hasn't confirmed yet */
      this.sendAcc %= 1 / C.inputHz; this.seq++; const q = this.seq;
      this.inHist.push([q, Math.round(this.dAcc * 1e4) / 1e4, this.locals.map(L => [L.id, r3(L.in.ax), r3(L.in.ay)])]); this.dAcc = 0; if (this.inHist.length > 8) this.inHist.shift();
      /* v14.3.12: the host plays one stick for the whole message (the one sent) and a spin at its start: our prediction does exactly the
         same for these frames (on a 120 / 144 Hz screen a message covers two or three frames, each with its own stick) */
      for (const L of this.locals) { const ax = r3(L.in.ax), ay = r3(L.in.ay), mm = Math.hypot(ax, ay), gx = mm > 1 ? ax / mm : ax, gy = mm > 1 ? ay / mm : ay; let sp = 0, first = null;
        for (const f of L.frames) if (f.seq === q - 1) { f.ax = gx; f.ay = gy; if (f.spin) sp = f.spin; f.spin = 0; if (!first) first = f; }
        if (first && sp) first.spin = sp; }
      for (const L of this.locals) for (const ev of L.pending.splice(0)) this.evOut.push([q, L.id, ev]); if (this.evOut.length > 64) this.evOut.splice(0, this.evOut.length - 64);
      this.s.sendIn({ t: 'in', mid: this.mid, q, s: this.inHist, e: this.evOut.length ? this.evOut : undefined });
    }
    this.render(dt);
  }
  /* Run the real physics forward from a snapshot to now. Leaves the result in the Match replica and returns a copy of it. */
  project(snap) {
    const m = this.m, S = snap.s, h = 1 / (m.kind === 'br' ? 120 : CONFIG.physics.hz), W = CONFIG.spin;   /* (v14.3.11: the host's own step: a different one gave a slightly different answer, corrected on every snapshot) */
    m.chairs.forEach((c, j) => {
      const r = S.c[j]; if (!r) return;
      c.x = r[0]; c.y = r[1]; c.heading = r[2]; c.vx = r[3]; c.vy = r[4]; c.binLeft = r[5]; c.player = this.byId.get(r[6]) || null; c.omega = 0; c.spinLeft = c.spinCooldown = 0; c.onSpin = null;
      /* v14.3.1: the drift starts from the host's too. It used to carry on from the last prediction, so every snapshot replayed the same
         unacknowledged moments onto a drift that already had them: a guest's drift charged several times faster than the host's */
      if (r.length > 7) { const d = r[7]; c.dr = d ? { on: d[0], ch: d[1], boost: d[2], lvl: d[3], dir: d[4], hop: 0 } : { on: 0, dir: 0, ch: 0, boost: 0, lvl: 0, hop: 0 }; }
    });
    Object.assign(m.ball, { x: S.b[0], y: S.b[1], vx: S.b[2], vy: S.b[3] });
    const ack = S.a || 0;
    if (S.st === STATE_CODE.play) {
      const mine = new Map(), lists = this.locals.map(L => L.frames.filter(f => f.seq >= ack)), n = lists[0].length;     // every local has the same number of frames, so index i is the same moment for all
      this.locals.forEach((L, k) => { if (L.predIndex >= 0 && m.chairs[L.predIndex]) mine.set(m.chairs[L.predIndex], k); });
      if (n) {
        this.locals.forEach((L, k) => {                              // a spin the host has already started is still running at the start of this window
          const me = m.chairs[L.predIndex]; if (!me) return;
          const t0 = lists[k][0].t - lists[k][0].dt, last = [...L.spins].reverse().find(q => q.t <= t0);
          if (last) { const el = t0 - last.t; me.spinCooldown = Math.max(0, W.cooldown - el); me.spinLeft = Math.max(0, W.seconds * (last.amt || 1) - el); me.spinOmega = last.dir * (W.degrees * Math.PI / 180) / W.seconds; }
        });
        let acc = -(S.af || 0);   /* (v14.3.12: the host has already played this much of the first one) */
        for (let i = 0; i < n; i++) {
          acc += lists[0][i].dt; let first = true;
          while (acc >= h) {
            acc -= h;
            const live = m.chairs.filter(c => c.binLeft <= 0);
            for (const c of live) {
              if (mine.has(c)) { const f = lists[mine.get(c)][i], cmd = { x: f.ax, y: f.ay, spin: first ? f.spin : 0, speed: f.speed }; c.update(h, m.miniCmd ? m.miniCmd(c, cmd) : cmd, Settings.turnSpeed); }   // (minigames: the same oil / boost / zap effects as the host)
              else { c.x += c.vx * h; c.y += c.vy * h; }                // everyone else carries on at their last velocity
            }
            first = false;
            /* v14.3.11: carts bump each other here too (the same physics as the host's, without the fouls and sounds). Without it your cart
               drove through other carts until the host's snapshot said otherwise: a big correction every time you touched someone */
            if (Settings.collisions !== false && !(m.kind === 'br')) { for (const c of live) m.chairObstacles(c); const R = CONFIG.chair.radius, M0 = CONFIG.chair.mass;
              for (let a = 0; a < live.length; a++) for (let b2 = a + 1; b2 < live.length; b2++) { const A = live[a], Bc = live[b2]; if (!mine.has(A) && !mine.has(Bc)) continue; const d = Math.hypot(Bc.x - A.x, Bc.y - A.y); if (d >= 2 * R || d === 0 || A.out || Bc.out) continue;
                const closing = Physics.circles(A, R, M0 * (A.massMul || 1), Bc, R, M0 * (Bc.massMul || 1), CONFIG.chair.chairBounce); if (typeof crashSlow === 'function') crashSlow(A, Bc, closing); } }
            for (const c of live) m.chairObstacles(c);
            m.stepBall(m.ball, h, live);
          }
        }
      }
    }
    return { c: m.chairs.map(c => ({ x: c.x, y: c.y, heading: c.heading, vx: c.vx, vy: c.vy })), b: { x: m.ball.x, y: m.ball.y, vx: m.ball.vx, vy: m.ball.vy } };
  }
  render(dt) {
    const m = this.m, C = CONFIG.online; if (!this.snap) return;
    let now = null;
    if (this.used !== this.snap) {                                       // a new snapshot: fade out whatever difference it makes to what is on screen
      /* v14.3.11: where the old snapshot would have put things now = where they were last frame, carried on by their speed (instead of
         running the whole prediction a second time: half the work on a phone) */
      const L0 = this.lastNow, adv = o => ({ ...o, x: o.x + (o.vx || 0) * dt, y: o.y + (o.vy || 0) * dt });
      const old = this.used && L0 ? { c: L0.c.map(adv), b: adv(L0.b) } : this.used ? this.project(this.used) : null; now = this.project(this.snap);
      if (old && this.off && this.snap.s.st === STATE_CODE.play) {
        const keep = (o, a, b, ang) => ({ x: o.x + a.x - b.x, y: o.y + a.y - b.y, h: ang ? o.h + normalizeAngle(a.heading - b.heading) : 0 });
        this.off.c = this.off.c.map((o, j) => (old.c[j] && now.c[j] ? keep(o, old.c[j], now.c[j], true) : { x: 0, y: 0, h: 0 }));
        this.off.b = keep(this.off.b, old.b, now.b, false);
        if (this.off.c.some(o => Math.hypot(o.x, o.y) > C.fadeMax) || Math.hypot(this.off.b.x, this.off.b.y) > C.fadeMax) this.off = null;     // a reset or a hard hit: no fading
      } else this.off = null;
      this.used = this.snap;
    } else now = this.project(this.snap);
    this.lastNow = now;
    if (!this.off) this.off = { c: m.chairs.map(() => ({ x: 0, y: 0, h: 0 })), b: { x: 0, y: 0, h: 0 } };
    const k = Math.exp(-C.fadeRate * dt); for (const o of [...this.off.c, this.off.b]) { o.x *= k; o.y *= k; o.h *= k; }
    m.chairs.forEach((c, j) => { const o = this.off.c[j]; if (o) { c.x += o.x; c.y += o.y; c.heading += o.h; } });
    m.ball.x += this.off.b.x; m.ball.y += this.off.b.y;
    /* v14.3.17 a ball in your own cup is drawn in your cup. The cart and the ball each had their own smoothing of a snapshot's correction,
       so after a hiccup (a slow phone, a late burst of snapshots) the two were smoothed differently and the ball was drawn up to a couple of
       metres off: it seemed to vanish behind you and come back a second later. Now, while the prediction has the ball in your cup, it's
       drawn exactly where it sits in the cup of the cart on screen, and any smoothing carries on from there once it leaves. */
    if (this.snap.s.st === STATE_CODE.play && !m.mini) for (const L of this.locals) {
      const k = L.predIndex, rc = now.c[k], c = m.chairs[k]; if (!rc || !c) continue;
      const Cp = CONFIG.cup, face = Cp.frontX - Cp.recess + Cp.colliderRadius + CONFIG.ball.radius, dx = now.b.x - rc.x, dy = now.b.y - rc.y, co = Math.cos(rc.heading), si = Math.sin(rc.heading), lx = dx * co + dy * si, ly = -dx * si + dy * co;
      if (lx < face - 0.12 || lx > face + 0.25 || Math.abs(ly) > Cp.halfWidth + 0.08) continue;
      const c2 = Math.cos(c.heading), s2 = Math.sin(c.heading), bx = c.x + lx * c2 - ly * s2, by = c.y + lx * s2 + ly * c2;
      this.off.b.x = bx - now.b.x; this.off.b.y = by - now.b.y; m.ball.x = bx; m.ball.y = by; break;
    }
    this.goalGate(m, this.snap.s.b);
  }
  /* The ball is drawn a little ahead of the host's, so it could reach the net before the host has counted the goal. Hold it at the mouth until the host's own ball is in. */
  goalGate(m, hbRow) {
    const R = CONFIG.ball.radius, B = m.ball, hb = { x: hbRow[0], y: hbRow[1] };
    for (const n of m.nets) {
      const dir = n.end === 0 ? -1 : 1, line = n.mouthX - dir * R, inside = o => dir * (o.x - line) > 0 && o.y > n.y1 && o.y < n.y2;
      if (inside(B) && !inside(hb)) { B.x = line; if (dir * B.vx > 0) B.vx = 0; }
      else if (inside(hb)) { B.x = hb.x; B.y = hb.y; B.vx = hbRow[2]; B.vy = hbRow[3]; }
    }
  }
}

/* v14.3.1: a host whose phone screen turns off (or who switches apps) stops running the game: tell the guests why it froze */
/* v14.3.12 a host on a computer that switches to another tab keeps the game running. The browser stops drawing a hidden tab (and the
   game loop with it), so everyone else's game froze or crawled. Now a little background ticker (a Web Worker: the browser doesn't slow
   those down) runs the game without drawing it, 60 times a second, while the tab is hidden. A phone that turns its screen off stops
   everything, workers too: there the guests are still told the host has gone, as before. */
const HostAwake = {
  w: null, last: 0,
  start() { if (this.w) return; try { this.w = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 16)'], { type: 'text/javascript' }))); this.last = performance.now(); this.w.onmessage = () => this.tick(); } catch (e) { this.w = null; } return !!this.w; },
  tick() { if (!document.hidden) return this.stop(); const now = performance.now(), d = Math.min(100, now - this.last); this.last = now; try { voltGame.headlessStep(now, d); } catch (e) { /* keep going */ } },
  stop() { if (!this.w) return; this.w.terminate(); this.w = null; try { voltGame.loop.resetDelta(); } catch (e) { /* fine */ } }
};
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { const S = typeof Online !== 'undefined' && Online.current; if (!S || !(S instanceof HostSession) || !S.entries) { HostAwake.stop(); return; }
  if (document.hidden && !(typeof isMobileDevice === 'function' && isMobileDevice()) && HostAwake.start()) return;   // (kept running: nobody needs telling)
  if (!document.hidden) { HostAwake.stop(); if (!S.toldAway) return; } S.toldAway = document.hidden;
  for (const e of S.entries.values()) { if (!document.hidden) e.lastSeen = performance.now() + 5000; try { e.conn && e.conn.send({ t: 'away', on: document.hidden }); } catch (x) { /* gone */ } } });

/* v14.3.11 InPlay: a remote player's stick, played out at a steady pace on the host. Messages arrive bunched up or spread out (that's
   the internet), and the host used to apply each one the moment it came in, for however long it happened to last until the next. The
   guest's own prediction assumed each lasted exactly as long as it did on their screen, so the two drifted apart and the guest's cart
   was corrected all the time. Now each input lasts as long as it did for the guest. A small cushion absorbs the bunching; if it grows
   (after a hiccup) it's played a little faster until it's back to normal, and if it runs dry the last stick is held. */
const InPlay = {
  /* v14.3.12: each input is played for exactly as long as it lasted on the guest's screen, never sped up or slowed down (the old way
     played them up to twice as fast to catch up after a hiccup, so the guest's cart did something slightly different on the host than on
     their own screen: a correction, which looked like lag, every time the connection or the host's frame rate wobbled). If the inputs run
     out, the last stick is held, and the cushion is left bigger from then on (it absorbs the next wobble). Only a cushion that has stayed
     big for a while is drained, very gently (a few percent), and a spin starts exactly where it did on the guest's screen. */
  push(p, q, x, y, d) { const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } const Q = p.inq || (p.inq = []); Q.push({ q, x, y, d: Math.max(0.001, Math.min(0.1, d || 1 / 60)), u: 0 }); if (Q.length > 40) { const drop = Q.splice(0, Q.length - 12); p.ackQ = drop[drop.length - 1].q; } },
  spin(p, q, v) { const it = p.inq && p.inq.find(i => i.q === q); if (it && !it.u && it !== p.inCur) { it.spin = v; return true; } return false; },
  step(m, h) {
    for (const p of m.players) { const Q = p.inq; if (!Q || !p.remote) continue;
      let left = 0; for (const it of Q) left += it.d - it.u;
      /* the smallest the cushion has been over the last 2 seconds: if even that is over 7 hundredths of a second, drain it a little */
      const now = m.simTime || 0; if (left < (p.inMin === undefined ? 1 : p.inMin)) p.inMin = left; if (now - (p.inMinAt || 0) > 2) { p.inMinWas = p.inMin; p.inMin = left; p.inMinAt = now; }
      const rate = (p.inMinWas || 0) > 0.07 && left > 0.05 ? 1.04 : 1;
      let t = h * rate;
      while (Q.length && t > 1e-9) { const it = Q[0]; if (!it.u) { p.src.ax = it.x; p.src.ay = it.y; if (it.spin) { p.spinQueued = it.spin; it.spin = 0; } p.inCur = it; }
        const u = Math.min(t, it.d - it.u); it.u += u; t -= u; if (it.d - it.u <= 1e-6) { p.ackQ = it.q; Q.shift(); p.inCur = null; } }
    }
  },
  /* how much of the next input the host has already played (seconds): the guest's prediction starts that far into it */
  part(e) { const p = e.players && e.players.get(e.id); return p && p.inq && p.inq[0] && p.inq[0].u ? Math.round(p.inq[0].u * 1e4) / 1e4 : 0; },
  ack(e) { const p = e.players && e.players.get(e.id); return p && p.ackQ !== undefined ? p.ackQ : e.seq; }
};
{ const sp = Match.prototype.savePrev; Match.prototype.savePrev = function () { if (!this.remote && this.players) InPlay.step(this, 1 / (this.kind === 'br' ? 120 : CONFIG.physics.hz)); return sp.call(this); }; }   // (savePrev runs once before every physics step)
