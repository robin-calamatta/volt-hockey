/* BATTLE ROYALE (v11). Big outdoor maps with buildings you drive into, parking garages, rooftops, a jungle tree with a spiral ramp, canyons.
   The world has LEVELS (floors 2.2 m apart): every cart, wall, bullet and pick-up has one. Ramps carry carts between levels; on an upper
   level a cart stays on the floors (railings all round). Carts on different levels do not touch and cannot hit each other.
   Map pieces (all metres, lv = level):
     walls  { x0, y0, x1, y1, lv, kind, h }   solid on that level (kind: wall, bldg, crate, rock, log, container, column, trunk)
     floors { x0, y0, x1, y1, lv, kind }      somewhere to drive on an upper level (garage decks, roofs, the tree canopy, mesa tops, bridges)
     ramps  { x0, y0, x1, y1, dir, lv }       from level lv up to lv + 1, rising in direction dir (0 +x, 1 +y, 2 -x, 3 -y)
     trees  { x, y, r }                       round trunks on the ground
     loot   [x, y, lv]                        where loot appears (plus random spots on the ground) */
const BR = { H: 2.2, hp: 100, maxShield: 100, slots: 5, grace: 4, grav: 15, jumpV: 5.6, headroom: 1.25, fallSafe: 9.5, fallDmg: 4 };
/* Aiming up and down: a gamepad's right stick (or I / K, PageUp / PageDown on the keyboards) tilts your gun. It stays where you put it, and eases back to level a moment after you let go. */
const BR_AIM = { min: -0.5, max: 0.7, rate: 1.4, back: 0.45, idle: 1.4 };
function brAimInput(p, src, dt) {
  if (!p || !src) return; const h = src.held || {}, ly = (src.ry || 0) * (Settings.invertLook ? -1 : 1), k = (h.aimUp ? 1 : 0) - (h.aimDown ? 1 : 0) - (Math.abs(ly) > 0.15 ? ly : 0);
  let a = p.brAp || 0; if (k) { a += k * BR_AIM.rate * dt; p.brAimT = 0; } else { p.brAimT = (p.brAimT || 0) + dt; if (p.brAimT > BR_AIM.idle) a -= Math.sign(a) * Math.min(Math.abs(a), BR_AIM.back * dt); }
  p.brAp = Math.max(BR_AIM.min, Math.min(BR_AIM.max, a));
}
function brPitch(c) { return c.player && c.player.brAp !== undefined ? c.player.brAp : (c.gs && c.gs.ap) || 0; }
const BR_GUNS = {
  pistol: { name: 'PISTOL', dmg: 12, cd: 0.32, spd: 24, life: 0.9, spread: 0.03, ammo: 24, range: 16, col: 0xbfc7d0 },
  smg: { name: 'SMG', dmg: 6, cd: 0.09, spd: 22, life: 0.7, spread: 0.1, ammo: 60, auto: 1, range: 12, col: 0x7dff6a },
  shotgun: { name: 'SHOTGUN', dmg: 8, pellets: 6, cd: 0.95, spd: 20, life: 0.32, spread: 0.3, ammo: 12, range: 6, col: 0xff9f1c },
  rifle: { name: 'RIFLE', dmg: 13, cd: 0.18, spd: 30, life: 1.1, spread: 0.035, ammo: 45, auto: 1, range: 22, col: 0x3dd6ff },
  sniper: { name: 'SNIPER', dmg: 65, cd: 1.5, spd: 50, life: 1.6, spread: 0, ammo: 8, range: 40, col: 0xb28dff },
  rocket: { name: 'ROCKETS', dmg: 55, splash: 2.8, cd: 1.8, spd: 13, life: 2.4, spread: 0.02, ammo: 4, range: 20, col: 0xff4d4d }
};
const BR_ITEMS = { med: { name: 'MEDKIT', icon: '➕', stack: 3, col: 0xff4d6a }, pot: { name: 'SHIELD POTION', icon: '🛡', stack: 3, col: 0x3d8bff }, boost: { name: 'BOOST', icon: '🚀', stack: 3, col: 0xffd23f }, wall: { name: 'SHIELD WALL', icon: '🧱', stack: 2, col: 0x7ff6ff } };
const BR_LOOT = [['pistol', 5], ['smg', 4], ['shotgun', 4], ['rifle', 3], ['sniper', 1.5], ['rocket', 1], ['med', 3], ['pot', 3], ['boost', 2.5], ['wall', 2], ['ammo', 4]];
const BR_TEAMCOL = [0x3dd6ff, 0xff4d6a, 0x7dff6a, 0xffd23f, 0xb28dff, 0xff9f1c, 0xffffff, 0xff7ad9, 0x39e0c0, 0xc9a26b, 0x8fa8ff, 0xd0ff4d];

/* ----- map building ----- */
function brBuild(name, size, theme, blurb, fn) {
  const M = { name, size, theme, blurb, walls: [], floors: [], ramps: [], trees: [], loot: [], deco: [] };
  const B = {
    wall(x0, y0, x1, y1, lv = 0, kind = 'wall', h) { M.walls.push({ x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), lv, kind, h }); },
    floor(x0, y0, x1, y1, lv, kind = 'concrete') { M.floors.push({ x0, y0, x1, y1, lv, kind }); },
    ramp(x0, y0, x1, y1, dir, lv, kind = 'concrete') { M.ramps.push({ x0, y0, x1, y1, dir, lv, kind, id: M.ramps.length }); },
    tree(x, y, r = 0.55) { M.trees.push({ x, y, r }); },
    loot(x, y, lv = 0) { M.loot.push([x, y, lv]); },
    deco(o) { M.deco.push(o); },
    side(ax, ay, bx, by, gaps, lv, kind, t = 0.35) {                    // a wall from a to b (straight along x or y) with door gaps [centre fraction, width]
      const horiz = ay === by, L = horiz ? bx - ax : by - ay; let s = 0; const cuts = gaps.map(([f, w]) => [f * L - w / 2, f * L + w / 2]).sort((p, q) => p[0] - q[0]);
      for (const [g0, g1] of [...cuts, [L, L]]) { if (g0 - s > 0.05) { if (horiz) B.wall(ax + s, ay - t / 2, ax + g0, ay + t / 2, lv, kind); else B.wall(ax - t / 2, ay + s, ax + t / 2, ay + g0, lv, kind); } s = g1; }
    },
    building(x, y, w, h, { doors = { s: [[0.5, 2.4]] }, kind = 'bldg', roof = true, loot = 2, lv = 0 } = {}) {   // four walls with doors, a roof (a floor one level up), loot inside
      B.side(x, y, x + w, y, doors.n || [], lv, kind); B.side(x, y + h, x + w, y + h, doors.s || [], lv, kind); B.side(x, y, x, y + h, doors.w || [], lv, kind); B.side(x + w, y, x + w, y + h, doors.e || [], lv, kind);
      if (roof) B.floor(x, y, x + w, y + h, lv + 1, 'roof');
      for (let i = 0; i < loot; i++) B.loot(x + w * (0.3 + 0.4 * (i % 2)), y + h * (0.35 + 0.3 * (i >> 1 & 1)), lv);
      M.deco.push({ t: 'bldg', x, y, w, h, lv, kind });
    },
    garage(x, y, w, h, levels, { open = 's' } = {}) {                   // a parking garage: open decks, switchback ramps on the two sides, columns
      const s = 3.2;
      B.side(x, y, x + w, y, open === 'n' ? [[0.5, 6]] : [[0.5, 2.4]], 0, 'wall'); B.side(x, y + h, x + w, y + h, open === 's' ? [[0.5, 6]] : [[0.5, 2.4]], 0, 'wall');
      B.side(x, y, x, y + h, [[0.5, 2.6]], 0, 'wall'); B.side(x + w, y, x + w, y + h, [[0.5, 2.6]], 0, 'wall');
      for (let L = 1; L <= levels; L++) B.floor(x, y, x + w, y + h, L, L === levels ? 'roof' : 'garage');
      for (let L = 0; L < levels; L++) { if (L % 2 === 0) B.ramp(x + 0.4, y + 2.6, x + s, y + h - 2.6, 1, L); else B.ramp(x + w - s, y + 2.6, x + w - 0.4, y + h - 2.6, 3, L); }
      for (let L = 0; L < levels; L++) for (let cx = x + s + 2.5; cx < x + w - s - 1; cx += 4) for (const cy of [y + h * 0.33, y + h * 0.67]) B.wall(cx - 0.25, cy - 0.25, cx + 0.25, cy + 0.25, L, 'column');
      for (let L = 1; L <= levels; L++) { B.loot(x + w / 2, y + h / 2, L); if (L === levels) { B.loot(x + w * 0.3, y + h * 0.3, L); B.loot(x + w * 0.7, y + h * 0.7, L); } }
      B.loot(x + w / 2, y + h / 2, 0); M.deco.push({ t: 'garage', x, y, w, h, levels });
    },
    spiralTree(cx, cy, levels = 4, canopy = 12) {                      // a giant tree: a square spiral ramp round the trunk up to a flat canopy
      const s = 3, W = 3; for (let L = 0; L < levels; L++) B.wall(cx - s, cy - s, cx + s, cy + s, L, 'trunk');
      const ramps = [[cx + s, cy - s, cx + s + W, cy + s, 1], [cx - s, cy + s, cx + s, cy + s + W, 2], [cx - s - W, cy - s, cx - s, cy + s, 3], [cx - s, cy - s - W, cx + s, cy - s, 0]];
      const land = [[cx + s, cy + s, cx + s + W, cy + s + W], [cx - s - W, cy + s, cx - s, cy + s + W], [cx - s - W, cy - s - W, cx - s, cy - s], [cx + s, cy - s - W, cx + s + W, cy - s]];
      for (let L = 0; L < levels; L++) { const r = ramps[L % 4]; B.ramp(r[0], r[1], r[2], r[3], r[4], L, 'wood'); if (L < levels - 1) { const l = land[L % 4]; B.floor(l[0], l[1], l[2], l[3], L + 1, 'wood'); } }
      B.floor(cx - canopy, cy - canopy, cx + canopy, cy + canopy, levels, 'canopy');
      M.deco.push({ t: 'tree', x: cx, y: cy, levels, canopy });
    },
    mesa(x0, y0, x1, y1, lv = 1, kind = 'rock') { for (let L = 0; L < lv; L++) B.wall(x0, y0, x1, y1, L, 'cliff'); B.floor(x0, y0, x1, y1, lv, kind); }
  };
  fn(B); return M;
}
const BR_MAPS = {
  downtown: brBuild('Downtown', { width: 64, height: 64 }, { ground: 0x5b6067, sky: 0x9fc6e6, grass: 0x4f7a3a }, 'A parking garage, offices you drive into, rooftop decks and a skybridge.', B => {
    B.garage(4, 4, 18, 14, 3);
    B.building(28, 4, 12, 10, { doors: { s: [[0.5, 2.6]], w: [[0.5, 2.4]] } }); B.building(46, 4, 14, 12, { doors: { s: [[0.3, 2.6], [0.75, 2.6]] }, loot: 3 });
    B.building(4, 26, 12, 12, { doors: { e: [[0.5, 2.6]], n: [[0.5, 2.4]] } }); B.building(22, 26, 10, 10, { doors: { s: [[0.5, 2.6]], n: [[0.5, 2.6]] } });
    B.building(40, 24, 18, 14, { doors: { w: [[0.3, 2.6]], s: [[0.6, 2.6]] }, loot: 4 }); B.ramp(40, 39, 50, 42, 0, 0); B.floor(50, 38, 58, 42, 1, 'roof');    // a ramp up to the big roof
    B.building(6, 46, 14, 12, { doors: { n: [[0.5, 2.6]], e: [[0.25, 2.4]] } }); B.ramp(20, 53, 29, 56, 2, 0);                                     // a ramp up to the roof, from the east
    B.building(36, 46, 22, 12, { doors: { n: [[0.25, 2.6], [0.75, 2.6]] }, loot: 4 }); B.floor(20, 48.5, 36, 51, 1, 'bridge');                              // the skybridge between the two roofs
    for (const [x, y] of [[26, 18], [34, 18], [30, 41], [12, 41], [52, 20]]) B.wall(x, y, x + 2.6, y + 1.3, 0, 'crate');
    for (const [x, y] of [[24, 20], [36, 21], [18, 40], [62, 44], [2, 62]]) B.tree(x, y);
    for (const [x, y] of [[30, 20], [16, 22], [46, 20], [26, 42], [60, 61], [2, 22], [33, 60]]) B.loot(x, y);
  }),
  jungle: brBuild('The Jungle', { width: 72, height: 72 }, { ground: 0x3f6b2f, sky: 0x8fc7a8, grass: 0x3f6b2f }, 'A giant tree with a spiral ramp up the trunk to a canopy, a temple, huts and thick trees.', B => {
    B.spiralTree(36, 36, 4, 12);
    for (const [x, y, w, h] of [[29, 28, 3, 1.2], [41, 30, 1.2, 4], [32, 43, 5, 1.2], [44, 42, 1.4, 1.4], [27, 38, 1.4, 1.4]]) B.wall(x, y, x + w, y + h, 4, 'log');   // logs and rocks on the canopy
    for (const [x, y] of [[30, 30], [42, 32], [30, 42], [42, 42], [36, 26], [36, 46]]) B.loot(x, y, 4);
    B.mesa(6, 50, 25, 64, 1, 'stone'); B.mesa(8, 53, 16, 61, 2, 'stone'); B.ramp(8, 44, 12, 50, 1, 0, 'stone'); B.ramp(16, 55, 21, 58, 2, 1, 'stone');      // the temple: two stone steps
    B.loot(13, 57, 2); B.loot(18, 62, 1); B.loot(7, 52, 1);
    for (const [x, y] of [[54, 8], [60, 18], [8, 10], [56, 54]]) B.building(x, y, 7, 6, { doors: { s: [[0.5, 2.2]] }, kind: 'hut', loot: 1 });
    let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 90; i++) { const x = 3 + rnd() * 66, y = 3 + rnd() * 66; if (Math.hypot(x - 36, y - 36) < 15 || (x < 27 && y > 42) || [[54, 8], [60, 18], [8, 10], [56, 54]].some(([a, b]) => x > a - 2 && x < a + 9 && y > b - 2 && y < b + 8)) continue; B.tree(x, y, 0.45 + rnd() * 0.4); }
    for (const [x, y] of [[20, 20], [52, 30], [28, 60], [62, 64], [6, 30], [46, 8]]) B.loot(x, y);
  }),
  port: brBuild('The Port', { width: 72, height: 60 }, { ground: 0x6b6f73, sky: 0xa8c8e0, grass: 0x6b6f73 }, 'Shipping containers stacked into towers, warehouses and a garage by the docks.', B => {
    const box = (x, y, rot, lv = 0) => rot ? B.wall(x, y, x + 2.4, y + 6, lv, 'container') : B.wall(x, y, x + 6, y + 2.4, lv, 'container');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) box(26 + i * 7.5, 6 + j * 5.5, false);
    for (let i = 0; i < 3; i++) box(26 + i * 9, 26, true);
    B.mesa(48, 32, 64, 46, 1, 'container'); B.ramp(42, 36, 48, 39, 0, 0, 'metal'); B.mesa(56, 35, 62, 43, 2, 'container'); B.ramp(51, 37, 56, 40, 0, 1, 'metal');   // a container tower: two levels
    B.loot(59, 39, 2); B.loot(50, 44, 1); B.loot(62, 34, 1);
    B.building(4, 4, 16, 12, { doors: { s: [[0.3, 3], [0.75, 3]], e: [[0.5, 2.6]] }, kind: 'warehouse', loot: 4 }); B.building(4, 24, 14, 12, { doors: { e: [[0.5, 3]], n: [[0.5, 2.6]] }, kind: 'warehouse', loot: 3 });
    B.garage(6, 42, 18, 14, 2, { open: 'n' });
    for (const [x, y] of [[30, 36], [36, 46], [64, 8], [66, 22], [30, 54]]) B.wall(x, y, x + 2.4, y + 1.6, 0, 'crate');
    for (const [x, y] of [[36, 22], [60, 24], [40, 52], [24, 32], [68, 54], [44, 4]]) B.loot(x, y);
  }),
  suburbs: brBuild('The Suburbs', { width: 64, height: 64 }, { ground: 0x4f7a3a, sky: 0xa6d0f0, grass: 0x4f7a3a }, 'Houses to raid, a two-floor mall with a ramp in the atrium, and a garage.', B => {
    for (const [x, y, d] of [[4, 4, 's'], [16, 4, 's'], [28, 4, 's'], [4, 52, 'n'], [16, 52, 'n'], [28, 52, 'n'], [52, 4, 'w'], [52, 16, 'w']]) B.building(x, y, 9, 8, { doors: { [d]: [[0.5, 2.2]] }, kind: 'house', loot: 1 });
    // the mall: walls with entrances, an upper floor round an atrium, a ramp up from the atrium floor
    const mx = 20, my = 22, mw = 26, mh = 18;
    B.side(mx, my, mx + mw, my, [[0.5, 3.2]], 0, 'mall'); B.side(mx, my + mh, mx + mw, my + mh, [[0.2, 3.2], [0.8, 3.2]], 0, 'mall'); B.side(mx, my, mx, my + mh, [[0.5, 3]], 0, 'mall'); B.side(mx + mw, my, mx + mw, my + mh, [[0.5, 3]], 0, 'mall');
    B.floor(mx, my, mx + 7, my + mh, 1, 'mall'); B.floor(mx + mw - 7, my, mx + mw, my + mh, 1, 'mall'); B.floor(mx + 7, my, mx + mw - 7, my + 4, 1, 'mall'); B.floor(mx + 7, my + mh - 4, mx + mw - 7, my + mh, 1, 'mall');
    B.ramp(mx + 7, my + 5, mx + 16, my + 8, 2, 0);                         // (rises to the west, onto the west wing)
    for (const [x, y, lv] of [[mx + 13, my + 12, 0], [mx + 3, my + mh - 4, 0], [mx + mw - 3, my + 4, 0]]) B.loot(x, y, lv);
    B.loot(mx + 3, my + 4, 1); B.loot(mx + mw - 3, my + mh - 4, 1); B.loot(mx + 12, my + 2, 1);
    B.floor(mx, my, mx + mw, my + mh, 2, 'roof');
    B.garage(48, 40, 14, 14, 3);
    for (let i = 0; i < 20; i++) B.tree(2 + (i * 13.7) % 60, 18 + (i * 7.3) % 30, 0.5);
    for (const [x, y] of [[10, 20], [12, 40], [50, 32], [40, 60], [2, 30]]) B.loot(x, y);
  }),
  canyon: brBuild('The Canyon', { width: 72, height: 72 }, { ground: 0xc08a5a, sky: 0xf0c890, grass: 0xc08a5a }, 'Red-rock mesas, ramps cut into the cliffs, skybridges and a fort on the high ground.', B => {
    B.mesa(6, 6, 24, 22, 1); B.ramp(24, 10, 30, 14, 2, 0, 'rock');
    B.mesa(46, 8, 66, 26, 1); B.mesa(52, 12, 62, 22, 2); B.ramp(40, 18, 46, 22, 0, 0, 'rock'); B.ramp(48, 13, 52, 17, 0, 1, 'rock');
    B.mesa(8, 46, 26, 66, 1); B.ramp(14, 40, 18, 46, 1, 0, 'rock'); B.mesa(28, 30, 42, 42, 2, 'rock'); B.mesa(16, 33, 28, 39, 1, 'rock'); B.ramp(10, 34, 16, 38, 0, 0, 'rock'); B.ramp(21, 34, 28, 38, 0, 1, 'rock');
    B.floor(42, 34, 52, 37, 2, 'bridge'); B.floor(52, 22, 55, 37, 2, 'bridge');                                                                  // skybridges from the centre mesa to the high mesa
    for (const [x, y, w, h] of [[30, 31, 4, 0.8], [36, 39, 5, 0.8], [33, 34, 0.8, 4], [38, 33, 0.8, 3]]) B.wall(x, y, x + w, y + h, 2, 'wall');   // the fort on the centre mesa
    for (const [x, y, lv] of [[35, 36, 2], [57, 17, 2], [15, 14, 1], [17, 56, 1], [60, 24, 1], [48, 35.5, 2]]) B.loot(x, y, lv);
    for (const [x, y] of [[36, 52], [56, 44], [62, 62], [4, 32], [36, 4], [50, 60]]) B.wall(x, y, x + 2, y + 2, 0, 'rock');
    for (const [x, y] of [[34, 56], [60, 40], [30, 20], [6, 36], [66, 66], [44, 64]]) B.loot(x, y);
  })
};

/* ----- the game ----- */
MODES.br = {
  outdoor: true, holdFire: true, noUnstick: false, slowKeys: ['L'],
  map: m => BR_MAPS[m.mini.map] || BR_MAPS.downtown,
  init(m) {
    const g = m.gs, M = this.map(m), sq = m.mini.squad || 1; g.map = m.mini.map; g.t = 0; g.L = []; g.lid = 0; g.dead = [];
    const order = m.chairs.slice().sort((a, b) => (b.player ? 1 : 0) - (a.player ? 1 : 0));   // people first, so friends on one screen share a team
    order.forEach((c, i) => { c.gs = { team: Math.floor(i / sq), lv: 0, z: 0, ramp: -1, air: 0, vz: 0, ap: 0, hp: BR.hp, sh: 0, inv: [], sel: 0, cd: 0, boost: 0, kills: 0, dmg: 0 }; });
    g.teams = Math.ceil(m.chairs.length / sq);
    const R = Math.hypot(m.width, m.height) / 2 + 4; g.st = { x: m.width / 2, y: m.height / 2, r: R, fx: m.width / 2, fy: m.height / 2, fr: R, ph: 0, wait: 45, shrink: 0, sx: 0, sy: 0, sr: R };
    for (const [x, y, lv] of M.loot) this.drop(m, x, y, lv, Math.random() < 0.72 ? 'chest' : 'ammo');      // chests (guns) and ammo crates where the map puts loot
    for (let i = 0; i < 12; i++) { const p = this.freeGround(m); if (p) this.drop(m, p.x, p.y, 0, Math.random() < 0.6 ? 'chest' : 'ammo'); }
    for (let i = 0; i < 34; i++) { const p = this.freeGround(m); if (p) this.drop(m, p.x, p.y, 0, ['med', 'med', 'med', 'pot', 'pot', 'boost', 'wall'][Math.floor(Math.random() * 7)]); }   // health and items lying in the open
  },
  pickLoot() { let tot = 0; for (const [, w] of BR_LOOT) tot += w; let r = Math.random() * tot; for (const [k, w] of BR_LOOT) { if ((r -= w) <= 0) return k; } return 'pistol'; },
  drop(m, x, y, lv, k, a) { k = k || (lv > 0 && Math.random() < 0.6 ? ['rifle', 'sniper', 'rocket', 'pot', 'shotgun', 'wall'][Math.floor(Math.random() * 6)] : this.pickLoot());   // the high ground has the better loot
    const g = m.gs; g.L.push([++g.lid, k, MG.r2(x), MG.r2(y), lv, a === undefined ? (BR_GUNS[k] ? BR_GUNS[k].ammo : k === 'ammo' ? 0 : 1) : a]); },
  freeGround(m) { const M = this.map(m), R = R_CART() + 0.4; for (let t = 0; t < 40; t++) { const x = 3 + Math.random() * (m.width - 6), y = 3 + Math.random() * (m.height - 6); if (!M.walls.some(w => w.lv === 0 && x > w.x0 - R && x < w.x1 + R && y > w.y0 - R && y < w.y1 + R) && !M.ramps.some(r => x > r.x0 - R && x < r.x1 + R && y > r.y0 - R && y < r.y1 + R) && !M.trees.some(t2 => Math.hypot(t2.x - x, t2.y - y) < t2.r + R)) return { x, y }; } return null; },
  kickoff(m) {                                                            // teams start spread round the map, team-mates together
    const spots = []; for (let t = 0; t < m.gs.teams; t++) { let best = null; for (let k = 0; k < 30; k++) { const p = this.freeGround(m); if (!p) continue; const d = Math.min(99, ...spots.map(s => Math.hypot(s.x - p.x, s.y - p.y))); if (!best || d > best.d) best = { ...p, d }; } spots.push(best || { x: m.width / 2, y: m.height / 2 }); }
    for (const c of m.chairs) { const s = spots[c.gs.team], j = m.chairs.filter(o => o.gs.team === c.gs.team).indexOf(c), x = s.x + (j % 2) * 1.3, y = s.y + Math.floor(j / 2) * 1.3, h = Math.atan2(m.height / 2 - y, m.width / 2 - x); Object.assign(c, { x, y, px: x, py: y, heading: h, ph: h, vx: 0, vy: 0 }); }
  },
  /* where a cart may be: walls, ramps (solid except at their ends), floors (on an upper level), trees */
  ramp: (r, x, y) => r.dir === 0 ? (x - r.x0) / (r.x1 - r.x0) : r.dir === 1 ? (y - r.y0) / (r.y1 - r.y0) : r.dir === 2 ? (r.x1 - x) / (r.x1 - r.x0) : (r.y1 - y) / (r.y1 - r.y0),
  onFloor(M, lv, x, y, pad = 0.2) {                                       // inside the floors of this level (their union: seams between floors do not block; a ramp end counts as floor at the edge)
    const inF = (px, py) => M.floors.some(f => f.lv === lv && px >= f.x0 && px <= f.x1 && py >= f.y0 && py <= f.y1), inR = (px, py) => M.ramps.some(q => (q.lv === lv || q.lv + 1 === lv) && px >= q.x0 && px <= q.x1 && py >= q.y0 && py <= q.y1);
    if (!inF(x, y)) return false; for (const [px, py] of [[x - pad, y], [x + pad, y], [x, y - pad], [x, y + pad]]) if (!inF(px, py) && !inR(px, py)) return false; return true;
  },
  jump(c, m) {                                                            // X: hop (off a roof, over a gap, to dodge)
    const G = c.gs; if (c.out || G.air || !m || m.state !== 'play') return;
    G.air = 1; G.vz = BR.jumpV; G.ramp = -1; m.sfx('bump');
  },
  floorAt(M, lv, x, y) { return lv === 0 || M.floors.some(f => f.lv === lv && x >= f.x0 && x <= f.x1 && y >= f.y0 && y <= f.y1); },
  fly(m, c, h) {                                                          // in the air: gravity, walls at the height you are at, and land on whatever is below
    const M = this.map(m), G = c.gs, R = R_CART(), K = CONFIG.chair, z0 = G.z; let z = z0 + G.vz * h; G.vz -= BR.grav * h;
    const top = Math.max(0, ...M.floors.map(f => f.lv));
    if (G.vz > 0) for (let k = 1; k <= top; k++) if (k * BR.H > z0 && z + BR.headroom > k * BR.H && this.floorAt(M, k, c.x, c.y)) { z = k * BR.H - BR.headroom; G.vz = 0; }   // bonk: the floor above
    const lvNow = Math.max(0, Math.floor((z + 0.3) / BR.H));
    for (const w of M.walls) if (w.lv === lvNow) MG.rectPush(c, R, w, K.boardBounce);
    if (lvNow === 0 && z < 3) for (const t of M.trees) { const dx = c.x - t.x, dy = c.y - t.y, d = Math.hypot(dx, dy), mn = R + t.r; if (d < mn && d > 0) { c.x = t.x + dx / d * mn; c.y = t.y + dy / d * mn; } }
    for (const q of M.ramps) {                                            // a ramp: land on its deck, or bump its side if you are below the deck
      if (c.x < q.x0 || c.x > q.x1 || c.y < q.y0 || c.y > q.y1) continue; const t = this.ramp(q, c.x, c.y), sz = (q.lv + Math.max(0, Math.min(1, t))) * BR.H;
      if (z <= sz && z0 >= sz - 0.6 && G.vz <= 0) { this.land(m, c, sz); G.ramp = q.id; G.lv = t >= 1 ? q.lv + 1 : q.lv; return; }
      if (z < sz - 0.6) MG.rectPush(c, R, q, K.boardBounce);
    }
    if (G.vz <= 0) for (let k = Math.min(top, Math.floor(z0 / BR.H + 0.01)); k >= 0; k--) if (z <= k * BR.H && z0 >= k * BR.H - 0.05 && this.floorAt(M, k, c.x, c.y)) { this.land(m, c, k * BR.H); G.lv = k; return; }
    if (c.x < R) c.x = R; if (c.y < R) c.y = R; if (c.x > m.width - R) c.x = m.width - R; if (c.y > m.height - R) c.y = m.height - R;
    G.z = MG.r2(z); G.lv = Math.max(0, Math.floor((z + 0.05) / BR.H));
  },
  land(m, c, z) {
    const G = c.gs, v = -G.vz; G.air = 0; G.vz = 0; G.z = MG.r2(z);
    if (v > BR.fallSafe) { this.hurt(m, c, (v - BR.fallSafe) * BR.fallDmg, null, true); if (c.player) this.say(m, c, 'OOF'); }   // a long drop hurts a little
    if (v > 3) m.sfx('bump');
  },
  move(m, c, h) {
    const M = this.map(m), G = c.gs, R = R_CART(), K = CONFIG.chair;
    if (G.air) return this.fly(m, c, h || 1 / 120);
    let r = G.ramp >= 0 ? M.ramps[G.ramp] : null;
    if (!r) for (const q of M.ramps) { if (c.x < q.x0 || c.x > q.x1 || c.y < q.y0 || c.y > q.y1) continue; const t = this.ramp(q, c.x, c.y); if ((q.lv === G.lv && t < 0.3) || (q.lv + 1 === G.lv && t > 0.7)) { r = q; break; } }
    if (r) {                                                                // on a ramp: the side rails keep you on it; leave by either end
      G.ramp = r.id; if (r.dir % 2 === 0) { if (c.y < r.y0 + R) { c.y = r.y0 + R; c.vy = Math.max(0, c.vy); } if (c.y > r.y1 - R) { c.y = r.y1 - R; c.vy = Math.min(0, c.vy); } } else { if (c.x < r.x0 + R) { c.x = r.x0 + R; c.vx = Math.max(0, c.vx); } if (c.x > r.x1 - R) { c.x = r.x1 - R; c.vx = Math.min(0, c.vx); } }
      const t = this.ramp(r, c.x, c.y); if (t <= 0) { G.lv = r.lv; G.ramp = -1; } else if (t >= 1) { G.lv = r.lv + 1; G.ramp = -1; }
      G.z = MG.r2((r.lv + Math.max(0, Math.min(1, t))) * BR.H); return;
    }
    G.ramp = -1; G.z = G.lv * BR.H;
    for (const w of M.walls) if (w.lv === G.lv) MG.rectPush(c, R, w, K.boardBounce);
    for (const q of M.ramps) {                                           // a ramp is solid from the sides; its foot (or its top, from above) is open
      if (q.lv !== G.lv && q.lv + 1 !== G.lv) continue;
      const t = this.ramp(q, c.x, c.y), lat = q.dir % 2 === 0 ? c.y > q.y0 + 0.1 && c.y < q.y1 - 0.1 : c.x > q.x0 + 0.1 && c.x < q.x1 - 0.1, L = q.dir % 2 === 0 ? q.x1 - q.x0 : q.y1 - q.y0, e = (R + 0.3) / L;
      if (lat && ((q.lv === G.lv && t > -e && t < 0.3) || (q.lv + 1 === G.lv && t > 0.7 && t < 1 + e))) continue;
      MG.rectPush(c, R, q, K.boardBounce);
    }
    for (const o of MG.all(m, 'dwall')) if (o.lv === G.lv) for (const p of this.wallPosts(o)) { const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy), mn = R + 0.42; if (d < mn && d > 0) { c.x = p.x + dx / d * mn; c.y = p.y + dy / d * mn; } }
    if (G.lv === 0) { for (const t of M.trees) { const dx = c.x - t.x, dy = c.y - t.y, d = Math.hypot(dx, dy), mn = R + t.r; if (d < mn && d > 0) { c.x = t.x + dx / d * mn; c.y = t.y + dy / d * mn; const vn = (c.vx * dx + c.vy * dy) / d; if (vn < 0) { c.vx -= 1.4 * vn * dx / d; c.vy -= 1.4 * vn * dy / d; } } } }
    else if (c.player && !this.floorAt(M, G.lv, c.x, c.y) && !M.ramps.some(q => (q.lv === G.lv || q.lv + 1 === G.lv) && c.x >= q.x0 && c.x <= q.x1 && c.y >= q.y0 && c.y <= q.y1)) { G.air = 1; G.vz = 0; }   // people can drive off the edge (and drop)
    else if (!c.player && !this.onFloor(M, G.lv, c.x, c.y)) {                // the CPU: railings at the edge of every floor (so it keeps to its route)
      if (this.onFloor(M, G.lv, c.x, c.py)) { c.y = c.py; c.vy = 0; } else if (this.onFloor(M, G.lv, c.px, c.y)) { c.x = c.px; c.vx = 0; } else { c.x = c.px; c.y = c.py; c.vx = c.vy = 0; }
    }
  },
  wallPosts: o => [-1, 0, 1].map(k => ({ x: o.x - Math.sin(o.a) * k * 0.85, y: o.y + Math.cos(o.a) * k * 0.85 })),
  noCollide: (a, b) => Math.abs((a.gs.z || 0) - (b.gs.z || 0)) > 1,
  step(m, h) {
    const g = m.gs, M = this.map(m); g.t += h;
    for (const c of m.chairs) {
      const G = c.gs; if (c.out) continue;
      G.cd = Math.max(0, G.cd - h); G.boost = Math.max(0, G.boost - h); G.hitT = Math.max(0, (G.hitT || 0) - h);
      this.move(m, c, h);
      const S = g.st; if (Math.hypot(c.x - S.x, c.y - S.y) > S.r && g.t > BR.grace) this.hurt(m, c, [1, 2, 4, 6, 8, 12, 20][Math.min(6, S.ph)] * h, null, true);   // outside the storm circle
      for (const L of g.L) {                                              // drive over loot to pick it up
        if (L[4] !== G.lv || G.ramp >= 0 || G.air || Math.hypot(c.x - L[2], c.y - L[3]) > R_CART() + 0.4 || (L[7] === c.k && L[6] > g.t)) continue;   // (not what you just dropped)
        if (this.take(m, c, L)) { g.L = g.L.filter(x => x !== L); break; }
      }
    }
    this.storm(m, h);
    for (const o of MG.all(m, 'bul')) this.bullet(m, o, h);
    for (const o of MG.all(m, 'boom')) { o.life -= h; if (o.life <= 0) MG.remove(m, o); }
    for (const o of MG.all(m, 'dwall')) if (g.t > o.until || o.hp <= 0) MG.remove(m, o);
  },
  take(m, c, L) {
    const G = c.gs, [, k, , , , a] = L, inv = G.inv;
    if (k === 'chest') {                                                  // a chest: it bursts open with a gun (and its ammo), and often something else
      const gun = (L[4] > 0 && Math.random() < 0.6 ? ['rifle', 'sniper', 'rocket', 'shotgun'] : ['pistol', 'pistol', 'smg', 'smg', 'shotgun', 'rifle', 'rifle', 'sniper', 'rocket'])[Math.floor(Math.random() * (L[4] > 0 ? 4 : 9))], g2 = BR_GUNS[gun];
      const a0 = c.heading + Math.PI, out = (k2, a2, n) => this.drop(m, L[2] + Math.cos(a0 + n) * 1.1, L[3] + Math.sin(a0 + n) * 1.1, L[4], k2, a2);
      out(gun, Math.ceil(g2.ammo * 0.75), -0.5); if (Math.random() < 0.7) out(['med', 'pot', 'boost', 'wall', 'pot'][Math.floor(Math.random() * 5)], 1, 0.5);
      m.sfx('select'); MG.add(m, { t: 'boom', x: L[2], y: L[3], z: L[4] * BR.H, life: 0.5, wave: 1 }); if (c.player) this.say(m, c, 'CHEST OPENED'); return true;
    }
    if (k === 'ammo') { let any = false; for (const it of inv) if (BR_GUNS[it.k] && it.a < BR_GUNS[it.k].ammo * 2) { it.a = Math.min(BR_GUNS[it.k].ammo * 2, it.a + Math.ceil(BR_GUNS[it.k].ammo * 0.8)); any = true; } if (any && c.player) this.say(m, c, 'AMMO CRATE: AMMO FOR YOUR GUNS'); else if (!any && c.player && !inv.some(it => BR_GUNS[it.k]) && !(G.ammoMsg > m.simTime)) { G.ammoMsg = m.simTime + 3; this.say(m, c, 'NO GUN YET: OPEN A CHEST'); } return any; }   // ammo crates refill the guns you have
    const same = inv.find(it => it.k === k);
    if (BR_GUNS[k] && same) { if (same.a >= BR_GUNS[k].ammo * 2) return false; same.a = Math.min(BR_GUNS[k].ammo * 2, same.a + a); if (c.player) this.say(m, c, '+' + BR_GUNS[k].name + ' AMMO'); return true; }
    if (BR_ITEMS[k] && same && same.a < BR_ITEMS[k].stack) { same.a++; if (c.player) this.say(m, c, BR_ITEMS[k].name); return true; }
    if (inv.length >= BR.slots) { if (c.player && !(G.fullAt > m.simTime)) { G.fullAt = m.simTime + 2; this.say(m, c, 'INVENTORY FULL: press B to drop something'); } return false; }
    inv.push({ k, a }); if (c.player) { m.sfx('select'); this.say(m, c, (BR_GUNS[k] || BR_ITEMS[k]).name); }
    if (!c.player) G.sel = this.bestSlot(c, 99);                         // the CPU holds its best gun
    return true;
  },
  say(m, c, t) { MG.notice(m, `${MG.up(m.name(c))}: ${t}`, 1.1); },
  storm(m, h) {                                                            // the storm circle: wait, then shrink towards a new, smaller circle inside it
    const S = m.gs.st, PH = [[45, 25, 0.62], [30, 20, 0.42], [25, 18, 0.26], [20, 15, 0.12], [15, 12, 0.03], [8, 15, 0]];
    if (S.ph >= PH.length) return;
    if (S.wait > 0) { S.wait -= h; if (S.wait <= 0) { const [, sh, f] = PH[S.ph], nr = f ? Math.max(1.5, Math.min(m.width, m.height) * f) : 0, a = Math.random() * Math.PI * 2, d = Math.random() * Math.max(0, S.r - nr) * 0.6; S.sx = S.x; S.sy = S.y; S.sr = S.r; S.fx = Math.max(nr * 0.5, Math.min(m.width - nr * 0.5, S.x + Math.cos(a) * d)); S.fy = Math.max(nr * 0.5, Math.min(m.height - nr * 0.5, S.y + Math.sin(a) * d)); S.fr = nr; S.shrink = sh; S.st = sh; MG.notice(m, 'THE STORM IS CLOSING IN!', 2); m.sfx('whistle'); } return; }
    S.shrink -= h; const k = 1 - Math.max(0, S.shrink) / S.st; S.x = S.sx + (S.fx - S.sx) * k; S.y = S.sy + (S.fy - S.sy) * k; S.r = S.sr + (S.fr - S.sr) * k;
    if (S.shrink <= 0) { S.ph++; S.wait = S.ph < PH.length ? PH[S.ph][0] : 0; }
  },
  bullet(m, o, h) {
    const M = this.map(m), n = 4; let hit = false, lv = 0; const top = Math.max(0, ...M.floors.map(f => f.lv));
    for (let s = 0; s < n && !hit; s++) {
      const hz0 = o.z + 0.55; o.x += o.vx * h / n; o.y += o.vy * h / n; o.z += (o.vz || 0) * h / n; const hz = o.z + 0.55; lv = Math.max(0, Math.floor(hz / BR.H));
      if (o.x < 0 || o.y < 0 || o.x > m.width || o.y > m.height || hz < 0.02 || hz > (top + 2) * BR.H) { hit = true; break; }
      if (o.vz) for (let k = 1; k <= top; k++) if ((hz0 - k * BR.H) * (hz - k * BR.H) < 0 && this.floorAt(M, k, o.x, o.y)) { hit = true; break; }   // a floor (or ceiling) stops it
      if (hit) break;
      if (M.walls.some(w => w.lv === lv && o.x > w.x0 && o.x < w.x1 && o.y > w.y0 && o.y < w.y1) || (lv === 0 && M.trees.some(t => Math.hypot(o.x - t.x, o.y - t.y) < t.r))) { hit = true; break; }
      for (const w of MG.all(m, 'dwall')) if (w.lv === lv && this.wallPosts(w).some(p => Math.hypot(o.x - p.x, o.y - p.y) < 0.5)) { w.hp -= BR_GUNS[o.w].dmg * (o.w === 'rocket' ? 3 : 1); hit = true; break; }
      if (hit) break;
      const sh = m.chairs[o.k];
      for (const c of m.chairs) { if (c === sh || c.out || (sh && c.gs.team === sh.gs.team) || (o.z + 0.55) < c.gs.z - 0.1 || (o.z + 0.55) > c.gs.z + 1.3) continue; if (Math.hypot(c.x - o.x, c.y - o.y) < R_CART() + 0.12) { if (o.w !== 'rocket') this.hurt(m, c, BR_GUNS[o.w].dmg, sh); hit = true; break; } }
    }
    if (hit && o.w === 'rocket') { const G = BR_GUNS.rocket; MG.add(m, { t: 'boom', x: MG.r2(o.x), y: MG.r2(o.y), z: o.z, life: 0.7 }); m.sfx('goal'); for (const c of m.chairs) { if (c.out || Math.abs(c.gs.z - o.z) > 1.5) continue; const d = Math.hypot(c.x - o.x, c.y - o.y); if (d < G.splash) { const sh = m.chairs[o.k]; if (!(sh && c.gs.team === sh.gs.team && c !== sh)) this.hurt(m, c, G.dmg * (1 - d / G.splash * 0.6) * (c === sh ? 0.4 : 1), sh); const k = 5 * (1 - d / G.splash); c.vx += (c.x - o.x) / (d || 1) * k; c.vy += (c.y - o.y) / (d || 1) * k; } } }
    if (hit || m.gs.t > o.until) MG.remove(m, o); else { o.x = MG.r2(o.x); o.y = MG.r2(o.y); o.z = Math.round(o.z * 1000) / 1000; }
  },
  hurt(m, c, dmg, by, storm) {
    const G = c.gs; if (c.out || (!storm && m.gs.t < BR.grace)) return;
    if (!storm) { const s = Math.min(G.sh, dmg); G.sh -= s; dmg -= s; } G.hp -= dmg; G.hitT = 0.25; if (by && by !== c) { by.gs.dmg += dmg; by.gs.hm = MG.r2(m.gs.t); }
    G.sh = Math.round(G.sh * 10) / 10; G.hp = Math.round(G.hp * 10) / 10;
    if (G.hp > 0) return;
    MH.out(m, c); G.hp = 0; m.gs.dead.push(c.k); m.sfx('foul');                 // eliminated: drop everything
    G.inv.forEach((it, i) => this.drop(m, c.x + Math.cos(i * 1.3) * 0.9, c.y + Math.sin(i * 1.3) * 0.9, G.lv, it.k, it.a)); G.inv = [];
    const feed = m.gs.feed || (m.gs.feed = []); feed.push([by && by !== c ? m.name(by) : '', m.name(c), by && by !== c && by.gs.inv[by.gs.sel] ? by.gs.inv[by.gs.sel].k : 'storm', MG.r2(m.gs.t), by ? by.gs.team : -1, c.gs.team]); if (feed.length > 5) feed.shift();
    c.gs.by = by && by !== c ? by.k : -1;
    if (by && by !== c) { by.gs.kills++; MG.notice(m, `${MG.up(m.name(by))} ELIMINATED ${MG.up(m.name(c))}`, 2); if (Math.random() < 0.4) m.line(`${m.name(c)} is out. ${m.name(by)} gets the elimination.`); }
    else MG.notice(m, `${MG.up(m.name(c))} WAS CAUGHT IN THE STORM`, 2);
    const alive = new Set(MG.live(m).map(o => o.gs.team));
    if (alive.size <= 1) this.end(m, [...alive][0]);
  },
  end(m, team) {
    if (m.state !== 'play') return; const sq = m.mini.squad || 1, place = c => c.out ? m.gs.dead.indexOf(c.k) : 1e6;
    const teamPlace = t => Math.max(...m.chairs.filter(c => c.gs.team === t).map(place));
    const rows = m.chairs.slice().sort((a, b) => teamPlace(b.gs.team) - teamPlace(a.gs.team) || b.gs.kills - a.gs.kills).map(c => ({ c, text: `${c.gs.kills} elimination${c.gs.kills === 1 ? '' : 's'}, ${Math.round(c.gs.dmg)} damage${sq > 1 ? `  (team ${c.gs.team + 1})` : ''}` }));
    const win = m.chairs.filter(c => c.gs.team === team);
    m.finishGame(team === undefined ? 'NOBODY SURVIVED' : sq === 1 ? `${MG.up(m.name(win[0]))} WINS!` : `TEAM ${team + 1} WINS!`, rows, -1, team === undefined ? '' : sq > 1 ? win.map(c => m.name(c)).join(' + ') + ': victory royale' : 'Victory royale!');
  },
  /* A / X: fire the gun you hold, or use the item. Y: next slot. */
  cycle(c, m) { const G = c.gs; if (!G.inv.length || c.out) return; G.sel = (G.sel + 1) % G.inv.length; if (c.player) m.sfx('blip'); },
  use(c, m) {
    const G = c.gs, it = G.inv[G.sel]; if (!it || G.cd > 0 || c.out) return;
    const gun = BR_GUNS[it.k];
    if (gun) {
      if (it.a <= 0) { G.cd = 0.4; if (c.player) { m.sfx('back'); this.say(m, c, 'OUT OF AMMO'); } return; }
      it.a--; G.cd = gun.cd; const f = c.toWorld(0.8, 0), err = c.player ? 0 : (Math.random() - 0.5) * (0.08 + ((m.difficulty || {}).reaction || 0.2) * 0.6), aim = this.aim(c, m, gun), pitch = this.aimP, cp = Math.cos(pitch), vz = Math.round(Math.sin(pitch) * gun.spd * 1000) / 1000;
      for (let p = 0; p < (gun.pellets || 1); p++) { const a = aim + err + (Math.random() - 0.5) * gun.spread * (gun.pellets ? 1 : 1.4); MG.add(m, { t: 'bul', w: it.k, k: c.k, x: MG.r2(f.x), y: MG.r2(f.y), z: G.z, vx: MG.r2(Math.cos(a) * gun.spd * cp + c.vx * 0.3), vy: MG.r2(Math.sin(a) * gun.spd * cp + c.vy * 0.3), vz, until: MG.r2(m.gs.t + gun.life) }); }
      m.sfx(it.k === 'rocket' || it.k === 'sniper' || it.k === 'shotgun' ? 'bump' : 'blip'); return;
    }
    const I = it.k;                                                       // items
    if (I === 'med') { if (G.hp >= BR.hp) return this.say(m, c, 'HEALTH IS FULL'); G.hp = Math.min(BR.hp, G.hp + 50); }
    else if (I === 'pot') { if (G.sh >= BR.maxShield) return this.say(m, c, 'SHIELD IS FULL'); G.sh = Math.min(BR.maxShield, G.sh + 50); }
    else if (I === 'boost') G.boost = 3;
    else if (I === 'wall') { const p = c.toWorld(1.6, 0); MG.add(m, { t: 'dwall', x: MG.r2(p.x), y: MG.r2(p.y), a: MG.r2(c.heading), lv: G.lv, z: G.z, hp: 150, until: m.gs.t + 25 }); }
    m.sfx('select'); G.cd = 0.8; it.a--; if (it.a <= 0) { G.inv.splice(G.sel, 1); G.sel = Math.max(0, Math.min(G.sel, G.inv.length - 1)); }
  },
  cmd(c, cmd, m) { if (c.player && c.player.invOpen) return { x: 0, y: 0, spin: 0, speed: 0 }; if (c.gs.boost > 0) c.speedMul *= 1.75; return cmd; },   // (the inventory is open: the cart coasts to a stop)
  aim(c, m, gun) {                                                        // where a shot goes: your heading turned by the right stick, tilted up or down (this.aimP), with a little aim assist for people
    const G = c.gs, L = this.map(m); let a = c.heading + (c.player && c.player._look ? c.player._look.x * CONFIG.view3d.look.yaw * Math.PI / 180 : 0), p = brPitch(c);
    let best = null, bo = c.player ? 0.16 : 0.45;
    for (const o of MG.live(m)) {
      if (o.gs.team === G.team) continue; const d = MH.dist(c, o); if (d > gun.range * 1.3 || d < 0.3) continue;
      const lead = d / gun.spd, oa = Math.atan2(o.y + (o.vy || 0) * lead - c.y, o.x + (o.vx || 0) * lead - c.x), op = Math.atan2(o.gs.z - G.z + 0.25, d), off = Math.abs(normalizeAngle(oa - a));
      if (off > bo || (c.player && Math.abs(op - p) > 0.28)) continue;
      if (o.gs.lv === G.lv && !MG.clearPath(c.x, c.y, o.x, o.y, L.walls.filter(w => w.lv === G.lv), 0.05)) continue;
      bo = off; best = { a: oa, p: op };
    }
    if (!c.player) { this.aimP = best ? best.p : 0; return a; }               // the CPU: its own heading, tilted at whoever it is facing
    this.aimP = best ? best.p : p; return best ? best.a : a;
  },
  invAct(c, act, m) {                                                        // the inventory screen (B): swap two slots, hold one, drop one
    const G = c.gs, inv = G.inv; if (c.out || !act || !m) return; const { op, a, b } = act;
    if (op === 'swap' && inv[a] && b >= 0 && b < BR.slots) { const held = inv[G.sel]; if (b >= inv.length) { inv.push(inv.splice(a, 1)[0]); } else [inv[a], inv[b]] = [inv[b], inv[a]]; G.sel = Math.max(0, inv.indexOf(held)); }
    else if (op === 'sel' && inv[a]) G.sel = a;
    else if (op === 'drop' && inv[a]) { const it = inv.splice(a, 1)[0], q = c.toWorld(-1.3, 0), g = m.gs; this.drop(m, q.x, q.y, G.lv, it.k, it.a); const L = g.L[g.L.length - 1]; L[6] = MG.r2(g.t + 2.5); L[7] = c.k; G.sel = Math.max(0, Math.min(G.sel > a ? G.sel - 1 : G.sel, inv.length - 1)); m.sfx('back'); }
  },
  bestSlot(c, d) { const inv = c.gs.inv; let best = -1, bs = -1; inv.forEach((it, i) => { const g = BR_GUNS[it.k]; if (!g || it.a <= 0) return; const s = (d <= g.range ? 10 : 2) + g.dmg * (g.pellets || 1) / g.cd / 20 - Math.max(0, d - g.range) * 0.5; if (s > bs) { bs = s; best = i; } }); return best < 0 ? c.gs.sel : best; },
  /* The CPU: a route over every level (A* on a 1.2 m grid per level, with the ramps as links between levels). */
  nav(m) {
    if (m.brNav) return m.brNav; const M = this.map(m), cs = 1.2, W = Math.ceil(m.width / cs), H = Math.ceil(m.height / cs), top = Math.max(0, ...M.floors.map(f => f.lv)), Lc = top + 1, g = new Uint8Array(W * H * Lc), pad = R_CART() + 0.15;
    for (let L = 0; L < Lc; L++) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = (i + 0.5) * cs, y = (j + 0.5) * cs, inR = (q, p) => x > q.x0 - p && x < q.x1 + p && y > q.y0 - p && y < q.y1 + p;
      let bad = x < pad || y < pad || x > m.width - pad || y > m.height - pad || M.walls.some(w => w.lv === L && inR(w, pad)) || M.ramps.some(q => (q.lv === L || q.lv + 1 === L) && inR(q, pad));
      if (!bad && L === 0) bad = M.trees.some(t => Math.hypot(t.x - x, t.y - y) < t.r + pad);
      if (!bad && L > 0) bad = !this.onFloor(M, L, x, y, pad);
      g[(L * H + j) * W + i] = bad ? 1 : 0;
    }
    const links = new Map(), cell = (x, y, L) => (L * H + Math.max(0, Math.min(H - 1, Math.floor(y / cs)))) * W + Math.max(0, Math.min(W - 1, Math.floor(x / cs)));
    for (const q of M.ramps) {                                             // a ramp links the ground in front of its foot to the floor beyond its top
      const ux = [1, 0, -1, 0][q.dir], uy = [0, 1, 0, -1][q.dir], cx = (q.x0 + q.x1) / 2, cy = (q.y0 + q.y1) / 2, half = q.dir % 2 === 0 ? (q.x1 - q.x0) / 2 : (q.y1 - q.y0) / 2;
      const a = cell(cx - ux * (half + 1.5), cy - uy * (half + 1.5), q.lv), b = cell(cx + ux * (half + 1.5), cy + uy * (half + 1.5), q.lv + 1), cost = half * 2 / cs + 1;
      if (!g[a] && !g[b]) { (links.get(a) || links.set(a, []).get(a)).push([b, cost, q]); (links.get(b) || links.set(b, []).get(b)).push([a, cost, q]); }
    }
    return (m.brNav = { cs, W, H, Lc, g, links, cell });
  },
  route(m, c, tx, ty, tl) {
    const N = this.nav(m), { cs, W, H, Lc, g, links } = N, per = W * H;
    const free = k => { if (!g[k]) return k; const L = Math.floor(k / per), i = k % W, j = Math.floor((k % per) / W); for (let r = 1; r < 4; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < W && b < H && !g[L * per + b * W + a]) return L * per + b * W + a; } return k; };
    const start = free(N.cell(c.x, c.y, c.gs.lv)), goal = free(N.cell(tx, ty, Math.min(Lc - 1, tl))), gx = goal % W, gy = Math.floor((goal % per) / W), gl = Math.floor(goal / per);
    const gs = new Float32Array(per * Lc).fill(Infinity), from = new Int32Array(per * Lc).fill(-1), via = new Int16Array(per * Lc), heap = [[0, start]]; gs[start] = 0;
    const push = e => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === i) break; [heap[s], heap[i]] = [heap[i], heap[s]]; i = s; } } return top; };
    let n = 0, found = false;
    while (heap.length && n++ < 9000) {
      const [, cur] = pop(); if (cur === goal) { found = true; break; }
      const L = Math.floor(cur / per), ci = cur % W, cj = Math.floor((cur % per) / W), base = L * per;
      const visit = (k, w, q) => { const ng = gs[cur] + w; if (ng < gs[k]) { gs[k] = ng; from[k] = cur; via[k] = q ? q.id + 1 : 0; const kl = Math.floor(k / per); push([ng + Math.hypot(k % W - gx, Math.floor((k % per) / W) - gy) + Math.abs(kl - gl) * 4, k]); } };
      for (const [di, dj, w] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41], [1, -1, 1.41], [-1, 1, 1.41], [-1, -1, 1.41]]) { const a = ci + di, b = cj + dj; if (a < 0 || b < 0 || a >= W || b >= H) continue; const k = base + b * W + a; if (g[k] || (di && dj && (g[base + cj * W + a] || g[base + b * W + ci]))) continue; visit(k, w); }
      for (const [k, w, q] of links.get(cur) || []) visit(k, w, q);
    }
    if (!found) return null; const path = [];
    for (let k = goal; k !== -1 && k !== start; k = from[k]) path.push({ x: (k % W + 0.5) * cs, y: (Math.floor((k % per) / W) + 0.5) * cs, lv: Math.floor(k / per), ramp: via[k] - 1 });
    return path.reverse();
  },
  ai(c, m) {
    const G = c.gs, g = m.gs, S = g.st, M = this.map(m); if (c.out) return { x: 0, y: 0, speed: 0 };
    const sees = o => { if (Math.abs(o.gs.z - G.z) > 1 || o.gs.lv !== G.lv) return false; const d = MH.dist(c, o); if (d > 20 || (d > 7 && Math.abs(normalizeAngle(Math.atan2(o.y - c.y, o.x - c.x) - c.heading)) > 1.5)) return false;   // what is in front of it (or very close)
      const walls = M.walls.filter(w => w.lv === G.lv); return MG.clearPath(c.x, c.y, o.x, o.y, walls, 0.05) && (G.lv > 0 || MG.clearPath(c.x, c.y, o.x, o.y, M.trees.map(t => ({ x0: t.x - t.r, y0: t.y - t.r, x1: t.x + t.r, y1: t.y + t.r })), 0)); };
    if (G.hp < 55 && G.inv.some(it => it.k === 'med') && G.cd <= 0) { G.sel = G.inv.findIndex(it => it.k === 'med'); c.wantUse = true; }
    else if (G.sh < 50 && G.inv.some(it => it.k === 'pot') && G.cd <= 0 && !(G.seenAt > m.simTime - 2)) { G.sel = G.inv.findIndex(it => it.k === 'pot'); c.wantUse = true; }
    const foe = MG.live(m).filter(o => o.gs.team !== G.team && sees(o)).sort((a, b) => MH.dist(c, a) - MH.dist(c, b))[0];
    if (foe) {                                                             // fight: pick the right gun, aim (leading the target) and fire
      G.seenAt = m.simTime; const d = MH.dist(c, foe), slot = this.bestSlot(c, d), it = G.inv[slot];
      if (slot !== G.sel && G.inv[slot] && BR_GUNS[G.inv[slot].k]) G.sel = slot;
      if (it && BR_GUNS[it.k] && it.a > 0) {
        const gun = BR_GUNS[it.k], lead = d / gun.spd, a = Math.atan2(foe.y + (foe.vy || 0) * lead - c.y, foe.x + (foe.vx || 0) * lead - c.x), off = Math.abs(normalizeAngle(a - c.heading));
        if (off < 0.08 + 0.4 / Math.max(1, d) && d < gun.range * 1.3 && G.cd <= 0) c.wantUse = true;
        if (G.hp < 40 && G.inv.some(x => x.k === 'wall') && !(G.wallAt > m.simTime)) { G.wallAt = m.simTime + 6; G.sel = G.inv.findIndex(x => x.k === 'wall'); c.wantUse = true; }
        return { x: Math.cos(a), y: Math.sin(a), speed: off > 0.5 ? 0.15 : d > gun.range ? 0.7 : d < gun.range * 0.4 ? 0.05 : 0.3 };
      }
    }
    // where to go: into the circle, to loot, or hunting
    let goal = null, gl = 0; const inStorm = Math.hypot(c.x - S.x, c.y - S.y) > S.r - 3, safe = { x: S.fx || S.x, y: S.fy || S.y };
    const armed = G.inv.some(it => BR_GUNS[it.k] && it.a > 0 && it.k !== 'pistol');
    if (inStorm || (Math.hypot(c.x - S.x, c.y - S.y) > S.r * 0.85 && S.shrink > 0) || (S.shrink > 0 && Math.hypot(c.x - S.fx, c.y - S.fy) > S.fr * 0.9)) { goal = safe; gl = 0; }   // head for the next circle while the storm moves
    if (!goal || !inStorm) { let best = null, bd = armed ? 24 : 60; for (const L of g.L) { if (Math.hypot(L[2] - S.x, L[3] - S.y) > S.r - 2) continue; const anyGun = G.inv.some(i => BR_GUNS[i.k]), lowAmmo = G.inv.some(i => BR_GUNS[i.k] && i.a < BR_GUNS[i.k].ammo * 0.4); const want = L[1] === 'chest' ? (anyGun ? (G.inv.length < BR.slots ? 1.2 : 0) : 5) : L[1] === 'ammo' ? (lowAmmo ? 3 : 0) : L[1] === 'med' && G.hp < 70 ? 3 : BR_GUNS[L[1]] ? (G.inv.some(i => i.k === L[1]) ? 0.3 : G.inv.length < BR.slots ? 2 : 0) : (G.inv.length < BR.slots || G.inv.some(i => i.k === L[1] && i.a < BR_ITEMS[L[1]].stack)) ? 1 : 0; if (!want) continue; const d = Math.hypot(L[2] - c.x, L[3] - c.y) + Math.abs(L[4] - G.lv) * 2 - want * 3 - (L[4] > 0 ? 5 : 0); if (d < bd) { bd = d; best = L; } } if (best) { goal = { x: best[2], y: best[3] }; gl = best[4]; } }
    if (!goal) { const t = MG.live(m).filter(o => o.gs.team !== G.team).sort((a, b) => MH.dist(c, a) - MH.dist(c, b))[0]; if (t && G.inv.some(it => BR_GUNS[it.k] && it.a > 0) && (g.t > 35 || S.ph >= 1 || G.inv.length >= 2)) { goal = t; gl = t.gs.lv; } else if (!G.camp || m.simTime > G.camp.until) { const f = this.map(m).floors.filter(f => Math.hypot((f.x0 + f.x1) / 2 - S.x, (f.y0 + f.y1) / 2 - S.y) < S.r * 0.8); const h = f[Math.floor(Math.random() * f.length)]; G.camp = h && Math.random() < 0.6 ? { x: (h.x0 + h.x1) / 2, y: (h.y0 + h.y1) / 2, lv: h.lv, until: m.simTime + 20 } : { x: safe.x, y: safe.y, lv: 0, until: m.simTime + 10 }; } if (!goal) { goal = G.camp; gl = G.camp.lv; } }   // early on: loot, or take the high ground
    if (c.goTo) { goal = c.goTo; gl = c.goTo.lv; }                       // (a fixed destination: tests and demos)
    if (G.boost <= 0 && Math.hypot(goal.x - c.x, goal.y - c.y) > 18 && G.inv.some(x => x.k === 'boost') && G.cd <= 0 && G.ramp < 0) { const prev = G.sel; G.sel = G.inv.findIndex(x => x.k === 'boost'); c.wantUse = true; G.selBack = prev; }
    const Nv = c.brNav || (c.brNav = {}), key = Math.round(goal.x) + ',' + Math.round(goal.y) + ',' + gl;
    if (!Nv.path || m.simTime - Nv.at > 1.4 || Nv.key !== key) { Nv.path = this.route(m, c, goal.x, goal.y, gl); Nv.at = m.simTime; Nv.key = key; }
    const P = Nv.path; if (!P || !P.length) return MH.to(c, goal.x, goal.y, 0.8);
    while (P.length > 1 && P[0].lv === G.lv && Math.hypot(P[0].x - c.x, P[0].y - c.y) < 1) P.shift();
    if (G.ramp >= 0) { Nv.enter = -1; const r = M.ramps[G.ramp], up = P.some(q => q.lv > r.lv), ux = [1, 0, -1, 0][r.dir] * (up ? 1 : -1), uy = [0, 1, 0, -1][r.dir] * (up ? 1 : -1); return { x: ux, y: uy, speed: 0.8 }; }   // on a ramp: straight up (or down) it
    const i0 = P.findIndex(q => q.ramp >= 0 && q.lv !== G.lv), stop = i0 < 0 ? P.length : i0;
    if (i0 === 0 || (i0 > 0 && Math.hypot(P[i0 - 1].x - c.x, P[i0 - 1].y - c.y) < 1.6)) {   // next: a ramp. Line up in front of its foot (or top), then drive straight onto it
      const q = M.ramps[P[i0].ramp], up = P[i0].lv > G.lv, ux = [1, 0, -1, 0][q.dir] * (up ? 1 : -1), uy = [0, 1, 0, -1][q.dir] * (up ? 1 : -1), cx = (q.x0 + q.x1) / 2, cy = (q.y0 + q.y1) / 2, half = q.dir % 2 === 0 ? (q.x1 - q.x0) / 2 : (q.y1 - q.y0) / 2;
      const fx = cx - ux * (half + 1.1), fy = cy - uy * (half + 1.1), along = (c.x - fx) * ux + (c.y - fy) * uy, side = Math.abs(-(c.x - fx) * uy + (c.y - fy) * ux);
      if (Nv.enter === q.id && m.simTime - Nv.enterAt < 3) return MH.to(c, cx + ux * half, cy + uy * half, 0.75);
      if (side < 0.5 && along > -0.6 && along < 1.2) { Nv.enter = q.id; Nv.enterAt = m.simTime; return MH.to(c, cx + ux * half, cy + uy * half, 0.75); }
      return MH.to(c, fx, fy, Math.hypot(c.x - fx, c.y - fy) < 2 ? 0.45 : 0.85);
    }
    let wp = P[0]; const walls = M.walls.filter(w => w.lv === G.lv);
    for (let i = Math.min(stop - 1, 8); i > 0; i--) if (P[i].lv === G.lv && MG.clearPath(c.x, c.y, P[i].x, P[i].y, walls, 0.5)) { wp = P[i]; break; }
    return MH.to(c, wp.x, wp.y, 0.9);
  },
  hud(m) {
    const S = m.gs.st, live = MG.live(m), teams = new Set(live.map(c => c.gs.team)).size, sq = m.mini.squad || 1, t = Math.ceil(S.wait > 0 ? S.wait : Math.max(0, S.shrink));
    return { clock: S.ph >= 6 ? 'FINAL' : `${S.wait > 0 ? '⏳' : '🌀'} ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, a: 'BATTLE ROYALE', b: sq > 1 ? `${teams} TEAMS LEFT` : `${live.length} LEFT`, mid: S.wait > 0 ? 'Storm closes in' : 'THE STORM IS MOVING', left: MG.peopleLine(m, c => c.out ? 'OUT' : `❤${Math.ceil(c.gs.hp)} 🛡${Math.ceil(c.gs.sh)} ✖${c.gs.kills}`) };
  },
  tag(c, m, vp) {                                                          // your team-mates' names (enemies show nothing: no tags through walls)
    const me = vp && vp.p && vp.p.chair; if (c.out) return '';
    if (me && c.gs.team === me.gs.team && c !== me) return `${MG.pname(c) || m.name(c)} ❤${Math.ceil(c.gs.hp)}`;
    return !vp && c.player ? MG.pname(c) : '';
  },
  itemLine(c, m) {
    const G = c.gs; if (c.out) return 'ELIMINATED: spectating';
    const inv = G.inv.map((it, i) => { const g = BR_GUNS[it.k], I = BR_ITEMS[it.k], txt = g ? `${g.name} ${it.a}` : `${I.icon}${I.name} x${it.a}`; return i === G.sel ? `[${txt}]` : txt; }).join('  ');
    return `❤ ${Math.ceil(G.hp)}  🛡 ${Math.ceil(G.sh)}${G.boost > 0 ? '  🚀' : ''}     ${inv || '(empty: drive over loot)'}     A: use  Y: switch  X: jump  B: bag`;
  },
  startLine: () => 'Drop in! Grab a gun and stay inside the circle.'
};
{ const P = MiniMatch.prototype, sw = P.switchChair; P.switchChair = function (p) { const M = modeOf(this); if (p && p.invOpen) return; if (M && M.cycle && p && p.chair) return M.cycle(p.chair, this); return sw.call(this, p); }; }

GAME_INFO.br = { name: 'Battle Royale', cat: 'sneaky', noCarts: true, blurb: 'Loot guns and items, stay in the circle, be the last team standing. Five big maps with buildings, garages and ramps.', noItems: true, noClockOpt: true,
  court: mini => (BR_MAPS[mini && mini.map] || BR_MAPS.downtown).size, label: cfg => `${(BR_MAPS[cfg.map] || BR_MAPS.downtown).name}, ${['solo', 'duos', 'trios'][(cfg.squad || 1) - 1]}`,
  goal: 'Be the last cart (or team) left alive.',
  rules: ['You start with nothing. Drive into a CHEST to burst it open: it holds a gun (pistol, SMG, shotgun, rifle, sniper or rockets) and often an item. AMMO CRATES refill the guns you have. Medkits, shield potions, boosts and shield walls lie around the map.', 'You carry up to 5 things. Y switches between them; A uses the one you hold (hold A for automatic guns).',
    'You have 100 health and up to 100 shield (shield takes damage first). Medkits heal, shield potions top up your shield.', 'BOOST: a few seconds of extra speed. SHIELD WALL: drops a wall in front of you that stops bullets (and carts).',
    'Buildings have doors; ramps lead up into garages, onto roofs and up the jungle tree. JUMP with X, and drive (or jump) off any ledge to drop down: a long fall costs a little health. Tilt your gun up or down to shoot at carts above or below you (floors stop bullets).', 'B opens your bag: move and swap your things, pick what to hold, or drop something on the ground.', 'The STORM closes in: outside the circle you lose health, faster and faster. Last cart or team standing wins.'],
  controls: [CTRL.drive, 'Use / fire: A  /  Space  /  Right Shift  /  touch A  (hold for automatic guns)', 'Jump: X  /  X  /  \\  /  touch X', 'Aim up and down: right stick  /  I and K  /  Page Up and Page Down', 'Bag (inventory): B  /  Backspace  /  Right Ctrl  /  touch B', 'Switch item: Y  /  F  /  /  /  touch Y', CTRL.spin, CTRL.pause],
  opts: [{ key: 'map', label: 'Map', values: ['downtown', 'jungle', 'port', 'suburbs', 'canyon'], names: ['Downtown', 'The Jungle', 'The Port', 'The Suburbs', 'The Canyon'], def: 'downtown', hint: () => (BR_MAPS[modeOpts('br').map] || BR_MAPS.downtown).blurb },
    { key: 'squad', label: 'Teams', values: [1, 2, 3], names: ['Solo', 'Duos (teams of 2)', 'Trios (teams of 3)'], def: 1 }, { key: 'carts', label: 'Carts', values: [6, 8, 10, 12], def: 10, hint: 'Carts nobody drives are played by the CPU.' }] };
