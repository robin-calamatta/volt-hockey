/* A small learned "finisher" for CPU ball carriers (a tiny neural network + a linear term).
   Whenever a CPU cart has the ball in the foe's end it lists its options - drive the ball through the crease into the net (crash), spin-shoot at the left / middle / right
   of the net, drive to the edge of the crease, or pass - scores each option with this network and takes the best one.
   The weights were learned by self-play (tools/train_brain.js) in attack drills against the scripted goalie and defender: reward = goals, then shots.
   src/brain_weights.js holds the trained numbers. Delete that file (or its <script> line) and the CPU falls back to the hand-written decisions in ai.js.      */
const BRAIN_IN = 16, BRAIN_H = 6;
const Brain = {
  ready: false, params: null,
  size() { return BRAIN_IN + BRAIN_H * (BRAIN_IN + 2); },
  prior() {                                                     // a sensible starting point: like the hand-written rules, so learning refines rather than starts from nothing
    const p = new Array(this.size()).fill(0);
    //     bias dist  angle clear gOff  gDist spd   foe   front |ty|  crash shoot drive pass  mOpen mLane
    [0, -0.6, -1.4, 1.2, 0.8, 0, 0.3, 0, 0, -0.3, 0.3, 0.0, -0.5, -0.9, 1.0, 1.0].forEach((v, i) => { p[i] = v; });
    return p;
  },
  set(arr) { this.params = Float64Array.from(arr); this.ready = true; },
  net(f) {
    const P = this.params; let s = 0;
    for (let i = 0; i < BRAIN_IN; i++) s += P[i] * f[i];
    let o = BRAIN_IN;
    const v = BRAIN_IN + BRAIN_H * (BRAIN_IN + 1);
    for (let j = 0; j < BRAIN_H; j++) { let a = P[o + BRAIN_IN]; for (let i = 0; i < BRAIN_IN; i++) a += P[o + i] * f[i]; o += BRAIN_IN + 1; s += P[v + j] * Math.tanh(a); }
    return s;
  },
  /* Options for cart c, each scored. info: { mouth, dir, foes, mates, drive, range } (built by chooseCarry in ai.js). Returns the best { type, target, to } or null. */
  choose(c, m, D, info, rnd) {
    if (!this.ready) return null;
    const half = CONFIG.net.width / 2, foes = info.foes, mouth = info.mouth, dir = info.dir;
    const goalie = foes.find(k => k.role === 'goalie') || foes.reduce((a, k) => (!a || aiDist(k, mouth) < aiDist(a, mouth) ? k : a), null);
    const nearest = foes.reduce((mn, k) => Math.min(mn, aiDist(k, c)), 9), spd = Math.hypot(c.vx, c.vy), front = (mouth.x - c.x) * dir;
    const base = (T, type, ty) => {
      const bearing = Math.atan2(T.y - c.y, T.x - c.x), err = Math.abs(normalizeAngle(bearing - c.heading)) / Math.PI;
      const clr = Math.min(3, foes.reduce((mn, k) => Math.min(mn, aiSegDist(k, c, T)), 9)) / 3;
      const f = [1, Math.min(aiDist(c, T), 12) / 10, err, clr, goalie ? Math.min(1.5, Math.abs(goalie.y - T.y) / 2) : 1, goalie ? Math.min(1.5, aiDist(goalie, c) / 10) : 1, spd / 6, Math.min(nearest, 6) / 6, Math.max(front, 0) / 10, Math.abs(ty) / half, 0, 0, 0, 0, 0, 0];
      f[10 + type] = 1; return f;
    };
    const opts = [];
    for (const ty of [-0.65, 0, 0.65]) {
      const T = { x: mouth.x, y: mouth.y + ty * half };
      opts.push({ type: 0, target: { x: mouth.x + dir * 0.6, y: T.y }, f: base(T, 0, ty) });
      opts.push({ type: 1, target: T, f: base(T, 1, ty) });
    }
    if (info.drive && info.drive.target) opts.push({ type: 2, target: info.drive.target, f: base(info.drive.target, 2, 0) });
    for (const t of info.mates) {
      const d = aiDist(c, t); if (d < 1.2 || d > info.range * 0.9) continue;
      const f = base(t, 3, 0), ms = shotOption(t, mouth, info.range, foes, m, D).score;
      f[14] = Math.min(1, foes.reduce((mn, k) => Math.min(mn, aiDist(k, t)), 9) / 4); f[15] = ms; opts.push({ type: 3, target: t, to: t, f });
    }
    let best = null;
    for (const o of opts) { o.score = this.net(o.f) + (D.brainNoise ? (rnd() - 0.5) * 2 * D.brainNoise : 0); if (!best || o.score > best.score) best = o; }
    return best;
  }
};
