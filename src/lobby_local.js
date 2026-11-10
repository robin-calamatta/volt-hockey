/* v13.5: local players join in the lobby and come along into every game.
   - In the lobby: press START on a second controller (or ＋ PLAYER, then A on the new player's controller). Hold B on their controller to leave.
   - They stand on the stage with you and play every game with you: hockey, seasons, minigames, Volt Royale (your squad),
     and online rooms and party games (they join as your local guests).
   - Games with two teams (Volt Hockey matches and practice, team minigames) still open the side picker, with you and them already on it
     (in the middle to start with: ◀ ▶ picks a side, X locks you to one cart, START plays; anyone left in the middle doesn't play). Seasons, free-for-alls and Volt Royale go straight in. */
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

/* Volt Royale from the lobby: your local players are in your squad */
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
    this.localHint.setVisible(show).setText(msg + (this.mateList && this.mateList().length && !(this.localMsg && this.time.now < this.localMsgUntil) ? '     ▲: pick someone (or tap them)' : ''));
  };
}

/* ---- v14: pick someone on the stage (▲ on the PLAY tab, or tap them): their profile and stats, and the party leader can remove them.
   Local players on this screen can always be removed from here. Nothing private is shown (no email). ---- */
{ const P = LobbyHomeScene.prototype, cr = P.create, up = P.update;
  P.create = function () { cr.call(this); this.pFocus = -1; this.pPop = null; this.pZones = new Map(); this.pG = this.add.graphics().setDepth(9); this.pHint = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#1a1206', backgroundColor: '#ffd23f', padding: { x: 8, y: 3 } }).setOrigin(0.5).setDepth(9).setVisible(false); };
  P.mateList = function () { return this.stage && this.stage.mates ? [...this.stage.mates.entries()].map(([key, M]) => ({ key, M })) : []; };
  P.whoIs = function (key) {
    if (key.startsWith('local-')) { const l = Locals.live().find(x => 'local-' + x.src.id === key); return l ? { local: l, name: l.name } : null; }
    const m = Party.active && Party.members.find(x => x.key === key); return m ? { member: m, name: m.name } : null;
  };
  P.openPerson = function (key) {
    const who = this.whoIs(key); if (!who) return; this.closePerson(); Sound.play('select');
    const V = CONFIG.view, x = V.width / 2 - 300, y = 150, w = 600, objs = [], g = this.add.graphics().setDepth(60); objs.push(g);
    const st = who.member && who.member.st, hrs = s => !s ? '0 min' : s < 3600 ? `${Math.floor(s / 60)} min` : `${(s / 3600).toFixed(1)} h`;
    const lines = who.local ? ['Plays on this screen with you', '', 'Joins every game you start, on your team or in your squad.'] : st ? [`Level ${st.lvl}   ·   Season pass tier ${st.tier}`, `${st.games} ${st.games === 1 ? "game" : "games"}   ·   ${st.wins} ${st.wins === 1 ? "win" : "wins"}   ·   ${st.goals} ${st.goals === 1 ? "goal" : "goals"}   ·   ${st.cups} ${st.cups === 1 ? "cup" : "cups"}`, `Volt Hockey ${hrs(st.volt)}   ·   minigames ${hrs(st.mini)}${brAllowed() ? `   ·   Volt Royale ${hrs(st.br)}` : ''}`] : ['No stats shared yet'];
    if (who.member && who.member.leader) lines.unshift('👑 Party leader'); else if (who.member && who.member.acct) lines.unshift('Account: ' + who.member.acct);
    const btns = [];
    if (who.local) btns.push({ label: 'Remove from this screen', go: () => { Locals.remove(who.local.src); this.closePerson(); } });
    else if (who.member && Party.role === 'leader' && !who.member.leader) {
      btns.push({ label: 'Make them party leader', go: () => { Party.handOver(key); this.closePerson(); } });   // (v14.2.13)
      btns.push({ label: 'Remove from the party', go: () => { Party.kick(key); Toasts.show(esc(who.name) + ' was removed from the party.', [], 3000); this.closePerson(); } }); }
    btns.push({ label: 'Close', go: () => { Sound.play('back'); this.closePerson(); } });
    const h = 150 + lines.length * 30 + btns.length * 56;
    g.fillStyle(0x05070f, 0.94).fillRoundedRect(x, y, w, h, 18).lineStyle(3, who.local ? 0x7dff6a : 0xffd23f, 1).strokeRoundedRect(x, y, w, h, 18);
    objs.push(this.add.text(x + 30, y + 28, who.name, { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: '#ffffff' }).setDepth(61));
    objs.push(this.add.text(x + w - 30, y + 46, who.local ? 'LOCAL PLAYER' : 'PARTY', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: who.local ? '#7dff6a' : '#ffd23f' }).setOrigin(1, 0.5).setDepth(61));
    lines.forEach((l, i) => objs.push(this.add.text(x + 30, y + 98 + i * 30, l, { fontFamily: FONT, fontSize: '20px', color: '#cfd8de' }).setDepth(61)));
    const bt = btns.map((b, i) => { const t = this.add.text(x + w / 2, y + 120 + lines.length * 30 + i * 56, b.label, { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#1b2a35', padding: { x: 22, y: 9 } }).setOrigin(0.5).setDepth(61).setInteractive({ useHandCursor: true }).on('pointerdown', () => b.go()); objs.push(t); return t; });
    this.pPop = { key, objs, btns, bt, cur: 0 };
  };
  P.closePerson = function () { if (this.pPop) this.pPop.objs.forEach(o => o.destroy()); this.pPop = null; };
  P.update = function (time, delta) {
    const dt = Math.min(0.05, delta / 1000), tab = LOBBY_TABS[this.tab];
    if (this.pPop) {                                                      // the profile card has the controls
      Controls.update(this.game.loop.frame); const e = Controls.menu(), Pp = this.pPop, n = Pp.btns.length;
      if (e.up) { Pp.cur = (Pp.cur + n - 1) % n; Sound.play('blip'); } if (e.down) { Pp.cur = (Pp.cur + 1) % n; Sound.play('blip'); }
      Pp.bt.forEach((t, i) => t.setBackgroundColor(i === Pp.cur ? '#ffd23f' : '#1b2a35').setColor(i === Pp.cur ? '#1a1206' : '#ffffff'));
      if (e.a) Pp.btns[Pp.cur].go(); else if (e.b || Controls.escPressed) { Sound.play('back'); this.closePerson(); }
      if (this.stage && this.stage.ok) this.stage.render(dt, { x: 0.47, zoom: 1 }); return;
    }
    const mates = this.mateList(), P0 = (Controls.combined && Controls.combined.pressed) || {}, free = tab === 'PLAY' && !this.overlay && !this.emoPick && !this.capT && !(typeof PadNav !== 'undefined' && PadNav.stack.some(x => x.modal));
    if (free && mates.length) {
      if (P0.up) { this.pFocus = this.pFocus + 1 >= mates.length ? -1 : this.pFocus + 1; Sound.play('blip'); Controls.update(this.game.loop.frame); if (this.stage.ok) this.stage.render(dt, { x: 0.47, zoom: 1 }); return; }
      if (this.pFocus >= 0 && P0.a) { const m = mates[this.pFocus]; Controls.update(this.game.loop.frame); this.openPerson(m.key); return; }
      if (this.pFocus >= 0 && P0.b) { this.pFocus = -1; Sound.play('back'); Controls.update(this.game.loop.frame); if (this.stage.ok) this.stage.render(dt, { x: 0.47, zoom: 1 }); return; }
    }
    if (this.pFocus >= mates.length) this.pFocus = -1;
    up.call(this, time, delta);
    if (!this.scene.isActive() || !this.pG || !this.pG.active) return;
    this.pG.clear(); this.pHint.setVisible(false); const seen = new Set();
    if (tab === 'PLAY' && !this.overlay) mates.forEach(({ key, M }, i) => {
      const q = this.stage.screenOf(M.cart, 0.7); if (!q) return; seen.add(key);
      let z = this.pZones.get(key); if (!z) { z = this.add.zone(0, 0, 150, 230).setInteractive({ useHandCursor: true }).on('pointerdown', () => { Sound.resume(); this.openPerson(key); }); this.pZones.set(key, z); }
      z.setPosition(q.x, q.y);
      if (i === this.pFocus) { const p = 0.6 + 0.4 * Math.sin(time / 180); this.pG.lineStyle(4, 0xffd23f, p).strokeEllipse(q.x, q.y + 70, 150, 44); this.pHint.setVisible(true).setText('A: PROFILE').setPosition(q.x, q.y + 108); }
    });
    for (const [k, z] of this.pZones) if (!seen.has(k)) { z.destroy(); this.pZones.delete(k); }
  };
}
