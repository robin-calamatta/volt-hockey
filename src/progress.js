/* Your profile (v12): the look of your character and cart, XP and level, the Season 1 pass ("The Beginning", free rewards only for now),
   and daily / weekly quests that reset. Everything lives in Settings.profile, so it is saved like the rest of your settings (and online
   when you are logged in). Matches report what happened through Progress.tick() (every frame) and Progress.ev() (events). */
/* actions: things your driver does with their arms, from the emoji wheel (rig3d.js animates them) */
const ACTIONS = {                                                         // hand targets over time (s): R right hand, L left hand, and how long the action lasts
  a_thumbs: { name: 'Thumbs Up', icon: '👍', dur: 2.2 }, a_wave: { name: 'Wave', icon: '👋', dur: 2.4 }, a_cheer: { name: 'Cheer', icon: '🙌', dur: 2.6 }, a_clap: { name: 'Clap', icon: '👏', dur: 2.4 },
  a_pump: { name: 'Fist Pump', icon: '✊', dur: 2.2 }, a_salute: { name: 'Salute', icon: '🫡', dur: 2.2 }, a_point: { name: 'Point', icon: '👉', dur: 2.0 }, a_flex: { name: 'Flex', icon: '💪', dur: 2.6 },
  a_shrug: { name: 'Shrug', icon: '🤷', dur: 2.0 }, a_facepalm: { name: 'Facepalm', icon: '🤦', dur: 2.4 }, a_dance: { name: 'Seat Dance', icon: '💃', dur: 4.0 }, a_drum: { name: 'Drum Roll', icon: '🥁', dur: 3.0 },
  a_heart: { name: 'Heart Hands', icon: '🫶', dur: 2.4 }, a_robot: { name: 'Robot Arms', icon: '🤖', dur: 3.2 }, a_conductor: { name: 'Conductor', icon: '🎼', dur: 3.2 }, a_muscle: { name: 'Big Muscles', icon: '🏋️', dur: 2.8 },
  /* v13.6.1: many more body emotes, arms and legs (rig3d.js / emotes_body.js animate them; leg ones swing the legs out from the cart) */
  a_kick: { name: 'Big Kick', icon: '🦵', dur: 2.2, legs: 1 }, a_raise: { name: 'Raise the Roof', icon: '🏠', dur: 2.6 }, a_tap: { name: 'Foot Tap', icon: '👟', dur: 2.6, legs: 1 }, a_dab: { name: 'Dab', icon: '💫', dur: 1.8 },
  a_cancan: { name: 'Can-Can', icon: '👯', dur: 3.2, legs: 1 }, a_guitar: { name: 'Air Guitar', icon: '🎸', dur: 3.2 }, a_bike: { name: 'Air Bike', icon: '🚲', dur: 3.0, legs: 1 }, a_box: { name: 'Shadow Box', icon: '🥊', dur: 2.6 },
  a_stomp: { name: 'Stomp', icon: '🥾', dur: 2.4, legs: 1 }, a_peace: { name: 'Peace', icon: '✌️', dur: 2.2 }, a_swing: { name: 'Leg Swing', icon: '🦿', dur: 2.8, legs: 1 }, a_row: { name: 'Row the Boat', icon: '🚣', dur: 3.0 },
  a_cross: { name: 'Cross Legs', icon: '🧘', dur: 3.0, legs: 1 }, a_swim: { name: 'Swim', icon: '🏊', dur: 3.0 }, a_flutter: { name: 'Flutter Kicks', icon: '🌊', dur: 2.6, legs: 1 }, a_timeout: { name: 'Time Out', icon: '⏱️', dur: 2.0 },
  a_jig: { name: 'Seat Jig', icon: '🎻', dur: 3.4, legs: 1 }, a_binos: { name: 'Binoculars', icon: '🔭', dur: 2.6 }, a_goalie: { name: 'Goalie Stance', icon: '🥅', dur: 2.6, legs: 1 }, a_kiss: { name: "Chef's Kiss", icon: '🤌', dur: 2.0 },
  a_march: { name: 'Seat March', icon: '🎺', dur: 3.0, legs: 1 }, a_pompom: { name: 'Pom Poms', icon: '📣', dur: 2.8 }, a_lasso: { name: 'Lasso', icon: '🤠', dur: 3.0 }, a_wipe: { name: 'Phew', icon: '😅', dur: 2.2 },
  a_split: { name: 'Leg Split', icon: '🤸', dur: 2.6, legs: 1 }, a_steer: { name: 'Air Steer', icon: '🛞', dur: 2.8 }, a_sprinkler: { name: 'Sprinkler', icon: '💦', dur: 3.0 }, a_bow: { name: 'Take a Bow', icon: '🎭', dur: 2.4 },
  a_tpose: { name: 'T-Pose', icon: '📏', dur: 2.2 }, a_hype: { name: 'Full Body Hype', icon: '⚡', dur: 3.0, legs: 1 }
};
const COS = {
  outfits: [['tee', 'Rookie Tee', '👕'], ['jersey', 'Team Jersey', '🎽'], ['tank', 'Tank Top', '🩱'], ['hoodie', 'Cozy Hoodie', '🧥'], ['racing', 'Racing Suit', '🏎️'], ['puffer', 'Puffer Jacket', '🧣'], ['tux', 'Tuxedo', '🤵']],
  hats: [['none', 'No hat', '🚫'], ['cap', 'Ball Cap', '🧢'], ['beanie', 'Beanie', '🧶'], ['headband', 'Sweatband', '🎗️'], ['bucket', 'Bucket Hat', '👒'], ['visor', 'Visor', '🕶️'], ['bandana', 'Bandana', '🏴'], ['party', 'Party Hat', '🥳'],
    ['chef', 'Chef Hat', '👨‍🍳'], ['cowboy', 'Cowboy Hat', '🤠'], ['propeller', 'Propeller Cap', '🚁'], ['helmet', 'Race Helmet', '⛑️'], ['viking', 'Viking Helmet', '🪓'], ['tophat', 'Top Hat', '🎩'], ['halo', 'Halo', '😇'], ['crown', 'Volt Crown', '👑']],
  faces: [['smile', 'Smile', '🙂'], ['grin', 'Big Grin', '😁'], ['freckles', 'Freckles', '😊'], ['wink', 'Wink', '😉'], ['tongue', 'Cheeky', '😛'], ['shades', 'Cool Shades', '😎'], ['sleepy', 'Sleepy', '😴'], ['nerd', 'Big Glasses', '🤓'],
    ['focus', 'Game Face', '😤'], ['wow', 'Surprised', '😮'], ['stache', 'Moustache', '🥸'], ['angry', 'Fired Up', '😠'], ['hearts', 'Heart Eyes', '😍'], ['robot', 'Robot', '🤖'], ['stars', 'Star Struck', '🤩'],
    ['blush', 'Blushing', '☺️'], ['laugh', 'Laughing', '😆'], ['smirk', 'Smirk', '😏'], ['sweat', 'Nervous', '😅'], ['dizzy', 'Dizzy', '😵'], ['money', 'Cha-Ching', '🤑'], ['pirate', 'Eye Patch', '🏴‍☠️'],
    ['monocle', 'Monocle', '🧐'], ['vampire', 'Fangs', '🧛'], ['kitty', 'Whiskers', '🐱'], ['clown', 'Clown Nose', '🤡'], ['beard', 'Full Beard', '🧔'], ['zombie', 'Zombie', '🧟'], ['ninja', 'Ninja Mask', '🥷'],
    ['cry', 'Happy Tears', '🥹'], ['shades2', 'Heart Shades', '😻'], ['paint', 'War Paint', '🎨'], ['alien', 'Alien Eyes', '👽']],
  hairStyles: [['short', 'Short', '💇'], ['buzz', 'Buzz Cut', '✂️'], ['bald', 'Bald', '🥚'], ['long', 'Long', '💁'], ['curly', 'Curly', '➰'], ['ponytail', 'Ponytail', '🎀'], ['bun', 'Top Bun', '🍙'], ['quiff', 'Quiff', '🌊'], ['spiky', 'Spiky', '⚡'], ['mohawk', 'Mohawk', '🦔'], ['afro', 'Afro', '☁️']],
  decals: [['none', 'No decal', '🚫'], ['stripes', 'Racing Stripes', '〰️'], ['waves', 'Waves', '🌊'], ['bolt', 'Lightning', '⚡'], ['hearts', 'Hearts', '💗'], ['notes', 'Music', '🎵'], ['camo', 'Camo', '🪖'], ['stars', 'Stars', '⭐'], ['circuit', 'Circuit', '🔌'], ['tiger', 'Tiger', '🐯'], ['pixel', 'Pixels', '👾'], ['flames', 'Flames', '🔥'], ['checker', 'Checkered', '🏁']],
  emojis: [...['😀', '😂', '😎', '👍', '👏', '🔥', '😮', '😢', '😡', '🎉', '🙏', '💯'].map(e => [e, e, e]), ['🥳', 'Party', '🥳'], ['🙌', 'Hands up', '🙌'], ['😴', 'Sleepy', '😴'], ['🤖', 'Robot', '🤖'], ['🍕', 'Pizza', '🍕'], ['🎯', 'Bullseye', '🎯'], ['🤯', 'Mind blown', '🤯'], ['❤️', 'Heart', '❤️'],
    ['💥', 'Boom', '💥'], ['🐐', 'G.O.A.T.', '🐐'], ['🥶', 'Ice cold', '🥶'], ['💪', 'Flex', '💪'], ['💀', 'Skull', '💀'], ['🚀', 'Rocket', '🚀'], ['😇', 'Angel', '😇'], ['🏆', 'Trophy', '🏆']],
  actions: Object.entries(ACTIONS).map(([id, a]) => [id, a.name, a.icon]),
  colors: ['#e74c3c', '#ff8a3d', '#f2c200', '#7ed957', '#2ecc71', '#1abc9c', '#29b6f6', '#2f6fed', '#7b5cff', '#c44dff', '#ff5fa2', '#f4f4f2', '#8a8f96', '#22262b'],
  hair: ['#1d1611', '#3b2a1e', '#6b4a2b', '#a8743a', '#e0c070', '#c0392b', '#e8e8e8', '#4a6cff', '#2ecc71', '#ff5fa2'],
  skin: ['#f6d3b3', '#e8b48a', '#d29a6c', '#b07a4f', '#8a5a36', '#5e3b22']
};
const FREE = { outfits: 1, hats: 2, faces: 3, hairStyles: 3, decals: 2, emojis: 20, actions: 8 };   // (v13.6.1: no more titles; more emotes to start with)      // how many of each list everyone has from the start
for (const k of Object.keys(FREE)) COS[k] = COS[k].map(([id, name, icon], i) => ({ id, name, icon, tier: i < FREE[k] ? 0 : null }));
const SEASON1 = { name: 'Season 1', title: 'The Beginning', xpPerTier: 1000, tiers: 100, ends: '2027-03-01' };
const PASS = [];                                                          // tier -> its reward: one thing on every tier, the lists taking turns (the best of each list last)
{ const slot = { outfits: 'outfit', hats: 'hat', faces: 'face', hairStyles: 'hairStyle', decals: 'decal', emojis: 'emoji', actions: 'action' }, order = ['actions', 'faces', 'hats', 'actions', 'decals', 'faces', 'hairStyles', 'actions', 'emojis', 'outfits'];
  const left = Object.fromEntries(Object.keys(slot).map(k => [k, COS[k].filter(it => it.tier === null)])); let t = 1, i = 0, guard = 0;
  while (t <= SEASON1.tiers && guard++ < 2000) { const k = order[i++ % order.length], it = left[k].shift(); if (!it) continue; it.tier = t; PASS[t++] = { slot: slot[k], ...it }; }
  const rest = Object.keys(slot).flatMap(k => COS[k].filter(it => it.tier === null)); rest.forEach((it, i) => { it.tier = Math.max(2, Math.round((i + 1) * SEASON1.tiers / (rest.length + 1))); });   // (anything left over: a bonus spread through the pass)
}
const LOOK0 = { outfit: 'tee', shirt: '#2f6fed', hat: 'cap', hatCol: '#e74c3c', face: 'smile', hair: '#3b2a1e', hairStyle: 'short', skin: '#e8b48a', decal: 'stripes' };
const WHEEL0 = ['a_wave', 'a_thumbs', 'a_cheer', 'a_clap', 'a_pump', 'a_salute', '😂', '🔥'];   // mostly body emotes now, a couple of emojis

/* Quests: type = the event that moves them; n = how many. Daily: 3 a day from DAILY_Q. Weekly: 6 a week from WEEKLY_Q. */
const DAILY_Q = [
  { id: 'd_hockey', type: 'hockey', n: 1, xp: 400, text: 'Play a match of Volt Hockey' }, { id: 'd_hwin', type: 'hockeyWin', n: 1, xp: 500, text: 'Win a match of Volt Hockey' },
  { id: 'd_mini', type: 'mini', n: 1, xp: 300, text: 'Play a minigame to the end' }, { id: 'd_mini3', type: 'mini', n: 3, xp: 500, text: 'Play 3 minigames to the end' },
  { id: 'd_br', type: 'br', n: 1, xp: 400, text: 'Play a Volt Royale' }, { id: 'd_brkill', type: 'brKill', n: 2, xp: 500, text: 'Get 2 eliminations in Volt Royale' },
  { id: 'd_chest', type: 'chest', n: 3, xp: 400, text: 'Open 3 chests in Volt Royale' }, { id: 'd_prac', type: 'practiceSec', n: 120, xp: 300, text: 'Spend 2 minutes in the Practice Arena' },
  { id: 'd_goal', type: 'goal', n: 3, xp: 400, text: 'Score 3 goals in Volt Hockey' }, { id: 'd_pen', type: 'penalty', n: 1, xp: 300, text: 'Get sent to the sin bin (we won\'t tell)' },
  { id: 'd_dist', type: 'dist', n: 1000, xp: 300, text: 'Drive 1,000 m in any game' }, { id: 'd_jump', type: 'jump', n: 10, xp: 300, text: 'Jump or drop 10 times in Volt Royale' },
  { id: 'd_online', type: 'online', n: 1, xp: 500, text: 'Play an online match' }, { id: 'd_mwin', type: 'miniWin', n: 1, xp: 500, text: 'Win a minigame' },
  { id: 'd_paint', type: 'mini:paintball', n: 1, xp: 400, text: 'Play a game of Paintball' }, { id: 'd_emoji', type: 'emoji', n: 5, xp: 300, text: 'Do 5 emotes during matches' },
  { id: 'd_top3', type: 'brTop3', n: 1, xp: 600, text: 'Finish in the top 3 of a Volt Royale' }, { id: 'd_sgame', type: 'seasonGame', n: 1, xp: 400, text: 'Play a Season game' },
  { id: 'd_race', type: 'mini:race', n: 1, xp: 300, text: 'Finish a Race' }, { id: 'd_revive', type: 'revive', n: 1, xp: 500, text: 'Revive a team-mate in Volt Royale' },
  { id: 'd_healm', type: 'healMate', n: 1, xp: 400, text: 'Heal a team-mate in Volt Royale' }, { id: 'd_drift', type: 'driftBoost', n: 10, xp: 400, text: 'Get 10 drift boosts (hold A while turning)' }
];
const WEEKLY_Q = [
  { id: 'w_brwin', type: 'brWin', n: 1, xp: 2000, text: 'Win a Volt Royale' }, { id: 'w_br5', type: 'br', n: 5, xp: 1500, text: 'Play 5 Volt Royales' },
  { id: 'w_hwin3', type: 'hockeyWin', n: 3, xp: 1500, text: 'Win 3 matches of Volt Hockey' }, { id: 'w_mini10', type: 'mini', n: 10, xp: 1500, text: 'Play 10 minigames to the end' },
  { id: 'w_season', type: 'seasonDone', n: 1, xp: 3000, text: 'Play a full season of Volt Hockey' }, { id: 'w_kill10', type: 'brKill', n: 10, xp: 1500, text: 'Get 10 eliminations in Volt Royale' },
  { id: 'w_goal15', type: 'goal', n: 15, xp: 1500, text: 'Score 15 goals in Volt Hockey' }, { id: 'w_dmg', type: 'brDmg', n: 1000, xp: 1500, text: 'Deal 1,000 damage in Volt Royale' },
  { id: 'w_dist', type: 'dist', n: 10000, xp: 1200, text: 'Drive 10 km in any game' }, { id: 'w_mwin5', type: 'miniWin', n: 5, xp: 1500, text: 'Win 5 minigames' },
  { id: 'w_kinds', type: 'miniKind', n: 5, xp: 1500, text: 'Play 5 different minigames' }, { id: 'w_sgame3', type: 'seasonGame', n: 3, xp: 1500, text: 'Play 3 Season games' },
  { id: 'w_rez', type: 'rez', n: 2, xp: 2000, text: 'Bring team-mates back at a rez garage twice' }, { id: 'w_drift3', type: 'driftBoost3', n: 15, xp: 1500, text: 'Get 15 full (purple) drift boosts' }, { id: 'w_prac', type: 'practiceSec', n: 600, xp: 1200, text: 'Spend 10 minutes in the Practice Arena' }, { id: 'w_online3', type: 'online', n: 3, xp: 1500, text: 'Play 3 online matches' }
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
        const c0 = p.chair; if (c0.dr) { const kb = S.chairs.get(c0); if (kb && c0.dr.boost > 0 && !kb.boost) { this.ev('driftBoost'); if (c0.dr.lvl >= 3) this.ev('driftBoost3'); } if (kb) kb.boost = c0.dr.boost > 0; }
        const c = p.chair, k = S.chairs.get(c) || { x: c.x, y: c.y, bin: c.binLeft || 0, kills: 0, dmg: 0, air: 0 }; S.chairs.set(c, k);
        const d = Math.hypot(c.x - k.x, c.y - k.y); if (d < 3) S.dist += d; k.x = c.x; k.y = c.y;
        if ((c.binLeft || 0) > 0 && !(k.bin > 0)) this.ev('penalty'); k.bin = c.binLeft || 0;
        if (br && c.gs) { if (c.gs.kills > k.kills) { this.ev('brKill', c.gs.kills - k.kills); S.kills = (S.kills || 0) + c.gs.kills - k.kills; } k.kills = c.gs.kills; if (c.gs.dmg > k.dmg + 1) { this.ev('brDmg', Math.floor(c.gs.dmg - k.dmg)); k.dmg = Math.floor(c.gs.dmg); } if (c.gs.air && !k.air) this.ev('jump'); k.air = c.gs.air; }
      }
      S.played = (S.played || 0) + dt;
      if (S.dist >= 25) { const n = Math.floor(S.dist); S.dist -= n; this.ev('dist', n); }
      if (sc.setup.practice && !m.mini) { S.prac += dt; if (S.prac >= 1) { const n = Math.floor(S.prac); S.prac -= n; this.ev('practiceSec', n); } }
      if (!m.mini && m.score) { const sides = new Set(mine.map(p => p.side)); for (const s of sides) if (m.score[s] > S.score[s]) { this.ev('goal', m.score[s] - S.score[s]); S.goals = (S.goals || 0) + m.score[s] - S.score[s]; } S.score = m.score.slice(); }
    }
    if (m.state === 'over' && !S.over) { S.over = true; this.matchOver(sc, m, mine); }
  },
  matchOver(sc, m, mine) {
    const S = sc.prog || (sc.prog = {});   /* (the match counters from tick; this was missing and crashed the end of a Volt Royale) */
    const online = !!sc.online, cfg = sc.online && sc.online.session && sc.online.session.cfg, season = !!(sc.setup.season || (cfg && cfg.season)); let won = false;
    if (m.mini) {
      const kind = m.mini.kind, rows = (m.result && m.result.rows) || [], ks = new Set(mine.map(p => p.chair && p.chair.k)), sides = new Set(mine.map(p => p.side));
      if (kind === 'br') {
        const teams = []; for (const r of rows) { const c = m.chairs.find(x => x.k === r.k); const t = c && c.gs ? c.gs.team : -1; if (!teams.includes(t)) teams.push(t); }
        const myT = mine[0].chair && mine[0].chair.gs ? mine[0].chair.gs.team : -2, place = teams.indexOf(myT) + 1; this.ev('br'); if (place === 1) { won = true; this.ev('brWin'); } if (place >= 1 && place <= 3) { this.ev('brTop3'); S.top3 = true; }
      } else {
        this.ev('mini'); this.ev('mini:' + kind); this.ev('miniKind:' + kind);
        won = m.result && (m.result.winSide >= 0 ? sides.has(m.result.winSide) : rows[0] && ks.has(rows[0].k)); if (won) this.ev('miniWin');
      }
    } else if (!sc.setup.practice) {
      this.ev('hockey'); const s = mine[0].side; won = m.score[s] > m.score[1 - s]; if (won) this.ev('hockeyWin'); if (season) this.ev('seasonGame');
    }
    if (online) this.ev('online');
    if (!sc.setup.practice || m.mini) {                                   // XP for playing: time, eliminations, goals, a win (quests give more)
      const mins = Math.min(30, (S.played || 0) / 60), parts = [[60, 'played'], [Math.round(mins * 25), Math.round(mins) + ' min'], [(S.kills || 0) * 30, (S.kills || 0) + ' eliminations'], [(S.goals || 0) * 15, (S.goals || 0) + ' goals'], [won ? 100 : 0, 'win'], [S.top3 && !won ? 50 : 0, 'top 3']].filter(([x]) => x > 0);
      this.addXp(parts.reduce((a, [x]) => a + x, 0), (won ? 'Match won: ' : 'Match played: ') + parts.slice(1).map(([, t]) => t).join(', '));
    }
  }
};
