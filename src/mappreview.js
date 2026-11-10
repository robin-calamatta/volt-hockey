/* v14.1.3: a map preview. In a game's options, when the highlighted row picks the map (Map, Track, Course), a top-down plan of that map
   appears beside the menu: walls and cover, towers and bumpers, jump ramps (yellow arrows), race roads with their open edges (red) and
   jumps, Volt Royale's buildings, ramps and grind rails. "Random" shows all of the choices side by side. It updates as you change the map. */
{ const sw = setWorld; let last = null; setWorld = function (mini) { last = mini; return sw(mini); }; setWorld.current = () => last; }
const MapPreview = {
  isMapRow: s => /^\s*(Map|Track|Course|Arena)\b/i.test(String(s || '')),
  COL: { wall: 0x8e9aa6, crate: 0xb07a45, bags: 0xc9b27a, container: 0x2f6f8f, metal: 0x8e9aa6, akp: 0x2f6fed, akb: 0xff3fd2, ramp: 0xffd23f, gate: 0xff7a1c },
  /* what's in a map: rectangles, circles, arrows and roads, in metres */
  snapshot(kind, override) {
    const saved = Settings.mg && Settings.mg[kind] ? { ...Settings.mg[kind] } : null, prevWorld = setWorld.current();
    try {
      if (override) { Settings.mg = Settings.mg || {}; Settings.mg[kind] = { ...(saved || {}), ...override }; }
      const mini = miniCfg(kind), m = makeMatch({ mini, teamA: Settings.teamA || 0, teamB: Settings.teamB || 1, players: [], difficulty: 'Normal', sizes: miniSizes(4), practice: true }, true);
      for (let i = 0; i < 3; i++) try { m.update(1 / 30); } catch (e) { /* (only to set the game up) */ }
      const S = { W: m.map ? m.map.w : m.width, H: m.map ? m.map.h : m.height, rects: [], circles: [], arrows: [], road: null, dots: [] }, y0 = m.centerY !== undefined && !m.map ? m.centerY - m.height / 2 : 0;
      if (m.map && m.rline) { const L = m.rline; S.road = { pts: L.map(p => [p.x, p.y]), hw: m.hw, open: m.open ? L.map((p, i) => [m.open[0][i], m.open[1][i]]) : null, nrm: L.map(p => [p.nx, p.ny]) };
        for (const o of m.obs || []) if (o.type === 'pad') S.circles.push({ x: o.x, y: o.y, r: 1.2, col: 0x3dd6ff }); else S.circles.push({ x: o.x, y: o.y, r: Math.max(0.6, o.r || 0.8), col: 0xb07a45 });
        for (const o of m.jumps || []) S.arrows.push({ x: o.x, y: o.y, a: o.a, len: 3.2, col: 0xffd23f }); }
      let walls = []; try { walls = MODES[kind] && MODES[kind].walls ? MODES[kind].walls(m) : []; } catch (e) { walls = []; }
      if (!walls.length && typeof Arena !== 'undefined') try { walls = Arena.all(m); } catch (e) { walls = []; }
      for (const w of walls || []) if (w && w.x0 !== undefined) S.rects.push({ x0: w.x0, y0: w.y0 - y0, x1: w.x1, y1: w.y1 - y0, col: this.COL[w.kind] || 0x8e9aa6 });
      for (const o of (m.gs && m.gs.objs) || []) { if (o.x === undefined) continue; const col = this.COL[o.t];
        if (o.t === 'ramp') S.arrows.push({ x: o.x, y: o.y - y0, a: o.a || 0, len: o.len || 2.4, col: 0xffd23f });
        else if (o.r) S.circles.push({ x: o.x, y: o.y - y0, r: o.r, col: col || 0xcfd8de }); else S.dots.push({ x: o.x, y: o.y - y0, col: col || 0xcfd8de }); }
      if (m.gs) for (const [k, v] of Object.entries(m.gs)) if (k !== 'objs' && Array.isArray(v)) for (const o of v) if (o && typeof o === 'object' && typeof o.x === 'number' && typeof o.y === 'number' && !o.t) S.dots.push({ x: o.x, y: o.y - y0, col: 0xff7a1c });
      return S;
    } finally { if (override) { if (saved) Settings.mg[kind] = saved; else delete Settings.mg[kind]; } setWorld(prevWorld || null); }
  },
  brSnapshot(key) { const M = BR_MAPS[key]; if (!M) return null; const S = { W: M.size.width, H: M.size.height, rects: [], circles: [], arrows: [], dots: [], br: M };
    for (const f of M.floors) if (f.lv >= 1) S.rects.push({ ...f, col: 0x9aa1a8, a: 0.6 }); for (const w of M.walls) if (w.lv === 0) S.rects.push({ ...w, col: 0x3a3f45 });
    for (const r of M.ramps) S.arrows.push({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, a: [0, Math.PI / 2, Math.PI, -Math.PI / 2][r.dir], len: Math.max(r.x1 - r.x0, r.y1 - r.y0), col: 0xffd23f });
    for (const t of M.trees) S.circles.push({ x: t.x, y: t.y, r: Math.max(1, t.r), col: 0x2e6b2a }); return S; },
  /* draw a snapshot into a box (x, y, w, h) */
  draw(g, S, x, y, w, h, ground = 0x1b3a2a) {
    const s = Math.min(w / S.W, h / S.H), ox = x + (w - S.W * s) / 2, oy = y + (h - S.H * s) / 2, X = v => ox + v * s, Y = v => oy + v * s;
    g.fillStyle(S.br ? (S.br.theme && S.br.theme.ground) || 0x4f7a3a : ground, 1).fillRoundedRect(ox, oy, S.W * s, S.H * s, S.road || S.br ? 4 : Math.min(18, 3 * s));
    if (!S.road && !S.br) { g.lineStyle(1.5, 0xffffff, 0.35).strokeRoundedRect(ox, oy, S.W * s, S.H * s, Math.min(18, 3 * s)).lineBetween(X(S.W / 2), oy, X(S.W / 2), oy + S.H * s).strokeCircle(X(S.W / 2), Y(S.H / 2), 3 * s); }
    if (S.road) { const P = S.road.pts, n = P.length; g.lineStyle(Math.max(3, S.road.hw * 2 * s), 0x55595e, 1).beginPath(); P.forEach(([px, py], i) => i ? g.lineTo(X(px), Y(py)) : g.moveTo(X(px), Y(py))); g.closePath(); g.strokePath();
      g.lineStyle(1, 0xffffff, 0.5).beginPath(); P.forEach(([px, py], i) => i ? g.lineTo(X(px), Y(py)) : g.moveTo(X(px), Y(py))); g.closePath(); g.strokePath();
      if (S.road.open) for (let i = 0; i < n; i++) for (const sd of [0, 1]) if (S.road.open[i][sd]) { const [nx, ny] = S.road.nrm[i], k = (sd ? 1 : -1) * (S.road.hw + 0.6); g.fillStyle(0xff4a12, 0.9).fillCircle(X(P[i][0] + nx * k), Y(P[i][1] + ny * k), Math.max(1.2, 0.5 * s)); }
      g.fillStyle(0xffffff, 1).fillRect(X(P[0][0]) - 3, Y(P[0][1]) - 3, 6, 6); }
    if (S.br) for (const d of S.br.deco || []) if (d.t === 'rail') { g.lineStyle(2, d.col || 0xd8262e, 0.95).beginPath(); d.pts.forEach((p, i) => i ? g.lineTo(X(d.x + p[0]), Y(d.y + p[1])) : g.moveTo(X(d.x + p[0]), Y(d.y + p[1]))); g.strokePath(); }
    for (const r of S.rects) g.fillStyle(r.col, r.a || 1).fillRect(X(r.x0), Y(r.y0), Math.max(1, (r.x1 - r.x0) * s), Math.max(1, (r.y1 - r.y0) * s));
    for (const c of S.circles) g.fillStyle(c.col, 1).fillCircle(X(c.x), Y(c.y), Math.max(2, c.r * s));
    for (const a of S.arrows) { const L = Math.max(6, a.len * s) / 2, ca = Math.cos(a.a), sa = Math.sin(a.a), cx = X(a.x), cy = Y(a.y); g.lineStyle(3, a.col, 1).lineBetween(cx - ca * L, cy - sa * L, cx + ca * L, cy + sa * L); g.fillStyle(a.col, 1).fillTriangle(cx + ca * (L + 5), cy + sa * (L + 5), cx + ca * (L - 3) - sa * 5, cy + sa * (L - 3) + ca * 5, cx + ca * (L - 3) + sa * 5, cy + sa * (L - 3) - ca * 5); }
    for (const d of S.dots) g.fillStyle(d.col, 1).fillCircle(X(d.x), Y(d.y), 2.5);
  },
  /* the panel on a menu: { g, title, names } kept on the scene */
  show(sc, kind, box) {
    const P = sc.mapPv || (sc.mapPv = { g: sc.add.graphics().setDepth(45), t: sc.add.text(0, 0, '', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffd23f' }).setDepth(46), sub: sc.add.text(0, 0, '', { fontFamily: FONT, fontSize: '15px', color: '#cfd8de', wordWrap: { width: 500 } }).setDepth(46), names: [], key: '' });
    const o = modeOpts(kind), key = JSON.stringify([kind, o, miniOpts().track, box]); P.g.setVisible(true); P.t.setVisible(true); P.sub.setVisible(true);
    if (key === P.key) return; P.key = key; const g = P.g.clear(); P.names.forEach(t => t.destroy()); P.names = [];
    g.fillStyle(0x0b131a, 0.92).fillRoundedRect(box.x, box.y, box.w, box.h, 14).lineStyle(2, 0xffd23f, 0.8).strokeRoundedRect(box.x, box.y, box.w, box.h, 14);
    P.t.setPosition(box.x + 16, box.y + 10).setText('MAP PREVIEW'); const inner = { x: box.x + 14, y: box.y + 44, w: box.w - 28, h: box.h - 84 };
    let label = '', blurb = '';
    try {
      if (kind === 'br') { const keys = o.map === 'random' ? BR_MAP_KEYS.slice(0, 6) : [o.map]; if (keys.length > 1) this.grid(g, P, sc, keys.map(k => [BR_MAPS[k].name, this.brSnapshot(k)]), inner); else { const S = this.brSnapshot(keys[0]); this.draw(g, S, inner.x, inner.y, inner.w, inner.h); label = BR_MAPS[keys[0]].name; blurb = BR_MAPS[keys[0]].blurb; } if (o.map === 'random') label = 'Random: a different map each game'; }
      else if (kind === 'race') { const S = this.snapshot(kind); this.draw(g, S, inner.x, inner.y, inner.w, inner.h, 0x2c4a2a); const R = raceMap(miniOpts().track); label = R.name; blurb = 'Red dots: open edges (no wall).  Yellow arrows: jumps.  Blue: boost pads.'; }
      else if (o.layout === 'random' && GAME_INFO[kind].opts.some(x => x.key === 'layout')) { const op = GAME_INFO[kind].opts.find(x => x.key === 'layout'); this.grid(g, P, sc, [0, 1, 2].map(i => [op.names[i + 1], this.snapshot(kind, { layout: i })]), inner); label = 'Random: one of these each game'; }
      else { const S = this.snapshot(kind); this.draw(g, S, inner.x, inner.y, inner.w, inner.h); const mo = GAME_INFO[kind].opts.find(x => x.key === 'map'), lo = GAME_INFO[kind].opts.find(x => x.key === 'layout');
        label = [mo ? mo.names ? mo.names[mo.values.indexOf(o.map)] : o.map : '', lo ? lo.names[lo.values.indexOf(o.layout)] : ''].filter(Boolean).join('  ·  '); blurb = S.circles.length || S.arrows.length ? 'Blue: towers   Pink: bumpers   Yellow arrows: jumps' : 'Grey: walls   Brown: crates   Tan: sandbags   Orange: moving parts'; }
    } catch (e) { console.warn('map preview', e); label = 'Preview not available'; }
    P.t.setText('MAP PREVIEW' + (label ? ':  ' + label : '')); if (P.t.width > box.w - 30) P.t.setScale((box.w - 30) / P.t.width); else P.t.setScale(1);
    P.sub.setPosition(box.x + 16, box.y + box.h - 34).setText(blurb).setWordWrapWidth(box.w - 32);
  },
  grid(g, P, sc, list, inner) { const n = list.length, cols = n > 3 ? 3 : n, rows = Math.ceil(n / cols), cw = inner.w / cols, ch = inner.h / rows;
    list.forEach(([name, S], i) => { const x = inner.x + (i % cols) * cw, y = inner.y + Math.floor(i / cols) * ch; if (S) this.draw(g, S, x + 6, y + 6, cw - 12, ch - 30); P.names.push(sc.add.text(x + cw / 2, y + ch - 14, name || '', { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setDepth(46)); }); },
  hide(sc) { const P = sc.mapPv; if (!P) return; P.g.setVisible(false); P.t.setVisible(false); P.sub.setVisible(false); P.names.forEach(t => t.destroy()); P.names = []; P.key = ''; }
};
{ const P = MiniSetupScene.prototype, up = P.update, cr = P.create;
  P.create = function (...a) { this.mapPv = null; return cr.apply(this, a); };
  P.update = function (...a) {
    const r = up.apply(this, a); if (!this.sys.isActive()) return r;
    let row = null, box = null;
    if (this.tsMode) { const T = this.tsSet; if (T && T.open && T.items[T.cur]) { row = T.items[T.cur].label(); const G = T.geom || { x: 280, w: 720 }; box = { x: G.x + G.w + 8, y: 150, w: Math.max(240, CONFIG.view.width - (G.x + G.w) - 16), h: 300 }; if (box.x + box.w > CONFIG.view.width) box = { x: 10, y: 470, w: 260, h: 240 }; } }
    else if (this.items && this.items[this.cursor]) { row = this.items[this.cursor].label(); box = { x: 690, y: 110, w: 570, h: 430 }; }
    if (row && this.isMapKind() && MapPreview.isMapRow(row)) MapPreview.show(this, this.kind, box); else MapPreview.hide(this);
    return r;
  };
  P.isMapKind = function () { const I = GAME_INFO[this.kind] || (this.kind === 'br' && Object.getOwnPropertyDescriptor(GAME_INFO, 'br') && GAME_INFO.br); return this.kind === 'race' || this.kind === 'br' || !!(I && (I.opts || []).some(o => ['map', 'layout', 'course'].includes(o.key))); };
}
