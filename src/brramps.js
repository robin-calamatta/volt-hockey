/* v14.3.6 Volt Royale ramps, checked when the two big maps are built (modes_br_maps4.js calls these):
   - fix(T): a ramp whose top runs into a wall (or a cliff), or whose foot is boxed in, is slid along its length to the nearest spot where
     both ends are open and it doesn't cut into anything.
   - roofs(T, avoid): every big building (180 m2 or more, or 18 m long) gets at least two ramps up onto its roof: outside, running straight out
     from a wall without a door, one ramp per storey in a line (7 m each). They avoid roads, other buildings, ramps, walls and the map's edge;
     trees and loose loot in the way are cleared. */
const BRRamps = {
  D: [[1, 0], [0, 1], [-1, 0], [0, -1]],
  geo(q) { const [ux, uy] = this.D[q.dir], cx = (q.x0 + q.x1) / 2, cy = (q.y0 + q.y1) / 2, hl = q.dir % 2 === 0 ? (q.x1 - q.x0) / 2 : (q.y1 - q.y0) / 2; return { ux, uy, cx, cy, hl }; },
  wallAt(T, lv, x, y, e = 0.45) { return T.walls.some(w => w.kind !== 'door' && w.lv === lv && x > w.x0 - e && x < w.x1 + e && y > w.y0 - e && y < w.y1 + e); },
  floorAt(T, lv, x, y) { return lv === 0 || T.floors.some(f => f.lv === lv && x >= f.x0 && x <= f.x1 && y >= f.y0 && y <= f.y1); },
  rampAt(T, lv, x, y, me) { return T.ramps.some(q => q !== me && (q.lv === lv || q.lv + 1 === lv) && x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1); },
  ok(T, q) {
    const { ux, uy, cx, cy, hl } = this.geo(q), tx = cx + ux * (hl + 0.9), ty = cy + uy * (hl + 0.9), fx = cx - ux * (hl + 0.9), fy = cy - uy * (hl + 0.9);
    if (this.wallAt(T, q.lv + 1, tx, ty) || this.wallAt(T, q.lv, fx, fy)) return false;
    if (!q.kick && !(this.floorAt(T, q.lv + 1, tx, ty) || this.rampAt(T, q.lv + 1, tx, ty, q))) return false;
    return this.floorAt(T, q.lv, fx, fy) || this.rampAt(T, q.lv, fx, fy, q);
  },
  dead(T, q) {   // a wall right across one end (at the centre and both quarter points)
    const { ux, uy, cx, cy, hl } = this.geo(q), px = -uy, py = ux, wd = q.dir % 2 === 0 ? (q.y1 - q.y0) : (q.x1 - q.x0);
    const blocked = (sgn, lv) => [0, -0.25, 0.25].every(k => this.wallAt(T, lv, cx + sgn * ux * (hl + 0.5) + px * wd * k, cy + sgn * uy * (hl + 0.5) + py * wd * k, 0.15));
    return blocked(1, q.lv + 1) || blocked(-1, q.lv);
  },
  roofLv(T, d) {   // the building's roof: the highest level whose floors (all inside it, maybe in pieces round a stairwell) cover most of it
    const by = new Map(); for (const f of T.floors) if (f.lv >= 1 && f.x0 >= d.x - 0.2 && f.x1 <= d.x + d.w + 0.2 && f.y0 >= d.y - 0.2 && f.y1 <= d.y + d.h + 0.2) by.set(f.lv, (by.get(f.lv) || 0) + (f.x1 - f.x0) * (f.y1 - f.y0));
    let top = 0; for (const [lv, a] of by) if (a >= 0.7 * d.w * d.h && lv > top) top = lv; return top;
  },
  clear(T, r, lvs, me) {   // nothing solid inside rectangle r at those levels
    return !T.walls.some(w => w.kind !== 'door' && lvs.includes(w.lv) && w.x0 < r.x1 && w.x1 > r.x0 && w.y0 < r.y1 && w.y1 > r.y0) && !T.ramps.some(q => q !== me && q.x0 < r.x1 && q.x1 > r.x0 && q.y0 < r.y1 && q.y1 > r.y0);
  },
  fix(T) {
    let moved = 0;
    for (const q of T.ramps) {
      if (q.kick || this.ok(T, q)) continue;
      const o = { x0: q.x0, y0: q.y0, x1: q.x1, y1: q.y1 }, ax = q.dir % 2 === 0;
      let done = false;
      for (const s of [0.5, -0.5, 1, -1, 1.5, -1.5, 2, -2, 2.5, -2.5, 3, -3, 4, -4, 5, -5, 6, -6, 8, -8]) {
        Object.assign(q, ax ? { x0: o.x0 + s, x1: o.x1 + s } : { y0: o.y0 + s, y1: o.y1 + s });
        if (this.clear(T, { x0: q.x0 + 0.05, y0: q.y0 + 0.05, x1: q.x1 - 0.05, y1: q.y1 - 0.05 }, [q.lv], q) && this.ok(T, q)) { moved++; done = true; break; }
        Object.assign(q, o);
      }
      if (!done) { const d0 = q.dir; q.dir = (d0 + 2) % 4; if (this.ok(T, q)) { moved++; done = true; } else q.dir = d0; }   // (built the wrong way round)
      /* still running straight into a wall at one end, all the way across: it goes nowhere, so it goes */
      if (!done && this.dead(T, q)) q._dead = 1;
    }
    T.ramps = T.ramps.filter(q => !q._dead);
    return moved;
  },
  /* v14.3.8: a ramp that stops just short of the floor it leads to (a gap of up to 1.2 m: a catwalk in a warehouse) gets the gap floored
     over, the ramp's width. A CPU stopped at the gap (it keeps to the floors), and a player dropped through it. */
  bridge(T) {
    let n = 0;
    for (const q of T.ramps) { const { ux, uy, cx, cy, hl } = this.geo(q), wd = q.dir % 2 === 0 ? (q.y1 - q.y0) : (q.x1 - q.x0);
      for (const [s, lv] of [[1, q.lv + 1], [-1, q.lv]]) { if (lv === 0) continue;
        const ex = cx + s * ux * hl, ey = cy + s * uy * hl; if (this.floorAt(T, lv, ex + s * ux * 0.05, ey + s * uy * 0.05) || this.rampAt(T, lv, ex + s * ux * 0.05, ey + s * uy * 0.05, q)) continue;
        let d = 0; for (let k = 0.1; k <= 1.2; k += 0.1) if (this.floorAt(T, lv, ex + s * ux * k, ey + s * uy * k)) { d = k; break; } if (!d) continue;
        const f = T.floors.find(f => f.lv === lv && ex + s * ux * d >= f.x0 && ex + s * ux * d <= f.x1 && ey + s * uy * d >= f.y0 && ey + s * uy * d <= f.y1);
        const ax = [ex, ex + s * ux * (d + 0.05)], ay = [ey, ey + s * uy * (d + 0.05)];
        const r = ux ? { x0: Math.min(...ax), x1: Math.max(...ax), y0: q.y0, y1: q.y1 } : { x0: q.x0, x1: q.x1, y0: Math.min(...ay), y1: Math.max(...ay) };
        if (this.wallAt(T, lv, (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 0) || wd <= 0) continue;
        T.floors.push({ ...r, lv, kind: f ? f.kind : 'concrete' }); n++; } }
    return n;
  },
  roofs(T, avoid = []) {
    const W = T.size.width, H = T.size.height, L = 7, RW = 3, added = [];
    const bldgs = T.deco.filter(d => d.t === 'bldg' && !d.lv).sort((p, q) => q.w * q.h - p.w * p.h),   /* (biggest first: they need the most room) */ hitsAvoid = r => avoid.some(a => a.x0 < r.x1 && a.x1 > r.x0 && a.y0 < r.y1 && a.y1 > r.y0);
    for (const d of bldgs) {
      if (d.w * d.h < 180 && Math.max(d.w, d.h) < 18) continue;
      const top = this.roofLv(T, d); if (!top || top > 3) continue;
      const reaches = q => { const { ux, uy, cx, cy, hl } = this.geo(q), tx = cx + ux * (hl + 0.6), ty = cy + uy * (hl + 0.6); return q.lv + 1 === top && tx >= d.x && tx <= d.x + d.w && ty >= d.y && ty <= d.y + d.h; };
      let have = T.ramps.filter(reaches).length; const used = new Set();
      for (const side of ['s', 'n', 'e', 'w']) for (const f of [0.5, 0.3, 0.7, 0.2, 0.8, 0.4, 0.6]) {
        if (have >= 2 || used.has(side)) continue;
        const len = L * top, horizSide = side === 's' || side === 'n', span = horizSide ? d.w : d.h; if (span < RW + 2) continue;
        const c = (horizSide ? d.x : d.y) + span * f, a0 = c - RW / 2, a1 = c + RW / 2;
        /* out from the wall: the chain's rectangle, a run-up beyond its foot, and the wall it leans on must have no door there */
        const out = side === 's' ? [d.y + d.h, d.y + d.h + len] : side === 'n' ? [d.y - len, d.y] : side === 'e' ? [d.x + d.w, d.x + d.w + len] : [d.x - len, d.x];   /* (the top end meets the roof's edge exactly: no gap to fall through) */
        const rect = horizSide ? { x0: a0, x1: a1, y0: out[0], y1: out[1] } : { x0: out[0], x1: out[1], y0: a0, y1: a1 };
        const runUp = side === 's' ? { ...rect, y0: rect.y1, y1: rect.y1 + 2.2 } : side === 'n' ? { ...rect, y1: rect.y0, y0: rect.y0 - 2.2 } : side === 'e' ? { ...rect, x0: rect.x1, x1: rect.x1 + 2.2 } : { ...rect, x1: rect.x0, x0: rect.x0 - 2.2 };
        const big = { x0: Math.min(rect.x0, runUp.x0) - 0.4, y0: Math.min(rect.y0, runUp.y0) - 0.4, x1: Math.max(rect.x1, runUp.x1) + 0.4, y1: Math.max(rect.y1, runUp.y1) + 0.4 };
        if (big.x0 < 4 || big.y0 < 4 || big.x1 > W - 4 || big.y1 > H - 4 || hitsAvoid(big)) continue;
        const lvs = Array.from({ length: top + 1 }, (_, i) => i), bigNoWall = side === 's' ? { ...big, y0: rect.y0 + 0.25 } : side === 'n' ? { ...big, y1: rect.y1 - 0.25 } : side === 'e' ? { ...big, x0: rect.x0 + 0.25 } : { ...big, x1: rect.x1 - 0.25 };
        if (!this.clear(T, bigNoWall, lvs) || T.floors.some(fl => fl.lv >= 1 && fl.x0 < bigNoWall.x1 && fl.x1 > bigNoWall.x0 && fl.y0 < bigNoWall.y1 && fl.y1 > bigNoWall.y0 && !(fl.x0 >= d.x - 0.2 && fl.x1 <= d.x + d.w + 0.2 && fl.y0 >= d.y - 0.2 && fl.y1 <= d.y + d.h + 0.2))) continue;
        if (bldgs.some(o => o !== d && o.x < big.x1 && o.x + o.w > big.x0 && o.y < big.y1 && o.y + o.h > big.y0)) continue;
        const edge = side === 's' ? d.y + d.h : side === 'n' ? d.y : side === 'e' ? d.x + d.w : d.x;
        const solid = T.walls.filter(w => w.lv === 0 && w.kind !== 'door' && (horizSide ? Math.abs((w.y0 + w.y1) / 2 - edge) < 0.3 && w.x0 <= a0 + 0.01 && w.x1 >= a1 - 0.01 : Math.abs((w.x0 + w.x1) / 2 - edge) < 0.3 && w.y0 <= a0 + 0.01 && w.y1 >= a1 - 0.01)).length;
        if (!solid) continue;                                              // (a door there: try another spot)
        /* build it: the ramp touching the wall reaches the roof, each one further out is a storey lower */
        for (let j = 0; j < top; j++) {
          const lv = top - 1 - j, o0 = j * L, o1 = (j + 1) * L, kind = 'concrete';
          if (side === 's') T.ramps.push({ x0: a0, x1: a1, y0: rect.y0 + o0, y1: rect.y0 + o1, dir: 3, lv, kind, id: T.ramps.length });
          else if (side === 'n') T.ramps.push({ x0: a0, x1: a1, y0: rect.y1 - o1, y1: rect.y1 - o0, dir: 1, lv, kind, id: T.ramps.length });
          else if (side === 'e') T.ramps.push({ x0: rect.x0 + o0, x1: rect.x0 + o1, y0: a0, y1: a1, dir: 2, lv, kind, id: T.ramps.length });
          else T.ramps.push({ x0: rect.x1 - o1, x1: rect.x1 - o0, y0: a0, y1: a1, dir: 0, lv, kind, id: T.ramps.length });
        }
        T.trees = T.trees.filter(t => !(t.x > big.x0 && t.x < big.x1 && t.y > big.y0 && t.y < big.y1));
        T.loot = T.loot.filter(([x, y, lv]) => lv > 0 || !(x > rect.x0 - 0.5 && x < rect.x1 + 0.5 && y > rect.y0 - 0.5 && y < rect.y1 + 0.5));
        have++; used.add(side); added.push(d);
      }
    }
    return added.length;
  }
};
