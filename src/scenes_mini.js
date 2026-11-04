/* Minigames on screen: the menus (Minigames > Balloon Bash / Race / Manhunt > options > players), and the extra drawing a MiniMatch needs in the
   3D view (View3D) and the classic 2D view (GameScene): the race island and finish line, balloons, ? boxes, zap shots, oil slicks and effects,
   plus the minigame scoreboard, the item you are holding and the results. The rules are in minigames.js. */

/* A live demo of a game in a window on a menu, the goal and rules under it and a caption along the bottom of the "video". */
const DEMO_WIN = { x: 462, y: 64, w: 796, h: 448 };
const HOWTO_WIN = { x: 596, y: 96, w: 664, h: 374 };                    // How to play: the video beside the rules panel (16:9)
const MENU_SIDE = { x: 232, panelWidth: 430, size: 28, noBackdrop: true, noFooter: true, hintX: 232, hintY: 692, hintWidth: 410, hintSize: '17px', hintBg: '#0d151bd0' };
const cartsFor = kind => (kind && MODES[kind] && modeOpts(kind).carts) || miniOpts().carts;   // a game can have its own number of carts (Battle Royale)
function sideTitle(sc, name) {                                          // the page title, clear of the Log in button at the top left
  const t = sc.add.text(124, 40, name.toUpperCase(), { ...STYLE.title, fontSize: '40px' }).setOrigin(0, 0.5);
  if (t.width > 330) t.setScale(330 / t.width); return t;
}
class DemoWindow {
  constructor(sc) {
    this.sc = sc; this.kind = null; this.key = ''; this.capI = 0; this.capAt = 0; this.overFor = 0; const W = DEMO_WIN;
    sc.add.graphics().lineStyle(3, 0x2f4a5c, 1).strokeRoundedRect(W.x - 2, W.y - 2, W.w + 4, W.h + 4, 8);
    this.tag = sc.add.text(W.x + 10, W.y + 8, 'DEMO', { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#ffe27a', backgroundColor: '#0d151bcc', padding: { x: 6, y: 2 } }).setDepth(5);
    this.cap = sc.add.text(W.x + W.w / 2, W.y + W.h - 24, '', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#0d151bdd', padding: { x: 10, y: 5 }, align: 'center', wordWrap: { width: W.w - 60 } }).setOrigin(0.5).setDepth(5);
    this.info = []; this.infoBg = sc.add.graphics().setDepth(-1);
    sc.events.once('shutdown', () => this.stop());
  }
  show(kind) {
    const mini = kind === 'hockey' ? null : miniCfg(kind), key = kind + JSON.stringify(mini);
    if (key === this.key && DemoWindow.owner === this) return; this.key = key; this.kind = kind;
    if (DemoWindow.cam === undefined) DemoWindow.cam = Settings.camMode; Settings.camMode = 'broadcast'; DemoWindow.owner = this;   // one demo at a time; the player's own camera is remembered once
    setWorld(mini); this.setup = { players: [], sizes: mini ? miniSizes(Math.max(4, cartsFor(mini && mini.kind))) : [3, 3], practice: !!mini, mini, demo: true, win: DEMO_WIN };
    const d = this.sc.scene.get('Demo'); if (d && d.sys.isActive()) d.scene.restart(this.setup); else this.sc.scene.launch('Demo', this.setup);
    this.sc.scene.bringToTop(); this.capI = 0; this.capAt = 0; this.writeInfo();
  }
  writeInfo() {                                                          // the goal and the rules, under the video (smaller text until it fits)
    const I = GAME_INFO[this.kind], W = DEMO_WIN, top = W.y + W.h + 12, room = CONFIG.view.height - top - 6; this.info.forEach(t => t.destroy()); this.info = []; this.rules = [];
    for (let size = 18; size >= 12; size--) {
      this.info.forEach(t => t.destroy()); this.info = []; this.rules = [];
      const g = this.sc.add.text(W.x, top, 'GOAL:  ' + I.goal, { fontFamily: FONT, fontSize: (size + 1) + 'px', fontStyle: 'bold', color: THEME.gold_css, wordWrap: { width: W.w } }); this.info.push(g);
      const half = Math.ceil(I.rules.length / 2), colW = W.w / 2 - 12; let bottom = 0;
      [I.rules.slice(0, half), I.rules.slice(half)].forEach((col, ci) => { let y = top + g.height + 6; col.forEach(r => { const t = this.sc.add.text(W.x + ci * (colW + 24), y, '•  ' + r, { fontFamily: FONT, fontSize: size + 'px', color: '#e8eef2', wordWrap: { width: colW } }); this.info.push(t); this.rules.push(t); y += t.height + 3; }); bottom = Math.max(bottom, y); });
      if (bottom - top <= room) { this.fitBottom = bottom; break; }
      this.fitBottom = bottom;
    }
    this.infoBg.clear().fillStyle(0x0d151b, 0.82).fillRoundedRect(W.x - 10, top - 6, W.w + 20, Math.min(CONFIG.view.height - 2, this.fitBottom + 6) - (top - 6), 8);
    this.infoBg.lineStyle(2, 0x2f4a5c, 1).strokeRoundedRect(W.x - 10, top - 6, W.w + 20, Math.min(CONFIG.view.height - 2, this.fitBottom + 6) - (top - 6), 8);
  }
  update(time, delta) {
    if (!this.kind) return; const I = GAME_INFO[this.kind], lines = [I.goal, ...I.rules];
    if (time - this.capAt > 4200) { this.capAt = time; this.capI = (this.capI + 1) % lines.length; this.cap.setText(lines[this.capI]); this.rules.forEach((t, i) => t.setColor(i === this.capI - 1 ? '#ffe27a' : '#e8eef2')); }
    const d = this.sc.scene.get('Demo');
    if (d && d.match && d.match.state === 'over') { this.overFor += delta; if (this.overFor > 3500) { this.overFor = 0; d.scene.restart(this.setup); } } else this.overFor = 0;
    if (this.kind !== 'hockey' && (this.chk = (this.chk || 0) + delta) > 800) { this.chk = 0; this.show(this.kind); }   // an option changed (the track, the mode...): the demo follows
  }
  stop() {
    const mine = DemoWindow.owner === this; this.kind = null; this.key = ''; if (!mine) return;      // another menu's demo has taken over: leave it alone
    DemoWindow.owner = null; try { this.sc.scene.stop('Demo'); } catch (e) {} setWorld(null);
    if (DemoWindow.cam !== undefined) { Settings.camMode = DemoWindow.cam; DemoWindow.cam = undefined; }
  }
}

class MinigamesScene extends ListMenuScene {                          // the categories
  constructor() { super('Minigames'); }
  create() {
    this.buildMenu('MINIGAMES', [
      ...GAME_CATS.map(c => ({ label: () => `${c.name}   (${MINI_KINDS().filter(k => GAME_INFO[k].cat === c.id).length})`, hint: c.blurb, select: () => this.scene.start('MiniList', { cat: c.id }) })),
      { label: () => 'How to play Volt Hockey', hint: 'The rules and controls of hockey, with a demo', select: () => this.scene.start('HowTo', { kind: 'hockey', back: { scene: 'Minigames' } }) },
      { label: () => 'Back', select: () => this.scene.start('Main') }
    ]);
    this.onBack = () => this.scene.start('Main');
  }
}
class MiniListScene extends ListMenuScene {                            // the games in one category
  constructor() { super('MiniList'); }
  init(data) { this.cat = (data && data.cat) || 'party'; }
  create() {
    const C = GAME_CATS.find(c => c.id === this.cat) || GAME_CATS[0];
    sideTitle(this, C.name);
    this.buildMenu('', [
      ...MINI_KINDS().filter(k => GAME_INFO[k].cat === C.id).map(k => ({ kind: k, label: () => GAME_INFO[k].name, hint: GAME_INFO[k].blurb, select: () => this.scene.start('MiniSetup', { kind: k }) })),
      { label: () => 'Back', select: () => this.scene.start('Minigames') }
    ], 120, MENU_SIDE);
    this.onBack = () => this.scene.start('Minigames');
    this.demo = new DemoWindow(this); this.shownAt = 0; this.want = null;
  }
  update(time, delta) {
    super.update(); const k = this.items && this.items[this.cursor] && this.items[this.cursor].kind;
    if (k && k !== this.want) { this.want = k; this.wantAt = time; }
    if (this.want && this.want !== this.demo.kind && time - this.wantAt > 450) this.demo.show(this.want);   // (a moment after the highlight settles)
    this.demo.update(time, delta);
  }
}

class MiniSetupScene extends ListMenuScene {
  constructor() { super('MiniSetup'); }
  init(data) { this.kind = data.kind || 'balloons'; }
  update(time, delta) { super.update(); if (this.demo) this.demo.update(time, delta); }
  create() {
    const k = this.kind, o = () => miniOpts(), step = (key, d, lo, hi) => miniSave({ [key]: clamp(o()[key] + d, lo, hi) });
    const items = [];
    if (k === 'balloons') {
      const flip = () => miniSave({ balloonMode: o().balloonMode === 'teams' ? 'ffa' : 'teams' });
      items.push({ label: () => `Mode   ◀ ${o().balloonMode === 'teams' ? 'Teams' : 'Free for all'} ▶`, change: flip, select: flip, hint: 'Free for all: everyone for themselves. Teams: the last team with balloons wins.' });
      items.push({ label: () => `Balloons each   ◀ ${o().balloons} ▶`, change: d => step('balloons', d, 1, 5) });
      items.push({ label: () => `Round length   ◀ ${o().balloonMinutes} min ▶`, change: d => step('balloonMinutes', d, 1, 8), hint: 'When the clock runs out, the most balloons left wins.' });
    }
    if (k === 'race') {
      const pick = d => { const i = Math.max(0, RACE_MAPS.findIndex(x => x.id === o().track)), mp = RACE_MAPS[(i + d + RACE_MAPS.length) % RACE_MAPS.length]; miniSave({ track: mp.id, laps: mp.laps }); };
      items.push({ label: () => `Track   ◀ ${raceMap(o().track).name} ▶`, change: pick, select: () => pick(1), hint: () => raceMap(o().track).blurb });
      items.push({ label: () => `Laps   ◀ ${o().laps} ▶`, change: d => step('laps', d, 1, 15) });
    }
    if (k === 'hunt') items.push({ label: () => `Round length   ◀ ${o().huntMinutes} min ▶`, change: d => step('huntMinutes', d, 1, 8), hint: 'Anyone still free when the clock runs out wins.' });
    if (MODES[k]) for (const op of GAME_INFO[k].opts || []) {
      const val = () => modeOpts(k)[op.key], show = v => op.names ? op.names[op.values.indexOf(v)] : op.fmt ? op.fmt(v) : String(v);
      const chg = d => { if (op.values) { const i = op.values.indexOf(val()); modeSave(k, { [op.key]: op.values[(i + d + op.values.length) % op.values.length] }); } else modeSave(k, { [op.key]: clamp(+(val() + d * (op.step || 1)).toFixed(2), op.min, op.max) }); };
      items.push({ label: () => `${op.label}   ◀ ${show(val())} ▶`, change: chg, select: op.values ? () => chg(1) : undefined, hint: op.hint });
    }
    const IK = GAME_INFO[k] || {};
    if (!IK.noCarts) items.push({ label: () => `Carts   ◀ ${o().carts} ▶`, change: d => step('carts', d, 2, CONFIG.match.chairsPerTeam * 2), hint: 'Carts nobody drives are played by the CPU.' });
    const itemsOn = () => miniCfg(k).items, flipItems = () => miniSave({ items: { ...o().items, [k]: !itemsOn() } });
    if (!IK.noItems) items.push({ label: () => `Power-ups   ◀ ${itemsOn() ? 'On' : 'Off'} ▶`, change: flipItems, select: flipItems, hint: () => '? boxes: ' + ((MODES[k] && MODES[k].items) || ['boost', 'zap', 'oil']).map(i => MINI.items[i].label).join(', ') + '. Use with A or X.' });
    const flipCpu = () => miniSave({ nocpu: { ...(o().nocpu || {}), [k]: !(o().nocpu || {})[k] } });
    items.push({ label: () => `CPU carts   ◀ ${(o().nocpu || {})[k] ? 'Off (players only)' : 'On'} ▶`, change: flipCpu, select: flipCpu, hint: 'Off: no computer players, just the people who join (on this screen or online).' });
    items.push({ label: () => `CPU skill   ◀ ${Settings.difficulty} ▶`, change: d => Settings.cycleDifficulty(d) });
    items.push({ label: () => `Colours   ◀ ${TEAMS[Settings.teamA].name} v ${TEAMS[Settings.teamB].name} ▶`, change: d => Settings.cycleTeam('teamA', d), hint: k === 'hunt' ? 'The runners wear the first colours, IT the second.' : k === 'balloons' ? 'The two teams\' colours (in free for all, every cart has its own balloon colour).' : 'Cart colours.' });
    items.push({ label: () => 'How to play (full screen, controls)', hint: 'The goal, the rules and every control, over a bigger demo', select: () => this.scene.start('HowTo', { kind: k, back: { scene: 'MiniSetup', data: { kind: k } } }) });
    items.push({ label: () => (Party.role === 'leader' && Party.others().length ? 'Play with your party' : 'Play on this screen') + leaderPicks(), hint: 'Pick players on this screen: split screen and controllers; CPUs fill the empty carts.', select: () => this.start() });
    items.push({ label: () => 'Host an online room' + leaderPicks(), hint: 'A room already set to this game: share its code, or make it public. You can switch games from the room.', select: () => this.online() });
    const up = () => this.scene.start('MiniList', { cat: IK.cat || 'party' });
    items.push({ label: () => 'Back', select: up });
    sideTitle(this, IK.name || MINI.names[k]);
    this.buildMenu('', items, 110, MENU_SIDE);
    this.onBack = up;
    this.demo = new DemoWindow(this); this.demo.show(k);
    if (false) this.add.text(CX, 140, IK.blurb || MINI.hints[k], { ...STYLE.hint, fontSize: '22px', color: '#9fb2bf', align: 'center', wordWrap: { width: 1000 } }).setOrigin(0.5);
  }
  online() {
    if (memberWaits()) return;
    if (!PeerTransport.available()) { Toasts.show(esc(netErrorText({ type: 'unsupported' })), [], 4000); return; }
    const mini = miniCfg(this.kind), sizes = miniSizes(cartsFor(this.kind));
    Sound.play('select'); this.scene.start('Room', { role: 'host', preset: { mini, sizes, teamA: Settings.teamA, teamB: Settings.teamB, difficulty: Settings.difficulty, practice: true } });
  }
  start() {
    if (memberWaits()) return;
    const mini = miniCfg(this.kind), sizes = miniSizes(cartsFor(this.kind));
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
    if (m.kind === 'race' && m.island) {                                // (the rink oval) the island: a low wall all round, with a red and white kerb on top
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
    if (m.kind === 'race' && m.island) {
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
    if (!this.itemText || !this.itemText.scene) this.itemText = this.add.text(CONFIG.view.width / 2, CONFIG.view.height - 92, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffe27a', backgroundColor: '#0d151bb3', padding: { x: 12, y: 4 } }).setOrigin(0.5).setDepth(30);
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

/* ===== race maps: the venue (3D), the floor (2D), the broadcast camera and the mini-map ===== */
Object.assign(View3D.prototype, {
  buildVenue() {
    const m = this.m, map = m.map, T = RACE_THEMES[map.theme] || RACE_THEMES.grass, L = m.rline, N = L.length, hw = m.hw, W = map.w, H = map.h;
    if (this.arena) this.scene.remove(this.arena);
    const g = this.arena = new THREE.Group(), glow = !!T.glow;
    this.scene.background = T.glow ? new THREE.Color(T.sky) : LookWorld.sky(T.sky); this.scene.fog = new THREE.Fog(T.glow ? T.sky : LookWorld.haze(T.sky), 45, Math.max(W, H) > 150 ? 190 : 130);
    const gk = { grass: 'grass', sand: 'sand', canyon: 'dirt', forest: 'jungle' }[map.theme], gt = gk ? Look.tex(gk).clone() : null; if (gt) { gt.needsUpdate = true; gt.repeat.set((W + 160) / 7, (H + 160) / 7); }
    const ground = new THREE.Mesh(G3.layFlat(new THREE.PlaneGeometry(W + 160, H + 160)), new THREE.MeshStandardMaterial(gt ? { map: gt, roughness: 0.95 } : { color: T.ground, roughness: map.theme === 'ice' ? 0.35 : 0.95 }));
    ground.position.set(W / 2, -0.01, H / 2); ground.receiveShadow = true; g.add(ground);
    const strip = (offA, offB, y, color, opts = {}, test) => {             // a flat band along the track between two offsets from the centre line
      const pos = [], idx = []; let n = 0;
      L.forEach((p, i) => { pos.push(p.x + p.nx * offA, y, p.y + p.ny * offA, p.x + p.nx * offB, y, p.y + p.ny * offB); });
      for (let i = 0; i < N; i++) { const j = (i + 1) % N; if (test && !test(i, j)) continue; idx.push(i * 2, j * 2, i * 2 + 1, j * 2, j * 2 + 1, i * 2 + 1); n++; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, glow && opts.emissive ? new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }) : new THREE.MeshStandardMaterial({ color, roughness: opts.rough || 0.85, side: THREE.DoubleSide })); mesh.receiveShadow = true; g.add(mesh); return mesh;
    };
    strip(-hw - 0.2, hw + 0.2, 0.012, T.track, { rough: map.theme === 'ice' ? 0.12 : 0.85 });
    const on = sd => (i, j) => m.walls[sd][i].on && m.walls[sd][j].on;
    strip(-hw + 0.05, -hw + 0.25, 0.016, T.line, { emissive: true }, on(0)); strip(hw - 0.25, hw - 0.05, 0.016, T.line, { emissive: true }, on(1));
    [0, 1].forEach(sd => {                                              // the walls: red and white (or the theme's colours), left out at a crossing
      const pos = [], col = [], idx = [], W2 = m.walls[sd], cA = new THREE.Color(T.wallA), cB = new THREE.Color(T.wallB);
      W2.forEach((w, i) => { const c = Math.floor(i / 4) % 2 ? cA : cB; pos.push(w.x, 0, w.y, w.x, 0.45, w.y); col.push(c.r, c.g, c.b, c.r, c.g, c.b); });
      for (let i = 0; i < N; i++) { const j = (i + 1) % N; if (!W2[i].on || !W2[j].on) continue; idx.push(i * 2, j * 2, i * 2 + 1, j * 2, j * 2 + 1, i * 2 + 1); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, glow ? new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide })); mesh.castShadow = true; g.add(mesh);
    });
    { const p = L[0], cv = G3.canvas(256, 32), c = cv.getContext('2d'); for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { c.fillStyle = (x + y) % 2 ? '#111' : '#fff'; c.fillRect(x * 16, y * 16, 16, 16); }   // the start / finish line
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; const line = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2 + 0.4, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
      line.position.set(p.x, 0.02, p.y); line.rotation.y = -p.a + Math.PI / 2; g.add(line);
      for (const sd of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 10), this.mat(0xdddddd, { rough: 0.4, metal: 0.4 })); post.position.set(p.x + p.nx * sd * (hw + 0.5), 2, p.y + p.ny * sd * (hw + 0.5)); post.castShadow = true; g.add(post); }
      const banner = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, hw * 2 + 1), this.mat(0x111111, { rough: 0.5 })); banner.position.set(p.x, 3.6, p.y); banner.rotation.y = -p.a; g.add(banner);
      const cv2 = G3.canvas(512, 64), c2 = cv2.getContext('2d'); c2.fillStyle = '#111'; c2.fillRect(0, 0, 512, 64); c2.fillStyle = '#f2c200'; c2.font = '900 44px Arial'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText(map.name.toUpperCase(), 256, 34);
      const t2 = new THREE.CanvasTexture(cv2); t2.encoding = THREE.sRGBEncoding; for (const sd of [-1, 1]) { const face = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2 + 1, 0.75), new THREE.MeshBasicMaterial({ map: t2 })); face.position.set(p.x - p.tx * sd * 0.11, 3.6, p.y - p.ty * sd * 0.11); face.rotation.y = -p.a + (sd > 0 ? -Math.PI / 2 : Math.PI / 2); g.add(face); } }
    // obstacles
    this.obsMeshes = new Map();
    for (const o of m.obs) {
      let mesh;
      if (o.type === 'rock') { mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(o.r * 1.05, 0), this.mat(map.theme === 'sand' ? 0x9a6b45 : 0x7d8287, { rough: 0.95 })); mesh.position.set(o.x, o.r * 0.55, o.y); mesh.rotation.set(o.k, o.k * 2, 0); mesh.scale.set(1, 0.8, 1); }
      else if (o.type === 'pillar') { mesh = new THREE.Mesh(new THREE.CylinderGeometry(o.r, o.r, 1.6, 16), this.mat(0xd8392b, { rough: 0.5 })); mesh.position.set(o.x, 0.8, o.y); }
      else if (o.type === 'cone') { mesh = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(o.r, 0.8, 14), this.mat(0xff7a1c, { rough: 0.5 })); c.position.y = 0.4; const band = new THREE.Mesh(new THREE.CylinderGeometry(o.r * 0.55, o.r * 0.7, 0.14, 14), this.mat(0xffffff)); band.position.y = 0.42; mesh.add(c, band); mesh.position.set(o.x, 0, o.y); }
      else if (o.type === 'tyres') { mesh = new THREE.Group(); for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(o.r * 0.7, o.r * 0.3, 8, 18).rotateX(Math.PI / 2), this.mat(0x1b1d20, { rough: 0.9 })); t.position.y = 0.2 + k * 0.36; mesh.add(t); } mesh.position.set(o.x, 0, o.y); }
      else if (o.type === 'snowman') { mesh = new THREE.Group(); [[0.65, 0.6], [0.45, 1.5], [0.3, 2.15]].forEach(([r, y]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), this.mat(0xffffff, { rough: 0.8 })); s.position.y = y; mesh.add(s); }); const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 8).rotateZ(-Math.PI / 2), this.mat(0xff7a1c)); nose.position.set(0.3, 2.15, 0); mesh.add(nose); mesh.position.set(o.x, 0, o.y); }
      else if (o.type === 'bumper') { mesh = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(o.r, o.r * 1.1, 0.7, 24), this.mat(0xff3fd2, { rough: 0.3, emissive: 0.4 })); body.position.y = 0.35; const top = new THREE.Mesh(new THREE.CylinderGeometry(o.r * 0.7, o.r * 0.7, 0.1, 24), new THREE.MeshBasicMaterial({ color: 0xffffff })); top.position.y = 0.75; mesh.add(body, top); mesh.position.set(o.x, 0, o.y); mesh.userData.top = top; }
      else if (o.type === 'pad') { const cv = G3.canvas(64, 128), c = cv.getContext('2d'); c.fillStyle = '#0d1a2a'; c.fillRect(0, 0, 64, 128); c.fillStyle = '#3ff6ff'; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(8, 100 - k * 36); c.lineTo(32, 76 - k * 36); c.lineTo(56, 100 - k * 36); c.lineTo(56, 88 - k * 36); c.lineTo(32, 64 - k * 36); c.lineTo(8, 88 - k * 36); c.fill(); }
        const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92 })); mesh.position.set(o.x, 0.02, o.y); mesh.rotation.y = -o.a - Math.PI / 2; }
      else if (o.type === 'slider') { const cv = G3.canvas(64, 64), c = cv.getContext('2d'); c.fillStyle = '#f2c200'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#111'; for (let k = -2; k < 4; k++) { c.beginPath(); c.moveTo(k * 22, 64); c.lineTo(k * 22 + 11, 64); c.lineTo(k * 22 + 75, 0); c.lineTo(k * 22 + 64, 0); c.fill(); } const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.6), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })); mesh.position.y = 0.45; }
      else if (o.type === 'sweeper') { mesh = new THREE.Group(); const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.2, 12), this.mat(0x333a40, { rough: 0.5, metal: 0.4 })); post.position.y = 0.6; const bar = new THREE.Mesh(new THREE.BoxGeometry(o.len * 2, 0.35, 0.3), this.mat(glow ? 0x3ff6ff : 0xd8392b, { rough: 0.4, emissive: glow ? 0.6 : 0 })); bar.position.y = 0.55; bar.castShadow = true; mesh.add(post, bar); mesh.position.set(o.x, 0, o.y); mesh.userData.bar = bar; }
      if (!mesh) continue; mesh.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } }); g.add(mesh); this.obsMeshes.set(o.k, mesh);
    }
    // scenery off the track: trees, rocks, pines or glowing posts (the same every time)
    let s = map.w * 31 + map.h; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, spots = [], want = Math.min(map.forest ? 420 : 220, Math.round((W + 60) * (H + 60) / (map.forest ? 70 : 140)));
    const clear = (x, y) => { for (let i = 0; i < N; i += 3) if (Math.hypot(L[i].x - x, L[i].y - y) < hw + 3.2) return false; return true; };
    for (let t = 0; t < want * 4 && spots.length < want; t++) { const x = -25 + rnd() * (W + 50), y = -25 + rnd() * (H + 50); if (clear(x, y)) spots.push([x, y, 0.7 + rnd() * 0.7, rnd() * 6]); }
    const inst = (geo, mat, f) => { const im = new THREE.InstancedMesh(geo, mat, spots.length), M = new THREE.Matrix4(), q = new THREE.Quaternion(); spots.forEach((p, i) => { const [y, sx, sy] = f(p); M.compose(new THREE.Vector3(p[0], y, p[1]), q.setFromAxisAngle(V3UP, p[3]), new THREE.Vector3(sx, sy, sx)); im.setMatrixAt(i, M); }); im.castShadow = true; g.add(im); };
    if (T.decor === 'tree' || T.decor === 'pine') { inst(new THREE.CylinderGeometry(0.18, 0.25, 1.6, 7), this.mat(0x6b4a2b), p => [0.8 * p[2], p[2], p[2]]); inst(T.decor === 'pine' ? new THREE.ConeGeometry(1.2, 3.2, 8) : new THREE.IcosahedronGeometry(1.5, 0), this.mat(T.decor === 'pine' ? 0x2f5d45 : 0x3f7a35, { rough: 0.9 }), p => [(T.decor === 'pine' ? 2.9 : 2.6) * p[2], p[2], p[2]]); }
    else if (T.decor === 'rock') inst(new THREE.DodecahedronGeometry(1.1, 0), this.mat(0xa0704a, { rough: 0.95 }), p => [0.5 * p[2], p[2] * 1.3, p[2] * 0.8]);
    else if (T.decor === 'post') inst(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), new THREE.MeshBasicMaterial({ color: 0xff3fd2 }), p => [1.5 * p[2], 1, p[2]]);
    this.scene.add(g);
  },
  updateVenue() {
    const m = this.m, f = m.ball;
    this.sun.position.set(f.x - 7, 22, f.y - 9); this.sun.target.position.set(f.x, 0, f.y); this.sun.target.updateMatrixWorld();   // the shadows follow the action round a big map
    for (const o of m.obs) {
      const mesh = this.obsMeshes.get(o.k); if (!mesh) continue;
      if (o.type === 'slider') { const p = m.obstacleAt(o); mesh.position.set(p.x, 0.45, p.y); mesh.rotation.y = -o.a; }
      else if (o.type === 'sweeper') mesh.rotation.y = -m.sweepAngle(o);
      else if (o.type === 'bumper' && mesh.userData.top) mesh.userData.top.material.color.setHex(o.hitAt !== undefined && m.simTime - o.hitAt < 0.25 ? 0xffe27a : 0xffffff);
      else if (o.type === 'pad') mesh.material.opacity = 0.7 + 0.25 * Math.sin(performance.now() / 150);
    }
  }
});
{ const P = View3D.prototype, arena = P.buildArena, cam = P.placeCamera, upd = P.updateMini;
  P.buildArena = function () { if (this.m && this.m.map) return this.buildVenue(); return arena.call(this); };
  P.updateMini = function (dt) { upd.call(this, dt); if (this.m.map) this.updateVenue(); };
  P.placeCamera = function (vp, dt) {
    const c = cam.call(this, vp, dt); if (!this.m.map || vp.mode !== 'broadcast') return c;
    const st = this.camFor(vp.key), f = vp.chair || this.m.ball, k = 1 - Math.exp(-3 * dt);   // a big map: a high camera chasing the action instead of a TV camera beside the court
    st.mx = st.mx === undefined ? f.x : st.mx + (f.x - st.mx) * k; st.my = st.my === undefined ? f.y : st.my + (f.y - st.my) * k;
    c.position.set(st.mx, 15, st.my + 12); c.lookAt(st.mx, 0, st.my - 1); c.fov = 50; c.updateProjectionMatrix(); c.updateMatrixWorld(); return c;
  };
}
Object.assign(GameScene.prototype, {
  drawMapFloor(back, wood, g) {                                         // the classic 2D view of a race map, drawn once
    const m = this.match, map = m.map, T = RACE_THEMES[map.theme] || RACE_THEMES.grass, L = m.rline, N = L.length, hw = m.hw;
    back.fillStyle(T.ground, 1).fillRect(-30, -30, map.w + 60, map.h + 60);
    for (let i = 0; i < N; i++) { const a = L[i], b = L[(i + 1) % N]; wood.fillStyle(T.track, 1).fillPoints([{ x: a.x - a.nx * hw, y: a.y - a.ny * hw }, { x: b.x - b.nx * hw, y: b.y - b.ny * hw }, { x: b.x + b.nx * hw, y: b.y + b.ny * hw }, { x: a.x + a.nx * hw, y: a.y + a.ny * hw }], true); }
    [0, 1].forEach(sd => { const W2 = m.walls[sd]; for (let i = 0; i < N; i++) { const j = (i + 1) % N; if (W2[i].on && W2[j].on) g.lineStyle(0.3, Math.floor(i / 4) % 2 ? T.wallA : T.wallB, 1).lineBetween(W2[i].x, W2[i].y, W2[j].x, W2[j].y); } });
    const p = L[0]; for (let k = -6; k < 6; k++) for (let r = 0; r < 2; r++) { const o = (k + 0.5) / 6 * hw, x = p.x + p.nx * o + p.tx * (r - 0.5) * 0.5, y = p.y + p.ny * o + p.ty * (r - 0.5) * 0.5; g.fillStyle((k + r) % 2 ? 0x111111 : 0xffffff, 1).fillCircle(x, y, 0.28); }
    for (const o of m.obs) {
      if (o.type === 'pad') g.fillStyle(0x3ff6ff, 0.8).fillTriangle(o.x + o.nx * 0.6 - Math.cos(o.a) * 0.5, o.y + o.ny * 0.6 - Math.sin(o.a) * 0.5, o.x - o.nx * 0.6 - Math.cos(o.a) * 0.5, o.y - o.ny * 0.6 - Math.sin(o.a) * 0.5, o.x + Math.cos(o.a) * 0.9, o.y + Math.sin(o.a) * 0.9);
      else if (o.type !== 'slider' && o.type !== 'sweeper') g.fillStyle({ rock: 0x8a8f94, pillar: 0xd8392b, cone: 0xff7a1c, tyres: 0x1b1d20, snowman: 0xffffff, bumper: 0xff3fd2 }[o.type] || 0x888888, 1).fillCircle(o.x, o.y, o.r).lineStyle(0.08, 0x0d151b, 0.6).strokeCircle(o.x, o.y, o.r);
    }
  }
});
{ const P = GameScene.prototype, floor = P.drawFloor, mini2d = P.drawMini2D;
  P.drawFloor = function (back, wood, g) { if (this.match && this.match.map) return this.drawMapFloor(back, wood, g); return floor.call(this, back, wood, g); };
  P.drawMini2D = function (g) {
    mini2d.call(this, g); const m = this.match; if (!m.map) return;
    for (const o of m.obs) {                                            // the moving obstacles, every frame
      if (o.type === 'slider') { const p = m.obstacleAt(o); g.fillStyle(0xf2c200, 1).fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6).lineStyle(0.1, 0x111111, 1).strokeRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6); }
      else if (o.type === 'sweeper') { const th = m.sweepAngle(o), ux = Math.cos(th) * o.len, uy = Math.sin(th) * o.len; g.lineStyle(0.36, 0xd8392b, 1).lineBetween(o.x - ux, o.y - uy, o.x + ux, o.y + uy).fillStyle(0x333a40, 1).fillCircle(o.x, o.y, 0.3); }
      else if (o.type === 'bumper' && o.hitAt !== undefined && m.simTime - o.hitAt < 0.25) g.fillStyle(0xffe27a, 1).fillCircle(o.x, o.y, o.r * 0.7);
    }
  };
}

/* ===== How to play: the goal, the rules and the controls, over a live CPU demo of the game (a "video" that never goes out of date) ===== */
class DemoScene extends GameScene {
  constructor() { super('Demo'); }
  init(data) { super.init({ ...data, demo: true }); }
}
class HowToScene extends Phaser.Scene {
  constructor() { super('HowTo'); }
  init(data) { this.kind = data.kind || 'hockey'; this.back = data.back || { scene: 'Minigames' }; }
  create() {
    const I = GAME_INFO[this.kind], V = CONFIG.view, mini = this.kind === 'hockey' ? null : miniCfg(this.kind);
    if (DemoWindow.cam === undefined) DemoWindow.cam = Settings.camMode; Settings.camMode = 'broadcast'; DemoWindow.owner = this;                     // the demo is filmed from the TV camera (not saved)
    setWorld(mini);
    this.setup = { players: [], sizes: mini ? miniSizes(Math.max(4, cartsFor(mini && mini.kind))) : [3, 3], practice: !!mini, mini, demo: true, win: HOWTO_WIN };
    this.scene.launch('Demo', this.setup); this.scene.bringToTop(); this.overFor = 0; this.capI = 0; this.capAt = 0;
    const W = HOWTO_WIN; this.add.graphics().fillStyle(0x0d151b, 0.6).fillRoundedRect(W.x - 10, W.y + W.h + 12, W.w + 20, 100, 12).lineStyle(3, 0x2f4a5c, 1).strokeRoundedRect(W.x - 2, W.y - 2, W.w + 4, W.h + 4, 8);
    const px = 28, pw = 540; panel(this, px - 10, 14, pw + 20, V.height - 28, { alpha: 0.86, radius: 16 });
    this.add.text(px + 10, 44, I.name.toUpperCase(), { ...STYLE.title, fontSize: '40px' });
    const body = [['GOAL', [I.goal]], ['RULES', I.rules], ['CONTROLS', I.controls]];
    let y = 82, size = 19;
    const draw = () => {                                                 // shrink the text until it all fits in the panel
      (this.bodyTexts || []).forEach(t => t.destroy()); this.bodyTexts = []; this.ruleTexts = []; y = 100;
      for (const [head, lines] of body) {
        this.bodyTexts.push(this.add.text(px + 10, y, head, { fontFamily: FONT, fontSize: (size + 2) + 'px', fontStyle: 'bold', color: THEME.gold_css })); y += size + 10;
        for (const l of lines) { const t = this.add.text(px + 16, y, (head === 'GOAL' ? '' : '•  ') + l, { fontFamily: FONT, fontSize: size + 'px', color: '#e8eef2', wordWrap: { width: pw - 30 } }); this.bodyTexts.push(t); if (head === 'RULES') this.ruleTexts.push(t); y += t.height + 4; }
        y += 8;
      }
    };
    draw(); while (y > V.height - 80 && size > 13) { size--; draw(); }
    tapButton(this, px + pw / 2, V.height - 46, 240, 'Back  (B)', () => this.leave());
    this.cap = this.add.text(W.x + W.w / 2, W.y + W.h + 60, '', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#0d151bdd', padding: { x: 14, y: 8 }, align: 'center', wordWrap: { width: W.w - 30 } }).setOrigin(0.5).setDepth(5);
    this.add.text(W.x, W.y - 32, 'DEMO: CPU carts playing', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffe27a', backgroundColor: '#0d151bcc', padding: { x: 8, y: 3 } });
    this.events.once('shutdown', () => this.release());
  }
  release() { if (DemoWindow.owner !== this) return; DemoWindow.owner = null; try { this.scene.stop('Demo'); } catch (e) {} setWorld(null); if (DemoWindow.cam !== undefined) { Settings.camMode = DemoWindow.cam; DemoWindow.cam = undefined; } }
  leave() { Sound.play('back'); this.release(); this.scene.start(this.back.scene, this.back.data || {}); }
  update(time, delta) {
    Controls.update(this.game.loop.frame); const e = Controls.menu();
    if (Controls.escPressed || e.b || e.a || e.start) return this.leave();
    const I = GAME_INFO[this.kind], lines = [I.goal, ...I.rules];                     // captions: the goal, then each rule in turn, the rule lit up on the left
    if (time - this.capAt > 4200) { this.capAt = time; this.capI = (this.capI + 1) % lines.length; this.cap.setText(lines[this.capI]); this.ruleTexts.forEach((t, i) => t.setColor(i === this.capI - 1 ? '#ffe27a' : '#e8eef2')); }
    const d = this.scene.get('Demo');                                                  // the demo plays on a loop
    if (d && d.match && d.match.state === 'over') { this.overFor += delta; if (this.overFor > 4000) { this.overFor = 0; d.scene.restart(this.setup); } } else this.overFor = 0;
  }
}
