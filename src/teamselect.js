/* v13.2: team select and controller select in the style of a big hockey game.
   - Team select (Practice / Play now / New season): a big card for each side with the logo, name, league and ratings.
     ◀ ▶ team, LB / RB (keyboard Q / E) league, ▲ ▼ the carts row (practice), Y random, X game settings (everything else lives there),
     A next (HOME, then AWAY, then players), B back.
   - Controller select: every controller is a card in the middle; push it left or right under a team's logo. X locks it to one cart. */

const TS_UI = {
  hex: c => '#' + (c >>> 0).toString(16).padStart(6, '0'),
  lighten(c, k) { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, f = v => Math.round(v + (255 - v) * k); return (f(r) << 16) | (f(g) << 8) | f(b); },
  dark(c, k) { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, f = v => Math.round(v * (1 - k)); return (f(r) << 16) | (f(g) << 8) | f(b); },
  leagueOf(t) { return LEAGUES.findIndex(L => L.id === TEAMS[t].league); },
  legend(sc, y, items) {                                               // the button legend along the bottom (each one can be clicked)
    const objs = []; let x = 0; const parts = items.map(([key, label, fn]) => { const k = sc.add.text(0, y, key, { fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: '#0d151b', backgroundColor: '#ffe27a', padding: { x: 7, y: 3 } }).setOrigin(0, 0.5).setDepth(20), l = sc.add.text(0, y, label, { fontFamily: FONT, fontSize: '19px', color: '#e8eef2' }).setOrigin(0, 0.5).setDepth(20); return { k, l, fn, w: k.width + 8 + l.width }; });
    const total = parts.reduce((a, p) => a + p.w, 0) + (parts.length - 1) * 30; x = CONFIG.view.width / 2 - total / 2;
    sc.add.graphics().setDepth(19).fillStyle(0x0d151b, 0.85).fillRect(0, y - 22, CONFIG.view.width, 44).lineStyle(2, 0x2d5068, 1).lineBetween(0, y - 22, CONFIG.view.width, y - 22);
    for (const p of parts) { p.k.setX(x); p.l.setX(x + p.k.width + 8); if (p.fn) { const z = sc.add.zone(x + p.w / 2, y, p.w + 10, 40).setInteractive({ useHandCursor: true }).setDepth(21); z.on('pointerdown', () => { Sound.play('select'); p.fn(); }); } x += p.w + 30; objs.push(p.k, p.l); }
    return objs;
  }
};

/* one team's card */
class TeamCard {
  constructor(sc, x, y, w, h, side) {
    this.sc = sc; Object.assign(this, { x, y, w, h, side }); const cx = x + w / 2;
    this.bg = sc.add.graphics(); this.fx = sc.add.graphics();
    this.sideT = sc.add.text(x + 22, y + 22, side, { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#0d151b', backgroundColor: '#ffe27a', padding: { x: 8, y: 2 } }).setOrigin(0, 0.5);
    this.leagueT = sc.add.text(cx, y + 64, '', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#e8eef2' }).setOrigin(0.5);
    this.lbT = sc.add.text(x + 30, y + 64, '◀ LB', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#9fb2bf' }).setOrigin(0, 0.5);
    this.rbT = sc.add.text(x + w - 30, y + 64, 'RB ▶', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#9fb2bf' }).setOrigin(1, 0.5);
    this.logo = sc.add.image(cx, y + 196, 'logo-' + TEAMS[0].id).setDisplaySize(190, 190);
    this.la = sc.add.text(x + 40, y + 196, '◀', { fontFamily: FONT, fontSize: '54px', color: '#ffffff' }).setOrigin(0.5);
    this.ra = sc.add.text(x + w - 40, y + 196, '▶', { fontFamily: FONT, fontSize: '54px', color: '#ffffff' }).setOrigin(0.5);
    this.nameT = sc.add.text(cx, y + 318, '', { ...STYLE.big, fontSize: '46px' }).setOrigin(0.5);
    this.subT = sc.add.text(cx, y + 356, '', { fontFamily: FONT, fontSize: '19px', color: '#9fb2bf' }).setOrigin(0.5);
    this.statT = ['OFF', 'DEF', 'SPD', 'GOA'].map((k, i) => sc.add.text(x + 44 + (i % 2) * (w / 2 - 20), y + 392 + Math.floor(i / 2) * 32, '', { fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: '#cfd8de' }).setOrigin(0, 0.5));
    this.ovr = sc.add.text(x + w - 22, y + 22, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(1, 0.5);
    this.cartsT = sc.add.text(cx, y + h - 34, '', { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    this.zones = {};
    const zone = (k, zx, zy, zw, zh) => { const z = sc.add.zone(zx, zy, zw, zh).setInteractive({ useHandCursor: true }); z.on('pointerdown', () => sc.tsClick && sc.tsClick(this, k)); this.zones[k] = z; };
    zone('card', cx, y + h / 2, w, h); zone('prev', x + 40, y + 196, 70, 110); zone('next', x + w - 40, y + 196, 70, 110); zone('lb', x + 60, y + 64, 110, 40); zone('rb', x + w - 60, y + 64, 110, 40); zone('carts', cx, y + h - 34, w - 40, 44);
    Object.values(this.zones).forEach((z, i) => z.setDepth(i ? 2 : 1));
  }
  set(t, o = {}) {
    const { x, y, w, h } = this, T = TEAMS[t], col = T.color, now = this.sc.time.now, pulse = 0.5 + 0.5 * Math.sin(now / 260), S = teamStats(t);
    const g = this.bg; g.clear();
    if (o.focus) g.fillStyle(0xffd23f, 0.12 + 0.1 * pulse).fillRoundedRect(x - 10, y - 10, w + 20, h + 20, 22);   // the glow round the chosen card
    g.fillStyle(0x0b131a, 0.95).fillRoundedRect(x, y, w, h, 16);
    g.fillStyle(TS_UI.dark(col, 0.35), 1).fillRoundedRect(x, y, w, 100, { tl: 16, tr: 16, bl: 0, br: 0 });           // a band in the team colour
    for (let i = 0; i < 9; i++) g.fillStyle(TS_UI.lighten(col, 0.25), 0.07).fillTriangle(x + w * 0.1 + i * 70, y + 100, x + w * 0.1 + i * 70 + 46, y + 100, x + w * 0.1 + i * 70 + 140, y + h * 0.8);   // stripes behind the logo
    g.fillStyle(col, 0.18).fillCircle(x + w / 2, y + 196, 112).lineStyle(4, col, 0.9).strokeCircle(x + w / 2, y + 196, 112);
    g.lineStyle(o.focus ? 4 : 2, o.focus ? 0xffd23f : 0x2d5068, 1).strokeRoundedRect(x, y, w, h, 16);
    const f = this.fx; f.clear(); this.statT.forEach((tx, i) => { const k = ['OFF', 'DEF', 'SPD', 'GOA'][i], v = S[k], bx = tx.x + 50, bw = w / 2 - 120; tx.setText(`${k}  ${v}`); f.fillStyle(0x223040, 1).fillRoundedRect(bx + 22, tx.y - 5, bw, 10, 5).fillStyle(v >= 85 ? 0x5ad45a : v >= 72 ? 0xffd23f : 0xff7a59, 1).fillRoundedRect(bx + 22, tx.y - 5, bw * (v - 40) / 59, 10, 5); });
    this.logo.setTexture('logo-' + T.id).setDisplaySize(190 + (o.focus ? 6 * pulse : 0), 190 + (o.focus ? 6 * pulse : 0));
    this.nameT.setText(T.name.toUpperCase()).setColor(TS_UI.hex(TS_UI.lighten(col, 0.15))); if (this.nameT.width > w - 60) this.nameT.setScale((w - 60) / this.nameT.width); else this.nameT.setScale(1);
    this.subT.setText(`${T.abbr}   ·   ${LEAGUES[TS_UI.leagueOf(t)].name}`); this.ovr.setText(`OVR ${S.OVR}`);
    this.leagueT.setText(LEAGUES[TS_UI.leagueOf(t)].name.toUpperCase()); const lg = !o.leagueLock; this.lbT.setVisible(lg); this.rbT.setVisible(lg);
    const row = o.focus ? o.row || 0 : -1, a = row === 0 ? 1 : 0.45; this.la.setAlpha(a).setX(x + 40 - (row === 0 ? 4 * pulse : 0)); this.ra.setAlpha(a).setX(x + w - 40 + (row === 0 ? 4 * pulse : 0));
    if (o.carts !== undefined) { this.cartsT.setVisible(true).setText(`CARTS   ◀  ${o.carts === 0 ? 'NONE' : o.carts}  ▶`).setColor(row === 1 ? '#ffe27a' : '#cfd8de');
      if (row === 1) g.lineStyle(3, 0xffd23f, 1).strokeRoundedRect(x + 60, y + h - 56, w - 120, 44, 10); } else this.cartsT.setVisible(false);
    this.sideT.setText(this.side + (o.done ? '  ✓' : ''));
  }
}

/* the game-settings pop-up: the rows that used to fill the setup menu */
class TSSettings {
  constructor(sc, items) { this.sc = sc; this.items = items; this.open = false; this.cur = 0; this.objs = []; }
  show() {
    const sc = this.sc, V = CONFIG.view, w = 720, rh = 50, h = this.items.length * rh + 110, x = V.width / 2 - w / 2, y = V.height / 2 - h / 2; this.open = true; this.cur = 0;
    const g = sc.add.graphics().setDepth(40); g.fillStyle(0x000000, 0.6).fillRect(0, 0, V.width, V.height).fillStyle(0x0d151b, 0.98).fillRoundedRect(x, y, w, h, 16).lineStyle(3, 0xffd23f, 1).strokeRoundedRect(x, y, w, h, 16);
    this.objs = [g, sc.add.text(V.width / 2, y + 36, 'GAME SETTINGS', { ...STYLE.title, fontSize: '36px' }).setOrigin(0.5).setDepth(41)];
    this.rowG = sc.add.graphics().setDepth(41); this.objs.push(this.rowG);
    this.rows = this.items.map((it, i) => { const t = sc.add.text(V.width / 2, y + 90 + i * rh, '', { ...STYLE.row, fontSize: '26px' }).setOrigin(0.5).setDepth(42); const z = sc.add.zone(V.width / 2, y + 90 + i * rh, w - 40, rh - 6).setInteractive({ useHandCursor: true }).setDepth(43); z.on('pointerdown', p => { this.cur = i; const rel = (p.x - x) / w; if (it.change && rel < 0.25) it.change(-1); else if (it.change && rel > 0.75) it.change(1); else if (it.select) it.select(); else if (it.change) it.change(1); Sound.play('blip'); }); this.objs.push(t, z); return t; });
    this.geom = { x, y, w, rh }; this.objs.push(sc.add.text(V.width / 2, y + h - 18, '▲ ▼ choose   ◀ ▶ change   A select   B / X close', { fontFamily: FONT, fontSize: '17px', color: THEME.dim }).setOrigin(0.5).setDepth(42));
  }
  hide() { this.objs.forEach(o => o.destroy()); this.objs = []; this.open = false; }
  update(e) {
    const it = this.items[this.cur];
    if (e.up) { this.cur = (this.cur + this.items.length - 1) % this.items.length; Sound.play('blip'); }
    if (e.down) { this.cur = (this.cur + 1) % this.items.length; Sound.play('blip'); }
    if ((e.left || e.right) && it.change) { it.change(e.left ? -1 : 1); Sound.play('blip'); }
    if (e.a && it.select) { Sound.play('select'); it.select(); }
    if (e.b || e.x || Controls.escPressed) { Sound.play('back'); this.hide(); return; }
    if (!this.open) return; const { x, y, w, rh } = this.geom; this.rowG.clear();
    this.rows.forEach((t, i) => { const on = i === this.cur; t.setText(this.items[i].label()).setColor(on ? STYLE.colorSelected : STYLE.colorIdle); if (t.width > w - 60) t.setScale((w - 60) / t.width); else t.setScale(1); this.rowG.fillStyle(on ? 0x1d3a55 : 0x0f1c27, 0.95).fillRoundedRect(x + 20, y + 90 + i * rh - rh / 2 + 3, w - 40, rh - 6, 10); if (on) this.rowG.lineStyle(3, 0xffd23f, 1).strokeRoundedRect(x + 20, y + 90 + i * rh - rh / 2 + 3, w - 40, rh - 6, 10); });
  }
}

/* the shared team-select behaviour; cfg: { title, sub, cards: [{ side, get, set, leagueLock, carts: { get, set } }], settings, onNext, onBack } */
const TeamSelect = {
  build(sc, cfg) {
    const V = CONFIG.view; menuBackdrop(sc); sc.ts = { cfg, focus: 0, row: 0, done: [] }; sc.tsSet = new TSSettings(sc, cfg.settings);
    sc.add.text(128, 44, cfg.title, { ...STYLE.title, fontSize: '50px' }).setOrigin(0, 0.5); sc.add.rectangle(128, 76, 120, 4, THEME.gold, 0.95).setOrigin(0, 0.5);
    if (cfg.sub) sc.add.text(128, 96, cfg.sub, { fontFamily: FONT, fontSize: '19px', color: '#9fb2bf' }).setOrigin(0, 0.5);
    const pill = sc.add.text(V.width - 40, 44, '⚙  GAME SETTINGS  (X)', { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#e8eef2', backgroundColor: '#1d3a55', padding: { x: 14, y: 8 } }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    pill.on('pointerdown', () => { if (!sc.tsSet.open) { Sound.play('select'); sc.tsSet.show(); } });
    const n = cfg.cards.length, w = n === 1 ? 560 : 540, h = 500, gap = n === 1 ? 0 : V.width - 2 * w - 80;
    sc.tsCards = cfg.cards.map((c, i) => new TeamCard(sc, n === 1 ? V.width / 2 - w / 2 : 40 + i * (w + gap), 118, w, h, c.side));
    if (n === 2) { const g = sc.add.graphics(); g.fillStyle(0x0d151b, 1).fillCircle(V.width / 2, 368, 44).lineStyle(4, 0xffd23f, 1).strokeCircle(V.width / 2, 368, 44); sc.add.text(V.width / 2, 368, 'VS', { ...STYLE.big, fontSize: '40px', color: '#ffe27a' }).setOrigin(0.5); }
    sc.tsClick = (card, k) => { if (sc.tsSet.open) return; const i = sc.tsCards.indexOf(card), C = cfg.cards[i]; sc.ts.focus = i;
      if (k === 'prev' || k === 'next') { this.cycle(C, k === 'next' ? 1 : -1, sc); sc.ts.row = 0; } else if (k === 'lb' || k === 'rb') { if (!C.leagueLock) this.league(C, k === 'rb' ? 1 : -1, sc); } else if (k === 'carts' && C.carts) { sc.ts.row = 1; C.carts.set(1); } Sound.play('blip'); };
    TS_UI.legend(sc, V.height - 26, [['◀ ▶', 'Team'], ...(cfg.cards.some(c => !c.leagueLock) ? [['LB RB', 'League']] : []), ...(cfg.cards.some(c => c.carts) ? [['▲ ▼', 'Carts']] : []), ['Y', 'Random', () => this.random(sc)], ['X', 'Settings', () => sc.tsSet.show()], ['A', n > 1 ? 'Next' : 'Start', () => this.next(sc)], ['B', 'Back', () => this.back(sc)]]);
  },
  others(C, sc) { return sc.ts.cfg.cards.filter(o => o !== C).map(o => o.get()); },
  cycle(C, d, sc = this.cur) { const L = C.leagueLock ? leagueTeams(C.leagueLock) : leagueTeams(TEAMS[C.get()].league), taken = this.others(C, sc); let i = L.indexOf(C.get()); for (let k = 0; k < L.length; k++) { i = (i + d + L.length) % L.length; if (!taken.includes(L[i])) break; } C.set(L[i]); },
  league(C, d, sc = this.cur) { let li = TS_UI.leagueOf(C.get()); li = (li + d + LEAGUES.length) % LEAGUES.length; const L = leagueTeams(LEAGUES[li].id).filter(t => !this.others(C, sc).includes(t)); if (L.length) C.set(L[0]); },
  random(sc) { const C = sc.ts.cfg.cards[sc.ts.focus], L = (C.leagueLock ? leagueTeams(C.leagueLock) : leagueTeams(TEAMS[C.get()].league)).filter(t => !this.others(C, sc).includes(t)); if (L.length) { C.set(L[Math.floor(Math.random() * L.length)]); Sound.play('select'); } },
  next(sc) { const T = sc.ts, n = T.cfg.cards.length; Sound.play('select'); T.done[T.focus] = true; if (T.focus < n - 1) { T.focus++; T.row = 0; } else T.cfg.onNext(); },
  back(sc) { const T = sc.ts; Sound.play('back'); if (T.focus > 0) { T.focus--; T.done[T.focus] = false; T.row = 0; } else T.cfg.onBack(); },
  update(sc) {
    Controls.update(sc.game.loop.frame); this.cur = sc; const T = sc.ts, e = Controls.menu(); if (!T) return;
    if (typeof PadNav !== 'undefined' && PadNav.stack.some(x => x.modal)) return;
    if (sc.tsSet.open) sc.tsSet.update(e);
    else {
      const C = T.cfg.cards[T.focus], lb = e.halfCCW || e.speedDown || e.spinCCW, rb = e.halfCW || e.speedUp || e.spinCW;
      if ((e.up || e.down) && C.carts) { T.row = T.row ? 0 : 1; Sound.play('blip'); }
      if (e.left || e.right) { const d = e.left ? -1 : 1; if (T.row === 1 && C.carts) C.carts.set(d); else this.cycle(C, d); Sound.play('blip'); }
      if ((lb || rb) && !C.leagueLock) { this.league(C, rb ? 1 : -1); T.row = 0; Sound.play('blip'); }
      if (e.y) this.random(sc);
      if (e.x) { Sound.play('select'); sc.tsSet.show(); }
      else if (e.a || e.start) this.next(sc);
      else if (e.b || Controls.escPressed) this.back(sc);
    }
    if (!sc.scene.isActive()) return;
    sc.tsCards.forEach((card, i) => { const C = T.cfg.cards[i]; card.set(C.get(), { focus: i === T.focus && !sc.tsSet.open, row: T.row, carts: C.carts ? C.carts.get() : undefined, leagueLock: C.leagueLock, done: T.done[i] && i !== T.focus }); });
  }
};

/* Practice / Play now */
{ const P = SetupScene.prototype;
  P.create = function () {
    const practice = this.practice, sizeOf = k => Settings[k], other = k => (k === 'sizeA' ? 'sizeB' : 'sizeA');
    const cartsFor = key => ({ get: () => sizeOf(key), set: d => { Settings.adjust(key, d); if (Settings[key] === 0 && Settings[other(key)] === 0) Settings.adjust(key, 1); } });   // (one team can be empty in practice, not both)
    const toLobby = () => { const sizes = practice ? [Settings.sizeA, Settings.sizeB].map(n => Math.min(n, CONFIG.match.chairsPerTeam)) : [CONFIG.match.chairsPerTeam, CONFIG.match.chairsPerTeam];
      partyGame(this, { teamA: Settings.teamA, teamB: Settings.teamB, difficulty: Settings.difficulty, practice, sizes }) || this.scene.start('Lobby', { practice, sizes }); };
    TeamSelect.build(this, {
      title: practice ? 'PRACTICE' : 'PLAY NOW', sub: practice ? 'Free play: no clock, any team sizes' : 'A full game against the CPU or your friends',
      cards: [{ side: 'HOME', get: () => Settings.teamA, set: t => { Settings.teamA = t; Settings.save(); }, carts: practice ? cartsFor('sizeA') : null },
              { side: 'AWAY', get: () => Settings.teamB, set: t => { Settings.teamB = t; Settings.save(); }, carts: practice ? cartsFor('sizeB') : null }],
      settings: [
        { label: () => `Difficulty   ◀ ${Settings.difficulty} ▶`, change: d => Settings.cycleDifficulty(d) },
        speedCapItem('Max cart speed'), lockCartItem(),
        ...(practice ? [] : [{ label: () => `Game clock   ◀ ${times(Settings.timeSpeed)} ▶`, change: d => Settings.adjust('timeSpeed', d) }]),
        { label: () => 'How to play', select: () => this.scene.start('HowTo', { kind: 'hockey', back: { scene: 'Setup', data: { practice } } }) }
      ],
      onNext: toLobby, onBack: () => this.scene.start('Main')
    });
  };
  P.update = function () { TeamSelect.update(this); };
}
/* New season: your team (the Premier League) */
{ const P = SeasonSetupScene.prototype;
  P.create = function () {
    const C = CONFIG.season, n = SEASON_N, levels = Season.levels(), games = d => (d ? 2 : 1) * (n - 1);
    const cycle = (key, list, d) => { const i = list.indexOf(Settings[key]); Settings[key] = list[(i + d + list.length) % list.length]; Settings.save(); };
    if (Settings.seasonTeam >= n) Settings.seasonTeam = 0;
    TeamSelect.build(this, {
      title: 'NEW SEASON', sub: `The Premier League: ${n} teams, ${games(Settings.seasonDouble)} games, then the playoffs`,
      cards: [{ side: 'YOUR TEAM', get: () => Settings.seasonTeam, set: t => { Settings.seasonTeam = t; Settings.save(); }, leagueLock: 'premier' }],
      settings: [
        { label: () => `CPU skill   ◀ ${Settings.seasonDifficulty} ▶`, change: d => cycle('seasonDifficulty', levels, d) },
        { label: () => `Game length   ◀ ${Settings.seasonPeriod / 60} min periods ▶`, change: d => cycle('seasonPeriod', C.periodChoices, d) },
        { label: () => `Season   ◀ ${games(Settings.seasonDouble)} games ▶`, change: () => { Settings.seasonDouble = !Settings.seasonDouble; Settings.save(); }, select: () => { Settings.seasonDouble = !Settings.seasonDouble; Settings.save(); } },
        speedCapItem('Max cart speed'), lockCartItem()
      ],
      onNext: () => this.start(), onBack: () => this.scene.start('SeasonMenu')
    });
  };
  P.update = function () { TeamSelect.update(this); };
}

/* Controller select: a card for every controller; push it under a team (or leave it in the middle to sit out) */
{ const P = LobbyScene.prototype, cr = P.create, up = P.update;
  P.create = function () {
    if (this.br) return cr.call(this);                                  // (Battle Royale squads keep their own screen)
    this.players = []; this.ready = 0; this.cards = new Map(); const V = CONFIG.view, T = this.teams;
    menuBackdrop(this);
    this.add.text(128, 44, 'CONTROLLERS', { ...STYLE.title, fontSize: '50px' }).setOrigin(0, 0.5); this.add.rectangle(128, 76, 120, 4, THEME.gold, 0.95).setOrigin(0, 0.5);
    this.add.text(128, 96, this.season ? `Season game: everyone plays for ${TEAMS[this.season.teams[this.season.side]].name}` : 'Push your controller under the team you want. Empty carts are played by the CPU.', { fontFamily: FONT, fontSize: '19px', color: '#9fb2bf' }).setOrigin(0, 0.5);
    const g = this.add.graphics(); this.colX = [230, V.width / 2, V.width - 230];
    [0, 1].forEach(s => { const x = this.colX[s * 2], col = TEAMS[T[s]].color; g.fillStyle(TS_UI.dark(col, 0.55), 0.9).fillRoundedRect(x - 200, 120, 400, 520, 16).lineStyle(3, col, 1).strokeRoundedRect(x - 200, 120, 400, 520, 16);
      this.add.image(x, 196, 'logo-' + TEAMS[T[s]].id).setDisplaySize(110, 110); this.add.text(x, 272, TEAMS[T[s]].name.toUpperCase(), { ...STYLE.hud, fontSize: '30px', color: TS_UI.hex(TS_UI.lighten(col, 0.2)) }).setOrigin(0.5);
      this.add.text(x, 302, s === 0 ? 'HOME' : 'AWAY', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#9fb2bf' }).setOrigin(0.5); });
    g.fillStyle(0x0b131a, 0.9).fillRoundedRect(V.width / 2 - 186, 120, 372, 520, 16).lineStyle(2, 0x2d5068, 1).strokeRoundedRect(V.width / 2 - 186, 120, 372, 520, 16);
    this.add.text(V.width / 2, 150, 'NOT PLAYING', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#9fb2bf' }).setOrigin(0.5);
    this.countT = [0, 1].map(s => this.add.text(this.colX[s * 2], 618, '', { fontFamily: FONT, fontSize: '17px', color: '#cfd8de' }).setOrigin(0.5));
    this.idle = this.add.text(V.width / 2, 330, '', { fontFamily: FONT, fontSize: '19px', color: '#cfd8de', align: 'center', wordWrap: { width: 300 } }).setOrigin(0.5);
    this.cardG = this.add.graphics().setDepth(5);
    const kick = () => { const ps = this.players.filter(p => p.side !== null); Controls.owner = null; this.scene.start('Game', { players: ps, sizes: this.sizes, practice: this.practice, season: this.season, mini: this.mini }); };
    this.kick = kick;
    TS_UI.legend(this, V.height - 26, [['A', 'Join'], ['◀ ▶', 'Team'], ['X', 'Lock to one cart'], ['▲ ▼', 'Name'], ['Y', 'Type name'], ['START', 'Play', () => { Sound.play('select'); kick(); }], ['B', 'Leave / back', () => { if (this.players.length) this.players = []; else this.scene.start(this.season ? 'SeasonHub' : 'Setup', { practice: this.practice }); }]]);
    if (Settings.touch || navigator.maxTouchPoints > 0) tapButton(this, V.width / 2, 600, 300, 'Join (touch controls)', () => {
      if (!Settings.touch) TouchPad.toggle(); if (!Controls.sources.touch) Controls.sources.touch = new Source('touch', 'Touch controls');
      const src = Controls.sources.touch; if (!src || this.playerOf(src)) return; this.players.push({ src, side: this.openSide(), chair: null, spinQueued: 0, speedLevel: Settings.speedLevel, name: this.firstName() });
    });
  };
  P.update = function () {
    if (this.br) return up.call(this);
    Controls.update(this.game.loop.frame); this.ready = (this.ready || 0) + 1;
    const fits = s => s === null || (this.count(s) < this.sizes[s] && (!this.season || s === this.season.side));
    for (const src of Controls.list()) {
      const p = this.playerOf(src);
      if (!p) {
        if (src.pressed.a) { this.players.push({ src, side: null, chair: null, spinQueued: 0, speedLevel: Settings.speedLevel, name: this.firstName(), squad: 0, x: this.colX[1] }); Sound.play('select'); }   // you join in the middle, then pick a side
        else if (src.pressed.start && this.ready > 12 && this.players.length === 0) { Sound.play('select'); return this.kick(); }
        else if (src.pressed.b && this.players.length === 0) { Sound.play('back'); return this.scene.start(this.season ? 'SeasonHub' : 'Setup', { practice: this.practice }); }
        continue;
      }
      if (src.pressed.left || src.pressed.right) { const d = src.pressed.left ? -1 : 1, pos = p.side === null ? 1 : p.side * 2, np = Math.max(0, Math.min(2, pos + d)), want = np === 1 ? null : np / 2; if (np !== pos && fits(want)) { p.side = want; Sound.play('blip'); } else Sound.play('back'); }
      if (src.pressed.up || src.pressed.down) { this.rename(p, Settings.nextName(p.name, src.pressed.down ? 1 : -1, this.players.filter(q => q !== p).map(q => q.name))); Sound.play('blip'); }
      if (src.pressed.x) { p.locked = !p.locked; Sound.play('blip'); }
      if (src.pressed.y) Settings.askName(p.name, t => this.rename(p, t), src);
      if (src.pressed.b) { this.players = this.players.filter(q => q !== p); Sound.play('back'); }
      else if (src.pressed.start) { Sound.play('select'); return this.kick(); }
    }
    /* draw the controller cards, sliding to their column */
    const g = this.cardG, now = this.time.now; g.clear(); this.lab = this.lab || []; let li = 0; const rowsUsed = [0, 0, 0];
    for (const p of this.players) {
      const col = p.side === null ? 1 : p.side * 2, tx = this.colX[col], ty = (col === 1 ? 200 : 360) + rowsUsed[col]++ * 64; p.x = p.x === undefined ? tx : p.x + (tx - p.x) * 0.25; p.y = p.y === undefined ? ty : p.y + (ty - p.y) * 0.25;
      const tc = p.side === null ? 0x55626c : TEAMS[this.teams[p.side]].color, w = 344, x = p.x - w / 2, y = p.y - 26;
      g.fillStyle(0x0d151b, 0.95).fillRoundedRect(x, y, w, 52, 12).lineStyle(3, tc, 1).strokeRoundedRect(x, y, w, 52, 12).fillStyle(tc, 1).fillRoundedRect(x, y, 10, 52, { tl: 12, bl: 12, tr: 0, br: 0 });
      const icon = p.src.id === 'touch' ? '📱' : p.src.id.startsWith('kb') ? '⌨️' : '🎮', t = this.lab[li] || (this.lab[li] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0, 0.5).setDepth(6)); li++;
      t.setVisible(true).setText(`${icon}  ${p.name}${p.locked ? '   🔒' : ''}`).setPosition(x + 22, p.y - 8);
      const s2 = this.lab[li] || (this.lab[li] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: '#9fb2bf' }).setOrigin(0, 0.5).setDepth(6)); li++;
      s2.setVisible(true).setText(`${p.src.label}${p.locked ? '  ·  ONE CART' : ''}`).setPosition(x + 22, p.y + 13);
      if (p.side === null) { g.fillStyle(0xffffff, 0.35 + 0.35 * Math.sin(now / 200)); g.fillTriangle(x - 18, p.y, x - 6, p.y - 9, x - 6, p.y + 9); g.fillTriangle(x + w + 18, p.y, x + w + 6, p.y - 9, x + w + 6, p.y + 9); }
    }
    for (; li < this.lab.length; li++) this.lab[li].setVisible(false);
    [0, 1].forEach(s => this.countT[s].setText(`${this.count(s)} / ${this.sizes[s]} carts with players${this.sizes[s] === 0 ? '  (empty team)' : ''}`));
    this.idle.setText(this.players.length ? '' : 'Press A on a gamepad, Space / Right Shift on a keyboard, or Join on the touch controller.\n\nStart with nobody here to watch CPU v CPU.');
  };
}
