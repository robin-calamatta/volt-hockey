/* v14.2.1: Volt Royale is two huge maps, each with lots of places to land (POIs), real elevation and places underground:
   - VOLT VALLEY: Volt City, Downtown, the Port, the Suburbs, Volt Arena, the Factory, the Airfield, plus three new ones:
       The Mines (a mountain full of tunnels and caverns, a summit on top), the Volcano (three tiers up to a crater rim, a lava tube
       underneath) and Bunker Hill (a bunker of rooms under a hill, a pillbox on top).
   - FROSTFALL WILDS: Snow Peak, Thrill Park, the Jungle, the Canyon and Castle Hill, plus four new ones:
       the Crystal Caves (a cave network under a two-tier mountain), the Sky Mesas (mesas of four heights joined by bridges, with kickers),
       the Hidden Lab (an underground lab in a cliff, a helipad above) and the Lumber Camp.
   "Underground" means under a hill: the hill's top is a floor one level up, and the tunnels and rooms are carved out of the rock below it.
   The older maps are still in the code, but the menu only offers these two (and Random).
   Loot: chests and items now sit mostly indoors and underground (anywhere with a roof over it); the open ground gets only a sprinkle. */
if (typeof BR_FLOORS !== "undefined") BR_FLOORS.grass = 0x5f8a3e;   // (grassy hilltops)
{
  const rectMinus = (f, holes) => { let parts = [{ ...f }]; for (const h of holes) { const next = []; for (const p of parts) { if (h.x1 <= p.x0 || h.x0 >= p.x1 || h.y1 <= p.y0 || h.y0 >= p.y1) { next.push(p); continue; }
    if (h.y0 > p.y0) next.push({ x0: p.x0, y0: p.y0, x1: p.x1, y1: h.y0 }); if (h.y1 < p.y1) next.push({ x0: p.x0, y0: h.y1, x1: p.x1, y1: p.y1 });
    const y0 = Math.max(p.y0, h.y0), y1 = Math.min(p.y1, h.y1); if (h.x0 > p.x0) next.push({ x0: p.x0, y0, x1: h.x0, y1 }); if (h.x1 < p.x1) next.push({ x0: h.x1, y0, x1: p.x1, y1 }); } parts = next; } return parts.filter(p => p.x1 - p.x0 > 0.05 && p.y1 - p.y0 > 0.05); };
  const R = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 });
  /* a builder with kickers (a ramp that ends in mid-air) */
  const build = (name, size, theme, blurb, fn) => { const kicks = []; const M = BRX.build(name, size, theme, blurb, B => { const r0 = B.ramp; let n = 0; B.ramp = (...a) => { n++; return r0(...a); }; B.kicker = (...a) => { kicks.push(n); B.ramp(...a); };
    /* a hill: its top is a floor at level `lv`; below it, solid rock except the tunnels and rooms carved out at ground level (underground) */
    B.hill = (r, lv, carves = [], top = 'rock') => { B.floor(r.x0, r.y0, r.x1, r.y1, lv, top); for (let L = 1; L < lv; L++) B.wall(r.x0, r.y0, r.x1, r.y1, L, 'cliff'); for (const q of rectMinus(r, carves)) B.wall(q.x0, q.y0, q.x1, q.y1, 0, 'cliff'); for (const c of carves) B.deco({ t: 'cavefloor', x: c.x0, y: c.y0, w: c.x1 - c.x0, h: c.y1 - c.y0 }); };
    /* a tier on top of something at level lv-1: cliff walls at lv-1 and a floor at lv, with optional holes (a crater) */
    B.tier = (r, lv, holes = [], top = 'rock') => { for (const q of rectMinus(r, holes)) { B.wall(q.x0, q.y0, q.x1, q.y1, lv - 1, 'cliff'); B.floor(q.x0, q.y0, q.x1, q.y1, lv, top); } };
    fn(B); }); kicks.forEach(i => { if (M.ramps[i]) M.ramps[i].kick = 1; }); return M; };

  /* ---------------- The Mines ---------------- */
  const mines = build('The Mines', { width: 96, height: 84 }, { ground: 0x7a6a55, sky: 0xb8c8d8, grass: 0x6a7a4a }, 'A mountain riddled with mine tunnels and caverns, with a summit on top.', B => {
    const mt = R(16, 12, 80, 72);
    const carves = [R(16, 38, 80, 44), R(46, 12, 52, 72), R(22, 18, 36, 30), R(36, 22, 46, 26), R(60, 52, 74, 66), R(52, 57, 60, 61), R(58, 18, 74, 30), R(52, 22, 58, 26), R(38, 32, 60, 50)];
    B.hill(mt, 1, carves); B.tier(R(30, 24, 66, 60), 2, [], 'rock');                 // the summit: a second tier on the mountain top
    for (const [x, y] of [[29, 24], [67, 59], [66, 24], [49, 41], [42, 46]]) B.loot(x, y, 0);   // in the caverns (underground)
    B.loot(48, 30, 2); B.loot(56, 52, 2); B.loot(22, 66, 1); B.loot(74, 16, 1);
    B.ramp(22, 4, 30, 12, 1, 0, 'rock'); B.ramp(66, 72, 74, 80, 3, 0, 'rock');       // up onto the mountain from the north and south
    B.ramp(20, 50, 30, 56, 0, 1, 'rock');                                            // and up onto the summit
    B.kicker(56, 60, 62, 66, 1, 1, 'wood');                                          // a jump off the summit's south side... (a kicker on the first tier)
    for (const [x, y] of [[8, 30], [88, 50], [10, 76], [86, 8]]) B.wall(x - 1.2, y - 1.2, x + 1.2, y + 1.2, 0, 'crate');   // ore crates outside
    B.building(84, 26, 10, 8, { doors: { w: [[0.5, 2.6]] }, kind: 'hut', loot: 1 }); B.building(2, 52, 10, 8, { doors: { e: [[0.5, 2.6]] }, kind: 'hut', loot: 1 });
  });

  /* ---------------- The Volcano ---------------- */
  const volcano = build('The Volcano', { width: 88, height: 88 }, { ground: 0x5a4a40, sky: 0xc8b8a8, grass: 0x6a6a40 }, 'Three tiers up to a crater rim; a lava tube runs right under the mountain.', B => {
    const t1 = R(8, 8, 80, 80), tube = [R(8, 41, 80, 47), R(34, 34, 54, 54)];
    B.hill(t1, 1, tube, 'rock'); B.tier(R(20, 20, 68, 68), 2, [], 'rock'); B.tier(R(30, 30, 58, 58), 3, [R(37, 37, 51, 51)], 'rock');   // the rim, with the crater in it (the crater floor is tier two)
    B.ramp(0, 24, 8, 30, 0, 0, 'rock'); B.ramp(80, 58, 88, 64, 2, 0, 'rock');        // onto tier one from west and east
    B.ramp(12, 24, 20, 30, 0, 1, 'rock'); B.ramp(68, 58, 76, 64, 2, 1, 'rock');      // onto tier two
    B.ramp(24, 31, 30, 36, 0, 2, 'rock');                                            // onto the rim
    B.ramp(39, 46, 45, 50, 3, 2, 'rock');                                            // (a way out of the crater: up to the rim's inner edge)
    B.kicker(58, 36, 64, 40, 0, 2, 'rock');                                          // a jump off tier two
    for (const [x, y] of [[44, 44], [40, 40], [48, 48]]) B.loot(x, y, 0);          // in the lava tube's chamber
    for (const [x, y] of [[42, 41], [47, 47], [44, 39]]) B.loot(x, y, 2);          // in the crater
    B.loot(33, 33, 3); B.loot(22, 70, 1); B.loot(64, 22, 2);
  });

  /* ---------------- Bunker Hill ---------------- */
  const bunker = build('Bunker Hill', { width: 80, height: 70 }, { ground: 0x5a7a3a, sky: 0xb0c8e0, grass: 0x5a7a3a }, 'A grassy hill with a bunker of rooms dug in under it, and a pillbox on top.', B => {
    const hall = R(26, 24, 54, 46), carves = [R(10, 32, 26, 38), R(54, 32, 70, 38), hall, R(28, 14, 38, 24), R(42, 14, 52, 24), R(28, 46, 38, 56), R(42, 46, 52, 56)];
    B.hill(R(10, 10, 70, 60), 1, carves, 'grass');
    B.side(26, 24, 54, 24, [[0.25, 2.4], [0.75, 2.4]], 0, 'bldg'); B.side(26, 46, 54, 46, [[0.25, 2.4], [0.75, 2.4]], 0, 'bldg');   // the hall's walls, with doors into the four rooms
    for (const [x, y] of [[33, 19], [47, 19], [33, 51], [47, 51], [40, 35]]) B.loot(x, y, 0);   // underground
    B.building(32, 28, 16, 12, { doors: { n: [[0.5, 2.6]], s: [[0.5, 2.6]] }, kind: 'bldg', loot: 1, lv: 1 });   // the pillbox (on the hill)
    B.ramp(36, 2, 44, 10, 1, 0, 'grass'); B.ramp(36, 60, 44, 68, 3, 0, 'grass');
    for (const [x, y] of [[16, 16], [64, 16], [16, 54], [64, 54]]) B.wall(x - 1, y - 0.4, x + 1, y + 0.4, 1, 'crate');   // sandbags on top
  });

  /* ---------------- The Crystal Caves ---------------- */
  const caves = build('The Crystal Caves', { width: 96, height: 84 }, { ground: 0x6a7480, sky: 0xc4d8ec, grass: 0x7a8a6a }, 'A two-tier mountain with a maze of caves underneath.', B => {
    const carves = [R(12, 20, 40, 26), R(34, 26, 40, 50), R(14, 44, 34, 50), R(40, 44, 66, 50), R(56, 20, 62, 44), R(62, 20, 84, 26), R(66, 56, 84, 62), R(60, 50, 66, 62), R(20, 56, 32, 70), R(44, 30, 54, 40)];
    B.hill(R(12, 12, 84, 72), 1, carves, 'rock'); B.tier(R(24, 30, 72, 64), 2, [], 'rock');
    for (const [x, y] of [[49, 35], [26, 63], [72, 59], [20, 47], [70, 23]]) B.loot(x, y, 0);
    for (const [x, y] of [[44, 34], [54, 40], [30, 66], [76, 60], [48, 46]]) B.wall(x - 0.4, y - 0.4, x + 0.4, y + 0.4, 0, 'column');   // crystal pillars in the caves
    B.ramp(46, 4, 54, 12, 1, 0, 'rock'); B.ramp(84, 36, 92, 42, 2, 0, 'rock'); B.ramp(16, 34, 24, 40, 0, 1, 'rock');
    B.loot(48, 46, 2); B.loot(66, 34, 2); B.loot(80, 16, 1);
    B.kicker(66, 64, 72, 68, 1, 1, 'rock');
  });

  /* ---------------- The Sky Mesas ---------------- */
  const mesas = build('The Sky Mesas', { width: 92, height: 92 }, { ground: 0xa8643a, sky: 0xe0c8a8, grass: 0x9a7a4a }, 'Mesas of four heights joined by bridges, with kickers off the edges.', B => {
    B.mesa(10, 10, 30, 30, 1, 'rock'); B.mesa(40, 8, 60, 28, 2, 'rock'); B.mesa(64, 36, 84, 56, 3, 'rock'); B.mesa(36, 60, 56, 82, 4, 'rock'); B.mesa(10, 50, 26, 70, 2, 'rock');
    B.ramp(10, 30, 16, 38, 3, 0, 'rock');                                            // ground to mesa one (lv1)
    B.floor(30, 16, 40, 20, 1, 'wood'); B.ramp(30, 20, 40, 24, 0, 1, 'wood');       // bridge from mesa one, then a ramp up to mesa two (lv2)
    B.floor(56, 28, 60, 36, 2, 'wood'); B.ramp(60, 30, 64, 36, 0, 2, 'wood');       // mesa two to mesa three (lv3)
    B.floor(60, 56, 64, 64, 3, 'wood'); B.ramp(56, 60, 60, 66, 2, 3, 'wood');       // mesa three to mesa four (lv4): the top
    B.ramp(26, 56, 34, 62, 2, 0, 'rock');                                            // ground to the little mesa (lv2): a long climb... in two goes
    B.kicker(80, 56, 84, 62, 1, 3, 'rock'); B.kicker(52, 82, 56, 88, 1, 4, 'rock'); B.kicker(4, 18, 10, 22, 2, 1, 'rock');
    for (const [x, y, lv] of [[20, 20, 1], [50, 18, 2], [74, 46, 3], [46, 70, 4], [46, 76, 4], [18, 60, 2]]) B.loot(x, y, lv);
    B.building(66, 70, 12, 10, { doors: { w: [[0.5, 2.6]] }, kind: 'hut', loot: 2 }); B.building(70, 8, 12, 10, { doors: { s: [[0.5, 2.6]] }, kind: 'hut', loot: 2 });
  });

  /* ---------------- The Hidden Lab ---------------- */
  const lab = build('The Hidden Lab', { width: 90, height: 76 }, { ground: 0x6b6f73, sky: 0xb4c4d4, grass: 0x5a6a4a }, 'A secret lab dug into a cliff: corridors, labs and a server room underground, a helipad on top.', B => {
    const carves = [R(10, 34, 30, 40), R(30, 20, 60, 54), R(60, 34, 80, 40), R(38, 54, 44, 66), R(36, 10, 54, 20)];
    B.hill(R(10, 10, 80, 66), 2, carves, 'concrete');
    B.side(30, 20, 60, 20, [[0.5, 3]], 0, 'bldg'); B.side(30, 54, 60, 54, [[0.3, 3]], 0, 'bldg');
    for (const [x0, y0, x1, y1] of [[34, 26, 40, 28], [50, 26, 56, 28], [34, 46, 40, 48], [50, 46, 56, 48]]) B.wall(x0, y0, x1, y1, 0, 'crate');   // lab benches
    for (const [x, y] of [[37, 31], [53, 31], [37, 43], [53, 43], [45, 15], [45, 37]]) B.loot(x, y, 0);   // underground
    B.ramp(2, 20, 10, 26, 0, 0, 'concrete'); B.floor(10, 20, 16, 26, 1, 'concrete');   // a road up the cliff: to a ledge at level one...
    B.wall(10, 10, 16, 20, 1, 'cliff'); B.ramp(10, 14, 16, 20, 3, 1, 'concrete');   // ...then up to the top (level two)
    B.floor(38, 26, 52, 40, 3, 'metal'); B.ramp(52, 30, 58, 36, 2, 2, 'metal'); B.wall(38, 26, 52, 40, 2, 'silo');   // the helipad, up on a block
    B.loot(45, 33, 3); B.loot(70, 60, 2); B.loot(20, 60, 2);
  });

  /* ---------------- The Lumber Camp ---------------- */
  const lumber = build('The Lumber Camp', { width: 72, height: 62 }, { ground: 0x5a6a3a, sky: 0xb4d0ec, grass: 0x4a6a3a }, 'A sawmill, cabins, log piles and a water tower in the woods.', B => {
    B.building(8, 8, 24, 16, { doors: { s: [[0.3, 3], [0.7, 3]], e: [[0.5, 3]] }, kind: 'warehouse', loot: 3 });
    for (const [x, y] of [[40, 8], [54, 8], [40, 22], [54, 22]]) B.building(x, y, 10, 8, { doors: { s: [[0.5, 2.4]] }, kind: 'hut', loot: 1 });
    for (let i = 0; i < 6; i++) B.wall(10 + i * 4, 32, 12.4 + i * 4, 40, 0, 'log');
    for (let L = 0; L < 3; L++) B.wall(56, 40, 60, 44, L, 'silo'); B.floor(54, 38, 62, 46, 3, 'wood'); B.ramp(62, 39, 66, 45, 2, 2, 'wood'); B.floor(62, 46, 66, 50, 2, 'wood'); B.ramp(62, 50, 66, 58, 3, 1, 'wood'); B.floor(66, 50, 70, 58, 1, 'wood'); B.ramp(66, 58, 70, 62, 3, 0, 'wood');
    B.loot(58, 42, 3);
    for (let i = 0; i < 40; i++) { const a = i * 2.39, r = 3 + (i % 9) * 3.2; const x = 36 + Math.cos(a) * r * 1.1, y = 46 + Math.sin(a) * r * 0.5; if (x > 2 && x < 50 && y > 42 && y < 60) B.tree(x, y, 0.6); }
  });

  /* ---------------- The Farmstead ---------------- */
  const farm = build('The Farmstead', { width: 84, height: 64 }, { ground: 0x7a9a4a, sky: 0xb8d8f0, grass: 0x7a9a4a }, 'A big red barn with a hay loft, a farmhouse, silos and fenced fields.', B => {
    B.building(8, 8, 26, 18, { doors: { s: [[0.5, 4]], e: [[0.5, 3]] }, kind: 'barn', roof: false, loot: 2 }); B.floor(8, 8, 34, 14, 1, 'wood'); B.floor(8, 8, 34, 26, 2, 'roof'); B.ramp(10, 14, 16, 20, 3, 0, 'wood');   // the barn: a loft along the back, a roof over it all
    B.loot(20, 11, 1); B.loot(28, 11, 1);
    B.building(46, 8, 16, 12, { doors: { s: [[0.5, 2.4]] }, kind: 'house', loot: 2 });
    for (const [x, y] of [[70, 10], [76, 10]]) for (let L = 0; L < 3; L++) B.wall(x - 2, y - 2, x + 2, y + 2, L, 'silo');
    B.side(40, 34, 80, 34, [[0.2, 4]], 0, 'wood'); B.side(40, 58, 80, 58, [[0.8, 4]], 0, 'wood'); B.side(40, 34, 40, 58, [], 0, 'wood'); B.side(80, 34, 80, 58, [], 0, 'wood');
    for (let i = 0; i < 5; i++) B.wall(46 + i * 6, 44, 48 + i * 6, 46, 0, 'crate');   // hay bales
    B.building(8, 36, 14, 10, { doors: { e: [[0.5, 2.6]] }, kind: 'hut', loot: 1 }); B.loot(60, 50, 0);
  });
  /* ---------------- The Truck Stop ---------------- */
  const truck = build('The Truck Stop', { width: 70, height: 56 }, { ground: 0x8a8070, sky: 0xd8c8a8, grass: 0x9a8a5a }, 'A gas station with a canopy you can drive on, a diner, a garage and parked rigs.', B => {
    B.building(8, 8, 18, 12, { doors: { s: [[0.3, 2.4], [0.75, 2.4]] }, kind: 'diner', loot: 2 });
    B.floor(34, 10, 58, 24, 1, 'metal'); for (const [x, y] of [[36, 12], [56, 12], [36, 22], [56, 22]]) B.wall(x - 0.3, y - 0.3, x + 0.3, y + 0.3, 0, 'column'); B.ramp(58, 13, 64, 21, 2, 0, 'metal');   // the canopy (and a ramp up onto it)
    for (const x of [42, 50]) B.wall(x - 1, 16, x + 1, 18, 0, 'crate');   // the pumps
    B.loot(46, 17, 1); B.loot(46, 13, 0);
    B.building(10, 32, 22, 14, { doors: { e: [[0.5, 5]] }, kind: 'warehouse', loot: 2 });
    for (const [x, y] of [[40, 34], [40, 42], [52, 34]]) B.wall(x, y, x + 9, y + 3, 0, 'container');
  });

  /* a huge map: the places, the country between them, biomes, a few rez garages, unique buildings */
  const BIOME = { snow: { col: 0xf2f6fa, tex: 'concrete', trees: 0.25, tint: 0.12 }, desert: { col: 0xf0d098, tex: 'dirt', trees: 0, cactus: 0.12 }, volcanic: { col: 0x5a4c46, tex: 'dirt', trees: 0 },
    badlands: { col: 0xb08060, tex: 'dirt', trees: 0.04 }, urban: { col: 0xb0b0ac, tex: 'asphalt', trees: 0.03 }, coast: { col: 0xe8dcb8, tex: 'concrete', trees: 0.03 }, forest: { col: 0x8fc070, tex: 'jungle', trees: 0.5 },
    farm: { col: 0xd8e090, tex: 'grass', trees: 0.06 }, grass: { col: null, trees: 0.1 } };
  const STYLES = [['bldg', 0xa0523d, 'a0523d'], ['house', 0xe8dcc0, 'e8dcc0'], ['mall', 0x4f8f9a, '4f8f9a'], ['mall', 0x3d5a80, '3d5a80'], ['bldg', 0xc9a46a, 'c9a46a'], ['house', 0xf0efe8, 'f0efe8'], ['house', 0x8aa58a, '8aa58a'], ['bldg', 0xc8734a, 'c8734a'], ['house', 0xd8b84a, 'd8b84a'], ['bldg', 0x7a7f88, '7a7f88'], ['house', 0xb87f9a, 'b87f9a'], ['mall', 0xe8e4dc, 'e8e4dc']];
  const ROOFS = [0x8a3a2a, 0x3a3f46, 0x3f6a4a, 0x6a4a2a, 0x2f4f7a, 0x8a8f96];
  globalThis.BR_FAC = globalThis.BR_FAC || {}; STYLES.forEach(([base, col, hex], i) => { BR_COLS['st' + i] = col; BR_FAC[col] = base + '#' + hex; }); ROOFS.forEach((c, i) => { BR_FLOORS['rf' + i] = c; });
  BR_COLS.cactus = 0x3f7a3a; BR_COLS.barn = 0xa83a2a; BR_COLS.diner = 0xd8d0c0; BR_FAC[0xa83a2a] = 'house#a83a2a'; BR_FAC[0xd8d0c0] = 'mall#d8d0c0';
  const rz0 = brRezGarages;
  const world = (name, theme, blurb, parts, W, H, seed, biomes) => {
    const r = Look.rnd(seed); brRezGarages = (M, w, h, n, sd) => rz0(M, w, h, Math.min(5, Math.max(3, Math.round(w * h / 45000))), sd);   // (a very few rez garages)
    let T; try { T = brJoin(name, 'suburbs', theme, blurb, parts, W, H, seed); } finally { brRezGarages = rz0; }
    const at = (x, y) => (biomes.find(b => x >= b[1] && x < b[3] && y >= b[2] && y < b[4]) || [0, 0, 0, 0, 0, 'grass'])[5];
    T.pois = parts.map(([M, ox, oy, nm]) => ({ name: nm || M.name, x: ox + M.size.width / 2, y: oy + M.size.height / 2, x0: ox, y0: oy, x1: ox + M.size.width, y1: oy + M.size.height }));   // (v14.2.3: named places, for the sky labels and the map)
    T.biomes = biomes; for (const b of biomes) T.deco.push({ t: 'biome', x0: b[1], y0: b[2], x1: b[3], y1: b[4], kind: b[5] });
    const keep = []; for (const t of T.trees) { const B = BIOME[at(t.x, t.y)] || BIOME.grass;            // far fewer trees, by biome; cacti in the desert
      if (r() < B.trees) { if (B.tint) t.tint = B.tint; keep.push(t); } else if (B.cactus && r() < B.cactus) T.walls.push({ x0: t.x - 0.25, y0: t.y - 0.25, x1: t.x + 0.25, y1: t.y + 0.25, lv: 0, kind: 'cactus', h: 1.7 + r() * 0.8 }); }
    T.trees = keep;
    let si = 0; for (const d of T.deco) if (d.t === 'bldg') {                                                 // every building its own colour and roof
      const st = (si++ * 7 + Math.floor(d.x * 3 + d.y * 5)) % STYLES.length, rf = (si * 5 + Math.floor(d.x + d.y)) % ROOFS.length, e = 0.45;
      for (const w of T.walls) if (w.lv === d.lv && ['bldg', 'house', 'mall', 'hut', 'warehouse'].includes(w.kind) && w.x0 >= d.x - e && w.x1 <= d.x + d.w + e && w.y0 >= d.y - e && w.y1 <= d.y + d.h + e && (Math.abs(w.x0 - d.x) < e || Math.abs(w.x1 - d.x - d.w) < e || Math.abs(w.y0 - d.y) < e || Math.abs(w.y1 - d.y - d.h) < e)) w.kind = 'st' + st;
      if (d.kind && ['bldg', 'house', 'mall', 'hut', 'warehouse'].includes(d.kind)) { d.kind0 = d.kind; d.kind = 'st' + st; }   // (so its doors are still found)
      for (const f of T.floors) if (f.lv === d.lv + 1 && f.kind === 'roof' && Math.abs(f.x0 - d.x) < 0.1 && Math.abs(f.y0 - d.y) < 0.1 && Math.abs(f.x1 - d.x - d.w) < 0.1 && Math.abs(f.y1 - d.y - d.h) < 0.1) f.kind = 'rf' + rf;
    }
    return T;
  };
  const P = globalThis.BR_POI || {}, BB = BR_BASE;
  BR_MAPS.valley = world('Volt Valley', { ground: 0x4f7a3a, sky: 0xa6d0f0, grass: 0x4f7a3a }, 'A massive valley, 760 x 520 m, with twenty named places to land and seven biomes: city, badlands, coast, volcanic ash, forest, farmland and desert. Underground: The Mines, Mount Ember\'s lava tube, Bunker Hill, the Crystal Caves and the Hidden Lab.',
    [[P.city, 14, 14, 'Volt City'], [BB.downtown, 166, 14, 'Old Town'], [mines, 318, 14, 'The Mines'], [BB.port, 470, 14, 'Harbor Point'], [P.factory, 622, 14, 'Steelworks'], [P.stadium, 14, 142, 'Volt Arena'], [volcano, 166, 142, 'Mount Ember'], [BB.suburbs, 318, 142, 'Maple Grove'], [P.airfield, 470, 142, 'Skyfield'], [P.castle, 622, 142, 'Castle Hill'], [farm, 14, 270, 'Sunny Acres'], [bunker, 166, 270, 'Bunker Hill'], [BB.canyon, 318, 270, 'Dust Canyon'], [truck, 470, 270, 'Last Chance Stop'], [BB.jungle, 622, 270, 'Wildwood'], [lumber, 14, 398, 'Timber Mill'], [caves, 166, 398, 'Crystal Caves'], [mesas, 318, 398, 'Red Mesas'], [lab, 470, 398, 'The Hidden Lab'], [P.park, 622, 398, 'Thrill Park']], 760, 520, 14201,
    [[0, 0, 0, 304, 128, 'urban'], [0, 304, 0, 456, 128, 'badlands'], [0, 456, 0, 760, 128, 'coast'], [0, 152, 128, 304, 256, 'volcanic'], [0, 608, 128, 760, 520, 'forest'], [0, 0, 256, 304, 384, 'farm'], [0, 304, 256, 608, 384, 'desert'], [0, 0, 384, 152, 520, 'forest'], [0, 152, 384, 456, 520, 'badlands']]);
  BR_MAPS.frost = world('Frostfall Wilds', { ground: 0x5a7a3a, sky: 0xb4d0ec, grass: 0x5a7a3a }, 'Massive wild country, 760 x 520 m, with twenty named places: a snowfield across the north, forest, red desert, farmland, a city, badlands and an ash mountain. Underground: Glacier Caves, the Black Site, the Iron Mines, Ash Mountain and Fort Hollow.',
    [[P.peak, 14, 14, 'Frost Peak'], [caves, 166, 14, 'Glacier Caves'], [lumber, 318, 14, 'Pine Mill'], [P.castle, 470, 14, 'Winterhold'], [BB.suburbs, 622, 14, 'Snowdrift'], [P.park, 14, 142, 'Frostfall Fair'], [mesas, 166, 142, 'Copper Mesas'], [BB.canyon, 318, 142, 'Red Gulch'], [lab, 470, 142, 'Black Site'], [BB.port, 622, 142, 'Ice Harbor'], [BB.jungle, 14, 270, 'Deepwood'], [farm, 166, 270, 'Meadow Farm'], [BB.downtown, 318, 270, 'Frostfall City'], [P.airfield, 470, 270, 'Northfield'], [truck, 622, 270, 'Junction Nine'], [mines, 14, 398, 'Iron Mines'], [volcano, 166, 398, 'Ash Mountain'], [bunker, 318, 398, 'Fort Hollow'], [P.stadium, 470, 398, 'Frostfall Arena'], [P.factory, 622, 398, 'Old Factory']], 760, 520, 14202,
    [[0, 0, 0, 760, 128, 'snow'], [0, 0, 128, 152, 384, 'forest'], [0, 152, 128, 456, 256, 'desert'], [0, 152, 256, 304, 384, 'farm'], [0, 304, 256, 456, 384, 'urban'], [0, 0, 384, 152, 520, 'badlands'], [0, 152, 384, 304, 520, 'volcanic']]);
  /* the menu: just the two big maps (and Random) */
  BR_MAP_KEYS.length = 0; BR_MAP_KEYS.push('valley', 'frost');
  const o = GAME_INFO.br.opts.find(x => x.key === 'map'); o.values = ['random', ...BR_MAP_KEYS]; o.names = ['Random (either map)', ...BR_MAP_KEYS.map(k => `${BR_MAPS[k].name} (${BR_MAPS[k].size.width} x ${BR_MAPS[k].size.height} m)`)]; o.def = 'random';
  const s0 = (modeOpts('br') || {}).map; if (s0 && s0 !== 'random' && !BR_MAP_KEYS.includes(s0)) modeSave('br', { map: 'random' });
}

/* loot: mostly indoors and underground (anywhere with a floor over it), only a sprinkle in the open */
{ const BRm = MODES.br, init = BRm.init;
  BRm.covered = function (m, x, y, lv) { const M = this.map(m); return M.floors.some(f => f.lv === lv + 1 && x > f.x0 + 0.6 && x < f.x1 - 0.6 && y > f.y0 + 0.6 && y < f.y1 - 0.6); };
  BRm.freeAt = function (m, x, y, lv) { const M = this.map(m), Rr = R_CART() + 0.4; if (lv > 0 && !M.floors.some(f => f.lv === lv && x > f.x0 + 0.8 && x < f.x1 - 0.8 && y > f.y0 + 0.8 && y < f.y1 - 0.8)) return false; return !M.walls.some(w => w.lv === lv && x > w.x0 - Rr && x < w.x1 + Rr && y > w.y0 - Rr && y < w.y1 + Rr) && !M.ramps.some(r => x > r.x0 - Rr && x < r.x1 + Rr && y > r.y0 - Rr && y < r.y1 + Rr); };
  BRm.init = function (m, ...a) {
    const r = init.call(this, m, ...a), g = m.gs, M = this.map(m), k = Math.max(1, M.size.width * M.size.height / 4096);
    if (!M || !BR_MAP_KEYS.includes(m.mini.map)) return r;
    g.L = g.L.filter(L => this.covered(m, L[2], L[3], L[4] || 0) || (L[4] || 0) > 0 || Math.random() < 0.08);   // most of the loot out in the open goes...
    const inside = [], tries = 4000;                                                    // ...and more goes indoors: in buildings, sheds, garages, tunnels and caves
    for (let t = 0; t < tries && inside.length < Math.round(22 * k); t++) { const x = 3 + Math.random() * (m.width - 6), y = 3 + Math.random() * (m.height - 6), lv = 0; if (this.covered(m, x, y, lv) && this.freeAt(m, x, y, lv) && !inside.some(p => Math.hypot(p.x - x, p.y - y) < 5)) inside.push({ x, y, lv }); }
    inside.forEach((p, i) => this.drop(m, p.x, p.y, p.lv, i % 3 === 0 ? (Math.random() < 0.7 ? 'chest' : 'ammo') : this.pickLoot()));
    return r;
  };
}

/* the tunnel and cave floors: packed dirt and rock instead of grass, with a few lamps */
{ const P = View3D.prototype, bw = P.buildBRWorld;
  P.buildBRWorld = function (...a) {
    const r = bw.apply(this, a), M = MODES.br.map(this.m), g = this.arena; if (!g || !M) return r;
    const dirt = new THREE.MeshStandardMaterial({ color: 0x6b5340, roughness: 0.95 }), lamp = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb84a, emissiveIntensity: 1.2 });
    const BTEX = { snow: ['concrete', [1.6, 1.64, 1.7]], desert: ['sand', [1.12, 1.06, 0.95]], volcanic: ['dirt', [0.5, 0.44, 0.44]], badlands: ['dirt', [1.05, 0.9, 0.8]], urban: ['asphalt', [1.3, 1.3, 1.3]], coast: ['sand', [1.2, 1.18, 1.1]], forest: ['jungle', [1, 1.05, 1]], farm: ['grass', [1.3, 1.3, 0.9]] };   // (colour multipliers on the texture)
    for (const d of M.deco) if (d.t === 'biome' && BTEX[d.kind]) {                    // v14.2.2: biomes: the ground changes from place to place
      const [tx, col] = BTEX[d.kind], w = d.x1 - d.x0, h = d.y1 - d.y0, t = Look.tex(tx).clone(); t.needsUpdate = true; t.repeat.set(w / 7, h / 7);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, color: new THREE.Color(col[0], col[1], col[2]), roughness: 0.95 })); pl.position.set(d.x0 + w / 2, -0.004, d.y0 + h / 2); pl.receiveShadow = true; g.add(pl);
    }
    for (const d of M.deco) if (d.t === 'cavefloor') {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h).rotateX(-Math.PI / 2), dirt); pl.position.set(d.x + d.w / 2, 0.015, d.y + d.h / 2); pl.receiveShadow = true; g.add(pl);
      const n = Math.max(1, Math.floor(Math.max(d.w, d.h) / 10)); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, lx = d.w > d.h ? d.x + d.w * t : d.x + d.w / 2, ly = d.w > d.h ? d.y + d.h / 2 : d.y + d.h * t; const L = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), lamp); L.position.set(lx, BR.H - 0.18, ly); g.add(L); }
    }
    return r;
  };
}
