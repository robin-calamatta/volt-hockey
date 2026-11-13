/* v14.3.5 Volt Royale towns: roads, street lights, fire hydrants, benches, a fountain, signs and a flag.
   The roads run between all the places on the two big maps (modes_br_maps4.js), and The Town (two-storey houses, a school with a gym,
   a plaza with shops) is one of the places on each map. This file draws the new pieces. Street lights, hydrants, benches, the fountain,
   the bus and the flagpole are solid (you bump into them); the roads, the plaza paving, the signs and the flag are only paint. */
Object.assign(BR_COLS, { lamppost: 0x3a3f46, hydrant: 0xd8322a, bench: 0x7a5230, fountain: 0xbfbab0, planter: 0x8a7a68, bus: 0xf2b800, flagpole: 0xd0d4d8 });
Object.assign(BR_WALLH, { lamppost: 4.6, hydrant: 0.05, bench: 0.5, fountain: 0.8, planter: 0.6, bus: 2.5, flagpole: 6.5 });
{ const P = View3D.prototype, bw = P.buildBRWorld;
  P.buildBRWorld = function (...a) {
    const r = bw.apply(this, a), M = MODES.br.map(this.m), g = this.arena; if (!g || !M) return r;
    const D = M.deco.filter(d => ['road', 'plaza', 'lamp', 'sign', 'flag', 'water'].includes(d.t)); if (!D.length) return r;
    const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z), lines = [], yellow = [], arms = [], heads = [];
    const roads = D.filter(d => d.t === 'road'), cross = (x, y) => roads.filter(q => x > q.x - 0.2 && x < q.x + q.w + 0.2 && y > q.y - 0.2 && y < q.y + q.h + 0.2).length > 1;
    /* the roads: asphalt, white edge lines, a dashed yellow centre line (none through the crossings) */
    const at = Look.tex('asphalt');
    roads.forEach((d, i) => {
      const t = at.clone(); t.needsUpdate = true; t.repeat.set(d.w / 6, d.h / 6);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, color: 0x8a8d92, roughness: 0.9 }));
      pl.position.set(d.x + d.w / 2, d.v ? 0.006 : 0.009, d.y + d.h / 2); pl.receiveShadow = true; g.add(pl);
      const L = d.v ? d.h : d.w;
      for (let s = 0; s < L; s += 4) { const x = d.v ? d.x + d.w / 2 : d.x + s + 1, y = d.v ? d.y + s + 1 : d.y + d.h / 2; if (cross(x, y) || s % 8) continue; yellow.push(d.v ? box(0.18, 0.01, 2.2, x, 0.02, y) : box(2.2, 0.01, 0.18, x, 0.02, y)); }
      for (const e of [0.35, (d.v ? d.w : d.h) - 0.35]) for (let s = 0; s < L; s += 2) { const x = d.v ? d.x + e : d.x + s + 1, y = d.v ? d.y + s + 1 : d.y + e; if (cross(x, y)) continue; lines.push(d.v ? box(0.14, 0.01, 2, x, 0.02, y) : box(2, 0.01, 0.14, x, 0.02, y)); }
    });
    /* the plaza: light paving with a darker border */
    for (const d of D.filter(q => q.t === 'plaza')) { const t = Look.tex('concrete').clone(); t.needsUpdate = true; t.repeat.set(d.w / 3, d.h / 3);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, color: 0xe6e0d4, roughness: 0.85 })); pl.position.set(d.x + d.w / 2, 0.012, d.y + d.h / 2); pl.receiveShadow = true; g.add(pl);
      for (const [x0, y0, x1, y1] of [[d.x, d.y, d.x + d.w, d.y + 0.4], [d.x, d.y + d.h - 0.4, d.x + d.w, d.y + d.h], [d.x, d.y, d.x + 0.4, d.y + d.h], [d.x + d.w - 0.4, d.y, d.x + d.w, d.y + d.h]]) lines.push(box(x0 === x1 ? 0.4 : x1 - x0, 0.03, y1 - y0, (x0 + x1) / 2, 0.02, (y0 + y1) / 2)); }
    /* street lights: an arm out over the road and a glowing lamp */
    for (const d of D.filter(q => q.t === 'lamp')) { const ax = d.x + (d.dx || 0) * 0.9, ay = d.y + (d.dy || 0) * 0.9;
      arms.push(box(Math.abs(d.dx || 0) * 1.8 + 0.1, 0.1, Math.abs(d.dy || 0) * 1.8 + 0.1, ax, 4.5, ay)); heads.push(box(0.55, 0.14, 0.55, d.x + (d.dx || 0) * 1.75, 4.42, d.y + (d.dy || 0) * 1.75)); }
    /* fire hydrants: a red body, a domed cap and two side outlets (the solid part is the little base plate) */
    const hyd = [];
    for (const w of M.walls) if (w.kind === 'hydrant') { const x = (w.x0 + w.x1) / 2, y = (w.y0 + w.y1) / 2;
      hyd.push(new THREE.CylinderGeometry(0.15, 0.17, 0.62, 12).translate(x, 0.36, y), new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 0.67, y), new THREE.CylinderGeometry(0.07, 0.07, 0.42, 8).rotateZ(Math.PI / 2).translate(x, 0.46, y), new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8).translate(x, 0.8, y)); }
    const add = (list, mat) => { if (!list.length) return; const mesh = new THREE.Mesh(G3.merge(list), mat); mesh.receiveShadow = true; g.add(mesh); };
    add(lines, new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 })); add(yellow, new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.6 }));
    add(hyd, new THREE.MeshStandardMaterial({ color: 0xd8322a, roughness: 0.45, metalness: 0.3 })); add(arms, new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.5, metalness: 0.6 })); add(heads, new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffd27a, emissiveIntensity: 1.1 }));
    /* signs on the buildings, the school flag, the fountain's water */
    for (const d of D.filter(q => q.t === 'sign')) { const cv = G3.canvas(512, 96), c = cv.getContext('2d'); c.fillStyle = d.col || '#1f4fa8'; c.fillRect(0, 0, 512, 96); c.fillStyle = '#fff'; c.font = '900 58px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(d.text, 256, 52);
      const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding; const w = Math.min(14, 1.2 + d.text.length * 0.75), sg = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 96 / 512), new THREE.MeshBasicMaterial({ map: tx }));
      sg.position.set(d.x, (d.lv || 0) * BR.H + 1.45, d.y + 0.03); g.add(sg); }
    for (const d of D.filter(q => q.t === 'flag')) { const cv = G3.canvas(96, 64), c = cv.getContext('2d'); c.fillStyle = '#1f4fa8'; c.fillRect(0, 0, 96, 64); c.fillStyle = '#f2c200'; c.beginPath(); c.moveTo(54, 6); c.lineTo(34, 36); c.lineTo(48, 36); c.lineTo(40, 58); c.lineTo(64, 26); c.lineTo(50, 26); c.closePath(); c.fill();
      const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding; const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })); fl.position.set(d.x + 0.95, 5.8, d.y); g.add(fl); }
    for (const d of D.filter(q => q.t === 'water')) { const wt = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 3.4), new THREE.MeshStandardMaterial({ color: 0x3f9fd8, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85 })); wt.position.set(d.x, 0.78, d.y); g.add(wt);
      const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 1.6, 10), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.7 })); jet.position.set(d.x, 1.6, d.y); g.add(jet); }
    return r;
  };
}
