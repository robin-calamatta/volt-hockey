/* Season mode screens: the menu, the new-season setup, the season hub (your next game, simulating, standings), the standings table, your games,
   the playoff bracket, the trophy celebration and the hall of fame. The rules and data live in season.js. Everything works with a gamepad,
   a keyboard or touch like every other menu. */

const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10 < 4 ? n % 10 : 0]);
const badge = (scene, x, y, team, size) => scene.add.image(x, y, 'logo-' + TEAMS[team].id).setDisplaySize(size, size);
const MONO = { fontFamily: 'monospace', fontSize: '22px', color: '#e8eef2' };
const lineText = (g, rec) => `${rec.w}-${rec.l}-${rec.otl}`;
function stageText(s) {
  if (s.stage === 'regular') return `Matchday ${Math.min(s.day + 1, s.rounds.length)} of ${s.rounds.length}`;
  if (s.stage === 'playoffs') return Season.roundName(s.playoffs.round, s.playoffs.total).toUpperCase();
  return 'Season complete';
}
function gameLabel(s, fx) {                                          // "Matchday 4: Home vs Raptors" / "Quarterfinal, game 2: Away at Sharks"
  const home = fx.h === s.team, opp = home ? fx.a : fx.h;
  return (s.stage === 'regular' ? `Matchday ${s.day + 1}` : `${Season.roundName(s.playoffs.round, s.playoffs.total)}, game ${fx.game}`) + `:  ${home ? 'home vs' : 'away at'} ${TEAMS[opp].name}`;
}
function scoreText(fx) { return `${TEAMS[fx.h].abbr} ${fx.hs} - ${fx.as} ${TEAMS[fx.a].abbr}${fx.ot ? ' (OT)' : ''}`; }

class SeasonMenuScene extends ListMenuScene {
  constructor() { super('SeasonMenu'); }
  create() {
    const saved = Season.load(); this.confirm = false;
    const items = [];
    if (saved) items.push({ label: () => `Continue:  ${TEAMS[saved.team].name}, season ${saved.year}  (${stageText(saved).toLowerCase()})`, select: () => { Season.cur = saved; this.scene.start('SeasonHub'); } });
    items.push({ label: () => (saved && this.confirm ? 'This replaces your saved season. Press again' : 'New season'), select: () => { if (saved && !this.confirm) { this.confirm = true; return; } this.scene.start('SeasonSetup'); } });
    items.push({ label: () => 'Hall of fame', select: () => this.scene.start('History', { from: 'SeasonMenu' }) });
    items.push({ label: () => 'Back', select: () => this.scene.start('Main') });
    this.buildMenu('SEASON', items, 260);
    this.onBack = () => this.scene.start('Main');
    this.add.text(CX, 600, `Everybody plays everybody, then the best ${Season.qualifiers()} teams play off for the ${CONFIG.season.cupName}.\nPlay your team's games with friends or simulate them. The other games are simulated from team ratings.`,
      { ...STYLE.hint, fontSize: '22px', color: '#9fb2bf', align: 'center' }).setOrigin(0.5);
  }
}

class SeasonSetupScene extends ListMenuScene {
  constructor() { super('SeasonSetup'); }
  create() {
    const C = CONFIG.season, n = TEAMS.length, levels = Season.levels(), games = d => (d ? 2 : 1) * (n - 1);
    const cycle = (key, list, d) => { const i = list.indexOf(Settings[key]); Settings[key] = list[(i + d + list.length) % list.length]; Settings.save(); };
    this.buildMenu('NEW SEASON', [
      { label: () => `Your team   ◀ ${TEAMS[Settings.seasonTeam].name} ▶`, change: d => { Settings.seasonTeam = (Settings.seasonTeam + d + n) % n; Settings.save(); } },
      { label: () => `CPU skill   ◀ ${Settings.seasonDifficulty} ▶`, change: d => cycle('seasonDifficulty', levels, d) },
      { label: () => `Game length   ◀ ${Settings.seasonPeriod / 60} min periods ▶`, change: d => cycle('seasonPeriod', C.periodChoices, d) },
      { label: () => `Season   ◀ ${games(Settings.seasonDouble)} games ▶`, change: () => { Settings.seasonDouble = !Settings.seasonDouble; Settings.save(); }, select: () => { Settings.seasonDouble = !Settings.seasonDouble; Settings.save(); } },
      speedCapItem('Max cart speed'), lockCartItem(),
      { label: () => 'START SEASON', select: () => this.start() },
      { label: () => 'Back', select: () => this.scene.start('SeasonMenu') }
    ], 250);
    this.onBack = () => this.scene.start('SeasonMenu');
    this.logo = this.add.image(190, 400, 'logo-' + TEAMS[Settings.seasonTeam].id).setDisplaySize(240, 240);
    this.nameT = this.add.text(190, 540, '', { ...STYLE.big, fontSize: '44px' }).setOrigin(0.5);
    this.ratingT = this.add.text(190, 590, '', { ...STYLE.hint, fontSize: '24px' }).setOrigin(0.5);
    this.add.text(CX + 330, 640, 'Longer games and a double round robin make a longer season.', { ...STYLE.hint, fontSize: '20px', color: '#9fb2bf' }).setOrigin(0.5);
  }
  start() {
    const s = Season.create({ team: Settings.seasonTeam, difficulty: Settings.seasonDifficulty, periodSeconds: Settings.seasonPeriod, double: Settings.seasonDouble });
    Season.cur = s; Season.save(s); this.scene.start('SeasonHub', { flash: `SEASON 1: ${TEAMS[s.team].name.toUpperCase()}` });
  }
  update() {
    super.update(); if (!this.logo) return; const t = Settings.seasonTeam;
    this.logo.setTexture('logo-' + TEAMS[t].id); this.nameT.setText(TEAMS[t].name.toUpperCase()).setColor(teamColorHex(t)); this.ratingT.setText('Rating ' + TEAMS[t].rating);
  }
}

/* The hub: what is next, and the way to everything else. */
class SeasonHubScene extends ListMenuScene {
  constructor() { super('SeasonHub'); }
  init(data) { this.flash = (data && data.flash) || ''; }
  create() {
    const s = Season.cur || (Season.cur = Season.load());
    if (!s) return this.scene.start('SeasonMenu');
    this.s = s; Season.save(s);
    const mine = Season.mine(s), today = Season.fixtures(s), played = today.find(f => f.done && (f.h === s.team || f.a === s.team)), done = s.stage === 'done', again = () => this.scene.restart();
    const next = (includeMine, msg) => {                         // play out the rest of today and move on
      const before = s.stage; Season.finishDay(s, includeMine); Season.save(s);
      if (s.stage === 'done') return this.scene.start('Trophy');
      if (before === 'regular' && s.stage === 'playoffs') return this.scene.start('Bracket', { intro: true });
      this.scene.restart({ flash: msg || '' });
    };
    const items = [];
    if (done) {
      items.push({ label: () => 'Start next season', select: () => { Season.cur = Season.next(s); Season.save(Season.cur); this.scene.restart({ flash: `SEASON ${Season.cur.year}` }); } });
    } else if (mine) {
      items.push({ label: () => 'PLAY THIS GAME', select: () => this.play(mine) });
      items.push({ label: () => 'Simulate this game', select: () => { const r = Season.simGame(s, mine.h, mine.a); Season.record(s, mine, r.hs, r.as, r.ot); Season.save(s); this.scene.restart({ flash: 'SIMULATED  ' + scoreText(mine) }); } });
    } else if (played) {
      items.push({ label: () => (s.stage === 'regular' ? 'Next matchday' : 'Continue'), select: () => next(false) });
    } else if (Season.bye(s)) {
      items.push({ label: () => 'Your team has the day off: next matchday', select: () => next(false) });
    } else {                                                     // out of the playoffs: the rest of the bracket plays itself
      items.push({ label: () => 'Simulate the next games', select: () => next(true) });
    }
    if (!done && s.stage === 'regular') items.push({ label: () => 'Simulate the rest of the regular season', select: () => { Season.simToPlayoffs(s); Season.save(s); this.scene.start('Bracket', { intro: true }); } });
    if (!done && (s.stage === 'playoffs' || !Season.alive(s))) items.push({ label: () => 'Simulate to the end', select: () => { Season.simToEnd(s); Season.save(s); this.scene.start('Trophy'); } });
    items.push({ label: () => 'Standings', select: () => this.scene.start('Standings') });
    items.push({ label: () => (s.stage === 'regular' ? 'Playoff picture' : 'Playoff bracket'), select: () => this.scene.start('Bracket') });
    items.push({ label: () => 'Your games', select: () => this.scene.start('Games') });
    if (done) items.push({ label: () => 'Hall of fame', select: () => this.scene.start('History', { from: 'SeasonHub' }) });
    items.push({ label: () => 'Save and leave', select: () => { Season.save(s); Season.cur = null; this.scene.start('SeasonMenu'); } });
    this.buildMenu('SEASON ' + s.year, items, 240, { x: 330, size: 32 });
    this.onBack = () => { Season.save(s); Season.cur = null; this.scene.start('SeasonMenu'); };
    this.info(s, mine, played, done, today);
    if (this.flash) { const t = this.add.text(CX, 690, this.flash, { ...STYLE.hint, fontSize: '28px', color: '#ffe27a' }).setOrigin(0.5).setDepth(5); this.tweens.add({ targets: t, alpha: 0, delay: 2500, duration: 600 }); }
  }
  play(fx) {
    const s = this.s; Season.fx = fx;
    this.scene.start('Lobby', { sizes: [CONFIG.match.chairsPerTeam, CONFIG.match.chairsPerTeam], season: { teams: [fx.h, fx.a], side: fx.h === s.team ? 0 : 1, periodSeconds: s.periodSeconds, difficulty: s.difficulty, levels: [Season.levelFor(s, fx.h), Season.levelFor(s, fx.a)], fx } });
  }
  info(s, mine, played, done, today) {                                  // the right-hand card: your team, your standing, today's game, the latest results
    const row = Season.standings(s).find(r => r.t === s.team), x0 = 700;
    panel(this, x0 - 20, 135, 570, 545);
    badge(this, x0 + 55, 205, s.team, 100);
    this.add.text(x0 + 130, 165, TEAMS[s.team].name.toUpperCase(), { ...STYLE.hud, fontSize: '46px', color: teamColorHex(s.team) });
    this.add.text(x0 + 130, 217, `${lineText(null, row)}   ${row.pts} pts   ${ordinal(row.rank)} of ${TEAMS.length}`, { ...STYLE.hint, fontSize: '26px', color: '#e8eef2' });
    this.add.text(x0, 277, stageText(s), { ...STYLE.hud, fontSize: '30px', color: '#f2c200' });
    let y = 322;
    if (done) {
      badge(this, x0 + 40, y + 35, s.champion, 64); this.add.text(x0 + 90, y + 8, CONFIG.season.cupName.toUpperCase() + ' CHAMPIONS', { ...STYLE.hint, fontSize: '22px' });
      this.add.text(x0 + 90, y + 36, TEAMS[s.champion].name.toUpperCase(), { ...STYLE.hud, fontSize: '34px', color: teamColorHex(s.champion) });
      this.add.text(x0, y + 90, 'Your season: ' + (s.userPlayoffResult || ''), { ...STYLE.hint, fontSize: '26px', color: '#e8eef2' });
      y += 140;
    } else if (mine) {
      const home = mine.h === s.team, opp = home ? mine.a : mine.h;
      this.add.text(x0, y, gameLabel(s, mine), { ...STYLE.hint, fontSize: '25px', color: '#e8eef2', wordWrap: { width: 520 } });
      badge(this, x0 + 70, y + 100, mine.h, 90); this.add.text(x0 + 180, y + 100, 'VS', { ...STYLE.hud, fontSize: '36px', color: '#8fa8b8' }).setOrigin(0.5); badge(this, x0 + 290, y + 100, mine.a, 90);
      this.add.text(x0 + 360, y + 70, `${TEAMS[opp].name}\nRating ${TEAMS[opp].rating}\nCPU: ${Season.levelFor(s, opp)}`, { ...STYLE.hint, fontSize: '22px', color: '#9fb2bf' });
      y += 175;
    } else if (played) {
      this.add.text(x0, y, 'Played:  ' + scoreText(played) + (played.hs > played.as === (played.h === s.team) ? '   WIN' : '   LOSS'), { ...STYLE.hint, fontSize: '26px', color: '#e8eef2' });
      y += 50;
    } else if (Season.bye(s)) { this.add.text(x0, y, 'Your team has a bye this matchday.', { ...STYLE.hint, fontSize: '25px', color: '#e8eef2' }); y += 50; }
    else { this.add.text(x0, y, Season.alive(s) ? '' : 'Your team is out of the playoffs.', { ...STYLE.hint, fontSize: '25px', color: '#e8eef2' }); y += 50; }
    const prev = s.stage === 'regular' ? (s.day > 0 ? s.rounds[s.day - 1] : []) : [];
    const results = [...today.filter(f => f.done), ...prev].slice(0, 5);
    if (results.length) {
      this.add.text(x0, y, 'LATEST RESULTS', { ...STYLE.hint, fontSize: '20px', color: '#8fa8b8' });
      results.forEach((f, i) => this.add.text(x0, y + 28 + i * 27, scoreText(f), { ...MONO, fontSize: '20px', color: f.h === s.team || f.a === s.team ? '#ffe27a' : '#cfe0ea' }));
    }
  }
}

/* The table. */
class StandingsScene extends Phaser.Scene {
  constructor() { super('Standings'); }
  create() {
    const s = Season.cur; menuBackdrop(this); const rows = Season.standings(s), Q = Season.qualifiers();
    this.add.text(CX, 44, 'STANDINGS', { ...STYLE.title, fontSize: '52px' }).setOrigin(0.5); this.add.rectangle(CX, 82, 130, 4, THEME.gold, 0.95);
    const x0 = 250, y0 = 112, h = 33;
    panel(this, x0 - 30, y0 - 12, 800, h * (rows.length + 1) + 36, { depth: -40 });
    const p = (v, n) => String(v).padStart(n), line = a => `${p(a[0], 2)}      ${String(a[1]).padEnd(10)} ${p(a[2], 3)} ${p(a[3], 3)} ${p(a[4], 3)} ${p(a[5], 3)} ${p(a[6], 4)} ${p(a[7], 4)} ${p(a[8], 4)} ${p(a[9], 5)}  ${a[10]}`;
    this.add.text(x0, y0, line(['#', 'TEAM', 'GP', 'W', 'L', 'OTL', 'PTS', 'GF', 'GA', 'DIFF', 'LAST 5']), { ...MONO, fontSize: '20px', color: '#8fa8b8' });
    rows.forEach((r, i) => {
      const y = y0 + h * (i + 1);
      if (r.t === s.team) this.add.rectangle(x0 + 370, y + 12, 780, h - 3, THEME.accent, 0.22);
      badge(this, x0 + 60, y + 12, r.t, 26);
      const f = r.form.slice(-5).reverse().join('').padEnd(5, '.');
      this.add.text(x0, y, line([r.rank, TEAMS[r.t].name, r.gp, r.w, r.l, r.otl, r.pts, r.gf, r.ga, r.gd > 0 ? '+' + r.gd : r.gd, f]), { ...MONO, fontSize: '20px', color: r.t === s.team ? '#ffe27a' : i < Q ? '#e8eef2' : '#8fa8b8' });
      if (i === Q - 1) this.add.rectangle(x0 + 370, y + h - 3, 780, 2, THEME.gold, 0.8);
    });
    this.add.text(CX, 700, `Top ${Q} make the playoffs.   W = ${CONFIG.season.winPoints} pts, overtime loss (O) = ${CONFIG.season.otLossPoints}.   A / B: back`, { ...STYLE.hint, fontSize: '20px', color: '#9fb2bf' }).setOrigin(0.5);
  }
  update() { Controls.update(this.game.loop.frame); const e = Controls.menu(); if (e.a || e.b || e.start) { Sound.play('back'); this.scene.start('SeasonHub'); } }
}

/* Your games: every game on your calendar, with results. Up / down scrolls. */
class GamesScene extends Phaser.Scene {
  constructor() { super('Games'); }
  create() {
    const s = Season.cur; menuBackdrop(this); this.top = 0; this.list = [];
    s.rounds.forEach((rd, i) => rd.forEach(f => { if (f.h === s.team || f.a === s.team) this.list.push({ tag: 'MD' + (i + 1), f }); }));
    if (s.playoffs) s.playoffs.rounds.forEach((rd, r) => rd.forEach(ser => { if (ser.a === s.team || ser.b === s.team) ser.games.forEach((g, k) => this.list.push({ tag: Season.roundName(r, s.playoffs.total).slice(0, 5).toUpperCase() + (k + 1), f: { ...g, done: true } })); }));
    this.add.text(CX, 44, 'YOUR GAMES', { ...STYLE.title, fontSize: '52px' }).setOrigin(0.5); this.add.rectangle(CX, 82, 130, 4, THEME.gold, 0.95);
    panel(this, 330, 108, 620, 560, { depth: -40 });
    this.rows = Array.from({ length: 15 }, (_, i) => this.add.text(350, 122 + i * 36, '', { ...MONO, fontSize: '22px' }));
    this.foot = this.add.text(CX, 696, '▲ ▼ scroll    A / B: back', { ...STYLE.hint, fontSize: '20px', color: '#9fb2bf' }).setOrigin(0.5);
    this.top = Math.max(0, Math.min(this.list.length - 15, this.list.findIndex(x => !x.f.done) - 4)); this.paint();
  }
  paint() {
    const s = Season.cur;
    this.rows.forEach((t, i) => {
      const it = this.list[this.top + i]; if (!it) return t.setText('');
      const f = it.f, home = f.h === s.team, opp = home ? f.a : f.h, mine = home ? f.hs : f.as, theirs = home ? f.as : f.hs;
      t.setText(`${it.tag.padEnd(6)} ${(home ? 'vs' : '@ ')} ${TEAMS[opp].name.padEnd(10)} ${f.done ? (mine > theirs ? 'W' : 'L') + ` ${mine}-${theirs}${f.ot ? ' OT' : ''}` : '-'}`);
      t.setColor(!f.done ? '#8fa8b8' : mine > theirs ? '#7fe28f' : '#ff9a9a');
    });
  }
  update() {
    Controls.update(this.game.loop.frame); const e = Controls.menu();
    if (e.up && this.top > 0) { this.top--; this.paint(); } if (e.down && this.top < this.list.length - 15) { this.top++; this.paint(); }
    if (e.a || e.b || e.start) { Sound.play('back'); this.scene.start('SeasonHub'); }
  }
}

/* The playoff bracket: quarterfinals, semifinals and the World Cup final. Before the playoffs it shows who would qualify today. */
class BracketScene extends Phaser.Scene {
  constructor() { super('Bracket'); }
  init(data) { this.intro = !!(data && data.intro); }
  create() {
    const s = Season.cur; menuBackdrop(this); const Q = Season.qualifiers(), rounds = Math.log2(Q), P = s.playoffs;
    this.add.text(CX, 40, s.stage === 'regular' ? 'PLAYOFF PICTURE' : CONFIG.season.cupName.toUpperCase(), { ...STYLE.title, fontSize: '50px' }).setOrigin(0.5); this.add.rectangle(CX, 76, 130, 4, THEME.gold, 0.95);
    let shown = [];
    if (P) shown = P.rounds;
    else { const seeds = Season.standings(s).slice(0, Q).map(r => r.t); shown = [Array.from({ length: Q / 2 }, (_, i) => ({ a: seeds[i], b: seeds[Q - 1 - i], wins: [0, 0], games: [], winner: null, need: Math.ceil(Season.seriesLength(0, rounds) / 2), len: Season.seriesLength(0, rounds) }))]; }
    const W = 250, H = 76, top = 110, avail = 560, g = this.add.graphics().setDepth(-30);
    const slot = (r, i) => { const n = Q / Math.pow(2, r + 1), cell = avail / n; return { x: rounds > 1 ? 160 + r * ((1280 - 320 - W) / (rounds - 1)) : 515, y: top + cell * (i + 0.5) }; };
    for (let r = 0; r < rounds; r++) {
      const n = Q / Math.pow(2, r + 1);
      this.add.text(slot(r, 0).x + W / 2, top - 6, Season.roundName(r, rounds).replace(CONFIG.season.cupName + ' ', '').toUpperCase() + `  ·  BEST OF ${Season.seriesLength(r, rounds)}`, { ...STYLE.hint, fontSize: '17px', color: '#8fa8b8' }).setOrigin(0.5);
      for (let i = 0; i < n; i++) {
        const { x, y } = slot(r, i), ser = (shown[r] || [])[i];
        if (r < rounds - 1) { const to = slot(r + 1, Math.floor(i / 2)); g.lineStyle(2, THEME.panelLine, 1).lineBetween(x + W, y, x + W + 22, y).lineBetween(x + W + 22, y, x + W + 22, to.y).lineBetween(x + W + 22, to.y, to.x - 0, to.y); }
        this.box(x, y - H / 2, W, H, ser, s);
      }
    }
    if (s.stage === 'done') this.add.text(CX, 700, `${TEAMS[s.champion].name.toUpperCase()} ARE THE ${CONFIG.season.cupName.toUpperCase()} CHAMPIONS`, { ...STYLE.hud, fontSize: '28px', color: '#f2c200' }).setOrigin(0.5);
    else this.add.text(CX, 700, (this.intro ? 'THE REGULAR SEASON IS OVER.   ' : '') + 'A / B: continue', { ...STYLE.hint, fontSize: '22px', color: this.intro ? '#ffe27a' : '#9fb2bf' }).setOrigin(0.5);
  }
  box(x, y, w, h, ser, s) {                                        // one series: two team lines with the series score
    panel(this, x, y, w, h, { depth: -20, radius: 10, alpha: 0.9 });
    [0, 1].forEach(k => {
      const t = ser ? (k ? ser.b : ser.a) : null, yy = y + 20 + k * 34, won = ser && ser.winner !== null && ser.winner === t, lost = ser && ser.winner !== null && ser.winner !== t;
      if (t === null || t === undefined) return this.add.text(x + 14, yy - 10, 'TBD', { ...MONO, fontSize: '18px', color: '#5f7686' });
      if (t === s.team) this.add.rectangle(x + w / 2, yy, w - 8, 30, THEME.accent, 0.22).setDepth(-15);
      badge(this, x + 26, yy, t, 26);
      this.add.text(x + 48, yy - 11, `${s.seeds ? (s.seeds.indexOf(t) + 1) : ''}`.padEnd(2) + TEAMS[t].name, { ...MONO, fontSize: '19px', color: lost ? '#5f7686' : won ? '#ffe27a' : '#e8eef2' });
      this.add.text(x + w - 16, yy - 12, String(ser.wins[k]), { ...STYLE.hud, fontSize: '24px', color: won ? '#ffe27a' : lost ? '#5f7686' : '#ffffff' }).setOrigin(1, 0);
    });
  }
  update() { Controls.update(this.game.loop.frame); const e = Controls.menu(); if (e.a || e.b || e.start) { Sound.play('back'); this.scene.start(Season.cur.stage === 'done' && this.intro ? 'Trophy' : 'SeasonHub'); } }
}

/* The celebration at the end of a season. */
class TrophyScene extends Phaser.Scene {
  constructor() { super('Trophy'); }
  create() {
    const s = Season.cur; Season.save(s); menuBackdrop(this, { accent: THEME.gold }); const win = s.champion === s.team, champ = s.champion;
    this.add.text(CX, 70, win ? 'WORLD CUP CHAMPIONS!' : CONFIG.season.cupName.toUpperCase(), { ...STYLE.title, fontSize: '78px', color: win ? '#f2c200' : '#ffffff' }).setOrigin(0.5);
    const g = this.add.graphics().setPosition(CX, 360);                                    // the trophy: a gold cup on a base
    g.fillStyle(0xf2c200).fillRoundedRect(-95, -150, 190, 130, { tl: 14, tr: 14, bl: 80, br: 80 });
    g.lineStyle(16, 0xf2c200).strokeEllipse(-112, -105, 60, 70).strokeEllipse(112, -105, 60, 70);
    g.fillStyle(0xe0ac00).fillRect(-18, -22, 36, 66).fillStyle(0xf2c200).fillRoundedRect(-80, 44, 160, 28, 8).fillStyle(0x7a5a00).fillRoundedRect(-100, 72, 200, 34, 8);
    g.fillStyle(0xffffff, 0.35).fillRoundedRect(-70, -140, 22, 100, 10);
    badge(this, CX, 280, champ, 110).setDepth(2);
    if (!win) this.add.text(CX, 462, 'CHAMPIONS', { ...STYLE.hint, fontSize: '26px', color: '#f2c200' }).setOrigin(0.5);
    this.add.text(CX, 512, TEAMS[champ].name.toUpperCase(), { ...STYLE.big, fontSize: '64px', color: teamColorHex(champ) }).setOrigin(0.5);
    this.add.text(CX, 574, win ? `Season ${s.year}: a title for ${TEAMS[s.team].name}!` : `Your season: ${s.userPlayoffResult}`, { ...STYLE.hud, fontSize: '34px', color: '#e8eef2' }).setOrigin(0.5);
    const cups = (Settings.career || {}).cups || 0;
    this.add.text(CX, 616, `${cups} World Cup${cups === 1 ? '' : 's'} won`, { ...STYLE.hint, fontSize: '24px', color: '#f2c200' }).setOrigin(0.5);
    this.add.text(CX, 690, 'A: continue', { ...STYLE.hint, fontSize: '24px', color: '#9fb2bf' }).setOrigin(0.5);
    const burst = () => confettiBurst(this, Phaser.Math.Between(300, 980), Phaser.Math.Between(260, 460), TEAMS[champ].color);
    burst(); this.time.addEvent({ delay: 700, repeat: win ? 14 : 3, callback: burst }); if (win) Sound.play('goal');
  }
  update() { Controls.update(this.game.loop.frame); const e = Controls.menu(); if (e.a || e.b || e.start) { Sound.play('select'); this.scene.start('SeasonHub'); } }
}

/* Past seasons and trophies. */
class HistoryScene extends Phaser.Scene {
  constructor() { super('History'); }
  init(data) { this.from = (data && data.from) || 'SeasonMenu'; }
  create() {
    menuBackdrop(this); const h = Season.history().slice().reverse(), cups = (Settings.career || {}).cups || 0;
    this.add.text(CX, 44, 'HALL OF FAME', { ...STYLE.title, fontSize: '52px' }).setOrigin(0.5); this.add.rectangle(CX, 82, 130, 4, THEME.gold, 0.95);
    this.add.text(CX, 120, `${cups} World Cup${cups === 1 ? '' : 's'} won`, { ...STYLE.hud, fontSize: '32px', color: '#f2c200' }).setOrigin(0.5);
    panel(this, 190, 150, 900, 510, { depth: -40 });
    if (!h.length) this.add.text(CX, 380, 'No finished seasons yet.\nPlay a season to the end to fill this board.', { ...STYLE.hint, fontSize: '26px', color: '#9fb2bf', align: 'center' }).setOrigin(0.5);
    h.slice(0, 12).forEach((r, i) => {
      const y = 175 + i * 40; badge(this, 230, y + 12, r.team, 30);
      this.add.text(260, y, `Season ${String(r.year).padEnd(3)} ${TEAMS[r.team].name.padEnd(9)} ${r.w}-${r.l}-${r.otl} (${ordinal(r.rank)})   ${r.result}`, { ...MONO, fontSize: '20px', color: r.champion === r.team ? '#f2c200' : '#e8eef2' });
      badge(this, 1040, y + 12, r.champion, 28);
    });
    this.add.text(CX, 696, 'A / B: back', { ...STYLE.hint, fontSize: '20px', color: '#9fb2bf' }).setOrigin(0.5);
  }
  update() { Controls.update(this.game.loop.frame); const e = Controls.menu(); if (e.a || e.b || e.start) { Sound.play('back'); this.scene.start(this.from); } }
}
