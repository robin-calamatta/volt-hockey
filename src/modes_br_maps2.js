/* v14: more Volt Royale maps, bigger ones, and JUMPS.
   - Kickers: short ramps that end in mid-air. Hit one fast and you launch (no fall damage from a kicker jump).
   - Volt City: two drivable skyscrapers, an elevated highway with a jump across the broken middle, a mall with a roof car park, a skate park full of kickers.
   - Snow Peak: a mountain in three tiers with roads up, a ski lodge on the summit and kickers off every tier.
   - Thrill Park: a theme park: a raised coaster track all round (two levels), a funhouse maze, bumper-car pen, a big jump over the boating pond.
   Giant maps: The Continent (twelve places to land, the biggest map by far) and Wild Peaks (Snow Peak, Thrill Park and Volt City). */
{
  /* a builder with kickers: B.kicker(...) is a ramp whose top end has nothing after it */
  const build = (name, size, theme, blurb, fn) => { const kicks = []; let n = 0; const M = brBuild(name, size, theme, blurb, B => { const r0 = B.ramp; B.ramp = (...a) => { n++; return r0(...a); }; B.kicker = (...a) => { kicks.push(n); B.ramp(...a); }; fn(B); }); kicks.forEach(i => { if (M.ramps[i]) M.ramps[i].kick = 1; }); return M; };

  const city = build('Volt City', { width: 104, height: 88 }, { ground: 0x5d6168, sky: 0xa8c4e0, grass: 0x56704a }, 'Two drivable skyscrapers, an elevated highway with a jump over its broken middle, a mall with a roof car park and a skate park full of kickers.', B => {
    B.garage(8, 6, 16, 16, 6, { open: 's' }); B.garage(34, 6, 14, 14, 5, { open: 's' });                                              // the skyscrapers: drive all the way up
    for (const [x, y] of [[16, 26], [41, 24]]) B.loot(x, y, 0);
    /* the highway: up at the west end, a gap in the middle with a kicker, down at the east end */
    B.ramp(2, 40, 12, 46, 0, 0, 'concrete'); B.floor(12, 40, 48, 46, 1, 'concrete'); B.kicker(42, 40, 48, 46, 0, 1, 'metal'); B.floor(56, 40, 92, 46, 1, 'concrete'); B.ramp(92, 40, 102, 46, 2, 0, 'concrete');
    for (let x = 16; x < 90; x += 8) if (x < 46 || x > 58) { B.wall(x, 41.6, x + 0.8, 42.4, 0, 'column'); B.wall(x, 43.6, x + 0.8, 44.4, 0, 'column'); }
    B.loot(30, 43, 1); B.loot(74, 43, 1); B.loot(52, 43, 0);
    /* the mall: a big building, a ramp up the side to its roof car park */
    B.building(6, 54, 32, 24, { doors: { n: [[0.25, 3], [0.75, 3]], e: [[0.5, 3]] }, kind: 'warehouse', loot: 4 }); B.ramp(38, 60, 42, 72, 3, 0, 'concrete');
    for (const [x, y] of [[14, 62], [28, 70], [22, 66]]) B.wall(x - 1, y - 1, x + 1, y + 1, 0, 'crate'); for (const [x, y] of [[12, 60], [32, 74]]) B.loot(x, y, 1);
    /* the skate park: kickers facing each other, a funbox in the middle */
    B.deco({ t: 'field', x: 54, y: 52, w: 44, h: 30 });
    B.kicker(58, 56, 64, 60, 0, 0, 'wood'); B.kicker(86, 56, 92, 60, 2, 0, 'wood'); B.kicker(58, 72, 64, 76, 0, 0, 'wood'); B.kicker(86, 72, 92, 76, 2, 0, 'wood');
    B.mesa(72, 62, 78, 70, 1, 'concrete'); B.ramp(66, 64, 72, 68, 0, 0, 'wood'); B.ramp(78, 64, 84, 68, 2, 0, 'wood'); B.kicker(73, 70, 77, 76, 1, 0, 'wood');
    for (const [x, y, lv] of [[75, 66, 1], [60, 66, 0], [90, 66, 0], [75, 54, 0], [75, 80, 0]]) B.loot(x, y, lv);
    /* blocks of flats in between */
    for (const [x, y] of [[60, 6], [80, 6], [60, 22]]) B.building(x, y, 14, 12, { doors: { s: [[0.5, 2.6]], n: [[0.5, 2.4]] }, kind: 'bldg', loot: 2 });
    B.ramp(94, 8, 98, 18, 3, 0, 'concrete'); B.floor(80, 6, 94, 18, 1, 'roof');                                                   // (a ramp onto one roof)
  });

  const peak = build('Snow Peak', { width: 100, height: 100 }, { ground: 0xdfe8ee, sky: 0xc4d8ec, grass: 0xe4ecf0 }, 'A mountain in three tiers with roads up, a ski lodge on the summit and kickers off every tier.', B => {
    B.mesa(14, 14, 86, 86, 1, 'rock'); B.mesa(28, 28, 72, 72, 2, 'rock'); B.mesa(40, 40, 60, 60, 3, 'rock');
    B.ramp(46, 86, 54, 96, 3, 0, 'rock'); B.ramp(4, 46, 14, 54, 0, 0, 'rock');                                                       // roads up to the first tier
    B.ramp(72, 44, 80, 52, 2, 1, 'rock'); B.ramp(20, 50, 28, 56, 0, 1, 'rock');                                                      // ...the second
    B.ramp(46, 32, 52, 40, 1, 2, 'stone');                                                                                           // ...the summit
    B.building(42, 42, 16, 16, { doors: { n: [[0.5, 3]], s: [[0.5, 3]] }, kind: 'house', lv: 3, loot: 3 });                          // the ski lodge
    /* kickers off the edges: launch off a tier into the snow below */
    B.kicker(16, 24, 22, 30, 2, 1, 'wood'); B.kicker(78, 70, 84, 76, 0, 1, 'wood'); B.kicker(60, 16, 66, 22, 3, 1, 'wood'); B.kicker(34, 78, 40, 84, 1, 1, 'wood');
    B.kicker(30, 62, 36, 68, 2, 2, 'wood'); B.kicker(64, 32, 70, 38, 0, 2, 'wood');
    for (const [x, y, lv] of [[20, 20, 1], [80, 80, 1], [80, 20, 1], [20, 80, 1], [34, 34, 2], [66, 66, 2], [34, 66, 2], [66, 34, 2], [50, 50, 4], [50, 92, 0], [92, 50, 0], [8, 8, 0], [92, 92, 0]]) B.loot(x, y, lv);
    for (const [x, y] of [[4, 20], [4, 80], [96, 30], [96, 70], [30, 4], [70, 4], [24, 96], [76, 96]]) B.building(x - 3, y - 3, 6, 6, { doors: { s: [[0.5, 2.2]] }, kind: 'house', loot: 1 });
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r = 46 + (i % 3) * 1.4; B.tree(50 + Math.cos(a) * r, 50 + Math.sin(a) * r, 0.5); }
  });

  const park = build('Thrill Park', { width: 108, height: 84 }, { ground: 0x5c8a46, sky: 0xb4dcf4, grass: 0x5c8a46 }, 'A theme park: a raised coaster track all round on two levels, a funhouse maze, a bumper-car pen and a big jump over the boating pond.', B => {
    /* the coaster: a ring at level 1, and a higher stretch at level 2 along the north */
    B.floor(8, 8, 100, 13, 1, 'metal'); B.floor(8, 71, 100, 76, 1, 'metal'); B.floor(8, 13, 13, 71, 1, 'metal'); B.floor(95, 13, 100, 71, 1, 'metal');
    B.ramp(13, 30, 21, 35, 2, 0, 'metal'); B.ramp(87, 50, 95, 55, 0, 0, 'metal');                                                   // on from the ground (inside the ring)
    B.ramp(30, 8, 40, 13, 0, 1, 'metal'); B.floor(40, 8, 68, 13, 2, 'metal'); B.ramp(68, 8, 78, 13, 2, 1, 'metal'); B.loot(54, 10.5, 2);   // the big hill
    B.kicker(80, 71, 88, 76, 0, 1, 'metal');                                                                                           // a jump off the south track
    for (let x = 12; x < 100; x += 10) { B.wall(x, 9.6, x + 0.8, 10.4, 0, 'column'); B.wall(x, 72.6, x + 0.8, 73.4, 0, 'column'); }
    for (let y = 18; y < 70; y += 10) { B.wall(9.6, y, 10.4, y + 0.8, 0, 'column'); B.wall(96.6, y, 97.4, y + 0.8, 0, 'column'); }
    /* the funhouse: a maze inside a building */
    B.building(22, 20, 26, 20, { doors: { s: [[0.2, 2.6]], n: [[0.8, 2.6]] }, kind: 'bldg', loot: 0 });
    for (const [x0, y0, x1, y1] of [[26, 24, 26.4, 34], [30, 26, 30.4, 40], [34, 20, 34.4, 30], [38, 28, 38.4, 40], [42, 20, 42.4, 32], [30, 26, 38, 26.4], [38, 34, 46, 34.4]]) B.wall(x0, y0, x1, y1, 0, 'wall');
    for (const [x, y] of [[28, 22], [40, 38], [44, 22]]) B.loot(x, y, 0);
    /* bumper cars: a low walled pen full of crates */
    B.side(58, 22, 86, 22, [[0.5, 3]], 0, 'crate'); B.side(58, 40, 86, 40, [[0.5, 3]], 0, 'crate'); B.side(58, 22, 58, 40, [], 0, 'crate'); B.side(86, 22, 86, 40, [], 0, 'crate');
    for (const [x, y] of [[64, 28], [72, 34], [80, 27], [68, 36]]) B.wall(x - 0.8, y - 0.8, x + 0.8, y + 0.8, 0, 'container'); B.loot(72, 28, 0); B.loot(78, 36, 0);
    /* the boating pond and the big jump over it */
    B.deco({ t: 'field', x: 40, y: 48, w: 26, h: 16 });
    B.mesa(28, 50, 36, 62, 1, 'stone'); B.ramp(20, 53, 28, 59, 0, 0, 'wood'); B.kicker(36, 53, 42, 59, 0, 1, 'wood');              // up the tower, off the kicker, over the pond
    B.mesa(68, 50, 76, 62, 1, 'stone'); B.ramp(76, 53, 84, 59, 2, 0, 'wood'); B.loot(72, 56, 1); B.loot(32, 56, 1);
    /* stalls and the big wheel (a tall tower you can't climb) */
    for (const [x, y] of [[20, 46], [50, 68], [86, 46]]) B.building(x - 3, y - 3, 6, 5, { doors: { s: [[0.5, 2.2]] }, kind: 'house', loot: 1 });
    for (let L = 0; L < 5; L++) B.wall(51, 40, 55, 44, L, 'silo');
    for (const [x, y] of [[4, 4], [104, 4], [4, 80], [104, 80], [54, 30]]) B.loot(x, y, 0);
  });

  globalThis.BR_POI = Object.assign(globalThis.BR_POI || {}, { city, peak, park });
  BR_MAPS.city = brBig('city', city, 22, 'port', 601); BR_MAPS.peak = brBig('peak', peak, 22, 'jungle', 602); BR_MAPS.park = brBig('park', park, 22, 'suburbs', 603);
  const S = BR_BASE, sides = (M, ...a) => [M, ...a];
  BR_MAPS.wild = brJoin('Wild Peaks', 'jungle', { ground: 0x5a7a3a, sky: 0xb4d0ec, grass: 0x5a7a3a }, 'Snow Peak, Thrill Park and Volt City, with forest between them. Jumps everywhere.', [sides(peak, 12, 14), sides(park, 128, 22), sides(city, 252, 18)], 372, 130, 6060);
  /* the biggest: twelve places to land */
  const MG0 = BR_MAPS, base = n => S[n] || MG0[n];
  BR_MAPS.continent = brJoin('The Continent', 'suburbs', { ground: 0x4f7a3a, sky: 0xa6d0f0, grass: 0x4f7a3a }, 'The biggest map by far: twelve places to land. Volt City, Snow Peak, Thrill Park, Downtown, the Port, the Jungle, the Canyon, the Suburbs and more.',
    [[city, 12, 12], [base('downtown'), 136, 20], [peak, 220, 10], [base('port'), 340, 24],
     [base('jungle'), 14, 126], [park, 106, 130], [base('canyon'), 236, 124], [base('suburbs'), 334, 128],
     [S.suburbs, 20, 236], [base('port'), 112, 240], [base('jungle'), 214, 230], [base('canyon'), 320, 230]].filter(p => p[0]), 432, 330, 7070);
  BR_MAP_KEYS.length = 0; BR_MAP_KEYS.push(...Object.keys(BR_MAPS));
  const o = GAME_INFO.br.opts.find(x => x.key === 'map'); o.values = ['random', ...BR_MAP_KEYS]; o.names = ['Random (a new map each game)', ...BR_MAP_KEYS.map(k => `${BR_MAPS[k].name} (${BR_MAPS[k].size.width} x ${BR_MAPS[k].size.height} m)`)];
}

/* kickers: leave the top fast and you fly; a kicker landing never hurts */
{ const M = MODES.br, mv = M.move, land = M.land;
  M.move = function (m, c, h) {
    const G = c.gs, was = G.ramp, r = was >= 0 ? this.map(m).ramps[was] : null; mv.call(this, m, c, h);
    if (r && r.kick && G.ramp === -1 && !G.air && G.lv === r.lv + 1 && !this.floorAt(this.map(m), G.lv, c.x, c.y)) {
      const sp = Math.hypot(c.vx, c.vy); G.air = 1; G.vz = Math.min(7.5, 2.5 + sp * 0.75); G.kickJ = 1; G.ramp = -1; if (c.player) { m.sfx('drift'); this.say && this.say(m, c, sp > 5 ? 'SEND IT!' : 'HOP!'); }
    }
  };
  M.land = function (m, c, z) { const G = c.gs; if (G.kickJ) { G.kickJ = 0; G.vz = Math.max(G.vz, -BR.fallSafe); } return land.call(this, m, c, z); };
}
