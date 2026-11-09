/* v14: SKINS. No more picking hats, hair and colours one by one: you wear a complete, designed player skin, and drive a cart skin
   (chosen separately: a Biker on a Zamboni-style Ice Machine is fine). Each skin is a full outfit with its own accessories; each cart skin
   is the same chair with its own paint, fascia and add-ons (the shape and the hitbox never change). Most skins have a second colourway.
   A look is now { ps: player skin, cs: cart skin }; everything the old renderer needs (outfit, hat, face, hair, skin tone...) comes from the skin. */
const SK = {
  mats: new Map(),
  M(col, o = {}) {
    const key = JSON.stringify([col, o.r, o.m, o.cc, o.e, o.ei, o.op, o.ds, o.map ? o.map.uuid : 0, o.add]); let m = this.mats.get(key); if (m) return m;
    m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(col), roughness: o.r === undefined ? 0.55 : o.r, metalness: o.m || 0, clearcoat: o.cc || 0, clearcoatRoughness: 0.12, emissive: new THREE.Color(o.e || 0x000000), emissiveIntensity: o.ei === undefined ? 1 : o.ei, transparent: o.op !== undefined && o.op < 1, opacity: o.op === undefined ? 1 : o.op, side: o.ds ? THREE.DoubleSide : THREE.FrontSide, map: o.map || null, depthWrite: o.op === undefined || o.op >= 1 });
    if (o.add) { m.blending = THREE.AdditiveBlending; m.transparent = true; m.depthWrite = false; }
    this.mats.set(key, m); return m;
  },
  paint(col) { return this.M(col, { r: 0.32, cc: 1, m: 0.15 }); }, chrome() { return this.M(0xd9dee3, { r: 0.12, m: 1 }); }, rubber() { return this.M(0x1b1d20, { r: 0.85 }); },
  glow(col, i = 1.6) { return this.M(col, { e: col, ei: i, r: 0.4 }); },
  tex(w, h, draw, key) { const k = 'tex:' + key; if (key && this.mats.has(k)) return this.mats.get(k); const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; if (key) this.mats.set(k, t); return t; },
  rbox(w, h, d, r = 0.02) {                                              // a box with rounded edges (bevelled), centred
    const b = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001), W = w - 2 * b, H = h - 2 * b, s = new THREE.Shape(), q = Math.min(b, W / 2, H / 2) * 0.6;
    s.moveTo(-W / 2 + q, -H / 2); s.lineTo(W / 2 - q, -H / 2); s.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + q); s.lineTo(W / 2, H / 2 - q); s.quadraticCurveTo(W / 2, H / 2, W / 2 - q, H / 2); s.lineTo(-W / 2 + q, H / 2); s.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - q); s.lineTo(-W / 2, -H / 2 + q); s.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + q, -H / 2);
    return new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 }).translate(0, 0, -(d - 2 * b) / 2);
  },
  K() { const sx = CONFIG.view3d.cart.seatX, tx = sx - 0.07; return { sx, tx, hx: tx + 0.02, hy: 1.15 }; },
  /* a printed shirt / jacket over the torso: chest at u = 0.25, back at u = 0.75 (like the jerseys) */
  shell(draw, key, scale = 1.04) { const { tx } = this.K(), t = this.tex(512, 256, draw, 'shell:' + key); const me = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.22, 4, 18).scale(0.85 * scale, 1.015, 1.2 * scale).translate(tx, 0.79, 0), this.M(0xffffff, { map: t, r: 0.62 })); me.userData.shell = true; return me; }
};

/* ---- canvas helpers for prints ---- */
const PR = {
  bolt(c, x, y, s, col = '#ffd23f', edge = '#1a1206') { c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.moveTo(6, -40); c.lineTo(-18, 6); c.lineTo(-2, 6); c.lineTo(-10, 40); c.lineTo(20, -10); c.lineTo(4, -10); c.lineTo(14, -40); c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 4; c.strokeStyle = edge; c.stroke(); c.restore(); },
  leaf(c, x, y, s, col = '#ffffff') {                                 // a maple leaf
    c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = col; c.beginPath();
    const P = [[0, -46], [8, -30], [18, -36], [14, -12], [32, -24], [30, -16], [44, -18], [36, -2], [42, 4], [22, 14], [26, 24], [4, 20], [4, 44], [-4, 44], [-4, 20], [-26, 24], [-22, 14], [-42, 4], [-36, -2], [-44, -18], [-30, -16], [-32, -24], [-14, -12], [-18, -36], [-8, -30]];
    P.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); c.fill(); c.restore();
  },
  plaid(c, w, h, a, b, line = 'rgba(0,0,0,0.35)') { c.fillStyle = a; c.fillRect(0, 0, w, h); c.fillStyle = b; for (let x = 0; x < w; x += 48) c.fillRect(x, 0, 22, h); c.globalAlpha = 0.6; for (let y = 0; y < h; y += 48) c.fillRect(0, y, w, 22); c.globalAlpha = 1; c.strokeStyle = line; c.lineWidth = 2; for (let x = 11; x < w; x += 24) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } },
  text(c, s, x, y, size, col, font = 'Barlow Condensed, Impact, sans-serif', weight = '900') { c.font = `${weight} ${size}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(s, x, y); },
  jacket(c, w, h, col, inner, lapel) {                                // an open jacket: the colour all round, a strip of the shirt showing down the chest
    c.fillStyle = col; c.fillRect(0, 0, w, h); c.fillStyle = inner; c.beginPath(); c.moveTo(108, 0); c.lineTo(148, 0); c.lineTo(140, h); c.lineTo(116, h); c.closePath(); c.fill();
    if (lapel) { c.fillStyle = lapel; c.beginPath(); c.moveTo(86, 0); c.lineTo(108, 0); c.lineTo(114, 90); c.closePath(); c.fill(); c.beginPath(); c.moveTo(170, 0); c.lineTo(148, 0); c.lineTo(142, 90); c.closePath(); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(0, 0, w, 10); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, h - 26, w, 26);
  }
};

/* ================= PLAYER SKINS ================= */
/* base: the look fields the renderer understands; build(G, put, pal): the extras (put adds a mesh to the outfit group) */
const PSKINS = [];
function pskin(id, name, icon, look, build, alt, free) { PSKINS.push({ id, name, icon, look, build, pal: {}, free: !!free }); if (alt) PSKINS.push({ id: id + '_2', name: name + ': ' + alt.name, icon, look: { ...look, ...(alt.look || {}) }, build, pal: alt.pal || {}, alt: true }); }

pskin('rookie', 'Rookie', '🧢', { outfit: 'tee', shirt: '#2f6fed', hat: 'cap', hatCol: '#e74c3c', face: 'smile', hair: '#3b2a1e', hairStyle: 'short', skin: '#e8b48a' },
  (G, put, p) => { put(SK.shell((c, w, h) => { c.fillStyle = '#2f6fed'; c.fillRect(0, 0, w, h); PR.text(c, 'VOLT', 128, 96, 54, '#ffffff'); PR.bolt(c, 128, 150, 0.6); PR.text(c, '1', 384, 100, 96, '#ffffff'); }, 'rookie')); }, null, true);
pskin('hometown', 'Hometown Hero', '🏠', { outfit: 'hoodie', shirt: '#7c8794', hat: 'beanie', hatCol: '#c0392b', face: 'grin', hair: '#6b4a2b', hairStyle: 'long', skin: '#d29a6c' },
  (G, put) => { put(SK.shell((c, w, h) => { c.fillStyle = '#7c8794'; c.fillRect(0, 0, w, h); c.fillStyle = '#c0392b'; c.fillRect(0, 150, w, 16); PR.text(c, 'HOME', 128, 70, 46, '#ffffff'); PR.text(c, 'TEAM', 128, 112, 46, '#ffffff'); c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(90, 186, 76, 40); }, 'home')); }, null, true);

/* Lil Bro: a little guy riding on your lap, in a blue jersey with a white maple leaf */
pskin('lilbro', 'Lil Bro', '🧒', { outfit: 'tee', shirt: '#e74c3c', hat: 'cap', hatCol: '#1f3f8f', face: 'grin', hair: '#3b2a1e', hairStyle: 'short', skin: '#e8b48a' },
  (G, put, p) => {
    const { sx } = SK.K(), kid = new THREE.Group(), jer = p.jersey || '#1f5fd1', skin = SK.M(p.kskin || '#f0c49c', { r: 0.6 }), x0 = sx + 0.14;
    const jt = SK.tex(256, 128, (c, w, h) => { c.fillStyle = jer; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.fillRect(0, 96, w, 10); PR.leaf(c, 64, 48, 0.62); PR.text(c, '9', 192, 52, 60, '#ffffff'); }, 'kidjersey' + jer);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.1, 4, 14).scale(0.9, 1, 1.15), SK.M(0xffffff, { map: jt, r: 0.6 })); body.position.set(0, 0.17, 0); kid.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.068, 20, 14), skin); head.position.set(0.01, 0.33, 0); kid.add(head);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.0685, 20, 14, Math.PI - 0.74, 1.48, Math.PI / 2 - 0.5, 1.08), new THREE.MeshStandardMaterial({ map: Avatar.faceTex('grin'), alphaTest: 0.3, roughness: 0.7 })); face.position.copy(head.position); kid.add(face);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.071, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), SK.M(p.kcap || '#ffffff', { r: 0.7 })); cap.position.set(0.005, 0.345, 0); kid.add(cap);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.008, 16).scale(1.3, 1, 1.1), SK.M(p.kcap || '#ffffff', { r: 0.7 })); brim.position.set(0.075, 0.36, 0); kid.add(brim);
    for (const sd of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.12, 4, 8), SK.M('#22303f', { r: 0.8 })); leg.rotation.z = -1.25; leg.position.set(0.1, 0.07, sd * 0.04); kid.add(leg);
      const shoe = new THREE.Mesh(SK.rbox(0.07, 0.035, 0.045, 0.012), SK.M('#f4f4f2', { r: 0.5 })); shoe.position.set(0.18, 0.04, sd * 0.04); kid.add(shoe);
      const arm = new THREE.Group(), a = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.09, 4, 8).translate(0, 0.06, 0), SK.M(jer, { r: 0.6 })), hnd = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), skin); hnd.position.y = 0.125; arm.add(a, hnd); arm.position.set(0, 0.22, sd * 0.085); arm.rotation.x = sd * 0.5; arm.userData.sd = sd; kid.add(arm); }
    kid.position.set(x0 + 0.06, 0.6, 0); kid.scale.setScalar(1.2); kid.userData.tick = t => { const k = Math.sin(t * 2.2); kid.rotation.y = 0.15 * Math.sin(t * 0.7); kid.children.forEach(ch => { if (ch.userData.sd === 1) { ch.rotation.x = 0.4 + 0.9 * Math.max(0, k); ch.rotation.z = -0.25 * Math.max(0, Math.sin(t * 9)) * Math.max(0, k); } else if (ch.userData.sd === -1) ch.rotation.x = -0.5; }); };
    kid.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.self = true; } }); G.add(kid); G.userData.ticks.push(kid.userData.tick);
    put(SK.shell((c, w, h) => { c.fillStyle = p.dad || '#e74c3c'; c.fillRect(0, 0, w, h); PR.leaf(c, 128, 100, 0.95, '#ffffff'); PR.text(c, 'BIG BRO', 384, 100, 44, '#ffffff'); }, 'bigbro' + (p.dad || '')));
  }, { name: 'Away Kit', look: { shirt: '#1f5fd1', hatCol: '#e74c3c' }, pal: { jersey: '#ffffff', dad: '#1f5fd1', kcap: '#e74c3c', kskin: '#c68a5c' } });

/* Biker: open-face helmet with goggles, leather jacket with patches, bandana */
pskin('biker', 'Biker', '🏍️', { outfit: 'tee', shirt: '#1b1d20', hat: 'none', hatCol: '#1b1d20', face: 'stache', hair: '#3b2a1e', hairStyle: 'buzz', skin: '#d29a6c' },
  (G, put, p) => {
    const { hx, hy, tx } = SK.K(), shell = p.helmet || 0x111214, hm = SK.M(shell, { r: 0.18, cc: 1, m: 0.2 });
    put(new THREE.SphereGeometry(0.118, 28, 16, 0, Math.PI * 2, 0, 1.45).translate(hx - 0.008, hy + 0.0, 0), hm);
    const stripe = SK.M(p.stripe || 0xe8501c, { r: 0.3, cc: 1 }); put(new THREE.TorusGeometry(0.119, 0.012, 6, 40, Math.PI).rotateY(Math.PI / 2).translate(hx - 0.008, hy, 0), stripe);
    put(new THREE.TorusGeometry(0.117, 0.01, 6, 40).rotateX(Math.PI / 2).rotateZ(-0.12).translate(hx, hy - 0.005, 0), SK.M(0x222222, { r: 0.6 }));   // the rim
    const gm = SK.chrome(), gl = SK.M(0x6fb8ff, { r: 0.05, m: 0.4, op: 0.65 });
    for (const sd of [-1, 1]) { put(new THREE.TorusGeometry(0.028, 0.008, 8, 20).rotateY(Math.PI / 2).translate(hx + 0.095, hy + 0.08, sd * 0.038), gm); put(new THREE.CircleGeometry(0.026, 18).rotateY(Math.PI / 2).translate(hx + 0.099, hy + 0.08, sd * 0.038), gl); }
    put(new THREE.TorusGeometry(0.12, 0.009, 6, 40).rotateX(Math.PI / 2).rotateZ(-0.35).translate(hx, hy + 0.06, 0), SK.M(0x2b2b2b, { r: 0.8 }));   // goggle strap
    put(new THREE.TorusGeometry(0.07, 0.024, 8, 24).rotateX(Math.PI / 2).translate(tx + 0.02, 1.0, 0), SK.M(p.bandana || '#b8261f', { r: 0.8 }));   // bandana at the neck
    put(SK.shell((c, w, h) => { PR.jacket(c, w, h, '#17181a', '#3a3d42', '#2a2c30'); c.fillStyle = '#c9ccd1'; c.fillRect(126, 0, 4, h); for (const y of [60, 110]) { c.fillStyle = '#c9ccd1'; c.fillRect(70, y, 26, 4); c.fillRect(160, y, 26, 4); }   // zips
      c.fillStyle = p.patch || '#e8501c'; c.beginPath(); c.arc(384, 96, 54, 0, 7); c.fill(); PR.text(c, 'ROAD', 384, 82, 30, '#17181a'); PR.text(c, 'HOGS', 384, 112, 30, '#17181a'); c.strokeStyle = '#d9d9d9'; c.lineWidth = 6; c.beginPath(); c.arc(384, 96, 54, 0, 7); c.stroke(); }, 'biker' + (p.patch || ''), 1.06));
    G.userData.sleeves = true;
  }, { name: 'Chrome', look: { skin: '#8a5a36' }, pal: { helmet: 0xd9dee3, stripe: 0x111214, bandana: '#1f3f8f', patch: '#2f9bff' } });

/* Rockstar: lightning bolt shirt, studded leather vest, spiky hair, shades, a guitar on the back */
pskin('rockstar', 'Rockstar', '🎸', { outfit: 'tee', shirt: '#121214', hat: 'none', hatCol: '#000', face: 'shades', hair: '#1d1611', hairStyle: 'spiky', skin: '#e8b48a' },
  (G, put, p) => {
    const { tx, sx } = SK.K(), bolt = p.bolt || '#ffd23f';
    put(SK.shell((c, w, h) => { c.fillStyle = '#121214'; c.fillRect(0, 0, w, h); c.fillStyle = p.tee || '#f4f4f2'; c.fillRect(70, 0, 116, h); PR.bolt(c, 128, 110, 1.6, bolt); c.fillStyle = '#121214'; c.fillRect(70, 0, 14, h); c.fillRect(172, 0, 14, h);
      for (let y = 20; y < 200; y += 26) { c.fillStyle = '#c9ccd1'; c.beginPath(); c.arc(62, y, 4, 0, 7); c.arc(194, y, 4, 0, 7); c.fill(); }
      PR.bolt(c, 384, 100, 1.2, bolt); PR.text(c, 'ON TOUR', 384, 180, 40, bolt); }, 'rock' + bolt, 1.06));
    const gtr = new THREE.Group(), body = SK.M(p.guitar || 0xc0392b, { r: 0.25, cc: 1 }), wood = SK.M(0x3b2a1e, { r: 0.6 });
    const bshape = new THREE.Shape(); bshape.absellipse(0, 0, 0.13, 0.1, 0, Math.PI * 2); const bg = new THREE.ExtrudeGeometry(bshape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 });
    const b1 = new THREE.Mesh(bg, body); b1.rotation.y = Math.PI / 2; gtr.add(b1); const neck = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.36, 0.035), wood); neck.position.set(0.02, 0.24, 0); gtr.add(neck);
    const head = new THREE.Mesh(SK.rbox(0.025, 0.07, 0.05, 0.008), SK.M(0x121214, { r: 0.3 })); head.position.set(0.02, 0.45, 0); gtr.add(head);
    gtr.position.set(sx - 0.33, 0.62, 0.12); gtr.rotation.x = -0.55; gtr.traverse(o => { if (o.isMesh) o.castShadow = true; }); G.add(gtr);   // (on the back, over the chair)
    for (const sd of [-1, 1]) put(new THREE.TorusGeometry(0.075, 0.02, 6, 20).rotateY(Math.PI / 2).translate(tx + 0.25, 0.73, sd * 0.24), SK.M(0x121214, { r: 0.4 }));   // wristbands
    G.userData.sleeves = true;
  }, { name: 'Neon', look: { hair: '#ff5fa2', skin: '#b07a4f' }, pal: { bolt: '#3dd6ff', tee: '#ff5fa2', guitar: 0x3dd6ff } });

/* Software Engineer: hoodie with a code print, headphones round the neck, glasses, a lanyard */
pskin('engineer', 'Software Engineer', '💻', { outfit: 'hoodie', shirt: '#2d323b', hat: 'none', hatCol: '#000', face: 'nerd', hair: '#3b2a1e', hairStyle: 'quiff', skin: '#f6d3b3' },
  (G, put, p) => {
    const { tx } = SK.K(), acc = p.acc || '#3dd6ff';
    put(SK.shell((c, w, h) => { c.fillStyle = p.hood || '#2d323b'; c.fillRect(0, 0, w, h); PR.text(c, '</>', 128, 92, 72, acc, 'Consolas, monospace', '700'); PR.text(c, 'it works on', 384, 70, 30, '#cfd8de', 'Consolas, monospace', '400'); PR.text(c, 'my machine', 384, 104, 30, '#cfd8de', 'Consolas, monospace', '400');
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(96, 160, 64, 44); }, 'eng' + acc, 1.06));
    const ph = SK.M(0x1b1d20, { r: 0.35, cc: 1 }); put(new THREE.TorusGeometry(0.085, 0.012, 8, 30, Math.PI * 1.2).rotateX(Math.PI / 2).rotateY(Math.PI * 0.4).translate(tx + 0.0, 1.0, 0), ph);
    for (const sd of [-1, 1]) { put(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 20).rotateX(Math.PI / 2).translate(tx + 0.06, 0.97, sd * 0.09), ph); put(new THREE.CylinderGeometry(0.03, 0.03, 0.032, 20).rotateX(Math.PI / 2).translate(tx + 0.06, 0.97, sd * 0.09), SK.glow(acc, 0.8)); }
    put(new THREE.BoxGeometry(0.004, 0.2, 0.004).translate(tx + 0.13, 0.82, 0.04).rotateX(0), SK.M(acc, { r: 0.6 })); put(SK.rbox(0.008, 0.07, 0.05, 0.004).translate(tx + 0.135, 0.71, 0.04), SK.M('#f4f4f2', { r: 0.4 }));   // lanyard + badge
    G.userData.sleeves = true;
  }, { name: 'Dark Mode', look: { shirt: '#111316', skin: '#8a5a36', hair: '#1d1611', hairStyle: 'afro' }, pal: { acc: '#7dff6a', hood: '#111316' } });

/* Star Knight: hooded robe over a light tunic, a belt, a glowing energy staff across the back */
pskin('knight', 'Star Knight', '✨', { outfit: 'tee', shirt: '#6b4a2b', hat: 'none', hatCol: '#000', face: 'focus', hair: '#6b4a2b', hairStyle: 'ponytail', skin: '#e8b48a' },
  (G, put, p) => {
    const { tx, hx, hy, sx } = SK.K(), robe = p.robe || '#5a3d26', tunic = p.tunic || '#e9dcc0', glow = p.glow || 0x3dd6ff;
    put(SK.shell((c, w, h) => { c.fillStyle = robe; c.fillRect(0, 0, w, h); c.fillStyle = tunic; c.beginPath(); c.moveTo(96, 0); c.lineTo(160, 0); c.lineTo(150, h); c.lineTo(106, h); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 3; for (let x = 0; x < w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 6, h); c.stroke(); } }, 'knight' + robe, 1.07));
    put(new THREE.SphereGeometry(0.13, 22, 14, Math.PI * 0.5, Math.PI, 0.3, 1.5).scale(1, 0.9, 1.05).translate(hx - 0.06, hy - 0.08, 0), SK.M(robe, { r: 0.85, ds: 1 }));   // the hood, down
    put(new THREE.TorusGeometry(0.155, 0.02, 8, 36).rotateX(Math.PI / 2).scale(0.85, 1, 1.2).translate(tx, 0.62, 0), SK.M(0x3b2a1e, { r: 0.5 })); put(SK.rbox(0.02, 0.05, 0.06, 0.006).translate(tx + 0.135, 0.62, 0), SK.M(0xc9a227, { r: 0.25, m: 1 }));
    const staff = new THREE.Group(), hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 14), SK.chrome()), beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 12), SK.glow(glow, 2.4)), halo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.64, 12), SK.M(glow, { op: 0.25, add: 1 }));
    beam.position.y = halo.position.y = 0.39; staff.add(hilt, beam, halo); staff.position.set(sx - 0.33, 0.68, -0.08); staff.rotation.x = 0.7; G.add(staff);
    staff.userData.tick = t => { halo.scale.set(1 + 0.15 * Math.sin(t * 20), 1, 1 + 0.15 * Math.sin(t * 20)); }; G.userData.ticks.push(staff.userData.tick);
    G.userData.sleeves = true;
  }, { name: 'Shadow', look: { shirt: '#1b1d20', hair: '#1d1611', skin: '#c68a5c' }, pal: { robe: '#1b1d20', tunic: '#3a3d42', glow: 0xff3b3b } });

/* Good Boy: a dog. Fur, snout, floppy ears, a collar with a gold tag */
pskin('dog', 'Good Boy', '🐶', { outfit: 'tee', shirt: '#c8955a', hat: 'none', hatCol: '#000', face: 'smile', hair: '#c8955a', hairStyle: 'bald', skin: '#c8955a' },
  (G, put, p) => {
    const { hx, hy, tx } = SK.K(), fur = SK.M(p.fur || '#c8955a', { r: 0.9 }), light = SK.M(p.light || '#f1dcc0', { r: 0.9 }), dark = SK.M(p.dark || '#5e3b22', { r: 0.85 }), black = SK.M(0x111111, { r: 0.2, cc: 1 });
    put(new THREE.SphereGeometry(0.12, 28, 20).scale(1.02, 0.95, 0.94).translate(hx, hy + 0.005, 0), fur);
    put(new THREE.SphereGeometry(0.068, 22, 16).scale(1.25, 0.78, 0.88).translate(hx + 0.1, hy - 0.04, 0), light);   // the snout
    put(new THREE.SphereGeometry(0.025, 16, 12).scale(1.1, 0.85, 1.25).translate(hx + 0.18, hy - 0.022, 0), black);    // the nose
    put(new THREE.SphereGeometry(0.03, 14, 10).scale(1, 0.4, 1.1).translate(hx + 0.14, hy - 0.085, 0), SK.M('#e8607a', { r: 0.5 }));   // tongue
    for (const sd of [-1, 1]) {
      put(new THREE.SphereGeometry(0.021, 16, 12).translate(hx + 0.093, hy + 0.035, sd * 0.045), black); put(new THREE.SphereGeometry(0.007, 8, 6).translate(hx + 0.11, hy + 0.043, sd * 0.04), SK.M(0xffffff, { e: 0xffffff, ei: 0.6 }));   // eyes
      put(new THREE.BoxGeometry(0.03, 0.008, 0.035).translate(hx + 0.09, hy + 0.068, sd * 0.046), dark);                                              // brows
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 14).scale(0.42, 1.25, 0.32), dark); ear.position.set(hx - 0.01, hy - 0.03, sd * 0.118); ear.rotation.x = sd * -0.25; ear.castShadow = true; ear.userData.self = true; ear.userData.sd = sd; G.add(ear);
      ear.userData.tick = t => { ear.rotation.x = sd * (-0.25 - 0.12 * Math.max(0, Math.sin(t * 3 + sd))); }; G.userData.ticks.push(ear.userData.tick);
    }
    put(new THREE.TorusGeometry(0.075, 0.018, 8, 26).rotateX(Math.PI / 2).translate(tx + 0.02, 1.0, 0), SK.M(p.collar || '#d8262e', { r: 0.5, cc: 1 })); put(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 16).rotateZ(Math.PI / 2).translate(tx + 0.1, 0.95, 0), SK.M(0xf2c200, { r: 0.2, m: 1 }));
    put(SK.shell((c, w, h) => { c.fillStyle = p.fur || '#c8955a'; c.fillRect(0, 0, w, h); c.fillStyle = p.light || '#f1dcc0'; c.beginPath(); c.ellipse(128, 120, 54, 110, 0, 0, 7); c.fill(); c.fillStyle = p.dark || '#5e3b22'; c.beginPath(); c.ellipse(360, 80, 46, 34, 0.4, 0, 7); c.fill(); }, 'dog' + (p.fur || '')));
  }, { name: 'Husky', look: { shirt: '#8a9099', hair: '#8a9099', skin: '#8a9099' }, pal: { fur: '#8a9099', light: '#f4f4f2', dark: '#3a3f46', collar: '#2f6fed' } });

/* Hockey Pro: a proper hockey helmet with a visor and a striped jersey */
pskin('hockeypro', 'Hockey Pro', '🏒', { outfit: 'tee', shirt: '#c8102e', hat: 'none', hatCol: '#000', face: 'focus', hair: '#6b4a2b', hairStyle: 'short', skin: '#e8b48a' },
  (G, put, p) => {
    const { hx, hy } = SK.K(), hc = p.helmet || 0xf4f4f2, hm = SK.M(hc, { r: 0.25, cc: 1 });
    put(new THREE.SphereGeometry(0.119, 30, 16, 0, Math.PI * 2, 0, 1.35).scale(1.05, 1, 1).translate(hx - 0.01, hy + 0.005, 0), hm);
    for (const sd of [-1, 1]) put(SK.rbox(0.07, 0.07, 0.015, 0.012).translate(0, 0, 0).rotateY(0).translate(hx - 0.005, hy - 0.04, sd * 0.112), hm);   // ear guards
    for (let i = -1; i <= 1; i++) put(SK.rbox(0.05, 0.012, 0.012, 0.004).translate(hx - 0.02, hy + 0.118, i * 0.035), SK.M(0x222222, { r: 0.6 }));   // vents
    put(new THREE.SphereGeometry(0.128, 28, 10, -0.75, 1.5, 1.25, 0.42).translate(hx, hy - 0.02, 0).rotateY(0), SK.M(0xbfe6ff, { r: 0.05, op: 0.32, ds: 1 }));   // the visor
    put(new THREE.TorusGeometry(0.1, 0.006, 6, 30, Math.PI).rotateZ(Math.PI).rotateY(Math.PI / 2).translate(hx - 0.01, hy - 0.06, 0), SK.M(0x111111, { r: 0.7 }));   // chin strap
    const j = p.jersey || '#c8102e', s2 = p.stripe || '#ffffff';
    put(SK.shell((c, w, h) => { c.fillStyle = j; c.fillRect(0, 0, w, h); c.fillStyle = s2; c.fillRect(0, 170, w, 16); c.fillRect(0, 196, w, 10); c.fillStyle = '#111'; c.fillRect(0, 186, w, 10); PR.text(c, 'VOLT', 128, 86, 50, s2); PR.text(c, '19', 384, 100, 110, s2); c.lineWidth = 6; c.strokeStyle = '#111'; c.strokeText && c.strokeText('19', 384, 100); PR.text(c, '19', 384, 100, 110, s2); }, 'hpro' + j, 1.07));
    G.userData.sleeves = true;
  }, { name: 'Blue Line', look: { shirt: '#0b3d91', skin: '#b07a4f' }, pal: { helmet: 0x0b3d91, jersey: '#0b3d91', stripe: '#ffd23f' } });

/* Ace Pilot: an old-time aviator: leather flying cap with ear flaps, goggles up, bomber jacket with a fleece collar, a long white scarf */
pskin('pilot', 'Ace Pilot', '🛩️', { outfit: 'tee', shirt: '#6b3f22', hat: 'none', hatCol: '#000', face: 'grin', hair: '#3b2a1e', hairStyle: 'buzz', skin: '#e8b48a' },
  (G, put, p) => {
    const { hx, hy, tx, sx } = SK.K(), lea = SK.M(p.leather || '#6b3f22', { r: 0.55, cc: 0.4 }), fleece = SK.M('#efe4cf', { r: 1 });
    put(new THREE.SphereGeometry(0.116, 28, 18, 0, Math.PI * 2, 0, 1.75).translate(hx - 0.008, hy + 0.0, 0), lea);
    for (const sd of [-1, 1]) { put(new THREE.SphereGeometry(0.05, 14, 12).scale(0.5, 1.2, 0.6).translate(hx - 0.01, hy - 0.07, sd * 0.1), lea); put(new THREE.BoxGeometry(0.01, 0.07, 0.012).translate(hx + 0.03, hy - 0.12, sd * 0.07).rotateX(0), SK.M(0x3b2a1e, { r: 0.6 })); }
    const brass = SK.M(0xb8873a, { r: 0.25, m: 1 }), lens = SK.M(p.lens || 0xffb347, { r: 0.05, op: 0.7, m: 0.3 });
    for (const sd of [-1, 1]) { put(new THREE.TorusGeometry(0.03, 0.009, 10, 24).rotateY(Math.PI / 2).rotateZ(-0.6).translate(hx + 0.07, hy + 0.105, sd * 0.042), brass); put(new THREE.CircleGeometry(0.028, 20).rotateY(Math.PI / 2).rotateZ(-0.6).translate(hx + 0.072, hy + 0.106, sd * 0.042), lens); }
    put(new THREE.TorusGeometry(0.118, 0.008, 6, 40).rotateX(Math.PI / 2).rotateZ(-0.5).translate(hx, hy + 0.07, 0), SK.M(0x3b2a1e, { r: 0.6 }));
    put(new THREE.TorusGeometry(0.11, 0.035, 10, 30).rotateX(Math.PI / 2).scale(0.85, 1, 1.15).translate(tx, 1.0, 0), fleece);     // the fleece collar
    put(SK.shell((c, w, h) => { PR.jacket(c, w, h, p.leather || '#6b3f22', '#efe4cf', '#8a5530'); c.fillStyle = '#d8c39a'; for (let y = 30; y < 200; y += 40) { c.beginPath(); c.arc(100, y, 5, 0, 7); c.fill(); } c.fillStyle = '#c0392b'; c.beginPath(); c.arc(384, 96, 46, 0, 7); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(384, 96, 32, 0, 7); c.fill(); c.fillStyle = '#2f6fed'; c.beginPath(); c.arc(384, 96, 18, 0, 7); c.fill(); }, 'pilot' + (p.leather || ''), 1.07));
    /* the scarf: a long white strip from the neck, out behind, fluttering */
    const sc = new THREE.Group(), segs = []; let par = sc; for (let i = 0; i < 6; i++) { const s = new THREE.Group(), m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.075).translate(-0.045, 0, 0), SK.M(p.scarf || '#f4f4f2', { r: 0.9 })); m.castShadow = true; s.add(m); s.position.x = i ? -0.09 : 0; par.add(s); segs.push(s); par = s; }
    sc.position.set(tx - 0.05, 1.0, 0.1); sc.rotation.y = -0.25; G.add(sc); const tick = t => segs.forEach((s, i) => { s.rotation.z = 0.12 + 0.18 * Math.sin(t * 6 - i * 0.9); s.rotation.y = 0.12 * Math.sin(t * 4 - i * 0.7); }); G.userData.ticks.push(tick);
    G.userData.sleeves = true;
  }, { name: 'Night Flight', look: { shirt: '#1b1d20', skin: '#8a5a36' }, pal: { leather: '#2a2c30', lens: 0x3dd6ff, scarf: '#c0392b' } });

/* Trucker: denim cutoff, a trucker hat with a patch, a big beard */
pskin('trucker', 'Trucker', '🚚', { outfit: 'tank', shirt: '#4a6d9c', hat: 'none', hatCol: '#000', face: 'beard', hair: '#6b4a2b', hairStyle: 'short', skin: '#d29a6c' },
  (G, put, p) => {
    const { hx, hy } = SK.K(), back = SK.M(p.mesh || '#c0392b', { r: 0.9 }), front = SK.tex(256, 128, (c, w, h) => { c.fillStyle = p.front || '#f4f4f2'; c.fillRect(0, 0, w, h); c.fillStyle = p.mesh || '#c0392b'; c.beginPath(); c.roundRect ? c.roundRect(70, 30, 116, 64, 10) : c.rect(70, 30, 116, 64); c.fill(); PR.text(c, 'VOLT', 128, 52, 30, '#ffffff'); PR.text(c, 'FREIGHT', 128, 80, 22, '#ffffff'); }, 'trkhat' + (p.mesh || ''));
    put(new THREE.SphereGeometry(0.115, 26, 12, 0, Math.PI * 2, 0, 1.4).scale(1.02, 1.08, 1.02).translate(hx - 0.008, hy + 0.012, 0), back);
    put(new THREE.SphereGeometry(0.118, 26, 12, -0.85, 1.7, 0.05, 1.32).scale(1.02, 1.08, 1.02).translate(hx - 0.006, hy + 0.012, 0), SK.M(0xffffff, { map: front, r: 0.8 }));
    const brim = new THREE.CylinderGeometry(0.08, 0.08, 0.01, 22, 1, false, -Math.PI / 2, Math.PI).scale(1.15, 1, 1.25).rotateZ(-0.08).translate(hx + 0.1, hy + 0.035, 0); put(brim, SK.M(p.mesh || '#c0392b', { r: 0.8 }));
    put(SK.shell((c, w, h) => { c.fillStyle = '#4a6d9c'; c.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'; c.fillRect(Math.random() * w, Math.random() * h, 3, 1); }
      c.strokeStyle = '#e8b45a'; c.lineWidth = 2; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(128, 0); c.lineTo(128, h); c.moveTo(60, 70); c.lineTo(110, 70); c.lineTo(110, 120); c.lineTo(60, 120); c.closePath(); c.moveTo(146, 70); c.lineTo(196, 70); c.lineTo(196, 120); c.lineTo(146, 120); c.closePath(); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#d8d8d8'; for (let y = 30; y < 230; y += 34) { c.beginPath(); c.arc(136, y, 4, 0, 7); c.fill(); } c.fillStyle = 'rgba(255,255,255,0.55)'; for (let x = 0; x < w; x += 6) c.fillRect(x, 0, 3, 5 + Math.random() * 6); }, 'trucker', 1.04));
    G.userData.bare = true;                                              // (a cutoff: bare arms)
  }, { name: 'Night Shift', look: { shirt: '#22303f', skin: '#8a5a36', hair: '#1d1611' }, pal: { mesh: '#1b1d20', front: '#ffd23f' } });

/* Astronaut */
pskin('astro', 'Astronaut', '🧑‍🚀', { outfit: 'tee', shirt: '#eceff3', hat: 'none', hatCol: '#000', face: 'wow', hair: '#3b2a1e', hairStyle: 'buzz', skin: '#e8b48a' },
  (G, put, p) => {
    const { hx, hy, tx } = SK.K();
    put(new THREE.SphereGeometry(0.16, 32, 22).translate(hx, hy, 0), SK.M(0xcfe8ff, { r: 0.02, op: 0.18, ds: 1 })); put(new THREE.SphereGeometry(0.161, 32, 22, 2.4, 2.0, 0.2, 0.9).translate(hx, hy, 0), SK.M(p.visor || 0xd4a63a, { r: 0.05, m: 1, op: 0.55, ds: 1 }));   // bubble helmet with a gold visor up top
    put(new THREE.TorusGeometry(0.125, 0.03, 12, 36).rotateX(Math.PI / 2).translate(tx + 0.01, 1.0, 0), SK.M(p.ring || 0xb9c1ca, { r: 0.3, m: 0.7 }));
    put(SK.shell((c, w, h) => { c.fillStyle = '#eceff3'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(0,0,0,0.08)'; for (let y = 0; y < h; y += 40) c.fillRect(0, y, w, 3); c.fillStyle = p.patch || '#2f6fed'; c.beginPath(); c.arc(90, 90, 30, 0, 7); c.fill(); PR.bolt(c, 90, 90, 0.5, '#ffffff', '#2f6fed'); c.fillStyle = '#c0392b'; c.fillRect(150, 70, 50, 30); c.fillStyle = '#ffffff'; c.fillRect(150, 80, 50, 10);
      c.fillStyle = '#9aa3ad'; c.fillRect(330, 40, 108, 120); c.fillStyle = '#5fd6ff'; c.fillRect(342, 56, 30, 20); c.fillStyle = '#7dff6a'; c.fillRect(380, 56, 44, 8); }, 'astro' + (p.patch || ''), 1.08));
    G.userData.sleeves = true;
  }, { name: 'Mars', look: { shirt: '#f2d6c4', skin: '#8a5a36' }, pal: { visor: 0x3dd6ff, ring: 0xd95d39, patch: '#d95d39' } });

/* Lumberjack: plaid flannel, beanie, big beard, suspenders */
pskin('lumber', 'Lumberjack', '🪓', { outfit: 'tee', shirt: '#b3261e', hat: 'beanie', hatCol: '#2b2b2b', face: 'beard', hair: '#6b4a2b', hairStyle: 'curly', skin: '#e8b48a' },
  (G, put, p) => {
    put(SK.shell((c, w, h) => { PR.plaid(c, w, h, p.a || '#b3261e', p.b || '#1b1d20'); c.fillStyle = '#3b2a1e'; c.fillRect(90, 0, 14, h); c.fillRect(152, 0, 14, h); c.fillRect(350, 0, 14, h); c.fillRect(402, 0, 14, h); }, 'lumber' + (p.a || ''), 1.05));
    G.userData.sleeves = true;
  }, { name: 'Forest', look: { shirt: '#2e7d4f', hatCol: '#d9a400', skin: '#8a5a36', hair: '#1d1611' }, pal: { a: '#2e7d4f', b: '#1b1d20' } });

/* DJ: big headphones on, equaliser tee, neon mohawk */
pskin('dj', 'DJ Volt', '🎧', { outfit: 'tee', shirt: '#121214', hat: 'none', hatCol: '#000', face: 'shades', hair: '#c44dff', hairStyle: 'mohawk', skin: '#b07a4f' },
  (G, put, p) => {
    const { hx, hy } = SK.K(), acc = p.acc || '#c44dff', band = SK.M(0x1b1d20, { r: 0.3, cc: 1 });
    put(new THREE.TorusGeometry(0.12, 0.012, 8, 36, Math.PI).rotateY(Math.PI / 2).translate(hx - 0.01, hy + 0.01, 0), band);
    for (const sd of [-1, 1]) { put(new THREE.CylinderGeometry(0.052, 0.052, 0.04, 24).rotateX(Math.PI / 2).translate(hx - 0.01, hy - 0.01, sd * 0.118), band); put(new THREE.CylinderGeometry(0.035, 0.035, 0.042, 24).rotateX(Math.PI / 2).translate(hx - 0.01, hy - 0.01, sd * 0.119), SK.glow(acc, 1.4)); }
    put(SK.shell((c, w, h) => { c.fillStyle = '#121214'; c.fillRect(0, 0, w, h); const cols = [acc, '#3dd6ff', '#7dff6a', '#ffd23f']; for (let i = 0; i < 9; i++) { const hh = 20 + ((i * 37) % 70); c.fillStyle = cols[i % 4]; c.fillRect(70 + i * 13, 140 - hh, 9, hh); } PR.text(c, 'DROP', 128, 170, 34, '#ffffff'); PR.text(c, 'THE BEAT', 384, 100, 38, acc); }, 'dj' + acc, 1.05));
  }, { name: 'Acid', look: { hair: '#7dff6a', skin: '#e8b48a' }, pal: { acc: '#7dff6a' } });

/* Captain Volt: an original superhero: lightning emblem, mask, a cape over the back of the chair */
pskin('captain', 'Captain Volt', '⚡', { outfit: 'tee', shirt: '#1f4fd1', hat: 'none', hatCol: '#000', face: 'focus', hair: '#1d1611', hairStyle: 'quiff', skin: '#e8b48a' },
  (G, put, p) => {
    const { hx, hy, sx } = SK.K(), cape = p.cape || '#d8262e';
    put(new THREE.SphereGeometry(0.1015, 28, 10, Math.PI - 0.8, 1.6, 1.15, 0.32).translate(hx, hy, 0), SK.M(0x111214, { r: 0.4, cc: 1, ds: 1 }));   // the mask
    put(SK.shell((c, w, h) => { c.fillStyle = p.suit || '#1f4fd1'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(128, 30); c.lineTo(178, 70); c.lineTo(128, 160); c.lineTo(78, 70); c.closePath(); c.fill(); PR.bolt(c, 128, 90, 1.0, cape, '#1a1206'); c.fillStyle = '#ffd23f'; c.fillRect(0, 196, w, 14); }, 'cap' + cape, 1.04));
    const cp = new THREE.Group(), segs = []; let par = cp; for (let i = 0; i < 5; i++) { const s = new THREE.Group(), m = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.11, 0.42 + i * 0.03).translate(0, -0.055, 0), SK.M(cape, { r: 0.7, ds: 1 })); m.castShadow = true; s.add(m); s.position.y = i ? -0.11 : 0; par.add(s); segs.push(s); par = s; }
    cp.position.set(sx - 0.36, 1.08, 0); G.add(cp); G.userData.ticks.push(t => segs.forEach((s, i) => { s.rotation.z = -0.08 - 0.06 * i * Math.max(0, Math.sin(t * 3 - i)); }));
    G.userData.sleeves = true;
  }, { name: 'Midnight', look: { shirt: '#22262b', skin: '#8a5a36' }, pal: { cape: '#ffd23f', suit: '#22262b' } });

/* ================= CART SKINS ================= */
/* paint: body (the bent-plywood bow and the seat), trim (cross pieces, pod ends), accent (the side stripe), base (motor box, mounts) */
const CSKINS = [];
function cskin(id, name, icon, paint, build, alt, free) { CSKINS.push({ id, name, icon, paint, build, pal: {}, free: !!free }); if (alt) CSKINS.push({ id: id + '_2', name: name + ': ' + alt.name, icon, paint: { ...paint, ...(alt.paint || {}) }, build, pal: alt.pal || {}, alt: true }); }
const CK = () => { const K3 = CONFIG.view3d.cart, sx = K3.seatX; return { sx, back: sx - 0.38, nose: 0.4, bk: { x: sx - 0.3, y: 1.04 }, wx: K3.wheelX }; };
const sides = f => [-1, 1].forEach(f);
function decal(tex, w, h, x, y, z, flip) { const g = new THREE.PlaneGeometry(w, h); if (flip) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); g.rotateY(Math.PI); } g.translate(x, y, z); return new THREE.Mesh(g, SK.M(0xffffff, { map: tex, r: 0.35, cc: 1, op: 0.999 })); }
function sideDecals(add, tex, w = 0.46, h = 0.09, x = -0.25, y = 0.335) { sides(sd => add(decal(tex, w, h, x, y, sd * 0.349, sd < 0))); }

cskin('classic', 'Classic Plywood', '🪵', null, null, null, true);
cskin('street', 'Street Neon', '🌃', { body: 0x17181b, trim: 0x2a2d31, accent: 0x7dff6a, base: 0x0c0d0f, matte: true },
  (add, p) => { const ug = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.62).rotateX(-Math.PI / 2), SK.M(p.glow || 0x7dff6a, { op: 0.45, add: 1 })); ug.position.set(-0.15, 0.02, 0); add(ug);
    sideDecals(add, SK.tex(512, 96, (c, w, h) => { c.fillStyle = p.glowCss || '#7dff6a'; c.beginPath(); c.moveTo(0, 60); c.lineTo(w * 0.7, 60); c.lineTo(w * 0.8, 30); c.lineTo(w, 30); c.lineTo(w, 42); c.lineTo(w * 0.82, 42); c.lineTo(w * 0.72, 72); c.lineTo(0, 72); c.fill(); }, 'street' + (p.glowCss || ''))); },
  { name: 'Vapor', paint: { accent: 0xff5fa2, body: 0x2a1748 }, pal: { glow: 0xff5fa2, glowCss: '#ff5fa2' } }, true);

/* Rocket Ship: white and red, fins, portholes, a nose cone and a jet that flares when you go */
cskin('rocket', 'Rocket Ship', '🚀', { body: 0xf2f4f7, trim: 0xd8262e, accent: 0xd8262e, base: 0x2a2d31 },
  (add, p, tick) => {
    const { back, nose } = CK(), red = SK.paint(p.fin || 0xd8262e), metal = SK.M(0x9aa1a7, { r: 0.25, m: 1 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 24).rotateZ(-Math.PI / 2), red); cone.position.set(nose + 0.06, 0.12, 0); add(cone);
    for (const [ry, y, z] of [[0, 0.52, 0], [0, 0.3, 0.22], [0, 0.3, -0.22]]) { const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(-0.22, 0); fs.lineTo(-0.26, 0.2); fs.lineTo(-0.1, 0.06); fs.closePath(); const g = new THREE.ExtrudeGeometry(fs, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 }).translate(0, 0, -0.01); const f = new THREE.Mesh(g, red); f.position.set(back + 0.12, y, z); if (z) f.rotation.x = Math.sign(z) * 1.2; add(f); }
    sides(sd => { for (const x of [-0.05, 0.12]) { add(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 10, 24), SK.chrome()).translateX(x).translateY(0.3).translateZ(sd * 0.352)); add(new THREE.Mesh(new THREE.CircleGeometry(0.033, 20).rotateY(sd < 0 ? Math.PI : 0), SK.M(0x3d9bff, { r: 0.05, m: 0.5, e: 0x0a2a55 })).translateX(x).translateY(0.3).translateZ(sd * 0.351)); } });
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.12, 24, 1, true).rotateZ(Math.PI / 2), SK.M(0x6b7178, { r: 0.3, m: 1, ds: 1 })); noz.position.set(back - 0.06, 0.32, 0); add(noz);
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.068, 20).rotateY(-Math.PI / 2), SK.glow(0xff8a3d, 2)); core.position.set(back - 0.005, 0.32, 0); add(core);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.5, 18, 1, true).rotateZ(Math.PI / 2).translate(-0.25, 0, 0), SK.M(0xffa53d, { op: 0.8, add: 1, ds: 1 })); flame.position.set(back - 0.1, 0.32, 0); add(flame);
    const fl2 = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 14, 1, true).rotateZ(Math.PI / 2).translate(-0.15, 0, 0), SK.M(0xfff1b8, { op: 0.9, add: 1, ds: 1 })); fl2.position.copy(flame.position); add(fl2);
    tick((t, v, boost) => { const k = Math.min(1.6, 0.25 + v * 0.35 + (boost ? 1 : 0)) * (0.85 + 0.25 * Math.random()); flame.scale.set(k, 0.8 + 0.3 * k, 0.8 + 0.3 * k); fl2.scale.set(k, 1, 1); flame.visible = fl2.visible = k > 0.2; });
    sideDecals(add, SK.tex(512, 96, (c, w, h) => { PR.text(c, 'VOLT-1', 150, 48, 60, p.textCss || '#d8262e'); c.fillStyle = p.textCss || '#d8262e'; for (let i = 0; i < 4; i++) c.fillRect(300 + i * 40, 28, 26, 40); }, 'rocket' + (p.textCss || '')), 0.46, 0.09, -0.3);
  }, { name: 'Deep Space', paint: { body: 0x1a2340, trim: 0xffd23f, accent: 0xffd23f }, pal: { fin: 0xffd23f, textCss: '#ffd23f' } });

/* Mouse Mobile: grey, big round ears on the backrest, eyes and a pink nose on the front, whiskers, a long curly tail */
cskin('mouse', 'Mouse Mobile', '🐭', { body: 0x9aa3ad, trim: 0xf29bb5, accent: 0xf29bb5, base: 0x5e6670 },
  (add, p, tick) => {
    const { bk, nose, back } = CK(), fur = SK.M(p.fur || 0x9aa3ad, { r: 0.8 }), pink = SK.M(0xf29bb5, { r: 0.6 }), black = SK.M(0x0e0e10, { r: 0.08, cc: 1 });
    sides(sd => { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.035, 36).rotateX(Math.PI / 2), fur); e.position.set(bk.x - 0.02, bk.y + 0.08, sd * 0.2); e.rotation.y = sd * 0.25; add(e);
      const i = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.038, 36).rotateX(Math.PI / 2), pink); i.position.copy(e.position); i.position.x += 0.008; i.rotation.copy(e.rotation); add(i);
      const ey = new THREE.Mesh(new THREE.SphereGeometry(0.035, 18, 14).scale(0.6, 1, 1), black); ey.position.set(nose - 0.1, 0.22, sd * 0.11); add(ey); const hl = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), SK.M(0xffffff, { e: 0xffffff, ei: 0.8 })); hl.position.set(nose - 0.08, 0.235, sd * 0.1); add(hl);
      for (const a of [-0.25, 0, 0.25]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.2, 4).rotateX(Math.PI / 2), black); w.position.set(nose + 0.0, 0.14 + a * 0.05, sd * 0.1); w.rotation.y = a; w.rotation.z = a * 0.3; add(w); } });
    const nz = new THREE.Mesh(new THREE.SphereGeometry(0.035, 18, 14), SK.M(0xff6f9f, { r: 0.3, cc: 1 })); nz.position.set(nose + 0.02, 0.14, 0); add(nz);
    const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push(new THREE.Vector3(back - 0.05 - u * 0.4, 0.3 + Math.sin(u * 4) * 0.12 + u * 0.15, Math.sin(u * 7) * 0.12)); }
    const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.012, 8), pink); const tg = new THREE.Group(); tg.position.set(back - 0.05, 0.3, 0); tail.position.set(-(back - 0.05), -0.3, 0); tg.add(tail); add(tg);
    tick(t => { tg.rotation.y = 0.35 * Math.sin(t * 2.4); tg.rotation.z = 0.12 * Math.sin(t * 3.1); });
  }, { name: 'Snow Mouse', paint: { body: 0xf4f4f2, trim: 0x9bd3ff, accent: 0x9bd3ff, base: 0xb9c1ca }, pal: { fur: 0xf4f4f2 } });

/* Big Rig: a little truck: chrome grille and headlights, two smoke stacks puffing, mud flaps */
cskin('bigrig', 'Big Rig', '🚛', { body: 0xb3121d, trim: 0xd9dee3, accent: 0xffd23f, base: 0x1b1d20, trimChrome: true },
  (add, p, tick) => {
    const { nose, back, sx } = CK(), ch = SK.chrome();
    const gr = new THREE.Mesh(SK.rbox(0.05, 0.14, 0.28, 0.015), ch); gr.position.set(nose - 0.04, 0.17, 0); add(gr);
    for (let i = -3; i <= 3; i++) add(new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.12, 0.008), SK.M(0x1b1d20, { r: 0.5 })).translateX(nose - 0.035).translateY(0.17).translateZ(i * 0.035));
    sides(sd => { const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.02, 20).rotateZ(Math.PI / 2), SK.glow(0xfff6d8, 1.8)); hl.position.set(nose - 0.06, 0.2, sd * 0.17); add(hl);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 18), ch); st.position.set(sx - 0.4, 0.75, sd * 0.24); add(st); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.05, 18), SK.M(0x1b1d20, { r: 0.4 })); cap.position.set(sx - 0.4, 1.13, sd * 0.24); add(cap);
      const fl = new THREE.Mesh(SK.rbox(0.012, 0.12, 0.1, 0.006), SK.rubber()); fl.position.set(back - 0.02, 0.1, sd * 0.24); add(fl); });
    const puffs = []; for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), SK.M(0x6b6f75, { r: 1, op: 0.5 })); s.visible = false; s.userData = { t: i * 0.12, sd: i % 2 ? 1 : -1 }; puffs.push(s); add(s); }
    tick((t, v, boost, dt) => { for (const s of puffs) { const u = s.userData; u.t += dt * (1 + v * 0.3); const k = u.t % 1.2; s.visible = true; s.position.set(sx - 0.4 - k * 0.25, 1.17 + k * 0.5, u.sd * 0.24); s.scale.setScalar(0.5 + k * 1.6); s.material.opacity = 0.55 * (1 - k / 1.2); } });
    sideDecals(add, SK.tex(512, 96, (c, w, h) => { c.fillStyle = p.stripeCss || '#ffd23f'; for (let i = 0; i < 3; i++) c.fillRect(0, 22 + i * 18, w - i * 60, 8); PR.text(c, 'VOLT HAULING', 300, 70, 30, '#ffffff'); }, 'rig' + (p.stripeCss || '')));
  }, { name: 'Midnight Run', paint: { body: 0x111214, accent: 0x3dd6ff }, pal: { stripeCss: '#3dd6ff' } });

/* Chopper: black and chrome, flames down the sides, twin pipes */
cskin('chopper', 'Chopper', '🔥', { body: 0x0f1012, trim: 0xd9dee3, accent: 0xff7a1c, base: 0x1b1d20, trimChrome: true },
  (add, p) => {
    const { back, sx } = CK(), ch = SK.chrome();
    sides(sd => { const pts = [[sx + 0.1, 0.16, sd * 0.3], [sx - 0.1, 0.14, sd * 0.36], [back - 0.02, 0.2, sd * 0.36], [back - 0.14, 0.3, sd * 0.34]].map(a => new THREE.Vector3(...a)); add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.025, 12), ch));
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.06, 16).rotateZ(Math.PI / 2 - 0.4), ch); tip.position.set(back - 0.16, 0.31, sd * 0.34); add(tip); });
    sideDecals(add, SK.tex(512, 96, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, p.f1 || '#ffd23f'); g.addColorStop(0.5, p.f2 || '#ff7a1c'); g.addColorStop(1, p.f3 || '#d8262e'); c.fillStyle = g;
      c.beginPath(); c.moveTo(w, 10); for (let i = 0; i < 6; i++) { const x = w - 60 - i * 70; c.quadraticCurveTo(x + 30, 20 + (i % 2) * 20, x, 8 + (i % 3) * 8); c.quadraticCurveTo(x - 10, 48, x - 40, 40); } c.lineTo(0, 48); for (let i = 5; i >= 0; i--) { const x = w - 60 - i * 70; c.quadraticCurveTo(x - 20, 70, x, 88 - (i % 3) * 8); c.quadraticCurveTo(x + 30, 80, x + 50, 86); } c.lineTo(w, 86); c.closePath(); c.fill(); }, 'flames' + (p.f2 || '')), 0.5, 0.09, -0.2);
  }, { name: 'Blue Flame', paint: { accent: 0x3dd6ff }, pal: { f1: '#ffffff', f2: '#3dd6ff', f3: '#2f6fed' } });

/* Tour Rig (Rockstar): amp stacks behind the seat, lightning bolts */
cskin('tour', 'Tour Rig', '🎤', { body: 0x4b1d8f, trim: 0x111214, accent: 0xffd23f, base: 0x111214, metallic: true },
  (add, p, tick) => {
    const { sx } = CK(), amp = SK.M(0x15161a, { r: 0.7 }), grill = SK.M(0x2a2c30, { r: 0.9 }), gold = SK.M(0xc9a227, { r: 0.25, m: 1 });
    const cones = [];
    sides(sd => { const b = new THREE.Mesh(SK.rbox(0.16, 0.3, 0.2, 0.015), amp); b.position.set(sx - 0.38, 0.62, sd * 0.2); add(b); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.16).rotateY(-Math.PI / 2), grill); f.position.set(sx - 0.461, 0.62, sd * 0.2); add(f);
      for (const y of [0.55, 0.69]) { const cn = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.02, 0.02, 20).rotateZ(Math.PI / 2), SK.M(0x0a0a0b, { r: 0.6 })); cn.position.set(sx - 0.468, y, sd * 0.2); add(cn); cones.push(cn); add(new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.005, 6, 20).rotateY(Math.PI / 2), gold).translateX(sx - 0.47).translateY(y).translateZ(sd * 0.2)); } });
    tick(t => { const k = 1 + 0.08 * Math.abs(Math.sin(t * 8)); cones.forEach(c => c.scale.set(1, k, k)); });
    sideDecals(add, SK.tex(512, 96, (c, w, h) => { for (let i = 0; i < 4; i++) PR.bolt(c, 60 + i * 120, 48, 0.9, p.bolt || '#ffd23f'); }, 'tour' + (p.bolt || '')));
  }, { name: 'Platinum', paint: { body: 0xcfd3d8, accent: 0xff5fa2, metallic: true }, pal: { bolt: '#ff5fa2' } });

/* Dev Rig (Software Engineer): graphite, glowing circuit traces, a colour-cycling underglow */
cskin('devrig', 'Dev Rig', '🖥️', { body: 0x2a2d33, trim: 0x15171a, accent: 0x3dd6ff, base: 0x101113, matte: true },
  (add, p, tick) => {
    const ug = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.62).rotateX(-Math.PI / 2), SK.M(0xffffff, { op: 0.5, add: 1 })).translateX(-0.15).translateY(0.02); ug.material = ug.material.clone(); add(ug);
    tick(t => { ug.material.color.setHSL((t * 0.08) % 1, 0.9, 0.55); });
    sideDecals(add, SK.tex(512, 96, (c, w, h) => { c.strokeStyle = p.trace || '#3dd6ff'; c.fillStyle = p.trace || '#3dd6ff'; c.lineWidth = 3; for (let i = 0; i < 9; i++) { let x = 10 + i * 56, y = 18 + (i % 3) * 26; c.beginPath(); c.moveTo(x, y); x += 30; c.lineTo(x, y); y += 18; c.lineTo(x + 16, y); c.stroke(); c.beginPath(); c.arc(x + 16, y, 5, 0, 7); c.fill(); } PR.text(c, '{ }', 460, 50, 48, p.trace || '#3dd6ff', 'Consolas, monospace', '700'); }, 'dev' + (p.trace || '')));
    const scr = new THREE.Mesh(SK.rbox(0.012, 0.09, 0.14, 0.006), SK.M(0x111111, { r: 0.3 })); const { sx } = CK(); scr.position.set(sx + 0.42, 0.7, -0.25); add(scr); const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.072).rotateY(Math.PI / 2), SK.glow(p.screen || 0x2f9bff, 1.2)); glow.position.set(sx + 0.427, 0.7, -0.25); add(glow);
  }, { name: 'Terminal', paint: { accent: 0x7dff6a }, pal: { trace: '#7dff6a', screen: 0x1aff6a } });

/* Star Cruiser (Star Knight): pearl panels, swept winglets, a glowing engine strip */
cskin('cruiser', 'Star Cruiser', '🛸', { body: 0xe8ebf0, trim: 0x3a3f46, accent: 0x3dd6ff, base: 0x2a2d33, metallic: true },
  (add, p) => {
    const { back } = CK(), panel = SK.paint(p.panel || 0xe8ebf0), glow = SK.glow(p.glow || 0x3dd6ff, 2);
    sides(sd => { const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.lineTo(-0.36, 0); ws.lineTo(-0.44, 0.2); ws.lineTo(-0.2, 0.2); ws.closePath(); const g = new THREE.ExtrudeGeometry(ws, { depth: 0.015, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2 }); const w = new THREE.Mesh(g, panel); w.rotation.x = -Math.PI / 2 * sd; w.position.set(0.05, 0.26, sd * 0.34); add(w);
      const tipG = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.012), glow); tipG.position.set(-0.27, 0.27, sd * 0.54); add(tipG); });
    const eng = new THREE.Mesh(SK.rbox(0.03, 0.06, 0.4, 0.01), glow); eng.position.set(back - 0.02, 0.3, 0); add(eng);
  }, { name: 'Dark Side', paint: { body: 0x16181c, accent: 0xff3b3b }, pal: { panel: 0x16181c, glow: 0xff3b3b } });

/* Dog House (Good Boy): a red kennel roof over the backrest, paw prints, a bone on the nose, a wagging tail */
cskin('doghouse', 'Dog House', '🦴', { body: 0xb3261e, trim: 0xf4f4f2, accent: 0xf4f4f2, base: 0x3b2a1e },
  (add, p, tick) => {
    const { bk, nose, back } = CK(), roof = SK.M(p.roof || 0x3b2a1e, { r: 0.8 }), white = SK.M(0xf4f4f2, { r: 0.5 });
    sides(sd => { const r = new THREE.Mesh(SK.rbox(0.3, 0.02, 0.32, 0.008), roof); r.position.set(bk.x + 0.02, bk.y + 0.1, sd * 0.13); r.rotation.x = sd * 0.6; add(r); });
    const bone = new THREE.Group(); bone.add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 12).rotateX(Math.PI / 2), white)); sides(sd => { for (const dy of [-0.02, 0.02]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 10), white); k.position.set(0, dy, sd * 0.08); bone.add(k); } }); bone.position.set(nose - 0.04, 0.2, 0); add(bone);
    const tail = new THREE.Group(), tm = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.18, 4, 10).translate(0, 0.11, 0), SK.M(p.fur || 0xc8955a, { r: 0.95 })); tail.add(tm); tail.position.set(back - 0.02, 0.35, 0); tail.rotation.z = 0.7; add(tail);
    tick(t => { tail.rotation.x = 0.6 * Math.sin(t * 12); });
    sideDecals(add, SK.tex(512, 96, (c, w, h) => { c.fillStyle = '#f4f4f2'; for (let i = 0; i < 6; i++) { const x = 40 + i * 80, y = 48 + (i % 2 ? -12 : 12); c.beginPath(); c.ellipse(x, y + 6, 13, 11, 0, 0, 7); c.fill(); for (const [dx, dy] of [[-12, -10], [-4, -16], [5, -16], [13, -10]]) { c.beginPath(); c.arc(x + dx, y + dy, 4.5, 0, 7); c.fill(); } } }, 'paws'));
  }, { name: 'Blue Ribbon', paint: { body: 0x2f6fed, base: 0x1b1d20 }, pal: { roof: 0xf4f4f2, fur: 0x8a9099 } });

/* Ice Machine (Hockey Pro): the rink resurfacer: a boxy body, a water tank, a brush, a spinning amber beacon */
cskin('icemachine', 'Ice Machine', '🧊', { body: 0xf4f6f8, trim: 0x0b3d91, accent: 0x0b3d91, base: 0x2a2d33 },
  (add, p, tick) => {
    const { sx, nose, back } = CK(), body = SK.paint(p.box || 0xf4f6f8), blue = SK.paint(p.stripe || 0x0b3d91);
    const box = new THREE.Mesh(SK.rbox(0.42, 0.22, 0.58, 0.04), body); box.position.set(sx - 0.05, 0.25, 0); add(box);
    const st = new THREE.Mesh(SK.rbox(0.43, 0.04, 0.59, 0.01), blue); st.position.set(sx - 0.05, 0.3, 0); add(st);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 24).rotateX(Math.PI / 2), SK.M(0x9fd8ff, { r: 0.2, m: 0.2, op: 0.7 })); tank.position.set(back + 0.02, 0.36, 0); add(tank);
    const brush = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 18).rotateX(Math.PI / 2), SK.M(0x1f6fd1, { r: 0.9 })); brush.position.set(nose - 0.05, 0.05, 0); add(brush);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), SK.chrome()); pole.position.set(sx - 0.38, 1.0, 0.22); add(pole);
    const bea = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.06, 16), SK.glow(0xffa000, 1.6)); bea.position.set(sx - 0.38, 1.27, 0.22); add(bea);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 16, 1, true).rotateZ(Math.PI / 2).translate(0.25, 0, 0), SK.M(0xffa000, { op: 0.25, add: 1, ds: 1 })); const bg = new THREE.Group(); bg.add(beam); bg.position.copy(bea.position); add(bg);
    tick((t, v, b, dt) => { bg.rotation.y = t * 6; brush.rotation.z = -t * 14; });
    sideDecals(add, SK.tex(512, 96, (c, w, h) => { PR.text(c, 'ICE CREW', 256, 48, 56, p.textCss || '#0b3d91'); }, 'ice' + (p.textCss || '')), 0.46, 0.09, -0.4, 0.27);
  }, { name: 'Red Line', paint: { trim: 0xc8102e, accent: 0xc8102e }, pal: { stripe: 0xc8102e, textCss: '#c8102e' } });

/* Biplane (Ace Pilot): lower wings through the sides, a spinning propeller on the nose, a tail */
cskin('biplane', 'Biplane', '✈️', { body: 0xf2c200, trim: 0xb3261e, accent: 0xb3261e, base: 0x3b2a1e },
  (add, p, tick) => {
    const { nose, back } = CK(), wing = SK.paint(p.wing || 0xf2c200), red = SK.paint(p.trimc || 0xb3261e), wood = SK.M(0x6b3f22, { r: 0.5 });
    const w = new THREE.Mesh(SK.rbox(0.18, 0.02, 1.2, 0.01), wing); w.position.set(-0.05, 0.24, 0); add(w); sides(sd => { const tip = new THREE.Mesh(SK.rbox(0.18, 0.022, 0.06, 0.008), red); tip.position.set(-0.05, 0.24, sd * 0.57); add(tip); const rd = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20).rotateX(-Math.PI / 2), SK.M(0xffffff, { r: 0.5 })); rd.position.set(-0.05, 0.252, sd * 0.45); add(rd); const rd2 = new THREE.Mesh(new THREE.CircleGeometry(0.025, 20).rotateX(-Math.PI / 2), red); rd2.position.set(-0.05, 0.253, sd * 0.45); add(rd2); });
    const spin = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.08, 20).rotateZ(-Math.PI / 2), red); spin.position.set(nose + 0.05, 0.16, 0); add(spin);
    const prop = new THREE.Group(); prop.add(new THREE.Mesh(SK.rbox(0.012, 0.36, 0.035, 0.006), wood)); prop.position.set(nose + 0.03, 0.16, 0); add(prop);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.18, 32).rotateY(Math.PI / 2), SK.M(0xffffff, { op: 0.08, ds: 1 })); disc.position.copy(prop.position); add(disc);
    const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(-0.16, 0); fin.lineTo(-0.2, 0.18); fin.lineTo(-0.1, 0.18); fin.closePath(); const f = new THREE.Mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 }).translate(0, 0, -0.006), red); f.position.set(back + 0.06, 0.4, 0); add(f);
    const tp = new THREE.Mesh(SK.rbox(0.14, 0.012, 0.4, 0.006), wing); tp.position.set(back - 0.04, 0.4, 0); add(tp);
    tick((t, v) => { prop.rotation.x = t * (14 + v * 10); disc.visible = true; });
  }, { name: 'Red Baron', paint: { body: 0xb3261e, trim: 0x1b1d20, accent: 0xf4f4f2 }, pal: { wing: 0xb3261e, trimc: 0x1b1d20 } });

/* Pickup (Trucker): a little truck bed behind the seat with crates, a chrome bull bar */
cskin('pickup', 'Pickup', '🛻', { body: 0x2f6fed, trim: 0xf4f4f2, accent: 0xf4f4f2, base: 0x1b1d20 },
  (add, p) => {
    const { back, nose, sx } = CK(), paint = SK.paint(p.bed || 0x2f6fed), wood = SK.M(0xa8743a, { r: 0.7 }), ch = SK.chrome();
    const floor = new THREE.Mesh(SK.rbox(0.3, 0.02, 0.5, 0.008), SK.M(0x2a2d31, { r: 0.8 })); floor.position.set(back - 0.12, 0.38, 0); add(floor);
    sides(sd => { const wl = new THREE.Mesh(SK.rbox(0.3, 0.12, 0.02, 0.008), paint); wl.position.set(back - 0.12, 0.44, sd * 0.25); add(wl); });
    const gate = new THREE.Mesh(SK.rbox(0.02, 0.12, 0.52, 0.008), paint); gate.position.set(back - 0.27, 0.44, 0); add(gate);
    for (const [z, s] of [[-0.1, 0.12], [0.1, 0.1]]) { const c = new THREE.Mesh(SK.rbox(s, s, s, 0.008), wood); c.position.set(back - 0.12, 0.39 + s / 2, z); c.rotation.y = z * 2; add(c); }
    const bar = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.015, 10, 24, Math.PI).rotateZ(-Math.PI / 2).rotateX(Math.PI / 2), ch); bar.position.set(nose - 0.02, 0.14, 0); add(bar);
    sides(sd => { const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.02, 18).rotateZ(Math.PI / 2), SK.glow(0xfff6d8, 1.6)); hl.position.set(nose - 0.06, 0.19, sd * 0.15); add(hl); });
    sideDecals(add, SK.tex(512, 96, (c, w, h) => { c.fillStyle = p.twoCss || '#f4f4f2'; c.fillRect(0, 54, w, 26); PR.text(c, 'HAUL', 120, 36, 34, p.twoCss || '#f4f4f2'); }, 'pick' + (p.twoCss || '')));
  }, { name: 'Ranch', paint: { body: 0x6b3f22, accent: 0xe8d6b3 }, pal: { bed: 0x6b3f22, twoCss: '#e8d6b3' } });

/* Moon Rover (Astronaut): gold foil, a dish antenna, a solar panel */
cskin('rover', 'Moon Rover', '🛰️', { body: 0xd9dee3, trim: 0xc9a227, accent: 0xc9a227, base: 0x2a2d33, metallic: true },
  (add, p, tick) => {
    const { sx, back } = CK(), gold = SK.M(p.foil || 0xc9a227, { r: 0.3, m: 1 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 8), SK.chrome()); pole.position.set(sx - 0.38, 0.95, -0.22); add(pole);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 10, 0, Math.PI * 2, 0, 1.0), SK.M(0xf4f4f2, { r: 0.35, ds: 1 })); const dg = new THREE.Group(); dish.rotation.z = Math.PI / 2; dg.add(dish); dg.position.set(sx - 0.38, 1.25, -0.22); add(dg);
    const sol = new THREE.Mesh(SK.rbox(0.02, 0.26, 0.5, 0.006), SK.M(0x1a2a6c, { r: 0.15, m: 0.6, map: SK.tex(128, 128, (c, w, h) => { c.fillStyle = '#1a2a6c'; c.fillRect(0, 0, w, h); c.strokeStyle = '#8fa8ff'; c.lineWidth = 2; for (let x = 0; x <= w; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y <= h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } }, 'solar') }));
    sol.position.set(back - 0.05, 0.62, 0); sol.rotation.z = 0.4; add(sol);
    sides(sd => { const f = new THREE.Mesh(SK.rbox(0.3, 0.1, 0.012, 0.008), gold); f.position.set(-0.25, 0.25, sd * 0.35); add(f); });
    tick(t => { dg.rotation.y = 0.8 * Math.sin(t * 0.8); });
  }, { name: 'Mars Rover', paint: { body: 0xd95d39, trim: 0xd9dee3, accent: 0xd9dee3 }, pal: { foil: 0xd9dee3 } });

/* Log Hauler (Lumberjack): a rack of logs behind the seat */
cskin('logs', 'Log Hauler', '🌲', { body: 0x2e5e3a, trim: 0x6b3f22, accent: 0xb3261e, base: 0x1b1d20 },
  (add, p) => {
    const { back } = CK(), bark = SK.M(p.bark || 0x5e3b22, { r: 0.95 }), end = SK.M(0xd9b27a, { r: 0.8, map: SK.tex(64, 64, (c, w, h) => { c.fillStyle = '#d9b27a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a8743a'; c.lineWidth = 2; for (let r = 4; r < 32; r += 5) { c.beginPath(); c.arc(32, 32, r, 0, 7); c.stroke(); } }, 'logend') });
    for (const [y, z] of [[0.43, -0.1], [0.43, 0.1], [0.55, 0]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 18).rotateX(Math.PI / 2), [bark, end, end]); l.position.set(back - 0.1, y, z); l.rotation.y = Math.PI / 2; add(l); }
    sides(sd => { const post = new THREE.Mesh(SK.rbox(0.03, 0.3, 0.03, 0.006), SK.M(0x1b1d20, { r: 0.6 })); post.position.set(back - 0.1, 0.48, sd * 0.2); add(post); });
    sideDecals(add, SK.tex(512, 96, (c, w, h) => { PR.plaid(c, w, h, p.p1 || '#b3261e', '#1b1d20'); c.globalCompositeOperation = 'destination-in'; c.fillRect(0, 28, w, 40); }, 'plaidstripe' + (p.p1 || '')));
  }, { name: 'Birch', paint: { body: 0x1b3a5c, trim: 0xe8e2d4, accent: 0xffd23f }, pal: { bark: 0xe8e2d4, p1: '#2f6fed' } });

/* Volt Racer: race car livery, a rear wing, number boards */
cskin('racer', 'Volt Racer', '🏁', { body: 0x1f4fd1, trim: 0xffd23f, accent: 0xffd23f, base: 0x111214 },
  (add, p) => {
    const { back } = CK(), wingM = SK.paint(p.wing || 0x111214);
    const w = new THREE.Mesh(SK.rbox(0.1, 0.015, 0.62, 0.006), wingM); w.position.set(back - 0.04, 0.62, 0); add(w); sides(sd => { const s = new THREE.Mesh(SK.rbox(0.012, 0.24, 0.03, 0.005), wingM); s.position.set(back - 0.02, 0.5, sd * 0.2); add(s); const e = new THREE.Mesh(SK.rbox(0.12, 0.08, 0.008, 0.004), SK.paint(p.endc || 0xffd23f)); e.position.set(back - 0.04, 0.6, sd * 0.31); add(e); });
    sideDecals(add, SK.tex(512, 96, (c, w, h) => { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(256, 48, 40, 0, 7); c.fill(); PR.text(c, '7', 256, 50, 64, '#111214'); c.fillStyle = p.chk || '#ffd23f'; for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) c.fillRect(380 + i * 20, 18 + j * 20, 20, 20); }, 'racer' + (p.chk || '')));
  }, { name: 'Papaya', paint: { body: 0xff7a1c, trim: 0x111214, accent: 0x111214 }, pal: { wing: 0xff7a1c, endc: 0x111214, chk: '#111214' } });

/* ================= putting them on ================= */
const PSK = Object.fromEntries(PSKINS.map(s => [s.id, s])), CSK = Object.fromEntries(CSKINS.map(s => [s.id, s]));
const Skins = {
  expand(look) {                                                          // a look (old or new) -> the full look the renderer understands
    const L = look || {}, ps = PSK[L.ps] ? L.ps : 'rookie', cs = CSK[L.cs] ? L.cs : 'classic', S = PSK[ps];
    return { ...LOOK0, ...S.look, decal: 'none', ps, cs };
  },
  /* the player's extras: built into the outfit group ('cosmetics'), with the layer that hides your own head from your own first-person view */
  dressPlayer(group, look, opts) {
    const G = group.getObjectByName('cosmetics'); if (!G) return; const S = PSK[look.ps]; if (!S || !S.build) return;
    G.userData.ticks = []; const added = []; const put = (geo, mt) => { const me = geo.isMesh || geo.isGroup ? geo : new THREE.Mesh(geo, mt); if (me.userData.shell && opts && opts.shirt) return me;   /* (Volt Hockey: the team jersey goes over the top instead) */ me.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.self = true; } }); G.add(me); added.push(me); return me; };
    const before = new Set(G.children); S.build(G, put, S.pal);
    if (opts && opts.layer !== undefined) G.traverse(o => { if (o.isMesh && (o.userData.self || !before.has(o))) o.layers.set(opts.layer); });
    group.userData.sleeves = G.userData.sleeves !== undefined ? G.userData.sleeves : group.userData.sleeves; group.userData.bare = !!G.userData.bare;
  },
  /* the cart: repaint the bow / trim / stripe / motor box, then add the skin's fascia and add-ons */
  dressCart(group, cs, opts = {}) {
    const S = CSK[cs] || CSK.classic; const old = group.getObjectByName('cartskin'); if (old) group.remove(old);
    for (const ch of group.children) { const part = ch.userData && ch.userData.part; if (!part || !ch.isMesh) continue; if (ch.userData.mat0 === undefined) ch.userData.mat0 = ch.material; ch.material = ch.userData.mat0;
      const P = S.paint; if (!P) continue;
      const pm = c => P.matte ? SK.M(c, { r: 0.75 }) : P.metallic ? SK.M(c, { r: 0.3, m: 0.6, cc: 1 }) : SK.paint(c);
      if (part === 'wood' && P.body !== undefined) ch.material = pm(P.body); else if (part === 'woodEdge' && P.trim !== undefined) ch.material = P.trimChrome ? SK.chrome() : pm(P.trim);
      else if (part === 'team' && P.accent !== undefined && !opts.keepTeam) ch.material = SK.M(P.accent, { r: 0.3, cc: 1, e: P.accent, ei: 0.15 }); else if (part === 'black' && P.base !== undefined) ch.material = SK.M(P.base, { r: 0.5, m: 0.3 }); }
    if (!S.build) return; const X = new THREE.Group(); X.name = 'cartskin'; X.userData.ticks = [];
    S.build(o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; } }); X.add(o); return o; }, S.pal, f => X.userData.ticks.push(f));
    group.add(X);
  },
  tick(group, t, v = 0, boost = false, dt = 0.016) {
    const X = group.getObjectByName('cartskin'), G = group.getObjectByName('cosmetics');
    if (X && X.userData.ticks) for (const f of X.userData.ticks) f(t, v, boost, dt);
    if (G && G.userData.ticks) for (const f of G.userData.ticks) f(t, v, boost, dt);
  }
};

/* the renderer: every look goes through the skins */
{ const dress0 = Avatar.dress.bind(Avatar), cart0 = Avatar.cart.bind(Avatar), clean0 = Avatar.cleanLook.bind(Avatar), rand0 = Avatar.randomLook;
  Avatar.dress = function (group, look, opts = {}) { if (!group || !look) return dress0(group, look, opts); const L = Skins.expand(look); dress0(group, L, opts); Skins.dressPlayer(group, L, opts); Skins.dressCart(group, L.cs, { keepTeam: !!opts.shirt }); };
  Avatar.cart = function (look) { return cart0(look); };
  Avatar.cleanLook = function (L) { if (!L || typeof L !== 'object') return null; return { ps: PSK[L.ps] ? L.ps : 'rookie', cs: CSK[L.cs] ? L.cs : 'classic' }; };
  Avatar.randomLook = function (seed) { const r = Look.rnd(seed * 7919 + 13), pick = a => a[Math.floor(r() * a.length)]; return { ps: pick(PSKINS).id, cs: pick(CSKINS).id }; };
}
/* your own look: a player skin and a cart skin (an old saved look becomes the Rookie on the Classic cart) */
{ const lk = Progress.look.bind(Progress); Progress.look = function () { const L = lk() || {}; return { ps: PSK[L.ps] ? L.ps : 'rookie', cs: CSK[L.cs] ? L.cs : 'classic' }; }; }

/* every frame: animate the skins (tails, flames, smoke, scarves, Lil Bro's wave) */
{ const P = View3D.prototype, upd = P.update;
  P.update = function (dt) { const r = upd.call(this, dt), t = performance.now() / 1000; for (const c of this.carts || []) { const ch = c.ch, v = Math.hypot(ch.vx || 0, ch.vy || 0), boost = (ch.dr && ch.dr.boost > 0) || ch.boostLeft > 0 || (ch.gs && ch.gs.boost > 0); Skins.tick(c.group, t, v, boost, dt); } return r; };
  const S = LobbyStage.prototype, rd = S.render;
  S.render = function (dt, frame) { const t = performance.now() / 1000; if (this.cart) Skins.tick(this.cart, t, 0, false, dt); if (this.mates) for (const M of this.mates.values()) Skins.tick(M.cart, t, 0, false, dt); return rd.call(this, dt, frame); };
}

/* a better-looking head: a neck, ears and a nose (every driver) */
{ const P = View3D.prototype, cg = P.cartGeometry;
  P.cartGeometry = function () { const G = cg.call(this); if (!G.better) { const { tx, hx, hy } = SK.K(), ex = [new THREE.CylinderGeometry(0.045, 0.05, 0.12, 14).translate(tx + 0.015, 1.01, 0), G3.sphere(0.024, hx - 0.005, hy - 0.005, 0.098, 0.55, 1, 0.5, 12), G3.sphere(0.024, hx - 0.005, hy - 0.005, -0.098, 0.55, 1, 0.5, 12), G3.sphere(0.016, hx + 0.099, hy - 0.012, 0, 1.1, 1, 0.9, 10)];
    if (G.parts.selfSkin) G.parts.selfSkin = G3.merge([G.parts.selfSkin, ...ex]); G.better = true; } return G; };
}

/* ================= the locker, the pass and the emote wheel for skins ================= */
/* ten more emotes (all body moves; the emoji pop-ups are gone) */
Object.assign(ACTIONS, {
  a_volt: { name: 'Volt Charge', icon: '⚡', dur: 2.6 }, a_karate: { name: 'Karate Chop', icon: '🥋', dur: 2.4 }, a_juggle: { name: 'Juggle', icon: '🤹', dur: 3.0 }, a_overclap: { name: 'Big Applause', icon: '👐', dur: 2.6 },
  a_callme: { name: 'Call Me', icon: '🤙', dur: 2.2 }, a_salsa: { name: 'Salsa', icon: '🪇', dur: 3.4, legs: 1 }, a_windmill: { name: 'Windmill', icon: '🌀', dur: 2.8 }, a_hug: { name: 'Self Hug', icon: '🤗', dur: 2.4 },
  a_trumpet: { name: 'Trumpet', icon: '🎺', dur: 2.8 }, a_think: { name: 'Deep Thought', icon: '🤔', dur: 2.6 }
});
{ const pose1 = Rig.pose.bind(Rig);
  Rig.pose = function (name, t, extra = {}) {
    const { tx, px, hx, hy } = this.K(), s = Math.sin, c = Math.cos, A = Math.abs, up = [tx, 1.0, 0.9], upL = [tx, 1.0, -0.9], dL = [px + 0.05, 0.67, -0.25], dR = [px + 0.1, 0.71, 0.25];
    switch (name) {
      case 'a_volt': { const k = Math.min(1, t * 1.4), z = 0.04 * s(t * 40) * k; return { R: [tx + 0.12 + z, 1.0 + 0.45 * k, 0.32], L: [tx + 0.12 - z, 1.0 + 0.45 * k, -0.32], pr: up, pl: upL }; }
      case 'a_karate': { const k = Math.floor(t * 3) % 2; return { R: [tx + (k ? 0.55 : 0.2), k ? 0.85 : 1.25, 0.18], L: [tx + (k ? 0.2 : 0.5), 1.0, -0.2], pr: [tx, 1.3, 0.9] }; }
      case 'a_juggle': { const a = t * 8; return { R: [tx + 0.35, 0.92 + 0.12 * Math.max(0, s(a)), 0.2], L: [tx + 0.35, 0.92 + 0.12 * Math.max(0, -s(a)), -0.2] }; }
      case 'a_overclap': { const k = A(s(t * 7)); return { R: [tx + 0.15, 1.45, 0.04 + 0.22 * k], L: [tx + 0.15, 1.45, -0.04 - 0.22 * k], pr: up, pl: upL }; }
      case 'a_callme': return { R: [hx + 0.06, hy - 0.02, 0.12], L: dL, thumb: 1, pr: [tx + 0.1, 0.9, 0.7] };
      case 'a_salsa': { const k = s(t * 7); return { R: [tx + 0.25, 1.15 + 0.1 * k, 0.4], L: [tx + 0.3, 0.9, -0.32 + 0.08 * k], pr: up, FR: [0.3 + 0.08 * k, 0.26, 0.12], FL: [0.3 - 0.08 * k, 0.26, -0.12] }; }
      case 'a_windmill': { const a = t * 9; return { R: [tx + 0.1 + 0.35 * c(a), 1.0 + 0.35 * s(a), 0.38], L: dL, pr: [tx - 0.2, 1.0, 1.0] }; }
      case 'a_hug': { const k = Math.min(1, t * 2), w = 0.03 * s(t * 5); return { R: [tx + 0.12, 0.9 + w, -0.2 * k + 0.3 * (1 - k)], L: [tx + 0.12, 0.92 - w, 0.2 * k - 0.3 * (1 - k)] }; }
      case 'a_trumpet': { const k = 0.03 * s(t * 12); return { R: [hx + 0.24, hy - 0.05 + k, 0.04], L: [hx + 0.34, hy - 0.04 + k, -0.03], pr: [tx + 0.2, 0.8, 0.6], pl: [tx + 0.2, 0.8, -0.6] }; }
      case 'a_think': return { R: [hx + 0.1, hy - 0.11, 0.03], L: [tx + 0.18, 0.78, -0.02], pr: [tx + 0.3, 0.75, 0.5] };
    }
    return pose1(name, t, extra);
  };
}

/* the lists: player skins and cart skins (the old hats, hair and colours are retired) */
COS.pskins = PSKINS.map(s => ({ id: s.id, name: s.name, icon: s.icon, tier: s.free ? 0 : null }));
COS.cskins = CSKINS.map(s => ({ id: s.id, name: s.name, icon: s.icon, tier: s.free ? 0 : null }));
COS.emojis = [];
COS.actions = Object.entries(ACTIONS).map(([id, a], i) => ({ id, name: a.name, icon: a.icon, tier: i < 10 ? 0 : null }));   // (10 emotes from the start)
/* the season pass, again: a player skin, an emote, a cart skin, an emote... (the first look of every skin before the second colourways) */
{ PASS.length = 0; const byAlt = L => [...L.filter(x => !/_2$/.test(x.id)), ...L.filter(x => /_2$/.test(x.id))], left = { ps: byAlt(COS.pskins.filter(x => x.tier === null)), cs: byAlt(COS.cskins.filter(x => x.tier === null)), action: COS.actions.filter(x => x.tier === null) };
  const order = ['ps', 'action', 'cs', 'action']; let t = 1, i = 0, g = 0;
  while (t <= SEASON1.tiers && g++ < 1000) { const k = order[i++ % order.length], it = left[k].shift(); if (!it) continue; it.tier = t; PASS[t++] = { slot: k, ...it }; }
  const rest = [...left.ps, ...left.cs, ...left.action]; rest.forEach((it, j) => { it.tier = Math.max(2, Math.round((j + 1) * SEASON1.tiers / (rest.length + 1))); });
}
WHEEL0.splice(0, 8, 'a_wave', 'a_thumbs', 'a_cheer', 'a_clap', 'a_pump', 'a_salute', 'a_point', 'a_flex');
LOCKER_SLOTS.splice(0, LOCKER_SLOTS.length, { key: 'ps', name: 'PLAYER SKIN', list: () => COS.pskins }, { key: 'cs', name: 'CART SKIN', list: () => COS.cskins }, { key: 'wheel', name: 'EMOTE WHEEL', wheel: true });
/* an old wheel with emojis on it: those slots get emotes instead */
{ const d = Object.getOwnPropertyDescriptor(Progress, 'P');
  Object.defineProperty(Progress, 'P', { configurable: true, get() { const P = d.get.call(this); if (P.wheel.some(e => !ACTIONS[e])) { const free = COS.actions.filter(a => a.tier === 0).map(a => a.id).filter(id => !P.wheel.includes(id)); P.wheel = P.wheel.map(e => ACTIONS[e] ? e : free.shift() || 'a_wave'); } return P; } }); }
