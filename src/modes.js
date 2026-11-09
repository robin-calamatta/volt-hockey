/* Game modes: every game the minigames menu offers, how it is described (How to play), and a small framework so a new minigame is just a set of
   rules. A mode in MODES[kind] may provide any of:
     init(m)            once, when the match is made (set up m.gs: the game's own state, plain data, sent to online players as it is)
     kickoff(m)         starting positions (after the default ring)
     step(m, h)         every physics step during play, after the carts have moved (balls, scoring, the end of the game)
     ai(c, m, h)        the CPU's stick for one cart: { x, y, speed, spin }
     cmd(c, cmd, m)     change what a cart's stick asks for (carrying something heavy, in the air...)
     contact(m, a, b, d, closing)   two carts touched (d = distance between centres)
     hud(m)             the scoreboard: { clock, a, b, sa, sb, left, mid, right }
     tag(c, m)          the label over a cart ('' for none)
     timeUp(m)          the round clock ran out (when info.minutes is set)
   c.gs (per cart) and m.gs (per game) are copied to online players in every snapshot. */
const MODES = {};
const CTRL = {                                                         // control lines used by the How to play pages
  drive: 'Drive: left stick  /  WASD  /  arrows  /  touch stick',
  spin: 'Spin (a half turn that whacks things): LB / RB  /  R Z  /  ] [  /  SPIN buttons',
  item: 'Use a power-up / fire: RT  /  E  /  .  /  touch ★ USE',
  drift: 'Drift: hold B while turning (Backspace  /  Right Ctrl  /  touch 💨 DRIFT): let go when the bar is purple for the biggest boost',
  speed: 'Cart speed: D-pad ◀ ▶  /  C V  /  ; \'  /  touch SPEED + −',
  pause: 'Pause: Start  /  Esc  /  II'
};
const GAME_INFO = {
  hockey: { name: 'Volt Hockey', cat: 'hockey', blurb: 'The real thing: teams of power carts, a ball and two nets.',
    goal: 'Score more goals than the other team before the clock runs out.',
    rules: ['Carry the ball in the T-stick on the front of your cart and push it into the other team\'s net.', 'Spin your cart to slap the ball hard: a spin shot.', 'Do not drive into the crease you are attacking, and only one cart per team may be in its own crease.', 'A hard hit from behind or head-on is a foul: that cart sits in the sin bin and the other team has a power play.', 'A ball left untouched in a crease is reset to the middle.', 'Level at full time: golden goal overtime.'],
    controls: [CTRL.drive, CTRL.drift, CTRL.spin, 'Switch cart: Y  /  F  /  /', 'Full press (goalie joins the attack): X', CTRL.speed, CTRL.pause] },
  balloons: { name: 'Balloon Bash', cat: 'party', blurb: 'Pop the balloons on everyone else\'s back.',
    goal: 'Be the last cart (or team) with balloons left.',
    rules: ['Every cart carries balloons on its back.', 'Hit someone\'s back with the front of your cart: one balloon pops and they restart somewhere safe.', 'A cart that just restarted blinks: it cannot be popped for 2 seconds.', 'No balloons left: you are out and watch from the sin bin.', 'When the clock runs out, the most balloons left wins.', 'Power-ups: BOOST, ZAP (pops a balloon from range) and OIL.'],
    controls: [CTRL.drive, CTRL.drift, CTRL.spin, CTRL.item, CTRL.pause] },
  race: { name: 'Race', cat: 'racing', blurb: 'Laps of seven tracks, from the rink oval to a kilometre marathon.',
    goal: 'Finish the laps first.',
    rules: ['Follow the track; the walls keep you on it and there are no short cuts.', 'Laps and positions are counted for you (top of the screen).', 'When the winner crosses the line, everyone else has 20 seconds to finish.', 'Obstacles: rocks, cones, bumpers that throw you back, spinning arms, sliding blocks.', 'Drive over the blue arrows for a boost.', 'Power-ups: BOOST, ZAP (spins a cart out) and OIL (reverses their steering).'],
    controls: [CTRL.drive, CTRL.drift, CTRL.spin, CTRL.item, CTRL.pause] },
  hunt: { name: 'Manhunt', cat: 'party', blurb: 'One cart is IT. Get caught and you are IT too.',
    goal: 'Runners: still be free when the clock runs out. IT: catch everyone.',
    rules: ['One random cart starts as IT (the red ring and the other team\'s colours).', 'IT catches a runner just by touching them.', 'A caught runner becomes IT, and freezes for 2 seconds first.', 'IT wins when everyone has been caught.', 'Anyone still free when the clock runs out wins.'],
    controls: [CTRL.drive, CTRL.drift, CTRL.spin, CTRL.item, CTRL.pause] }
};
const GAME_CATS = [
  { id: 'party', name: 'Party chaos', blurb: 'Free-for-all mayhem: popping, tagging, bombs and lava' },
  { id: 'ball', name: 'Ball games', blurb: 'Hockey with a twist, giant balls, bowling and mini golf' },
  { id: 'racing', name: 'Racing and driving', blurb: 'Races, time trials with ghosts, stunts and deliveries' },
  { id: 'sneaky', name: 'Battles and sneaky', blurb: 'Paintball, capture the flag, hiding among the CPUs' }
];
const MINI_KINDS = () => Object.keys(GAME_INFO).filter(k => k !== 'hockey');
const modeOf = m => m && MODES[m.kind];

/* Options for the new games live in Settings.mg[kind] ({ key: value }); each GAME_INFO entry may list them in `opts`:
   { key, label, min, max, step?, def, fmt? } numbers, or { key, label, values: [...], names?, def } choices. */
function modeOpts(kind) { const I = GAME_INFO[kind] || {}, saved = (Settings.mg && Settings.mg[kind]) || {}, out = {}; for (const o of I.opts || []) out[o.key] = saved[o.key] !== undefined ? saved[o.key] : o.def; return out; }
function modeSave(kind, patch) { Settings.mg = { ...miniOpts(), [kind]: { ...modeOpts(kind), ...patch } }; Settings.save(); }
{ const base = miniCfg; miniCfg = kind => MODES[kind] ? { kind, mode: GAME_INFO[kind].teams ? 'teams' : 'ffa', items: miniOpts().items[kind] !== undefined ? !!miniOpts().items[kind] : !!GAME_INFO[kind].itemsOn, minutes: modeOpts(kind).minutes || GAME_INFO[kind].minutes || 3, ...modeOpts(kind) } : base(kind); }
{ const base2 = miniCfg; miniCfg = kind => ({ ...base2(kind), noCpu: !!((miniOpts().nocpu || {})[kind]) }); }   // every minigame: CPU carts on or off
/* No CPU carts: only the people who joined get a cart (a demo with nobody in it keeps its CPUs). */
function fitSizes(mini, players, sizes) {
  if (!mini || !mini.noCpu || !players || !players.length) return sizes;
  const n = [0, 1].map(s => players.filter(p => p.side === s).length); return n;
}
{ const base = miniLabel; miniLabel = cfg => { if (!cfg || !MODES[cfg.kind]) return base(cfg); const I = GAME_INFO[cfg.kind]; return I.name + (I.label ? ' (' + I.label(cfg) + ')' : '') + (cfg.items ? ', power-ups' : ''); }; }

/* ----- the framework: MiniMatch hands the new kinds over to their mode ----- */
{
  const P = MiniMatch.prototype, o = { useItem: P.useItem, focusOn: P.focusOn, kickoff: P.kickoff, step: P.step, simulate: P.simulate, chairHit: P.chairHit, miniCmd: P.miniCmd, hud: P.hud, miniSnap: P.miniSnap, miniApply: P.miniApply };
  P.kickoff = function () {
    const M = modeOf(this); if (!this.mini || !M) return o.kickoff.call(this);
    if (!this.modeReady) { this.modeReady = true; this.gs = {}; for (const c of this.chairs) c.gs = {}; if (GAME_INFO[this.kind].minutes || this.mini.minutes) this.clock = (this.mini.minutes || GAME_INFO[this.kind].minutes) * 60; if (M.init) M.init(this); }
    o.kickoff.call(this); if (M.kickoff) M.kickoff(this); this.focusOn();
  };
  P.step = function (h) {
    const M = modeOf(this); if (!M) return o.step.call(this, h);
    this.bannerLeft -= h; this.noticeLeft -= h;
    if (this.state === 'countdown') {
      this.timer -= h; const n = Math.ceil(this.timer); if (n !== this.lastCount && n > 0) { this.lastCount = n; this.sfx('count'); }
      if (this.timer <= 0) { this.state = 'play'; this.sfx(this.kind === 'br' ? 'br_go' : 'whistle'); this.line(M.startLine ? M.startLine(this) : 'Go!'); }
    } else if (this.state === 'play') {
      this.simulate(h);
      if (this.state === 'play' && M.timeUp && !M.noClock) { const was = this.clock; this.clock -= h; if (was > 30 && this.clock <= 30) { this.notice = '30 SECONDS LEFT'; this.noticeLeft = 2; } if (this.clock <= 0) M.timeUp(this); }
    }
  };
  P.simulate = function (h) { o.simulate.call(this, h); const M = modeOf(this); if (M && M.step && this.state === 'play') M.step(this, h); if (M) this.focusOn(); };
  P.chairHit = function (a, b) {
    const M = modeOf(this); if (!M) return o.chairHit.call(this, a, b);
    const R = CONFIG.chair.radius, d = Math.hypot(b.x - a.x, b.y - a.y); if ((a.gs && a.gs.ghost) || (b.gs && b.gs.ghost) || (M.noCollide && M.noCollide(a, b))) return;
    if (d < 2 * R + 0.12 && M.contact) M.contact(this, a, b, d);
    if (d >= 2 * R || d === 0) return;
    const K = CONFIG.chair, closing = Physics.circles(a, R, K.mass * (a.massMul || 1), b, R, K.mass * (b.massMul || 1), K.chairBounce); crashSlow(a, b, closing);
    if (closing > CONFIG.foul.bumpSoundSpeed) this.sfx('bump');
    if (M.bump) M.bump(this, a, b, closing);
  };
  P.useItem = function (c) { const M = modeOf(this); if (M && M.use) { if (!c.out && this.state === 'play') M.use(c, this); return; } return o.useItem.call(this, c); };   // A / X: the mode's own action (Imposter's zap)
  P.focusOn = function () { o.focusOn.call(this); const M = modeOf(this), f = M && M.focus && this.gs && M.focus(this); if (f) Object.assign(this.ball, { x: f.x, y: f.y, vx: 0, vy: 0 }); };   // what the TV camera follows
  P.miniCmd = function (c, cmd) { cmd = o.miniCmd.call(this, c, cmd); const M = modeOf(this); return M && M.cmd ? M.cmd(c, cmd, this) : cmd; };
  P.hud = function () { const M = modeOf(this); if (!M || !M.hud) return o.hud.call(this); const t = Math.max(0, Math.ceil(this.clock)); return { clock: `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, a: '', b: '', sa: '', sb: '', left: '', mid: '', right: '', ...M.hud(this) }; };
  P.miniSnap = function () { const s = o.miniSnap.call(this), M = modeOf(this); if (M) { s.gs = this.gs; if (M.slowKeys && (this.snapN = (this.snapN || 0) + 1) % 8) { s.gs = { ...this.gs }; for (const k of M.slowKeys) delete s.gs[k]; }   // big, slow-changing state (the loot) only every 8th snapshot
    s.cs = this.chairs.map(c => c.gs || 0); s.mm = this.chairs.map(c => [Math.round((c.massMul || 1) * 10), c.out ? 1 : 0]); } return s; };
  P.miniApply = function (s) { o.miniApply.call(this, s); if (s && s.gs) { this.gs = modeOf(this) && modeOf(this).slowKeys ? { ...this.gs, ...s.gs } : s.gs; (s.cs || []).forEach((g, i) => { if (this.chairs[i]) this.chairs[i].gs = g || {}; }); (s.mm || []).forEach(([mm, out], i) => { const c = this.chairs[i]; if (c) { c.massMul = mm / 10; c.out = !!out; } }); } };
}
{ const base = miniAI; miniAI = function (c, m, h) { const M = modeOf(m); if (!M || !M.ai) return base(c, m, h); c.aiNext = (c.aiNext || 0) - h; if (c.aiNext > 0 && c.aiCmd) return { ...c.aiCmd, spin: 0 }; c.aiNext = 0.05 + ((m.difficulty || {}).reaction || 0.15) * 0.5; let cmd = M.ai(c, m, h) || { x: 0, y: 0 };
  const want = Math.hypot(cmd.x || 0, cmd.y || 0) * (cmd.speed === undefined ? 1 : cmd.speed), moving = Math.hypot(c.vx, c.vy);     // stuck in a scrum (wants to go, is not moving): back off sideways for a moment
  c.stuckT = !M.noUnstick && want > 0.4 && moving < 0.35 ? (c.stuckT || 0) + 0.1 : 0;
  if (c.stuckT > 1.5) { c.stuckT = 0; c.unstickT = m.simTime + 0.9; c.unstickA = c.heading + Math.PI * (0.6 + Math.random() * 0.8) * (Math.random() < 0.5 ? 1 : -1); }
  if (m.mini.items && c.item && typeof MG !== 'undefined') MG.autoItem(c, m);   // the CPU uses its power-ups
  if (c.unstickT > m.simTime) cmd = { x: Math.cos(c.unstickA), y: Math.sin(c.unstickA), speed: 0.9 };
  if (cmd.speed === undefined) cmd.speed = (m.difficulty || {}).speed || 0.9; c.aiCmd = { ...cmd, spin: 0 }; return cmd; }; miniAI.base = base; }

/* ----- helpers the modes share ----- */
const MH = {
  to(c, x, y, speed = 1) { const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy) || 1; return { x: dx / d, y: dy / d, speed }; },
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  nearest(c, list) { let best = null, bd = Infinity; for (const o of list) { const d = Math.hypot(o.x - c.x, o.y - c.y); if (o !== c && d < bd) { bd = d; best = o; } } return best; },
  ahead(c, o, cone = 0.9) { const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy) || 1; return (dx * Math.cos(c.heading) + dy * Math.sin(c.heading)) / d > cone; },
  flee(c, m, threats) {                                                 // run from the threats, off the walls (used by several modes)
    let fx = 0, fy = 0; const W = m.width, H = m.height;
    for (const o of threats) { const dx = c.x - o.x, dy = c.y - o.y, d = Math.max(0.7, Math.hypot(dx, dy)); fx += dx / d / d; fy += dy / d / d; }
    const fl = Math.hypot(fx, fy) || 1; fx /= fl; fy /= fl; const wall = d => d < 2.4 ? (2.4 - d) / 2.4 * 1.8 : 0; fx += wall(c.x) - wall(W - c.x); fy += wall(c.y) - wall(H - c.y);
    return { x: fx, y: fy };
  },
  ballPhys(m, b, h, live, opts = {}) {                                   // a loose ball (or pin): carts, other balls, boards; returns the last cart that touched it
    const K = CONFIG.chair; let toucher = null;
    for (const c of live) {
      if (c.gs && c.gs.ghost) continue; const hitR = opts.cupOnly && !(c.spinLeft > 0) ? -1 : K.ballHitRadius;
      if (hitR > 0) { const d0 = Math.hypot(b.x - c.x, b.y - c.y); Physics.circles(b, b.r, b.mass || 0.5, c, hitR + (b.r > 0.3 ? 0.05 : 0), Infinity, opts.bounce !== undefined ? opts.bounce : 0.4); if (d0 < b.r + hitR + 0.05) toucher = c; }
      if (opts.cupOnly && !(c.spinLeft > 0)) continue;
      for (const q of c.cupColliders()) { const d = Math.hypot(b.x - q.x, b.y - q.y); if (d < b.r + q.r + 0.02) toucher = c; Physics.circles(b, b.r, b.mass || 0.5, q, q.r, Infinity, opts.bounce !== undefined ? opts.bounce : 0.4); }
    }
    const sp = Math.hypot(b.vx, b.vy), fr = opts.friction !== undefined ? opts.friction : 1.2; if (sp > 0) { const k = Math.max(0, sp - fr * h) / sp; b.vx *= k; b.vy *= k; }
    b.x += b.vx * h; b.y += b.vy * h;
    if (!opts.noWalls) { const r = b.r, e = opts.wallBounce || 0.6; if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx) * e; } if (b.x > m.width - r) { b.x = m.width - r; b.vx = -Math.abs(b.vx) * e; } if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy) * e; } if (b.y > m.height - r) { b.y = m.height - r; b.vy = -Math.abs(b.vy) * e; } m.roundCorners(b, r, e); }
    return toucher;
  },
  rank(m, score, fmt) { return m.chairs.slice().sort((a, b) => score(b) - score(a)).map(c => ({ c, text: fmt(c) })); },
  out(m, c) { c.out = true; c.binLeft = 1e9; m.order.push(c); }
};
