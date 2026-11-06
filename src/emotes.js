/* The emoji wheel (v12): hold D-pad up (keyboard: H / M) in a match, point a stick at an emoji, let go to send it. A quick tap still opens
   quick chat online. The 😀 button on screen opens it for touch and mouse. Your 8 emojis are chosen in the Locker. Emojis pop up over your
   cart for everyone (online too: guests send 'emo:X' to the host, the host passes them on in its snapshots). */
const Emotes = {
  st: new Map(), holdMs: 280, showMs: 2600,
  srcOf(sc, p) {
    const o = sc.online; if (!o) return p.src;
    if (o.role === 'host') return p === o.me ? Controls.mine : o.session.guestSrc.get(p.id);
    return o.sim && o.sim.locals[0] && o.sim.locals[0].me === p ? Controls.mine : o.session.guestSrc.get(p.id);
  },
  wheel() { return Progress.P.wheel; },
  frame(sc) {
    const m = sc.match; if (!m || sc.demo || sc.scene.key !== 'Game') return; /* (touch button names: TouchPad.profile) */ const now = performance.now(), live = m.state !== 'over';
    for (const p of Progress.mine(sc)) {
      const src = this.srcOf(sc, p); if (!src || !src.held) continue; const st = this.st.get(p) || {}; this.st.set(p, st);
      if (src.held.quick && live) { if (!st.t0) st.t0 = now; if (!st.open && now - st.t0 > this.holdMs) { st.open = true; st.sel = -1; Sound.play('blip'); } }
      else { if (st.open && !st.mouse) { if (st.sel >= 0) this.send(sc, p, this.wheel()[st.sel]); st.open = false; } else if (st.t0 && !st.open) src[sc.match.kind === 'br' ? 'bagTap' : 'quickTap'] = true; /* a quick tap: the bag (Battle Royale) or quick chat */ st.t0 = 0; }
      if (st.open && !st.mouse) { const r = Math.hypot(src.rx || 0, src.ry || 0) > 0.5 ? [src.rx, src.ry] : Math.hypot(src.ax || 0, src.ay || 0) > 0.5 ? [src.ax, src.ay] : null; if (r) { const s = ((Math.round(Math.atan2(r[1], r[0]) / (Math.PI / 4)) % 8) + 8) % 8; if (s !== st.sel) { st.sel = s; Sound.play('blip'); } } }
    }
    this.draw(sc); this.driftBar(sc);
  },
  driftBar(sc) {                                                          // the drift bar: charges white, blue, orange, purple while you drift; BOOST! when you let go
    const V = CONFIG.view, F = CONFIG.drift; if (!sc.drG || !sc.drG.scene) { sc.drG = sc.add.graphics().setDepth(44); sc.drT = sc.add.text(0, 0, '', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setDepth(45).setStroke('#0d151b', 4); }
    const g = sc.drG; g.clear(); sc.drT.setVisible(false);
    for (const p of Progress.mine(sc)) { const c = p.chair, D = c && c.dr; if (!D || c.out || (!D.on && D.boost <= 0)) continue;
      const vp = sc.vps && sc.vps.find(v => v.p === p); if (vp && vp.mode !== 'broadcast' && !sc.flat) continue;   /* (first / third person: the speed meter turns into the drift meter) */
      const R = vp ? vp.rect : { x: 0, y: 0, w: V.width, h: V.height }, w = 180, x = R.x + R.w / 2 - w / 2, y = R.y + R.h - 168;
      g.fillStyle(0x0d151b, 0.75).fillRoundedRect(x - 6, y - 6, w + 12, 20, 8);
      for (let i = 0; i < 3; i++) { const a = i ? F.levels[i - 1] : 0, b = F.levels[i], k = D.on ? Math.max(0, Math.min(1, (D.ch - a) / (b - a))) : (D.lvl > i ? 1 : 0), sx = x + i * (w / 3); g.fillStyle(0x223040, 1).fillRect(sx + 1, y, w / 3 - 2, 8).fillStyle(F.colors[i + 1], 1).fillRect(sx + 1, y, (w / 3 - 2) * k, 8); }
      if (!D.on && D.boost > 0) sc.drT.setText(['', 'BOOST!', 'BIG BOOST!', 'MAX BOOST!'][D.lvl] || 'BOOST!').setColor('#' + F.colors[Math.max(1, D.lvl)].toString(16).padStart(6, '0')).setPosition(R.x + R.w / 2, y - 18).setVisible(D.lvl > 0); }
  },
  send(sc, p, e) {
    if (!e || !p.chair) return; const m = sc.match, o = sc.online;
    if (o && o.role === 'client') { const L = o.sim.locals.find(x => x.me === p); if (L) L.pending.push('emo:' + e); } else this.recv(m, p.chair, e);
    this.show(p.chair, e); if (m.state === 'play' || m.state === 'countdown') Progress.ev('emoji');
  },
  recv(m, chair, e) {                                                    // the host (or a game on one screen): show it, and pass it on to everyone online
    if (!(COS.emojis.some(x => x.id === e) || (typeof ACTIONS !== 'undefined' && ACTIONS[e])) || !chair) return; this.show(chair, e); (m.emoQ || (m.emoQ = [])).push([m.chairs.indexOf(chair), e]);
  },
  show(chair, e) { if (!chair) return; if (typeof ACTIONS !== 'undefined' && ACTIONS[e]) chair.act = { id: e, t: performance.now() / 1000 }; else chair.emo = { e, t: performance.now() }; },   // an action: the driver's arms do it (rig3d.js); an emoji: a bubble
  icon(e) { return (typeof ACTIONS !== 'undefined' && ACTIONS[e] && ACTIONS[e].icon) || e; },
  draw(sc) {
    const V = CONFIG.view, now = performance.now(); if (!sc.emoG || !sc.emoG.scene) { sc.emoG = sc.add.graphics().setDepth(45); sc.emoT = []; sc.emoBtn = null; }
    const g = sc.emoG; g.clear(); let n = 0; const txt = (x, y, s, size) => { const t = sc.emoT[n] || (sc.emoT[n] = sc.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '40px' }).setOrigin(0.5).setDepth(46)); n++; return t.setText(s).setFontSize(size).setPosition(x, y).setVisible(true); };
    if (!sc.emoBtn) { sc.emoBtn = sc.add.text(30, 92, '😀', { fontFamily: 'sans-serif', fontSize: '30px', backgroundColor: '#0d151bb0', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(46).setInteractive({ useHandCursor: true });
      sc.emoBtn.on('pointerdown', () => { const p = Progress.mine(sc)[0]; if (!p) return; const st = this.st.get(p) || {}; this.st.set(p, st); st.open = !st.open; st.mouse = st.open; st.sel = -1; }); }
    sc.emoBtn.setVisible(sc.match.state !== 'over');
    if (sc.v3 && !sc.flat && sc.vps) for (const vp of sc.vps) for (const c of sc.match.chairs) {   // bubbles over carts: only over the one who sent it, only nearby and in sight
      if (!c.emo || now - c.emo.t > this.showMs || c.out) continue; const age0 = (now - c.emo.t) / this.showMs, a0 = 1 - Math.max(0, age0 - 0.8) * 5;
      if (c === vp.chair && !vp.spect && vp.mode === 'first') { const R = vp.rect; g.fillStyle(0xffffff, 0.85 * a0).fillCircle(R.x + R.w / 2, R.y + R.h * 0.62 - age0 * 30, 44); txt(R.x + R.w / 2, R.y + R.h * 0.62 - age0 * 30, c.emo.e, '54px').setAlpha(a0); continue; }   // your own: right in front of you
      const eye = vp.chair || vp.spect; if (eye && (Math.hypot(eye.x - c.x, eye.y - c.y) > 30 || (sc.match.kind === 'br' && !MG.clearPath(eye.x, eye.y, c.x, c.y, MODES.br.map(sc.match).walls.filter(w => w.lv === ((eye.gs && eye.gs.lv) || 0)), 0.05)))) continue;
      const q = sc.v3.project(vp, c.x, 1.95 + ((c.gs && c.gs.z) || 0), c.y); if (q.behind) continue;
      const age = (now - c.emo.t) / this.showMs, pop = Math.min(1, age * 8), k = Math.max(0.55, Math.min(1.4, 6 / Math.max(1, q.dist))) * (0.6 + 0.4 * pop), y = q.y - 30 * k - age * 18;
      g.fillStyle(0xffffff, 0.92 * (1 - Math.max(0, age - 0.8) * 5)).fillCircle(q.x, y, 30 * k).fillTriangle(q.x - 8 * k, y + 24 * k, q.x + 8 * k, y + 24 * k, q.x, y + 38 * k);
      txt(q.x, y, c.emo.e, Math.round(36 * k) + 'px').setAlpha(1 - Math.max(0, age - 0.8) * 5);
    }
    else if (sc.flat && sc.toScreen) for (const c of sc.match.chairs) if (c.emo && now - c.emo.t < this.showMs && !c.out) { const q = sc.toScreen(c.x, c.y); txt(q.x, q.y - 40, c.emo.e, '30px'); }   // (the 2D view: over the cart too)
    const mine = Progress.mine(sc);
    mine.forEach((p, i) => { const st = this.st.get(p); if (!st || !st.open) return;            // the wheel
      const vp = sc.vps && sc.vps.find(v => v.p === p), R = vp ? vp.rect : { x: 0, y: 0, w: V.width, h: V.height }, cx = R.x + R.w / 2, cy = R.y + R.h / 2, rr = Math.min(170, R.h * 0.36), W = this.wheel();
      g.fillStyle(0x0d151b, 0.72).fillCircle(cx, cy, rr + 30).lineStyle(3, 0xffd23f, 0.9).strokeCircle(cx, cy, rr + 30).fillStyle(0x1b2a6b, 0.9).fillCircle(cx, cy, 46);
      txt(cx, cy, st.mouse ? '✕' : st.sel >= 0 ? this.icon(W[st.sel]) : '😀', st.mouse ? '30px' : '40px'); if (st.sel >= 0 && ACTIONS[W[st.sel]]) txt(cx, cy + 34, ACTIONS[W[st.sel]].name, '15px');
      for (let s = 0; s < 8; s++) { const a = s * Math.PI / 4, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (s === st.sel) g.fillStyle(0xffd23f, 0.95).fillCircle(x, y, 40); else g.fillStyle(0x2a3a48, 0.9).fillCircle(x, y, 34); txt(x, y, this.icon(W[s]), s === st.sel ? '44px' : '36px'); }
      if (st.mouse && !st.hook) { st.hook = true; sc.input.once('pointerdown', ptr => { st.hook = false; if (!st.open) return; const d = Math.hypot(ptr.x - cx, ptr.y - cy); if (d > 70 && d < rr + 60) { const s = ((Math.round(Math.atan2(ptr.y - cy, ptr.x - cx) / (Math.PI / 4)) % 8) + 8) % 8; this.send(sc, p, W[s]); } st.open = false; st.mouse = false; }); }
    });
    for (let i = n; i < sc.emoT.length; i++) sc.emoT[i].setVisible(false);
  }
};
