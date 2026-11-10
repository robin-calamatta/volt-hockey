/* v14.2: smarter hockey CPUs whose skill level really shows.
   - REACTION: every CPU sees the ball a little late, by its level's reaction time (Easy about a third of a second, Legend almost
     instantly). Goalies move on what they saw, so a quick shot beats a slow goalie and a Legend goalie is hard to beat. (Carrying the
     ball is done by feel, so the cart holding it always sees it now.)
   - GOALIES: their slide speed follows their level; with the ball they get rid of it at once (a pass to an open team-mate, or a clear
     up the boards away from the net) instead of wandering off with it; and they never chase further than a few metres from the net.
   - SCREENS: when a team-mate carries the ball in on goal, the cart in front of the net parks beside the goalie on the far side, so the
     goalie can't slide across, and the shooter aims for that side.
   - NO RETREAT: a carrier in its own half under pressure doesn't drive back at its own net: it bumps the ball up the boards or passes.
   Off for a difficulty with { v2: false } (the A/B tests in tools/eval_hockey.js compare against that). */
const AI2 = { lagK: 1.8, fieldK: 0.8, histKeep: 0.8, goalieRange: 4.2, screenRange: 10, screenGap: 0.95 };
const ai2On = D => D && D.v2 !== false;

/* the ball's recent past, for late eyes */
{ const P = Match.prototype, st = P.step;
  P.step = function (h, ...a) { const r = st.call(this, h, ...a), b = this.ball; if (b) { const H = this.ballHist || (this.ballHist = []); H.push({ t: this.simTime, x: b.x, y: b.y, vx: b.vx, vy: b.vy }); while (H.length > 2 && this.simTime - H[0].t > AI2.histKeep) H.shift(); } return r; };
}
function ai2Seen(m, lag) {
  const H = m.ballHist; if (!H || !H.length || lag <= 0) return null; const want = m.simTime - lag; let s = H[0];
  for (let i = H.length - 1; i >= 0; i--) if (H[i].t <= want) { s = H[i]; break; }
  const v = Object.create(m.ball); v.x = s.x; v.y = s.y; v.vx = s.vx; v.vy = s.vy; return v;
}

{ const core = aiCommandCore;
  aiCommandCore = function (c, m, dt) {
    const D = diffFor(m, c.side); if (!ai2On(D) || D.v2lag === false || !m.ball) return core(c, m, dt);
    if (c.aiCmd && m.simTime < c.aiNext) return core(c, m, dt);
    const real = m.ball, holding = c.hasBall(real) || aiHas(c, real), seen = holding ? null : ai2Seen(m, (D.reaction || 0.1) * (c.role === 'goalie' ? AI2.lagK : AI2.fieldK));   // (goalies feel it most: a shot is all reaction)
    if (!seen) return core(c, m, dt);
    m.ball = seen; try { return core(c, m, dt); } finally { m.ball = real; }
  };
}

/* goalies: level-true speed, no wandering, quick clears */
{ const gp = goaliePlan;
  goaliePlan = function (c, m, D, now) {
    if (!ai2On(D)) return gp(c, m, D, now);
    const A = CONFIG.ai, own = m.nets[c.side], home = { x: own.mouthX, y: m.centerY };
    const plan = gp(c, m, D, now);
    if (plan && plan.speed) plan.speed = Math.max(D.speed, A.goalieMinSpeed * (0.72 + 0.28 * (D.speed || 1))) / (D.speed || 1);   // a slow level's goalie is slow too
    if (plan && plan.goal && aiDist(plan.goal, home) > AI2.goalieRange) { const u = aiUnit(plan.goal.x - home.x, plan.goal.y - home.y); plan.goal = { x: home.x + u.x * AI2.goalieRange, y: home.y + u.y * AI2.goalieRange }; }   // (chasing a loose ball: only so far)
    return plan;
  };
}
function ai2GoalieClear(c, m, D, now) {                              // the goalie has the ball: pass it out, or clear it up the boards
  const A = CONFIG.ai, live = m.chairs.filter(k => !k.benched), foes = live.filter(k => k.side !== c.side), mates = live.filter(k => k.side === c.side && k !== c);
  const dir = m.nets[1 - c.side].mouthX > m.width / 2 ? 1 : -1, clear = (a, b) => foes.reduce((mn, f) => Math.min(mn, aiSegDist(f, a, b)), 9);
  let best = null, bs = 0;
  for (const t of mates) { const d = aiDist(c, t); if (d < 2 || d > 13 || clear(c, t) < A.laneBlock + D.laneMargin) continue; const s = 1 + dir * (t.x - c.x) * 0.08 + Math.min(2, foes.reduce((mn, f) => Math.min(mn, aiDist(f, t)), 9)) * 0.3; if (s > bs) { bs = s; best = t; } }
  if (best && Math.random() < 0.4 + 0.6 * D.passWill) return { kind: 'pass', to: best, target: { x: best.x, y: best.y }, until: now + 1.2, noise: (Math.random() - 0.5) * 2 * D.aimError };
  const side = c.y < m.centerY ? -1 : 1;                              // up the near boards, forwards, away from the middle of our net
  return { kind: 'clear', target: { x: c.x + dir * 6, y: clamp(m.centerY + side * (m.height / 2 - 1), 1, m.height - 1) }, until: now + 0.9, noise: 0 };
}
{ const pf = planFor;
  planFor = function (c, m, D, now) {
    if (ai2On(D) && c.role === 'goalie' && c.hasBall(m.ball)) { if (!c.plan || now > c.plan.until || !['pass', 'clear'].includes(c.plan.kind)) c.plan = ai2GoalieClear(c, m, D, now); return carryPlan(c, m, D, now); }
    if (ai2On(D) && c.hasBall(m.ball) && c.role !== 'goalie') {        // no retreat: under pressure in our own half, never carry it back at our own net
      const own = m.nets[c.side], dir = m.nets[1 - c.side].mouthX > m.width / 2 ? 1 : -1, inOwn = dir * (c.x - m.width / 2) < -1, back = dir * Math.cos(c.heading) < -0.3;
      const pressed = m.chairs.some(k => !k.benched && k.side !== c.side && aiDist(k, c) < CONFIG.ai.pressureDist * 1.3);
      if (inOwn && pressed && back && Math.abs(c.x - own.mouthX) < 7 && (!c.plan || !['pass', 'clear'].includes(c.plan.kind))) { const g = ai2GoalieClear(c, m, D, now); if (g.kind === 'clear' || Math.random() < D.passWill) { c.plan = g; aiStat(m, 'ai2.noRetreat'); } }
    }
    return pf(c, m, D, now);
  };
}

/* screens in front of the net */
{ const P = TeamBrain.prototype, rp = P.rolePoint;
  P.rolePoint = function (role, x) {
    const D = x.D; if (role === 'crash') this.screenSide = 0; if (!ai2On(D) || D.v2screen === false || role !== 'crash' || !x.H || x.H.side !== x.s) return rp.call(this, role, x);
    const m = x.m, H = x.H, gk = x.foes.find(k => k.role === 'goalie') || x.foes.reduce((a, k) => (!a || aiDist(k, x.foeMouth) < aiDist(a, x.foeMouth) ? k : a), null);
    if (!gk || aiDist(H, x.foeMouth) > AI2.screenRange || aiDist(gk, x.foeMouth) > 2.5 || Math.random() > 0.35 + 0.65 * (D.setup || 0.5)) return rp.call(this, role, x);
    const far = H.y > m.centerY ? -1 : 1, depth = CONFIG.crease.bulge + CONFIG.chair.radius + CONFIG.ai.creasePad + 0.15;   // beside the goalie, on the side away from the shooter, just outside the crease
    this.screenSide = far; aiStat(m, 'ai2.screen');
    return { x: x.foeMouth.x - x.dir * depth, y: clamp(gk.y + far * AI2.screenGap * 1.4, m.centerY - CONFIG.net.width / 2 - 0.8, m.centerY + CONFIG.net.width / 2 + 0.8) };
  };
}
{ const so = shotOption;                                              // shooters prefer the side the screen is on (the goalie can't get there)
  shotOption = function (from, mouth, range, foes, m, D) {
    const r = so(from, mouth, range, foes, m, D); if (!ai2On(D) || !r.target || !m.brains) return r;
    const side = from.side !== undefined ? from.side : null, B = side !== null && m.brains[side]; if (!B || !B.screenSide) return r;
    const t = { x: mouth.x, y: m.centerY + B.screenSide * CONFIG.net.width / 2 * 0.7 }, open = foes.every(f => aiSegDist(f, from, t) > CONFIG.ai.laneBlock + D.laneMargin * 0.5);
    if (open && r.score > 0.05) return { score: r.score * 1.15, target: t };
    return r;
  };
}
