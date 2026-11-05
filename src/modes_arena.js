/* Bigger arenas with things in them (v13): Capture the Flag and King of the Hill get maps with forts, mazes, cover, sliding gates and
   spinning bars (the original open rink is still there). Any minigame can use this: MODES[kind].arenaMaps + a 'map' option.
   Carts bump off the walls and moving parts; the CPU finds its way round them (A* on a grid). */
const ARENA_MAPS = {
  ctf: {
    fortress: { name: 'The Fortress', size: { width: 64, height: 36 }, blurb: 'A walled fort round each flag, a maze in the middle, sliding gates and spinners.',
      walls: [[0.4, 9, 3, 9.6, 'wall'], [5, 9, 8.6, 9.6, 'wall'], [0.4, 26.4, 3, 27, 'wall'], [5, 26.4, 8.6, 27, 'wall'], [8, 9.6, 8.6, 14.5, 'wall'], [8, 21.5, 8.6, 26.4, 'wall'],
        [55.4, 9, 59, 9.6, 'wall'], [61, 9, 63.6, 9.6, 'wall'], [55.4, 26.4, 59, 27, 'wall'], [61, 26.4, 63.6, 27, 'wall'], [55.4, 9.6, 56, 14.5, 'wall'], [55.4, 21.5, 56, 26.4, 'wall'],
        [24, 8, 26, 13, 'crate'], [38, 8, 40, 13, 'crate'], [24, 23, 26, 28, 'crate'], [38, 23, 40, 28, 'crate'], [30, 15, 34, 21, 'wall'],
        [14, 4, 22, 4.6, 'wall'], [42, 4, 50, 4.6, 'wall'], [14, 31.4, 22, 32, 'wall'], [42, 31.4, 50, 32, 'wall'], [17, 15, 18, 21, 'bags'], [46, 15, 47, 21, 'bags'],
        [12, 11, 13.2, 12.2, 'crate'], [12, 23.8, 13.2, 25, 'crate'], [50.8, 11, 52, 12.2, 'crate'], [50.8, 23.8, 52, 25, 'crate']],
      moving: [{ type: 'gate', w: 0.7, h: 6, a: [32, 6], b: [32, -1], period: 8 }, { type: 'gate', w: 0.7, h: 6, a: [32, 30], b: [32, 37], period: 8, phase: 0.5 }, { type: 'spin', x: 20.5, y: 18, len: 2.6, speed: 0.8 }, { type: 'spin', x: 43.5, y: 18, len: 2.6, speed: -0.8 }] },
    canyon: { name: 'Canyon Run', size: { width: 72, height: 30 }, blurb: 'A long zigzag run between the bases: walls force you back and forth, blocks slide across the gaps.',
      walls: [...[0, 1, 2, 3, 4, 5].map(i => { const x = 13 + i * 9.2; return i % 2 ? [x, 0.4, x + 0.7, 18, 'wall'] : [x, 12, x + 0.7, 29.6, 'wall']; }), [7, 6, 8.2, 7.2, 'crate'], [7, 22.8, 8.2, 24, 'crate'], [63.8, 6, 65, 7.2, 'crate'], [63.8, 22.8, 65, 24, 'crate'],
        [17, 6, 21, 6.6, 'bags'], [35.4, 23.4, 39.4, 24, 'bags'], [53.8, 6, 57.8, 6.6, 'bags'], [26, 14.5, 27.2, 15.7, 'crate'], [45, 14.5, 46.2, 15.7, 'crate']],
      moving: [{ type: 'slide', w: 1.6, h: 1.6, a: [17.6, 20], b: [17.6, 28], period: 7 }, { type: 'slide', w: 1.6, h: 1.6, a: [36, 2], b: [36, 10], period: 8 }, { type: 'slide', w: 1.6, h: 1.6, a: [54.4, 20], b: [54.4, 28], period: 7, phase: 0.5 }] }
  },
  hill: {
    ruins: { name: 'The Ruins', size: { width: 60, height: 34 }, blurb: 'Old pillars and broken walls to hide behind, and two spinning bars. The hills move round the ruins.',
      walls: [...[10, 20, 30, 40, 50].flatMap((x, i) => [[x - 0.6, 7 + (i % 2) * 2, x + 0.6, 8.2 + (i % 2) * 2, 'crate'], [x - 0.6, 25.8 - (i % 2) * 2, x + 0.6, 27 - (i % 2) * 2, 'crate']]),
        [14, 16, 18, 16.6, 'wall'], [17.4, 16.6, 18, 19, 'wall'], [42, 17.4, 46, 18, 'wall'], [42, 15, 42.6, 17.4, 'wall'], [27, 3, 33, 3.6, 'wall'], [27, 30.4, 33, 31, 'wall'],
        [5, 15, 6, 19, 'bags'], [54, 15, 55, 19, 'bags'], [24, 12, 25.2, 13.2, 'crate'], [34.8, 20.8, 36, 22, 'crate']],
      moving: [{ type: 'spin', x: 30, y: 17, len: 3, speed: 0.6 }, { type: 'spin', x: 30, y: 9, len: 2.2, speed: -0.9 }, { type: 'gate', w: 6, h: 0.7, a: [8, 30], b: [8, 36], period: 9 }] },
    colosseum: { name: 'The Colosseum', size: { width: 56, height: 36 }, blurb: 'A ring of walls with four gates round a middle full of pillars.',
      walls: [[10, 6, 24, 6.6, 'wall'], [32, 6, 46, 6.6, 'wall'], [10, 29.4, 24, 30, 'wall'], [32, 29.4, 46, 30, 'wall'], [10, 6.6, 10.6, 14.5, 'wall'], [10, 21.5, 10.6, 29.4, 'wall'], [45.4, 6.6, 46, 14.5, 'wall'], [45.4, 21.5, 46, 29.4, 'wall'],
        ...[[18, 12], [28, 11], [38, 12], [18, 24], [28, 25], [38, 24], [22, 18], [34, 18]].map(([x, y]) => [x - 0.55, y - 0.55, x + 0.55, y + 0.55, 'crate']), [3, 3, 5, 4, 'bags'], [51, 32, 53, 33, 'bags']],
      moving: [{ type: 'gate', w: 0.7, h: 7, a: [28, 2.4], b: [28, -4], period: 10 }, { type: 'gate', w: 0.7, h: 7, a: [28, 33.6], b: [28, 40], period: 10, phase: 0.5 }, { type: 'spin', x: 28, y: 18, len: 2.4, speed: 1 }] }
  }
};
const Arena = {
  map(m) { const A = m && m.mini && ARENA_MAPS[m.mini.kind]; return A && A[m.mini.map] || null; },
  walls(m) { const M = this.map(m); if (!M) return []; return M._w || (M._w = M.walls.map(([x0, y0, x1, y1, kind]) => ({ x0, y0, x1, y1, kind }))); },
  movers(m) { const M = this.map(m); if (!M) return { boxes: [], posts: [] }; const save = m.gs.t; m.gs.t = m.simTime || 0; const r = MODES.paintball.movers.call({ map: () => M }, m); m.gs.t = save; return r; },   // (the same moving parts as Paintball)
  all(m) { const mv = this.movers(m); return [...this.walls(m), ...mv.boxes, ...mv.posts.map(p => ({ x0: p.x - p.r, y0: p.y - p.r, x1: p.x + p.r, y1: p.y + p.r }))]; },
  collide(m) {                                                             // carts bump off the walls and the moving parts
    const R = R_CART(), K = CONFIG.chair, mv = this.movers(m), all = [...this.walls(m), ...mv.boxes];
    for (const c of m.chairs) { if (c.out) continue; for (const b of all) MG.rectPush(c, R, b, K.boardBounce);
      for (const p of mv.posts) { const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy), mn = R + p.r; if (d < mn && d > 0) { c.x = p.x + dx / d * mn; c.y = p.y + dy / d * mn; const vn = c.vx * dx / d + c.vy * dy / d; if (vn < 0) { c.vx -= 1.6 * vn * dx / d; c.vy -= 1.6 * vn * dy / d; } } } }
  },
  free(m, x, y, pad = 1) { return !this.all(m).some(b => x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad); },
  route(m, c, tx, ty) {                                                    // the Paintball path-finder, on this arena's walls
    const M = this.map(m), fake = { walls: () => this.walls(m) }; if (!m.arNav) { const save = m.pbNav; m.pbNav = null; MODES.paintball.nav.call(fake, m); m.arNav = m.pbNav; m.pbNav = save; }
    const save = m.pbNav; m.pbNav = m.arNav; const r = MODES.paintball.route.call({ nav: () => m.arNav }, m, c, tx, ty); m.pbNav = save; return r;
  },
  steer(c, m, cmd, goal) {                                                 // the CPU wants to go somewhere: if a wall is in the way, find the way round
    if (!cmd || !(cmd.x || cmd.y) || !this.map(m)) return cmd; const d = Math.hypot(cmd.x, cmd.y) || 1, dx = cmd.x / d, dy = cmd.y / d, all = this.all(m);
    const N = c.arNav || (c.arNav = {}), sp = Math.hypot(c.vx, c.vy); far = !goal || Math.hypot(goal.x - c.x, goal.y - c.y) > 2.5; N.slow = sp < 0.6 && far ? (N.slow || 0) + 1 / 60 : 0;   // stuck on a wall for a while: back off and find a new way
    if (N.back > 0) { N.back -= 1 / 60; return { ...cmd, x: -dx + (N.side || 0.6) * -dy, y: -dy + (N.side || 0.6) * dx }; }
    if (N.slow > 1.4) { N.slow = 0; N.back = 0.6; N.side = Math.random() < 0.5 ? 1 : -1; N.path = null; return cmd; }
    const gx = goal ? goal.x : c.x + dx * 12, gy = goal ? goal.y : c.y + dy * 12;
    if (MG.clearPath(c.x, c.y, goal ? gx : c.x + dx * 3, goal ? gy : c.y + dy * 3, all, R_CART() * 0.9)) return cmd;
    const tx = Math.max(1, Math.min(m.width - 1, gx)), ty = Math.max(1, Math.min(m.height - 1, gy)), key = Math.round(tx / 3) + ',' + Math.round(ty / 3);
    if (!N.path || m.simTime - N.at > 0.9 || N.key !== key) { N.path = this.route(m, c, tx, ty); N.at = m.simTime; N.key = key; }
    const P = N.path; if (!P || !P.length) return cmd; while (P.length > 1 && Math.hypot(P[0].x - c.x, P[0].y - c.y) < 0.9) P.shift();
    let wp = P[0]; for (let i = Math.min(P.length - 1, 8); i > 0; i--) if (MG.clearPath(c.x, c.y, P[i].x, P[i].y, all, 0.5)) { wp = P[i]; break; }
    return { ...cmd, x: wp.x - c.x, y: wp.y - c.y };
  }
};
/* hook the maps into Capture the Flag and King of the Hill */
for (const kind of ['ctf', 'hill']) {
  const M = MODES[kind], I = GAME_INFO[kind], maps = ARENA_MAPS[kind], st = M.step, ai = M.ai, c0 = I.court;
  M.step = function (m, h) { if (Arena.map(m)) Arena.collide(m); const r = st.call(this, m, h); if (kind === 'hill' && Arena.map(m)) for (const Z of m.gs.zones || []) if (!Arena.free(m, Z.x, Z.y, 1.2)) { for (let t = 0; t < 60; t++) { const x = 4 + Math.random() * (m.width - 8), y = 4 + Math.random() * (m.height - 8); if (Arena.free(m, x, y, 2.6)) { Z.x = MG.r2(x); Z.y = MG.r2(y); break; } } } return r; };   // (a hill never sits in a wall)
  if (ai) M.ai = function (c, m) {                                       // remember where the CPU really wants to go, then path round the walls to it
    if (!Arena.map(m)) return ai.call(this, c, m);
    const to = MH.to, ch = MG.chase; let goal = null;
    MH.to = function (k, tx, ty, ...r) { if (k === c) goal = { x: tx, y: ty }; return to.call(this, k, tx, ty, ...r); };
    MG.chase = function (k, t, ...r) { if (k === c && t) goal = { x: t.x, y: t.y }; return ch.call(this, k, t, ...r); };
    let cmd; try { cmd = ai.call(this, c, m); } finally { MH.to = to; MG.chase = ch; }
    return Arena.steer(c, m, cmd, goal);
  };
  I.opts = I.opts || []; I.opts.unshift({ key: 'map', label: 'Map', values: [...Object.keys(maps), 'classic'], names: [...Object.values(maps).map(x => `${x.name} (${x.size.width} x ${x.size.height} m)`), 'The open rink (classic)'], def: Object.keys(maps)[0], hint: () => { const x = maps[modeOpts(kind).map]; return x ? x.blurb : 'The original: an open rink, nothing in the way.'; } });
  I.court = mini => (maps[mini && mini.map] || {}).size || (typeof c0 === 'function' ? c0(mini) : c0);
}
/* drawing: the walls (like Paintball's) in 3D and 2D, and the moving parts */
{ const P = View3D.prototype, upd = P.updateMode;
  P.updateMode = function (dt) {
    const r = upd.call(this, dt), m = this.m, A = Arena.map(m); if (!A) return r;
    if (!this.arenaG) {
      const g = this.arenaG = new THREE.Group(), H = PB.wallH, cols = { wall: 0x8b939c, bags: 0xb59a6a, crate: 0x9a6b3a };
      for (const b of Arena.walls(m)) { const h = b.kind === 'bags' ? 1.0 : b.kind === 'crate' ? 1.2 : H, box = new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0, h, b.y1 - b.y0), this.mat(cols[b.kind] || 0x8b939c, { rough: 0.85 })); box.position.set((b.x0 + b.x1) / 2, h / 2, (b.y0 + b.y1) / 2); box.castShadow = box.receiveShadow = true; g.add(box);
        if (b.kind === 'wall') { const cap = new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0 + 0.04, 0.08, b.y1 - b.y0 + 0.04), this.mat(0x3dd6ff, { rough: 0.5 })); cap.position.set((b.x0 + b.x1) / 2, H + 0.04, (b.y0 + b.y1) / 2); g.add(cap); } }
      this.arenaMv = A.moving.map(o => { if (o.type === 'spin') { const s = new THREE.Group(), post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.3, 12), this.mat(0x333a40, { metal: 0.4 })); post.position.y = 0.65; const bar = new THREE.Mesh(new THREE.BoxGeometry(o.len * 2, 0.4, 0.5), this.mat(0xff7a1c, { rough: 0.5 })); bar.position.y = 0.7; s.add(post, bar); s.position.set(o.x, 0, o.y); g.add(s); return { o, mesh: s }; }
        const box = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.type === 'gate' ? H : 1.1, o.h), this.mat(o.type === 'gate' ? 0xf2c200 : 0xff7a1c, { rough: 0.5 })); box.castShadow = true; g.add(box); return { o, mesh: box }; });
      this.scene.add(g);
    }
    const mv = Arena.movers(m); let bi = 0; for (const X of this.arenaMv) { if (X.o.type === 'spin') X.mesh.rotation.y = -(m.simTime || 0) * X.o.speed; else { const b = mv.boxes[bi++]; if (b) X.mesh.position.set((b.x0 + b.x1) / 2, X.mesh.geometry.parameters.height / 2, (b.y0 + b.y1) / 2); } }
    return r;
  };
}
{ const P = GameScene.prototype, d2 = P.drawMode2D;
  P.drawMode2D = function (g, under) {
    const r = d2.call(this, g, under), m = this.match; if (!Arena.map(m)) return r; const cols = { wall: 0x8b939c, bags: 0xb59a6a, crate: 0x9a6b3a };
    if (under) for (const b of Arena.walls(m)) g.fillStyle(cols[b.kind] || 0x8b939c, 1).fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    else { const mv = Arena.movers(m); for (const b of mv.boxes) g.fillStyle(0xf2c200, 1).fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); for (const p of mv.posts) g.fillStyle(0xff7a1c, 1).fillCircle(p.x, p.y, p.r); }
    return r;
  };
}
