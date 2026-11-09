/* v13.6: the online room looks like the single-player screens.
   - The host first picks the two teams on the same team cards as Play now / Practice (logos, ◀ ▶ team, LB / RB league, ▲ ▼ carts).
     X opens the room settings; the match rules sit one level further in ("Rules ▸").
   - Then everyone is on the side picker: three columns, your team's logo on each side, everyone starting in the middle.
     ◀ ▶ moves you (and each local guest moves themselves on their own controller), X locks you to one cart, ▲ ▼ changes your name.
     The host's START plays. Online everyone plays, so anyone still in the middle at START is put on the side with room.
   - Free-for-all minigames and Volt Royale have no sides: one list of who's in. */
const teamsMatter = cfg => !!cfg && (!cfg.mini || cfg.mini.mode === 'teams');

{ const P = RoomScene.prototype, ini = P.init;
  P.init = function (data) { ini.call(this, data); this.viewWanted = data.view || null; this.fresh = !data.session; this.startArmed = 0; };   // fresh: a new room (back from a game it opens on the side picker)

  /* the settings: the room (host only), then the rules one level in */
  P.roomItems = function () {
    const S = this.session, cfg = () => S.cfg, names = Object.keys(CONFIG.difficulties), GAMES = [null, ...MINI_KINDS()];
    const cycleGame = d => { const i = GAMES.indexOf(cfg().mini ? cfg().mini.kind : null), k = GAMES[(i + d + GAMES.length) % GAMES.length]; S.setConfig(k ? { mini: miniCfg(k), practice: true } : { mini: null, practice: false }); };
    const size = (side, d) => { const sizes = [...cfg().sizes]; sizes[side] = clamp(sizes[side] + d, 1, CONFIG.match.chairsPerTeam); S.setConfig({ sizes }); };
    return [
      { label: () => `Room   ◀ ${S.visibility === 'public' ? 'PUBLIC (listed)' : 'Private (code only)'} ▶`, change: () => this.toggleVisibility(), select: () => this.toggleVisibility() },
      { label: () => `Lobby name   ◀ ${S.lobbyName} ▶`, change: d => this.cycleName(d), select: () => this.typeName() },
      { label: () => `Game   ◀ ${miniLabel(cfg().mini)} ▶`, change: d => cycleGame(d), select: () => cycleGame(1) },
      { label: () => `CPU skill   ◀ ${cfg().difficulty} ▶`, change: d => S.setConfig({ difficulty: names[(names.indexOf(cfg().difficulty) + d + names.length) % names.length] }) },
      { label: () => `Practice (no clock)   ◀ ${cfg().practice ? 'On' : 'Off'} ▶`, change: () => S.setConfig({ practice: !cfg().practice }), select: () => S.setConfig({ practice: !cfg().practice }) },
      { label: () => `Carts   ◀ ${cfg().sizes[0]} v ${cfg().sizes[1]} ▶   (▲ ▼ on the team cards)`, change: d => { size(0, d); size(1, d); } },
      { label: () => 'Rules ▸   (speed, collisions, penalties, clock)', select: () => { this.tsSet.hide(); this.rulesSet.show(); } },
      { label: () => 'Close room', select: () => this.leave() }
    ].map(it => ({ ...it, select: it.select && (() => !this.opening && it.select()), change: it.change && (d => !this.opening && it.change(d)) }));
  };
  P.ruleItems = function () {
    return [speedCapItem('Max cart speed (locked for all)'), toggle('Cart collisions', 'collisions'), toggle('Penalties', 'penalties'), slider('Penalty time', 'penaltySeconds', v => `${v} s`),
      toggle('Penalties carry over after a goal', 'penaltyCarry'), lockCartItem(), slider('Game clock speed', 'timeSpeed', times)];
  };

  P.create = function () {
    const host = this.role === 'host'; this.opening = false;
    if (host && !this.session) {
      this.opening = true; this.session = new HostSession(new PeerTransport());
      if (this.preset) { this.session.preset = this.preset; const { seasonFx, ...cfg } = this.preset; Object.assign(this.session.cfg, cfg); this.session.seasonFx = seasonFx || null; if (cfg.season) { this.session.roster[0].side = cfg.season.side; this.session.roster[0].mid = false; } }
      this.session.open().then(() => { this.opening = false; }).catch(e => this.fail(e));
    }
    const S = this.session, V = CONFIG.view;
    this.view = this.viewWanted || (host && this.fresh && !this.preset && teamsMatter(S.cfg) ? 'teams' : 'sides');
    this.rulesSet = new TSSettings(this, this.ruleItems());
    this.wire();
    if (this.role === 'client' && S.pendingStart) { const msg = S.pendingStart; S.pendingStart = null; return this.beginClient(msg); }   /* (rejoining a game that's going: straight back in) */
    if (this.view === 'teams') {                                          /* the host: the two teams, like Play now */
      const sizeOf = side => ({ get: () => S.cfg.sizes[side], set: d => { const sizes = [...S.cfg.sizes]; sizes[side] = clamp(sizes[side] + d, 1, CONFIG.match.chairsPerTeam); S.setConfig({ sizes }); } });
      TeamSelect.build(this, {
        title: 'ONLINE ROOM', sub: () => this.headLine(),
        cards: [{ side: 'HOME', get: () => S.cfg.teamA, set: t => S.setConfig({ teamA: t }), carts: sizeOf(0) }, { side: 'AWAY', get: () => S.cfg.teamB, set: t => S.setConfig({ teamB: t }), carts: sizeOf(1) }],
        settings: this.roomItems(),
        onNext: () => this.scene.restart({ role: this.role, session: S, preset: this.preset, view: 'sides' }), onBack: () => this.leave()
      });
      this.statusText = this.add.text(V.width / 2, 96, '', { fontFamily: FONT, fontSize: '1px' }).setVisible(false);
      return;
    }
    /* the side picker */
    menuBackdrop(this); this.tsSet = new TSSettings(this, host ? this.roomItems() : []);
    this.add.text(128, 44, 'ONLINE ROOM', { ...STYLE.title, fontSize: '50px' }).setOrigin(0, 0.5); this.add.rectangle(128, 76, 120, 4, THEME.gold, 0.95).setOrigin(0, 0.5);
    this.codeText = this.add.text(V.width - 40, 44, '', { ...STYLE.title, fontSize: '40px', color: '#ffe27a' }).setOrigin(1, 0.5);
    this.subText = this.add.text(128, 98, '', { fontFamily: FONT, fontSize: '19px', color: '#9fb2bf' }).setOrigin(0, 0.5);
    this.panelG = this.add.graphics(); this.cardG = this.add.graphics().setDepth(5); this.lab = []; this.panelT = []; this.logos = null; this.pos = null;   /* (fresh every visit) */
    this.colX = [230, V.width / 2, V.width - 230];
    const go = col => { const me = this.meRow(); if (me) this.moveTo(me, col); };
    [0, 1, 2].forEach(c => this.add.zone(this.colX[c], 380, c === 1 ? 372 : 400, 520).setInteractive({ useHandCursor: true }).on('pointerdown', () => { Sound.resume(); go(c); }));   // tap a column to go there
    this.statusText = this.add.text(V.width / 2, V.height - 68, '', { fontFamily: FONT, fontSize: '18px', color: '#cfd8de', align: 'center', wordWrap: { width: 1000 } }).setOrigin(0.5).setDepth(20);
    const legend = [['◀ ▶', 'Side', null], ['X', 'Lock to one cart', () => this.toggleLock()], ['▲ ▼', 'Name', null]];
    if (host) legend.push(['Y', 'Settings', () => this.tsSet.show()], ...(teamsMatter(S.cfg) ? [['LB', 'Teams', () => this.toTeams()]] : []), ['START', 'Play', () => this.tryStart()]);
    legend.push(['＋', 'Local guest', () => this.beginCapture()], ['B', host ? 'Close' : 'Leave', () => this.leave()]);
    TS_UI.legend(this, V.height - 26, legend);
  };
  P.headLine = function () { const S = this.session, c = S.cfg; return `${this.opening || !S.code ? 'Opening room...' : 'ROOM ' + S.code}   ·   ${miniLabel(c.mini)}   ·   ${c.practice ? 'Practice' : c.difficulty}${this.role === 'host' ? '   ·   ' + (S.visibility === 'public' ? 'Public' : 'Private: share the code') : ''}`; };
  P.toTeams = function () { if (this.role === 'host' && teamsMatter(this.session.cfg)) { Sound.play('back'); this.scene.restart({ role: this.role, session: this.session, preset: this.preset, view: 'teams' }); } };
  P.meRow = function () { const S = this.session; return S && S.roster.find(r => r.id === S.myId); };
  P.moveTo = function (r, col) {                                         // col: 0 home, 1 the middle, 2 away
    const S = this.session, host = this.role === 'host', own = r.id === S.myId ? undefined : r.id;
    if (S.cfg.season || !teamsMatter(S.cfg)) return;
    if (col === 1) { if (host) S.setMid(r.id); else S.setSide(-1, own); }
    else { if (host) S.setSide(r.id, col / 2); else S.setSide(col / 2, own); }
    Sound.play('blip');
  };
  P.step = function (r, d) { const pos = r.mid ? 1 : r.side * 2, np = clamp(pos + d, 0, 2); if (np !== pos) this.moveTo(r, np); else Sound.play('back'); };
  P.toggleLock = function (r = this.meRow()) { if (!r) return; const S = this.session, on = !r.lock; if (this.role === 'host') S.setLock(r.id, on); else S.setLock(on, r.id === S.myId ? undefined : r.id); Sound.play('blip'); };
  P.renameRow = function (r, d) { const S = this.session, n = Settings.nextName(r.name, d, S.roster.filter(q => q !== r).map(q => q.name)); if (this.role === 'host') S.setName(r.id, n); else S.setName(n, r.id === S.myId ? undefined : r.id); Sound.play('blip'); };
  P.tryStart = function () {
    if (this.role !== 'host' || this.opening) return; const S = this.session, waiting = teamsMatter(S.cfg) ? S.roster.filter(r => r.mid) : [];
    if (waiting.length && this.time.now - this.startArmed > 3000) { this.startArmed = this.time.now; this.flash = `${waiting.map(r => r.name).join(', ')} still in the middle. START again to put them on the side with room.`; this.flashUntil = this.time.now + 3000; Sound.play('back'); return; }
    Sound.play('select'); this.startHost();
  };

  P.update = function () {
    const S = this.session; if (!S) return; Controls.claim(S.claimedSources());
    if (this.role === 'client' && S.silent && S.silent()) { S.finish('lost'); return; }
    if (this.capturing) { this.captureUpdate(); if (this.statusText && this.statusText.active) this.statusText.setText('LOCAL GUEST: press A on their controller (Space on keyboard 1, Right Shift on keyboard 2).  B cancels.'); return; }
    if (this.view === 'teams') {
      if (this.rulesSet.open) { Controls.update(this.game.loop.frame); this.rulesSet.update(Controls.menu()); this.popT = this.time.now; this.popF = this.game.loop.frame; }
      else if (this.tsSet.open) { TeamSelect.update(this); this.popT = this.time.now; this.popF = this.game.loop.frame; }
      else if (this.time.now - (this.popT || 0) < 400 || this.game.loop.frame - (this.popF || -9) < 4) Controls.update(this.game.loop.frame);
      else TeamSelect.update(this);
      if (!this.sys.isActive()) return;
      if (this.tsSubF) this.tsSub.setText(this.tsSubF());
      if (!teamsMatter(S.cfg)) this.scene.restart({ role: this.role, session: S, preset: this.preset, view: 'sides' });   // switched to a game with no sides
      return;
    }
    Controls.update(this.game.loop.frame);
    if (typeof PadNav !== 'undefined' && PadNav.stack.some(x => x.modal)) return;
    if (this.rulesSet.open) { this.rulesSet.update(Controls.menu()); this.popT = this.time.now; this.popF = this.game.loop.frame; }
    else if (this.tsSet.open) { this.tsSet.update(Controls.menu()); this.popT = this.time.now; this.popF = this.game.loop.frame; }
    else if (this.time.now - (this.popT || 0) < 400 || this.game.loop.frame - (this.popF || -9) < 4) { /* (just closed the settings: that B doesn't also leave the room) */ }
    else {
      const me = this.meRow(), mine = Controls.mine.pressed || {}, host = this.role === 'host';
      const drive = (r, p) => { if (!r || !p) return; if (p.left || p.right) this.step(r, p.left ? -1 : 1); if (p.x) this.toggleLock(r); if (p.up || p.down) this.renameRow(r, p.down ? 1 : -1); };
      drive(me, mine);
      for (const r of S.roster.filter(q => q.own === S.myId)) { const src = S.guestSrc.get(r.id); if (src && src.pressed) { drive(r, src.pressed); if (src.pressed.b) { S.removeGuest(r.id, host ? 1 : undefined); Sound.play('back'); } } }
      if (host && mine.y) { Sound.play('select'); this.tsSet.show(); }
      else if (host && (mine.halfCCW || mine.speedDown)) this.toTeams();
      else if (host && mine.start) this.tryStart();
      else if (mine.b || Controls.escPressed) return this.leave();
    }
    if (!this.sys.isActive() || !this.codeText || !this.codeText.active) return;
    this.draw();
  };

  P.draw = function () {
    const S = this.session, V = CONFIG.view, now = this.time.now, sides = teamsMatter(S.cfg), season = S.cfg.season, g = this.panelG, cg = this.cardG; g.clear(); cg.clear();
    this.codeText.setText(this.opening || !S.code ? 'Opening...' : S.code); this.subText.setText(this.headLine());
    let ti = 0; const T = (s, x, y, o = {}) => { const t = this.panelT[ti] || (this.panelT[ti] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffffff', align: 'center' }).setOrigin(0.5).setDepth(3)); ti++; return t.setVisible(true).setText(s).setPosition(x, y).setFontSize(o.size || 20).setColor(o.color || '#ffffff'); };
    this.logos = this.logos || [0, 1].map(() => this.add.image(0, 0, 'logo-' + TEAMS[0].id).setDepth(2));
    if (sides) {
      [0, 1].forEach(s => { const x = this.colX[s * 2], t = s ? S.cfg.teamB : S.cfg.teamA, col = TEAMS[t].color, people = S.roster.filter(r => r.side === s && !r.mid).length, cpu = Math.max(0, S.cfg.sizes[s] - people);
        g.fillStyle(TS_UI.dark(col, 0.55), 0.9).fillRoundedRect(x - 200, 120, 400, 520, 16).lineStyle(3, col, 1).strokeRoundedRect(x - 200, 120, 400, 520, 16);
        this.logos[s].setVisible(true).setTexture('logo-' + TEAMS[t].id).setDisplaySize(110, 110).setPosition(x, 196);
        T(TEAMS[t].name.toUpperCase(), x, 272, { size: 30, color: TS_UI.hex(TS_UI.lighten(col, 0.2)) }); T(s === 0 ? 'HOME' : 'AWAY', x, 302, { size: 16, color: '#9fb2bf' });
        T(`${people} / ${S.cfg.sizes[s]} players${cpu ? `   ·   ${cpu} CPU` : ''}`, x, 618, { size: 17, color: '#cfd8de' }); });
      g.fillStyle(0x0b131a, 0.9).fillRoundedRect(V.width / 2 - 186, 120, 372, 520, 16).lineStyle(2, 0x2d5068, 1).strokeRoundedRect(V.width / 2 - 186, 120, 372, 520, 16);
      T(season ? 'SEASON GAME' : 'PICK A SIDE', V.width / 2, 150, { size: 18, color: '#9fb2bf' });
    } else {
      this.logos.forEach(l => l.setVisible(false));
      g.fillStyle(0x0b131a, 0.9).fillRoundedRect(V.width / 2 - 260, 120, 520, 520, 16).lineStyle(2, 0x2d5068, 1).strokeRoundedRect(V.width / 2 - 260, 120, 520, 520, 16);
      T(`${miniLabel(S.cfg.mini).toUpperCase()}   ·   ${S.roster.length} PLAYER${S.roster.length === 1 ? '' : 'S'}`, V.width / 2, 150, { size: 20, color: '#ffe27a' });
    }
    /* the player cards, sliding to their column */
    let li = 0; const used = [0, 0, 0]; this.pos = this.pos || new Map();
    for (const r of S.roster) {
      const col = !sides ? 1 : r.mid ? 1 : r.side * 2, tx = this.colX[col], ty = (col === 1 ? 200 : 360) + used[col]++ * 64;
      const P0 = this.pos.get(r.id) || { x: this.colX[1], y: ty }; P0.x += (tx - P0.x) * 0.25; P0.y += (ty - P0.y) * 0.25; this.pos.set(r.id, P0);
      const mine = r.id === S.myId || r.own === S.myId, tc = !sides || r.mid ? 0x55626c : TEAMS[r.side ? S.cfg.teamB : S.cfg.teamA].color, w = 344, x = P0.x - w / 2, y = P0.y - 26;
      if (mine) cg.fillStyle(0xffd23f, 0.12 + 0.08 * Math.sin(now / 260)).fillRoundedRect(x - 6, y - 6, w + 12, 64, 14);
      cg.fillStyle(0x0d151b, 0.95).fillRoundedRect(x, y, w, 52, 12).lineStyle(mine ? 3 : 2, mine ? 0xffd23f : tc, 1).strokeRoundedRect(x, y, w, 52, 12).fillStyle(tc, 1).fillRoundedRect(x, y, 10, 52, { tl: 12, bl: 12, tr: 0, br: 0 });
      const t1 = this.lab[li] || (this.lab[li] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0, 0.5).setDepth(6)); li++;
      t1.setVisible(true).setText(`${r.host ? '👑' : r.guest ? '🎮' : '🌐'}  ${r.name}${r.lock ? '   🔒' : ''}`).setPosition(x + 22, P0.y - 8);
      const t2 = this.lab[li] || (this.lab[li] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: '#9fb2bf' }).setOrigin(0, 0.5).setDepth(6)); li++;
      t2.setVisible(true).setText(`${r.id === S.myId ? 'YOU' : r.own === S.myId ? 'YOUR GUEST' : r.host ? 'HOST' : r.guest ? 'GUEST' : 'ONLINE'}${r.lock ? '  ·  ONE CART' : ''}${sides && r.mid ? '  ·  ◀ ▶ pick a side' : ''}`).setPosition(x + 22, P0.y + 13);
      if (sides && r.mid && mine && !season) { cg.fillStyle(0xffffff, 0.35 + 0.35 * Math.sin(now / 200)); cg.fillTriangle(x - 18, P0.y, x - 6, P0.y - 9, x - 6, P0.y + 9); cg.fillTriangle(x + w + 18, P0.y, x + w + 6, P0.y - 9, x + w + 6, P0.y + 9); }
    }
    for (; li < this.lab.length; li++) this.lab[li].setVisible(false);
    for (; ti < this.panelT.length; ti++) this.panelT[ti].setVisible(false);
    this.statusText.setText(this.flash && now < this.flashUntil ? this.flash : this.role === 'host' ? (this.opening ? 'Opening the room...' : S.visibility === 'public' ? 'Listed under Online > Browse public rooms. You can also share the code.' : 'Private room: friends choose Online > Join with a code and type ' + (S.code || '')) : 'Waiting for the host to start...');
  };
}
