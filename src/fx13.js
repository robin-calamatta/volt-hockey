/* v13.1: how guns and drifts feel.
   - Recoil: every shot kicks the gun (and your view) back; bigger guns kick harder.
   - Reloads: each gun has its own hand animation (and its own sound, see audio.js). The shotgun loads shell by shell, then pumps.
   - Drifting: the cart slides sideways, the tyres smoke, sparks fly; in first person the view leans into the drift, the edges of the
     screen glow in the drift colour and the tyres squeal. */

const BR_KICK = { pistol: 0.45, smg: 0.28, shotgun: 1.15, rifle: 0.55, sniper: 1.5, rocket: 1.9 };   // recoil strength per gun
function brKick(ch, m) {                                                  // 0..strength: how far back the gun is right now
  const G = ch.gs, it = G && G.inv && G.inv[G.sel]; if (!it || G.shotT === undefined || !m || !m.gs) return 0;
  const age = m.gs.t - G.shotT, S = BR_KICK[it.k] || 0.4; if (age < 0 || age > 0.5) return 0;
  return S * (age < 0.03 ? age / 0.03 : Math.exp(-(age - 0.03) * (it.k === 'smg' ? 22 : 11)));
}

/* reload animations: key frames for the left hand (relative to the shoulder line), the gun's roll and pitch, and when a magazine/shell is in hand */
const RELOADS = {
  pistol:  { L: [[0, .38, .72, .03], [.18, .25, .6, -.12], [.45, .25, .6, -.12], [.62, .4, .67, .14], [.8, .42, .81, .15], [.9, .33, .81, .15], [1, .38, .72, .03]], roll: [[0, 0], [.15, .5], [.7, .5], [.85, 0], [1, 0]], pitch: [[0, 0], [.1, .12], [.8, .12], [1, 0]], mag: [.18, .62] },
  smg:     { L: [[0, .38, .72, .03], [.14, .42, .65, .12], [.3, .26, .58, -.1], [.55, .26, .58, -.1], [.72, .42, .65, .13], [.85, .37, .79, .2], [.95, .3, .79, .2], [1, .38, .72, .03]], roll: [[0, 0], [.12, .6], [.78, .6], [.92, 0], [1, 0]], pitch: [[0, 0], [.1, .18], [.85, .18], [1, 0]], mag: [.3, .72] },
  rifle:   { L: [[0, .38, .72, .03], [.14, .43, .64, .12], [.3, .26, .57, -.1], [.55, .26, .57, -.1], [.72, .43, .64, .13], [.84, .4, .8, .2], [.93, .31, .8, .2], [1, .38, .72, .03]], roll: [[0, 0], [.12, .55], [.8, .55], [.92, 0], [1, 0]], pitch: [[0, 0], [.1, .22], [.85, .22], [1, 0]], mag: [.3, .72] },
  sniper:  { L: [[0, .38, .72, .03], [.1, .44, .78, .21], [.2, .33, .84, .23], [.38, .27, .59, -.1], [.58, .42, .65, .12], [.76, .34, .84, .23], [.88, .46, .78, .21], [1, .38, .72, .03]], roll: [[0, 0], [.08, .25], [.9, .25], [1, 0]], pitch: [[0, 0], [.1, .1], [.9, .1], [1, 0]], mag: [.38, .58] },
  rocket:  { L: [[0, .38, .72, .03], [.18, .1, .92, -.24], [.45, .1, .92, -.24], [.72, .18, .86, .12], [.86, .26, .8, .12], [1, .38, .72, .03]], roll: [[0, 0], [1, 0]], pitch: [[0, 0], [.15, .45], [.85, .45], [1, 0]], mag: [.18, .72], rocket: 1 },
  shotgun: { L: [[0, .38, .72, .03], [.35, .27, .6, -.12], [.72, .42, .7, .12], [1, .38, .72, .03]], roll: [[0, .7], [1, .7]], pitch: [[0, .1], [1, .1]], mag: [.35, .72], shell: 1 }
};
const kf = (keys, p) => { if (p <= keys[0][0]) return keys[0].slice(1); for (let i = 1; i < keys.length; i++) if (p <= keys[i][0]) { const a = keys[i - 1], b = keys[i], k = (p - a[0]) / Math.max(1e-6, b[0] - a[0]), e = k * k * (3 - 2 * k); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * e); } return keys[keys.length - 1].slice(1); };

/* which pose a driver is in: reloading and recoil on top of the v13 poses */
{ const pf = Avatar.poseFor.bind(Avatar);
  Avatar.poseFor = function (ch, m, now) {
    const p = pf(ch, m, now); if (!m || m.kind !== 'br' || !ch.gs) return p; const G = ch.gs, it = G.inv && G.inv[G.sel];
    if (p.name === 'gun' && it && BR_GUNS[it.k]) {
      if (G.eq > 0) return { ...p, eqk: 1 - G.eq / (G.eqT || 1) };   // taking it out: it comes up from your lap
      if (G.rl > 0 && G.rlS === G.sel) return { ...p, name: 'reload', rp: 1 - G.rl / (G.rlT || 1) };
      const pump = G.pumpT !== undefined && m.gs.t - G.pumpT < 0.35 && it.k === 'shotgun' ? (m.gs.t - G.pumpT) / 0.35 : -1;
      return { ...p, kick: brKick(ch, m), pump };
    }
    return p;
  };
}
{ const pose = Rig.pose.bind(Rig), upd = Rig.update.bind(Rig);
  Rig.pose = function (name, t, extra = {}) {
    if (name === 'reload') { const { tx } = this.K(), A = RELOADS[extra.item] || RELOADS.rifle, L = kf(A.L, extra.rp || 0), g = pose('gun', t, extra);
      return { R: [g.R[0] - 0.04, g.R[1] + 0.04, g.R[2] - 0.03], L: [tx + L[0], L[1], L[2]] }; }
    const P = pose(name, t, extra);
    if (extra.fp && name.startsWith('a_')) { const { tx } = this.K(), f = q => q && [Math.max(q[0] + 0.32, tx + 0.42), Math.max(0.86, Math.min(q[1], 1.12)), q[2] * 0.7]; P.R = f(P.R); P.L = f(P.L); }   // (first person: in front of your eyes)
    if (extra.eqk !== undefined) { const e = 1 - Math.pow(1 - Math.min(1, extra.eqk), 2), dn = 1 - e; P.R = [P.R[0] - 0.12 * dn, P.R[1] - 0.3 * dn, P.R[2]]; if (P.L) P.L = [P.L[0] - 0.1 * dn, P.L[1] - 0.25 * dn, P.L[2]]; }
    if (name === 'gun') { const k = extra.kick || 0; if (k) { P.R = [P.R[0] - 0.07 * k, P.R[1] + 0.035 * k, P.R[2]]; P.L = [P.L[0] - 0.06 * k, P.L[1] + 0.03 * k, P.L[2]]; }
      if (extra.pump >= 0) { const b = Math.sin(extra.pump * Math.PI) * 0.09; P.L = [P.L[0] - b, P.L[1], P.L[2]]; } }   // the shotgun pump after the last shell
    return P;
  };
  Rig.update = function (group, name, t, extra = {}) {
    upd(group, name, t, extra); const R = group.userData.rig; if (!R) return;
    if (R.item && BR_GUNS[R.itemKey]) {
      if (name === 'reload') { const A = RELOADS[R.itemKey] || RELOADS.rifle, rp = extra.rp || 0; R.item.rotation.x = kf(A.roll, rp)[0]; R.item.rotation.z += kf(A.pitch, rp)[0]; }
      else if (extra.kick) { R.item.rotation.z += 0.32 * extra.kick; R.item.position.x -= 0.03 * extra.kick; }
      if (extra.eqk !== undefined) { const e = Math.min(1, extra.eqk); R.item.rotation.z -= 1.1 * (1 - e) * (1 - e); R.item.rotation.x += 0.6 * (1 - e) * Math.sin(e * Math.PI); }
    }
    if (!R.mag) { R.mag = new THREE.Group(); const m1 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: 0x23272b, roughness: 0.5, metalness: 0.5 })), m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 })), m3 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 10).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5d6b3a, roughness: 0.6 }));
      m2.rotation.z = Math.PI / 2; R.mag.add(m1, m2, m3); R.mag.userData.kinds = { mag: m1, shell: m2, rocket: m3 }; group.add(R.mag); }
    const A = name === 'reload' ? RELOADS[R.itemKey] : null, rp = extra.rp || 0, show = !!(A && rp >= A.mag[0] && rp <= A.mag[1] && !extra.hide);
    R.mag.visible = show; if (show) { const L = R.sides[1].hand, K = R.mag.userData.kinds, kind = A.rocket ? 'rocket' : A.shell ? 'shell' : 'mag'; for (const k in K) K[k].visible = k === kind; R.mag.position.set(L.x + 0.01, L.y + 0.04, L.z); }
  };
}
/* pass the extra pose fields (reload progress, recoil, pump) through to the rig */
{ const P = View3D.prototype, upd = P.update;
  P.update = function (dt) {
    const r = upd.call(this, dt);
    if (this.m && this.m.kind === 'br') { const now = performance.now() / 1000;
      for (const c of this.carts || []) { const p = Avatar.poseFor(c.ch, this.m, now); if (p.name === 'reload' || p.name === 'melee' || p.kick || p.pump >= 0 || p.eqk !== undefined) Rig.update(c.group, p.name, p.t, { layer: c.layer, item: p.item, pitch: p.pitch, sleeves: c.group.userData.sleeves, hide: c.ch.out, rp: p.rp, kick: p.kick, pump: p.pump, eqk: p.eqk }); } }
    if (this.sc && this.sc.vps) { const now = performance.now() / 1000;                   // first person: an emote's arms come out in front of you, where you can see them
      for (const vp of this.sc.vps) { if (vp.mode !== 'first' || !vp.chair || vp.spect) continue; const c = (this.carts || []).find(k => k.ch === vp.chair); if (!c) continue; const p = Avatar.poseFor(c.ch, this.m, now);
        if (p.name && p.name.startsWith('a_')) Rig.update(c.group, p.name, p.t, { layer: c.layer, item: p.item, pitch: p.pitch, sleeves: c.group.userData.sleeves, hide: c.ch.out, fp: true }); } }
    this.driftFx(dt); return r;
  };
  /* drift effects in the 3D view: a sideways slide, tyre smoke and bigger sparks */
  P.driftFx = function (dt) {
    if (!this.scene) return; const F = CONFIG.drift;
    if (!this.smoke) { this.smoke = []; const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(235,235,235,0.85)'); gr.addColorStop(1, 'rgba(235,235,235,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); this.smokeTex = new THREE.CanvasTexture(cv); }
    for (const c of this.carts || []) {
      const D = c.ch.dr, on = D && D.on && !c.ch.out; c.slide = (c.slide || 0) + (((on ? D.dir * 0.22 : 0)) - (c.slide || 0)) * (1 - Math.exp(-10 * dt));
      const fp = this.sc && this.sc.vps && this.sc.vps.some(v => v.mode === 'first' && v.chair === c.ch); if (Math.abs(c.slide) > 0.003 && !fp) c.group.rotation.y -= c.slide;   // (not under your own first-person view)                      // the back swings out
      if (c.sparks) for (const s of c.sparks) if (s.visible) s.scale.multiplyScalar(1.8);
      if (on && (c.smokeAcc = (c.smokeAcc || 0) + dt) > 0.045) { c.smokeAcc = 0;
        for (const sd of [1, -1]) { const sp = this.smoke.find(o => !o.visible) || (this.smoke.length < 160 ? (() => { const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeTex, transparent: true, depthWrite: false, opacity: 0.6 })); this.scene.add(o); this.smoke.push(o); return o; })() : null); if (!sp) break;
          const w = new THREE.Vector3(CONFIG.view3d.cart.seatX - 0.32, 0.08, sd * 0.3); c.group.localToWorld(w); sp.position.copy(w); sp.visible = true; sp.userData = { life: 0.7, t: 0, vy: 0.5 + Math.random() * 0.4, col: D.lvl }; sp.material.color.setHex(D.lvl >= 2 ? 0xeee6ff : 0xffffff); sp.scale.setScalar(0.25); }
      }
    }
    /* v13.5: the boost out of a drift: flames out of the back wheels and a short trail of fire on the ground */
    if (!this.flameTex) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 1, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,220,1)'); gr.addColorStop(0.3, 'rgba(255,200,60,0.9)'); gr.addColorStop(0.65, 'rgba(255,90,20,0.5)'); gr.addColorStop(1, 'rgba(255,40,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); this.flameTex = new THREE.CanvasTexture(cv); this.flames = []; }
    const flame = () => this.flames.find(o => !o.visible) || (this.flames.length < 220 ? (() => { const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); this.scene.add(o); this.flames.push(o); return o; })() : null);
    for (const c of this.carts || []) { const ch = c.ch, D = ch.dr || {}, on = !ch.out && (D.boost > 0 || ch.boostLeft > 0 || (ch.gs && ch.gs.boost > 0));
      /* v14: every boost (a drift's or an item's) kicks off with a front wheelie */
      if (on && !c.boostWas) c.wheelie = 1; c.boostWas = on; if (c.wheelie > 0) { c.wheelie = Math.max(0, c.wheelie - dt * 1.35); const w = Math.sin(Math.min(1, (1 - c.wheelie) * 1.6) * Math.PI) * (1 - (1 - c.wheelie) * 0.4), a = 0.32 * w; c.wA = a; c.group.position.y += Math.sin(a) * 0.36; } else c.wA = 0;
      { const cur = c.group.rotation.z, base = c.wSet !== undefined && cur === c.wSet ? c.wBase : cur; c.wBase = base; c.group.rotation.z = c.wSet = base + (c.wA || 0); }   /* (tilt on top of whatever the mode set: a ramp in Volt Royale) */
      if (!on) { c.flameAcc = 0; continue; }
      const hot = D.boost > 0 ? (D.lvl >= 3 ? 0xd89bff : D.lvl >= 2 ? 0xffb347 : 0x9fe8ff) : 0xffb347;   /* (the colour of the drift level) */
      if ((c.flameAcc = (c.flameAcc || 0) + dt) > 0.025) { c.flameAcc = 0;
        for (const sd of [1, -1]) { const w = new THREE.Vector3(CONFIG.view3d.cart.seatX - 0.42, 0.14, sd * 0.32); c.group.localToWorld(w);
          const f1 = flame(); if (f1) { f1.position.copy(w); f1.visible = true; f1.userData = { t: 0, life: 0.22, s0: 0.38, vy: 0.9, trail: false }; f1.material.color.setHex(0xffffff); }
          const f2 = flame(); if (f2) { f2.position.set(w.x, 0.06 + (c.group.position.y || 0), w.z); f2.visible = true; f2.userData = { t: 0, life: 1.0, s0: 0.28, vy: 0.05, trail: true }; f2.material.color.setHex(hot); } } } }
    for (const f of this.flames) { if (!f.visible) continue; const u = f.userData; u.t += dt; if (u.t > u.life) { f.visible = false; continue; } const k = u.t / u.life; f.position.y += u.vy * dt; f.scale.setScalar(u.trail ? u.s0 * (1 - k * 0.6) * (0.85 + Math.random() * 0.3) : u.s0 * (1 + k)); f.material.opacity = u.trail ? 0.9 * (1 - k) : 1 - k; }
    for (const sp of this.smoke) { if (!sp.visible) continue; const u = sp.userData; u.t += dt; if (u.t > u.life) { sp.visible = false; continue; } const k = u.t / u.life; sp.position.y += u.vy * dt; sp.scale.setScalar(0.25 + k * 0.9); sp.material.opacity = 0.55 * (1 - k); }
  };
  /* the camera: recoil kicks your view up a little; in first person a drift leans the view and widens it */
  const pc = P.placeCamera;
  P.placeCamera = function (vp, dt) {
    const c = pc.call(this, vp, dt), ch = vp.chair; if (!ch || vp.mode === 'broadcast' || vp.mode === '2d') return c;
    const st = this.camFor(vp.key); let changed = false;
    if (this.m.kind === 'br' && !vp.spect && ch.gs && vp.mode === 'first') {           // aiming in first person: the camera looks exactly where the shots go, so the scope and crosshair sit in the middle
      st.adsK = (st.adsK || 0) + ((brAds(ch) ? 1 : 0) - (st.adsK || 0)) * (1 - Math.exp(-12 * dt));
      if (st.adsK > 0.01) { const p0 = vp.p || {}, a = ch.heading + (p0._look ? p0._look.x * CONFIG.view3d.look.yaw * Math.PI / 180 : 0), pt = brPitch(ch), z = (ch.gs.z || 0) + 0.55, T = new THREE.Vector3(ch.x + Math.cos(a) * 30 * Math.cos(pt), z + Math.sin(pt) * 30, ch.y + Math.sin(a) * 30 * Math.cos(pt));
        const q0 = c.quaternion.clone(); c.lookAt(T); c.quaternion.copy(q0.slerp(c.quaternion, st.adsK)); changed = true; } }
    if (this.m.kind === 'br' && !vp.spect && ch.gs) { const k = brKick(ch, this.m); if (k > 0.001) { c.rotateX(0.045 * k); changed = true; } }
    if (vp.mode === 'first') { const D = ch.dr, want = D && D.on ? D.dir : 0; st.lean = (st.lean || 0) + (want - (st.lean || 0)) * (1 - Math.exp(-8 * dt));
      if (Math.abs(st.lean) > 0.002) { c.rotateZ(-st.lean * 0.075); c.fov += Math.abs(st.lean) * 5; c.updateProjectionMatrix(); changed = true; } }
    { const D = ch.dr, want = (D && D.boost > 0) || ch.boostLeft > 0 || (ch.gs && ch.gs.boost > 0) ? 1 : 0; st.bst = (st.bst || 0) + (want - (st.bst || 0)) * (1 - Math.exp(-(want ? 14 : 4) * dt));   /* the boost: the view punches wider */
      if (st.bst > 0.01) { c.fov += st.bst * (vp.mode === 'first' ? 14 : 9); c.updateProjectionMatrix(); changed = true; } }
    if (changed) c.updateMatrixWorld(); return c;
  };
}

/* the HUD side of a drift: the screen edges glow in the drift colour (first person shows it best) and the tyres squeal */
{ const db = Emotes.driftBar.bind(Emotes);
  Emotes.driftBar = function (sc) {
    db(sc); const V = CONFIG.view, F = CONFIG.drift; if (!sc.drE || !sc.drE.scene) sc.drE = sc.add.graphics().setDepth(43); const g = sc.drE; g.clear();
    const live = new Set();
    for (const p of Progress.mine(sc)) { const c = p.chair; if (c && !c.out && sc.match.state === 'play') Sound.motor((p.id || p.tag || 'p') + '', Math.hypot(c.vx, c.vy) / CONFIG.chair.maxSpeed); }   /* (the motor under your own cart) */
    for (const p of Progress.mine(sc)) { const c = p.chair, D = c && c.dr, id = (p.id || p.tag || 'p') + ''; if (!D || c.out || !D.on) continue; live.add(id);
      const vp = sc.vps && sc.vps.find(v => v.p === p), R = vp ? vp.rect : { x: 0, y: 0, w: V.width, h: V.height }, mode = vp ? vp.mode : Settings.camMode, col = F.colors[Math.max(1, D.lvl)] || 0xffffff;
      Sound.driftLoop(id, true, D.lvl);
      if (mode === 'first' || mode === 'third') { const a = 0.1 + 0.05 * D.lvl + 0.04 * Math.sin(sc.time.now / 60), w = 26 + D.lvl * 10, side = D.dir > 0 ? 1 : -1;   // the outside edge glows stronger
        for (let i = 0; i < 6; i++) { const k = 1 - i / 6; g.fillStyle(col, a * k * (side > 0 ? 1 : 0.55)).fillRect(R.x + R.w - w * (i + 1) / 6 * 1.0 - 0, R.y, w / 6, R.h); g.fillStyle(col, a * k * (side < 0 ? 1 : 0.55)).fillRect(R.x + w * i / 6, R.y, w / 6, R.h); }
        for (let i = 0; i < 5; i++) { const y = R.y + R.h * (0.3 + 0.6 * ((sc.time.now / 400 + i * 0.21) % 1)), x = side > 0 ? R.x + R.w - 40 - i * 7 : R.x + 40 + i * 7; g.lineStyle(2, col, 0.5).lineBetween(x, y, x - side * 30, y + 26); }   // speed streaks
      }
    }
    for (const id of Object.keys(Sound.drifts || {})) if (!live.has(id)) Sound.driftLoop(id, false);
  };
}
