/* v13.4: the lobby with your party, and Volt Royale straight from the lobby.
   - Your party (up to 5) stands on the stage with you, each in their own look, with their name over them.
   - Emotes in the lobby: Y (or the 😀 button) opens your wheel's emotes along the bottom; your party sees them too.
   - PLAY on Volt Royale drops you straight in (with your party: everyone together in one squad). X opens its options. */

/* ---- Volt Royale from the lobby: no team picking ---- */
function brQuickPlay(sc) {
  if (typeof memberWaits === 'function' && memberWaits()) return;
  const n = Party.active ? Party.members.length : 1, o = modeOpts('br'); if (n > (o.squad || 1)) modeSave('br', { squad: Math.min(5, n) });
  const mini = miniCfg('br'), sizes = miniSizes(cartsFor('br'));
  if (partyGame(sc, { mini, sizes, teamA: Settings.teamA, teamB: Settings.teamB, difficulty: Settings.difficulty, practice: true })) return;
  Sound.play('select'); Controls.owner = null;
  sc.scene.start('Game', { players: [{ src: Controls.mine, side: 0, chair: null, spinQueued: 0, speedLevel: Settings.speedLevel, name: Settings.myName() || 'Player 1', tag: 'P1' }], sizes, practice: true, mini });
}
{ const M = LOBBY_MODES.find(x => x.id === 'br'); M.go = sc => brQuickPlay(sc); M.opts = sc => sc.scene.start('MiniSetup', { kind: 'br' }); M.sub = 'Drop in with your party: loot, beat the storm, be the last ones left'; }
{ const f = Mouse.for.bind(Mouse); Mouse.for = (src, sc) => f(src, sc) || (src && src.id === 'mine' ? Mouse : null); }   // (playing from the lobby: your mouse aims too)
/* Volt Royale has no team colours: the "Colours" row leaves its setup screen */
{ const P = MiniSetupScene.prototype, cr = P.buildMenu; P.buildMenu = function (title, items, ...a) { if (this.kind === 'br') items = items.filter(it => !String(it.label()).startsWith('Colours')); return cr.call(this, title, items, ...a); }; }

/* ---- the stage: your party beside you ---- */
{ const P = LobbyStage.prototype, rd = P.render;
  P.setParty = function (list) {
    if (!this.ok) return; this.mates = this.mates || new Map(); const keep = new Set();
    list.slice(0, 4).forEach((mb, i) => { keep.add(mb.key); const lk = JSON.stringify(mb.look || {}); let M = this.mates.get(mb.key);
      if (!M || M.lk !== lk) { if (M) this.scene.remove(M.grp); const grp = new THREE.Group(), cart = Avatar.cart(mb.look || Avatar.randomLook(mb.name.length * 7 + i)); cart.position.y = 0.12; grp.add(cart);
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.1, 40), new THREE.MeshStandardMaterial({ color: 0x1a1f45, roughness: 0.4, metalness: 0.5 })); pad.position.y = 0.05; pad.receiveShadow = true; grp.add(pad);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.018, 8, 60).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7dff6a })); ring.position.y = 0.105; grp.add(ring);
        this.scene.add(grp); M = { grp, cart, lk, name: mb.name }; this.mates.set(mb.key, M); }
      M.slot = i; M.name = mb.name; });
    for (const [k, M] of this.mates) if (!keep.has(k)) { this.scene.remove(M.grp); this.mates.delete(k); }
  };
  P.playFor = function (key, id) { const M = this.mates && this.mates.get(key); if (!M) return; if (ACTIONS[id]) M.act = { id, t: performance.now() / 1000 }; else M.emo = { e: id, t: performance.now() }; };
  P.render = function (dt, frame) {
    if (this.ok && this.mates) { const now = performance.now() / 1000, lat = new THREE.Vector3(0.38, 0, -0.92).normalize(), back = new THREE.Vector3(-0.92, 0, -0.38).normalize();
      for (const M of this.mates.values()) { const side = M.slot % 2 ? -1 : 1, rank = M.slot < 2 ? 1 : 2, p = lat.clone().multiplyScalar(side * (rank === 1 ? 1.2 : 2.05)).add(back.clone().multiplyScalar(rank === 1 ? 1.9 : 3.8));   /* (a V behind you: 1, then 2, then 2 further back and wider) */
        M.grp.position.set(p.x, 0, p.z); M.grp.visible = frame.zoom <= 1.02; M.cart.rotation.y = -0.5 + Math.sin(now * 0.3 + M.slot) * 0.15;
        const A = M.act && ACTIONS[M.act.id], on = A && now - M.act.t < A.dur; if (typeof Rig !== 'undefined') Rig.update(M.cart, on ? M.act.id : 'drive', on ? now - M.act.t : now, { sleeves: M.cart.userData.sleeves }); } }
    return rd.call(this, dt, this.pk ? { ...frame, x: frame.x + 0.055 * this.pk } : frame);   /* (nudged right so the quests panel never hides anyone) */
  };
  P.screenOf = function (obj, h) { if (!this.cam || !Render3D.w) return null; const v = new THREE.Vector3(); obj.getWorldPosition(v); v.y += h; const c = v.clone().applyMatrix4(this.cam.matrixWorldInverse); if (c.z > -0.05) return null; v.project(this.cam); const V = CONFIG.view; return { x: (v.x + 1) / 2 * V.width, y: (1 - v.y) / 2 * V.height }; };
}

/* ---- the lobby screen: names over your party, emotes ---- */
{ const P = LobbyHomeScene.prototype, cr = P.create, up = P.update;
  P.create = function () {
    cr.call(this); const V = CONFIG.view; this.partyT = []; this.emoPick = null; this.myEmo = null;
    if (Party.active) Party.updateLook();
    const fn = (key, id) => { if (this.stage) this.stage.playFor(key, id); }; Party.emoFns.add(fn); this.events.once('shutdown', () => Party.emoFns.delete(fn));
    this.emoBtn = this.add.text(36, V.height - 104, '🙌  EMOTE (Y)', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#1b2a35d0', padding: { x: 10, y: 6 } }).setOrigin(0, 0.5).setDepth(8).setInteractive({ useHandCursor: true }).on('pointerdown', () => { Sound.resume(); this.toggleEmotes(); });
    this.partyG = this.add.graphics().setDepth(7);
  };
  P.toggleEmotes = function () { if (this.emoPick) { this.emoPick.forEach(o => o.destroy()); this.emoPick = null; return; } const V = CONFIG.view, W = Progress.P.wheel.slice(0, 8), objs = []; this.emoCur = 0;
    const g = this.add.graphics().setDepth(40); g.fillStyle(0x05070f, 0.85).fillRoundedRect(V.width / 2 - 330, V.height - 180, 660, 96, 16).lineStyle(2, 0xffd23f, 1).strokeRoundedRect(V.width / 2 - 330, V.height - 180, 660, 96, 16); objs.push(g);
    this.emoItems = W.map((id, i) => { const x = V.width / 2 - 280 + i * 80, t = this.add.text(x, V.height - 132, Emotes.icon(id), { fontFamily: 'sans-serif', fontSize: '40px' }).setOrigin(0.5).setDepth(41).setInteractive({ useHandCursor: true }); t.on('pointerdown', () => { this.emoCur = i; this.doEmote(); }); objs.push(t); return { id, t }; });
    this.emoSel = this.add.graphics().setDepth(40); objs.push(this.emoSel); this.emoPick = objs; Sound.play('select'); };
  P.doEmote = function () { const it = this.emoItems && this.emoItems[this.emoCur]; if (!it) return; Sound.play('select'); if (ACTIONS[it.id]) this.stage.play(it.id); else this.myEmo = { e: it.id, t: performance.now() }; Party.sendEmote(it.id); this.toggleEmotes(); };
  P.update = function (time, delta) {
    if (this.emoPick) {                                                   // the emote picker has the controls
      Controls.update(this.game.loop.frame); const e = Controls.menu(), n = this.emoItems.length;
      if (e.left) { this.emoCur = (this.emoCur + n - 1) % n; Sound.play('blip'); } if (e.right) { this.emoCur = (this.emoCur + 1) % n; Sound.play('blip'); }
      if (e.a) this.doEmote(); else if (e.b || e.y || Controls.escPressed) this.toggleEmotes();
      if (this.emoSel) { const t = this.emoItems[this.emoCur].t; this.emoSel.clear().lineStyle(3, 0xffd23f, 1).strokeCircle(t.x, t.y, 32); }
      if (this.stage.ok) this.stage.render(Math.min(0.05, delta / 1000), { x: 0.47, zoom: 1 });
    } else {
      const tab = LOBBY_TABS[this.tab], P0 = Controls.combined && Controls.combined.pressed || {};
      if (!this.overlay && tab === 'PLAY' && !(typeof PadNav !== 'undefined' && PadNav.stack.some(x => x.modal))) {
        if (P0.y) { this.toggleEmotes(); return; }
        if (P0.x && this.mode().opts) { Sound.play('select'); return this.mode().opts(this); }
      }
      up.call(this, time, delta);
    }
    if (!this.scene.isActive() || !this.stage || !this.stage.ok) return;
    this.stage.setParty(Party.active ? Party.others() : []);
    let i = 0; const tag = (s, x, y, col) => { const t = this.partyT[i] || (this.partyT[i] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffffff', stroke: '#05070f', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(8)); i++; return t.setFontSize(18).setVisible(true).setText(s).setPosition(x, y).setColor(col); };
    const show = LOBBY_TABS[this.tab] === 'PLAY' && !this.overlay;
    if (show && this.stage.mates) for (const M of this.stage.mates.values()) { const q = this.stage.screenOf(M.cart, 1.45); if (!q) continue; tag(M.name, q.x, q.y, '#7dff6a');
      if (M.emo && performance.now() - M.emo.t < 2500) tag(M.emo.e, q.x, q.y - 40, '#ffffff').setFontSize(38); }
    if (show && this.myEmo && performance.now() - this.myEmo.t < 2500 && this.stage.cart) { const q = this.stage.screenOf(this.stage.cart, 1.95); if (q) tag(this.myEmo.e, q.x, q.y - 20, '#ffffff').setFontSize(44); }
    for (; i < this.partyT.length; i++) this.partyT[i].setVisible(false).setFontSize(18);
    this.emoBtn.setVisible(show);
  };
}
