/* The 3D view of a match, drawn with Three.js (lib/three.min.js).
   Nothing here changes the game: it reads the Match (carts, ball, nets, score) and the Crowd every frame and draws them.
   Court coordinates are metres with x along the rink and y across it; in 3D that is (x, height, y), so the floor is the y = 0 plane.
   One WebGL canvas (Render3D) sits under the Phaser canvas, which keeps drawing the menus, scoreboard and every other overlay on top.
   A GameScene owns one View3D (its own Three scene) and asks it to draw one or more viewports (split screen) each frame. */

if (typeof THREE !== 'undefined' && THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;   // colours are written as normal (sRGB) hex values; without this they come out washed out

const Render3D = {
  ok: null, r: null, canvas: null, w: 0, h: 0, l: 0, t: 0, pr: 0,
  ensure() {                                                   // make the shared renderer the first time it is needed; false if this device cannot do WebGL
    if (this.ok !== null) return this.ok;
    try {
      if (typeof THREE === 'undefined') throw new Error('Three.js did not load');
      const canvas = document.createElement('canvas'); canvas.id = 'view3d';
      canvas.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:0;display:none';
      (document.getElementById('stage') || document.body).prepend(canvas);
      const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.08;
      r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.setScissorTest(true); r.autoClear = false;
      this.r = r; this.canvas = canvas; this.ok = true;
    } catch (e) { console.warn('3D view not available, using the 2D view', e); this.ok = false; }
    return this.ok;
  },
  quality() { const Q = CONFIG.view3d.quality; return Q[Settings.gfx] || (Settings.touch ? Q.Medium : Q.High); },
  show(on) { if (this.canvas) this.canvas.style.display = on ? 'block' : 'none'; },
  sync() {                                                     // lie exactly under the Phaser canvas (which letterboxes itself to fit the window)
    const gc = window.voltGame && voltGame.canvas; if (!gc || !this.r) return null;
    if (gc.style.position !== 'relative') { gc.style.position = 'relative'; gc.style.zIndex = '1'; }
    const b = gc.getBoundingClientRect(), pr = Math.min(window.devicePixelRatio || 1, this.quality().pixelRatio);
    if (b.width !== this.w || b.height !== this.h || b.left !== this.l || b.top !== this.t || pr !== this.pr) {
      this.w = b.width; this.h = b.height; this.l = b.left; this.t = b.top; this.pr = pr;
      Object.assign(this.canvas.style, { left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px' });
      this.r.setPixelRatio(pr); this.r.setSize(Math.max(1, b.width), Math.max(1, b.height), false);
    }
    return b;
  }
};

/* ----- small geometry helpers ----- */
const V3UP = typeof THREE !== 'undefined' ? new THREE.Vector3(0, 1, 0) : null;
const G3 = {
  box(w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) { const g = new THREE.BoxGeometry(w, h, d); if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz))); return g.translate(x, y, z); },
  sphere(r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 12) { return new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.75 | 0)).scale(sx, sy, sz).translate(x, y, z); },
  cap(r, x, y, z, sx = 1, sy = 1, sz = 1) { return new THREE.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(sx, sy, sz).translate(x, y, z); },
  limb(a, b, r0, r1 = r0, seg = 8) {                         // a rounded cylinder from point a to point b
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = new THREE.Vector3().subVectors(B, A), len = d.length();
    const g = new THREE.CylinderGeometry(r1, r0, len, seg); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3UP, d.clone().normalize()));
    return g.translate(A.x + d.x / 2, A.y + d.y / 2, A.z + d.z / 2);
  },
  ribbon(pts, h, t, seg = 48) {                               // a flat strip (h tall, t thick) swept along a smooth path through pts [x, y, z]: bent plywood
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), pos = [], idx = [], n = seg;
    for (let i = 0; i <= n; i++) {
      const u = i / n, p = curve.getPointAt(u), tg = curve.getTangentAt(u), k = Math.hypot(tg.x, tg.z) || 1, sx = -tg.z / k * t / 2, sz = tg.x / k * t / 2;
      pos.push(p.x + sx, p.y + h / 2, p.z + sz, p.x + sx, p.y - h / 2, p.z + sz, p.x - sx, p.y - h / 2, p.z - sz, p.x - sx, p.y + h / 2, p.z - sz);
    }
    for (let i = 0; i < n; i++) for (let f = 0; f < 4; f++) { const a = i * 4 + f, b = i * 4 + (f + 1) % 4, c = a + 4, d = b + 4; idx.push(a, c, b, b, c, d); }
    const cap = (o, flip) => flip ? idx.push(o, o + 1, o + 2, o, o + 2, o + 3) : idx.push(o, o + 2, o + 1, o, o + 3, o + 2); cap(0, false); cap(n * 4, true);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  },
  merge(list) {                                                // many small shapes with one material -> one mesh (far fewer draw calls)
    const geos = list.map(g => g.index ? g.toNonIndexed() : g); let n = 0;
    for (const g of geos) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
    for (const g of geos) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.computeBoundingSphere(); return out;
  },
  roundedRect(x, y, w, h, r, seg = 10) {                       // corner points of a rounded rectangle in court metres (x, y), clockwise on screen
    const pts = [], c = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
    for (const [cx, cy, a0] of c) for (let i = 0; i <= seg; i++) { const a = a0 + (Math.PI / 2) * i / seg; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return pts;
  },
  shape(pts) { return new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, -y))); },    // court (x, y) -> shape space; laid flat with layFlat()
  layFlat(g) { return g.rotateX(-Math.PI / 2); },              // shape space (x, -y, up) -> 3D (x, up, y)
  canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; },
  css(col, a = 1) { return `rgba(${(col >> 16) & 255},${(col >> 8) & 255},${col & 255},${a})`; }
};

/* A pen with the same calls as a Phaser Graphics object, drawing onto a 2D canvas instead.
   That lets the 3D floor reuse the 2D game's court drawing (planks, tiles, lines, creases) unchanged. */
class CanvasPen {
  constructor(ctx) { this.c = ctx; }
  fillStyle(col, a = 1) { this.c.fillStyle = G3.css(col, a); return this; }
  lineStyle(w, col, a = 1) { this.c.lineWidth = w; this.c.strokeStyle = G3.css(col, a); return this; }
  fillRect(x, y, w, h) { this.c.fillRect(x, y, w, h); return this; }
  strokeRect(x, y, w, h) { this.c.strokeRect(x, y, w, h); return this; }
  lineBetween(a, b, c, d) { const x = this.c; x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); return this; }
  fillEllipse(x, y, w, h) { const c = this.c; c.beginPath(); c.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill(); return this; }
  fillCircle(x, y, r) { return this.fillEllipse(x, y, 2 * r, 2 * r); }
  strokeCircle(x, y, r) { const c = this.c; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); return this; }
  beginPath() { this.c.beginPath(); return this; }
  moveTo(x, y) { this.c.moveTo(x, y); return this; }
  lineTo(x, y) { this.c.lineTo(x, y); return this; }
  strokePath() { this.c.stroke(); return this; }
  fillPath() { this.c.fill(); return this; }
  path(pts, close) { const c = this.c; c.beginPath(); pts.forEach((p, i) => { const x = p.x !== undefined ? p.x : p[0], y = p.y !== undefined ? p.y : p[1]; if (i) c.lineTo(x, y); else c.moveTo(x, y); }); if (close) c.closePath(); }
  fillPoints(pts, close = true) { this.path(pts, close); this.c.fill(); return this; }
  strokePoints(pts, close = false) { this.path(pts, close); this.c.stroke(); return this; }
  roundRect(x, y, w, h, r) { this.path(G3.roundedRect(x, y, w, h, r), true); }
  fillRoundedRect(x, y, w, h, r) { this.roundRect(x, y, w, h, r); this.c.fill(); return this; }
  strokeRoundedRect(x, y, w, h, r) { this.roundRect(x, y, w, h, r); this.c.stroke(); return this; }
}

/* ----- the view ----- */
class View3D {
  constructor(scene) {
    this.sc = scene; this.m = scene.match; this.win = (scene.setup && scene.setup.win) || null;   // a demo on a menu: drawn into its window
    this.mats = {}; this.cams = new Map(); this.shakeLeft = 0; this.fanAcc = 1;
    const A = CONFIG.view3d.arena;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(A.fog); this.scene.fog = new THREE.Fog(A.fog, A.fogNear, A.fogFar);
    this.buildLights(); this.buildArena(); this.buildCarts(); this.buildBall(); this.buildFans();
  }
  mat(color, opts = {}) {                                       // one material per colour (and finish), shared
    const key = color + '/' + (opts.rough || 0.6) + '/' + (opts.metal || 0) + (opts.emissive ? '/e' : '');
    return this.mats[key] || (this.mats[key] = new THREE.MeshStandardMaterial({ color, roughness: opts.rough || 0.6, metalness: opts.metal || 0, emissive: opts.emissive ? color : 0x000000, emissiveIntensity: opts.emissive || 0 }));
  }
  teamColor(side) { return TEAMS[this.m.teams[side]].color; }

  buildLights() {
    const C = CONFIG.court, Q = Render3D.quality();
    this.scene.add(new THREE.HemisphereLight(0xe8f0ff, 0x4a3a2a, 0.55));
    const sun = this.sun = new THREE.DirectionalLight(0xffffff, 1.05);         // the arena lights, from high up and a little to one side
    sun.position.set(C.width / 2 - 7, 22, C.height / 2 - 9); sun.target.position.set(C.width / 2, 0, C.height / 2);
    sun.castShadow = Q.shadows; sun.shadow.mapSize.set(Q.shadowMap, Q.shadowMap); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    const s = sun.shadow.camera; s.left = -20; s.right = 20; s.top = 15; s.bottom = -15; s.near = 5; s.far = 50;
    this.scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(0xbfd4ff, 0.35); fill.position.set(C.width / 2 + 8, 12, C.height / 2 + 10); this.scene.add(fill);
  }
  applyQuality() { const Q = Render3D.quality(); this.sun.castShadow = Q.shadows; if (this.sun.shadow.mapSize.x !== Q.shadowMap) { this.sun.shadow.mapSize.set(Q.shadowMap, Q.shadowMap); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } } if (this.fans) this.fans.group.visible = Q.fans; }

  /* ----- the arena: floor, boards, nets, stands ----- */
  buildArena() {
    if (this.arena) { this.scene.remove(this.arena); this.arena.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); }); }
    const g = this.arena = new THREE.Group(), C = CONFIG.court, A = CONFIG.view3d.arena, S = this.sc.surf();
    // the playing floor: the 2D game's court drawing, painted onto a canvas
    const tex = new THREE.CanvasTexture(this.floorCanvas(S)); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = Render3D.r.capabilities.getMaxAnisotropy();
    tex.repeat.set(1 / C.width, 1 / C.height); tex.offset.set(0, 1);         // shape uvs are court metres (x, -y)
    const rink = G3.roundedRect(0, 0, C.width, C.height, C.cornerRadius, 14);
    const floor = new THREE.Mesh(G3.layFlat(new THREE.ShapeGeometry(G3.shape(rink))), new THREE.MeshStandardMaterial({ map: tex, roughness: S.kind === 'ice' ? 0.25 : 0.55, metalness: 0 }));
    floor.receiveShadow = true; g.add(floor);
    const outer = new THREE.Mesh(G3.layFlat(new THREE.PlaneGeometry(140, 110)), this.mat(A.outerFloor, { rough: 0.9 }));
    outer.position.set(C.width / 2, -0.01, C.height / 2); outer.receiveShadow = true; g.add(outer);
    // the boards: a rounded ring, with a lighter rim along the top
    const T = A.boardThickness, ring = (h, y0, col, rough) => {
      const sh = G3.shape(G3.roundedRect(-T, -T, C.width + 2 * T, C.height + 2 * T, C.cornerRadius + T, 14)); sh.holes.push(new THREE.Path(rink.slice().reverse().map(([x, y]) => new THREE.Vector2(x, -y))));
      const m = new THREE.Mesh(G3.layFlat(new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 4 })), this.mat(col, { rough }));
      m.position.y = y0; m.castShadow = m.receiveShadow = true; g.add(m); return m;
    };
    ring(A.boardHeight, 0, S.board, 0.7); ring(A.rimHeight, A.boardHeight, S.rim, 0.4);
    for (const n of this.m.nets) g.add(this.buildNet(n));
    this.buildStands(g);
    this.scene.add(g);
  }
  floorCanvas(S) {
    const C = CONFIG.court, A = CONFIG.view3d.arena, cv = G3.canvas(A.floorPxW, A.floorPxH), ctx = cv.getContext('2d'), sc = this.sc;
    const draw = withLogos => {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(cv.width / C.width, 0, 0, cv.height / C.height, 0, 0);
      const pen = new CanvasPen(ctx), L = CONFIG.look; sc.drawSurface(pen, S);
      for (let i = 0; i < L.innerShadowSteps; i++) pen.lineStyle(L.innerShadowWidth * 2 * (1 - i / L.innerShadowSteps), 0x000000, L.innerShadowAlpha).strokeRoundedRect(0, 0, C.width, C.height, C.cornerRadius);
      pen.lineStyle(C.lineWidth, S.line).strokeRoundedRect(0, 0, C.width, C.height, C.cornerRadius).lineBetween(C.width / 2, 0, C.width / 2, C.height).strokeCircle(C.width / 2, C.height / 2, C.centerCircleRadius);
      if (withLogos) [0, 1].forEach(s => { try { const img = sc.textures.get('logo-' + TEAMS[this.m.teams[s]].id).getSourceImage(); ctx.globalAlpha = 0.28; ctx.drawImage(img, C.width * (s ? 0.66 : 0.34) - 2, C.height / 2 - 2, 4, 4); } catch (e) {} ctx.globalAlpha = 1; });
      for (const n of this.m.nets) sc.drawCrease(pen, n);
    };
    draw(true);
    try { ctx.getImageData(0, 0, 1, 1); } catch (e) { draw(false); }          // a logo opened straight from disk can "taint" the canvas, which WebGL refuses: draw without logos
    return cv;
  }
  buildNet(n) {
    const N = CONFIG.view3d.net, g = new THREE.Group(), dir = n.backX > n.mouthX ? 1 : -1, pr = N.post, red = this.mat(N.postColor, { rough: 0.35, metal: 0.2 });
    const parts = [], bx = n.backX, mx = n.mouthX, y1 = n.y1, y2 = n.y2, H = N.height, BH = N.backHeight;
    for (const y of [y1, y2]) {
      parts.push(G3.limb([mx, 0, y], [mx, H, y], pr), G3.limb([mx, H, y], [bx, BH, y], pr * 0.8), G3.limb([bx, BH, y], [bx, 0, y], pr * 0.8), G3.limb([mx, 0.02, y], [bx, 0.02, y], pr * 0.8));
    }
    parts.push(G3.limb([mx, H, y1], [mx, H, y2], pr), G3.limb([bx, BH, y1], [bx, BH, y2], pr * 0.8), G3.limb([bx, 0.02, y1], [bx, 0.02, y2], pr * 0.8));
    const frame = new THREE.Mesh(G3.merge(parts), red); frame.castShadow = true; g.add(frame);
    // the mesh: a see-through grid on the back, sides and roof
    const cv = G3.canvas(128, 128), c = cv.getContext('2d'); c.strokeStyle = G3.css(N.meshColor, 0.85); c.lineWidth = 3;
    for (let i = 0; i <= 128; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 128); c.moveTo(0, i); c.lineTo(128, i); c.stroke(); }
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.encoding = THREE.sRGBEncoding;
    const meshMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false });
    const quad = (a, b, c2, d) => {                              // four corners -> one textured panel (texture repeats every 10 cm)
      const geo = new THREE.BufferGeometry(), P = [a, b, c2, d], len = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]), u = len(a, b) / 0.1, v = len(a, d) / 0.1;
      geo.setAttribute('position', new THREE.Float32BufferAttribute(P.flat(), 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, v], 2));
      geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, meshMat); m.renderOrder = 2; return m;
    };
    g.add(quad([bx, 0, y1], [bx, 0, y2], [bx, BH, y2], [bx, BH, y1]));                                 // back
    g.add(quad([mx, H, y1], [mx, H, y2], [bx, BH, y2], [bx, BH, y1]));                                 // roof
    for (const y of [y1, y2]) g.add(quad([mx, 0, y], [bx, 0, y], [bx, BH, y], [mx, H, y]));             // sides
    return g;
  }
  buildStands(g) {
    const C = CONFIG.court, A = CONFIG.arena, A3 = CONFIG.view3d.arena, x0 = -3.2, w = C.width + 6.4, depth = A.firstRow + A.rows * A.rowGap + 0.3;
    const steps = [[], []], noses = [], rails = [], walls = [];
    for (let stand = 0; stand < 2; stand++) {
      const out = d => stand ? C.height + d : -d;               // d metres out from the boards, on this side
      const bin = this.binArea(), cut = (lo, hi, near) => stand === 0 && near < bin.depth ? [[lo, bin.x0], [bin.x1, hi]] : [[lo, hi]];   // the far side's front rows stop either side of the sin bin
      for (let r = 0; r < A.rows; r++) {
        const top = A3.stepBase + r * A3.stepRise, mid = A.firstRow + r * A.rowGap, near = mid - A.rowGap / 2;
        for (const [a, b] of cut(x0, x0 + w, near)) {
          steps[r % 2].push(G3.box(b - a, top, A.rowGap + 0.02, (a + b) / 2, top / 2, out(mid)));
          noses.push(G3.box(b - a, 0.03, 0.04, (a + b) / 2, top + 0.005, out(near + 0.02)));
        }
      }
      const back = A3.stepBase + A.rows * A3.stepRise;
      walls.push(G3.box(w, back + A3.backWall, 0.3, x0 + w / 2, (back + A3.backWall) / 2, out(depth + 0.15)));
      for (const [a, b] of cut(x0, x0 + w, 1.2)) {
        rails.push(G3.limb([a, A3.railHeight, out(1.2)], [b, A3.railHeight, out(1.2)], 0.025));
        for (let x = a; x <= b + 0.01; x += Math.max(0.5, (b - a) / Math.max(1, Math.round((b - a) / 3.2)))) rails.push(G3.limb([x, 0, out(1.2)], [x, A3.railHeight, out(1.2)], 0.02));
      }
      // advertising banners along the back wall in the two team colours
      for (let x = x0 + 0.3, i = 0; x < x0 + w - 1; x += 3.2, i++) {
        const b = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.8), this.mat(this.teamColor(i % 2), { rough: 0.5, emissive: 0.25 }));
        b.position.set(x + 1.4, back + 0.8, out(depth - 0.01)); b.rotation.y = stand ? Math.PI : 0; g.add(b);
      }
    }
    const add = (list, col, rough, opt = {}) => { if (!list.length) return; const m = new THREE.Mesh(G3.merge(list), this.mat(col, { rough, ...opt })); m.receiveShadow = true; m.castShadow = !!opt.cast; g.add(m); };
    this.buildSinBin(g);
    add(steps[0], 0x59626b, 0.85); add(steps[1], 0x4e565e, 0.85); add(noses, 0x8a949d, 0.5); add(rails, 0xb9c2c9, 0.3, { metal: 0.6 }); add(walls, 0x15191d, 0.9);
    // end walls behind each net, with the team's name in big letters
    [0, 1].forEach(s => {
      const cv = G3.canvas(1024, 256), c = cv.getContext('2d'), col = this.teamColor(s);
      c.fillStyle = G3.css(col); c.fillRect(0, 0, 1024, 256); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 196, 1024, 60);
      c.fillStyle = '#ffffff'; c.font = '800 150px "Barlow Condensed", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(TEAMS[this.m.teams[s]].name.toUpperCase(), 512, 112);
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
      const H = CONFIG.view3d.arena.endWallHeight, x = s === 0 ? -CONFIG.view3d.arena.endWallGap : C.width + CONFIG.view3d.arena.endWallGap;
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(C.height + 8, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }));
      wall.position.set(x, H / 2, C.height / 2); wall.rotation.y = s === 0 ? Math.PI / 2 : -Math.PI / 2; g.add(wall);
    });
  }

  /* ----- the sin bin: a penalty box at the boards on the far side, one per team either side of centre ----- */
  binArea() { const C = CONFIG.court, B = CONFIG.view3d.sinBin, c = C.width / 2; return { x0: c - B.gap / 2 - B.width - 0.1, x1: c + B.gap / 2 + B.width + 0.1, depth: B.depth }; }
  binBox(side) { const C = CONFIG.court, B = CONFIG.view3d.sinBin, c = C.width / 2; return side === 0 ? { x0: c - B.gap / 2 - B.width, x1: c - B.gap / 2 } : { x0: c + B.gap / 2, x1: c + B.gap / 2 + B.width }; }
  binSlot(ch) {                                                // where a benched cart sits: in its team's box, facing the play
    const B = CONFIG.view3d.sinBin, list = this.m.chairs.filter(c => c.side === ch.side && c.benched).sort((a, b) => a.index - b.index), i = Math.max(0, list.indexOf(ch)), box = this.binBox(ch.side);
    return { x: box.x0 + B.slotX + Math.min(i, 2) * B.slotStep, y: -B.slotY, heading: Math.PI / 2 };
  }
  buildSinBin(g) {
    const B = CONFIG.view3d.sinBin, A3 = CONFIG.view3d.arena, T = A3.boardThickness;
    const glass = new THREE.MeshStandardMaterial({ color: 0xd6ecff, transparent: true, opacity: 0.16, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const frame = this.mat(0x9aa4ad, { rough: 0.35, metal: 0.6 }), pane = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass); m.position.set(x, y, z); m.rotation.y = ry; m.renderOrder = 3; g.add(m); };
    this.binClocks = [];
    [0, 1].forEach(s => {
      const { x0, x1 } = this.binBox(s), w = x1 - x0, cx = (x0 + x1) / 2, back = -B.depth, team = this.teamColor(s), parts = [], posts = [];
      parts.push(G3.box(w, 0.02, B.depth - T, cx, 0.01, -(T + B.depth) / 2));                                  // rubber floor
      const wall = new THREE.Mesh(G3.box(w + 0.2, 1.7, 0.12, cx, 0.85, back - 0.06), this.mat(0x1d2329, { rough: 0.8 })); wall.receiveShadow = true; g.add(wall);
      const stripe = new THREE.Mesh(G3.box(w + 0.2, 0.12, 0.01, cx, 1.2, back + 0.006), this.mat(team, { rough: 0.5, emissive: 0.2 })); g.add(stripe);
      g.add(new THREE.Mesh(G3.merge(parts), this.mat(0x23272b, { rough: 0.95 })));
      // glass: on top of the boards in front, and the two ends
      const top = A3.boardHeight + A3.rimHeight, gh = B.glass;
      pane(w, gh - top, cx, top + (gh - top) / 2, -T / 2, 0);
      for (const x of [x0, x1]) { pane(B.depth - T, gh, x, gh / 2, -(T + B.depth) / 2, Math.PI / 2); posts.push(G3.limb([x, gh, back + 0.4], [x, gh, back], 0.02)); }   // frameless glass, so nothing blocks the view from the seats
      g.add(new THREE.Mesh(G3.merge(posts), frame));
      // the sign over the box and the penalty clock beside it
      const cv = G3.canvas(512, 128), c = cv.getContext('2d'); c.fillStyle = '#101418'; c.fillRect(0, 0, 512, 128); c.fillStyle = G3.css(team); c.fillRect(0, 0, 512, 16); c.fillRect(0, 112, 512, 16);
      c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '800 54px "Barlow Condensed", Impact, sans-serif'; c.fillText('SIN BIN', 256, 50); c.font = '700 30px "Barlow Condensed", Impact, sans-serif'; c.fillStyle = G3.css(team); c.fillText(TEAMS[this.m.teams[s]].name.toUpperCase(), 256, 92);
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ map: tex })); sign.position.set(cx, 1.98, back + 0.02); g.add(sign);
      const ccv = G3.canvas(256, 96), ctex = new THREE.CanvasTexture(ccv); ctex.encoding = THREE.sRGBEncoding;
      const clock = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.34), new THREE.MeshBasicMaterial({ map: ctex })); clock.position.set(cx, 1.5, back + 0.02); g.add(clock);
      this.binClocks.push({ side: s, cv: ccv, tex: ctex, text: null });
    });
    this.updateBinClocks(true);
  }
  updateBinClocks(force) {                                     // each box's clock: the time left for whoever is in it
    for (const k of this.binClocks || []) {
      const t = this.m.chairs.filter(c => c.side === k.side && c.benched).map(c => Math.max(0, Math.ceil(c.binLeft))).sort((a, b) => a - b), text = t.length ? Math.floor(t[0] / 60) + ':' + String(t[0] % 60).padStart(2, '0') : '-:--';
      if (!force && text === k.text) continue; k.text = text; const c = k.cv.getContext('2d');
      c.fillStyle = '#0a0d10'; c.fillRect(0, 0, 256, 96); c.fillStyle = t.length ? '#ff5a3c' : '#5a2a22'; c.font = '700 74px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 128, 52); k.tex.needsUpdate = true;
    }
  }

  /* ----- carts ----- */
  /* One volt hockey chair, modelled on the real thing: a bent-plywood bow that runs from behind the seat round both sides and down to a point at the front,
     a wooden bucket seat with a tall backrest, two rolled armrest pods (the joystick on the right one), two grey drive wheels under the seat,
     small rear casters, a footrest inside the bow and the white plastic "t" stick on the nose at ball height.
     Cart space: +x forward, +z to the cart's right, y up. Shapes are grouped by material so each group is one mesh.
     'self' parts (the driver) are hidden from your own first-person camera. Cached by stick length (the only thing that changes the shape). */
  cartGeometry() {
    const key = Settings.stickLength; if (this.cartGeo && this.cartGeoKey === key) return this.cartGeo;
    const cup = CONFIG.cup, K3 = CONFIG.view3d.cart, B = G3.box, L = G3.limb, mirror = pts => pts.map(([x, y, z]) => [x, y, -z]).reverse();
    const P = { wood: [], woodEdge: [], black: [], grey: [], plastic: [], team: [], white: [], selfTeam: [], selfWhite: [], selfSkin: [], selfHair: [], selfPants: [], selfBlack: [], selfWood: [] };
    // The chair is long, like the real ones: the seat sits well back and the legs reach forward to a footrest near the nose.
    // (Only the look is longer: the cart still collides as the same circle, and the stick is where it always was.)
    const sx = K3.seatX;                                                                                                   // centre of the seat, behind the cart's centre
    // the bow: from behind the seat, along the side, sweeping in and down to the nose, and back up the other side
    const side = [[sx - 0.36, 0.36, -0.27], [sx - 0.18, 0.355, -0.31], [sx + 0.08, 0.34, -0.33], [-0.05, 0.32, -0.33], [0.13, 0.27, -0.3], [0.28, 0.19, -0.2], [0.37, 0.13, -0.08], [0.395, 0.115, 0]];   // the nose stops just short of the stick, so the ball in the cup can be seen from the seat
    P.wood.push(G3.ribbon([...side, ...mirror(side).slice(1)], 0.1, 0.028, 64));
    for (const sd of [-1, 1]) P.team.push(G3.ribbon(side.slice(0, 5).map(([x, y, z]) => [x, y + 0.01, sd * -(Math.abs(z) + 0.016)]), 0.035, 0.006));   // a stripe of team colour along each side
    P.woodEdge.push(B(0.05, 0.1, 0.56, sx - 0.38, 0.36, 0));                                                          // the bow's back cross-piece
    // seat: a wooden bucket whose sides rise to the armrests, the tall backrest (rounded top, hand slot) and the black battery / motor box underneath
    P.wood.push(B(0.42, 0.035, 0.44, sx, 0.45, 0));
    for (const sd of [-1, 1]) P.wood.push(G3.ribbon([[sx - 0.21, 0.56, sd * 0.235], [sx + 0.05, 0.56, sd * 0.24], [sx + 0.22, 0.56, sd * 0.25]], 0.22, 0.024, 12));
    const bh = K3.backHeight, bw = K3.backWidth, r = 0.13, sh = new THREE.Shape();
    sh.moveTo(-bw / 2, 0); sh.lineTo(bw / 2, 0); sh.lineTo(bw / 2, bh - r); sh.quadraticCurveTo(bw / 2, bh, bw / 2 - r, bh); sh.lineTo(-bw / 2 + r, bh); sh.quadraticCurveTo(-bw / 2, bh, -bw / 2, bh - r); sh.lineTo(-bw / 2, 0);
    const slot = new THREE.Path(); slot.absellipse(0, bh - 0.075, 0.075, 0.02, 0, Math.PI * 2, false); sh.holes.push(slot);
    P.wood.push(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 8 }).rotateY(Math.PI / 2).rotateZ(K3.backTilt).translate(sx - 0.22, 0.45, 0));
    P.black.push(B(0.5, 0.2, 0.36, sx - 0.02, 0.22, 0), B(0.12, 0.12, 0.5, K3.wheelX, 0.14, 0));                      // battery box and drive motors
    // armrest pods: rolled plywood ends on short rails in front of the seat, the joystick on the right one
    const px = sx + 0.28;
    for (const sd of [-1, 1]) {
      P.wood.push(new THREE.CylinderGeometry(0.068, 0.068, 0.3, 16).rotateZ(Math.PI / 2).translate(px, 0.58, sd * 0.25));
      P.woodEdge.push(new THREE.CylinderGeometry(0.069, 0.069, 0.02, 16).rotateZ(Math.PI / 2).translate(px + 0.155, 0.58, sd * 0.25), B(0.05, 0.24, 0.03, px - 0.08, 0.45, sd * 0.25));
      P.black.push(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 10).rotateX(Math.PI / 2).translate(sx - 0.33, 0.06, sd * 0.2));     // rear casters
      P.grey.push(new THREE.CylinderGeometry(0.06, 0.06, 0.045, 14).rotateX(Math.PI / 2).translate(sx - 0.33, 0.06, sd * 0.2));
    }
    P.black.push(B(0.1, 0.05, 0.1, px + 0.12, 0.655, 0.25), L([px + 0.13, 0.68, 0.25], [px + 0.13, 0.74, 0.25], 0.012), G3.sphere(0.024, px + 0.13, 0.75, 0.25));
    // footrest inside the bow, on a bar from the battery box
    P.selfWood.push(B(0.16, 0.025, 0.3, 0.27, 0.17, 0)); P.black.push(L([sx + 0.22, 0.2, 0], [0.2, 0.16, 0], 0.022));   // (hidden from your own seat, like your legs)
    // the white plastic stick: a mount under the nose, the flat "c" blade and the stem, down at ball height
    const cupY = 0.045, crossX = cup.frontX - cup.recess - 0.02, tipX = cup.frontX - cup.recess + Settings.stickLength;
    P.plastic.push(B(0.06, 0.08, 0.06, 0.39, 0.08, 0), G3.ribbon(CUP_POINTS.map(p => [p.x, cupY, p.y]), 0.07, 0.03), B(0.035, 0.06, 0.3, crossX, cupY, 0), B(tipX - crossX, 0.055, cup.stickColliderRadius * 2, (crossX + tipX) / 2, cupY, 0));
    // the driver: legs out along the chair to the footrest, arms on the pods, harness straps, head and hair
    const tx = sx - 0.07;                                                                                                  // torso
    for (const sd of [-1, 1]) {
      P.selfPants.push(L([tx + 0.02, 0.53, sd * 0.1], [sx + 0.36, 0.56, sd * 0.1], 0.07), L([sx + 0.38, 0.55, sd * 0.1], [0.23, 0.22, sd * 0.1], 0.055));
      P.selfWhite.push(B(0.17, 0.07, 0.09, 0.27, 0.215, sd * 0.1));
      const shd = [tx, 0.96, sd * 0.18], el = [tx + 0.15, 0.74, sd * 0.24], hand = sd > 0 ? [px + 0.1, 0.71, 0.25] : [px + 0.05, 0.67, -0.25];
      P.selfTeam.push(L(shd, el, 0.055, 0.05)); P.selfSkin.push(L(el, hand, 0.04, 0.035), G3.sphere(0.042, ...hand));
      P.selfBlack.push(B(0.012, 0.3, 0.045, tx + 0.128, 0.83, sd * 0.07, 0, 0, -0.1));                             // harness straps
    }
    P.selfBlack.push(B(0.015, 0.045, 0.2, tx + 0.13, 0.75, 0), B(0.015, 0.05, 0.05, tx + 0.135, 0.75, 0));
    P.selfTeam.push(new THREE.CapsuleGeometry(0.15, 0.22, 4, 10).scale(0.85, 1, 1.2).translate(tx, 0.79, 0));
    P.selfWhite.push(B(0.06, 0.04, 0.4, tx, 0.98, 0));
    const hx = tx + 0.02, hy = 1.15;                                                                                       // head centre
    P.selfSkin.push(L([tx + 0.01, 0.97, 0], [hx - 0.005, 1.07, 0], 0.045), G3.sphere(0.1, hx, hy, 0, 0.95, 1.1, 0.9), G3.sphere(0.022, hx - 0.01, hy, 0.09), G3.sphere(0.022, hx - 0.01, hy, -0.09));
    P.selfHair.push(G3.cap(0.106, 0, 0, 0, 0.98, 0.95, 0.94).rotateZ(0.45).translate(hx - 0.012, hy + 0.01, 0));      // tipped back over the crown (turned before it is moved onto the head)
    // drive wheels are separate meshes so they can turn
    const wheelR = 0.135, tyre = new THREE.CylinderGeometry(wheelR, wheelR, 0.07, 24).rotateX(Math.PI / 2);
    const hub = G3.merge([new THREE.CylinderGeometry(0.06, 0.06, 0.08, 14).rotateX(Math.PI / 2), ...[0, 1, 2].map(i => B(0.2, 0.022, 0.075, 0, 0, 0, 0, 0, i * Math.PI / 3))]);
    this.cartGeo = { parts: Object.fromEntries(Object.entries(P).filter(([, l]) => l.length).map(([k, l]) => [k, G3.merge(l)])), tyre, hub, wheelR, wheelX: K3.wheelX, wheelZ: 0.275 };
    this.cartGeoKey = key; return this.cartGeo;
  }
  buildCarts() {
    if (this.carts) for (const c of this.carts) this.scene.remove(c.group, c.ring);
    const G = this.cartGeometry(), num = this.numberTextures || (this.numberTextures = {});
    this.carts = this.m.chairs.map((ch, i) => {
      const team = this.teamColor(ch.side), k = ch.index + ch.side * 3, skin = CROWD_SKIN[(k * 2 + 1) % CROWD_SKIN.length], hair = CROWD_HAIR[(k * 3 + 2) % CROWD_HAIR.length];
      const cols = { wood: [0xd8a46c, 0.55], woodEdge: [0xb07a45, 0.6], black: [0x1b1d20, 0.6], grey: [0x9aa1a7, 0.85], plastic: [0xf4f4f2, 0.35], team: [team, 0.45], white: [0xf0f0f0, 0.5], selfTeam: [team, 0.6], selfWhite: [0xffffff, 0.6], selfSkin: [skin, 0.7], selfHair: [hair, 0.9], selfPants: [0x2f3b55, 0.8], selfBlack: [0x15171a, 0.7], selfWood: [0xd8a46c, 0.55] };
      const group = new THREE.Group(), self = 1 + i;                 // layer 1 + i: this cart's driver, hidden from their own first-person view
      for (const [k2, geo] of Object.entries(G.parts)) {
        const [col, rough, metal] = cols[k2], mesh = new THREE.Mesh(geo, this.mat(col, { rough, metal })); mesh.castShadow = true;
        if (k2.startsWith('self')) mesh.layers.set(self); group.add(mesh);
      }
      const n = ch.index + 1, numTex = num[n] || (num[n] = (() => { const cv = G3.canvas(128, 128), c = cv.getContext('2d'); c.fillStyle = '#fff'; c.font = '800 96px "Barlow Condensed", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), 64, 70); const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t; })());
      const K3 = CONFIG.view3d.cart, bk = new THREE.Group(); bk.position.set(K3.seatX - 0.22, 0.45, 0); bk.rotation.z = K3.backTilt; group.add(bk);   // leans with the backrest
      const plate = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), this.mat(team, { rough: 0.5 })), num1 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ map: numTex, transparent: true }));   // the number on the back of the backrest
      for (const [mesh, off] of [[plate, 0.01], [num1, 0.013]]) { mesh.position.set(-off, K3.backHeight * 0.52, 0); mesh.rotation.y = -Math.PI / 2; bk.add(mesh); }
      const wheels = [-1, 1].map(sd => { const w = new THREE.Group(); w.add(new THREE.Mesh(G.tyre, this.mat(0x9aa1a7, { rough: 0.85 })), new THREE.Mesh(G.hub, this.mat(0x3c4247, { rough: 0.4, metal: 0.5 }))); w.position.set(G.wheelX, G.wheelR, sd * G.wheelZ); w.children.forEach(x => { x.castShadow = true; }); group.add(w); return w; });
      // the speed ring on the floor around a player's cart: one lit segment per speed level
      const R = CONFIG.render, ring = new THREE.Group(), nSeg = CONFIG.speedLevels.length, r = CONFIG.chair.radius + R.ringOffset, step = 2 * Math.PI / nSeg;
      const segs = []; for (let s = 0; s < nSeg; s++) { const seg = new THREE.Mesh(new THREE.RingGeometry(r - R.ringWidth / 2, r + R.ringWidth / 2, 10, 1, -Math.PI / 2 + s * step + R.ringGapRadians / 2, step - R.ringGapRadians).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false })); seg.position.y = 0.012; ring.add(seg); segs.push(seg); }
      this.scene.add(group, ring);
      return { ch, group, wheels, ring, segs, roll: 0, lx: ch.x, ly: ch.y, layer: self };
    });
    this.cartKey = Settings.stickLength;
  }
  buildBall() {
    const r = CONFIG.ball.radius, B3 = CONFIG.view3d.ball, cv = G3.canvas(256, 128), c = cv.getContext('2d');
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, 256, 128); c.fillStyle = '#0f1820';
    const spots = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0.577, 0.577, 0.577], [-0.577, -0.577, 0.577], [0.577, -0.577, -0.577], [-0.577, 0.577, -0.577]];
    for (const [x, y, z] of spots) { const lon = Math.atan2(z, x), lat = Math.asin(y), u = (lon + Math.PI) / (2 * Math.PI) * 256, v = (Math.PI / 2 - lat) / Math.PI * 128, k = 1 / Math.max(0.25, Math.cos(lat)); for (const du of [-256, 0, 256]) { c.beginPath(); c.ellipse(u + du, v, 9 * k, 9, 0, 0, Math.PI * 2); c.fill(); } }
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 })); this.ball.castShadow = true; this.scene.add(this.ball);
    this.halo = new THREE.Mesh(new THREE.RingGeometry(B3.haloInner, B3.haloOuter, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: B3.haloAlpha, depthWrite: false }));
    this.halo.position.y = 0.006; this.scene.add(this.halo); this.ballLast = { x: this.m.ball.x, y: this.m.ball.y };
  }

  /* ----- the crowd: every fan from the 2D crowd (crowd.js), as instanced bodies on the steps ----- */
  buildFans() {
    if (this.fans) { this.scene.remove(this.fans.group); this.fans.meshes.forEach(m => m.dispose && m.dispose()); this.fans.signs.forEach(s => s.tex.dispose()); }
    this.fans = null; const cr = this.sc.crowd; if (!cr || !cr.fans.length) return;
    const n = cr.fans.length, group = new THREE.Group(), white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const inst = geo => { const m = new THREE.InstancedMesh(geo, white, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = false; m.receiveShadow = true; group.add(m); return m; };
    const torso = inst(new THREE.CapsuleGeometry(0.17, 0.28, 3, 8).scale(1, 1, 0.75)), head = inst(new THREE.SphereGeometry(0.11, 10, 8)), hair = inst(new THREE.SphereGeometry(0.117, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.55));
    const arm = new THREE.CylinderGeometry(0.045, 0.04, 0.42, 6).translate(0, -0.21, 0), armL = inst(arm), armR = inst(arm), legs = inst(new THREE.BoxGeometry(0.36, 0.12, 0.38));
    const col = new THREE.Color(), set = (m, i, c) => m.setColorAt(i, col.set(c));
    cr.fans.forEach((f, i) => { set(torso, i, f.shirt); set(armL, i, f.shirt); set(armR, i, f.shirt); set(head, i, f.skin); set(hair, i, f.hat >= 0 ? f.hat : f.hair); set(legs, i, 0x2b3240); });
    // signs that some fans hold up now and then
    const signs = cr.fans.filter(f => f.sign).map(f => {
      const cv = G3.canvas(256, 160), c = cv.getContext('2d'), dark = ((f.signCol >> 16 & 255) + (f.signCol >> 8 & 255) + (f.signCol & 255)) > 600;
      c.fillStyle = G3.css(f.signCol); c.fillRect(0, 0, 256, 160); c.fillStyle = f.signInk || (dark ? '#14181c' : '#ffffff'); c.textAlign = 'center'; c.textBaseline = 'middle';
      const lines = f.sign.split('\n'); c.font = '800 54px "Barlow Condensed", Impact, sans-serif'; lines.forEach((l, k) => c.fillText(l, 128, 80 + (k - (lines.length - 1) / 2) * 58, 240));
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
      const mesh = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ map: tex }), back = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), mat); back.rotation.y = Math.PI; mesh.add(new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), mat), back); mesh.visible = false; group.add(mesh);   // printed on both sides, so it reads from either stand
      return { f, mesh, tex };
    });
    this.fans = { group, torso, head, hair, armL, armR, legs, signs, meshes: [torso, head, hair, armL, armR, legs] }; this.fans.group.visible = Render3D.quality().fans;
    this.scene.add(group); this.updateFans(0, true);
  }
  fanPose(cr, f, t) {                                         // the same moods as the 2D crowd (crowd.js drawFan), as numbers
    const mood = f.mood && t >= f.at ? f.mood : null, w = cr.waveUp(f); let up = w, bob = 0, clap = 0, down = 0, lean = 0, shake = 0;
    if (mood === 'cheer') { up = Math.max(up, 1); bob = Math.max(0, Math.sin(t * (7 + f.en * 2) + f.ph)) * 0.09; }
    else if (mood === 'clap') { clap = 1; bob = Math.sin(t * 9 + f.ph) * 0.01; }
    else if (mood === 'groan') { down = 1; lean = -0.08; }
    else if (mood === 'boo') { up = 0.55; shake = Math.sin(t * 6 + f.ph) * 0.05; down = 0.5; }
    else if (mood === 'ooh') { lean = 0.1; up = 0.35; }
    else if (!w && Math.sin(t * 0.13 * f.en + f.ph * 3) > 0.93) clap = 0.7;
    if (f.hail > t) up = 1;
    return { up, bob, clap, down, lean, shake, stand: Math.max(w, mood === 'cheer' ? 0.7 : 0) };
  }
  updateFans(dt, force) {
    const F = this.fans, cr = this.sc.crowd; if (!F || !cr || !F.group.visible) return;
    this.fanAcc += dt; if (!force && this.fanAcc < 1 / CONFIG.arena.hz) return; this.fanAcc = 0;
    const A = CONFIG.arena, A3 = CONFIG.view3d.arena, t = cr.t, M = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), d = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0), col = new THREE.Color();
    const bin = this.binArea(), A0 = CONFIG.arena, gone = f => f.stand === 0 && A0.firstRow + f.row * A0.rowGap - A0.rowGap / 2 < bin.depth && f.x > bin.x0 - 0.2 && f.x < bin.x1 + 0.2, Z = new THREE.Matrix4().makeScale(0, 0, 0);
    cr.fans.forEach((f, i) => {
      if (gone(f)) { for (const m of F.meshes) m.setMatrixAt(i, Z); return; }                                    // their seats are where the sin bin is
      const P = this.fanPose(cr, f, t), seat = A3.stepBase + f.row * A3.stepRise, fy = f.fy, sc = f.sc, x = f.x + P.shake;
      const by = seat + 0.36 * sc + P.stand * 0.32 + P.bob, z = f.y - fy * P.lean, face = Math.atan2(0, fy);
      q.setFromAxisAngle(V3UP, fy > 0 ? 0 : Math.PI);
      F.legs.setMatrixAt(i, M.compose(p.set(x, seat + 0.07 + P.stand * 0.2, z + fy * 0.12), q, s1.set(sc, sc, sc)));
      F.torso.setMatrixAt(i, M.compose(p.set(x, by, z), q, s1.set(sc, sc, sc)));
      F.head.setMatrixAt(i, M.compose(p.set(x, by + 0.35 * sc, z + fy * 0.02), q, s1.set(sc, sc, sc)));
      F.hair.setMatrixAt(i, M.compose(p.set(x, by + 0.37 * sc, z - fy * 0.015), q, s1.set(sc, sc, sc)));
      for (const sd of [-1, 1]) {                               // arms: hanging, clapping in front, or up in the air
        const raise = P.up, cl = P.clap ? 1 : 0;
        d.set(sd * (0.15 + raise * 0.25) - cl * sd * 0.25, -0.9 + raise * 1.9 - P.down * 0.2 + cl * 0.6, fy * (0.45 - raise * 0.3 + cl * 0.6)).normalize();
        q.setFromUnitVectors(down, d); (sd < 0 ? F.armL : F.armR).setMatrixAt(i, M.compose(p.set(x + sd * 0.2 * sc, by + 0.18 * sc, z), q, s1.set(sc, sc, sc)));
      }
      const shirt = f.letter ? f.skin : f.shirt; F.torso.setColorAt(i, col.set(shirt));
    });
    for (const m of F.meshes) m.instanceMatrix.needsUpdate = true; F.torso.instanceColor.needsUpdate = true;
    { const S = cr.strip, want = S ? S.fans.filter(f => f.letter && f.letter !== ' ' && t >= f.at && !gone(f)) : []; F.letters = F.letters || [];   // painted letters on the shirtless fans
      while (F.letters.length < want.length) { const cv = G3.canvas(64, 64), tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })); F.group.add(mesh); F.letters.push({ mesh, cv, tex, key: '' }); }
      F.letters.forEach((L, i) => { const f = want[i]; L.mesh.visible = !!f; if (!f) return;
        const col = S.col !== undefined ? S.col : cr.teamCol[S.side], key = f.letter + col; if (L.key !== key) { L.key = key; const c = L.cv.getContext('2d'); c.clearRect(0, 0, 64, 64); c.font = '900 54px "Barlow Condensed", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 8; c.strokeStyle = '#ffffff'; c.strokeText(f.letter, 32, 35); c.fillStyle = G3.css(col); c.fillText(f.letter, 32, 35); L.tex.needsUpdate = true; }
        const P = this.fanPose(cr, f, t), seat = A3.stepBase + f.row * A3.stepRise, by = seat + 0.36 * f.sc + P.stand * 0.32 + P.bob;
        L.mesh.position.set(f.x + P.shake, by + 0.08 * f.sc, f.y - f.fy * P.lean + f.fy * 0.16 * f.sc); L.mesh.rotation.set(0, f.fy > 0 ? 0 : Math.PI, 0); L.mesh.scale.setScalar(f.sc); }); }
    for (const s of F.signs) {
      const f = s.f, on = !!f.signUp && !gone(f); s.mesh.visible = on; if (!on) continue;
      const seat = A3.stepBase + f.row * A3.stepRise; s.mesh.position.set(f.x, seat + 1.25, f.y + f.fy * 0.1); s.mesh.rotation.set(0, f.fy > 0 ? 0 : Math.PI, Math.sin(t * 2 + f.ph) * 0.06);
    }
  }

  /* ----- every frame ----- */
  update(dt) {
    const m = this.m, B = CONFIG.ball;
    if (this.cartKey !== Settings.stickLength) this.buildCarts();
    for (const c of this.carts) {
      const ch = c.ch, vis = !ch.benched; c.group.visible = true;
      const lvl = ch.player ? ch.player.speedLevel : 0; c.ring.visible = vis && !!lvl;
      if (!vis) { const sl = this.binSlot(ch); c.group.position.set(sl.x, 0, sl.y); c.group.rotation.y = -sl.heading; c.lx = ch.x; c.ly = ch.y; continue; }   // serving time: sitting in the sin bin
      c.group.position.set(ch.x, 0, ch.y); c.group.rotation.y = -ch.heading;
      const dx = ch.x - c.lx, dy = ch.y - c.ly, fwd = dx * Math.cos(ch.heading) + dy * Math.sin(ch.heading); c.lx = ch.x; c.ly = ch.y;
      if (Math.abs(fwd) < 1) c.roll -= fwd / this.cartGeo.wheelR; for (const w of c.wheels) w.rotation.z = c.roll;
      if (lvl) { c.ring.position.set(ch.x, 0, ch.y); c.segs.forEach((s, i) => { s.material.opacity = i < lvl ? 0.95 : CONFIG.render.ringDimAlpha; }); }
    }
    // the ball, rolling: turn it by however far it moved since the last frame
    const b = m.ball, L = this.ballLast, mx = b.x - L.x, my = b.y - L.y, dist = Math.hypot(mx, my); L.x = b.x; L.y = b.y;
    if (dist > 1e-5 && dist < 2) this.ball.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(my / dist, 0, -mx / dist), dist / B.radius));
    this.ball.position.set(b.x, B.radius, b.y); this.halo.position.set(b.x, 0.006, b.y);
    this.updateFans(dt); this.updateBinClocks();
    if (this.shakeLeft > 0) this.shakeLeft -= dt;
  }
  shake() { this.shakeLeft = CONFIG.view3d.shake.seconds; }

  /* ----- cameras ----- */
  camFor(key) { let c = this.cams.get(key); if (!c) { c = { cam: new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 160), yaw: null, pos: null, chair: null, mode: null, fx: null }; this.cams.set(key, c); } return c; }
  /* Place viewport vp's camera. vp: { key, chair, mode, rect: { x, y, w, h } (game pixels) }. Returns the camera. */
  placeCamera(vp, dt) {
    const C = CONFIG.court, V3 = CONFIG.view3d, st = this.camFor(vp.key), cam = st.cam, ch = vp.chair || (vp.mode === 'bench' ? vp.benchChair : null), aspect = vp.rect.w / vp.rect.h;
    const follow = (cur, target, rate, maxRate) => { const d = normalizeAngle(target - cur), k = 1 - Math.exp(-rate * dt); let step = d * k; if (maxRate) step = Math.max(-maxRate * dt, Math.min(maxRate * dt, step)); return Math.abs(d) > 2.5 ? target : cur + step; };
    if (st.chair !== ch || st.mode !== vp.mode) { st.yaw = ch ? ch.heading : 0; st.pos = null; st.chair = ch; st.mode = vp.mode; st.lx = st.ly = 0; st.benchSeen = false; }
    const LK = V3.look, lt = vp.look || { x: 0, y: 0 }, lk = 1 - Math.exp(-LK.follow * dt), D = Math.PI / 180;    // the right stick, eased: let go and the view springs back to straight ahead
    st.lx += (lt.x - st.lx) * lk; st.ly += (lt.y - st.ly) * lk;
    cam.layers.enableAll();
    if (vp.mode === 'first' && ch) {
      const F = V3.first; st.yaw = follow(st.yaw, ch.heading, F.follow, F.maxTurn);
      const ex = ch.x + Math.cos(ch.heading) * F.eyeX, ey = ch.y + Math.sin(ch.heading) * F.eyeX, yaw = st.yaw + st.lx * LK.yaw * D;
      const pitch = F.pitch * D - st.ly * (st.ly > 0 ? LK.down : LK.up) * D;                                  // stick down looks down
      cam.fov = this.widen(Settings.fov3d || 74, aspect); cam.position.set(ex, F.eyeY, ey);
      cam.lookAt(ex + Math.cos(yaw) * Math.cos(pitch), F.eyeY + Math.sin(pitch), ey + Math.sin(yaw) * Math.cos(pitch));
      const cart = this.carts.find(c => c.ch === ch); if (cart) cam.layers.disable(cart.layer);
    } else if (vp.mode === 'bench' && vp.benchChair) {         // in the sin bin: watch from your seat at the boards, following the ball
      const bc = vp.benchChair, sl = this.binSlot(bc), K3 = CONFIG.view3d.cart, b = this.m.ball, F = V3.first;
      const ex = sl.x + Math.cos(sl.heading) * (K3.seatX - 0.05), ey = sl.y + Math.sin(sl.heading) * (K3.seatX - 0.05), eh = F.eyeY;
      const want = Math.atan2(b.y - ey, b.x - ex); if (!st.benchSeen) { st.yaw = want; st.benchSeen = true; } st.yaw = follow(st.yaw, want, 4, 3);
      const yaw = st.yaw + st.lx * LK.yaw * D, pitch = Math.max(-0.6, Math.atan2(0.1 - eh, Math.hypot(b.x - ex, b.y - ey))) - st.ly * (st.ly > 0 ? LK.down : LK.up) * D;
      cam.fov = this.widen(Settings.fov3d || 74, aspect); cam.position.set(ex, eh, ey);
      cam.lookAt(ex + Math.cos(yaw) * Math.cos(pitch), eh + Math.sin(pitch), ey + Math.sin(yaw) * Math.cos(pitch));
      const cart = this.carts.find(c => c.ch === bc); if (cart) cam.layers.disable(cart.layer);
    } else if (vp.mode === 'third' && ch) {
      const T = V3.third, dist = Settings.chaseDist || 3.5; st.yaw = follow(st.yaw, ch.heading, T.follow, T.maxTurn);
      const oy = st.yaw + st.lx * LK.orbit * D, cy = Math.cos(oy), sy = Math.sin(oy), lim = T.keepIn;               // the right stick swings the camera round the cart
      let px = ch.x - cy * dist, pz = ch.y - sy * dist;
      px = Math.max(-lim, Math.min(C.width + lim, px)); pz = Math.max(-lim, Math.min(C.height + lim, pz));          // stay over the rink, never inside the stands
      const want = new THREE.Vector3(px, Math.max(0.6, T.height + dist * T.heightPerMetre + st.ly * LK.lift), pz);
      if (!st.pos) st.pos = want.clone(); else st.pos.lerp(want, 1 - Math.exp(-T.posFollow * dt));
      cam.fov = this.widen(T.fov, aspect); cam.position.copy(st.pos); cam.lookAt(ch.x + Math.cos(st.yaw) * T.lookAhead * (1 - Math.abs(st.lx)), T.lookHeight, ch.y + Math.sin(st.yaw) * T.lookAhead * (1 - Math.abs(st.lx)));
    } else {                                                   // broadcast: high on the near side, sliding along with the ball
      const Bc = V3.broadcast, b = this.m.ball, lo = C.width * (0.5 - Bc.xRange), hi = C.width * (0.5 + Bc.xRange), tx = Math.max(lo, Math.min(hi, b.x));
      st.fx = st.fx === null ? tx : st.fx + (tx - st.fx) * (1 - Math.exp(-Bc.follow * dt));
      cam.fov = Bc.fov * (aspect < 1.3 ? Bc.narrowFov : 1); cam.position.set(st.fx, Bc.height, C.height + Bc.back);
      cam.lookAt(st.fx, 0, C.height / 2 + (b.y - C.height / 2) * Bc.lookBias);
    }
    if (this.shakeLeft > 0) { const s = CONFIG.view3d.shake.metres * this.shakeLeft / CONFIG.view3d.shake.seconds; cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s; }
    cam.aspect = aspect; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    return cam;
  }
  widen(fov, aspect) {                                        // a narrow split-screen view gets a taller field of view, so it does not lose too much to the sides
    if (aspect >= 16 / 9) return fov; const t = Math.tan(fov * Math.PI / 360) * Math.sqrt(16 / 9 / aspect); return Math.min(CONFIG.view3d.maxFov, Math.atan(t) * 360 / Math.PI);
  }
  /* What the stick means on screen for this viewport, as court directions: right and up. */
  screenAxes(vp) {
    const cam = this.camFor(vp.key).cam, f = new THREE.Vector3(); cam.getWorldDirection(f);
    let fx = f.x, fz = f.z, k = Math.hypot(fx, fz) || 1; fx /= k; fz /= k;
    return { right: { x: -fz, y: fx }, up: { x: fx, y: fz } };
  }
  /* Draw every viewport. rects are in game pixels (1280 x 720). */
  render(viewports, dt) {
    const R = Render3D, b = R.sync(); if (!b) return; const r = R.r, s = b.width / CONFIG.view.width;
    r.setScissor(0, 0, b.width, b.height); r.setViewport(0, 0, b.width, b.height); r.setClearColor(CONFIG.view3d.arena.fog, 1); r.clear();
    for (const vp of viewports) {
      const W = this.win, kx = W ? W.w / CONFIG.view.width : 1, ky = W ? W.h / CONFIG.view.height : 1, R = W ? { x: W.x + vp.rect.x * kx, y: W.y + vp.rect.y * ky, w: vp.rect.w * kx, h: vp.rect.h * ky } : vp.rect;   // win: drawn into a window (a menu's demo)
      const cam = this.placeCamera(vp, dt), x = R.x * s, y = (CONFIG.view.height - R.y - R.h) * s, w = R.w * s, h = R.h * s;
      this.scaleBall(cam, vp.rect.h);
      r.setViewport(x, y, w, h); r.setScissor(x, y, w, h); r.render(this.scene, cam);
    }
  }
  scaleBall(cam, pxH) {                                        // the ball is only 7.5 cm across: far away it is drawn a little bigger so it never vanishes
    const B = CONFIG.ball, d = cam.position.distanceTo(this.ball.position), px = 2 * B.radius / (2 * d * Math.tan(cam.fov * Math.PI / 360)) * pxH, k = Math.max(B.drawScale || 1, CONFIG.view3d.ball.minPx / Math.max(px, 1e-6));   // drawScale: the ball is drawn a touch bigger than it is
    this.ball.scale.setScalar(k); this.ball.position.y = B.radius * k;
  }
  /* A court point (with height) -> game pixels in this viewport. behind: the point is behind the camera. */
  project(vp, x, h, y) {
    const cam = this.camFor(vp.key).cam, v = new THREE.Vector3(x, h, y), c = v.clone().applyMatrix4(cam.matrixWorldInverse); v.project(cam);
    return { x: vp.rect.x + (v.x + 1) / 2 * vp.rect.w, y: vp.rect.y + (1 - v.y) / 2 * vp.rect.h, behind: c.z > -0.05, dist: -c.z, cx: c.x, cy: c.y };
  }
  dispose() {
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { const ms = [].concat(o.material); ms.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } });
    if (this.sun.shadow.map) this.sun.shadow.map.dispose(); this.cams.clear();
  }
}

