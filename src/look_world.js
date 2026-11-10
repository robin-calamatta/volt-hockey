/* A more realistic outdoors (v11.4): a painted sky with clouds and a sun glow, haze that thickens with distance, hills / mountains /
   a skyline / mesas on the horizon, leafy trees with bark, building fronts with windows, and corrugated metal. Used by Volt Royale
   (modes_br_draw.js) and the sky of the race maps (scenes_mini.js). */
const LookWorld = {
  cache: {},
  noise(seed) {                                                             // smooth 1D / 2D value noise
    const r = Look.rnd(seed), T = Array.from({ length: 512 }, () => r()), f = t => t * t * (3 - 2 * t);
    const n1 = x => { const i = Math.floor(x), k = x - i; return T[i & 511] + (T[(i + 1) & 511] - T[i & 511]) * f(k); };
    const n2 = (x, y) => { const i = Math.floor(x), j = Math.floor(y), u = f(x - i), v = f(y - j), h = (a, b) => T[(a * 57 + b * 131) & 511];
      const a = h(i, j) + (h(i + 1, j) - h(i, j)) * u, b = h(i, j + 1) + (h(i + 1, j + 1) - h(i, j + 1)) * u; return a + (b - a) * v; };
    return { n1, n2 };
  },
  haze(sky) { return new THREE.Color(sky).lerp(new THREE.Color(0xf4f1ea), 0.5); },
  /* the sky: an equirectangular painting (zenith to hazy horizon, a sun glow, clouds) used as the scene background */
  sky(sky, seed = 3) {
    const key = 'sky' + sky + ':' + seed; if (this.cache[key]) return this.cache[key];
    const W = 1024, H = 512, cv = Look.canvas(W); cv.height = H; const c = cv.getContext('2d'), r = Look.rnd(seed * 7919 + 1);
    const zen = new THREE.Color(sky).multiplyScalar(0.78), hz = this.haze(sky), gnd = hz.clone().multiplyScalar(0.82), css = col => '#' + col.getHexString();
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, css(zen)); g.addColorStop(0.32, css(new THREE.Color(sky))); g.addColorStop(0.49, css(hz)); g.addColorStop(0.5, css(hz)); g.addColorStop(1, css(gnd));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const sx = W * 0.14, sy = H * 0.14, sg = c.createRadialGradient(sx, sy, 0, sx, sy, 170); sg.addColorStop(0, 'rgba(255,250,235,1)'); sg.addColorStop(0.06, 'rgba(255,246,222,0.95)'); sg.addColorStop(0.25, 'rgba(255,240,210,0.35)'); sg.addColorStop(1, 'rgba(255,240,210,0)');
    c.fillStyle = sg; c.fillRect(0, 0, W, H / 2);
    for (let i = 0; i < 90; i++) {                                         // clouds: clusters of soft puffs, flatter and smaller towards the horizon
      const y = H * (0.1 + Math.pow(r(), 0.6) * 0.37), k = (H / 2 - y) / (H / 2), x = r() * W, w = (30 + r() * 70) * (0.35 + k), puffs = 5 + Math.floor(r() * 7);
      for (let p = 0; p < puffs; p++) { const px = x + (r() - 0.5) * w * 1.6, py = y + (r() - 0.5) * w * 0.25 * (0.4 + k), pr = w * (0.25 + r() * 0.35);
        for (const ox of [0, W, -W]) { const cg = c.createRadialGradient(px + ox, py, 0, px + ox, py, pr); cg.addColorStop(0, `rgba(255,255,255,${0.32 + 0.3 * k})`); cg.addColorStop(0.6, `rgba(250,250,252,${0.12 + 0.12 * k})`); cg.addColorStop(1, 'rgba(250,250,252,0)'); c.fillStyle = cg; c.save(); c.translate(px + ox, py); c.scale(1, 0.45 + 0.25 * k); c.translate(-(px + ox), -py); c.beginPath(); c.arc(px + ox, py, pr, 0, 7); c.fill(); c.restore(); } }
    }
    const t = new THREE.CanvasTexture(cv); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding; return (this.cache[key] = t);
  },
  /* a ring on the horizon: rolling hills, mountains or flat-topped mesas, fading into the haze */
  ring(R, amp, base, col, seed, mesa) {
    const N = 360, nz = this.noise(seed), pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const a = i / N * Math.PI * 2, u = i / N * 24; let h = base + amp * (0.55 * nz.n1(u) + 0.3 * nz.n1(u * 2.7 + 9) + 0.15 * nz.n1(u * 7 + 3));
      if (mesa) h = base + amp * (nz.n1(u * 0.8) > 0.48 ? 0.9 + 0.1 * nz.n1(u * 6) : 0.12 + 0.1 * nz.n1(u * 5));
      const rr = R + (nz.n1(u + 40) - 0.5) * R * 0.15; pos.push(Math.cos(a) * rr, -2, Math.sin(a) * rr, Math.cos(a) * rr, h, Math.sin(a) * rr);
      if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: 1, side: THREE.DoubleSide }));
  },
  /* a tree canopy: a few lumpy, overlapping blobs (built once) */
  canopyGeo() {
    if (this.cache.canopy) return this.cache.canopy; const nz = this.noise(77), parts = [];
    for (const [x, y, z, s] of [[0, 0, 0, 1], [0.55, -0.15, 0.2, 0.72], [-0.5, -0.1, -0.25, 0.75], [0.1, 0.35, -0.45, 0.66], [-0.2, 0.3, 0.5, 0.62], [0.15, -0.4, -0.1, 0.6]]) {
      const g = new THREE.IcosahedronGeometry(s, 1), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), k = 1 + (nz.n2(vx * 3 + x * 9, vz * 3 + vy * 3 + z * 9) - 0.5) * 0.45; p.setXYZ(i, vx * k + x, vy * k * 0.85 + y, vz * k + z); }
      parts.push(g.index ? g.toNonIndexed() : g);
    }
    const geo = G3.merge(parts); geo.computeVertexNormals(); return (this.cache.canopy = geo);
  },
  leafMat() {
    if (this.cache.leaf) return this.cache.leaf; const n = 128, cv = Look.canvas(n), c = cv.getContext('2d'), r = Look.rnd(41); c.fillStyle = '#5c7f45'; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 2600; i++) { const v = r(); c.fillStyle = v < 0.35 ? '#2f4a22' : v < 0.7 ? '#4f7438' : v < 0.92 ? '#76a052' : '#a5c477'; c.globalAlpha = 0.5 + r() * 0.5; c.beginPath(); c.ellipse(r() * n, r() * n, 1 + r() * 2.2, 0.6 + r() * 1.2, r() * 3, 0, 7); c.fill(); }
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
    return (this.cache.leaf = new THREE.MeshStandardMaterial({ map: t, roughness: 0.92, bumpMap: t, bumpScale: 0.04 }));
  },
  barkMat() {
    if (this.cache.bark) return this.cache.bark; const n = 128, cv = Look.canvas(n), c = cv.getContext('2d'), r = Look.rnd(19); c.fillStyle = '#5a4330'; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 260; i++) { c.strokeStyle = r() < 0.6 ? '#3b2b1e' : '#7a6048'; c.globalAlpha = 0.4 + r() * 0.5; c.lineWidth = 1 + r() * 2; c.beginPath(); let x = r() * n; c.moveTo(x, 0); for (let y = 0; y <= n; y += 16) { x += (r() - 0.5) * 4; c.lineTo(x, y); } c.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3);
    return (this.cache.bark = new THREE.MeshStandardMaterial({ map: t, roughness: 0.97, bumpMap: t, bumpScale: 0.06 }));
  },
  /* trees as instanced trunks + canopies: list of { x, y, r (trunk radius), h (trunk height), s (canopy size) } */
  trees(list, tint = 0, shadows = true) {
    const n = list.length, g = new THREE.Group(); if (!n) return g; const r = Look.rnd(n * 31 + 7), X = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.75, 1, 1, 9).translate(0, 0.5, 0), this.barkMat(), n), crown = new THREE.InstancedMesh(this.canopyGeo(), this.leafMat(), n);
    list.forEach((t, i) => {
      trunk.setMatrixAt(i, X.compose(new THREE.Vector3(t.x, 0, t.y), q.identity(), new THREE.Vector3(t.r, t.h, t.r)));
      const s = t.s, lean = new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.2, r() * 6.28, (r() - 0.5) * 0.2));
      crown.setMatrixAt(i, X.compose(new THREE.Vector3(t.x, t.h + s * 0.45, t.y), lean, new THREE.Vector3(s * (0.9 + r() * 0.2), s * (0.8 + r() * 0.3), s * (0.9 + r() * 0.2))));
      crown.setColorAt(i, col.setHSL(0.24 + tint + (r() - 0.5) * 0.06, 0.25 + r() * 0.25, 0.75 + r() * 0.3));
    });
    trunk.castShadow = crown.castShadow = shadows; crown.receiveShadow = shadows; g.add(trunk, crown); return g;
  },
  /* building fronts: a texture for one 3 m bay of one storey (BR.H tall): wall, a window with frame and sky reflection */
  facade(kind0) {
    const key = 'fa' + kind0; if (this.cache[key]) return this.cache[key]; const [kind, tint] = kind0.split('#');   // (v14.2.2: 'house#a0523d' = a house front in that colour)
    const n = 256, cv = Look.canvas(n), c = cv.getContext('2d'), rc = Look.canvas(n), rq = rc.getContext('2d'), r = Look.rnd(kind0.length * 101);
    const wall = tint ? '#' + tint : { bldg: '#b9b3a7', mall: '#d8d3c8', house: '#d4c2a6', metal: '#8e959c' }[kind] || '#b0aba0';
    c.fillStyle = wall; c.fillRect(0, 0, n, n); rq.fillStyle = '#e0e0e0'; rq.fillRect(0, 0, n, n);
    for (let i = 0; i < 1600; i++) { c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'; c.fillRect(r() * n, r() * n, 1 + r() * 2, 1 + r() * 2); }
    if (kind === 'metal') {                                                 // corrugated siding: ribs, and a little rust
      for (let x = 0; x < n; x += 16) { const g = c.createLinearGradient(x, 0, x + 16, 0); g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(0.5, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0.25)'); c.fillStyle = g; c.fillRect(x, 0, 16, n); }
      for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(120,60,25,0.18)'; c.fillRect(r() * n, n * (0.6 + r() * 0.4), 3 + r() * 10, 10 + r() * 40); }
      rq.fillStyle = '#7a7a7a'; rq.fillRect(0, 0, n, n);
    } else {
      if (kind === 'house') for (let y = 0; y < n; y += 14) { c.fillStyle = 'rgba(0,0,0,0.13)'; c.fillRect(0, y, n, 2); c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(0, y + 2, n, 2); }   // clapboard
      else { c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 0, n, 3); c.fillRect(0, 0, 3, n); }                                                // panel joints
      const big = kind === 'mall', x0 = big ? 18 : 58, x1 = big ? n - 18 : n - 58, y0 = big ? 40 : 62, y1 = big ? n - 70 : n - 92;            // canvas y 0 = the top of the storey
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x0 - 2, y1, x1 - x0 + 4, 8);                                                                // the sill's shadow
      c.fillStyle = '#e9e7e1'; c.fillRect(x0 - 7, y0 - 7, x1 - x0 + 14, y1 - y0 + 14);                                                       // the frame
      const gl = c.createLinearGradient(0, y0, 0, y1); gl.addColorStop(0, '#9fb4c6'); gl.addColorStop(0.45, '#4d6273'); gl.addColorStop(1, '#2a3540'); c.fillStyle = gl; c.fillRect(x0, y0, x1 - x0, y1 - y0);
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.moveTo(x0, y0 + (y1 - y0) * 0.7); c.lineTo(x0 + (x1 - x0) * 0.45, y0); c.lineTo(x0 + (x1 - x0) * 0.6, y0); c.lineTo(x0, y1); c.fill();   // a glint
      c.fillStyle = '#e9e7e1'; c.fillRect((x0 + x1) / 2 - 3, y0, 6, y1 - y0); if (!big) c.fillRect(x0, (y0 + y1) / 2 - 3, x1 - x0, 6);
      rq.fillStyle = '#262626'; rq.fillRect(x0, y0, x1 - x0, y1 - y0);                                                                         // glass is glossy
    }
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    const rt = new THREE.CanvasTexture(rc); rt.wrapS = rt.wrapT = THREE.RepeatWrapping;
    return (this.cache[key] = new THREE.MeshStandardMaterial({ map: t, roughnessMap: rt, roughness: 1, metalness: kind === 'metal' ? 0.35 : 0.05, bumpMap: Look.grain(), bumpScale: 0.02 }));
  },
  /* the storm wall: a violet haze, thick at the bottom, fading upwards, with streaks */
  stormTex() {
    if (this.cache.storm) return this.cache.storm; const W = 256, H = 128, cv = Look.canvas(W); cv.height = H; const c = cv.getContext('2d'), r = Look.rnd(5);
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(150,110,255,0)'); g.addColorStop(0.55, 'rgba(140,100,250,0.45)'); g.addColorStop(1, 'rgba(110,70,230,0.85)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(230,215,255,${0.05 + r() * 0.12})`; c.fillRect(r() * W, H * 0.3 + r() * H * 0.7, 1 + r() * 3, H); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.repeat.set(8, 1); t.encoding = THREE.sRGBEncoding; return (this.cache.storm = t);
  },
  /* the big picture round a Volt Royale map */
  dressBR(v3, group, mapKey, T, W, D) {
    const hi = Settings.gfx !== 'Low', many = Settings.gfx === 'High' || !Settings.gfx, cx = W / 2, cy = D / 2, Rm = Math.max(W, D) / 2, r = Look.rnd(W * 13 + D);
    const sky = this.sky(T.sky, mapKey.length); v3.scene.background = sky; v3.scene.fog = new THREE.FogExp2(this.haze(T.sky), 0.0074);   // (v14.2.2: a touch thicker, so the camera's 220 m limit is never seen)
    const at = (mesh) => { mesh.position.x += cx; mesh.position.z += cy; group.add(mesh); return mesh; };
    const land = { downtown: 0x6c7a6a, port: 0x6f7c84, suburbs: 0x5d7f48, jungle: 0x3f6a3a, canyon: 0xb36a40 }[mapKey] || 0x6a7a5a, far = { canyon: 0xc08a6a }[mapKey] || 0x8a9aa8;
    at(this.ring(Rm + 230, 70, 18, far, 11, false));                        // far mountains (mostly haze)
    at(this.ring(Rm + 120, mapKey === 'canyon' ? 26 : 14, mapKey === 'canyon' ? 2 : 3, land, 23, mapKey === 'canyon'));   // near hills / mesas
    if (mapKey === 'downtown' || mapKey === 'port') {                      // a skyline
      const n = many ? 120 : 60, box = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), this.facade('bldg').clone(), n), X = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
      box.material.map = box.material.map.clone(); box.material.map.repeat.set(3, 6); box.material.map.needsUpdate = true;
      for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = Rm + 45 + r() * (mapKey === 'port' ? 60 : 110), w = 8 + r() * 16, h = (mapKey === 'port' ? 8 : 14) + Math.pow(r(), 1.8) * (mapKey === 'port' ? 25 : 70);
        box.setMatrixAt(i, X.compose(new THREE.Vector3(cx + Math.cos(a) * d, 0, cy + Math.sin(a) * d), q.setFromAxisAngle(V3UP, r() * 3), new THREE.Vector3(w, h, w * (0.7 + r() * 0.6)))); box.setColorAt(i, col.setHSL(0.58 + r() * 0.06, 0.05 + r() * 0.08, 0.55 + r() * 0.35)); }
      group.add(box);
    }
    if (mapKey === 'port') { const sea = new THREE.Mesh(G3.layFlat(new THREE.PlaneGeometry(900, 300)), new THREE.MeshStandardMaterial({ color: 0x3c5a6e, roughness: 0.15, metalness: 0.3 })); sea.position.set(cx, -0.3, D + 160); group.add(sea); }
    if (mapKey === 'suburbs' || mapKey === 'jungle' || mapKey === 'downtown') {   // woods round the map, thicker further out
      const list = [], n = (mapKey === 'jungle' ? 520 : mapKey === 'suburbs' ? 300 : 120) * (many ? 1 : hi ? 0.6 : 0.35);
      for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = Rm + 10 + Math.pow(r(), 0.7) * 100, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; if (x > -6 && x < W + 6 && y > -6 && y < D + 6) continue; const s = 2.6 + r() * 2.6; list.push({ x, y, r: 0.28 + r() * 0.15, h: 2.5 + r() * 3, s: mapKey === 'jungle' ? s * 1.3 : s }); }
      group.add(this.trees(list, mapKey === 'jungle' ? 0.02 : 0, false));   // (too far away to need shadows)
    }
    if (mapKey === 'canyon') {                                              // boulders and scrub on the desert floor
      const n = many ? 70 : 35, rock = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xa86a45, roughness: 0.95, flatShading: true }), n), X = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = Rm + 8 + r() * 90, s = 0.6 + Math.pow(r(), 2) * 4; rock.setMatrixAt(i, X.compose(new THREE.Vector3(cx + Math.cos(a) * d, s * 0.3, cy + Math.sin(a) * d), q.setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), new THREE.Vector3(s, s * (0.5 + r() * 0.4), s * (0.8 + r() * 0.4)))); }
      rock.castShadow = true; group.add(rock);
    }
  }
};
