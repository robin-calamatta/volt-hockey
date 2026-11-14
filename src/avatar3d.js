/* Your character in 3D (v12): hats, faces, outfits and cart decals added to the driver of a cart (in matches and in the lobby),
   and the lobby's stage: a lit platform your character sits on, behind the menus. */
const Avatar = {
  cache: {},
  hex: s => new THREE.Color(s || '#ffffff'),
  mat(col, rough = 0.7, metal = 0) { const k = col + '/' + rough + '/' + metal; return this.cache[k] || (this.cache[k] = new THREE.MeshStandardMaterial({ color: this.hex(col), roughness: rough, metalness: metal })); },
  faceTex(id) {                                                            // a face, drawn on a curved patch on the front of the head
    const key = 'face' + id; if (this.cache[key]) return this.cache[key];
    const W = 256, H = 128, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), ink = '#1d1611';
    c.lineCap = 'round'; c.lineJoin = 'round'; c.fillStyle = ink; c.strokeStyle = ink;
    const eye = (x, y, r = 9) => { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y, r + 4, r + 6, 0, 0, 7); c.fill(); c.fillStyle = ink; c.beginPath(); c.arc(x, y + 1, r * 0.75, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 3, y - 3, 2.5, 0, 7); c.fill(); };
    const L = 100, R = 156, Y = 52;
    if (id === 'shades') { c.fillStyle = '#111'; c.beginPath(); c.roundRect(L - 26, Y - 14, 48, 28, 8); c.roundRect(R - 22, Y - 14, 48, 28, 8); c.fill(); c.fillRect(L + 18, Y - 8, 20, 5); c.fillStyle = 'rgba(120,200,255,0.5)'; c.fillRect(L - 18, Y - 9, 14, 6); c.fillRect(R - 14, Y - 9, 14, 6); }
    else if (id === 'wink') { eye(L, Y); c.lineWidth = 6; c.beginPath(); c.arc(R, Y + 4, 11, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    else if (id === 'stars') for (const x of [L, R]) { c.fillStyle = '#f2c200'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 7 : 17; c.lineTo(x + Math.cos(a) * r, Y + Math.sin(a) * r); } c.fill(); }
    else if (id === 'focus') { eye(L, Y + 2, 7); eye(R, Y + 2, 7); c.lineWidth = 6; c.beginPath(); c.moveTo(L - 16, Y - 18); c.lineTo(L + 12, Y - 9); c.moveTo(R + 16, Y - 18); c.lineTo(R - 12, Y - 9); c.stroke(); }
    else if (id === 'wow') { eye(L, Y, 11); eye(R, Y, 11); }
    else { eye(L, Y); eye(R, Y); }
    c.lineWidth = 6; c.strokeStyle = ink; c.fillStyle = '#7a2b2b';
    if (id === 'grin' || id === 'stars') { c.beginPath(); c.moveTo(102, 86); c.quadraticCurveTo(128, 122, 154, 86); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.fillRect(108, 88, 40, 7); }
    else if (id === 'wow') { c.beginPath(); c.ellipse(128, 96, 10, 13, 0, 0, 7); c.fill(); c.stroke(); }
    else if (id === 'focus') { c.beginPath(); c.moveTo(108, 96); c.lineTo(148, 94); c.stroke(); }
    else { c.beginPath(); c.arc(128, 78, 22, Math.PI * 0.2, Math.PI * 0.8); c.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return (this.cache[key] = t);
  },
  decalTex(id) {                                                           // a cart decal, for the side of the bow (forward = right of the picture)
    const key = 'decal' + id; if (this.cache[key]) return this.cache[key];
    const W = 512, H = 96, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    if (id === 'stripes') { c.fillStyle = '#f4f4f2'; c.fillRect(0, 20, W, 16); c.fillRect(0, 50, W, 10); c.fillStyle = '#22262b'; c.fillRect(0, 38, W, 8); }
    else if (id === 'bolt') { c.fillStyle = '#ffd23f'; c.strokeStyle = '#22262b'; c.lineWidth = 5; c.beginPath(); c.moveTo(60, 48); c.lineTo(250, 20); c.lineTo(235, 44); c.lineTo(460, 30); c.lineTo(280, 76); c.lineTo(295, 54); c.closePath(); c.fill(); c.stroke(); }
    else if (id === 'flames') { const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#ffd23f'); g.addColorStop(0.5, '#ff8a3d'); g.addColorStop(1, '#e74c3c'); c.fillStyle = g; c.beginPath(); c.moveTo(W, 10); c.lineTo(W, 86);
      for (let i = 0; i < 6; i++) { const x = W - 70 - i * 70; c.quadraticCurveTo(x + 30, 80, x, 70 - (i % 2) * 14); c.quadraticCurveTo(x + 20, 50, x - 30, 48 - (i % 3) * 8); c.quadraticCurveTo(x + 10, 32, x - 10, 20 + (i % 2) * 8); } c.lineTo(W, 10); c.fill(); }
    else if (id === 'stars') { c.fillStyle = '#f4f4f2'; for (let s = 0; s < 6; s++) { const x = 50 + s * 80, y = 48 + (s % 2 ? -12 : 12), r = 22 - s * 2; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); } }
    else if (id === 'checker') { for (let x = 0; x < W; x += 24) for (let y = 12; y < 84; y += 24) { c.fillStyle = ((x + y) / 24) % 2 ? '#f4f4f2' : '#22262b'; c.fillRect(x, y, 24, 24); } }
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return (this.cache[key] = t);
  },
  /* add the look to a cart group built from View3D.cartGeometry(): recolour the driver, then add hat, face, outfit extras and decals */
  dress(group, look, opts = {}) {
    if (!group || !look) return; const old = group.getObjectByName('cosmetics'); if (old) group.remove(old);
    const K3 = CONFIG.view3d.cart, sx = K3.seatX, tx = sx - 0.07, hx = tx + 0.02, hy = 1.15, G = new THREE.Group(); G.name = 'cosmetics';
    const shirt = opts.shirt || look.shirt, hatCol = look.hatCol || '#e74c3c', put = (geo, mt, self = true) => { const me = new THREE.Mesh(geo, mt); me.castShadow = true; me.userData.self = self; G.add(me); return me; };
    for (const ch of group.children) { const part = ch.userData && ch.userData.part; if (!part) continue;
      if (part === 'selfTeam') ch.material = this.mat(shirt, 0.6); else if (part === 'selfHair') ch.material = this.mat(look.hair || '#3b2a1e', 0.9); else if (part === 'selfSkin') ch.material = this.mat(look.skin || '#e8b48a', 0.7); }
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.1006, 24, 14, Math.PI - 0.74, 1.48, Math.PI / 2 - 0.5, 1.08)   /* (v13.6.1: a bigger face) */, new THREE.MeshStandardMaterial({ map: this.faceTex(look.face || 'smile'), alphaTest: 0.3, roughness: 0.7 }));
    face.scale.set(0.955, 1.105, 0.905); face.position.set(hx, hy, 0); face.userData.self = true; G.add(face);
    const H = look.hat, hm = this.mat(hatCol, 0.75), at = (g, x, y, z = 0) => g.translate(hx + x, hy + y, z);
    if (H === 'cap') { put(at(new THREE.SphereGeometry(0.106, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.02, 0.97, 1.02), -0.005, 0.02), hm); put(at(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 18).scale(1.25, 1, 1.1).rotateZ(-0.12), 0.1, 0.04), hm); put(at(new THREE.SphereGeometry(0.012, 8, 6), -0.005, 0.105), hm); }
    else if (H === 'beanie') { put(at(new THREE.SphereGeometry(0.11, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.05, 1), -0.005, 0.01), hm); put(at(new THREE.TorusGeometry(0.104, 0.018, 8, 24).rotateX(Math.PI / 2), -0.005, 0.02), this.mat(new THREE.Color(hatCol).multiplyScalar(0.8).getStyle(), 0.8)); put(at(new THREE.SphereGeometry(0.03, 10, 8), -0.01, 0.13), this.mat('#f4f4f2', 0.9)); }
    else if (H === 'bucket') { put(at(new THREE.CylinderGeometry(0.085, 0.106, 0.08, 18), -0.005, 0.07), hm); put(at(new THREE.CylinderGeometry(0.106, 0.16, 0.025, 20, 1, true), -0.005, 0.025), hm); put(at(new THREE.CylinderGeometry(0.086, 0.086, 0.004, 18), -0.005, 0.11), hm); }
    else if (H === 'headband') put(at(new THREE.TorusGeometry(0.1, 0.014, 8, 26).rotateX(Math.PI / 2).scale(0.97, 1, 0.92), 0, 0.045), hm);
    else if (H === 'tophat') { put(at(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 22), -0.005, 0.075), hm); put(at(new THREE.CylinderGeometry(0.085, 0.09, 0.17, 20), -0.005, 0.16), hm); put(at(new THREE.CylinderGeometry(0.092, 0.092, 0.03, 20), -0.005, 0.095), this.mat('#22262b', 0.6)); }
    else if (H === 'crown') { const gold = this.mat('#f2c200', 0.25, 0.85); put(at(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 20, 1, true), -0.005, 0.1), gold); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; put(at(new THREE.ConeGeometry(0.018, 0.05, 6), -0.005 + Math.cos(a) * 0.085, 0.145, Math.sin(a) * 0.085), gold); put(at(new THREE.SphereGeometry(0.011, 8, 6), -0.005 + Math.cos(a) * 0.09, 0.1, Math.sin(a) * 0.09), this.mat(i % 2 ? '#e74c3c' : '#29b6f6', 0.2, 0.3)); } }
    const sm = this.mat(shirt, 0.6), white = this.mat('#f4f4f2', 0.6), L = G3.limb;
    if (look.outfit === 'jersey') { put(new THREE.TorusGeometry(0.065, 0.016, 8, 20).rotateX(Math.PI / 2).translate(tx + 0.01, 0.975, 0), white); for (const sd of [-1, 1]) { const a = [tx, 0.96, sd * 0.18], b = [tx + 0.15, 0.74, sd * 0.24], p = k => a.map((v, i) => v + (b[i] - v) * k); put(L(p(0.72), p(0.86), 0.059), white); } put(new THREE.BoxGeometry(0.012, 0.035, 0.26).translate(tx + 0.127, 0.86, 0), white); }
    if (look.outfit === 'hoodie') { put(new THREE.SphereGeometry(0.12, 14, 10, -Math.PI / 2, Math.PI).scale(0.75, 0.6, 1.15).translate(hx - 0.07, hy - 0.11, 0), sm); put(new THREE.BoxGeometry(0.012, 0.08, 0.17).translate(tx + 0.128, 0.71, 0), this.mat(new THREE.Color(shirt).multiplyScalar(0.75).getStyle(), 0.7)); for (const sd of [-1, 1]) put(L([tx + 0.11, 0.95, sd * 0.03], [tx + 0.135, 0.86, sd * 0.035], 0.006), white); }
    const dec = look.decal && look.decal !== 'none' ? this.decalTex(look.decal) : null;
    if (dec) for (const sd of [-1, 1]) { const g = new THREE.PlaneGeometry(0.46, 0.086); if (sd < 0) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); g.rotateY(Math.PI); } g.translate(sx + 0.13, 0.335, sd * 0.347); const me = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: dec, transparent: true, alphaTest: 0.2, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 })); me.userData.self = false; G.add(me); }
    if (opts.layer !== undefined) G.traverse(o => { if (o.isMesh && o.userData.self) o.layers.set(opts.layer); });
    group.add(G);
  },
  /* what a driver's arms are doing: an action (wave, cheer...), healing, reviving, down, holding a gun or an item, or just driving */
  poseFor(ch, m, now) {
    const a = ch.act, A = a && typeof ACTIONS !== 'undefined' && ACTIONS[a.id]; if (A && now - a.t < A.dur && !ch.out) return { name: a.id, t: now - a.t };
    if (m && m.kind === 'br' && ch.gs) { const G = ch.gs, it = G.inv && G.inv[G.sel];
      if (G.down) return { name: 'downed', t: now }; if (G.use) return { name: 'heal', t: now, item: G.use.k }; if (G.rv) return { name: 'revive', t: now };
      if (it && !G.hol) return BR_GUNS[it.k] ? { name: 'gun', t: now, item: it.k, pitch: typeof brPitch === 'function' ? brPitch(ch) : 0 } : { name: 'item', t: now, item: it.k }; }
    return { name: 'drive', t: now };
  },
  /* whose look a cart shows: you (your profile), people online (what they sent), nobody else */
  lookFor(ch, sc) {
    const p = ch && ch.player; if (!p) return null; if (p.look) return p.look;
    const o = sc && sc.online; if (o) { const me = o.role === 'host' ? o.me : o.sim && o.sim.locals[0] && o.sim.locals[0].me; return p === me ? Progress.look() : null; }
    const first = sc && sc.setup && sc.setup.players && sc.setup.players[0]; return p === first ? Progress.look() : null;
  },
  cleanLook(L) {                                                         // a look that came over the network: only known items and colours
    if (!L || typeof L !== 'object') return null; const col = v => /^#[0-9a-fA-F]{6}$/.test(v) ? v : null, id = (v, list) => list.some(x => x.id === v) ? v : list[0].id;
    return { outfit: id(L.outfit, COS.outfits), shirt: col(L.shirt) || LOOK0.shirt, hat: id(L.hat, COS.hats), hatCol: col(L.hatCol) || LOOK0.hatCol, face: id(L.face, COS.faces), hair: col(L.hair) || LOOK0.hair, hairStyle: id(L.hairStyle, COS.hairStyles), skin: col(L.skin) || LOOK0.skin, decal: id(L.decal, COS.decals), title: id(L.title, COS.titles) };
  },
  /* a whole cart with its driver, for the lobby (the same model as in a match) */
  cart(look) {
    const ctx = { mats: {} }, G = View3D.prototype.cartGeometry.call(ctx), mat = (c, r, m) => this.mat('#' + new THREE.Color(c).getHexString(), r, m || 0), group = new THREE.Group(), accent = 0x29b6f6;
    const cols = { wood: [0xd8a46c, 0.55], woodEdge: [0xb07a45, 0.6], black: [0x1b1d20, 0.6], grey: [0x9aa1a7, 0.85], plastic: [0xf4f4f2, 0.35], team: [accent, 0.45], white: [0xf0f0f0, 0.5], selfTeam: [accent, 0.6], selfWhite: [0xffffff, 0.6], selfSkin: [0xe8b48a, 0.7], selfHair: [0x3b2a1e, 0.9], pants: [0x2f3b55, 0.8], shoes: [0xffffff, 0.6], selfPants: [0x2f3b55, 0.8], selfBlack: [0x1b1d20, 0.6], selfWood: [0xd8a46c, 0.55] };
    for (const [k, geo] of Object.entries(G.parts)) { const [col, rough] = cols[k] || [0x888888, 0.6], me = new THREE.Mesh(geo, mat(col, rough)); me.castShadow = me.receiveShadow = true; me.userData.part = k; group.add(me); }
    for (const sd of [-1, 1]) { const w = new THREE.Group(); w.add(new THREE.Mesh(G.tyre, mat(0x2a2d31, 0.85)), new THREE.Mesh(G.hub, mat(0x9aa1a7, 0.35, 0.6))); w.position.set(G.wheelX, G.wheelR, sd * G.wheelZ); w.children.forEach(x => { x.castShadow = true; }); group.add(w); }
    this.dress(group, look); return group;
  }
};

/* in matches: every cart shows its driver's look (re-dressed when a different person takes it) */
{ const P = View3D.prototype, build = P.buildCarts, upd = P.update;
  P.buildCarts = function () { build.call(this); const keys = Object.keys(this.cartGeometry().parts); for (const c of this.carts || []) { c.cosKey = null; let i = 0; for (const ch of c.group.children) if (ch.isMesh && i < keys.length) ch.userData.part = keys[i++]; } };
  P.update = function (dt) {
    const r = upd.call(this, dt);
    const nowL = performance.now(); for (const c of this.carts || []) { if (this.m.kind === 'br' && c.lkT && nowL - c.lkT < 500) continue; c.lkT = nowL;   /* (v14.3.10: Volt Royale: twice a second) */ const look = Avatar.lookFor(c.ch, this.sc), hockey = !this.m.mini, key = look ? JSON.stringify(look) + (hockey ? 'h' + c.ch.side : 'm') : '';
      if (key === c.cosKey) continue; c.cosKey = key;
      if (look) Avatar.dress(c.group, look, { layer: c.layer, shirt: hockey ? '#' + new THREE.Color(this.teamColor(c.ch.side)).getHexString() : undefined });   // (Volt Hockey: your shirt is in your team's colour)
      else { const old = c.group.getObjectByName('cosmetics'); if (old) c.group.remove(old); } }
    if (typeof Rig !== 'undefined') { const now = performance.now() / 1000; const fr = this.lodFrame || 0; for (const c of this.carts || []) { if (c.lod === 1 && (fr + (c.ch.k || c.ch.index || 0)) % 3) continue;   /* (v14.3.10: far carts every third frame) */ const p = Avatar.poseFor(c.ch, this.m, now); Rig.update(c.group, p.name, p.t, { layer: c.layer, item: p.item, pitch: p.pitch, sleeves: c.group.userData.sleeves, hide: c.ch.out }); if (c.propKey !== c.cosKey) { c.propKey = c.cosKey; c.prop = c.group.getObjectByName('propeller'); } if (c.prop) c.prop.rotation.y = now * 14; } }   // the arms (and a propeller cap) move
    return r;
  };
}

/* The lobby's stage: a dark studio with a glowing platform, light beams and drifting sparks; your character turns slowly on it. */
class LobbyStage {
  constructor() {
    this.ok = Render3D.ensure(); if (!this.ok) return;
    const s = this.scene = new THREE.Scene(), cv = document.createElement('canvas'); cv.width = 16; cv.height = 512; const c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#0b1030'); g.addColorStop(0.45, '#2a1f6b'); g.addColorStop(0.62, '#5b2bbf'); g.addColorStop(0.75, '#1a1440'); g.addColorStop(1, '#07091a'); c.fillStyle = g; c.fillRect(0, 0, 16, 512);
    const bg = new THREE.CanvasTexture(cv); bg.encoding = THREE.sRGBEncoding; s.background = bg; s.fog = new THREE.Fog(0x140f35, 9, 26);
    const env = Look.env(true, 0x6a5cff); if (env) s.environment = env;
    s.add(new THREE.HemisphereLight(0x9aa8ff, 0x1a1030, 0.55));
    const key = this.key = new THREE.DirectionalLight(0xfff1dc, 2.2); key.position.set(3, 6, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = key.shadow.camera.bottom = -3; key.shadow.camera.right = key.shadow.camera.top = 3; key.shadow.radius = 4; s.add(key);
    const rim = new THREE.DirectionalLight(0x29b6f6, 1.6); rim.position.set(-4, 3, -4); s.add(rim); const rim2 = new THREE.PointLight(0xc44dff, 1.4, 8); rim2.position.set(2.5, 1.2, -2.2); s.add(rim2);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x10112a, roughness: 0.35, metalness: 0.4 })); floor.receiveShadow = true; s.add(floor);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.14, 48), new THREE.MeshStandardMaterial({ color: 0x1d2350, roughness: 0.4, metalness: 0.5 })); plat.position.y = 0.07; plat.receiveShadow = true; s.add(plat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.025, 8, 80).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5fd6ff })); ring.position.y = 0.145; s.add(ring); this.ring = ring;
    for (let i = 0; i < 5; i++) { const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 1.6, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x7b5cff : 0x29b6f6, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); beam.position.set(-6 + i * 3, 7, -7 - (i % 2) * 2); beam.rotation.z = (i - 2) * 0.12; s.add(beam); }
    const n = 220, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 16; pos[i * 3 + 1] = Math.random() * 8; pos[i * 3 + 2] = -2 - Math.random() * 10; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); this.sparks = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x9fe8ff, size: 0.05, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); s.add(this.sparks);
    this.cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 60); this.spin = -0.5; this.spinV = 0; this.offX = 0; this.zoom = 1; this.lookKey = '';
  }
  play(id) { this.act = { id, t: performance.now() / 1000 }; this.nextAct = this.act.t + 8; }
  setLook(look) { if (!this.ok) return; const k = JSON.stringify(look); if (k === this.lookKey) return; this.lookKey = k; if (this.cart) this.scene.remove(this.cart); this.cart = Avatar.cart(look); this.cart.position.y = 0.14; this.scene.add(this.cart); }
  render(dt, frame) {                                                    // frame: { x: where the character sits across the screen (0..1), zoom }
    if (!this.ok) return; const b = Render3D.sync(); if (!b) return; Render3D.show(true); const r = Render3D.r, w = Render3D.w, h = Render3D.h;
    this.spin += (this.spinV || 0.18) * dt; this.spinV *= Math.exp(-3 * dt); if (this.cart) this.cart.rotation.y = this.spin;
    if (this.cart && typeof Rig !== 'undefined') { const now = performance.now() / 1000, A = this.act && ACTIONS[this.act.id], on = A && now - this.act.t < A.dur;   // the arms: the action you just did (or the one you are looking at in the Locker)
      /* (v14.2.11: no more random actions now and then: your character only emotes when you emote, or when you try one on in the Locker) */
      Rig.update(this.cart, on ? this.act.id : 'drive', on ? now - this.act.t : now, { sleeves: this.cart.userData.sleeves }); }
    const p = this.sparks.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) + dt * (0.15 + (i % 7) * 0.05); if (y > 8) y = 0; p.setY(i, y); } p.needsUpdate = true;
    this.ring.material.color.setHSL(0.53 + 0.06 * Math.sin(performance.now() / 900), 1, 0.65);
    const k = 1 - Math.exp(-6 * dt); this.offX += ((frame.x - 0.5) - this.offX) * k; this.zoom += ((frame.zoom || 1) - this.zoom) * k;
    const pt = ((this.mates && this.mates.size) || this.slotsOn) && frame.zoom <= 1.02 ? 1 : 0;   /* (v14.1: the open spots for your party count too) */ this.pk = (this.pk || 0) + (pt - (this.pk || 0)) * k; const pk = this.pk;   /* (your party behind you: the camera rises and steps back to frame the V) */
    const cam = this.cam, d = 4.9 / this.zoom + 3.2 * pk; cam.aspect = w / h; cam.position.set(d * 0.92, 1.25 + 0.2 / this.zoom + 2.0 * pk, d * 0.38); cam.lookAt(-0.2 - 1.75 * pk, 0.68 + 0.2 * pk, -0.72 * pk);
    cam.setViewOffset(w, h, -this.offX * w, 0, w, h); cam.updateProjectionMatrix();
    r.setScissorTest(true); r.setViewport(0, 0, w, h); r.setScissor(0, 0, w, h); r.setClearColor(0x07091a, 1); r.clear(); r.render(this.scene, cam);
  }
}
