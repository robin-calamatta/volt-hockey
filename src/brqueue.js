/* v14.2.22 Volt Royale public matchmaking ("Public match" on the Volt Royale page). Log in, pick Solo / Duos / Trios / Squads / Fives and
   you're in the queue for that team size. The screen shows how many people are queued and who. A match starts:
     - as soon as EVERYONE queued has pressed START (so two friends, or even one person, can go straight away),
     - or when the first person in the queue has waited 5 minutes,
     - or when the queue fills a match (as many people as it has carts: 32, or 30 in Trios and Fives).
   CPU carts fill the empty spots. The first person queued hosts: their game opens an online room and the server hands the code to everyone
   else, whose games join it on their own. (Server side: /mm/poll, /mm/code, /mm/done in server/core.mjs.) */
const BRQ = {
  sizes: [1, 2, 3, 4, 5], names: { 1: 'Solos', 2: 'Duos', 3: 'Trios', 4: 'Squads (4)', 5: 'Fives' },
  carts: { 1: 32, 2: 32, 3: 30, 4: 32, 5: 30 },   // (v14.2.24: bigger matches)                       // (a whole number of teams)
  preset(sq, n) {
    const carts = this.carts[sq] || 20, mini = { ...miniCfg('br'), squad: sq, carts };
    return { mini, sizes: miniSizes(carts), teamA: Settings.teamA, teamB: Settings.teamB, difficulty: Settings.difficulty, practice: true, autoStart: Math.max(1, n) };
  },
  /* v14.3: the other online playlists */
  modes: { br: { name: 'VOLT ROYALE', sub: 'PUBLIC MATCH', col: '#c44dff' }, hockey: { name: 'VOLT HOCKEY', sub: 'QUICK MATCH  ·  3 V 3', col: '#19c3ff' }, mini: { name: 'MINIGAME MIX', sub: 'A DIFFERENT MINIGAME EACH MATCH', col: '#ff9a3c' } },
  mixKinds() { return MINI_KINDS().filter(k => !['br', 'timetrial'].includes(k) && GAME_INFO[k]); },
  presetFor(mode, M) {
    const n = Math.max(1, (M && M.accts) || (M && M.members && M.members.length) || 1), base = { teamA: Settings.teamA, teamB: Settings.teamB, difficulty: Settings.difficulty, autoStart: n };
    if (mode === 'hockey') return { ...base, practice: false, sizes: [3, 3] };
    if (mode === 'mini') { const ks = this.mixKinds(), k = ks[Math.floor(Math.random() * ks.length)] || 'race'; return { ...base, practice: true, mini: miniCfg(k), sizes: miniSizes(cartsFor(k)) }; }
    return this.preset(M.squad || 1, n);
  },
  /* how many spots you take: you, the players on your screen, and your party (if you lead one) */
  people() { return 1 + (typeof Locals !== 'undefined' ? Locals.live().length : 0) + (Party.role === 'leader' ? Party.others().length : 0); },
  accts() { return Party.role === 'leader' ? Party.members.length : 1; }
};
class BRQueueScene extends Phaser.Scene {
  constructor() { super('BRQueue'); }
  init(data) { this.mode = (data && data.mode) || 'br'; this.squad = (data && data.squad) || (modeOpts('br') || {}).squad || 1; this.go = false; this.view = null; this.busy = false; this.lastPoll = 0; this.err = ''; this.leaving = false; this.matchSeen = 0; }
  create() {
    const V = CONFIG.view, cx = V.width / 2, T = (y, s, o = {}) => this.add.text(cx, y, s, { fontFamily: FONT, fontSize: '26px', color: '#ffffff', align: 'center', ...o }).setOrigin(0.5);
    this.cameras.main.setBackgroundColor('#0b141b');
    const MD = BRQ.modes[this.mode] || BRQ.modes.br; T(70, `${MD.name}  ·  ${this.mode === 'br' ? 'PUBLIC MATCH' : 'ONLINE'}`, { fontSize: '46px', fontStyle: 'bold', color: MD.col });
    this.sizeT = T(132, '', { fontSize: '30px', fontStyle: 'bold' });
    this.mmT = T(196, 'MATCHMAKING', { fontSize: '30px', fontStyle: 'bold', color: '#9fb3c2' });   // v14.2.23: laid out like Fortnite's and Apex's matchmaking: a search timer and players found, no names
    this.countT = T(250, '', { fontSize: '64px', fontStyle: 'bold', color: '#f2c200' });
    this.pipG = this.add.graphics(); this.joinedAt = Date.now();
    this.subT = T(390, '', { fontSize: '24px', color: '#9fb3c2' });
    this.listT = T(430, '', { fontSize: '22px', color: '#9fb3c2' });
    this.timeT = T(510, '', { fontSize: '26px', fontStyle: 'bold' });
    this.helpT = T(552, `START NOW: when everyone searching has pressed it, the match starts right away and CPU carts fill the empty spots.\nOtherwise it starts when the match is full, or ${this.mode === 'br' ? '5 minutes' : '1 minute'} after the first player started searching.`, { fontSize: '20px', color: '#9fb3c2' });
    this.goB = tapButton(this, cx - 150, 630, 270, 'START NOW', () => this.toggleGo());
    tapButton(this, cx + 150, 630, 270, 'CANCEL', () => this.leave());
    if (this.mode === 'br') { tapButton(this, cx - 330, 132, 70, '◀', () => this.size(-1)); tapButton(this, cx + 330, 132, 70, '▶', () => this.size(1)); }
    if (!Account.loggedIn) { this.err = 'Log in to play online.'; tapButton(this, cx, 470, 330, 'LOG IN / SIGN UP', () => FriendsBar.toggle(true)); }
    else if (this.mode === 'br' && typeof brAllowed === 'function' && !brAllowed()) { this.err = 'Volt Royale is for players 16 and over.'; }
    this.events.once('shutdown', () => { this.stopped = true; });
    this.poll(); this.draw();
  }
  size(d) { if (this.go || this.matchSeen || this.mode !== 'br') return; const i = BRQ.sizes.indexOf(this.squad); const old = this.squad; this.squad = BRQ.sizes[(i + d + BRQ.sizes.length) % BRQ.sizes.length]; Sound.play('blip');
    Account.req('POST', '/mm/poll', { squad: old, mode: this.mode, leave: true }).catch(() => {}); this.view = null; this.poll(true); }
  toggleGo() { if (this.err || this.matchSeen) return; this.go = !this.go; Sound.play(this.go ? 'select' : 'back'); this.poll(true); this.draw(); }
  leave() { if (this.leaving) return; this.leaving = true; Sound.play('back'); if (!this.err) Account.req('POST', '/mm/poll', { squad: this.squad, mode: this.mode, leave: true }).catch(() => {}); this.scene.start('Main'); }
  async poll(now) {
    if (this.err || this.stopped || this.leaving) return; if (this.busy) { if (now) this.again = true; return; } if (!now && this.time.now - this.lastPoll < 2000) return;
    this.busy = true; this.lastPoll = this.time.now;
    try { const r = await Account.req('POST', '/mm/poll', { squad: this.squad, go: this.go, mode: this.mode, n: BRQ.people(), accts: BRQ.accts() }); if (this.stopped || this.leaving) return; this.view = r; this.offset = r.now ? r.now - Date.now() : 0; if (r.match) this.onMatch(r.match); }
    catch (e) { this.err = (e && e.message) || 'Could not reach the server.'; }
    finally { this.busy = false; this.draw(); if (this.again) { this.again = false; this.poll(true); } }
  }
  onMatch(M) {
    if (!this.matchSeen) { this.matchSeen = this.time.now; Sound.play('goal'); }
    if (M.you === 'host') {                                              // you host: open the room (the others join it when its code reaches them)
      if (this.started) return; this.started = true; this.scene.start('Room', { role: 'host', preset: { ...BRQ.presetFor(M.mode || this.mode, M), mm: { id: M.id } } }); return; }
    if (M.code && !this.started) { this.started = true; Account.req('POST', '/mm/done', {}).catch(() => {}); if (Party.role === 'leader') Party.goRoom(M.code); joinRoomFromAnywhere(M.code); return; }   /* (your party comes with you) */
    if (this.time.now - this.matchSeen > 45000) { Account.req('POST', '/mm/done', {}).catch(() => {}); this.matchSeen = 0; this.go = false; Toasts.show('The host didn\'t open the match. Back in the queue.', [], 4000); }
  }
  draw() {
    const v = this.view, sq = this.squad;
    this.sizeT.setText(this.mode === 'br' ? `Teams:  ${BRQ.names[sq]}` : (BRQ.modes[this.mode] || {}).sub || '');
    if (this.err) { this.countT.setText('—'); this.subT.setText(this.err); this.listT.setText(''); this.timeT.setText(''); return; }
    if (!v) { this.countT.setText('...'); this.subT.setText('Joining the queue'); return; }
    const mmss = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`, cap = v.cap || 20;
    if (this.matchSeen) { this.mmT.setText('MATCH FOUND'); { const k = v.match ? v.match.people || v.match.members.length : 0; this.countT.setText(v.match ? `${k} player${k > 1 ? 's' : ''}` : ''); } this.subT.setText(v.match && v.match.you === 'host' ? 'You\'re hosting: opening the match...' : 'Joining the match...'); this.listT.setText(`+ ${Math.max(0, cap - (v.match ? v.match.people || v.match.members.length : 0))} CPU carts`); this.timeT.setText(''); this.drawPips(v.match ? v.match.people || v.match.members.length : 0, cap); return; }
    this.mmT.setText(`MATCHMAKING   ${mmss(Date.now() - this.joinedAt)}`);
    this.countT.setText(`${v.count} / ${cap}`); this.subT.setText('players found'); this.drawPips(v.count, cap);
    this.listT.setText(v.count > 1 ? `${v.ready || 0} of ${v.count} pressed START NOW` : 'Press START NOW to play right away with CPU carts');
    const left = v.startsAt ? Math.max(0, v.startsAt - (Date.now() + (this.offset || 0))) : null;
    this.timeT.setText(left === null ? '' : `Starting in ${mmss(left)} at the latest`).setColor(this.go ? '#7dff6a' : '#ffffff');
    this.goB.t.setText(this.go ? '✓ READY (undo)' : 'START NOW');
  }
  drawPips(n, cap) {   // one pip per spot in the match: lit for players found
    const G = this.pipG.clear(), V = CONFIG.view, w = Math.min(36, 760 / cap), x0 = V.width / 2 - (cap * w) / 2, y = 318;
    for (let i = 0; i < cap; i++) G.fillStyle(i < n ? 0xf2c200 : 0x24343f, 1).fillRoundedRect(x0 + i * w + 3, y, w - 6, 22, 5);
  }
  update() {
    Controls.update(this.game.loop.frame); const e = Controls.menu();
    if (e.b) return this.leave();
    if (e.a || e.start) this.toggleGo();
    if (e.left) this.size(-1); if (e.right) this.size(1); if (this.err && e.x && !Account.loggedIn) FriendsBar.toggle(true);
    if (this.err && Account.loggedIn && /Log in/.test(this.err)) { this.err = ''; this.scene.restart({ mode: this.mode, squad: this.squad }); return; }   /* (logged in from this screen: into the queue) */
    this.poll(); if (this.view && !this.matchSeen && this.time.now % 1000 < 20) this.draw();
    if (this.view && !this.matchSeen) this.draw();
  }
}
/* the host's room: post its code for the others, then tell the server we're under way */
{ const P = RoomScene.prototype, up = P.update;
  P.update = function (...a) {
    const r = up.apply(this, a), mm = this.preset && this.preset.mm;
    if (mm && this.session) this.session.mmFill = true;   // (public match: the people fill squads together, like Fortnite's fill; CPUs make up the rest)
    if (mm && !this.mmPosted && this.session && this.session.code) { this.mmPosted = true; Account.req('POST', '/mm/code', { code: this.session.code }).catch(() => {}); setTimeout(() => Account.req('POST', '/mm/done', {}).catch(() => {}), 60000); }
    return r;
  };
}
/* the Volt Royale page gets a "Public match" row */
{ const P = MiniSetupScene.prototype, cr = P.create;
  P.create = function (...a) {
    if (this.kind === 'br' && !this._mmPatched) { this._mmPatched = true; const bm = this.buildMenu; this.buildMenu = function (t, items, ...r) {
      const i = items.findIndex(it => /^Host an online room/.test(typeof it.label === 'function' ? it.label() : it.label));
      const row = { label: () => 'Public match (find players online)' + leaderPicks(), hint: 'Queue up with anyone online: Solos, Duos, Trios, Squads or Fives. It starts when everyone queued presses START (or after 5 minutes); CPUs fill the rest.', select: () => memberWaits() || this.scene.start('BRQueue', { squad: (modeOpts('br') || {}).squad || 1 }) };
      if (i >= 0) items.splice(i, 1, row); else items.splice(items.length - 1, 0, row);   // (it takes the place of "Host an online room": public matches are Volt Royale's online mode)
      return bm.call(this, t, items, ...r); }; }
    return cr.apply(this, a);
  };
}
