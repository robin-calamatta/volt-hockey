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
const accountTag = () => ({ acct: typeof Account !== 'undefined' ? Account.name : '', adult: typeof Account !== 'undefined' && Account.adult, vid: typeof Voice !== 'undefined' ? Voice.myId() : '' });
const cleanCode = text => String(text || '').toUpperCase().split('').filter(ch => CONFIG.online.codeAlphabet.includes(ch)).join('').slice(0, CONFIG.online.codeLength);

/* ---- transport: a "connection" is { send(obj), close(), onMessage, onClose } ---- */
class PeerTransport {
  static available() { return typeof Peer === 'function'; }
  options() { return { ...CONFIG.online.peerServer, config: { iceServers: CONFIG.online.iceServers }, debug: 0 }; }
  wrap(conn, peer) {
    const w = { onMessage: null, onClose: null, send: o => { try { conn.send(o); } catch (e) { /* closed */ } }, close: () => { try { conn.close(); } catch (e) {} if (peer) peer.destroy(); } };
    conn.on('data', d => w.onMessage && w.onMessage(d)); conn.on('close', () => w.onClose && w.onClose()); conn.on('error', () => w.onClose && w.onClose());
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
    left: cleanText(r.left, 16), right: cleanText(r.right, 16), skill: cleanText(r.skill, 12), practice: !!r.practice, playing: !!r.playing, v: num(r.v, 0, 99) };
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
  const t = (e && (e.type || e.reason)) || 'unknown';
  return ({
    'peer-unavailable': 'Room not found. Check the code.', timeout: 'Could not reach the room (timed out). Check the code. If it is right, a router or firewall may be blocking the connection between the two computers.',
    ice: 'Found the room, but the two computers could not connect to each other directly (a router or firewall is blocking it). The game needs a relay server for this network (DEPLOY.md, "TURN relay").',
    network: 'Could not reach the matchmaking server. Check your internet connection.', 'server-error': 'The matchmaking server had a problem. Try again in a moment.',
    'socket-error': 'Lost the matchmaking server. Try again.', 'socket-closed': 'Lost the matchmaking server. Try again.', 'unavailable-id': 'Could not create a room. Try again.',
    'browser-incompatible': 'This browser does not support online play.', full: 'That room is full.', started: 'That match has already started. Ask the host to return to the lobby.',
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
    this.transport = transport; this.code = null; this.myId = 1; this.state = 'lobby'; this.entries = new Map(); this.nextId = 2; this.match = null; this.guestSrc = new Map();      // guestSrc: the devices of this machine's local guests (id -> input source)
    this.cfg = { teamA: Settings.teamA, teamB: Settings.teamB, sizes: [CONFIG.match.chairsPerTeam, CONFIG.match.chairsPerTeam], difficulty: Settings.difficulty, practice: false };
    this.roster = [{ id: 1, name: Settings.myName() || 'Player 1', side: 0, host: true, ...accountTag() }]; this.snapAcc = 0;   // accountTag: username, adult, voice id (for chat and voice rules) this.tickNo = 0; this.closed = false;
    this.onChange = null; this.onPlayerLeft = null; this.onError = null;
    this.visibility = 'private'; this.lobbyName = DIR().names[0]; this.directory = null;       // public rooms appear in everyone's Browse list
  }
  publicInfo() {                                                  // what the room list shows (null while private)
    if (this.visibility !== 'public' || !this.code || this.closed) return null;
    return { code: this.code, name: this.lobbyName, host: this.roster[0].name, players: this.roster.length, max: Math.min(CONFIG.online.maxPlayers, this.cfg.sizes[0] + this.cfg.sizes[1]),
      left: TEAMS[this.cfg.teamA].name, right: TEAMS[this.cfg.teamB].name, skill: this.cfg.difficulty, practice: this.cfg.practice, playing: this.state !== 'lobby', v: PROTOCOL };
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
  setName(id, name) { const p = this.roster.find(r => r.id === id), clean = Settings.cleanName(name); if (!p || !clean) return; p.name = this.uniqueName(clean, id); this.sendRoster(); }
  count(side) { return this.roster.filter(p => p.side === side).length; }
  guestName(taken) { return CONFIG.playerNames.find(n => !taken.includes(n)) || 'Guest'; }
  openSide() { if (this.cfg.season) return this.count(this.cfg.season.side) < this.cfg.sizes[this.cfg.season.side] ? this.cfg.season.side : undefined; return [0, 1].filter(s => this.count(s) < this.cfg.sizes[s]).sort((a, b) => this.count(a) - this.count(b))[0]; }   // a season game: everyone plays for the leader's team
  claimedSources() { return [...this.guestSrc.values()]; }
  guestsOf(owner) { return this.roster.filter(r => r.own === owner); }
  /* A local guest: another person on the same machine as a player, with a controller of their own. They get a cart and a roster entry, but share the owner's connection. */
  addGuest(owner, name, k, preferSide) {
    if (this.state !== 'lobby' || this.roster.length >= CONFIG.online.maxPlayers || this.guestsOf(owner).length >= CONFIG.online.maxGuests) return null;
    const side = preferSide !== undefined && this.count(preferSide) < this.cfg.sizes[preferSide] ? preferSide : this.openSide(); if (side === undefined) return null;
    const g = { id: this.nextId++, name: this.uniqueName(Settings.cleanName(name) || this.guestName(this.roster.map(r => r.name))), side, own: owner, guest: true, k: k || 0 };
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
      if (this.state !== 'lobby') return this.reject(entry, 'started');
      const side = this.openSide();
      if (this.roster.length >= CONFIG.online.maxPlayers || side === undefined) return this.reject(entry, 'full');
      entry.id = this.nextId++; clearTimeout(entry.hello);
      this.roster.push({ id: entry.id, name: this.uniqueName(Settings.cleanName(msg.name) || 'Player ' + (this.roster.length + 1)), side, acct: cleanText(msg.acct, 20), adult: !!msg.adult, vid: cleanText(msg.vid, 80) });
      entry.conn.send({ t: 'welcome', id: entry.id, code: this.code, roster: this.roster, cfg: this.cfg });
      return this.sendRoster();
    }
    switch (msg.t) {
      case 'side': if (this.state === 'lobby') { const p = this.canEdit(entry, msg.id === undefined ? entry.id : msg.id); if (p) this.setSide(p.id, msg.side); } break;
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
  setSide(id, side) {
    const p = this.roster.find(r => r.id === id);
    if (!p || (side !== 0 && side !== 1) || p.side === side || this.count(side) >= this.cfg.sizes[side] || (this.cfg.season && side !== this.cfg.season.side)) return false;
    p.side = side; this.sendRoster(); return true;
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
      this.roster = this.roster.filter(r => r.id !== entry.id && r.own !== entry.id);   // their guests go with them
      if (entry.players && this.match) for (const p of entry.players.values()) this.match.removePlayer(p);            // a CPU takes over their carts
      if (this.onPlayerLeft) this.onPlayerLeft(entry.id);
      this.sendRoster();
    }
  }

  /* ---- in a match ---- */
  start(localSource) {                                           // returns the Match; call from the host's room screen
    const players = this.roster.map((r, i) => ({ id: r.id, name: r.name, side: r.side, locked: !!r.lock, tag: 'P' + (i + 1), speedLevel: Settings.speedLevel, chair: null, spinQueued: 0,
      remote: !(r.host || r.own === 1), src: r.host ? localSource : r.own === 1 ? this.guestSrc.get(r.id) : { ax: 0, ay: 0, pressed: {} } }));
    for (const e of this.entries.values()) e.players = new Map(players.filter(p => p.id === e.id || (this.roster.find(r => r.id === p.id) || {}).own === e.id).map(p => [p.id, p]));
    const se = this.cfg.season;                                    // a party season game: the season's length and each team's own skill
    this.match = makeMatch({ mini: this.cfg.mini || null, teamA: this.cfg.teamA, teamB: this.cfg.teamB, players, difficulty: this.cfg.difficulty, sizes: this.cfg.sizes, practice: this.cfg.practice, periodSeconds: se ? se.periodSeconds : undefined, diffBySide: se ? se.levels : undefined });
    this.match.sfxQueue = []; this.match.callQueue = []; this.state = 'playing'; this.snapAcc = 0; this.relist();
    this.broadcast({ t: 'start', cfg: this.cfg, rules: Settings.rules(), players: players.map(p => ({ id: p.id, name: p.name, side: p.side, tag: p.tag })) });
    return this.match;
  }
  applyInput(entry, msg) {                                       // a player's stick and button events (plus those of their local guests, in msg.g)
    if (!entry.players || !this.match) return;
    if (!(msg.q > entry.seq)) return; entry.seq = msg.q;
    this.applyTo(entry.players.get(entry.id), msg.x, msg.y, msg.ev);
    if (Array.isArray(msg.g)) for (const row of msg.g.slice(0, CONFIG.online.maxGuests)) if (Array.isArray(row)) this.applyTo(entry.players.get(row[0]), row[1], row[2], row[3]);
  }
  applyTo(p, x, y, events) {
    if (!p) return;
    x = +x || 0; y = +y || 0; const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    p.src.ax = x; p.src.ay = y;
    for (const ev of Array.isArray(events) ? events.slice(0, 8) : []) {
      if (ev === 'cw') p.spinQueued = 1; else if (ev === 'ccw') p.spinQueued = -1; else if (ev === 'hcw') p.spinQueued = 0.5; else if (ev === 'hccw') p.spinQueued = -0.5;
      else if (ev === 'x') this.match.togglePress(p.side);
      else if (ev === 'use' && this.match.useBy) this.match.useBy(p);
      else if (ev === 'up') p.speedLevel = Math.min(Settings.speedCap, p.speedLevel + 1);
      else if (ev === 'down') p.speedLevel = Math.max(1, p.speedLevel - 1);
      else if (ev === 'sw') this.match.switchChair(p);
    }
  }
  tick(dt) {                                                      // call every frame during a match
    if (this.state !== 'playing' || !this.match) return;
    const now = performance.now(); if (this.matchFrom === undefined || this.matchOf !== this.match) { this.matchOf = this.match; this.matchFrom = now; }
    const quiet = CONFIG.online.silenceTimeoutMs * (now - this.matchFrom < 15000 ? 3 : 1);     // the first seconds of a match: a slow device may still be building the 3D arena
    for (const e of [...this.entries.values()]) if (e.id && now - e.lastSeen > quiet) { e.conn.send({ t: 'bye', reason: 'lost' }); this.drop(e); }
    const ru = JSON.stringify(Settings.rules());                  // the host changed a rule in the pause menu: tell everyone straight away
    if (ru !== this.lastRules) { this.lastRules = ru; this.broadcast({ t: 'rules', rules: Settings.rules() }); }
    this.snapAcc += dt; const every = 1 / CONFIG.online.snapshotHz;
    if (this.snapAcc >= every) { this.snapAcc %= every; this.sendSnapshots(); }
  }
  snapshot() {
    const m = this.match, b = m.ball;
    return { t: 'snap', n: ++this.tickNo, st: STATE_CODE[m.state], tm: r3(m.timer), ck: r3(m.clock), ot: m.overtime ? 1 : 0, pe: m.period, sc: m.score.slice(), sh: m.shots.slice(), pr: m.press.map(v => v ? 1 : 0),
      bn: m.bannerLeft > 0 ? m.banner : '', nt: m.noticeLeft > 0 ? m.notice : '',
      c: m.chairs.map(c => [r3(c.x), r3(c.y), r3(c.heading), r3(c.vx), r3(c.vy), r3(Math.max(0, c.binLeft)), c.player ? c.player.id : 0]),
      b: [r3(b.x), r3(b.y), r3(b.vx), r3(b.vy)], lv: m.players.map(p => [p.id, p.speedLevel]), sf: m.sfxQueue.splice(0), cm: m.callQueue.splice(0), mg: m.mini ? m.miniSnap() : undefined };
  }
  sendSnapshots() { const snap = this.snapshot(); for (const e of this.entries.values()) if (e.id) e.conn.send({ ...snap, a: e.seq }); }
  backToLobby() { this.state = 'lobby'; this.match = null; for (const e of this.entries.values()) e.players = null; this.broadcast({ t: 'lobby' }); this.sendRoster(); }
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
  async join(code) {
    this.code = code; this.conn = await this.transport.join(code);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.leave(); reject({ type: 'timeout' }); }, CONFIG.online.helloTimeoutMs);
      this.conn.onMessage = msg => {
        if (msg.t === 'welcome') { clearTimeout(timer); this.myId = msg.id; this.roster = msg.roster; this.cfg = msg.cfg; this.lastHeard = performance.now(); this.conn.onMessage = m => this.receive(m); this.startPing(); resolve(); }
        else if (msg.t === 'reject') { clearTimeout(timer); this.leave(); reject({ type: msg.reason }); }
      };
      this.conn.onClose = () => { clearTimeout(timer); reject({ type: 'peer-unavailable' }); };
      this.conn.send({ t: 'hello', v: PROTOCOL, name: Settings.myName(), ...accountTag() });
    }).then(() => { this.conn.onClose = () => this.finish('lost'); Online.set(this); });
  }
  startPing() { this.pinger = setInterval(() => this.conn && this.conn.send({ t: 'ping', n: performance.now() }), CONFIG.online.pingEverySeconds * 1000); }
  receive(msg) {
    if (!msg || typeof msg !== 'object') return;
    this.lastHeard = performance.now();
    switch (msg.t) {
      case 'roster': this.roster = msg.roster; this.cfg = msg.cfg; this.matchGuests(); if (this.onRoster) this.onRoster(); Voice.refresh(); break;
      case 'start': this.state = 'playing'; if (this.onStart) this.onStart(msg); break;
      case 'snap': if (this.onSnapshot) this.onSnapshot(msg); break;
      case 'rules': Settings.applyRules(msg.rules || {}); break;
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
  sendInput(q, x, y, ev, g) { if (this.conn) this.conn.send({ t: 'in', q, x: r3(x), y: r3(y), ev, g: g && g.length ? g.map(r => [r[0], r3(r[1]), r3(r[2]), r[3]]) : undefined }); }
  silent() { return performance.now() - this.lastHeard > CONFIG.online.silenceTimeoutMs; }   // the scene checks this and calls finish('lost')
  finish(reason) { if (this.closed) return; this.closed = true; Online.clear(this); clearInterval(this.pinger); if (this.conn) { this.conn.onClose = null; this.conn.close(); } if (this.onClosed) this.onClosed(reason); }
  leave() { if (this.conn && !this.closed) this.conn.send({ t: 'bye' }); this.closed = true; Online.clear(this); clearInterval(this.pinger); if (this.conn) { this.conn.onClose = null; setTimeout(() => this.conn.close(), 150); } }
}

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
    session.onSnapshot = s => this.onSnap(s);
  }
  onSnap(s) {
    if (this.snap && s.n !== undefined && this.snap.s.n !== undefined && s.n < this.snap.s.n) return;        // an older snapshot overtaken on the way: ignore
    const m = this.m;
    m.state = STATE_NAME[s.st] || 'play'; m.timer = s.tm; m.clock = s.ck; m.overtime = !!s.ot; m.period = s.pe; m.score = s.sc; if (s.sh) m.shots = s.sh; if (s.pr) m.press = s.pr.map(v => !!v);
    m.banner = s.bn; m.bannerLeft = s.bn ? 1 : 0; m.notice = s.nt; m.noticeLeft = s.nt ? 1 : 0;
    for (const [id, lv] of s.lv) { const p = this.byId.get(id); if (p && !this.localIds.has(id)) p.speedLevel = lv; }
    if (s.cm) for (const t of s.cm) m.hear(t);
    if (s.mg && m.miniApply) m.miniApply(s.mg);
    for (const [name, pid] of s.sf) if (!this.localIds.has(pid)) Sound.play(name);          // your own spin screech already played locally
    for (const L of this.locals) L.predIndex = s.c.findIndex(row => row[6] === L.id);
    this.snap = { s };
  }
  frame(dt, inputs) {                                                                      // call every render frame with each local player's input: [{ id, input }], you first
    const C = CONFIG.online; dt = Math.min(dt, 0.05); this.clock += dt;
    for (const L of this.locals) {
      const found = inputs.find(x => x.id === L.id), input = found ? found.input : { ax: 0, ay: 0, pressed: {} }, p = input.pressed || {}; let spin = 0;
      if (p.halfCW) { L.pending.push('hcw'); spin = 0.5; } if (p.halfCCW) { L.pending.push('hccw'); spin = -0.5; }
      if (p.spinCW) { L.pending.push('cw'); spin = 1; } if (p.spinCCW) { L.pending.push('ccw'); spin = -1; }
      if (this.m.mini) { if (p.a || p.x) L.pending.push('use'); } else if (p.x) L.pending.push('x');
      if (spin) { Sound.play('screech'); L.spins.push({ t: this.clock, dir: Math.sign(spin), amt: Math.abs(spin) }); if (L.spins.length > 8) L.spins.shift(); }
      if (p.speedUp && L.me.speedLevel < Settings.speedCap) { L.me.speedLevel++; L.pending.push('up'); }
      if (p.speedDown && L.me.speedLevel > 1) { L.me.speedLevel--; L.pending.push('down'); }
      if (p.y) L.pending.push('sw');
      const v = screenToCourt(input.ax, input.ay, L.me && L.me.chair && L.me.chair.x, L.me && L.me.chair && L.me.chair.y, L.me);                            // the stick is read on screen; the host (and our prediction) work in court directions
      L.in = { ax: v.x, ay: v.y };
      L.frames.push({ seq: this.seq, t: this.clock, dt, ax: v.x, ay: v.y, spin, speed: Math.min(CONFIG.speedLevels[L.me.speedLevel - 1], Settings.maxSpeed()) });
      while (L.frames.length > 90) L.frames.shift();
    }
    this.sendAcc += dt;
    if (this.sendAcc >= 1 / C.inputHz) {
      this.sendAcc %= 1 / C.inputHz; this.seq++; const [you, ...guests] = this.locals;
      this.s.sendInput(this.seq, you.in.ax, you.in.ay, you.pending.splice(0), guests.map(L => [L.id, L.in.ax, L.in.ay, L.pending.splice(0)]));
    }
    this.render(dt);
  }
  /* Run the real physics forward from a snapshot to now. Leaves the result in the Match replica and returns a copy of it. */
  project(snap) {
    const m = this.m, S = snap.s, h = CONFIG.online.predictStep, W = CONFIG.spin;
    m.chairs.forEach((c, j) => {
      const r = S.c[j]; if (!r) return;
      c.x = r[0]; c.y = r[1]; c.heading = r[2]; c.vx = r[3]; c.vy = r[4]; c.binLeft = r[5]; c.player = this.byId.get(r[6]) || null; c.omega = 0; c.spinLeft = c.spinCooldown = 0; c.onSpin = null;
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
        let acc = 0;
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
      const old = this.used ? this.project(this.used) : null; now = this.project(this.snap);
      if (old && this.off && this.snap.s.st === STATE_CODE.play) {
        const keep = (o, a, b, ang) => ({ x: o.x + a.x - b.x, y: o.y + a.y - b.y, h: ang ? o.h + normalizeAngle(a.heading - b.heading) : 0 });
        this.off.c = this.off.c.map((o, j) => (old.c[j] && now.c[j] ? keep(o, old.c[j], now.c[j], true) : { x: 0, y: 0, h: 0 }));
        this.off.b = keep(this.off.b, old.b, now.b, false);
        if (this.off.c.some(o => Math.hypot(o.x, o.y) > C.fadeMax) || Math.hypot(this.off.b.x, this.off.b.y) > C.fadeMax) this.off = null;     // a reset or a hard hit: no fading
      } else this.off = null;
      this.used = this.snap;
    } else now = this.project(this.snap);
    if (!this.off) this.off = { c: m.chairs.map(() => ({ x: 0, y: 0, h: 0 })), b: { x: 0, y: 0, h: 0 } };
    const k = Math.exp(-C.fadeRate * dt); for (const o of [...this.off.c, this.off.b]) { o.x *= k; o.y *= k; o.h *= k; }
    m.chairs.forEach((c, j) => { const o = this.off.c[j]; if (o) { c.x += o.x; c.y += o.y; c.heading += o.h; } });
    m.ball.x += this.off.b.x; m.ball.y += this.off.b.y;
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
