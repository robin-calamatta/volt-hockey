/* Player-adjustable settings, saved in the browser. */
const Settings = {
  storageKey: 'voltHockeySettings',
  musicVolume: 0.35, sfxVolume: 0.7, turnSpeed: 1, timeSpeed: 1,
  difficulty: 'Normal', teamA: 0, teamB: 1, vertical: true, zoomPct: 100, tiltDeg: 40, commentVolume: 1, crowdVolume: 0.8, crowd: true, court: 0, commentaryMode: 'full', view: 'nhl', seasonTeam: 0, seasonPeriod: 300, seasonDouble: false, seasonDifficulty: 'Normal', playerName: '', career: { games: 0, wins: 0, goals: 0, shots: 0 },
  autoFullscreen: true, touchScale: 1, touchOpacity: 0.6, touchLayout: null,          // on-screen controller (touch.js); `touch` itself starts undefined = on for phones and tablets
  ...CONFIG.defaults,            // speedLevel, ballBounce, ballGrip, stickLength, collisions, penalties

  load() { let saved = {}; try { saved = JSON.parse(localStorage.getItem(this.storageKey) || '{}'); Object.assign(this, saved); } catch (e) {} if (!saved.view) this.view = saved.vertical === false ? 'side' : 'nhl'; this.vertical = this.view === 'nhl'; this.collisions = CONFIG.defaults.collisions;   // cart collisions always start on
    this.migrate(saved); this.fixCam(); this.adapt = true; },   // the CPU always keeps learning (no off switch since v10)
  migrate(saved) {                                    // older saves (this device's or the account's): v9.2 starts carts at full power (5), third person off until turned on
    const v = saved.settingsVer | 0; if (v >= 3) return;
    if (v < 2) { this.speedLevel = CONFIG.defaults.speedLevel; this.allowThird = false; }
    this.allowBroadcast = false; this.settingsVer = 3; this.fixCam(); this.save();             // v9.3: broadcast off by default too
  },
  camAllowed(m) { return (m !== 'third' || this.allowThird) && (m !== 'broadcast' || this.allowBroadcast); },
  camCycle() { return CONFIG.view3d.cycle.filter(m => this.camAllowed(m)); },                          // the views the camera button steps through
  fixCam() { if (!this.camCycle().includes(this.camMode)) this.camMode = 'first'; },
  setThird(on) { this.allowThird = !!on; this.fixCam(); this.save(); },
  setBroadcast(on) { this.allowBroadcast = !!on; this.fixCam(); this.save(); },
  setView(v) { this.view = v; this.vertical = v === 'nhl'; this.save(); },
  save() { try { localStorage.setItem(this.storageKey, JSON.stringify(this)); } catch (e) {} if (typeof Account !== 'undefined') Account.changed(); },   // logged in: also saved online

  adjust(key, dir) {
    const r = CONFIG.ranges[key];
    const v = Math.round((this[key] + dir * r.step) / r.step) * r.step;
    this[key] = Math.min(r.max, Math.max(r.min, v));
    this.save(); Sound.applyVolumes();
  },
  cycleDifficulty(dir) {
    const names = Object.keys(CONFIG.difficulties), i = names.indexOf(this.difficulty);
    this.difficulty = names[(i + dir + names.length) % names.length]; this.save();
  },
  // Online: the host's physics settings apply to everyone. Held in memory only (never saved) and undone when leaving the room.
  rulesKeys: ['lockCart', 'turnSpeed', 'stickLength', 'ballBounce', 'ballGrip', 'ballFriction', 'collisions', 'penalties', 'penaltySeconds', 'penaltyCarry', 'timeSpeed', 'speedCap'],
  rules() { return Object.fromEntries(this.rulesKeys.map(k => [k, this[k]])); },
  applyRules(r) { if (!this.savedRules) this.savedRules = this.rules(); for (const k of this.rulesKeys) if (k in r) this[k] = r[k]; },
  restoreRules() { if (this.savedRules) { for (const k of this.rulesKeys) this[k] = this.savedRules[k]; this.savedRules = null; } },
  maxSpeed() { return CONFIG.speedLevels[Math.max(1, Math.min(CONFIG.speedLevels.length, this.speedCap || CONFIG.speedLevels.length)) - 1]; },     // the host's top-speed lock, as a fraction of chair.maxSpeed
  // Player names: pick a preset (left / right) or type your own. Shown above the cart in play and in the online roster.
  cleanName(t) { return String(t === undefined || t === null ? '' : t).replace(/[^\w .'\-!]/g, '').replace(/\s+/g, ' ').trim().slice(0, CONFIG.nameMax); },
  nameChoices(cur) { const l = CONFIG.playerNames.slice(); if (cur && !l.includes(cur)) l.unshift(cur); return l; },
  nextName(cur, d, taken = []) {                                  // step through the presets (skipping names another local player has)
    const l = this.nameChoices(cur); let i = Math.max(0, l.indexOf(cur));
    for (let n = 0; n < l.length; n++) { i = (i + d + l.length) % l.length; if (!taken.includes(l[i])) break; }
    return l[i];
  },
  askName(cur, done, src) {                                      // open the on-screen name entry over whatever scene is showing; calls done(name) when confirmed
    const g = window.voltGame; if (!g) return; const under = g.scene.getScenes(true).filter(s => s.sys.settings.key !== 'NameEntry').pop();
    if (under) g.scene.pause(under.sys.settings.key);
    g.scene.run('NameEntry', { initial: cur, done, src, under: under && under.sys.settings.key });
  },
  record(match, sides) {                                         // end of a match with people in it: add to their career totals (sides: the sides people played on)
    const k = this.career = Object.assign({ games: 0, wins: 0, goals: 0, shots: 0 }, this.career); k.games++;
    for (const s of sides) { k.goals += match.score[s]; k.shots += (match.shots || [0, 0])[s]; if (match.score[s] > match.score[1 - s]) k.wins++; }
    this.save();
  },
  myName() { const on = typeof Account !== 'undefined' && Account.loggedIn; return (on && this.cleanName(this.displayName)) || (on ? Account.name : '') || this.cleanName(this.playerName); },   // logged in: your username, unless you've picked another name to play under (v13.6.1)
  setMyName(n) { const c = this.cleanName(n); if (!c) return; if (typeof Account !== 'undefined' && Account.loggedIn) this.displayName = c === Account.name ? '' : c; else this.playerName = c; this.save(); },
  toggle(key) { this[key] = !this[key]; this.save(); },
  // key is 'teamA' or 'teamB'; skips the team the other side already uses.
  cycleTeam(key, dir) {
    const other = key === 'teamA' ? this.teamB : this.teamA;
    let i = this[key];
    do { i = (i + dir + TEAMS.length) % TEAMS.length; } while (i === other);
    this[key] = i; this.save();
  }
};
/* v14.1.5: cart speed modes are gone: every cart always runs at full speed (old saves and hosts can't turn it down) */
for (const k of ['speedLevel', 'speedCap']) Object.defineProperty(Settings, k, { get: () => CONFIG.speedLevels.length, set() {}, enumerable: true, configurable: true });
Settings.maxSpeed = () => 1;
