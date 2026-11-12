/* Volt Royale drawing, part 2 (v13): pickups float over a glow in their rarity's colour and look like what they are; rez garages;
   downed carts; no team colours (everyone wears their own look; team-mates get a soft ring and a name); the team panel (bottom left:
   you and your team-mates, faces, health and armour); prompts (reload, heal, revive, rez); the storm (a purple haze when you are in it,
   stage warnings); the bag screen with your ammo and the full map; spectating (first or third person, LB / RB to switch, Y to take
   over a CPU team-mate). */

/* ---- carts: no team colours, CPU drivers wear random looks ---- */
{ const P = View3D.prototype, tc = P.teamColor; P.teamColor = function (side) { return this.m && this.m.kind === 'br' ? 0x6b737b : tc.call(this, side); }; }
{ const lf = Avatar.lookFor.bind(Avatar); Avatar.lookFor = function (ch, sc) { const L = lf(ch, sc); if (L) return L; const m = sc && sc.match; if (m && m.kind === 'br' && ch) return ch.cpuLook || (ch.cpuLook = Avatar.randomLook(ch.k * 31 + 7)); return null; }; }

/* ---- the world ---- */
{ const P = View3D.prototype, lootMesh = P.brLootMesh, upd = P.updateBR;
  P.brLootMesh = function (L) {
    const k = L[1]; if (k === 'chest' || k === 'ammo') return lootMesh.call(this, L);
    const g = Items3D.pickup(k); g.userData.still = true; g.userData.pickup = true; return g;
  };
  P.updateBR = function (dt) {
    upd.call(this, dt); const m = this.m, g = m.gs, t = performance.now() / 1000, M = MODES.br.map(m), sc = this.sc;
    const eyes = (sc.setup.players || []).map(p => p.chair).filter(Boolean); if (sc.online) { const c = sc.brMyChair && sc.brMyChair(); if (c) eyes.push(c); }
    const me = eyes[0], near = (x, y) => !eyes.length || eyes.some(c => Math.hypot(c.x - x, c.y - y) < 50);   // (v14.2.3: was 70)
    for (const L of g.L || []) { const mesh = this.brLoot.get(L[0]); if (!mesh) continue; mesh.visible = near(L[2], L[3]); if (!mesh.userData.pickup || !mesh.visible) continue;   // (far away: not drawn)
      mesh.position.set(L[2], L[4] * BR.H, L[3]); mesh.rotation.y = 0; const it = mesh.userData.item; it.rotation.y = t * 1.3 + L[0]; it.position.y = 0.55 + Math.sin(t * 2 + L[0]) * 0.07; }
    if (!this.rezG) {                                                       // rez garages: a roof over the tunnel, and a sign that is green when ready
      this.rezG = []; for (const q of M.rez || []) {
        const grp = new THREE.Group(), w = q.x1 - q.x0 + 0.8, d = q.y1 - q.y0 + 0.8, roof = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), new THREE.MeshStandardMaterial({ color: 0xdfe6ec, roughness: 0.4, metalness: 0.4 })); roof.position.set(q.cx, 2.4, q.cy); roof.castShadow = true; grp.add(roof);
        const cv = G3.canvas(256, 96), c = cv.getContext('2d'); c.fillStyle = '#10181e'; c.fillRect(0, 0, 256, 96); c.fillStyle = '#fff'; c.font = '900 54px "Barlow Condensed", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('REZ  ✚', 128, 50);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(q.along ? 0.12 : 2.4, 0.9, q.along ? 2.4 : 0.12), [0, 1, 2, 3, 4, 5].map(() => new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cv), emissive: 0x7dff6a, emissiveIntensity: 0.6 }))); sign.position.set(q.cx, 3.05, q.cy); grp.add(sign);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(q.along ? w - 0.6 : 0.2, 0.06, q.along ? 0.2 : d - 0.6), new THREE.MeshBasicMaterial({ color: 0x7dff6a })); lamp.position.set(q.cx, 2.25, q.cy); grp.add(lamp);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(q.x1 - q.x0, q.y1 - q.y0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7dff6a, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending })); glow.position.set(q.cx, 0.04, q.cy); grp.add(glow);
        this.scene.add(grp); this.rezG.push({ sign, lamp, glow });
      }
    }
    this.rezG.forEach((R, i) => { const ready = !g.gar || g.gar[i] <= g.t, col = ready ? 0x7dff6a : 0xff4d4d; R.lamp.material.color.setHex(col); R.glow.material.color.setHex(col); R.glow.material.opacity = ready ? 0.18 + 0.1 * Math.sin(t * 3) : 0.12; R.sign.material.forEach(x => x.emissive.setHex(col)); });
    for (const cart of this.carts) {                                         // team-mates: a soft ring; downed: red and slumped; nobody else gets a colour
      const ch = cart.ch, G = ch.gs || {}, ring = this.brRings && this.brRings.get(cart.group); if (!ring) continue;
      const mate = me && G.team === me.gs.team && ch !== me; ring.visible = !ch.out && (mate || G.down);
      ring.material.color.setHex(G.down ? (Math.sin(t * 8) > 0 ? 0xff2a2a : 0x7a1010) : 0x3dd6ff); ring.material.opacity = G.down ? 0.95 : 0.55;
      cart.group.rotation.x += G.down ? 0.12 : 0;
    }
    if (me && g.st) {                                                        // inside the storm: everything goes purple and hazy
      const S = g.st, inStorm = Math.hypot(me.x - S.x, me.y - S.y) > S.r && !me.out, f = this.scene.fog; this.stormK = (this.stormK || 0) + ((inStorm ? 1 : 0) - (this.stormK || 0)) * Math.min(1, dt * 3);
      if (f && f.isFogExp2) { if (!this.fog0) this.fog0 = { c: f.color.clone(), d: f.density }; f.color.copy(this.fog0.c).lerp(new THREE.Color(0x6a3dbf), this.stormK * 0.85); f.density = this.fog0.d + this.stormK * 0.03; }
    }
  };
}

/* ---- drift sparks (every game): little sparks at the back wheels, white, then blue, orange, purple as the drift charges ---- */
{ const P = View3D.prototype, upd = P.update;
  P.update = function (dt) {
    const r = upd.call(this, dt);
    for (const c of this.carts || []) {
      const D = c.ch.dr; if (!c.sparks) { c.sparks = [1, -1].map(sd => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); s.position.set(CONFIG.view3d.cart.seatX - 0.3, 0.06, sd * 0.3); c.group.add(s); return s; }); }
      const on = D && (D.on || D.boost > 0) && !c.ch.out, col = CONFIG.drift.colors[D ? (D.on ? D.lvl : 0) : 0], k = 0.7 + 0.5 * Math.random();
      for (const s of c.sparks) { s.visible = !!on; if (on) { s.material.color.setHex(D.boost > 0 && !D.on ? 0xffe27a : col); s.scale.setScalar(D.on ? k * (1 + D.lvl * 0.5) : 1.6 * k); } }
      if (D && D.hop > 0) c.group.position.y += Math.sin(D.hop / 0.18 * Math.PI) * 0.12;   // the little hop into a drift
    }
    return r;
  };
}

/* ---- the HUD ---- */
const BR_TOUCH = { spinCW: ['🔫', 'FIRE'], spinCCW: ['🎯', 'AIM'], halfCW: ['▶', 'ITEM'], halfCCW: ['◀', 'ITEM'], a: ['⤒', 'JUMP'], x: ['✋', 'GRAB'], y: ['✊', 'AWAY'], b: ['💨', 'DRIFT'], speedUp: ['👊', 'MELEE'], speedDown: ['📍', 'PING'], quick: ['🎒', 'BAG'] };
Object.assign(GameScene.prototype, {
  brFaceKey(c) {                                                           // a little round face for the team panel (skin, hair, hat colour)
    const L = typeof Skins !== 'undefined' ? Skins.expand(Avatar.lookFor(c, this)) : (Avatar.lookFor(c, this) || LOOK0), key = 'brface-' + [L.skin, L.hair, L.hat, L.hatCol, L.face].join('-'); if (this.textures.exists(key)) return key;
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
    x.fillStyle = '#1b2a35'; x.beginPath(); x.arc(32, 32, 32, 0, 7); x.fill(); x.fillStyle = L.skin; x.beginPath(); x.arc(32, 36, 20, 0, 7); x.fill();
    x.fillStyle = L.hair; x.beginPath(); x.arc(32, 32, 21, Math.PI * 1.05, Math.PI * 1.95); x.fill();
    if (L.hat && L.hat !== 'none') { x.fillStyle = L.hat === 'crown' ? '#f2c200' : L.hatCol; x.fillRect(12, 10, 40, 10); x.fillRect(18, 4, 28, 10); }
    x.fillStyle = '#1d1611'; x.beginPath(); x.arc(25, 36, 3, 0, 7); x.arc(39, 36, 3, 0, 7); x.fill(); x.strokeStyle = '#1d1611'; x.lineWidth = 2.5; x.beginPath(); x.arc(32, 42, 7, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke();
    this.textures.addCanvas(key, cv); return key;
  },
  brTeamPanel(m, me, watching) {                                           // bottom left: you and your team-mates (face, name, health, armour), above the speed meter
    const V = CONFIG.view, sq = m.mini.squad || 1; if (!this.brT || !this.brT.g.scene) this.brT = { g: this.add.graphics().setDepth(30), rows: Array.from({ length: 3 }, () => ({ face: this.add.image(0, 0, '__WHITE').setDepth(31).setDisplaySize(30, 30), name: this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#ffffff' }).setDepth(31).setOrigin(0, 0.5), st: this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: '#ffd23f' }).setDepth(31).setOrigin(1, 0.5) })) };
    const T = this.brT, g = T.g; g.clear(); const team = me ? m.chairs.filter(c => c.gs.team === me.gs.team).sort((a, b) => (a === me ? -1 : b === me ? 1 : a.k - b.k)) : [];
    T.rows.forEach((r, i) => { const c = team[i], show = c && (sq > 1 || c === me) && m.state !== 'over'; [r.face, r.name, r.st].forEach(o => o.setVisible(!!show)); if (!show) return;
      const G = c.gs, w = 218, x = 14, y = V.height - 104 - (team.length - 1 - i) * 38 - 44, isW = watching === c;
      g.fillStyle(isW ? 0x2a3a48 : 0x0d151b, c.out ? 0.45 : 0.78).fillRoundedRect(x, y - 16, w, 34, 8); if (isW) g.lineStyle(2, 0xffd23f, 1).strokeRoundedRect(x, y - 16, w, 34, 8);
      r.face.setTexture(this.brFaceKey(c)).setDisplaySize(28, 28).setPosition(x + 18, y + 1).setAlpha(c.out ? 0.4 : 1);
      r.name.setText((c === me ? 'YOU' : (MG.pname(c) || m.name(c))).slice(0, 12)).setPosition(x + 36, y - 6).setColor(c.out ? '#7d8a96' : c === me ? '#ffd23f' : '#ffffff');
      const bx = x + 36, bw = w - 44; if (!c.out && !G.down) { g.fillStyle(0x223040, 1).fillRect(bx, y + 5, bw, 4).fillStyle(0x3d8bff, 1).fillRect(bx, y + 5, bw * G.sh / BR.maxShield, 4); g.fillStyle(0x3a2025, 1).fillRect(bx, y + 10, bw, 5).fillStyle(G.hp > 50 ? 0x5ad45a : G.hp > 25 ? 0xffc23d : 0xff4d4d, 1).fillRect(bx, y + 10, bw * Math.max(0, G.hp) / BR.hp, 5); }
      else if (G.down) { g.fillStyle(0x3a2025, 1).fillRect(bx, y + 8, bw, 6).fillStyle(0xff2a2a, 0.6 + 0.4 * Math.sin(this.time.now / 120)).fillRect(bx, y + 8, bw * G.dhp / BR.downHp, 6); }
      const card = !c.out ? '' : (m.gs.L || []).some(L => L[1] === 'card' && L[5] === c.k) || m.chairs.some(o => o.gs.cards && o.gs.cards.includes(c.k)) ? '🎴 CARD' : 'OUT';
      r.st.setText(isW ? '👁 WATCHING' : G.down ? '✚ DOWN' : c.out ? card : G.cards && G.cards.length ? '🎴' : '').setPosition(x + w - 6, y - 6).setColor(G.down ? '#ff6b6b' : '#ffd23f'); });
  },
  brPrompts(m, c, p0, vp) {                                                // the middle of the screen: what is happening right now
    const V = CONFIG.view, g = m.gs, G = c.gs, X = this.brX, G2 = X.g; if (!X.prompt) X.prompt = this.add.text(V.width / 2, V.height / 2 + 120, '', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#0d151bb8', padding: { x: 12, y: 5 }, align: 'center' }).setOrigin(0.5).setDepth(32);
    const bar = (k, col, label) => { const w = 220, x = V.width / 2 - w / 2, y = V.height / 2 + 150; G2.fillStyle(0x0d151b, 0.8).fillRoundedRect(x - 4, y - 4, w + 8, 16, 6).fillStyle(col, 1).fillRoundedRect(x, y, w * Math.max(0, Math.min(1, k)), 8, 4); return label; };
    let txt = '', M = MODES.br; const mates = m.chairs.filter(o => o !== c && !o.out && o.gs.team === G.team);
    const nm = k => { const o = m.chairs[k]; return o ? MG.up(MG.pname(o) || m.name(o)) : ''; }, fast = n => n > 1 ? `   ⚡ x${n} SPEED` : '';
    if (G.down && G.rvP > 0) { txt = bar(G.rvP, 0x7dff6a, `✚ BEING REVIVED BY ${(G.rvBy || []).map(nm).join(' + ')}  ${Math.round(G.rvP * 100)}%${fast(G.rvN)}`); if (G.rvN > 1) { const w = 220, x = V.width / 2 - w / 2, y = V.height / 2 + 150; G2.lineStyle(3, 0xffe27a, 0.6 + 0.4 * Math.sin(this.time.now / 90)).strokeRoundedRect(x - 6, y - 6, w + 12, 20, 7); } G2.fillStyle(0x00ff66, 0.06 + 0.04 * Math.sin(this.time.now / 200)).fillRect(0, 0, V.width, V.height); }
    else if (G.down && G.srz > 0) txt = bar(G.srz / BR.rezTime, 0x7dff6a, `✚ GETTING YOURSELF BACK UP  ${Math.round(G.srz / BR.rezTime * 100)}%   stay inside the garage`);
    else if (G.down && (() => { const g0 = m.gs, e = 0.6; return (MODES.br.map(m).rez || []).some((q, i) => c.x > q.x0 - e && c.x < q.x1 + e && c.y > q.y0 - e && c.y < q.y1 + e && g0.gar[i] > g0.t); })()) { const R = MODES.br.map(m).rez || [], e = 0.6, i = R.findIndex(q => c.x > q.x0 - e && c.x < q.x1 + e && c.y > q.y0 - e && c.y < q.y1 + e); txt = `✚ THIS REZ GARAGE IS RECHARGING: ${Math.ceil(g.gar[i] - g.t)} s   find another one, or a team-mate`; bar(G.dhp / BR.downHp, 0xff2a2a); }
    else if (G.down) { txt = `✚ YOU'RE DOWN  ${Math.ceil(G.dhp / BR.downHp * BR.bleed)} s   crawl to a team-mate or a rez garage`; bar(G.dhp / BR.downHp, 0xff2a2a); G2.fillStyle(0x5a0000, 0.18 + 0.08 * Math.sin(this.time.now / 200)).fillRect(0, 0, V.width, V.height); }
    else if (G.rl > 0) { const it = G.inv[G.rlS], gun = it && BR_GUNS[it.k]; txt = gun && gun.shell ? bar((it.a + 1 - G.rl / (G.rlT || 1)) / gun.mag, 0xffd23f, `LOADING SHELLS  ${it.a}/${gun.mag}   RT: fire`) : bar(1 - G.rl / (G.rlT || 1), 0xffd23f, 'RELOADING'); }
    else if (G.use) { const U = G.use, I = BR_ITEMS[U.k], t = U.tk >= 0 ? m.chairs[U.tk] : null; txt = bar(1 - U.left / U.tot, I.sh && !I.hp ? 0x3d8bff : 0x5ad45a, `${I.name} ${t ? '→ ' + (MG.pname(t) || m.name(t)) : ''}`); }
    else if (G.rv) { const t = m.chairs[G.rvk], n = t && t.gs.rvN || 1, others = t && (t.gs.rvBy || []).filter(k => k !== c.k); txt = bar(G.rv, 0x7dff6a, `REVIVING ${t ? MG.up(MG.pname(t) || m.name(t)) : ''}  ${Math.round(G.rv * 100)}%${n > 1 ? `   ⚡ x${n} SPEED WITH ${others.map(nm).join(' + ')}` : ''}`); if (n > 1) { const w = 220, x = V.width / 2 - w / 2, y = V.height / 2 + 150; G2.lineStyle(3, 0xffe27a, 0.6 + 0.4 * Math.sin(this.time.now / 90)).strokeRoundedRect(x - 6, y - 6, w + 12, 20, 7); } }
    else if (G.rz > 0) txt = bar(G.rz / BR.rezTime, 0x7dff6a, `BRINGING BACK ${G.cards.map(k => MG.up(MG.pname(m.chairs[k]) || m.name(m.chairs[k]))).join(' + ')}  stay inside`);
    else { const dn = M.reviveTarget(m, c), it = G.inv[G.sel], I = it && BR_ITEMS[it.k], gun = it && BR_GUNS[it.k], sw = G.swapL && (g.L || []).find(L => L[0] === G.swapL && Math.hypot(L[2] - c.x, L[3] - c.y) < R_CART() + 0.6);
      if (dn) txt = `HOLD X: revive ${MG.pname(dn) || m.name(dn)}`;
      else if (G.op > 0) txt = bar(G.op, 0xffd23f, (g.L || []).some(L => L[0] === G.opL && L[1] === 'ammo') ? 'OPENING THE AMMO CRATE' : 'OPENING THE CHEST');
      else if (G.foc > 0) { const L = (g.L || []).find(x => x[0] === G.foc), k = L && L[1], full = BR_GUNS[k] ? !!(!G.hol && G.inv[G.sel] && BR_GUNS[G.inv[G.sel].k]) || G.inv.length >= BR.slots : G.inv.length >= BR.slots && !G.inv.some(it => it.k === k);   /* (a gun swaps for the gun in your hands) */
        txt = !L ? '' : k === 'chest' ? 'HOLD X: open the chest' : k === 'ammo' ? 'HOLD X: open the ammo crate' : `X: ${full ? 'swap for' : 'pick up'} ${brName(k, L[12])}${BR_ITEMS[k] && L[5] > 1 ? ' x' + L[5] : ''}`; }
      else if (G.foc < 0) { const i = -1 - G.foc; txt = g.dr && g.dr[i] === 1 ? 'X: shut the door' : 'X: open the door';   /* (v14.2.21: no bash hint: the button depends on your layout) */ }
      else if (G.cards && G.cards.length) { const i = (M.map(m).rez || []).findIndex(q => c.x > q.x0 && c.x < q.x1 && c.y > q.y0 && c.y < q.y1); txt = i >= 0 && g.gar[i] > g.t ? `THIS REZ GARAGE IS RECHARGING: ${Math.ceil(g.gar[i] - g.t)} s` : `🎴 Take the rez card to a REZ GARAGE (green on the map)`; }
      else if (sw) txt = `BAG FULL   X: swap for ${(BR_GUNS[sw[1]] || BR_ITEMS[sw[1]] || { name: sw[1] }).name}`;
      else if (I && I.heal && mates.some(o => !o.gs.down && MH.dist(c, o) < BR.mateRange && M.helps(o, I))) txt = `RT: use ${I.name}    LT: use it on your team-mate`;
      else if (gun && it.a <= 0) txt = G.am[BR_AMMO[gun.type].i] > 0 ? 'X: RELOAD' : `NO ${BR_AMMO[gun.type].name}: find some`;
      else if (gun && gun.mag > 2 && it.a < gun.mag && it.a <= Math.ceil(gun.mag * 0.2) && G.am[BR_AMMO[gun.type].i] > 0) txt = 'X: reload'; }   /* (not for one-shot guns like the rocket launcher: they say it when empty) */
    const S = g.st, inStorm = S && Math.hypot(c.x - S.x, c.y - S.y) > S.r;
    if (inStorm && !G.down) { G2.lineStyle(60, 0x7b3dff, 0.22 + 0.12 * Math.sin(this.time.now / 180)).strokeRect(0, 0, V.width, V.height); if (!txt) txt = `🌀 YOU'RE IN THE STORM: get inside the circle!  (-${[1, 2, 4, 6, 8, 12, 20][Math.min(6, S.ph)]} a second)`; }
    /* v14.3.1: the touch X button says what it will do right now (it grabs, opens, revives and reloads) */
    if (typeof BR_TOUCH !== 'undefined' && !(this.brMine()[0] && this.brMine()[0].chair !== c)) { let xl = ['✋', 'GRAB'];
      if (!G.down) { const dn = M.reviveTarget(m, c), it = G.inv[G.sel], gun = it && !G.hol && BR_GUNS[it.k], L = G.foc > 0 && (g.L || []).find(x => x[0] === G.foc);
        if (dn) xl = ['✚', 'REVIVE']; else if (L && (L[1] === 'chest' || L[1] === 'ammo')) xl = ['📦', 'OPEN']; else if (L) xl = ['✋', 'GRAB'];
        else if (G.foc < 0) xl = ['🚪', 'DOOR']; else if (gun && it.a < gun.mag && G.am[BR_AMMO[gun.type].i] > 0) xl = ['🔄', 'RELOAD']; }
      if (BR_TOUCH.x[1] !== xl[1]) BR_TOUCH.x = xl; }
    X.prompt.setText(txt).setVisible(!!txt && m.state === 'play');
  }
});
{ const P = GameScene.prototype, extras = P.brExtras, hud = P.brHud;
  P.brExtras = function (m) {
    extras.call(this, m); const mine = this.brMine(), p0 = mine[0] || (this.online ? { chair: this.brMyChair() } : null), c = p0 && p0.chair, vp = this.vps && this.vps.length === 1 ? this.vps[0] : null, X = this.brX;
    this.brTeamPanel(m, c, c && c.out && vp ? vp.spect : null);
    if (c && c.out) { const s = vp && vp.spect, cpuMate = s && !s.player && s.gs.team === c.gs.team; X.spec.setText(s ? `ELIMINATED  -  watching ${m.name(s)}     LB / RB: switch     ▼: 1st / 3rd person${cpuMate ? '     Y: TAKE OVER this cart' : ''}` : 'ELIMINATED').setVisible(m.state !== 'over'); }
    if (X.prompt) X.prompt.setVisible(false);
    if (c && !c.out && m.state === 'play') this.brPrompts(m, c, p0, vp);
    /* (the touch buttons' names come from TouchPad.profile in touch.js) */
  };
  P.brHud = function (m) {
    const r = hud.call(this, m); if (!r) return r; const H = this.brH, c = (this.brMine()[0] || {}).chair; if (!c) return r; const G = c.gs;
    for (let i = 0; i < BR.slots; i++) { const it = brSlotItem(G, i), s = H.slots[i]; if (!it) continue; const gun = BR_GUNS[it.k]; if (gun) s.txt.setText(`${it.a}/${G.am[BR_AMMO[gun.type].i]}`).setColor(it.a <= 0 ? '#ff6b6b' : '#ffffff'); s.img.setAlpha(G.hol ? 0.45 : gun && it.a <= 0 && G.am[BR_AMMO[gun.type].i] <= 0 ? 0.35 : s.sel ? 1 : 0.6); }
    const it = G.inv[G.sel], gun = it && BR_GUNS[it.k];
    H.name.setText(G.down ? '' : G.hol || !it ? (G.inv.length ? 'Hands free: driving faster    Y: take your item out' : 'Empty-handed: drive into a CHEST for a gun') : `${(gun || BR_ITEMS[it.k]).name}${gun ? `  ${it.a}/${gun.mag}` : ''}    RT ${gun ? 'fire' : 'use'} · LT ${gun ? 'aim' : BR_ITEMS[it.k].heal ? 'heal a team-mate' : 'aim'} · X reload · Y put away · A jump`);
    return r;
  };
  const vps = P.viewports3d;
  P.viewports3d = function (LP) {                                           // spectating: your camera choice (▼ switches between first and third person)
    const list = vps.call(this, LP), m = this.match; if (m.kind !== 'br') return list;
    for (const vp of list) if (vp.spect) vp.mode = Settings.camMode === 'first' ? 'first' : 'third';
    return list;
  };
  const mm = P.drawMinimap;
  P.drawMinimap = function () {                                             // the minimap: rez garages, team-mates, rez cards
    mm.call(this); const m = this.match; if (m.kind !== 'br' || !m.gs || !this.mapG) return;
    const g = this.mapG, Mm = CONFIG.view3d.minimap, C = CONFIG.court, B = CONFIG.courtBase || C, fit = Math.min(1, B.width / C.width, B.height / C.height), s = Mm.scale * fit, ox = Mm.x + (B.width - C.width * fit) * Mm.scale, oy = Mm.y, M = MODES.br.map(m);
    (M.rez || []).forEach((q, i) => g.fillStyle(m.gs.gar && m.gs.gar[i] > m.gs.t ? 0xff4d4d : 0x7dff6a, 1).fillRect(ox + q.cx * s - 2.5, oy + q.cy * s - 2.5, 5, 5));
    const me = (this.brMine()[0] || {}).chair;
    if (me) for (const o of m.chairs) if (o !== me && !o.out && o.gs.team === me.gs.team) g.fillStyle(o.gs.down ? 0xff4d4d : 0x3dd6ff, 1).fillCircle(ox + o.x * s, oy + o.y * s, 3);
    for (const L of m.gs.L || []) if (L[1] === 'card' && me && m.chairs[L[5]] && m.chairs[L[5]].gs.team === me.gs.team) g.fillStyle(0xffd23f, 1).fillRect(ox + L[2] * s - 2, oy + L[3] * s - 3, 4, 6);
  };
  const pc = View3D.prototype.placeCamera;
  View3D.prototype.placeCamera = function (vp, dt) {                       // third person (every game from v14.2.10): behind and above the cart, looking ahead of it
    const c = pc.call(this, vp, dt); if (!(vp.mode === 'third' && vp.chair && this.m)) return c; const br = this.m.kind === 'br';   // (v14.2.10: every game's third person works this way now)
    const ch = vp.chair, z = (ch.gs && ch.gs.z) || 0, st = this.camFor(vp.key), k = 1 - Math.exp(-6 * dt), h = ch.heading; st.th = st.th === undefined ? h : st.th + normalizeAngle(h - st.th) * k;
    /* v14.2.6: further back and higher (v14.2.9: 2.75 m behind and 1.75 m up by default; Settings > Controls and screen > Third-person camera distance) with a wider view, so you see around you and well ahead. It comes in closer
       when a wall is behind you, and stays under the floor above you indoors */
    const M = br ? MODES.br.map(this.m) : null, AW = !br && typeof Arena !== 'undefined' && Arena.map(this.m) ? Arena.walls(this.m) : null, lv = (ch.gs && ch.gs.lv) || 0, cx = Math.cos(st.th), cy = Math.sin(st.th); const far = Math.max(1.5, Math.min(6, Settings.brCamDist || 2.75)); let back = far;
    for (let d = 0.6; d <= far; d += 0.25) { const x = ch.x - cx * d, y = ch.y - cy * d; if (br ? (brWallAt(M, lv, x, y) || (lv === 0 && brTreesNear(M, x, y).some(t => Math.hypot(x - t.x, y - t.y) < t.r + 0.2))) : AW && AW.some(w => x > w.x0 - 0.2 && x < w.x1 + 0.2 && y > w.y0 - 0.2 && y < w.y1 + 0.2)) { back = Math.max(0.8, d - 0.5); break; } }
    let up = 0.85 + back * 0.33; const bx = ch.x - cx * back, by = ch.y - cy * back; if (br && (MODES.br.floorAt(M, lv + 1, bx, by) || MODES.br.floorAt(M, lv + 1, ch.x, ch.y))) up = Math.min(up, BR.H - 0.35);
    st.camBack = st.camBack === undefined ? back : st.camBack + (back - st.camBack) * (back < st.camBack ? 1 : k * 0.6);   // (snaps in, eases back out)
    const bb = st.camBack; st.camUp = st.camUp === undefined ? up : st.camUp + (up - st.camUp) * (up < st.camUp ? 1 : k);
    c.position.set(ch.x - cx * bb, z + st.camUp, ch.y - cy * bb); c.lookAt(ch.x + cx * 9, z + 1.0, ch.y + cy * 9);
    const fov = this.widen(Math.max(80, Settings.fov3d || 74), (vp.rect && vp.rect.w && vp.rect.h) ? vp.rect.w / vp.rect.h : 16 / 9); if (c.fov !== fov) { c.fov = fov; c.updateProjectionMatrix(); }
    if (br && !vp.spect) { const pt = brPitch(ch) * 0.6; if (pt) { const d = new THREE.Vector3(); c.getWorldDirection(d); const yaw = Math.atan2(d.z, d.x), p0 = Math.asin(Math.max(-1, Math.min(1, d.y))) + pt; c.lookAt(c.position.x + Math.cos(yaw) * Math.cos(p0), c.position.y + Math.sin(p0), c.position.z + Math.sin(yaw) * Math.cos(p0)); } }
    c.updateMatrixWorld(); return c;
  };
}

/* ---- the bag screen: your slots, your ammo (X on an ammo type drops a pack), and the full map with the storm ---- */
{ const P = BRInvScene.prototype, cr = P.create, up = P.update, pr = P.press;
  P.create = function () {
    cr.call(this); this.mapS = null; const V = CONFIG.view; this.help.setText('◀ ▶ choose     A: move / swap     Y: hold this     X: drop     ▼ ammo     B or ▲: close').setY(this.cy - 150);
    this.ammoT = AMMO_KEYS.map((k, i) => this.add.text(this.cx - 330 + i * 165, this.cy + 134, '', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#ffffff', align: 'center' }).setOrigin(0.5));
    this.ammoI = AMMO_KEYS.map((k, i) => this.add.image(this.cx - 330 + i * 165, this.cy + 98, this.d.game.brIcon('am_' + k)).setDisplaySize(68, 38));   // v14.1.8: a picture of the rounds over each ammo count
    this.ammoCur = -1; this.mapG = this.add.graphics(); this.mapT = this.add.text(V.width - 16, 16, '', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#ffd23f', align: 'right' }).setOrigin(1, 0);
  };
  P.press = function (k) {
    if (this.ammoCur >= 0) { if (k === 'x') { this.d.act({ op: 'ammo', a: this.ammoCur }); Sound.play('back'); return; } if (k === 'a' || k === 'y') return; }
    return pr.call(this, k);
  };
  P.update = function (time, delta) {
    const src = this.d.src, Pp = (src && src.pressed) || {};
    if (this.ammoCur < 0 && (Pp.quick || Pp.up)) { this.press('b'); return; }                // ▲ (or the bag button again): close
    if (this.ammoCur >= 0) { if (Pp.up) { this.ammoCur = -1; Sound.play('blip'); } if (Pp.left) this.ammoCur = (this.ammoCur + 4) % 5; if (Pp.right) this.ammoCur = (this.ammoCur + 1) % 5; if (Pp.left || Pp.right) { src.pressed.left = src.pressed.right = false; Sound.play('blip'); } }
    else if (Pp.down) { this.ammoCur = 0; Sound.play('blip'); }
    up.call(this, time, delta); if (!this.scene.isActive()) return;
    const G = this.d.chair.gs, m = this.d.game.match;
    this.ammoT.forEach((t, i) => { const A = BR_AMMO[AMMO_KEYS[i]]; t.setText(`${A.name}\n${G.am[i]} / ${A.max}`); if (this.ammoI) this.ammoI[i].setAlpha(G.am[i] ? 1 : 0.4); t.setColor(this.ammoCur === i ? '#ffd23f' : G.am[i] ? '#ffffff' : '#6b7a86').setScale(this.ammoCur === i ? 1.1 : 1); });
    if (this.ammoCur >= 0) this.info.setText(`${BR_AMMO[AMMO_KEYS[this.ammoCur]].name}: X drops a pack for a team-mate.  ▲ back to your slots`);
    const V = CONFIG.view, M = MODES.br.map(m), S = m.gs.st, sz = 196, s = sz / Math.max(m.width, m.height), x0 = V.width - sz - 14, y0 = 136, g = this.mapG; g.clear();   // the map (under the minimap)
    if (!this.mapS) { const q = this.mapS = this.add.graphics(); q.setDepth((g.depth || 0) - 0.01); this.children.moveBelow(q, g);   // (v14.2.6: the buildings are drawn once when the bag opens, not every frame)
      q.fillStyle(0x0d151b, 0.92).fillRect(x0 - 6, y0 - 6, m.width * s + 12, m.height * s + 12).fillStyle(MODES.br.map(m).theme.ground, 1).fillRect(x0, y0, m.width * s, m.height * s);
      for (const f of M.floors) if (f.lv === 1) q.fillStyle(0x9aa1a8, 0.8).fillRect(x0 + f.x0 * s, y0 + f.y0 * s, (f.x1 - f.x0) * s, (f.y1 - f.y0) * s);
      for (const w of M.walls) if (w.lv === 0 && w.kind !== 'door') q.fillStyle(0x3a3f45, 1).fillRect(x0 + w.x0 * s, y0 + w.y0 * s, Math.max(1, (w.x1 - w.x0) * s), Math.max(1, (w.y1 - w.y0) * s)); }
    (M.rez || []).forEach((q, i) => g.fillStyle(m.gs.gar[i] > m.gs.t ? 0xff4d4d : 0x7dff6a, 1).fillRect(x0 + q.cx * s - 4, y0 + q.cy * s - 4, 8, 8));
    g.lineStyle(3, 0x9b4dff, 1).strokeCircle(x0 + S.x * s, y0 + S.y * s, S.r * s); if (S.wait > 0 || S.shrink > 0) g.lineStyle(2, 0xffffff, 0.9).strokeCircle(x0 + S.fx * s, y0 + S.fy * s, S.fr * s);
    const me = this.d.chair; for (const o of m.chairs) if (!o.out && o.gs.team === me.gs.team) g.fillStyle(o === me ? 0xffd23f : 0x3dd6ff, 1).fillCircle(x0 + o.x * s, y0 + o.y * s, o === me ? 5 : 4);
    g.lineStyle(2, 0xffd23f, 1).lineBetween(x0 + me.x * s, y0 + me.y * s, x0 + (me.x + Math.cos(me.heading) * 6) * s, y0 + (me.y + Math.sin(me.heading) * 6) * s);
    this.mapT.setText(`${M.name.toUpperCase()}\nSTORM STAGE ${Math.min(6, S.ph + 1)}${S.wait > 0 ? `: ${Math.ceil(S.wait)} s` : ': MOVING'}\n■ rez garage   ○ next circle`).setPosition(V.width - 14, y0 + m.height * s + 10);
  };
}
