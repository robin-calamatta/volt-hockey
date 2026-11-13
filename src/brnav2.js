/* v14.3.8 CPUs getting stuck in and around buildings. The CPU's driving map marks every cell too close to a wall as blocked, with room
   for the cart's whole width. A 1.8 to 2.2 m doorway (wide enough to drive through) lost all its cells that way, so a CPU could find no
   route in or out of most small buildings: it drove straight at what it wanted, into the wall, and sat there.
   Now each doorway (a door, or a gap in a wall a cart fits through) gets a lane of open cells straight through it, out to 2.4 m either
   side, so routes go in and out by the doorway. */
{ const nav0 = MODES.br.nav;
  MODES.br.nav = function (m) {
    if (m.brNav) return m.brNav; const N = nav0.call(this, m), M = this.map(m), { cs, g, cell } = N, R = R_CART();
    const solid = (x, y, L) => M.walls.some(w => w.kind !== 'door' && w.lv === L && x > w.x0 - R * 0.6 && x < w.x1 + R * 0.6 && y > w.y0 - R * 0.6 && y < w.y1 + R * 0.6) || M.ramps.some(q => (q.lv === L || q.lv + 1 === L) && x > q.x0 && x < q.x1 && y > q.y0 && y < q.y1);
    const ways = M.walls.filter(w => w.kind === 'door');
    /* gaps between two pieces of the same wall: an open doorway */
    const thin = M.walls.filter(w => w.kind !== 'door' && Math.min(w.x1 - w.x0, w.y1 - w.y0) < 0.6 && Math.max(w.x1 - w.x0, w.y1 - w.y0) > 0.3);
    for (const hz of [true, false]) { const by = new Map();
      for (const w of thin) { if ((w.x1 - w.x0 > w.y1 - w.y0) !== hz) continue; const k = w.lv + ':' + Math.round((hz ? (w.y0 + w.y1) : (w.x0 + w.x1)) * 5); (by.get(k) || by.set(k, []).get(k)).push(w); }
      for (const ws of by.values()) { ws.sort((a, b) => hz ? a.x0 - b.x0 : a.y0 - b.y0);
        for (let i = 0; i + 1 < ws.length; i++) { const a = ws[i], b = ws[i + 1], gap = hz ? b.x0 - a.x1 : b.y0 - a.y1; if (gap < 2 * R + 0.15 || gap > 4) continue;
          ways.push(hz ? { x0: a.x1, x1: b.x0, y0: a.y0, y1: a.y1, lv: a.lv } : { x0: a.x0, x1: a.x1, y0: a.y1, y1: b.y0, lv: a.lv }); } } }
    for (const d of ways) { const wx = d.x1 - d.x0, wy = d.y1 - d.y0, along = Math.max(wx, wy); if (along < 2 * R + 0.15) continue;
      const cx = (d.x0 + d.x1) / 2, cy = (d.y0 + d.y1) / 2, nx = wx > wy ? 0 : 1, ny = wx > wy ? 1 : 0, L = d.lv || 0; if (L >= N.Lc) continue;
      const lane = [];
      for (let t = -2.4; t <= 2.401; t += cs / 2) { const x = cx + nx * t, y = cy + ny * t; if (solid(x, y, L) || (L > 0 && !this.onFloor(M, L, x, y, 0.2))) { lane.length = 0; if (t > 0) break; continue; } lane.push(cell(x, y, L)); }
      if (lane.length * cs / 2 >= 1.8) for (const k of lane) g[k] = 0;
    }
    return N;
  };
}
/* Where a CPU's route starts and ends:
   - On a ramp, a route used to start from the level the cart counted as (the upper one, half-way down), so it planned a way back up,
     turned round, planned a way down, turned round again... and see-sawed on the ramp. Now a route from a ramp starts at whichever end
     of it is the shorter way to go, and a CPU on a ramp keeps its route until it's off.
   - A cart pressed up against a wall sits in a cell the driving map counts as blocked. The search used to start from the nearest open
     cell, which could be on the other side of the wall: the CPU drove into the wall to reach it, for good. Now it starts from the
     nearest open cell it can drive straight to. The same for the place it's going (loot against a wall). */
{ const r0 = MODES.br.route, C = 1.2;
  const near = (B, m, x, y, lv) => {   // the nearest open cell that can be reached in a straight line (null: this one's open)
    const N = B.nav(m), M = B.map(m); if (lv >= N.Lc) return null; if (!N.g[N.cell(x, y, lv)]) return null;
    const walls = brWallsNear(M, x - 4, y - 4, x + 4, y + 4).filter(w => w.lv === lv && w.kind !== 'door'), cand = [];
    for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { const cx = (Math.floor(x / C) + di + 0.5) * C, cy = (Math.floor(y / C) + dj + 0.5) * C; if (cx < 0 || cy < 0 || cx > m.width || cy > m.height || N.g[N.cell(cx, cy, lv)]) continue; cand.push([Math.hypot(cx - x, cy - y), cx, cy]); }
    cand.sort((a, b) => a[0] - b[0]); for (const [, cx, cy] of cand) if (MG.clearPath(x, y, cx, cy, walls, 0.2)) return { x: cx, y: cy }; return null;
  };
  MODES.br.route = function (m, c, tx, ty, tl) {
    const G = c.gs || {}, M = this.map(m), q = G.ramp >= 0 ? M.ramps[G.ramp] : null;
    const g2 = near(this, m, tx, ty, tl); if (g2) { tx = g2.x; ty = g2.y; }
    if (q) {
      const ux = [1, 0, -1, 0][q.dir], uy = [0, 1, 0, -1][q.dir], cx = (q.x0 + q.x1) / 2, cy = (q.y0 + q.y1) / 2, hl = q.dir % 2 === 0 ? (q.x1 - q.x0) / 2 : (q.y1 - q.y0) / 2; let best = null;
      for (const [s, lv] of [[-1, q.lv], [1, q.lv + 1]]) { const ex = cx + s * ux * (hl + 1.5), ey = cy + s * uy * (hl + 1.5), p = r0.call(this, m, { x: ex, y: ey, gs: { lv } }, tx, ty, tl);
        if (!p) continue; const len = p.length + Math.hypot(c.x - ex, c.y - ey) / C; if (!best || len < best.len) best = { len, p: [{ x: ex, y: ey, lv, ramp: -1 }, ...p] }; }
      return best ? best.p : null;
    }
    const s = near(this, m, c.x, c.y, G.lv || 0); if (!s) return r0.call(this, m, c, tx, ty, tl);
    const p = r0.call(this, m, { x: s.x, y: s.y, gs: G }, tx, ty, tl); return p ? [{ x: s.x, y: s.y, lv: G.lv || 0, ramp: -1 }, ...p] : r0.call(this, m, c, tx, ty, tl);
  };
}
/* Stuck anyway (pressed against something for 3 seconds while trying to drive): back off for a moment at an angle, drop the route,
   and give up on that loot. */
{ const ai0 = miniAI;
  miniAI = function (c, m, h) {
    const cmd = ai0(c, m, h); if (m.kind !== 'br' || m.state !== 'play' || c.player || !cmd) return cmd;
    const G = c.gs, t = m.simTime; if (!G || G.plane || G.glide || G.air || G.down) { c._stk = null; return cmd; }
    if (c._unst && t < c._unst.until) return c._unst.cmd;
    const K = c._stk || (c._stk = { x: c.x, y: c.y, t, push: 0 }), sp = (cmd.speed || 0) * Math.min(1, Math.hypot(cmd.x || 0, cmd.y || 0));
    if (Math.hypot(c.x - K.x, c.y - K.y) > 1) { c._stk = { x: c.x, y: c.y, t, push: 0 }; return cmd; }
    if (sp > 0.3) K.push += h;
    if (t - K.t > 3 && K.push > 2.4) {
      const a = c.heading + Math.PI + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.6);
      c._unst = { until: t + 0.9, cmd: { x: Math.cos(a), y: Math.sin(a), speed: 0.7, spin: 0 } };
      if (c.brNav) { if (c.brNav.path) c.brNav.path = null; c.brNav.at = undefined; c.brNav.enter = -1; }
      const near = (m.gs.L || []).filter(L => Math.hypot(L[2] - c.x, L[3] - c.y) < 4); for (const L of near) (G.skipL || (G.skipL = new Set())).add(L[0]);
      if (G.camp) G.camp.until = 0; c._stk = { x: c.x, y: c.y, t: t + 0.9, push: 0 }; return c._unst.cmd;
    }
    if (t - K.t > 3) { K.t = t - 1.5; K.push = Math.min(K.push, 1.5); }   // (a slow window: keep the last part of it)
    return cmd;
  };
}
