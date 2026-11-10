/* Online screens: the Online menu, joining by room code, and the room lobby (host and joiners). Gameplay itself is GameScene in online mode.
   Everything is usable from a gamepad or a keyboard. */

class OnlineMenuScene extends ListMenuScene {
  constructor() { super('OnlineMenu'); }
  init(data) { this.message = (data && data.message) || ''; this.autoJoin = (data && data.autoJoin) || ''; }   // autoJoin: an invite or your party leader's room
  create() {
    const ok = PeerTransport.available(), blocked = () => this.note.setText(netErrorText({ type: 'unsupported' }));
    const rj = typeof Rejoin !== 'undefined' && Rejoin.get();
    this.buildMenu('ONLINE', [
      ...(rj && ok ? [{ label: () => `▶ Back into your game (room ${rj.code})`, hint: 'Your connection dropped: rejoin the game that is still going, in your own cart', select: () => joinRoomByCode(this, rj.code, t => this.note && this.note.active && this.note.setText(t), () => {}, rj.token) }] : []),
      { label: () => 'Create room', select: () => (ok ? this.scene.start('Room', { role: 'host' }) : blocked()) },
      { label: () => 'Create a minigame room', hint: 'Balloon Bash, Race or Manhunt online (or switch any room with its Game row)', select: () => this.scene.start('Minigames') },
      { label: () => 'Browse public rooms', select: () => (ok ? this.scene.start('Browse') : blocked()) },
      { label: () => 'Join with a code', select: () => (ok ? this.scene.start('JoinCode') : blocked()) },
      { label: () => 'Back', select: () => this.scene.start('Main') }
    ], 230);
    this.onBack = () => this.scene.start('Main');
    if (this.autoJoin) { const code = this.autoJoin; this.autoJoin = ''; this.time.delayedCall(50, () => joinRoomByCode(this, code, t => this.note && this.note.active && this.note.setText(t), () => {})); }
    this.note = this.add.text(CX, 560, this.message, { ...STYLE.hint, fontSize: '24px', align: 'center', wordWrap: { width: 900 } }).setOrigin(0.5);
    this.add.text(CX, 660, 'Up to 6 players. Create a room and keep it private (friends join with its 5-letter code) or make it public so anyone can find it under Browse. CPU carts fill the empty spots.', { ...STYLE.hint, fontSize: '18px', color: '#9fb2bf', align: 'center', wordWrap: { width: 1000 } }).setOrigin(0.5);
  }
}


// A tappable button for the online screens (phones have no keyboard or gamepad here).
function tapButton(scene, x, y, w, label, fn) {
  const bg = scene.add.rectangle(x, y, w, 56, 0x1b2a35).setStrokeStyle(2, 0x3c5566), t = scene.add.text(x, y, label, { ...STYLE.hint, fontSize: '26px', color: '#ffffff' }).setOrigin(0.5);
  const hit = scene.add.zone(x, y, w, 64).setInteractive({ useHandCursor: true });
  hit.on('pointerdown', () => { Sound.resume(); Sound.play('select'); fn(); });
  return { bg, t, hit };
}

// Connect to a room by code from any screen. onNote shows progress / errors; onFail runs when the attempt did not work.
function joinRoomByCode(scene, code, onNote, onFail, rejoin) {
  onNote(rejoin ? 'Getting you back into the game...' : 'Connecting...'); Sound.play('select');
  const session = new ClientSession(new PeerTransport());
  session.join(code, rejoin).then(() => {
    if (!scene.scene.isActive()) return session.leave();          // backed out while connecting
    scene.scene.start('Room', { role: 'client', session });
  }).catch(e => { if (rejoin && e && e.type === 'started') { Rejoin.forget(); e = { type: 'rejoin-over' }; } onFail(); if (scene.scene.isActive()) onNote(netErrorText(e)); });
}

/* The public room list: lobby name, host, players, teams and CPU skill. Up/down chooses, A joins, Y refreshes, LT joins by code, B goes back. It refreshes itself every few seconds. */
class BrowseScene extends Phaser.Scene {
  constructor() { super('Browse'); }
  create() {
    const D = CONFIG.online.directory; this.rooms = []; this.cursor = 0; this.busy = false; this.loading = false; this.lastLoad = -1e9; this.status = 'Searching for public rooms...';
    this.add.text(CX, 70, 'PUBLIC ROOMS', { ...STYLE.title, fontSize: '64px' }).setOrigin(0.5);
    this.head = this.add.text(150, 150, 'LOBBY                          HOST         PLAYERS   TEAMS                        CPU', { fontFamily: 'monospace', fontSize: '18px', color: '#7f95a3' });
    this.rowsText = Array.from({ length: this.pageSize() }, (_, i) => this.add.text(150, 190 + i * 52, '', { fontFamily: 'monospace', fontSize: '24px', color: STYLE.colorIdle }));
    this.note = this.add.text(CX, 545, '', { ...STYLE.hint, fontSize: '24px', align: 'center', wordWrap: { width: 1000 } }).setOrigin(0.5);
    this.add.text(CX, 685, 'Tap a room to join.   Gamepad: A join   Y refresh   LT join with a code   B back', { ...STYLE.hint, fontSize: '20px', color: '#9fb2bf' }).setOrigin(0.5);
    this.rowZones = this.rowsText.map((_, i) => this.add.zone(CX, 190 + i * 52 + 14, 1100, 50).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tapRow(i)));
    tapButton(this, 250, 600, 180, 'Back', () => this.scene.start('OnlineMenu'));
    tapButton(this, 450, 600, 180, 'Refresh', () => { this.refresh(); });
    tapButton(this, 680, 600, 220, 'Join with code', () => this.scene.start('JoinCode'));
    this.refresh();
  }
  firstRow() { return clamp(this.cursor - Math.floor(this.rowsText.length / 2), 0, Math.max(0, this.rooms.length - this.rowsText.length)); }
  tapRow(i) {                                                  // tap a room to join it
    if (this.busy) return; const idx = this.firstRow() + i, r = this.rooms[idx]; if (!r) return; this.cursor = idx;
    if (this.state(r) !== 'JOIN') { this.note.setText('That room cannot be joined right now (' + this.state(r).toLowerCase() + ').'); Sound.play('back'); return; }
    this.busy = true; joinRoomByCode(this, r.code, t => this.note.setText(t), () => { this.busy = false; this.refresh(); });
  }
  pageSize() { return 8; }
  refresh() {
    if (this.loading) return; this.loading = true; this.lastLoad = this.time.now;
    listPublicRooms().then(res => {
      this.loading = false; if (!this.scene.isActive()) return;
      this.rooms = res.rooms.filter(r => r.kind !== 'br' || brAllowed()).sort((a, b) => (a.playing - b.playing) || (b.players - a.players));
      this.cursor = clamp(this.cursor, 0, Math.max(0, this.rooms.length - 1));
      this.status = res.error ? netErrorText({ type: res.error }) : (this.rooms.length ? '' : 'No public rooms right now. Go back and create one!');
    });
  }
  state(r) { return r.v !== PROTOCOL ? 'OLD VERSION' : r.playing ? 'IN MATCH' : r.players >= r.max ? 'FULL' : 'JOIN'; }
  update(time) {
    Controls.update(this.game.loop.frame);
    const e = Controls.menu(), n = this.rooms.length;
    if (!this.busy) {
      if (e.up && n) { this.cursor = (this.cursor + n - 1) % n; Sound.play('blip'); }
      if (e.down && n) { this.cursor = (this.cursor + 1) % n; Sound.play('blip'); }
      if (e.b) { Sound.play('back'); return this.scene.start('OnlineMenu'); }
      if (e.spinCCW) return this.scene.start('JoinCode');
      if (e.y) { this.refresh(); Sound.play('blip'); }
      const r = this.rooms[this.cursor];
      if (e.a && r) {
        if (this.state(r) !== 'JOIN') { this.note.setText('That room cannot be joined right now (' + this.state(r).toLowerCase() + ').'); Sound.play('back'); }
        else { this.busy = true; joinRoomByCode(this, r.code, t => this.note.setText(t), () => { this.busy = false; this.refresh(); }); }
      }
      if (time - this.lastLoad > CONFIG.online.directory.refreshMs) this.refresh();
    }
    const first = clamp(this.cursor - Math.floor(this.rowsText.length / 2), 0, Math.max(0, n - this.rowsText.length));
    this.rowsText.forEach((t, i) => {
      const r = this.rooms[first + i]; if (!r) return t.setText('');
      const teams = (r.left + ' v ' + r.right).slice(0, 26), st = this.state(r), sel = first + i === this.cursor;
      t.setText((sel ? '▶ ' : '  ') + r.name.slice(0, 26).padEnd(28) + r.host.slice(0, 11).padEnd(13) + (r.players + '/' + r.max).padEnd(10) + teams.padEnd(29) + (r.practice ? 'Practice' : r.skill).padEnd(10) + st)
        .setColor(sel ? STYLE.colorSelected : st === 'JOIN' ? STYLE.colorIdle : '#6c7f8c');
    });
    if (!this.busy) this.note.setText(this.status);
  }
}

/* Type the code on a keyboard (paste works too), or use a gamepad: up/down changes the letter, left/right moves, A joins, B goes back. */
class JoinCodeScene extends Phaser.Scene {
  constructor() { super('JoinCode'); }
  create() {
    const N = CONFIG.online.codeLength; this.chars = Array(N).fill(''); this.cursor = 0; this.busy = false;
    this.add.text(CX, 90, 'JOIN ROOM', { ...STYLE.title, fontSize: '72px' }).setOrigin(0.5);
    this.slots = this.chars.map((_, i) => this.add.text(CX + (i - (N - 1) / 2) * 120, 300, '_', { fontFamily: FONT, fontSize: '110px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5));
    this.add.text(CX, 440, 'Type the room code, or use the gamepad: ▲ ▼ change letter, ◀ ▶ move, A join, B back.   Enter joins, Esc goes back.', { ...STYLE.hint, fontSize: '20px', align: 'center', wordWrap: { width: 1000 } }).setOrigin(0.5);
    this.note = this.add.text(CX, 540, '', { ...STYLE.hint, fontSize: '26px', align: 'center', wordWrap: { width: 900 } }).setOrigin(0.5);
    this.onKey = e => {                                         // raw keyboard: letters type into the code
      if (this.busy || Controls.isBlocked()) return;             // a pop-up or chat is in front
      if (e.target && e.target.tagName === 'INPUT') { if (e.key === 'Enter') this.submit(); else if (e.key === 'Escape') this.back(); return; }   // the phone's text box handles its own letters
      if (e.key === 'Backspace') { this.cursor = Math.max(0, this.chars[this.cursor] ? this.cursor : this.cursor - 1); this.chars[this.cursor] = ''; }
      else if (e.key === 'Enter') this.submit();
      else if (e.key === 'Escape') this.back();
      else if (e.key.length === 1 && CONFIG.online.codeAlphabet.includes(e.key.toUpperCase())) { this.chars[this.cursor] = e.key.toUpperCase(); this.cursor = Math.min(N - 1, this.cursor + 1); }
    };
    this.onPaste = e => { const code = cleanCode(e.clipboardData && e.clipboardData.getData('text')); if (code) { this.chars = Array.from({ length: N }, (_, i) => code[i] || ''); this.cursor = Math.min(N - 1, code.length); } };
    this.makeInput();
    tapButton(this, CX - 330, 590, 220, 'Join', () => this.submit());
    tapButton(this, CX - 90, 590, 220, 'Back', () => this.back());
    window.addEventListener('keydown', this.onKey); window.addEventListener('paste', this.onPaste);
    this.events.once('shutdown', () => { window.removeEventListener('keydown', this.onKey); window.removeEventListener('paste', this.onPaste); if (this.input_) this.input_.remove(); });
  }
  /* A see-through text box laid over the code boxes: tapping the boxes focuses it, which brings up the phone's keyboard. */
  makeInput() {
    const el = document.createElement('input'); this.input_ = el; el.type = 'text'; el.maxLength = 12; el.autocomplete = 'off'; el.spellcheck = false;
    el.setAttribute('autocapitalize', 'characters'); el.setAttribute('autocorrect', 'off'); el.setAttribute('enterkeyhint', 'go'); el.setAttribute('aria-label', 'Room code');
    Object.assign(el.style, { position: 'fixed', zIndex: 20, background: 'transparent', border: '0', outline: '0', color: 'transparent', caretColor: 'transparent', fontSize: '24px', textTransform: 'uppercase', touchAction: 'manipulation' });
    el.addEventListener('input', () => {
      const N = this.chars.length, code = cleanCode(el.value); this.chars = Array.from({ length: N }, (_, i) => code[i] || ''); this.cursor = Math.min(N - 1, code.length);
      if (code.length === N) el.blur();                       // full code: close the keyboard so the Join button is visible
    });
    document.body.appendChild(el);
    this.add.text(CX, 380, 'Tap the boxes to type', { ...STYLE.hint, fontSize: '22px', color: '#9fb2bf' }).setOrigin(0.5);
  }
  placeInput() {
    const el = this.input_, r = this.game.canvas.getBoundingClientRect(), k = r.width / CONFIG.view.width, N = this.chars.length;
    el.style.left = r.left + (CX - N * 60) * k + 'px'; el.style.top = r.top + (300 - 70) * k + 'px'; el.style.width = N * 120 * k + 'px'; el.style.height = 140 * k + 'px';
  }
  back() { Sound.play('back'); this.scene.start('OnlineMenu'); }
  submit() {
    const code = this.chars.join('');
    if (this.busy || code.length < CONFIG.online.codeLength) { this.note.setText('Enter all ' + CONFIG.online.codeLength + ' letters.'); return; }
    this.busy = true; joinRoomByCode(this, code, t => this.note.setText(t), () => { this.busy = false; });
  }
  update() {
    Controls.update(this.game.loop.frame); if (this.input_) this.placeInput();
    const alpha = CONFIG.online.codeAlphabet;
    if (!this.busy) for (const s of Controls.list().filter(s => s.id.startsWith('pad'))) {   // gamepads only here: keyboard letters go to the raw handler above
      const p = s.pressed, n = this.chars.length;
      if (p.left) this.cursor = Math.max(0, this.cursor - 1); if (p.right) this.cursor = Math.min(n - 1, this.cursor + 1);
      if (p.up || p.down) { const i = alpha.indexOf(this.chars[this.cursor] || alpha[0]); this.chars[this.cursor] = alpha[(i + (p.up ? 1 : -1) + alpha.length) % alpha.length]; Sound.play('blip'); }
      if (p.a) this.submit(); if (p.b) this.back();
    }
    this.slots.forEach((t, i) => t.setText(this.chars[i] || '_').setColor(i === this.cursor ? '#f2c200' : '#ffffff'));
  }
}

/* The room: shows the code and who is on which side. The host sets teams, sizes and difficulty and starts the match. */
class RoomScene extends ListMenuScene {
  constructor() { super('Room'); }
  init(data) { this.role = data.role; this.session = data.session || null; this.cursorAt = data.cursor || 0; this.capturing = false; this.rules = !!data.rules; this.preset = data.preset || (data.session && data.session.preset) || null; this.again = !!data.again; }   // preset: a party leader's match / practice / season game (partyGame)
  create() {
    const host = this.role === 'host'; this.opening = false;
    if (host && !this.session) {
      this.opening = true; this.session = new HostSession(new PeerTransport());
      if (this.preset) { this.session.preset = this.preset; const { seasonFx, ...cfg } = this.preset; Object.assign(this.session.cfg, cfg); this.session.seasonFx = seasonFx || null; if (cfg.season) { this.session.roster[0].side = cfg.season.side; this.session.roster[0].mid = false; } }
      this.session.open().then(() => { this.opening = false; }).catch(e => this.fail(e));
    }
    const cycle = (key, d) => { const cfg = this.session.cfg, other = key === 'teamA' ? cfg.teamB : cfg.teamA; let i = cfg[key]; do { i = (i + d + TEAMS.length) % TEAMS.length; } while (i === other); this.session.setConfig({ [key]: i }); };
    const size = (side, d) => { const sizes = [...this.session.cfg.sizes]; sizes[side] = clamp(sizes[side] + d, 1, CONFIG.match.chairsPerTeam); this.session.setConfig({ sizes }); };
    const names = Object.keys(CONFIG.difficulties), me = () => this.session.roster.find(r => r.id === this.session.myId);
    const flip = () => { const side = me() ? 1 - me().side : 0; if (host) this.session.setSide(1, side); else this.session.setSide(side); };
    const cfg = () => this.session.cfg, teamName = i => TEAMS[i].name;
    const GAMES = [null, ...MINI_KINDS()], cycleGame = d => {           // hockey or a minigame (its options come from the host's Minigames settings)
      const i = GAMES.indexOf(cfg().mini ? cfg().mini.kind : null), k = GAMES[(i + d + GAMES.length) % GAMES.length];
      this.session.setConfig(k ? { mini: miniCfg(k), practice: true } : { mini: null, practice: false });
    };
    const rename = n => { if (Settings.nameLocked()) return; if (host) this.session.setName(this.session.myId, n); else this.session.setName(n); };
    const yourName = nameItem(rename);
    const yourSide = { label: () => `Your side   ◀ ${me() && me().side ? 'Right' : 'Left'} ▶`, change: flip, select: flip };
    const lockMe = () => { const on = !(me() && me().lock); if (host) this.session.setLock(this.session.myId, on); else this.session.setLock(on); };
    const yourLock = { label: () => `Your cart   ◀ ${me() && me().lock ? 'Locked: one cart all game' : 'Can switch with Y'} ▶`, change: lockMe, select: lockMe };
    // Local guests: friends on this machine, each on a controller of their own. They play in this room through your connection.
    const S = this.session, mine = S ? S.roster.filter(r => r.own === S.myId) : [], max = CONFIG.online.maxGuests;
    this.guestSig = mine.map(r => r.id + ':' + r.side).join();
    const flipGuest = g => () => { const side = 1 - g.side; if (host) this.session.setSide(g.id, side); else this.session.setSide(side, g.id); };
    // the host can put anyone on either team (not in a season game: everyone plays for the season team)
    const others = host ? S.roster.filter(r => r.id !== S.myId && r.own !== S.myId) : [];
    const moveRows = host && !(S.cfg && S.cfg.season) ? others.map(r => ({ label: () => { const x = S.roster.find(q => q.id === r.id); return x ? `${x.name}${x.guest ? ' (guest)' : ''}   ◀ ${x.side ? 'Right' : 'Left'} team ▶` : ''; }, change: () => { const x = S.roster.find(q => q.id === r.id); if (x) S.setSide(x.id, 1 - x.side); }, select: () => { const x = S.roster.find(q => q.id === r.id); if (x) S.setSide(x.id, 1 - x.side); } })) : [];
    this.rosterSig = S ? S.roster.map(r => r.id).join() : '';
    const guestRows = [...mine.map(g => ({ label: () => `Guest ${g.name}   ◀ ${g.side ? 'Right' : 'Left'} ▶   (A: remove)`, change: flipGuest(g), select: () => { this.session.removeGuest(g.id, host ? 1 : undefined); } })),
      ...(S && mine.length < max && S.roster.length < CONFIG.online.maxPlayers ? [{ label: () => 'Add a local guest...', select: () => this.beginCapture() }] : [])];
    // the host's list is split in two pages so every row stays big enough to tap on a phone
    const page = rules => () => this.scene.restart({ role: this.role, session: this.session, cursor: 0, rules, preset: this.preset });
    const items = host && !this.rules ? [
      yourName, ...(S.cfg && S.cfg.season ? [] : [yourSide]), yourLock, ...guestRows, ...moveRows,
      { label: () => `Room   ◀ ${this.session.visibility === 'public' ? 'PUBLIC (listed)' : 'Private (code only)'} ▶`, change: () => this.toggleVisibility(), select: () => this.toggleVisibility() },
      { label: () => `Lobby name   ◀ ${this.session.lobbyName} ▶`, change: d => this.cycleName(d), select: () => this.typeName() },
      { label: () => `Game   ◀ ${miniLabel(cfg().mini)} ▶`, change: d => cycleGame(d), select: () => cycleGame(1) },
      { label: () => `Teams and rules ▸   (${TEAMS[cfg().teamA].name} v ${TEAMS[cfg().teamB].name}, ${cfg().practice ? 'practice' : cfg().difficulty})`, select: page(true) },
      { label: () => 'START MATCH', select: () => this.startHost() },
      { label: () => 'Close room', select: () => this.leave() }
    ] : host ? [
      toggle('Cart collisions', 'collisions'), toggle('Penalties', 'penalties'), slider('Penalty time', 'penaltySeconds', v => `${v} s`), toggle('Penalties carry over after a goal', 'penaltyCarry'), lockCartItem(), slider('Game clock speed', 'timeSpeed', times),   // rules: only the host can change these, and they are fixed for everyone at kick-off
      { label: () => `Left team   ◀ ${teamName(cfg().teamA)} ▶`, change: d => cycle('teamA', d) },
      { label: () => `Right team   ◀ ${teamName(cfg().teamB)} ▶`, change: d => cycle('teamB', d) },
      { label: () => `Left side carts   ◀ ${cfg().sizes[0]} ▶`, change: d => size(0, d) },
      { label: () => `Right side carts   ◀ ${cfg().sizes[1]} ▶`, change: d => size(1, d) },
      { label: () => `CPU skill   ◀ ${cfg().difficulty} ▶`, change: d => this.session.setConfig({ difficulty: names[(names.indexOf(cfg().difficulty) + d + names.length) % names.length] }) },
      { label: () => `Practice (no clock)   ◀ ${cfg().practice ? 'On' : 'Off'} ▶`, change: () => this.session.setConfig({ practice: !cfg().practice }), select: () => this.session.setConfig({ practice: !cfg().practice }) },
      { label: () => '◂ Back to the room', select: page(false) }
    ] : [yourName, yourSide, yourLock, ...guestRows, { label: () => `Game: ${miniLabel(cfg() && cfg().mini)}` }, { label: () => 'Teams, carts per side, CPU skill and the rules are set by the host' }, { label: () => 'Leave room', select: () => this.leave() }];
    this.buildMenu('', items.map(it => ({ ...it, select: it.select && (() => !this.opening && it.select()), change: it.change && (d => !this.opening && it.change(d)) })), 120, { x: 330, size: 32 });
    this.onBack = host && this.rules ? page(false) : () => this.leave(); this.cursor = Math.min(this.cursorAt, this.items.length - 1);
    this.codeText = this.add.text(CX, 45, '', { ...STYLE.title, fontSize: '48px' }).setOrigin(0.5);
    this.statusText = this.add.text(330, 690, '', { ...STYLE.hint, fontSize: '20px', align: 'center', wordWrap: { width: 600 } }).setOrigin(0.5);
    this.sideTitles = [0, 1].map(s => this.add.text(1010, 130 + s * 280, '', { ...STYLE.hud, fontSize: '36px' }).setOrigin(0.5, 0));
    this.sideLists = [0, 1].map(s => this.add.text(1010, 175 + s * 280, '', { fontFamily: FONT, fontSize: '26px', color: '#e8eef2', align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0));
    if (this.session) this.wire();
  }
  wire() {
    const s = this.session;
    if (this.role === 'client') { s.onStart = msg => this.beginClient(msg); s.onClosed = reason => this.fail({ type: reason }); s.onRoster = () => {}; s.onLobby = () => {}; }
    else { s.onError = e => { if (this.statusText && this.statusText.active) this.statusText.setText(netErrorText(e)); }; s.onChange = () => {}; }
  }
  toggleVisibility() { this.session.setVisibility(this.session.visibility === 'public' ? 'private' : 'public'); }
  cycleName(d) { const names = CONFIG.online.directory.names, i = names.indexOf(this.session.lobbyName); this.session.setLobbyName(names[(i + d + names.length) % names.length]); }
  typeName() {                                                    // A on the name row: type your own (browser prompt; gamepad players use the presets with left / right)
    if (typeof window.prompt !== 'function') return; let t = null;
    try { t = window.prompt('Lobby name', this.session.lobbyName); } catch (e) { /* prompts can be blocked inside embeds: use the presets */ }
    if (t !== null) this.session.setLobbyName(t);
  }
  // Host: build the match and go. Clients get the 'start' message and build a replica (below).
  startHost() {
    const s = this.session, match = s.start(Controls.mine);
    this.scene.start('Game', { online: { role: 'host', session: s, match, players: match.players, me: match.players.find(p => p.id === s.myId) } });
  }
  beginClient(msg) {
    const s = this.session; Settings.applyRules(msg.rules || {});
    const players = msg.players.map(p => ({ id: p.id, name: p.name, side: p.side, tag: p.tag, speedLevel: Settings.speedLevel, chair: null, spinQueued: 0, look: p.id === s.myId ? null : Avatar.cleanLook(p.look) }));
    const match = makeMatch({ mini: msg.cfg.mini || null, teamA: msg.cfg.teamA, teamB: msg.cfg.teamB, players, difficulty: msg.cfg.difficulty, sizes: msg.cfg.sizes, practice: msg.cfg.practice, remote: true, periodSeconds: msg.cfg.season ? msg.cfg.season.periodSeconds : undefined });
    this.scene.start('Game', { online: { role: 'client', session: s, match, players, sim: new ClientSim(s, match, players) } });
  }
  exit(message) {                                             // close or leave the room and go back to the Online menu (a party leader's own game: back where it was started)
    Settings.restoreRules(); Controls.claimed.clear();
    if (this.session) { try { this.role === 'host' ? this.session.close(this.preset ? 'party_done' : undefined) : this.session.leave(); } catch (x) { /* already closed */ } }
    if (this.preset && this.preset.season) return this.scene.start('SeasonHub');
    if (this.preset) return this.scene.start('Main');
    this.scene.start('OnlineMenu', { message });
  }
  fail(e) { this.exit(netErrorText(e)); }
  leave() { Sound.play('back'); this.exit(''); }
  beginCapture() { if (Controls.freeSources().length < 2) { this.flash = 'You need to keep one controller for yourself, so plug in or connect another one for the guest.'; this.flashUntil = this.time.now + 4000; return; } this.hostDev = Controls.list().find(x => x.pressed.a || x.held.a || x.pressed.start) || null; this.capturing = true; }
  captureUpdate() {                                           // waiting for the guest to press A on their own controller
    Controls.update(this.game.loop.frame); const s = this.session, free = Controls.freeSources().filter(x => x !== this.hostDev);   // the device you used to choose 'Add a local guest' stays yours
    if (Controls.list().some(x => x.pressed.b || x.pressed.start)) { this.capturing = false; Sound.play('back'); return; }
    if (this.hostDev && this.hostDev.pressed.a) { this.flash = 'That is your own controller. The guest presses A on theirs.'; this.flashUntil = this.time.now + 3000; }
    const src = free.find(x => x.pressed.a); if (!src) return;
    if (Controls.freeSources().length < 2) { this.flash = 'Keep one controller for yourself.'; this.flashUntil = this.time.now + 3000; return; }
    this.capturing = false; Sound.play('select'); if (this.role === 'host') s.addLocalGuest(src); else s.addLocalGuest(src);
    this.flash = 'Guest is using: ' + src.label; this.flashUntil = this.time.now + 4000;
  }
  update() {
    const s = this.session; if (s) Controls.claim(s.claimedSources());
    if (s && this.capturing) { this.captureUpdate(); this.statusText.setText((this.flash && this.time.now < this.flashUntil ? this.flash + '\n' : '') + 'GUEST: press A on their controller (Space on keyboard 1, Right Shift on keyboard 2).  B cancels.'); return; }
    super.update(); if (!s || !this.sys.isActive() || !this.sideLists) return;
    if (s.roster.filter(r => r.own === s.myId).map(r => r.id + ':' + r.side).join() !== this.guestSig || (this.role === 'host' && s.roster.map(r => r.id).join() !== this.rosterSig)) { this.scene.restart({ role: this.role, session: s, cursor: this.cursor, rules: this.rules, preset: this.preset }); return; }
    if (this.role === 'client' && s.silent()) { s.finish('lost'); return; }
    if (!this.sys.isActive() || !this.codeText || !this.codeText.active) return;     // the scene is on its way out: nothing left to draw
    this.codeText.setText(this.opening || !s.code ? 'Opening room...' : 'ROOM  ' + s.code + (this.role === 'host' ? (s.visibility === 'public' ? '  · PUBLIC' : '  · PRIVATE') : ''));
    this.statusText.setText(this.flash && this.time.now < this.flashUntil ? this.flash : this.role === 'host' ? (this.opening ? '' : (s.visibility === 'public' ? 'Listed under Online > Browse public rooms. You can also share the code.' : 'Private: share the code. Friends choose Online > Join with a code.')) : 'Waiting for the host to start the match...');
    [0, 1].forEach(side => {
      const team = TEAMS[side ? s.cfg.teamB : s.cfg.teamA], people = s.roster.filter(r => r.side === side), cpus = Math.max(0, s.cfg.sizes[side] - people.length);
      this.sideTitles[side].setText(team.name.toUpperCase()).setColor('#' + team.color.toString(16).padStart(6, '0'));
      this.sideLists[side].setText([...people.map(r => (r.id === s.myId || r.own === s.myId ? '▶ ' : '') + r.name + (r.host ? ' (host)' : r.guest ? ' (guest)' : '')), ...Array(cpus).fill('CPU')].join('\n'));
    });
  }
}
