/* Battle Royale maps (v13.4): new places to land, and two giant maps.
   - Volt Arena: a stadium. A concourse under the stands, ramps up to the stands, a field with cover and a stage in the middle.
   - Castle Hill: a castle on a cliff-sided hill. Ramps up the hill, curtain walls, corner towers to climb, a keep with a roof deck.
   - The Airfield: two big hangars, a control tower you can drive up, parked planes, fuel tanks.
   - The Factory: a roofless works hall with catwalks round the inside, silos, a chimney, crates on the yard.
   Giant maps: Mega Island (everything) and The Frontier (castle, factory, airfield). */
{
  const stadium = brBuild('Volt Arena', { width: 76, height: 64 }, { ground: 0x4f7a3a, sky: 0xa6d0f0, grass: 0x4f7a3a }, 'A stadium: a concourse under the stands, ramps to the seats, a field with cover and a stage in the middle.', B => {
    const X0 = 6, Y0 = 6, X1 = 70, Y1 = 58, x0 = 18, y0 = 16, x1 = 58, y1 = 48;
    B.side(X0, Y0, X1, Y0, [[0.5, 4.5]], 0, 'seat'); B.side(X0, Y1, X1, Y1, [[0.5, 4.5]], 0, 'seat'); B.side(X0, Y0, X0, Y1, [[0.5, 4.5]], 0, 'seat'); B.side(X1, Y0, X1, Y1, [[0.5, 4.5]], 0, 'seat');   // the outside, a gate on each side
    B.side(x0, y0, x1, y0, [[0.25, 3], [0.75, 3]], 0, 'seat'); B.side(x0, y1, x1, y1, [[0.25, 3], [0.75, 3]], 0, 'seat'); B.side(x0, y0, x0, y1, [[0.5, 3]], 0, 'seat'); B.side(x1, y0, x1, y1, [[0.5, 3]], 0, 'seat');   // the field's edge, with tunnels
    B.floor(X0, Y0, X1, y0, 1, 'stone'); B.floor(X0, y1, X1, Y1, 1, 'stone'); B.floor(X0, y0, x0, y1, 1, 'stone'); B.floor(x1, y0, X1, y1, 1, 'stone');   // the stands, over the concourse
    B.ramp(10, 8, 20, 11, 0, 0, 'stone'); B.ramp(56, 53, 66, 56, 2, 0, 'stone'); B.ramp(8, 36, 11, 46, 3, 0, 'stone'); B.ramp(65, 18, 68, 28, 1, 0, 'stone');   // ramps from the concourse up to the stands
    B.mesa(34, 28, 42, 36, 1, 'stone'); B.ramp(42, 30, 48, 34, 2, 0, 'stone');                                               // the stage in the middle
    for (const [x, y] of [[24, 22], [50, 22], [24, 42], [50, 42], [30, 32], [46, 32], [38, 20], [38, 44]]) B.wall(x - 0.8, y - 0.8, x + 0.8, y + 0.8, 0, 'crate');
    for (const [x, y, lv] of [[38, 32, 1], [12, 12, 1], [64, 12, 1], [12, 52, 1], [64, 52, 1], [38, 10, 1], [38, 54, 1], [26, 32, 0], [50, 32, 0], [38, 24, 0], [38, 40, 0], [12, 30, 0], [64, 34, 0]]) B.loot(x, y, lv);
    B.deco({ t: 'field', x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  });
  const castle = brBuild('Castle Hill', { width: 72, height: 72 }, { ground: 0x5a7a3a, sky: 0xb0c8e0, grass: 0x5a7a3a }, 'A castle on a cliff-sided hill: ramps up, curtain walls, towers to climb and a keep with a roof deck.', B => {
    B.mesa(14, 14, 58, 58, 1, 'rock'); B.ramp(30, 58, 34, 66, 3, 0, 'rock'); B.ramp(6, 30, 14, 34, 0, 0, 'rock');             // the hill and two roads up
    const c0 = 20, c1 = 52; B.side(c0, c0, c1, c0, [], 1, 'stone'); B.side(c0, c1, c1, c1, [[0.4, 3.4]], 1, 'stone'); B.side(c0, c0, c0, c1, [[0.4, 3.4]], 1, 'stone'); B.side(c1, c0, c1, c1, [], 1, 'stone');   // the curtain walls (gates south and west)
    for (const [x, y] of [[c0 - 2, c0 - 2], [c1 - 3, c0 - 2], [c0 - 2, c1 - 3], [c1 - 3, c1 - 3]]) { B.wall(x, y, x + 5, y + 5, 1, 'stone'); B.floor(x, y, x + 5, y + 5, 2, 'stone'); B.loot(x + 2.5, y + 2.5, 2); }   // corner towers
    B.ramp(c1 - 3 - 7, c1 - 3, c1 - 3, c1, 0, 1, 'wood');                                                                       // a wooden ramp up to the south-east tower
    B.building(31, 28, 12, 12, { doors: { s: [[0.5, 2.6]] }, kind: 'stone', lv: 1, loot: 3 }); B.ramp(43, 28, 47, 34, 3, 1, 'wood');   // the keep, and a ramp up to its roof
    for (const [x, y] of [[26, 46], [46, 46], [26, 26]]) B.loot(x, y, 1);
    B.building(4, 4, 8, 7, { doors: { e: [[0.5, 2.4]] }, kind: 'house', loot: 1 }); B.building(60, 60, 8, 7, { doors: { w: [[0.5, 2.4]] }, kind: 'house', loot: 1 }); B.building(60, 4, 8, 7, { doors: { s: [[0.5, 2.4]] }, kind: 'house', loot: 1 });   // the village below
    for (let i = 0; i < 14; i++) B.tree(8 + (i * 37) % 58, i % 2 ? 66 : 8 + (i * 13) % 4, 0.55);
  });
  const airfield = brBuild('The Airfield', { width: 90, height: 64 }, { ground: 0x6b7a5a, sky: 0xb8d4ec, grass: 0x6b7a5a }, 'Two big hangars, a control tower you can drive up, parked planes and fuel tanks by a long runway.', B => {
    B.building(6, 6, 22, 16, { doors: { s: [[0.5, 9]] }, kind: 'hangar', loot: 4 }); B.building(32, 6, 22, 16, { doors: { s: [[0.5, 9]] }, kind: 'hangar', loot: 4 });   // hangars with wide doors
    B.garage(62, 6, 12, 12, 4, { open: 's' }); B.loot(68, 12, 4);                                                                   // the control tower: four decks
    const plane = (x, y, a) => { if (a) { B.wall(x - 6, y - 0.7, x + 6, y + 0.7, 0, 'hangar'); B.wall(x - 1, y - 6, x + 1, y + 6, 0, 'hangar'); B.wall(x - 6, y - 2.5, x - 5, y + 2.5, 0, 'hangar'); } else { B.wall(x - 0.7, y - 6, x + 0.7, y + 6, 0, 'hangar'); B.wall(x - 6, y - 1, x + 6, y + 1, 0, 'hangar'); B.wall(x - 2.5, y - 6, x + 2.5, y - 5, 0, 'hangar'); } B.loot(x + (a ? 0 : 3), y + (a ? 3 : 0), 0); };
    plane(16, 34, 1); plane(44, 34, 1); plane(80, 40, 0);
    for (const [x, y] of [[66, 26], [72, 26], [78, 26]]) B.wall(x - 1.6, y - 1.6, x + 1.6, y + 1.6, 0, 'container');                 // fuel tanks
    for (let x = 6; x < 86; x += 7) B.wall(x, 52, x + 2.5, 52.4, 0, 'crate');                                                      // runway lights along the edge
    B.deco({ t: 'runway', x: 4, y: 44, w: 82, h: 16 });
    for (const [x, y] of [[20, 48], [50, 48], [70, 56], [8, 30], [84, 14]]) B.loot(x, y, 0);
  });
  const factory = brBuild('The Factory', { width: 72, height: 60 }, { ground: 0x6b6f73, sky: 0xb4c4d4, grass: 0x6b6f73 }, 'A roofless works hall with catwalks round the inside, silos, a chimney and crates in the yard.', B => {
    const x0 = 8, y0 = 8, x1 = 48, y1 = 36;
    B.building(x0, y0, x1 - x0, y1 - y0, { doors: { s: [[0.2, 3], [0.8, 3]], n: [[0.5, 3]], w: [[0.5, 3]], e: [[0.5, 3]] }, kind: 'warehouse', roof: false, loot: 0 });
    B.floor(x0, y0, x1, y0 + 3, 1, 'metal'); B.floor(x0, y1 - 3, x1, y1, 1, 'metal'); B.floor(x0 + 18, y0 + 3, x0 + 21, y1 - 3, 1, 'metal');   // catwalks along the long walls and a bridge across
    B.ramp(x0 + 2, y0 + 4, x0 + 5, y0 + 13, 3, 0, 'metal'); B.ramp(x1 - 5, y1 - 13, x1 - 2, y1 - 4, 1, 0, 'metal');
    for (const [x, y] of [[x0 + 8, y0 + 12], [x0 + 30, y0 + 12], [x0 + 8, y1 - 10], [x0 + 30, y1 - 10]]) { B.wall(x, y, x + 4, y + 1.2, 0, 'crate'); B.loot(x + 2, y + 3, 0); }   // machines
    for (const [x, y, lv] of [[x0 + 10, y0 + 1.5, 1], [x1 - 10, y1 - 1.5, 1], [x0 + 19.5, (y0 + y1) / 2, 1]]) B.loot(x, y, lv);
    for (const [x, y] of [[56, 10], [63, 10], [56, 18], [63, 18]]) { for (let L = 0; L < 3; L++) B.wall(x - 2.2, y - 2.2, x + 2.2, y + 2.2, L, 'silo'); }   // silos
    B.floor(53, 7, 66, 21, 3, 'metal'); B.loot(59.5, 14, 3); B.ramp(66, 8, 69, 20, 1, 2, 'metal'); B.ramp(66, 22, 69, 34, 3, 1, 'metal'); B.ramp(66, 36, 69, 48, 1, 0, 'metal'); B.floor(66, 34, 69, 36, 1, 'metal'); B.floor(66, 20, 69, 22, 2, 'metal');   // a stair of ramps up to the silo tops
    for (let L = 0; L < 4; L++) B.wall(54, 40, 57, 43, L, 'bldg');                                                                  // the chimney
    for (let i = 0; i < 10; i++) { const x = 8 + (i % 5) * 9, y = 44 + Math.floor(i / 5) * 7; B.wall(x, y, x + 2.4, y + 2.4, 0, i % 3 ? 'crate' : 'container'); }
    for (const [x, y] of [[30, 50], [12, 52], [62, 52]]) B.loot(x, y, 0);
  });
  BR_MAPS.stadium = brBig('stadium', stadium, 22, 'suburbs', 501); BR_MAPS.castle = brBig('castle', castle, 22, 'jungle', 502);
  BR_MAPS.airfield = brBig('airfield', airfield, 20, 'suburbs', 503); BR_MAPS.factory = brBig('factory', factory, 20, 'port', 504);
  BR_MAPS.mega = brJoin('Mega Island', 'suburbs', { ground: 0x4f7a3a, sky: 0xa6d0f0, grass: 0x4f7a3a }, 'The giant one: nine places to land. Downtown, the Port, Volt Arena, Castle Hill, the Airfield, the Factory, the Jungle, the Canyon and the Suburbs.',
    [[BR_BASE.downtown, 12, 12], [stadium, 100, 12], [airfield, 192, 12], [castle, 10, 96], [factory, 102, 100], [BR_BASE.jungle, 194, 94], [BR_BASE.canyon, 10, 182], [BR_BASE.port, 102, 186], [BR_BASE.suburbs, 196, 182]], 292, 260, 9001);
  BR_MAPS.frontier = brJoin('The Frontier', 'jungle', { ground: 0x5a7a3a, sky: 0xb0c8e0, grass: 0x5a7a3a }, 'Wild country: Castle Hill, the Factory and the Airfield, with forest and farmland between them.', [[castle, 10, 16], [factory, 100, 22], [airfield, 186, 18]], 286, 104, 4040);
  BR_MAP_KEYS.length = 0; BR_MAP_KEYS.push(...Object.keys(BR_MAPS));
  const o = GAME_INFO.br.opts.find(x => x.key === 'map'); o.values = ['random', ...BR_MAP_KEYS]; o.names = ['Random (a new map each game)', ...BR_MAP_KEYS.map(k => `${BR_MAPS[k].name} (${BR_MAPS[k].size.width} x ${BR_MAPS[k].size.height} m)`)];
  GAME_INFO.br.label = cfg => `${cfg.map === 'random' ? 'Random map' : (BR_MAPS[cfg.map] || BR_MAPS.downtown).name}, ${['solo', 'duos', 'trios', 'squads', 'fives'][(cfg.squad || 1) - 1]}`;
}
