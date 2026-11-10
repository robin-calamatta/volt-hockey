/* v14.2.2 Volt Royale tweaks:
   - Shields are sports-drink bottles: a small blue SHIELD SIP (+25, up to 50) and a big SHIELD JUG (+75). Our own "VOLT" label.
   - Picking up a gun, an item or a chest needs you to be looking at it (it's in front of your cart, roughly where your camera points),
     not just touching it. Ammo, and topping up a stack you already carry, still happen just by driving over them. */
{
  if (BR_ITEMS.plate) Object.assign(BR_ITEMS.plate, { name: 'SHIELD SIP', icon: '🧃', about: '+25 shield (up to 50). A small bottle of shield drink.' });
  if (BR_ITEMS.armour) Object.assign(BR_ITEMS.armour, { name: 'SHIELD JUG', icon: '🧃', about: '+75 shield. A big bottle of shield drink.' });

  /* the bottles (Items3D parts: [geometry, colour]); y is up, about 0.2 m tall for the small one */
  const geo0 = Items3D.geo.bind(Items3D), BLUE = 0x2f8fff, DEEP = 0x1659c7, CAP = 0xf4f6f8, LABEL = 0xffffff, BOLT = 0xffd23f;
  const lathe = (pts, seg = 18) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const bottle = (s, handle, f = 1) => {
    const k = s, w = k * f;   // scale: k for height, w for girth (v14.2.5: the jug is a fat, squat jug with a handle, so it's obviously the big one)
    const body = lathe([[0.001, 0], [0.042 * w, 0.002], [0.046 * w, 0.02 * k], [0.046 * w, 0.07 * k], [0.038 * w, 0.085 * k], [0.044 * w, 0.1 * k], [0.046 * w, 0.15 * k], [0.04 * w, 0.172 * k], [0.022 * k, 0.19 * k], [0.018 * k, 0.2 * k], [0.001, 0.2 * k]]);
    const parts = [[body.translate(0, -0.1 * k, 0), f > 1 ? DEEP : BLUE],
      [new THREE.CylinderGeometry(0.0475 * w, 0.0475 * w, 0.045 * k, 22, 1, true).translate(0, 0.025 * k, 0), LABEL],                 // the label band
      [new THREE.BoxGeometry(0.01 * k, 0.03 * k, 0.003 * k).rotateZ(0.5).translate(0, 0.026 * k, 0.0482 * w), BOLT],                 // a lightning bolt on the label, front and back
      [new THREE.BoxGeometry(0.01 * k, 0.03 * k, 0.003 * k).rotateZ(0.5).translate(0, 0.026 * k, -0.0482 * w), BOLT],
      [new THREE.CylinderGeometry(0.0485 * w, 0.0485 * w, 0.008 * k, 22, 1, true).translate(0, 0.002 * k, 0), f > 1 ? BLUE : DEEP],
      [new THREE.CylinderGeometry(0.021 * k, 0.021 * k, 0.026 * k, 14).translate(0, 0.112 * k, 0), CAP],                              // the sports cap
      [new THREE.CylinderGeometry(0.009 * k, 0.013 * k, 0.014 * k, 10).translate(0, 0.13 * k, 0), CAP]];
    if (handle) parts.push([new THREE.TorusGeometry(0.034 * k, 0.011 * k, 8, 16, Math.PI).rotateZ(-Math.PI / 2).translate(0.046 * w, 0.03 * k, 0), CAP]);
    return parts;
  };
  Items3D.geo = function (k) {
    if (this.cache[k] && (k === 'plate' || k === 'armour')) return this.cache[k];
    if (k === 'plate') return (this.cache[k] = this.build(bottle(1, false)));
    if (k === 'armour') return (this.cache[k] = this.build(bottle(1.45, true, 1.75)));
    return geo0(k);
  };
  delete Items3D.cache.plate; delete Items3D.cache.armour;

  /* bag and hotbar icons */
  const icon0 = brDrawIcon;
  brDrawIcon = function (c, k) {
    if (k !== 'plate' && k !== 'armour') return icon0(c, k);
    const big = k === 'armour', s = big ? 1.1 : 0.95, cx = big ? 58 : 64, by = 66, w = 30 * s * (big ? 1.8 : 1), h = 52 * s, top = by - h;
    c.fillStyle = '#1659c7'; c.beginPath(); c.moveTo(cx - w / 2, by); c.lineTo(cx - w / 2, top + h * 0.3); c.quadraticCurveTo(cx - w / 2, top + h * 0.12, cx - w * 0.2, top + h * 0.06); c.lineTo(cx + w * 0.2, top + h * 0.06); c.quadraticCurveTo(cx + w / 2, top + h * 0.12, cx + w / 2, top + h * 0.3); c.lineTo(cx + w / 2, by); c.closePath(); c.fill();
    c.fillStyle = '#2f8fff'; c.fillRect(cx - w / 2 + 3, top + h * 0.3, w - 6, h * 0.66);
    c.fillStyle = '#ffffff'; c.fillRect(cx - w / 2, top + h * 0.48, w, h * 0.24);
    c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(cx + 2, top + h * 0.5); c.lineTo(cx - 5, top + h * 0.61); c.lineTo(cx, top + h * 0.61); c.lineTo(cx - 3, top + h * 0.7); c.lineTo(cx + 5, top + h * 0.58); c.lineTo(cx, top + h * 0.58); c.closePath(); c.fill();
    c.fillStyle = '#f4f6f8'; c.fillRect(cx - 7 * s, top - 4, 14 * s, 8); c.fillRect(cx - 3 * s, top - 9, 6 * s, 6);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(cx - w / 2 + 4, top + h * 0.32, 3, h * 0.6);
    if (big) { c.strokeStyle = '#f4f6f8'; c.lineWidth = 6; c.beginPath(); c.arc(cx + w / 2 + 2, top + h * 0.45, 12, -Math.PI / 2, Math.PI / 2); c.stroke(); c.fillStyle = '#ffffff'; c.font = 'bold 15px sans-serif'; c.textAlign = 'center'; c.fillText('BIG', cx, top + h * 0.92); }
  };

  /* pick-ups: look at it */
  const BRm = MODES.br, foc = BRm.interactFocus, ANG = a => Math.atan2(Math.sin(a), Math.cos(a));
  const needsPress = k => !!(BR_GUNS[k] || BR_ITEMS[k] || k === 'chest' || k === 'ammo');
  BRm.interactFocus = function (m, c) {
    if (!c.player) return foc.call(this, m, c);
    const G = c.gs, g = m.gs; if (c.out || G.down || G.air) return null;
    const reach = R_CART() + 1.9, cone = 0.55; let best = null, bs = Infinity;
    for (const L of g.L) { const dx = L[2] - c.x, dy = L[3] - c.y; if (dx > reach || dx < -reach || dy > reach || dy < -reach || L[4] !== G.lv || !needsPress(L[1])) continue; const d = Math.hypot(dx, dy); if (d > reach || (L[9] !== undefined && L[9] !== null && g.t - L[9] < 0.6) || (L[7] === c.k && L[6] > g.t)) continue;
      const off = Math.abs(ANG(Math.atan2(dy, dx) - c.heading)); if (off > cone && d > 0.35) continue;     // (behind or beside you: not what you're looking at)
      const sc = off * 2.2 + d * 0.35; if (sc < bs) { bs = sc; best = { L }; } }
    if (best) return best;
    if (G.lv !== 0) return null; let bd = Infinity, door = null;                   // (doors as before; v14.2.6: only the ones nearby)
    for (const d of brDoorsNear(this.map(m), c.x, c.y)) { if (g.dr[d.door] === 2) continue; const dd = Math.hypot(d.cx - c.x, d.cy - c.y); if (dd < BR_DOOR.reach && dd < bd) { bd = dd; door = d; } }
    return door ? { door } : null;
  };
}

/* v14.2.11: items (heals, shield drinks, boosts, walls...) need a fresh press each time: holding the use button fires a gun over and over,
   but it no longer drinks a second bottle straight after the first. (Holding sends "use" every frame; a gap means the button was let go.) */
{ const P = MiniMatch.prototype, ub = P.useBy;
  P.useBy = function (p) {
    if (this.kind !== 'br' || !p || !p.chair || !p.chair.gs) return ub.call(this, p);
    const now = performance.now(), held = p._useT !== undefined && now - p._useT < 90; p._useT = now;
    const G = p.chair.gs, it = !G.hol && G.inv[G.sel], gun = it && BR_GUNS[it.k];
    if (held && !gun) return;                                              // still holding from the last one: let go and press again
    return ub.call(this, p);
  };
}
