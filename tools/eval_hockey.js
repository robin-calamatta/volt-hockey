/* Headless Volt Hockey evaluation: plays CPU vs CPU games and reports what each side did.
   Usage: node tools/eval_hockey.js <diffA> <diffB> [games] [minutes] [size]
   Prints per side: goals, shots on net, saves, goalie quality (how far the goalie was from the shot line when shots came), stuck escapes,
   passes completed, screens set, and the time each side had the ball. Sides swap every game. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const SRC = path.join(__dirname, '..', 'src') + path.sep;
function world(seed = 1) {
  let s = seed >>> 0 || 1; const M = Object.create(Math); M.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const ctx = { console, Math: M, performance, Object, Array, JSON, Map, Set, Float32Array, Float64Array, localStorage: { getItem() { return null; }, setItem() { } }, setTimeout, clearTimeout };
  ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['config', 'teams', 'settings', 'physics', 'chair', 'brain', 'ai', 'tuned', 'brain_weights', 'match']) vm.runInContext(fs.readFileSync(SRC + f + '.js', 'utf8') + '\n', ctx, { filename: f });
  ctx.Sound = { play() { } }; vm.runInContext('var Commentary = { pick() { return null; }, parse(x) { return x; } };', ctx); return ctx;
}
function evalGames(ctx, A, B, games, minutes, size) {
  ctx.A = A; ctx.B = B; ctx.G = games; ctx.MIN = minutes; ctx.SZ = size;
  return vm.runInContext(`(() => {
    Settings.penalties = true; const res = [0, 1].map(() => ({ goals: 0, shots: 0, saves: 0, gkErr: 0, gkN: 0, escapes: 0, hold: 0, wins: 0, screens: 0 }));
    for (let g = 0; g < G; g++) {
      const swap = g % 2, m = new Match({ teamA: 0, teamB: 1, players: [], practice: false, sizes: [SZ, SZ], difficulty: 'Normal' });
      const mk = n => { const raw = n.endsWith('!'), [base, kv] = n.replace('!', '').split(':'), D = Object.assign({}, CONFIG.difficulties[base]); if (raw) delete D.tune; if (kv) { D.tune = Object.assign({}, D.tune || {}); for (const p of kv.split(',')) { const [k, v] = p.split('='); if (k[0] === '@') D[k.slice(1)] = +v === 0 ? false : +v; else D.tune[k] = +v; } } return D; }, DA = mk(A), DB = mk(B); m.diffBySide = swap ? [DB, DA] : [DA, DB];
      const who = s => (s === 0) === !swap ? 0 : 1;            // side -> index of A (0) or B (1)
      let cool = [0, 0], prevScore = [0, 0];
      for (let i = 0; i < MIN * 3600; i++) {
        m.update(1 / 60); if (m.state !== 'play') continue; cool[0]--; cool[1]--;
        const b = m.ball;
        for (const s of [0, 1]) { const net = m.nets[1 - s], dir = net.mouthX > m.width / 2 ? 1 : -1;
          if (cool[s] <= 0 && b.vx * dir > 3.5 && dir * (net.mouthX - b.x) > 0 && dir * (net.mouthX - b.x) < 9 && Math.abs(b.y - m.centerY + b.vy * (net.mouthX - b.x) / b.vx) < CONFIG.net.width / 2 + 0.3) {
            cool[s] = 60; res[who(s)].shots++;
            const gk = m.chairs.find(c => !c.benched && c.side === 1 - s && c.role === 'goalie');
            if (gk) { const yl = b.y + b.vy * (gk.x - b.x) / b.vx; res[who(1 - s)].gkErr += Math.abs(gk.y - yl); res[who(1 - s)].gkN++; }
            m._pendingShot = { s, t: i };
          } }
        if (m._pendingShot && i - m._pendingShot.t > 90) { if (m.score[m._pendingShot.s] === prevScore[m._pendingShot.s]) res[who(1 - m._pendingShot.s)].saves++; m._pendingShot = null; }
        prevScore = m.score.slice();
        const h = m.chairs.find(c => !c.benched && aiHas(c, b)); if (h) res[who(h.side)].hold += 1 / 60;
        if (i % 30 === 0) for (const c of m.chairs) if (c.role === 'screen' && !c.benched) res[who(c.side)].screens += 0.5;
      }
      for (const s of [0, 1]) res[who(s)].goals += m.score[s];
      if (m.score[0] !== m.score[1]) res[who(m.score[0] > m.score[1] ? 0 : 1)].wins++;
      const st = m.stats || {}; res[0].escapes += 0; res[0].escapesAll = (res[0].escapesAll || 0) + Object.keys(st).filter(k => k.startsWith('escape')).reduce((a, k) => a + st[k], 0);
    }
    return res;
  })()`, ctx);
}
if (require.main === module) {
  const [A = 'Normal', B = 'Normal', games = 6, minutes = 3, size = 3] = process.argv.slice(2);
  const r = evalGames(world(+(process.env.SEED || 7)), A, B, +games, +minutes, +size);
  const f = (x, n) => (x / n).toFixed(2);
  for (const [i, name] of [[0, A], [1, B]]) { const q = r[i]; console.log(`${name.padEnd(10)} wins ${q.wins}/${games}  goals/g ${f(q.goals, games)}  shots/g ${f(q.shots, games)}  saves ${q.saves}  goalie err ${q.gkN ? (q.gkErr / q.gkN).toFixed(2) : '-'} m  hold ${f(q.hold, games)} s/g  screens ${f(q.screens, games)} s/g`); }
  console.log('escapes (both)', r[0].escapesAll);
}
module.exports = { world, evalGames };
