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
    this.drive(dt, cmd.x, cmd.y, CONFIG.chair.baseTurnRate * turnScale, !spinning, cmd.speed === undefined ? 1 : cmd.speed);
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.omega = normalizeAngle(this.heading - before) / dt;
  }
  drive(dt, sx, sy, turnRate, canSteer, speedScale) {
    const K = CONFIG.chair, mag = Math.min(1, Math.hypot(sx, sy));
    let targetSpeed = 0;
    if (mag > K.stickDeadzone) {
      let diff = normalizeAngle(Math.atan2(sy, sx) - this.heading);
      const reverse = Math.abs(diff) > K.reverseAngle;       // stick pointing behind the chair = drive backwards
      if (reverse) diff = normalizeAngle(diff + Math.PI);
      if (canSteer) this.heading += clamp(diff, -turnRate * dt, turnRate * dt);
      targetSpeed = mag * K.maxSpeed * speedScale * (reverse ? -1 : 1) * Math.max(K.minForwardFactor, Math.cos(diff));
    }
    const hx = Math.cos(this.heading), hy = Math.sin(this.heading);
    let forward = this.vx * hx + this.vy * hy;
    const grip = Math.exp(-K.sideGrip * dt), sideX = (this.vx - hx * forward) * grip, sideY = (this.vy - hy * forward) * grip;
    const rate = Math.abs(targetSpeed) > Math.abs(forward) && targetSpeed * forward >= 0 ? K.accel : K.brake;
    forward += clamp(targetSpeed - forward, -rate * dt, rate * dt);
    this.vx = hx * forward + sideX; this.vy = hy * forward + sideY;
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > K.maxSpeed) { this.vx *= K.maxSpeed / speed; this.vy *= K.maxSpeed / speed; }
  }
}
