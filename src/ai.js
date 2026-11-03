/* ===== CPU brains =====
   Each side has one TeamBrain. A few times a second it looks at the whole court, works out the phase of play
   (attack / pass in flight / defend / loose ball) and gives each CPU cart a role:
     carry   has the ball: shoots, passes or dribbles           chase    goes after a loose ball (or scoops it off the boards)
     crash   drives to the front of the foe's net               outlet   finds open space and a clear lane for a pass
     screen  blocks the nearest foe for the ball carrier        receive  meets a pass
     press   closes down the foe carrier, goal side             mark     shadows the most dangerous foe
     guard   protects its own net, comes out when the ball does
   Humans are never moved: CPU carts build their play around them (crash the net, show for passes, block for the carrier).
   Carts use the same controls as a human: stick x/y and a spin. All numbers live in CONFIG.ai and CONFIG.difficulties. */

const aiDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const aiUnit = (dx, dy) => { const d = Math.hypot(dx, dy) || 1; return { x: dx / d, y: dy / d }; };
const aiStat = (m, key) => { const s = m.stats || (m.stats = {}); s[key] = (s[key] || 0) + 1; };   // tiny counters for tuning: m.stats
const diffFor = (m, side) => (m.diffBySide && m.diffBySide[side]) || m.difficulty;   // lets tests (or modes) give each side its own skill
const brainFor = (m, side) => m.brains[side] || (m.brains[side] = new TeamBrain(m, side));
function aiSegDist(p, a, b) {                                      // distance from point p to the segment a-b
  const dx = b.x - a.x, dy = b.y - a.y, t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/* ---- the ball ---- */
function ballTravel(v) {                                           // how far a ball launched at speed v rolls, with the current friction setting
  const a = Settings.ballFriction, b = CONFIG.ball.dragPerSecond;
  return a < 1e-4 ? v / b : v / b - (a / (b * b)) * Math.log(1 + b * v / a);
}
function ballAfter(m, t) {                                         // where the ball will be in t seconds (boards ignored)
  const ball = m.ball; let x = ball.x, y = ball.y, vx = ball.vx, vy = ball.vy;
  for (let s = 0; s < t; s += 0.05) {
    const sp = Math.hypot(vx, vy); if (sp < 0.02) break;
    const k = Math.max(0, sp - (Settings.ballFriction + CONFIG.ball.dragPerSecond * sp) * 0.05) / sp; vx *= k; vy *= k; x += vx * 0.05; y += vy * 0.05;
  }
  return { x: clamp(x, 0.3, m.width - 0.3), y: clamp(y, 0.3, m.height - 0.3) };
}
// Where a spin shot sends the ball, relative to the cart's heading. Measured from the physics: it depends on which side of the stem the ball sits.
function spinAngle(dir, ballLocalY) {
  const side = dir * ballLocalY;                                   // negative: ball is on the shallow side of the stem
  return dir * (side < 0 ? clamp(0.5 + 2.5 * Math.max(0, -side - 0.1), 0.5, 0.8) : 1.55);
}

/* ---- the nets are obstacles: carts drive around them, never into them ---- */
function netBoxes(m) {
  if (!m.aiBoxes) { const pad = CONFIG.chair.radius + CONFIG.ai.netPad; m.aiBoxes = m.nets.map(n => ({ x0: Math.min(n.backX, n.mouthX) - pad, x1: Math.max(n.backX, n.mouthX) + pad, y0: n.y1 - pad, y1: n.y2 + pad })); }
  return m.aiBoxes;
}
function boxesFor(m, side, c) {                                      // obstacles for a cart of `side`: both nets, plus the crease it must not enter (the foe's)
  if (!m.aiCreaseBoxes) m.aiCreaseBoxes = m.creases.map((z, i) => { const pad = CONFIG.chair.radius + CONFIG.ai.creasePad, far = z.mouthX + z.dir * (CONFIG.crease.bulge + pad), back = m.nets[i].backX - z.dir * 0.8, cy = z.cy; return { x0: Math.min(back, far), x1: Math.max(back, far),   /* spans the net too, so the quickest way out is never through the mouth */ y0: cy - z.half - pad, y1: cy + z.half + pad }; });
  const ownCrease = c && c.role !== 'goalie' && !c.player ? [m.aiCreaseBoxes[side]] : [];   // two carts of one team may not share their own crease, so only the goalie goes in
  return side === undefined ? netBoxes(m) : [netBoxes(m)[side], m.aiCreaseBoxes[1 - side], ...ownCrease];      // own net, and the foe's crease (which already spans the foe's net)
}
const inBox = (b, p) => p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1;
function segHitsBox(b, a, c) {                                     // Liang-Barsky segment/box test (box shrunk a hair so touching is fine)
  const e = 0.02, x0 = b.x0 + e, x1 = b.x1 - e, y0 = b.y0 + e, y1 = b.y1 - e, dx = c.x - a.x, dy = c.y - a.y; let t0 = 0, t1 = 1;
  for (const [p, q] of [[-dx, a.x - x0], [dx, x1 - a.x], [-dy, a.y - y0], [dy, y1 - a.y]]) {
    if (p === 0) { if (q < 0) return false; } else { const r = q / p; if (p < 0) { if (r > t1) return false; t0 = Math.max(t0, r); } else { if (r < t0) return false; t1 = Math.min(t1, r); } }
  }
  return t0 < t1;
}
function exitPoint(b, p) {                                         // nearest spot just outside the box
  const d = [p.x - b.x0, b.x1 - p.x, p.y - b.y0, b.y1 - p.y], i = d.indexOf(Math.min(...d)), e = 0.05;
  return [{ x: b.x0 - e, y: p.y }, { x: b.x1 + e, y: p.y }, { x: p.x, y: b.y0 - e }, { x: p.x, y: b.y1 + e }][i];
}
function navigate(m, from, to, side, cart) {                             // next waypoint on a path from -> to that goes around the nets (and the crease a cart of `side` must stay out of)
  const boxes = boxesFor(m, side, cart), hitsAny = (p, q) => boxes.some(b => segHitsBox(b, p, q));
  for (const b of boxes) {
    if (inBox(b, to)) to = exitPoint(b, to);
    if (inBox(b, from)) return exitPoint(b, from);
  }
  for (const b of boxes) if (segHitsBox(b, from, to)) {
    const e = CONFIG.ai.cornerPad, corners = [{ x: b.x0 - e, y: b.y0 - e }, { x: b.x1 + e, y: b.y0 - e }, { x: b.x1 + e, y: b.y1 + e }, { x: b.x0 - e, y: b.y1 + e }];
    const len = k => aiDist(from, k) + aiDist(k, to), open = corners.filter(k => !hitsAny(from, k) && !hitsAny(k, to));
    return (open.length ? open : corners.filter(k => !hitsAny(from, k))).reduce((r, k) => (r === null || len(k) < len(r) ? k : r), null) || corners.reduce((r, k) => (len(k) < len(r) ? k : r));
  }
  return to;
}
// Stick direction that turns the cart toward `angle`. A stick more than ~125 degrees off the heading makes the cart reverse instead of turn,
// so ask for at most 1.8 radians at a time.
const turnStick = (c, angle) => { const a = c.heading + clamp(normalizeAngle(angle - c.heading), -1.8, 1.8); return { x: Math.cos(a), y: Math.sin(a) }; };
const clampTarget = (m, p, margin = CONFIG.ai.wallMargin) => ({ x: clamp(p.x, margin, m.width - margin), y: clamp(p.y, margin, m.height - margin) });
function nearestBoard(m, p) {                                      // nearest wall to a point: the four boards, or the outside of a net; its distance and the normal pointing away from the wall
  const d = [p.x, m.width - p.x, p.y, m.height - p.y], i = d.indexOf(Math.min(...d));
  let best = { dist: d[i], n: [[1, 0], [-1, 0], [0, 1], [0, -1]][i] };
  for (const net of m.nets) {                                      // a ball pinned on a net's back or side can't be cupped head-on either
    const lo = Math.min(net.backX, net.mouthX), hi = Math.max(net.backX, net.mouthX), back = net.end === 1 ? 1 : -1;
    if (p.y > net.y1 && p.y < net.y2) { const dist = back * (p.x - net.backX); if (dist >= 0 && dist < best.dist) best = { dist, n: [back, 0] }; }
    if (p.x > lo && p.x < hi) { const below = p.y - net.y2, above = net.y1 - p.y; if (below >= 0 && below < best.dist) best = { dist: below, n: [0, 1] }; if (above >= 0 && above < best.dist) best = { dist: above, n: [0, -1] }; }
  }
  return best;
}
function aiHas(c, ball) {                                           // "has the ball" for decisions: in the cup, OR still pushing it just ahead of the cup. Without the second part a cart that nudges the ball a hair out of the pocket drops its job and runs off.
  if (c.hasBall(ball)) return true;
  const A = CONFIG.ai, p = c.toLocal(ball.x, ball.y);
  return p.x > A.carryMinX && p.x < A.carryMaxX && Math.abs(p.y) < A.carryHalf && Math.hypot(ball.vx - c.vx, ball.vy - c.vy) < A.carryRelSpeed;
}
function aiHolder(m, ball) {                                          // whoever is nearest the ball among those who have it
  let best = null, bd = 9;
  for (const k of m.chairs) { if (k.benched || !aiHas(k, ball)) continue; const d = aiDist(k.toWorld(CONFIG.cup.frontX, 0), ball); if (d < bd) { bd = d; best = k; } }
  return best;
}
function aiEta(c, p, D) { return aiDist(c, p) / (CONFIG.chair.maxSpeed * D.speed * 0.85) + Math.abs(normalizeAngle(Math.atan2(p.y - c.y, p.x - c.x) - c.heading)) * 0.25; }

/* ---- team brain ---- */
class TeamBrain {
  constructor(m, side) { this.m = m; this.side = side; this.next = 0; this.zoneSince = null; this.pass = null; this.zoneSince = null; this.lastHolder = null; this.holderTime = -9; this.outlet = null; }
  tick(now) {
    if (now < this.next) return;
    const D = diffFor(this.m, this.side); this.next = now + Math.max(CONFIG.ai.brainMin, D.reaction * CONFIG.ai.brainScale); this.think(now, D);
  }
  think(now, D) {
    const m = this.m, A = CONFIG.ai, s = this.side, ball = m.ball, live = m.chairs.filter(c => !c.benched);
    const mates = live.filter(c => c.side === s), foes = live.filter(c => c.side !== s), cpu = mates.filter(c => !c.player);
    if (!mates.length) return;
    const holderNow = aiHolder(m, ball);
    if (holderNow) { this.lastHolder = holderNow; this.holderTime = now; this.pass = null; }
    else if (this.pass && now > this.pass.until) this.pass = null;
    const H = holderNow || (now - this.holderTime < A.phaseHold && !this.lastHolder.benched ? this.lastHolder : null);   // short memory so roles don't flicker
    const habits = foes.some(f => f.player) && typeof Learn !== 'undefined' ? Learn.profile(D) : null;                 // what we have learned about the humans we face
    const own = m.nets[s], foeNet = m.nets[1 - s], dir = foeNet.mouthX > own.mouthX ? 1 : -1;
    const ctx0 = { ownMouth: { x: own.mouthX, y: m.centerY } };
    const ctx = { habits, m, s, D, now, ball, H, mates, foes, own, foeNet, dir, ownMouth: { x: own.mouthX, y: m.centerY }, foeMouth: { x: foeNet.mouthX, y: m.centerY } };
    if (holderNow && holderNow.side === s && dir * (holderNow.x - m.width / 2) > 2) { if (this.zoneSince === null) this.zoneSince = now; } else if (!H || H.side !== s) this.zoneSince = null;   // how long we have been working the ball in the foe's half
    let goalie = null;                                                               // one CPU cart per team lives in front of the net (when there is another CPU to play the field)
    const pressOn = !!(m.press && m.press[s]) && dir * (ball.x - m.width / 2) > (this.pressing ? -1.5 : 1);   // FULL PRESS (X): while the ball is in their end the goalie joins the attack; it runs back once the ball comes out
    this.pressing = pressOn;
    if (A.useGoalie && cpu.length >= 2 && !pressOn) {
      goalie = this.goalie && cpu.includes(this.goalie) ? this.goalie : cpu.reduce((a, c) => (aiDist(c, ctx0.ownMouth) < aiDist(a, ctx0.ownMouth) ? c : a), cpu[0]);
      this.goalie = goalie; goalie.role = 'goalie';
    } else this.goalie = null;
    const field = cpu.filter(c => c !== goalie);
    for (const c of field) if (c === H && aiHas(c, ball)) c.role = 'carry';
    let pool = field.filter(c => c !== H || !aiHas(c, ball)), roles;
    if (H && H.side === s) {                                                         // ATTACK: build the play around the carrier
      const foeNear = foes.some(f => aiDist(f, H) < A.screenRange);
      roles = pool.length === 1 ? [aiDist(H, ctx.foeMouth) < 10 ? 'crash' : 'outlet'] : ['crash', foeNear ? 'screen' : 'wing', foeNear ? 'wing' : 'outlet'];   // hockey shape: one in the slot, one wide on the far side for a cross-slot one-timer, one close for a give-and-go
    } else if (H) {                                                                  // DEFEND
      roles = pool.length === 1 ? [aiDist(H, ctx.ownMouth) < 8 || dir * (H.x - m.width / 2) < 0 ? 'press' : 'guard'] : ['press', 'guard', 'mark'];
    } else if (this.pass) {                                                          // PASS IN FLIGHT
      const r = this.pass.to; if (!r.player) { r.role = 'receive'; pool = pool.filter(c => c !== r); }
      roles = ['crash', 'wing', 'outlet'];
    } else {                                                                         // LOOSE BALL: everybody plays it. The quickest cart goes for it, the next one backs it up, the rest cut off or crash
      const runners = mates.filter(c => c !== goalie), eta = c => aiEta(c, ball, D);
      const nearest = runners.length ? runners.reduce((a, c) => (eta(c) < eta(a) ? c : a), runners[0]) : mates[0];
      const foeBest = foes.length ? Math.min(...foes.map(f => aiEta(f, ball, D))) : 99, ours = Math.min(...runners.map(eta), 99);
      const ballFwd = dir * (ball.x - m.width / 2);                                  // > 0: the ball is in their half
      let order = pool.slice().sort((a, b) => eta(a) - eta(b));
      if (!nearest.player && !inCrease(m.creases[1 - s], ball.x, ball.y, 0.2)) { nearest.role = 'chase'; order = order.filter(c => c !== nearest); }
      pool = order;
      const losing = foeBest < ours - 0.15;                                          // they will get there first: contest it from two sides, or get goal-side
      roles = ballFwd > 0.5 ? ['support', 'crash', 'cover'] : (losing || ballFwd > -3) ? ['cover', 'support', 'crash'] : ['cover', 'cover', 'support'];
    }
    if (goalie) roles = roles.filter(r => r !== 'guard');                              // the goalie is the guard
    const extra = H && H.side === s ? ['screen', 'outlet', 'wing'] : H ? ['mark', 'guard', 'press'] : ['cover', 'support', 'cover'];   // big practice teams (4 or 5 carts) have more bodies than roles
    for (let k = 0; roles.length < pool.length; k++) roles.push(extra[k % extra.length]);
    this.assign(pool, roles.slice(0, pool.length), ctx);
  }
  assign(pool, roles, ctx) {                                                         // cheapest way to hand the roles out (small, so try every order)
    if (!pool.length) return;
    const pts = roles.map(r => this.rolePoint(r, ctx)); let best = null, bestCost = Infinity;
    const go = (i, used, cost, pick) => {
      if (i === pool.length) { if (cost < bestCost) { bestCost = cost; best = pick.slice(); } return; }
      for (let k = 0; k < roles.length; k++) if (!(used & (1 << k))) {
        pick.push(k); go(i + 1, used | (1 << k), cost + aiDist(pool[i], pts[k]) - (pool[i].role === roles[k] ? CONFIG.ai.roleStick : 0), pick); pick.pop();
      }
    };
    go(0, 0, 0, []);
    if (best) pool.forEach((c, i) => { c.role = roles[best[i]]; c.rolePoint = pts[best[i]]; });
  }
  rolePoint(role, x) {
    const A = CONFIG.ai, m = x.m, H = x.H, cy = m.centerY;
    if (role === 'crash') { const side = H ? (H.y > cy ? -1 : 1) : 1; return { x: x.foeMouth.x - x.dir * (CONFIG.crease.bulge + CONFIG.chair.radius + A.creasePad + A.crashClear), y: cy + side * A.crashSpread }; }   // front of the net, off the shooter's line
    if (role === 'wing') {                                                           // wide of the net on the side away from the puck carrier: the back-door option for a cross-slot pass
      const far = H ? (H.y > cy ? -1 : 1) : (x.ball.y > cy ? -1 : 1), depth = CONFIG.crease.bulge + CONFIG.chair.radius + A.creasePad + A.crashClear;
      return { x: x.foeMouth.x - x.dir * (depth + A.wingBack), y: cy + far * A.wingWide };
    }
    if (role === 'guard') {                                                          // stand on the line from the puck to our net-centre, close in front of the crease, so the shooter sees as little net as possible
      const t = H || x.ball, u = aiUnit(t.x - x.ownMouth.x, t.y - x.ownMouth.y), d = Math.min(A.guardStandoff + A.guardCut, aiDist(t, x.ownMouth) - 1), L = CONFIG.learn, hab = x.habits;
      const shade = hab ? hab.lane * L.laneShade + hab.side * L.sideShade : 0;           // learned: lean towards the part of the net this human shoots at and the wing they carry down
      return { x: x.ownMouth.x + u.x * Math.max(d, A.guardStandoff), y: clamp(x.ownMouth.y + u.y * Math.max(d, A.guardStandoff) + shade, cy - A.guardReach, cy + A.guardReach) };
    }
    if (role === 'support') {                                                        // ahead of the ball on the line to their net: be there for the rebound / the poke, never stand still
      const bp = ballAfter(m, 0.5), u = aiUnit(x.foeMouth.x - bp.x, x.foeMouth.y - bp.y), f = A.supportAhead;
      return { x: clamp(bp.x + u.x * f, 1, m.width - 1), y: clamp(bp.y + u.y * f + (bp.y > cy ? -1 : 1) * A.supportSide, 1, m.height - 1) };
    }
    if (role === 'cover') {                                                          // goal-side of the ball: between it and our net, ready to cut off whoever gets it
      const bp = ballAfter(m, 0.4), u = aiUnit(x.ownMouth.x - bp.x, x.ownMouth.y - bp.y), d = Math.min(A.coverDist, Math.max(1.5, aiDist(bp, x.ownMouth) - 2.5));
      return { x: bp.x + u.x * d, y: bp.y + u.y * d };
    }
    if ((role === 'screen' || role === 'press') && !H) return this.rolePoint('cover', x);                  // nobody has the ball: nothing to screen or press
    if (role === 'screen') { if (!x.foes.length) return this.rolePoint('cover', x); const f = x.foes.reduce((a, k) => (aiDist(k, H) < aiDist(a, H) ? k : a), x.foes[0]), u = aiUnit(f.x - H.x, f.y - H.y); return { x: H.x + u.x * A.screenDist, y: H.y + u.y * A.screenDist }; }
    if (role === 'press') { const u = aiUnit(x.ownMouth.x - H.x, x.ownMouth.y - H.y); return { x: H.x + u.x * A.pressDist, y: H.y + u.y * A.pressDist }; }
    if (role === 'mark') {
      const f = x.foes.filter(k => k !== H).reduce((a, k) => (a === null || aiDist(k, x.ownMouth) < aiDist(a, x.ownMouth) ? k : a), null) || H;
      if (!f) return this.rolePoint('cover', x);                                   // no opponent on the court to mark (e.g. a one-person team in the sin bin)
      const lane = H ? aiUnit(H.x - f.x, H.y - f.y) : aiUnit(x.ball.x - f.x, x.ball.y - f.y), goal = aiUnit(x.ownMouth.x - f.x, x.ownMouth.y - f.y), u = aiUnit(lane.x * A.markLane * (1 + (x.habits ? x.habits.pass * CONFIG.learn.passMark : 0)) + goal.x, lane.y * A.markLane * (1 + (x.habits ? x.habits.pass * CONFIG.learn.passMark : 0)) + goal.y);   // between the receiver and the puck, a little goal-side: cut the pass off
      return { x: f.x + u.x * A.markDist, y: f.y + u.y * A.markDist };
    }
    return this.outletPoint(x);                                                      // 'outlet': open space with a clear lane to the ball
  }
  outletPoint(x) {                                                                   // sample spots around the ball, keep the most open one (sticky, so it doesn't dither)
    const A = CONFIG.ai, m = x.m, ref = x.H || x.ball, boxes = boxesFor(m, x.s); let best = null, bestScore = -Infinity;
    for (let k = 0; k < 8; k++) for (const r of [A.outletMin, (A.outletMin + A.outletMax) / 2, A.outletMax]) {
      const p = { x: ref.x + Math.cos(k * Math.PI / 4) * r, y: ref.y + Math.sin(k * Math.PI / 4) * r };
      if (p.x < 1 || p.x > m.width - 1 || p.y < 1 || p.y > m.height - 1 || boxes.some(b => inBox(b, p))) continue;
      const lane = x.foes.reduce((mn, f) => Math.min(mn, aiSegDist(f, ref, p)), 9), open = x.foes.reduce((mn, f) => Math.min(mn, aiDist(f, p)), 9);
      const score = Math.min(lane, 2) * 1.5 + Math.min(open, 4) * 0.5 + x.dir * (p.x - ref.x) * 0.15 + (this.outlet && aiDist(this.outlet, p) < 1.5 ? 0.6 : 0);
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return (this.outlet = best || { x: ref.x - x.dir * 2, y: ref.y });
  }
}

/* ---- what a single cart does ---- */
function shotOption(from, mouth, range, foes, m, D) {              // best spot on the net to shoot at from here: { score 0..1, target }
  const dir = mouth.x > m.width / 2 ? 1 : -1, d = aiDist(from, mouth), front = (mouth.x - from.x) * dir;
  if (d > range || front < 0.6) return { score: 0 };
  let best = { score: 0 };
  for (const k of [-1, -0.5, 0, 0.5, 1]) {
    const t = { x: mouth.x, y: m.centerY + k * CONFIG.net.width / 2 * 0.75 };
    const open = clamp((foes.reduce((mn, f) => Math.min(mn, aiSegDist(f, from, t)), 9) - CONFIG.ai.laneBlock - D.laneMargin) / 0.8 + 0.2, 0, 1) * (foes.every(f => aiSegDist(f, from, t) > CONFIG.ai.laneBlock + D.laneMargin * 0.5) ? 1 : 0);
    const score = open * (1 - 0.55 * d / range) * (front / d);
    if (score > best.score) best = { score, target: t };
  }
  return best;
}

function aimNeed(c, m, target) {                                   // how far the cart must still turn before a spin sends the ball at target
  const p = c.toLocal(m.ball.x, m.ball.y), bearing = Math.atan2(target.y - c.y, target.x - c.x);
  return Math.min(...[1, -1].map(d => Math.abs(normalizeAngle(bearing - spinAngle(d, p.y) - c.heading))));
}
function chooseCarry(c, m, D, now) {                               // shoot, pass or dribble?
  const A = CONFIG.ai, foeNet = m.nets[1 - c.side], mouth = { x: foeNet.mouthX, y: m.centerY }, dir = mouth.x > m.width / 2 ? 1 : -1;
  const live = m.chairs.filter(k => !k.benched), foes = live.filter(k => k.side !== c.side), mates = live.filter(k => k.side === c.side && k !== c);
  const range = ballTravel(A.shotSpeed) * A.rangeFactor, clear = (a, b) => foes.reduce((mn, f) => Math.min(mn, aiSegDist(f, a, b)), 9);
  const shot = shotOption(c, mouth, range, foes, m, D);
  if (shot.target && aimNeed(c, m, shot.target) > A.maxAimTurn) shot.score = 0;      // can't turn that far with the ball without losing it: dribble round first
  const brain = brainFor(m, c.side), impatient = brain.zoneSince !== null && now - brain.zoneSince > A.patience * (1.5 - D.shootWill * 0.5) * (1 - 0.6 * (D.bombard || 0));
  if (impatient && shot.score < A.goodShot && aiDist(c, mouth) < range && (mouth.x - c.x) * dir > 0.6) {     // lane blocked for a while: put it on net anyway, the crashers take the rebound
    let bt = null, bc = -1;
    for (const k of [-1, -0.5, 0, 0.5, 1]) { const t = { x: mouth.x, y: m.centerY + k * CONFIG.net.width / 2 * 0.75 }, cl = foes.reduce((mn, f) => Math.min(mn, aiSegDist(f, c, t)), 9); if (cl > bc) { bc = cl; bt = t; } }
    shot.score = Math.max(shot.score, A.forcedShot); shot.target = shot.target || bt; aiStat(m, 'plan.forcedShot');
  }
  let pass = { score: 0 };
  for (const t of mates) {
    const d = aiDist(c, t); if (d < 1.2 || d > range * 0.9 || clear(c, t) < A.laneBlock + D.laneMargin || aimNeed(c, m, t) > A.maxAimTurn) continue;
    const open = clamp(foes.reduce((mn, f) => Math.min(mn, aiDist(f, t)), 9) / 4, 0, 1), progress = clamp(dir * (t.x - c.x) / 6, -0.5, 0.5);
    const score = 0.2 + 0.25 * open + 0.25 * progress + D.setup * 1.1 * shotOption(t, mouth, range, foes, m, D).score + (t.role === 'crash' || t.role === 'wing' ? 0.12 : 0);
    if (score > pass.score) { const lead = d / A.shotSpeed * 0.6 * D.lead; pass = { score, to: t, target: { x: t.x + t.vx * lead, y: t.y + t.vy * lead } }; }
  }
  const pressed = foes.some(f => aiDist(f, c) < A.pressureDist), noise = (1 - D.passWill) * 0.12 * (Math.random() * 2 - 1);
  const drive = driveOption(c, m, mouth, dir, foes), near = aiDist(c, mouth);
  const until = now + A.aimCommit, plan = { until, noise: (Math.random() - 0.5) * 2 * D.aimError };
  const driveIt = () => { aiStat(m, 'plan.drive'); return { ...plan, kind: 'drive', target: drive.target, until: now + A.planHold }; };
  // Volt hockey is mostly won by driving: keep the ball on the front of the cart and push it into the net. The spin only adds speed to a shot or a pass.
  // LEARNED FINISHER (brain.js): in the foe's end the trained network picks between crashing the net, shooting at one side of it, driving to the crease edge or passing.
  if (D.brain && typeof Brain !== 'undefined' && Brain.ready && near < A.brainRange && (mouth.x - c.x) * dir > A.brainMinAhead) {
    const pick = Brain.choose(c, m, D, { mouth, dir, foes, mates, drive, range }, Math.random);
    if (pick) {
      aiStat(m, 'brain.' + pick.type);
      if (pick.type === 0) return { ...plan, kind: 'crash', target: pick.target, until: now + A.crashHold };
      if (pick.type === 1) return { ...plan, kind: 'shoot', target: pick.target };
      if (pick.type === 3) return { ...plan, kind: 'pass', target: pick.target, to: pick.to };
      return driveIt();
    }
  }
  // CRASH THE NET: with a look at the goal and the ball on the cup, don't stop at the crease. Drive flat out through it and let the ball go in; the cart takes the crease penalty (a goal wipes it anyway).
  if (D.crash && Math.random() < D.crash && near < A.crashRange && (mouth.x - c.x) * dir > A.crashMinAhead && Math.abs(normalizeAngle(Math.atan2(mouth.y - c.y, mouth.x - c.x) - c.heading)) < A.crashAlign && (shot.score > A.crashMinLook || drive.clear > A.driveClear * 0.3)) {
    const tgt = shot.target || drive.aim || mouth; aiStat(m, 'plan.crash');
    return { ...plan, kind: 'crash', target: { x: mouth.x + dir * 0.6, y: clamp(tgt.y, mouth.y - CONFIG.net.width / 2 * 0.6, mouth.y + CONFIG.net.width / 2 * 0.6) }, until: now + A.crashHold };
  }
  if (shot.target && aiDist(c, mouth) < A.bombardRange && shot.score > A.bombardMin + (1 - (D.bombard || 0)) * 0.2 && Math.random() < D.shootWill) { aiStat(m, 'plan.bombard'); return { ...plan, kind: 'shoot', target: shot.target }; }   // BOMBARD: any look at the net is taken, the others crash the rebound
  if (shot.score > A.goodShot && Math.random() < D.shootWill) { aiStat(m, 'plan.shoot'); return { ...plan, kind: 'shoot', target: shot.target }; }   // open look from range: spin it in
  const atEdge = aiDist(c, drive.target) < A.edgeRange;
  if (!atEdge && (drive.clear > A.driveClear || drive.clear > A.driveTight)) return driveIt();                                                              // not there yet: keep driving to the edge of the crease                                                         // lane is open, or we are right on top of it: drive
  if (pass.score > A.passThreshold && Math.random() < D.passWill * (pressed ? 1 : A.passIdleShare)) { aiStat(m, 'plan.pass'); return { ...plan, kind: 'pass', target: pass.target, to: pass.to }; }   // blocked: give it to a mate who has a better look
  if (shot.score > A.shootThreshold && Math.random() < D.shootWill) { aiStat(m, 'plan.shoot'); return { ...plan, kind: 'shoot', target: shot.target }; }
  if (atEdge) { aiStat(m, 'plan.edgeShot'); return { ...plan, kind: 'shoot', target: shot.target || drive.aim }; }                                                      // at the crease edge with nothing better: put it on net, the crashers play the rebound
  return driveIt();                                                                                                                                                      // otherwise keep driving: swerve round the blocker
}

function driveOption(c, m, mouth, dir, foes) {                       // where to drive to: a spot just outside the crease with a clear look at the net { clear, target (the stand spot), aim (the net point) }
  const A = CONFIG.ai, z = m.creases[1 - c.side], half = CONFIG.net.width / 2 * 0.75, pad = CONFIG.chair.radius + A.creaseStand; let best = { clear: -1, target: { x: mouth.x - dir * (CONFIG.crease.bulge + pad), y: mouth.y } };
  for (const k of [-1, -0.5, 0, 0.5, 1]) {
    const t = { x: mouth.x, y: mouth.y + k * half }, u = aiUnit(c.x - t.x, c.y - t.y); let d = 0.5;
    while (d < 12 && inCrease(z, t.x + u.x * d, t.y + u.y * d, pad)) d += 0.1;       // march out from the net until we are clear of the crease
    const stand = { x: t.x + u.x * d, y: t.y + u.y * d };
    const clear = foes.reduce((mn, f) => Math.min(mn, aiSegDist(f, c, stand), aiSegDist(f, stand, t) + 0.3), 9) - 0.1 * aiDist(c, stand) / 4;
    if (clear > best.clear) best = { clear, target: stand, aim: t };
  }
  return best;
}

function swerve(c, m, target) {                                    // bend the path sideways around a foe who stands in the way
  const foes = m.chairs.filter(k => !k.benched && k.side !== c.side), A = CONFIG.ai; let out = target;
  for (const f of foes) {
    const d = aiSegDist(f, c, out), along = ((f.x - c.x) * (out.x - c.x) + (f.y - c.y) * (out.y - c.y)) / (aiDist(c, out) || 1);
    if (d < A.swerveDist && along > 0 && along < aiDist(c, out)) {
      const u = aiUnit(out.x - c.x, out.y - c.y), cross = u.x * (f.y - c.y) - u.y * (f.x - c.x), s = cross > 0 ? -1 : 1;   // foe is on our left: pass on the right, and vice versa
      out = { x: f.x - u.y * s * A.swervePass + u.x * 0.6, y: f.y + u.x * s * A.swervePass + u.y * 0.6 };
    }
  }
  return out;
}
function carryPlan(c, m, D, now) {
  const A = CONFIG.ai;
  if (!c.plan || now > c.plan.until) c.plan = chooseCarry(c, m, D, now);
  const plan = c.plan;
  const wall = nearestBoard(m, m.ball);
  const inFront = (m.nets[1 - c.side].mouthX - c.x) * (m.nets[1 - c.side].mouthX > m.width / 2 ? 1 : -1) > A.clearOnlyBehind;   // the net is ahead of us: keep driving along the board instead of stopping to flick the ball off it
  if (wall.dist < A.liftDistance && c.plan.kind !== 'clear' && !inFront) {       // ball cupped against a board: carry it along the board, then flick it out into open court with a spin
    const n = wall.n, along = n[0] === 0 ? { x: Math.sign(m.nets[1 - c.side].mouthX - c.x) || 1, y: 0 } : { x: 0, y: Math.sign(m.centerY - c.y) || 1 };
    c.plan = { kind: 'clear', until: now + A.clearSeconds, noise: 0, target: { x: m.ball.x + n[0] * 4 + along.x * A.clearAlong, y: m.ball.y + n[1] * 4 + along.y * A.clearAlong } };
  }
  if (plan.kind === 'crash') return { goal: plan.target, speed: 1, through: true, fast: true, drive: true, crash: true };   // flat out, straight through the crease
  if (plan.kind === 'drive') {                                       // the RUSH: nobody ahead of us, so charge at the net flat out; else keep the ball tucked and work round the blocker
    const ahead = m.chairs.some(k => !k.benched && k.side !== c.side && aiDist(k, c) < A.rushClear && (k.x - c.x) * (plan.target.x - c.x) > 0);
    if (!ahead && wall.dist > 0.9) { aiStat(m, 'rush'); return { goal: plan.target, speed: A.rushSpeed, through: true, fast: true }; }
    return { goal: swerve(c, m, plan.target), speed: A.driveSpeed, through: true };
  }   // (straight in only when in front of the net, else go round it)   // push the ball straight at the net
  if (plan.kind === 'dribble') return { goal: plan.target, speed: A.dribbleSpeed };   // (shoot, pass and clear all aim and spin, below)
  // shoot / pass / clear: turn so that a spin sends the ball at the target, then spin
  if (plan.kind === 'pass' && !plan.to.benched) { const d = aiDist(c, plan.to), lead = d / A.shotSpeed * 0.6 * D.lead; plan.target = { x: plan.to.x + plan.to.vx * lead, y: plan.to.y + plan.to.vy * lead }; }   // keep aiming at where the receiver is going
  const p = c.toLocal(m.ball.x, m.ball.y), bearing = Math.atan2(plan.target.y - c.y, plan.target.x - c.x);
  let best = null;
  for (const dir of [1, -1]) { const want = bearing - spinAngle(dir, p.y) + plan.noise, err = normalizeAngle(want - c.heading); if (!best || Math.abs(err) < Math.abs(best.err)) best = { dir, want, err }; }
  plan.lastErr = best.err;
  const reach = Math.max(1, aiDist(c, plan.target)), tol = plan.kind === 'clear' ? A.clearTolerance : clamp(Math.atan2(plan.kind === 'shoot' ? A.shotHalfWidth : A.passHalfWidth, reach), A.aimTolerance, A.aimToleranceMax);   // the further the target, the straighter the aim must be
  if (Math.abs(best.err) < tol + D.aimError * 0.5) {
    if (plan.kind === 'pass') brainFor(m, c.side).pass = { to: plan.to, from: c, until: now + 1.6 };
    aiStat(m, 'spin.' + plan.kind); c.plan = null; return { aim: best.want, speed: A.aimCreep, spin: best.dir };
  }
  return { aim: best.want, speed: A.aimCreep };
}

/* Scooping a ball off the boards, at pace. Measured by brute force: the cup lifts a wall ball when the cart drives at it at full speed on a slant (about 50 degrees to the board), passes the ball slightly off-centre, then swings its nose away from the board so the ball rolls up in the cup.
   Everything is worked out in a wall frame: T runs along the board toward where we want to go, W points into the board, and an angle psi there means the vector cos(psi)*T + sin(psi)*W. */
function scoopPlan(c, m, ball, wall, dir) {
  const A = CONFIG.ai, n = { x: wall.n[0], y: wall.n[1] }, W = { x: -n.x, y: -n.y };
  let T = n.x === 0 ? { x: dir, y: 0 } : { x: 0, y: Math.sign(m.centerY - ball.y) || 1 };
  const room = p => p.x > 1 && p.x < m.width - 1 && p.y > 1 && p.y < m.height - 1;
  const B = { x: ball.x, y: ball.y }, at = (u, v) => ({ x: B.x + u * T.x + v * W.x, y: B.y + u * T.y + v * W.y });
  const phi = A.scoopSlant, cphi = Math.cos(phi), sphi = Math.sin(phi);
  if (!room(at(-A.scoopRunUp * cphi, -A.scoopRunUp * sphi))) T = { x: -T.x, y: -T.y };           // no room to run up from behind: attack from the other direction
  const frame = p => { const rx = p.x - B.x, ry = p.y - B.y; return { u: rx * T.x + ry * T.y, v: rx * W.x + ry * W.y }; };
  const vec = psi => ({ x: Math.cos(psi) * T.x + Math.sin(psi) * W.x, y: Math.cos(psi) * T.y + Math.sin(psi) * W.y });
  const worldAngle = psi => { const v = vec(psi); return Math.atan2(v.y, v.x); };
  const q = { u: -A.scoopOffset * sphi, v: A.scoopOffset * cphi }, f = frame(c);                  // q: where the cart's centre should pass the ball
  const s = (f.u - q.u) * cphi + (f.v - q.v) * sphi, e = -(f.u - q.u) * sphi + (f.v - q.v) * cphi;   // distance along the run-up line (negative = still behind) and sideways off it
  const loc = c.toLocal(ball.x, ball.y), inCup = loc.x > 0.2 && loc.x < 1.2 && Math.abs(loc.y) < 0.7;
  const exit = (() => { const d = aiUnit((m.nets[1 - c.side].mouthX) - ball.x, m.centerY - ball.y), psi = Math.atan2(d.x * W.x + d.y * W.y, d.x * T.x + d.y * T.y); return Math.min(psi, -A.scoopExitMin); })();
  const aligned = Math.abs(normalizeAngle(worldAngle(phi) - c.heading)) < A.scoopAlign;
  if (!c.sr || m.simTime > c.sr.until) c.sr = { phase: 'stage', until: m.simTime + A.scoopCommit };
  const sr = c.sr;
  if (sr.phase === 'stage' && s < -A.scoopRunMin && s > -A.scoopRunUp - 1 && Math.abs(e) < A.scoopLaneWidth && aligned) { sr.phase = 'run'; sr.until = m.simTime + A.scoopCommit; }
  if (sr.phase === 'run' && (inCup || s > 0.2)) { sr.phase = 'peel'; sr.psi = Math.atan2(c.vy * W.y + c.vx * W.x, c.vx * T.x + c.vy * T.y); sr.until = m.simTime + A.scoopPeelSeconds; }
  if (sr.phase === 'run') return { stick: worldAngle(Math.atan2(q.v - f.v, q.u - f.u)), speed: 1, fast: true, scoop: true };     // charge the ball, full speed, aiming just beside its centre
  if (sr.phase === 'peel') {                                                                       // swing the nose off the board: the ball rolls up the cup and away
    sr.psi = Math.max(exit, sr.psi - A.scoopPeelRate * (1 / CONFIG.ai.controlHz));
    return { stick: worldAngle(sr.psi), speed: A.scoopPeelSpeed, fast: true, scoop: true };
  }
  const S = at(q.u - A.scoopRunUp * cphi, q.v - A.scoopRunUp * sphi);                              // stage: get to the start of the run-up lane, facing along it
  return { goal: clampTarget(m, S), speed: 1, fast: true, scoop: true, stage: true, face: worldAngle(phi), faceCreep: A.scoopFaceSpeed };
}

function chasePlan(c, m, D, now) {
  const A = CONFIG.ai, ball = m.ball, foeNet = m.nets[1 - c.side], mouth = { x: foeNet.mouthX, y: m.centerY }, dir = mouth.x > m.width / 2 ? 1 : -1;
  const wall = nearestBoard(m, ball);
  const contested = m.chairs.some(k => !k.benched && k.side !== c.side && aiDist(k, ball) < A.scoopYield && aiDist(k, ball) < aiDist(c, ball) + 1);   // a foe is already on it: no time for a run-up, drive straight in and rip it off the board
  if (wall.dist < A.pinnedBallDistance && Math.hypot(ball.vx, ball.vy) < A.pinnedBallSpeed && !contested) return scoopPlan(c, m, ball, wall, dir);
  if (aiDist(ball, { x: m.width / 2, y: m.centerY }) < A.faceoffRadius && Math.hypot(ball.vx, ball.vy) < 0.3) {          // face-off: no circling, just drive the cup straight into the ball and win the race
    const u = aiUnit(mouth.x - ball.x, mouth.y - ball.y); return { goal: { x: ball.x + u.x * 0.4, y: ball.y + u.y * 0.4 }, speed: 1, through: true, fast: true };
  }
  const rival = m.chairs.find(k => !k.benched && k.side !== c.side && aiDist(k, ball) < A.standoffRange);       // face to face over a dead ball: nobody wins pushing, so slip round to the side the rival is not on
  if (rival && Math.hypot(ball.vx, ball.vy) < A.standoffBallSpeed && Math.hypot(c.vx, c.vy) < A.standoffSpeed) {
    if (!c.slip || now > c.slip.until) { const u = aiUnit(ball.x - rival.x, ball.y - rival.y), side = Math.random() < 0.5 ? 1 : -1; c.slip = { until: now + A.slipSeconds, x: ball.x - u.y * side * A.slipSide + u.x * A.slipAhead, y: ball.y + u.x * side * A.slipSide + u.y * A.slipAhead }; aiStat(m, 'slip'); }
  }
  if (c.slip && now < c.slip.until) return { goal: clampTarget(m, c.slip), speed: 1, through: true, fast: true };
  let P = { x: ball.x, y: ball.y };
  for (let t = 0.1; t <= 1.2; t += 0.1) { P = ballAfter(m, t * (0.5 + D.lead)); if (aiEta(c, P, D) <= t) break; }      // meet the ball where we can reach it
  let out = aiUnit(mouth.x - P.x, mouth.y - P.y);                // the way we want to send it
  const pb = nearestBoard(m, P);
  if (pb.dist < A.nearBoardDistance + 0.3) out = aiUnit(out.x + pb.n[0] * 0.9, out.y + pb.n[1] * 0.9);   // near a board: send it out and away from it, never into it
  const behind = (c.x - P.x) * out.x + (c.y - P.y) * out.y < 0;
  if (!behind && aiDist(c, P) > A.swingRange) return { goal: { x: P.x - out.x * A.chaseBehind, y: P.y - out.y * A.chaseBehind }, speed: 1, fast: aiDist(c, P) > 4 };   // swing round behind it first
  // The stem sits dead centre, so a head-on hit deflects the ball. Aim a little to one side so the ball slides in beside the stem, into the cup.
  const lat = c.cupSide || (c.cupSide = Math.random() < 0.5 ? 1 : -1), o = A.cupOffset * lat;
  return { goal: { x: P.x + out.x * 0.15 - out.y * o, y: P.y + out.y * 0.15 + out.x * o }, speed: clamp(A.cupApproachMin + aiDist(c, P) / A.cupApproachRamp, A.cupApproachMin, 1), through: true, fast: aiDist(c, P) > 4 };   // through: drive into the ball, don't ease off before reaching it
}

function oneTimer(c, m, D, P) {                                   // a pass is coming and the net is open from where it will arrive: meet it and spin it straight at the net, no stopping
  const A = CONFIG.ai, foeNet = m.nets[1 - c.side], mouth = { x: foeNet.mouthX, y: m.centerY }, ball = m.ball;
  if (inCrease(m.creases[1 - c.side], P.x, P.y, CONFIG.chair.radius + A.creasePad - 0.1)) return null;
  const foes = m.chairs.filter(k => !k.benched && k.side !== c.side), so = shotOption(P, mouth, ballTravel(A.shotSpeed) * A.rangeFactor, foes, m, D);
  if (!so.target || so.score < A.oneTimerMin || Math.random() > D.shootWill + 0.1) return null;
  if (!c.ot || m.simTime > c.ot.until) c.ot = { target: so.target, until: m.simTime + A.oneTimerSeconds };    // commit to one target so the cart doesn't dither between posts
  const bearing = Math.atan2(c.ot.target.y - P.y, c.ot.target.x - P.x); let best = null;
  const inc = Math.atan2(-ball.vy, -ball.vx);
  for (const dir of [1, -1]) { const want = bearing - spinAngle(dir, 0), err = normalizeAngle(want - c.heading), off = Math.abs(normalizeAngle(want - inc)); if (!best || off < best.off) best = { dir, want, err, off }; }   // pick the spin whose facing matches the incoming ball                       // a real one-timer: face the incoming ball so it lands in the cup, and the net must lie about 90 degrees off that line
  if (Math.hypot(ball.vx, ball.vy) < A.oneTimerMinBall || Math.abs(normalizeAngle(best.want - inc)) > A.oneTimerFaceTol) return null;
  const tip = c.toWorld(CONFIG.cup.frontX, 0), db = aiDist(ball, tip), loc = c.toLocal(ball.x, ball.y);
  if (db < A.oneTimerSquare) {                                     // the ball is nearly here: square up, and spin as it reaches the cup
    const fire = db < A.oneTimerRange && Math.abs(best.err) < A.oneTimerAlign && loc.x > 0.25 && Math.abs(loc.y) < 0.33;
    if (fire) aiStat(m, 'oneTimer');
    return { aim: best.want, speed: Math.abs(best.err) > 0.5 ? A.oneTimerTurnSpeed : 0.1, spin: fire ? best.dir : 0 };
  }
  return { goal: { x: P.x - Math.cos(best.want) * CONFIG.cup.frontX, y: P.y - Math.sin(best.want) * CONFIG.cup.frontX }, speed: 1, face: best.want, fast: true };   // stand so the cup, not the body, meets the ball
}

/* The goalie. It stands just in front of the net mouth, turned side-on so it can slide up and down the goal line (forward or reverse at full speed).
   Shot coming: go to where the ball will cross the line. Otherwise: shade towards the ball so the shooter sees as little net as possible.
   Loose slow ball right in front with nobody near: step out and clear it. */
function goaliePlan(c, m, D, now) {
  const A = CONFIG.ai, ball = m.ball, own = m.nets[c.side], dir = m.nets[1 - c.side].mouthX > own.mouthX ? 1 : -1, cy = m.centerY, half = CONFIG.net.width / 2;
  const inFront = dir * (ball.x - own.mouthX), advance = inFront > 1 ? A.goalieAdvance * clamp((A.goalieAdvanceRange - inFront) / A.goalieAdvanceRange, 0, 1) : 0;   // the closer the ball, the further out: cut the angle
  const standX = own.mouthX + dir * (A.goalieStand + advance), bs = Math.hypot(ball.vx, ball.vy), inward = -ball.vx * dir;       // inward: how fast the ball comes at our net
  const foeNear = m.chairs.some(k => !k.benched && k.side !== c.side && aiDist(k, ball) < A.goalieClearFoe);
  if (aiDist(c, ball) < A.goalieClearRange && bs < A.goalieClearSpeed && !foeNear && inFront > 0.35) { aiStat(m, 'goalie.clear'); return chasePlan(c, m, D, now); }
  if (!c.gk || now > c.gk.until) c.gk = { until: now + A.goalieNoiseEvery, err: (Math.random() * 2 - 1) * D.aimError * A.goalieNoise };    // weaker levels misjudge by a little
  let y;
  if (inward > A.goalieReact) { y = ball.y + ball.vy * (dir * (ball.x - standX) / inward); aiStat(m, 'goalie.track'); }       // a shot: meet it on the line
  else {                                                                           // no shot yet: square up to whoever has the ball, standing on the line from them to the middle of the net so they see as little of it as possible
    const carrier = m.chairs.find(k => !k.benched && k.side !== c.side && aiHas(k, ball)), t = carrier || ball, near = true;
    const dd = aiDist(t, { x: own.mouthX, y: cy }), k = A.goalieShade + (A.goalieShadeNear - A.goalieShade) * clamp((A.goalieBlockRange - dd) / (A.goalieBlockRange - A.goalieTight), 0, 1);   // the closer they come, the more we mirror them across the mouth
    y = cy + (t.y - cy) * k;
  }
  const reach = half - A.goalieEdge; y = clamp(y + c.gk.err, cy - reach, cy + reach);
  const ex = standX - c.x, ey = y - c.y;
  if (Math.abs(ex) > A.goalieHome || Math.abs(c.x - own.mouthX) > A.goalieHome + A.goalieStand + A.goalieAdvance + 0.5) return { goal: { x: standX, y }, speed: Math.max(D.speed, A.goalieMinSpeed) / D.speed, fast: true };   // far out of position: just go there
  // Slide along the line. A stick pushed straight up or down turns the cart side-on by itself and then drives it forward or in reverse, whichever is shorter.
  return { vec: { x: Math.abs(ex) > A.goalieXDead ? clamp(ex * A.goalieXPull, -A.goalieXMax, A.goalieXMax) : 0, y: Math.sign(ey) * clamp(Math.abs(ey) / A.goalieBrake, 0, 1) }, speed: Math.max(D.speed, A.goalieMinSpeed) / D.speed, fast: true };
}

function pressPlan(c, m, D, face, toward) {
  const foe = m.chairs.find(k => !k.benched && k.side !== c.side && aiHas(k, m.ball)) || { x: m.ball.x, y: m.ball.y };
  return { goal: c.rolePoint, speed: 0.5 + 0.5 * D.pressure, face: toward(foe), contact: foe, fast: true };
}
function planFor(c, m, D, now) {
  const A = CONFIG.ai;
  const ball = m.ball;
  if (c.hasBall(ball)) return carryPlan(c, m, D, now);
  if (c.role === 'goalie') { c.plan = null; return goaliePlan(c, m, D, now); }
  if (c.plan && (c.plan.kind === 'shoot' || c.plan.kind === 'pass')) { aiStat(m, 'lost.' + c.plan.kind); const e = Math.round(Math.abs(c.plan.lastErr || 0) * 4); aiStat(m, 'lostErr' + e); }
  c.plan = null;
  const face = { x: ball.x, y: ball.y }, toward = p => Math.atan2(p.y - c.y, p.x - c.x);
  switch (c.role) {
    case 'receive': {
      let P = { x: ball.x, y: ball.y };
      for (let t = 0.1; t <= 1.2; t += 0.1) { P = ballAfter(m, t); if (aiEta(c, P, D) <= t) break; }
      return oneTimer(c, m, D, P) || { goal: P, speed: 1, face: toward(face), fast: true };
    }
    case 'crash': case 'outlet': case 'guard': case 'wing': case 'support': case 'cover': return { goal: c.rolePoint, speed: 1, face: toward(face), fast: true };
    case 'press': case 'screen': {
      if (c.role === 'press' && D.pressure >= A.tackleMin && aiDist(c, ball) < A.tackleRange && !c.hasBall(ball)) { aiStat(m, 'tackle'); return chasePlan(c, m, D, now); }   // go for the ball itself: poke it off the carrier's cup
      return pressPlan(c, m, D, face, toward);
    }
    case 'mark': return { goal: c.rolePoint, speed: 0.5 + 0.5 * D.pressure, face: toward(face), fast: true };
    default: return chasePlan(c, m, D, now);                           // 'chase' (or no role yet)
  }
}

function steer(c, m, plan, D) {                                    // turn a plan into stick x/y
  const A = CONFIG.ai, others = m.chairs.filter(k => !k.benched && k !== c), boxes = boxesFor(m, c.side, c);
  let dx, dy, mag = plan.speed * D.speed * (plan.fast ? 1 : Math.min(1, A.refSpeed / CONFIG.chair.maxSpeed));   // transit plans use the full stick; ball handling is rescaled to stay gentle
  if (plan.vec) { const l = Math.hypot(plan.vec.x, plan.vec.y); dx = l ? plan.vec.x / l : 0; dy = l ? plan.vec.y / l : 0; mag = plan.speed * D.speed * Math.min(1, l); }
  else if (plan.stick !== undefined) { dx = Math.cos(plan.stick); dy = Math.sin(plan.stick); }
  else if (plan.aim !== undefined) { const u = turnStick(c, plan.aim); dx = u.x; dy = u.y; if (boxes.some(b => inBox(b, { x: c.x + dx * 0.7, y: c.y + dy * 0.7 }))) mag = 0; }
  else {
    const wp = plan.drive ? plan.goal : navigate(m, c, plan.goal, c.side, c), toGoal = aiDist(c, plan.goal), u = aiUnit(wp.x - c.x, wp.y - c.y); dx = u.x; dy = u.y;
    if (wp === plan.goal && !plan.through && (!plan.scoop || plan.stage)) mag *= clamp(toGoal / A.arriveRadius, 0, 1);   // ease in at the final goal only (a scoop drives straight through)
    if (toGoal < A.arriveStop && !plan.through && (!plan.scoop || plan.stage)) { if (plan.face !== undefined) { const u = turnStick(c, plan.face); dx = u.x; dy = u.y; mag = plan.faceCreep !== undefined ? plan.faceCreep : A.faceCreep; } else mag = 0; }
  }
  const sp = Math.hypot(c.vx, c.vy);                                // never coast into the crease: if the keep-out box is nearer than our stopping distance and we are heading for it, brake
  if (sp > 0.5 && !plan.crash) for (const b of boxesFor(m, c.side, c)) {
    const ex = Math.max(b.x0 - c.x, 0, c.x - b.x1), ey = Math.max(b.y0 - c.y, 0, c.y - b.y1), dist = Math.hypot(ex, ey), inside = inBox(b, c);
    const towards = (Math.min(Math.max(c.x, b.x0), b.x1) - c.x) * c.vx + (Math.min(Math.max(c.y, b.y0), b.y1) - c.y) * c.vy > 0;
    if (!inside && towards && dist < sp * sp / (2 * CONFIG.chair.brake * A.brakeShare) + A.brakeMargin) mag = 0;
  }
  let vx = dx * mag, vy = dy * mag;
  for (const o of others) {                                        // keep clear of other carts, except one we are deliberately closing on
    const d = aiDist(c, o); if (d < A.sepRadius && o !== plan.contact) { const w = (1 - d / A.sepRadius) * A.sepWeight; vx += (c.x - o.x) / (d || 1) * w; vy += (c.y - o.y) / (d || 1) * w; }
  }
  const B = plan.scoop ? 0 : A.boardSoft; if ((c.x < B && vx < 0) || (c.x > m.width - B && vx > 0)) vx *= 0.2; if ((c.y < B && vy < 0) || (c.y > m.height - B && vy > 0)) vy *= 0.2;   // slide along boards, don't push into them
  for (const o of others) if (o.side !== c.side) {                 // don't ram an opponent at speed (that's a foul)
    const ex = o.x - c.x, ey = o.y - c.y, d = Math.hypot(ex, ey); if (d > 3.5 || d < 0.1) continue;
    const ux = ex / d, uy = ey / d, closing = (c.vx - o.vx) * ux + (c.vy - o.vy) * uy;
    if (vx * ux + vy * uy > 0.3 && closing > A.safeClosing) { const k = Math.max(c.hasBall(m.ball) ? A.carrierMinSlow : 0.35, A.safeClosing / closing); vx *= k; vy *= k; }
  }
  const len = Math.hypot(vx, vy); if (len > 1) { vx /= len; vy /= len; }
  if (c.hasBall(m.ball) && len > 0.05) {                           // holding the ball: turn gently so it isn't flung out of the cup
    const mag2 = Math.min(1, len), want = Math.atan2(vy, vx), diff = normalizeAngle(want - c.heading), limit = (plan.aim !== undefined && Math.abs(diff) < A.aimFastErr ? A.aimTurnRate : A.carryTurnRate) / A.controlHz;   // small corrections can be quick; big turns with the ball must be gentle
    if (Math.abs(diff) < 2.0) { const a = c.heading + clamp(diff, -limit, limit); vx = Math.cos(a) * mag2; vy = Math.sin(a) * mag2; }
  }
  return { x: vx, y: vy };
}

function aiCommand(c, m, dt) {                                     // a skill level may carry its own tuned values for CONFIG.ai (see tools/tune.js): apply them for this cart's think, then put the shared values back
  const tune = diffFor(m, c.side).tune;
  if (!tune) return aiCommandCore(c, m, dt);
  const A = CONFIG.ai, saved = {}; for (const k in tune) { saved[k] = A[k]; A[k] = tune[k]; }
  try { return aiCommandCore(c, m, dt); } finally { for (const k in saved) A[k] = saved[k]; }
}
function aiCommandCore(c, m, dt) {                                 // called every physics step; carts re-think at controlHz and hold their stick between
  const A = CONFIG.ai, D = diffFor(m, c.side), now = m.simTime;
  if (c.aiCmd && now < c.aiNext) { const out = { ...c.aiCmd }; c.aiCmd.spin = 0; return out; }
  const step = 1 / A.controlHz; c.aiNext = now + step;
  brainFor(m, c.side).tick(now);

  let plan;
  if (c.escapeLeft > 0) { c.escapeLeft -= step; plan = { goal: c.escapeTarget, speed: 1 }; }       // getting unstuck: ignore everything else
  else plan = planFor(c, m, D, now);
  plan.goal && (plan.goal = clampTarget(m, plan.goal, plan.scoop ? A.scoopMargin : (nearestBoard(m, m.ball).dist < A.nearBoardDistance ? A.scoopMargin : A.wallMargin)));
  const cmd = steer(c, m, plan, D); cmd.spin = plan.spin || 0;

  // Getting unstuck: pushing into a board, jammed on a net or cart, or shoving a ball that won't move.
  const ball = m.ball, R = CONFIG.chair.radius, speed = Math.hypot(c.vx, c.vy), slow = speed < A.stuckSpeed, wantsMove = Math.hypot(cmd.x, cmd.y) > 0.3;
  const wx = c.x <= R + A.wallContact ? 1 : c.x >= m.width - R - A.wallContact ? -1 : 0, wy = c.y <= R + A.wallContact ? 1 : c.y >= m.height - R - A.wallContact ? -1 : 0;
  const intoWall = !plan.scoop && ((wx && cmd.x * wx < -A.wallPushStick) || (wy && cmd.y * wy < -A.wallPushStick));
  const ballStuck = Math.hypot(ball.vx, ball.vy) < 0.3 && aiDist(ball, c) < 1.3 && !c.hasBall(ball);
  const away = plan.goal ? aiDist(c, plan.goal) > A.stuckMinDistance : false;
  const idle = (c.role === 'chase' || !c.role) && speed < A.idleSpeed && Math.hypot(ball.vx, ball.vy) < 0.3 && aiDist(c, ball) < A.idleRange;   // waiting around a ball nobody can get
  const anyHolder = m.chairs.some(k => !k.benched && aiHas(k, ball));          // dwell: stuck in a scrum or pushing a ball around in place
  if (aiDist(c, ball) > A.dwellRange || anyHolder || !c.dwell || aiDist(ball, c.dwell) > A.dwellMove) c.dwell = { x: ball.x, y: ball.y, t: now };
  const dwelling = now - c.dwell.t > A.dwellSeconds && c.role !== 'goalie';
  c.idleFor = c.escapeLeft <= 0 && idle ? (c.idleFor || 0) + step : Math.max(0, (c.idleFor || 0) - step);
  c.wallFor = c.escapeLeft <= 0 && intoWall ? c.wallFor + step : Math.max(0, c.wallFor - 2 * step);
  c.stuckFor = c.escapeLeft <= 0 && slow && wantsMove && away ? c.stuckFor + step : Math.max(0, c.stuckFor - step);
  c.stallFor = c.escapeLeft <= 0 && slow && ballStuck && !away ? c.stallFor + step : Math.max(0, c.stallFor - step);
  if (dwelling) { c.dwell = null; c.cupSide = -(c.cupSide || 1); aiStat(m, 'escape.dwell'); c.stuckFor = c.wallFor = 1e9; }   // (flip the cup side too)
  if (c.stuckFor > A.stuckSeconds || c.stallFor > A.ballStallSeconds * (plan.scoop ? 2 : 1) || c.wallFor > A.wallPushSeconds || c.idleFor > A.idleSeconds) {
    c.stuckFor = c.stallFor = c.wallFor = c.idleFor = 0; c.escapeLeft = A.escapeSeconds;
    const cx = m.width / 2 - c.x, cy = m.centerY - c.y, d = Math.hypot(cx, cy) || 1, k = Math.min(d, A.escapeDistance) / d;      // back off toward the middle of the court
    c.escapeTarget = clampTarget(m, { x: c.x + cx * k + (Math.random() - 0.5) * 2 * A.escapeJitter, y: c.y + cy * k + (Math.random() - 0.5) * 2 * A.escapeJitter });
  }
  c.aiCmd = cmd; const out = { ...cmd }; cmd.spin = 0; return out;
}
