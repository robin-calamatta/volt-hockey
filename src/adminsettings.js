/* v14.3.12 settings: back to defaults, and the admin's defaults and locks.
   - Every settings page has "↺ Back to defaults" (press it twice: the first press asks), which puts that page's settings back to their
     starting values; the main SETTINGS menu has one for everything. Your name, career, account and touch-button layout are kept.
   - In the admin page (Game tab > Player settings) the admin can give any of the listed settings a different starting value, and lock
     it: a locked setting is the same for everyone and shows 🔒 in the menus (it can't be changed there). A new starting value moves
     players who still had the old starting value; anyone who had picked their own keeps it (unless it's locked).
   How a menu row is matched to its settings: while a row's text is worked out, every setting it reads is noted (that's the row's keys). */
const SET_KEEP = ['storageKey', 'playerName', 'career', 'touchLayout', 'touchLayoutP', 'touch', 'seasonTeam', 'teamA', 'teamB', 'settingsVer', 'adminSeen', 'lobbyMode', 'lobbyMini', 'playOnline', 'netLan', 'mg', 'modes'];
const SET_FACTORY = (() => { const o = {}; for (const k of Object.keys(Settings)) { const d = Object.getOwnPropertyDescriptor(Settings, k); if (!d || d.get || typeof d.value === 'function' || SET_KEEP.includes(k)) continue; try { o[k] = JSON.parse(JSON.stringify(d.value)); } catch (e) { /* skip */ } } return o; })();
const AdminSettings = {
  locks: {},
  cfg() { return (typeof GameCfg !== 'undefined' && GameCfg.settings) || {}; },
  def(k) { const a = this.cfg()[k]; return a && a.def !== undefined ? a.def : SET_FACTORY[k]; },
  locked(k) { const a = this.cfg()[k]; return !!(a && a.lock); },
  /* the admin's numbers, applied whenever they arrive */
  apply() {
    const C = this.cfg(), seen = Settings.adminSeen || (Settings.adminSeen = {}); let changed = false;
    for (const [k, a] of Object.entries(C)) { if (SET_KEEP.includes(k) || !a || a.def === undefined) continue;
      const was = k in seen ? seen[k] : SET_FACTORY[k];
      if (JSON.stringify(seen[k]) !== JSON.stringify(a.def)) { if (JSON.stringify(Settings[k]) === JSON.stringify(was) && !this.locks[k]) { Settings[k] = a.def; changed = true; } seen[k] = a.def; changed = true; } }
    /* locks: the setting reads the admin's value and ignores changes */
    for (const k of Object.keys(this.locks)) if (!this.locked(k)) { const v = Settings[k]; delete Settings[k]; Settings[k] = v; delete this.locks[k]; changed = true; }
    for (const k of Object.keys(C)) if (this.locked(k) && !this.locks[k] && !SET_KEEP.includes(k)) { const v = this.def(k); this.locks[k] = 1; Object.defineProperty(Settings, k, { get: () => (AdminSettings.rec && AdminSettings.rec.add(k), v), set() {}, enumerable: true, configurable: true }); changed = true; }
    if (changed) { try { if (Settings.fixCam) Settings.fixCam(); if (typeof Sound !== 'undefined' && Sound.applyVolumes) Sound.applyVolumes(); Settings.save(); } catch (e) { /* later */ } }
  },
  /* which settings a menu row reads */
  keysOf(row) {
    const rec = this.rec = new Set(), saved = {};
    for (const k of [...Object.keys(SET_FACTORY), 'gfx']) { const d = Object.getOwnPropertyDescriptor(Settings, k) || { value: undefined }; if (d.get) continue; let v = d.value; saved[k] = 1; Object.defineProperty(Settings, k, { get() { rec.add(k); return v; }, set(x) { v = x; }, enumerable: true, configurable: true }); }
    try { if (row.label) row.label(); } catch (e) { /* ignore */ }
    for (const k of Object.keys(saved)) { const v = Settings[k]; delete Settings[k]; Settings[k] = v; }
    this.rec = null; return [...rec];
  },
  reset(keys) {
    for (const k of keys) { if (SET_KEEP.includes(k) || this.locks[k] || !(k in SET_FACTORY || k in AdminSettings.cfg() || k === 'gfx')) continue; const d = this.def(k); Settings[k] = d === undefined ? undefined : JSON.parse(JSON.stringify(d)); }
    try { if (Settings.fixCam) Settings.fixCam(); if (typeof Sound !== 'undefined' && Sound.applyVolumes) Sound.applyVolumes(); } catch (e) { /* ok */ } Settings.save();
  }
};
/* the menus: locked rows show 🔒 and can't be changed; a "back to defaults" row above Back */
{ const P = ListMenuScene.prototype, bm = P.buildMenu;
  P.buildMenu = function (title, items, ...rest) {
    const key = this.sys.settings.key, isPage = key === 'SettingsPage' || key === 'CameraPage', isMain = key === 'Settings';
    if (!isPage && !isMain) return bm.call(this, title, items, ...rest);
    let pageKeys = []; const out = [];
    for (const it of items) { if (!it || /^Back$/.test(String(it.label ? (() => { try { return it.label(); } catch (e) { return ''; } })() : ''))) { out.push(it); continue; }
      const ks = isPage ? AdminSettings.keysOf(it) : []; pageKeys.push(...ks);
      if (ks.some(k => AdminSettings.locked(k))) out.push({ ...it, label: () => { const s = it.label(); return s.replace(/ {3}◀ (.*) ▶$/, '   $1') + '   🔒'; }, change: undefined, select: undefined, hint: 'Set for everyone by the game: it can\'t be changed here' });
      else out.push(it); }
    if (isMain) for (const name of SETTINGS_ORDER) { if (name === 'Camera and graphics') continue; try { for (const it of SETTINGS_PAGES[name](this)) pageKeys.push(...AdminSettings.keysOf(it)); } catch (e) { /* skip */ } }
    if (isMain) pageKeys.push('camMode', 'allowThird', 'allowBroadcast', 'fov3d', 'chaseDist', 'brCamDist', 'gfx', 'zoomPct', 'tiltDeg', 'view', 'vertical');
    pageKeys = [...new Set(pageKeys)].filter(k => !SET_KEEP.includes(k));
    let armed = 0; const row = { label: () => armed > performance.now() ? '↺ Press again to put them back' : (isMain ? '↺ Reset all settings to defaults' : '↺ Back to defaults (this page)'),
      hint: isMain ? 'Every setting back to how it started (your name, career and touch buttons stay)' : 'This page\'s settings back to how they started',
      select: () => { if (armed > performance.now()) { AdminSettings.reset(pageKeys); Sound.play('select'); Toasts.show(isMain ? 'All settings are back to their defaults.' : 'This page is back to its defaults.', [], 2500); armed = 0; this.scene.restart(); } else { armed = performance.now() + 3000; Sound.play('blip'); } } };
    if (pageKeys.length) { const bi = out.findIndex(it => it && it.label && (() => { try { return it.label() === 'Back'; } catch (e) { return false; } })()); out.splice(bi >= 0 ? bi : out.length, 0, row); }
    return bm.call(this, title, out, ...rest);
  };
}
