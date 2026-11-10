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

  const P = globalThis.BR_POI || {}, BB = BR_BASE;
  BR_MAPS.valley = brJoin('Volt Valley', 'suburbs', { ground: 0x4f7a3a, sky: 0xa6d0f0, grass: 0x4f7a3a }, 'A huge valley with ten places to land: Volt City, Downtown, the Port, the Suburbs, Volt Arena, the Factory, the Airfield, The Mines (tunnels under a mountain), the Volcano (a lava tube underneath, a crater on top) and Bunker Hill (rooms dug in under a hill).',
    [[P.city, 14, 14], [BB.downtown, 140, 22], [mines, 226, 14], [BB.port, 350, 24],
     [P.stadium, 20, 132], [volcano, 118, 124], [P.factory, 236, 138], [BB.suburbs, 344, 132],
     [P.airfield, 14, 252], [bunker, 128, 240], [BB.canyon, 236, 238], [P.castle, 340, 238]], 440, 330, 14201);
  BR_MAPS.frost = brJoin('Frostfall Wilds', 'jungle', { ground: 0x5a7a3a, sky: 0xb4d0ec, grass: 0x5a7a3a }, 'Wild country with nine places to land: Snow Peak, Thrill Park, the Jungle, the Canyon, the Lumber Camp, the Crystal Caves (a cave maze under a mountain), the Sky Mesas (four heights, bridges and kickers) and the Hidden Lab (underground, with a helipad on top).',
    [[P.peak, 12, 12], [caves, 130, 18], [BB.jungle, 244, 16], [lumber, 344, 22],
     [P.park, 12, 128], [mesas, 136, 122], [BB.canyon, 246, 124], [BB.port, 340, 132],
     [lab, 30, 238], [BB.suburbs, 150, 246], [P.castle, 250, 236], [BB.downtown, 350, 244]], 440, 330, 14202);
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
    for (const d of M.deco) if (d.t === 'cavefloor') {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h).rotateX(-Math.PI / 2), dirt); pl.position.set(d.x + d.w / 2, 0.015, d.y + d.h / 2); pl.receiveShadow = true; g.add(pl);
      const n = Math.max(1, Math.floor(Math.max(d.w, d.h) / 10)); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, lx = d.w > d.h ? d.x + d.w * t : d.x + d.w / 2, ly = d.w > d.h ? d.y + d.h / 2 : d.y + d.h * t; const L = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), lamp); L.position.set(lx, BR.H - 0.18, ly); g.add(L); }
    }
    return r;
  };
}
