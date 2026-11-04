/* Minigames on screen: the menus (Minigames > Balloon Bash / Race / Manhunt > options > players), and the extra drawing a MiniMatch needs in the
   3D view (View3D) and the classic 2D view (GameScene): the race island and finish line, balloons, ? boxes, zap shots, oil slicks and effects,
   plus the minigame scoreboard, the item you are holding and the results. The rules are in minigames.js. */

class MinigamesScene extends ListMenuScene {
  constructor() { super('Minigames'); }
  create() {
    const go = kind => () => this.scene.start('MiniSetup', { kind });
    this.buildMenu('MINIGAMES', [
      ...['balloons', 'race', 'hunt'].map(k => ({ label: () => MINI.names[k], hint: MINI.hints[k], select: go(k) })),
      { label: () => 'Back', select: () => this.scene.start('Main') }
    ]);
    this.onBack = () => this.scene.start('Main');
  }
}

class MiniSetupScene extends ListMenuScene {
  constructor() { super('MiniSetup'); }
  init(data) { this.kind = data.kind || 'balloons'; }
  create() {
    const k = this.kind, o = () => miniOpts(), step = (key, d, lo, hi) => miniSave({ [key]: clamp(o()[key] + d, lo, hi) });
    const items = [];
    if (k === 'balloons') {
      const flip = () => miniSave({ balloonMode: o().balloonMode === 'teams' ? 'ffa' : 'teams' });
      items.push({ label: () => `Mode   ◀ ${o().balloonMode === 'teams' ? 'Teams' : 'Free for all'} ▶`, change: flip, select: flip, hint: 'Free for all: everyone for themselves. Teams: the last team with balloons wins.' });
      items.push({ label: () => `Balloons each   ◀ ${o().balloons} ▶`, change: d => step('balloons', d, 1, 5) });
      items.push({ label: () => `Round length   ◀ ${o().balloonMinutes} min ▶`, change: d => step('balloonMinutes', d, 1, 8), hint: 'When the clock runs out, the most balloons left wins.' });
    }
    if (k === 'race') items.push({ label: () => `Laps   ◀ ${o().laps} ▶`, change: d => step('laps', d, 1, 15) });
    if (k === 'hunt') items.push({ label: () => `Round length   ◀ ${o().huntMinutes} min ▶`, change: d => step('huntMinutes', d, 1, 8), hint: 'Anyone still free when the clock runs out wins.' });
    items.push({ label: () => `Carts   ◀ ${o().carts} ▶`, change: d => step('carts', d, 2, CONFIG.match.chairsPerTeam * 2), hint: 'Carts nobody drives are played by the CPU.' });
    const flipItems = () => miniSave({ items: { ...o().items, [k]: !o().items[k] } });
    items.push({ label: () => `Power-ups   ◀ ${o().items[k] ? 'On' : 'Off'} ▶`, change: flipItems, select: flipItems, hint: '? boxes: BOOST, ZAP (a shot) or OIL (reverses steering). Use with A or X.' });
    items.push({ label: () => `CPU skill   ◀ ${Settings.difficulty} ▶`, change: d => Settings.cycleDifficulty(d) });
    items.push({ label: () => `Colours   ◀ ${TEAMS[Settings.teamA].name} v ${TEAMS[Settings.teamB].name} ▶`, change: d => Settings.cycleTeam('teamA', d), hint: k === 'hunt' ? 'The runners wear the first colours, IT the second.' : k === 'balloons' ? 'The two teams\' colours (in free for all, every cart has its own balloon colour).' : 'Cart colours.' });
    items.push({ label: () => (Party.role === 'leader' && Party.others().length ? 'Play with your party' : 'Play on this screen') + leaderPicks(), hint: 'Pick players on this screen: split screen and controllers; CPUs fill the empty carts.', select: () => this.start() });
    items.push({ label: () => 'Host an online room' + leaderPicks(), hint: 'A room already set to this game: share its code, or make it public. You can switch games from the room.', select: () => this.online() });
    items.push({ label: () => 'Back', select: () => this.scene.start('Minigames') });
    this.buildMenu(MINI.names[k].toUpperCase(), items, 200);
    this.onBack = () => this.scene.start('Minigames');
    this.add.text(CX, 140, MINI.hints[k], { ...STYLE.hint, fontSize: '22px', color: '#9fb2bf', align: 'center', wordWrap: { width: 1000 } }).setOrigin(0.5);
  }
  online() {
    if (memberWaits()) return;
    if (!PeerTransport.available()) { Toasts.show(esc(netErrorText({ type: 'unsupported' })), [], 4000); return; }
    const mini = miniCfg(this.kind), sizes = miniSizes(miniOpts().carts);
    Sound.play('select'); this.scene.start('Room', { role: 'host', preset: { mini, sizes, teamA: Settings.teamA, teamB: Settings.teamB, difficulty: Settings.difficulty, practice: true } });
  }
  start() {
    if (memberWaits()) return;
    const mini = miniCfg(this.kind), sizes = miniSizes(miniOpts().carts);
    if (partyGame(this, { mini, sizes, teamA: Settings.teamA, teamB: Settings.teamB, difficulty: Settings.difficulty, practice: true })) return;
    this.scene.start('Lobby', { practice: true, sizes, mini });
  }
}

/* ===== the 3D view ===== */
Object.assign(View3D.prototype, {
  miniColor(c) { const m = this.m; return m.mini.mode === 'teams' ? TEAMS[m.teams[c.side]].color : MINI.palette[c.k % MINI.palette.length]; },
  buildMini() {
    const m = this.m, g = this.miniG = new THREE.Group(); this.scene.add(g); this.ball.visible = this.halo.visible = false;
    this.miniPool = { box: new Map(), zap: new Map(), oil: new Map() }; this.miniCarts = new Map();
    if (m.kind === 'race') {                                            // the island: a low wall all round, with a red and white kerb on top
      const I = m.island, pts = []; for (let i = 0; i <= 24; i++) { const t = Math.PI / 2 + i / 24 * Math.PI; pts.push([I.a + Math.cos(t) * I.r, I.cy + Math.sin(t) * I.r]); } for (let i = 0; i <= 24; i++) { const t = -Math.PI / 2 + i / 24 * Math.PI; pts.push([I.b + Math.cos(t) * I.r, I.cy + Math.sin(t) * I.r]); }
      const wall = new THREE.Mesh(G3.layFlat(new THREE.ExtrudeGeometry(G3.shape(pts), { depth: 0.32, bevelEnabled: false })), this.mat(0x2b3742, { rough: 0.7 })); wall.castShadow = wall.receiveShadow = true; g.add(wall);
      const kerbs = []; for (let i = 0; i < pts.length - 1; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; kerbs.push([G3.limb([x1, 0.34, y1], [x2, 0.34, y2], 0.06), i % 2]); }
      for (const n of [0, 1]) g.add(new THREE.Mesh(G3.merge(kerbs.filter(k => k[1] === n).map(k => k[0])), this.mat(n ? 0xd8392b : 0xf4f4f2, { rough: 0.5 })));
      const top = new THREE.Mesh(G3.layFlat(new THREE.ShapeGeometry(G3.shape(pts))), this.mat(0x3a8f4a, { rough: 0.9 })); top.position.y = 0.33; g.add(top);   // grass on the island
      const len = m.height - (I.cy + I.r), cv = G3.canvas(64, 256), c = cv.getContext('2d');    // the chequered start / finish line
      for (let y = 0; y < 16; y++) for (let x = 0; x < 4; x++) { c.fillStyle = (x + y) % 2 ? '#111' : '#fff'; c.fillRect(x * 16, y * 16, 16, 16); }
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, len / 2.4);
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.6, len).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); line.position.set(m.width / 2, 0.008, I.cy + I.r + len / 2); g.add(line);
    }
  },
  miniCart(cart) {                                                      // the balloons and effect markers on one cart (made once per cart group)
    let o = this.miniCarts.get(cart.group); if (o) return o;
    const m = this.m, ch = cart.ch, K3 = CONFIG.view3d.cart, grp = new THREE.Group(); cart.group.add(grp);
    const col = this.miniColor(ch), balloons = [], strings = [];
    for (let j = 0; j < 5; j++) {
      const z = (j - 2) * 0.12, x = K3.seatX - 0.44 - (j % 2) * 0.05, y = 1.22 + (j % 3) * 0.07;
      const b = new THREE.Mesh(G3.sphere(0.105, x, y, z, 1, 1.22, 1, 14), new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, metalness: 0.05, emissive: col, emissiveIntensity: 0.15, transparent: true }));
      const s = new THREE.Mesh(G3.limb([K3.seatX - 0.28, K3.backHeight + 0.42, 0], [x, y - 0.15, z], 0.006), this.mat(0xeeeeee)); balloons.push(b); strings.push(s); grp.add(b, s);
    }
    const ring = (col2) => { const r = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.74, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col2, transparent: true, opacity: 0.85, depthWrite: false })); r.position.y = 0.02; r.visible = false; grp.add(r); return r; };
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 10).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff8a1c, transparent: true, opacity: 0.9 })); flame.position.set(-0.85, 0.3, 0); flame.visible = false; grp.add(flame);
    o = { balloons, strings, flame, oil: ring(0xb05cff), stun: ring(0xffe27a), it: ring(0xff3b3b) }; this.miniCarts.set(cart.group, o); return o;
  },
  updateMini(dt) {
    const m = this.m, t = performance.now() / 1000;
    if (this.sidesSeen !== (m.sideChanged || 0)) { this.sidesSeen = m.sideChanged || 0; this.buildCarts(); this.miniCarts = new Map(); }   // someone was caught: their cart takes IT's colours
    for (const cart of this.carts) {
      const ch = cart.ch, o = this.miniCart(cart), blink = ch.safeLeft > 0 && Math.floor(t * 8) % 2 === 0, mine = (this.sc.LP || []).some(p => p.chair === ch);
      for (const b of o.balloons) b.material.opacity = mine ? 0.45 : 1;   // your own balloons: see-through, so they never block your view
      o.balloons.forEach((b, j) => { const on = m.kind === 'balloons' && j < (ch.balloons || 0); b.visible = on && !blink; o.strings[j].visible = on; if (on) b.position.y = Math.sin(t * 2 + j + ch.k) * 0.02; });
      o.flame.visible = ch.boostLeft > 0; if (o.flame.visible) o.flame.scale.setScalar(0.8 + Math.random() * 0.5);
      o.oil.visible = ch.oilLeft > 0; o.stun.visible = ch.stunLeft > 0; o.it.visible = m.kind === 'hunt' && ch.side === 1 && !ch.benched;
      if (o.oil.visible) o.oil.rotation.y = t * 3;
    }
    const sync = (pool, list, make, place) => { const seen = new Set(); for (const it of list) { let mesh = pool.get(it.id); if (!mesh) { mesh = make(); this.miniG.add(mesh); pool.set(it.id, mesh); } place(mesh, it); seen.add(it.id); } for (const [id, mesh] of pool) if (!seen.has(id)) { this.miniG.remove(mesh); pool.delete(id); } };
    const qTex = this.qTex || (this.qTex = (() => { const cv = G3.canvas(64, 64), c = cv.getContext('2d'); c.fillStyle = '#ffd23f'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#7a5a00'; c.lineWidth = 6; c.strokeRect(3, 3, 58, 58); c.fillStyle = '#3a2a00'; c.font = '900 46px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 32, 35); const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding; return tx; })());
    sync(this.miniPool.box, m.boxes, () => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshStandardMaterial({ map: qTex, emissive: 0xffd23f, emissiveIntensity: 0.25, roughness: 0.4 })); b.castShadow = true; return b; },
      (b, it) => { b.position.set(it.x, 0.45 + Math.sin(t * 3 + it.id) * 0.08, it.y); b.rotation.y = t * 1.6 + it.id; b.rotation.x = 0.3; });
    sync(this.miniPool.zap, m.zaps, () => new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshBasicMaterial({ color: 0x7ff6ff })), (z, it) => { z.position.set(it.x, 0.35, it.y); z.scale.setScalar(0.9 + Math.random() * 0.3); });
    sync(this.miniPool.oil, m.slicks, () => { const s = new THREE.Mesh(new THREE.CircleGeometry(MINI.item.oilRadius, 28).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x14081c, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.92 })); s.scale.set(1, 1, 0.75); return s; }, (s, it) => s.position.set(it.x, 0.007, it.y));
  }
});
{ const up = View3D.prototype.update; View3D.prototype.update = function (dt) { up.call(this, dt); if (this.m.mini) { if (!this.miniG) this.buildMini(); this.updateMini(dt); } }; }

/* ===== the game screen ===== */
Object.assign(GameScene.prototype, {
  miniTag(c, vp) {                                                       // the label over a cart in a minigame
    const m = this.match; if (c.player) return c.player.name || c.player.tag;
    if (m.kind === 'hunt' && c.side === 1) return 'IT';
    return '';
  },
  itemLine(p) { const c = p && p.chair; if (!c || c.out) return ''; const it = c.item && MINI.items[c.item]; return it ? `${it.icon} ${it.label}  (A)` : ''; },
  drawMini2D(g) {                                                       // the classic 2D view: same things, flat (drawn in metres)
    const m = this.match, t = this.time.now / 1000;
    if (m.kind === 'race') {
      const I = m.island; g.fillStyle(0x3a8f4a, 1).fillRect(I.a, I.cy - I.r, I.b - I.a, 2 * I.r).fillCircle(I.a, I.cy, I.r).fillCircle(I.b, I.cy, I.r);
      g.lineStyle(0.14, 0xd8392b, 1).strokeCircle(I.a, I.cy, I.r).strokeCircle(I.b, I.cy, I.r).lineBetween(I.a, I.cy - I.r, I.b, I.cy - I.r).lineBetween(I.a, I.cy + I.r, I.b, I.cy + I.r);
      g.fillStyle(0x3a8f4a, 1).fillRect(I.a, I.cy - I.r + 0.08, I.b - I.a, 2 * I.r - 0.16);
      const y0 = I.cy + I.r, n = Math.ceil((m.height - y0) / 0.3); for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) g.fillStyle((i + j) % 2 ? 0x111111 : 0xffffff, 1).fillRect(m.width / 2 - 0.3 + j * 0.3, y0 + i * 0.3, 0.3, 0.3);
    }
    for (const s of m.slicks) g.fillStyle(0x14081c, 0.92).fillEllipse(s.x, s.y, MINI.item.oilRadius * 2, MINI.item.oilRadius * 1.5);
    for (const b of m.boxes) { const s = 0.5 + Math.sin(t * 4 + b.id) * 0.04; g.fillStyle(0xffd23f, 1).fillRect(b.x - s / 2, b.y - s / 2, s, s).lineStyle(0.06, 0x7a5a00, 1).strokeRect(b.x - s / 2, b.y - s / 2, s, s).fillStyle(0x3a2a00, 1).fillCircle(b.x, b.y - 0.05, 0.07).fillRect(b.x - 0.03, b.y + 0.06, 0.06, 0.08); }
    for (const z of m.zaps) g.fillStyle(0x7ff6ff, 0.35).fillCircle(z.x, z.y, 0.32).fillStyle(0xffffff, 1).fillCircle(z.x, z.y, 0.14);
    for (const c of m.chairs) {
      if (c.benched) continue;
      if (c.oilLeft > 0) g.lineStyle(0.1, 0xb05cff, 0.9).strokeCircle(c.x, c.y, 0.7);
      if (c.stunLeft > 0) g.lineStyle(0.1, 0xffe27a, 0.9).strokeCircle(c.x, c.y, 0.75);
      if (m.kind === 'hunt' && c.side === 1) g.lineStyle(0.12, 0xff3b3b, 0.95).strokeCircle(c.x, c.y, 0.66);
      if (c.boostLeft > 0) { const a = c.toWorld(-0.6, -0.18), b = c.toWorld(-0.6, 0.18), tip = c.toWorld(-1.1 - Math.random() * 0.3, 0); g.fillStyle(0xff8a1c, 0.9).fillTriangle(a.x, a.y, b.x, b.y, tip.x, tip.y); }
      if (m.kind === 'balloons' && !(c.safeLeft > 0 && Math.floor(t * 8) % 2 === 0)) for (let j = 0; j < c.balloons; j++) { const p = c.toWorld(-0.72 - (j % 2) * 0.12, (j - (c.balloons - 1) / 2) * 0.24); const a0 = c.toWorld(-0.4, 0); g.lineStyle(0.02, 0xeeeeee, 1).lineBetween(a0.x, a0.y, p.x, p.y); g.fillStyle(this.v3 ? this.v3.miniColor(c) : MINI.palette[c.k % MINI.palette.length], 1).fillCircle(p.x, p.y, 0.15); }
    }
  },
  updateMiniHud(m) {
    const H = m.hud();
    this.clockText.setText(H.clock).setColor('#f2c200');
    this.nameA.setText(H.a).setColor(teamColorHex(m.teams[0])); this.nameB.setText(H.b).setColor(teamColorHex(m.teams[1]));
    this.scoreA.setText(H.sa).setColor('#ffffff'); this.scoreB.setText(H.sb).setColor('#ffffff');
    this.shotsA.setText(H.left).setColor('#e8eef2'); this.shotsB.setText(H.right).setColor('#e8eef2'); this.penA.setText(''); this.penB.setText(''); this.ppText.setText(H.mid).setColor('#9fb2bf');
    if (!this.itemText) this.itemText = this.add.text(CONFIG.view.width / 2, CONFIG.view.height - 92, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffe27a', backgroundColor: '#0d151bb3', padding: { x: 12, y: 4 } }).setOrigin(0.5).setDepth(30);
    const mine = (this.setup.players || []).filter(p => !p.remote && p.chair), one = this.flat || !this.vps || this.vps.length < 2;
    const txt = mine.map(p => { const l = this.itemLine(p); return l ? (mine.length > 1 ? `${p.name || p.tag}: ${l}` : l) : ''; }).filter(Boolean).join('     ');
    this.itemText.setText(one && m.state === 'play' ? txt : '').setVisible(!!txt && one && m.state === 'play');
  },
  showMiniResult() {
    if (this.result) return; const m = this.match, R = m.result || { title: 'GAME OVER', rows: [] }, V = CONFIG.view, cx = V.width / 2, cy = V.height / 2 + 10, o = this.online;
    this.overAt = this.time.now;
    const items = []; const add = x => { items.push(x); return x; }, T = (x, y, str, st) => add(this.add.text(x, y, str, { fontFamily: FONT, ...st }).setOrigin(0.5).setDepth(41));
    add(this.add.rectangle(cx, V.height / 2, V.width, V.height, 0x0d151b, 0.55).setDepth(39));
    const w = 760, h = 500; add(panel(this, cx - w / 2, cy - h / 2, w, h, { depth: 40, alpha: 0.94, radius: 22 }));
    T(cx, cy - h / 2 + 34, MINI.names[m.kind].toUpperCase(), { fontSize: '24px', fontStyle: 'bold', color: THEME.gold_css });
    T(cx, cy - h / 2 + 92, R.title, { fontSize: R.title.length > 22 ? '44px' : '58px', fontStyle: 'bold', color: R.winSide >= 0 ? teamColorHex(m.teams[R.winSide]) : '#ffffff' }).setStroke('#0d151b', 8);
    if (R.sub) T(cx, cy - h / 2 + 138, R.sub, { fontSize: '22px', color: '#9fb2bf' });
    R.rows.slice(0, 8).forEach((r, i) => { const y = cy - h / 2 + 178 + i * 30; T(cx - 250, y, ordinal(r.place), { fontSize: '22px', fontStyle: 'bold', color: i === 0 ? '#f2c200' : '#9fb2bf' }); T(cx - 90, y, r.name, { fontSize: '22px', fontStyle: 'bold', color: teamColorHex(m.teams[r.side]) }); T(cx + 170, y, r.text, { fontSize: '20px', color: '#e8eef2' }); });
    const hint = o ? (o.role === 'host' ? 'A: back to the room' : 'Waiting for the host...') : 'A: play again   B: main menu';
    const hintT = T(cx, cy + h / 2 - 100, hint, { fontSize: '20px', fontStyle: 'bold', color: THEME.dim });
    const btns = o ? (o.role === 'host' ? [['Back to the room', 'a']] : []) : [['Play again', 'a'], ['Main menu', 'b']];
    btns.forEach(([label, b], i) => { const x = cx + (i - (btns.length - 1) / 2) * 280, tb = tapButton(this, x, cy + h / 2 - 44, 250, label, () => { this.resultTap = b; }); for (const o2 of [tb.bg, tb.t, tb.hit]) { o2.setDepth(42); add(o2); } });
    items.forEach(x => { x.setAlpha(0); if (x !== hintT) this.tweens.add({ targets: x, alpha: x.type === 'Rectangle' && x.fillAlpha !== undefined ? 0.55 : 1, duration: 350 }); });
    this.resultHint = hintT; this.result = items; this.events.once('shutdown', () => { this.result = null; this.resultHint = null; this.overAt = undefined; });
  }
});
