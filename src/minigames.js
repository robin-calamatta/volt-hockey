/* Minigames: Balloon Bash, Race and Manhunt. Each is a MiniMatch: the same carts, physics, cameras, lobby, split screen and online play as a
   hockey match, with its own rules. There is no ball (m.ball is kept as an invisible point the cameras follow) and no nets.
     Balloon Bash  every cart carries balloons on its back. Hit someone's back with your front: one pops and they restart somewhere safe.
                   No balloons left: you are out and watch from the sin bin. Free for all, or teams.
     Race          a barrier island turns the rink into an oval. Count the laps; first across the line wins (the rest get a little time to finish).
     Manhunt       one cart is IT. Whoever IT touches becomes IT too. IT wins when everybody is caught; anyone still free when the clock runs out wins.
   Power-ups (? boxes) give one item, used with A (or X): BOOST (a few seconds faster), ZAP (a shot: pops a balloon, or spins a cart out) and
   OIL (dropped behind you: whoever drives over it has their steering reversed for a few seconds, then the slick is gone).
   Online: the host runs everything; miniSnap() / miniApply() carry the extra state in each snapshot (see net.js). */
const MINI = {
  names: { balloons: 'Balloon Bash', race: 'Race', hunt: 'Manhunt' },
  hints: { balloons: 'Pop the balloons on everyone else\'s back with the front of your cart. Last one with balloons wins.', race: 'Laps of an oval track built on the court. First across the line wins.', hunt: 'One cart is IT. Get caught and you are IT too. Survive the clock to win.' },
  items: { boost: { label: 'BOOST', icon: '🚀' }, zap: { label: 'ZAP', icon: '⚡' }, oil: { label: 'OIL', icon: '🛢' } },
  item: { boostSeconds: 3, boostMul: 1.55, zapSpeed: 13, zapLife: 1.4, zapRadius: 0.2, stunSeconds: 1.2, oilRadius: 0.75, oilLife: 14, oilGrace: 1.2, reverseSeconds: 4,
          boxEvery: [3.5, 7], boxMax: 4, boxRadius: 0.5, boxFirst: 2 },
  balloons: { safeSeconds: 2, reach: 0.5, minClosing: 0.25, front: 0.62, rear: -0.55 },
  race: { island: { x0: 6.5, y0: 4.75, x1: 21.5, y1: 10.25 }, lineOffset: 2.4, finishGrace: 20, points: 160 },
  hunt: { catchGap: 0.05, hunterSpeed: 0.88, safeSeconds: 1.5, freezeSeconds: 2, hunterPause: 0.8 },
  palette: [0xff4d4d, 0xffd23f, 0x3dd6ff, 0x7dff6a, 0xff7ad9, 0xffffff, 0xff9f1c, 0xb28dff],     // balloon colours, one per cart
  defaults: { balloonMode: 'ffa', balloons: 3, balloonMinutes: 3, carts: 6, laps: 5, track: 'rink', huntMinutes: 3, items: { balloons: true, race: true, hunt: false } }
};
const miniOpts = () => { const d = MINI.defaults, s = Settings.mg || {}; return { ...d, ...s, items: { ...d.items, ...(s.items || {}) } }; };
const miniSave = patch => { Settings.mg = { ...miniOpts(), ...patch }; Settings.save(); };
let miniCfg = kind => { const o = miniOpts(); return { kind, mode: kind === 'balloons' ? o.balloonMode : kind === 'race' ? 'ffa' : 'hunt', balloons: o.balloons, laps: o.laps, track: o.track || 'rink', minutes: kind === 'balloons' ? o.balloonMinutes : o.huntMinutes, items: !!o.items[kind] }; };
const miniSizes = n => [Math.ceil(n / 2), Math.floor(n / 2)];
function makeMatch(opts, world = true) { if (world) setWorld(opts.mini); return opts.mini ? new MiniMatch(opts) : new Match(opts); }   // world: the playing area follows a race map (not for the camera preview)
function miniLabel(cfg) {
  if (!cfg) return 'Hockey';
  return MINI.names[cfg.kind] + (cfg.kind === 'balloons' ? ` (${cfg.mode === 'teams' ? 'teams' : 'free for all'}, ${cfg.balloons} balloons, ${cfg.minutes} min)` : cfg.kind === 'race' ? ` (${raceMap(cfg.track).name}, ${cfg.laps} lap${cfg.laps === 1 ? '' : 's'})` : ` (${cfg.minutes} min)`) + (cfg.items ? ', power-ups' : '');
}

class MiniMatch extends Match {
  constructor(opts) {
    super({ ...opts, practice: true });
    const cfg = this.mini = { ...opts.mini }; this.kind = cfg.kind; this.noBall = true; this.nets = []; this.creases = [];
    this.boxes = []; this.zaps = []; this.slicks = []; this.order = []; this.boxIn = MINI.item.boxFirst; this.idN = 0; this.result = null; this.clock = cfg.minutes * 60;
    const taken = this.players.map(p => p.name), names = CONFIG.playerNames.filter(n => !taken.includes(n));
    this.chairs.forEach((c, i) => { c.k = i; c.cpuName = names[i % names.length]; c.balloons = cfg.balloons; c.out = false; c.item = ''; c.boostLeft = c.oilLeft = c.stunLeft = c.safeLeft = 0; c.pops = 0; c.catches = 0; c.lap = 0; c.prog = 0; c.finish = 0; });
    if (this.kind === 'race') this.buildTrack();
    if (this.kind === 'hunt') {                                         // one cart starts as IT (side 1, the other team's colours); everyone else runs (side 0)
      const it = this.chairs[Math.floor(Math.random() * this.chairs.length)];
      for (const c of this.chairs) { c.side = c === it ? 1 : 0; if (c.player) c.player.side = c.side; }
    }
    this.kickoff();
  }
  /* ----- things hockey does that a minigame does not ----- */
  name(c) { return c ? (c.player && c.player.name ? c.player.name : c.cpuName || 'CPU ' + (c.k + 1)) : 'somebody'; }
  togglePress() {}
  switchChair() { Sound.play('back'); }                                 // everyone keeps their own cart
  switchSide() { return false; }
  call(key, vars, pri) {}                                               // hockey commentary off; minigames speak through line()
  line(text) { if (this.remote) return; this.hear(text); if (this.callQueue) this.callQueue.push(text); }
  stepBall() {}
  countShots() {}
  strength() { return [0, 0]; }
  focusOn() {                                                           // the invisible "ball" the broadcast and 2D cameras follow
    const live = this.chairs.filter(c => !c.out), me = this.players.find(p => !p.remote && p.chair && !p.chair.out);
    const f = me ? me.chair : live.length ? { x: live.reduce((a, c) => a + c.x, 0) / live.length, y: live.reduce((a, c) => a + c.y, 0) / live.length } : { x: this.width / 2, y: this.centerY };
    Object.assign(this.ball, { x: f.x, y: f.y, vx: 0, vy: 0 });
  }

  /* ----- the race track: a stadium-shaped island (a capsule) in the middle of the rink; the racing line runs round it ----- */
  buildTrack() {
    const I = MINI.race.island, r = (I.y1 - I.y0) / 2, cy = (I.y0 + I.y1) / 2, a = I.x0 + r, b = I.x1 - r, ro = r + MINI.race.lineOffset;
    this.island = { a, b, cy, r };
    const pts = [], N = MINI.race.points, straight = b - a, arc = Math.PI * ro, total = 2 * straight + 2 * arc;
    for (let i = 0; i < N; i++) {                                       // clockwise on screen: along the bottom to the right, up round the right end, back along the top, down round the left
      let s = i / N * total, x, y;
      if (s < straight) { x = a + s; y = cy + ro; }
      else if ((s -= straight) < arc) { const t = Math.PI / 2 - s / ro; x = b + Math.cos(t) * ro; y = cy + Math.sin(t) * ro; }
      else if ((s -= arc) < straight) { x = b - s; y = cy - ro; }
      else { s -= straight; const t = -Math.PI / 2 - s / ro; x = a + Math.cos(t) * ro; y = cy + Math.sin(t) * ro; }
      pts.push({ x, y });
    }
    this.rline = pts; this.startI = Math.round((this.width / 2 - a) / total * N);       // the start / finish line crosses the bottom straight at centre court
  }
  nearestI(x, y, from) {                                                // index of the racing-line point nearest (x, y); searches near `from` when given
    const N = this.rline.length; let best = 0, bd = Infinity;
    const scan = from === undefined ? [...Array(N).keys()] : Array.from({ length: 41 }, (_, k) => (from - 20 + k + N) % N);
    for (const i of scan) { const p = this.rline[i], d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  }
  islandPush(o, rad, bounce) {                                         // keep a circle out of the island (and bounce off it)
    const I = this.island; if (!I) return false;
    const px = clamp(o.x, I.a, I.b), dx = o.x - px, dy = o.y - I.cy, d = Math.hypot(dx, dy), lim = I.r + rad;
    if (d >= lim || d === 0) return false;
    const nx = dx / d, ny = dy / d, vn = (o.vx || 0) * nx + (o.vy || 0) * ny;
    o.x = px + nx * lim; o.y = I.cy + ny * lim; if (vn < 0 && o.vx !== undefined) { o.vx -= (1 + bounce) * vn * nx; o.vy -= (1 + bounce) * vn * ny; }
    return true;
  }
  chairObstacles(c) { super.chairObstacles(c); if (!c.benched) this.islandPush(c, CONFIG.chair.radius, CONFIG.chair.boardBounce); }

  /* ----- starting positions ----- */
  kickoff() {
    if (!this.mini) return;                                             // (the hockey constructor calls this before the minigame is set up)
    const W = this.width, H = this.height, cy = this.centerY, n = this.chairs.length, base = { vx: 0, vy: 0, omega: 0, spinLeft: 0, spinCooldown: 0, stuckFor: 0 };
    this.chairs.forEach((c, i) => {
      let x, y, heading;
      if (this.kind === 'race' && this.island) {                        // (the rink oval) a grid behind the line on the bottom straight, two abreast
        const I = this.island, row = Math.floor(i / 2), lane = i % 2;
        x = W / 2 - 1.3 - row * 1.6; y = I.cy + I.r + 1.2 + lane * 2.1; heading = 0;
        c.lastI = this.nearestI(x, y); c.prog = -(((this.startI - c.lastI) + this.rline.length) % this.rline.length); c.lap = 0;
      } else if (this.kind === 'hunt') {                               // IT at the left end; the runners spread over the other two thirds
        const its = this.chairs.filter(k => k.side === 1), runners = this.chairs.filter(k => k.side === 0);
        if (c.side === 1) { x = 3; y = cy + (its.indexOf(c) - (its.length - 1) / 2) * 2; heading = 0; }
        else { const j = runners.indexOf(c), cols = Math.ceil(runners.length / 2); x = W * 0.45 + (j % cols) * (W * 0.5 / Math.max(1, cols - 1 || 1)); y = j < cols ? cy - 4 : cy + 4; heading = Math.PI; }
      } else if (this.kind === 'balloons' && this.mini.mode === 'teams') {   // each team on its own half, facing the middle
        const mates = this.chairs.filter(k => k.side === c.side), j = mates.indexOf(c), m = mates.length;
        x = c.side ? W - 3 : 3; y = cy + (j - (m - 1) / 2) * Math.min(3, (H - 3) / Math.max(1, m - 1)); heading = c.side ? Math.PI : 0;
      } else {                                                          // round a big ring, facing the middle
        const t = i / n * Math.PI * 2 - Math.PI / 2, rx = W * 0.36, ry = H * 0.34; x = W / 2 + Math.cos(t) * rx; y = cy + Math.sin(t) * ry; heading = Math.atan2(cy - y, W / 2 - x);
      }
      Object.assign(c, base, { x, y, heading, px: x, py: y, ph: heading });
      if (c.out) c.binLeft = 1e9;
    });
    if (this.kind === 'hunt') this.chairs.forEach(c => { if (c.side === 0) c.safeLeft = 3; });
    this.focusOn(); this.state = 'countdown'; this.timer = CONFIG.match.countdownSeconds; this.lastCount = 0;
  }

  /* ----- the game loop ----- */
  step(h) {
    this.bannerLeft -= h; this.noticeLeft -= h;
    if (this.state === 'countdown') {
      this.timer -= h; const n = Math.ceil(this.timer);
      if (n !== this.lastCount && n > 0) { this.lastCount = n; this.sfx('count'); }
      if (this.timer <= 0) { this.state = 'play'; this.sfx('whistle'); this.line(this.kind === 'race' ? 'And they are off!' : this.kind === 'hunt' ? `${this.name(this.chairs.find(c => c.side === 1))} is it. Run!` : 'Let the popping begin!'); }
    } else if (this.state === 'play') {
      this.simulate(h);
      if (this.kind === 'hunt' && this.state === 'play') { this.clock -= h; if (this.clock <= 0) this.endHunt(false); }
      if (this.kind === 'balloons' && this.state === 'play') { const was = this.clock; this.clock -= h; if (was > 30 && this.clock <= 30) { this.notice = '30 SECONDS LEFT'; this.noticeLeft = 2; } if (this.clock <= 0) this.checkBalloons(true); }
      if (this.kind === 'race' && this.finishLeft !== undefined && this.state === 'play') { this.finishLeft -= h; if (this.finishLeft <= 0) this.endRace(); }
    }
  }
  simulate(h) {
    this.simTime += h; const K = CONFIG.chair, it = MINI.item;
    for (const c of this.chairs) {
      if (c.out) { c.binLeft = 1e9; continue; }
      for (const k of ['boostLeft', 'oilLeft', 'stunLeft', 'safeLeft', 'freezeLeft']) c[k] = Math.max(0, (c[k] || 0) - h);
      let cmd = c.player ? this.humanCommand(c.player) : miniAI(c, this, h);
      if (c.finish) cmd = { x: Math.cos(c.heading) * 0.3, y: Math.sin(c.heading) * 0.3, speed: 0.4 };          // finished the race: cruise
      cmd = this.miniCmd(c, cmd);
      if (c.stunLeft > 0) c.heading += 9 * h;                                                     // zapped: spinning out
      c.update(h, cmd, Settings.turnSpeed * (c.player ? 1 : this.difficulty.turnBoost || 1));
      if (c.wantUse) { c.wantUse = false; this.useItem(c); }
    }
    const live = this.chairs.filter(c => !c.out);
    for (const c of live) this.chairObstacles(c);
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) this.chairHit(live[i], live[j]);
    for (const c of live) this.chairObstacles(c);
    if (this.mini.items) this.stepItems(h, live);
    if (this.kind === 'race') this.stepRace(live);
    if (this.kind === 'balloons') this.checkBalloons();
    if (this.kind === 'hunt') this.checkHunt();
    this.focusOn();
  }
  /* Effects on what a cart's stick asks for: zapped (no control), oil (steering mirrored), boost (faster), IT in manhunt (a touch faster). Also used by an online client's prediction. */
  miniCmd(c, cmd) {
    c.speedMul = (c.boostLeft > 0 ? MINI.item.boostMul : 1) * (this.kind === 'hunt' && c.side === 1 ? MINI.hunt.hunterSpeed : 1);
    if (c.stunLeft > 0 || c.freezeLeft > 0) return { x: 0, y: 0, spin: 0, speed: 0 };
    if (c.oilLeft > 0 && (cmd.x || cmd.y)) { const a = Math.atan2(cmd.y, cmd.x), m = Math.hypot(cmd.x, cmd.y), na = c.heading - normalizeAngle(a - c.heading); cmd = { ...cmd, x: Math.cos(na) * m, y: Math.sin(na) * m }; }
    return cmd;
  }
  /* Carts bump; in Balloon Bash a front-to-back hit pops a balloon; in Manhunt any touch by IT catches. No fouls. */
  chairHit(a, b) {
    const R = CONFIG.chair.radius, d = Math.hypot(b.x - a.x, b.y - a.y);
    if (this.kind === 'hunt' && a.side !== b.side && d < 2 * R + MINI.hunt.catchGap) { const hunter = a.side === 1 ? a : b, runner = hunter === a ? b : a; if (runner.safeLeft <= 0 && hunter.stunLeft <= 0 && !(hunter.freezeLeft > 0)) this.caught(runner, hunter); }
    if (this.kind === 'balloons') for (const [att, vic] of [[a, b], [b, a]]) this.tryPop(att, vic);
    if (d >= 2 * R || d === 0) return;
    const closing = Physics.circles(a, R, CONFIG.chair.mass, b, R, CONFIG.chair.mass, CONFIG.chair.chairBounce); crashSlow(a, b, closing);
    if (closing > CONFIG.foul.bumpSoundSpeed) this.sfx('bump');
  }
  enemies(a, b) { return a !== b && !a.out && !b.out && (this.mini.mode !== 'teams' || a.side !== b.side); }
  tryPop(att, vic) {
    const B = MINI.balloons; if (!this.enemies(att, vic) || vic.safeLeft > 0 || att.stunLeft > 0) return;
    const f = att.toWorld(B.front, 0), r = vic.toWorld(B.rear, 0); if (Math.hypot(f.x - r.x, f.y - r.y) > B.reach) return;
    const nx = r.x - f.x, ny = r.y - f.y, d = Math.hypot(nx, ny) || 1, closing = ((att.vx - vic.vx) * nx + (att.vy - vic.vy) * ny) / d;
    if (closing < B.minClosing && Math.hypot(att.vx, att.vy) < 1) return;                       // a real hit, not a nudge
    this.pop(vic, att, true);
  }
  pop(vic, by, reset) {
    vic.balloons--; vic.safeLeft = MINI.balloons.safeSeconds; if (by) by.pops++; this.sfx('bump'); this.sfx('foul');
    if (vic.balloons <= 0) {
      vic.out = true; vic.binLeft = 1e9; this.order.push(vic); this.notice = `${this.name(vic).toUpperCase()} IS OUT`; this.noticeLeft = 2.5;
      this.line(by ? `${this.name(by)} pops the last balloon. ${this.name(vic)} is out!` : `${this.name(vic)} is out!`);
    } else {
      this.notice = `POP!  ${this.name(vic).toUpperCase()}: ${vic.balloons} LEFT`; this.noticeLeft = 1.8;
      if (Math.random() < 0.5) this.line(`${by ? this.name(by) + ' gets ' : ''}${this.name(vic)}. ${vic.balloons} balloon${vic.balloons > 1 ? 's' : ''} left.`);
      if (reset) this.respawn(vic);
    }
  }
  respawn(c) {                                                          // the safest spot on the court: furthest from every other cart
    let best = null;
    for (let i = 0; i < 24; i++) {
      const x = 2 + Math.random() * (this.width - 4), y = 2 + Math.random() * (this.height - 4);
      const near = Math.min(...this.chairs.filter(k => k !== c && !k.out).map(k => Math.hypot(k.x - x, k.y - y)), 99);
      if (!best || near > best.near) best = { x, y, near };
    }
    Object.assign(c, { x: best.x, y: best.y, px: best.x, py: best.y, vx: 0, vy: 0, heading: Math.atan2(this.centerY - best.y, this.width / 2 - best.x) }); c.ph = c.heading;
  }
  checkBalloons(timeUp) {                                             // last one (or last team) with balloons wins; when the clock runs out, the most balloons left (then the most pops)
    const alive = this.chairs.filter(c => !c.out), teams = this.mini.mode === 'teams';
    const done = timeUp || (teams ? new Set(alive.map(c => c.side)).size <= 1 : alive.length <= 1);
    if (!done || this.state !== 'play') return;
    const ranking = [...alive.sort((a, b) => (b.balloons - a.balloons) || (b.pops - a.pops)), ...this.order.slice().reverse()];
    const sum = s => alive.filter(c => c.side === s).reduce((a, c) => a + c.balloons, 0), tSide = teams && alive.length ? (sum(0) === sum(1) ? -1 : sum(0) > sum(1) ? 0 : 1) : -1;
    const tied = !teams && ranking.length > 1 && !ranking[1].out && ranking[0].balloons === ranking[1].balloons && ranking[0].pops === ranking[1].pops;
    const title = teams ? (tSide >= 0 ? `${TEAMS[this.teams[tSide]].name.toUpperCase()} WIN!` : alive.length ? "IT'S A DRAW" : 'NOBODY WINS') : alive.length && !tied ? `${this.name(ranking[0]).toUpperCase()} WINS!` : alive.length ? "IT'S A DRAW" : 'NOBODY WINS';
    this.finishGame(title, ranking.map(c => ({ c, text: c.out ? `out, ${c.pops} pop${c.pops === 1 ? '' : 's'}` : `${c.balloons} balloon${c.balloons === 1 ? '' : 's'} left, ${c.pops} pop${c.pops === 1 ? '' : 's'}` })), tSide, timeUp ? 'Time up: the most balloons left wins' : '');
  }
  caught(runner, hunter) {
    runner.side = 1; if (runner.player) runner.player.side = 1; runner.safeLeft = MINI.hunt.safeSeconds; runner.freezeLeft = MINI.hunt.freezeSeconds; hunter.freezeLeft = MINI.hunt.hunterPause; hunter.catches++; this.order.push(runner); this.sideChanged = (this.sideChanged || 0) + 1;
    this.notice = `${this.name(hunter).toUpperCase()} CATCHES ${this.name(runner).toUpperCase()}`; this.noticeLeft = 2; this.sfx('bump'); this.sfx('whistle');
    this.line(`${this.name(runner)} is caught. ${this.name(runner)} is it now!`);
  }
  checkHunt() { if (this.state === 'play' && !this.chairs.some(c => c.side === 0)) this.endHunt(true); }
  endHunt(allCaught) {
    const free = this.chairs.filter(c => c.side === 0), last = this.order[this.order.length - 1];
    const ranking = allCaught ? [...this.order.slice().reverse(), ...this.chairs.filter(c => !this.order.includes(c)).sort((a, b) => b.catches - a.catches)] : [...free, ...this.order.slice().reverse(), ...this.chairs.filter(c => c.side === 1 && !this.order.includes(c))];
    this.finishGame(allCaught ? 'EVERYONE WAS CAUGHT' : free.length === 1 ? `${this.name(free[0]).toUpperCase()} SURVIVES!` : `${free.length} SURVIVORS WIN!`,
      ranking.map(c => ({ c, text: c.side === 0 ? 'never caught' : this.order.includes(c) ? `caught (#${this.order.indexOf(c) + 1})${c.catches ? ', ' + c.catches + ' catch' + (c.catches > 1 ? 'es' : '') : ''}` : `started as IT, ${c.catches} catch${c.catches === 1 ? '' : 'es'}` })), -1,
      allCaught && last ? `Last one caught: ${this.name(last)}` : '');
  }

  /* ----- racing: laps from progress along the racing line ----- */
  stepRace(live) {
    const N = this.rline.length;
    for (const c of live) {
      const i = this.nearestI(c.x, c.y, c.lastI); let d = i - c.lastI; if (d > N / 2) d -= N; if (d < -N / 2) d += N; c.prog += d; c.lastI = i;
      const lap = Math.floor(c.prog / N);
      if (lap > c.lap && !c.finish) {
        c.lap = lap;
        if (lap >= this.mini.laps) { c.finish = this.simTime; this.order.push(c); const pos = this.order.length; this.notice = `${this.name(c).toUpperCase()} FINISHES ${ordinal(pos).toUpperCase()}`; this.noticeLeft = 2.5; this.sfx(pos === 1 ? 'goal' : 'whistle'); if (pos === 1) { this.line(`${this.name(c)} wins the race!`); this.finishLeft = MINI.race.finishGrace; } }
        else { if (c.player) { this.notice = lap === this.mini.laps - 1 ? `${this.name(c).toUpperCase()}: LAST LAP` : `${this.name(c).toUpperCase()}: LAP ${lap + 1} OF ${this.mini.laps}`; this.noticeLeft = 1.6; } if (lap === this.mini.laps - 1 && this.racePlace(c) === 1) this.line(`Last lap, and ${this.name(c)} leads!`); }
      }
    }
    const people = this.chairs.filter(c => c.player);
    if (this.order.length && (this.order.length === this.chairs.length || (people.length && people.every(c => c.finish)))) this.endRace();
    const lead = this.raceOrder()[0]; if (lead && lead !== this.leader && this.simTime > 3 && !lead.finish) { if (this.leader && Math.random() < 0.6) this.line(`${this.name(lead)} takes the lead.`); this.leader = lead; }
  }
  raceOrder() { return [...this.order, ...this.chairs.filter(c => !c.finish).sort((a, b) => b.prog - a.prog)]; }
  racePlace(c) { return this.raceOrder().indexOf(c) + 1; }
  endRace() {
    if (this.state !== 'play') return; const order = this.raceOrder(), win = order[0], fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
    this.finishGame(win ? `${this.name(win).toUpperCase()} WINS!` : 'RACE OVER', order.map(c => ({ c, text: c.finish ? fmt(c.finish - this.startAt()) : `lap ${Math.min(this.mini.laps, c.lap + 1)} of ${this.mini.laps} (did not finish)` })));
  }
  startAt() { return 0; }                                             // simTime only runs during play, so it is already the race time
  finishGame(title, rows, winSide = -1, sub = '') {
    this.state = 'over'; this.result = { title, sub, winSide, rows: rows.map((r, i) => ({ name: this.name(r.c), side: r.c.side, k: r.c.k, text: r.text, place: i + 1 })) };
    this.score = winSide >= 0 ? [winSide === 0 ? 1 : 0, winSide === 1 ? 1 : 0] : [0, 0]; this.sfx('goal'); this.line(title.charAt(0) + title.slice(1).toLowerCase());
  }

  /* ----- power-ups ----- */
  stepItems(h, live) {
    const I = MINI.item;
    if ((this.boxIn -= h) <= 0) { this.boxIn = I.boxEvery[0] + Math.random() * (I.boxEvery[1] - I.boxEvery[0]); if (this.boxes.length < I.boxMax) { const p = this.boxSpot(); if (p) this.boxes.push({ id: ++this.idN, ...p }); } }
    for (const c of live) {                                             // drive over a box: a random item (if your hands are free)
      if (c.item) continue; const k = this.boxes.findIndex(b => Math.hypot(b.x - c.x, b.y - c.y) < I.boxRadius + CONFIG.chair.radius);
      if (k >= 0) { this.boxes.splice(k, 1); c.item = ['boost', 'zap', 'oil'][Math.floor(Math.random() * 3)]; if (c.player) this.sfx('select', c.player.id || 0); }
    }
    for (const z of this.zaps) {                                        // shots fly straight until they hit a cart, a wall or run out
      z.x += z.vx * h; z.y += z.vy * h; z.life -= h;
      if (z.x < 0 || z.y < 0 || z.x > this.width || z.y > this.height || this.islandPush({ x: z.x, y: z.y }, I.zapRadius, 0)) z.life = 0;
      for (const c of live) if (c !== z.from && z.life > 0 && Math.hypot(c.x - z.x, c.y - z.y) < CONFIG.chair.radius + I.zapRadius && !(this.kind === 'balloons' && !this.enemies(z.from, c)) && !(this.kind === 'hunt' && c.side === z.from.side)) { z.life = 0; this.zapped(c, z.from); }
    }
    this.zaps = this.zaps.filter(z => z.life > 0);
    for (const s of this.slicks) {
      s.life -= h; s.grace -= h;
      for (const c of live) if (s.life > 0 && Math.hypot(c.x - s.x, c.y - s.y) < I.oilRadius + CONFIG.chair.radius * 0.5 && !(c === s.from && s.grace > 0)) { s.life = 0; c.oilLeft = I.reverseSeconds; this.notice = `${this.name(c).toUpperCase()} HITS THE OIL: STEERING REVERSED`; this.noticeLeft = 1.8; this.sfx('screech'); if (Math.random() < 0.5) this.line(`${this.name(c)} is all over the place!`); }
    }
    this.slicks = this.slicks.filter(s => s.life > 0);
  }
  boxSpot() {
    for (let t = 0; t < 20; t++) {
      let p;
      if (this.kind === 'race') { const q = this.rline[Math.floor(Math.random() * this.rline.length)], side = (Math.random() - 0.5) * 2.4; const n = this.rline[(this.rline.indexOf(q) + 1) % this.rline.length], dx = n.x - q.x, dy = n.y - q.y, l = Math.hypot(dx, dy) || 1; p = { x: q.x - dy / l * side, y: q.y + dx / l * side }; }
      else p = { x: 2 + Math.random() * (this.width - 4), y: 2 + Math.random() * (this.height - 4) };
      if (this.chairs.every(c => c.out || Math.hypot(c.x - p.x, c.y - p.y) > 2.5) && this.boxes.every(b => Math.hypot(b.x - p.x, b.y - p.y) > 3)) return p;
    }
    return null;
  }
  useItem(c) {
    const I = MINI.item, it = c.item; if (!it || c.out || this.state !== 'play') return; c.item = '';
    if (it === 'boost') { c.boostLeft = I.boostSeconds; this.sfx('screech'); }
    else if (it === 'zap') { const f = c.toWorld(0.8, 0), hx = Math.cos(c.heading), hy = Math.sin(c.heading); this.zaps.push({ id: ++this.idN, x: f.x, y: f.y, vx: hx * I.zapSpeed + c.vx * 0.5, vy: hy * I.zapSpeed + c.vy * 0.5, life: I.zapLife, from: c }); this.sfx('whistle'); }
    else if (it === 'oil') { const b = c.toWorld(-1.05, 0); this.slicks.push({ id: ++this.idN, x: b.x, y: b.y, life: I.oilLife, grace: I.oilGrace, from: c }); this.sfx('bump'); }
  }
  zapped(c, by) {
    if (this.kind === 'balloons') { if (c.safeLeft <= 0) this.pop(c, by, false); }
    else { c.stunLeft = MINI.item.stunSeconds; this.notice = `${this.name(by).toUpperCase()} ZAPS ${this.name(c).toUpperCase()}`; this.noticeLeft = 1.6; this.sfx('foul'); }
  }
  /* A person presses A / X (also called for an online player by the host). */
  useBy(p) { if (p && p.chair) p.chair.wantUse = true; }

  /* ----- the scoreboard ----- */
  hud() {
    const t = Math.max(0, Math.ceil(this.clock)), clock = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, people = this.chairs.filter(c => c.player);
    if (this.kind === 'race') {
      const lead = this.raceOrder()[0], me = people[0];
      return { clock: me ? `LAP ${Math.min(this.mini.laps, me.lap + 1)} / ${this.mini.laps}` : `${this.mini.laps} LAPS`, a: me ? `${this.name(me).toUpperCase()}: ${ordinal(this.racePlace(me)).toUpperCase()}` : 'RACE', b: lead ? `LEADER ${this.name(lead).toUpperCase()}` : '', sa: '', sb: '',
        left: people.slice(0, 3).map(c => `${c.player.name || c.player.tag} ${ordinal(this.racePlace(c))}${c.finish ? ' (finished)' : ''}`).join('   '), mid: '', right: this.finishLeft !== undefined && this.state === 'play' ? `FINISH CLOSES IN ${Math.ceil(this.finishLeft)}s` : '' };
    }
    if (this.kind === 'hunt') {
      const it = this.chairs.filter(c => c.side === 1).length, free = this.chairs.length - it;
      return { clock, a: 'RUNNERS', b: 'IT', sa: String(free), sb: String(it), left: people.filter(c => c.side === 0).map(c => (c.player.name || c.player.tag) + ' free').join('   '), mid: 'MANHUNT', right: people.filter(c => c.side === 1).map(c => (c.player.name || c.player.tag) + ' is IT').join('   ') };
    }
    const alive = this.chairs.filter(c => !c.out);
    if (this.mini.mode === 'teams') { const n = s => alive.filter(c => c.side === s).reduce((a, c) => a + c.balloons, 0); return { clock, a: TEAMS[this.teams[0]].name.toUpperCase(), b: TEAMS[this.teams[1]].name.toUpperCase(), sa: String(n(0)), sb: String(n(1)), left: '', mid: `${alive.filter(c => c.side === 0).length} v ${alive.filter(c => c.side === 1).length} carts`, right: '' }; }
    return { clock, a: 'FREE FOR ALL', b: `${alive.length} LEFT`, sa: '', sb: '', left: people.slice(0, 3).map(c => `${c.player.name || c.player.tag} ${'🎈'.repeat(Math.max(0, c.balloons))}${c.out ? ' OUT' : ''}`).join('   '), mid: '', right: '' };
  }

  /* ----- online: the extra state, compactly ----- */
  miniSnap() {
    const r = v => Math.round(v * 100) / 100;
    return { c: this.chairs.map(c => [c.side, c.balloons, c.out ? 1 : 0, c.item, r(c.boostLeft), r(c.oilLeft), r(c.stunLeft), r(c.safeLeft), c.lap, Math.round(c.prog), c.finish ? 1 : 0, c.pops, c.catches, r(c.freezeLeft || 0)]),
      bx: this.boxes.map(b => [b.id, r(b.x), r(b.y)]), z: this.zaps.map(z => [z.id, r(z.x), r(z.y)]), o: this.slicks.map(s => [s.id, r(s.x), r(s.y)]), ck: r(this.clock), fl: this.finishLeft === undefined ? -1 : r(this.finishLeft), res: this.result, ord: this.order.map(c => c.k) };
  }
  miniApply(s) {
    if (!s) return;
    s.c.forEach((row, i) => { const c = this.chairs[i]; if (!c) return; if (c.side !== row[0]) { c.side = row[0]; if (c.player) c.player.side = row[0]; this.sideChanged = (this.sideChanged || 0) + 1; } [, c.balloons, , c.item, c.boostLeft, c.oilLeft, c.stunLeft, c.safeLeft, c.lap, c.prog, , c.pops, c.catches, c.freezeLeft] = row; c.out = !!row[2]; c.finish = row[10] ? 1 : 0; });
    this.boxes = s.bx.map(([id, x, y]) => ({ id, x, y })); this.zaps = s.z.map(([id, x, y]) => ({ id, x, y })); this.slicks = s.o.map(([id, x, y]) => ({ id, x, y }));
    this.clock = s.ck; this.finishLeft = s.fl < 0 ? undefined : s.fl; this.result = s.res; this.order = (s.ord || []).map(k => this.chairs[k]).filter(Boolean);
  }
}

/* ----- the CPU in the minigames ----- */
function miniAI(c, m, h) {
  const D = m.difficulty || {}, speed = D.speed || 0.9;
  c.aiNext = (c.aiNext || 0) - h;
  if (c.aiNext > 0 && c.aiCmd) return { ...c.aiCmd, spin: 0 };
  c.aiNext = 0.05 + (D.reaction || 0.15) * 0.5;
  const to = (x, y, s = speed) => { const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy) || 1; return { x: dx / d, y: dy / d, speed: s }; };
  const ahead = (o, cone = 0.9) => { const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy) || 1; return (dx * Math.cos(c.heading) + dy * Math.sin(c.heading)) / d > cone ? d : Infinity; };
  const behind = o => { const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy) || 1; return (dx * Math.cos(c.heading) + dy * Math.sin(c.heading)) / d < -0.6 ? d : Infinity; };
  const others = m.chairs.filter(o => o !== c && !o.out), use = () => { if (Math.random() < 0.7) c.wantUse = true; };
  let cmd = { x: 0, y: 0, speed };
  if (m.kind === 'race') {
    const N = m.rline.length, i = m.nearestI(c.x, c.y, c.lastI), look = m.map ? 11 : Math.round(N * 0.045), p = m.rline[(i + look) % N], q = m.rline[(i + look + 1) % N];
    let lane = ((c.k % 3) - 1) * 0.9;
    if (m.obs) {                                                        // a map: steer round the next solid obstacle (and through sliders / sweepers as best it can)
      const next = m.obs.filter(o => o.type !== 'pad' && o.type !== 'sweeper' && ((o.i - i + N) % N) < 34).sort((a, b) => ((a.i - i + N) % N) - ((b.i - i + N) % N))[0];
      if (next) { const off = next.type === 'slider' ? -Math.sin(m.simTime * next.speed + next.phase) * next.amp : next.off; lane = (off > 0 ? -1 : 1) * Math.min(m.hw - 1.1, Math.abs(off) < 0.5 ? m.hw * 0.55 : 1.6 + next.r); }
      else { const pad = m.obs.find(o => o.type === 'pad' && ((o.i - i + N) % N) < 30); if (pad) lane = 0; }
    }
    const dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1; cmd = to(p.x - dy / l * lane, p.y + dx / l * lane);
    if (c.item === 'boost') { const far = m.rline[(i + look * 3) % N]; if (Math.abs(normalizeAngle(Math.atan2(far.y - c.y, far.x - c.x) - c.heading)) < 0.25) use(); }
    if (c.item === 'zap' && others.some(o => ahead(o, 0.96) < 9)) use();
    if (c.item === 'oil' && others.some(o => behind(o) < 5)) use();
  } else if (m.kind === 'balloons') {
    const foes = others.filter(o => m.enemies(c, o)), B = MINI.balloons;
    const threat = foes.find(o => { const f = o.toWorld(B.front, 0), r = c.toWorld(B.rear, 0), d = Math.hypot(f.x - r.x, f.y - r.y); return d < 2.6 && Math.hypot(o.vx, o.vy) > 1; });
    const prey = foes.filter(o => o.safeLeft <= 0).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
    if (threat && c.safeLeft <= 0 && Math.random() < (D.pressure || 0.6)) { const ax = c.x - threat.x, ay = c.y - threat.y, s = c.k % 2 ? 1 : -1; cmd = to(c.x + ax - ay * s * 1.5, c.y + ay + ax * s * 1.5); }   // swerve away
    else if (prey) {
      const r = prey.toWorld(B.rear - 0.4, 0), lead = 0.3 + (D.lead || 0.2), tx = r.x + prey.vx * lead, ty = r.y + prey.vy * lead;
      const behindPrey = (c.x - prey.x) * Math.cos(prey.heading) + (c.y - prey.y) * Math.sin(prey.heading) < 0;   // already behind them: charge; otherwise loop round
      cmd = behindPrey || Math.hypot(tx - c.x, ty - c.y) < 1.4 ? to(tx, ty) : to(tx - Math.cos(prey.heading) * 1.6, ty - Math.sin(prey.heading) * 1.6);
      if (c.preyK === prey.k) c.chaseT = (c.chaseT || 0) + c.aiNext; else { c.preyK = prey.k; c.chaseT = 0; }
      if (c.chaseT > 4 && Math.random() < 0.08) { c.chaseT = 0; const side = normalizeAngle(Math.atan2(prey.y - c.y, prey.x - c.x) - c.heading); cmd.spin = side > 0 ? 1 : -1; }   // going round in circles: whip round
      if (c.item === 'boost' && ahead(prey, 0.85) < 7) use(); if (c.item === 'zap' && ahead(prey, 0.97) < 9) use();
    } else cmd = to(m.width / 2 + Math.sin(m.simTime + c.k) * 5, m.centerY + Math.cos(m.simTime * 0.7 + c.k) * 3, speed * 0.6);
    if (c.item === 'oil' && foes.some(o => behind(o) < 4)) use();
  } else if (m.kind === 'hunt') {
    if (c.side === 1) {                                                 // IT: chase the nearest free cart, aiming where it is going
      const prey = others.filter(o => o.side === 0).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
      c.aiNext += (D.reaction || 0.15) * 0.8;                          // IT reacts a little slower than it steers (so a good swerve can shake it off)
      if (prey) { const d = Math.hypot(prey.x - c.x, prey.y - c.y), lead = Math.min(0.8, d / 8) * (0.3 + (D.lead || 0.2)); cmd = to(prey.x + prey.vx * lead, prey.y + prey.vy * lead); if (c.item === 'boost' && ahead(prey, 0.85) < 6) use(); if (c.item === 'zap' && ahead(prey, 0.96) < 8) use(); }
    } else if (others.some(o => o.side === 1 && Math.hypot(o.x - c.x, o.y - c.y) > 2.6)) {   // running: circle the rink the way that keeps furthest from IT
      const L = m.huntLoop || (m.huntLoop = (() => { const pts = [], ins = 3.1, W = m.width, H = m.height, R = 3; for (let i = 0; i < 96; i++) { const t = i / 96 * Math.PI * 2, ex = (W / 2 - ins), ey = (H / 2 - ins), cx = Math.cos(t), cy = Math.sin(t), k = 1 / Math.pow(Math.pow(Math.abs(cx), 4) + Math.pow(Math.abs(cy), 4), 0.25); pts.push({ x: W / 2 + cx * ex * k, y: H / 2 + cy * ey * k }); } return pts; })());
      const N = L.length, near = (x, y) => { let b = 0, bd = Infinity; L.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; b = i; } }); return b; }, i = near(c.x, c.y);
      const hunters = others.filter(o => o.side === 1), safety = dir => Math.min(...hunters.map(o => Math.hypot(L[(i + dir * 10 + N) % N].x - o.x, L[(i + dir * 10 + N) % N].y - o.y)));
      const a1 = safety(1), a2 = safety(-1); if (!c.loopDir || (c.loopDir === 1 ? a2 > a1 + 1.5 : a1 > a2 + 1.5)) c.loopDir = a1 >= a2 ? 1 : -1;
      const tp = L[(i + c.loopDir * 6 + N) % N]; cmd = to(tp.x, tp.y, speed);
      if (c.item === 'boost' && Math.min(a1, a2) < 4) use(); if (c.item === 'oil' && hunters.some(o => behind(o) < 4)) use();
    } else {                                                            // IT is right here: swerve away from it (and off the walls)
      let fx = 0, fy = 0; const W = m.width, H = m.height;
      for (const o of others.filter(o => o.side === 1)) { const dx = c.x - o.x, dy = c.y - o.y, d = Math.max(0.7, Math.hypot(dx, dy)); fx += dx / d / d; fy += dy / d / d; }   // away from IT (the nearer, the stronger)
      const fl = Math.hypot(fx, fy) || 1; fx /= fl; fy /= fl;                                                  // a direction; walls only bend it when they are close
      const wall = d => d < 2.2 ? (2.2 - d) / 2.2 * 1.6 : 0; fx += wall(c.x) - wall(W - c.x); fy += wall(c.y) - wall(H - c.y);
      const hunters = others.filter(o => o.side === 1), hn = hunters.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0], near = hn ? Math.hypot(hn.x - c.x, hn.y - c.y) : 99;
      if (hn && near < 4.5) {                                           // IT is close: swerve across its path, towards the more open side, rather than backing into a wall
        const ax = (c.x - hn.x) / near, ay = (c.y - hn.y) / near, open = (W / 2 - c.x) * -ay + (H / 2 - c.y) * ax, s1 = open >= 0 ? 1 : -1;
        const k = Math.min(1, (4.5 - near) / 3); fx = fx * 0.4 + (ax * (1 - k) - ay * s1 * k) * 2; fy = fy * 0.4 + (ay * (1 - k) + ax * s1 * k) * 2;
      }
      cmd = (fx || fy) ? to(c.x + fx, c.y + fy, near < 9 ? speed : speed * 0.75) : cmd;
      if (c.item === 'oil' && others.some(o => o.side === 1 && behind(o) < 4)) use(); if (c.item === 'boost' && near < 3) use(); if (c.item === 'zap' && others.some(o => o.side === 1 && ahead(o, 0.95) < 7)) use();
    }
  }
  c.aiCmd = { ...cmd, spin: 0 }; return cmd;
}
