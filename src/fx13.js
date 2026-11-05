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
    if (name === 'gun') { const k = extra.kick || 0; if (k) { P.R = [P.R[0] - 0.07 * k, P.R[1] + 0.035 * k, P.R[2]]; P.L = [P.L[0] - 0.06 * k, P.L[1] + 0.03 * k, P.L[2]]; }
      if (extra.pump >= 0) { const b = Math.sin(extra.pump * Math.PI) * 0.09; P.L = [P.L[0] - b, P.L[1], P.L[2]]; } }   // the shotgun pump after the last shell
    return P;
  };
  Rig.update = function (group, name, t, extra = {}) {
    upd(group, name, t, extra); const R = group.userData.rig; if (!R) return;
    if (R.item && BR_GUNS[R.itemKey]) {
      if (name === 'reload') { const A = RELOADS[R.itemKey] || RELOADS.rifle, rp = extra.rp || 0; R.item.rotation.x = kf(A.roll, rp)[0]; R.item.rotation.z += kf(A.pitch, rp)[0]; }
      else if (extra.kick) { R.item.rotation.z += 0.32 * extra.kick; R.item.position.x -= 0.03 * extra.kick; }
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
      for (const c of this.carts || []) { const p = Avatar.poseFor(c.ch, this.m, now); if (p.name === 'reload' || p.kick || p.pump >= 0) Rig.update(c.group, p.name, p.t, { layer: c.layer, item: p.item, pitch: p.pitch, sleeves: c.group.userData.sleeves, hide: c.ch.out, rp: p.rp, kick: p.kick, pump: p.pump }); } }
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
    for (const sp of this.smoke) { if (!sp.visible) continue; const u = sp.userData; u.t += dt; if (u.t > u.life) { sp.visible = false; continue; } const k = u.t / u.life; sp.position.y += u.vy * dt; sp.scale.setScalar(0.25 + k * 0.9); sp.material.opacity = 0.55 * (1 - k); }
  };
  /* the camera: recoil kicks your view up a little; in first person a drift leans the view and widens it */
  const pc = P.placeCamera;
  P.placeCamera = function (vp, dt) {
    const c = pc.call(this, vp, dt), ch = vp.chair; if (!ch || vp.mode === 'broadcast' || vp.mode === '2d') return c;
    const st = this.camFor(vp.key); let changed = false;
    if (this.m.kind === 'br' && !vp.spect && ch.gs) { const k = brKick(ch, this.m); if (k > 0.001) { c.rotateX(0.045 * k); changed = true; } }
    if (vp.mode === 'first') { const D = ch.dr, want = D && D.on ? D.dir : 0; st.lean = (st.lean || 0) + (want - (st.lean || 0)) * (1 - Math.exp(-8 * dt));
      if (Math.abs(st.lean) > 0.002) { c.rotateZ(-st.lean * 0.075); c.fov += Math.abs(st.lean) * 5; c.updateProjectionMatrix(); changed = true; } }
    if (changed) c.updateMatrixWorld(); return c;
  };
}

/* the HUD side of a drift: the screen edges glow in the drift colour (first person shows it best) and the tyres squeal */
{ const db = Emotes.driftBar.bind(Emotes);
  Emotes.driftBar = function (sc) {
    db(sc); const V = CONFIG.view, F = CONFIG.drift; if (!sc.drE || !sc.drE.scene) sc.drE = sc.add.graphics().setDepth(43); const g = sc.drE; g.clear();
    const live = new Set();
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
