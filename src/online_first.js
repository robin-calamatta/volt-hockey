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
  online() { return Settings.playOnline !== false; },
  set(on) { if (this.online() === !!on) return; Settings.playOnline = !!on; Settings.save(); this.apply(); Sound.play('select'); },
  init() {
    if (this.base) return; this.base = LOBBY_MODES.slice(); if (typeof BR_LOBBY_MODE !== 'undefined' && !this.base.includes(BR_LOBBY_MODE)) this.base.push(BR_LOBBY_MODE);
    for (const M of this.base) { M.local = { name: M.name, sub: M.sub, icon: M.icon, opts: M.opts }; const g = M.go;
      if (this.QUEUED.includes(M.id)) M.go = sc => this.online() ? this.queue(sc, M.id) : g(sc); }
  },
  apply() {
    this.init(); const on = this.online(), get = id => this.base.find(m => m.id === id);
    LOBBY_MODES.splice(0, LOBBY_MODES.length, ...(on ? ['br', 'hockey', 'mini', 'online'] : ['hockey', 'br', 'mini', 'season', 'practice']).map(get).filter(Boolean));
    if (typeof brSync === 'function') brSync();                              // (Volt Royale only for 16 and over)
    for (const M of this.base) Object.assign(M, M.local, on ? this.ONLINE[M.id] || {} : {}, on && M.id === 'mini' ? { opts: undefined } : {});
    if (!LOBBY_MODES.some(m => m.id === Settings.lobbyMode)) Settings.lobbyMode = LOBBY_MODES[0].id;
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
  LobbyPick.squad = function (g) { if (g && g.id === 'online') return q.call(this, g); return q.call(this, g) + (PlayWhere.online() ? '   ·   ONLINE' : ''); };
}
{ const P = LobbyHomeScene.prototype, cr = P.create, dp = P.drawPlay, rd = P.redraw, up = P.update, mk = P.miniKinds, r0 = P.pickRow0, dm = P.drawModes;
  P.create = function (...a) { PlayWhere.apply(); return cr.apply(this, a); };
  /* the switch: two boxed halves across the top of the game card */
  P.drawPlay = function (...a) {
    const r = dp.apply(this, a); if (Party.role === 'member') return r;
    const x = 28, y = 478, w = 430, on = PlayWhere.online(), hw = 150, top = y - 46;
    this.box(x, top, hw * 2 + 8, 40, 0x05070f, 0.85, 0x2d5068, 11);
    [['🌐  ONLINE', true], ['🏠  THIS SCREEN', false]].forEach(([label, v], i) => { const bx = x + 4 + i * (hw + 4), sel = on === v;
      this.box(bx, top + 4, hw - 4, 32, sel ? (v ? 0x19c3ff : 0x7dff6a) : 0x101a28, sel ? 1 : 0.9, sel ? 0xffffff : 0x2d5068, 12);
      this.T(bx + (hw - 4) / 2, top + 20, label, 17, sel ? '#06121a' : '#c9d6df', { ox: 0.5, oy: 0.5, depth: 13 });
      this.tap(bx, top + 4, hw - 4, 32, () => { PlayWhere.set(v); this.redraw(); }, 14); });
    this.T(x + hw * 2 + 18, top + 20, '◀ ▶', 16, '#9fb2bf', { oy: 0.5, depth: 13 });
    return r;
  };
  P.redraw = function (...a) {
    const r = rd.apply(this, a);
    if (this.foot && this.foot.active && LOBBY_TABS[this.tab] === 'PLAY' && !this.overlay) this.foot.setText(`A  ${PlayWhere.online() ? 'find a match' : 'play'}      ◀ ▶  online / this screen      ▼  change mode      Y  emote      X  options      LB / RB  tabs      Start  menu`);
    if (this.localHint && this.localHint.active) this.localHint.setPosition(392, 452);   // (out of the switch's way)
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
      if (P0.left && !PlayWhere.online()) { PlayWhere.set(true); this.redraw(); } else if (P0.right && PlayWhere.online()) { PlayWhere.set(false); this.redraw(); }
    }
    return up.call(this, time, delta);
  };
}
