/* v14.3.12 Volt Royale grenades. Found in chests and on the floor (2 at a time, up to 4). Select one and press fire (RT, left mouse, touch
   FIRE) to throw it: it flies in an arc, bounces off the ground, floors and walls, and goes off 2 seconds after it leaves your hand.
   The blast: up to 70 damage (less further out, 4.5 m across the middle of it), a shove away from the middle, and it smashes doors and
   shield walls. Your own grenade hurts you less (40%) and doesn't hurt your teammates. CPUs throw them too, at enemies 7 to 20 m away. */
const BR_NADE = { fuse: 2, speed: 12, up: 4.6, g: 18, r: 4.5, dmg: 70, push: 7, door: 150, cd: 0.9 };
Object.assign(BR_ITEMS, { nade: { name: 'GRENADE', icon: '💣', stack: 4, pick: 2, col: 0x55703a, about: 'throw it (fire): it bounces, then blows up 2 seconds later' } });
BR_LOOT.push(['nade', 2.4]);
{ const B = MODES.br, use0 = B.use, step0 = B.step;
  B.use = function (c, m) {
    const G = c.gs, it = !c.out && !G.down && !G.use && !G.hol && G.inv[G.sel];
    if (it && it.k === 'nade') {
      if (G.cd > 0 || G.plane || G.glide) return;
      const pitch = Math.max(-0.5, Math.min(0.9, c._nadeP !== undefined ? c._nadeP : c.player ? brPitch(c) : 0)), sp = BR_NADE.speed * (0.75 + 0.35 * Math.cos(pitch)), a = c.heading + (c.player && c.player._look ? c.player._look.x * CONFIG.view3d.look.yaw * Math.PI / 180 : 0);
      const p = c.toWorld(0.6, 0); MG.add(m, { t: 'nade', x: MG.r2(p.x), y: MG.r2(p.y), z: MG.r2((G.z || 0) + 1.1), vx: Math.cos(a) * sp + (c.vx || 0) * 0.5, vy: Math.sin(a) * sp + (c.vy || 0) * 0.5, vz: BR_NADE.up + pitch * 5, k: m.chairs.indexOf(c), at: MG.r2(m.gs.t + BR_NADE.fuse), lv: G.lv || 0 });
      this.sfxNear(m, 'blip', c.x, c.y); G.cd = BR_NADE.cd; this.spend(c, G.sel); return;
    }
    return use0.call(this, c, m);
  };
  B.step = function (m, h) {
    const r = step0.call(this, m, h), M = this.map(m), g = m.gs;
    for (const o of MG.all(m, 'nade')) {
      o.vz -= BR_NADE.g * h; let nx = o.x + o.vx * h, ny = o.y + o.vy * h, nz = o.z + o.vz * h;
      const lv = Math.max(0, Math.floor((o.z + 0.05) / BR.H));
      if (nx < 1 || ny < 1 || nx > m.width - 1 || ny > m.height - 1 || brWallAt(M, lv, nx, ny) || (lv === 0 && nz < 1.2 && brTreesNear(M, nx, ny).some(t => Math.hypot(nx - t.x, ny - t.y) < t.r))) {   // a wall: bounce off it
        const bx = brWallAt(M, lv, nx, o.y), by = brWallAt(M, lv, o.x, ny); if (bx || !by) o.vx *= -0.45; if (by || !bx) o.vy *= -0.45; nx = o.x; ny = o.y;
      }
      /* the floor under it: the ground, or the floor of the storey it's over */
      let floor = 0; for (let k = Math.min(4, Math.floor((o.z + 0.05) / BR.H)); k >= 1; k--) if (this.floorAt(M, k, nx, ny)) { floor = k * BR.H; break; }
      if (nz < floor + 0.08 && o.vz < 0) { nz = floor + 0.08; o.vz = Math.abs(o.vz) > 2 ? -o.vz * 0.35 : 0; o.vx *= 0.6; o.vy *= 0.6; }
      o.x = MG.r2(nx); o.y = MG.r2(ny); o.z = Math.round(nz * 1000) / 1000;
      if (g.t >= o.at) { MG.remove(m, o); this.nadeBoom(m, o); }
    }
    return r;
  };
  B.nadeBoom = function (m, o) {
    const M = this.map(m), g = m.gs, R = BR_NADE.r, sh = m.chairs[o.k];
    MG.add(m, { t: 'boom', x: MG.r2(o.x), y: MG.r2(o.y), z: o.z, life: 0.8 }); m.sfx('boom', 0, { x: o.x, y: o.y, z: o.z || 0 });
    for (const c of m.chairs) { if (c.out || Math.abs((c.gs.z || 0) - o.z) > 1.8) continue; const d = Math.hypot(c.x - o.x, c.y - o.y); if (d >= R) continue;
      if (!(sh && c !== sh && c.gs.team === sh.gs.team)) this.hurt(m, c, BR_NADE.dmg * (1 - d / R * 0.7) * (c === sh ? 0.4 : 1), sh);
      const k = BR_NADE.push * (1 - d / R); c.vx += (c.x - o.x) / (d || 1) * k; c.vy += (c.y - o.y) / (d || 1) * k; }
    if (M.doors && g.dr) for (const d of M.doors) { if (g.dr[d.door] === 0 && Math.abs(o.z) < BR.H && Math.hypot(d.cx - o.x, d.cy - o.y) < R * 0.8 && this.hitDoor) this.hitDoor(m, d.door, BR_NADE.door); }
    for (const w of MG.all(m, 'dwall')) if (Math.hypot(w.x - o.x, w.y - o.y) < R) w.hp -= 200;
  };
}
/* CPUs throw them: an enemy they can see 7 to 20 m away, now and then */
{ const ai0 = miniAI;
  miniAI = function (c, m, h) {
    const cmd = ai0(c, m, h); if (m.kind !== 'br' || c.player || m.state !== 'play' || !cmd) return cmd;
    const G = c.gs; if (!G || G.down || G.plane || G.glide || G.use || G.cd > 0 || (c._nadeT || 0) > m.simTime) return cmd;
    const n = G.inv.findIndex(i => i.k === 'nade'); if (n < 0) return cmd;
    c._nadeT = m.simTime + 2 + Math.random() * 3;
    const foe = m.chairs.find(o => !o.out && !o.gs.down && o.gs.team !== G.team && o.gs.lv === G.lv && Math.abs(o.gs.z - G.z) < 1 && (d => d > 7 && d < 20)(Math.hypot(o.x - c.x, o.y - c.y)));
    if (!foe || Math.random() < 0.5 || !MG.clearPath(c.x, c.y, foe.x, foe.y, brWallsNear(MODES.br.map(m), Math.min(c.x, foe.x) - 1, Math.min(c.y, foe.y) - 1, Math.max(c.x, foe.x) + 1, Math.max(c.y, foe.y) + 1).filter(w => w.lv === G.lv), 0.2)) return cmd;
    /* face it, pick the grenade, throw (the range is set by the angle: about 9 m flat, further aimed up) */
    const d = Math.hypot(foe.x - c.x, foe.y - c.y), was = G.sel, wasHol = G.hol; c.heading = Math.atan2(foe.y - c.y, foe.x - c.x); G.sel = n; G.hol = 0; c._nadeP = Math.max(-0.3, Math.min(0.8, (d - 9) / 14));
    MODES.br.use(c, m); c._nadeP = undefined; if (G.inv[was]) G.sel = G.inv.findIndex(i => i === G.inv[was]) >= 0 ? G.inv.indexOf(G.inv[was]) : 0; if (wasHol) G.hol = wasHol;
    return cmd;
  };
}
/* how they look: a green pineapple with a lever, in your hands, on the floor and flying */
{ const geo = Items3D.geo.bind(Items3D);
  Items3D.geo = function (k) {
    if (k !== 'nade') return geo(k); if (this.cache[k]) return this.cache[k];
    return (this.cache[k] = this.build([[new THREE.SphereGeometry(0.075, 12, 10).scale(1, 1.2, 1), 0x55703a], [new THREE.CylinderGeometry(0.03, 0.035, 0.05, 10).translate(0, 0.1, 0), 0x3a3f46], [new THREE.BoxGeometry(0.02, 0.1, 0.02).translate(0.04, 0.07, 0), 0xb8bec6], [new THREE.TorusGeometry(0.025, 0.006, 6, 12).translate(-0.035, 0.12, 0), 0xd0d4d8]]));
  };
  const r = Items3D.rarity.bind(Items3D); Items3D.rarity = k => k === 'nade' ? 'uncommon' : r(k);
}
{ const icon = brDrawIcon;
  brDrawIcon = function (c, k) {
    if (k !== 'nade') return icon(c, k);
    c.clearRect(0, 0, 128, 72); c.fillStyle = '#55703a'; c.beginPath(); c.ellipse(64, 42, 20, 24, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#3f5529'; c.lineWidth = 3; for (const y of [32, 44, 56]) { c.beginPath(); c.moveTo(46, y); c.lineTo(82, y); c.stroke(); }
    c.fillStyle = '#3a3f46'; c.fillRect(56, 12, 16, 9); c.fillStyle = '#b8bec6'; c.fillRect(70, 14, 6, 26); c.strokeStyle = '#d0d4d8'; c.lineWidth = 2; c.beginPath(); c.arc(50, 14, 6, 0, Math.PI * 2); c.stroke();
  };
}
{ const P = View3D.prototype, up = P.updateBR;
  P.updateBR = function (dt) {
    const r = up.call(this, dt), g = this.m && this.m.gs; if (!g) return r;
    const N = this.nade3 || (this.nade3 = new Map()), seen = new Set();
    for (const o of g.objs || []) { if (o.t !== 'nade') continue; seen.add(o.id); let Q = N.get(o.id);
      if (!Q) { Q = new THREE.Group(); const body = Items3D.mesh('nade'); body.scale.setScalar(1.6); Q.add(body);
        const blink = new THREE.Sprite(new THREE.SpriteMaterial({ map: Items3D.glowTex(), color: 0xff3b2f, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); blink.scale.set(0.5, 0.5, 1); blink.position.y = 0.22; Q.add(blink); Q.userData.blink = blink; Q.userData.body = body;
        this.scene.add(Q); N.set(o.id, Q); }
      Q.position.set(o.x, (o.z || 0), o.y); Q.userData.body.rotation.x += dt * 9; Q.userData.body.rotation.z += dt * 5;
      const left = Math.max(0, (o.at || 0) - (g.t || 0)); Q.userData.blink.visible = Math.sin(performance.now() / 1000 * (left < 0.7 ? 40 : 14)) > 0; }
    for (const [id, Q] of N) if (!seen.has(id)) { this.scene.remove(Q); N.delete(id); }
    return r;
  };
}
/* v14.3.17 no wait after switching weapons. Every gun shared one "ready to fire" timer, so after a sniper shot (or a heal) the next weapon
   you picked had to wait out that timer too. Now each weapon keeps its own wait (switching away from a sniper and back doesn't skip it),
   and the weapon you switch to is ready at once, or after the admin's "delay after switching weapons" (Game tab, in ms, 0 by default). */
{ const B = MODES.br, sw = () => Math.max(0, +((typeof GameCfg !== 'undefined' && GameCfg.brSwitchMs) || 0)) / 1000;
  const around = (fn, c, m, call) => {
    const G = c && c.gs; if (!G || !m || !m.gs) return call(); const t = m.gs.t || 0, prev = G.hol ? null : G.inv[G.sel];
    if (prev && G.cd > 0) prev.cdT = t + G.cd;                                       // the weapon put away keeps its own wait
    const r = call(), now = G.hol ? null : G.inv[G.sel];
    if (now !== prev) { const rem = now && now.cdT ? Math.max(0, now.cdT - t) : 0; G.cd = now ? Math.max(rem, sw()) : 0; }
    return r;
  };
  for (const k of ['cycle', 'holster']) { const f = B[k]; if (typeof f === 'function') B[k] = function (c, m, ...a) { return around(k, c, m, () => f.call(this, c, m, ...a)); }; }
  const ia = B.invAct; B.invAct = function (c, act, m) { return around('invAct', c, m, () => ia.call(this, c, act, m)); };
}
