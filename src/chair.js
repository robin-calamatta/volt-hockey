/* One power chair. Heading is in radians, 0 = facing +x (right), positive = clockwise on screen. */
const CUP_POINTS = (() => {            // collider centres of the c-shaped cup, in chair-local coordinates
  const { frontX, halfWidth, recess, points } = CONFIG.cup, out = [];
  for (let i = 0; i < points; i++) { const t = (i / (points - 1)) * 2 - 1; out.push({ x: frontX - recess * (1 - t * t), y: t * halfWidth }); }
  return out;
})();

function stickPoints() {               // the stick's stem: a short row of colliders sticking out of the middle of the cup
  const { frontX, recess, stickColliders } = CONFIG.cup, out = [];
  for (let i = 0; i < stickColliders; i++) out.push({ x: frontX - recess + Settings.stickLength * i / (stickColliders - 1), y: 0 });
  return out;
}

class Chair {
  constructor(side, index) {
    this.side = side; this.index = index;         // index 0 starts near its own net (NPC "guard"), but is a normal player
    this.x = this.y = this.vx = this.vy = 0; this.heading = 0; this.omega = 0;
    this.spinLeft = 0; this.spinOmega = 0; this.spinCooldown = 0; this.binLeft = 0;
    this.player = null;                            // human player controlling this chair, if any
    this.target = { x: 0, y: 0 }; this.thinkIn = 0; this.spinDir = 1; this.carrying = false;
    this.playing = true; this.advanced = false;      // guard state (see ai.js)
    this.stuckFor = 0; this.stallFor = 0; this.wallFor = 0; this.escapeLeft = 0; this.escapeTarget = { x: 0, y: 0 };
  }
  get benched() { return this.binLeft > 0; }

  toLocal(wx, wy) {
    const dx = wx - this.x, dy = wy - this.y, c = Math.cos(this.heading), s = Math.sin(this.heading);
    return { x: c * dx + s * dy, y: -s * dx + c * dy };
  }
  toWorld(lx, ly) {
    const c = Math.cos(this.heading), s = Math.sin(this.heading);
    return { x: this.x + c * lx - s * ly, y: this.y + s * lx + c * ly };
  }
  hasBall(ball) {                                  // is the ball sitting in the cup?
    const p = this.toLocal(ball.x, ball.y), cup = CONFIG.cup;
    return p.x > cup.frontX - cup.recess && p.x < cup.frontX + CONFIG.ai.pocketReach && Math.abs(p.y) < cup.halfWidth;
  }
  // Cup colliders move with the chair AND with its rotation, which is what makes the spin shot hit hard.
  cupColliders() {
    const moving = (p, r) => {
      const w = this.toWorld(p.x, p.y);
      return { x: w.x, y: w.y, r, vx: this.vx - this.omega * (w.y - this.y), vy: this.vy + this.omega * (w.x - this.x) };
    };
    return [...CUP_POINTS.map(p => moving(p, CONFIG.cup.colliderRadius)), ...stickPoints().map(p => moving(p, CONFIG.cup.stickColliderRadius))];
  }

  update(dt, cmd, turnScale) {
    const S = CONFIG.spin, before = this.heading;
    this.spinCooldown = Math.max(0, this.spinCooldown - dt);
    if (cmd.spin && this.spinLeft <= 0 && this.spinCooldown <= 0) {
      const amt = Math.abs(cmd.spin) < 0.75 ? 0.5 : 1;                                   // a bumper gives a half spin (half the turn, same speed), a trigger the full one
      this.spinLeft = S.seconds * amt; this.spinCooldown = S.cooldown;
      this.spinOmega = Math.sign(cmd.spin) * (S.degrees * Math.PI / 180) / S.seconds;
      if (this.onSpin) this.onSpin();            // the match (or an online client) decides who hears the screech
    }
    const spinning = this.spinLeft > 0;
    if (spinning) { this.heading += this.spinOmega * dt; this.spinLeft -= dt; }
    const D = this.driftStep(dt, cmd, spinning), g0 = this.gripMul;
    if (D.on) { this.gripMul = (g0 || 1) * CONFIG.drift.grip; this.heading += D.dir * CONFIG.drift.yaw * dt; }
    const sp0 = Math.hypot(this.vx, this.vy); this.drifting = !!D.on;
    this.drive(dt, cmd.x, cmd.y, CONFIG.chair.baseTurnRate * turnScale * (D.on ? CONFIG.drift.turn : 1), !spinning, cmd.speed === undefined ? 1 : cmd.speed);
    this.gripMul = g0; this.drifting = false;
    if (D.on) { const sp = Math.hypot(this.vx, this.vy), want = sp0 * (1 - CONFIG.drift.drag * dt); if (sp > 0.01 && sp < want) { this.vx *= want / sp; this.vy *= want / sp; } }   // a drift keeps its speed (only a little drag)
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.omega = normalizeAngle(this.heading - before) / dt;
  }
  /* Drifting (every game): hold the drift button while turning at speed and the cart hops into a slide. The longer (and harder) you drift the
     more the bar charges: blue, then orange, then purple. Let go for a speed boost: the higher the charge, the longer it lasts. */
  driftStep(dt, cmd, spinning) {
    const F = CONFIG.drift, D = this.dr || (this.dr = { on: 0, dir: 0, ch: 0, boost: 0, lvl: 0, hop: 0 }), speed = Math.hypot(this.vx, this.vy), K = CONFIG.chair;
    D.boost = Math.max(0, D.boost - dt); D.hop = Math.max(0, D.hop - dt);
    const mag = Math.hypot(cmd.x || 0, cmd.y || 0), turn = mag > K.stickDeadzone ? normalizeAngle(Math.atan2(cmd.y, cmd.x) - this.heading) : 0, turnK = Math.abs(turn) > Math.PI / 2 ? 0 : Math.min(1, Math.abs(turn) / 0.5);   /* (first and third person only lead the cart by ~0.18 rad, so a small turn has to count) */
    const om = this.omega || 0, tk = Math.max(turnK, Math.min(1, Math.abs(om) / 2.2)), ts = Math.abs(turn) > 0.02 ? Math.sign(turn) : Math.sign(om);   // (first / third person: the cart turns as fast as you steer, so how fast it is turning counts too)
    if (!D.on && this.driftHeld && !spinning && speed > K.maxSpeed * F.minSpeed && tk > 0.22 && ts) { D.on = 1; D.dir = ts; D.ch = 0; D.hop = 0.18; if (this.onDrift) this.onDrift(0); }
    if (D.on) {
      if (!this.driftHeld || speed < K.maxSpeed * F.minSpeed * 0.6 || spinning) { const lvl = D.ch >= F.levels[2] ? 3 : D.ch >= F.levels[1] ? 2 : D.ch >= F.levels[0] ? 1 : 0; D.on = 0; D.lvl = lvl; D.boost = F.boost[lvl]; D.ch = 0; if (lvl) { const kick = 1 + 0.26 * lvl; this.vx *= kick; this.vy *= kick; } if (lvl && this.onDrift) this.onDrift(lvl); }   /* letting go gives a kick of speed straight away, then the boost holds it */
      else { const into = ts === D.dir ? 0.6 + 0.7 * tk : 0.35; D.ch = Math.min(F.levels[2] + 0.4, D.ch + dt * into); D.lvl = D.ch >= F.levels[2] ? 3 : D.ch >= F.levels[1] ? 2 : D.ch >= F.levels[0] ? 1 : 0; }
    }
    return D;
  }
  drive(dt, sx, sy, turnRate, canSteer, speedScale) {
    const K = CONFIG.chair, mag = Math.min(1, Math.hypot(sx, sy)), dB = this.dr && this.dr.boost > 0 ? CONFIG.drift.boostMul : 1;
    let targetSpeed = 0;
    if (mag > K.stickDeadzone) {
      let diff = normalizeAngle(Math.atan2(sy, sx) - this.heading);
      const reverse = Math.abs(diff) > K.reverseAngle;       // stick pointing behind the chair = drive backwards
      if (reverse) diff = normalizeAngle(diff + Math.PI);
      if (canSteer) this.heading += clamp(diff, -turnRate * dt, turnRate * dt);
      targetSpeed = mag * K.maxSpeed * (this.speedMul || 1) * dB * speedScale * (reverse ? -1 : 1) * Math.max(K.minForwardFactor, this.drifting ? 1 : Math.cos(diff));   // speedMul: a minigame boost
    }
    const hx = Math.cos(this.heading), hy = Math.sin(this.heading);
    let forward = this.vx * hx + this.vy * hy;
    const grip = Math.exp(-K.sideGrip * (this.gripMul || 1) * dt), sideX = (this.vx - hx * forward) * grip, sideY = (this.vy - hy * forward) * grip;
    const rate = Math.abs(targetSpeed) > Math.abs(forward) && targetSpeed * forward >= 0 ? K.accel : K.brake;
    forward += clamp(targetSpeed - forward, -rate * dt, rate * dt);
    this.vx = hx * forward + sideX; this.vy = hy * forward + sideY;
    const speed = Math.hypot(this.vx, this.vy);
    const top = K.maxSpeed * (this.speedMul || 1) * dB; if (speed > top) { this.vx *= top / speed; this.vy *= top / speed; }
  }
}
