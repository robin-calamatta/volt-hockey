/* Drawing for Battle Royale (modes_br.js): the outdoor world with its levels (3D and classic 2D), loot, bullets, shield walls, the storm,
   carts riding up ramps, and cameras that rise with your cart. */
const BR_COLS = { wall: 0xb8b2a6, bldg: 0xc9c1b1, mall: 0xe0dbd0, warehouse: 0x8a8f96, house: 0xd8c3a5, hut: 0x8b6a45, column: 0x9aa0a6, trunk: 0x6b4a2b, cliff: 0xa8643a, crate: 0x9a6b3a, container: 0xc0392b, rock: 0x8a8f94, log: 0x6b4a2b };
const BR_FLOORS = { garage: 0x8e949b, roof: 0x6f757c, canopy: 0x4f8a3a, wood: 0x8b5a2b, rock: 0xb8774a, stone: 0xa89f8f, bridge: 0x5f6a75, mall: 0xd9d4c7, container: 0x2f6f8f, concrete: 0x8e949b, metal: 0x6f7f8f };
const BR_WALLH = { crate: 1.3, container: 2.5, rock: 1.6, log: 0.7, column: BR.H - 0.05 };
Object.assign(View3D.prototype, {
  buildBRWorld() {
    const m = this.m, M = MODES.br.map(m), T = M.theme, H = BR.H, W = m.width, D = m.height;
    if (this.arena) this.scene.remove(this.arena);
    const g = this.arena = new THREE.Group(), byCol = new Map(), put = (col, geo) => { if (!byCol.has(col)) byCol.set(col, []); byCol.get(col).push(geo); };
    this.scene.background = new THREE.Color(T.sky); this.scene.fog = new THREE.Fog(T.sky, 45, 150);
    const ground = new THREE.Mesh(G3.layFlat(new THREE.PlaneGeometry(W + 160, D + 160)), new THREE.MeshStandardMaterial({ color: T.ground, roughness: 0.95 })); ground.position.set(W / 2, -0.01, D / 2); ground.receiveShadow = true; g.add(ground);
    for (const [x0, y0, x1, y1] of [[-0.4, -0.4, W + 0.4, 0], [-0.4, D, W + 0.4, D + 0.4], [-0.4, 0, 0, D], [W, 0, W + 0.4, D]]) put(0x5a5f66, new THREE.BoxGeometry(x1 - x0, 1.2, y1 - y0).translate((x0 + x1) / 2, 0.6, (y0 + y1) / 2));   // the fence round the map
    for (const w of M.walls) { const h = w.h || BR_WALLH[w.kind] || H; put(BR_COLS[w.kind] || 0xb8b2a6, new THREE.BoxGeometry(w.x1 - w.x0, h, w.y1 - w.y0).translate((w.x0 + w.x1) / 2, w.lv * H + h / 2, (w.y0 + w.y1) / 2)); }
    for (const f of M.floors) { put(BR_FLOORS[f.kind] || 0x8e949b, new THREE.BoxGeometry(f.x1 - f.x0, 0.22, f.y1 - f.y0).translate((f.x0 + f.x1) / 2, f.lv * H - 0.11, (f.y0 + f.y1) / 2));
      for (const [ax, ay, bx, by] of [[f.x0, f.y0, f.x1, f.y0], [f.x0, f.y1, f.x1, f.y1], [f.x0, f.y0, f.x0, f.y1], [f.x1, f.y0, f.x1, f.y1]]) put(0xf2c200, new THREE.BoxGeometry(Math.max(0.12, bx - ax), 0.03, Math.max(0.12, by - ay)).translate((ax + bx) / 2, f.lv * H + 0.01, (ay + by) / 2)); }   // a yellow edge line: the railing is there
    for (const r of M.ramps) {                                             // ramps: a sloping deck with rails
      const along = r.dir % 2 === 0, L = along ? r.x1 - r.x0 : r.y1 - r.y0, w = along ? r.y1 - r.y0 : r.x1 - r.x0, len = Math.hypot(L, H), tilt = Math.atan2(H, L), grp = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.BoxGeometry(len, 0.2, w), this.mat(BR_FLOORS[r.kind] || 0x8e949b, { rough: 0.8 })); deck.rotation.z = tilt; deck.castShadow = deck.receiveShadow = true; grp.add(deck);
      for (const sd of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.35, 0.1), this.mat(0xf2c200, { rough: 0.5 })); rail.rotation.z = tilt; rail.position.set(0, 0.25, sd * (w / 2 - 0.05)); grp.add(rail); }
      grp.position.set((r.x0 + r.x1) / 2, r.lv * H + H / 2 - 0.05, (r.y0 + r.y1) / 2); grp.rotation.y = -[0, Math.PI / 2, Math.PI, -Math.PI / 2][r.dir]; g.add(grp);
    }
    for (const d of M.deco) {
      if (d.t === 'tree') {                                                // the giant tree: a huge trunk through the spiral, leaves round the canopy
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.9, d.levels * H - 0.2, 16), this.mat(0x6b4a2b, { rough: 0.95 })); trunk.position.set(d.x, (d.levels * H - 0.2) / 2, d.y); trunk.castShadow = true; g.add(trunk);
        for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, rr = d.canopy + 1.5, leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + (i % 3), 0), this.mat(i % 2 ? 0x2f6b2a : 0x3f8a35, { rough: 0.9 })); leaf.position.set(d.x + Math.cos(a) * rr, d.levels * H + 1.5 + (i % 3), d.y + Math.sin(a) * rr); leaf.castShadow = true; g.add(leaf); }
      }
      if (d.t === 'garage') { const cv = G3.canvas(64, 64), c = cv.getContext('2d'); c.fillStyle = '#1f4fa8'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#fff'; c.font = '900 50px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('P', 32, 35); const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding; const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })); sign.position.set(d.x + d.w / 2, d.levels * H + 1.6, d.y + d.h + 0.3); g.add(sign); }
    }
    for (const [col, geos] of byCol) { const mesh = new THREE.Mesh(G3.merge(geos), this.mat(col, { rough: 0.85 })); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); }
    if (M.trees.length) {                                                  // the forest: one instanced trunk and canopy each
      const n = M.trees.length, trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1.15, 1, 7), this.mat(0x6b4a2b), n), leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), this.mat(0x2f6b2a, { rough: 0.9 }), n), X = new THREE.Matrix4(), q = new THREE.Quaternion();
      M.trees.forEach((t, i) => { const h = 4 + (i % 5) * 0.6; trunk.setMatrixAt(i, X.compose(new THREE.Vector3(t.x, h / 2, t.y), q, new THREE.Vector3(t.r, h, t.r))); leaves.setMatrixAt(i, X.compose(new THREE.Vector3(t.x, h + 1, t.y), q.setFromAxisAngle(V3UP, i), new THREE.Vector3(2 + t.r * 1.5, 1.8 + t.r, 2 + t.r * 1.5))); });
      trunk.castShadow = leaves.castShadow = true; g.add(trunk, leaves);
    }
    this.scene.add(g);
  },
  brLootMesh(L) {
    const k = L[1], gun = BR_GUNS[k], item = BR_ITEMS[k], col = gun ? gun.col : item ? item.col : 0x2e7d32, grp = new THREE.Group();
    if (gun) { const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.14), this.mat(0x2a2e33, { metal: 0.5, rough: 0.4 })), grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), this.mat(col, { emissive: 0.3 })); grip.position.set(-0.15, -0.15, 0); grp.add(body, grip); if (k === 'rocket') body.scale.set(1.2, 1.8, 1.8); }
    else if (item) { const b = new THREE.Mesh(k === 'pot' ? new THREE.SphereGeometry(0.2, 14, 10) : new THREE.BoxGeometry(0.4, 0.3, 0.4), this.mat(col, { emissive: 0.4, rough: 0.4 })); grp.add(b); }
    else { const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.4), this.mat(0x2e7d32)); const lid = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.42), this.mat(0xffd23f)); lid.position.y = 0.2; grp.add(b, lid); }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false })); beam.position.y = 1.1; grp.add(beam);
    grp.traverse(x => { if (x.isMesh && x !== beam) x.castShadow = true; }); return grp;
  },
  updateBR(dt) {
    const m = this.m, g = m.gs, t = performance.now() / 1000;
    const f = m.ball; this.sun.position.set(f.x - 9, 30, f.y - 11); this.sun.target.position.set(f.x, 0, f.y); this.sun.target.updateMatrixWorld();   // shadows follow the action
    if (!this.brLoot) { this.brLoot = new Map(); this.brG = new THREE.Group(); this.scene.add(this.brG); }
    const seen = new Set();
    for (const L of g.L || []) { let mesh = this.brLoot.get(L[0]); if (!mesh) { mesh = this.brLootMesh(L); this.brG.add(mesh); this.brLoot.set(L[0], mesh); } mesh.position.set(L[2], L[4] * BR.H + 0.45 + Math.sin(t * 2 + L[0]) * 0.08, L[3]); mesh.rotation.y = t * 1.2 + L[0]; seen.add(L[0]); }
    for (const [id, mesh] of this.brLoot) if (!seen.has(id)) { this.brG.remove(mesh); this.brLoot.delete(id); }
    if (!this.storm) { this.storm = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 40, 64, 1, true), new THREE.MeshBasicMaterial({ color: 0x9b4dff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })); this.scene.add(this.storm); }
    const S = g.st; if (S) { this.storm.position.set(S.x, 20, S.y); this.storm.scale.set(Math.max(0.5, S.r), 1, Math.max(0.5, S.r)); this.storm.material.opacity = 0.18 + 0.06 * Math.sin(t * 3); }
    this.brRings = this.brRings || new Map();
    for (const cart of this.carts) {
      const ch = cart.ch, G = ch.gs || {}; cart.group.visible = !ch.out; if (ch.out) continue;
      cart.group.position.y = G.z || 0;
      if (G.ramp >= 0) { const r = MODES.br.map(m).ramps[G.ramp]; if (r) { const tilt = Math.atan2(BR.H, r.dir % 2 === 0 ? r.x1 - r.x0 : r.y1 - r.y0), ra = [0, Math.PI / 2, Math.PI, -Math.PI / 2][r.dir], rel = normalizeAngle(ch.heading - ra); cart.group.rotation.z = tilt * Math.cos(rel); cart.group.rotation.x = -tilt * Math.sin(rel); } } else { cart.group.rotation.z = 0; cart.group.rotation.x = 0; }   // tilted on a ramp
      let ring = this.brRings.get(cart.group); if (!ring) { ring = new THREE.Mesh(new THREE.RingGeometry(0.66, 0.8, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: BR_TEAMCOL[G.team % BR_TEAMCOL.length], transparent: true, opacity: 0.9, depthWrite: false })); ring.position.y = 0.04; cart.group.add(ring); this.brRings.set(cart.group, ring); }
      ring.material.color.setHex(G.hitT > 0 ? 0xffffff : BR_TEAMCOL[G.team % BR_TEAMCOL.length]); ring.visible = !(ch.player && !ch.player.remote && (this.sc.setup.players || []).length === 1);   // (not under your own cart: it would fill your view)
    }
  }
});
{ const P = View3D.prototype, arena = P.buildArena, cam = P.placeCamera, make = P.modeMake, place = P.modePlace, upd = P.updateMode;
  P.buildArena = function () { if (this.m && this.m.mini && modeOf(this.m) && modeOf(this.m).outdoor) return this.buildBRWorld(); return arena.call(this); };
  P.updateMode = function (dt) { if (this.m.kind === 'br') { this.modeS = this.modeS || new THREE.Group(); this.updateBR(dt); } return upd.call(this, dt); };
  P.placeCamera = function (vp, dt) {
    const c = cam.call(this, vp, dt), m = this.m, M = modeOf(m);
    if (M && M.outdoor && vp.mode === 'broadcast') {                         // a big outdoor map: a high camera chasing the action
      const st = this.camFor(vp.key), f = vp.chair || m.ball, k = 1 - Math.exp(-3 * dt), z = (f.gs && f.gs.z) || 0;
      st.bx = st.bx === undefined ? f.x : st.bx + (f.x - st.bx) * k; st.by = st.by === undefined ? f.y : st.by + (f.y - st.by) * k;
      c.position.set(st.bx, 16 + z, st.by + 13); c.lookAt(st.bx, z, st.by - 1); c.fov = 50; c.updateProjectionMatrix(); c.updateMatrixWorld(); return c;
    }
    const ch = vp.chair, z = ch && ch.gs && ch.gs.z; if (z && vp.mode !== 'broadcast') { c.position.y += z; c.updateMatrixWorld(); }   // your camera rides up the ramps with you
    return c;
  };
  P.modeMake = function (o) {
    if (o.t === 'bul') { const gun = BR_GUNS[o.w] || BR_GUNS.pistol, G = new THREE.Group(), tr = new THREE.Mesh(new THREE.CylinderGeometry(o.w === 'rocket' ? 0.12 : 0.04, o.w === 'rocket' ? 0.12 : 0.04, o.w === 'rocket' ? 0.6 : 0.9, 6).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: o.w === 'rocket' ? 0xff7a1c : 0xfff2a0 })); G.add(tr); return G; }
    if (o.t === 'dwall') { const G = new THREE.Group(), p = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.7, 2.6), new THREE.MeshStandardMaterial({ color: 0x7ff6ff, emissive: 0x3dd6ff, emissiveIntensity: 0.4, transparent: true, opacity: 0.55 })); p.position.y = 0.85; G.add(p); return G; }
    return make.call(this, o);
  };
  P.modePlace = function (mesh, o, t) {
    if (o.t === 'bul') { mesh.position.set(o.x, (o.z || 0) + 0.55, o.y); mesh.rotation.y = -Math.atan2(o.vy, o.vx); return; }
    if (o.t === 'dwall') { mesh.position.set(o.x, o.z || 0, o.y); mesh.rotation.y = -o.a; mesh.children[0].material.opacity = 0.3 + 0.3 * Math.max(0, o.hp) / 150; return; }
    place.call(this, mesh, o, t); if (o.t === 'boom' && o.z) mesh.position.y += o.z;
  };
}

/* ----- the classic 2D view ----- */
{ const P = GameScene.prototype, floor = P.drawFloor, d2 = P.drawMode2D;
  P.drawFloor = function (back, wood, gr) { const m = this.match; if (m && m.kind === 'br') { const T = MODES.br.map(m).theme; back.fillStyle(T.ground, 1).fillRect(-30, -30, m.width + 60, m.height + 60); return; } return floor.call(this, back, wood, gr); };
  P.drawMode2D = function (g, under) {
    const m = this.match; if (m.kind !== 'br') return d2.call(this, g, under);
    const M = MODES.br.map(m), s = m.gs, t = this.time.now / 1000, me = (this.setup.players || []).map(p => p.chair).filter(Boolean)[0], myLv = me ? me.gs.lv : 0;
    if (under) {
      for (const w of M.walls) if (w.lv === 0) g.fillStyle(BR_COLS[w.kind] || 0xb8b2a6, 1).fillRect(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0);
      for (const tr of M.trees) g.fillStyle(0x2f6b2a, 1).fillCircle(tr.x, tr.y, tr.r * 2.2);
      for (const f of M.floors) g.fillStyle(BR_FLOORS[f.kind] || 0x8e949b, f.lv <= myLv ? 0.85 : 0.35).fillRect(f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0).lineStyle(0.08, 0xf2c200, 0.6).strokeRect(f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0);
      for (const w of M.walls) if (w.lv > 0 && w.lv <= myLv + 1) g.fillStyle(BR_COLS[w.kind] || 0xb8b2a6, w.lv === myLv ? 1 : 0.5).fillRect(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0);
      for (const r of M.ramps) { g.fillStyle(0xd9b44a, 0.85).fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2, ux = [1, 0, -1, 0][r.dir], uy = [0, 1, 0, -1][r.dir]; g.fillStyle(0x111111, 0.8).fillTriangle(cx + ux * 0.8, cy + uy * 0.8, cx - uy * 0.5 - ux * 0.3, cy + ux * 0.5 - uy * 0.3, cx + uy * 0.5 - ux * 0.3, cy - ux * 0.5 - uy * 0.3); }
      for (const L of s.L || []) { const gun = BR_GUNS[L[1]], it = BR_ITEMS[L[1]]; g.fillStyle(gun ? gun.col : it ? it.col : 0x2e7d32, L[4] === myLv ? 1 : 0.4).fillCircle(L[2], L[3], 0.28).lineStyle(0.05, 0x111111, 0.8).strokeCircle(L[2], L[3], 0.28); }
      return;
    }
    for (const o of s.objs || []) {
      if (o.t === 'bul') g.fillStyle(o.w === 'rocket' ? 0xff7a1c : 0xfff2a0, 1).fillCircle(o.x, o.y, o.w === 'rocket' ? 0.18 : 0.08);
      else if (o.t === 'dwall') { const ca = Math.cos(o.a), sa = Math.sin(o.a); g.lineStyle(0.22, 0x7ff6ff, 0.9).lineBetween(o.x + sa * 1.3, o.y - ca * 1.3, o.x - sa * 1.3, o.y + ca * 1.3); }
      else if (o.t === 'boom') { const k = 1 - o.life / 0.7; g.fillStyle(0xffa31c, 0.7 * (1 - k)).fillCircle(o.x, o.y, 0.4 + k * 2.6); }
    }
    for (const c of m.chairs) { if (c.out) continue; const G = c.gs; g.lineStyle(0.1, BR_TEAMCOL[G.team % BR_TEAMCOL.length], 1).strokeCircle(c.x, c.y, 0.72); if (G.lv > 0 || G.ramp >= 0) g.fillStyle(0xffffff, 0.9).fillCircle(c.x + 0.6, c.y - 0.6, 0.12 + (G.z || 0) * 0.04); }
    const S = s.st; if (S) g.lineStyle(0.25, 0x9b4dff, 0.8 + 0.2 * Math.sin(t * 4)).strokeCircle(S.x, S.y, S.r);
  };
}
