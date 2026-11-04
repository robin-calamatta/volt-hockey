/* Drawing for the v10 minigames (modes_games.js): the things in m.gs.objs and each game's fixtures, in the 3D view and the classic 2D view.
   Everything here only reads the game state, so it works the same for an online guest. */

/* ---------------- 3D ---------------- */
Object.assign(View3D.prototype, {
  modeMat(color, opts = {}) { return opts.basic ? (this.mats['b' + color + (opts.op || 1)] || (this.mats['b' + color + (opts.op || 1)] = new THREE.MeshBasicMaterial({ color, transparent: (opts.op || 1) < 1, opacity: opts.op || 1, depthWrite: (opts.op || 1) >= 1, side: THREE.DoubleSide }))) : this.mat(color, opts); },
  modeMake(o) {
    const m = this.m, M = (geo, mat) => { const x = new THREE.Mesh(geo, mat); x.castShadow = true; return x; }, G = new THREE.Group();
    switch (o.t) {
      case 'ball': G.add(M(new THREE.SphereGeometry(o.r, 18, 12), this.mat(0xff7a1c, { rough: 0.4, emissive: 0.15 }))); break;
      case 'bigball': { const cv = G3.canvas(256, 128), c = cv.getContext('2d'), cols = ['#ff4d4d', '#ffffff', '#3dd6ff', '#ffffff', '#ffd23f', '#ffffff']; cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(i * 256 / 6, 0, 256 / 6 + 1, 128); }); const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding;
        G.add(M(new THREE.SphereGeometry(o.r, 32, 20), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.45 }))); break; }
      case 'bball': G.add(M(new THREE.SphereGeometry(o.r, 22, 16), this.mat(0x1b2a8b, { rough: 0.15, metal: 0.4 }))); break;
      case 'gball': G.add(M(new THREE.SphereGeometry(o.r, 16, 12), this.mat(MINI.palette[o.k % MINI.palette.length], { rough: 0.3, emissive: 0.2 }))); break;
      case 'pin': { const body = M(new THREE.CylinderGeometry(0.06, 0.12, 0.5, 14), this.mat(0xf4f4f2, { rough: 0.3 })); body.position.y = 0.25; const head = M(new THREE.SphereGeometry(0.075, 12, 10), this.mat(0xf4f4f2, { rough: 0.3 })); head.position.y = 0.52; const band = M(new THREE.CylinderGeometry(0.075, 0.08, 0.05, 14), this.mat(0xd8392b)); band.position.y = 0.42; G.add(body, head, band); break; }
      case 'orb': { const s = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), this.modeMat(0x7ff6ff, { basic: true })); const h = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), this.modeMat(0x7ff6ff, { basic: true, op: 0.25 })); G.add(s, h); break; }
      case 'star': { const s = M(new THREE.OctahedronGeometry(0.28, 0), this.mat(0xffd23f, { rough: 0.3, metal: 0.3, emissive: 0.35 })); s.scale.set(1, 1.3, 0.45); G.add(s); break; }
      case 'beam': { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8).rotateZ(Math.PI / 2).translate(0.5, 0, 0), this.modeMat(0x7ff6ff, { basic: true, op: 0.85 })); G.add(b); break; }
      case 'boom': { G.add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: o.lava ? 0xff3b1c : 0xffa31c, transparent: true, opacity: 0.7, depthWrite: false }))); break; }
      case 'pkg': { const b = M(new THREE.BoxGeometry(0.42, 0.34, 0.42), this.mat(HOUSE_COLS[o.to % HOUSE_COLS.length], { rough: 0.6 })); const t = M(new THREE.BoxGeometry(0.44, 0.06, 0.1), this.mat(0x6b4a2b)); t.position.y = 0.15; G.add(b, t); break; }
      case 'ramp': { const sh = new THREE.Shape(); sh.moveTo(-o.len / 2, 0); sh.lineTo(o.len / 2, 0); sh.lineTo(o.len / 2, STUNT.rise); sh.lineTo(-o.len / 2, 0);
        const geo = new THREE.ExtrudeGeometry(sh, { depth: o.w, bevelEnabled: false }).translate(0, 0, -o.w / 2); const r = M(geo, this.mat(0xf2c200, { rough: 0.5 })); r.receiveShadow = true;
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(o.len * 1.02, 0.18).rotateX(-Math.PI / 2), this.mat(0x111111)); stripe.rotation.z = Math.atan2(STUNT.rise, o.len); stripe.position.y = STUNT.rise / 2 + 0.01; G.add(r); G.rotation.y = -o.a; break; }
      default: G.add(M(new THREE.SphereGeometry(0.2, 10, 8), this.mat(0xffffff)));
    }
    return G;
  },
  modePlace(mesh, o, t) {
    const m = this.m;
    if (o.t === 'pin') { mesh.position.set(o.x, 0, o.y); mesh.rotation.set(o.down ? 1.45 : 0, o.i * 0.7, 0); if (o.down) mesh.position.y = 0.1; return; }
    if (o.t === 'beam') { mesh.position.set(o.x, 0.45, o.y); const dx = o.x2 - o.x, dy = o.y2 - o.y; mesh.scale.set(Math.hypot(dx, dy), 1, 1); mesh.rotation.y = -Math.atan2(dy, dx); return; }
    if (o.t === 'boom') { const k = Math.max(0.05, 1 - o.life / 0.7); mesh.position.set(o.x, 0.4, o.y); mesh.scale.setScalar(0.4 + k * 3); mesh.children[0].material.opacity = 0.75 * (1 - k); return; }
    if (o.t === 'ramp') { mesh.position.set(o.x, 0, o.y); return; }
    const y = o.t === 'pkg' ? (o.car >= 0 ? 1.32 : 0.2 + Math.sin(t * 3 + o.id) * 0.04) : o.t === 'orb' ? 0.5 + Math.sin(t * 2.5 + o.id) * 0.12 : o.t === 'star' ? 0.45 + Math.sin(t * 3 + o.id) * 0.08 : o.r || 0.2;
    mesh.position.set(o.x, y, o.y); if (o.wait > 0) mesh.position.y = -5;
    if (o.t === 'star' || o.t === 'orb' || (o.t === 'pkg' && o.car < 0)) mesh.rotation.y = t * 2 + o.id;
    if (o.t === 'ball' || o.t === 'bigball' || o.t === 'gball' || o.t === 'bball') { const st = mesh.userData; if (st.lx !== undefined) { const dx = o.x - st.lx, dy = o.y - st.ly, d = Math.hypot(dx, dy); if (d > 1e-4 && d < 2) mesh.rotateOnWorldAxis(new THREE.Vector3(dy / d, 0, -dx / d), -d / (o.r || 0.2)); } st.lx = o.x; st.ly = o.y; }
  },
  /* Fixtures each game builds once (or when they change: a new golf hole). */
  buildModeStatic() {
    const m = this.m, g = m.gs, S = this.modeS = new THREE.Group(), add = x => { S.add(x); return x; }, flat = (geo, mat, x, y, h = 0.012) => { const p = new THREE.Mesh(geo.rotateX(-Math.PI / 2), mat); p.position.set(x, h, y); p.receiveShadow = true; return add(p); };
    const k = m.kind; this.modeHole = g.hole;
    if (k === 'hill') { this.hillDisc = flat(new THREE.CircleGeometry(1, 40), this.modeMat(0xffd23f, { basic: true, op: 0.28 }), 0, 0); this.hillRing = flat(new THREE.RingGeometry(0.93, 1, 48), this.modeMat(0xffd23f, { basic: true }), 0, 0, 0.016); }
    if (k === 'sumo') {
      flat(new THREE.PlaneGeometry(m.width, m.height), this.modeMat(0x163a5c, { rough: 0.2, metal: 0.2 }), m.width / 2, m.centerY, 0.004);
      this.sumoTop = add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.08, 64), this.mat(0xe8d3a1, { rough: 0.8 }))); this.sumoTop.position.set(m.width / 2, 0.04, m.centerY); this.sumoTop.receiveShadow = true;
      this.sumoRim = add(new THREE.Mesh(new THREE.RingGeometry(0.975, 1, 72).rotateX(-Math.PI / 2), this.modeMat(0xd8392b, { basic: true }))); this.sumoRim.position.set(m.width / 2, 0.085, m.centerY);
    }
    if (k === 'lava') {
      this.lavaMats = { 1: new THREE.MeshBasicMaterial({ color: 0xff9f1c, transparent: true, opacity: 0.6, depthWrite: false }), 2: new THREE.MeshStandardMaterial({ color: 0xff3b1c, emissive: 0xff3b1c, emissiveIntensity: 0.9, roughness: 0.4 }) };
      const w = m.width / g.cols, h = m.height / g.rows; this.lavaTiles = [];
      for (let j = 0; j < g.rows; j++) for (let i = 0; i < g.cols; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06).rotateX(-Math.PI / 2), this.lavaMats[1]); p.position.set((i + 0.5) * w, 0.014, (j + 0.5) * h); p.visible = false; add(p); this.lavaTiles.push(p); }
      const grid = []; for (let i = 1; i < g.cols; i++) grid.push(G3.limb([i * w, 0.012, 0], [i * w, 0.012, m.height], 0.012)); for (let j = 1; j < g.rows; j++) grid.push(G3.limb([0, 0.012, j * h], [m.width, 0.012, j * h], 0.012));
      add(new THREE.Mesh(G3.merge(grid), this.modeMat(0x0d151b, { basic: true, op: 0.35 })));
    }
    if (k === 'multiball' || k === 'giant') {
      const big = k === 'giant', H = big ? 2.2 : 0.9, cy = m.centerY;
      [0, 1].forEach(s => { const gx = s ? m.width - g.gl : g.gl, bx = s ? m.width : 0, col = TEAMS[m.teams[s]].color, post = this.mat(col, { rough: 0.4, emissive: 0.2 });
        for (const sy of [-1, 1]) { const p = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, H, 10), post)); p.position.set(gx, H / 2, cy + sy * g.gw); p.castShadow = true; }
        const bar = add(new THREE.Mesh(G3.limb([gx, H, cy - g.gw], [gx, H, cy + g.gw], 0.06), post)); bar.castShadow = true;
        const net = this.modeMat(0xffffff, { basic: true, op: 0.18 });
        const back = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * g.gw, H), net)); back.position.set(bx + (s ? -0.05 : 0.05), H / 2, cy); back.rotation.y = Math.PI / 2;
        for (const sy of [-1, 1]) { const sd = add(new THREE.Mesh(new THREE.PlaneGeometry(g.gl, H), net)); sd.position.set((gx + bx) / 2, H / 2, cy + sy * g.gw); }
        flat(new THREE.PlaneGeometry(0.1, 2 * g.gw), this.modeMat(col, { basic: true }), gx, cy, 0.015); });
    }
    if (k === 'ctf') {
      this.flags = [0, 1].map(s => { const col = TEAMS[m.teams[s]].color, B = g.base[s];
        flat(new THREE.RingGeometry(1.35, 1.6, 40), this.modeMat(col, { basic: true }), B.x, B.y); flat(new THREE.CircleGeometry(1.35, 40), this.modeMat(col, { basic: true, op: 0.18 }), B.x, B.y);
        const f = new THREE.Group(), pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 8), this.mat(0xdddddd, { metal: 0.5 })); pole.position.y = 0.85;
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.48), new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide, emissive: col, emissiveIntensity: 0.25 })); cloth.position.set(0.38, 1.45, 0);
        f.add(pole, cloth); f.traverse(x => { if (x.isMesh) x.castShadow = true; }); add(f); f.userData.cloth = cloth; return f; });
    }
    if (k === 'golf') {
      for (const b of g.blocks || []) { const box = add(new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0, 0.5, b.y1 - b.y0), this.mat(0x8b5a2b, { rough: 0.8 }))); box.position.set((b.x0 + b.x1) / 2, 0.25, (b.y0 + b.y1) / 2); box.castShadow = box.receiveShadow = true; }
      if (g.cup) { flat(new THREE.CircleGeometry(0.24, 24), this.modeMat(0x05080b, { basic: true }), g.cup.x, g.cup.y, 0.016); flat(new THREE.RingGeometry(0.24, 0.3, 24), this.modeMat(0xffffff, { basic: true }), g.cup.x, g.cup.y, 0.016);
        const pole = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 8), this.mat(0xeeeeee))); pole.position.set(g.cup.x, 0.75, g.cup.y); const fl = add(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), new THREE.MeshStandardMaterial({ color: 0xd8392b, side: THREE.DoubleSide }))); fl.position.set(g.cup.x + 0.26, 1.33, g.cup.y); this.golfFlag = fl; }
      const green = flat(new THREE.CircleGeometry(2.2, 40), this.mat(0x4fa35a, { rough: 0.9 }), g.cup ? g.cup.x : 0, g.cup ? g.cup.y : 0, 0.008); green.material = new THREE.MeshStandardMaterial({ color: 0x4fa35a, roughness: 0.9, transparent: true, opacity: 0.55 });
    }
    if (k === 'slalom') {
      const cone = (x, y) => { const c = add(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 12), this.mat(0xff7a1c, { rough: 0.5 }))); c.position.set(x, 0.35, y); c.castShadow = true; };
      (g.gates || []).forEach((q, i) => { const px = -Math.sin(q.a) * 1.25, py = Math.cos(q.a) * 1.25; cone(q.x + px, q.y + py); cone(q.x - px, q.y - py); const line = add(new THREE.Mesh(G3.limb([q.x + px, 0.014, q.y + py], [q.x - px, 0.014, q.y - py], 0.05), this.modeMat(i === 0 ? 0xffffff : 0xff7a1c, { basic: true, op: 0.6 }))); });
      this.gateGlow = flat(new THREE.RingGeometry(1.1, 1.3, 40), this.modeMat(0x3dff8a, { basic: true, op: 0.8 }), 0, 0, 0.02);
    }
    if (k === 'delivery') {
      const D = g.depot; flat(new THREE.CircleGeometry(1.4, 40), this.modeMat(0x3a4652, { rough: 0.8 }), D.x, D.y, 0.01); flat(new THREE.RingGeometry(1.4, 1.55, 40), this.modeMat(0xffd23f, { basic: true }), D.x, D.y, 0.014);
      this.houseRings = (g.houses || []).map(H => { const col = HOUSE_COLS[H.c], house = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 1.1), this.mat(col, { rough: 0.7 })); body.position.y = 0.45; const roof = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.7, 4).rotateY(Math.PI / 4), this.mat(0x5a3a2a, { rough: 0.8 })); roof.position.y = 1.25; const door = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.5), this.mat(0x2a1a10)); door.position.set(0, 0.25, 0.56);
        house.add(body, roof, door); house.traverse(x => { if (x.isMesh) x.castShadow = true; }); const away = H.y < m.centerY ? -1 : 1; house.position.set(H.x, 0, H.y + away * 0.4); house.rotation.y = away < 0 ? 0 : Math.PI; add(house);
        return flat(new THREE.RingGeometry(1.45, 1.7, 40), this.modeMat(col, { basic: true, op: 0.7 }), H.x, H.y, 0.014); });
    }
    if (k === 'bowling') { flat(new THREE.PlaneGeometry(0.12, m.height), this.modeMat(0xd8392b, { basic: true }), m.width * BOWL.foul, m.centerY, 0.015); flat(new THREE.PlaneGeometry(BOWL.gap * 4.2, BOWL.gap * 4.6), this.modeMat(0xffffff, { basic: true, op: 0.12 }), m.width - BOWL.headX + BOWL.gap * 1.3, m.centerY, 0.012); }
    if (k === 'bomb') { const b = this.bombMesh = new THREE.Group(), s = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), this.mat(0x15181b, { rough: 0.3, metal: 0.3 })), cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 10), this.mat(0x777777, { metal: 0.6 })); cap.position.y = 0.3; const spark = this.bombSpark = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe27a })); spark.position.y = 0.42; b.add(s, cap, spark); b.traverse(x => { if (x.isMesh) x.castShadow = true; }); add(b); }
    if (k === 'night') this.nightLights();
    if (k === 'slalom') { const gh = this.ghostMesh = new THREE.Group(); gh.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.75).translate(0, 0.55, 0), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.28, depthWrite: false }))); gh.visible = false; add(gh); }
    this.scene.add(S);
  },
  nightLights() {                                                       // Infection Night: the arena lights go down; every cart gets a headlight and a glow
    this.scene.traverse(o => { if (o.isLight) { o.userData.day = o.intensity; o.intensity *= o.isHemisphereLight ? 0.08 : 0.06; } });
    this.scene.background = new THREE.Color(0x020306); if (this.scene.fog) this.scene.fog.color.setHex(0x020306);
    this.nightCart = new Map();
    for (const cart of this.carts) {
      const glow = new THREE.PointLight(0xffffff, 0.9, 5.5, 2), beam = new THREE.SpotLight(0xfff2c4, 2.2, 13, 0.5, 0.6, 1.4); beam.position.set(0.5, 0.9, 0); beam.target.position.set(4, 0, 0); glow.position.set(0, 1.4, 0);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5, 20, 1, true).translate(0, -2.5, 0).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff2c4, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide })); cone.position.set(0.5, 0.75, 0); cone.rotation.z = -0.12;
      cart.group.add(glow, beam, beam.target, cone); this.nightCart.set(cart.group, { glow, beam, cone });
    }
  },
  updateMode(dt) {
    const m = this.m, g = m.gs || {}, t = performance.now() / 1000, M = modeOf(m);
    if (!this.modeS || (m.kind === 'golf' && this.modeHole !== g.hole)) { if (this.modeS) this.scene.remove(this.modeS); if (this.nightCart) { for (const [grp, o] of this.nightCart) grp.remove(o.glow, o.beam, o.beam.target, o.cone); this.nightCart = null; } this.buildModeStatic(); }
    if (!this.modePool) { this.modePool = new Map(); this.modeG = new THREE.Group(); this.scene.add(this.modeG); }
    const seen = new Set();
    for (const o of g.objs || []) { let mesh = this.modePool.get(o.id); if (!mesh) { mesh = this.modeMake(o); this.modeG.add(mesh); this.modePool.set(o.id, mesh); } this.modePlace(mesh, o, t); seen.add(o.id); }
    for (const [id, mesh] of this.modePool) if (!seen.has(id)) { this.modeG.remove(mesh); this.modePool.delete(id); }
    const k = m.kind, me = (this.sc.LP || []).map(p => p.chair).filter(Boolean)[0];
    if (k === 'hill' && g.zone) { const Z = g.zone, col = g.busy ? 0xff4d4d : g.king >= 0 ? 0x7dff6a : 0xffd23f; for (const x of [this.hillDisc, this.hillRing]) { x.position.x = Z.x; x.position.z = Z.y; x.scale.set(Z.r, 1, Z.r); x.material.color.setHex(col); } this.hillDisc.material.opacity = 0.2 + 0.1 * Math.sin(t * 4); }
    if (k === 'sumo' && g.R) { this.sumoTop.scale.set(g.R, 1, g.R); this.sumoRim.scale.set(g.R, 1, g.R); }
    if (k === 'lava' && g.t) { this.lavaMats[1].opacity = 0.35 + 0.35 * Math.abs(Math.sin(t * 9)); this.lavaMats[2].emissiveIntensity = 0.7 + 0.25 * Math.sin(t * 3); this.lavaTiles.forEach((p, i) => { const s = g.t[i]; p.visible = s !== '0'; if (s !== '0') p.material = this.lavaMats[s]; }); }
    if (k === 'ctf' && g.flag) g.flag.forEach((f, s) => { const fl = this.flags[s]; fl.position.set(f.x, f.car >= 0 ? 0.55 : 0, f.y); fl.userData.cloth.rotation.y = Math.sin(t * 3 + s) * 0.35; });
    if (k === 'golf' && this.golfFlag) this.golfFlag.rotation.y = Math.sin(t * 2) * 0.3;
    if (k === 'slalom' && g.gates) { const c = me || m.chairs[0], q = g.gates[(c.gs.g || 0) % g.gates.length]; this.gateGlow.visible = !c.gs.done; this.gateGlow.position.set(q.x, 0.02, q.y); this.gateGlow.material.opacity = 0.5 + 0.4 * Math.sin(t * 6);
      const gh = MODES.slalom.ghost(m); this.ghostMesh.visible = !!gh && m.state === 'play'; if (gh) { this.ghostMesh.position.set(gh.x, 0, gh.y); this.ghostMesh.rotation.y = -gh.heading; } }
    if (k === 'delivery' && this.houseRings) { const p = me && MODES.delivery.carried(m, me); this.houseRings.forEach((r, i) => { const on = p && p.to === i; r.material.opacity = on ? 0.6 + 0.4 * Math.sin(t * 8) : 0.45; r.scale.setScalar(on ? 1 + 0.08 * Math.sin(t * 8) : 1); }); }
    if (k === 'bomb' && this.bombMesh) { const h = m.chairs[g.holder]; this.bombMesh.visible = !!h && !h.out; if (h) { const left = Math.max(0, g.fuse || 0), rate = left < 3 ? 14 : left < 7 ? 7 : 3; this.bombMesh.position.set(h.x, 1.45 + Math.abs(Math.sin(t * rate)) * 0.08, h.y); this.bombSpark.material.color.setHex(Math.sin(t * rate * 2) > 0 ? 0xffe27a : 0xff3b1c); this.bombSpark.scale.setScalar(0.8 + Math.random() * 0.6); } }
    for (const cart of this.carts) {                                     // per cart: stunt height, imposter flash, night lights
      const ch = cart.ch, G = ch.gs || {}; if (ch.benched || ch.out) continue;
      if (k === 'stunt') { cart.group.position.y = G.z || 0; if (G.air > 0) cart.group.rotation.z = Math.sin(t * 10) * 0.05; else cart.group.rotation.z = 0; }
      if (k === 'night' && this.nightCart) { const L = this.nightCart.get(cart.group); if (L) { const it = ch.side === 1; L.glow.color.setHex(it ? 0xff2a2a : 0x9fe8ff); L.glow.intensity = it ? 1.6 : 0.7; } }
    }
    if (k === 'imposter') { this.flashRings = this.flashRings || new Map(); for (const cart of this.carts) { let r = this.flashRings.get(cart.group); if (!r) { r = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.78, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.9, depthWrite: false })); r.position.y = 0.03; cart.group.add(r); this.flashRings.set(cart.group, r); } const G = cart.ch.gs || {}; r.visible = G.flash > 0 && Math.floor(t * 6) % 2 === 0; } }
  }
});
{ const up = View3D.prototype.updateMini; View3D.prototype.updateMini = function (dt) { up.call(this, dt); if (modeOf(this.m)) this.updateMode(dt); }; }

/* ---------------- the game screen: tags, item line, the 2D view, the result title ---------------- */
{ const P = GameScene.prototype, tag = P.miniTag, item = P.itemLine, d2 = P.drawMini2D;
  P.miniTag = function (c, vp) { const m = this.match, M = modeOf(m); return M && M.tag ? M.tag(c, m, vp) : tag.call(this, c, vp); };
  P.itemLine = function (p) { const m = this.match, M = modeOf(m), c = p && p.chair; if (M && M.itemLine && c && !c.out) { const own = M.itemLine(c, m), base = item.call(this, p); return [own, base].filter(Boolean).join('     '); } return item.call(this, p); };
  P.drawMini2D = function (g) { d2.call(this, g); if (modeOf(this.match)) this.drawMode2D(g); };
}
Object.assign(GameScene.prototype, {
  drawMode2D(g, floor) {                                                // floor: the layer under the carts (called before them); otherwise things on top
    const m = this.match, s = m.gs || {}, t = this.time.now / 1000, k = m.kind, me = (this.setup.players || []).map(p => p.chair).filter(Boolean)[0];
    if (floor) {
    if (k === 'sumo' && s.R) { g.fillStyle(0x163a5c, 0.85).fillRect(0, 0, m.width, m.height); g.fillStyle(0xe8d3a1, 1).fillCircle(m.width / 2, m.centerY, s.R).lineStyle(0.14, 0xd8392b, 1).strokeCircle(m.width / 2, m.centerY, s.R); }
    if (k === 'lava' && s.t) { const w = m.width / s.cols, h = m.height / s.rows; for (let i = 0; i < s.t.length; i++) { const st = s.t[i]; if (st === '0') continue; const x = (i % s.cols) * w, y = Math.floor(i / s.cols) * h; g.fillStyle(st === '2' ? 0xff3b1c : 0xff9f1c, st === '2' ? 0.95 : 0.35 + 0.35 * Math.abs(Math.sin(t * 9))).fillRect(x + 0.03, y + 0.03, w - 0.06, h - 0.06); } }
    if (k === 'hill' && s.zone) { const Z = s.zone, col = s.busy ? 0xff4d4d : s.king >= 0 ? 0x7dff6a : 0xffd23f; g.fillStyle(col, 0.25).fillCircle(Z.x, Z.y, Z.r).lineStyle(0.12, col, 1).strokeCircle(Z.x, Z.y, Z.r); }
    if ((k === 'multiball' || k === 'giant') && s.gw) [0, 1].forEach(sd => { const gx = sd ? m.width - s.gl : s.gl, col = TEAMS[m.teams[sd]].color; g.fillStyle(0xffffff, 0.15).fillRect(sd ? gx : 0, m.centerY - s.gw, s.gl, 2 * s.gw).lineStyle(0.12, col, 1).lineBetween(gx, m.centerY - s.gw, gx, m.centerY + s.gw).fillStyle(col, 1).fillCircle(gx, m.centerY - s.gw, 0.12).fillCircle(gx, m.centerY + s.gw, 0.12); });
    if (k === 'ctf' && s.base) { s.base.forEach((B, sd) => g.lineStyle(0.14, TEAMS[m.teams[sd]].color, 1).strokeCircle(B.x, B.y, 1.45)); s.flag.forEach((f, sd) => { const col = TEAMS[m.teams[sd]].color; g.lineStyle(0.06, 0xdddddd, 1).lineBetween(f.x, f.y, f.x, f.y - 0.9).fillStyle(col, 1).fillTriangle(f.x, f.y - 0.9, f.x + 0.6, f.y - 0.72, f.x, f.y - 0.52); }); }
    if (k === 'golf') { for (const b of s.blocks || []) g.fillStyle(0x8b5a2b, 1).fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); if (s.cup) g.fillStyle(0x4fa35a, 0.5).fillCircle(s.cup.x, s.cup.y, 2.2).fillStyle(0x05080b, 1).fillCircle(s.cup.x, s.cup.y, 0.24).lineStyle(0.05, 0xffffff, 1).strokeCircle(s.cup.x, s.cup.y, 0.27); }
    if (k === 'slalom' && s.gates) { s.gates.forEach(q => { const px = -Math.sin(q.a) * 1.25, py = Math.cos(q.a) * 1.25; g.fillStyle(0xff7a1c, 1).fillCircle(q.x + px, q.y + py, 0.2).fillCircle(q.x - px, q.y - py, 0.2); }); const c = me || m.chairs[0], q = s.gates[(c.gs.g || 0) % s.gates.length]; if (!c.gs.done) g.lineStyle(0.14, 0x3dff8a, 0.6 + 0.4 * Math.sin(t * 6)).strokeCircle(q.x, q.y, 1.2);
      const gh = MODES.slalom.ghost(m); if (gh && m.state === 'play') g.lineStyle(0.08, 0x9fe8ff, 0.8).strokeCircle(gh.x, gh.y, 0.45).lineBetween(gh.x, gh.y, gh.x + Math.cos(gh.heading) * 0.6, gh.y + Math.sin(gh.heading) * 0.6); }
    if (k === 'delivery' && s.houses) { const p = me && MODES.delivery.carried(m, me); g.fillStyle(0x3a4652, 1).fillCircle(s.depot.x, s.depot.y, 1.4).lineStyle(0.12, 0xffd23f, 1).strokeCircle(s.depot.x, s.depot.y, 1.45); s.houses.forEach((H, i) => { const col = HOUSE_COLS[H.c]; g.fillStyle(col, 1).fillRect(H.x - 0.65, H.y + (H.y < m.centerY ? -1.05 : 0.45), 1.3, 0.6).lineStyle(p && p.to === i ? 0.2 : 0.1, col, p && p.to === i ? 0.6 + 0.4 * Math.sin(t * 8) : 0.7).strokeCircle(H.x, H.y, 1.55); }); }
    if (k === 'bowling') g.lineStyle(0.1, 0xd8392b, 1).lineBetween(m.width * BOWL.foul, 0, m.width * BOWL.foul, m.height);
    for (const o of MG.all(m, 'ramp')) { const ca = Math.cos(o.a), sa = Math.sin(o.a), P = (u, v) => ({ x: o.x + u * ca - v * sa, y: o.y + u * sa + v * ca }), a = P(-o.len / 2, -o.w / 2), b = P(o.len / 2, -o.w / 2), c = P(o.len / 2, o.w / 2), d = P(-o.len / 2, o.w / 2); g.fillStyle(0xf2c200, 1).fillPoints([a, b, c, d], true).lineStyle(0.1, 0x111111, 1).lineBetween(b.x, b.y, c.x, c.y); }
    return;
    }
    for (const o of s.objs || []) {
      if (o.wait > 0) continue;
      if (o.t === 'ball') g.fillStyle(0xff7a1c, 1).fillCircle(o.x, o.y, o.r);
      else if (o.t === 'bigball') g.fillStyle(0x3dd6ff, 1).fillCircle(o.x, o.y, o.r).lineStyle(0.12, 0xffffff, 0.9).strokeCircle(o.x, o.y, o.r * 0.6).lineStyle(0.08, 0xff4d4d, 1).strokeCircle(o.x, o.y, o.r);
      else if (o.t === 'bball') g.fillStyle(0x1b2a8b, 1).fillCircle(o.x, o.y, o.r);
      else if (o.t === 'gball') g.fillStyle(MINI.palette[o.k % MINI.palette.length], 1).fillCircle(o.x, o.y, o.r).lineStyle(0.03, 0x0d151b, 0.8).strokeCircle(o.x, o.y, o.r);
      else if (o.t === 'pin') g.fillStyle(o.down ? 0x9fb2bf : 0xf4f4f2, 1).fillCircle(o.x, o.y, o.r).fillStyle(0xd8392b, 1).fillCircle(o.x, o.y, o.r * 0.4);
      else if (o.t === 'orb') g.fillStyle(0x7ff6ff, 0.3).fillCircle(o.x, o.y, 0.4).fillStyle(0x7ff6ff, 1).fillCircle(o.x, o.y, 0.2);
      else if (o.t === 'star') g.fillStyle(0xffd23f, 1).fillTriangle(o.x, o.y - 0.32, o.x - 0.28, o.y + 0.2, o.x + 0.28, o.y + 0.2).fillTriangle(o.x, o.y + 0.32, o.x - 0.28, o.y - 0.2, o.x + 0.28, o.y - 0.2);
      else if (o.t === 'beam') g.lineStyle(0.1, 0x7ff6ff, 0.9).lineBetween(o.x, o.y, o.x2, o.y2);
      else if (o.t === 'boom') { const k2 = 1 - o.life / 0.7; g.fillStyle(o.lava ? 0xff3b1c : 0xffa31c, 0.7 * (1 - k2)).fillCircle(o.x, o.y, 0.4 + k2 * 3); }
      else if (o.t === 'pkg') g.fillStyle(HOUSE_COLS[o.to % HOUSE_COLS.length], 1).fillRect(o.x - 0.22, o.y - 0.22, 0.44, 0.44).lineStyle(0.05, 0x6b4a2b, 1).strokeRect(o.x - 0.22, o.y - 0.22, 0.44, 0.44);
    }
    for (const c of m.chairs) {
      if (c.benched || c.out) continue; const G = c.gs || {};
      if (k === 'bomb' && c.k === s.holder) { const rate = (s.fuse || 9) < 3 ? 14 : 6; g.fillStyle(0x15181b, 1).fillCircle(c.x, c.y, 0.3).fillStyle(Math.sin(t * rate) > 0 ? 0xffe27a : 0xff3b1c, 1).fillCircle(c.x + 0.2, c.y - 0.2, 0.1); }
      if (k === 'stunt' && G.air > 0) g.lineStyle(0.08, 0xffffff, 0.8).strokeCircle(c.x, c.y, 0.55 + (G.z || 0) * 0.25);
      if (k === 'imposter' && G.flash > 0 && Math.floor(t * 6) % 2 === 0) g.lineStyle(0.12, 0xff3b3b, 0.95).strokeCircle(c.x, c.y, 0.7);
      if (k === 'night' && c.side === 1) g.lineStyle(0.12, 0xff3b3b, 0.95).strokeCircle(c.x, c.y, 0.66);
    }
    if (k === 'night') {                                                  // the dark: a dim court, with headlight cones and glows lit up
      g.fillStyle(0x020306, 0.72).fillRect(-2, -2, m.width + 4, m.height + 4);
      for (const c of m.chairs) { if (c.benched || c.out) continue; const a = c.heading, p = c.toWorld(0.4, 0), L = 6, w = 0.5; g.fillStyle(0xfff2c4, 0.16).fillTriangle(p.x, p.y, p.x + Math.cos(a - w) * L, p.y + Math.sin(a - w) * L, p.x + Math.cos(a + w) * L, p.y + Math.sin(a + w) * L).fillStyle(c.side ? 0xff2a2a : 0x9fe8ff, 0.25).fillCircle(c.x, c.y, 1.1); }
    }
  }
});
{ const P = GameScene.prototype, res = P.showMiniResult; P.showMiniResult = function () { const k = this.match.kind; if (MODES[k] && !MINI.names[k]) MINI.names[k] = GAME_INFO[k].name; return res.call(this); }; }
