/* Teaches the CPU's finisher network (src/brain.js) by evolution strategies in headless attack drills.
   Usage: node tools/train_brain.js [generations] [pairs] [trialsPerCandidate]      Resumes from src/brain_weights.js; writes it whenever the best-so-far improves.
   Each trial: a ball carrier and a mate attack a goalie and a defender (all scripted at Superstar) for 8 seconds; reward = goal (plus speed bonus), partial credit for shots on net.
   Candidates in a generation play the same seeded trials (common random numbers) so the comparison is fair. Uses two worker processes. */
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm'), { fork } = require('child_process');
const SRC = path.join(__dirname, '..', 'src') + path.sep, OUT = SRC + 'brain_weights.js';
function world() {
  let seed = 1; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const M = Object.create(Math); M.random = rnd;
  const ctx = { console, Math: M, performance, Object, Array, JSON, Map, Set, Float32Array, Float64Array, localStorage: { getItem() { return null; }, setItem() { } }, setTimeout, clearTimeout }; ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['config', 'teams', 'settings', 'physics', 'chair', 'brain', 'ai', 'match', 'ai2']) vm.runInContext(fs.readFileSync(SRC + f + '.js', 'utf8') + '\n', ctx, { filename: f });
  try { vm.runInContext(fs.readFileSync(SRC + 'tuned.js', 'utf8') + '\n', ctx); } catch (e) { }
  ctx.Sound = { play() { } }; ctx.Commentary = { pick() { return null; }, parse(x) { return x; } }; ctx.setSeed = s => { seed = s >>> 0 || 1; };
  vm.runInContext(`Settings.penalties = true;
  function trial(s, secs) { setSeed(s * 2654435761 + 7);
    const m = new Match({ teamA: 0, teamB: 1, players: [], practice: false, sizes: [2, 2], difficulty: 'Hard' });
    const A = Object.assign({}, CONFIG.difficulties.Superstar, { brain: 1, brainNoise: 0 }), B = Object.assign({}, CONFIG.difficulties.Superstar, { brain: 0 });
    m.diffBySide = [A, B]; m.state = 'play';
    const W = m.width, cy = m.centerY, r = Math.random;
    const car = m.chairs.find(c => c.side === 0 && c.index === 1) || m.chairs[1], mate = m.chairs.find(c => c.side === 0 && c !== car), foeNet = m.nets[1].mouthX;
    car.x = W / 2 + 1 + r() * 6.5; car.y = 2 + r() * (m.height - 4); car.heading = Math.atan2(cy - car.y + (r() - .5) * 4, foeNet - car.x);
    const sp = r() * 3; car.vx = Math.cos(car.heading) * sp; car.vy = Math.sin(car.heading) * sp;
    m.ball.x = car.x + Math.cos(car.heading) * 0.8; m.ball.y = car.y + Math.sin(car.heading) * 0.8; m.ball.vx = car.vx; m.ball.vy = car.vy;
    mate.x = W / 2 + 2 + r() * 6; mate.y = 2 + r() * (m.height - 4); mate.heading = 0; mate.vx = mate.vy = 0;
    for (const c of m.chairs) if (c.side === 1) { c.x = foeNet - 1 - r() * 5; c.y = 3 + r() * (m.height - 6); c.heading = Math.PI; c.vx = c.vy = 0; }
    let rew = 0, done = false;
    for (let i = 0; i < secs * 60; i++) { m.update(1 / 60); if (m.score[0] > 0) { rew = 1 + (secs * 60 - i) / (secs * 60) * 0.3; done = true; break; } if (m.score[1] > 0) { rew = -0.3; break; } }
    if (!done) rew += 0.25 * Math.min(2, m.shots[0]);
    return rew; }
  function evalParams(p, seeds, secs) { Brain.set(p); let t = 0, g = 0; for (const s of seeds) { const x = trial(s, secs); t += x; if (x >= 1) g++; } return { mean: t / seeds.length, goals: g }; }`, ctx);
  return ctx;
}
if (process.argv[2] === '--worker') {
  const ctx = world(); process.on('message', ({ id, params, seeds }) => { ctx.P = params; ctx.S = seeds; process.send({ id, r: vm.runInContext('evalParams(P, S, 6)', ctx) }); });
  return;
}
const gens = +process.argv[2] || 40, pairs = +process.argv[3] || 8, K = +process.argv[4] || 16, sigma0 = 0.35, lr = 1.2;
const probe = world(); let theta = vm.runInContext('Brain.prior()', probe);
try { const m = fs.readFileSync(OUT, 'utf8').match(/Brain\.set\((\[.*\])\)/); if (m) theta = JSON.parse(m[1]); } catch (e) { }
const nW = Math.max(1, Math.min(os.cpus().length, 4)), workers = Array.from({ length: nW }, () => fork(__filename, ['--worker'])); let nid = 0; const waiting = new Map();
workers.forEach(w => w.on('message', ({ id, r }) => { waiting.get(id)(r); waiting.delete(id); }));
let rr = 0; const evalOn = (params, seeds) => new Promise(res => { const id = nid++; waiting.set(id, res); workers[rr++ % nW].send({ id, params, seeds }); });
(async () => {
  let bestMean = (await evalOn(theta, Array.from({ length: 32 }, (_, i) => 900000 + i))).mean; console.log('start held-out reward', bestMean.toFixed(3));   // (only ever replace the weights with better ones)
  for (let g = 0; g < gens; g++) {
    const seeds = Array.from({ length: K }, (_, i) => 100000 + g * 1000 + i), sigma = sigma0 * (1 - 0.6 * g / gens), eps = [];
    for (let i = 0; i < pairs; i++) eps.push(theta.map(() => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }));
    const jobs = []; for (const e of eps) { jobs.push(evalOn(theta.map((t, i) => t + sigma * e[i]), seeds)); jobs.push(evalOn(theta.map((t, i) => t - sigma * e[i]), seeds)); }
    const center = evalOn(theta, seeds), res = await Promise.all(jobs), c0 = await center;
    const all = res.map(r => r.mean), sd = Math.sqrt(all.reduce((s, x) => s + (x - all.reduce((a, b) => a + b, 0) / all.length) ** 2, 0) / all.length) || 1;
    const grad = theta.map(() => 0);
    for (let i = 0; i < pairs; i++) { const d = (all[2 * i] - all[2 * i + 1]) / (2 * sd); for (let j = 0; j < theta.length; j++) grad[j] += d * eps[i][j] / pairs; }
    theta = theta.map((t, j) => t + lr * sigma * grad[j] * 2);
    const chk = await evalOn(theta, Array.from({ length: 32 }, (_, i) => 900000 + i));   // fixed held-out seeds: the number to watch
    console.log(`gen ${g}  population mean ${(all.reduce((a, b) => a + b, 0) / all.length).toFixed(3)}  centre ${c0.mean.toFixed(3)}  held-out reward ${chk.mean.toFixed(3)} goals ${chk.goals}/32`);
    if (chk.mean > bestMean) { bestMean = chk.mean; fs.writeFileSync(OUT, '/* Written by tools/train_brain.js: weights for the CPU finisher (see brain.js). held-out reward ' + chk.mean.toFixed(3) + ' */\nBrain.set(' + JSON.stringify(theta.map(x => +x.toFixed(4))) + ');\n'); }
  }
  workers.forEach(w => w.kill()); process.exit(0);
})();
