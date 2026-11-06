/* The rules and simulation of one match. No drawing happens here, so it is easy to test or extend.
   Side 0 defends the left net and attacks right; side 1 is the opposite. */
// The crease: the rounded area in front of each net (an arc from post to post). A cart may not enter the crease of the net it is attacking.
const Z0 = () => CONFIG.crease.wing || 0;                           // the crease reaches this far past each post
function creaseShape(net) {
  const Z = CONFIG.crease, half = CONFIG.net.width / 2 + Z0(), R = (half * half + Z.bulge * Z.bulge) / (2 * Z.bulge), dir = net.end === 0 ? 1 : -1;
  return { cx: net.mouthX + dir * (Z.bulge - R), cy: CONFIG.court.height / 2, R, dir, mouthX: net.mouthX, half };
}
function inCrease(shape, x, y, pad = 0) {                         // pad grows the crease outwards (the AI keeps its whole cart clear)
  return shape.dir * (x - shape.mouthX) > -pad && Math.hypot(x - shape.cx, y - shape.cy) < shape.R + pad && Math.abs(y - shape.cy) < shape.half + pad;
}
function buildNets() {
  const W = CONFIG.court.width, cy = CONFIG.court.height / 2, N = CONFIG.net, y1 = cy - N.width / 2, y2 = cy + N.width / 2;
  return [0, 1].map(end => {
    const mouthX = end ? W - N.mouthX : N.mouthX, backX = end ? mouthX + N.depth : mouthX - N.depth;
    return { end, mouthX, backX, y1, y2, segments: [
      { x1: backX, y1, x2: backX, y2 },                         // back
      { x1: backX, y1, x2: mouthX, y2: y1 },                    // sides
      { x1: backX, y1: y2, x2: mouthX, y2 },
      { x1: mouthX, y1, x2: mouthX, y2, chairOnly: true }       // invisible: keeps chairs out of the net, ball passes
    ] };
  });
}

/* Two carts that hit (or keep pushing against) each other both slow down. */
function crashSlow(a, b, closing) {
  const C = CONFIG.crash, k = closing > C.minClosing ? C.keep : Math.exp(-C.touchPerSecond / CONFIG.physics.hz);
  a.vx *= k; a.vy *= k; b.vx *= k; b.vy *= k;
}
class Match {
  constructor({ teamA, teamB, players, difficulty, sizes, practice, remote, periodSeconds, diffBySide }) {
    const C = CONFIG;
    this.sizes = sizes || [CONFIG.match.chairsPerTeam, CONFIG.match.chairsPerTeam]; this.practice = !!practice; this.remote = !!remote; this.sfxQueue = null;   // remote: an online client's copy, filled from host snapshots instead of simulated   // practice: no clock, any team sizes
    this.teams = [teamA, teamB]; this.players = players; for (const p of players) p.speedLevel = Math.min(p.speedLevel, Settings.speedCap); // nobody starts above the lock
    this.difficulty = C.difficulties[difficulty]; if (diffBySide) this.diffBySide = diffBySide.map(n => C.difficulties[n] || this.difficulty);   // Season mode: each team plays at its own skill
    this.width = C.court.width; this.height = C.court.height; this.centerY = this.height / 2;
    this.nets = buildNets(); this.creases = this.nets.map(creaseShape); this.chairs = [];
    for (let s = 0; s < 2; s++) for (let i = 0; i < this.sizes[s]; i++) { const c = new Chair(s, i); c.onSpin = () => this.sfx('screech', c.player ? c.player.id : 0); this.chairs.push(c); }
    this.ball = { x: 0, y: 0, vx: 0, vy: 0 };
    this.score = [0, 0]; this.shots = [0, 0]; this.ballIn = [false, false]; this.lastTouch = -1; this.press = [false, false]; this.period = 1; this.periodSeconds = periodSeconds || C.match.periodSeconds; this.clock = this.periodSeconds; this.overtime = false;
    this.state = 'countdown'; this.timer = 0; this.lastCount = 0; this.banner = ''; this.bannerLeft = 0; this.notice = ''; this.noticeLeft = 0; this.simTime = 0; this.brains = []; this.trapTime = 0; this.accumulator = 0;   // notice = small top-of-screen messages (fouls)
    for (const side of [0, 1]) {                    // humans take the field spots first, the guard spot last
      const order = [...Array(this.sizes[side]).keys()].slice(1).concat(0);
      this.players.filter(p => p.side === side).forEach((p, i) => { const chair = this.chairs.find(c => c.side === side && c.index === order[i]); if (chair) this.assign(p, chair); });
    }
    this.kickoff();
  }
  // Gameplay sounds go through here so an online host can also send them to the other players. UI sounds call Sound.play directly.
  sfx(name, playerId = 0) { Sound.play(name); if (this.sfxQueue) this.sfxQueue.push([name, playerId]); }
  addPlayer(p) {                                    // a person joins mid-match: they take over the free cart on their side that is nearest the ball
    const free = this.chairs.filter(c => c.side === p.side && !c.player && !c.benched);
    if (!free.length) return false;
    if (!this.players.includes(p)) this.players.push(p);
    p.speedLevel = Math.min(p.speedLevel, Settings.speedCap); p.spinQueued = 0;
    const d = c => Math.hypot(c.x - this.ball.x, c.y - this.ball.y), fieldFirst = free.filter(c => c.role !== 'goalie');
    const pool = fieldFirst.length ? fieldFirst : free; this.assign(p, pool.reduce((a, c) => (d(c) < d(a) ? c : a))); return true;
  }
  togglePress(side) {                               // X: this team's goalie joins the attack when the ball is in the foe's end (a full man press); X again puts the goalie back
    this.press[side] = !this.press[side];
    this.notice = `${TEAMS[this.teams[side]].name.toUpperCase()}: FULL PRESS ${this.press[side] ? 'ON' : 'OFF'}`; this.noticeLeft = 2; Sound.play('select');
  }
  strength() { return [0, 1].map(s => this.chairs.filter(c => c.side === s && !c.benched).length); }   // carts on the court per side (for the power-play display)
  removePlayer(p) { if (p.chair) { p.chair.player = null; p.chair = null; } this.players = this.players.filter(q => q !== p); }   // a CPU takes over the cart
  /* ----- commentary: short play-by-play lines. 'heard' is read by the screen (caption + voice); the host also sends them to clients. pri 2 always plays, pri 1 only if it has been quiet a moment. ----- */
  name(c) { return c ? (c.player && c.player.name ? c.player.name : `${TEAMS[this.teams[c.side]].name} number ${c.index + 1}`) : 'somebody'; }
  W(c, key) { return { [key]: c ? this.name(c) : '', [key + 'T']: c ? TEAMS[this.teams[c.side]].name : '', [key + 'N']: c ? c.index + 1 : 0 }; }
  V(x = {}) { const t = TEAMS[this.teams[0]].name, u = TEAMS[this.teams[1]].name; return { team: t, opp: u, a: this.score[0], o: this.score[1], sa: this.shots[0], sb: this.shots[1], p: this.period, ...x }; }
  call(key, vars, pri = 1) {
    if (this.remote) return;
    if (pri < 2 && this.simTime - (this.lastCallAt === undefined ? -99 : this.lastCallAt) < 3.5) return;
    const t = Commentary.pick(key, vars); if (!t) return;
    this.lastCallAt = this.simTime; this.hear(t); if (this.callQueue) this.callQueue.push(t);
  }
  hear(t) { if (!this.heard) this.heard = []; this.heard.push(t); if (this.heard.length > 6) this.heard.shift(); }
  say(text) { this.banner = text; this.bannerLeft = 2.5; }
  assign(player, chair) { if (player.chair) player.chair.player = null; player.chair = chair; chair.player = player; }

  /* ----- player actions ----- */
  /* Y button: jump to a teammate's cart. The first press takes the free cart closest to the ball; keep tapping (within 2 s) and it walks outward through the rest of the team,
     goalie included, and finally back to the cart you started on. Wait a moment and the next press starts again from the ball. */
  switchChair(player) {
    if (Settings.lockCart || player.locked) { Sound.play('back'); return; }    // locked to one cart (everyone, or this player). Otherwise you may leave the sin bin for a free teammate's cart; the benched cart serves its time
    const free = c => c.side === player.side && !c.player && !c.benched, cyc = player.swCycle;
    if (!cyc || this.simTime - cyc.at > 2) {
      const d = c => Math.hypot(c.x - this.ball.x, c.y - this.ball.y);
      const order = this.chairs.filter(free).sort((a, b) => d(a) - d(b)); order.push(player.chair);       // everybody else nearest-first, then home again
      player.swCycle = { order, i: -1, at: 0 };
    }
    const cy = player.swCycle, n = cy.order.length;
    for (let k = 1; k <= n; k++) {
      const c = cy.order[(cy.i + k) % n];
      // (never cycle back into a cart that is sitting in the sin bin)
      if (c && c !== player.chair && (free(c) || (c === cy.order[n - 1] && !c.benched))) { cy.i = (cy.i + k) % n; cy.at = this.simTime; this.assign(player, c); Sound.play('select'); return; }
    }
    Sound.play('back');
  }
  switchSide(player) {                              // pause menu: move to the other team if it has a free cart
    const side = 1 - player.side, free = this.chairs.filter(c => c.side === side && !c.player && !c.benched);
    if (!free.length) return false;
    const d = c => Math.hypot(c.x - this.ball.x, c.y - this.ball.y);
    player.side = side; this.assign(player, free.reduce((a, c) => (d(c) < d(a) ? c : a))); return true;
  }

  /* ----- flow ----- */
  kickoff() {
    const F = CONFIG.formation, W = this.width, cy = this.centerY, carry = Settings.penalties && Settings.penaltyCarry && this.state !== undefined, freed = this.scoredOn; this.scoredOn = undefined;
    const keep = new Map(); if (carry) for (const c of this.chairs) if (c.binLeft > 0 && c.side !== freed) keep.set(c, c.binLeft);   /* penalties that carry over: still in the sin bin after the face-off (unless that team was just scored on) */
    for (const c of this.chairs) {
      const dir = c.side ? -1 : 1, base = c.side ? W : 0, size = this.sizes[c.side], guard = c.index === 0 && size > 1;
      const x = guard ? this.nets[c.side].mouthX + dir * F.guardStandoff : base + dir * F.fieldX;
      const field = size - (size > 1 ? 1 : 0), slot = c.index - (size > 1 ? 1 : 0), gap = field > 2 ? Math.min(F.fieldSpread, 8.4 / (field - 1)) : F.fieldSpread;   // field carts line up across the court, evenly spread
      const y = guard || field < 2 ? cy : cy + (slot - (field - 1) / 2) * gap * (field === 2 ? 2 : 1);
      Object.assign(c, { x, y, vx: 0, vy: 0, heading: c.side ? Math.PI : 0, omega: 0, binLeft: 0, spinLeft: 0, spinCooldown: 0, carrying: false, playing: true, advanced: false, stuckFor: 0, stallFor: 0, wallFor: 0, escapeLeft: 0, thinkIn: 0 });
    }
    for (const [c, left] of keep) { c.binLeft = left; c.x = c.y = -50; }
    Object.assign(this.ball, { x: W / 2, y: cy, vx: 0, vy: 0 }); this.lastTouch = -1; this.ballIn = [false, false];
    this.brains = []; for (const c of this.chairs) { c.role = null; c.plan = null; c.aiCmd = null; c.aiNext = 0; }   // CPUs start the next play fresh
    this.state = 'countdown'; this.timer = CONFIG.match.countdownSeconds; this.lastCount = 0;
  }
  decideOvertime() {                                // sudden death ran out of time: the team with more shots on net wins it (level on shots: a coin toss)
    const w = this.shots[0] !== this.shots[1] ? (this.shots[0] > this.shots[1] ? 0 : 1) : (Math.random() < 0.5 ? 0 : 1);
    this.call('shootout', this.V({ team: TEAMS[this.teams[w]].name }), 2); this.scoreGoal(w); this.say('OVERTIME OVER: ' + TEAMS[this.teams[w]].name.toUpperCase() + ' WIN ON SHOTS'); this.bannerLeft = 3;
  }
  endPeriod() {
    if (this.period < CONFIG.match.periods) { this.period++; this.clock = this.periodSeconds; this.say('PERIOD ' + this.period); this.call('endperiod', this.V(), 2); this.call(!this.practice && this.period > CONFIG.match.periods / 2 && this.period - 1 <= CONFIG.match.periods / 2 ? 'switchEnds' : 'newperiod', this.V({ p: this.period }), 2); if (this.period > CONFIG.match.periods / 2 && this.period - 1 <= CONFIG.match.periods / 2) { this.notice = 'HALF TIME: TEAMS SWITCH ENDS\nTHE VIEW TURNS ROUND'; this.noticeLeft = 4; } this.kickoff(); }
    else if (this.score[0] === this.score[1]) { this.overtime = true; this.otLeft = CONFIG.match.overtimeSeconds; this.say('GOLDEN GOAL'); this.call('overtime', this.V(), 2); this.kickoff(); }
    else { this.state = 'over'; const w = this.score[0] > this.score[1] ? 0 : 1; this.call('final', this.V({ team: TEAMS[this.teams[w]].name, opp: TEAMS[this.teams[1 - w]].name, a: Math.max(...this.score), o: Math.min(...this.score) }), 2); }
  }
  scoreGoal(side) {
    if (this.state !== 'play') return;
    this.score[side]++; this.state = 'goal'; this.timer = CONFIG.match.goalPauseSeconds; this.scoredOn = 1 - side;   // (penalties carrying over: the team scored on is back to full strength)
    this.say('GOAL  ' + TEAMS[this.teams[side]].name.toUpperCase()); this.sfx('goal');
    const own = !(this.lastChair && this.lastChair.side === side), a = this.score[side], o = this.score[1 - side], who = own ? '' : this.name(this.lastChair), total = a + o;
    const key0 = this.scorers || (this.scorers = {}); if (!own) key0[who] = (key0[who] || 0) + 1; const cnt = own ? 0 : key0[who];
    const late = !this.practice && (this.overtime || (this.period === CONFIG.match.periods && this.clock < 30));
    const key = own ? 'own' : cnt === 3 ? 'goalHat' : cnt === 2 ? 'goalBrace' : late ? 'goalLate' : total === 1 ? 'goalFirst' : a === o ? 'goalTie' : a < o ? 'goalCut' : a - o === 1 ? 'goalLead' : 'goalExtend';
    this.shotAt = null; this.call(key, this.V({ ...this.W(own ? null : this.lastChair, 'who'), a, o, n: key === 'goalCut' ? (o - a === 1 ? 'one' : o - a) : cnt, tail: ` ${a} to ${o}.`, team: TEAMS[this.teams[side]].name, opp: TEAMS[this.teams[1 - side]].name }), 2);
  }
  foul(c, why = 'FOUL') {
    (this.pens || (this.pens = [0, 0]))[c.side]++;
    c.binLeft = Settings.penaltySeconds || CONFIG.foul.binSeconds; c.ownIn = false; c.x = c.y = -50; c.vx = c.vy = 0;
    this.notice = `${why}: ${TEAMS[this.teams[c.side]].name.toUpperCase()} CART ${c.index + 1} TO THE SIN BIN`; this.noticeLeft = CONFIG.foul.noticeSeconds; this.sfx('foul');
    this.call('penalty', this.V({ ...this.W(c, 'who'), why: ({ FOUL: 'a foul', CREASE: 'being in the crease' })[why] || why.toLowerCase(), team: TEAMS[this.teams[c.side]].name }), 2); this.call('powerplay', this.V({ team: TEAMS[this.teams[c.side]].name }), 1);
  }

  /* ----- stepping ----- */
  update(dt) {                                      // call every frame; runs fixed physics steps
    if (this.remote) return;                        // an online client's copy is driven by snapshots (see net.js)
    this.accumulator += dt; const h = 1 / CONFIG.physics.hz;
    while (this.accumulator >= h) { this.savePrev(); this.step(h); this.accumulator -= h; }
    this.alpha = this.accumulator / h;               // how far the screen is between the last two steps (see drawBetween)
  }
  /* Smooth motion: the simulation moves in fixed steps, and a frame on screen usually falls between two of them. Drawing the last step
     as-is makes carts (and a camera riding on one) advance by uneven amounts each frame: judder, worst on 120 / 144 Hz screens.
     drawBetween(fn) runs fn (the drawing) with every cart and the ball placed exactly between the last two steps, then puts them back. */
  savePrev() { for (const c of this.chairs) { c.px = c.x; c.py = c.y; c.ph = c.heading; } const b = this.ball; b.px = b.x; b.py = b.y; }
  drawBetween(fn) {
    const a = this.alpha; if (this.remote || a === undefined || !CONFIG.render.smooth) return fn();
    const items = [...this.chairs, this.ball], keep = items.map(o => [o.x, o.y, o.heading]);
    for (const o of items) {
      if (o.px === undefined || Math.hypot(o.x - o.px, o.y - o.py) > 0.5) continue;          // a jump (kickoff, the sin bin): no smoothing across it
      o.x = o.px + (o.x - o.px) * a; o.y = o.py + (o.y - o.py) * a;
      if (o.ph !== undefined && o.heading !== undefined) o.heading = o.ph + normalizeAngle(o.heading - o.ph) * a;
    }
    try { return fn(); } finally { items.forEach((o, i) => { o.x = keep[i][0]; o.y = keep[i][1]; if (keep[i][2] !== undefined) o.heading = keep[i][2]; }); }
  }
  step(h) {
    this.bannerLeft -= h; this.noticeLeft -= h;
    if (this.state === 'countdown') {
      this.timer -= h; const n = Math.ceil(this.timer);
      if (n !== this.lastCount && n > 0) { this.lastCount = n; this.sfx('count'); }
      if (this.timer <= 0) { this.state = 'play'; this.sfx('whistle'); this.call(this.simTime < 1 ? 'open' : 'drop', this.V({ team: TEAMS[this.teams[0]].name, opp: TEAMS[this.teams[1]].name }), 2); }
    } else if (this.state === 'play' || this.state === 'goal') {
      this.simulate(h);
      if (this.state === 'play' && !this.overtime && !this.practice) { const was = this.clock; this.clock -= h * Settings.timeSpeed; if (this.clock <= 0) this.endPeriod(); else if (was > 60 && this.clock <= 60 && this.period === CONFIG.match.periods) this.call('oneMin', this.V(), 2); else if (was > 10 && this.clock <= 10) this.call('tenSec', this.V(), 2); }
      else if (this.state === 'play' && this.overtime && !this.practice && !this.remote) { this.otLeft -= h * Settings.timeSpeed; if (this.otLeft <= 0) this.decideOvertime(); }
      else if (this.state === 'goal') { this.timer -= h; if (this.timer <= 0) { if (this.overtime) this.state = 'over'; else this.kickoff(); } }
    }
  }
  humanCommand(p) { const v = p.remote ? { x: p.src.ax, y: p.src.ay } : screenToCourt(p.src.ax, p.src.ay, p.chair && p.chair.x, p.chair && p.chair.y, p), cmd = { x: v.x, y: v.y, spin: p.spinQueued || 0, speed: Math.min(CONFIG.speedLevels[p.speedLevel - 1], Settings.maxSpeed()) }; p.spinQueued = 0; return cmd; }

  simulate(h) {
    this.simTime += h; if (typeof Learn !== 'undefined' && !this.remote) Learn.observe(this);
    const K = CONFIG.chair, B = CONFIG.ball, b = this.ball, prevX = b.x, prevY = b.y;   // prev = where the ball was at the start of this step
    for (const c of this.chairs) {
      if (c.benched) { c.binLeft -= h; if (c.binLeft <= 0) this.returnFromBench(c); continue; }
      const cmd = c.player ? this.humanCommand(c.player) : aiCommand(c, this, h); cmd.speed = Math.min(cmd.speed === undefined ? 1 : cmd.speed, Settings.maxSpeed());   // the host's top-speed lock covers CPU carts too
      c.update(h, cmd, Settings.turnSpeed * (c.player ? 1 : diffFor(this, c.side).turnBoost));
    }
    const live = this.chairs.filter(c => !c.benched);
    if (Settings.penalties) for (const c of live) {                                    // crease rule: attackers may not drive into the crease they are shooting at
      const shape = this.creases[1 - c.side];
      if (inCrease(shape, c.x, c.y, CONFIG.crease.cartPad)) { this.foul(c, 'CREASE'); }
    }
    if (Settings.penalties) {                                                          // two carts of the same team may not be in their own crease: the second one in is penalised
      const own = this.creases, inside = live.filter(c => !c.benched && inCrease(own[c.side], c.x, c.y, 0));
      for (const c of live) { const now = inside.includes(c); if (now && !c.ownIn) c.ownSince = this.simTime; c.ownIn = now; }
      for (const s of [0, 1]) { const mates = inside.filter(c => c.side === s); if (mates.length > 1) { const late = mates.reduce((a, c) => (c.ownSince > a.ownSince ? c : a)); late.ownIn = false; this.foul(late, 'TWO IN THE CREASE'); } }
    }
    for (const c of live.filter(k => !k.benched)) this.chairObstacles(c);
    if (Settings.collisions) for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) this.chairHit(live[i], live[j]);
    for (const c of live) this.chairObstacles(c);

    this.stepBall(b, h, live);
    for (const n of this.nets) {                    // goal: the ball must travel in through the open mouth (never through the back or sides)
      const line = n.end === 0 ? n.mouthX - B.radius : n.mouthX + B.radius;
      const crossed = n.end === 0 ? prevX >= line && b.x < line : prevX <= line && b.x > line;
      if (crossed && b.y > n.y1 && b.y < n.y2) this.scoreGoal(1 - n.end);
    }
    this.countShots();
    this.checkBallTrap(live, h); this.checkCreaseIdle(h); this.checkFrozen(live, h); this.watchPlay(live, h);
  }
  countShots() {                                    // a shot on net: the ball enters a crease and the last cart to touch it was an opponent's (saves and goals both count)
    const b = this.ball;
    for (const n of this.nets) {
      const inside = inCrease(this.creases[n.end], b.x, b.y, 0), was = this.ballIn[n.end]; this.ballIn[n.end] = inside;
      if (inside && !was && this.state === 'play' && this.lastTouch === 1 - n.end) { this.shots[1 - n.end]++; this.shotAt = { side: 1 - n.end, at: this.simTime, who: this.lastChair }; this.call('shot', this.V({ ...this.W(this.lastChair, 'who') })); }
    }
  }
  /* One physics step for a ball against the given carts, boards and net walls. The host uses it for the real ball; an online client also runs it
     on a copy of the ball to predict what its own cart does to it (see ClientSim). */
  stepBall(b, h, live) {
    const K = CONFIG.chair, B = CONFIG.ball, prevX = b.x, prevY = b.y;
    for (const c of live) {                         // ball against the chair body and against the cup
      Physics.circles(b, B.radius, B.mass, c, K.ballHitRadius, Infinity, Settings.ballBounce);
      if (Math.hypot(b.x - c.x, b.y - c.y) < B.radius + K.ballHitRadius + B.gripMargin) this.lastTouch = c.side, this.lastChair = c, this.touched = true;           // last cart to touch the ball (for shot stats)
      for (const q of c.cupColliders()) {
        if (Math.hypot(b.x - q.x, b.y - q.y) < B.radius + q.r + B.gripMargin) { this.lastTouch = c.side; this.lastChair = c; this.touched = true; }
        Physics.circles(b, B.radius, B.mass, q, q.r, Infinity, Settings.ballBounce);
        if (Math.hypot(b.x - q.x, b.y - q.y) < B.radius + q.r + B.gripMargin) {      // traction: the cup drags the ball along with it
          const k = Math.min(1, Settings.ballGrip * h); b.vx += (q.vx - b.vx) * k; b.vy += (q.vy - b.vy) * k;
        }
      }
    }
    const speed = Math.hypot(b.vx, b.vy);           // rolling friction
    if (speed > 0) { const k = Math.max(0, speed - (Settings.ballFriction + B.dragPerSecond * speed) * h) / speed; b.vx *= k; b.vy *= k; }
    b.x += b.vx * h; b.y += b.vy * h;
    this.ballBoards(b);
    for (const n of this.nets) for (const s of n.segments) if (!s.chairOnly) {
      Physics.circleVsSegment(b, B.radius, s.x1, s.y1, s.x2, s.y2, B.boardBounce);
      if (Physics.segmentsCross(prevX, prevY, b.x, b.y, s.x1, s.y1, s.x2, s.y2)) {   // shoved or shot straight through a net wall: put it back
        b.x = prevX; b.y = prevY; if (s.x1 === s.x2) b.vx = -b.vx * B.boardBounce; else b.vy = -b.vy * B.boardBounce;
      }
    }
  }
  chairObstacles(c) {
    if (c.benched) return;                           // a cart sent to the sin bin mid-step must not be clamped back onto the court
    const R = CONFIG.chair.radius, K = CONFIG.chair;
    if (c.x < R) { c.x = R; c.vx = Math.abs(c.vx) * K.boardBounce; } if (c.x > this.width - R) { c.x = this.width - R; c.vx = -Math.abs(c.vx) * K.boardBounce; }
    if (c.y < R) { c.y = R; c.vy = Math.abs(c.vy) * K.boardBounce; } if (c.y > this.height - R) { c.y = this.height - R; c.vy = -Math.abs(c.vy) * K.boardBounce; }
    this.roundCorners(c, R, K.boardBounce);
    for (const n of this.nets) for (const s of n.segments) Physics.circleVsSegment(c, R, s.x1, s.y1, s.x2, s.y2, K.boardBounce);
  }
  // Keeps a circle of radius r inside the rounded rink corners and bounces it off them.
  roundCorners(o, r, bounce) {
    const R = CONFIG.court.cornerRadius, W = this.width, H = this.height;
    const cx = o.x < R ? R : o.x > W - R ? W - R : null, cy = o.y < R ? R : o.y > H - R ? H - R : null;
    if (cx === null || cy === null) return;                        // not in a corner region
    const dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy), limit = R - r;
    if (d <= limit || d === 0) return;
    const nx = dx / d, ny = dy / d, vn = o.vx * nx + o.vy * ny;
    o.x = cx + nx * limit; o.y = cy + ny * limit;
    if (vn > 0) { o.vx -= (1 + bounce) * vn * nx; o.vy -= (1 + bounce) * vn * ny; }
  }
  ballBoards(b = this.ball) {
    const r = CONFIG.ball.radius, e = CONFIG.ball.boardBounce;
    if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx) * e; } if (b.x > this.width - r) { b.x = this.width - r; b.vx = -Math.abs(b.vx) * e; }
    if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy) * e; } if (b.y > this.height - r) { b.y = this.height - r; b.vy = -Math.abs(b.vy) * e; }
    this.roundCorners(b, r, e);
  }
  chairHit(a, b) {
    const R = CONFIG.chair.radius, F = CONFIG.foul, dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d >= 2 * R || d === 0) return;
    const nx = dx / d, ny = dy / d, aSpeed = a.vx * nx + a.vy * ny, bSpeed = -(b.vx * nx + b.vy * ny);
    const closing = Physics.circles(a, R, CONFIG.chair.mass, b, R, CONFIG.chair.mass, CONFIG.chair.chairBounce); crashSlow(a, b, closing);
    if (closing > F.bumpSoundSpeed) this.sfx('bump');
    if (closing > F.bumpSoundSpeed * 1.8 && a.side !== b.side) this.call('hit', this.V({ ...this.W(a, 'who'), ...this.W(b, 'who2') }));
    if (closing > F.minClosingSpeed && a.side !== b.side && Settings.penalties) {   // a hard head-on or rear hit by the faster cart is a foul
      const att = aSpeed > bSpeed ? a : b, vic = att === a ? b : a, sg = att === a ? 1 : -1, ax = nx * sg, ay = ny * sg;
      const facing = Math.cos(att.heading) * ax + Math.sin(att.heading) * ay, onVictim = -(Math.cos(vic.heading) * ax + Math.sin(vic.heading) * ay);
      if (facing > F.facingDot && Math.abs(onVictim) > F.hitDot) this.foul(att);
    }
  }
  returnFromBench(c) {
    c.x = c.side ? this.width - CONFIG.formation.benchReturnX : CONFIG.formation.benchReturnX;
    c.y = c.index % 2 ? 1.2 + (c.index - 1) / 2 * 1.4 : this.height - 1.2 - (c.index / 2 - 1) * 1.4; c.heading = c.side ? Math.PI : 0;
  }
  checkCreaseIdle(h) {                              // a ball nobody touches in a crease for too long: goalie reset, back to centre ice
    const b = this.ball;
    if (this.touched || !(this.ballIn[0] || this.ballIn[1])) { this.creaseIdle = 0; this.touched = false; return; }
    this.creaseIdle = (this.creaseIdle || 0) + h;
    if (this.creaseIdle > CONFIG.creaseIdle.seconds) {
      this.creaseIdle = 0; Object.assign(b, { x: this.width / 2, y: this.centerY, vx: 0, vy: 0 }); this.lastTouch = -1; this.ballIn = [false, false];
      this.notice = 'GOALIE RESET\nDEAD BALL BACK TO CENTRE'; this.noticeLeft = 3; Sound.play('select'); this.call('goalie', this.V(), 2);
    }
  }
  watchPlay(live, h) {                              // spots things worth a remark: saves, rushes, steals, corner scrums and quiet spells
    if (this.state !== 'play' || this.remote) return;
    const b = this.ball, sp = Math.hypot(b.vx, b.vy), W = this.width, H = this.height, now = this.simTime;
    if (this.shotAt && !(this.ballIn[0] || this.ballIn[1]) && now - this.shotAt.at < 4 && now - this.shotAt.at > 0.15) { const who = this.shotAt.who; this.shotAt = null; this.call('save', this.V({ ...this.W(who, 'who') }), 1); }
    else if (this.shotAt && now - this.shotAt.at >= 4) this.shotAt = null;
    const lc = this.lastChair;
    if (lc && this.lastTouch === lc.side) {
      if (this.prevTouchChair && this.prevTouchChair !== lc && this.prevTouchChair.side !== lc.side && now - (this.prevTouchAt || 0) < 1.5) this.call('steal', this.V({ ...this.W(lc, 'who') }));
      if (lc !== this.prevTouchChair) { this.prevTouchChair = lc; this.prevTouchAt = now; }
      if (Math.hypot(lc.vx, lc.vy) > CONFIG.chair.maxSpeed * 0.75 && Math.hypot(lc.x - b.x, lc.y - b.y) < 1.2 && (lc.side ? lc.x < W * 0.55 : lc.x > W * 0.45) && now - (this.rushAt || -99) > 8) { this.rushAt = now; this.call('rush', this.V({ ...this.W(lc, 'who') })); }
      this.prevTouchAt = Math.max(this.prevTouchAt || 0, now - 0.01 * 0);
    }
    const wall = Math.min(b.x, W - b.x, b.y, H - b.y);
    if (wall < 1.3 && sp < 0.6) { this.cornerFor = (this.cornerFor || 0) + h; if (this.cornerFor > 2.5 && now - (this.cornerAt || -99) > 12) { this.cornerAt = now; this.cornerFor = 0; this.call('corner', this.V()); } } else this.cornerFor = 0;
    if (now - (this.lastCallAt === undefined ? 0 : this.lastCallAt) > 16 && now - (this.lullAt || -99) > 16) { this.lullAt = now; this.call('lull', this.V({ sa: Math.max(...this.shots), sb: Math.min(...this.shots), team: TEAMS[this.teams[this.shots[0] >= this.shots[1] ? 0 : 1]].name, opp: TEAMS[this.teams[this.shots[0] >= this.shots[1] ? 1 : 0]].name }), 2); }
  }
  checkFrozen(live, h) {                            // the ball has sat still for a long time anywhere (behind a net, jammed in a corner): whistle it dead and drop it at the nearest face-off spot
    const b = this.ball, F = CONFIG.frozen;
    if (!F.enabled) return;                         // off: the only dead ball is one left untouched in a crease (checkCreaseIdle)
    if (this.state !== 'play' || Math.hypot(b.vx, b.vy) > F.maxSpeed || this.ballIn[0] || this.ballIn[1]) { this.frozenFor = 0; return; }
    this.frozenFor = (this.frozenFor || 0) + h;
    if (this.frozenFor < F.seconds) return;
    this.frozenFor = 0; const W = this.width, H = this.height, cx = W / 2, cy = this.centerY;
    const spots = [-1, 1].flatMap(sx => [-1, 1].map(sy => ({ x: cx + sx * F.dotX, y: cy + sy * F.dotY })));
    const dot = spots.reduce((a, p) => (Math.hypot(p.x - b.x, p.y - b.y) < Math.hypot(a.x - b.x, a.y - b.y) ? p : a));
    Object.assign(b, { x: dot.x, y: dot.y, vx: 0, vy: 0 }); this.lastTouch = -1; this.ballIn = [false, false]; this.touched = false;
    for (const c of live) {                         // clear a little room around the spot
      const dx = c.x - dot.x, dy = c.y - dot.y, d = Math.hypot(dx, dy) || 1;
      if (d < F.clearRadius) { c.x = clamp(dot.x + dx / d * F.clearRadius, CONFIG.chair.radius, W - CONFIG.chair.radius); c.y = clamp(dot.y + dy / d * F.clearRadius, CONFIG.chair.radius, H - CONFIG.chair.radius); c.vx = c.vy = 0; }
    }
    this.notice = 'PUCK FROZEN\nFACE-OFF'; this.noticeLeft = 2.5; Sound.play('select');
    this.call('frozen', this.V(), 2);
  }
  checkBallTrap(live, h) {                          // ball pinned between opponents for too long: clear the area
    const T = CONFIG.ballTrap, b = this.ball, near = live.filter(c => Math.hypot(c.x - b.x, c.y - b.y) < CONFIG.chair.radius + 0.2);
    if (near.length > 1 && near.some(c => c.side !== near[0].side) && Math.hypot(b.vx, b.vy) < T.maxSpeed) this.trapTime += h; else this.trapTime = 0;
    if (this.trapTime > T.seconds) {
      this.trapTime = 0; this.say('SET BALL');
      for (const c of live) {
        const dx = c.x - b.x, dy = c.y - b.y, d = Math.hypot(dx, dy) || 1;
        if (d < T.clearRadius) { c.x = clamp(b.x + dx / d * T.clearRadius, CONFIG.chair.radius, this.width - CONFIG.chair.radius); c.y = clamp(b.y + dy / d * T.clearRadius, CONFIG.chair.radius, this.height - CONFIG.chair.radius); c.vx = c.vy = 0; }
      }
    }
  }
}
