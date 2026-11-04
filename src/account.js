/* Your account (optional). Play as a guest and everything is kept in this browser only, as before.
   Log in and your preferences, career, current season and hall of fame are saved online (server/core.mjs), so they come back on any device,
   and you appear on the global leaderboard, can add friends, message them, party up and use text / voice chat.
   The server address: CONFIG.server.url ('' = the same site the game is served from, e.g. your Netlify site; set it when the game is
   embedded elsewhere, like a Wix page), or ?server=https://... on the game's address. */
const Account = {
  key: 'voltHockeyAccount', user: null, token: null, ready: false, lastError: '', pushTimer: null, progressTimer: null, lastProgress: '', listeners: new Set(),
  // These settings belong to the device, not the player, so they are not synced.
  deviceKeys: ['storageKey', 'touch', 'touchLayout', 'touchScale', 'touchOpacity', 'autoFullscreen', 'gfx', 'micId', 'speakerId', 'career', 'savedRules', 'playerName'],

  base() {
    let u = ''; try { u = new URLSearchParams(location.search).get('server') || ''; } catch (e) { /* no location */ }
    u = u || (CONFIG.server && CONFIG.server.url) || '';
    if (u) return u.replace(/\/+$/, '');
    return /^https?:/.test(location.protocol) ? '' : null;            // opened from a file: no server to talk to
  },
  available() { return this.base() !== null; },
  get loggedIn() { return !!(this.user && this.token); },
  get name() { return this.user ? this.user.name : ''; },
  get adult() { return !!(this.user && this.user.adult); },
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit() { for (const fn of this.listeners) { try { fn(); } catch (e) { console.error(e); } } },

  async req(method, path, body, query) {
    if (!this.available()) throw new Error('Online services are not available here.');
    const q = query ? '?' + new URLSearchParams(query) : '', headers = { 'content-type': 'application/json' };
    if (this.token) headers.authorization = 'Bearer ' + this.token;
    let res; try { res = await fetch(this.base() + '/api' + path + q, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' }); }
    catch (e) { throw Object.assign(new Error('Could not reach the server. Check your connection.'), { status: 0 }); }
    let data = null; try { data = await res.json(); } catch (e) { data = null; }
    if (!data && !res.ok) throw Object.assign(new Error(res.status === 404 ? "The game's online services aren't on this site yet (the Netlify Function isn't deployed). See DEPLOY.md." : 'The server had a problem (' + res.status + '). Please try again in a moment.'), { status: res.status });
    data = data || {};
    if (!res.ok) { if (res.status === 401 && this.token && path !== '/login') this.dropLogin(); throw Object.assign(new Error(data.error || 'Server error (' + res.status + ').'), { status: res.status }); }
    return data;
  },

  /* ---- start-up ---- */
  async init() {
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ask the browser not to clear this site's saves */ }
    let saved = null; try { saved = JSON.parse(localStorage.getItem(this.key) || 'null'); } catch (e) { saved = null; }
    if (saved && saved.token && this.available()) {
      this.token = saved.token; this.user = saved.user || null; this.emit();             // optimistic: you stay logged in while offline
      try { const r = await this.req('GET', '/me'); this.user = r.user; this.persist(); this.applyServer(r.prefs, r.progress); }
      catch (e) { this.lastError = e.message; }
    }
    this.ready = true; this.emit();
    this.loadIce();
    if (this.loggedIn && typeof Social !== 'undefined') Social.start();
  },
  persist() { try { localStorage.setItem(this.key, JSON.stringify(this.loggedIn ? { token: this.token, user: this.user } : null)); } catch (e) { /* storage blocked */ } },
  dropLogin() { this.token = null; this.user = null; this.persist(); if (typeof Social !== 'undefined') Social.stop(); this.emit(); },

  /* ---- logging in and out ---- */
  async register(username, password, age, email) { const r = await this.req('POST', '/register', { username, password, age, email }); await this.begin(r, true); return r; },
  requestReset(who) { return this.req('POST', '/reset/request', { who, origin: location.origin }); },             // emails a reset link
  async confirmReset(token, password) { const r = await this.req('POST', '/reset/confirm', { token, password }); await this.begin(r, false); return r; },
  async setEmail(email, password) { const r = await this.req('POST', '/email', { email, password }); this.user = r.user; this.persist(); this.emit(); return r; },
  async login(username, password) { const r = await this.req('POST', '/login', { username, password }); await this.begin(r, false); return r; },
  async begin(r, fresh) {
    this.token = r.token; this.user = r.user; this.persist();
    if (!fresh && (r.prefs || r.progress)) this.applyServer(r.prefs, r.progress);    // the account's saves win over this device's
    else { this.pushPrefs(); this.pushProgress(true); }                              // a new account (or one with nothing saved) takes this device's progress
    if (typeof Social !== 'undefined') Social.start();
    this.emit();
  },
  async logout() { try { await this.req('POST', '/logout', {}); } catch (e) { /* offline: forget it locally anyway */ } this.dropLogin(); },
  async changePassword(old, password) { return this.req('POST', '/password', { old, password }); },

  /* ---- keeping saves in step ---- */
  applyServer(prefs, progress) {
    this.applying = true;
    try {
      if (prefs && typeof prefs === 'object') { for (const [k, v] of Object.entries(prefs)) if (!this.deviceKeys.includes(k) && typeof v !== 'function') Settings[k] = v; Settings.migrate(prefs); Settings.fixCam(); Settings.save(); Sound.applyVolumes && Sound.applyVolumes(); }
      if (progress && typeof progress === 'object') {
        if (progress.career) { Settings.career = progress.career; Settings.save(); }
        try { if (progress.season) localStorage.setItem(Season.key, JSON.stringify(progress.season)); else localStorage.removeItem(Season.key); } catch (e) { /* storage blocked */ }
        try { localStorage.setItem(Season.historyKey, JSON.stringify(Array.isArray(progress.history) ? progress.history : [])); } catch (e) { /* storage blocked */ }
        this.lastProgress = JSON.stringify(this.progressNow());
      }
    } finally { this.applying = false; }
  },
  prefsNow() { const out = {}; for (const [k, v] of Object.entries(Settings)) if (typeof v !== 'function' && !this.deviceKeys.includes(k)) out[k] = v; return out; },
  progressNow() { return { career: Settings.career || null, season: Season.load(), history: Season.history() }; },
  changed() { if (!this.loggedIn || this.applying) return; clearTimeout(this.pushTimer); this.pushTimer = setTimeout(() => { this.pushPrefs(); this.pushProgress(); }, 1500); },   // called by Settings.save and Season.save
  async pushPrefs() { if (!this.loggedIn) return; try { await this.req('PUT', '/prefs', { prefs: this.prefsNow() }); } catch (e) { this.lastError = e.message; } },
  async pushProgress(force) {
    if (!this.loggedIn) return; const p = this.progressNow(), json = JSON.stringify(p); if (!force && json === this.lastProgress) return;
    try { await this.req('PUT', '/progress', p); this.lastProgress = json; } catch (e) { this.lastError = e.message; }
  },
  /* A TURN relay the site owner set up (ICE_SERVERS in Netlify): lets voice and parties connect on strict networks. */
  async loadIce() { try { const r = await this.req('GET', '/ice'); if (Array.isArray(r.iceServers) && r.iceServers.length) CONFIG.online.iceServers = [...CONFIG.online.iceServers, ...r.iceServers]; } catch (e) { /* none */ } },
  leaderboard() { return this.req('GET', '/leaderboard'); }
};
