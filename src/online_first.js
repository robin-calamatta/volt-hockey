/* v14.3 Online first, like Fortnite. The lobby's PLAY tab has a switch on the game card: 🌐 ONLINE (the default) or 🏠 THIS SCREEN.
   - ONLINE: the modes are online playlists, and PLAY puts you in matchmaking straight away (no team screen, nothing to edit):
       VOLT ROYALE (public match, Solos to Fives), VOLT HOCKEY (quick match, 3 v 3), MINIGAME MIX (a different minigame each match, up
       to 8 players) and PRIVATE ROOM (make a room for friends with a code, or join one). CPUs fill every empty spot.
       Your party queues with you (the leader presses PLAY) and the players on your screen come too.
   - THIS SCREEN: everything as before: hockey, Volt Royale, minigames, seasons and practice, against the CPU or with players on this screen.
   ◀ ▶ on the PLAY tab (or a tap) switches between them. */
const PlayWhere = {
  base: null,
  ONLINE: { br: { name: 'VOLT ROYALE', sub: 'Public match: drop in with players online. CPUs fill the empty spots.' },
    hockey: { name: 'VOLT HOCKEY', sub: 'Quick match: 3 v 3 with players online. CPUs fill the empty spots.' },
    mini: { name: 'MINIGAME MIX', sub: 'A different minigame each match, with up to 8 players online.', icon: '🎲' },
    online: { name: 'PRIVATE ROOM', sub: 'Make a room for your friends (share its code), or join one.', icon: '🔑' } },
  QUEUED: ['br', 'hockey', 'mini'],
  online() { return Settings.playOnline === true && GameCfg.online !== false; },   /* (v14.3.12: THIS SCREEN unless you switch; never when the admin has turned online play off) */
  /* v14.3.13 where you play: 'net' (🌐 ONLINE, over the internet), 'lan' (📶 LAN, people on your network only) or 'local' (🏠 THIS SCREEN) */
  choices() { const c = [['🌐  ONLINE', 'net']]; if (GameCfg.lan !== false) c.push(['📶  LAN', 'lan']); c.push(['🏠  THIS SCREEN', 'local']); return GameCfg.online === false ? [] : c; },
  where() { return !this.online() ? 'local' : NetMode.lan() ? 'lan' : 'net'; },
  pick(w) { if (w === 'local') return this.set(false); const lan = w === 'lan'; if (Settings.netLan !== lan) { Settings.netLan = lan; Settings.save(); if (lan) NetMode.load(true); } if (this.online()) { Sound.play('blip'); this.apply(); } else this.set(true);
    if (lan && Settings.netLan) Toasts.show('📶 <b>LAN</b>: matchmaking and rooms only find people on your network (the same Wi-Fi). Great for a room full of players.', [], 3500); },
  set(on) { if (on && GameCfg.online === false) { Sound.play('back'); Toasts.show('Online play is turned off right now. Play on 🏠 THIS SCREEN.', [], 3500); return; } if (this.online() === !!on) return; Settings.playOnline = !!on; Settings.save(); this.apply(); Sound.play('select'); },
  init() {
    if (this.base) return; Settings.playOnline = false;   /* v14.3.12: the game opens on THIS SCREEN every time */ this.base = LOBBY_MODES.slice(); if (typeof BR_LOBBY_MODE !== 'undefined' && !this.base.includes(BR_LOBBY_MODE)) this.base.push(BR_LOBBY_MODE);
    for (const M of this.base) { M.local = { name: M.name, sub: M.sub, icon: M.icon, opts: M.opts }; const g = M.go;
      if (this.QUEUED.includes(M.id)) M.go = sc => this.online() ? this.queue(sc, M.id) : g(sc); }
  },
  apply() {
    this.init(); const on = this.online(), get = id => this.base.find(m => m.id === id);
    LOBBY_MODES.splice(0, LOBBY_MODES.length, ...(on ? ['br', 'hockey', 'mini', 'online'] : ['hockey', 'br', 'mini', 'season', 'practice']).map(get).filter(Boolean));
    if (typeof brSync === 'function') brSync();                              // (Volt Royale only for 16 and over)
    for (const M of this.base) Object.assign(M, M.local, on ? this.ONLINE[M.id] || {} : {}, on && M.id === 'mini' ? { opts: undefined } : {});
    if (!LOBBY_MODES.some(m => m.id === Settings.lobbyMode)) Settings.lobbyMode = LOBBY_MODES[0].id;
    /* v14.3.12 X (options) does something on every game card. It used to on only two, and nothing came up on the rest */
    const rules = sc => sc.scene.start('SettingsPage', { page: 'Game rules', ctx: {} });
    const X = { hockey: on ? rules : sc => sc.scene.start('Setup', { practice: false }), practice: sc => sc.scene.start('Setup', { practice: true }), season: rules,
      mini: on ? () => Toasts.show('The MINIGAME MIX has no options: each match picks a different minigame. To pick one and set its options, switch the game card to 🏠 THIS SCREEN.', [], 5000) : null,
      online: sc => sc.scene.start('JoinCode') };
    for (const M of this.base) if (X[M.id] && (!M.local.opts || (on && M.id !== 'br'))) M.opts = X[M.id];
  },
  queue(sc, id) {
    if (typeof memberWaits === 'function' && memberWaits()) return;
    if (!Account.loggedIn) { Sound.play('back'); Toasts.show('Log in to play online. Or switch the game card to 🏠 THIS SCREEN to play here.', [{ label: 'Log in / sign up', go: true, fn: () => FriendsBar.toggle(true) }], 6000); return; }
    if (!PeerTransport.available()) { Toasts.show(esc(netErrorText({ type: 'unsupported' })), [], 4000); return; }
    let squad = (modeOpts('br') || {}).squad || 1;
    if (id === 'br') { const n = BRQ.people(); if (n > squad) { squad = Math.min(5, n); modeSave('br', { squad }); } }
    Sound.play('select'); Controls.owner = null; sc.scene.start('BRQueue', { mode: id, squad });
  }
};
/* the game card says where you're playing */
{ const d = LobbyPick.desc, q = LobbyPick.squad;
  LobbyPick.desc = function () { const r = d.call(this); if (PlayWhere.online() && r.id === 'mini') return { ...r, kind: 'mix', name: 'MINIGAME MIX', sub: PlayWhere.ONLINE.mini.sub, icon: '🎲' }; return r; };
  LobbyPick.squad = function (g) { if (g && g.id === 'online') return q.call(this, g); return q.call(this, g) + (PlayWhere.online() ? (NetMode.lan() ? '   ·   📶 LAN' : '   ·   ONLINE') : ''); };
}
{ const P = LobbyHomeScene.prototype, cr = P.create, dp = P.drawPlay, rd = P.redraw, up = P.update, mk = P.miniKinds, r0 = P.pickRow0, dm = P.drawModes;
  P.create = function (...a) { PlayWhere.apply(); return cr.apply(this, a); };
  /* the switch: two boxed halves across the top of the game card */
  P.drawPlay = function (...a) {
    const r = dp.apply(this, a); if (Party.role === 'member' || GameCfg.online === false) return r;
    const x = 28, y = 478, w = 430, on = PlayWhere.online(), hw = 150, top = y - 46;
    this.box(x, top, hw * 2 + 8, 40, 0x05070f, 0.85, 0x2d5068, 11);
    /* v14.3.13: three when the admin allows LAN: 🌐 ONLINE · 📶 LAN · 🏠 THIS SCREEN */
    const opts = PlayWhere.choices(), cur = PlayWhere.where(), W = { net: 118, lan: 86, local: 168 }, total = opts.reduce((k, o) => k + (opts.length === 2 ? hw : W[o[1]]) + 4, 4); let bx = x + 4;
    this.box(x, top, total, 40, 0x05070f, 0.85, 0x2d5068, 11);
    for (const [label, v] of opts) { const bw = (opts.length === 2 ? hw : W[v]) - 4, sel = cur === v, X0 = bx;
      this.box(X0, top + 4, bw, 32, sel ? (v === 'net' ? 0x19c3ff : v === 'lan' ? 0xffb02e : 0x7dff6a) : 0x101a28, sel ? 1 : 0.9, sel ? 0xffffff : 0x2d5068, 12);
      this.T(X0 + bw / 2, top + 20, label, 17, sel ? '#06121a' : '#c9d6df', { ox: 0.5, oy: 0.5, depth: 13 });
      this.tap(X0, top + 4, bw, 32, () => { PlayWhere.pick(v); this.redraw(); }, 14); bx += bw + 4; }
    this.T(x + total + 10, top + 20, '◀ ▶', 16, '#9fb2bf', { oy: 0.5, depth: 13 });
    return r;
  };
  P.redraw = function (...a) {
    const r = rd.apply(this, a);
    if (this.foot && this.foot.active && LOBBY_TABS[this.tab] === 'PLAY' && !this.overlay) this.foot.setText(`A  ${PlayWhere.online() ? 'find a match' : 'play'}      ◀ ▶  ${PlayWhere.choices().length > 2 ? 'online / LAN / this screen' : 'online / this screen'}      ▼  change mode      Y  emote      X  options      LB / RB  tabs      Start  menu`);
    if (this.localHint && this.localHint.active) this.localHint.setPosition(PlayWhere.choices().length > 2 ? 470 : 392, 452);   // (out of the switch's way)
    return r;
  };
  /* online: the minigame row isn't used (the mix picks the game), so the games menu is just the playlists */
  P.miniKinds = function (...a) { return PlayWhere.online() ? [] : mk.apply(this, a); };
  P.pickRow0 = function (...a) { const M = LOBBY_MODES[this.mcur]; if (PlayWhere.online() && M && M.id === 'mini') { Settings.lobbyMode = 'mini'; Settings.save(); Sound.play('select'); this.closeModes(); this.redraw(); return; } return r0.apply(this, a); };
  P.pickMode = P.pickRow0;
  P.drawModes = function (...a) {
    const r = dm.apply(this, a); if (!PlayWhere.online() || !this.modesC) return r;
    const t = this.add.text(40, 300 + 236, 'Online: the MINIGAME MIX picks a different minigame each match.\nTo choose one yourself, switch the game card to 🏠 THIS SCREEN (◀ ▶ on the PLAY tab), or make a PRIVATE ROOM.', { fontFamily: FONT, fontSize: '18px', color: '#9fb2bf', lineSpacing: 6 });
    this.modesC.add(t); this.modesC.list.forEach(o => { if (o.text === 'GAME MODES') o.setText('ONLINE PLAYLISTS'); if (o.text === 'MINIGAMES') o.setText(''); });
    return r;
  };
  P.update = function (time, delta) {
    if (this.overlay === 'modes' && PlayWhere.online() && this.gameRow === 1) this.gameRow = 0;
    const P0 = (Controls.combined && Controls.combined.pressed) || {}, tab = LOBBY_TABS[this.tab];
    if (tab === 'PLAY' && !this.overlay && !this.emoPick && !this.capT && !this.pPop && Party.role !== 'member' && !(typeof PadNav !== 'undefined' && PadNav.prune().some(x => x.modal)) && !(typeof FriendsBar !== 'undefined' && FriendsBar.open)) {
      const ch = PlayWhere.choices().map(o => o[1]), i = ch.indexOf(PlayWhere.where());
      if (P0.left && i > 0) { PlayWhere.pick(ch[i - 1]); this.redraw(); } else if (P0.right && i < ch.length - 1) { PlayWhere.pick(ch[i + 1]); this.redraw(); }
    }
    return up.call(this, time, delta);
  };
}

/* v14.3.1 phones and tablets: a phone browser's bottom bar covered PLAY and the game card. On a touch screen the PLAY tab moves up 64 px and
   leaves out the daily quests panel (they're on the QUESTS tab) and the keyboard / controller hints along the bottom. */
const lobbyTouchy = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || !!Settings.touch;
{ const P = LobbyHomeScene.prototype, dp = P.drawPlay, rd = P.redraw, LIFT = 64;
  P.drawPlay = function (...a) {
    if (!lobbyTouchy()) return dp.apply(this, a);
    const T0 = this.T, B0 = this.box, Z0 = this.tap, R0 = this.bar, n0 = this.ui.length, mine = new Set(), quests = (x, y) => y < 420 && x < 380;
    this.T = function (x, y, ...r) { const o = T0.call(this, x, quests(x, y) ? y : y >= 420 ? y - LIFT : y, ...r); mine.add(o); if (quests(x, y)) o.setVisible(false); return o; };
    this.box = function (x, y, ...r) { const o = B0.call(this, x, quests(x, y) ? y : y >= 420 ? y - LIFT : y, ...r); mine.add(o); if (quests(x, y)) o.setVisible(false); return o; };
    this.tap = function (x, y, ...r) { const o = Z0.call(this, x, quests(x, y) ? y : y >= 420 ? y - LIFT : y, ...r); mine.add(o); if (quests(x, y)) o.disableInteractive(); return o; };
    this.bar = function (x, y, ...r) { if (quests(x, y)) return; return R0.call(this, x, y >= 420 ? y - LIFT : y, ...r); };
    try { return dp.apply(this, a); }
    finally { this.T = T0; this.box = B0; this.tap = Z0; this.bar = R0; for (const o of this.ui.slice(n0)) if (!mine.has(o) && o.type === 'Graphics' && o.y === 0) o.y = -LIFT; }   /* (the card's colour band is drawn straight on) */
  };
  P.redraw = function (...a) {
    const r = rd.apply(this, a); if (!lobbyTouchy()) return r; const play = LOBBY_TABS[this.tab] === 'PLAY';
    if (this.foot && this.foot.active && play && !this.overlay) this.foot.setText('');
    if (this.emoBtn && this.emoBtn.active) this.emoBtn.setY(548 - LIFT); if (this.addBtn && this.addBtn.active) this.addBtn.setY(548 - LIFT);
    if (this.localHint && this.localHint.active) this.localHint.setY(452 - LIFT);
    return r;
  };
}
{ const P = LobbyHomeScene.prototype, up = P.update;
  P.update = function (...a) { const r = up.apply(this, a); if (this.overlay === 'modes' && this.modesC && this.modesC.active && lobbyTouchy()) this.modesC.y -= 56; return r; };   /* (the games menu too) */
}

/* v14.3.12 online play turned off in the admin page: the online screens send you back to the lobby (with a word why), and the lobby
   redraws without the ONLINE switch as soon as the game hears about it */
{ for (const C of [OnlineMenuScene, JoinCodeScene, RoomScene, BRQueueScene]) { const cr = C.prototype.create;
    C.prototype.create = function (...a) { if (GameCfg.online === false) { this.offline = true; Toasts.show('Online play is turned off right now.', [], 3500); this.time.delayedCall(0, () => { try { if (typeof Online !== 'undefined' && Online.current) Online.leave && Online.leave(); } catch (e) { /* none */ } this.scene.start('Main'); }); return; } return cr.apply(this, a); };
    const up = C.prototype.update; if (up) C.prototype.update = function (...a) { if (this.offline) return; return up.apply(this, a); }; }
  const oc = GameCfg.onChange; GameCfg.onChange = function (...a) { if (oc) oc.apply(this, a); PlayWhere.apply(); const g = window.voltGame && voltGame.scene; if (g && g.isActive('Main')) { const sc = g.getScene('Main'); if (sc.redraw) sc.redraw(); } if (this.online === false && g && ['BRQueue', 'OnlineMenu', 'JoinCode'].some(k => g.isActive(k))) { Toasts.show('Online play was just turned off.', [], 3500); g.getScenes(true).forEach(s => g.stop(s.sys.settings.key)); g.start('Main'); } };
}
/* v14.3.13 📶 LAN matchmaking: the search says so, and the server only matches people on the same network */
{ const rq = Account.req.bind(Account); Account.req = function (method, path, body, ...rest) { if (path === '/mm/poll' && body && typeof body === 'object' && NetMode.lan()) body = { ...body, lan: true }; return rq(method, path, body, ...rest); }; }
