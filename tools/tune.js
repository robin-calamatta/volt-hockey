/* Self-tuning for the CPU. Run:  node tools/tune.js [generations] [gamesPerCandidate] [gameMinutes]
   It plays the game headless (no browser) thousands of times faster than real time. Each generation it makes mutated copies of the
   current best set of AI numbers, plays every copy against the shipped defaults (sides swapped), keeps whichever wins most, and
   repeats. The winner is written to src/tuned.js, which the game loads and gives to Hard (half way), Pro and Superstar.
   Resume any time: it starts from src/tuned.js if that exists. Uses every CPU core.                                              */
const fs = require('fs'), vm = require('vm'), path = require('path'), os = require('os'), { fork } = require('child_process');
const SRC = path.join(__dirname, '..', 'src') + path.sep, OUT = SRC + 'tuned.js';

/* The numbers that are allowed to change, with sane limits. Names match CONFIG.ai. */
const KNOBS = {
  patience: [0.5, 3], forcedShot: [0.1, 0.5], goodShot: [0.1, 0.4], shootThreshold: [0.05, 0.25], passThreshold: [0.15, 0.6], passIdleShare: [0, 0.6],
  pressureDist: [0.9, 2.2], driveSpeed: [0.7, 1], driveClear: [0.5, 1.3], driveTight: [0.2, 0.8], edgeRange: [0.4, 1.2], shotHalfWidth: [0.5, 1.4], passHalfWidth: [0.3, 1],
  rushClear: [1.5, 5], wingWide: [2.5, 6], wingBack: [0, 2], guardCut: [0.3, 1], markLane: [0.6, 1.8], tackleMin: [0.3, 0.95], tackleRange: [1.5, 5],
  oneTimerMin: [0.15, 0.6], aimCreep: [0.5, 1], cupApproachMin: [0.2, 0.7], cupApproachRamp: [3, 9], carryTurnRate: [1.2, 3.2],
  scoopSlant: [0.6, 1.2], scoopOffset: [0.1, 0.5], scoopPeelRate: [0.8, 3], crashClear: [0.2, 0.8], swerveDist: [0.7, 1.6], swervePass: [0.9, 1.8]
};

function world() {                                                  // a fresh copy of the game code with no browser
  const ctx = { console, Math, performance, Object, Array, JSON, Map, Set, Float32Array, localStorage: { getItem() { return null; }, setItem() { } }, setTimeout, clearTimeout };
  ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['config', 'teams', 'settings', 'physics', 'chair', 'ai', 'match']) vm.runInContext(fs.readFileSync(SRC + f + '.js', 'utf8') + '\n', ctx, { filename: f });
  ctx.Sound = { play() { } }; return ctx;
}

/* ---- worker: plays one candidate against the defaults and reports a score ---- */
function play(ctx, tune, games, minutes) {
  ctx.tune = tune; ctx.games = games; ctx.minutes = minutes;
  return vm.runInContext(`(() => {
    Settings.penalties = true; const base = CONFIG.difficulties.Superstar, cand = Object.assign({}, base, { tune }); let goals = 0, shots = 0, hold = 0, n = 0;
    for (let g = 0; g < games; g++) {
      const candSide = g % 2, m = new Match({ teamA: 0, teamB: 1, players: [], practice: false, sizes: [3, 3], difficulty: 'Superstar' });
      m.diffBySide = candSide === 0 ? [cand, base] : [base, cand];
      let cool = [0, 0];
      for (let i = 0; i < minutes * 3600; i++) {
        m.update(1 / 60); if (m.state !== 'play') continue; cool[0]--; cool[1]--;
        const b = m.ball, sp = Math.hypot(b.vx, b.vy);
        for (const s of [0, 1]) {                                      // a shot: the ball moving hard at the net from close range, lined up with the mouth
          const net = m.nets[1 - s], dir = net.mouthX > m.width / 2 ? 1 : -1;
          if (cool[s] <= 0 && b.vx * dir > 3.5 && dir * (net.mouthX - b.x) > 0 && dir * (net.mouthX - b.x) < 9 && Math.abs(b.y - m.centerY) < CONFIG.net.width / 2 + 1.5) { cool[s] = 60; if (s === candSide) shots++; else shots--; }
        }
        const h = m.chairs.find(c => !c.benched && aiHas(c, b)); if (h) hold += (h.side === candSide ? 1 : -1) / 60;
      }
      goals += m.score[candSide] - m.score[1 - candSide]; n++;
    }
    return { goals, shots, hold, n };
  })()`, ctx);
}
if (process.argv[2] === '--worker') {
  const ctx = world();
  process.on('message', ({ id, tune, games, minutes }) => process.send({ id, r: play(ctx, tune, games, minutes) }));
  return;
}

/* ---- trainer ---- */
const generations = +process.argv[2] || 6, games = +process.argv[3] || 4, minutes = +process.argv[4] || 2, children = 8;
const probe = world(), defaults = {}; for (const k in KNOBS) { defaults[k] = vm.runInContext("CONFIG.ai." + k, probe); if (typeof defaults[k] !== 'number') { console.log('skipping unknown knob', k); delete KNOBS[k]; } }
let best = {}; try { best = JSON.parse(fs.readFileSync(OUT, 'utf8').match(/Superstar\.tune = (\{.*\});/)[1]); } catch (e) { best = {}; }
for (const k in KNOBS) if (best[k] === undefined) best[k] = defaults[k];
const pool = Array.from({ length: Math.max(1, Math.min(os.cpus().length, children)) }, () => fork(__filename, ['--worker']));
let nextId = 0; const waiting = new Map(); pool.forEach(p => p.on('message', ({ id, r }) => { waiting.get(id)(r); waiting.delete(id); }));
const evaluate = (tune, g = games) => new Promise(res => { const id = nextId++; waiting.set(id, res); pool[id % pool.length].send({ id, tune, games: g, minutes }); });
const fitness = r => (3 * r.goals + 0.5 * r.shots + 0.05 * r.hold) / r.n;       // goals matter most; shots and time on the ball break ties because goals are rare
const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += Math.random(); return (u - 3) / Math.sqrt(0.5); };
const mutate = (t, sigma) => { const o = {}; for (const k in KNOBS) { const [lo, hi] = KNOBS[k]; o[k] = Math.min(hi, Math.max(lo, +(t[k] + gauss() * sigma * (hi - lo)).toFixed(3))); } return o; };

(async () => {
  let champ = best, champFit = fitness(await evaluate(champ, games * 2)), sigma = 0.12;
  console.log('start fitness vs defaults', champFit.toFixed(2));
  for (let gen = 1; gen <= generations; gen++) {
    const kids = Array.from({ length: children }, () => mutate(champ, sigma));
    const results = await Promise.all(kids.map(k => evaluate(k)));
    const scored = kids.map((k, i) => ({ k, f: fitness(results[i]) })).sort((a, b) => b.f - a.f);
    // the top few get a second, bigger test so noise does not crown a lucky one
    const finalists = await Promise.all(scored.slice(0, 3).map(async s => ({ k: s.k, f: fitness(await evaluate(s.k, games * 2)) })));
    const top = finalists.sort((a, b) => b.f - a.f)[0], again = fitness(await evaluate(champ, games * 2));
    if (top.f > again) { champ = top.k; champFit = top.f; sigma = Math.max(0.05, sigma * 0.95); } else { champFit = again; sigma = Math.min(0.25, sigma * 1.1); }
    console.log(`generation ${gen}/${generations}: best child ${top.f.toFixed(2)} vs champion ${again.toFixed(2)} -> champion ${champFit.toFixed(2)} (step ${sigma.toFixed(2)})`);
    save(champ);
  }
  pool.forEach(p => p.kill()); console.log('done. wrote', OUT);
})();

function save(t) {                                                   // Superstar and Pro get the winner; Hard gets the half-way point between defaults and winner
  const half = {}, round = o => JSON.stringify(o);
  for (const k in KNOBS) half[k] = +((defaults[k] + t[k]) / 2).toFixed(3);
  fs.writeFileSync(OUT, '/* Written by tools/tune.js: AI numbers found by self-play. Delete this file (and its <script> line) to go back to the hand-set defaults. */\n' +
    `CONFIG.difficulties.Superstar.tune = ${round(t)};\nCONFIG.difficulties.Pro.tune = ${round(t)};\nCONFIG.difficulties.Hard.tune = ${round(half)};\n`);
}
