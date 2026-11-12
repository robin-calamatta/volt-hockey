/* v14.1 Volt Royale: the drop, and pings.
   - THE DROP: every game starts with everyone on the Volt Jet, flying straight across the map. Press A (jump) to jump out wherever you like:
     you fall, the parachute opens, you steer as you glide down and land without a scratch. Your CPU team-mates jump with you.
     Anyone still on board at the far edge is thrown out there. The storm waits until the jet has gone.
   - PINGS: d-pad ◀ (C on the keyboard) pings what you're facing: an enemy (red, it follows them for a few seconds), loot (gold, says what it
     is), or just a spot (blue, "go here"). Your squad sees it in the world and on screen with how far away it is, even when it's behind them. */
const DROP = { z: 42, speed: 24, fall: 9, glideV: 4.2, glideH: 9 };
const PING = { life: 8, enemy: 4.5, perPlayer: 2, reach: 60 };
{ const M = MODES.br, ko = M.kickoff, mv = M.move, jp = M.jump, st = M.step, hu = M.hurt;
  M.kickoff = function (m) {
    ko.call(this, m); const g = m.gs, W = m.width, H = m.height, a = Math.random() * Math.PI * 2, cx = W / 2 + (Math.random() - 0.5) * W * 0.3, cy = H / 2 + (Math.random() - 0.5) * H * 0.3, half = Math.hypot(W, H) / 2 * 0.8;   /* (inside the storm circle the whole way) */
    const ax = cx - Math.cos(a) * half, ay = cy - Math.sin(a) * half, bx = cx + Math.cos(a) * half, by = cy + Math.sin(a) * half, len = Math.hypot(bx - ax, by - ay);
    const tf = {}; for (const c of m.chairs) if (tf[c.gs.team] === undefined) tf[c.gs.team] = MG.r2(0.1 + Math.random() * 0.8);
    g.drop = { ax: MG.r2(ax), ay: MG.r2(ay), bx: MG.r2(bx), by: MG.r2(by), dur: MG.r2(Math.max(14, len / DROP.speed)), t: 0, tf };
    for (const c of m.chairs) Object.assign(c.gs, { plane: 1, glide: 0, z: DROP.z, air: 1, vz: 0, ramp: -1 });
    if (g.st) g.st.wait += g.drop.dur + 10; this.planeAt(m, 0, true);
  };
  M.planeAt = function (m, u, place) { const D = m.gs.drop, x = D.ax + (D.bx - D.ax) * u, y = D.ay + (D.by - D.ay) * u, h = Math.atan2(D.by - D.ay, D.bx - D.ax);
    if (place) for (const c of m.chairs) if (c.gs.plane) Object.assign(c, { x, y, px: x, py: y, heading: h, ph: h, vx: Math.cos(h) * DROP.speed, vy: Math.sin(h) * DROP.speed }); return { x, y, h }; };
  M.leavePlane = function (m, c) { const G = c.gs; if (!G.plane) return; G.plane = 0; G.glide = 1; G.air = 1; G.vz = -2; G.kickJ = 1; c.vx *= 0.25; c.vy *= 0.25;
    if (c.player) { MODES.br.psfx(m, c, 'whistle'); MODES.br.say(m, c, 'GERONIMO!'); const D = m.gs.drop, u = D.t / D.dur; for (const t of [G.team]) D.tf[t] = Math.min(D.tf[t], MG.r2(u + 0.015)); } };
  M.step = function (m, h, ...a) {
    const g = m.gs, D = g.drop;
    if (D && D.t < D.dur + 0.5) { D.t += h; const u = Math.min(1, D.t / D.dur); this.planeAt(m, u, true);
      for (const c of m.chairs) if (c.gs.plane && !c.out && (u >= 1 || (!c.player && u >= D.tf[c.gs.team]))) this.leavePlane(m, c); }
    else if (D && D.t < D.dur + 6) D.t = MG.r2(D.t + h);   /* v14.1.5: the empty jet flies on and away (it used to stop and hang at the end of its path forever) */
    if (g.pings) { g.pings = g.pings.filter(p => g.t - p.t < (p.kind === 'enemy' ? PING.enemy : PING.life) && !(p.lid && !(g.L || []).some(L => L[0] === p.lid)));
      for (const p of g.pings) if (p.kind === 'enemy') { const o = m.chairs[p.tk]; if (o && !o.out) { p.x = MG.r2(o.x); p.y = MG.r2(o.y); p.z = MG.r2(o.gs.z || 0); } } }
    return st.call(this, m, h, ...a);
  };
  M.move = function (m, c, h) {
    const G = c.gs;
    if (G.plane) { G.z = DROP.z; G.air = 1; G.vz = 0; return; }
    if (G.glide) {
      let push = 1;
      if (!c.player) { const T = G.dropTo || (G.dropTo = this.freeGround(m) || { x: m.width / 2, y: m.height / 2 }), want = Math.atan2(T.y - c.y, T.x - c.x); c.heading += normalizeAngle(want - c.heading) * Math.min(1, h * 2); }
      else { const S = c.player.src || {}, mag = Math.min(1, Math.hypot(+S.ax || 0, +S.ay || 0)); push = 0.45 + 0.8 * mag; }   /* (steer the parachute with the stick like driving: push to glide that way, let go to drift down slowly) */
      const sp = (G.vz < -DROP.glideV - 0.5 ? DROP.glideH * 0.6 : DROP.glideH) * push; c.vx += (Math.cos(c.heading) * sp - c.vx) * Math.min(1, h * 2.5); c.vy += (Math.sin(c.heading) * sp - c.vy) * Math.min(1, h * 2.5);
      const r = mv.call(this, m, c, h); if (G.air) { if (G.z < DROP.z - 6) G.vz = Math.max(G.vz, -DROP.glideV); else G.vz = Math.max(G.vz, -DROP.fall); G.kickJ = 1; } else { G.glide = 0; G.dropTo = null; if (c.player) MODES.br.psfx(m, c, 'bump'); } return r;
    }
    return mv.call(this, m, c, h);
  };
  { const ai = M.ai; if (ai) M.ai = function (c, m, ...a) { const G = c.gs; if (G && (G.plane || G.glide)) { const T = G.dropTo || { x: m.width / 2, y: m.height / 2 }, an = Math.atan2(T.y - c.y, T.x - c.x); return { x: Math.cos(an), y: Math.sin(an), spin: 0, speed: 1 }; } const r = ai.call(this, c, m, ...a); if (r && !(r.speed === undefined || r.speed === r.speed)) r.speed = 0; return r; }; }
  M.jump = function (c, m) { if (c.gs && c.gs.plane) { if (m && m.state === 'play') this.leavePlane(m, c); return; } if (c.gs && c.gs.glide) return; return jp.call(this, c, m); };
  M.hurt = function (m, c, ...a) { if (c && c.gs && (c.gs.plane || (c.gs.glide && c.gs.z > 6))) return; return hu.call(this, m, c, ...a); };
  /* pings */
  M.pingAt = function (m, c, x, y) { const g = m.gs, G = c && c.gs; if (!G || c.out || m.state !== 'play' || !(x >= 0 && y >= 0 && x <= m.width && y <= m.height)) return; g.pings = g.pings || []; g.pid = (g.pid || 0) + 1;
    const mine = g.pings.filter(p => p.by === c.k); if (mine.length >= PING.perPlayer) g.pings = g.pings.filter(p => p !== mine[0]); g.pings.push({ id: g.pid, team: G.team, by: c.k, t: MG.r2(g.t), kind: 'spot', label: 'GO HERE', x: MG.r2(x), y: MG.r2(y), z: 0 }); };
  M.ping = function (m, c) {
    const g = m.gs, G = c.gs; if (!c || c.out || !G || G.plane || m.state !== 'play') return; g.pings = g.pings || []; g.pid = (g.pid || 0) + 1;
    const last = g.pings.filter(p => p.by === c.k).pop();
    if (last && g.t - last.t < 0.45 && last.kind !== 'enemy' && last.kind !== 'danger') { last.kind = 'danger'; last.label = 'DANGER'; last.t = MG.r2(g.t); last.lid = 0; return; }   /* (ping twice quickly: DANGER) */
    const a = c.heading + (G.ap ? 0 : 0), ca = Math.cos(a), sa = Math.sin(a), cone = (x, y, maxD, ang) => { const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy); if (d > maxD || d < 0.5) return null; const off = Math.abs(normalizeAngle(Math.atan2(dy, dx) - a)); return off < ang ? d * (1 + off * 3) : null; };
    let best = null, sc = 1e9;
    for (const o of m.chairs) if (o !== c && !o.out && o.gs.team !== G.team) { const s = cone(o.x, o.y, PING.reach, 0.22); if (s !== null && s < sc) { sc = s; best = { kind: 'enemy', tk: m.chairs.indexOf(o), x: o.x, y: o.y, z: o.gs.z || 0, label: 'ENEMY' }; } }
    if (!best) for (const L of g.L || []) { if (['chestO', 'ammoO'].includes(L[1])) continue; const s = cone(L[2], L[3], 40, 0.2); if (s !== null && s < sc) { sc = s; best = { kind: 'loot', lid: L[0], x: L[2], y: L[3], z: L[4] * BR.H, label: L[1] === 'chest' ? 'CHEST' : L[1] === 'ammo' ? 'AMMO BOX' : L[1] === 'card' ? 'REZ CARD' : String(brName(L[1], L[12] || 0)).toUpperCase() }; } }
    if (!best) { const Mp = this.map(m); let d = 2; for (; d < 45; d += 1) { const x = c.x + ca * d, y = c.y + sa * d; if (x < 1 || y < 1 || x > m.width - 1 || y > m.height - 1 || Mp.walls.some(w => w.lv === (G.lv || 0) && x > w.x0 && x < w.x1 && y > w.y0 && y < w.y1)) break; } best = { kind: 'spot', x: c.x + ca * (d - 1), y: c.y + sa * (d - 1), z: (G.lv || 0) * BR.H, label: 'GO HERE' }; }
    const mine = g.pings.filter(p => p.by === c.k); if (mine.length >= PING.perPlayer) g.pings = g.pings.filter(p => p !== mine[0]);
    g.pings.push({ id: g.pid, team: G.team, by: c.k, t: MG.r2(g.t), ...best, x: MG.r2(best.x), y: MG.r2(best.y), z: MG.r2(best.z) });
  };
}
/* the button: d-pad ◀ (C) pings; online it goes to the host */
{ const pi = brPadInput; brPadInput = function (sc, m, p, src, dt) { if (src && src.pressed && src.pressed.speedDown && src.id !== 'touch' && p.chair && !p.invOpen) MODES.br.ping(m, p.chair); return pi(sc, m, p, src, dt); };
  const pe = brPadEvents; brPadEvents = function (L, input, dt, clock) { if (input && input.pressed && input.pressed.speedDown && input.id !== 'touch' && L.me && !L.me.invOpen) L.pending.push('png'); return pe(L, input, dt, clock); };
  const ap = HostSession.prototype.applyTo; HostSession.prototype.applyTo = function (p, x, y, events) { if (p && p.chair && Array.isArray(events) && events.includes('png') && this.match && this.match.kind === 'br') MODES.br.ping(this.match, p.chair); return ap.call(this, p, x, y, Array.isArray(events) ? events.filter(e => e !== 'png') : events); };
  const ub = MiniMatch.prototype.useBy; if (ub) MiniMatch.prototype.useBy = function (p, ...a) { if (p && p.chair && p.chair.gs && p.chair.gs.plane) return; return ub.call(this, p, ...a); };
}

/* ---- drawing: the jet, parachutes, ping markers ---- */
const PING_COL = { enemy: 0xff3b3b, danger: 0xff3b3b, loot: 0xffd23f, spot: 0x3dd6ff }, PING_ICON = { enemy: '⚠', danger: '⚠', loot: '◆', spot: '📍' }, pingFade = (p, t) => { const life = p.kind === 'enemy' ? PING.enemy : PING.life, left = life - (t - p.t); return Math.max(0, Math.min(1, left / 1.5)); };
{ const P = View3D.prototype, upd = P.update;
  P.update = function (dt) {
    const r = upd.call(this, dt), m = this.m; if (!m || m.kind !== 'br' || !m.gs) return r; const g = m.gs, D = g.drop, now = performance.now() / 1000;
    if (D && D.t < D.dur + 5.5) {
      if (!this.jet) this.jet = this.makeJet(); if (!this.jet.parent) this.scene.add(this.jet);
      const u = D.t / D.dur, x = D.ax + (D.bx - D.ax) * u, y = D.ay + (D.by - D.ay) * u; const hd = Math.atan2(D.by - D.ay, D.bx - D.ax); this.jet.visible = u < 1 + 5 / D.dur; this.jet.position.set(x + Math.cos(hd) * 16, DROP.z - 5 + 0.3 * Math.sin(now * 1.3), y + Math.sin(hd) * 16);   /* (just ahead of and below where you ride, so your camera sees it) */ this.jet.rotation.y = -Math.atan2(D.by - D.ay, D.bx - D.ax); this.jet.rotation.x = 0.04 * Math.sin(now * 0.9);
      this.jet.userData.props.forEach(p => { p.rotation.x = now * 40; });
    } else if (this.jet) this.jet.visible = false;
    for (const c of this.carts || []) { const G = c.ch.gs || {}; if (G.plane) c.group.visible = false;
      if (G.glide && G.z > 0.5) { if (!c.chute) { c.chute = this.makeChute(c.ch.k); c.group.add(c.chute); } c.chute.visible = true; c.chute.rotation.z = 0.08 * Math.sin(now * 2 + c.ch.k); } else if (c.chute) c.chute.visible = false; }
    /* pings for your squad */
    const myTeam = this.sc && this.sc.brMyTeam ? this.sc.brMyTeam() : -1; this.pingM = this.pingM || new Map(); const seen = new Set();
    for (const p of g.pings || []) { if (p.team !== myTeam) continue; seen.add(p.id); let o = this.pingM.get(p.id); if (!o) { o = this.makePing(PING_COL[p.kind]); this.scene.add(o); this.pingM.set(p.id, o); }
      if (o.userData.kind !== p.kind) { this.scene.remove(o); o = this.makePing(PING_COL[p.kind]); o.userData.kind = p.kind; this.scene.add(o); this.pingM.set(p.id, o); }
      const fd = pingFade(p, g.t); o.position.set(p.x, p.z, p.y); o.userData.gem.position.y = 2.6 + 0.2 * Math.sin(now * 3); o.userData.gem.rotation.y = now * 2; o.userData.gem.material.opacity = 0.7 * fd; o.userData.beam.material.opacity = 0.18 * fd;
      const age = g.t - p.t; o.userData.ring.scale.setScalar(1 + (age % 1) * 2.5); o.userData.ring.material.opacity = 0.5 * (1 - (age % 1)) * fd; }
    for (const [id, o] of this.pingM) if (!seen.has(id)) { this.scene.remove(o); this.pingM.delete(id); }
    return r;
  };
  P.makeJet = function () {
    const J = new THREE.Group(), body = SK.paint(0xf4f6f8), blue = SK.paint(0x1f4fd1), yel = SK.paint(0xffd23f), glass = SK.M(0x3d9bff, { r: 0.05, m: 0.6 }), props = [];
    const fus = new THREE.Mesh(new THREE.CapsuleGeometry(1.4, 9, 8, 20).rotateZ(Math.PI / 2), body); J.add(fus);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 9, 20, 1, true).rotateZ(Math.PI / 2), blue); stripe.scale.set(1, 0.25, 1); stripe.position.y = 0.2; J.add(stripe);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 12).scale(1.2, 0.7, 1), glass); nose.position.set(5.2, 0.5, 0); J.add(nose);
    const wing = new THREE.Mesh(SK.rbox(2.6, 0.25, 15, 0.1), body); wing.position.set(0.5, -0.2, 0); J.add(wing); for (const sd of [-1, 1]) { const tip = new THREE.Mesh(SK.rbox(2.62, 0.27, 1.2, 0.1), yel); tip.position.set(0.5, -0.2, sd * 7); J.add(tip);
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 2.2, 16).rotateZ(Math.PI / 2), SK.chrome()); eng.position.set(1.2, -0.8, sd * 3.6); J.add(eng); const pr = new THREE.Mesh(SK.rbox(0.08, 2.4, 0.25, 0.04), SK.M(0x1b1d20)); pr.position.set(2.4, -0.8, sd * 3.6); J.add(pr); props.push(pr); }
    const tail = new THREE.Mesh(SK.rbox(2.0, 3.0, 0.25, 0.1), blue); tail.position.set(-5.4, 1.6, 0); tail.rotation.z = -0.35; J.add(tail); const stab = new THREE.Mesh(SK.rbox(1.6, 0.2, 5.5, 0.08), body); stab.position.set(-5.4, 0.4, 0); J.add(stab);
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const c = cv.getContext('2d'); c.fillStyle = '#f4f6f8'; c.fillRect(0, 0, 512, 128); c.font = '900 84px Barlow Condensed, Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#1f4fd1'; c.fillText('⚡ VOLT JET', 256, 66);
    const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding; for (const sd of [-1, 1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.5 })); pl.position.set(0, 0.6, sd * 1.43); if (sd < 0) pl.rotation.y = Math.PI; J.add(pl); }
    for (let i = 0; i < 6; i++) for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), glass); w.position.set(-3 + i * 1.3, 0.9, sd * 1.41); if (sd < 0) w.rotation.y = Math.PI; J.add(w); }
    J.traverse(o => { if (o.isMesh) o.castShadow = true; }); J.userData.props = props; return J;
  };
  P.makeChute = function (k) {
    const G = new THREE.Group(), cols = [[0xd8262e, 0xf4f4f2], [0x1f4fd1, 0xffd23f], [0x7dff6a, 0x1b1d20], [0xff5fa2, 0xf4f4f2]][k % 4];
    for (let i = 0; i < 8; i++) { const seg = new THREE.Mesh(new THREE.SphereGeometry(1.5, 6, 6, i / 8 * Math.PI * 2, Math.PI * 2 / 8, 0, Math.PI / 2.6), new THREE.MeshStandardMaterial({ color: cols[i % 2], roughness: 0.7, side: THREE.DoubleSide })); seg.scale.set(1.15, 0.6, 1); G.add(seg); }
    for (const [x, z] of [[0.9, 0.9], [0.9, -0.9], [-0.9, 0.9], [-0.9, -0.9]]) { const ln = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.6, 3), SK.M(0x222222)); ln.position.set(x * 0.55, -0.6, z * 0.55); ln.rotation.set(z * 0.45, 0, -x * 0.45); G.add(ln); }
    G.position.y = 2.6; return G;
  };
  P.makePing = function (col) {
    const G = new THREE.Group(), beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 30, 8, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); beam.position.y = 15; G.add(beam);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, depthWrite: false })); G.add(gem);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.8, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, side: THREE.DoubleSide, depthWrite: false })); ring.position.y = 0.08; G.add(ring);
    G.userData = { gem, ring, beam }; return G;
  };
}
{ const P = GameScene.prototype, up = P.update;
  P.brMyTeam = function () { const m = this.match; if (!m || m.kind !== 'br') return -1; let c = this.brMine().map(p => p.chair)[0]; if (!c && this.online && this.brMyChair) c = this.brMyChair(); return c && c.gs ? c.gs.team : -1; };
  P.update = function (time, delta) { const r = up.call(this, time, delta); try { this.drawDropPings(); } catch (e) { console.warn(e); } return r; };
  P.drawDropPings = function () {
    const m = this.match; if (!m || m.kind !== 'br' || !this.sys.isActive() || !this.v3 || !this.vps) { if (this.dpG) { this.dpG.clear(); this.dpT.forEach(t => t.setVisible(false)); } return; }
    if (!this.dpG || !this.dpG.active) { this.dpG = this.add.graphics().setDepth(33); this.dpT = []; }
    const g = m.gs, G3 = this.dpG.clear(); let ti = 0; const T = (s, x, y, size, col) => { const t = this.dpT[ti] || (this.dpT[ti] = this.add.text(0, 0, '', { fontFamily: FONT, fontStyle: 'bold', stroke: '#05070f', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(34)); ti++; return t.setVisible(true).setText(s).setFontSize(size).setColor(col).setPosition(x, y).setAlpha(1).setFontFamily(FONT); };
    for (const vp of this.vps) {
      const me = vp.p && vp.p.chair, R = vp.rect; if (!me || !me.gs) continue;
      if (me.gs.plane && m.state === 'play') { T('ON THE VOLT JET', R.x + R.w / 2, R.y + R.h * 0.28, 34, '#ffd23f'); T('A  /  SPACE:  JUMP OUT', R.x + R.w / 2, R.y + R.h * 0.28 + 40, 24, '#ffffff'); }
      else if (me.gs.glide && me.gs.z > 1) T(`🪂  ${Math.round(me.gs.z)} m`, R.x + R.w / 2, R.y + R.h * 0.22, 24, '#ffffff');
      for (const p of g.pings || []) { if (p.team !== me.gs.team) continue; this.pingHeard = this.pingHeard || new Set(); const key = p.id + p.kind; if (!this.pingHeard.has(key)) { this.pingHeard.add(key); Sound.play(p.kind === 'enemy' || p.kind === 'danger' ? 'pingAlert' : 'ping'); }
        const fd = pingFade(p, g.t), col = PING_COL[p.kind], q = this.v3.project(vp, p.x, p.z + 3.2, p.y); let sx = q.x, sy = q.y; const off = q.behind || sx < R.x + 30 || sx > R.x + R.w - 30 || sy < R.y + 50 || sy > R.y + R.h - 70;
        if (off) { let dx = q.cx, dy = -q.cy; if (q.behind) { dx = -dx; dy = -Math.abs(dy) - 1; } const a = Math.atan2(dy, dx), cx = R.x + R.w / 2, cy = R.y + R.h / 2, k = Math.min((R.w / 2 - 44) / Math.max(1e-3, Math.abs(Math.cos(a))), (R.h / 2 - 76) / Math.max(1e-3, Math.abs(Math.sin(a)))); sx = cx + Math.cos(a) * k; sy = cy + Math.sin(a) * k;
          G3.fillStyle(col, 0.95).fillTriangle(sx + Math.cos(a) * 28, sy + Math.sin(a) * 28, sx + Math.cos(a + 2.5) * 15, sy + Math.sin(a + 2.5) * 15, sx + Math.cos(a - 2.5) * 15, sy + Math.sin(a - 2.5) * 15); }
        const age = g.t - p.t, pop = age < 0.25 ? 1.5 - age * 2 : 1, mid = Math.hypot(sx - (R.x + R.w / 2), sy - (R.y + R.h / 2)) < Math.min(R.w, R.h) * 0.2, al = (off ? 0.8 : mid ? 0.3 : 0.55) * fd;   /* (see-through, more so near your crosshair, and it fades away) */
        G3.fillStyle(0x0d151b, 0.35 * al).fillCircle(sx, sy, 16 * pop).lineStyle(2, col, al).strokeCircle(sx, sy, 16 * pop);
        T(PING_ICON[p.kind], sx, sy, 18, '#ffffff').setFontFamily('sans-serif').setAlpha(al + 0.1); const who = m.chairs[p.by], nm = who === me ? 'YOU' : (MG.pname(who) || m.name(who) || '').toUpperCase().slice(0, 10);
        T(`${p.label}  ·  ${Math.round(Math.hypot(p.x - me.x, p.y - me.y))} m`, sx, sy + 28, 14, '#' + col.toString(16).padStart(6, '0')).setAlpha(al + 0.1); T(nm, sx, sy - 28, 12, '#cfd8de').setAlpha(al); }
    }
    for (let i = ti; i < this.dpT.length; i++) this.dpT[i].setVisible(false);
  };
}
/* the help text */
{ const I = GAME_INFO.br; if (I && Array.isArray(I.rules)) I.rules.push('Everyone starts on the Volt Jet: jump out (A) where you want to land, then steer your parachute down with the stick.', 'Ping (d-pad ◀ / C): mark an enemy, loot or a spot for your squad. Ping twice quickly for DANGER. Click the map in your bag to ping a spot there.'); }

/* ping sounds: a bright double blip; danger is a two-tone alert */
Object.assign(SFX, {
  ping: S => { S.tone({ wave: 'triangle', from: 1320, to: 1320, dur: 0.07, vol: 0.22 }); S.tone({ wave: 'triangle', from: 1760, to: 1760, dur: 0.1, vol: 0.2, at: S.ctx.currentTime + 0.08 }); },
  pingAlert: S => { const t = S.ctx.currentTime; for (let i = 0; i < 3; i++) { S.tone({ wave: 'square', from: 880, to: 880, dur: 0.09, vol: 0.18, at: t + i * 0.2 }); S.tone({ wave: 'square', from: 660, to: 660, dur: 0.09, vol: 0.18, at: t + i * 0.2 + 0.1 }); } }
});
/* pings on the minimap and on the map in your bag (with who pinged); click the bag map to ping a spot there */
{ const P = GameScene.prototype, mm = P.drawMinimap;
  P.drawMinimap = function (...a) {
    const r = mm.apply(this, a), m = this.match; if (!m || m.kind !== 'br' || !m.gs || !this.mapG) return r; const team = this.brMyTeam(); if (team < 0) return r;
    const g = this.mapG, Mm = CONFIG.view3d.minimap, C = CONFIG.court, B = CONFIG.courtBase || C, fit = Math.min(1, B.width / C.width, B.height / C.height), s = Mm.scale * fit, ox = Mm.x + (B.width - C.width * fit) * Mm.scale, oy = Mm.y;
    for (const p of m.gs.pings || []) if (p.team === team) { const fd = pingFade(p, m.gs.t), x = ox + p.x * s, y = oy + p.y * s; g.fillStyle(PING_COL[p.kind], 0.85 * fd).fillTriangle(x, y - 6, x + 5, y, x, y + 6).fillTriangle(x, y - 6, x - 5, y, x, y + 6); }
    const D = m.gs.drop; if (D && D.t < D.dur) { g.lineStyle(1.5, 0xffffff, 0.5).lineBetween(ox + D.ax * s, oy + D.ay * s, ox + D.bx * s, oy + D.by * s); const u = D.t / D.dur; g.fillStyle(0xffffff, 1).fillCircle(ox + (D.ax + (D.bx - D.ax) * u) * s, oy + (D.ay + (D.by - D.ay) * u) * s, 3.5); }
    return r;
  };
}
{ const P = BRInvScene.prototype, cr = P.create, up = P.update;
  P.create = function (...a) {
    const r = cr.apply(this, a); this.pingT = [];
    this.input.on('pointerdown', ptr => { const L = this.mapBox; if (!L || ptr.x < L.x0 || ptr.y < L.y0 || ptr.x > L.x0 + L.w || ptr.y > L.y0 + L.h) return; const x = (ptr.x - L.x0) / L.s, y = (ptr.y - L.y0) / L.s, d = this.d, o = d.game.online;
      if (o && o.role === 'client') { const Lc = o.sim && (o.sim.locals.find(q => q.id === d.p.id) || o.sim.locals[0]); if (Lc) Lc.pending.push(`pngat:${Math.round(x * 10) / 10}:${Math.round(y * 10) / 10}`); } else MODES.br.pingAt(d.game.match, d.chair, x, y); Sound.play('ping'); });
    return r;
  };
  P.update = function (...a) {
    const r = up.apply(this, a); if (!this.scene.isActive() || !this.d || !this.mapG) return r; const m = this.d.game.match, V = CONFIG.view, sz = 196, s = sz / Math.max(m.width, m.height), x0 = V.width - sz - 14, y0 = 136, me = this.d.chair;
    this.mapBox = { x0, y0, w: m.width * s, h: m.height * s, s }; let i = 0;
    for (const p of m.gs.pings || []) { if (p.team !== me.gs.team) continue; const fd = pingFade(p, m.gs.t), x = x0 + p.x * s, y = y0 + p.y * s; this.mapG.fillStyle(PING_COL[p.kind], 0.9 * fd).fillTriangle(x, y - 8, x + 6, y, x, y + 8).fillTriangle(x, y - 8, x - 6, y, x, y + 8);
      const who = m.chairs[p.by], t = this.pingT[i] || (this.pingT[i] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: '#ffffff', stroke: '#05070f', strokeThickness: 3 }).setOrigin(0.5, 1)); i++;
      t.setVisible(true).setPosition(x, y - 9).setText(who === me ? 'YOU' : (MG.pname(who) || m.name(who) || '').toUpperCase().slice(0, 8)).setAlpha(fd); }
    for (; i < this.pingT.length; i++) this.pingT[i].setVisible(false);
    if (this.mapT && this.mapT.active && !/click the map/.test(this.mapT.text)) this.mapT.setText(this.mapT.text + '\n◆ click the map to ping');
    return r;
  };
}
{ const ap = HostSession.prototype.applyTo; HostSession.prototype.applyTo = function (p, x, y, events) { if (p && p.chair && Array.isArray(events) && this.match && this.match.kind === 'br') for (const e of events) if (typeof e === 'string' && e.startsWith('pngat:')) { const [, a, b] = e.split(':'); MODES.br.pingAt(this.match, p.chair, +a, +b); } return ap.call(this, p, x, y, Array.isArray(events) ? events.filter(e => !(typeof e === 'string' && e.startsWith('pngat:'))) : events); }; }

/* on the jet and under the parachute your camera pulls back behind you, so you can see where you're going */
{ const P = GameScene.prototype, vp = P.viewports3d;
  if (vp) P.viewports3d = function (LP) { const list = vp.call(this, LP); if (Array.isArray(list) && this.match && this.match.kind === 'br') for (const v of list) { const G = v.chair && v.chair.gs; if (G && (G.plane || (G.glide && G.z > 1.5)) && v.mode === 'first') v.mode = 'third'; } return list; };
}
