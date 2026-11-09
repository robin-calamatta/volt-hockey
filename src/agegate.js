/* v14: Volt Royale is only for players 16 or over (from the age given at sign-up), or players an admin has let in
   (admin page: "Allowed to play Volt Royale"). Everyone else never sees it: not in the lobby's modes, not in the
   minigame lists, not in the online room's games, not in the public room list, and a party or room that starts
   Volt Royale sends them back out. Not logged in: no Volt Royale (we don't know your age). */
function brAllowed() { return typeof Account !== 'undefined' && Account.loggedIn && !!(Account.user && Account.user.br); }
const BR_LOBBY_MODE = LOBBY_MODES.find(x => x.id === 'br'), BR_LOBBY_AT = LOBBY_MODES.indexOf(BR_LOBBY_MODE);
function brSync() {
  const ok = brAllowed(), i = LOBBY_MODES.indexOf(BR_LOBBY_MODE);
  if (ok && i < 0) LOBBY_MODES.splice(Math.min(BR_LOBBY_AT, LOBBY_MODES.length), 0, BR_LOBBY_MODE);
  if (!ok && i >= 0) LOBBY_MODES.splice(i, 1);
  if (!ok && Settings.lobbyMode === 'br') Settings.lobbyMode = LOBBY_MODES[0].id;
  if (GAME_INFO.br && Object.getOwnPropertyDescriptor(GAME_INFO, 'br').enumerable !== ok) Object.defineProperty(GAME_INFO, 'br', { value: GAME_INFO.br, enumerable: ok, configurable: true, writable: true });   // (hidden from every list of games)
}
brSync();
{ const P = LobbyHomeScene.prototype, cr = P.create, up = P.update; P.create = function (...a) { brSync(); return cr.apply(this, a); }; P.update = function (...a) { if (this.game.loop.frame % 30 === 0) { const had = LOBBY_MODES.includes(BR_LOBBY_MODE); brSync(); if (had !== LOBBY_MODES.includes(BR_LOBBY_MODE) && this.redraw) this.redraw(); } return up.apply(this, a); }; }
{ const P = MiniSetupScene.prototype, cr = P.create; P.create = function (...a) { if (this.kind === 'br' && !brAllowed()) { this.scene.start('Main'); return; } return cr.apply(this, a); }; }
{ const P = GameScene.prototype, cr = P.create; P.create = function (...a) { const d = this.setup || {}, mi = d.mini || (this.online && this.online.match && this.online.match.mini); if (mi && mi.kind === 'br' && !brAllowed() && !this.demo) { this.scene.start('Main'); return; } return cr.apply(this, a); }; }
{ const P = RoomScene.prototype, up = P.update; P.update = function (...a) { const S = this.session; if (S && S.cfg && S.cfg.mini && S.cfg.mini.kind === 'br' && !brAllowed()) { if (this.role === 'host') S.setConfig({ mini: null, practice: false }); else { this.exit('This room is playing Volt Royale, which needs an account that is 16 or over.'); return; } } return up.apply(this, a); }; }
