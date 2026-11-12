Object.assign(BR_COLS, { seat: 0x2f5fa8, stone: 0x9a948a, hangar: 0xc8ced4, silo: 0xd8dde2 });   /* (v13.4: the new maps' walls) */
/* Volt Royale drawing, part 3 (v13.3): chests and crates that sit on the ground and open (the loot flies out), loot from an
   eliminated cart flying out too, doors that swing open and break into splinters, bubbles, the riot shield, rez garages with a big
   rez symbol over them, your team-mates' rez cards with a beam and a marker on screen, damage numbers, and big storm warnings. */

/* ---- models and icons for the new items ---- */
{ const geo = Items3D.geo.bind(Items3D);
  Items3D.geo = function (k) {
    if (this.cache[k]) return this.cache[k];
    const B = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
    if (k === 'riot') return (this.cache[k] = this.build([[B(0.02, 0.36, 0.26), 0x2b3540], [B(0.024, 0.1, 0.16, 0, 0.08), 0x9fd6ff], [B(0.024, 0.02, 0.26, 0, -0.12), 0xffd23f], [B(0.024, 0.36, 0.02, 0, 0, 0.13), 0x15171a], [B(0.024, 0.36, 0.02, 0, 0, -0.13), 0x15171a], [B(0.06, 0.05, 0.03, -0.03, 0), 0x15171a]]));
    if (k === 'bubble') return (this.cache[k] = this.build([[new THREE.SphereGeometry(0.08, 14, 10), 0x7fd8ff], [new THREE.CylinderGeometry(0.05, 0.06, 0.04, 12).translate(0, -0.08, 0), 0x2b2f34], [new THREE.SphereGeometry(0.025, 8, 6).translate(0.03, 0.04, 0.03), 0xffffff]]));
    return geo(k);
  };
  const r = Items3D.rarity.bind(Items3D); Items3D.rarity = k => k === 'riot' ? 'rare' : k === 'bubble' ? 'epic' : r(k);
}
{ const icon = brDrawIcon;
  brDrawIcon = function (c, k) {
    if (k === 'riot') { c.clearRect(0, 0, 128, 72); c.fillStyle = '#2b3540'; c.beginPath(); c.roundRect ? c.roundRect(40, 4, 48, 64, 8) : c.rect(40, 4, 48, 64); c.fill(); c.fillStyle = '#9fd6ff'; c.fillRect(48, 12, 32, 14); c.fillStyle = '#ffd23f'; c.fillRect(40, 52, 48, 5); return; }
    if (k === 'bubble') { c.clearRect(0, 0, 128, 72); const g = c.createRadialGradient(56, 28, 4, 64, 38, 30); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.4, 'rgba(127,216,255,0.6)'); g.addColorStop(1, 'rgba(61,139,255,0.25)'); c.fillStyle = g; c.beginPath(); c.arc(64, 36, 28, 0, 7); c.fill(); c.strokeStyle = '#7fd8ff'; c.lineWidth = 3; c.stroke(); return; }
    return icon(c, k);
  };
}

/* ---- the 3D world ---- */
{ const P = View3D.prototype, lootMesh = P.brLootMesh, upd = P.updateBR;
  P.brLootMesh = function (L) {
    const k = L[1];
    if (k === 'chest' || k === 'chestO') {                                  // a chest on the ground: wood, gold bands, a lid that opens
      const grp = new THREE.Group(), wood = this.mat(0x6a4524, { rough: 0.8 }), gold = this.mat(0xd4a017, { metal: 0.8, rough: 0.3 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.48, 0.62).translate(0, 0.24, 0), wood); grp.add(body);
      for (const x of [-0.34, 0.34]) grp.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.64).translate(x, 0.25, 0), gold));
      const hinge = new THREE.Group(); hinge.position.set(0, 0.48, -0.31); grp.add(hinge);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.95, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2).scale(1, 0.55, 1).translate(0, 0, 0.31), this.mat(0x7a5232, { rough: 0.7 })); hinge.add(lid);
      for (const x of [-0.34, 0.34]) hinge.add(new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.07, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2).scale(1, 0.55, 1).translate(x, 0, 0.31), gold));
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, 0.05).translate(0, 0.4, 0.33), gold); grp.add(lock);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: Items3D.glowTex(), color: 0xffd23f, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending })); glow.position.y = 0.02; grp.add(glow);
      const shine = new THREE.Sprite(new THREE.SpriteMaterial({ map: Items3D.glowTex(), color: 0xffd88a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); shine.scale.set(2.4, 2.4, 1); shine.position.set(0, 0.7, 0); shine.visible = false; grp.add(shine);   /* (a glow sprite, not a light: 100+ chests with a light each froze the game) */
      grp.traverse(x => { if (x.isMesh && x !== glow) { x.castShadow = true; x.receiveShadow = true; } });
      Object.assign(grp.userData, { still: true, box: 'chest', hinge, glow, lock, shine, k }); return grp;
    }
    if (k === 'ammo' || k === 'ammoO') {                                    // an ammo crate: olive green, the lid comes off
      const grp = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.38, 0.48).translate(0, 0.19, 0), this.mat(0x3f4f2f, { rough: 0.85 })), stripe = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.07, 0.49).translate(0, 0.08, 0), this.mat(0xd4a017));
      const hinge = new THREE.Group(); hinge.position.set(0, 0.38, -0.24); const lid = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.06, 0.5).translate(0, 0.03, 0.24), this.mat(0x2f3a22)); hinge.add(lid); grp.add(body, stripe, hinge);
      grp.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } }); Object.assign(grp.userData, { still: true, box: 'ammo', hinge, k }); return grp;
    }
    if (k === 'card') {                                                     // a rez card: the card turning in a tall beam (team-mates see the beam)
      const g = Items3D.pickup('card'); g.userData.pickup = true; g.userData.still = true; g.userData.k = k;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 26, 10, 1, true).translate(0, 13, 0), new THREE.MeshBasicMaterial({ color: 0x3dd6ff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.95, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3dd6ff, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide })); ring.position.y = 0.05;
      g.add(beam, ring); g.userData.cardBeam = beam; g.userData.cardRing = ring; g.userData.item.scale.multiplyScalar(1.6); return g;
    }
    const g = lootMesh.call(this, L); g.userData.k = k;
    if (BR_GUNS[k] && typeof BR_TIER !== 'undefined') { const col = BR_TIER[L[12] || 0].col; g.traverse(o => { if (o.isMesh && o !== g.userData.item && o.material && o.material.color) o.material.color.setHex(col); }); }   // (the glow and beam in the gun's tier colour)
    return g;
  };
  P.updateBR = function (dt) {
    const m = this.m, g = m.gs, M = MODES.br.map(m), t = performance.now() / 1000, sc = this.sc;
    for (const L of g.L || []) { const mesh = this.brLoot && this.brLoot.get(L[0]); if (mesh && mesh.userData.k !== undefined && mesh.userData.k !== L[1]) { mesh.parent && mesh.parent.remove(mesh); this.brLoot.delete(L[0]); } }   // (a chest that opened: a new model)
    upd.call(this, dt);
    const eyes = (sc.setup.players || []).map(p => p.chair).filter(Boolean); if (sc.online && sc.brMyChair) { const c = sc.brMyChair(); if (c) eyes.push(c); }
    const me = eyes[0], myTeam = me && me.gs ? me.gs.team : -9;
    for (const L of g.L || []) {
      const mesh = this.brLoot && this.brLoot.get(L[0]); if (!mesh) continue; const U = mesh.userData, base = L[4] * BR.H;
      if (U.box) { mesh.position.set(L[2], base, L[3]); const open = L[1] === 'chestO' || L[1] === 'ammoO', k = open ? Math.min(1, (g.t - (L[9] || 0)) / 0.35) : 0, e = 1 - Math.pow(1 - k, 3);
        U.hinge.rotation.x = -e * (U.box === 'chest' ? 1.9 : 1.2) + (open && k < 1 ? Math.sin(k * 20) * 0.05 : 0);
        if (U.glow) { U.glow.material.opacity = open ? Math.max(0, 0.6 - (g.t - L[9]) * 0.5) : 0.45 + 0.15 * Math.sin(t * 3 + L[0]); const sh = open ? Math.max(0, 1 - (g.t - L[9]) * 1.2) : 0; U.shine.visible = sh > 0; U.shine.material.opacity = sh; } }
      if (L[9] !== undefined && L[9] !== null && L[10] !== undefined && L[10] !== null && !U.box) {   // flying out of a chest or a cart: an arc with a little bounce
        const k = Math.min(1, (g.t - L[9]) / 0.55); if (k < 1) { const e = k, x = L[10] + (L[2] - L[10]) * e, y = L[11] + (L[3] - L[11]) * e, hgt = 1.6 * 4 * e * (1 - e); mesh.position.set(x, base + hgt + (U.pickup ? 0 : 0.25), y); if (U.item) U.item.rotation.set(k * 9, k * 6, 0); }
        else if (k < 1.4 / 0.55 && U.item) { const b = (g.t - L[9] - 0.55); U.item.position.y = 0.55 + Math.abs(Math.sin(b * 9)) * 0.18 * Math.exp(-b * 6); }
      }
      if (U.cardBeam) { const mate = m.chairs[L[5]] && m.chairs[L[5]].gs.team === myTeam; mesh.visible = mate || myTeam < 0;   /* (v14.1.5: an enemy's rez card is invisible to you) */ U.cardBeam.visible = mate; U.cardRing.visible = mate; U.cardBeam.material.opacity = 0.25 + 0.15 * Math.sin(t * 4); U.cardRing.scale.setScalar(1 + 0.15 * Math.sin(t * 5)); }
    }
    /* doors */
    if (!this.doorG && M.doors) { this.doorG = M.doors.map(d => { const grp = new THREE.Group(), hinge = new THREE.Group(), len = d.len - 0.08;
        const panel = new THREE.Mesh(new THREE.BoxGeometry(d.horiz ? len : 0.08, 2.05, d.horiz ? 0.08 : len).translate(d.horiz ? len / 2 : 0, 1.03, d.horiz ? 0 : len / 2), this.mat(0x7a4f2c, { rough: 0.75 }));
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6).translate(d.horiz ? len - 0.15 : 0.07, 1.0, d.horiz ? 0.07 : len - 0.15), this.mat(0xd4a017, { metal: 0.8, rough: 0.3 }));
        for (let i = 0; i < 2; i++) panel.add(new THREE.Mesh(new THREE.BoxGeometry(d.horiz ? len * 0.7 : 0.09, 0.6, d.horiz ? 0.09 : len * 0.7).translate(d.horiz ? len / 2 : 0, 0.55 + i * 0.85, d.horiz ? 0 : len / 2), this.mat(0x6a4324, { rough: 0.8 })));
        hinge.add(panel, knob); hinge.position.set(d.horiz ? d.x0 + 0.04 : d.cx, 0, d.horiz ? d.cy : d.y0 + 0.04); grp.add(hinge); panel.castShadow = true; this.scene.add(grp);
        return { d, grp, hinge, panel, a: 0 }; }); }
    if (this.doorG) for (const D of this.doorG) { const s = g.dr ? g.dr[D.d.door] : 0, want = s === 1 ? (D.d.horiz ? -D.d.inY : D.d.inX) * 1.55 : 0; D.a += (want - D.a) * (1 - Math.exp(-dt * 9)); D.hinge.rotation.y = D.a; D.grp.visible = s !== 2;
      const hp = g.dh ? g.dh[D.d.door] / BR_DOOR.hp : 1; D.panel.material.color.setHex(hp > 0.66 ? 0x7a4f2c : hp > 0.33 ? 0x6a4122 : 0x553318); }
    /* splinters, bubbles, damage numbers live in the world */
    const objs = g.objs || []; this.fx3 = this.fx3 || new Map(); const seen = new Set();
    for (const o of objs) {
      if (o.t === 'splint') { seen.add(o.id); let F = this.fx3.get(o.id); if (!F) { F = new THREE.Group(); for (let i = 0; i < 14; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06 + Math.random() * 0.1, 0.04, 0.3 + Math.random() * 0.4), this.mat(0x7a4f2c)); p.userData.v = new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6); p.userData.w = new THREE.Vector3(Math.random() * 9, Math.random() * 9, 0); p.position.set((Math.random() - 0.5) * 1.6 * (o.horiz ? 1 : 0.1), 0.3 + Math.random() * 1.6, (Math.random() - 0.5) * 1.6 * (o.horiz ? 0.1 : 1)); F.add(p); } F.position.set(o.x, 0, o.y); this.scene.add(F); this.fx3.set(o.id, F); }
        for (const p of F.children) { p.userData.v.y -= 12 * dt; p.position.addScaledVector(p.userData.v, dt); if (p.position.y < 0.03) { p.position.y = 0.03; p.userData.v.multiplyScalar(0.4); p.userData.v.y = Math.abs(p.userData.v.y) * 0.3; } p.rotation.x += p.userData.w.x * dt; p.rotation.y += p.userData.w.y * dt; } }
      if (o.t === 'hs') { seen.add(o.id); let F = this.fx3.get(o.id); if (!F) {             // a headshot: a gold burst of sparks and a ring at the head
          F = new THREE.Group(); const mat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
          for (let i = 0; i < 22; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.22), mat); const a = Math.random() * 6.28, e = Math.random() * 1.2 - 0.2; p.userData.v = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e) + 0.4, Math.sin(a) * Math.cos(e)).multiplyScalar(4 + Math.random() * 4); F.add(p); }
          const ring = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.24, 32), new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); F.add(ring); F.userData.ring = ring;
          const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: Items3D.glowTex(), color: 0xffe27a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); flash.scale.set(1.6, 1.6, 1); F.add(flash); F.userData.flash = flash;
          F.position.set(o.x, (o.z || 0) + 1.2, o.y); this.scene.add(F); this.fx3.set(o.id, F); }
        const age = 0.7 - o.life; for (const p of F.children) if (p.userData.v) { p.position.copy(p.userData.v).multiplyScalar(age); p.lookAt(p.userData.v.clone().multiplyScalar(age + 0.1)); p.material.opacity = Math.max(0, 1 - age / 0.6); }
        F.userData.ring.scale.setScalar(1 + age * 9); F.userData.ring.material.opacity = Math.max(0, 0.9 - age * 1.6); const cam = this.camFor && this.sc.vps && this.sc.vps[0] ? this.camFor(this.sc.vps[0].key).cam : null; if (cam) F.userData.ring.quaternion.copy(cam.quaternion);
        F.userData.flash.material.opacity = Math.max(0, 1 - age * 4); F.userData.flash.scale.setScalar(1.6 + age * 4); }
      if (o.t === 'bub') { seen.add(o.id); let F = this.fx3.get(o.id); if (!F) { F = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false, emissive: 0x1d6fa5, emissiveIntensity: 0.25 })); this.scene.add(F); this.fx3.set(o.id, F); }
        const age = g.t - (o.t0 || g.t), left = o.until - g.t, grow = Math.min(1, age / 0.35); F.scale.setScalar(o.r * (grow < 1 ? 1 - Math.pow(1 - grow, 3) : 1)); F.position.set(o.x, (o.z || 0), o.y);
        F.material.opacity = (left < 2 ? 0.22 * Math.max(0, left / 2) * (0.6 + 0.4 * Math.sin(t * 20)) : 0.22) + (o.hit && g.t - o.hit < 0.15 ? 0.25 : 0); }
    }
    for (const [id, F] of this.fx3) if (!seen.has(id)) { this.scene.remove(F); this.fx3.delete(id); }
    /* rez garages: a big rez symbol floating and turning over each one, green when ready, red when recharging */
    if (!this.rezSym && M.rez) { this.rezSym = M.rez.map(q => { const grp = new THREE.Group(), mk = () => new THREE.MeshBasicMaterial({ color: 0x7dff6a, transparent: true, opacity: 0.55, depthWrite: false });
        const a = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.5), mk()), b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.5), a.material); grp.add(a, b);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: Items3D.glowTex(), color: 0x7dff6a, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.set(3.4, 3.4, 1); grp.add(halo);
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 30, 12, 1, true).translate(0, 15, 0), new THREE.MeshBasicMaterial({ color: 0x7dff6a, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); beam.position.set(q.cx, 2.6, q.cy); this.scene.add(beam);
        grp.position.set(q.cx, 5.2, q.cy); this.scene.add(grp); return { grp, a, halo, beam }; }); }
    if (this.rezSym) this.rezSym.forEach((R, i) => { const ready = !g.gar || g.gar[i] <= g.t, col = ready ? 0x7dff6a : 0xff4d4d; R.a.material.color.setHex(col); R.halo.material.color.setHex(col); R.beam.material.color.setHex(col);
      R.grp.rotation.y = t * 1.2; R.grp.position.y = 5.2 + Math.sin(t * 2 + i) * 0.25; });
  };
}

/* ---- the riot shield and the melee swing: arms ---- */
{ const pf = Avatar.poseFor.bind(Avatar);
  Avatar.poseFor = function (ch, m, now) {
    const p = pf(ch, m, now); if (!m || m.kind !== 'br' || !ch.gs) return p; const G = ch.gs, age = m.gs.t - (G.melT === undefined ? -9 : G.melT);
    if (age >= 0 && age < 0.4 && !G.down) return { ...p, name: 'melee', rp: age / 0.4 };
    return p;
  };
  const pose = Rig.pose.bind(Rig);
  Rig.pose = function (name, t, extra = {}) {
    if (name === 'melee') { const { tx } = this.K(), k = extra.rp || 0, s = Math.sin(Math.min(1, k * 2.2) * Math.PI);   // a quick jab forward with the right hand (or the shield)
      return { R: [tx + 0.3 + 0.38 * s, 0.82 + 0.05 * s, 0.2 - 0.12 * s], L: [tx + 0.3, 0.72, -0.16] }; }
    return pose(name, t, extra);
  };
}

/* ---- the screen: damage numbers, markers for rez cards and garages, the storm warning ---- */
{ const P = GameScene.prototype, extras = P.brExtras;
  P.brExtras = function (m) {
    extras.call(this, m); const V = CONFIG.view, g = m.gs, X = this.brX; if (!X) return;
    if (!X.g3 || !X.g3.scene) { X.g3 = this.add.graphics().setDepth(33); X.nums = []; X.marks = []; X.storm = this.add.text(V.width / 2, 170, '', { fontFamily: FONT, fontSize: '54px', fontStyle: 'bold', color: '#ffffff', stroke: '#3a0a6a', strokeThickness: 9, align: 'center' }).setOrigin(0.5).setDepth(36); X.storm2 = this.add.text(V.width / 2, 222, '', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#e6d4ff', stroke: '#1a0533', strokeThickness: 5 }).setOrigin(0.5).setDepth(36); }
    const G3 = X.g3; G3.clear(); let ni = 0, mi = 0;
    const T = (list, i, size) => list[i] || (list[i] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: size, fontStyle: 'bold', color: '#ffffff', stroke: '#0d151b', strokeThickness: 5, align: 'center' }).setOrigin(0.5).setDepth(34));
    const mine = this.brMine().map(p => p.chair); if (this.online && this.brMyChair) { const c = this.brMyChair(); if (c && !mine.includes(c)) mine.push(c); }
    const myK = new Set(mine.map(c => c.k)), me = mine[0], vp = this.vps && this.vps[0];
    if (this.v3 && !this.flat && vp && m.state === 'play') {
      for (const o of g.objs || []) { if (o.t !== 'dn' || !myK.has(o.by)) continue;           // the damage you did, over whoever you hit
        const age = 1 - o.life, q = this.v3.project(vp, o.x, (o.z || 0) + 1.7 + age * 0.9, o.y); if (q.behind) continue; const pop = age < 0.12 ? 1.35 - age * 2.9 : 1, a = Math.min(1, o.life * 3), side = ((o.id * 37) % 7 - 3) * 6;
        const parts = []; if (o.bl) parts.push([`${o.bl}`, '#b8c2cc']); else { if (o.s) parts.push([`${o.s}`, '#5fb2ff']); if (o.h) parts.push([`${o.h}`, o.hd ? '#ffd23f' : '#ffffff']); }
        parts.forEach(([txt, col], j) => T(X.nums, ni++, '30px').setVisible(true).setText(txt).setColor(col).setPosition(q.x + side + (j - (parts.length - 1) / 2) * 44, q.y).setScale(pop * (o.hd ? 1.3 : 1)).setAlpha(a));
        if (o.hd) T(X.nums, ni++, '16px').setVisible(true).setText('HEADSHOT').setColor('#ffd23f').setPosition(q.x + side, q.y - 26).setScale(1).setAlpha(a);
      }
      /* markers: your team-mates' rez cards (always), and the rez garages when you carry a card */
      const M = MODES.br.map(m), R = vp.rect, mark = (x, h, y, col, icon, label) => { const q = this.v3.project(vp, x, h, y); let sx = q.x, sy = q.y; const off = q.behind || sx < R.x + 30 || sx > R.x + R.w - 30 || sy < R.y + 40 || sy > R.y + R.h - 60;
          if (off) { let dx = q.cx, dy = -q.cy; if (q.behind) { dx = -dx; dy = -Math.abs(dy) - 1; } const a = Math.atan2(dy, dx), cx = R.x + R.w / 2, cy = R.y + R.h / 2, k = Math.min((R.w / 2 - 40) / Math.max(1e-3, Math.abs(Math.cos(a))), (R.h / 2 - 70) / Math.max(1e-3, Math.abs(Math.sin(a)))); sx = cx + Math.cos(a) * k; sy = cy + Math.sin(a) * k;
            G3.fillStyle(col, 0.95).fillTriangle(sx + Math.cos(a) * 26, sy + Math.sin(a) * 26, sx + Math.cos(a + 2.5) * 14, sy + Math.sin(a + 2.5) * 14, sx + Math.cos(a - 2.5) * 14, sy + Math.sin(a - 2.5) * 14); }
          const pulse = 1 + 0.08 * Math.sin(this.time.now / 150), mid = Math.hypot(sx - (R.x + R.w / 2), sy - (R.y + R.h / 2)) < Math.min(R.w, R.h) * 0.22, al = off ? 0.85 : mid ? 0.28 : 0.5;   /* (see-through: it never hides what's behind it, least of all near your crosshair) */
          G3.fillStyle(0x0d151b, al * 0.45).fillCircle(sx, sy, 20 * pulse).lineStyle(2, col, al).strokeCircle(sx, sy, 20 * pulse);
          T(X.marks, mi++, '20px').setVisible(true).setText(icon).setPosition(sx, sy).setColor('#ffffff').setAlpha(al + 0.1); T(X.marks, mi++, '15px').setVisible(true).setText(label).setPosition(sx, sy + 32).setColor('#' + col.toString(16).padStart(6, '0')).setAlpha(al + 0.1); };
      if (me && !me.out) {
        for (const L of g.L || []) if (L[1] === 'card') { const o = m.chairs[L[5]]; if (o && o.gs.team === me.gs.team && o !== me) mark(L[2], L[4] * BR.H + 1.2, L[3], 0x3dd6ff, '🎴', `${(MG.pname(o) || m.name(o)).toUpperCase().slice(0, 10)}  ${Math.round(Math.hypot(L[2] - me.x, L[3] - me.y))} m`); }
        if (me.gs.cards && me.gs.cards.length) { let best = -1, bd = 1e9; (M.rez || []).forEach((q, i) => { const d = Math.hypot(q.cx - me.x, q.cy - me.y) + (g.gar[i] > g.t ? 1000 : 0); if (d < bd) { bd = d; best = i; } });
          if (best >= 0) { const q = M.rez[best], ready = g.gar[best] <= g.t; mark(q.cx, 5.2, q.cy, ready ? 0x7dff6a : 0xff4d4d, '✚', `REZ  ${Math.round(Math.hypot(q.cx - me.x, q.cy - me.y))} m`); } }
      }
    }
    for (let i = ni; i < X.nums.length; i++) X.nums[i].setVisible(false); for (let i = mi; i < X.marks.length; i++) X.marks[i].setVisible(false);
    /* your headshot: HEADSHOT! big in the middle, a gold flash round the edges */
    const hs = (g.objs || []).filter(o => o.t === 'hs' && myK.has(o.by)).pop();
    if (!X.hsT) X.hsT = this.add.text(V.width / 2, V.height / 2 - 110, 'HEADSHOT!', { fontFamily: FONT, fontSize: '46px', fontStyle: 'bold', color: '#ffd23f', stroke: '#3a2600', strokeThickness: 9 }).setOrigin(0.5).setDepth(36);
    if (hs && m.state === 'play') { const age = 0.7 - hs.life, pop = age < 0.1 ? 0.6 + age * 7 : 1.3 - Math.min(0.3, (age - 0.1) * 1.5); X.hsT.setVisible(true).setScale(pop).setAlpha(Math.min(1, hs.life * 2.5)).setAngle(Math.sin(age * 40) * 3 * Math.max(0, 1 - age * 4));
      G3.lineStyle(40, 0xffd23f, 0.35 * Math.max(0, 1 - age * 2.2)).strokeRect(0, 0, V.width, V.height); const cx0 = V.width / 2, cy0 = V.height / 2, r0 = 16 + age * 90; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.39; G3.lineStyle(4, 0xffe27a, Math.max(0, 1 - age * 1.8)).lineBetween(cx0 + Math.cos(a) * r0, cy0 + Math.sin(a) * r0, cx0 + Math.cos(a) * (r0 + 24), cy0 + Math.sin(a) * (r0 + 24)); } }
    else X.hsT.setVisible(false);
    /* the storm warning: big letters over the screen for a few seconds */
    const W = g.sw, age = W ? g.t - W[1] : 99, on = W && age < 3.6 && m.state === 'play';
    X.storm.setVisible(!!on); X.storm2.setVisible(!!on);
    if (on) { const pop = age < 0.25 ? 0.6 + age * 1.6 : 1, a = age > 3 ? 1 - (age - 3) / 0.6 : 1, S = g.st;
      X.storm.setText(W[0]).setScale(pop).setAlpha(a).setColor(W[2] === 'go' ? '#ff6bf2' : W[2] === 'done' ? '#d8f3ff' : '#ffffff');
      X.storm2.setText(W[2] === 'done' ? (S && S.wait > 0 ? `Next stage in ${Math.ceil(S.wait)} seconds` : '') : W[2] === 'go' ? 'Get inside the circle - every stage hurts more' : 'Check the map: the white circle is where it is going').setAlpha(a);
      if (W[2] !== 'done') G3.fillStyle(0x7b3dff, 0.12 * a * (0.6 + 0.4 * Math.sin(this.time.now / 90))).fillRect(0, 0, V.width, 26).fillRect(0, V.height - 26, V.width, 26); }
  };
}

/* ---- the result screen in Volt Royale: only your squad, a card each ---- */
{ const P = GameScene.prototype, show = P.showMiniResult;
  P.showMiniResult = function () {
    const m = this.match, R = m.result; if (this.result || m.kind !== 'br' || !R || !R.br) return show.call(this);
    const V = CONFIG.view, cx = V.width / 2, o = this.online, items = [], add = x => { items.push(x); return x; }, T = (x, y, str, st) => add(this.add.text(x, y, str, { fontFamily: FONT, ...st }).setOrigin(0.5).setDepth(41));
    const mine = this.brMine().map(p => p.chair); if (o && this.brMyChair) { const c = this.brMyChair(); if (c && !mine.includes(c)) mine.push(c); }
    const myTeam = mine.length ? mine[0].gs.team : R.br.stats[0].team, place = R.br.place[myTeam] || R.br.teams, won = place === 1, sq = m.mini.squad || 1;
    this.overAt = this.time.now;
    add(this.add.rectangle(cx, V.height / 2, V.width, V.height, 0x0d151b, 0.7).setDepth(39));
    const glow = add(this.add.graphics().setDepth(40)); glow.fillStyle(won ? 0xffd23f : 0x3d8bff, 0.12).fillCircle(cx, 150, 260);
    T(cx, 70, won ? 'VICTORY ROYALE' : `#${place}`, { fontSize: won ? '72px' : '96px', fontStyle: 'bold', color: won ? '#ffd23f' : '#ffffff' }).setStroke('#0d151b', 10);
    T(cx, won ? 128 : 140, won ? (sq > 1 ? 'Your squad is the last one standing' : 'You are the last one standing') : `Your ${sq > 1 ? 'squad' : ''} finished ${ordinal(place)} of ${R.br.teams}`.replace('  ', ' '), { fontSize: '24px', color: '#cfd8de' });
    const team = R.br.stats.filter(s => s.team === myTeam), n = team.length, w = Math.min(280, (V.width - 120) / n - 20), h = 330, y0 = 190;
    const rows = [['ELIMINATIONS', 'kills'], ['KNOCKS', 'knocks'], ['ASSISTS', 'ast'], ['DAMAGE', 'dmg'], ['REVIVES', 'rvs'], ['REZZES', 'rzs'], ['TIME ALIVE', 'alive']];
    const best = {}; for (const [, k] of rows) best[k] = Math.max(...team.map(s => s[k]));
    team.forEach((st, i) => { const x = cx + (i - (n - 1) / 2) * (w + 20), me = mine.some(c => c.k === st.k), g = add(this.add.graphics().setDepth(40));
      g.fillStyle(0x0d151b, 0.95).fillRoundedRect(x - w / 2, y0, w, h, 14).lineStyle(me ? 4 : 2, me ? 0xffd23f : 0x2d5068, 1).strokeRoundedRect(x - w / 2, y0, w, h, 14).fillStyle(me ? 0x3a3010 : 0x16283a, 1).fillRoundedRect(x - w / 2, y0, w, 54, { tl: 14, tr: 14, bl: 0, br: 0 });
      T(x, y0 + 27, st.name.toUpperCase().slice(0, 14) + (me ? '  (YOU)' : ''), { fontSize: '22px', fontStyle: 'bold', color: me ? '#ffe27a' : '#ffffff' });
      rows.forEach(([label, k], j) => { const y = y0 + 80 + j * 36, v = k === 'alive' ? `${Math.floor(st[k] / 60)}:${String(st[k] % 60).padStart(2, '0')}` : String(st[k]), top = n > 1 && st[k] === best[k] && st[k] > 0;
        add(this.add.text(x - w / 2 + 18, y, label, { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#9fb2bf' }).setOrigin(0, 0.5).setDepth(41));
        add(this.add.text(x + w / 2 - 18, y, (top ? '★ ' : '') + v, { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: top ? '#ffd23f' : '#ffffff' }).setOrigin(1, 0.5).setDepth(41)); });
    });
    const tot = k => team.reduce((a, s) => a + s[k], 0);
    if (n > 1) T(cx, y0 + h + 30, `SQUAD:  ${tot('kills')} eliminations   ·   ${tot('dmg')} damage   ·   ${tot('rvs')} revives   ·   ${tot('rzs')} rezzes`, { fontSize: '20px', fontStyle: 'bold', color: '#cfd8de' });
    const hint = o ? (o.role === 'host' ? 'A: play again   HOLD B: back to the room' : 'Waiting for the host...') : 'A: play again (new map)   HOLD B: back to the lobby';
    const hintT = T(cx, V.height - 92, hint, { fontSize: '20px', fontStyle: 'bold', color: THEME.dim });
    const btns = o ? (o.role === 'host' ? [['Play again', 'a'], ['Back to the room', 'b']] : []) : [['Play again', 'a'], ['Back to the lobby', 'b']];
    btns.forEach(([label, b], i) => { const x = cx + (i - (btns.length - 1) / 2) * 280, tb = tapButton(this, x, V.height - 44, 250, label, () => { this.resultTap = b; }); for (const o2 of [tb.bg, tb.t, tb.hit]) { o2.setDepth(42); add(o2); } });
    this.resultHint = hintT; this.result = items; this.events.once('shutdown', () => { this.result = null; this.resultHint = null; this.overAt = undefined; });
  };
}
