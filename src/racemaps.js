/* Race tracks. 'rink' is the original oval round an island on the hockey court. Every other map is its own outdoor (or neon, or frozen)
   venue, much bigger than the rink: a track laid along a smooth centre line (it may cross itself, like the figure eight), walls on both
   sides, and obstacles placed along it:
     rock / pillar / cone / tyres / snowman   solid; carts bounce off       bumper   pinball bumper: throws you back hard
     sweeper   a spinning bar across the track (time your pass)            slider   a block sliding from wall to wall
     pad       a boost pad: drive over it for a short burst of speed
   A cart is kept inside the stretch of track it is on, so there are no short cuts (and you cannot turn off at a crossing).
   While a map race is on, the "court" is the map's whole area (setWorld), so the cameras, the 2D view and the mini-map follow it. */
const RACE_MAPS = [
  { id: 'rink', name: 'Rink Oval', blurb: 'The original: round a barrier island on the hockey court.', rink: true, laps: 5 },
  { id: 'eight', name: 'Figure Eight', blurb: 'Outdoors, 96 x 56 m. The two loops cross in the middle: mind the traffic.', w: 96, h: 56, hw: 3.6, theme: 'grass', laps: 3,
    gen: t => { const a = (t + 0.11) * Math.PI * 2; return [48 + 40 * Math.sin(a), 28 + 36 * Math.sin(a) * Math.cos(a)]; },
    obstacles: [{ at: 0.3, off: 2, type: 'tyres' }, { at: 0.8, off: -2, type: 'tyres' }, { at: 0.12, type: 'pad' }, { at: 0.62, type: 'pad' }, { at: 0.45, off: -1.4, type: 'cone' }, { at: 0.47, off: 1.4, type: 'cone' }, { at: 0.95, off: -1.4, type: 'cone' }, { at: 0.97, off: 1.4, type: 'cone' }] },
  { id: 'canyon', name: 'Serpent Canyon', blurb: 'Desert switchbacks, 150 x 90 m: five hairpins, boulders and a spinning sweeper.', w: 150, h: 90, hw: 3.4, theme: 'sand', laps: 2,
    pts: [[20, 80], [75, 80], [130, 80], [140, 70], [140, 20], [130, 10], [110, 10], [105, 20], [105, 55], [98, 63], [88, 63], [83, 55], [83, 20], [76, 12], [66, 12], [61, 20], [61, 55], [54, 63], [44, 63], [39, 55], [39, 20], [32, 12], [22, 12], [14, 20], [12, 50], [13, 70]],
    obstacles: [{ at: 0.04, type: 'pad' }, { at: 0.13, off: 1.4, type: 'rock' }, { at: 0.2, type: 'sweeper', speed: 1.3 }, { at: 0.31, off: -1.6, type: 'rock' }, { at: 0.4, off: 1.5, type: 'rock' }, { at: 0.46, type: 'pad' },
      { at: 0.52, off: -1.5, type: 'rock' }, { at: 0.6, off: 1.3, type: 'rock' }, { at: 0.66, type: 'slider', speed: 1.1 }, { at: 0.75, off: -1.5, type: 'rock' }, { at: 0.83, off: 1.5, type: 'rock' }, { at: 0.9, type: 'pad' }] },
  { id: 'gp', name: 'Grand Prix', blurb: 'A full circuit, 230 x 140 m: a 140 m straight, a cone slalom, chicanes, a sweeper and sliding blocks.', w: 230, h: 140, hw: 4.2, theme: 'track', laps: 1,
    pts: [[30, 120], [100, 120], [175, 120], [205, 112], [215, 95], [205, 80], [180, 78], [160, 85], [140, 82], [128, 68], [135, 50], [160, 40], [195, 35], [212, 22], [200, 10], [150, 12], [100, 15], [80, 25], [85, 45], [100, 55], [95, 72], [70, 80], [45, 70], [40, 50], [25, 35], [15, 55], [15, 95], [20, 112]],
    obstacles: [{ at: 0.03, type: 'pad' }, { at: 0.08, off: 2, type: 'cone' }, { at: 0.1, off: -2, type: 'cone' }, { at: 0.12, off: 2, type: 'cone' }, { at: 0.14, off: -2, type: 'cone' }, { at: 0.16, off: 2, type: 'cone' },
      { at: 0.26, off: 3, type: 'tyres' }, { at: 0.33, off: -2.5, type: 'tyres' }, { at: 0.4, type: 'sweeper', speed: 1.1 }, { at: 0.5, type: 'pad' }, { at: 0.56, off: 1.8, type: 'pillar' }, { at: 0.6, off: -1.8, type: 'pillar' },
      { at: 0.7, type: 'slider', speed: 1.2 }, { at: 0.74, type: 'slider', speed: 1.5, phase: 1.6 }, { at: 0.82, off: 3, type: 'tyres' }, { at: 0.9, type: 'pad' }] },
  { id: 'pinball', name: 'Pinball Palace', blurb: 'A neon pinball table: bumpers that throw you back, two spinning arms and sliding blocks.', w: 70, h: 50, hw: 4, theme: 'neon', laps: 4,
    pts: [[10, 40], [35, 44], [60, 40], [64, 25], [58, 10], [40, 8], [35, 20], [25, 25], [12, 18], [6, 30]],
    obstacles: [{ at: 0.05, off: 1.8, type: 'bumper' }, { at: 0.1, off: -1.8, type: 'bumper' }, { at: 0.15, off: 0.8, type: 'bumper' }, { at: 0.24, type: 'sweeper', speed: 1.6 }, { at: 0.33, off: -2, type: 'bumper' }, { at: 0.36, off: 2, type: 'bumper' },
      { at: 0.44, type: 'slider', speed: 1.4 }, { at: 0.5, type: 'pad' }, { at: 0.58, off: 1.6, type: 'bumper' }, { at: 0.62, off: -1.6, type: 'bumper' }, { at: 0.7, type: 'sweeper', speed: -1.4 }, { at: 0.8, off: 0, type: 'bumper' }, { at: 0.88, type: 'slider', speed: 1.8 }, { at: 0.95, type: 'pad' }] },
  { id: 'frozen', name: 'Frozen Lake', blurb: 'Racing on ice: almost no grip, so you slide through every corner. Snowmen in the way.', w: 84, h: 54, hw: 4.6, theme: 'ice', laps: 3, slippery: 0.18,
    gen: t => { const a = t * Math.PI * 2; return [42 + 34 * Math.cos(a) + 3 * Math.cos(3 * a), 27 + (18 + 5 * Math.cos(2 * a)) * Math.sin(a)]; },
    obstacles: [{ at: 0.1, off: 1.5, type: 'snowman' }, { at: 0.22, off: -1.8, type: 'snowman' }, { at: 0.35, type: 'pad' }, { at: 0.47, off: 2, type: 'snowman' }, { at: 0.6, off: -1.2, type: 'snowman' }, { at: 0.72, off: 1, type: 'snowman' }, { at: 0.85, type: 'pad' }] },
  { id: 'marathon', name: 'Mega Marathon', blurb: 'Nearly a kilometre of winding forest road, 360 x 240 m. One lap takes over two minutes.', w: 360, h: 240, hw: 4.5, theme: 'grass', laps: 1, forest: true,
    gen: t => { const a = t * Math.PI * 2; return [180 + (150 + 18 * Math.sin(3 * a) + 10 * Math.cos(5 * a)) * Math.cos(a), 120 + (95 + 14 * Math.sin(4 * a) + 9 * Math.sin(7 * a)) * Math.sin(a)]; },
    obstacles: 'scatter' }
];
const RACE_THEMES = {
  grass:  { ground: 0x4a8a3f, track: 0x3a3f45, wallA: 0xd8392b, wallB: 0xf4f4f2, sky: 0x9ec9ff, decor: 'tree', line: 0xf4f4f2 },
  track:  { ground: 0x4f9142, track: 0x2f3338, wallA: 0xd8392b, wallB: 0xf4f4f2, sky: 0xa8d0ff, decor: 'tree', line: 0xf4f4f2 },
  sand:   { ground: 0xc9925a, track: 0x7a6248, wallA: 0x8c3b1e, wallB: 0xf0d0a0, sky: 0xf2c48d, decor: 'rock', line: 0xf0d0a0 },
  neon:   { ground: 0x0b0f1e, track: 0x1b1f3a, wallA: 0xff3fd2, wallB: 0x3ff6ff, sky: 0x050812, decor: 'post', line: 0x3ff6ff, glow: true },
  ice:    { ground: 0xf2f6f9, track: 0x8fcbe8, wallA: 0x2f7fd8, wallB: 0xffffff, sky: 0xcfe3f5, decor: 'pine', line: 0x2f7fd8 }
};
const OBSTACLE_R = { rock: 1.0, pillar: 0.7, cone: 0.3, tyres: 0.75, snowman: 0.65, bumper: 0.8 };
const raceMap = id => RACE_MAPS.find(m => m.id === id) || RACE_MAPS[0];

/* The playing area follows the map while a map race is on (the hockey court otherwise). Changed in place, so every reader of CONFIG.court sees it. */
function setWorld(mini) {
  const C = CONFIG.court; if (!CONFIG.courtBase) CONFIG.courtBase = { width: C.width, height: C.height, cornerRadius: C.cornerRadius };
  const map = mini && mini.kind === 'race' ? raceMap(mini.track) : null;
  Object.assign(C, map && !map.rink ? { width: map.w, height: map.h, cornerRadius: 0.5 } : CONFIG.courtBase);
}

/* The centre line: from control points (a smooth closed curve through them) or a function, resampled every `step` metres. */
function trackLine(map, step = 0.5) {
  let dense = [];
  if (map.gen) for (let i = 0; i < 4000; i++) { const [x, y] = map.gen(i / 4000); dense.push({ x, y }); }
  else {
    const P = map.pts, n = P.length;
    for (let i = 0; i < n; i++) {                                       // Catmull-Rom, closed
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      for (let k = 0; k < 40; k++) { const t = k / 40, t2 = t * t, t3 = t2 * t; dense.push({ x: 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), y: 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3) }); }
    }
  }
  const out = [dense[0]]; let acc = 0;
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1], b = dense[i % dense.length], d = Math.hypot(b.x - a.x, b.y - a.y); acc += d;
    while (acc >= step) { acc -= step; const k = 1 - acc / (d || 1); out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }); }
  }
  if (Math.hypot(out[out.length - 1].x - out[0].x, out[out.length - 1].y - out[0].y) < step * 0.5) out.pop();
  const N = out.length;
  out.forEach((p, i) => { const a = out[(i - 1 + N) % N], b = out[(i + 1) % N], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; p.tx = dx / l; p.ty = dy / l; p.nx = -p.ty; p.ny = p.tx; p.a = Math.atan2(dy, dx); });
  return out;
}

/* Build a map race on a MiniMatch: the line, the obstacles (positions along the track), and which bits of wall to leave out at a crossing. */
function buildRaceMap(m, map) {
  const L = trackLine(map), N = L.length, hw = map.hw, at = f => L[((Math.round(f * N) % N) + N) % N];
  m.map = map; m.rline = L; m.startI = 0; m.hw = hw; m.island = null;
  let defs = map.obstacles;
  if (defs === 'scatter') {                                             // the marathon: a long stream of everything, the same every time
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; defs = [];
    for (let f = 0.02; f < 0.98; f += 0.012 + rnd() * 0.02) {
      const r = rnd(), type = r < 0.42 ? 'rock' : r < 0.6 ? 'tyres' : r < 0.72 ? 'pad' : r < 0.82 ? 'cone' : r < 0.91 ? 'slider' : 'sweeper';
      defs.push({ at: f, off: type === 'pad' || type === 'slider' || type === 'sweeper' ? 0 : (rnd() < 0.5 ? -1 : 1) * (0.8 + rnd() * (hw - 2)), type, speed: (rnd() < 0.5 ? -1 : 1) * (0.9 + rnd() * 0.8), phase: rnd() * 6 });
    }
  }
  m.obs = (defs || []).map((d, k) => {
    const p = at(d.at), off = d.off || 0, o = { k, type: d.type, i: L.indexOf(p), x: p.x + p.nx * off, y: p.y + p.ny * off, off, r: OBSTACLE_R[d.type] || 0.8, nx: p.nx, ny: p.ny, a: p.a };
    if (d.type === 'sweeper') Object.assign(o, { len: hw - 0.5, speed: d.speed || 1.2, phase: d.phase || 0, r: 0.18 });
    if (d.type === 'slider') Object.assign(o, { amp: hw - 1.2, speed: d.speed || 1.2, phase: d.phase || 0, r: 0.85, bx: p.x, by: p.y });
    if (d.type === 'pad') Object.assign(o, { r: 1.3 });
    return o;
  });
  // where the walls stand: along both edges, except where an edge runs across another part of the track (a crossing)
  const skip = Math.ceil(hw * 3 / 0.5), inTrack = (x, y, i) => { for (let j = 0; j < N; j += 2) { const d = Math.abs(j - i), dd = Math.min(d, N - d); if (dd > skip && Math.hypot(L[j].x - x, L[j].y - y) < hw - 0.1) return true; } return false; };
  m.walls = [-1, 1].map(sd => L.map((p, i) => { const x = p.x + p.nx * sd * (hw + 0.15), y = p.y + p.ny * sd * (hw + 0.15); return { x, y, on: !inTrack(x, y, i) }; }));
  m.trackLen = N * 0.5;
}

Object.assign(MiniMatch.prototype, {
  obstacleAt(o) {                                                        // where a moving obstacle is now
    if (o.type === 'slider') { const s = Math.sin(this.simTime * o.speed + o.phase) * o.amp; return { x: o.bx + o.nx * s, y: o.by + o.ny * s }; }
    return { x: o.x, y: o.y };
  },
  sweepAngle(o) { return o.a + o.phase + this.simTime * o.speed; },
  /* keep a cart on its stretch of track, and bounce it off obstacles */
  mapObstacles(c) {
    const K = CONFIG.chair, R = K.radius, L = this.rline, N = L.length, hw = this.hw, i = this.nearestI(c.x, c.y, c.lastI === undefined ? undefined : c.lastI);
    let best = null; for (const j of [(i - 1 + N) % N, i]) { const a = L[j], b = L[(j + 1) % N], dx = b.x - a.x, dy = b.y - a.y, t = clamp(((c.x - a.x) * dx + (c.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1), qx = a.x + dx * t, qy = a.y + dy * t, d = Math.hypot(c.x - qx, c.y - qy); if (!best || d < best.d) best = { qx, qy, d }; }
    const lim = hw - R - 0.05;
    if (best.d > lim) { const nx = (c.x - best.qx) / best.d, ny = (c.y - best.qy) / best.d, vn = c.vx * nx + c.vy * ny; c.x = best.qx + nx * lim; c.y = best.qy + ny * lim; if (vn > 0) { c.vx -= 1.45 * vn * nx; c.vy -= 1.45 * vn * ny; c.vx *= 0.97; c.vy *= 0.97; if (vn > 2.5) this.sfx('bump'); } }
    for (const o of this.obs) {
      if (Math.abs(o.i - i) > 40 && Math.abs(o.i - i) < N - 40) continue;     // only the obstacles near this bit of track
      if (o.type === 'pad') { if (Math.hypot(c.x - o.x, c.y - o.y) < o.r && !(c.padCD > 0)) { c.boostLeft = Math.max(c.boostLeft || 0, 1.1); c.padCD = 0.8; if (c.player) this.sfx('screech', c.player.id || 0); } continue; }
      if (o.type === 'sweeper') {                                        // the spinning bar: a segment through its middle
        const th = this.sweepAngle(o), ux = Math.cos(th), uy = Math.sin(th), px = c.x - o.x, py = c.y - o.y, t = clamp(px * ux + py * uy, -o.len, o.len), qx = o.x + ux * t, qy = o.y + uy * t, d = Math.hypot(c.x - qx, c.y - qy), lm = R + o.r;
        if (d < lm && d > 0) { const nx = (c.x - qx) / d, ny = (c.y - qy) / d, bv = { x: -uy * t * o.speed, y: ux * t * o.speed }, rel = (c.vx - bv.x) * nx + (c.vy - bv.y) * ny; c.x = qx + nx * lm; c.y = qy + ny * lm; if (rel < 0) { c.vx -= 1.6 * rel * nx; c.vy -= 1.6 * rel * ny; if (rel < -1.5) this.sfx('bump'); } }
        continue;
      }
      const p = this.obstacleAt(o), dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy), lm = R + o.r;
      if (d < lm && d > 0) {
        const nx = dx / d, ny = dy / d, vn = c.vx * nx + c.vy * ny; c.x = p.x + nx * lm; c.y = p.y + ny * lm;
        if (o.type === 'bumper') { const out = Math.max(5.5, -vn * 1.3); c.vx += (out - vn) * nx; c.vy += (out - vn) * ny; o.hitAt = this.simTime; this.sfx('bump'); }
        else if (vn < 0) { c.vx -= 1.5 * vn * nx; c.vy -= 1.5 * vn * ny; if (vn < -2) this.sfx('bump'); }
      }
    }
  }
});
{ // the MiniMatch methods a map race replaces (the rink oval keeps the originals)
  const P = MiniMatch.prototype, orig = { buildTrack: P.buildTrack, chairObstacles: P.chairObstacles, kickoff: P.kickoff, islandPush: P.islandPush, boxSpot: P.boxSpot, miniSnap: P.miniSnap, miniApply: P.miniApply, simulate: P.simulate };
  P.buildTrack = function () { const map = raceMap(this.mini.track); if (map.rink) return orig.buildTrack.call(this); buildRaceMap(this, map); };
  P.chairObstacles = function (c) { if (!this.map) return orig.chairObstacles.call(this, c); if (!c.benched) this.mapObstacles(c); };
  P.islandPush = function (o, rad, b) {                                 // (shots: walls and solid obstacles stop them)
    if (!this.map) return orig.islandPush.call(this, o, rad, b);
    const i = this.nearestI(o.x, o.y), q = this.rline[i]; if (Math.hypot(o.x - q.x, o.y - q.y) > this.hw) return true;
    return this.obs.some(ob => ob.type !== 'pad' && ob.type !== 'sweeper' && (p => Math.hypot(o.x - p.x, o.y - p.y) < ob.r + rad)(this.obstacleAt(ob)));
  };
  P.kickoff = function () {
    orig.kickoff.call(this); if (!this.map || !this.mini) return;
    const L = this.rline, N = L.length;                                // the grid: two abreast behind the line
    this.chairs.forEach((c, i) => { const row = Math.floor(i / 2), lane = i % 2 ? 1 : -1, p = L[(N - 5 - row * 4) % N], x = p.x + p.nx * lane * this.hw * 0.42, y = p.y + p.ny * lane * this.hw * 0.42;
      Object.assign(c, { x, y, px: x, py: y, heading: p.a, ph: p.a, vx: 0, vy: 0 }); c.lastI = this.nearestI(x, y); c.prog = -((N - c.lastI) % N); c.lap = 0; c.gripMul = this.map.slippery || 1; });
    this.focusOn();
  };
  P.boxSpot = function () {
    if (!this.map) return orig.boxSpot.call(this);
    for (let t = 0; t < 20; t++) { const q = this.rline[Math.floor(Math.random() * this.rline.length)], s = (Math.random() - 0.5) * this.hw * 1.2, p = { x: q.x + q.nx * s, y: q.y + q.ny * s };
      if (this.chairs.every(c => Math.hypot(c.x - p.x, c.y - p.y) > 3) && this.boxes.every(b => Math.hypot(b.x - p.x, b.y - p.y) > 6) && !this.islandPush({ x: p.x, y: p.y }, 0.6, 0)) return p; }
    return null;
  };
  P.simulate = function (h) { if (this.map) for (const c of this.chairs) c.padCD = Math.max(0, (c.padCD || 0) - h); return orig.simulate.call(this, h); };
  P.miniSnap = function () { const s = orig.miniSnap.call(this); s.t = Math.round(this.simTime * 100) / 100; return s; };
  P.miniApply = function (s) { orig.miniApply.call(this, s); if (s && s.t !== undefined) this.simTime = s.t; };
}
