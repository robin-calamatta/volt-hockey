/* v14.3.3 Game modes on and off from the admin page (Game tab): Volt Hockey, Season, Practice, Volt Royale, all the minigames, or any one
   minigame. A mode that is off doesn't show anywhere: the lobby's modes and playlists, the minigame rows, the Minigame Mix, online rooms'
   game lists and the online menu. The game checks the switches when it starts, at every match, and every minute in the lobby; the server
   also refuses matchmaking for a mode that's off. (gameOn() is in modes.js.) */
{ const ok = brAllowed; brAllowed = function (...a) { return gameOn('br') && ok.apply(this, a); }; }   // (Volt Royale off: as if it wasn't there)
{ const base = PlayWhere.apply.bind(PlayWhere);
  PlayWhere.apply = function () {
    base(); const off = id => id === 'mini' ? !MINI_KINDS().some(k => k !== 'br' && gameOn(k)) : ['hockey', 'season', 'practice', 'br'].includes(id) && !gameOn(id);
    for (let i = LOBBY_MODES.length - 1; i >= 0; i--) if (off(LOBBY_MODES[i].id)) LOBBY_MODES.splice(i, 1);
    if (!LOBBY_MODES.some(m => m.id === Settings.lobbyMode) && LOBBY_MODES[0]) Settings.lobbyMode = LOBBY_MODES[0].id;
    if (Settings.lobbyMini && !gameOn(Settings.lobbyMini)) Settings.lobbyMini = '';
  };
  const ss = brSync; brSync = function (...a) { const r = ss.apply(this, a); if (!gameOn('br')) { const i = LOBBY_MODES.findIndex(m => m.id === 'br'); if (i >= 0) LOBBY_MODES.splice(i, 1); } return r; };
}
/* switches changed while you're in the lobby: redraw it */
GameCfg.onChange = () => { try { const g = voltGame.scene; if (g.isActive('Main')) { PlayWhere.apply(); const M = g.getScene('Main'); if (!M.overlay) M.redraw(); } } catch (e) { /* not ready */ } };
setInterval(() => { try { if (voltGame.scene.isActive('Main')) GameCfg.load(); } catch (e) { /* not ready */ } }, 60000);
{ const P = LobbyHomeScene.prototype, cr = P.create; P.create = function (...a) { GameCfg.load(); return cr.apply(this, a); }; }
/* a minigame setup or queue for a mode that's off (an old link, a saved choice): back to the lobby */
{ const P = MiniSetupScene.prototype, cr = P.create; P.create = function (...a) { if (this.kind && !gameOn(this.kind)) { Toasts.show('That game is turned off right now.', [], 3000); this.scene.start('Main'); return; } return cr.apply(this, a); }; }
{ const P = BRQueueScene.prototype, cr = P.create; P.create = function (...a) { const r = cr.apply(this, a); const id = this.mode === 'mini' ? null : this.mode; if ((id && !gameOn(id)) || (this.mode === 'mini' && !BRQ.mixKinds().length)) { this.err = 'That playlist is turned off right now.'; this.draw(); } return r; }; }
