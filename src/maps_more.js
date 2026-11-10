/* v14.2.1: Manhunt gets eight arenas (twelve from v14.2.6) (walls to hide behind, loops to run round, sliding gates and spinners), plus the open rink.
   They use the same arena kit as Capture the Flag and King of the Hill (modes_arena.js): carts bump off the walls, the CPU paths round
   them, and they're drawn in 3D and 2D. Pick one under Map, or Random for a different one each game. */
const W_ = (x0, y0, x1, y1, k = 'wall') => [x0, y0, x1, y1, k], CR = (x, y, s = 1.2) => [x - s / 2, y - s / 2, x + s / 2, y + s / 2, 'crate'];
ARENA_MAPS.hunt = {
  maze: { name: 'The Hedge Maze', size: { width: 48, height: 30 }, blurb: 'Long hedges with gaps: lose IT round a corner.',
    walls: [W_(8, 0.4, 8.6, 11, 'bags'), W_(8, 16, 8.6, 29.6, 'bags'), W_(16, 6, 16.6, 24, 'bags'), W_(24, 0.4, 24.6, 9, 'bags'), W_(24, 14, 24.6, 29.6, 'bags'), W_(32, 6, 32.6, 24, 'bags'), W_(40, 0.4, 40.6, 11, 'bags'), W_(40, 16, 40.6, 29.6, 'bags'),
      W_(16.6, 14.7, 22, 15.3, 'bags'), W_(26.6, 14.7, 32, 15.3, 'bags')], moving: [] },
  warehouse: { name: 'The Warehouse', size: { width: 56, height: 32 }, blurb: 'Rows of shelving with aisles between, and a forklift door that slides open and shut.',
    walls: [...[10, 18, 26, 34, 42].flatMap(x => [W_(x, 4, x + 1.4, 13, 'crate'), W_(x, 19, x + 1.4, 28, 'crate')]), W_(48, 0.4, 48.6, 12), W_(48, 20, 48.6, 31.6)],
    moving: [{ type: 'gate', w: 0.7, h: 8, a: [48.3, 16], b: [48.3, 24], period: 7 }] },
  pillars: { name: 'Pillar Park', size: { width: 44, height: 28 }, blurb: 'A forest of pillars: weave through them.',
    walls: [...[8, 14, 20, 26, 32, 38].flatMap((x, i) => [5, 11, 17, 23].map((y, j) => CR(x, y + ((i % 2) ? 3 : 0) - (j === 3 && i % 2 ? 6 : 0), 1.4)))], moving: [] },
  ring: { name: 'The Ring Road', size: { width: 50, height: 30 }, blurb: 'A big block in the middle with a loop all the way round it and four cut-throughs.',
    walls: [W_(12, 8, 22, 13), W_(28, 8, 38, 13), W_(12, 17, 22, 22), W_(28, 17, 38, 22)], moving: [{ type: 'spin', x: 25, y: 15, len: 2.2, speed: 0.9 }] },
  rooms: { name: 'Twin Rooms', size: { width: 58, height: 30 }, blurb: 'Two walled rooms with doorways on every side, and spinners in the hallway.',
    walls: [W_(8, 6, 24, 6.6), W_(8, 23.4, 24, 24), W_(8, 6.6, 8.6, 12.5), W_(8, 17.5, 8.6, 23.4), W_(23.4, 6.6, 24, 12.5), W_(23.4, 17.5, 24, 23.4),
      W_(34, 6, 50, 6.6), W_(34, 23.4, 50, 24), W_(34, 6.6, 34.6, 12.5), W_(34, 17.5, 34.6, 23.4), W_(49.4, 6.6, 50, 12.5), W_(49.4, 17.5, 50, 23.4), CR(16, 15, 2), CR(42, 15, 2)],
    moving: [{ type: 'spin', x: 29, y: 9, len: 2, speed: 1 }, { type: 'spin', x: 29, y: 21, len: 2, speed: -1 }] },
  zigzag: { name: 'Zigzag Alley', size: { width: 62, height: 26 }, blurb: 'Walls from the sides force a zigzag the whole length of the arena.',
    walls: [...[0, 1, 2, 3, 4].map(i => { const x = 11 + i * 10; return i % 2 ? W_(x, 0.4, x + 0.7, 16) : W_(x, 10, x + 0.7, 25.6); })],
    moving: [{ type: 'slide', w: 1.6, h: 1.6, a: [16, 4], b: [16, 22], period: 6 }, { type: 'slide', w: 1.6, h: 1.6, a: [36, 4], b: [36, 22], period: 7, phase: 0.5 }] },
  spinners: { name: 'Spinner City', size: { width: 46, height: 30 }, blurb: 'Open floor full of spinning bars and sliding gates: time your run.',
    walls: [CR(23, 15, 2.4), CR(8, 6), CR(38, 24), CR(8, 24), CR(38, 6)],
    moving: [{ type: 'spin', x: 14, y: 10, len: 2.6, speed: 0.7 }, { type: 'spin', x: 32, y: 10, len: 2.6, speed: -0.7 }, { type: 'spin', x: 14, y: 20, len: 2.6, speed: -0.8 }, { type: 'spin', x: 32, y: 20, len: 2.6, speed: 0.8 },
      { type: 'gate', w: 6, h: 0.7, a: [23, 4], b: [31, 4], period: 6 }, { type: 'gate', w: 6, h: 0.7, a: [23, 26], b: [15, 26], period: 6, phase: 0.5 }] },
  fort: { name: 'The Fort', size: { width: 54, height: 34 }, blurb: 'A fort in the middle with a gate on each side, and cover in every corner.',
    walls: [W_(18, 9, 24.5, 9.6), W_(29.5, 9, 36, 9.6), W_(18, 24.4, 24.5, 25), W_(29.5, 24.4, 36, 25), W_(18, 9.6, 18.6, 14.5), W_(18, 19.5, 18.6, 24.4), W_(35.4, 9.6, 36, 14.5), W_(35.4, 19.5, 36, 24.4),
      W_(5, 5, 9, 5.6, 'bags'), W_(45, 28.4, 49, 29, 'bags'), W_(5, 28.4, 9, 29, 'bags'), W_(45, 5, 49, 5.6, 'bags'), CR(27, 17, 1.6)],
    moving: [{ type: 'spin', x: 27, y: 4.5, len: 2, speed: 0.8 }, { type: 'spin', x: 27, y: 29.5, len: 2, speed: -0.8 }] },
  /* v14.2.6: four more */
  cross: { name: 'Crossroads', size: { width: 52, height: 34 }, blurb: 'Four city blocks and a crossroads in the middle with a spinner on it.',
    walls: [W_(6, 5, 21, 13), W_(31, 5, 46, 13), W_(6, 21, 21, 29), W_(31, 21, 46, 29), CR(13.5, 17, 1.2), CR(38.5, 17, 1.2)],
    moving: [{ type: 'spin', x: 26, y: 17, len: 2.6, speed: 0.75 }, { type: 'gate', w: 0.7, h: 5, a: [26, 2.5], b: [26, -3], period: 8 }, { type: 'gate', w: 0.7, h: 5, a: [26, 31.5], b: [26, 37], period: 8, phase: 0.5 }] },
  spiral: { name: 'The Spiral', size: { width: 50, height: 34 }, blurb: 'A square spiral of walls: run it round and round, or cut through the gaps.',
    walls: [W_(5, 4, 45, 4.6), W_(44.4, 4.6, 45, 30), W_(9, 29.4, 44.4, 30), W_(9, 9, 9.6, 29.4), W_(9.6, 9, 38, 9.6), W_(37.4, 9.6, 38, 24.5), W_(15, 23.9, 37.4, 24.5), W_(15, 14.5, 15.6, 23.9), W_(15.6, 14.5, 31, 15.1),
      W_(25, 4.6, 25.6, 6.5, 'bags'), W_(20, 24.5, 20.6, 27, 'bags'), CR(23, 19.5, 1.4)],
    moving: [{ type: 'slide', w: 1.6, h: 1.6, a: [12, 12], b: [12, 26], period: 6 }] },
  islands: { name: 'The Islands', size: { width: 56, height: 34 }, blurb: 'Islands of crates and sandbags in open water... well, open floor: cover everywhere, walls nowhere.',
    walls: [...[[10, 8], [22, 6], [34, 8], [46, 6], [10, 26], [22, 28], [34, 26], [46, 28], [16, 17], [28, 17], [40, 17]].flatMap(([x, y], i) => [CR(x, y, 1.6), i % 2 ? W_(x - 2.5, y + 1.4, x + 2.5, y + 2, 'bags') : W_(x - 2.5, y - 2, x + 2.5, y - 1.4, 'bags')])],
    moving: [{ type: 'spin', x: 22, y: 17, len: 1.8, speed: 1.1 }, { type: 'spin', x: 34, y: 17, len: 1.8, speed: -1.1 }] },
  bunker: { name: 'The Bunker', size: { width: 60, height: 36 }, blurb: 'A long bunker with rooms off a corridor down the middle, and blast doors that slide.',
    walls: [...[[6, 12], [16, 24], [28, 36], [40, 48], [52, 54]].flatMap(([a, b]) => [W_(a, 12, b, 12.6), W_(a, 23.4, b, 24)]), ...[6, 18, 30, 42, 54].flatMap(x => [W_(x - 0.3, 3, x + 0.3, 12), W_(x - 0.3, 24, x + 0.3, 33)]),
      W_(6, 3, 54, 3.6), W_(6, 32.4, 54, 33), CR(12, 7.5, 1.4), CR(36, 28.5, 1.4)],
    moving: [...[14, 26, 38, 50].flatMap((x, i) => [{ type: 'gate', w: 4, h: 0.7, a: [x, 12.3], b: [x + 4.5, 12.3], period: 6 + i, phase: i * 0.25 }, { type: 'gate', w: 4, h: 0.7, a: [x, 23.7], b: [x - 4.5, 23.7], period: 7 + i, phase: 0.5 - i * 0.1 }])] }
};
{
  const mv0 = Arena.movers; Arena.movers = function (m) { if (m && !m.gs) m.gs = {}; return mv0.call(this, m); };   // (Manhunt has no mode state of its own)
  const maps = ARENA_MAPS.hunt, keys = Object.keys(maps), I = GAME_INFO.hunt, c0 = I.court;
  I.opts = I.opts || [];
  if (!I.opts.some(o => o.key === 'map')) I.opts.unshift({ key: 'map', label: 'Map', values: ['random', ...keys, 'classic'], names: ['Random (a different arena each game)', ...keys.map(k => `${maps[k].name} (${maps[k].size.width} x ${maps[k].size.height} m)`), 'The open rink (classic)'], def: 'random',
    hint: () => { const x = maps[(modeOpts('hunt') || {}).map]; return x ? x.blurb : 'Walls, loops and moving gates to lose IT round.'; } });
  I.court = mini => (maps[mini && mini.map] || {}).size || (typeof c0 === 'function' ? c0(mini) : c0);
  const mc = miniCfg; miniCfg = function (kind, ...a) { const c = mc(kind, ...a); if (kind === 'hunt' && c) { let k = (modeOpts('hunt') || {}).map; if (k === undefined || k === 'random') k = keys[Math.floor(Math.random() * keys.length)]; c.map = k; } return c; };
  const P = MiniMatch.prototype, co = P.chairObstacles;
  P.chairObstacles = function (c) {                                      // bump off the walls and the moving parts
    const r = co.call(this, c); if (this.kind !== 'hunt' || !Arena.map(this) || c.benched) return r;
    const R = R_CART(), K = CONFIG.chair, mv = Arena.movers(this);
    for (const b of [...Arena.walls(this), ...mv.boxes]) MG.rectPush(c, R, b, K.boardBounce);
    for (const p of mv.posts) { const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy), mn = R + p.r; if (d < mn && d > 0) { c.x = p.x + dx / d * mn; c.y = p.y + dy / d * mn; const vn = c.vx * dx / d + c.vy * dy / d; if (vn < 0) { c.vx -= 1.6 * vn * dx / d; c.vy -= 1.6 * vn * dy / d; } } }
    return r;
  };
  const ko = P.kickoff;
  if (ko) P.kickoff = function (...a) {                                   // nobody starts inside a wall: slide out to the nearest open spot
    const r = ko.apply(this, a); if (this.kind !== 'hunt' || !Arena.map(this)) return r;
    for (const c of this.chairs) if (!Arena.free(this, c.x, c.y, 0.9)) { let best = null; for (let rr = 1; rr < 14 && !best; rr += 0.8) for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2, x = c.x + Math.cos(t) * rr, y = c.y + Math.sin(t) * rr; if (x > 1.5 && y > 1.5 && x < this.width - 1.5 && y < this.height - 1.5 && Arena.free(this, x, y, 0.9)) { best = { x, y }; break; } }
      if (best) Object.assign(c, { x: best.x, y: best.y, px: best.x, py: best.y }); }
    return r;
  };
  const ai0 = miniAI;
  miniAI = function (c, m, h) {                                           // the CPU paths round the walls: IT to its prey, runners where they want to go
    const cmd = ai0(c, m, h); if (m.kind !== 'hunt' || !Arena.map(m) || !cmd) return cmd;
    let goal = null; if (c.side === 1) { const prey = m.chairs.filter(o => o.side === 0 && !o.out).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0]; if (prey) goal = { x: prey.x, y: prey.y }; }
    return Arena.steer(c, m, cmd, goal);
  };
}

/* v14.2.6: Manhunt has no mode of its own, so its arena's walls were never drawn (you bumped into invisible walls on an open rink). Draw them in 3D and 2D */
{ const up = View3D.prototype.updateMini; View3D.prototype.updateMini = function (dt) { const r = up.call(this, dt); if (this.m && this.m.kind === 'hunt' && !modeOf(this.m)) Arena.draw3d(this); return r; };
  const P = GameScene.prototype, d2 = P.drawMini2D; P.drawMini2D = function (g) { const m = this.match; if (m && m.kind === 'hunt' && !modeOf(m)) { Arena.draw2d(m, g, true); Arena.draw2d(m, g, false); } return d2.call(this, g); };
}
