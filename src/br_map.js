/* v14.2.3 Volt Royale: named places.
   - Every place to land (POI) has its name floating high in the sky over it, and a banner says where you are when you drive in.
   - The MAP button (top right, or M on the keyboard, or D-pad ▶ on a controller) opens the whole map: every place with its
     name, the storm and the next safe circle, rez garages, your pings, and where you and your squad are right now (live). */
const BRMAP = {
  padState() { const o = {}; for (const p of (navigator.getGamepads ? [...navigator.getGamepads()] : [])) if (p) p.buttons.forEach((b, i) => { if (b && b.pressed) o[i] = true; }); return o; },
  me(sc) { const m = sc.match; let c = (sc.setup.players || []).filter(p => !p.remote && p.chair).map(p => p.chair)[0]; if (!c && sc.online && sc.brMyChair) c = sc.brMyChair(); return c || null; },
  /* the map drawn once into a canvas (ground, biomes, buildings, roofs, walls), cached per map */
  canvas(M, W, H, px) {
    const key = M.name + ':' + px; if (this.cache && this.cache.key === key) return this.cache.cv;
    const s = px / Math.max(W, H), cv = document.createElement('canvas'); cv.width = Math.ceil(W * s); cv.height = Math.ceil(H * s); const c = cv.getContext('2d');
    const hex = n => '#' + (n >>> 0).toString(16).padStart(6, '0');
    c.fillStyle = hex(M.theme.ground); c.fillRect(0, 0, cv.width, cv.height);
    const BC = { snow: '#e8eef2', desert: '#d8b878', volcanic: '#4a3f3a', badlands: '#a07858', urban: '#7a7d80', coast: '#d4c8a0', forest: '#3f6a34', farm: '#9ab35a' };
    for (const d of M.deco) if (d.t === 'biome' && BC[d.kind]) { c.fillStyle = BC[d.kind]; c.fillRect(d.x0 * s, d.y0 * s, (d.x1 - d.x0) * s, (d.y1 - d.y0) * s); }
    c.fillStyle = 'rgba(30,60,25,0.55)'; for (const t of M.trees) { c.beginPath(); c.arc(t.x * s, t.y * s, Math.max(1, 1.8 * s), 0, 7); c.fill(); }
    for (const f of M.floors) { if (f.lv < 1) continue; c.fillStyle = f.lv >= 2 ? 'rgba(200,205,210,0.9)' : 'rgba(150,156,162,0.85)'; c.fillRect(f.x0 * s, f.y0 * s, (f.x1 - f.x0) * s, (f.y1 - f.y0) * s); }
    c.fillStyle = '#2b2f34'; for (const w of M.walls) if (w.lv === 0 && w.kind !== 'door') c.fillRect(w.x0 * s, w.y0 * s, Math.max(1, (w.x1 - w.x0) * s), Math.max(1, (w.y1 - w.y0) * s));
    for (const r of M.ramps) { c.fillStyle = '#c9b37a'; c.fillRect(r.x0 * s, r.y0 * s, (r.x1 - r.x0) * s, (r.y1 - r.y0) * s); }
    this.cache = { key, cv }; return cv;
  },
  poiAt(M, x, y) { return (M.pois || []).find(p => x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1) || null; }
};

class BRMapScene extends Phaser.Scene {
  constructor() { super('BRMap'); }
  init(d) { this.d = d; }
  create() {
    const V = CONFIG.view, sc = this.d.game, m = sc.match, M = MODES.br.map(m), maxW = V.width - 80, maxH = V.height - 120, s = Math.min(maxW / m.width, maxH / m.height);
    this.s = s; this.w = m.width * s; this.h = m.height * s; this.x0 = (V.width - this.w) / 2; this.y0 = 70 + (maxH - this.h) / 2;
    this.add.rectangle(V.width / 2, V.height / 2, V.width, V.height, 0x05070f, 0.86).setInteractive();
    const key = 'brmap-' + M.name; if (!this.textures.exists(key)) this.textures.addCanvas(key, BRMAP.canvas(M, m.width, m.height, 1400));
    this.add.image(this.x0, this.y0, key).setOrigin(0).setDisplaySize(this.w, this.h);
    this.add.rectangle(this.x0 + this.w / 2, this.y0 + this.h / 2, this.w + 6, this.h + 6).setStrokeStyle(3, 0xffd23f, 0.9);
    this.add.text(V.width / 2, 30, M.name.toUpperCase(), { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: THEME.gold_css }).setOrigin(0.5);
    for (const p of M.pois || []) { const t = this.add.text(this.x0 + p.x * s, this.y0 + p.y * s, p.name.toUpperCase(), { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 4, align: 'center' }).setOrigin(0.5); t.setAlpha(0.95); }
    this.g = this.add.graphics(); this.names = [];
    this.info = this.add.text(V.width / 2, V.height - 22, 'You: yellow arrow   Squad: blue   ■ rez garage   ○ next safe circle   Click / tap the map to ping   M, Esc, B or Select to close', { fontFamily: FONT, fontSize: '15px', color: '#9fb2bf' }).setOrigin(0.5);
    const close = tapButton(this, V.width - 80, 30, 130, '✕ CLOSE', () => this.close()); close.t.setFontSize(20);
    this.input.on('pointerdown', p => { const x = (p.x - this.x0) / s, y = (p.y - this.y0) / s; if (x < 0 || y < 0 || x > m.width || y > m.height) return; const me = BRMAP.me(sc); if (me && MODES.br.pingAt) { try { const o = sc.online; if (o && o.role === 'client') { const Lc = o.sim && o.sim.locals[0]; if (Lc) Lc.pending.push(`pngat:${Math.round(x * 10) / 10}:${Math.round(y * 10) / 10}`); } else MODES.br.pingAt(m, me, x, y); Sound.play('ping'); } catch (e) { } } });
    this.padPrev = BRMAP.padState(); this.closing = false; this.kM = this.input.keyboard && this.input.keyboard.addKey('M'); this.kEsc = this.input.keyboard && this.input.keyboard.addKey('ESC'); this.opened = performance.now();
  }
  close() { if (this.closing) return; this.closing = true; Sound.play('back'); const sc = this.d.game; sc.brMapOpen = false; this.scene.stop(); }
  update() {
    const sc = this.d.game, m = sc.match; if (!m || m.kind !== 'br' || !sc.scene.isActive()) return this.close();
    if (performance.now() - this.opened > 250) { if ((this.kM && Phaser.Input.Keyboard.JustDown(this.kM)) || (this.kEsc && Phaser.Input.Keyboard.JustDown(this.kEsc))) return this.close();
      const now = BRMAP.padState(), prev = this.padPrev || {}; this.padPrev = now; if ([1, 8, 9].some(i => now[i] && !prev[i])) return this.close(); }   // a fresh press of B, Select or Start (held from opening doesn't count)
    const g = this.g, s = this.s, X = x => this.x0 + x * s, Y = y => this.y0 + y * s, M = MODES.br.map(m), S = m.gs.st, me = BRMAP.me(sc); g.clear();
    if (S) { g.lineStyle(3, 0x9b4dff, 1).strokeCircle(X(S.x), Y(S.y), S.r * s); if (S.shrink > 0 && S.fx !== undefined) g.lineStyle(2, 0xffffff, 0.95).strokeCircle(X(S.fx), Y(S.fy), S.fr * s); }
    (M.rez || []).forEach((q, i) => g.fillStyle(m.gs.gar && m.gs.gar[i] > m.gs.t ? 0xff4d4d : 0x7dff6a, 1).fillRect(X(q.cx) - 5, Y(q.cy) - 5, 10, 10).lineStyle(1, 0x000000, 1).strokeRect(X(q.cx) - 5, Y(q.cy) - 5, 10, 10));
    for (const p of (m.gs.pings || [])) if (!me || p.team === undefined || p.team === me.gs.team) g.fillStyle(p.kind === 'danger' || p.kind === 'enemy' ? 0xff4d4d : 0xffd23f, 0.9).fillCircle(X(p.x), Y(p.y), 6);
    while (this.names.length) this.names.pop().destroy();
    if (me) for (const o of m.chairs) { if (o.out || o.gs.team !== me.gs.team) continue; const x = X(o.x), y = Y(o.y), a = o.heading, mine = o === me, col = mine ? 0xffd23f : 0x3dd6ff, r = mine ? 9 : 7;
      g.fillStyle(0x000000, 0.6).fillCircle(x, y, r + 3); g.fillStyle(col, 1).fillTriangle(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5, x + Math.cos(a + 2.4) * r, y + Math.sin(a + 2.4) * r, x + Math.cos(a - 2.4) * r, y + Math.sin(a - 2.4) * r);
      if (o.gs.down) g.lineStyle(2, 0xff4d4d, 1).strokeCircle(x, y, r + 5);
      if (!mine) this.names.push(this.add.text(x, y - 16, m.name(o), { fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: '#3dd6ff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1)); }
  }
}

/* the button, the keys, and the banner when you drive into a place */
{ const P = GameScene.prototype, up = P.update;
  P.brMapToggle = function () { if (this.scene.isActive('BRMap')) { const s = this.scene.get('BRMap'); s.close(); return; } if (this.scene.isActive('BRInv') || this.scene.isActive('Pause')) return; this.brMapOpen = true; Sound.play('select'); this.scene.launch('BRMap', { game: this }); this.scene.bringToTop('BRMap'); };
  P.update = function (time, delta) {
    const r = up.call(this, time, delta), m = this.match; if (!m || m.kind !== 'br') return r;
    try {
      const V = CONFIG.view;
      if (!this.brMapBtn) { this.brMapBtn = tapButton(this, Settings.touch ? 70 : V.width - 70, Settings.touch ? 150 : 286, 112, '🗺 MAP', () => this.brMapToggle()); this.brMapBtn.t.setFontSize(18); [this.brMapBtn.bg, this.brMapBtn.t, this.brMapBtn.hit].forEach(o => o.setDepth(60)); this.brMapBtn.bg.setAlpha(0.85);
        this.kMap = this.input.keyboard && this.input.keyboard.addKey('M'); }
      if (this.kMap && Phaser.Input.Keyboard.JustDown(this.kMap) && !this.scene.isActive('BRMap')) this.brMapToggle();
      const back = !!BRMAP.padState()[8]; if (back && !this.brBackHeld && !this.scene.isActive('BRMap') && !this.scene.isActive('Pause') && !(typeof FriendsBar !== 'undefined' && FriendsBar.open)) this.brMapToggle(); this.brBackHeld = back;   // (v14.2.4: Select / View opens the map; friends and party are in the Start menu)
      const me = BRMAP.me(this), M = MODES.br.map(m);
      if (me && M.pois && !me.out && !me.gs.plane) { const p = BRMAP.poiAt(M, me.x, me.y), name = p ? p.name : null;
        if (name !== this.brPoiNow) { this.brPoiNow = name; if (name) { if (!this.brPoiT) this.brPoiT = this.add.text(V.width / 2, 150, '', { fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 6 }).setOrigin(0.5).setDepth(55);
          this.brPoiT.setText(name.toUpperCase()).setAlpha(1).setVisible(true); this.brPoiAt = time; } } }
      if (this.brPoiT && this.brPoiT.visible) { const k = (time - this.brPoiAt) / 1000; this.brPoiT.setAlpha(k < 2 ? 1 : Math.max(0, 1 - (k - 2))); if (k > 3) this.brPoiT.setVisible(false); }
    } catch (e) { /* (never let the map break the game) */ }
    return r;
  };
}
/* the names in the sky */
{ const P = View3D.prototype, bw = P.buildBRWorld, upd = P.updateBR;
  P.buildBRWorld = function (...a) {
    const r = bw.apply(this, a), M = MODES.br.map(this.m); this.brSky = [];
    for (const p of (M && M.pois) || []) {
      const cv = document.createElement('canvas'), c = cv.getContext('2d'), txt = p.name.toUpperCase(); c.font = '900 64px Arial'; const w = Math.ceil(c.measureText(txt).width) + 40; cv.width = w; cv.height = 96;
      c.font = '900 64px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 10; c.strokeStyle = 'rgba(0,0,0,0.75)'; c.strokeText(txt, w / 2, 50); c.fillStyle = '#ffffff'; c.fillText(txt, w / 2, 50);
      const t = new THREE.CanvasTexture(cv), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false, opacity: 0.92 })), hgt = 7; sp.scale.set(hgt * w / 96, hgt, 1); sp.position.set(p.x, 20, p.y); sp.renderOrder = 5;
      this.arena.add(sp); this.brSky.push({ sp, p });
    }
    return r;
  };
  P.updateBR = function (dt) {
    const r = upd.call(this, dt), cam = this.lastCam || (this.cams && [...this.cams.values()][0] && [...this.cams.values()][0].cam);
    if (this.brSky && cam) for (const { sp, p } of this.brSky) { const d = Math.hypot(cam.position.x - p.x, cam.position.z - p.y); sp.visible = d < 215; sp.material.opacity = d < 50 ? Math.max(0, (d - 25) / 25) * 0.92 : 0.92; }   // (fades out right overhead)
    return r;
  };
}

/* v14.2.6: the CPU's route map is built when the match is set up (while the jet loads), not mid-drop when the first CPU lands (that froze the game for a moment) */
{ const B = MODES.br, i0 = B.init; B.init = function (m, ...a) { const r = i0.call(this, m, ...a); try { if (!m.brNav) this.nav(m); } catch (e) { console.error(e); } return r; }; }

/* v14.2.6: game-wide switches set in the admin page (Game tab). brThird: third person (and the broadcast view) allowed in Volt Royale */
const GameCfg = {
  brThird: true,
  async load() { try { if (typeof Account === 'undefined' || !Account.available()) return; const r = await Account.req('GET', '/game'); if (r && r.game) Object.assign(this, { brThird: r.game.brThird !== false }); } catch (e) { /* (offline: keep what we had) */ } }
};
setTimeout(() => GameCfg.load(), 1500);
{ const P = GameScene.prototype, cr = P.create, mo = P.modeOf;
  P.create = function (...a) { GameCfg.load(); return cr.apply(this, a); };   // (checked again at every match: the admin may have changed it)
  P.modeOf = function (p) { const r = mo.call(this, p); return this.match && this.match.kind === 'br' && !GameCfg.brThird && (r === 'third' || r === 'broadcast') ? 'first' : r; };
}
