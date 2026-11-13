/* v14.1: huge Volt Royale maps for lots of teams (up to 40 carts), and GRIND RAILS.
   - Grind rails: drive (or jump) onto a rail where it comes down low and your cart locks on and slides along it, up and down the hills.
     Jump (X) to hop off anywhere; at the end of a rail you're thrown off forwards. A rail never hurts you when you leave it.
   - Volt Zoo: a safari with giraffes, elephants and zebras, the penguin cove on ice, the monkey jungle with a tree house, the big cats,
     the aquarium and the reptile house, and the zoo train: a rail all the way round the zoo you can grind.
   - Volt Land: a theme park: the Mega Coaster (a rail with big hills right round the park), the Wild Mouse, a giant Ferris wheel, the carousel,
     a castle in the middle, the drop tower, the haunted house, the arcade and the bumper cars.
   - Volt World: the biggest map of all: the Zoo, Volt Land, Volt City and Snow Peak together (for 40 carts). */
{ /* decorations that brFill must leave room for */
  const bf = brFill; brFill = function (M, ...a) { const tmp = []; for (const d of M.deco) { if (d.block) tmp.push({ x0: d.x - d.block, y0: d.y - d.block, x1: d.x + d.block, y1: d.y + d.block, lv: 0, kind: '_tmp' }); if (d.t === 'rail') for (const p of d.pts) tmp.push({ x0: d.x + p[0] - 1.5, y0: d.y + p[1] - 1.5, x1: d.x + p[0] + 1.5, y1: d.y + p[1] + 1.5, lv: 0, kind: '_tmp' }); }
    M.walls.push(...tmp); try { return bf(M, ...a); } finally { M.walls = M.walls.filter(w => w.kind !== '_tmp'); } };
}
const BRX = {
  build(name, size, theme, blurb, fn) { const decos = []; return brBuild(name, size, theme, blurb, B => { B.rail = (pts, col = 0xd8262e) => { const x = pts[0][0], y = pts[0][1]; decos.push({ t: 'rail', x, y, col, pts: pts.map(p => [p[0] - x, p[1] - y, p[2]]) }); };
    B.animal = (kind, x, y, a = 0, s = 1) => decos.push({ t: 'animal', kind, x, y, a, s, block: 1.6 * s }); B.big = (t, x, y, o = {}) => decos.push({ t, x, y, ...o }); fn(B); B.deco && decos.forEach(d => B.deco(d)); }); },
  /* a loop of points round a rectangle, with hills */
  loop(x0, y0, x1, y1, base, hills, step = 6) { const pts = [], per = 2 * (x1 - x0 + y1 - y0); let s = 0; const at = s => { s = ((s % per) + per) % per; const a = x1 - x0, b = y1 - y0; if (s < a) return [x0 + s, y0]; s -= a; if (s < b) return [x1, y0 + s]; s -= b; if (s < a) return [x1 - s, y1]; s -= a; return [x0, y1 - s]; };
    for (s = 0; s <= per; s += step) { const [x, y] = at(s), u = s / per; pts.push([x, y, base + hills(u)]); } return pts; }
};
const ANIMALS = {                                                         // a low-poly animal statue: [shape, colour, w, h, d, x, y, z] in metres, facing +x
  giraffe: { s: [['box', 0xe0b35a, 2.0, 1.0, 0.9, 0, 2.0, 0], ...[[-0.7, -0.3], [-0.7, 0.3], [0.7, -0.3], [0.7, 0.3]].map(([x, z]) => ['cyl', 0xe0b35a, 0.14, 1.6, 0, x, 0.8, z]), ['neck', 0xe0b35a, 0.22, 2.2, 0, 0.9, 3.0, 0], ['box', 0xe0b35a, 0.7, 0.4, 0.4, 1.4, 4.1, 0], ['box', 0x6b4a2b, 0.12, 0.3, 0.08, 1.2, 4.4, 0.12], ['box', 0x6b4a2b, 0.12, 0.3, 0.08, 1.2, 4.4, -0.12]], spots: 0x8b5a2b },
  elephant: { s: [['sph', 0x8f949b, 2.6, 2.0, 1.9, 0, 1.9, 0], ...[[-0.7, -0.5], [-0.7, 0.5], [0.7, -0.5], [0.7, 0.5]].map(([x, z]) => ['cyl', 0x8f949b, 0.35, 1.3, 0, x, 0.65, z]), ['sph', 0x8f949b, 1.2, 1.2, 1.1, 1.5, 2.5, 0], ['ear', 0x7f848b, 0.1, 1.1, 1.0, 1.3, 2.6, 0.7], ['ear', 0x7f848b, 0.1, 1.1, 1.0, 1.3, 2.6, -0.7], ['trunk', 0x8f949b, 0.18, 1.6, 0, 2.05, 1.7, 0], ['box', 0xf4f4f2, 0.5, 0.1, 0.1, 2.0, 2.1, 0.3], ['box', 0xf4f4f2, 0.5, 0.1, 0.1, 2.0, 2.1, -0.3]] },
  zebra: { s: [['box', 0xf4f4f2, 1.6, 0.8, 0.6, 0, 1.25, 0], ...[[-0.55, -0.2], [-0.55, 0.2], [0.55, -0.2], [0.55, 0.2]].map(([x, z]) => ['cyl', 0xf4f4f2, 0.1, 0.9, 0, x, 0.45, z]), ['neck', 0xf4f4f2, 0.16, 0.9, 0, 0.8, 1.7, 0], ['box', 0x1b1d20, 0.6, 0.3, 0.3, 1.2, 2.05, 0], ['box', 0x1b1d20, 0.8, 0.12, 0.08, 0.6, 1.95, 0]], stripes: 0x1b1d20 },
  penguin: { s: [['sph', 0x1b1d20, 0.6, 0.9, 0.55, 0, 0.5, 0], ['sph', 0xf4f4f2, 0.42, 0.7, 0.45, 0.12, 0.47, 0], ['sph', 0x1b1d20, 0.38, 0.38, 0.38, 0.02, 1.02, 0], ['box', 0xf2a516, 0.22, 0.06, 0.1, 0.24, 1.0, 0], ['box', 0xf2a516, 0.2, 0.05, 0.12, 0.08, 0.03, 0.1], ['box', 0xf2a516, 0.2, 0.05, 0.12, 0.08, 0.03, -0.1]] },
  lion: { s: [['box', 0xd9a441, 1.6, 0.8, 0.7, 0, 1.0, 0], ...[[-0.55, -0.22], [-0.55, 0.22], [0.55, -0.22], [0.55, 0.22]].map(([x, z]) => ['cyl', 0xd9a441, 0.14, 0.7, 0, x, 0.35, z]), ['sph', 0x9a5b1d, 1.0, 1.0, 1.0, 0.85, 1.45, 0], ['sph', 0xd9a441, 0.62, 0.62, 0.62, 1.05, 1.45, 0], ['box', 0x3b2a1e, 0.1, 0.1, 0.12, 1.36, 1.38, 0], ['cyl', 0xd9a441, 0.06, 0.9, 0, -0.95, 1.0, 0]] },
  monkey: { s: [['sph', 0x6b4a2b, 0.6, 0.7, 0.5, 0, 0.6, 0], ['sph', 0x6b4a2b, 0.45, 0.45, 0.45, 0.05, 1.12, 0], ['sph', 0xe8c39a, 0.3, 0.26, 0.3, 0.2, 1.08, 0], ['sph', 0xe8c39a, 0.16, 0.18, 0.06, 0, 1.15, 0.26], ['sph', 0xe8c39a, 0.16, 0.18, 0.06, 0, 1.15, -0.26], ['cyl', 0x6b4a2b, 0.06, 0.8, 0, -0.35, 0.8, 0]] },
  bear: { s: [['sph', 0x5e3b22, 1.7, 1.3, 1.1, 0, 1.0, 0], ...[[-0.5, -0.35], [-0.5, 0.35], [0.5, -0.35], [0.5, 0.35]].map(([x, z]) => ['cyl', 0x5e3b22, 0.22, 0.6, 0, x, 0.3, z]), ['sph', 0x5e3b22, 0.75, 0.7, 0.7, 0.95, 1.4, 0], ['sph', 0x8b6a45, 0.3, 0.25, 0.3, 1.3, 1.32, 0], ['sph', 0x5e3b22, 0.22, 0.22, 0.12, 0.85, 1.78, 0.25], ['sph', 0x5e3b22, 0.22, 0.22, 0.12, 0.85, 1.78, -0.25]] },
  flamingo: { s: [['sph', 0xff8fb0, 0.6, 0.45, 0.35, 0, 1.3, 0], ['cyl', 0xff8fb0, 0.03, 1.1, 0, 0, 0.55, 0.05], ['neck', 0xff8fb0, 0.05, 0.7, 0, 0.25, 1.65, 0], ['sph', 0xff8fb0, 0.18, 0.16, 0.16, 0.38, 2.0, 0], ['box', 0x1b1d20, 0.14, 0.05, 0.05, 0.5, 1.96, 0]] },
  shark: { s: [['sph', 0x6f8fa8, 3.2, 1.0, 1.0, 0, 1.6, 0], ['fin', 0x6f8fa8, 0.1, 0.9, 0.8, -0.1, 2.3, 0], ['fin', 0x6f8fa8, 0.1, 0.9, 0.7, -1.7, 1.7, 0], ['sph', 0xf4f4f2, 2.2, 0.4, 0.8, 0.3, 1.25, 0]] }
};
/* ---------------- Volt Zoo ---------------- */
const ZOO = BRX.build('Volt Zoo', { width: 210, height: 176 }, { ground: 0x5f8a3e, sky: 0xb8dcf4, grass: 0x5f8a3e }, 'A huge zoo: a safari, penguins on the ice, the monkey jungle and tree house, big cats, the aquarium, and the zoo train rail round the whole place to grind.', B => {
  const fence = (x0, y0, x1, y1, gaps = {}) => { B.side(x0, y0, x1, y0, gaps.n || [[0.5, 4]], 0, 'wood'); B.side(x0, y1, x1, y1, gaps.s || [[0.5, 4]], 0, 'wood'); B.side(x0, y0, x0, y1, gaps.w || [], 0, 'wood'); B.side(x1, y0, x1, y1, gaps.e || [], 0, 'wood'); };
  /* the entrance plaza (south) */
  B.building(90, 150, 30, 16, { doors: { n: [[0.3, 3], [0.7, 3]], s: [[0.5, 4]] }, kind: 'mall', loot: 4 }); for (const x of [80, 128]) B.building(x, 156, 8, 8, { doors: { n: [[0.5, 2.4]] }, kind: 'house', loot: 1 });
  /* the safari (west) */
  fence(14, 18, 84, 82, { e: [[0.5, 5]], s: [[0.3, 4], [0.8, 4]] });
  for (const [x, y, a] of [[30, 30, 0.4], [44, 26, -0.6], [58, 34, 2.2]]) B.animal('giraffe', x, y, a, 1);
  for (const [x, y, a] of [[30, 62, 0.2], [62, 66, 2.8]]) B.animal('elephant', x, y, a, 1);
  for (const [x, y, a] of [[46, 50, 1.2], [50, 54, 1.0], [54, 49, 1.5], [40, 46, 0.6]]) B.animal('zebra', x, y, a, 1);
  B.mesa(64, 40, 76, 52, 1, 'rock'); B.ramp(58, 43, 64, 49, 0, 0, 'rock'); B.loot(70, 46, 1); for (const [x, y] of [[22, 40], [72, 26], [20, 74], [76, 74]]) B.tree(x, y, 0.7); B.loot(36, 40, 0); B.loot(70, 60, 0);
  /* the penguin cove (north-west): ice shelves */
  B.deco({ t: 'field', x: 14, y: 92, w: 46, h: 30 }); B.mesa(18, 96, 34, 110, 1, 'stone'); B.ramp(34, 100, 40, 106, 2, 0, 'stone'); B.mesa(42, 108, 56, 118, 1, 'stone'); B.ramp(46, 102, 52, 108, 1, 0, 'stone');
  for (const [x, y, lv] of [[22, 100], [26, 104], [30, 99], [46, 112], [52, 114], [20, 116]]) B.animal('penguin', x, y, Math.random() * 6, 1);
  B.loot(26, 103, 1); B.loot(49, 113, 1);
  /* the monkey jungle and tree house (north centre) */
  for (let i = 0; i < 30; i++) { const a = i * 2.4, r = 6 + (i % 7) * 3; B.tree(104 + Math.cos(a) * r, 108 + Math.sin(a) * r * 0.8, 0.8); }
  B.mesa(98, 102, 110, 114, 2, 'wood'); B.ramp(110, 105, 118, 111, 2, 1, 'wood'); B.mesa(118, 103, 124, 113, 1, 'wood'); B.ramp(124, 105, 130, 111, 2, 0, 'wood');
  for (const [x, y] of [[102, 106], [106, 110], [120, 106]]) B.animal('monkey', x, y, 1, 1.2); B.loot(104, 108, 2); B.loot(121, 110, 1);
  /* the big cats (north-east) */
  fence(140, 18, 196, 66, { w: [[0.5, 5]] }); B.mesa(160, 30, 176, 42, 1, 'rock'); B.ramp(176, 33, 182, 39, 2, 0, 'rock'); for (const [x, y, a] of [[166, 36, 1], [150, 54, 2.5], [186, 56, 3.5]]) B.animal('lion', x, y, a, 1.1);
  B.animal('bear', 150, 26, 0.5, 1.2); B.loot(168, 35, 1); B.loot(186, 24, 0);
  /* the aquarium and the reptile house (east) */
  B.building(150, 80, 44, 30, { doors: { w: [[0.3, 3], [0.7, 3]], s: [[0.5, 4]] }, kind: 'warehouse', loot: 6 }); B.animal('shark', 172, 125, 0, 1.4);
  B.building(146, 132, 24, 16, { doors: { w: [[0.5, 3]], n: [[0.5, 3]] }, kind: 'bldg', loot: 3 }); B.ramp(170, 134, 176, 144, 1, 0, 'concrete'); B.floor(146, 132, 170, 148, 1, 'roof');
  /* the flamingo lagoon and the food court (middle) */
  B.deco({ t: 'field', x: 96, y: 52, w: 26, h: 18 }); for (let i = 0; i < 7; i++) B.animal('flamingo', 100 + i * 3, 58 + (i % 2) * 4, 1.4, 1);
  for (const [x, y] of [[96, 84], [106, 88], [116, 84], [126, 88]]) B.wall(x - 0.8, y - 0.8, x + 0.8, y + 0.8, 0, 'crate'); B.loot(110, 80, 0); B.loot(120, 92, 0);
  /* the zoo train: a rail all the way round, low at the two stations so you can drive onto it */
  B.rail(BRX.loop(8, 10, 202, 140, 0.5, u => { const st = Math.min(Math.abs(u - 0.1), Math.abs(u - 0.6)); return st < 0.025 ? 0 : Math.min(3.2, (st - 0.025) * 60) + 0.6 * Math.sin(u * 40); }, 4), 0x2f6fed);
  for (const [x, y] of [[4, 4], [204, 4], [4, 170], [204, 170], [90, 40], [130, 130]]) B.loot(x, y, 0);
});
/* ---------------- Volt Land ---------------- */
const LAND = BRX.build('Volt Land', { width: 220, height: 184 }, { ground: 0x4f7f3c, sky: 0xa8d8ff, grass: 0x4f7f3c }, 'A whole theme park: grind the Mega Coaster right round the park, ride the Wild Mouse, then fight round the castle, the Ferris wheel, the haunted house and the bumper cars.', B => {
  /* the Mega Coaster: big hills right round the park, down at the station by the gate */
  B.rail(BRX.loop(12, 12, 208, 170, 0.4, u => { const st = Math.abs(u - 0.62); if (st < 0.02) return 0; const k = Math.min(1, (st - 0.02) * 30); return k * (4 + 3.2 * Math.sin(u * Math.PI * 10) + 2.2 * Math.sin(u * Math.PI * 4)); }, 4), 0xd8262e);
  /* the Wild Mouse: zig-zags up on a platform */
  B.floor(150, 120, 170, 128, 1, 'metal'); B.ramp(170, 121, 178, 127, 2, 0, 'metal');
  { const pts = []; let x = 150, y = 124; pts.push([x, y, 2.6]); for (let i = 0; i < 6; i++) { y = i % 2 ? 124 : 100; x -= 8; pts.push([x + 4, (y + (i % 2 ? 100 : 124)) / 2, 3.4 + (i % 3)]); pts.push([x, y, 3 + (i % 2)]); } pts.push([x - 10, y, 1.2]); pts.push([x - 18, y, 0.3]); B.rail(pts, 0xffd23f); }
  /* the castle (middle): three tiers, ramps up, towers */
  B.mesa(86, 66, 134, 110, 1, 'stone'); B.mesa(96, 74, 124, 102, 2, 'stone'); B.mesa(104, 82, 116, 94, 3, 'stone');
  B.ramp(106, 110, 114, 118, 3, 0, 'stone'); B.ramp(124, 84, 132, 92, 2, 1, 'stone'); B.ramp(106, 66, 112, 74, 1, 2, 'stone');   // (each one onto the next tier)
  for (const [x, y] of [[86, 66], [132, 66], [86, 108], [132, 108]]) for (let L = 1; L < 4; L++) B.wall(x, y, x + 2, y + 2, L, 'silo');
  B.loot(90, 70, 1); B.loot(128, 104, 1); B.loot(100, 78, 2); B.loot(110, 88, 4);
  /* the Ferris wheel and the carousel */
  B.big('ferris', 40, 58, { r: 14, block: 6 }); B.wall(38, 56, 42, 60, 0, 'container'); B.loot(40, 66, 0);
  B.big('carousel', 176, 56, { r: 7, block: 8 }); B.floor(170, 50, 182, 62, 1, 'wood'); B.ramp(182, 53, 188, 59, 2, 0, 'wood'); B.loot(176, 56, 1);
  /* the drop tower */
  for (let L = 0; L < 7; L++) B.wall(58, 130, 62, 134, L, 'silo'); B.loot(60, 138, 0);
  /* the haunted house: a maze */
  B.building(20, 110, 30, 24, { doors: { e: [[0.2, 3]], n: [[0.8, 3]] }, kind: 'house', loot: 0 }); for (const [x0, y0, x1, y1] of [[24, 114, 24.4, 128], [30, 110, 30.4, 124], [36, 118, 36.4, 134], [42, 110, 42.4, 126], [24, 128, 36, 128.4], [36, 118, 46, 118.4]]) B.wall(x0, y0, x1, y1, 0, 'wall');
  for (const [x, y] of [[27, 116], [33, 130], [45, 114]]) B.loot(x, y, 0);
  /* the arcade, the food stalls, the bumper cars */
  B.building(150, 140, 36, 20, { doors: { n: [[0.25, 3], [0.75, 3]], w: [[0.5, 3]] }, kind: 'mall', loot: 5 }); B.ramp(186, 144, 192, 156, 1, 0, 'concrete'); B.floor(150, 140, 186, 160, 1, 'roof'); B.loot(170, 150, 1);
  for (const [x, y] of [[80, 140], [96, 146], [112, 140], [128, 146]]) B.building(x - 4, y - 3, 8, 6, { doors: { s: [[0.5, 2.2]] }, kind: 'house', loot: 1 });
  B.side(140, 20, 190, 20, [[0.5, 4]], 0, 'crate'); B.side(140, 40, 190, 40, [[0.5, 4]], 0, 'crate'); B.side(140, 20, 140, 40, [], 0, 'crate'); B.side(190, 20, 190, 40, [], 0, 'crate');
  for (const [x, y] of [[150, 26], [162, 33], [174, 27], [182, 34]]) B.wall(x - 0.8, y - 0.8, x + 0.8, y + 0.8, 0, 'container'); B.loot(166, 30, 0);
  for (const [x, y] of [[4, 4], [216, 4], [4, 180], [216, 180], [70, 30], [110, 30]]) B.loot(x, y, 0);
});
BR_MAPS.zoo = brBig('zoo', ZOO, 24, 'suburbs', 911); BR_MAPS.land = brBig('land', LAND, 24, 'suburbs', 912);
BR_MAPS.world = brJoin('Volt World', 'suburbs', { ground: 0x4f7a3a, sky: 0xa6d0f0, grass: 0x4f7a3a }, 'The biggest map of all, for up to 40 carts: the Zoo, Volt Land, Downtown, the Port, the Jungle and the Canyon, with country between.',
  [[ZOO, 14, 14], [LAND, 250, 10], [BR_BASE.downtown, 30, 214], [BR_BASE.port, 130, 220], [BR_BASE.jungle, 260, 220], [BR_BASE.canyon, 370, 216]], 486, 320, 8080);
BR_MAP_KEYS.length = 0; BR_MAP_KEYS.push(...Object.keys(BR_MAPS));
{ const o = GAME_INFO.br.opts.find(x => x.key === 'map'); o.values = ['random', ...BR_MAP_KEYS]; o.names = ['Random (a new map each game)', ...BR_MAP_KEYS.map(k => `${BR_MAPS[k].name} (${BR_MAPS[k].size.width} x ${BR_MAPS[k].size.height} m)`)];
  const c = GAME_INFO.br.opts.find(x => x.key === 'carts'); if (c) { c.values = [40, 50, 60, 70, 80, 90, 100]; c.def = 60; c.hint = 'Carts nobody drives are played by the CPU (40 to 100).'; } }

/* ---------------- grinding ---------------- */
const Rails = {
  of(M) {
    if (M._rails) return M._rails; const out = [];
    for (const d of M.deco) if (d.t === 'rail') { const curve = new THREE.CatmullRomCurve3(d.pts.map(p => new THREE.Vector3(d.x + p[0], p[2], d.y + p[1])), false, 'catmullrom', 0.3), len = curve.getLength(), n = Math.max(8, Math.ceil(len / 0.5)), P = curve.getSpacedPoints(n);
      const xs = P.map(p => p.x), ys = P.map(p => p.z); out.push({ d, P, len, n, ds: len / n, x0: Math.min(...xs) - 2, x1: Math.max(...xs) + 2, y0: Math.min(...ys) - 2, y1: Math.max(...ys) + 2 }); }
    return (M._rails = out);
  },
  at(R, s) { const f = Math.max(0, Math.min(R.n, s / R.ds)), i = Math.min(R.n - 1, Math.floor(f)), k = f - i, a = R.P[i], b = R.P[i + 1]; return { x: a.x + (b.x - a.x) * k, y: a.z + (b.z - a.z) * k, z: a.y + (b.y - a.y) * k, tx: (b.x - a.x) / R.ds, ty: (b.z - a.z) / R.ds, tz: (b.y - a.y) / R.ds }; }
};
{ const M = MODES.br, mv = M.move, jp = M.jump;
  M.move = function (m, c, h) {
    const G = c.gs, g = m.gs;
    if (G.grind) {
      const rails = Rails.of(this.map(m)), R = rails[G.grind.r]; if (!R) { G.grind = null; return mv.call(this, m, c, h); }
      const p0 = Rails.at(R, G.grind.s); G.grind.v = Math.max(9, Math.min(18, G.grind.v - G.grind.dir * p0.tz * 9 * h + (G.boost > 0 ? 6 * h : 0)));
      G.grind.s += G.grind.dir * G.grind.v * h; const looped = R.d.loop || (Math.hypot(R.P[0].x - R.P[R.n].x, R.P[0].z - R.P[R.n].z) < 6);
      if (looped && (G.grind.s < 0 || G.grind.s > R.len)) G.grind.s = (G.grind.s + R.len) % R.len;
      if (G.grind.s <= 0 || G.grind.s >= R.len) return this.offRail(m, c, 2.5);
      const p = Rails.at(R, G.grind.s); c.px = c.x; c.py = c.y; c.x = p.x; c.y = p.y; G.z = p.z + 0.12; G.lv = Math.max(0, Math.floor((G.z + 0.3) / BR.H)); c.vx = p.tx * G.grind.dir * G.grind.v; c.vy = p.ty * G.grind.dir * G.grind.v; c.angle = c.heading = Math.atan2(c.vy, c.vx);
      G.air = 1; G.vz = 0; G.ramp = -1; if ((G.grind.sfx = (G.grind.sfx || 0) + h) > 0.22 && c.player) { G.grind.sfx = 0; m.sfx('drift'); }
      return;
    }
    mv.call(this, m, c, h);
    if (!c.player || c.out || G.down || (G.noGrind || 0) > g.t) return;
    for (let r = 0, rails = Rails.of(this.map(m)); r < rails.length; r++) { const R = rails[r]; if (c.x < R.x0 || c.x > R.x1 || c.y < R.y0 || c.y > R.y1) continue;
      let best = -1, bd = 1.0; for (let i = 0; i <= R.n; i += 1) { const P = R.P[i], d = Math.hypot(P.x - c.x, P.z - c.y); if (d < bd) { const dz = P.y - (G.z || 0); if (dz > -1.2 && dz < (G.air ? 1.0 : 0.7)) { bd = d; best = i; } } }
      if (best < 0) continue; const s = best * R.ds, p = Rails.at(R, s), sp = Math.hypot(c.vx, c.vy), dir = (c.vx * p.tx + c.vy * p.ty) >= 0 ? 1 : -1;
      G.grind = { r, s, dir, v: Math.max(9, sp) }; G.air = 1; G.vz = 0; m.sfx('pickup'); if (this.say) this.say(m, c, 'GRIND!'); return; }
  };
  M.offRail = function (m, c, vz) { const G = c.gs; G.grind = null; G.air = 1; G.vz = vz; G.noGrind = m.gs.t + 0.8; G.kickJ = 1; G.ramp = -1; };
  M.jump = function (c, m) { if (c.gs.grind) { this.offRail(m, c, BR.jumpV); m.sfx('bump'); return; } return jp.call(this, c, m); };
}

/* ---------------- drawing: rails, animals, the Ferris wheel, the carousel ---------------- */
{ const P = View3D.prototype, bw = P.buildBRWorld, upd = P.update;
  P.buildBRWorld = function (...a) {
    const r = bw.apply(this, a), m = this.m, M = MODES.br.map(m), g = this.arena; if (!g) return r; this.brSpin = [];
    const steel = new THREE.MeshStandardMaterial({ color: 0xb9c1ca, roughness: 0.3, metalness: 0.8 }), mats = new Map(), mat = c => { if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.15 })); return mats.get(c); };
    for (const R of Rails.of(M)) {
      const curve = new THREE.CatmullRomCurve3(R.P, false); g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(1200, R.n), 0.09, 8), new THREE.MeshStandardMaterial({ color: R.d.col || 0xd8262e, roughness: 0.3, metalness: 0.6 })));
      for (const off of [-0.45, 0.45]) { const side = R.P.map((p, i) => { const q = R.P[Math.min(R.n, i + 1)], b = R.P[Math.max(0, i - 1)], tx = q.x - b.x, tz = q.z - b.z, l = Math.hypot(tx, tz) || 1; return new THREE.Vector3(p.x - tz / l * off, p.y - 0.18, p.z + tx / l * off); }); g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(side), Math.min(1200, R.n), 0.04, 6), steel)); }
      const posts = []; for (let i = 0; i <= R.n; i += Math.max(1, Math.round(5 / R.ds))) { const p = R.P[i]; if (p.y < 0.6) continue; posts.push(new THREE.CylinderGeometry(0.09, 0.12, p.y, 6).translate(p.x, p.y / 2, p.z)); }
      if (posts.length) g.add(new THREE.Mesh(G3.merge(posts), steel));
    }
    for (const d of M.deco) {
      if (d.t === 'animal' && ANIMALS[d.kind]) { const A = ANIMALS[d.kind], grp = new THREE.Group();
        for (const [sh, col, w, h, dd, x, y, z] of A.s) { let geo;
          if (sh === 'box') geo = new THREE.BoxGeometry(w, h, dd); else if (sh === 'sph') geo = new THREE.SphereGeometry(0.5, 14, 10).scale(w, h, dd); else if (sh === 'cyl') geo = new THREE.CylinderGeometry(w, w * 0.9, h, 8); else if (sh === 'neck' || sh === 'trunk') geo = new THREE.CylinderGeometry(w * 0.8, w, h, 8).rotateZ(sh === 'neck' ? -0.45 : 0.25); else if (sh === 'ear') geo = new THREE.SphereGeometry(0.5, 10, 8).scale(w, h, dd); else geo = new THREE.ConeGeometry(dd / 2, h, 4).scale(0.3, 1, 1);
          const me = new THREE.Mesh(geo, mat(col)); me.position.set(x, y, z); me.castShadow = true; grp.add(me); }
        if (A.stripes || A.spots) for (let i = 0; i < 6; i++) { const me = new THREE.Mesh(A.stripes ? new THREE.BoxGeometry(0.08, 0.82, 0.62) : new THREE.SphereGeometry(0.16, 8, 6).scale(1, 1, 0.3), mat(A.stripes || A.spots)); me.position.set(-0.6 + i * 0.24, A.stripes ? 1.25 : 1.8 + (i % 2) * 0.3, A.stripes ? 0 : 0.46); grp.add(me); }
        grp.scale.setScalar(d.s || 1); grp.position.set(d.x, 0, d.y); grp.rotation.y = -(d.a || 0); g.add(grp); }
      if (d.t === 'ferris') { const wheel = new THREE.Group(), rr = d.r, hub = rr + 1.5;
        wheel.add(new THREE.Mesh(new THREE.TorusGeometry(rr, 0.18, 8, 64), steel), new THREE.Mesh(new THREE.TorusGeometry(rr * 0.92, 0.1, 6, 64), mat(0xff5fa2)));
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, sp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, rr, 4), steel); sp.position.set(Math.cos(a) * rr / 2, Math.sin(a) * rr / 2, 0); sp.rotation.z = a + Math.PI / 2; wheel.add(sp);
          const cab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), mat([0xffd23f, 0x3dd6ff, 0xd8262e, 0x7dff6a][i % 4])); cab.position.set(Math.cos(a) * rr, Math.sin(a) * rr - 0.8, 0); cab.userData.cab = true; wheel.add(cab); }
        wheel.position.set(d.x, hub, d.y); g.add(wheel); for (const sd of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, hub * 1.15, 6), steel); leg.position.set(d.x + sd * 3, hub / 2, d.y + 1.2); leg.rotation.z = sd * 0.2; g.add(leg); const leg2 = leg.clone(); leg2.position.z = d.y - 1.2; g.add(leg2); }
        this.brSpin.push(t => { wheel.rotation.z = t * 0.12; wheel.children.forEach(o => { if (o.userData.cab) o.rotation.z = -t * 0.12; }); }); }
      if (d.t === 'carousel') { const car = new THREE.Group(), rr = d.r;
        { const roof = new THREE.Mesh(new THREE.ConeGeometry(rr + 0.6, 2.4, 24), mat(0xd8262e)); roof.position.set(0, 6.6, 0); car.add(roof); }
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), mat(0xffd23f)); pole.position.set(Math.cos(a) * (rr - 1), 3.9, Math.sin(a) * (rr - 1)); car.add(pole);
          const horse = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.35), mat([0xf4f4f2, 0x3dd6ff, 0xff5fa2][i % 3])); horse.position.set(pole.position.x, 3.6, pole.position.z); horse.rotation.y = -a; horse.userData.i = i; car.add(horse); }
        car.position.set(d.x, 0, d.y); g.add(car); this.brSpin.push(t => { car.rotation.y = t * 0.5; car.children.forEach(o => { if (o.userData.i !== undefined) o.position.y = 3.6 + 0.3 * Math.sin(t * 2 + o.userData.i); }); }); }
    }
    return r;
  };
  P.update = function (dt) { const r = upd.call(this, dt); if (this.brSpin && this.m && this.m.kind === 'br') { const t = performance.now() / 1000; for (const f of this.brSpin) f(t); } return r; };
}
