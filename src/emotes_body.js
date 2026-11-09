/* v13.6.1: body emotes. Many more arm moves, and moves with the legs: the legs (normally part of the cart model) are swapped for
   two-bone legs that can kick, tap, cross and march, then swapped back when the move ends. Also the new faces. */
{ const pose0 = Rig.pose.bind(Rig), upd0 = Rig.update.bind(Rig);
  /* where the right (R) and left (L) hands go, and the feet (FR / FL) for the leg moves; t = seconds into the move */
  Rig.pose = function (name, t, extra = {}) {
    const { tx, px, hx, hy } = this.K(), s = Math.sin, c = Math.cos, A = Math.abs, drive = { R: [px + 0.1, 0.71, 0.25], L: [px + 0.05, 0.67, -0.25] };
    const up = [tx, 1.0, 0.9], upL = [tx, 1.0, -0.9], h = tx + 0.02, F0 = sd => [0.23, 0.24, sd * 0.1], out = (sd, k = 1, y = 0.62) => [h + 0.3 + 0.48 * k, y, sd * 0.1];
    switch (name) {
      case 'a_raise': { const k = 0.1 * A(s(t * 8)); return { R: [tx + 0.05, 1.35 + k, 0.22], L: [tx + 0.05, 1.35 + k, -0.22], pr: up, pl: upL }; }
      case 'a_dab': return { R: [tx + 0.45, 1.3, 0.55], L: [hx + 0.1, hy - 0.02, 0.05], pr: [tx, 1.2, 0.9], pl: [tx + 0.4, 1.0, 0.2] };
      case 'a_tpose': return { R: [tx, 0.98, 0.72], L: [tx, 0.98, -0.72] };
      case 'a_guitar': return { R: [tx + 0.3, 0.8 + 0.06 * s(t * 14), 0.05], L: [tx + 0.48, 0.98, -0.32] };
      case 'a_row': { const k = c(t * 4); return { R: [tx + 0.32 + 0.16 * k, 0.78, 0.3], L: [tx + 0.32 + 0.16 * k, 0.78, -0.3] }; }
      case 'a_swim': { const a = t * 5; return { R: [tx + 0.25 + 0.25 * c(a), 1.05 + 0.25 * s(a), 0.3], L: [tx + 0.25 + 0.25 * c(a + Math.PI), 1.05 + 0.25 * s(a + Math.PI), -0.3], pr: up, pl: upL }; }
      case 'a_box': { const k = Math.floor(t * 4) % 2; return { R: [tx + (k ? 0.56 : 0.26), 1.02, 0.12], L: [tx + (k ? 0.26 : 0.56), 1.02, -0.12] }; }
      case 'a_timeout': return { R: [tx + 0.4, 1.08, 0.0], L: [tx + 0.3, 0.92, -0.02], pr: [tx, 1.2, 0.9] };
      case 'a_peace': return { R: [tx + 0.3, 1.24, 0.3], L: drive.L, thumb: 1, pr: up };
      case 'a_binos': return { R: [hx + 0.16, hy, 0.06], L: [hx + 0.16, hy, -0.06], pr: [tx + 0.3, 0.8, 0.6], pl: [tx + 0.3, 0.8, -0.6] };
      case 'a_kiss': { const k = t < 1 ? 0 : Math.min(1, (t - 1) * 3); return { R: [hx + 0.14 + 0.3 * k, hy - 0.08 + 0.1 * k, 0.04 + 0.2 * k], L: drive.L, pr: [tx + 0.2, 0.8, 0.7] }; }
      case 'a_pompom': { const k = s(t * 9); return { R: [tx + 0.15, 1.25 + 0.15 * k, 0.4], L: [tx + 0.15, 1.25 - 0.15 * k, -0.4], pr: up, pl: upL }; }
      case 'a_lasso': { const a = t * 10; return { R: [tx + 0.1 + 0.12 * c(a), 1.45, 0.2 + 0.12 * s(a)], L: drive.L, pr: up }; }
      case 'a_wipe': { const k = Math.min(1, t * 1.5); return { R: [hx + 0.12, hy + 0.06, 0.18 - 0.3 * k], L: drive.L, pr: [tx + 0.2, 1.2, 0.8] }; }
      case 'a_steer': { const a = s(t * 3) * 0.6; return { R: [tx + 0.4, 0.92 + 0.14 * s(a), 0.14 * c(a)], L: [tx + 0.4, 0.92 - 0.14 * s(a), -0.14 * c(a)] }; }
      case 'a_sprinkler': { const k = Math.floor(t * 6) % 6; return { R: [tx + 0.35, 1.0, 0.1 + k * 0.08], L: [hx + 0.06, hy - 0.06, -0.12], pl: [tx, 1.1, -0.9] }; }
      case 'a_bow': { const k = Math.min(1, t * 1.2); return { R: [tx + 0.24 + 0.2 * k, 0.9 - 0.1 * k, 0.1], L: [tx - 0.05, 0.75, -0.42] }; }
      /* legs (and arms to go with them) */
      case 'a_kick': { const k = Math.max(0, s(t * 3.2)); return { R: drive.R, L: drive.L, FR: lerp3(F0(1), out(1, 1, 0.9), k), FL: F0(-1) }; }
      case 'a_tap': return { R: drive.R, L: drive.L, FR: [0.25, 0.25 + 0.07 * A(s(t * 11)), 0.1], FL: F0(-1) };
      case 'a_cancan': { const k = s(t * 6); return { R: [tx + 0.1, 1.2, 0.35], L: [tx + 0.1, 1.2, -0.35], pr: up, pl: upL, FR: lerp3(F0(1), out(1, 1, 1.0), Math.max(0, k)), FL: lerp3(F0(-1), out(-1, 1, 1.0), Math.max(0, -k)) }; }
      case 'a_bike': { const a = t * 7; return { R: drive.R, L: drive.L, FR: [h + 0.5 + 0.13 * c(a), 0.52 + 0.13 * s(a), 0.1], FL: [h + 0.5 + 0.13 * c(a + Math.PI), 0.52 + 0.13 * s(a + Math.PI), -0.1] }; }
      case 'a_stomp': { const k = Math.floor(t * 4) % 2, lift = 0.16 * A(s(t * 4 * Math.PI)); return { R: [tx + 0.25, 0.95, 0.32], L: [tx + 0.25, 0.95, -0.32], FR: [0.27, 0.24 + (k ? lift : 0), 0.12], FL: [0.27, 0.24 + (k ? 0 : lift), -0.12] }; }
      case 'a_swing': { const k = s(t * 4); return { R: drive.R, L: drive.L, FR: [0.3 + 0.22 * k, 0.32 + 0.12 * A(k), 0.1], FL: [0.3 - 0.22 * k, 0.32 + 0.12 * A(k), -0.1] }; }
      case 'a_cross': return { R: [tx + 0.05, 0.8, 0.3], L: [tx + 0.05, 0.8, -0.3], FR: [0.36, 0.45, -0.12], FL: F0(-1), knR: [h + 0.4, 0.9, -0.05] };
      case 'a_flutter': { const k = s(t * 16) * 0.06; return { R: drive.R, L: drive.L, FR: out(1, 1, 0.62 + k), FL: out(-1, 1, 0.62 - k) }; }
      case 'a_jig': { const k = s(t * 8); return { R: [tx + 0.2, 1.1 + 0.2 * k, 0.32], L: [tx + 0.2, 1.1 - 0.2 * k, -0.32], pr: up, pl: upL, FR: [0.28, 0.25 + 0.1 * Math.max(0, k), 0.12], FL: [0.28, 0.25 + 0.1 * Math.max(0, -k), -0.12] }; }
      case 'a_goalie': return { R: [tx + 0.35, 0.7, 0.5], L: [tx + 0.35, 0.7, -0.5], FR: [0.3, 0.26, 0.34], FL: [0.3, 0.26, -0.34] };
      case 'a_march': { const k = s(t * 6); return { R: [tx + 0.25 + 0.1 * k, 0.9, 0.3], L: [tx + 0.25 - 0.1 * k, 0.9, -0.3], FR: [0.3, 0.25 + 0.2 * Math.max(0, k), 0.1], FL: [0.3, 0.25 + 0.2 * Math.max(0, -k), -0.1] }; }
      case 'a_split': { const k = Math.min(1, t * 1.6); return { R: [tx, 1.3, 0.4], L: [tx, 1.3, -0.4], pr: up, pl: upL, FR: [0.32, 0.4, 0.1 + 0.42 * k], FL: [0.32, 0.4, -0.1 - 0.42 * k] }; }
      case 'a_hype': { const k = s(t * 9); return { R: [tx + 0.02, 1.42 + 0.06 * k, 0.26], L: [tx + 0.02, 1.42 - 0.06 * k, -0.26], pr: up, pl: upL, FR: [0.3, 0.27 + 0.14 * Math.max(0, k), 0.14], FL: [0.3, 0.27 + 0.14 * Math.max(0, -k), -0.14] }; }
    }
    return pose0(name, t, extra);
  };
  function lerp3(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }

  /* the legs for those moves */
  Rig.legs = function (group) {
    if (group.userData.legs) return group.userData.legs; const tmp = new THREE.MeshStandardMaterial();
    this.lgeo = this.lgeo || { th: new THREE.CylinderGeometry(0.07, 0.062, 1, 10).translate(0, 0.5, 0), sh: new THREE.CylinderGeometry(0.056, 0.048, 1, 10).translate(0, 0.5, 0), kn: new THREE.SphereGeometry(0.066, 10, 8), shoe: new THREE.BoxGeometry(0.17, 0.07, 0.09) };
    const L = []; for (const sd of [1, -1]) { const th = new THREE.Mesh(this.lgeo.th, tmp), sh = new THREE.Mesh(this.lgeo.sh, tmp), kn = new THREE.Mesh(this.lgeo.kn, tmp), shoe = new THREE.Mesh(this.lgeo.shoe, tmp); [th, sh, kn, shoe].forEach(o => { o.castShadow = true; o.visible = false; group.add(o); }); L.push({ sd, th, sh, kn, shoe }); }
    return (group.userData.legs = L);
  };
  Rig.update = function (group, name, t, extra = {}) {
    upd0(group, name, t, extra);
    const P = name && name.startsWith('a_') && ACTIONS[name] && ACTIONS[name].legs && !extra.hide ? this.pose(name, t, extra) : null, parts = group.userData.partMeshes || {};
    if (!P || !P.FR) { if (group.userData.legsOn) { group.userData.legsOn = false; (group.userData.legs || []).forEach(l => [l.th, l.sh, l.kn, l.shoe].forEach(o => { o.visible = false; })); if (parts.pants) parts.pants.visible = true; if (parts.shoes) parts.shoes.visible = true; } return; }
    const L = this.legs(group), { sx, tx } = this.K(), pm = parts.pants ? parts.pants.material : null, sm = parts.shoes ? parts.shoes.material : null;
    group.userData.legsOn = true; if (parts.pants) parts.pants.visible = false; if (parts.shoes) parts.shoes.visible = false;
    const hipY = 0.53, kneeX = sx + 0.37, a = Math.hypot(kneeX - (tx + 0.02), 0.555 - hipY), b = Math.hypot(kneeX - 0.23, 0.555 - 0.24);
    for (const l of L) {
      const hip = new THREE.Vector3(tx + 0.02, hipY, l.sd * 0.1), T = new THREE.Vector3(...(l.sd > 0 ? P.FR : P.FL)), pole = new THREE.Vector3(...((l.sd > 0 ? P.knR : P.knL) || [kneeX + 0.3, 1.0, l.sd * 0.14]));
      const { elbow: knee, hand: ankle } = this.solve(hip, T, a, b, pole);
      this.bone(l.th, hip, knee); this.bone(l.sh, knee, ankle); l.kn.position.copy(knee);
      const ang = Math.atan2(ankle.y - knee.y, ankle.x - knee.x) - Math.atan2(0.24 - 0.555, 0.23 - kneeX);   /* (the shoe turns with the shin) */ l.shoe.rotation.set(0, 0, ang); l.shoe.position.set(ankle.x + 0.04 * Math.cos(ang) + 0.025 * Math.sin(ang), ankle.y + 0.04 * Math.sin(ang) - 0.025 * Math.cos(ang), ankle.z);
      if (pm) { l.th.material = pm; l.sh.material = pm; l.kn.material = pm; } if (sm) l.shoe.material = sm;
      [l.th, l.sh, l.kn, l.shoe].forEach(o => { o.visible = true; });
    }
  };
}

/* ---- the new faces ---- */
{ const face0 = Avatar.faceTex.bind(Avatar), NEW = ['blush', 'laugh', 'smirk', 'sweat', 'dizzy', 'money', 'pirate', 'monocle', 'vampire', 'kitty', 'clown', 'beard', 'zombie', 'ninja', 'cry', 'shades2', 'paint', 'alien'];
  Avatar.faceTex = function (id) {
    if (!NEW.includes(id)) return face0(id);
    const key = 'face' + id; if (this.cache[key]) return this.cache[key];
    const W = 256, H = 128, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), ink = '#1d1611', L = 100, R = 156, Y = 52; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 6; c.strokeStyle = ink; c.fillStyle = ink;
    const eye = (x, y, r = 9, col = '#fff', pup = ink) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, r + 4, r + 6, 0, 0, 7); c.fill(); c.fillStyle = pup; c.beginPath(); c.arc(x, y + 1, r * 0.75, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 3, y - 3, 2.5, 0, 7); c.fill(); };
    const arc = (x, y, r, a0, a1, w = 6, col = ink) => { c.lineWidth = w; c.strokeStyle = col; c.beginPath(); c.arc(x, y, r, a0, a1); c.stroke(); };
    const smile = () => arc(128, 78, 22, Math.PI * 0.2, Math.PI * 0.8), dots = (col, pts, r = 3) => { c.fillStyle = col; for (const [x, y] of pts) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } };
    const P = Math.PI;
    if (id === 'blush') { eye(L, Y); eye(R, Y); smile(); c.fillStyle = 'rgba(255,90,120,0.45)'; for (const x of [78, 178]) { c.beginPath(); c.ellipse(x, 80, 16, 9, 0, 0, 7); c.fill(); } }
    else if (id === 'laugh') { c.lineWidth = 6; for (const x of [L, R]) { c.beginPath(); c.moveTo(x - 12, Y - 10); c.lineTo(x + 6, Y); c.lineTo(x - 12, Y + 10); c.stroke(); } c.fillStyle = '#7a2b2b'; c.beginPath(); c.moveTo(98, 82); c.quadraticCurveTo(128, 126, 158, 82); c.closePath(); c.fill(); c.stroke(); }
    else if (id === 'smirk') { eye(L, Y); eye(R, Y); c.beginPath(); c.moveTo(112, 92); c.quadraticCurveTo(140, 96, 154, 80); c.stroke(); }
    else if (id === 'sweat') { eye(L, Y); eye(R, Y); c.beginPath(); c.moveTo(108, 92); for (let x = 108; x <= 148; x += 8) c.lineTo(x, 92 + ((x / 8) % 2 ? 4 : -4)); c.stroke(); c.fillStyle = '#6ec6ff'; c.beginPath(); c.moveTo(196, 26); c.quadraticCurveTo(208, 46, 196, 52); c.quadraticCurveTo(184, 46, 196, 26); c.fill(); }
    else if (id === 'dizzy') { for (const x of [L, R]) { c.lineWidth = 4; c.beginPath(); for (let a = 0; a < 14; a += 0.2) c.lineTo(x + Math.cos(a) * a * 1.1, Y + Math.sin(a) * a * 1.1); c.stroke(); } c.beginPath(); c.ellipse(128, 96, 9, 7, 0, 0, 7); c.lineWidth = 5; c.stroke(); }
    else if (id === 'money') { c.font = 'bold 36px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#2e9e48'; c.fillText('$', L, Y + 2); c.fillText('$', R, Y + 2); c.fillStyle = '#7a2b2b'; c.beginPath(); c.moveTo(102, 84); c.quadraticCurveTo(128, 120, 154, 84); c.closePath(); c.fill(); c.lineWidth = 6; c.stroke(); }
    else if (id === 'pirate') { eye(R, Y); c.fillStyle = ink; c.beginPath(); c.ellipse(L, Y, 18, 16, 0, 0, 7); c.fill(); c.lineWidth = 4; c.beginPath(); c.moveTo(60, 20); c.lineTo(200, 66); c.stroke(); c.lineWidth = 6; c.beginPath(); c.arc(128, 74, 22, P * 0.25, P * 0.75); c.stroke(); }
    else if (id === 'monocle') { eye(L, Y); eye(R, Y, 10); arc(R, Y, 22, 0, 7, 4, '#c9a227'); c.strokeStyle = '#c9a227'; c.lineWidth = 2; c.beginPath(); c.moveTo(R + 16, Y + 16); c.quadraticCurveTo(R + 30, Y + 50, R + 10, 120); c.stroke(); c.strokeStyle = ink; c.lineWidth = 6; c.beginPath(); c.moveTo(110, 90); c.lineTo(146, 88); c.stroke(); }
    else if (id === 'vampire') { eye(L, Y, 9, '#fff', '#a0102a'); eye(R, Y, 9, '#fff', '#a0102a'); smile(); c.fillStyle = '#fff'; for (const x of [116, 140]) { c.beginPath(); c.moveTo(x - 6, 92); c.lineTo(x + 6, 92); c.lineTo(x, 108); c.fill(); } }
    else if (id === 'kitty') { eye(L, Y); eye(R, Y); c.fillStyle = '#e8607a'; c.beginPath(); c.moveTo(120, 74); c.lineTo(136, 74); c.lineTo(128, 82); c.fill(); arc(120, 84, 8, 0, P, 4); arc(136, 84, 8, 0, P, 4); c.lineWidth = 3; for (const sd of [-1, 1]) for (const dy of [-6, 2, 10]) { c.beginPath(); c.moveTo(128 + sd * 20, 80 + dy * 0.5); c.lineTo(128 + sd * 62, 74 + dy); c.stroke(); } }
    else if (id === 'clown') { eye(L, Y); eye(R, Y); c.fillStyle = '#e8263a'; c.beginPath(); c.arc(128, 74, 14, 0, 7); c.fill(); c.lineWidth = 8; c.strokeStyle = '#e8263a'; c.beginPath(); c.arc(128, 82, 30, P * 0.15, P * 0.85); c.stroke(); }
    else if (id === 'beard') { eye(L, Y); eye(R, Y); c.fillStyle = '#4a3220'; c.beginPath(); c.moveTo(50, 60); c.quadraticCurveTo(54, 126, 128, 128); c.quadraticCurveTo(202, 126, 206, 60); c.lineTo(190, 66); c.quadraticCurveTo(170, 104, 128, 106); c.quadraticCurveTo(86, 104, 66, 66); c.fill(); c.beginPath(); c.ellipse(112, 84, 16, 6, 0.25, 0, 7); c.ellipse(144, 84, 16, 6, -0.25, 0, 7); c.fill(); }
    else if (id === 'zombie') { eye(L, Y, 9, '#d9ff9a', '#3a5a1a'); eye(R, Y + 4, 6, '#d9ff9a', '#3a5a1a'); c.lineWidth = 5; c.beginPath(); c.moveTo(106, 94); c.lineTo(118, 88); c.lineTo(130, 96); c.lineTo(142, 88); c.lineTo(152, 94); c.stroke(); c.strokeStyle = '#7a2b2b'; c.lineWidth = 3; c.beginPath(); c.moveTo(70, 30); c.lineTo(84, 40); c.moveTo(76, 28); c.lineTo(76, 42); c.stroke(); }
    else if (id === 'ninja') { c.fillStyle = '#1b1d20'; c.fillRect(0, 26, W, 52); c.fillStyle = '#e8b48a'; c.fillRect(64, 38, 128, 28); eye(L, Y, 7); eye(R, Y, 7); c.fillStyle = '#c0392b'; c.fillRect(0, 22, W, 6); }
    else if (id === 'cry') { eye(L, Y, 11); eye(R, Y, 11); c.fillStyle = 'rgba(110,198,255,0.85)'; for (const x of [L, R]) { c.beginPath(); c.moveTo(x - 6, Y + 14); c.quadraticCurveTo(x - 14, Y + 46, x - 4, Y + 56); c.quadraticCurveTo(x + 6, Y + 46, x - 6, Y + 14); c.fill(); } c.lineWidth = 6; c.strokeStyle = ink; c.beginPath(); c.arc(128, 92, 14, P * 1.15, P * 1.85); c.stroke(); }
    else if (id === 'shades2') { c.fillStyle = '#e8364f'; for (const x of [L, R]) { const y = Y; c.beginPath(); c.moveTo(x, y + 16); c.bezierCurveTo(x - 30, y - 2, x - 14, y - 26, x, y - 10); c.bezierCurveTo(x + 14, y - 26, x + 30, y - 2, x, y + 16); c.fill(); } c.fillRect(L + 14, Y - 6, R - L - 28, 5); smile(); }
    else if (id === 'paint') { eye(L, Y); eye(R, Y); smile(); c.fillStyle = '#2f6fed'; c.fillRect(60, 70, 34, 6); c.fillRect(60, 80, 34, 6); c.fillStyle = '#e74c3c'; c.fillRect(162, 70, 34, 6); c.fillRect(162, 80, 34, 6); }
    else if (id === 'alien') { c.fillStyle = '#111'; for (const [x, a] of [[L, 0.45], [R, -0.45]]) { c.beginPath(); c.ellipse(x, Y, 22, 13, a, 0, 7); c.fill(); } c.fillStyle = 'rgba(160,255,200,0.7)'; c.beginPath(); c.arc(L + 4, Y - 4, 4, 0, 7); c.arc(R - 4, Y - 4, 4, 0, 7); c.fill(); c.lineWidth = 4; c.beginPath(); c.moveTo(118, 96); c.lineTo(138, 96); c.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return (this.cache[key] = t);
  };
}
