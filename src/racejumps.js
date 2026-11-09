/* v14: race jumps, open edges and the rescue drone.
   - 'jump' obstacles: a kicker ramp across the track. Hit it and you fly (the faster, the higher and further).
   - Open edges (map.open: [[from, to, side], ...] as fractions of a lap; side -1 / 1 / 0 both): no wall, just a drop into the
     lava / sea / canyon. Go over and you fall in; a rescue drone flies down, grabs your cart and drops you back on the track
     where you fell (a little behind, in the middle). It costs you a couple of seconds, nothing more.
   - Three new tracks built round them (Lava Skyway, Stunt Park, Coastal Cliffs), and jumps on some of the old ones. */
RACE_THEMES.lava = { ground: 0x2a1a14, track: 0x3a3536, wallA: 0xff6a1c, wallB: 0x1b1d20, sky: 0x4a2418, decor: 'rock', line: 0xffb347, pit: 0xff4a12, pitGlow: true };
RACE_THEMES.coast = { ground: 0x6f9a4a, track: 0x45484c, wallA: 0x2f6fed, wallB: 0xf4f4f2, sky: 0x9fd4ff, decor: 'tree', line: 0xf4f4f2, pit: 0x1d6fa8 };
RACE_THEMES.grass.pit = 0x2a7fb8; RACE_THEMES.track.pit = 0x2a7fb8; RACE_THEMES.sand.pit = 0x5a3a22; RACE_THEMES.neon.pit = 0x000000; RACE_THEMES.ice.pit = 0x0d3b66;
OBSTACLE_R.jump = 0;
RACE_MAPS.push(
  { id: 'skyway', name: 'Lava Skyway', blurb: 'A road over a lava field, 160 x 110 m: no walls on the long bends, five big jumps. Fall in and the drone fishes you out.', w: 160, h: 110, hw: 4.2, theme: 'lava', laps: 2,
    pts: [[20, 95], [80, 100], [140, 92], [150, 70], [128, 56], [100, 62], [80, 50], [96, 30], [130, 22], [140, 12], [100, 8], [50, 12], [22, 22], [36, 46], [18, 66]],
    open: [[0.06, 0.2, 0], [0.33, 0.45, 0], [0.62, 0.72, 0], [0.85, 0.95, 0]],
    obstacles: [{ at: 0.03, type: 'pad' }, { at: 0.1, type: 'jump' }, { at: 0.24, type: 'jump' }, { at: 0.3, off: 1.6, type: 'rock' }, { at: 0.4, type: 'jump' }, { at: 0.5, type: 'pad' }, { at: 0.56, type: 'sweeper', speed: 1.2 }, { at: 0.68, type: 'jump' }, { at: 0.78, off: -1.5, type: 'rock' }, { at: 0.9, type: 'jump' }] },
  { id: 'stunt', name: 'Stunt Park', blurb: 'A stunt course, 130 x 90 m: a jump on every straight, a table-top, a split-level crossing and a water jump.', w: 130, h: 90, hw: 4.4, theme: 'grass', laps: 3,
    gen: t => { const a = (t + 0.05) * Math.PI * 2; return [65 + 54 * Math.sin(a), 45 + 36 * Math.sin(a) * Math.cos(a) + 6 * Math.cos(a)]; },
    open: [[0.22, 0.3, 1], [0.72, 0.8, -1]],
    obstacles: [{ at: 0.06, type: 'jump' }, { at: 0.14, type: 'pad' }, { at: 0.2, type: 'jump' }, { at: 0.35, off: 2, type: 'tyres' }, { at: 0.42, type: 'jump' }, { at: 0.56, type: 'jump' }, { at: 0.64, type: 'pad' }, { at: 0.7, type: 'jump' }, { at: 0.86, off: -2, type: 'tyres' }, { at: 0.93, type: 'jump' }] },
  { id: 'cliffs', name: 'Coastal Cliffs', blurb: 'A cliff-top road, 180 x 120 m: the sea side has no wall at all. Two jumps over the inlets.', w: 180, h: 120, hw: 4.0, theme: 'coast', laps: 2,
    pts: [[20, 100], [70, 108], [120, 104], [160, 96], [168, 70], [150, 50], [160, 26], [130, 12], [90, 20], [60, 14], [26, 22], [14, 50], [30, 70]],
    open: [[0.0, 0.32, 1], [0.6, 0.86, 1]],
    obstacles: [{ at: 0.08, type: 'jump' }, { at: 0.18, type: 'pad' }, { at: 0.28, off: -1.5, type: 'rock' }, { at: 0.4, type: 'sweeper', speed: 1 }, { at: 0.5, type: 'jump' }, { at: 0.62, off: -1.6, type: 'rock' }, { at: 0.7, type: 'jump' }, { at: 0.8, type: 'pad' }] }
);
for (const [id, list] of [['eight', [0.22, 0.72]], ['gp', [0.06, 0.47, 0.88]], ['canyon', [0.36]], ['frozen', [0.28, 0.78]]]) { const M = RACE_MAPS.find(x => x.id === id); if (M && Array.isArray(M.obstacles)) for (const at of list) M.obstacles.push({ at, type: 'jump' }); }
{ const M = RACE_MAPS.find(x => x.id === 'marathon'); if (M) M.jumps = [0.1, 0.3, 0.5, 0.7, 0.9]; }

const RJ = { len: 3.2, h: 0.7, grav: 15, fallT: 2.8 };
/* the map: jumps kept apart from the solid obstacles, and the open edges */
{ const build0 = buildRaceMap;
  buildRaceMap = function (m, map) {
    build0(m, map); const L = m.rline, N = L.length;
    if (map.jumps) map.jumps.forEach(at => { const p = L[Math.round(at * N) % N]; m.obs.push({ k: m.obs.length, type: 'jump', i: L.indexOf(p), x: p.x, y: p.y, off: 0, r: 0, nx: p.nx, ny: p.ny, a: p.a }); });
    m.jumps = m.obs.filter(o => o.type === 'jump'); m.obs = m.obs.filter(o => o.type !== 'jump');
    m.open = [new Uint8Array(N), new Uint8Array(N)];                       // [side -1, side 1]: 1 where that edge is open
    for (const [f0, f1, sd] of map.open || []) for (let i = Math.floor(f0 * N); i < Math.ceil(f1 * N); i++) for (const s of sd ? [sd] : [-1, 1]) m.open[s < 0 ? 0 : 1][(i % N + N) % N] = 1;
    [0, 1].forEach(s => m.walls[s].forEach((w, i) => { if (m.open[s][i]) w.on = false; }));
  };
}
Object.assign(MiniMatch.prototype, {
  rjDrop(c, i) { const L = this.rline, N = L.length, j = ((i - 8) % N + N) % N; return L[j]; },
  rjStep(c) {
    const dt = Math.max(0, Math.min(0.05, this.simTime - (c.rjT === undefined ? this.simTime : c.rjT))); c.rjT = this.simTime;
    if (c.fall) {                                                         // fallen in: sink, the drone comes, carries you back, lets go
      const F = c.fall; F.t += dt; const p = this.rjDrop(c, F.i), k = Math.max(0, Math.min(1, (F.t - 1.3) / 1.0));
      c.x = F.x + (p.x - F.x) * k; c.y = F.y + (p.y - F.y) * k; c.vx = c.vy = 0; c.px = c.x; c.py = c.y;
      c.rz = F.t < 0.7 ? -0.8 * (F.t / 0.7) ** 2 : F.t < 1.3 ? -0.8 : F.t < 2.3 ? -0.8 + 3.8 * Math.min(1, (F.t - 1.3) / 0.5) : 3 - 3 * Math.min(1, (F.t - 2.3) / 0.35);
      if (F.t >= 1.3) { c.heading += normalizeAngle(p.a - c.heading) * Math.min(1, dt * 4); c.ph = c.heading; }
      if (F.t >= RJ.fallT) { c.fall = null; c.rz = 0; c.rvz = 0; c.heading = c.ph = p.a; c.lastI = this.nearestI(c.x, c.y); if (c.player) this.sfx('bump', c.player.id || 0); }
      return true;
    }
    if (c.rz > 0 || c.rvz > 0) { c.rvz -= RJ.grav * dt; c.rz += c.rvz * dt; if (c.rz <= 0) { c.rz = 0; const v = -c.rvz; c.rvz = 0; if (v > 4 && c.player) this.sfx('bump', c.player.id || 0); } }
    return false;
  },
  rjJumps(c, i) {
    if (c.rz > 0.05 || c.rvz > 0 || !this.jumps) return; const N = this.rline.length;
    for (const o of this.jumps) {
      let d = i - o.i; if (d > N / 2) d -= N; if (d < -N / 2) d += N; const along = d * 0.5; if (along < -RJ.len / 2 || along > RJ.len / 2) continue;
      const lat = (c.x - o.x) * o.nx + (c.y - o.y) * o.ny; if (Math.abs(lat) > this.hw) continue;
      const fwd = c.vx * Math.cos(o.a) + c.vy * Math.sin(o.a), u = (along + RJ.len / 2) / RJ.len;
      if (fwd > 0.5) { c.rz = RJ.h * u; if (u > 0.85) { c.rvz = Math.min(7.5, 1.2 + fwd * 0.8); c.rz = RJ.h; if (c.player) { this.sfx('drift', c.player.id || 0); c.air = (c.air || 0) + 1; } } }
      else c.rz = RJ.h * u;
      return;
    }
  }
});
{ const P = MiniMatch.prototype, mo = P.mapObstacles;
  P.mapObstacles = function (c) {
    if (!this.map || !this.open) return mo.call(this, c);
    if (this.rjStep(c)) return;
    const L = this.rline, N = L.length, R = CONFIG.chair.radius, i = this.nearestI(c.x, c.y, c.lastI === undefined ? undefined : c.lastI), p = L[i], lat = (c.x - p.x) * p.nx + (c.y - p.y) * p.ny, sd = lat < 0 ? 0 : 1;
    const openHere = this.open[sd][i] || this.open[sd][(i + 1) % N] || this.open[sd][(i - 1 + N) % N];
    if (openHere && Math.abs(lat) > this.hw - R - 0.1) {                 // an open edge: nothing to stop you
      if (c.rz > 0.05) { /* in the air: fly on */ }
      else if (Math.abs(lat) > this.hw + 0.35) { c.fall = { t: 0, x: c.x, y: c.y, i }; c.rz = 0; c.rvz = 0; if (c.player) { this.sfx('whistle', c.player.id || 0); this.notice = `${this.name(c).toUpperCase()} FELL OFF!`; this.noticeLeft = 1.2; } return; }
      const hw = this.hw; this.hw = 1e4; try { mo.call(this, c); } finally { this.hw = hw; }
    } else if (c.rz > 0.3 && Math.abs(lat) > this.hw + 0.35) { /* jumped over an open edge: will fall when landing */ }
    else mo.call(this, c);
    this.rjJumps(c, i);
  };
  /* online: the guests need the heights and the falls too */
  const snap = P.miniSnap, apply = P.miniApply, r = v => Math.round(v * 100) / 100;
  P.miniSnap = function () { const s = snap.call(this); if (this.map && this.open) s.rj = this.chairs.map(c => [r(c.rz || 0), c.fall ? r(c.fall.t) : -1, c.fall ? r(c.fall.x) : 0, c.fall ? r(c.fall.y) : 0, c.fall ? c.fall.i : 0]); return s; };
  P.miniApply = function (s) { apply.call(this, s); if (s && s.rj) s.rj.forEach(([z, t, x, y, i], k) => { const c = this.chairs[k]; if (!c) return; c.rz = z; c.fall = t >= 0 ? { t, x, y, i } : null; }); };
}

/* ---- 3D: the kickers, the pits along open edges, the cart in the air, the rescue drone ---- */
{ const P = View3D.prototype, bv = P.buildVenue, uv = P.updateVenue, upd = P.update;
  P.buildVenue = function () {
    bv.call(this); const m = this.m, map = m.map, T = RACE_THEMES[map.theme] || RACE_THEMES.grass, L = m.rline, N = L.length, hw = m.hw, g = this.arena; if (!m.open) return;
    /* the pit beyond each open edge: a long dark (or glowing) band dropping away, with a striped kerb */
    const pitMat = T.pitGlow ? new THREE.MeshBasicMaterial({ color: T.pit, side: THREE.DoubleSide }) : new THREE.MeshStandardMaterial({ color: T.pit || 0x2a7fb8, roughness: 0.25, metalness: 0.1, side: THREE.DoubleSide });
    const kerbTex = (() => { const cv = G3.canvas(64, 16), c = cv.getContext('2d'); for (let x = 0; x < 4; x++) { c.fillStyle = x % 2 ? '#d8392b' : '#f4f4f2'; c.fillRect(x * 16, 0, 16, 16); } const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t; })();
    [0, 1].forEach(s => { const sd = s ? 1 : -1, pos = [], idx = [], kp = [], kuv = [], kidx = [];
      L.forEach(p => { pos.push(p.x + p.nx * sd * (hw + 0.25), 0.0, p.y + p.ny * sd * (hw + 0.25), p.x + p.nx * sd * (hw + 9), -0.02, p.y + p.ny * sd * (hw + 9)); });
      L.forEach((p, i) => { kp.push(p.x + p.nx * sd * (hw - 0.1), 0.02, p.y + p.ny * sd * (hw - 0.1), p.x + p.nx * sd * (hw + 0.3), 0.02, p.y + p.ny * sd * (hw + 0.3)); kuv.push(i * 0.25, 0, i * 0.25, 1); });
      for (let i = 0; i < N; i++) { const j = (i + 1) % N; if (!m.open[s][i] || !m.open[s][j]) continue; idx.push(i * 2, j * 2, i * 2 + 1, j * 2, j * 2 + 1, i * 2 + 1); kidx.push(i * 2, j * 2, i * 2 + 1, j * 2, j * 2 + 1, i * 2 + 1); }
      if (!idx.length) return;
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); const pit = new THREE.Mesh(geo, pitMat); pit.position.y = 0.03; g.add(pit);
      const kg = new THREE.BufferGeometry(); kg.setAttribute('position', new THREE.Float32BufferAttribute(kp, 3)); kg.setAttribute('uv', new THREE.Float32BufferAttribute(kuv, 2)); kg.setIndex(kidx); kg.computeVertexNormals(); g.add(new THREE.Mesh(kg, new THREE.MeshStandardMaterial({ map: kerbTex, roughness: 0.6, side: THREE.DoubleSide })));
    });
    /* the kickers */
    const wood = this.mat(T.glow ? 0x3ff6ff : 0xf2c200, { rough: 0.5, emissive: T.glow ? 0.5 : 0 }), dark = this.mat(0x22262b, { rough: 0.7 });
    const stripes = (() => { const cv = G3.canvas(128, 32), c = cv.getContext('2d'); c.fillStyle = '#f2c200'; c.fillRect(0, 0, 128, 32); c.fillStyle = '#111'; for (let k = -2; k < 10; k++) { c.beginPath(); c.moveTo(k * 16, 32); c.lineTo(k * 16 + 8, 32); c.lineTo(k * 16 + 24, 0); c.lineTo(k * 16 + 16, 0); c.fill(); } const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t; })();
    for (const o of m.jumps || []) {
      const sh = new THREE.Shape(); sh.moveTo(-RJ.len / 2, 0); sh.lineTo(RJ.len / 2, 0); sh.lineTo(RJ.len / 2, RJ.h); sh.quadraticCurveTo(-0.2, RJ.h * 0.35, -RJ.len / 2, 0);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: hw * 2 + 0.2, bevelEnabled: false }).translate(0, 0, -hw - 0.1); const ramp = new THREE.Group(), body = new THREE.Mesh(geo, [wood, dark]); body.castShadow = body.receiveShadow = true; ramp.add(body);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, hw * 2 + 0.2), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.5 })); lip.position.set(RJ.len / 2 - 0.06, RJ.h - 0.04, 0); ramp.add(lip);
      ramp.position.set(o.x, 0, o.y); ramp.rotation.y = -o.a; g.add(ramp);
    }
  };
  P.update = function (dt) {
    const r = upd.call(this, dt), m = this.m; if (!m || !m.map || !m.open) { if (this.drones) { this.drones.forEach(d => this.scene.remove(d)); this.drones = null; } return r; }
    this.drones = this.drones || new Map(); const now = performance.now() / 1000;
    for (const c of this.carts || []) {
      const ch = c.ch, z = ch.rz || 0; c.group.position.y += z;
      if (ch.fall || z > 0.05) { c.group.rotation.z = ch.fall ? -0.4 * Math.min(1, ch.fall.t / 0.6) * (ch.fall.t < 1.3 ? 1 : Math.max(0, 1 - (ch.fall.t - 1.3) * 2)) : Math.max(-0.35, Math.min(0.3, (ch.rvz || 0) * 0.05)); c.rjTilt = true; }
      else if (c.rjTilt) { c.rjTilt = false; c.group.rotation.z = 0; }
      let D = this.drones.get(c); const F = ch.fall;
      if (F) {
        if (!D) { D = this.makeDrone(); this.scene.add(D); this.drones.set(c, D); }
        const top = 9, k = F.t < 0.7 ? 0 : F.t < 1.3 ? (F.t - 0.7) / 0.6 : 1, carryY = c.group.position.y + 1.55, y = F.t < 1.3 ? top + (carryY - top) * k * k * (3 - 2 * k) : F.t < 2.3 ? carryY : carryY + (F.t - 2.3) * 14;
        D.visible = true; D.position.set(ch.x, y, ch.y); D.rotation.y = -ch.heading; D.userData.props.forEach((p, i) => { p.rotation.y = now * 40 + i; }); D.userData.claw.forEach((cl, i) => { cl.rotation.x = (i ? 1 : -1) * (F.t > 1.25 && F.t < 2.35 ? 0.15 : 0.6); }); D.userData.light.material.color.setHex(Math.floor(now * 6) % 2 ? 0xff3b3b : 0xffd23f);
      } else if (D) D.visible = false;
    }
    return r;
  };
  P.makeDrone = function () {
    const D = new THREE.Group(), body = SK.paint(0xf2c200), dark = SK.M(0x1b1d20, { r: 0.5 }), props = [], claw = [];
    const core = new THREE.Mesh(SK.rbox(0.9, 0.28, 0.6, 0.1), body); D.add(core);
    const stripe = new THREE.Mesh(SK.rbox(0.92, 0.06, 0.62, 0.02), dark); stripe.position.y = 0.02; D.add(stripe);
    for (const [x, z] of [[0.55, 0.45], [0.55, -0.45], [-0.55, 0.45], [-0.55, -0.45]]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, Math.hypot(x, z) * 1.1, 8).rotateZ(Math.PI / 2), dark); arm.rotation.y = -Math.atan2(z, x); arm.position.set(x / 2, 0.08, z / 2); D.add(arm);
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 12), dark); motor.position.set(x, 0.12, z); D.add(motor);
      const prop = new THREE.Group(); prop.add(new THREE.Mesh(SK.rbox(0.62, 0.01, 0.06, 0.004), dark)); prop.add(new THREE.Mesh(new THREE.CircleGeometry(0.32, 24).rotateX(-Math.PI / 2), SK.M(0xffffff, { op: 0.12, ds: 1 }))); prop.position.set(x, 0.19, z); D.add(prop); props.push(prop); }
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3b3b })); light.position.set(0, 0.18, 0); D.add(light);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 6), SK.chrome()); cable.position.y = -0.6; D.add(cable);
    for (const sd of [-1, 1]) { const g = new THREE.Group(), a = new THREE.Mesh(SK.rbox(0.05, 0.36, 0.5, 0.02), SK.chrome()); a.position.set(0, -0.18, 0); g.add(a); g.position.set(0, -1.05, sd * 0.32); D.add(g); claw.push(g); }
    D.traverse(o => { if (o.isMesh) o.castShadow = true; }); D.userData = { props, claw, light }; return D;
  };
}

/* while the drone has you, your camera pulls back so you can watch the rescue */
{ const P = GameScene.prototype, vp = P.viewports3d;
  if (vp) P.viewports3d = function (LP) { const list = vp.call(this, LP); if (Array.isArray(list)) for (const v of list) if (v.chair && v.chair.fall && v.mode === 'first') v.mode = 'third'; return list; };
}
