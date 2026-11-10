/* The driver, properly (v13): hairstyles, arms that move (driving, holding a gun or an item, healing, reviving, being downed, actions
   like a wave or a cheer), what they hold, and the new hats, faces, outfits and decals. Also the 3D models of every Volt Royale pickup
   (Items3D), used both in your hands and floating over the ground with a glow.
   Cart-local coordinates: x forward, y up, z to the driver's right. */

/* ---------- hair ---------- */
const HAIR_LINE = { front: 0.32, side: 0.0, back: -0.5 };
function hairShell(k, line = HAIR_LINE, bumps = 0, seed = 1) {         // a shell over the head that stops at a hairline (higher at the front, low at the back)
  const g = new THREE.SphereGeometry(1, 30, 22), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), h = Math.hypot(x, z) || 1e-6, f = x / h, el = Math.asin(Math.max(-1, Math.min(1, y)));
    const hl = f >= 0 ? line.side + (line.front - line.side) * f : line.side + (line.back - line.side) * -f;
    let s = el >= hl && !(line.top !== undefined && el > line.top) ? k : 0.82;   // (line.top: under a hat the hair stops at the hat's band) if (bumps && el >= hl) s += bumps * (0.5 + 0.5 * Math.sin(x * 23 + seed) * Math.sin(y * 19 + seed * 2) * Math.sin(z * 21 + seed * 3));
    p.setXYZ(i, x * 0.095 * s, y * 0.11 * s, z * 0.09 * s);
  }
  g.computeVertexNormals(); return g;
}
function hairGeometry(style, hat) {                                     // the hair for a style, round the head's centre (a hat squashes it)
  const parts = [], mk = (g, x = 0, y = 0, z = 0) => parts.push(g.translate(x, y, z)), under = hat && !['none', 'headband', 'halo', 'bandana', 'visor', 'party', 'crown'].includes(hat);
  if (style === 'bald') return null;
  if (under) mk(hairShell(style === 'afro' || style === 'curly' ? 1.1 : 1.05, { ...HAIR_LINE, top: ['tophat', 'cowboy', 'chef'].includes(hat) ? 0.58 : 0.2 }, style === 'curly' || style === 'afro' ? 0.05 : 0, 3));   // a hat on: only the hair below its band shows
  else if (style === 'buzz') mk(hairShell(1.035));
  else if (style === 'curly') mk(hairShell(1.16, { front: 0.38, side: 0.02, back: -0.45 }, 0.09, 3));
  else if (style === 'afro') mk(hairShell(1.42, { front: 0.42, side: 0.08, back: -0.35 }, 0.07, 5));
  else if (style === 'mohawk') { mk(hairShell(1.02)); for (let i = 0; i < 8; i++) { const a = 0.5 + i / 7 * (Math.PI - 1.1); mk(new THREE.ConeGeometry(0.022, 0.08 + 0.02 * Math.sin(i), 4).rotateZ(a - Math.PI / 2), Math.cos(a) * 0.1, Math.sin(a) * 0.115 + 0.01, 0); } }
  else if (style === 'spiky') { mk(hairShell(1.06)); for (let i = 0; i < 10; i++) { const a = 0.5 + (i % 5) / 4 * (Math.PI - 1.0), s = i < 5 ? -1 : 1; mk(new THREE.ConeGeometry(0.02, 0.07, 5).rotateZ(a - Math.PI / 2).rotateX(s * 0.45), Math.cos(a) * 0.098, Math.sin(a) * 0.11, s * 0.04); } }
  else mk(hairShell(1.09));                                              // short (and the base of long, ponytail, bun, quiff)
  if (style === 'long') mk(new THREE.CapsuleGeometry(0.07, 0.16, 4, 10).scale(0.55, 1, 1.3), -0.075, -0.12, 0);
  if (style === 'ponytail') { mk(new THREE.TorusGeometry(0.022, 0.008, 6, 12).rotateY(Math.PI / 2), -0.1, 0.03, 0); mk(new THREE.CapsuleGeometry(0.026, 0.13, 4, 8).rotateZ(-0.6), -0.15, -0.04, 0); }
  if (style === 'bun' && !under) mk(new THREE.SphereGeometry(0.045, 12, 10), -0.05, 0.115, 0);
  if (style === 'quiff' && !under) mk(new THREE.SphereGeometry(0.06, 12, 10).scale(1.3, 0.8, 1.2), 0.045, 0.1, 0.0);
  return G3.merge(parts.map(g => (g.index ? g.toNonIndexed() : g)));
}

/* ---------- Volt Royale pickups as 3D models (also what you hold) ---------- */
const RARITY = { common: 0xb8c4cc, uncommon: 0x4cd964, rare: 0x3d9bff, epic: 0xb35cff, legendary: 0xffb31a };
const Items3D = {
  cache: {},
  rarity(k) { return { pistol: 'common', smg: 'uncommon', shotgun: 'uncommon', rifle: 'rare', sniper: 'epic', rocket: 'legendary', band: 'common', plate: 'common', medkit: 'uncommon', armour: 'rare', fullkit: 'epic', boost: 'uncommon', wall: 'rare', card: 'legendary' }[k] || 'common'; },
  build(parts) {                                                         // [[geometry, colour], ...] -> one mesh's geometry with vertex colours
    const pos = [], nor = [], col = [], c = new THREE.Color();
    for (const [g0, hex] of parts) { const g = g0.index ? g0.toNonIndexed() : g0; g.computeVertexNormals(); c.setHex(hex); const p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
  },
  geo(k) {
    if (this.cache[k]) return this.cache[k];
    const B = (w, h, d, x = 0, y = 0, z = 0, rz = 0) => new THREE.BoxGeometry(w, h, d).rotateZ(rz).translate(x, y, z), C = (r, l, x = 0, y = 0, z = 0, seg = 12) => new THREE.CylinderGeometry(r, r, l, seg).rotateZ(Math.PI / 2).translate(x, y, z), V = (r, h, x = 0, y = 0, z = 0, seg = 12) => new THREE.CylinderGeometry(r, r, h, seg).translate(x, y, z);
    /* a cartridge standing up at (x, z) from height y0: brass case, a narrower neck, then the bullet (a cone), with an optional coloured tip */
    const RND = (x, z, y0, cr, ch, nr, nh, bh, bcol, tip) => { const brassC = 0xc9a24a, parts = [[V(cr, ch, x, y0 + ch / 2, z, 12), brassC], [V(cr * 1.06, 0.004, x, y0 + 0.002, z, 12), 0xa8822f]]; let top = y0 + ch, br = cr * 0.92;
      if (nr) { parts.push([V(nr, nh, x, top + nh / 2, z, 12), brassC]); top += nh; br = nr * 0.95; }
      parts.push([bh <= 0.012 ? new THREE.SphereGeometry(br, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, bh / br, 1).translate(x, top, z) : new THREE.ConeGeometry(br, bh, 12).translate(x, top + bh / 2, z), bcol]);   /* (short pistol rounds: a round nose) */ if (tip) parts.push([new THREE.ConeGeometry(br * 0.42, bh * 0.4, 10).translate(x, top + bh * 0.8 + 0.001, z), tip]); return parts; };
    const dark = 0x2b2f34, black = 0x15171a, metal = 0x6b737b, wood = 0x7a5232, brass = 0xc9a24a, acc = (BR_GUNS[k] || {}).col || 0xffffff;
    const P = {
      pistol: [[B(0.17, 0.045, 0.032, 0.04, 0.025), dark], [B(0.05, 0.095, 0.03, -0.012, -0.035, 0, 0.28), black], [C(0.008, 0.04, 0.14, 0.03), metal], [B(0.1, 0.008, 0.034, 0.05, 0.048), acc]],
      smg: [[B(0.26, 0.06, 0.04, 0.06, 0.02), dark], [B(0.04, 0.09, 0.035, 0, -0.04, 0, 0.2), black], [B(0.03, 0.12, 0.028, 0.1, -0.065), black], [B(0.11, 0.03, 0.025, -0.12, 0.02), black], [C(0.011, 0.07, 0.22, 0.025), metal], [B(0.14, 0.01, 0.042, 0.06, 0.054), acc]],
      shotgun: [[C(0.017, 0.5, 0.26, 0.035), metal], [C(0.026, 0.13, 0.27, 0.002), wood], [B(0.15, 0.065, 0.045, 0.0, 0.025), dark], [B(0.04, 0.09, 0.035, -0.05, -0.035, 0, 0.3), black], [B(0.2, 0.06, 0.04, -0.17, 0.0, 0, 0.12), wood], [B(0.1, 0.01, 0.047, 0.0, 0.06), acc]],
      rifle: [[B(0.3, 0.07, 0.045, 0.05, 0.02), dark], [C(0.012, 0.3, 0.35, 0.03), metal], [B(0.15, 0.055, 0.05, 0.26, 0.02), 0x3d434a], [B(0.04, 0.13, 0.03, 0.08, -0.07, 0, -0.2), black], [B(0.04, 0.09, 0.035, -0.02, -0.04, 0, 0.25), black], [B(0.18, 0.07, 0.04, -0.18, 0.01), black], [C(0.019, 0.13, 0.06, 0.078), black], [B(0.12, 0.01, 0.047, 0.06, 0.058), acc]],
      sniper: [[B(0.3, 0.065, 0.045, 0.05, 0.02), dark], [C(0.012, 0.5, 0.45, 0.03), metal], [C(0.026, 0.24, 0.06, 0.088), black], [V(0.006, 0.04, 0.0, 0.065), black], [V(0.006, 0.04, 0.12, 0.065), black], [B(0.04, 0.09, 0.035, -0.04, -0.04, 0, 0.25), black], [B(0.26, 0.08, 0.04, -0.22, 0.0), 0x4a3a2a], [B(0.1, 0.012, 0.047, 0.05, 0.058), acc]],
      rocket: [[C(0.055, 0.78, 0.12, 0.05, 0, 16), 0x5d6b3a], [new THREE.ConeGeometry(0.05, 0.1, 12).rotateZ(-Math.PI / 2).translate(0.56, 0.05, 0), 0xc0392b], [B(0.04, 0.1, 0.035, 0.0, -0.03, 0, 0.2), black], [B(0.05, 0.05, 0.02, 0.05, 0.12), black], [C(0.058, 0.04, -0.25, 0.05, 0, 16), black], [C(0.057, 0.04, 0.3, 0.05, 0, 16), acc]],
      band: [[V(0.045, 0.07, 0, 0, 0, 16), 0xf4f1ea], [V(0.018, 0.072, 0, 0, 0, 10), 0xd9d2c3], [B(0.09, 0.004, 0.06, 0.055, -0.03), 0xe8e1d1]],
      medkit: [[B(0.18, 0.11, 0.09), 0xc0392b], [B(0.11, 0.012, 0.03, 0, 0.056), 0xffffff], [B(0.03, 0.012, 0.11, 0, 0.056), 0xffffff], [B(0.06, 0.02, 0.02, 0, 0.065), black]],
      plate: [[B(0.03, 0.2, 0.16), 0x4a7fd8], [B(0.034, 0.02, 0.16, 0, 0.09), 0xbfd7ff], [B(0.034, 0.02, 0.16, 0, -0.09), 0xbfd7ff], [B(0.036, 0.07, 0.05, 0, 0.02), 0xbfd7ff]],
      armour: [[B(0.2, 0.15, 0.11), 0x1e3f8a], [B(0.08, 0.1, 0.012, 0, 0, 0.06), 0x6fb6ff], [B(0.1, 0.02, 0.03, 0, 0.085), black], [B(0.204, 0.02, 0.114, 0, -0.055), 0x6fb6ff]],
      fullkit: [[B(0.26, 0.16, 0.12), 0xf4f4f2], [B(0.262, 0.03, 0.122, 0, 0.0), 0x2ecc71], [B(0.07, 0.016, 0.022, -0.05, 0.082), 0xe74c3c], [B(0.022, 0.016, 0.07, -0.05, 0.082), 0xe74c3c], [B(0.05, 0.016, 0.06, 0.06, 0.082), 0x3d8bff], [B(0.12, 0.02, 0.03, 0, 0.095), black]],
      boost: [[V(0.045, 0.16, 0, 0, 0, 14), 0xffd23f], [V(0.047, 0.02, 0, 0.03, 0, 14), black], [V(0.047, 0.02, 0, -0.03, 0, 14), black], [V(0.02, 0.04, 0, 0.1, 0, 10), metal]],
      wall: [[B(0.07, 0.24, 0.2), 0x7d8790], [B(0.074, 0.24, 0.02, 0, 0, 0.09), 0x3dd6ff], [B(0.074, 0.24, 0.02, 0, 0, -0.09), 0x3dd6ff], [B(0.074, 0.03, 0.12), black]],
      /* v14.1.8: ammo looks like what it is. Light: a box of short pistol rounds. Shells: red shotgun shells with brass heads.
         Medium: pointed rifle rounds in a stripper clip. Heavy: three big long sniper rounds on an ammo can. */
      am_light: [[B(0.15, 0.035, 0.11, 0, -0.012), 0xc9b48a], [B(0.15, 0.006, 0.11, 0, 0.007), 0x8a6f45], [B(0.15, 0.05, 0.004, 0, 0.0, -0.057, 0), 0xc9b48a], [B(0.06, 0.02, 0.003, 0, -0.005, 0.0565), 0xe8d9b0],
        ...[-0.05, -0.025, 0, 0.025, 0.05].flatMap(x => [-0.03, 0, 0.03].flatMap(z => RND(x, z, 0.008, 0.0065, 0.024, 0, 0, 0.011, 0xb87333)))],
      am_shells: [...[-0.045, -0.015, 0.015, 0.045].flatMap(x => [[V(0.0145, 0.07, x, 0.035, 0, 14), 0xc62828], [V(0.0152, 0.018, x, 0.009, 0, 14), brass], [V(0.0154, 0.003, x, 0.0015, 0, 14), 0x9c7a2e], [V(0.009, 0.0015, x, 0.0705, 0, 10), 0x7f1d1d]]),
        [C(0.0145, 0.07, 0.0, 0.0145, 0.045, 14), 0xc62828], [C(0.0152, 0.018, -0.044, 0.0145, 0.045, 14), brass]],
      am_medium: [[B(0.15, 0.006, 0.02, 0, 0.004), 0x8d939a], [B(0.15, 0.012, 0.004, 0, 0.012, 0.009), 0x8d939a], [B(0.15, 0.012, 0.004, 0, 0.012, -0.009), 0x8d939a],
        ...[-0.056, -0.028, 0, 0.028, 0.056].flatMap(x => RND(x, 0, 0.007, 0.0085, 0.05, 0.0055, 0.01, 0.022, 0xb87333)), [B(0.07, 0.04, 0.05, -0.02, 0.02, -0.06), 0x4d6b35], [B(0.072, 0.008, 0.052, -0.02, 0.044, -0.06), 0x3a5228]],
      am_heavy: [[B(0.2, 0.05, 0.09, 0, -0.025), 0x4b5a32], [B(0.202, 0.008, 0.092, 0, 0.002), 0x3a4626], [B(0.06, 0.01, 0.012, 0, 0.012), 0x2b2f34], [B(0.03, 0.03, 0.094, 0.07, -0.025), 0x3a4626],
        ...[-0.05, 0, 0.05].flatMap(x => RND(x, 0, 0.006, 0.0135, 0.1, 0.009, 0.016, 0.05, 0xb87333, 0x15171a))],
      am_rockets: [[C(0.035, 0.3, 0, 0, 0, 12), 0x5d6b3a], [new THREE.ConeGeometry(0.035, 0.07, 12).rotateZ(-Math.PI / 2).translate(0.185, 0, 0), 0xc0392b], [B(0.04, 0.09, 0.006, -0.13, 0), black], [B(0.04, 0.006, 0.09, -0.13, 0), black]],
      card: [[B(0.012, 0.16, 0.11), 0xf2c200], [B(0.014, 0.13, 0.085), 0xfff3c4], [B(0.016, 0.04, 0.04, 0, 0.02), 0xe0a400]]
    }[k] || [[B(0.15, 0.15, 0.15), 0x888888]];
    return (this.cache[k] = this.build(P));
  },
  mat() { return this.cache._mat || (this.cache._mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.25 })); },
  mesh(k) { const me = new THREE.Mesh(this.geo(k), this.mat()); me.castShadow = true; return me; },
  glowTex() { if (this.cache._glow) return this.cache._glow; const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); return (this.cache._glow = new THREE.CanvasTexture(cv)); },
  /* a pickup on the ground: the item floating and turning over a glow in its rarity's colour, with a faint beam of light */
  pickup(k) {
    const grp = new THREE.Group(), col = RARITY[this.rarity(k)], s = BR_GUNS[k] ? 1.9 : k.startsWith('am_') ? 2.2 : 2.6;
    const item = this.mesh(k); item.scale.setScalar(s); item.position.y = 0.55; grp.add(item); grp.userData.item = item;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.glowTex(), color: col, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); glow.position.y = 0.03; grp.add(glow);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 2.2, 8, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); beam.position.y = 1.1; grp.add(beam);
    return grp;
  }
};

/* ---------- arms that move ---------- */
const Rig = {
  K() { const sx = CONFIG.view3d.cart.seatX, tx = sx - 0.07; return { sx, tx, px: sx + 0.28, hx: tx + 0.02, hy: 1.15 }; },
  geo: null,
  attach(group, layer) {
    if (group.userData.rig) return group.userData.rig;
    if (!this.geo) this.geo = { up: new THREE.CylinderGeometry(0.054, 0.046, 1, 10).translate(0, 0.5, 0), fo: new THREE.CylinderGeometry(0.043, 0.035, 1, 10).translate(0, 0.5, 0), ha: new THREE.SphereGeometry(0.043, 10, 8), th: new THREE.CapsuleGeometry(0.014, 0.03, 3, 6) };
    const tmp = new THREE.MeshStandardMaterial(), R = { sides: [], item: null, itemKey: '', layer };
    for (const sd of [1, -1]) {
      const up = new THREE.Mesh(this.geo.up, tmp), fo = new THREE.Mesh(this.geo.fo, tmp), ha = new THREE.Mesh(this.geo.ha, tmp), th = new THREE.Mesh(this.geo.th, tmp);
      up.castShadow = fo.castShadow = ha.castShadow = true; if (layer !== undefined) up.layers.set(layer);      // (your own upper arms hide in first person; forearms and hands show)
      group.add(up, fo, ha, th); R.sides.push({ sd, up, fo, ha, th, hand: new THREE.Vector3() });
    }
    group.userData.rig = R; return R;
  },
  solve(S, T, a, b, pole) {                                              // two-bone reach: where the elbow goes
    const d = new THREE.Vector3().subVectors(T, S), len = Math.min(a + b - 0.002, Math.max(0.05, d.length())); d.normalize();
    const along = (a * a - b * b + len * len) / (2 * len), h = Math.sqrt(Math.max(0, a * a - along * along)), pv = new THREE.Vector3().subVectors(pole, S); pv.sub(d.clone().multiplyScalar(pv.dot(d))).normalize();
    return { elbow: S.clone().addScaledVector(d, along).addScaledVector(pv, h), hand: S.clone().addScaledVector(d, len) };
  },
  bone(mesh, A, B) { const d = new THREE.Vector3().subVectors(B, A), l = d.length(); mesh.position.copy(A); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); mesh.scale.set(1, l, 1); },
  pose(name, t, extra = {}) {                                             // -> { R: [x,y,z], L: [x,y,z], pr, pl (elbow poles), thumb }
    const { tx, px, hx, hy } = this.K(), s = Math.sin, c = Math.cos, drive = { R: [px + 0.1, 0.71, 0.25], L: [px + 0.05, 0.67, -0.25] };
    switch (name) {
      case 'gun': return { R: [tx + 0.44, 0.74 + (extra.pitch || 0) * 0.2, 0.17], L: [tx + 0.38, 0.72 + (extra.pitch || 0) * 0.15, 0.03] };   // held low, so it doesn't block your view
      case 'item': return { R: [tx + 0.36, 0.72, 0.18], L: drive.L };
      case 'heal': return { R: [tx + 0.31 + 0.035 * s(t * 9), 0.82 + 0.04 * c(t * 9), 0.07], L: [tx + 0.31 - 0.035 * s(t * 9), 0.8 - 0.04 * c(t * 9), -0.07] };
      case 'revive': return { R: [tx + 0.48, 0.66 + 0.04 * s(t * 10), 0.1], L: [tx + 0.48, 0.66 + 0.04 * s(t * 10 + 1), -0.1] };
      case 'downed': return { R: [tx + 0.18, 0.56, 0.27], L: [tx + 0.18, 0.56, -0.27] };
      case 'a_thumbs': return { R: [tx + 0.3, 1.02, 0.26], L: drive.L, thumb: 1 };
      case 'a_wave': return { R: [tx + 0.08 + 0.05 * s(t * 9), 1.38, 0.3 + 0.06 * s(t * 9)], L: drive.L, pr: [tx, 1.0, 0.9] };
      case 'a_cheer': return { R: [tx + 0.02, 1.42 + 0.05 * s(t * 12), 0.24], L: [tx + 0.02, 1.42 + 0.05 * s(t * 12 + 2), -0.24], pr: [tx, 1.0, 0.9], pl: [tx, 1.0, -0.9] };
      case 'a_clap': { const w = 0.03 + 0.07 * Math.abs(s(t * 8)); return { R: [tx + 0.32, 0.95, w], L: [tx + 0.32, 0.95, -w] }; }
      case 'a_pump': return { R: [tx + 0.12, 1.12 + 0.18 * Math.abs(s(t * 6)), 0.24], L: drive.L, pr: [tx, 0.9, 0.9] };
      case 'a_salute': return { R: [hx + 0.07, hy + 0.04, 0.06], L: drive.L, pr: [tx + 0.1, 1.2, 0.9] };
      case 'a_point': return { R: [tx + 0.56, 1.0, 0.18], L: drive.L };
      case 'a_flex': return { R: [tx + 0.03, 1.18, 0.25], L: [tx + 0.03, 1.18, -0.25], pr: [tx + 0.05, 1.3, 0.9], pl: [tx + 0.05, 1.3, -0.9] };
      case 'a_shrug': return { R: [tx + 0.24, 0.86, 0.36], L: [tx + 0.24, 0.86, -0.36], pr: [tx - 0.2, 0.6, 0.6], pl: [tx - 0.2, 0.6, -0.6] };
      case 'a_facepalm': return { R: [hx + 0.1, hy, 0.02], L: drive.L, pr: [tx + 0.3, 0.7, 0.6] };
      case 'a_dance': { const k = s(t * 5); return { R: [tx + 0.2, 1.05 + 0.3 * k, 0.28], L: [tx + 0.2, 1.05 - 0.3 * k, -0.28], pr: [tx, 1.0, 0.9], pl: [tx, 1.0, -0.9] }; }
      case 'a_drum': return { R: [px + 0.05, 0.68 + 0.06 * Math.abs(s(t * 16)), 0.25], L: [px + 0.05, 0.68 + 0.06 * Math.abs(c(t * 16)), -0.25] };
      case 'a_heart': return { R: [tx + 0.34, 1.05, 0.04], L: [tx + 0.34, 1.05, -0.04] };
      case 'a_robot': { const k = Math.floor(t * 3) % 4; return { R: [tx + 0.3, [0.8, 1.1, 0.95, 1.2][k], 0.3], L: [tx + 0.3, [1.1, 0.8, 1.2, 0.95][k], -0.3] }; }
      case 'a_conductor': return { R: [tx + 0.32 + 0.08 * c(t * 6), 1.0 + 0.12 * s(t * 6), 0.2], L: [tx + 0.28 - 0.06 * c(t * 6), 0.95 + 0.1 * s(t * 6 + 1), -0.2] };
      case 'a_muscle': { const k = 0.05 * s(t * 7); return { R: [tx + 0.05, 1.2 + k, 0.27], L: [tx + 0.05, 1.2 - k, -0.27], pr: [tx + 0.05, 1.3, 0.9], pl: [tx + 0.05, 1.3, -0.9] }; }
      default: return drive;
    }
  },
  /* each frame: put the arms where the pose wants them, and the held item in the right hand */
  update(group, name, t, extra = {}) {
    const R = this.attach(group, extra.layer), { tx } = this.K(), P = this.pose(name, t, extra), parts = group.userData.partMeshes || (group.userData.partMeshes = {});
    if (!parts.selfSkin) for (const ch of group.children) if (ch.userData && ch.userData.part) parts[ch.userData.part] = ch;
    const skin = parts.selfSkin ? parts.selfSkin.material : null, shirt = parts.selfTeam ? (parts.selfTeam.material.userData.plain || parts.selfTeam.material) : skin, long = extra.sleeves ? shirt : skin, vis = !extra.hide;
    for (const S of R.sides) {
      const sd = S.sd, sh = new THREE.Vector3(tx, 0.96, sd * 0.18), T = new THREE.Vector3(...(sd > 0 ? P.R : P.L)), pole = new THREE.Vector3(...(sd > 0 ? P.pr || [tx - 0.15, 0.45, 0.62] : P.pl || [tx - 0.15, 0.45, -0.62]));
      const { elbow, hand } = this.solve(sh, T, 0.27, 0.3, pole); this.bone(S.up, sh, elbow); this.bone(S.fo, elbow, hand); S.ha.position.copy(hand); S.hand.copy(hand);
      S.up.material = (group.userData.bare ? skin : shirt) || S.up.material; S.fo.material = long || S.fo.material; S.ha.material = skin || S.ha.material; S.th.material = S.ha.material;
      S.th.visible = sd > 0 && !!P.thumb && vis; if (S.th.visible) { S.th.position.set(hand.x, hand.y + 0.045, hand.z); S.th.rotation.set(0, 0, 0); }
      S.up.visible = S.fo.visible = S.ha.visible = vis;
    }
    const want = vis ? extra.item || '' : '';                             // what is in the right hand
    if (want !== R.itemKey) { if (R.item) group.remove(R.item); R.item = want ? Items3D.mesh(want) : null; R.itemKey = want; if (R.item) group.add(R.item); }
    if (R.item) { const h = R.sides[0].hand, gun = BR_GUNS[want]; R.item.position.set(h.x + (gun ? 0.02 : 0.03), h.y + (gun ? 0.02 : 0.05), h.z - (gun ? 0.03 : 0)); R.item.rotation.set(0, gun ? 0 : 0.6, gun ? extra.pitch || 0 : 0); R.item.scale.setScalar(name === 'heal' ? 0.8 : 0.85); }
  }
};

/* ---------- more cosmetics: hats, faces, decals, outfits (the season pass has many more now) ---------- */
{ const face0 = Avatar.faceTex.bind(Avatar), decal0 = Avatar.decalTex.bind(Avatar), dress0 = Avatar.dress.bind(Avatar);
  Avatar.faceTex = function (id) {
    if (!['tongue', 'sleepy', 'angry', 'robot', 'hearts', 'stache', 'freckles', 'nerd'].includes(id)) return face0(id);
    const key = 'face' + id; if (this.cache[key]) return this.cache[key];
    const W = 256, H = 128, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), ink = '#1d1611', L = 100, R = 156, Y = 52; c.lineCap = 'round'; c.lineWidth = 6; c.strokeStyle = ink; c.fillStyle = ink;
    const eye = (x, y, r = 9) => { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y, r + 4, r + 6, 0, 0, 7); c.fill(); c.fillStyle = ink; c.beginPath(); c.arc(x, y + 1, r * 0.75, 0, 7); c.fill(); };
    const smile = () => { c.beginPath(); c.arc(128, 78, 22, Math.PI * 0.2, Math.PI * 0.8); c.stroke(); };
    if (id === 'tongue') { eye(L, Y); eye(R, Y); smile(); c.fillStyle = '#e8607a'; c.beginPath(); c.ellipse(134, 102, 10, 12, 0, 0, Math.PI); c.fill(); }
    else if (id === 'sleepy') { for (const x of [L, R]) { c.beginPath(); c.arc(x, Y, 11, 0.15, Math.PI - 0.15); c.stroke(); } c.beginPath(); c.ellipse(128, 96, 7, 5, 0, 0, 7); c.stroke(); c.font = 'bold 26px sans-serif'; c.fillText('z', 190, 30); }
    else if (id === 'angry') { eye(L, Y + 3, 7); eye(R, Y + 3, 7); c.beginPath(); c.moveTo(L - 16, Y - 22); c.lineTo(L + 14, Y - 8); c.moveTo(R + 16, Y - 22); c.lineTo(R - 14, Y - 8); c.stroke(); c.beginPath(); c.arc(128, 104, 18, Math.PI * 1.2, Math.PI * 1.8); c.stroke(); }
    else if (id === 'robot') { c.fillStyle = '#22262b'; c.fillRect(L - 30, Y - 16, R - L + 60, 32); c.fillStyle = '#3dd6ff'; c.fillRect(L - 16, Y - 6, 30, 12); c.fillRect(R - 14, Y - 6, 30, 12); c.fillStyle = '#22262b'; c.fillRect(104, 88, 48, 14); c.fillStyle = '#3dd6ff'; for (let i = 0; i < 4; i++) c.fillRect(108 + i * 11, 92, 6, 6); }
    else if (id === 'hearts') { for (const x of [L, R]) { c.fillStyle = '#e8364f'; c.beginPath(); c.moveTo(x, Y + 14); c.bezierCurveTo(x - 24, Y - 4, x - 10, Y - 22, x, Y - 8); c.bezierCurveTo(x + 10, Y - 22, x + 24, Y - 4, x, Y + 14); c.fill(); } smile(); }
    else if (id === 'stache') { eye(L, Y); eye(R, Y); c.fillStyle = '#3b2a1e'; c.beginPath(); c.ellipse(114, 84, 16, 7, 0.3, 0, 7); c.ellipse(142, 84, 16, 7, -0.3, 0, 7); c.fill(); c.beginPath(); c.arc(128, 96, 10, 0.3, Math.PI - 0.3); c.stroke(); }
    else if (id === 'freckles') { eye(L, Y); eye(R, Y); smile(); c.fillStyle = '#b06a3a'; for (const [x, y] of [[84, 74], [92, 80], [80, 84], [172, 74], [164, 80], [176, 84]]) { c.beginPath(); c.arc(x, y, 2.5, 0, 7); c.fill(); } }
    else if (id === 'nerd') { eye(L, Y, 7); eye(R, Y, 7); c.lineWidth = 5; c.beginPath(); c.arc(L, Y, 20, 0, 7); c.moveTo(R + 20, Y); c.arc(R, Y, 20, 0, 7); c.moveTo(L + 20, Y); c.lineTo(R - 20, Y); c.stroke(); c.lineWidth = 6; smile(); }
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return (this.cache[key] = t);
  };
  Avatar.decalTex = function (id) {
    if (!['hearts', 'waves', 'tiger', 'camo', 'circuit', 'notes', 'pixel'].includes(id)) return decal0(id);
    const key = 'decal' + id; if (this.cache[key]) return this.cache[key];
    const W = 512, H = 96, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), r = Look.rnd(id.length * 7);
    if (id === 'hearts') { c.fillStyle = '#ff5fa2'; for (let i = 0; i < 7; i++) { const x = 40 + i * 70, y = 48 + (i % 2 ? -10 : 10), s = 14; c.beginPath(); c.moveTo(x, y + s); c.bezierCurveTo(x - 2 * s, y - 0.3 * s, x - s, y - 1.6 * s, x, y - 0.5 * s); c.bezierCurveTo(x + s, y - 1.6 * s, x + 2 * s, y - 0.3 * s, x, y + s); c.fill(); } }
    else if (id === 'waves') { c.strokeStyle = '#29b6f6'; c.lineWidth = 9; for (const y of [30, 60]) { c.beginPath(); for (let x = 0; x <= W; x += 8) c.lineTo(x, y + 10 * Math.sin(x / 26)); c.stroke(); } }
    else if (id === 'tiger') { c.fillStyle = '#ff8a3d'; c.fillRect(0, 14, W, 68); c.fillStyle = '#1d1611'; for (let x = 10; x < W; x += 46) { c.beginPath(); c.moveTo(x, 14); c.quadraticCurveTo(x + 20, 46, x + 4, 82); c.lineTo(x + 14, 82); c.quadraticCurveTo(x + 30, 46, x + 14, 14); c.fill(); } }
    else if (id === 'camo') { for (let i = 0; i < 60; i++) { c.fillStyle = ['#4d5a3a', '#6b7a4a', '#2f3a24', '#8a8a5a'][i % 4]; c.beginPath(); c.ellipse(r() * W, 14 + r() * 68, 14 + r() * 26, 8 + r() * 12, r() * 3, 0, 7); c.fill(); } c.globalCompositeOperation = 'destination-in'; c.fillRect(0, 14, W, 68); }
    else if (id === 'circuit') { c.strokeStyle = '#3dd6ff'; c.fillStyle = '#3dd6ff'; c.lineWidth = 4; for (let i = 0; i < 9; i++) { let x = 20 + i * 54, y = 20 + (i % 3) * 25; c.beginPath(); c.moveTo(x, y); x += 26; c.lineTo(x, y); y += 20; c.lineTo(x + 14, y); c.stroke(); c.beginPath(); c.arc(x + 14, y, 5, 0, 7); c.fill(); } }
    else if (id === 'notes') { c.fillStyle = '#f4f4f2'; c.font = 'bold 54px serif'; for (let i = 0; i < 7; i++) c.fillText(i % 2 ? '♪' : '♫', 20 + i * 70, 70 - (i % 2) * 14); }
    else if (id === 'pixel') { for (let x = 0; x < W; x += 16) for (let y = 16; y < 80; y += 16) if (r() < 0.45) { c.fillStyle = ['#ff5fa2', '#3dd6ff', '#ffd23f', '#7dff6a'][Math.floor(r() * 4)]; c.fillRect(x, y, 15, 15); } }
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return (this.cache[key] = t);
  };
  Avatar.dress = function (group, look, opts = {}) {
    dress0(group, look, opts); if (!look) return; const G = group.getObjectByName('cosmetics'); if (!G) return;
    const { sx, tx, hx, hy } = Rig.K(), hatCol = look.hatCol || '#e74c3c', shirt = opts.shirt || look.shirt, hm = this.mat(hatCol, 0.75), sm = this.mat(shirt, 0.6), self = true;
    const put = (geo, mt, isSelf = self) => { const me = new THREE.Mesh(geo, mt); me.castShadow = true; me.userData.self = isSelf; G.add(me); return me; }, at = (g, x, y, z = 0) => g.translate(hx + x, hy + y, z);
    const H = look.hat;
    if (H === 'visor') { put(at(new THREE.TorusGeometry(0.098, 0.012, 6, 24, Math.PI * 1.3).rotateX(Math.PI / 2).rotateY(Math.PI * 0.85), 0, 0.05), hm); put(at(new THREE.CylinderGeometry(0.075, 0.075, 0.008, 18, 1, false, -Math.PI / 2, Math.PI).scale(1.2, 1, 1.2), 0.07, 0.05), hm); }
    else if (H === 'cowboy') { put(at(new THREE.CylinderGeometry(0.19, 0.19, 0.012, 24).scale(1.15, 1, 1), -0.005, 0.07), hm); put(at(new THREE.CylinderGeometry(0.075, 0.09, 0.11, 18), -0.005, 0.13), hm); put(at(new THREE.CylinderGeometry(0.092, 0.092, 0.02, 18), -0.005, 0.085), this.mat('#3b2a1e', 0.6)); }
    else if (H === 'helmet') { put(at(new THREE.SphereGeometry(0.125, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.6).scale(1.05, 1.0, 1.0), -0.01, 0.0), this.mat(hatCol, 0.3, 0.2)); put(at(new THREE.BoxGeometry(0.02, 0.012, 0.2), 0.03, 0.12), this.mat('#f4f4f2', 0.4)); }
    else if (H === 'party') { put(at(new THREE.ConeGeometry(0.07, 0.2, 18), 0, 0.17), hm); put(at(new THREE.SphereGeometry(0.022, 8, 6), 0, 0.28), this.mat('#ffd23f', 0.5)); }
    else if (H === 'viking') { put(at(new THREE.SphereGeometry(0.11, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), -0.005, 0.01), this.mat('#8a8f96', 0.35, 0.7)); for (const sd of [-1, 1]) put(at(new THREE.ConeGeometry(0.025, 0.12, 10).rotateX(sd * -0.9), 0, 0.09, sd * 0.12), this.mat('#f4f1ea', 0.6)); }
    else if (H === 'halo') { const me = put(at(new THREE.TorusGeometry(0.085, 0.012, 8, 28).rotateX(Math.PI / 2), -0.01, 0.2), new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffd23f, emissiveIntensity: 1.2 })); me.castShadow = false; }
    else if (H === 'propeller') { put(at(new THREE.SphereGeometry(0.106, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.02, 0.97, 1.02), -0.005, 0.02), hm); put(at(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6), -0.005, 0.12), this.mat('#22262b', 0.5)); const prop = put(at(new THREE.BoxGeometry(0.2, 0.006, 0.03), -0.005, 0.145), this.mat('#ffd23f', 0.4)); prop.name = 'propeller'; }
    else if (H === 'chef') { put(at(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 20), -0.005, 0.07), this.mat('#f4f4f2', 0.8)); put(at(new THREE.SphereGeometry(0.11, 16, 10).scale(1, 0.75, 1), -0.005, 0.15), this.mat('#f4f4f2', 0.8)); }
    else if (H === 'bandana') { put(at(new THREE.SphereGeometry(0.104, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), -0.005, 0.02), hm); put(at(new THREE.ConeGeometry(0.03, 0.08, 6).rotateZ(Math.PI / 2 + 0.6), -0.11, 0.0), hm); }
    const O = look.outfit, dark = this.mat('#22262b', 0.6), white = this.mat('#f4f4f2', 0.6), L = G3.limb;
    if (O === 'racing') for (const sd of [-1, 1]) put(new THREE.BoxGeometry(0.02, 0.36, 0.03).translate(tx + 0.12, 0.79, sd * 0.13), white);
    if (O === 'tux') { put(new THREE.BoxGeometry(0.012, 0.28, 0.11).translate(tx + 0.128, 0.82, 0), white); put(new THREE.BoxGeometry(0.02, 0.03, 0.08).translate(tx + 0.14, 0.95, 0), this.mat('#1b1d20', 0.5)); }
    if (O === 'puffer') { for (let i = 0; i < 4; i++) put(new THREE.TorusGeometry(0.155, 0.03, 6, 20).rotateX(Math.PI / 2).scale(0.9, 1, 1.25).translate(tx, 0.67 + i * 0.08, 0), sm); }
    if (O === 'tank') { put(new THREE.BoxGeometry(0.012, 0.05, 0.2).translate(tx + 0.128, 0.93, 0), this.mat(new THREE.Color(shirt).multiplyScalar(0.8).getStyle(), 0.6)); }
    /* hairstyle: swap the cart's built-in short hair for the chosen style (shorter under a hat) */
    const hairMesh = group.children.find(ch => ch.userData && ch.userData.part === 'selfHair');
    if (hairMesh) hairMesh.visible = false;
    const hg = hairGeometry(look.hairStyle || 'short', look.hat); if (hg) put(hg.translate(hx, hy, 0), this.mat(look.hair || '#3b2a1e', 0.85));
    if (opts.layer !== undefined) G.traverse(o => { if (o.isMesh && o.userData.self) o.layers.set(opts.layer); });
    group.userData.sleeves = ['hoodie', 'tux', 'puffer', 'racing'].includes(O);
  };
}

/* a random look for a CPU driver (Volt Royale: everyone wears their own things, no team colours) */
Avatar.randomLook = function (seed) {
  const r = Look.rnd(seed * 7919 + 13), pick = a => a[Math.floor(r() * a.length)];
  return { outfit: pick(COS.outfits).id, shirt: pick(COS.colors), hat: pick(COS.hats).id, hatCol: pick(COS.colors), face: pick(COS.faces).id, hair: pick(COS.hair), hairStyle: pick(COS.hairStyles).id, skin: pick(COS.skin), decal: pick(COS.decals).id };
};
