/* v13.5: local players join in the lobby and come along into every game.
   - In the lobby: press START on a second controller (or ＋ PLAYER, then A on the new player's controller). Hold B on their controller to leave.
   - They stand on the stage with you and play every game with you: hockey, seasons, minigames, Battle Royale (your squad),
     and online rooms and party games (they join as your local guests).
   - Games with two teams (Volt Hockey matches and practice, team minigames) still open the side picker, with you and them already on it
     (in the middle to start with: ◀ ▶ picks a side, X locks you to one cart, START plays; anyone left in the middle doesn't play). Seasons, free-for-alls and Battle Royale go straight in. */
const Locals = {
  list: [], max: 3, primary: null,                                       // primary: the device you (the main player) last used
  live() { const L = Controls.list(); this.list = this.list.filter(l => L.includes(l.src)); return this.list; },
  srcs() { return this.live().map(l => l.src); },
  has(src) { return this.list.some(l => l.src === src); },
  add(src) {
    if (!src || this.has(src) || this.live().length >= this.max || src === this.primary) return null;
    const taken = [Settings.myName(), ...this.list.map(l => l.name)], name = Settings.nextName(CONFIG.playerNames[(this.list.length + 1) % CONFIG.playerNames.length], 0, taken);
    const l = { src, name, look: Avatar.randomLook(11 + this.list.length * 17 + name.length * 3) }; this.list.push(l); Sound.play('select'); return l;
  },
  remove(src) { this.list = this.list.filter(l => l.src !== src); Sound.play('back'); },
  /* the players for a local game: you, then everyone on this machine */
  players(sides) {                                                       // sides: (index) => side
    const me = { src: Controls.mine, side: sides(0), chair: null, spinQueued: 0, speedLevel: Settings.speedLevel, name: Settings.myName() || 'Player 1', tag: 'P1', squad: 1 };
    return [me, ...this.live().map((l, i) => ({ src: l.src, side: sides(i + 1), chair: null, spinQueued: 0, speedLevel: Settings.speedLevel, name: l.name, tag: 'P' + (i + 2), look: l.look, squad: 1 }))];
  }
};

/* ---- no controller screen: the game starts with you and your local players ---- */
{ const P = LobbyScene.prototype, cr = P.create;
  P.create = function () {
    if (!this.season && !this.br && (!this.mini || this.mini.mode === 'teams')) {   /* games with two teams: pick your side (you and your local players are already on the screen) */
      cr.call(this); const me = Locals.primary && !Locals.has(Locals.primary) && Controls.list().includes(Locals.primary) ? Locals.primary : null;
      const join = (src, name, look) => { this.players.push({ src, side: null, chair: null, spinQueued: 0, speedLevel: Settings.speedLevel, name, look, squad: 0, x: this.colX[1] }); };
      if (me) join(me, Settings.myName() || this.firstName()); for (const l of Locals.live()) join(l.src, l.name, l.look);
      return;
    }
    const n = 1 + Locals.live().length, sz = this.sizes || [3, 3];
    let side;
    if (this.season) side = () => this.season.side;
    else if (this.br) side = () => 0;
    else { const order = []; for (let i = 0; i < n; i++) { const s = sz[0] > order.filter(x => x === 0).length ? 0 : sz[1] > order.filter(x => x === 1).length ? 1 : null; order.push(s); } side = i => order[i]; }   // your team first, then the other one when yours is full
    const players = Locals.players(side).filter(p => p.side !== null);
    if (this.br) { const sq = this.mini.squad || 1; if (players.length > sq) this.mini = { ...this.mini, squad: Math.min(5, players.length) }; }
    Controls.owner = null; Controls.claim(Locals.srcs());
    this.scene.start('Game', { players, sizes: this.sizes, practice: this.practice, season: this.season, mini: this.mini });
  };
}

/* Battle Royale from the lobby: your local players are in your squad */
{ const q = brQuickPlay;
  brQuickPlay = function (sc) {
    const n = Locals.live().length; if (n && Party.active && Party.members.length > 1) { const o = modeOpts('br'), want = Math.min(5, Party.members.length + n); if (want > (o.squad || 1)) modeSave('br', { squad: want }); }
    if (!n || (Party.active && Party.members.length > 1)) return q(sc);
    if (typeof memberWaits === 'function' && memberWaits()) return;
    const o = modeOpts('br'); if (1 + n > (o.squad || 1)) modeSave('br', { squad: Math.min(5, 1 + n) });
    Sound.play('select'); Controls.owner = null; Controls.claim(Locals.srcs());
    sc.scene.start('Game', { players: Locals.players(() => 0), sizes: miniSizes(cartsFor('br')), practice: true, mini: miniCfg('br') });
  };
  const M = LOBBY_MODES.find(x => x.id === 'br'); M.go = sc => brQuickPlay(sc);
}

/* ---- online rooms (and party games): your local players join as your guests ---- */
{ const P = RoomScene.prototype, up = P.update;
  P.update = function (...a) {
    const s = this.session, ready = s && (this.role === 'host' ? !this.opening : s.myId !== undefined && s.myId !== null);
    if (ready && !this.rules) { s._autoLocals = s._autoLocals || new Set();
      for (const l of Locals.live()) { if (s._autoLocals.has(l.src)) continue; s._autoLocals.add(l.src);
        const has = s.guestSrc && [...s.guestSrc.values()].includes(l.src); if (!has && s.roster.length < CONFIG.online.maxPlayers) { try { s.addLocalGuest(l.src); } catch (e) { /* the room is full */ } } } }
    return up.apply(this, a);
  };
}

/* ---- the lobby: join, leave, and see them on the stage ---- */
{ const P = LobbyHomeScene.prototype, cr = P.create, up = P.update, sp = LobbyStage.prototype.setParty;
  LobbyStage.prototype.setParty = function (list) { return sp.call(this, [...Locals.live().map(l => ({ key: 'local-' + l.src.id, name: l.name, look: l.look, local: true })), ...list]); };
  P.create = function () {
    cr.call(this); const V = CONFIG.view; this.capT = null;
    this.addBtn = this.add.text(36, V.height - 146, '👥  ＋ PLAYER', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#1b2a35d0', padding: { x: 10, y: 6 } }).setOrigin(0, 0.5).setDepth(8).setInteractive({ useHandCursor: true }).on('pointerdown', () => { Sound.resume(); this.startCapture(); });
    this.localHint = this.add.text(196, V.height - 146, '', { fontFamily: FONT, fontSize: '15px', color: '#cfd8de', backgroundColor: '#0d151bd0', padding: { x: 8, y: 6 } }).setOrigin(0, 0.5).setDepth(9);
  };
  P.startCapture = function () {
    if (Locals.live().length >= Locals.max) { this.flashLocal('Up to 4 players on one screen'); return; }
    if (Controls.freeSources().length < 2) { this.flashLocal('Connect another controller (or use the other half of the keyboard) for the new player'); return; }
    const V = CONFIG.view; this.capT = this.add.text(V.width / 2, V.height / 2, 'NEW PLAYER\nPress A on their controller\n(B to cancel)', { fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: '#ffffff', align: 'center', backgroundColor: '#05070fe0', padding: { x: 40, y: 26 } }).setOrigin(0.5).setDepth(60);
    this.capAt = this.time.now; Sound.play('select');
  };
  P.flashLocal = function (s) { this.localMsg = s; this.localMsgUntil = this.time.now + 3500; Sound.play('back'); };
  P.update = function (time, delta) {
    Controls.claim(Locals.srcs());
    if (this.capT) {                                                       // waiting for the new player's A
      Controls.update(this.game.loop.frame);
      if (this.time.now - this.capAt > 250) for (const src of Controls.freeSources()) {
        if (src.pressed.a && src !== Locals.primary) { Locals.add(src); this.capT.destroy(); this.capT = null; break; }
        if (src.pressed.b || Controls.escPressed) { this.capT.destroy(); this.capT = null; Sound.play('back'); break; }
      }
      if (this.stage && this.stage.ok) { this.stage.setParty(Party.active ? Party.others() : []); this.stage.render(Math.min(0.05, delta / 1000), { x: 0.47, zoom: 1 }); }
      return;
    }
    for (const src of Controls.freeSources()) { if (src.pressed.start && src.id.startsWith('pad') && Locals.primary && src !== Locals.primary && Locals.live().length < Locals.max) { Locals.add(src); Controls.claim(Locals.srcs()); src.pressed = {}; }   // a second gamepad presses START: they're in
      else if (BUTTONS.some(b => src.pressed[b])) Locals.primary = src; }
    for (const l of Locals.live()) { if (l.src.held.b) { l.bHeld = (l.bHeld || 0) + delta / 1000; if (l.bHeld > 1.1) Locals.remove(l.src); } else l.bHeld = 0; }
    up.call(this, time, delta);
    if (!this.scene.isActive() || !this.addBtn || !this.addBtn.active) return;
    const show = LOBBY_TABS[this.tab] === 'PLAY' && !this.overlay, L = Locals.live();
    this.addBtn.setVisible(show && L.length < Locals.max);
    const msg = this.localMsg && this.time.now < this.localMsgUntil ? this.localMsg : L.length ? `On this screen: ${L.map(l => l.name).join(', ')}   (hold B on their controller to leave)` : '2nd controller: press START to join';
    this.localHint.setVisible(show).setText(msg);
  };
}
