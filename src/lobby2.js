/* v14.1: the lobby is the centre of everything before a game.
   - The live lobby (you and your party on the stage) stays behind every menu before a game: picking a minigame, options, teams, players.
   - The game you've picked sits in the bottom left (with how many of you are playing: solo, duos, trios, squads), PLAY in the bottom right.
   - ▼ slides the games menu up from the bottom: the modes along the top row, every minigame along the second.
   - Ready up happens here, before anything loads. The party leader picks the game; everyone else presses A to ready up. Pick a different
     game and everyone readies up again. When everyone's ready the leader's PLAY goes straight in (press it twice to go without someone).
   - Empty spots on the stage: click one (or ▶ on the PLAY tab then A) to invite friends from the sidebar. */
const MINI_ICON = { balloons: '🎈', race: '🏁', hunt: '🔦', bomb: '💣', sumo: '🥋', lava: '🌋', multiball: '⚽', giant: '🏐', bowling: '🎳', golf: '⛳', hill: '⛰️', ctf: '🚩', paintball: '🎨', imposter: '🕵️', night: '🌙', stunt: '🤸', slalom: '⛷️', delivery: '📦', timetrial: '⏱️', tag: '🏷️', zombie: '🧟', koth: '👑', br: '⚡' };
const miniIcon = k => MINI_ICON[k] || '🎮';
const LIVE_SKIP = new Set(['Title', 'Game', 'Pause', 'Demo', 'HowTo', 'Boot', 'Intro', 'Trophy']);

/* ---------- the live lobby behind menus ---------- */
const LiveBG = {
  stage() { const s = window.__lobbyStage || (typeof LobbyStage !== 'undefined' && Render3D.ensure && Render3D.ensure() ? (window.__lobbyStage = new LobbyStage()) : null); return s && s.ok ? s : null; },
  attach(sc, frame = { x: 0.76, zoom: 1 }) {
    if (sc.liveBG) return true; const st = this.stage(); if (!st) return false; sc.liveBG = true;
    const V = CONFIG.view; sc.add.graphics().setDepth(-100).fillGradientStyle(0x05070f, 0x05070f, 0x05070f, 0x05070f, 0.86, 0.38, 0.9, 0.5).fillRect(0, 0, V.width, V.height);
    const fn = (t, d) => { if (!sc.sys.isActive()) return; try { st.setLook(Progress.look()); st.slotsOn = false; st.setParty(Party.active ? Party.others() : []); st.render(Math.min(0.05, d / 1000), frame); } catch (e) { console.warn(e); } };
    sc.events.on('update', fn); sc.events.once('shutdown', () => { sc.events.off('update', fn); sc.liveBG = false; Render3D.show(false); });
    return true;
  }
};
{ const mb = menuBackdrop; menuBackdrop = function (scene, opts = {}) { const key = scene.sys && scene.sys.settings.key; if (!LIVE_SKIP.has(key) && LiveBG.attach(scene)) return; return mb(scene, opts); }; }
for (const C of [MiniSetupScene, MiniListScene, MinigamesScene]) { const P = C.prototype, cr = P.create; P.create = function (...a) { LiveBG.attach(this); return cr.apply(this, a); }; }
{ const sh = DemoWindow.prototype.show; DemoWindow.prototype.show = function (kind) { if (this.sc.liveBG) { this.tag.setVisible(false); this.cap.setVisible(false); return; } return sh.call(this, kind); }; }
/* picking a minigame now happens in the lobby's games menu: the old category screens lead back there */
for (const C of [MiniListScene, MinigamesScene]) { const P = C.prototype, cr = P.create; P.create = function (...a) { if (LiveBG.stage()) { Settings.lobbyTab = 0; this.scene.start('Main', { games: 1 }); return; } return cr.apply(this, a); }; }
{ const P = MiniSetupScene.prototype, ini = P.init, cr = P.create;
  P.init = function (data = {}) { ini.call(this, data); this.goNow = !!data.go; };
  P.create = function (...a) { const r = cr.apply(this, a); this.onBack = () => this.scene.start('Main'); if (this.goNow) { this.goNow = false; this.time.delayedCall(20, () => this.start()); } return r; };
}

/* ---------- what you're playing ---------- */
const LobbyPick = {
  desc() {                                                        // the game picked on this screen
    const M = LobbyHomeScene.prototype.mode.call({}), k = M.id === 'mini' ? Settings.lobbyMini : M.id === 'br' ? 'br' : null, I = k && GAME_INFO[k];
    return { id: M.id, kind: k || '', name: M.id === 'mini' && I ? I.name.toUpperCase() : M.name, sub: M.id === 'mini' ? (I ? I.blurb || '' : 'Pick a minigame') : M.sub, icon: M.id === 'mini' && k ? miniIcon(k) : M.icon, col: M.col };
  },
  shown() { if (Party.role === 'member' && Party.game) return Party.game; return this.desc(); },
  people() { return 1 + (typeof Locals !== 'undefined' ? Locals.live().length : 0) + (Party.active ? Party.others().length : 0); },
  squad(g) {
    const n = this.people(), word = ['SOLO', 'DUOS', 'TRIOS', 'SQUADS', 'SQUADS'][Math.min(4, n - 1)];
    if (g && g.id === 'br') { const s = modeOpts('br').squad || 1; return `${['SOLO', 'DUOS', 'TRIOS', 'SQUADS', 'FIVES'][Math.min(4, Math.max(n, s) - 1)]}   ·   ${n} ${n === 1 ? 'PLAYER' : 'PLAYERS'}`; }
    if (g && g.id === 'online') return `${n} ${n === 1 ? 'PLAYER' : 'PLAYERS'}   ·   HOST OR JOIN A ROOM`;
    return `${word}   ·   ${n} ${n === 1 ? 'PLAYER' : 'PLAYERS'}`;
  }
};

/* ---------- the party: the leader's pick, and everyone's ready ---------- */
Object.assign(Party, {
  game: null, gameV: 0, myReady: 0,
  pickGame(g) { if (this.role !== 'leader') return; this.gameV++; this.game = { ...g, v: this.gameV }; for (const m of this.members) if (m.key !== 'L') m.ready = 0; for (const c of this.conns.values()) { try { c.send({ t: 'game', game: this.game }); } catch (e) { /* gone */ } } this.sendMembers(); },
  setReady(on) { if (this.role !== 'member' || !this.link || !this.game) return; this.myReady = on ? this.game.v : 0; try { this.link.send({ t: 'ready', v: this.myReady }); } catch (e) { /* gone */ } Sound.play(on ? 'select' : 'back'); this.emit(); },
  amReady() { return this.role === 'member' && !!this.game && this.myReady === this.game.v; },
  notReady() { const v = this.game && this.game.v; return this.role === 'leader' ? this.others().filter(m => m.ready !== v) : []; }
});
{ const fm = Party.fromMember, fl = Party.fromLeader, rs = Party.reset;
  Party.fromMember = function (key, conn, msg) {
    if (msg && msg.t === 'ready') { const m = this.members.find(x => x.key === key); if (m) { m.ready = msg.v | 0; this.sendMembers(); if (this.game && m.ready === this.game.v) Toasts.show(`<b>${esc(m.name)}</b> is ready.`, [], 2000); } return; }
    fm.call(this, key, conn, msg); if (msg && msg.t === 'hello' && this.game) { try { conn.send({ t: 'game', game: this.game }); } catch (e) { /* gone */ } }
  };
  Party.fromLeader = function (msg) {
    if (msg && msg.t === 'game' && msg.game && typeof msg.game === 'object') { const g = msg.game; this.game = { id: cleanText(g.id, 12), kind: cleanText(g.kind, 16), name: cleanText(g.name, 40), sub: cleanText(g.sub, 120), icon: cleanText(g.icon, 4), col: +g.col || 0x2f6fed, v: g.v | 0 }; const same = this._gv === (g.v | 0); this._gv = g.v | 0; if (same) return;   /* (v14.2.12: the leader says it again every few seconds: same game, keep your ready) */
      this.myReady = 0; this.emit(); if (typeof voltGame !== 'undefined' && voltGame.scene.isActive('Main')) Sound.play('blip'); return; }
    return fl.call(this, msg);
  };
  Party.reset = function () { this.game = null; this.myReady = 0; this._gv = undefined; return rs.call(this); };
}
/* the party's game goes through the room, which starts by itself once everyone is in it */
{ const pg = partyGame; partyGame = function (scene, preset) { return pg(scene, { ...preset, autoStart: Party.members.length }); }; }
{ const P = RoomScene.prototype, up = P.update;
  P.update = function (...a) {
    const S = this.session, pre = this.preset;
    if (this.role === 'host' && pre && pre.autoStart && !this.autoDone && S && !this.opening && S.code) {
      this.autoAt = this.autoAt || this.time.now; const inRoom = S.roster.filter(r => !r.guest).length;
      if (inRoom >= pre.autoStart || this.time.now - this.autoAt > 25000) { this.autoDone = true; pre.autoStart = 0; return this.startHost(); }
      if (this.statusText && this.statusText.active) this.statusText.setText(`Bringing your party in: ${inRoom} / ${pre.autoStart} here. It starts by itself.`);
    }
    return up.apply(this, a);
  };
}
/* no more READY UP inside the game: everyone readied up in the lobby (or the room) before it loaded */
{ const P = GameScene.prototype, up = P.update; P.update = function (...a) { if (this.rdy === undefined && this.match) this.rdy = { t: 0, done: true }; return up.apply(this, a); }; }

/* ---------- online rooms: guests ready up too (and again if the host changes the game) ---------- */
{ const H = HostSession.prototype, rc = H.receive, sc = H.setConfig, bl = H.backToLobby;
  H.receive = function (entry, msg) { if (msg && msg.t === 'rdy' && this.state === 'lobby') { const id = msg.id === undefined ? entry.id : msg.id, r = this.roster.find(x => x.id === id && (x.id === entry.id || x.own === entry.id)); if (r) { r.rdy = !!msg.on; this.sendRoster(); } return; } return rc.call(this, entry, msg); };
  H.setReady = function (id, on) { const r = this.roster.find(x => x.id === id); if (r) { r.rdy = !!on; this.sendRoster(); } };
  if (sc) H.setConfig = function (o, ...a) { const before = JSON.stringify([this.cfg.mini && this.cfg.mini.kind, this.cfg.mini && this.cfg.mini.map, this.cfg.mini && this.cfg.mini.track]), r = sc.call(this, o, ...a), after = JSON.stringify([this.cfg.mini && this.cfg.mini.kind, this.cfg.mini && this.cfg.mini.map, this.cfg.mini && this.cfg.mini.track]); if (before !== after) { let any = false; for (const x of this.roster) if (x.rdy) { x.rdy = false; any = true; } if (any) this.sendRoster(); } return r; };
  if (bl) H.backToLobby = function (...a) { for (const x of this.roster) x.rdy = false; return bl.apply(this, a); };
  const C = ClientSession.prototype; C.setReady = function (on, id) { try { this.conn.send({ t: 'rdy', on: !!on, id }); } catch (e) { /* gone */ } };
}
{ const P = RoomScene.prototype, up = P.update, ts = P.tryStart, dr = P.draw;
  P.toggleReady = function (r) { const S = this.session; if (!r || r.host) return; if (this.role === 'host') S.setReady(r.id, !r.rdy); else S.setReady(!r.rdy, r.id === S.myId ? undefined : r.id); Sound.play(r.rdy ? 'back' : 'select'); };
  P.update = function (...a) {
    const S = this.session;
    if (S && this.view !== 'teams' && !this.capturing && !(this.tsSet && this.tsSet.open) && !(this.rulesSet && this.rulesSet.open) && this.sys.isActive()) {
      Controls.update(this.game.loop.frame); const mine = Controls.mine.pressed || {};
      if (mine.a && this.role === 'client') { this.toggleReady(this.meRow()); mine.a = false; }
      for (const r of S.roster.filter(q => q.own === S.myId)) { const src = S.guestSrc.get(r.id); if (src && src.pressed && src.pressed.a) { this.toggleReady(r); src.pressed.a = false; } }
    }
    return up.apply(this, a);
  };
  P.tryStart = function () {
    const S = this.session; if (this.role !== 'host' || this.opening || !S) return ts.call(this);
    const waiting = S.roster.filter(r => !r.host && !r.rdy && !(this.preset && this.preset.autoStart === 0 && this.autoDone));
    if (waiting.length && this.time.now - (this.readyArmed || 0) > 3500) { this.readyArmed = this.time.now; this.flash = `Not ready yet: ${waiting.map(r => r.name).join(', ')}.   START again to go anyway.`; this.flashUntil = this.time.now + 3500; Sound.play('back'); return; }
    return ts.call(this);
  };
  P.draw = function (...a) {
    const r = dr.apply(this, a), S = this.session; if (!S || !this.lab) return r;
    this.rdyT = (this.rdyT || []).filter(t => t && t.active && t.scene === this); let i = 0;   // (v14.2.12: labels from the last time this screen was open are gone: make new ones. Using an old one crashed the room when a game started)
    for (const row of S.roster) { const P0 = this.pos && this.pos.get(row.id); if (!P0) continue; const t = this.rdyT[i] || (this.rdyT[i] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', padding: { x: 6, y: 2 } }).setOrigin(1, 0.5).setDepth(7)); i++;
      t.setVisible(true).setPosition(P0.x + 160, P0.y).setText(row.host ? 'HOST' : row.rdy ? '✓ READY' : 'NOT READY').setColor(row.host ? '#ffe27a' : row.rdy ? '#0b1a10' : '#ffffff').setBackgroundColor(row.host ? '#3a2f0a' : row.rdy ? '#7dff6a' : '#55626c'); }
    for (; i < this.rdyT.length; i++) this.rdyT[i].setVisible(false);
    if (this.statusText && this.statusText.active && !(this.flash && this.time.now < this.flashUntil) && !(this.preset && this.preset.autoStart)) {
      const me = this.meRow(); if (this.role === 'client' && me) this.statusText.setText(me.rdy ? "You're ready. Waiting for the host to start.   (A: not ready)" : 'Press A when you are ready.   The host starts the game.');
      else if (this.role === 'host') { const n = S.roster.filter(r => !r.host).length, k = S.roster.filter(r => !r.host && r.rdy).length; if (n) this.statusText.setText(`${k} / ${n} ready.   START plays when everyone is ready.`); }
    }
    return r;
  };
}

/* ---------- the stage: open spots for your party ---------- */
{ const P = LobbyStage.prototype, rd = P.render;
  P.slotPos = function (i) { const lat = new THREE.Vector3(0.38, 0, -0.92).normalize(), back = new THREE.Vector3(-0.92, 0, -0.38).normalize(), side = i % 2 ? -1 : 1, rank = i < 2 ? 1 : 2; return lat.multiplyScalar(side * (rank === 1 ? 1.2 : 2.05)).add(back.multiplyScalar(rank === 1 ? 1.9 : 3.8)); };
  P.render = function (dt, frame) {
    if (this.ok) {
      if (!this.ghosts) { this.ghosts = [0, 1, 2, 3].map(i => { const g = new THREE.Group(), pad = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.06, 40), new THREE.MeshStandardMaterial({ color: 0x141a3a, roughness: 0.5, metalness: 0.4, transparent: true, opacity: 0.75 })), ring = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.02, 8, 60).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5fd6ff, transparent: true, opacity: 0.6 })), plus = new THREE.Group(), pm = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.85 });
          pad.position.y = 0.03; ring.position.y = 0.07; plus.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), pm), new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), pm)); plus.position.y = 0.9; g.add(pad, ring, plus); g.userData = { plus, ring, i }; g.visible = false; this.scene.add(g); return g; }); }
      const used = this.mates ? this.mates.size : 0, show = !!this.slotsOn && frame.zoom <= 1.02, now = performance.now() / 1000;
      this.ghosts.forEach((g, i) => { g.visible = show && i >= used; if (!g.visible) return; const p = this.slotPos(i); g.position.set(p.x, 0, p.z); g.userData.plus.rotation.y = now * 1.2 + i; g.userData.plus.position.y = 0.9 + 0.06 * Math.sin(now * 2 + i); g.userData.ring.material.opacity = 0.35 + 0.3 * Math.sin(now * 3 + i); });
    }
    return rd.call(this, dt, frame);
  };
}

/* ---------- the lobby screen ---------- */
{ const P = LobbyHomeScene.prototype, cr = P.create, up = P.update, ini = P.init;
  P.init = function (data = {}) { if (ini) ini.call(this, data); this.openGames = !!data.games; };
  P.create = function (...a) {
    cr.apply(this, a); const V = CONFIG.view; this.slotT = []; this.slotFocus = -1; this.modeSlide = 0; this.gameRow = 0; this.mmCur = 0; this.playArmed = 0;
    if (this.addBtn) this.addBtn.setPosition(846 + 168, 548); if (this.emoBtn) this.emoBtn.setPosition(846, 548); if (this.localHint) this.localHint.setPosition(28, 452);
    if (this.openGames) { this.openGames = false; this.time.delayedCall(30, () => this.openModes(1)); }
    this.redraw();
  };
  P.drawPlay = function () {
    const V = CONFIG.view, Q = Progress.quests(), R = Progress.untilReset(), g = LobbyPick.shown(), member = Party.role === 'member', leader = Party.role === 'leader';
    this.box(28, 104, 340, 330); this.T(46, 116, 'DAILY QUESTS', 24, '#ffd23f'); this.T(352, 120, R.daily, 17, '#9fb2bf', { ox: 1 });
    Q.daily.forEach((q, i) => { const y = 156 + i * 82; this.T(46, y, (q.done ? '✓ ' : '') + q.text, 19, q.done ? '#7dff6a' : '#ffffff', { wrap: 300, bold: false }); this.bar(46, y + 48, 230, 10, q.got / q.n, q.done ? 0x7dff6a : 0xffd23f); this.T(352, y + 42, `${q.got}/${q.n}   +${q.xp}`, 16, '#9fb2bf', { ox: 1 }); });
    this.T(46, 400, `WEEKLY: ${Q.weekly.filter(q => q.done).length} / ${Q.weekly.length} done`, 18, '#c9d6df'); this.tap(28, 104, 340, 330, () => this.setTab(3));
    /* the game you've picked: bottom left */
    const x = 28, y = 478, w = 430, h = 198; this.box(x, y, w, h, 0x0c1424, 0.9, g.col || 0x2d5068);
    const band = this.add.graphics().setDepth(10); band.fillStyle(g.col || 0x2f6fed, 0.95).fillRoundedRect(x, y, 12, h, { tl: 12, bl: 12, tr: 0, br: 0 }); this.ui.push(band);
    this.T(x + 28, y + 14, member ? 'YOUR PARTY LEADER PICKED' : 'SELECTED GAME', 15, '#9fb2bf');
    this.T(x + 28, y + 40, g.icon || '🎮', 48, '#ffffff', { depth: 12 }).setFontFamily('sans-serif'); const nm = this.T(x + 96, y + 44, g.name, 36, '#ffffff'); if (nm.width > w - 120) nm.setScale((w - 120) / nm.width);
    this.T(x + 96, y + 84, g.sub || '', 15, '#c9d6df', { bold: false, wrap: w - 116 });
    this.T(x + 28, y + 128, LobbyPick.squad(g), 20, '#ffd23f');
    if (!member) { this.T(x + w - 16, y + 14, '▼ CHANGE', 16, '#ffffff', { ox: 1 }); this.T(x + w - 16, y + 174, this.mode().opts ? 'X  OPTIONS' : '', 15, '#9fb2bf', { ox: 1 }); this.tap(x, y, w, h, () => this.openModes(this.mode().id === 'mini' ? 1 : 0)); }
    /* PLAY / READY: bottom right */
    const bx = 846, bw = 406, by = 594, ready = Party.amReady(), wait = leader ? Party.notReady() : [];
    const col = member ? (ready ? 0x7dff6a : 0xffd23f) : 0xffd23f; this.box(bx, by, bw, 82, col, 1, 0xffffff);
    this.T(bx + bw / 2, by + 41, member ? (ready ? 'READY ✓' : 'READY UP') : 'PLAY', member ? 40 : 46, '#10181e', { ox: 0.5, oy: 0.5 }); this.T(bx + 22, by + 41, 'A', 20, '#ffd23f', { ox: 0.5, oy: 0.5, depth: 12 }).setBackgroundColor('#10181e').setPadding(6, 1);
    this.tap(bx, by, bw, 82, () => this.play());
    if (Party.active) { const n = Party.others().length, k = leader ? n - wait.length : Party.others().filter(m => m.ready && Party.game && m.ready === Party.game.v).length + (ready ? 0 : 0);
      this.T(bx + bw, by - 84, member ? (ready ? 'Waiting for your leader to start' : 'Press A when you are ready') : wait.length ? `Waiting on ${wait.map(m => m.name).join(', ')}` : 'Everyone is ready!', 17, member ? '#ffffff' : wait.length ? '#ffd23f' : '#7dff6a', { ox: 1 });
      if (leader) this.T(bx + bw, by - 106, `${k} / ${n} READY`, 15, '#9fb2bf', { ox: 1 }); }
  };
  P.play = function () {
    Sound.play('select');
    if (Party.role === 'member') { if (!Party.game) { Toasts.show('Waiting for your party leader to pick the game...', [], 2500); return; } Party.setReady(!Party.amReady()); this.redraw(); return; }
    if (Party.role === 'leader') { const wait = Party.notReady(); if (wait.length && this.time.now - this.playArmed > 4000) { this.playArmed = this.time.now; Toasts.show(`Waiting for <b>${wait.map(m => esc(m.name)).join(', ')}</b> to ready up. Press PLAY again to go without waiting.`, [], 4000); Sound.play('back'); return; } }
    this.playArmed = 0; this.mode().go(this);
  };
  /* ▼: the games menu slides up from the bottom */
  P.openModes = function (row = 0) {
    if (Party.role === 'member') { memberWaits(); return; }
    this.overlay = 'modes'; this.modeSlide = 0; this.modeClosing = false; this.gameRow = row; this.mcur = Math.max(0, LOBBY_MODES.indexOf(this.mode()));
    const ks = this.miniKinds(); this.mmCur = Math.max(0, ks.indexOf(Settings.lobbyMini)); Sound.play('select'); this.redraw();
  };
  P.miniKinds = function () { const order = GAME_CATS.map(c => c.id); return MINI_KINDS().filter(k => k !== 'br' && GAME_INFO[k]).sort((a, b) => order.indexOf(GAME_INFO[a].cat) - order.indexOf(GAME_INFO[b].cat)); };
  P.closeModes = function () { if (this.overlay !== 'modes') return; this.modeClosing = true; Sound.play('back'); };
  P.drawModes = function () {
    const V = CONFIG.view, top = 300, C = this.add.container(0, 0).setDepth(30); this.ui.push(C); this.modesC = C;
    const shade = this.add.graphics(); shade.fillGradientStyle(0x05070f, 0x05070f, 0x05070f, 0x05070f, 0, 0, 0.95, 0.95).fillRect(0, top - 140, V.width, 140).fillStyle(0x05070f, 0.95).fillRect(0, top, V.width, V.height - top); C.add(shade);
    const edge = this.add.graphics(); edge.lineStyle(3, 0xffd23f, 0.9).lineBetween(0, top, V.width, top); C.add(edge);
    const add = o => { const k = this.ui.indexOf(o); if (k >= 0) this.ui.splice(k, 1); C.add(o); return o; }, T = (...a) => add(this.T(...a)), box = (...a) => add(this.box(...a)), tap = (x, y, w, h, fn) => { const z = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true }); z.on('pointerdown', () => { Sound.resume(); fn(); }); C.add(z); };
    T(40, top + 16, 'GAME MODES', 20, this.gameRow === 0 ? '#ffd23f' : '#9fb2bf'); T(V.width - 40, top + 16, 'A  pick      ▲ ▼  row      B  close', 16, '#9fb2bf', { ox: 1 });
    const n = LOBBY_MODES.length, cw = Math.min(196, (V.width - 80 - (n - 1) * 12) / n);
    LOBBY_MODES.forEach((M, i) => { const x = 40 + i * (cw + 12), y = top + 48, on = this.gameRow === 0 && i === this.mcur, sel = M.id === this.mode().id;
      box(x, y, cw, 128, M.col, on ? 1 : 0.6, on ? 0xffffff : sel ? 0xffd23f : 0x000000); T(x + cw / 2, y + 42, M.icon, 40, '#ffffff', { ox: 0.5, oy: 0.5 }).setFontFamily('sans-serif'); const t = T(x + cw / 2, y + 78, M.name, 20, '#ffffff', { ox: 0.5 }); if (t.width > cw - 12) t.setScale((cw - 12) / t.width);
      if (sel) T(x + 8, y + 6, '✓', 18, '#ffd23f'); tap(x, y, cw, 128, () => { this.gameRow = 0; this.mcur = i; this.pickRow0(); }); });
    const ks = this.miniKinds(), tw = 150, gap = 12, vis = Math.floor((V.width - 80 + gap) / (tw + gap)); this.mmOff = Math.max(0, Math.min(ks.length - vis, this.mmCur - Math.floor(vis / 2)));
    T(40, top + 196, 'MINIGAMES', 20, this.gameRow === 1 ? '#ffd23f' : '#9fb2bf'); const page = d => { this.gameRow = 1; this.mmCur = Math.max(0, Math.min(ks.length - 1, (d > 0 ? this.mmOff + vis : this.mmOff - 1) + (d > 0 ? Math.floor(vis / 2) : -Math.floor(vis / 2) + 1))); Sound.play('blip'); this.redrawSoon(); };   // (v14.2.2: touch: the arrows page the row)
    if (this.mmOff > 0) { box(4, top + 236, 32, 104, 0x2a4a6b, 0.9, 0xffffff); T(20, top + 288, '◀', 26, '#ffffff', { ox: 0.5, oy: 0.5 }); tap(0, top + 226, 40, 124, () => page(-1)); }
    if (this.mmOff + vis < ks.length) { box(V.width - 36, top + 236, 32, 104, 0x2a4a6b, 0.9, 0xffffff); T(V.width - 20, top + 288, '▶', 26, '#ffffff', { ox: 0.5, oy: 0.5 }); tap(V.width - 40, top + 226, 40, 124, () => page(1)); }
    ks.slice(this.mmOff, this.mmOff + vis).forEach((k, j) => { const i = this.mmOff + j, x = 40 + j * (tw + gap), y = top + 226, on = this.gameRow === 1 && i === this.mmCur, sel = this.mode().id === 'mini' && Settings.lobbyMini === k, I = GAME_INFO[k];
      box(x, y, tw, 124, on ? 0x2a4a6b : 0x141c2c, 0.95, on ? 0xffffff : sel ? 0xffd23f : 0x2d5068); T(x + tw / 2, y + 40, miniIcon(k), 38, '#ffffff', { ox: 0.5, oy: 0.5 }).setFontFamily('sans-serif'); T(x + tw / 2, y + 74, I.name, 17, '#ffffff', { ox: 0.5, align: 'center', wrap: tw - 10 });
      if (sel) T(x + 8, y + 6, '✓', 16, '#ffd23f'); tap(x, y, tw, 124, () => { this.gameRow = 1; this.mmCur = i; this.pickRow1(); }); });
    const focusText = this.gameRow === 0 ? LOBBY_MODES[this.mcur].sub : (GAME_INFO[ks[this.mmCur]] || {}).blurb || '';
    T(V.width / 2, V.height - 26, focusText, 18, '#e8eef2', { ox: 0.5, oy: 0.5, bold: false, wrap: V.width - 120, align: 'center' });
    const k = this.modeSlide, e = 1 - Math.pow(1 - k, 3); C.y = (1 - e) * (V.height - top + 40);
  };
  P.pickRow0 = function () { const M = LOBBY_MODES[this.mcur]; if (M.id === 'mini') { this.gameRow = 1; Sound.play('select'); this.redraw(); return; } Settings.lobbyMode = M.id; Settings.save(); Sound.play('select'); this.closeModes(); this.redraw(); };
  P.pickRow1 = function () { const k = this.miniKinds()[this.mmCur]; if (!k) return; Settings.lobbyMode = 'mini'; Settings.lobbyMini = k; Settings.save(); Sound.play('select'); this.closeModes(); this.redraw(); };
  P.pickMode = P.pickRow0;
  P.update = function (time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    if (Party.role === 'leader') { const d = LobbyPick.desc(), g = Party.game; if (!g || g.id !== d.id || g.kind !== d.kind) Party.pickGame(d);
      else if (time - (this.gameSentAt || 0) > 4000) { this.gameSentAt = time; for (const c of Party.conns.values()) { try { c.send({ t: 'game', game: Party.game }); } catch (e) { /* gone */ } } } }   // (v14.2.12: said again every few seconds, so a member never waits on "the leader picks the game")
    if (this.overlay === 'modes') {                                         // the games menu has the controls
      Controls.update(this.game.loop.frame); const e = Controls.menu(); if (Controls.escPressed) e.b = true;
      if (this.modeClosing) { this.modeSlide = Math.max(0, this.modeSlide - dt * 5); if (this.modeSlide <= 0) { this.overlay = null; this.modeClosing = false; this.redraw(); } }
      else this.modeSlide = Math.min(1, this.modeSlide + dt * 4.2);
      if (this.modesC && this.modesC.active) { const V = CONFIG.view, e3 = 1 - Math.pow(1 - this.modeSlide, 3); this.modesC.y = (1 - e3) * (V.height - 300 + 40); }
      if (!this.modeClosing && !(typeof PadNav !== 'undefined' && PadNav.prune().some(x => x.modal))) {
        const ks = this.miniKinds();
        if (this.gameRow === 0) { const n = LOBBY_MODES.length; if (e.left) { this.mcur = (this.mcur + n - 1) % n; this.redrawSoon(); } if (e.right) { this.mcur = (this.mcur + 1) % n; this.redrawSoon(); } if (e.down) { this.gameRow = 1; this.redrawSoon(); } if (e.a) this.pickRow0(); }
        else { const n = ks.length; if (e.left) { this.mmCur = (this.mmCur + n - 1) % n; this.redrawSoon(); } if (e.right) { this.mmCur = (this.mmCur + 1) % n; this.redrawSoon(); } if (e.up) { this.gameRow = 0; this.redrawSoon(); } if (e.a) this.pickRow1(); }
        if (e.b || e.start) this.closeModes();
      }
      if (this.stage && this.stage.ok) { this.stage.setLook(this.previewLook()); this.stage.slotsOn = false; this.stage.setParty(Party.active ? Party.others() : []); this.stage.render(dt, { x: 0.47, zoom: 1 }); }
      return;
    }
    const playTab = LOBBY_TABS[this.tab] === 'PLAY' && !this.overlay; if (this.stage) this.stage.slotsOn = playTab && !this.emoPick;
    /* the controller reaches the open spots too: ▲ goes through your party, then on to the ＋ INVITE spots; A opens the friends sidebar */
    const slots = this.stage && this.stage.ghosts ? this.stage.ghosts.filter(g => g.visible).length : 0, mates = this.mateList ? this.mateList().length : 0, P0 = (Controls.combined && Controls.combined.pressed) || {};
    const freeNav = playTab && !this.emoPick && !this.capT && !this.pPop && !(typeof PadNav !== 'undefined' && PadNav.prune().some(x => x.modal)) && !(typeof FriendsBar !== 'undefined' && FriendsBar.open);
    if (this.slotFocus >= slots) this.slotFocus = -1;
    if (freeNav && slots) {
      const eat = b => { for (const s of [Controls.combined, Controls.mine, ...Controls.list()]) if (s && s.pressed) s.pressed[b] = false; };
      if (P0.up && (this.slotFocus >= 0 || !mates || this.pFocus === mates - 1)) { this.slotFocus = this.slotFocus + 1 >= slots ? -1 : this.slotFocus + 1; this.pFocus = -1; Sound.play('blip'); eat('up'); }
      else if (this.slotFocus >= 0 && P0.a) { eat('a'); Sound.play('select'); this.slotFocus = -1; FriendsBar.fromSlot = true; FriendsBar.toggle(true); }   // (opens on the first friend's ＋ Party)
      else if (this.slotFocus >= 0 && (P0.b || P0.down)) { eat('b'); eat('down'); this.slotFocus = -1; Sound.play('back'); }
    } else if (!playTab) this.slotFocus = -1;
    const r = up.call(this, time, delta);
    if (!this.scene.isActive() || !this.stage || !this.stage.ok) return r;
    /* the open spots: "+ INVITE" over each, click to open the friends sidebar */
    let i = 0;
    if (this.stage.slotsOn && this.stage.ghosts) for (const g of this.stage.ghosts) { if (!g.visible) continue; const q = this.stage.screenOf(g.userData.plus, 0.35); if (!q) continue;
      const t = this.slotT[i] || (this.slotT[i] = this.add.text(0, 0, '＋ INVITE', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#9fe8ff', backgroundColor: '#0d151bc0', padding: { x: 8, y: 4 } }).setOrigin(0.5).setDepth(8).setInteractive({ useHandCursor: true }).on('pointerdown', () => { Sound.resume(); FriendsBar.toggle(true); }));
      const on = i === this.slotFocus; t.setVisible(true).setPosition(q.x, q.y).setText(on ? '＋ INVITE  (A)' : '＋ INVITE').setColor(on ? '#1a1206' : '#9fe8ff').setBackgroundColor(on ? '#ffd23f' : '#0d151bc0').setScale(on ? 1.15 + 0.05 * Math.sin(this.time.now / 150) : 1); i++; }
    for (; i < this.slotT.length; i++) this.slotT[i].setVisible(false);
    if (this.localHint && this.localHint.visible && i && !/▲/.test(this.localHint.text)) this.localHint.setText(this.localHint.text + '     ▲: invite friends');
    /* ready marks over your party */
    this.rdyMk = (this.rdyMk || []).filter(t => t && t.active && t.scene === this); let j = 0;   // (v14.2.12: not the destroyed labels from the last visit)
    if (playTab && Party.active && Party.game && this.stage.mates) for (const [key, M] of this.stage.mates) { if (key.startsWith('local-')) continue; const mb = Party.members.find(x => x.key === key); if (!mb) continue; const q = this.stage.screenOf(M.cart, 1.45); if (!q) continue;
      const ok = mb.leader || mb.ready === Party.game.v, t = this.rdyMk[j] || (this.rdyMk[j] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', padding: { x: 6, y: 2 } }).setOrigin(0.5).setDepth(8)); j++;
      t.setVisible(true).setPosition(q.x, q.y + 22).setText(mb.leader ? '★ LEADER' : ok ? '✓ READY' : 'NOT READY').setColor(mb.leader ? '#ffe27a' : ok ? '#0b1a10' : '#ffffff').setBackgroundColor(mb.leader ? '#3a2f0acc' : ok ? '#7dff6a' : '#55626ccc'); }
    for (; j < this.rdyMk.length; j++) this.rdyMk[j].setVisible(false);
    if (this.game.loop.frame % 20 === 0 && Party.active && playTab) this.redraw();   // (ready counts change from the network)
    return r;
  };
}
/* MINIGAMES: PLAY goes straight into the minigame picked in the games menu (team games show their team screen first); X opens its options */
{ const M = LOBBY_MODES.find(x => x.id === 'mini');
  if (M) { M.go = sc => { const k = Settings.lobbyMini; if (!k || !GAME_INFO[k] || k === 'br') return sc.openModes(1); sc.scene.start('MiniSetup', { kind: k, go: !isTeamMini(k) }); };
    M.opts = sc => { const k = Settings.lobbyMini; if (k && GAME_INFO[k]) sc.scene.start('MiniSetup', { kind: k }); else sc.openModes(1); }; }
}

/* ---------- the friends sidebar: slides in from the right ---------- */
{ const css = document.createElement('style');
  css.textContent = `#fmodal{justify-content:flex-end!important;align-items:stretch!important;background:rgba(5,10,14,.28)!important;transition:background .3s}
    #fmodal .box{width:min(440px,94vw)!important;max-height:none!important;height:100vh;border-radius:16px 0 0 16px!important;border-right:none!important;transform:translateX(105%);transition:transform .32s cubic-bezier(.2,.9,.25,1);box-shadow:-12px 0 40px #000a!important}
    #fmodal.in .box{transform:none}
    #fmodal .hd h2{font-size:30px!important;letter-spacing:.02em}
    #fmodal .r .n .on{font-size:14px}#fmodal .fslots{display:flex;gap:8px;padding:10px 0 4px}#fmodal .fslot{flex:1;min-height:58px;border:2px dashed #2f4a5c;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-direction:column;font-size:15px;color:#9fb2bf;cursor:pointer;background:#0b141b}
    #fmodal .fslot.f{border-style:solid;border-color:#3dff9a;color:#fff;cursor:default;background:#10231a}#fmodal .fslot b{font-size:22px;color:#5fd6ff}`;
  document.head.append(css);
  const tg = FriendsBar.toggle, rn = FriendsBar.render, ac = FriendsBar.act;
  /* v14.1.5: the controller walks the sidebar row by row (▲ ▼ to the row above or below, the button nearest where you are; ◀ ▶ along the row),
     so every invite slot and every friend's ＋ Party button can be reached. Plain spatial navigation skipped rows in this narrow layout. */
  const rowNav = (el, p) => {
    const dy = p('up') ? -1 : p('down') ? 1 : 0, dx = p('left') ? -1 : p('right') ? 1 : 0; if (!dx && !dy) return false;
    const list = PadNav.focusables(el).map(x => ({ x, r: x.getBoundingClientRect() })).sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left); if (!list.length) return true;
    const rows = []; for (const it of list) { const cy = it.r.top + it.r.height / 2, row = rows.find(R => Math.abs(R.cy - cy) < 14); if (row) row.items.push(it); else rows.push({ cy, items: [it] }); }
    rows.sort((a, b) => a.cy - b.cy); rows.forEach(R => R.items.sort((a, b) => a.r.left - b.r.left));
    const ri = rows.findIndex(R => R.items.some(it => it.x === PadNav.current)); if (ri < 0) { PadNav.focus(rows[0].items[0].x); return true; }
    const row = rows[ri], ci = row.items.findIndex(it => it.x === PadNav.current), cur = row.items[ci], cx = cur.r.left + cur.r.width / 2; let next = null;
    if (dx) next = row.items[ci + dx] || null;
    else { const R = rows[ri + dy]; if (R) next = R.items.reduce((best, it) => Math.abs(it.r.left + it.r.width / 2 - cx) < Math.abs(best.r.left + best.r.width / 2 - cx) ? it : best); }
    if (next) { PadNav.focus(next.x); Sound.play('blip'); } return true;
  };
  FriendsBar.toggle = function (on = !this.open) {
    const was = this.open; tg.call(this, on); if (!this.modal || was === this.open) return;
    if (this.open) { const S = PadNav.stack.find(x => x.el === this.modal); if (S) S.onKey = p => rowNav(this.modal, p);
      if (this.fromSlot) { this.fromSlot = false; const t = this.modal.querySelector('[data-act="pinv1"]') || this.modal.querySelector('[data-act="slotinv"]'); if (t) PadNav.focus(t); } }
    if (this.open) requestAnimationFrame(() => requestAnimationFrame(() => this.modal.classList.add('in')));
    else { this.modal.classList.add('open'); this.modal.classList.remove('in'); clearTimeout(this.outT); this.outT = setTimeout(() => { if (!this.open) this.modal.classList.remove('open'); }, 330); }
  };
  FriendsBar.render = function () {
    rn.call(this); if (!this.modal || !Account.loggedIn) return; const bd = this.modal.querySelector('.bd'); if (!bd) return;
    const mem = Party.active ? Party.members : [{ name: Account.name, leader: true }], cells = [];
    for (let i = 0; i < Party.max; i++) { const m = mem[i]; cells.push(m ? `<div class="fslot f"><span>${m.leader ? '★ ' : ''}${esc(m.name)}</span><span class="s">${m.key === Party.myKey || !Party.active ? 'you' : Party.game && (m.leader || m.ready === Party.game.v) ? '✓ ready' : 'not ready'}</span></div>` : `<div class="fslot" data-act="slotinv" data-nav tabindex="0"><b>＋</b>invite</div>`); }
    bd.insertAdjacentHTML('afterbegin', `<h4>Your party · ${mem.length} / ${Party.max}</h4><div class="fslots">${cells.join('')}</div>`);
  };
  FriendsBar.act = async function (a, who) {
    if (a === 'slotinv') { const first = this.modal.querySelector('[data-act="pinv1"]'); if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); PadNav.focus && PadNav.focus(first); } else Toasts.show('No friends online right now. Use "Add a friend" to find people.', [], 3500); return; }
    return ac.call(this, a, who);
  };
}
