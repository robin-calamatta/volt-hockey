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
    const m = sc.match; if (!m || sc.demo || sc.scene.key !== 'Game') return; const now = performance.now(), live = m.state !== 'over';
    for (const p of Progress.mine(sc)) {
      const src = this.srcOf(sc, p); if (!src || !src.held) continue; const st = this.st.get(p) || {}; this.st.set(p, st);
      if (src.held.quick && live) { if (!st.t0) st.t0 = now; if (!st.open && now - st.t0 > this.holdMs) { st.open = true; st.sel = -1; Sound.play('blip'); } }
      else { if (st.open && !st.mouse) { if (st.sel >= 0) this.send(sc, p, this.wheel()[st.sel]); st.open = false; } else if (st.t0 && !st.open) src.quickTap = true; st.t0 = 0; }
      if (st.open && !st.mouse) { const r = Math.hypot(src.rx || 0, src.ry || 0) > 0.5 ? [src.rx, src.ry] : Math.hypot(src.ax || 0, src.ay || 0) > 0.5 ? [src.ax, src.ay] : null; if (r) { const s = ((Math.round(Math.atan2(r[1], r[0]) / (Math.PI / 4)) % 8) + 8) % 8; if (s !== st.sel) { st.sel = s; Sound.play('blip'); } } }
    }
    this.draw(sc);
  },
  send(sc, p, e) {
    if (!e || !p.chair) return; const m = sc.match, o = sc.online;
    if (o && o.role === 'client') { const L = o.sim.locals.find(x => x.me === p); if (L) L.pending.push('emo:' + e); } else this.recv(m, p.chair, e);
    this.show(p.chair, e); if (m.state === 'play' || m.state === 'countdown') Progress.ev('emoji');
  },
  recv(m, chair, e) {                                                    // the host (or a game on one screen): show it, and pass it on to everyone online
    if (!COS.emojis.some(x => x.id === e) || !chair) return; this.show(chair, e); (m.emoQ || (m.emoQ = [])).push([m.chairs.indexOf(chair), e]);
  },
  show(chair, e) { if (chair) chair.emo = { e, t: performance.now() }; },
  draw(sc) {
    const V = CONFIG.view, now = performance.now(); if (!sc.emoG || !sc.emoG.scene) { sc.emoG = sc.add.graphics().setDepth(45); sc.emoT = []; sc.emoBtn = null; }
    const g = sc.emoG; g.clear(); let n = 0; const txt = (x, y, s, size) => { const t = sc.emoT[n] || (sc.emoT[n] = sc.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '40px' }).setOrigin(0.5).setDepth(46)); n++; return t.setText(s).setFontSize(size).setPosition(x, y).setVisible(true); };
    if (!sc.emoBtn) { sc.emoBtn = sc.add.text(30, V.height - 196, '😀', { fontFamily: 'sans-serif', fontSize: '30px', backgroundColor: '#0d151bb0', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(46).setInteractive({ useHandCursor: true });
      sc.emoBtn.on('pointerdown', () => { const p = Progress.mine(sc)[0]; if (!p) return; const st = this.st.get(p) || {}; this.st.set(p, st); st.open = !st.open; st.mouse = st.open; st.sel = -1; }); }
    sc.emoBtn.setVisible(sc.match.state !== 'over');
    if (sc.v3 && !sc.flat && sc.vps) for (const vp of sc.vps) for (const c of sc.match.chairs) {   // bubbles over carts
      if (!c.emo || now - c.emo.t > this.showMs || c.out) continue; const q = sc.v3.project(vp, c.x, 1.95 + ((c.gs && c.gs.z) || 0), c.y); if (q.behind) continue;
      const age = (now - c.emo.t) / this.showMs, pop = Math.min(1, age * 8), k = Math.max(0.55, Math.min(1.4, 6 / Math.max(1, q.dist))) * (0.6 + 0.4 * pop), y = q.y - 30 * k - age * 18;
      g.fillStyle(0xffffff, 0.92 * (1 - Math.max(0, age - 0.8) * 5)).fillCircle(q.x, y, 30 * k).fillTriangle(q.x - 8 * k, y + 24 * k, q.x + 8 * k, y + 24 * k, q.x, y + 38 * k);
      txt(q.x, y, c.emo.e, Math.round(36 * k) + 'px').setAlpha(1 - Math.max(0, age - 0.8) * 5);
    }
    else for (const c of sc.match.chairs) if (c.emo && now - c.emo.t < this.showMs) txt(V.width / 2, 140 + 44 * n, `${sc.match.name ? sc.match.name(c) : ''} ${c.emo.e}`, '30px');
    const mine = Progress.mine(sc);
    mine.forEach((p, i) => { const st = this.st.get(p); if (!st || !st.open) return;            // the wheel
      const vp = sc.vps && sc.vps.find(v => v.p === p), R = vp ? vp.rect : { x: 0, y: 0, w: V.width, h: V.height }, cx = R.x + R.w / 2, cy = R.y + R.h / 2, rr = Math.min(170, R.h * 0.36), W = this.wheel();
      g.fillStyle(0x0d151b, 0.72).fillCircle(cx, cy, rr + 30).lineStyle(3, 0xffd23f, 0.9).strokeCircle(cx, cy, rr + 30).fillStyle(0x1b2a6b, 0.9).fillCircle(cx, cy, 46);
      txt(cx, cy, st.mouse ? '✕' : st.sel >= 0 ? W[st.sel] : '😀', st.mouse ? '30px' : '40px');
      for (let s = 0; s < 8; s++) { const a = s * Math.PI / 4, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (s === st.sel) g.fillStyle(0xffd23f, 0.95).fillCircle(x, y, 40); else g.fillStyle(0x2a3a48, 0.9).fillCircle(x, y, 34); txt(x, y, W[s], s === st.sel ? '44px' : '36px'); }
      if (st.mouse && !st.hook) { st.hook = true; sc.input.once('pointerdown', ptr => { st.hook = false; if (!st.open) return; const d = Math.hypot(ptr.x - cx, ptr.y - cy); if (d > 70 && d < rr + 60) { const s = ((Math.round(Math.atan2(ptr.y - cy, ptr.x - cx) / (Math.PI / 4)) % 8) + 8) % 8; this.send(sc, p, W[s]); } st.open = false; st.mouse = false; }); }
    });
    for (let i = n; i < sc.emoT.length; i++) sc.emoT[i].setVisible(false);
  }
};
