/* A more realistic look for every game (v11.1): image-based lighting and reflections from a generated sky (outdoors) or arena lights
   (indoors), fine surface grain on every material, softer fill light, and real-looking ground textures (asphalt, concrete, grass, dirt). */
const Look = {
  cache: {},
  canvas(n) { const c = document.createElement('canvas'); c.width = c.height = n; return c; },
  rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; },
  /* a tiling grain texture (grey) used as a bump map on everything */
  grain() {
    if (this.cache.grain) return this.cache.grain; const n = 128, cv = this.canvas(n), c = cv.getContext('2d'), img = c.createImageData(n, n), r = this.rnd(7);
    for (let i = 0; i < n * n; i++) { const v = 110 + r() * 60 + (r() < 0.04 ? 50 : 0); img.data.set([v, v, v, 255], i * 4); }
    c.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return (this.cache.grain = t);
  },
  /* ground and wall surfaces */
  tex(kind) {
    if (this.cache[kind]) return this.cache[kind];
    const n = 256, cv = this.canvas(n), c = cv.getContext('2d'), r = this.rnd(kind.length * 977 + 13), P = {
      asphalt: ['#3e4146', 3200, ['#2f3236', '#4c5056', '#55595f', '#35383c']], concrete: ['#9c9b96', 1800, ['#8a8984', '#aeada8', '#94938e', '#b5b3ad']],
      grass: ['#4d7a35', 4200, ['#3f6b2c', '#5a8a3e', '#6a9a48', '#44722f']], dirt: ['#a8764a', 2600, ['#93653d', '#b8875a', '#9c6c42', '#c4946a']],
      jungle: ['#3d6630', 4200, ['#2f5526', '#4a7838', '#355d2a', '#5a8a40']], sand: ['#c9a876', 2000, ['#b8986a', '#d6b888', '#c09c6c']]
    }[kind] || ['#888888', 1500, ['#777', '#999']];
    c.fillStyle = P[0]; c.fillRect(0, 0, n, n);
    for (let i = 0; i < P[1]; i++) { c.fillStyle = P[2][Math.floor(r() * P[2].length)]; c.globalAlpha = 0.25 + r() * 0.5; const s = kind === 'grass' || kind === 'jungle' ? 1 + r() * 2 : 1 + r() * 3; if (kind === 'grass' || kind === 'jungle') c.fillRect(r() * n, r() * n, 1, 2 + r() * 4); else c.fillRect(r() * n, r() * n, s, s); }
    c.globalAlpha = 0.045; for (let i = 0; i < 10; i++) { c.fillStyle = r() < 0.7 ? '#000' : '#fff'; c.beginPath(); c.arc(r() * n, r() * n, 20 + r() * 50, 0, 7); c.fill(); }   // large soft, faint blotches
    if (kind === 'concrete' || kind === 'asphalt') { c.globalAlpha = 0.35; c.strokeStyle = '#2a2a2a'; c.lineWidth = 1; for (let i = 0; i < 5; i++) { c.beginPath(); let x = r() * n, y = r() * n; c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 30; c.lineTo(x, y); } c.stroke(); } }   // hairline cracks
    c.globalAlpha = 1; const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return (this.cache[kind] = t);
  },
  /* the light the world reflects: a sky (outdoors) or a dark hall with bright lights (indoors) */
  env(outdoor, sky) {
    const key = 'env' + (outdoor ? sky : 'in'); if (this.cache[key]) return this.cache[key];
    const r = Render3D.r; if (!r || !THREE.PMREMGenerator) return null;
    const scene = new THREE.Scene(), geo = new THREE.SphereGeometry(50, 32, 16), cols = [], top = new THREE.Color(outdoor ? sky : 0x3a3f48).multiplyScalar(outdoor ? 1.1 : 1), hor = new THREE.Color(outdoor ? 0xf2efe6 : 0x6b6560), bot = new THREE.Color(outdoor ? 0x5a5448 : 0x2a2622);
    const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 50, col = y > 0 ? hor.clone().lerp(top, Math.pow(y, 0.6)) : hor.clone().lerp(bot, Math.pow(-y, 0.5)); cols.push(col.r, col.g, col.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    if (outdoor) { const sun = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff1dc).multiplyScalar(6) })); sun.position.set(-20, 30, -25); scene.add(sun); }
    else for (let i = 0; i < 6; i++) { const lamp = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff6e8).multiplyScalar(4) })); lamp.position.set((i % 3 - 1) * 16, 40, (i < 3 ? -1 : 1) * 10); scene.add(lamp); }
    const pm = new THREE.PMREMGenerator(r), tex = pm.fromScene(scene, 0.04).texture; pm.dispose(); return (this.cache[key] = tex);
  },
  /* fine grain and reflections on every standard material in a scene (run again now and then: new things appear) */
  dress(scene) {
    const grain = this.grain();
    scene.traverse(o => { const ms = o.isMesh ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const mt of ms) { if (!mt || !mt.isMeshStandardMaterial || mt.userData.dressed) continue; mt.userData.dressed = true; if (!mt.bumpMap && !mt.transparent) { mt.bumpMap = grain; mt.bumpScale = 0.012; } mt.envMapIntensity = mt.metalness > 0.3 ? 1 : 0.55; mt.needsUpdate = true; } });
  }
};
{ const P = View3D.prototype, lights = P.buildLights, render = P.render, mat = P.mat;
  P.buildLights = function () {
    lights.call(this);
    const m = this.m, M = m && m.mini && modeOf(m), outdoor = !!(m && (m.map || (M && M.outdoor))), sky = outdoor ? (m.map ? (RACE_THEMES[m.map.theme] || RACE_THEMES.grass).sky : MODES.br.map(m).theme.sky) : 0;
    const env = Look.env(outdoor, sky); if (env) this.scene.environment = env;
    this.scene.traverse(o => { if (o.isHemisphereLight) o.intensity *= 0.55; else if (o.isDirectionalLight && o !== this.sun) o.intensity *= 0.5; });   // the sky now lights things: less flat fill
    if (this.sun) { this.sun.color.setHex(outdoor ? 0xfff1dc : 0xfffaf2); this.sun.intensity *= outdoor ? 1.15 : 1; this.sun.shadow.radius = 3; }
  };
  P.render = function (vps, dt) { const now = performance.now(); if (!this.dressedAt || now - this.dressedAt > 2000) { this.dressedAt = now; Look.dress(this.scene); } return render.call(this, vps, dt); };
}
