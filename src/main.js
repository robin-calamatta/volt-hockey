/* Entry point: loads settings, sets up input, starts Phaser. Add new scenes to the list below. */
Settings.load(); Learn.load();
(function localPeerServer() {                              // ?peer=local: use the PeerJS server built into server/dev-server.mjs (testing on one machine)
  try { if (new URLSearchParams(location.search).get('peer') === 'local') CONFIG.online.peerServer = { host: location.hostname, port: +location.port || (location.protocol === 'https:' ? 443 : 80), path: '/peerjs', secure: location.protocol === 'https:' }; } catch (e) { /* no location */ }
})();
Account.on(() => { Voice.refresh(); Chat.refresh(); });
Account.init();                                             // log back in if you were (works offline too)
Controls.init(); TouchPad.init();
MUSIC_READY = scanMusic();                                  // looks for your music files in the background, never blocks start-up

const SCENES = [BootScene, TitleScene, MainMenuScene, SettingsScene, SettingsPageScene, ControlsGuideScene, SetupScene, LobbyScene, GameScene, PreviewScene, CameraPageScene, PauseScene, OnlineMenuScene, BrowseScene, JoinCodeScene, RoomScene, NameEntryScene, JoinMenuScene, SeasonMenuScene, SeasonSetupScene, SeasonHubScene, StandingsScene, GamesScene, BracketScene, TrophyScene, HistoryScene, SocialScene, FriendScene, LeaderboardScene];

/* Phaser stops its whole loop if a scene throws, which looks like a freeze. Catch it, keep running, and tell the player with a small toast that can be dismissed
   (the full error is always in the browser console, F12). "Details" shows it on screen so it can be copied and sent to whoever looks after the game. */
const crashLog = { last: '', at: 0, count: 0 };
function toast(where, error) {
  const text = `${where}\n${error && error.stack || error}`, now = Date.now();
  if (text === crashLog.last && now - crashLog.at < 6000) { crashLog.count++; crashLog.at = now; const c = document.getElementById('toastCount'); if (c) c.textContent = crashLog.count > 1 ? ' (x' + crashLog.count + ')' : ''; return; }   // the same error every frame: one toast, not hundreds
  crashLog.last = text; crashLog.at = now; crashLog.count = 1;
  let box = document.getElementById('crash'); if (box) box.remove();
  box = document.createElement('div'); box.id = 'crash';
  box.style.cssText = 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);max-width:min(720px,94vw);background:#3a1216;color:#fff;font:15px system-ui,sans-serif;z-index:99;border:1px solid #ff6b6b;border-radius:10px;padding:10px 14px;box-shadow:0 6px 24px rgba(0,0,0,.5)';
  const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:10px;align-items:center';
  const msg = document.createElement('span'); msg.style.flex = '1'; msg.innerHTML = 'An error has occurred. Please check the console (F12) or report it to the admin.<span id="toastCount"></span>';
  const mkBtn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'background:#5a2a30;color:#fff;border:1px solid #ff9b9b;border-radius:6px;padding:4px 10px;cursor:pointer;font:inherit'; b.onclick = e => { e.stopPropagation(); fn(); }; return b; };
  const pre = document.createElement('pre'); pre.style.cssText = 'display:none;max-height:36vh;overflow:auto;margin:8px 0 0;font:12px monospace;white-space:pre-wrap;user-select:text'; pre.textContent = text;
  row.append(msg, mkBtn('Details', () => { pre.style.display = pre.style.display === 'none' ? 'block' : 'none'; }), mkBtn('Copy', () => { try { navigator.clipboard.writeText(text); } catch (e) {} }), mkBtn('✕', () => box.remove()));
  box.append(row, pre); document.body.append(box);
  clearTimeout(crashLog.timer); crashLog.timer = setTimeout(() => { if (pre.style.display === 'none') box.remove(); }, 12000);        // goes away by itself unless you are reading the details
}
function reportCrash(where, error) { console.error('Crash in ' + where, error); toast('Something broke in ' + where, error); }
addEventListener('error', e => { console.error(e.error || e.message); toast('Script error', e.error || e.message); });
addEventListener('unhandledrejection', e => { console.error(e.reason); toast('Unhandled promise', e.reason); });
for (const Scene of SCENES) for (const fn of ['create', 'update']) {
  const original = Object.prototype.hasOwnProperty.call(Scene.prototype, fn) && Scene.prototype[fn];
  if (original) Scene.prototype[fn] = function (...args) { try { return original.apply(this, args); } catch (e) { reportCrash(`${Scene.name}.${fn}`, e); } };
}

// Phaser re-draws a Text's whole canvas every time setColor / setFontSize is called, even with the same value, and the menus call them
// every frame. On a phone (or any slow GPU) that starves the page's network callbacks, which made hosting a public room fail to answer
// the room list. Skip the calls that change nothing.
(function skipNoOpTextStyle() {
  const T = Phaser.GameObjects.Text.prototype;
  for (const [name, key] of [['setColor', '__color'], ['setFontSize', '__fontSize']]) {
    const original = T[name]; T[name] = function (v) { if (this[key] === v) return this; this[key] = v; return original.call(this, v); };
  }
})();

// Wait a moment for the web font so the first screen is drawn with it (offline or slow: carry on with the fallback font).
const fontReady = document.fonts && document.fonts.load ? Promise.race([document.fonts.load('700 40px "Barlow Condensed"'), new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
fontReady.catch(() => {}).then(() => {
  window.voltGame = new Phaser.Game({
    type: Phaser.AUTO, width: CONFIG.view.width, height: CONFIG.view.height, backgroundColor: '#0d151b', transparent: true,   // see-through so the 3D view (view3d.js) shows underneath; the page itself is the dark background
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, parent: 'stage', width: CONFIG.view.width, height: CONFIG.view.height },
    loader: { imageLoadType: 'HTMLImageElement' },            // lets logos load even when opened straight from disk
    scene: SCENES
  });
});

// iOS home-screen apps often report a stale window size at launch (or after rotating), which leaves the game tiny.
// The stage div always fills the real visible area; we re-fit the game whenever the size could have changed.
(function keepFitted() {
  const stage = document.getElementById('stage');
  const fit = () => {
    const vv = window.visualViewport, w = Math.round(vv ? vv.width : innerWidth), h = Math.round(vv ? vv.height : innerHeight);
    stage.style.width = w + 'px'; stage.style.height = h + 'px';
    if (window.voltGame && voltGame.scale && voltGame.canvas) { try { voltGame.scale.refresh(); } catch (e) {} }   // (not before Phaser has made its canvas)
    if (window.TouchPad && TouchPad.place) TouchPad.place();
  };
  const later = () => { fit(); for (const t of [100, 300, 700, 1500]) setTimeout(fit, t); };
  addEventListener('resize', later); addEventListener('orientationchange', later); addEventListener('pageshow', later); addEventListener('load', later);
  if (window.visualViewport) visualViewport.addEventListener('resize', later);
  setInterval(fit, 2000);                                   // cheap safety net
  later();
})();
