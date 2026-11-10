/* Drawing for Volt Royale (modes_br.js): the outdoor world with its levels (3D and classic 2D), loot, bullets, shield walls, the storm,
   carts riding up ramps, and cameras that rise with your cart. */
const BR_COLS = { wall: 0xb8b2a6, bldg: 0xc9c1b1, mall: 0xe0dbd0, warehouse: 0x8a8f96, house: 0xd8c3a5, hut: 0x8b6a45, column: 0x9aa0a6, trunk: 0x6b4a2b, cliff: 0xa8643a, crate: 0x9a6b3a, container: 0xc0392b, rock: 0x8a8f94, log: 0x6b4a2b };
const BR_FLOORS = { garage: 0x8e949b, roof: 0x6f757c, canopy: 0x4f8a3a, wood: 0x8b5a2b, rock: 0xb8774a, stone: 0xa89f8f, bridge: 0x5f6a75, mall: 0xd9d4c7, container: 0x2f6f8f, concrete: 0x8e949b, metal: 0x6f7f8f };
const BR_WALLH = { crate: 1.3, container: 2.5, rock: 1.6, log: 0.7, column: BR.H - 0.05 };
function brRectMinus(f, holes) {                                         // a rectangle with rectangular holes, as a few rectangles
  let parts = [{ x0: f.x0, y0: f.y0, x1: f.x1, y1: f.y1 }];
  for (const h of holes) { const next = []; for (const p of parts) { if (h.x1 <= p.x0 || h.x0 >= p.x1 || h.y1 <= p.y0 || h.y0 >= p.y1) { next.push(p); continue; }
      if (h.y0 > p.y0) next.push({ x0: p.x0, y0: p.y0, x1: p.x1, y1: h.y0 }); if (h.y1 < p.y1) next.push({ x0: p.x0, y0: h.y1, x1: p.x1, y1: p.y1 });
      const y0 = Math.max(p.y0, h.y0), y1 = Math.min(p.y1, h.y1); if (h.x0 > p.x0) next.push({ x0: p.x0, y0, x1: h.x0, y1 }); if (h.x1 < p.x1) next.push({ x0: h.x1, y0, x1: p.x1, y1 }); } parts = next; }
  return parts.filter(p => p.x1 - p.x0 > 0.05 && p.y1 - p.y0 > 0.05);
}
function brWorldUV(geo, scale, vs = scale) {                                          // texture co-ordinates from world position: every wall shows its surface at the same size
  const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal, uv = [];
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); if (ay >= ax && ay >= az) uv.push(p.getX(i) / scale, p.getZ(i) / scale); else if (ax >= az) uv.push(p.getZ(i) / scale, p.getY(i) / vs); else uv.push(p.getX(i) / scale, p.getY(i) / vs); }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g;
}
const BR_SURFACES = {};
function brSurface(col) {                                                 // a material for a wall / floor colour: a real surface texture tinted to that colour
  if (BR_SURFACES[col]) return BR_SURFACES[col];
  const kind = col === 0x9a6b3a || col === 0x8b6a45 || col === 0x6b4a2b || col === 0x8b5a2b || col === 0xc9a26b ? 'dirt' : col === 0x4f8a3a ? 'jungle' : col === 0xa8643a || col === 0xb8774a ? 'dirt' : 'concrete';
  const t = Look.tex(kind).clone(); t.needsUpdate = true; t.repeat.set(1, 1); const c = new THREE.Color(col), base = new THREE.Color(kind === 'concrete' ? 0x9c9b96 : kind === 'jungle' ? 0x3d6630 : 0xa8764a);
  c.r = Math.min(2, c.r / base.r); c.g = Math.min(2, c.g / base.g); c.b = Math.min(2, c.b / base.b);
  const metal = col === 0xc0392b || col === 0x8a8f96 || col === 0x5f6a75 || col === 0x2f6f8f || col === 0x6f7f8f;
  return (BR_SURFACES[col] = new THREE.MeshStandardMaterial({ map: t, color: c, roughness: metal ? 0.5 : 0.88, metalness: metal ? 0.35 : 0, bumpMap: Look.grain(), bumpScale: 0.03 }));
}
Object.assign(View3D.prototype, {
  buildBRWorld() {
    const m = this.m, M = MODES.br.map(m), T = M.theme, H = BR.H, W = m.width, D = m.height;
    if (this.arena) this.scene.remove(this.arena);
    const g = this.arena = new THREE.Group(), byCol = new Map(), put = (col, geo) => { if (!byCol.has(col)) byCol.set(col, []); byCol.get(col).push(geo); };
    this.scene.background = new THREE.Color(T.sky); this.scene.fog = new THREE.Fog(T.sky, 45, 150);
    const gt = Look.tex({ downtown: 'asphalt', jungle: 'jungle', port: 'concrete', suburbs: 'grass', canyon: 'dirt' }[m.mini.map] || 'grass').clone(); gt.needsUpdate = true; gt.repeat.set(900 / 7, 900 / 7);
    const gg = G3.layFlat(new THREE.PlaneGeometry(900, 900, 90, 90)), gp = gg.attributes.position, nz = LookWorld.noise(W + D), gc = [];   // the ground, with big soft patches so it never looks like one tile
    for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i), k = 0.78 + 0.32 * nz.n2(x / 23 + 50, z / 23 + 50) + 0.1 * nz.n2(x / 6 + 9, z / 6); gc.push(k, k * (0.98 + 0.04 * nz.n2(x / 40, z / 40)), k * 0.97); }
    gg.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3));
    const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ map: gt, roughness: 0.95, vertexColors: true })); ground.position.set(W / 2, -0.01, D / 2); ground.receiveShadow = true; g.add(ground);
    for (const [x0, y0, x1, y1] of [[-0.4, -0.4, W + 0.4, 0], [-0.4, D, W + 0.4, D + 0.4], [-0.4, 0, 0, D], [W, 0, W + 0.4, D]]) put(0x5a5f66, new THREE.BoxGeometry(x1 - x0, 1.2, y1 - y0).translate((x0 + x1) / 2, 0.6, (y0 + y1) / 2));   // the fence round the map
    for (const w of M.walls) { if (w.kind === 'door') continue; const h = w.h || BR_WALLH[w.kind] || H;   /* (doors are drawn on their own: modes_br_draw3.js) */ const top = w.lv * H + h, hh = Math.abs(top / H - Math.round(top / H)) < 0.01 ? h - 0.015 : h;   /* (v14.1.8: a wall whose top is level with a roof stops just under it: the two surfaces fought and flickered) */ put(BR_COLS[w.kind] || 0xb8b2a6, new THREE.BoxGeometry(w.x1 - w.x0, hh, w.y1 - w.y0).translate((w.x0 + w.x1) / 2, w.lv * H + hh / 2, (w.y0 + w.y1) / 2)); }
    /* v14.1.8: floors on the same level that overlap (a building's roof and a roof deck laid over it, say) each sit a hair higher than the
       one before, so they no longer draw in the same plane and flicker between their colours as you drive over them */
    const fOff = new Map(); M.floors.forEach((f, i) => { let n = 0; for (let j = 0; j < i; j++) { const o = M.floors[j]; if (o.lv === f.lv && Math.min(o.x1, f.x1) - Math.max(o.x0, f.x0) > 0.01 && Math.min(o.y1, f.y1) - Math.max(o.y0, f.y0) > 0.01) n = Math.max(n, (fOff.get(o) || 0) + 1); } fOff.set(f, n); });
    for (const f of M.floors) { const fo = (fOff.get(f) || 0) * 0.012; for (const q of brRectMinus(f, M.ramps.filter(r => r.lv + 1 === f.lv).map(r => ({ x0: r.x0 - 0.05, y0: r.y0 - 0.05, x1: r.x1 + 0.05, y1: r.y1 + 0.05 })))) put(BR_FLOORS[f.kind] || 0x8e949b, new THREE.BoxGeometry(q.x1 - q.x0, 0.22, q.y1 - q.y0).translate((q.x0 + q.x1) / 2, f.lv * H - 0.11 + fo, (q.y0 + q.y1) / 2));
      for (const [ax, ay, bx, by] of [[f.x0, f.y0, f.x1, f.y0], [f.x0, f.y1, f.x1, f.y1], [f.x0, f.y0, f.x0, f.y1], [f.x1, f.y0, f.x1, f.y1]]) put(0xb59a3e, new THREE.BoxGeometry(Math.max(0.08, bx - ax), 0.02, Math.max(0.08, by - ay)).translate((ax + bx) / 2, f.lv * H + 0.01 + fo, (ay + by) / 2)); }   // a worn painted line at the edge
    for (const r of M.ramps) {                                             // ramps: a sloping deck with rails
      const along = r.dir % 2 === 0, L = along ? r.x1 - r.x0 : r.y1 - r.y0, w = along ? r.y1 - r.y0 : r.x1 - r.x0, len = Math.hypot(L, H), tilt = Math.atan2(H, L), grp = new THREE.Group();
      const deck = new THREE.Mesh(brWorldUV(new THREE.BoxGeometry(len, 0.2, w), 3), brSurface(BR_FLOORS[r.kind] || 0x8e949b)); deck.rotation.z = tilt; deck.castShadow = deck.receiveShadow = true; grp.add(deck);
      for (const sd of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, 0.08), new THREE.MeshStandardMaterial({ color: 0xa7adb3, roughness: 0.35, metalness: 0.75 }));   /* a galvanised guardrail */ rail.rotation.z = tilt; rail.position.set(0, 0.25, sd * (w / 2 - 0.05)); grp.add(rail); }
      grp.position.set((r.x0 + r.x1) / 2, r.lv * H + H / 2 - 0.05, (r.y0 + r.y1) / 2); grp.rotation.y = -[0, Math.PI / 2, Math.PI, -Math.PI / 2][r.dir]; g.add(grp);
    }
    for (const d of M.deco) {
      if (d.t === 'tree') {                                                // the giant tree: a huge trunk through the spiral, leaves round the canopy
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.9, d.levels * H - 0.2, 24), LookWorld.barkMat()); trunk.position.set(d.x, (d.levels * H - 0.2) / 2, d.y); trunk.castShadow = true; g.add(trunk);
        for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, rr = d.canopy + 1.5, leaf = new THREE.Mesh(LookWorld.canopyGeo(), LookWorld.leafMat()); leaf.scale.setScalar(3 + (i % 3)); leaf.rotation.y = i; leaf.position.set(d.x + Math.cos(a) * rr, d.levels * H + 1.5 + (i % 3), d.y + Math.sin(a) * rr); leaf.castShadow = true; g.add(leaf); }
      }
      if (d.t === 'garage') { const cv = G3.canvas(64, 64), c = cv.getContext('2d'); c.fillStyle = '#1f4fa8'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#fff'; c.font = '900 50px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('P', 32, 35); const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding; const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })); sign.position.set(d.x + d.w / 2, d.levels * H + 1.6, d.y + d.h + 0.3); g.add(sign); }
    }
    const FAC = { 0xc9c1b1: 'bldg', 0xe0dbd0: 'mall', 0xd8c3a5: 'house', 0x8a8f96: 'metal', 0xc0392b: 'metal' };   // building fronts: windows on every storey; metal siding
    for (const [col, geos] of byCol) { const f = FAC[col]; let mt = f ? LookWorld.facade(f) : brSurface(col); if (col === 0xc0392b) { mt = mt.clone(); mt.color.setHex(0xe0705f); }
      const mesh = new THREE.Mesh(f ? brWorldUV(G3.merge(geos), 3, H) : brWorldUV(G3.merge(geos), 3), mt); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); }
    if (M.trees.length) {                                                  // the forest: one instanced trunk and canopy each
      g.add(LookWorld.trees(M.trees.map((t, i) => ({ x: t.x, y: t.y, r: t.r, h: 3.6 + (i % 5) * 0.6, s: 2.2 + t.r * 1.6 })), m.mini.map === 'jungle' ? 0.02 : 0));
    }
    LookWorld.dressBR(this, g, m.mini.map || 'downtown', T, W, D);       // sky, haze and the horizon
    this.scene.add(g);
  },
  brLootMesh(L) {
    const k = L[1], gun = BR_GUNS[k], item = BR_ITEMS[k], col = gun ? gun.col : item ? item.col : 0x2e7d32, grp = new THREE.Group();
    if (k === 'chest') {                                                     // a chest: dark wood with gold bands and a glow
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), this.mat(0x5a3a1e, { rough: 0.8 })), lid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), this.mat(0x6b4a2b, { rough: 0.7 }));
      lid.rotation.set(0, 0, 0); lid.position.y = 0.25; body.position.y = 0;
      for (const x of [-0.32, 0, 0.32]) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.52, 0.62), this.mat(0xd4a017, { metal: 0.8, rough: 0.3 })); band.position.set(x, 0, 0); grp.add(band); }
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.05), this.mat(0xd4a017, { metal: 0.8, rough: 0.3 })); lock.position.set(0, 0.12, 0.32); grp.add(body, lid, lock);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.3, depthWrite: false })); beam.position.y = 1.3; grp.add(beam);
      grp.traverse(x => { if (x.isMesh && x !== beam) x.castShadow = true; }); grp.userData.still = true; return grp;
    }
    if (k === 'ammo') { const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.45), this.mat(0x3f4f2f, { rough: 0.85 })), lid = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.47), this.mat(0x2f3a22)), stripe = new THREE.Mesh(new THREE.BoxGeometry(0.71, 0.08, 0.46), this.mat(0xd4a017)); lid.position.y = 0.22; stripe.position.y = 0.05; grp.add(b, lid, stripe); grp.traverse(x => { if (x.isMesh) x.castShadow = true; }); grp.userData.still = true; return grp; }
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
    for (const L of g.L || []) { let mesh = this.brLoot.get(L[0]); if (!mesh) { mesh = this.brLootMesh(L); this.brG.add(mesh); this.brLoot.set(L[0], mesh); } if (mesh.userData.still) { mesh.position.set(L[2], L[4] * BR.H + 0.25, L[3]); mesh.rotation.y = L[0]; } else { mesh.position.set(L[2], L[4] * BR.H + 0.45 + Math.sin(t * 2 + L[0]) * 0.08, L[3]); mesh.rotation.y = t * 1.2 + L[0]; } seen.add(L[0]); }
    for (const [id, mesh] of this.brLoot) if (!seen.has(id)) { this.brG.remove(mesh); this.brLoot.delete(id); }
    if (!this.storm) { this.storm = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 40, 64, 1, true), new THREE.MeshBasicMaterial({ map: LookWorld.stormTex(), color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, fog: false })); this.scene.add(this.storm); }
    const S = g.st; if (S) { this.storm.position.set(S.x, 20, S.y); this.storm.scale.set(Math.max(0.5, S.r), 1, Math.max(0.5, S.r)); this.storm.material.opacity = 0.5 + 0.08 * Math.sin(t * 2); this.storm.material.map.offset.x = t * 0.01; }
    this.brRings = this.brRings || new Map();
    for (const cart of this.carts) {
      const ch = cart.ch, G = ch.gs || {}; cart.group.visible = !ch.out; if (ch.out) continue;
      cart.group.position.y = G.z || 0;
      const ownFirst = (this.sc.vps || []).length === 1 && this.sc.vps[0].mode === 'first' && this.sc.vps[0].chair === ch && !this.sc.vps[0].spect;   /* (in your own first-person view the cart stays level on a ramp: tilting it swung your arms and knees up into your face) */
      if (G.ramp >= 0 && !ownFirst) { const r = MODES.br.map(m).ramps[G.ramp]; if (r) { const tilt = Math.atan2(BR.H, r.dir % 2 === 0 ? r.x1 - r.x0 : r.y1 - r.y0), ra = [0, Math.PI / 2, Math.PI, -Math.PI / 2][r.dir], rel = normalizeAngle(ch.heading - ra); cart.group.rotation.z = tilt * Math.cos(rel); cart.group.rotation.x = -tilt * Math.sin(rel); } } else { cart.group.rotation.z = 0; cart.group.rotation.x = 0; }   // tilted on a ramp
      let ring = this.brRings.get(cart.group); if (!ring) { ring = new THREE.Mesh(new THREE.RingGeometry(0.66, 0.8, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: BR_TEAMCOL[G.team % BR_TEAMCOL.length], transparent: true, opacity: 0.9, depthWrite: false })); ring.position.y = 0.04; cart.group.add(ring); this.brRings.set(cart.group, ring); }
      ring.material.color.setHex(G.hitT > 0 ? 0xffffff : BR_TEAMCOL[G.team % BR_TEAMCOL.length]); ring.visible = !(ch.player && !ch.player.remote && (this.sc.setup.players || []).length === 1);   // (not under your own cart: it would fill your view)
    }
  }
});
{ const P = View3D.prototype, arena = P.buildArena, cam = P.placeCamera, make = P.modeMake, place = P.modePlace, upd = P.updateMode;
  P.buildArena = function () { if (this.m && this.m.mini && modeOf(this.m) && modeOf(this.m).outdoor) return this.buildBRWorld(); return arena.call(this); };
  P.updateMode = function (dt) { if (this.m.kind === 'br') { this.modeS = this.modeS || new THREE.Group(); this.updateBR(dt); } return upd.call(this, dt); };
  P.placeCamera = function (vp, dt) {
    const c = cam.call(this, vp, dt), m = this.m, M = modeOf(m), far = M && M.outdoor ? 420 : 160; if (c.far !== far) { c.far = far; c.updateProjectionMatrix(); }   // outdoors: see the horizon
    if (M && M.outdoor && vp.mode === 'broadcast') {                         // a big outdoor map: a high camera chasing the action
      const st = this.camFor(vp.key), f = vp.chair || m.ball, k = 1 - Math.exp(-3 * dt), z = (f.gs && f.gs.z) || 0;
      st.bx = st.bx === undefined ? f.x : st.bx + (f.x - st.bx) * k; st.by = st.by === undefined ? f.y : st.by + (f.y - st.by) * k;
      c.position.set(st.bx, 16 + z, st.by + 13); c.lookAt(st.bx, z, st.by - 1); c.fov = 50; c.updateProjectionMatrix(); c.updateMatrixWorld(); return c;
    }
    const ch = vp.chair, z = ch && ch.gs && ch.gs.z; if (z && vp.mode !== 'broadcast') { c.position.y += z; c.updateMatrixWorld(); }   // your camera rides up the ramps with you
    if (m.kind === 'br' && ch && !vp.spect && (vp.mode === 'first' || vp.mode === 'third')) {        // Volt Royale: the view tilts with your gun
      const st = this.camFor(vp.key), it = ch.gs.inv && ch.gs.inv[ch.gs.sel], zt = brAds(ch) ? (it && it.k === 'sniper' ? 0.38 : it && it.k === 'rifle' ? 0.62 : 0.75) : 1; st.zoom = (st.zoom || 1) + (zt - (st.zoom || 1)) * (1 - Math.exp(-14 * dt));   // LT: zoom in
      if (Math.abs(st.zoom - 1) > 0.002) { c.fov *= st.zoom; c.updateProjectionMatrix(); }
      const pt = (vp.mode === 'first' ? 0.3 + brPitch(ch) : brPitch(ch) * 0.6); if (pt) { const d = new THREE.Vector3(); c.getWorldDirection(d); const yaw = Math.atan2(d.z, d.x), p0 = Math.asin(Math.max(-1, Math.min(1, d.y))), np = Math.max(-1.2, Math.min(1.2, p0 + pt)); c.lookAt(c.position.x + Math.cos(yaw) * Math.cos(np), c.position.y + Math.sin(np), c.position.z + Math.sin(yaw) * Math.cos(np)); c.updateMatrixWorld(); }
    }
    return c;
  };
  P.modeMake = function (o) {
    if (o.t === 'bul') { const gun = BR_GUNS[o.w] || BR_GUNS.pistol, G = new THREE.Group(), tr = new THREE.Mesh(new THREE.CylinderGeometry(o.w === 'rocket' ? 0.12 : 0.04, o.w === 'rocket' ? 0.12 : 0.04, o.w === 'rocket' ? 0.6 : 0.9, 6).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: o.w === 'rocket' ? 0xff7a1c : 0xfff2a0 })); G.add(tr); return G; }
    if (o.t === 'dwall') { const G = new THREE.Group(), p = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.7, 2.6), new THREE.MeshStandardMaterial({ color: 0x7ff6ff, emissive: 0x3dd6ff, emissiveIntensity: 0.4, transparent: true, opacity: 0.55 })); p.position.y = 0.85; G.add(p); return G; }
    return make.call(this, o);
  };
  P.modePlace = function (mesh, o, t) {
    if (o.t === 'bul') { mesh.position.set(o.x, (o.z || 0) + 0.55, o.y); mesh.rotation.order = 'YZX'; mesh.rotation.y = -Math.atan2(o.vy, o.vx); mesh.rotation.z = Math.atan2(o.vz || 0, Math.hypot(o.vx, o.vy)); return; }
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

/* ----- the Volt Royale hotbar: five slots with a picture of each gun or item, its ammo, and health and shield bars ----- */
function brDrawIcon(c, k) {
  const W = 128, H = 72, metal = '#2b2f35', dark = '#15181c', acc = '#' + ((BR_GUNS[k] || BR_ITEMS[k] || { col: 0x2e7d32 }).col).toString(16).padStart(6, '0');
  c.clearRect(0, 0, W, H); c.lineJoin = 'round';
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); }, P = (pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); };
  const shine = (x, y, w) => { c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x, y, w, 2); };
  if (k === 'pistol') { R(34, 24, 56, 13, metal); R(84, 27, 12, 6, dark); P([[40, 37], [56, 37], [52, 60], [36, 60]], dark); c.strokeStyle = dark; c.lineWidth = 3; c.beginPath(); c.arc(58, 40, 6, 0, Math.PI); c.stroke(); R(36, 26, 10, 3, acc); shine(34, 25, 50); }
  else if (k === 'smg') { R(26, 24, 66, 14, metal); R(92, 28, 16, 5, dark); R(56, 38, 9, 22, dark); P([[30, 38], [44, 38], [40, 56], [28, 56]], dark); R(8, 28, 20, 6, dark); R(14, 34, 5, 12, dark); R(30, 26, 12, 3, acc); shine(26, 25, 66); }
  else if (k === 'shotgun') { R(14, 26, 98, 7, metal); R(40, 33, 52, 6, '#6b4a2b'); R(10, 30, 28, 10, '#6b4a2b'); P([[2, 30], [14, 30], [14, 46], [4, 44]], '#5a3a20'); R(60, 39, 8, 12, dark); R(96, 25, 4, 3, acc); shine(14, 27, 98); }
  else if (k === 'rifle') { R(22, 26, 76, 12, metal); R(98, 29, 24, 4, dark); P([[54, 38], [64, 38], [68, 58], [58, 60]], dark); P([[30, 38], [42, 38], [38, 54], [28, 54]], dark); P([[2, 28], [22, 26], [22, 40], [4, 44]], dark); R(44, 18, 22, 7, dark); R(46, 20, 18, 3, acc); shine(22, 27, 76); }
  else if (k === 'sniper') { R(16, 30, 64, 10, metal); R(80, 32, 46, 4, dark); P([[0, 30], [16, 30], [16, 44], [2, 48]], '#4a5a3a'); R(30, 18, 40, 9, dark); c.fillStyle = acc; c.beginPath(); c.arc(30, 22, 5, 0, 7); c.fill(); c.beginPath(); c.arc(70, 22, 4, 0, 7); c.fill(); R(40, 40, 7, 14, dark); c.strokeStyle = dark; c.lineWidth = 3; c.beginPath(); c.moveTo(100, 36); c.lineTo(94, 56); c.moveTo(100, 36); c.lineTo(108, 56); c.stroke(); shine(16, 31, 64); }
  else if (k === 'rocket') { R(10, 22, 96, 20, '#4a5a3a'); P([[106, 22], [122, 32], [106, 42]], acc); R(4, 20, 8, 24, dark); R(50, 42, 9, 16, dark); R(36, 14, 14, 8, dark); R(80, 22, 4, 20, '#3a4a2a'); shine(10, 23, 96); }
  else if (k === 'band') { c.fillStyle = '#f4f1ea'; c.beginPath(); c.arc(58, 36, 22, 0, 7); c.fill(); c.fillStyle = '#d9d2c3'; c.beginPath(); c.arc(58, 36, 9, 0, 7); c.fill(); R(58, 50, 50, 10, '#e8e1d1'); c.strokeStyle = '#c9bfa8'; c.lineWidth = 2; c.beginPath(); c.arc(58, 36, 16, 0, 7); c.stroke(); }
  else if (k === 'medkit') { R(30, 18, 68, 44, '#c0392b'); R(30, 18, 68, 7, '#9e2b20'); R(58, 28, 12, 28, '#fff'); R(50, 36, 28, 12, '#fff'); R(54, 10, 20, 8, '#22262b'); }
  else if (k === 'plate') { P([[44, 8], [84, 8], [92, 20], [90, 50], [64, 66], [38, 50], [36, 20]], '#4a7fd8'); P([[52, 16], [76, 16], [80, 24], [78, 46], [64, 56], [50, 46], [48, 24]], '#bfd7ff'); }
  else if (k === 'armour') { R(26, 14, 76, 48, '#1e3f8a'); R(26, 54, 76, 8, '#6fb6ff'); P([[64, 20], [82, 26], [80, 42], [64, 52], [48, 42], [46, 26]], '#6fb6ff'); R(52, 6, 24, 8, '#15181c'); }
  else if (k === 'fullkit') { R(20, 14, 88, 50, '#f4f4f2'); R(20, 34, 88, 9, '#2ecc71'); R(36, 20, 8, 22, '#e74c3c'); R(29, 27, 22, 8, '#e74c3c'); P([[84, 18], [98, 22], [97, 34], [84, 42], [72, 34], [71, 22]], '#3d8bff'); R(50, 6, 28, 8, '#15181c'); }
  else if (k === 'med') { R(36, 14, 56, 46, '#f4f4f2'); R(36, 14, 56, 8, '#d0d0d0'); R(58, 24, 12, 30, '#e0283a'); R(49, 33, 30, 12, '#e0283a'); }
  else if (k === 'pot') { c.fillStyle = '#3d8bff'; c.beginPath(); c.arc(64, 44, 20, 0, 7); c.fill(); R(56, 10, 16, 18, '#3d8bff'); R(54, 6, 20, 6, '#8a6a3a'); c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(56, 38, 6, 0, 7); c.fill(); }
  else if (k === 'boost') { P([[30, 36], [86, 26], [104, 36], [86, 46]], '#d0d4da'); P([[86, 26], [104, 36], [86, 46]], '#e0283a'); P([[30, 36], [14, 26], [6, 36], [14, 46]], '#ff9f1c'); P([[24, 36], [14, 30], [12, 36], [14, 42]], '#ffe27a'); }
  else if (k.startsWith('am_')) {                                           // v14.1.8: ammo icons that look like the rounds
    const brass = '#c9a24a', copper = '#b87333', rnd = (x, base, w, caseH, neckW, neckH, bulH, tip) => { R(x - w / 2, base - caseH, w, caseH, brass); R(x - w / 2 - 1, base - 3, w + 2, 3, '#a8822f'); let top = base - caseH, bw = w;
      if (neckW) { R(x - neckW / 2, top - neckH, neckW, neckH, brass); top -= neckH; bw = neckW; } if (bulH <= 7 && !neckW) { c.fillStyle = copper; c.beginPath(); c.ellipse(x, top, bw / 2, bulH, 0, Math.PI, 0); c.fill(); } else P([[x - bw / 2, top], [x + bw / 2, top], [x, top - bulH]], copper); if (tip) P([[x - bw / 4, top - bulH * 0.55], [x + bw / 4, top - bulH * 0.55], [x, top - bulH]], tip); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x - w / 2 + 1, top, 2, caseH + (neckH || 0)); };
    if (k === 'am_light') { R(18, 40, 92, 26, '#c9b48a'); R(18, 40, 92, 4, '#8a6f45'); for (let i = 0; i < 7; i++) rnd(28 + i * 12, 44, 8, 12, 0, 0, 7); R(40, 50, 48, 10, '#e8d9b0'); }
    else if (k === 'am_shells') { for (let i = 0; i < 4; i++) { const x = 30 + i * 22; R(x - 8, 14, 16, 40, '#c62828'); R(x - 8, 14, 16, 3, '#7f1d1d'); R(x - 9, 50, 18, 14, brass); R(x - 9, 61, 18, 3, '#9c7a2e'); c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x - 6, 18, 3, 32); } }
    else if (k === 'am_medium') { R(18, 58, 92, 5, '#8d939a'); for (let i = 0; i < 5; i++) rnd(30 + i * 17, 58, 10, 26, 6, 6, 14); }
    else if (k === 'am_heavy') { R(14, 58, 100, 12, '#4b5a32'); for (let i = 0; i < 3; i++) rnd(36 + i * 28, 60, 14, 30, 9, 5, 18, '#15181c'); }
    else if (k === 'am_rockets') { R(14, 30, 84, 14, '#5d6b3a'); P([[98, 30], [118, 37], [98, 44]], '#c0392b'); P([[14, 30], [6, 24], [6, 50], [14, 44]], '#15181c'); }
  }
  else if (k === 'wall') { c.fillStyle = 'rgba(127,246,255,0.55)'; c.fillRect(30, 8, 68, 56); c.strokeStyle = '#3dd6ff'; c.lineWidth = 3; c.strokeRect(30, 8, 68, 56); c.beginPath(); c.moveTo(64, 8); c.lineTo(64, 64); c.moveTo(30, 36); c.lineTo(98, 36); c.stroke(); }
}
Object.assign(GameScene.prototype, {
  brIcon(k) { const key = 'bricon-' + k; if (!this.textures.exists(key)) { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 72; brDrawIcon(cv.getContext('2d'), k); this.textures.addCanvas(key, cv); } return key; },
  brHud(m) {
    const mine = (this.setup.players || []).filter(p => !p.remote && p.chair), one = !this.vps || this.vps.length < 2, c = mine[0] && mine[0].chair;
    const show = one && c && !c.out && m.state !== 'over';
    if (!this.brH || !this.brH.g.scene) {
      const V = CONFIG.view, g = this.add.graphics().setDepth(30), slots = [];
      for (let i = 0; i < BR.slots; i++) slots.push({ img: this.add.image(0, 0, this.brIcon('pistol')).setDepth(31).setDisplaySize(84, 47), txt: this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(1, 1).setDepth(32), key: this.add.text(0, 0, String(i + 1), { fontFamily: FONT, fontSize: '13px', color: '#9fb2bf' }).setDepth(32) });
      this.brH = { g, slots, hp: this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0, 0.5).setDepth(32), name: this.add.text(V.width / 2, V.height - 118, '', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffe27a' }).setOrigin(0.5).setDepth(32).setShadow(0, 2, '#000', 4, true, true) };
    }
    const H = this.brH, all = [H.g, H.hp, H.name, ...H.slots.flatMap(s => [s.img, s.txt, s.key])];
    if (!show) { all.forEach(o => o.setVisible(false)); H.slots.forEach(s => s.inHand && s.inHand.setVisible(false)); return false; }
    all.forEach(o => o.setVisible(true));
    const V = CONFIG.view, G = c.gs, sw = 96, sh = 62, gap = 8, bwid = BR.slots * sw + (BR.slots - 1) * gap, x0 = V.width - 16 - bwid, y0 = V.height - 74, g = H.g; g.clear();   // the inventory: bottom right
    const bw = 260, bx = 16, by = V.height - 24;                              // health (green to red) and shield (blue) bars: bottom left, under the speed meter
    g.fillStyle(0x0d151b, 0.75).fillRoundedRect(bx - 6, by - 20, bw + 100, 34, 6);
    g.fillStyle(0x223040, 1).fillRect(bx, by - 14, bw, 9).fillStyle(0x3d8bff, 1).fillRect(bx, by - 14, bw * Math.max(0, G.sh) / BR.maxShield, 9);
    const hpk = Math.max(0, G.hp) / BR.hp; g.fillStyle(0x3a2025, 1).fillRect(bx, by - 2, bw, 11).fillStyle(hpk > 0.5 ? 0x5ad45a : hpk > 0.25 ? 0xffc23d : 0xff4d4d, 1).fillRect(bx, by - 2, bw * hpk, 11);
    H.hp.setText(`${Math.ceil(G.hp)}  |  ${Math.ceil(G.sh)}${G.boost > 0 ? '   🚀' : ''}`).setPosition(bx + bw + 14, by - 4);
    brSlots(G);
    for (let i = 0; i < BR.slots; i++) {
      const s = H.slots[i], it = brSlotItem(G, i), x = x0 + i * (sw + gap), sel = it && it === G.inv[G.sel] && !G.hol, y = sel ? y0 - 14 : y0;   /* (slots keep their place: gaps stay gaps; the one in your hands lifts up and glows) */
      if (sel) { const pul = 0.5 + 0.5 * Math.sin(this.time.now / 260); g.fillStyle(0xffd23f, 0.14 + 0.1 * pul).fillRoundedRect(x - 6, y - 6, sw + 12, sh + 12, 12); g.fillStyle(0xffd23f, 1).fillTriangle(x + sw / 2 - 8, y0 + sh + 2, x + sw / 2 + 8, y0 + sh + 2, x + sw / 2, y0 + sh - 6); }
      g.fillStyle(sel ? 0x2a3a48 : 0x0d151b, sel ? 0.97 : 0.55).fillRoundedRect(x, y, sw, sh, 8).lineStyle(sel ? 4 : 1.5, sel ? 0xffd23f : 0x3a4a58, 1).strokeRoundedRect(x, y, sw, sh, 8); if (it && BR_GUNS[it.k] && typeof BR_TIER !== 'undefined') { const T = BR_TIER[it.t || 0]; g.fillStyle(T.col, sel ? 0.3 : 0.16).fillRoundedRect(x + 2, y + 2, sw - 4, sh - 4, 7).fillStyle(T.col, 1).fillRect(x + 6, y + sh - 6, sw - 12, 4); }   /* (the gun's tier colour) */
      if (sel) g.fillStyle(0xffd23f, 1).fillRoundedRect(x + sw / 2 - 26, y - 10, 52, 14, 5);
      s.key.setPosition(x + 6, y + 3).setText(sel ? '' : String(i + 1)); s.inHand = s.inHand || this.add.text(0, 0, 'IN HAND', { fontFamily: FONT, fontSize: '11px', fontStyle: 'bold', color: '#1a1206' }).setOrigin(0.5).setDepth(33); s.inHand.setVisible(!!sel).setPosition(x + sw / 2, y - 3);
      if (!it) { s.img.setVisible(false); s.txt.setText(''); continue; }
      s.img.setTexture(this.brIcon(it.k)).setDisplaySize(sel ? 92 : 78, sel ? 52 : 44).setPosition(x + sw / 2, y + sh / 2 - 3).setAlpha(BR_GUNS[it.k] && it.a <= 0 ? 0.35 : sel ? 1 : 0.6); s.sel = sel;
      s.txt.setText(BR_GUNS[it.k] ? String(it.a) : 'x' + it.a).setColor(BR_GUNS[it.k] && it.a <= 0 ? '#ff6b6b' : '#ffffff').setPosition(x + sw - 6, y + sh - 3);
    }
    const it = G.inv[G.sel]; H.name.setText(it ? `${(BR_GUNS[it.k] || BR_ITEMS[it.k]).name}    RT ${BR_GUNS[it.k] ? 'fire' : 'use'} · LT aim · LB/RB switch · X jump · B bag` : 'Empty-handed: drive into a CHEST for a gun').setPosition(x0 + bwid / 2, y0 - 34);
    return true;
  }
});
{ const P = GameScene.prototype, hud = P.updateMiniHud; P.updateMiniHud = function (m) { hud.call(this, m); if (m.kind === 'br' && this.brHud(m) && this.itemText) this.itemText.setVisible(false); }; }

/* ===== v11.2: crosshair, hit markers, damage flash, kill feed, spectating, the storm on the minimap, and the inventory screen (B) ===== */
Object.assign(GameScene.prototype, {
  brExtras(m) {
    const V = CONFIG.view, g = m.gs, mine = (this.setup.players || []).filter(p => !p.remote && p.chair), p0 = mine[0] || (this.online ? { chair: this.brMyChair() } : null), c = p0 && p0.chair;
    if (!this.brX || !this.brX.g.scene) this.brX = { g: this.add.graphics().setDepth(29), feed: Array.from({ length: 5 }, () => this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#0d151bb0', padding: { x: 6, y: 2 } }).setOrigin(1, 0).setDepth(31)), spec: this.add.text(V.width / 2, 108, '', { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffd23f', backgroundColor: '#0d151bc0', padding: { x: 10, y: 4 } }).setOrigin(0.5).setDepth(31) };
    const X = this.brX, G2 = X.g; G2.clear();
    const feed = (g.feed || []).filter(f => g.t - f[3] < 7);                 // the kill feed, under the minimap
    X.feed.forEach((t, i) => { const f = feed[feed.length - 1 - i]; if (!f) return t.setVisible(false); const gun = BR_GUNS[f[2]]; t.setText(f[0] ? `${f[0]}  [${gun ? gun.name : '?'}]  ${f[1]}` : `${f[1]}  was caught in the storm`).setPosition(V.width - 10, 112 + i * 24).setColor(c && (f[4] === c.gs.team) ? '#7dff6a' : c && f[5] === c.gs.team ? '#ff6b6b' : '#ffffff').setVisible(true); });
    const vp = this.vps && this.vps.length === 1 ? this.vps[0] : null;
    if (c && c.out) { const s = vp && vp.spect; X.spec.setText(s ? `ELIMINATED  -  watching ${m.name(s)}${s.gs.team === c.gs.team && (m.mini.squad || 1) > 1 ? ' (team-mate)' : ''}     LB / RB: switch` : 'ELIMINATED').setVisible(m.state !== 'over'); } else X.spec.setVisible(false);
    if (!c || c.out || m.state === 'over' || !vp || !this.v3 || this.flat) return;
    const G = c.gs, it = G.inv[G.sel], gun = it && BR_GUNS[it.k];
    if (gun) {                                                                // the crosshair: where your shots will go (heading + right stick), 12 m out
      const a = c.heading + (p0._look ? p0._look.x * CONFIG.view3d.look.yaw * Math.PI / 180 : 0), pt = brPitch(c), q = this.v3.project(vp, c.x + Math.cos(a) * 12 * Math.cos(pt), (G.z || 0) + 0.55 + Math.sin(pt) * 12, c.y + Math.sin(a) * 12 * Math.cos(pt));
      if (brAds(c) && it.k === 'sniper' && vp.mode === 'first') { q.x = vp.rect.x + vp.rect.w / 2; q.y = vp.rect.y + vp.rect.h / 2; q.behind = false; }   /* (the scope: dead centre) */
      if (!q.behind) { const ads = brAds(c), sz = 7 + gun.spread * 60 * (ads ? 0.35 : 1), hit = G.hm !== undefined && g.t - G.hm < 0.25; G2.lineStyle(2, 0x000000, 0.5).strokeCircle(q.x, q.y, sz + 1).lineStyle(2, hit ? 0xff4d4d : 0xffffff, 0.9).strokeCircle(q.x, q.y, sz).fillStyle(0xffffff, 1).fillCircle(q.x, q.y, 1.6);
        if (ads && it.k === 'sniper' && vp.mode === 'first') { q.x = vp.rect.x + vp.rect.w / 2; q.y = vp.rect.y + vp.rect.h / 2; }   /* (the scope sits dead centre: the camera looks straight down the aim when you aim) */
        if (ads && it.k === 'sniper' && vp.mode === 'first') G2.lineStyle(520, 0x05080a, 0.88).strokeCircle(q.x, q.y, 560).lineStyle(2, 0x000000, 0.8).lineBetween(q.x - 290, q.y, q.x - 12, q.y).lineBetween(q.x + 12, q.y, q.x + 290, q.y).lineBetween(q.x, q.y - 290, q.x, q.y - 12).lineBetween(q.x, q.y + 12, q.x, q.y + 290);   // the sniper's scope
        if (hit) G2.lineStyle(3, 0xff4d4d, 1).lineBetween(q.x - 14, q.y - 14, q.x - 6, q.y - 6).lineBetween(q.x + 14, q.y - 14, q.x + 6, q.y - 6).lineBetween(q.x - 14, q.y + 14, q.x - 6, q.y + 6).lineBetween(q.x + 14, q.y + 14, q.x + 6, q.y + 6); }
    }
    if (G.hitT > 0) { const k = G.hitT / 0.25 * 0.35; G2.fillStyle(0xff2a2a, k).fillRect(0, 0, V.width, 24).fillRect(0, V.height - 24, V.width, 24).fillRect(0, 0, 24, V.height).fillRect(V.width - 24, 0, 24, V.height); }   // you were hit
    if (G.hp < 30) G2.lineStyle(10, 0xff2a2a, 0.15 + 0.1 * Math.sin(this.time.now / 150)).strokeRect(5, 5, V.width - 10, V.height - 10);
  },
  brMyChair() { const o = this.online, m = this.match; if (!o) return null; const id = o.role === 'host' ? (o.me && o.me.id) : o.session.myId; return m.chairs.find(c => c.player && c.player.id === id) || null; },
  openInventory(p) {
    if (this.scene.isActive('BRInv')) return; const m = this.match, M = modeOf(m), o = this.online, chair = p.chair;
    const act = a => { if (o && o.role === 'client') { const L = o.sim && o.sim.locals.find(x => x.id === p.id) || (o.sim && o.sim.locals[0]); if (L) L.pending.push(`inv:${a.op}:${a.a}:${a.b === undefined ? -1 : a.b}`); } else M.invAct(chair, a, this.match); };
    p.invOpen = true; Sound.play('select'); this.scene.launch('BRInv', { game: this, p, chair, act, src: p.src || Controls.mine });
  }
});
{ const P = GameScene.prototype, hud = P.updateMiniHud, onl = P.updateOnline, vps = P.viewports3d, mm = P.drawMinimap;
  P.updateMiniHud = function (m) { hud.call(this, m); if (m.kind === 'br') this.brExtras(m); };
  P.updateOnline = function (delta) {                                       // online: B opens your inventory too
    const m = this.match, o = this.online, src = Controls.mine;
    if (m && m.kind === 'br' && m.state === 'play' && src && src.bagTap && (src.bagTap = false, true) && !this.scene.isActive('BRInv') && !this.scene.isActive('Pause')) { const chair = this.brMyChair(); if (chair && !chair.out) this.openInventory({ chair, src, id: chair.player.id, get invOpen() { return chair.player.invOpen; }, set invOpen(v) { chair.player.invOpen = v; } }); }
    return onl.call(this, delta);
  };
  P.viewports3d = function (LP) {                                           // eliminated in Volt Royale: watch a team-mate (or whoever got you, or anyone still in)
    const list = vps.call(this, LP), m = this.match; if (m.kind !== 'br') return list;
    for (const vp of list) if (vp.look) vp.look = { x: vp.look.x, y: 0 };                    // (the right stick's up / down tilts your gun instead)
    for (const vp of list) {                                                  // (your team-mates if any are left, otherwise anyone still in; LB / RB switch between them)
      const ch = vp.benchChair, p = vp.p; if (!p || !ch || !ch.out) continue;
      const live = m.chairs.filter(c => !c.out), mates = live.filter(c => c.gs.team === ch.gs.team), pool = mates.length ? mates : live; if (!pool.length) continue;
      let t = pool.find(c => c.k === p.specK);
      if (!t) { const killer = m.chairs[ch.gs.by]; t = mates[0] || (killer && !killer.out ? killer : pool[0]); }
      const src = p.src || Controls.mine, fr = this.game.loop.frame;
      if (src && src.pressed && p.specFrame !== fr && (src.pressed.halfCW || src.pressed.halfCCW || src.pressed.right || src.pressed.left)) { p.specFrame = fr; const d = src.pressed.halfCCW || src.pressed.left ? -1 : 1; t = pool[(pool.indexOf(t) + d + pool.length) % pool.length]; Sound.play('blip'); }
      p.specK = t.k; vp.chair = t; vp.mode = 'third'; vp.benched = false; vp.spect = t;
    }
    return list;
  };
  P.drawMinimap = function () {                                             // the storm and the next safe circle on the minimap
    mm.call(this); const m = this.match; if (m.kind !== 'br' || !m.gs || !m.gs.st) return;
    const g = this.mapG, M = CONFIG.view3d.minimap, C = CONFIG.court, B = CONFIG.courtBase || C, fit = Math.min(1, B.width / C.width, B.height / C.height), s = M.scale * fit, ox = M.x + (B.width - C.width * fit) * M.scale, oy = M.y, S = m.gs.st;
    if (S.shrink > 0 || S.wait > 0) g.lineStyle(1.5, 0xffffff, 0.8).strokeCircle(ox + S.fx * s, oy + S.fy * s, S.fr * s);
    g.lineStyle(2, 0x9b4dff, 1).strokeCircle(ox + S.x * s, oy + S.y * s, S.r * s);
  };
}

/* The inventory screen (B in Volt Royale): your five slots, big. Move along them, A picks one up and puts it down in another slot
   (swapping), Y holds it, X drops it on the ground, B closes. Mouse / touch: click a slot, then the buttons. */
class BRInvScene extends Phaser.Scene {
  constructor() { super('BRInv'); }
  init(d) { this.d = d; const G = d.chair.gs, held = !G.hol && G.inv[G.sel]; this.cur = held && held.s !== undefined ? held.s : 0; this.pick = -1; }   /* (the bag opens on what is in your hands) */
  create() {
    const V = CONFIG.view, cx = V.width / 2, cy = V.height / 2 - 20, W = 820, Hh = 360; this.cx = cx; this.cy = cy;
    this.add.rectangle(cx, V.height / 2, V.width, V.height, 0x000000, 0.35); panel(this, cx - W / 2, cy - Hh / 2, W, Hh, { alpha: 0.95, radius: 18 });
    this.add.text(cx, cy - Hh / 2 + 28, 'INVENTORY', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: THEME.gold_css }).setOrigin(0.5);
    this.g = this.add.graphics(); this.slots = [];
    for (let i = 0; i < BR.slots; i++) { const x = cx + (i - 2) * 150, y = cy - 30, img = this.add.image(x, y - 6, this.d.game.brIcon('pistol')).setDisplaySize(124, 70), t = this.add.text(x + 60, y + 44, '', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(1, 1), n = this.add.text(x - 60, y - 50, String(i + 1), { fontFamily: FONT, fontSize: '14px', color: '#9fb2bf' });
      const z = this.add.zone(x, y, 136, 104).setInteractive({ useHandCursor: true }); z.on('pointerdown', () => { this.cur = i; this.press('a'); }); this.slots.push({ x, y, img, t, n }); }
    this.info = this.add.text(cx, cy + 50, '', { fontFamily: FONT, fontSize: '18px', color: '#e8eef2', align: 'center' }).setOrigin(0.5);
    this.help = this.add.text(cx, cy + Hh / 2 - 84, '◀ ▶ choose     A: move / swap     Y: hold this     X: drop on the ground     B: close', { fontFamily: FONT, fontSize: '16px', color: '#9fb2bf' }).setOrigin(0.5);
    [['Hold', 'y', -220], ['Drop', 'x', 0], ['Close', 'b', 220]].forEach(([l, k, dx]) => tapButton(this, cx + dx, cy + Hh / 2 - 28, 180, l, () => this.press(k)));
    this.events.once('shutdown', () => { this.d.p.invOpen = false; });
  }
  press(k) {
    const G0 = this.d.chair.gs, at = i => brSlotItem(G0, i), act = this.d.act;
    if (k === 'b') { Sound.play('back'); this.d.p.invOpen = false; this.scene.stop(); return; }
    if (k === 'a') { if (this.pick < 0) { if (at(this.cur)) { this.pick = this.cur; Sound.play('select'); } } else { if (this.pick !== this.cur) act({ op: 'swap', a: this.pick, b: this.cur }); this.pick = -1; Sound.play('blip'); } }
    if (k === 'y' && at(this.cur)) { act({ op: 'sel', a: this.cur }); Sound.play('select'); }
    if (k === 'x' && at(this.cur)) { act({ op: 'drop', a: this.cur }); this.pick = -1; Sound.play('back'); }
  }
  update() {
    const d = this.d, c = d.chair, G = c.gs, src = d.src; if (!this.d.game.scene.isActive() || c.out || d.game.match.state !== 'play') { this.d.p.invOpen = false; return this.scene.stop(); }
    Controls.update(this.game.loop.frame); const P = (src && src.pressed) || {};
    if (P.left) { this.cur = (this.cur + BR.slots - 1) % BR.slots; Sound.play('blip'); } if (P.right) { this.cur = (this.cur + 1) % BR.slots; Sound.play('blip'); }
    for (const k of ['a', 'b', 'x', 'y']) if (P[k]) this.press(k); if (P.start) this.press('b');
    const g = this.g; g.clear();
    this.slots.forEach((s, i) => { const it = brSlotItem(G, i), cur = i === this.cur, held = it && it === G.inv[G.sel], pk = i === this.pick, y = s.y - (pk ? 12 : 0);
      g.fillStyle(cur ? 0x2a3a48 : 0x14202a, 1).fillRoundedRect(s.x - 68, y - 52, 136, 104, 10).lineStyle(cur ? 4 : 2, pk ? 0x3dd6ff : cur ? 0xffd23f : held ? 0x7dff6a : 0x3a4a58, 1).strokeRoundedRect(s.x - 68, y - 52, 136, 104, 10);
      if (held) g.fillStyle(0x7dff6a, 1).fillCircle(s.x + 56, y - 40, 5);
      s.img.setVisible(!!it).setY(y - 6); s.t.setY(y + 44); if (it) { s.img.setTexture(d.game.brIcon(it.k)).setDisplaySize(124, 70); s.t.setText(BR_GUNS[it.k] ? String(it.a) : 'x' + it.a); } else s.t.setText(''); });
    const it = brSlotItem(G, this.cur), gun = it && BR_GUNS[it.k];
    this.info.setText(!it ? (this.pick >= 0 ? 'Empty slot: A puts it here' : 'Empty slot') : gun ? `${brName(it.k, it.t)}   ammo ${it.a}     damage ${gun.dmg}${gun.pellets ? ' x' + gun.pellets : ''}   ${(1 / gun.cd).toFixed(1)} shots/s   range ${gun.range} m${gun.auto ? '   (hold to fire)' : ''}` : `${BR_ITEMS[it.k].name} x${it.a}     ${{ med: 'heals 50', pot: '+50 shield', boost: '3 s of speed', wall: 'a wall that stops bullets' }[it.k] || ''}`);
  }
}
