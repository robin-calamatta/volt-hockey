/* Your profile (v12): the look of your character and cart, XP and level, the Season 1 pass ("The Beginning", free rewards only for now),
   and daily / weekly quests that reset. Everything lives in Settings.profile, so it is saved like the rest of your settings (and online
   when you are logged in). Matches report what happened through Progress.tick() (every frame) and Progress.ev() (events). */
const COS = {
  outfits: [{ id: 'tee', name: 'Rookie Tee', icon: '👕', tier: 0 }, { id: 'jersey', name: 'Team Jersey', icon: '🎽', tier: 4 }, { id: 'hoodie', name: 'Cozy Hoodie', icon: '🧥', tier: 12 }],
  hats: [{ id: 'none', name: 'No hat', icon: '🚫', tier: 0 }, { id: 'cap', name: 'Ball Cap', icon: '🧢', tier: 0 }, { id: 'beanie', name: 'Beanie', icon: '🧶', tier: 2 }, { id: 'bucket', name: 'Bucket Hat', icon: '👒', tier: 6 },
    { id: 'headband', name: 'Sweatband', icon: '🎗️', tier: 9 }, { id: 'tophat', name: 'Top Hat', icon: '🎩', tier: 15 }, { id: 'crown', name: 'Volt Crown', icon: '👑', tier: 20, fixed: true }],
  faces: [{ id: 'smile', name: 'Smile', icon: '🙂', tier: 0 }, { id: 'grin', name: 'Big Grin', icon: '😁', tier: 1 }, { id: 'shades', name: 'Cool Shades', icon: '😎', tier: 3 }, { id: 'wink', name: 'Wink', icon: '😉', tier: 8 },
    { id: 'focus', name: 'Game Face', icon: '😤', tier: 10 }, { id: 'wow', name: 'Surprised', icon: '😮', tier: 13 }, { id: 'stars', name: 'Star Struck', icon: '🤩', tier: 17 }],
  decals: [{ id: 'none', name: 'No decal', icon: '🚫', tier: 0 }, { id: 'stripes', name: 'Racing Stripes', icon: '〰️', tier: 0 }, { id: 'bolt', name: 'Lightning', icon: '⚡', tier: 5 }, { id: 'flames', name: 'Flames', icon: '🔥', tier: 10 },
    { id: 'stars', name: 'Stars', icon: '⭐', tier: 14 }, { id: 'checker', name: 'Checkered', icon: '🏁', tier: 18 }],
  emojis: [...['😀', '😂', '😎', '👍', '👏', '🔥', '😮', '😢', '😡', '🎉', '🙏', '💯'].map(e => ({ id: e, name: e, icon: e, tier: 0 })),
    { id: '🤖', name: 'Robot', icon: '🤖', tier: 7 }, { id: '🏆', name: 'Trophy', icon: '🏆', tier: 11 }, { id: '💪', name: 'Flex', icon: '💪', tier: 16 }, { id: '🥶', name: 'Ice cold', icon: '🥶', tier: 19 }],
  colors: ['#e74c3c', '#ff8a3d', '#f2c200', '#7ed957', '#2ecc71', '#1abc9c', '#29b6f6', '#2f6fed', '#7b5cff', '#c44dff', '#ff5fa2', '#f4f4f2', '#8a8f96', '#22262b'],
  hair: ['#1d1611', '#3b2a1e', '#6b4a2b', '#a8743a', '#e0c070', '#c0392b', '#e8e8e8', '#4a6cff'],
  skin: ['#f6d3b3', '#e8b48a', '#d29a6c', '#b07a4f', '#8a5a36', '#5e3b22']
};
const SEASON1 = { name: 'Season 1', title: 'The Beginning', xpPerTier: 1000, tiers: 20, ends: '2027-03-01' };
const PASS = [];                                                          // tier -> its reward
for (const [slot, list] of [['outfit', COS.outfits], ['hat', COS.hats], ['face', COS.faces], ['decal', COS.decals], ['emoji', COS.emojis]]) for (const it of list) if (it.tier) PASS[it.tier] = { slot, ...it };
const LOOK0 = { outfit: 'tee', shirt: '#2f6fed', hat: 'cap', hatCol: '#e74c3c', face: 'smile', hair: '#3b2a1e', skin: '#e8b48a', decal: 'stripes' };
const WHEEL0 = ['😀', '😂', '👍', '🔥', '😎', '👏', '😮', '🎉'];

/* Quests: type = the event that moves them; n = how many. Daily: 3 a day from DAILY_Q. Weekly: 6 a week from WEEKLY_Q. */
const DAILY_Q = [
  { id: 'd_hockey', type: 'hockey', n: 1, xp: 400, text: 'Play a match of Volt Hockey' }, { id: 'd_hwin', type: 'hockeyWin', n: 1, xp: 500, text: 'Win a match of Volt Hockey' },
  { id: 'd_mini', type: 'mini', n: 1, xp: 300, text: 'Play a minigame to the end' }, { id: 'd_mini3', type: 'mini', n: 3, xp: 500, text: 'Play 3 minigames to the end' },
  { id: 'd_br', type: 'br', n: 1, xp: 400, text: 'Play a Battle Royale' }, { id: 'd_brkill', type: 'brKill', n: 2, xp: 500, text: 'Get 2 eliminations in Battle Royale' },
  { id: 'd_chest', type: 'chest', n: 3, xp: 400, text: 'Open 3 chests in Battle Royale' }, { id: 'd_prac', type: 'practiceSec', n: 120, xp: 300, text: 'Spend 2 minutes in the Practice Arena' },
  { id: 'd_goal', type: 'goal', n: 3, xp: 400, text: 'Score 3 goals in Volt Hockey' }, { id: 'd_pen', type: 'penalty', n: 1, xp: 300, text: 'Get sent to the sin bin (we won\'t tell)' },
  { id: 'd_dist', type: 'dist', n: 1000, xp: 300, text: 'Drive 1,000 m in any game' }, { id: 'd_jump', type: 'jump', n: 10, xp: 300, text: 'Jump or drop 10 times in Battle Royale' },
  { id: 'd_online', type: 'online', n: 1, xp: 500, text: 'Play an online match' }, { id: 'd_mwin', type: 'miniWin', n: 1, xp: 500, text: 'Win a minigame' },
  { id: 'd_paint', type: 'mini:paintball', n: 1, xp: 400, text: 'Play a game of Paintball' }, { id: 'd_emoji', type: 'emoji', n: 5, xp: 300, text: 'Send 5 emojis during matches' },
  { id: 'd_top3', type: 'brTop3', n: 1, xp: 600, text: 'Finish in the top 3 of a Battle Royale' }, { id: 'd_sgame', type: 'seasonGame', n: 1, xp: 400, text: 'Play a Season game' },
  { id: 'd_race', type: 'mini:race', n: 1, xp: 300, text: 'Finish a Race' }
];
const WEEKLY_Q = [
  { id: 'w_brwin', type: 'brWin', n: 1, xp: 2000, text: 'Win a Battle Royale' }, { id: 'w_br5', type: 'br', n: 5, xp: 1500, text: 'Play 5 Battle Royales' },
  { id: 'w_hwin3', type: 'hockeyWin', n: 3, xp: 1500, text: 'Win 3 matches of Volt Hockey' }, { id: 'w_mini10', type: 'mini', n: 10, xp: 1500, text: 'Play 10 minigames to the end' },
  { id: 'w_season', type: 'seasonDone', n: 1, xp: 3000, text: 'Play a full season of Volt Hockey' }, { id: 'w_kill10', type: 'brKill', n: 10, xp: 1500, text: 'Get 10 eliminations in Battle Royale' },
  { id: 'w_goal15', type: 'goal', n: 15, xp: 1500, text: 'Score 15 goals in Volt Hockey' }, { id: 'w_dmg', type: 'brDmg', n: 1000, xp: 1500, text: 'Deal 1,000 damage in Battle Royale' },
  { id: 'w_dist', type: 'dist', n: 10000, xp: 1200, text: 'Drive 10 km in any game' }, { id: 'w_mwin5', type: 'miniWin', n: 5, xp: 1500, text: 'Win 5 minigames' },
  { id: 'w_kinds', type: 'miniKind', n: 5, xp: 1500, text: 'Play 5 different minigames' }, { id: 'w_sgame3', type: 'seasonGame', n: 3, xp: 1500, text: 'Play 3 Season games' },
  { id: 'w_prac', type: 'practiceSec', n: 600, xp: 1200, text: 'Spend 10 minutes in the Practice Arena' }, { id: 'w_online3', type: 'online', n: 3, xp: 1500, text: 'Play 3 online matches' }
];

const Progress = {
  get P() {                                                               // the profile, created (and repaired) on first use
    const P = Settings.profile = Settings.profile && typeof Settings.profile === 'object' ? Settings.profile : {};
    P.look = Object.assign({}, LOOK0, P.look || {}); P.xp = +P.xp || 0; if (!Array.isArray(P.wheel) || P.wheel.length !== 8) P.wheel = WHEEL0.slice(); P.q = P.q || {}; P.done = +P.done || 0;
    return P;
  },
  level() { return 1 + Math.floor(this.P.xp / SEASON1.xpPerTier); },
  tier() { return Math.min(SEASON1.tiers, this.level()); },
  intoLevel() { return this.P.xp % SEASON1.xpPerTier; },
  owns(it) { return !it.tier || it.tier <= this.tier(); },
  look() { return this.P.look; },
  setLook(k, v) { this.P.look[k] = v; Settings.save(); },
  /* ---- quests ---- */
  dayKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
  weekStart(d = new Date()) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; },   // Monday
  pick(pool, n, key) { let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const r = Look.rnd(h % 2147483646 + 1), list = pool.slice(); for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list.slice(0, n); },
  quests() {                                                              // today's and this week's quests, with progress (a new day / week starts fresh)
    const P = this.P, dk = this.dayKey(), wk = 'W' + this.dayKey(this.weekStart());
    if (P.q.day !== dk) P.q = { ...P.q, day: dk, d: {} }; if (P.q.week !== wk) P.q = { ...P.q, week: wk, w: {}, kinds: [] };
    const mk = (list, store) => list.map(q => ({ ...q, got: Math.min(q.n, store[q.id] || 0), done: (store[q.id] || 0) >= q.n }));
    return { daily: mk(this.pick(DAILY_Q, 3, dk), P.q.d), weekly: mk(this.pick(WEEKLY_Q, 6, wk), P.q.w) };
  },
  untilReset() { const now = new Date(), t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), w = this.weekStart(); w.setDate(w.getDate() + 7); const f = ms => { const h = Math.floor(ms / 3600e3), m = Math.floor(ms / 60e3) % 60; return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`; }; return { daily: f(t - now), weekly: f(w - now) }; },
  ev(type, n = 1) {                                                       // something happened: move every quest that counts it
    if (!type || !(n > 0)) return; const Q = this.quests(), P = this.P; let changed = false;
    if (type.startsWith('miniKind:')) { const k = type.slice(9); if (P.q.kinds.includes(k)) return; P.q.kinds.push(k); type = 'miniKind'; }
    for (const [list, store] of [[Q.daily, P.q.d], [Q.weekly, P.q.w]]) for (const q of list) {
      if (q.type !== type || q.done) continue; const before = store[q.id] || 0; store[q.id] = Math.min(q.n, before + n); changed = true;
      if (store[q.id] >= q.n) { P.done++; this.addXp(q.xp, 'Quest complete: ' + q.text); }
    }
    if (changed && !['dist', 'practiceSec', 'brDmg'].includes(type)) Settings.save();
  },
  addXp(xp, why) {
    const before = this.tier(), lvBefore = this.level(); this.P.xp += xp; Settings.save();
    this.toast(`+${xp} XP`, why);
    if (this.level() > lvBefore) { const t = this.tier(), rw = t > before ? PASS[t] : null; this.toast(`LEVEL ${this.level()}!`, rw ? `Season pass reward unlocked: ${rw.name} ${rw.icon}` : SEASON1.name + ': ' + SEASON1.title, true); }
  },
  /* ---- pop-up notices (over any screen) ---- */
  toast(title, sub, big) {
    if (typeof document === 'undefined') return; let box = document.getElementById('vtoasts');
    if (!box) { box = document.createElement('div'); box.id = 'vtoasts'; box.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:50;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none;font-family:"Barlow Condensed",Impact,sans-serif'; document.body.appendChild(box); }
    const d = document.createElement('div'); d.style.cssText = `background:linear-gradient(90deg,#1b2a6b,#5b2bbf);color:#fff;border:2px solid #ffd23f;border-radius:10px;padding:${big ? '10px 22px' : '6px 16px'};box-shadow:0 6px 18px #0008;text-align:center;opacity:0;transform:translateY(-10px);transition:all .3s`;
    d.innerHTML = `<div style="font-size:${big ? 30 : 22}px;font-weight:800;color:#ffd23f;letter-spacing:1px"></div><div style="font-size:16px"></div>`; d.children[0].textContent = title; d.children[1].textContent = sub || '';
    box.appendChild(d); requestAnimationFrame(() => { d.style.opacity = '1'; d.style.transform = 'none'; });
    setTimeout(() => { d.style.opacity = '0'; d.style.transform = 'translateY(-10px)'; setTimeout(() => d.remove(), 400); }, big ? 4200 : 3000);
  },
  /* ---- reading a match (called every frame by GameScene) ---- */
  mine(sc) {                                                              // the people playing on this device
    const o = sc.online; if (!o) return (sc.setup && sc.setup.players) || [];
    return o.role === 'host' ? (o.players || []).filter(p => !p.remote) : ((o.sim && o.sim.locals) || []).map(L => L.me).filter(Boolean);
  },
  tick(sc, dt) {
    const m = sc.match; if (!m || sc.demo || sc.scene.key !== 'Game' || !sc.setup) return;
    const mine = this.mine(sc).filter(p => p && p.chair); if (!mine.length) return; const S = sc.prog || (sc.prog = { dist: 0, prac: 0, chairs: new Map(), score: m.score ? m.score.slice() : [0, 0] }), br = m.kind === 'br';
    if (m.state === 'play' || (!m.mini && m.state !== 'over')) {
      for (const p of mine) {
        const c = p.chair, k = S.chairs.get(c) || { x: c.x, y: c.y, bin: c.binLeft || 0, kills: 0, dmg: 0, air: 0 }; S.chairs.set(c, k);
        const d = Math.hypot(c.x - k.x, c.y - k.y); if (d < 3) S.dist += d; k.x = c.x; k.y = c.y;
        if ((c.binLeft || 0) > 0 && !(k.bin > 0)) this.ev('penalty'); k.bin = c.binLeft || 0;
        if (br && c.gs) { if (c.gs.kills > k.kills) this.ev('brKill', c.gs.kills - k.kills); k.kills = c.gs.kills; if (c.gs.dmg > k.dmg + 1) { this.ev('brDmg', Math.floor(c.gs.dmg - k.dmg)); k.dmg = Math.floor(c.gs.dmg); } if (c.gs.air && !k.air) this.ev('jump'); k.air = c.gs.air; }
      }
      if (S.dist >= 25) { const n = Math.floor(S.dist); S.dist -= n; this.ev('dist', n); }
      if (sc.setup.practice && !m.mini) { S.prac += dt; if (S.prac >= 1) { const n = Math.floor(S.prac); S.prac -= n; this.ev('practiceSec', n); } }
      if (!m.mini && m.score) { const sides = new Set(mine.map(p => p.side)); for (const s of sides) if (m.score[s] > S.score[s]) this.ev('goal', m.score[s] - S.score[s]); S.score = m.score.slice(); }
    }
    if (m.state === 'over' && !S.over) { S.over = true; this.matchOver(sc, m, mine); }
  },
  matchOver(sc, m, mine) {
    const online = !!sc.online, cfg = sc.online && sc.online.session && sc.online.session.cfg, season = !!(sc.setup.season || (cfg && cfg.season)); let won = false;
    if (m.mini) {
      const kind = m.mini.kind, rows = (m.result && m.result.rows) || [], ks = new Set(mine.map(p => p.chair && p.chair.k)), sides = new Set(mine.map(p => p.side));
      if (kind === 'br') {
        const teams = []; for (const r of rows) { const c = m.chairs.find(x => x.k === r.k); const t = c && c.gs ? c.gs.team : -1; if (!teams.includes(t)) teams.push(t); }
        const myT = mine[0].chair && mine[0].chair.gs ? mine[0].chair.gs.team : -2, place = teams.indexOf(myT) + 1; this.ev('br'); if (place === 1) { won = true; this.ev('brWin'); } if (place >= 1 && place <= 3) this.ev('brTop3');
      } else {
        this.ev('mini'); this.ev('mini:' + kind); this.ev('miniKind:' + kind);
        won = m.result && (m.result.winSide >= 0 ? sides.has(m.result.winSide) : rows[0] && ks.has(rows[0].k)); if (won) this.ev('miniWin');
      }
    } else if (!sc.setup.practice) {
      this.ev('hockey'); const s = mine[0].side; won = m.score[s] > m.score[1 - s]; if (won) this.ev('hockeyWin'); if (season) this.ev('seasonGame');
    }
    if (online) this.ev('online');
    if (!sc.setup.practice || m.mini) this.addXp(won ? 150 : 80, won ? 'Match won' : 'Match played');
  }
};
