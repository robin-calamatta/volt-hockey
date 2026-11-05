/* First person, third person and broadcast cameras for the match screen (GameScene). The drawing itself is in view3d.js.
   - Each local player has their own camera; two or more local players get a split screen.
   - In first and third person the stick is cart-relative: push forward to drive, left / right to turn (how far you push sets how fast you turn).
     In the broadcast view the stick follows the screen, like the 2D game.
   - The camera button cycles first -> third -> broadcast -> classic 2D (2D only for a lone player; it is the original flat view).
   - Awareness: a mini-map, an arrow at the edge of your view pointing at the ball when you cannot see it, name tags and teammate markers. */
Object.assign(GameScene.prototype, {
  setup3d() {
    this.v3 = null; this.vps = null; this.shownFlat = null; this.sharedFlat = Settings.camMode === '2d'; this.flat = true;
    this.hud3 = this.add.graphics().setDepth(18); this.mapG = this.add.graphics().setDepth(19);
    this.tagPool = []; this.vpText = []; this.toasts = new Map();
    this.events.once('shutdown', () => this.teardown3d());
  },
  ensureV3() {
    if (this.v3) return true; if (!Render3D.ensure()) return false;
    try { this.v3 = new View3D(this); } catch (e) { console.error('3D view failed, using the 2D view', e); this.v3 = null; }
    return !!this.v3;
  },
  teardown3d() {
    if (this.v3) { try { this.v3.dispose(); } catch (e) {} this.v3 = null; }
    const other = this.scene.get(this.scene.key === 'Game' ? 'Preview' : 'Game');            // the camera settings preview closing over a paused match: show the match again
    if (other && other !== this && other.v3 && !other.flat) { try { other.render3d(0); } catch (e) { Render3D.show(false); } } else Render3D.show(false);
    for (const p of (this.LP || [])) p.steer = null;
  },
  apply3d() {                                                  // the camera settings changed: everyone goes back to the chosen camera
    for (const p of (this.setup.players || [])) p.camMode = undefined;
    this.sharedFlat = Settings.camMode === '2d'; this.shownFlat = null;
    if (this.v3) this.v3.applyQuality();
  },
  modeOf(p) { const m = (p && p.camMode) || Settings.camMode || 'first'; return !Settings.camAllowed(m) || (m === '2d' && this.match && this.match.kind === 'br') ? 'first' : m; },   // (no top-down view in Battle Royale)   // third person and broadcast only when turned on
  /* Who is playing on this screen, and which device each of them is using right now. */
  localControls() {
    const o = this.online;
    if (!o) return this.demo ? [] : this.setup.players.filter(p => p.src).map(p => [p, p.src]);
    const menuOpen = this.scene.isActive('Pause') || FriendsBar.open || Forms.isOpen, idle = { ax: 0, ay: 0, pressed: {}, held: {} }, out = [];
    const me = o.role === 'host' ? o.me : o.players.find(p => p.id === o.session.myId);
    if (me) out.push([me, menuOpen ? idle : Controls.mine]);
    for (const [id, src] of o.session.guestSrc || []) { const p = o.players.find(q => q.id === id); if (p) out.push([p, menuOpen ? idle : src]); }
    return out;
  },
  cycleCamera(p, LP) {
    const lone = LP.length <= 1, cyc = Settings.camCycle().filter(m => m !== '2d' || (lone && this.match.kind !== 'br')), N = CONFIG.view3d.names;
    if (!lone && this.sharedFlat) { this.sharedFlat = false; for (const q of LP) if (this.modeOf(q) === '2d') q.camMode = 'first'; }
    else {
      const next = cyc[(cyc.indexOf(this.modeOf(p)) + 1) % cyc.length];
      if (lone) { Settings.camMode = next; Settings.save(); p.camMode = undefined; } else p.camMode = next;      // a lone player's choice is remembered for next time
    }
    Sound.play('blip'); this.toasts.set(p, { text: N[this.modeOf(p)] || '', until: this.time.now + 1400 });
  },
  wantFlat(LP) {
    if (this.match && this.match.kind === 'br') return false;
    if (this.demo) return Settings.camMode === '2d';
    if (LP.length <= 1) return this.modeOf(LP[0]) === '2d';
    return this.sharedFlat;
  },
  /* Called every frame before the simulation runs: camera buttons, which views to draw, and turning each player's stick into a court direction. */
  pre3d(dt) {
    const ctl = this.localControls(), LP = ctl.map(x => x[0]); this.LP = LP;
    for (const [p, src] of ctl) if (src.pressed && src.pressed.camera) this.cycleCamera(p, LP);
    this.flat = this.wantFlat(LP);
    if (!this.flat && !this.ensureV3()) this.flat = true;
    this.vps = this.flat ? null : this.viewports3d(LP);
    for (const [p, src] of ctl) { this.steer3d(p, src, this.vps && this.vps.find(v => v.p === p), dt); p._look = { x: src.rx || 0, y: (src.ry || 0) * (Settings.invertLook ? -1 : 1) }; }   // right stick: look around
  },
  viewports3d(LP) {
    const m = this.match, V = CONFIG.view, chairOf = p => m.chairs.find(c => c.player === p) || null; let list;
    if (this.demo) { const ch = m.chairs.find(c => c.side === 0 && c.index === 1) || m.chairs[0], md = Settings.camMode === '2d' ? 'third' : Settings.camMode; list = [{ key: 'demo', p: null, chair: ch, mode: md }]; }
    else if (!LP.length) list = [{ key: 'tv', p: null, chair: null, mode: 'broadcast' }];
    else list = LP.map(p => {
      const ch = chairOf(p), md = this.modeOf(p) === '2d' ? 'third' : this.modeOf(p), out = !ch || ch.benched;
      return { key: p, p, chair: out ? null : ch, mode: !ch ? 'broadcast' : ch.benched ? 'bench' : md, benched: !!(ch && ch.benched), benchChair: ch, look: p._look };
    });
    if (list.length === 3) list.push({ key: 'tv', p: null, chair: null, mode: 'broadcast' });       // three players: the fourth corner shows the whole game
    const n = list.length, cols = n <= 1 ? 1 : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols), w = V.width / cols, h = V.height / rows;
    list.forEach((vp, i) => { vp.rect = { x: (i % cols) * w, y: Math.floor(i / cols) * h, w, h }; });
    return list;
  },
  /* The stick -> a direction on the court (read by screenToCourt through p.steer). */
  steer3d(p, src, vp, dt) {
    if (this.flat || !vp || !vp.chair || !this.v3) { p.steer = null; return; }
    const S = CONFIG.view3d.steer, ch = vp.chair, ax = src.ax || 0, ay = src.ay || 0;
    if (vp.mode === 'broadcast') { const A = this.v3.screenAxes(vp); p.steer = { x: A.right.x * ax - A.up.x * ay, y: A.right.y * ax - A.up.y * ay }; return; }
    const h = ch.heading, rate = CONFIG.chair.baseTurnRate * Settings.turnSpeed, fwd = -ay, turn = ax;
    if (p._aim === undefined || p._aimChair !== ch) { p._aim = h; p._aimChair = ch; p._lastH = h; }
    const jump = normalizeAngle(h - p._lastH); p._lastH = h;
    if (Math.abs(jump) > rate * dt + 0.03 || ch.spinLeft > 0) p._aim += jump;                     // a spin shot (or a knock) turned the cart: the aim turns with it
    if (Math.abs(turn) > S.turnDead) p._aim += Math.sign(turn) * Math.pow((Math.abs(turn) - S.turnDead) / (1 - S.turnDead), S.turnCurve) * rate * dt;
    p._aim = h + clamp(normalizeAngle(p._aim - h), -S.aimLead, S.aimLead);                         // the aim leads the cart only a little, so it never winds up
    if (Math.hypot(fwd, turn) < S.dead) { p._aim = h; p.steer = { x: 0, y: 0 }; return; }
    const speed = fwd >= S.forwardDead ? Math.min(1, fwd) : fwd <= -S.forwardDead ? -Math.min(1, -fwd) : S.pivotSpeed;   // between the two: turning on the spot, creeping forward
    p.steer = { x: Math.cos(p._aim) * speed, y: Math.sin(p._aim) * speed };
  },
  /* Show the 2D or the 3D picture (and hide the other). */
  sync3d() {
    if (this.shownFlat === this.flat) return; this.shownFlat = this.flat; const f = this.flat;
    this.world.setVisible(f); if (this.plane) this.plane.setVisible(f);
    if (!f) { this.tags.forEach(t => t.setVisible(false)); this.arrows.clear(); this.arrowTags.forEach(t => t.setVisible(false)); viewInv = null; viewFlip = false; }
    else { this.hud3.clear(); this.mapG.clear(); this.tagPool.forEach(t => t.setVisible(false)); this.vpText.forEach(t => t.setVisible(false)); for (const p of (this.LP || [])) p.steer = null; this.camSeen = false; }
    if (this.demo) this.cameras.main.setBackgroundColor(f ? '#0d151b' : 'rgba(0,0,0,0)');
    Render3D.show(!f);
  },
  render3d(dt) {
    if (!this.v3) return; if (!this.vps) this.vps = this.viewports3d(this.LP || []);
    if (!this.sys.isVisible()) return;                         // hidden behind the camera settings preview: let the preview draw
    Render3D.show(true); this.v3.update(dt); this.v3.render(this.vps, dt); this.hud3d();
  },

  /* ----- the overlay: split lines, names, ball arrows, speed meter, mini-map ----- */
  pooled(list, i, style) { return (list[i] || (list[i] = this.add.text(0, 0, '', style).setOrigin(0.5).setDepth(19).setStroke('#0d151b', 4))).setAlpha(1).setScale(1); },
  hud3d() {
    const g = this.hud3, m = this.match, V3 = CONFIG.view3d, T = V3.tags, split = this.vps.length > 1; g.clear(); let nt = 0, nv = 0;
    const tagStyle = { ...STYLE.tag, fontSize: '20px' }, vpStyle = { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffffff' };
    for (const vp of this.vps) {
      const R = vp.rect, top = R.y === 0 ? CONFIG.view.hudHeight : 0, inset = 34;
      // name tags over carts (people) and small markers over CPU teammates
      const bq = this.v3.project(vp, m.ball.x, CONFIG.ball.radius, m.ball.y), bk = bq.behind ? 0 : Math.max(4, 26 / Math.max(0.5, bq.dist));   // the ball on screen (rough radius in pixels)
      for (const c of m.chairs) {
        if (c.benched || (c === vp.chair && vp.mode !== 'broadcast')) continue;
        const mine = vp.p && c.side === vp.p.side, label = m.mini ? this.miniTag(c, vp) : c.player ? (c.player.name || c.player.tag) : (mine && vp.mode !== 'broadcast' ? '▼' : '');
        if (!label) continue; const q = this.v3.project(vp, c.x, T.height + ((c.gs && c.gs.z) || 0), c.y);
        if (q.behind || q.x < R.x + 10 || q.x > R.x + R.w - 10 || q.y < R.y + top || q.y > R.y + R.h - 10) continue;
        const k = Math.max(T.minScale, Math.min(T.maxScale, T.near / Math.max(0.5, q.dist)));
        const tag = this.pooled(this.tagPool, nt++, tagStyle).setText(label).setColor(teamColorHex(m.teams[c.side])).setScale(k).setPosition(q.x, q.y).setVisible(true);
        if (!bq.behind && !m.noBall) this.fadeTagNearBall(tag, vp.key + ':' + m.chairs.indexOf(c), bq.x, bq.y, bk);
      }
      // the ball: an arrow at the edge of the view when it is off screen (or behind you)
      const b = m.ball, q = this.v3.project(vp, b.x, 0.05, b.y), cx = R.x + R.w / 2, cy = (R.y + top + R.y + R.h) / 2;
      const seen = m.noBall || !q.behind && q.x > R.x + inset && q.x < R.x + R.w - inset && q.y > R.y + top + inset && q.y < R.y + R.h - 4;   // (the bottom edge counts: in first person the ball in your cup sits right there)
      if (!seen) {
        let dx = q.behind ? q.cx : q.x - cx, dy = q.behind ? Math.abs(q.dist) + Math.abs(q.cy) + 0.5 : q.y - cy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        const hw = R.w / 2 - inset, hh = (R.y + R.h - (R.y + top)) / 2 - inset, t = Math.min(hw / Math.abs(dx || 1e-6), hh / Math.abs(dy || 1e-6)), ax = cx + dx * t, ay = cy + dy * t, S = 18, nx = -dy, ny = dx;
        g.fillStyle(0x000000, 0.4).fillCircle(ax + 2, ay + 3, 15).fillStyle(0xffffff, 1).fillCircle(ax, ay, 13).fillStyle(0x0f1820, 1).fillCircle(ax - 4, ay - 3, 3).fillCircle(ax + 4, ay + 3, 3);
        const tip = { x: ax + dx * (S + 16), y: ay + dy * (S + 16) }, l = { x: ax + dx * 16 + nx * S * 0.7, y: ay + dy * 16 + ny * S * 0.7 }, r = { x: ax + dx * 16 - nx * S * 0.7, y: ay + dy * 16 - ny * S * 0.7 };
        g.fillStyle(0xffe27a, 1).fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y).lineStyle(2, 0x0d151b, 1).strokeTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
      }
      // speed meter for your own cart (the ring on the floor is out of sight in first person)
      if (vp.p && vp.chair && vp.mode !== 'broadcast') {
        const n = CONFIG.speedLevels.length, lv = vp.p.speedLevel || 0, x0 = R.x + 18, y0 = R.y + R.h - 22 - (this.match && this.match.kind === 'br' && !this.flat ? 44 : 0);   // (Battle Royale: health and shield sit under it)
        const D = vp.chair.dr, F = CONFIG.drift, drifting = D && !vp.chair.out && (D.on || D.boost > 0), now = this.time.now;
        if (!drifting) {
          g.fillStyle(0x0d151b, 0.6).fillRoundedRect(x0 - 8, y0 - 28, n * 16 + 84, 40, 8);
          for (let i = 0; i < n; i++) g.fillStyle(i < lv ? 0xffffff : 0x55626c, i < lv ? 1 : 0.6).fillRect(x0 + 66 + i * 16, y0 - i * 3.5, 11, 6 + i * 3.5);
          this.pooled(this.vpText, nv++, { ...vpStyle, fontSize: '17px' }).setText('SPEED').setOrigin(0, 0.5).setPosition(x0, y0 - 8).setColor('#9fb2bf').setVisible(true);
        } else {                                                          // v13.1: while you drift, the speed meter is the drift meter
          const top3 = F.levels[2], k = D.on ? Math.min(1, D.ch / top3) : 1, lvl = D.on ? D.lvl : D.lvl || 1, col = F.colors[Math.max(1, lvl)] || 0xffffff, pulse = 0.5 + 0.5 * Math.sin(now / (D.on ? 70 : 45)), N = 8, bw = 13, W = N * (bw + 4) + 96;
          g.fillStyle(0x0d151b, 0.78).fillRoundedRect(x0 - 8, y0 - 34, W, 48, 10).lineStyle(3, col, 0.5 + 0.5 * pulse).strokeRoundedRect(x0 - 8, y0 - 34, W, 48, 10);
          g.fillStyle(col, 0.12 + 0.12 * pulse).fillRoundedRect(x0 - 14, y0 - 40, W + 12, 60, 14);           // a glow round it
          for (let i = 0; i < N; i++) { const f = (i + 1) / N, on = f <= k + 1e-6 || !D.on, need = f * top3, c = need <= F.levels[0] ? F.colors[1] : need <= F.levels[1] ? F.colors[2] : F.colors[3], x = x0 + 74 + i * (bw + 4), h = 8 + i * 3.2, jit = on && D.on ? (Math.random() - 0.5) * 2 : 0;
            g.fillStyle(on ? c : 0x2a3640, on ? 0.85 + 0.15 * pulse : 0.7).fillRect(x + jit, y0 + 6 - h, bw, h); if (on) g.fillStyle(0xffffff, 0.35 * pulse).fillRect(x + jit, y0 + 6 - h, bw, 3); }
          for (let i = 0; i < 4 && D.on; i++) { const sx = x0 + 74 + k * N * (bw + 4) + Math.random() * 10, sy = y0 - 4 - Math.random() * 26; g.fillStyle(0xffffff, 0.9).fillRect(sx, sy, 2, 2).fillStyle(col, 0.9).fillRect(sx + 3, sy + 3, 2, 2); }   // sparks off the end of the charge
          const label = D.on ? ['DRIFT', 'DRIFT', 'DRIFT!!', 'MAX!!!'][lvl] : ['BOOST', 'BOOST!', 'BIG BOOST!', 'MAX BOOST!'][lvl] || 'BOOST!';
          this.pooled(this.vpText, nv++, { ...vpStyle, fontSize: '19px' }).setText(label).setOrigin(0, 0.5).setPosition(x0 + (D.on ? Math.sin(now / 40) * 1.5 : 0), y0 - 10).setScale(label.length > 7 ? 0.62 : 1).setColor('#' + col.toString(16).padStart(6, '0')).setVisible(true);
        }
      }
      if (split && vp.p) this.pooled(this.vpText, nv++, vpStyle).setOrigin(0, 0.5).setText(vp.p.name || vp.p.tag || '').setColor(teamColorHex(m.teams[vp.p.side])).setPosition(R.x + 14, R.y + top + 18).setVisible(true);
      if (m.mini && vp.p && vp.chair && !split) { /* one view: the item line is drawn by the game screen */ } else if (m.mini && vp.p && vp.chair && m.state === 'play') { const l = this.itemLine(vp.p); if (l) this.pooled(this.vpText, nv++, { ...vpStyle, fontSize: '22px' }).setOrigin(0.5).setText(l).setColor('#ffe27a').setPosition(cx, R.y + R.h - 30).setVisible(true); }
      if (vp.benched) this.pooled(this.vpText, nv++, vpStyle).setOrigin(0.5).setText(m.mini ? 'OUT: watching from the bench' : `SIN BIN   back in ${Math.max(0, Math.ceil(vp.benchChair.binLeft))}s`).setColor('#ff7a59').setPosition(cx, R.y + R.h * 0.72).setVisible(true);
      const toast = vp.p && this.toasts.get(vp.p);
      if (toast && this.time.now < toast.until) this.pooled(this.vpText, nv++, { ...vpStyle, fontSize: '30px' }).setOrigin(0.5).setText(toast.text).setColor('#ffe27a').setAlpha(Math.min(1, (toast.until - this.time.now) / 300)).setPosition(cx, R.y + R.h * 0.62).setVisible(true);
    }
    for (const t of this.vpText.slice(nv)) t.setVisible(false);
    for (const t of this.tagPool.slice(nt)) t.setVisible(false);
    if (split) { g.lineStyle(4, 0x0d151b, 1); for (const vp of this.vps) g.strokeRect(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h); }
    this.drawMinimap();
  },
  drawMinimap() {
    const g = this.mapG, M = CONFIG.view3d.minimap, C = CONFIG.court, m = this.match, B = CONFIG.courtBase || C, fit = Math.min(1, B.width / C.width, B.height / C.height), s = M.scale * fit, ox = M.x + (B.width - C.width * fit) * M.scale, oy = M.y, P = (x, y) => [ox + x * s, oy + y * s]; g.clear();
    if (m.map) {                                                       // a race map: the whole track, shrunk to fit
      const T = RACE_THEMES[m.map.theme] || RACE_THEMES.grass; g.fillStyle(0x0d151b, M.alpha).fillRoundedRect(ox - 5, oy - 5, C.width * s + 10, C.height * s + 10, 9).fillStyle(T.ground, 0.9).fillRect(ox, oy, C.width * s, C.height * s);
      g.lineStyle(Math.max(2.5, m.hw * 2 * s), T.track, 1).beginPath(); m.rline.forEach((p, i) => { if (i % 3) return; const [x, y] = P(p.x, p.y); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath().strokePath();
      const [sx, sy] = P(m.rline[0].x, m.rline[0].y); g.fillStyle(0xffffff, 1).fillRect(sx - 2, sy - 2, 4, 4);
    } else {
    g.fillStyle(0x0d151b, M.alpha).fillRoundedRect(ox - 5, oy - 5, C.width * s + 10, C.height * s + 10, 9);
    g.fillStyle(0x2a3a46, 0.9).fillRoundedRect(ox, oy, C.width * s, C.height * s, C.cornerRadius * s);
    g.lineStyle(1.5, 0x9fb2bf, 0.9).strokeRoundedRect(ox, oy, C.width * s, C.height * s, C.cornerRadius * s);
    g.lineStyle(1, 0x9fb2bf, 0.45).lineBetween(...P(C.width / 2, 0), ...P(C.width / 2, C.height)).strokeCircle(...P(C.width / 2, C.height / 2), C.centerCircleRadius * s);
    for (const n of m.nets) { const [x, y] = P(Math.min(n.backX, n.mouthX), n.y1); g.fillStyle(0xd8392b, 1).fillRect(x, y, CONFIG.net.depth * s, (n.y2 - n.y1) * s); }
    }
    const mine = new Set((this.vps || []).map(v => v.chair).filter(Boolean));
    for (const c of m.chairs) {
      if (c.benched) continue; const [x, y] = P(c.x, c.y), col = TEAMS[m.teams[c.side]].color, hx = Math.cos(c.heading), hy = Math.sin(c.heading);
      if (mine.has(c)) g.fillStyle(0xffffff, 0.16).slice(x, y, 26, c.heading - 0.6, c.heading + 0.6).fillPath();     // where you are looking
      g.fillStyle(col, 1).fillCircle(x, y, 3.6).lineStyle(mine.has(c) ? 2 : 1, mine.has(c) ? 0xffffff : 0x0d151b, 1).strokeCircle(x, y, mine.has(c) ? 5 : 3.6);
      g.lineStyle(2, mine.has(c) ? 0xffffff : col, 1).lineBetween(x, y, x + hx * 7, y + hy * 7);
    }
    if (m.island) { const I = m.island; g.fillStyle(0x3a8f4a, 1).fillRoundedRect(...P(I.a - I.r, I.cy - I.r), (I.b - I.a + 2 * I.r) * s, 2 * I.r * s, I.r * s); }
    if (m.boxes) for (const b of m.boxes) g.fillStyle(0xffd23f, 1).fillRect(...P(b.x - 0.3, b.y - 0.3), 0.6 * s + 1, 0.6 * s + 1);
    if (!m.noBall) { const [bx, by] = P(m.ball.x, m.ball.y); g.fillStyle(0xffffff, 1).fillCircle(bx, by, 2.6).lineStyle(1, 0x0d151b, 1).strokeCircle(bx, by, 2.6); }
  }
});
