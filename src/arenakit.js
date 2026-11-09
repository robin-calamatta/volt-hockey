/* v14: every rink minigame gets its own layout: kickers (jumps) where flying makes sense, and towers / bumpers that change how you
   drive it. (Mini Golf, Cart Bowling, King of the Hill, Capture the Flag and Paintball already have their own courses and maps.)
   The pieces are ordinary game objects, so online guests see them too: 'ramp' (the Stunt Arena's ramp), 'akp' a tower, 'akb' a bumper. */
const ARENA_KIT = {
  /* (x, y as fractions of the rink; a = the direction a kicker faces) */
  bomb:      { p: [[0.3, 0.25], [0.7, 0.25], [0.3, 0.75], [0.7, 0.75]], b: [[0.5, 0.5]], k: [[0.5, 0.18, 0], [0.5, 0.82, Math.PI]] },
  sumo:      { b: [[0.36, 0.5], [0.64, 0.5]] },
  lava:      { k: [[0.25, 0.5, 0], [0.75, 0.5, Math.PI], [0.5, 0.22, Math.PI / 2], [0.5, 0.78, -Math.PI / 2]] },
  multiball: { k: [[0.3, 0.5, Math.PI], [0.7, 0.5, 0]], p: [[0.5, 0.12], [0.5, 0.88]] },
  giant:     { k: [[0.32, 0.3, Math.PI], [0.68, 0.7, 0]], p: [[0.5, 0.15], [0.5, 0.85]] },
  imposter:  { p: [[0.2, 0.3], [0.4, 0.7], [0.6, 0.3], [0.8, 0.7], [0.5, 0.5]], k: [[0.15, 0.8, 0], [0.85, 0.2, Math.PI]] },
  night:     { p: [[0.25, 0.5], [0.5, 0.25], [0.5, 0.75], [0.75, 0.5], [0.12, 0.15], [0.88, 0.85]], k: [[0.35, 0.85, 0], [0.65, 0.15, Math.PI]] },
  stunt:     { k: [[0.2, 0.85, 0.4], [0.8, 0.15, Math.PI + 0.4], [0.5, 0.88, Math.PI]], p: [[0.35, 0.5], [0.65, 0.5]] },
  slalom:    { k: [[0.08, 0.12, 0], [0.92, 0.88, Math.PI]] },
  delivery:  { k: [[0.5, 0.35, 0], [0.5, 0.65, Math.PI]], b: [[0.5, 0.5]] }
};
const AK = { kLen: 2.4, kW: 1.8, rise: typeof STUNT !== 'undefined' ? STUNT.rise : 0.55, towerR: 0.55, bumperR: 0.6 };
/* put the pieces in when a game starts */
for (const [k, L] of Object.entries(ARENA_KIT)) {
  const M = MODES[k]; if (!M || !M.init) continue; const init = M.init;
  M.init = function (m, ...a) {
    const r = init.call(this, m, ...a), W = m.width, H = m.height, y0 = m.centerY - H / 2, X = f => MG.r2(W * f), Y = f => MG.r2(y0 + H * f);
    for (const [fx, fy] of L.p || []) MG.add(m, { t: 'akp', x: X(fx), y: Y(fy), r: AK.towerR });
    for (const [fx, fy] of L.b || []) MG.add(m, { t: 'akb', x: X(fx), y: Y(fy), r: AK.bumperR });
    for (const [fx, fy, a] of L.k || []) MG.add(m, { t: 'ramp', x: X(fx), y: Y(fy), a: MG.r2(a), len: AK.kLen, w: AK.kW, kick: 1 });
    return r;
  };
}
/* driving: bounce off towers, get thrown by bumpers, fly off kickers */
{ const P = MiniMatch.prototype, co = P.chairObstacles;
  P.chairObstacles = function (c) {
    const r = co.call(this, c); if (this.map || !this.gs || !this.gs.objs || c.benched) return r;
    if (this.rjStep) this.rjStep(c);
    const R = CONFIG.chair.radius;
    for (const o of this.gs.objs) {
      if (o.t === 'akp' || o.t === 'akb') {
        if (c.rz > 0.6) continue; const dx = c.x - o.x, dy = c.y - o.y, d = Math.hypot(dx, dy), mn = R + o.r; if (d >= mn || d <= 0) continue;
        const nx = dx / d, ny = dy / d, vn = c.vx * nx + c.vy * ny; c.x = o.x + nx * mn; c.y = o.y + ny * mn;
        if (o.t === 'akb') { const out = Math.max(5, -vn * 1.4); c.vx += (out - vn) * nx; c.vy += (out - vn) * ny; if (!(c.akbCD > this.simTime)) { c.akbCD = this.simTime + 0.3; o.hit = MG.r2(this.simTime); this.sfx('bump', c.player ? c.player.id || 0 : 0); } }
        else if (vn < 0) { c.vx -= 1.5 * vn * nx; c.vy -= 1.5 * vn * ny; }
      } else if (o.t === 'ramp' && o.kick && this.kind !== 'stunt' && !(c.rz > 0.05) && !(c.rvz > 0)) {
        const dx = c.x - o.x, dy = c.y - o.y, ca = Math.cos(o.a), sa = Math.sin(o.a), u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
        if (Math.abs(u) > o.len / 2 || Math.abs(v) > o.w / 2) continue; const sp = c.vx * ca + c.vy * sa;
        c.rz = AK.rise * (u + o.len / 2) / o.len; if (u > o.len / 2 - 0.3 && sp > 2) { c.rvz = Math.min(6.5, 1 + sp * 0.7); c.rz = AK.rise; if (c.player) this.sfx('drift', c.player.id || 0); }
      }
    }
    return r;
  };
}
/* drawing: the towers and bumpers, and carts in the air */
{ const P = View3D.prototype, mk = P.modeMake, pl = P.modePlace, upd = P.update;
  P.modeMake = function (o) {
    if (o.t !== 'akp' && o.t !== 'akb') return mk.call(this, o);
    const G = new THREE.Group();
    if (o.t === 'akp') { const base = new THREE.Mesh(new THREE.CylinderGeometry(o.r, o.r * 1.12, 1.5, 24), SK.paint(0x2f6fed)), band = new THREE.Mesh(new THREE.CylinderGeometry(o.r * 1.01, o.r * 1.01, 0.18, 24), SK.paint(0xf4f4f2)), cap = new THREE.Mesh(new THREE.SphereGeometry(o.r * 1.02, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), SK.glow(0xffd23f, 0.6));
      base.position.y = 0.75; band.position.y = 1.1; cap.position.y = 1.5; G.add(base, band, cap); }
    else { const body = new THREE.Mesh(new THREE.CylinderGeometry(o.r, o.r * 1.1, 0.55, 28), SK.paint(0xff3fd2)), ring = new THREE.Mesh(new THREE.TorusGeometry(o.r * 1.02, 0.07, 10, 28).rotateX(Math.PI / 2), SK.chrome()), top = new THREE.Mesh(new THREE.CylinderGeometry(o.r * 0.7, o.r * 0.7, 0.08, 24), SK.M(0xffffff, { e: 0xffffff, ei: 0.3 }));
      body.position.y = 0.28; ring.position.y = 0.4; top.position.y = 0.58; G.add(body, ring, top); G.userData.top = top; }
    G.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } }); return G;
  };
  P.modePlace = function (mesh, o, t) {
    if (o.t === 'akp' || o.t === 'akb') { mesh.position.set(o.x, 0, o.y); if (o.t === 'akb' && mesh.userData.top) { const hot = o.hit !== undefined && this.m.simTime - o.hit < 0.25; mesh.userData.top.material = hot ? SK.glow(0xffe27a, 1.5) : SK.M(0xffffff, { e: 0xffffff, ei: 0.3 }); mesh.scale.setScalar(hot ? 1.08 : 1); } return; }
    return pl.call(this, mesh, o, t);
  };
  P.update = function (dt) {
    const r = upd.call(this, dt), m = this.m; if (!m || !m.mini || m.map || m.kind === 'stunt' || m.kind === 'br') return r;
    for (const c of this.carts || []) { const z = c.ch.rz || 0; if (z > 0.001) { c.group.position.y += z; c.group.rotation.z = Math.max(-0.3, Math.min(0.3, (c.ch.rvz || 0) * 0.05)); c.akTilt = true; } else if (c.akTilt) { c.akTilt = false; c.group.rotation.z = 0; } }
    return r;
  };
}
/* online: the guests get the heights from the snapshot */
{ const P = MiniMatch.prototype, snap = P.miniSnap, apply = P.miniApply;
  P.miniSnap = function () { const s = snap.call(this); if (!this.map && ARENA_KIT[this.kind]) s.akz = this.chairs.map(c => Math.round((c.rz || 0) * 100) / 100); return s; };
  P.miniApply = function (s) { apply.call(this, s); if (s && s.akz) s.akz.forEach((z, k) => { if (this.chairs[k]) this.chairs[k].rz = z; }); };
}
