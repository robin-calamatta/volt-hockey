/* The new minigames (v10), built on the MODES framework in modes.js. Each mode keeps its state in m.gs (and c.gs per cart), so online
   players get it in every snapshot. Things on the floor (balls, flags, ramps, packages...) live in m.gs.objs as plain data
   { id, t: type, x, y, ... } and are drawn by modes_draw.js. */

const MG = {
  live: m => m.chairs.filter(c => !c.out),
  add(m, o) { const g = m.gs; g.objs = g.objs || []; o.id = g.nid = (g.nid || 0) + 1; g.objs.push(o); return o; },
  all: (m, t) => (m.gs.objs || []).filter(o => o.t === t),
  remove(m, o) { m.gs.objs = (m.gs.objs || []).filter(x => x !== o); },
  notice(m, text, s = 1.8) { m.notice = text; m.noticeLeft = s; },
  unout(c) { c.out = false; c.binLeft = 0; },
  people: m => m.chairs.filter(c => c.player),
  pname: c => (c.player && (c.player.name || c.player.tag)) || '',
  up: s => String(s).toUpperCase(),
  wander(c, m, sp = 0.6) {                                             // drift about the court like a cart with nothing to do
    if (!c.wt || Math.hypot(c.x - c.wt.x, c.y - c.wt.y) < 1.4 || Math.random() < 0.004) c.wt = { x: 2 + Math.random() * (m.width - 4), y: 2 + Math.random() * (m.height - 4) };
    return MH.to(c, c.wt.x, c.wt.y, sp);
  },
  chase(c, o, sp = 1, lead = 0.35) { return MH.to(c, o.x + (o.vx || 0) * lead, o.y + (o.vy || 0) * lead, sp); },
  rectPush(o, r, b, bounce = 0.3) {                                    // keep a circle out of a box { x0, y0, x1, y1 }
    const px = Math.max(b.x0, Math.min(o.x, b.x1)), py = Math.max(b.y0, Math.min(o.y, b.y1)); let dx = o.x - px, dy = o.y - py, d = Math.hypot(dx, dy);
    if (d >= r) return false;
    if (d === 0) { const l = o.x - b.x0, rr = b.x1 - o.x, t = o.y - b.y0, bt = b.y1 - o.y, mn = Math.min(l, rr, t, bt); if (mn === l) { dx = -1; dy = 0; d = -l; } else if (mn === rr) { dx = 1; dy = 0; d = -rr; } else if (mn === t) { dx = 0; dy = -1; d = -t; } else { dx = 0; dy = 1; d = -bt; } }
    else { dx /= d; dy /= d; }
    o.x += dx * (r - d); o.y += dy * (r - d);
    const vn = (o.vx || 0) * dx + (o.vy || 0) * dy; if (vn < 0) { o.vx -= (1 + bounce) * vn * dx; o.vy -= (1 + bounce) * vn * dy; }
    return true;
  },
  clearPath(ax, ay, bx, by, blocks, pad = 0.4) { const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.3); for (let i = 1; i < n; i++) { const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n; if (blocks.some(b => x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad)) return false; } return true; },
  pushTo(c, b, tx, ty, opts = {}) {                                    // the CPU steering a ball (or a big ball) towards a point: get behind it, then drive through it
    const ul = Math.hypot(tx - b.x, ty - b.y) || 1, ux = (tx - b.x) / ul, uy = (ty - b.y) / ul, back = b.r + 0.8;
    const rx = c.x - b.x, ry = c.y - b.y, along = rx * ux + ry * uy, side = -rx * uy + ry * ux;
    if (along > -back * 0.4) { const s = side >= 0 ? 1 : -1, k = b.r + 1.1; return MH.to(c, b.x - ux * back * 0.5 - uy * s * k, b.y - uy * back * 0.5 + ux * s * k, 1); }   // on the wrong side: go round it
    if (Math.abs(side) > b.r * 0.55 + 0.15) return MH.to(c, b.x - ux * back, b.y - uy * back, 1);
    const close = Math.hypot(rx, ry) < b.r + 1;
    return { ...MH.to(c, b.x + ux * 0.8, b.y + uy * 0.8, opts.speed || 1), spin: opts.spin && close && Math.random() < 0.2 ? (Math.random() < 0.5 ? 1 : -1) : 0 };
  },
  rankRows(m, list, score, fmt) { return list.slice().sort((a, b) => score(b) - score(a)).map(c => ({ c, text: fmt(c) })); },
  ffaTitle(m, ranked, score) { if (!ranked.length) return 'GAME OVER'; if (ranked.length > 1 && score(ranked[0]) === score(ranked[1])) return "IT'S A DRAW"; return `${MG.up(m.name(ranked[0]))} WINS!`; },
  teamTitle(m, sc) { return sc[0] === sc[1] ? "IT'S A DRAW" : `${MG.up(TEAMS[m.teams[sc[0] > sc[1] ? 0 : 1]].name)} WIN!`; },
  lastStanding(m, why) {                                               // free for all, last cart left: they win; the rest in the order they went out
    const live = MG.live(m); if (live.length > 1) return false;
    const rows = [...live.map(c => ({ c, text: 'last one standing' })), ...m.order.slice().reverse().map((c, i) => ({ c, text: why(c, i) }))];
    m.finishGame(live[0] ? `${MG.up(m.name(live[0]))} WINS!` : 'NOBODY WINS', rows); return true;
  },
  peopleLine: (m, f) => MG.people(m).slice(0, 4).map(c => `${MG.pname(c)} ${f(c)}`).join('   '),
  r2: v => Math.round(v * 100) / 100
};
const R_CART = () => CONFIG.chair.radius;
const minOpt = (values, def, label = 'Round length', key = 'minutes') => ({ key, label, values, def, fmt: v => v + ' min' });

/* =============================== HOT POTATO BOMB =============================== */
MODES.bomb = {
  init(m) { m.gs.holder = -1; m.gs.next = 0; },
  kickoff(m) { this.give(m, MG.live(m)[Math.floor(Math.random() * MG.live(m).length)], null); },
  give(m, c, from) {
    const g = m.gs; if (!c) return; g.holder = c.k; g.prev = from ? from.k : -1; g.cd = 0.5; g.back = 1.2;
    if (!from) { g.fuse = g.full = m.mini.fuse * (0.7 + Math.random() * 0.6); m.line(`${m.name(c)} has the bomb!`); }
    else { MG.notice(m, `${MG.up(m.name(from))} PASSES TO ${MG.up(m.name(c))}`, 1.2); m.sfx('blip'); }
  },
  step(m, h) {
    const g = m.gs; for (const o of MG.all(m, 'boom')) { o.life -= h; if (o.life <= 0) MG.remove(m, o); }
    if (g.holder < 0) { if ((g.next -= h) <= 0) { const live = MG.live(m); this.give(m, live[Math.floor(Math.random() * live.length)], null); } return; }
    g.fuse -= h; g.cd -= h; g.back -= h;
    if (g.fuse > 0) return;
    const c = m.chairs[g.holder]; g.holder = -1; g.next = 1.6;               // BOOM
    MG.add(m, { t: 'boom', x: MG.r2(c.x), y: MG.r2(c.y), life: 0.7 });
    for (const o of MG.live(m)) { if (o === c) continue; const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy); if (d < 3.5 && d > 0) { const k = (3.5 - d) * 2.2; o.vx += dx / d * k; o.vy += dy / d * k; } }
    MH.out(m, c); m.sfx('goal'); m.sfx('foul'); MG.notice(m, `BOOM! ${MG.up(m.name(c))} IS OUT`, 2); m.line(`Boom! ${m.name(c)} is out.`);
    MG.lastStanding(m, (k, i) => i === 0 ? 'blew up last' : 'blew up');
  },
  contact(m, a, b, d) {
    const g = m.gs; if (g.holder < 0 || g.cd > 0 || d > 2 * R_CART() + 0.08) return;
    for (const [h, o] of [[a, b], [b, a]]) if (h.k === g.holder && !o.out && !(o.k === g.prev && g.back > 0)) { this.give(m, o, h); return; }
  },
  cmd(c, cmd, m) { if (c.k === m.gs.holder) c.speedMul *= 1.12; return cmd; },
  ai(c, m) {
    const g = m.gs, live = MG.live(m).filter(o => o !== c);
    if (c.k === g.holder) { const t = MH.nearest(c, live.filter(o => o.k !== g.prev || g.back <= 0)) || MH.nearest(c, live); return t ? MG.chase(c, t, 1) : MG.wander(c, m); }
    const h = m.chairs[g.holder]; if (h && !h.out && MH.dist(c, h) < 7) return { ...MH.flee(c, m, [h]), speed: 1 };
    return MG.wander(c, m, 0.5);
  },
  hud(m) { const h = m.chairs[m.gs.holder]; return { clock: h ? 'BOMB!' : '...', a: 'HOT POTATO', b: `${MG.live(m).length} LEFT`, mid: h ? `${MG.up(m.name(h))} HAS THE BOMB` : 'NEW BOMB COMING', left: MG.peopleLine(m, c => c.out ? 'OUT' : c.k === m.gs.holder ? '💣' : '') }; },
  tag(c, m) { return c.k === m.gs.holder ? '💣 BOMB' : ''; },
  startLine: m => 'Pass the bomb before it blows!'
};

/* =============================== KING OF THE HILL =============================== */
MODES.hill = {
  init(m) { m.gs.zone = { x: m.width / 2, y: m.centerY, r: 2.3 }; m.gs.move = 20; m.gs.king = -1; for (const c of m.chairs) c.gs.pts = 0; },
  step(m, h) {
    const g = m.gs, Z = g.zone;
    if ((g.move -= h) <= 0) {
      let p; for (let t = 0; t < 30; t++) { p = { x: 3.5 + Math.random() * (m.width - 7), y: 3 + Math.random() * (m.height - 6) }; if (Math.hypot(p.x - Z.x, p.y - Z.y) > 8) break; }
      Object.assign(Z, { x: MG.r2(p.x), y: MG.r2(p.y) }); g.move = 20; MG.notice(m, 'THE HILL MOVES!', 1.6); m.sfx('whistle');
    }
    const inside = MG.live(m).filter(c => Math.hypot(c.x - Z.x, c.y - Z.y) < Z.r).sort((a, b) => Math.hypot(a.x - Z.x, a.y - Z.y) - Math.hypot(b.x - Z.x, b.y - Z.y));
    if (!inside.length) { g.king = -1; g.busy = 0; return; }
    const k = inside[0]; if (g.king !== k.k && k.gs.pts > 3 && Math.random() < 0.5) m.line(`${m.name(k)} takes the hill.`);
    g.king = k.k; g.busy = inside.length > 1 ? 1 : 0; k.gs.pts += h * (g.busy ? 0.4 : 1); if (k.gs.pts >= m.mini.target) this.end(m, false);
  },
  end(m, timeUp) { const r = MG.rankRows(m, m.chairs, c => c.gs.pts, c => `${Math.floor(c.gs.pts)} points`); m.finishGame(MG.ffaTitle(m, r.map(x => x.c), c => Math.floor(c.gs.pts)), r, -1, timeUp ? 'Time up: the most points wins' : `First to ${m.mini.target} points`); },
  timeUp(m) { this.end(m, true); },
  ai(c, m) {
    const Z = m.gs.zone, d = Math.hypot(c.x - Z.x, c.y - Z.y);
    if (d < Z.r) { const rival = MG.live(m).find(o => o !== c && Math.hypot(o.x - Z.x, o.y - Z.y) < Z.r + 0.8); if (rival) return MG.chase(c, rival, 1, 0.1); return MH.to(c, Z.x + Math.cos(c.k) * 0.6, Z.y + Math.sin(c.k) * 0.6, 0.4); }
    return MH.to(c, Z.x, Z.y, 1);
  },
  hud(m) { const k = m.gs.king, lead = m.chairs.slice().sort((a, b) => b.gs.pts - a.gs.pts)[0]; return { a: 'KING OF THE HILL', b: k >= 0 ? `👑 ${MG.up(m.name(m.chairs[k]))}${m.gs.busy ? ' (CONTESTED)' : ''}` : 'NOBODY ON THE HILL', mid: `First to ${m.mini.target}  •  ${m.name(lead)} ${Math.floor(lead.gs.pts)}`, left: MG.peopleLine(m, c => Math.floor(c.gs.pts)) }; },
  tag(c, m) { return c.k === m.gs.king ? '👑 ' + Math.floor(c.gs.pts) : ''; },
  startLine: () => 'Get on the hill and stay there!'
};

/* =============================== SUMO RING =============================== */
const SUMO = { R: 6.4, shrinkAfter: 20, minR: 1.6, shrinkRate: 0.2, push: 2.6, spinShove: 4.5 };
MODES.sumo = {
  init(m) { m.gs.round = 1; m.gs.R = SUMO.R; m.gs.rt = 0; m.gs.pause = 0; for (const c of m.chairs) c.gs.wins = 0; },
  kickoff(m) {
    const n = m.chairs.length; m.gs.R = SUMO.R; m.gs.rt = 0;
    m.chairs.forEach((c, i) => { const t = i / n * Math.PI * 2, x = m.width / 2 + Math.cos(t) * 4, y = m.centerY + Math.sin(t) * 4; Object.assign(c, { x, y, px: x, py: y, heading: t + Math.PI, ph: t + Math.PI, vx: 0, vy: 0 }); });
  },
  step(m, h) {
    const g = m.gs, cx = m.width / 2, cy = m.centerY;
    if (g.pause > 0) { g.pause -= h; if (g.pause <= 0) { g.round++; for (const c of m.chairs) MG.unout(c); m.order = []; m.kickoff(); } return; }
    g.rt += h; if (g.rt > SUMO.shrinkAfter && g.R > SUMO.minR) { if (g.R === SUMO.R) MG.notice(m, 'THE RING IS SHRINKING!'); g.R = Math.max(SUMO.minR, g.R - SUMO.shrinkRate * h); }
    for (const c of MG.live(m)) if (Math.hypot(c.x - cx, c.y - cy) > g.R + 0.15) { MH.out(m, c); m.sfx('bump'); MG.notice(m, `${MG.up(m.name(c))} IS OUT OF THE RING`, 1.4); }
    const live = MG.live(m); if (live.length > 1) return;
    const w = live[0]; if (w) { w.gs.wins++; m.line(`${m.name(w)} wins round ${g.round}!`); } MG.notice(m, w ? `${MG.up(m.name(w))} WINS ROUND ${g.round}` : 'NOBODY WINS THE ROUND', 2.2);
    if (g.round >= m.mini.rounds) { const r = MG.rankRows(m, m.chairs, c => c.gs.wins * 10 - (m.order.indexOf(c) < 0 ? -5 : m.order.length - m.order.indexOf(c)), c => `${c.gs.wins} round${c.gs.wins === 1 ? '' : 's'} won`); m.finishGame(MG.ffaTitle(m, r.map(x => x.c), c => c.gs.wins), r, -1, `${m.mini.rounds} round${m.mini.rounds > 1 ? 's' : ''}`); }
    else g.pause = 2.2;
  },
  contact(m, a, b, d) {                                                 // a spinning cart swats whoever it touches
    for (const [s, o] of [[a, b], [b, a]]) if (s.spinLeft > 0 && !(o.gs.swat > m.simTime)) { const dx = o.x - s.x, dy = o.y - s.y, l = Math.hypot(dx, dy) || 1; o.vx += dx / l * SUMO.spinShove; o.vy += dy / l * SUMO.spinShove; o.gs.swat = m.simTime + 0.5; m.sfx('bump'); }
  },
  bump(m, a, b, closing) { if (closing <= 0.2) return; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, k = closing * (SUMO.push - 1) * 0.5; a.vx -= dx / d * k; a.vy -= dy / d * k; b.vx += dx / d * k; b.vy += dy / d * k; },
  cmd(c, cmd, m) { return m.gs.pause > 0 ? { x: 0, y: 0, spin: 0, speed: 0 } : cmd; },
  ai(c, m) {
    const cx = m.width / 2, cy = m.centerY, R = m.gs.R, me = Math.hypot(c.x - cx, c.y - cy);
    if (me > R - 0.9 && Math.random() < 0.8) return MH.to(c, cx, cy, 1);                         // too close to the edge: back to the middle
    const t = MH.nearest(c, MG.live(m)); if (!t) return { x: 0, y: 0 };
    const ul = Math.hypot(t.x - cx, t.y - cy) || 1, ux = (t.x - cx) / ul, uy = (t.y - cy) / ul;   // get between them and the middle, then shove them out
    const px = t.x - ux * 1.5, py = t.y - uy * 1.5, behind = (c.x - t.x) * ux + (c.y - t.y) * uy < -0.5;
    return behind || Math.hypot(c.x - px, c.y - py) < 0.8 ? { ...MG.chase(c, t, 1, 0.1), spin: MH.dist(c, t) < 1.25 && Math.random() < 0.35 ? (Math.random() < 0.5 ? 1 : -1) : 0 } : MH.to(c, px, py, 0.9);
  },
  hud(m) { const live = MG.live(m); return { clock: `ROUND ${Math.min(m.gs.round, m.mini.rounds)} / ${m.mini.rounds}`, a: 'SUMO', b: `${live.length} LEFT`, mid: m.gs.R < SUMO.R ? 'THE RING IS SHRINKING' : 'Push them off the ring', left: MG.peopleLine(m, c => `${c.gs.wins}${c.out ? ' (out)' : ''}`) }; },
  tag(c, m) { return c.gs.wins ? '★'.repeat(c.gs.wins) : ''; },
  startLine: m => `Round ${m.gs.round}: push everyone off the ring!`
};

/* =============================== FLOOR IS LAVA =============================== */
MODES.lava = {
  init(m) { const g = m.gs; g.cols = 14; g.rows = 7; g.t = '0'.repeat(g.cols * g.rows); g.el = 0; g.next = 2.5; m.lavaT = new Array(g.cols * g.rows).fill(0); },
  tileAt(m, x, y) { const g = m.gs, i = Math.floor(x / (m.width / g.cols)), j = Math.floor(y / (m.height / g.rows)); return i < 0 || j < 0 || i >= g.cols || j >= g.rows ? -1 : j * g.cols + i; },
  center(m, k) { const g = m.gs, w = m.width / g.cols, hh = m.height / g.rows; return { x: (k % g.cols + 0.5) * w, y: (Math.floor(k / g.cols) + 0.5) * hh }; },
  step(m, h) {
    const g = m.gs, T = g.t.split(''), N = T.length; g.el += h; if (!m.lavaT) m.lavaT = new Array(N).fill(0);
    for (let k = 0; k < N; k++) { if (T[k] === '0') continue; m.lavaT[k] -= h; if (m.lavaT[k] > 0) continue; if (T[k] === '1') { T[k] = '2'; m.lavaT[k] = Math.min(14, 5 + g.el * 0.06); } else T[k] = '0'; }
    if ((g.next -= h) <= 0) {                                            // more and more of the floor turns to lava as the game goes on
      g.next = Math.max(1.1, 3 - g.el * 0.015); const safe = []; for (let k = 0; k < N; k++) if (T[k] === '0') safe.push(k);
      const want = Math.min(Math.floor(safe.length - N * 0.3), 2 + Math.floor(g.el / 15));
      for (let n = 0; n < want; n++) { const k = safe.splice(Math.floor(Math.random() * safe.length), 1)[0]; T[k] = '1'; m.lavaT[k] = 1.7; }
    }
    g.t = T.join('');
    for (const o of MG.all(m, 'boom')) { o.life -= h; if (o.life <= 0) MG.remove(m, o); }
    for (const c of MG.live(m)) { const k = this.tileAt(m, c.x, c.y); if (k >= 0 && T[k] === '2') { MH.out(m, c); MG.add(m, { t: 'boom', x: MG.r2(c.x), y: MG.r2(c.y), life: 0.6, lava: 1 }); m.sfx('foul'); MG.notice(m, `${MG.up(m.name(c))} IS TOAST`, 1.5); if (Math.random() < 0.5) m.line(`${m.name(c)} touched the lava!`); } }
    MG.lastStanding(m, () => 'melted');
  },
  timeUp(m) { const live = MG.live(m); m.finishGame(live.length === 1 ? `${MG.up(m.name(live[0]))} WINS!` : live.length ? `${live.length} SURVIVORS WIN!` : 'NOBODY WINS', [...live.map(c => ({ c, text: 'survived' })), ...m.order.slice().reverse().map(c => ({ c, text: 'melted' }))], -1, 'Time up: everyone still standing wins'); },
  ai(c, m) {
    const T = m.gs.t, here = this.tileAt(m, c.x, c.y), ahead = this.tileAt(m, c.x + Math.cos(c.heading) * 1.2, c.y + Math.sin(c.heading) * 1.2);
    const bad = k => k < 0 || T[k] !== '0';
    if (!c.safeK || bad(c.safeK) || bad(here) || bad(ahead)) {           // pick the nearest tile that is safe, with safe neighbours
      let best = -1, bd = Infinity; for (let k = 0; k < T.length; k++) { if (T[k] !== '0') continue; const p = this.center(m, k); let d = Math.hypot(p.x - c.x, p.y - c.y); for (const nb of [k - 1, k + 1, k - m.gs.cols, k + m.gs.cols]) if (nb >= 0 && nb < T.length && T[nb] !== '0') d += 1.5; if (d < bd) { bd = d; best = k; } }
      c.safeK = best;
    }
    if (c.safeK < 0) return MG.wander(c, m); const p = this.center(m, c.safeK), d = Math.hypot(p.x - c.x, p.y - c.y);
    return d < 0.5 ? { x: 0, y: 0, speed: 0 } : MH.to(c, p.x, p.y, d < 1.5 ? 0.5 : 1);
  },
  hud(m) { return { a: 'FLOOR IS LAVA', b: `${MG.live(m).length} LEFT`, mid: 'Orange melts.  Red is lava!', left: MG.peopleLine(m, c => c.out ? 'TOAST' : 'safe') }; },
  startLine: () => 'The floor is lava!'
};

/* =============================== GOAL GAMES: MULTIBALL MADNESS and GIANT BALL =============================== */
const goalGame = (big) => ({
  teams: true,
  init(m) {
    const g = m.gs; g.score = [0, 0]; g.gw = big ? 3.3 : 1.7; g.gl = big ? 2.3 : 1.1;
    const n = big ? 1 : m.mini.balls; for (let i = 0; i < n; i++) this.spawn(m, i, n);
    for (const c of m.chairs) c.gs.goals = 0;
  },
  spawn(m, i, n, ball) {
    const x = m.width / 2, y = n > 1 ? m.centerY + (i - (n - 1) / 2) * Math.min(2.4, (m.height - 3) / n) : m.centerY;
    const b = ball || MG.add(m, { t: big ? 'bigball' : 'ball', r: big ? 1.15 : 0.2, mass: big ? 240 : 0.5, x, y, vx: 0, vy: 0, wait: 0, last: -1 });
    Object.assign(b, { x, y, vx: big ? 0 : (Math.random() - 0.5) * 2, vy: big ? 0 : (Math.random() - 0.5) * 2, wait: 0 }); return b;
  },
  boxes(m) { const g = m.gs, cy = m.centerY; return [{ x0: -1, y0: cy - g.gw, x1: g.gl, y1: cy + g.gw, side: 0 }, { x0: m.width - g.gl, y0: cy - g.gw, x1: m.width + 1, y1: cy + g.gw, side: 1 }]; },
  kickoff(m) { const live = m.chairs; live.forEach(c => { const mates = live.filter(k => k.side === c.side), j = mates.indexOf(c), x = c.side ? m.width - 4.5 : 4.5, y = m.centerY + (j - (mates.length - 1) / 2) * 2.2; Object.assign(c, { x, y, px: x, py: y, heading: c.side ? Math.PI : 0, ph: c.side ? Math.PI : 0 }); }); for (const [i, b] of MG.all(m, big ? 'bigball' : 'ball').entries()) this.spawn(m, i, MG.all(m, big ? 'bigball' : 'ball').length, b); },
  step(m, h) {
    const g = m.gs, live = MG.live(m), K = CONFIG.chair, boxes = this.boxes(m), cy = m.centerY;
    for (const c of live) for (const b of boxes) MG.rectPush(c, R_CART(), b, K.boardBounce);          // carts cannot drive into the goals
    const balls = MG.all(m, big ? 'bigball' : 'ball');
    for (const b of balls) {
      if (b.wait > 0) { b.wait -= h; if (b.wait <= 0) this.spawn(m, balls.indexOf(b), balls.length, b); continue; }
      let who;
      if (big) {                                                          // the giant ball is heavy: carts push it (and it pushes back)
        for (const c of live) { const d = Math.hypot(b.x - c.x, b.y - c.y); if (d < b.r + R_CART() + 0.05) who = c; Physics.circles(b, b.r, b.mass, c, R_CART(), K.mass * (c.massMul || 1), 0.25); }
        const sp = Math.hypot(b.vx, b.vy); if (sp > 0) { const k = Math.max(0, sp - 0.55 * h) / sp; b.vx *= k; b.vy *= k; } b.x += b.vx * h; b.y += b.vy * h;
        const r = b.r; if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy) * 0.5; } if (b.y > m.height - r) { b.y = m.height - r; b.vy = -Math.abs(b.vy) * 0.5; } if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx) * 0.5; } if (b.x > m.width - r) { b.x = m.width - r; b.vx = -Math.abs(b.vx) * 0.5; }
      } else who = MH.ballPhys(m, b, h, live, { bounce: 0.45, friction: 0.9, wallBounce: 0.7 });
      for (const o of balls) if (o !== b && !(o.wait > 0) && b.id < o.id) Physics.circles(b, b.r, b.mass, o, o.r, o.mass, 0.8);
      if (who) b.last = who.k;
      for (const bx of boxes) {                                           // the goal line: the ball's centre over it, between the posts
        const inMouth = Math.abs(b.y - cy) < g.gw - (big ? 0 : b.r);
        if (inMouth && ((bx.side === 0 && b.x < g.gl) || (bx.side === 1 && b.x > m.width - g.gl))) { this.goal(m, b, 1 - bx.side); break; }
        if (!inMouth) MG.rectPush(b, b.r, bx, 0.6);
      }
      b.x = MG.r2(b.x); b.y = MG.r2(b.y);
    }
  },
  goal(m, b, side) {
    const g = m.gs; g.score[side]++; b.wait = 1.2; b.x = side ? m.width - 0.6 : 0.6; b.vx = b.vy = 0; const c = m.chairs[b.last];
    if (c && c.side === side) c.gs.goals++;
    m.sfx('goal'); MG.notice(m, `GOAL! ${MG.up(TEAMS[m.teams[side]].name)} ${g.score[0]} - ${g.score[1]}`, 1.8); m.line(c ? (c.side === side ? `${m.name(c)} scores!` : `Own goal by ${m.name(c)}!`) : 'Goal!');
    if (big && g.score[side] >= m.mini.target) this.end(m, false);
  },
  end(m, timeUp) { const sc = m.gs.score; m.finishGame(MG.teamTitle(m, sc), MG.rankRows(m, m.chairs, c => c.gs.goals * 10 + (c.side === (sc[0] > sc[1] ? 0 : 1) ? 1 : 0), c => `${c.gs.goals} goal${c.gs.goals === 1 ? '' : 's'}`), sc[0] === sc[1] ? -1 : sc[0] > sc[1] ? 0 : 1, `${sc[0]} - ${sc[1]}`); },
  timeUp(m) { this.end(m, true); },
  ai(c, m) {
    const balls = MG.all(m, big ? 'bigball' : 'ball').filter(b => !(b.wait > 0)); if (!balls.length) return MG.wander(c, m, 0.4);
    const goalX = c.side ? 0 : m.width, myGoal = c.side ? m.width : 0, cy = m.centerY;
    const mates = m.chairs.filter(k => k.side === c.side), keeper = !big && mates.length > 2 && mates.indexOf(c) === 0;
    if (keeper) { const threat = balls.filter(b => Math.abs(b.x - myGoal) < 8).sort((a, b) => Math.abs(a.x - myGoal) - Math.abs(b.x - myGoal))[0]; if (!threat) return MH.to(c, Math.abs(myGoal - (c.side ? m.gs.gl + 1.3 : m.gs.gl + 1.3)) && (c.side ? m.width - m.gs.gl - 1.3 : m.gs.gl + 1.3), cy, 0.7); return MG.pushTo(c, threat, m.width / 2, threat.y < cy ? 1 : m.height - 1, { spin: true }); }
    const b = big ? balls[0] : balls.slice().sort((a, b2) => MH.dist(c, a) - MH.dist(c, b2))[(mates.indexOf(c) % 2 === 1 && balls.length > 2) ? 1 : 0];
    return MG.pushTo(c, b, goalX, cy + (Math.random() - 0.5) * m.gs.gw, { spin: !big });
  },
  hud(m) { const sc = m.gs.score; return { a: MG.up(TEAMS[m.teams[0]].name), b: MG.up(TEAMS[m.teams[1]].name), sa: String(sc[0]), sb: String(sc[1]), mid: big ? `GIANT BALL   •   first to ${m.mini.target}` : `MULTIBALL   •   ${MG.all(m, 'ball').length} balls` }; },
  startLine: () => big ? 'Push the giant ball!' : 'Balls everywhere!'
});
MODES.multiball = goalGame(false);
MODES.giant = goalGame(true);

/* =============================== BOWLING =============================== */
const BOWL = { foul: 0.33, headX: 5.2, pinR: 0.13, pinMass: 0.35, ballR: 0.26, ballMass: 3, gap: 0.62 };
MODES.bowling = {
  init(m) { const g = m.gs; g.turn = 0; g.frame = 1; g.roll = 1; g.phase = 'aim'; g.t = 0; g.last = ''; for (const c of m.chairs) { c.gs.score = 0; c.gs.strikes = 0; } this.setPins(m, true); },
  spot(m, i) { const row = [0, 1, 1, 2, 2, 2, 3, 3, 3, 3][i], j = [0, 0, 1, 0, 1, 2, 0, 1, 2, 3][i]; return { x: m.width - BOWL.headX + row * BOWL.gap * 0.87, y: m.centerY + (j - row / 2) * BOWL.gap }; },
  setPins(m, all) {
    if (all) { for (const p of MG.all(m, 'pin')) MG.remove(m, p); for (let i = 0; i < 10; i++) { const s = this.spot(m, i); MG.add(m, { t: 'pin', i, x: s.x, y: s.y, vx: 0, vy: 0, r: BOWL.pinR, mass: BOWL.pinMass, down: 0 }); } }
    else for (const p of MG.all(m, 'pin')) if (p.down) MG.remove(m, p); else { const s = this.spot(m, p.i); Object.assign(p, { x: s.x, y: s.y, vx: 0, vy: 0 }); }
    let b = MG.all(m, 'bball')[0]; if (!b) b = MG.add(m, { t: 'bball', r: BOWL.ballR, mass: BOWL.ballMass }); Object.assign(b, { x: m.width * BOWL.foul - 1.6, y: m.centerY, vx: 0, vy: 0 });
  },
  bowler: m => m.chairs[m.gs.turn % m.chairs.length],
  kickoff(m) { this.place(m); },
  place(m) {                                                              // the bowler at the start of the lane; everyone else watches from the side
    const bw = this.bowler(m); let n = 0;
    for (const c of m.chairs) {
      const me = c === bw, x = me ? 1.6 : 2 + (n % 6) * 2.4, y = me ? m.centerY : (n < 6 ? 1.1 : m.height - 1.1); if (!me) n++;
      Object.assign(c, { x, y, px: x, py: y, vx: 0, vy: 0, heading: me ? 0 : (y < m.centerY ? Math.PI / 2 : -Math.PI / 2) }); c.ph = c.heading; c.gs.ghost = !me; c.gs.watch = !me;
    }
    m.gs.phase = 'aim'; m.gs.t = 0;
  },
  focus(m) { const b = MG.all(m, 'bball')[0]; return m.gs.phase === 'roll' && b ? b : null; },
  step(m, h) {
    const g = m.gs, bw = this.bowler(m), b = MG.all(m, 'bball')[0], pins = MG.all(m, 'pin'); g.t += h;
    if (g.phase === 'next') { if (g.t > 1.8) this.advance(m); return; }
    const who = MH.ballPhys(m, b, h, g.phase === 'aim' ? [bw] : [], { bounce: 0.35, friction: 0.22, wallBounce: 0.4 });
    for (const p of pins) {
      MH.ballPhys(m, p, h, [], { friction: 2.2, wallBounce: 0.3 });
      Physics.circles(b, b.r, b.mass, p, p.r, p.mass, 0.7);
      for (const q of pins) if (q.id > p.id) Physics.circles(p, p.r, p.mass, q, q.r, q.mass, 0.6);
      const s = this.spot(m, p.i); if (!p.down && (Math.hypot(p.vx, p.vy) > 0.9 || Math.hypot(p.x - s.x, p.y - s.y) > 0.22)) p.down = 1;
      p.x = MG.r2(p.x); p.y = MG.r2(p.y);
    }
    b.x = MG.r2(b.x); b.y = MG.r2(b.y);
    if (g.phase === 'aim') {
      if (bw.x > m.width * BOWL.foul - R_CART()) { bw.vx = Math.min(bw.vx, 0); bw.x = m.width * BOWL.foul - R_CART(); }   // the foul line
      if (b.x > m.width * BOWL.foul && Math.hypot(b.vx, b.vy) > 0.4) { g.phase = 'roll'; g.t = 0; m.sfx('screech'); }
      else if (g.t > 14 || (who && b.x > m.width * BOWL.foul - 0.2 && Math.hypot(b.vx, b.vy) < 0.4 && g.t > 10)) { g.phase = 'roll'; g.t = 0; }
    } else if (g.phase === 'roll') {
      const moving = Math.hypot(b.vx, b.vy) > 0.06 || pins.some(p => Math.hypot(p.vx, p.vy) > 0.05);
      if ((!moving && g.t > 1.2) || g.t > 9) this.score(m);
    }
  },
  score(m) {
    const g = m.gs, bw = this.bowler(m), pins = MG.all(m, 'pin'), now = pins.filter(p => p.down).length, total = g.roll === 1 ? now : g.down1 + now;   // (the pins knocked by ball 1 are cleared before ball 2)
    let bonus = 0, text;
    if (g.roll === 1 && now === 10) { bonus = 10; text = 'STRIKE!'; bw.gs.strikes++; }
    else if (g.roll === 2 && total === 10) { bonus = 5; text = 'SPARE!'; } else text = now === 0 ? 'GUTTER...' : `${now} PIN${now === 1 ? '' : 'S'}`;
    bw.gs.score += now + bonus; g.last = `${MG.up(m.name(bw))}: ${text}`; MG.notice(m, g.last, 1.8); m.sfx(bonus ? 'goal' : 'blip'); if (bonus || Math.random() < 0.4) m.line(`${m.name(bw)}: ${text.toLowerCase()}`);
    if (g.roll === 1 && now < 10) { g.roll = 2; g.down1 = now; g.phase = 'next'; g.t = 0; g.again = 1; }
    else { g.roll = 1; g.phase = 'next'; g.t = 0; g.again = 0; }
  },
  advance(m) {
    const g = m.gs;
    if (g.again) { this.setPins(m, false); this.place(m); return; }
    g.turn++; if (g.turn % m.chairs.length === 0) g.frame++;
    if (g.frame > m.mini.frames) { const r = MG.rankRows(m, m.chairs, c => c.gs.score, c => `${c.gs.score} points${c.gs.strikes ? ', ' + c.gs.strikes + ' strike' + (c.gs.strikes > 1 ? 's' : '') : ''}`); m.finishGame(MG.ffaTitle(m, r.map(x => x.c), c => c.gs.score), r, -1, `${m.mini.frames} frames`); return; }
    this.setPins(m, true); this.place(m); m.line(`${m.name(this.bowler(m))} to bowl.`);
  },
  cmd(c, cmd, m) { if (c.gs.watch || m.gs.phase !== 'aim') return { x: 0, y: 0, spin: 0, speed: 0 }; return cmd; },
  ai(c, m) {
    if (c.gs.watch || m.gs.phase !== 'aim') return { x: 0, y: 0, speed: 0 };
    const b = MG.all(m, 'bball')[0], head = this.spot(m, 0), err = (c.gs.aimErr === undefined || m.gs.t < 0.1) ? (c.gs.aimErr = (Math.random() - 0.5) * (0.5 + 2.5 * ((m.difficulty || {}).reaction || 0.2))) : c.gs.aimErr;
    return MG.pushTo(c, b, head.x, head.y + err, { speed: c.gs.aimSp || (c.gs.aimSp = 0.75 + Math.random() * 0.25) });
  },
  hud(m) { const bw = this.bowler(m); return { clock: `FRAME ${Math.min(m.gs.frame, m.mini.frames)} / ${m.mini.frames}`, a: 'BOWLING', b: `${MG.up(m.name(bw))}, BALL ${m.gs.roll}`, mid: m.gs.last || 'Push the ball at the pins', left: MG.peopleLine(m, c => c.gs.score) }; },
  tag(c, m) { return c === this.bowler(m) ? '🎳 ' + (MG.pname(c) || m.name(c)) : (c.player ? MG.pname(c) : ''); },
  startLine: m => `${m.name(m.chairs[0])} to bowl.`
};

/* =============================== MINI GOLF =============================== */
const GOLF_HOLES = [
  { name: 'The Dogleg', tee: [3, 3], cup: [25, 12], blocks: [[9, 0, 10, 10.5], [18, 4.5, 19, 15]], via: [[9.5, 12.8], [18.5, 2.2]] },
  { name: 'The Fortress', tee: [3, 7.5], cup: [20, 7.5], blocks: [[17.2, 4, 17.9, 6.6], [17.2, 8.4, 17.9, 11], [17.2, 4, 23, 4.7], [17.2, 10.3, 23, 11], [22.3, 4, 23, 11]], via: [[15.5, 7.5]] },
  { name: 'Pinball', tee: [25, 7.5], cup: [3, 7.5], blocks: [[13.4, 3.2, 14.6, 4.4], [13.4, 10.6, 14.6, 11.8], [8.4, 6.9, 9.6, 8.1], [18.4, 6.9, 19.6, 8.1], [5.5, 4.5, 6.2, 10.5]], via: [[14, 7.5], [9, 3.5], [9, 11.5], [4, 2.5], [4, 12.5]] },
  { name: 'The Snake', tee: [2.5, 2.5], cup: [25.5, 2.5], blocks: [[6.5, 0, 7.3, 11], [13.6, 4, 14.4, 15], [20.7, 0, 21.5, 11]], via: [[6.9, 13], [14, 2], [21.1, 13]] }
];
MODES.golf = {
  init(m) { m.gs.hole = 0; m.gs.ht = 0; for (const c of m.chairs) { c.gs.strokes = 0; c.gs.total = 0; } this.setHole(m); },
  H: m => { const s = m.width / 28, sy = m.height / 15, H = GOLF_HOLES[m.gs.hole % GOLF_HOLES.length]; return { name: H.name, tee: { x: H.tee[0] * s, y: H.tee[1] * sy }, cup: { x: H.cup[0] * s, y: H.cup[1] * sy }, blocks: H.blocks.map(b => ({ x0: b[0] * s, y0: b[1] * sy, x1: b[2] * s, y1: b[3] * sy })), via: H.via.map(v => ({ x: v[0] * s, y: v[1] * sy })) }; },
  setHole(m) {
    const H = this.H(m), g = m.gs; g.ht = 0; g.cup = H.cup; g.blocks = H.blocks; g.name = H.name;
    for (const o of MG.all(m, 'gball')) MG.remove(m, o);
    m.chairs.forEach((c, i) => { c.gs.strokes = 0; c.gs.holed = 0; c.gs.touch = 0; c.gs.lastHit = -9; const n = m.chairs.length, off = (i - (n - 1) / 2) * 0.75, ux = H.cup.x > H.tee.x ? 1 : -1;
      MG.add(m, { t: 'gball', k: c.k, x: H.tee.x + (ux > 0 ? 0.9 : -0.9), y: H.tee.y + off, vx: 0, vy: 0, r: 0.15, mass: 0.4 });
      Object.assign(c, { x: H.tee.x - ux * 0.4, y: H.tee.y + off, vx: 0, vy: 0, heading: ux > 0 ? 0 : Math.PI }); c.px = c.x; c.py = c.y; c.ph = c.heading; });
  },
  kickoff(m) { this.setHole(m); },
  step(m, h) {
    const g = m.gs, live = MG.live(m), K = CONFIG.chair; g.ht += h;
    if (g.wait > 0) { g.wait -= h; if (g.wait <= 0) { g.hole++; if (g.hole >= m.mini.holes) return this.end(m); this.setHole(m); m.line(`Hole ${g.hole + 1}: ${g.name}.`); } return; }
    for (const c of live) for (const b of g.blocks) MG.rectPush(c, R_CART(), b, K.boardBounce);
    for (const b of MG.all(m, 'gball')) {
      const c = m.chairs[b.k], was = Math.hypot(b.vx, b.vy), who = MH.ballPhys(m, b, h, c && !c.gs.holed ? [c] : [], { bounce: 0.5, friction: 0.75, wallBounce: 0.75 });
      for (const bl of g.blocks) MG.rectPush(b, b.r, bl, 0.75);
      if (who) { if (m.simTime - c.gs.lastHit > 0.7) { c.gs.strokes++; c.gs.lastHit = m.simTime; } }        // every touch is a stroke (pushing it along counts again every 0.7 s)
      const d = Math.hypot(b.x - g.cup.x, b.y - g.cup.y);
      if (d < 0.24 && Math.hypot(b.vx, b.vy) < 4.5) { c.gs.holed = 1; c.gs.total += c.gs.strokes; MG.remove(m, b); m.sfx('goal'); MG.notice(m, `${MG.up(m.name(c))} SINKS IT IN ${c.gs.strokes}`, 1.6); if (c.gs.strokes === 1) m.line(`A hole in one for ${m.name(c)}!`); continue; }
      else if (d < 0.6 && was > 0) { const k = 1.2 * h / d; b.vx += (g.cup.x - b.x) * k; b.vy += (g.cup.y - b.y) * k; }   // the cup's lip pulls a slow ball in
      b.x = MG.r2(b.x); b.y = MG.r2(b.y);
    }
    if (m.chairs.every(c => c.gs.holed) || g.ht > m.mini.holeTime) {
      for (const c of m.chairs) if (!c.gs.holed) { c.gs.strokes += 3; c.gs.total += c.gs.strokes; c.gs.holed = 1; }
      for (const o of MG.all(m, 'gball')) MG.remove(m, o);
      g.wait = 2.2; MG.notice(m, g.hole + 1 >= m.mini.holes ? 'LAST HOLE DONE' : `HOLE ${g.hole + 1} DONE`, 2);
    }
  },
  end(m) { const r = MG.rankRows(m, m.chairs, c => -c.gs.total, c => `${c.gs.total} strokes`); m.finishGame(MG.ffaTitle(m, r.map(x => x.c), c => -c.gs.total), r, -1, `${m.mini.holes} holes: the fewest strokes wins`); },
  ai(c, m) {
    if (c.gs.holed || m.gs.wait > 0) return { x: 0, y: 0, speed: 0 };
    const b = MG.all(m, 'gball').find(o => o.k === c.k); if (!b) return { x: 0, y: 0, speed: 0 };
    if (Math.hypot(b.vx, b.vy) > 0.5) return { x: 0, y: 0, speed: 0 };    // wait for it to stop
    const g = m.gs, H = this.H(m); let tgt = g.cup;
    if (!MG.clearPath(b.x, b.y, g.cup.x, g.cup.y, g.blocks)) { let best = null, bd = Infinity; for (const v of H.via) { if (!MG.clearPath(b.x, b.y, v.x, v.y, g.blocks)) continue; const d = Math.hypot(v.x - b.x, v.y - b.y) + Math.hypot(g.cup.x - v.x, g.cup.y - v.y) * (MG.clearPath(v.x, v.y, g.cup.x, g.cup.y, g.blocks) ? 1 : 1.6); if (d < bd) { bd = d; best = v; } } if (best) tgt = best; }
    const dist = Math.hypot(tgt.x - b.x, tgt.y - b.y);
    return MG.pushTo(c, b, tgt.x, tgt.y, { speed: tgt === g.cup ? Math.min(1, Math.max(0.3, dist / 7)) : 0.85 });
  },
  hud(m) { const g = m.gs; return { clock: `HOLE ${Math.min(g.hole + 1, m.mini.holes)} / ${m.mini.holes}`, a: 'MINI GOLF', b: MG.up(g.name || ''), mid: `${Math.max(0, Math.ceil(m.mini.holeTime - g.ht))}s left`, left: MG.peopleLine(m, c => `${c.gs.holed ? '⛳' : c.gs.strokes}  (total ${c.gs.total + (c.gs.holed ? 0 : c.gs.strokes)})`) }; },
  tag(c, m) { return c.player ? `${MG.pname(c)}: ${c.gs.strokes}` : ''; },
  startLine: m => `Hole 1: ${m.gs.name}.`
};

/* =============================== IMPOSTER CARTS =============================== */
MODES.imposter = {
  init(m) {
    const g = m.gs; g.orbs = 0; for (const c of m.chairs) { c.side = 0; if (c.player) c.player.side = 0; c.gs = { agent: c.player ? 1 : 0, orbs: 0, cd: 8, flash: 0, kills: 0 }; }
    const want = Math.max(m.mini.agents, MG.people(m).length + (MG.people(m).length ? 1 : 0)), npcs = m.chairs.filter(c => !c.gs.agent).sort(() => Math.random() - 0.5);
    for (let i = 0; i < want - MG.people(m).length && npcs[i]; i++) npcs[i].gs.agent = 1;
    m.sideChanged = (m.sideChanged || 0) + 1; for (let i = 0; i < 2; i++) this.orb(m);
  },
  orb(m) { for (let t = 0; t < 20; t++) { const p = { x: 2 + Math.random() * (m.width - 4), y: 2 + Math.random() * (m.height - 4) }; if (m.chairs.every(c => Math.hypot(c.x - p.x, c.y - p.y) > 2)) return MG.add(m, { t: 'orb', x: MG.r2(p.x), y: MG.r2(p.y) }); } },
  agents: m => m.chairs.filter(c => c.gs.agent && !c.out),
  step(m, h) {
    for (const c of m.chairs) { c.gs.cd = Math.max(0, c.gs.cd - h); c.gs.flash = Math.max(0, c.gs.flash - h); }
    for (const o of MG.all(m, 'beam')) { o.life -= h; if (o.life <= 0) MG.remove(m, o); }
    for (const c of this.agents(m)) { const o = MG.all(m, 'orb').find(q => Math.hypot(c.x - q.x, c.y - q.y) < R_CART() + 0.35); c.gs.ch = o ? (c.gs.ch || 0) + h : 0; c.gs.chg = o ? MG.r2(Math.min(1, c.gs.ch / 1.5)) : 0; }   // sit on an orb for 1.5 s to take it
    for (const o of MG.all(m, 'orb')) for (const c of this.agents(m)) if (c.gs.ch >= 1.5 && Math.hypot(c.x - o.x, c.y - o.y) < R_CART() + 0.35) {
      c.gs.ch = 0; c.gs.orbs++; c.gs.flash = 1.2; MG.remove(m, o); this.orb(m); m.sfx('blip'); if (c.player) MG.notice(m, `${MG.up(m.name(c))}: ORB ${c.gs.orbs} OF ${m.mini.orbs}`, 1.2);
      if (c.gs.orbs >= m.mini.orbs) return this.end(m, c, 'collected every orb'); break;
    }
    const ag = this.agents(m); if (ag.length <= 1) this.end(m, ag[0], 'last agent standing');
  },
  use(c, m) {
    if (!c.gs.agent || c.gs.cd > 0) return; c.gs.cd = 4; m.sfx('whistle');
    const hx = Math.cos(c.heading), hy = Math.sin(c.heading); let hit = null, hd = 7;
    for (const o of MG.live(m)) { if (o === c) continue; const dx = o.x - c.x, dy = o.y - c.y, along = dx * hx + dy * hy, off = Math.abs(-dx * hy + dy * hx); if (along > 0 && along < hd && off < 0.7) { hd = along; hit = o; } }
    MG.add(m, { t: 'beam', x: MG.r2(c.x + hx * 0.6), y: MG.r2(c.y + hy * 0.6), x2: MG.r2(c.x + hx * hd), y2: MG.r2(c.y + hy * hd), life: 0.3 });
    if (!hit) return;
    if (hit.gs.agent) { hit.gs.agent = 0; MH.out(m, hit); c.gs.kills++; m.sfx('goal'); MG.notice(m, `${MG.up(m.name(c))} UNMASKS ${MG.up(m.name(hit))}!`, 2); m.line(`${m.name(hit)} was an agent!`); }
    else { c.stunLeft = 3; c.gs.flash = 4; m.sfx('foul'); MG.notice(m, `${MG.up(m.name(c))} ZAPPED A HARMLESS CART - REVEALED!`, 2); }
  },
  end(m, w, why) {
    if (m.state !== 'play') return; const rows = MG.rankRows(m, m.chairs.filter(c => c.gs.agent || m.order.includes(c)), c => (c === w ? 1000 : 0) + c.gs.orbs * 10 + c.gs.kills * 5 - (c.out ? 50 : 0), c => `${c.gs.orbs} orb${c.gs.orbs === 1 ? '' : 's'}, ${c.gs.kills} unmasked${c.out ? ', unmasked' : ''}`);
    m.finishGame(w ? `${MG.up(m.name(w))} WINS!` : 'NOBODY WINS', rows, -1, why);
  },
  timeUp(m) { const ag = this.agents(m).sort((a, b) => b.gs.orbs - a.gs.orbs); this.end(m, ag.length > 1 && ag[0].gs.orbs === ag[1].gs.orbs ? null : ag[0], 'time up: the most orbs wins'); },
  cmd(c, cmd, m) { c.speedMul *= 0.62; return cmd; },                    // everyone potters about at the same easy pace
  ai(c, m) {
    if (c.gs.pauseT > 0) { c.gs.pauseT -= 0.1; return { x: 0, y: 0, speed: 0 }; } if (Math.random() < 0.01) { c.gs.pauseT = 1 + Math.random() * 2; }
    if (c.gs.agent) {
      const sus = MG.live(m).filter(o => o !== c && o.gs.flash > 0 && MH.dist(c, o) < 6.5);   // a revealed cart close by: shoot it
      if (sus.length && c.gs.cd <= 0 && (c.gs.hunt || (c.gs.hunt = Math.random() < 0.25 ? 1 : -1)) > 0) { const t = sus[0]; if (MH.ahead(c, t, 0.97)) { c.wantUse = true; c.gs.hunt = 0; } return MH.to(c, t.x, t.y, 0.8); }
      if (!sus.length) c.gs.hunt = 0;
      const o = MH.nearest(c, MG.all(m, 'orb')); if (o && MH.dist(c, o) < 4) return MH.dist(c, o) < 0.3 ? { x: 0, y: 0, speed: 0 } : MH.to(c, o.x, o.y, 0.8);
    }
    return MG.wander(c, m, 1);
  },
  hud(m) { const ag = this.agents(m).length; return { a: 'IMPOSTER CARTS', b: `${ag} AGENTS LEFT`, mid: `Blend in.  ${m.mini.orbs} orbs wins.  A: zap`, left: MG.peopleLine(m, c => c.out ? 'UNMASKED' : `${c.gs.orbs}/${m.mini.orbs} orbs`) }; },
  tag(c, m, vp) { return vp && vp.p && vp.p.chair === c ? 'YOU' : ''; },
  itemLine(c, m) { return c.gs.agent ? (c.gs.cd > 0 ? `ZAP in ${Math.ceil(c.gs.cd)}s` : '⚡ ZAP ready (A)') + `   orbs ${c.gs.orbs}/${m.mini.orbs}` : ''; },
  color: () => 0x9fb2bf,
  startLine: () => 'Blend in. Find the orbs. Trust nobody.'
};

/* =============================== CAPTURE THE FLAG =============================== */
MODES.ctf = {
  teams: true,
  init(m) { const g = m.gs; g.score = [0, 0]; g.base = [{ x: 2.6, y: m.centerY }, { x: m.width - 2.6, y: m.centerY }]; g.flag = [0, 1].map(s => ({ x: g.base[s].x, y: g.base[s].y, home: 1, car: -1, drop: 0 })); for (const c of m.chairs) c.gs.caps = 0; },
  kickoff(m) { m.chairs.forEach(c => { const mates = m.chairs.filter(k => k.side === c.side), j = mates.indexOf(c), x = c.side ? m.width - 4.6 : 4.6, y = m.centerY + (j - (mates.length - 1) / 2) * 2.3; Object.assign(c, { x, y, px: x, py: y, heading: c.side ? Math.PI : 0, ph: c.side ? Math.PI : 0 }); }); const g = m.gs; g.flag.forEach((f, s) => Object.assign(f, { x: g.base[s].x, y: g.base[s].y, home: 1, car: -1 })); },
  step(m, h) {
    const g = m.gs, live = MG.live(m);
    g.flag.forEach((f, s) => {
      if (f.car >= 0) { const c = m.chairs[f.car]; const p = c.toWorld(-0.7, 0); f.x = MG.r2(p.x); f.y = MG.r2(p.y); return; }
      if (!f.home) { f.drop -= h; if (f.drop <= 0) { this.home(m, s); MG.notice(m, `THE ${MG.up(TEAMS[m.teams[s]].name)} FLAG IS BACK`, 1.4); return; } }
      for (const c of live) if (Math.hypot(c.x - f.x, c.y - f.y) < R_CART() + 0.4) {
        if (c.side !== s && !this.carrying(m, c)) { f.car = c.k; f.home = 0; m.sfx('select'); MG.notice(m, `${MG.up(m.name(c))} HAS THE ${MG.up(TEAMS[m.teams[s]].name)} FLAG!`, 1.6); if (Math.random() < 0.6) m.line(`${m.name(c)} grabs the flag!`); break; }
        if (c.side === s && !f.home) { this.home(m, s); m.sfx('blip'); MG.notice(m, `${MG.up(m.name(c))} RETURNS THE FLAG`, 1.4); break; }
      }
    });
    for (const c of live) { const s = 1 - c.side, f = g.flag[s]; if (f.car === c.k && Math.hypot(c.x - g.base[c.side].x, c.y - g.base[c.side].y) < 1.6) {
      g.score[c.side]++; c.gs.caps++; this.home(m, s); m.sfx('goal'); MG.notice(m, `${MG.up(m.name(c))} CAPTURES! ${g.score[0]} - ${g.score[1]}`, 2); m.line(`${m.name(c)} captures the flag!`);
      if (g.score[c.side] >= m.mini.caps) this.end(m); } }
  },
  carrying: (m, c) => m.gs.flag.some(f => f.car === c.k),
  home(m, s) { const g = m.gs; Object.assign(g.flag[s], { x: g.base[s].x, y: g.base[s].y, home: 1, car: -1 }); },
  contact(m, a, b, d) {
    if (a.side === b.side || d > 2 * R_CART() + 0.08) return;
    for (const [car, tagger] of [[a, b], [b, a]]) { const f = m.gs.flag.find(x => x.car === car.k); if (f) { f.car = -1; f.drop = 8; car.stunLeft = 0.8; m.sfx('foul'); MG.notice(m, `${MG.up(m.name(tagger))} KNOCKS THE FLAG LOOSE`, 1.4); } }
  },
  cmd(c, cmd, m) { if (this.carrying(m, c)) c.speedMul *= 0.88; return cmd; },
  end(m) { const sc = m.gs.score; m.finishGame(MG.teamTitle(m, sc), MG.rankRows(m, m.chairs, c => c.gs.caps, c => `${c.gs.caps} capture${c.gs.caps === 1 ? '' : 's'}`), sc[0] === sc[1] ? -1 : sc[0] > sc[1] ? 0 : 1, `${sc[0]} - ${sc[1]}`); },
  timeUp(m) { this.end(m); },
  ai(c, m) {
    const g = m.gs, mine = g.flag[c.side], theirs = g.flag[1 - c.side], mates = m.chairs.filter(k => k.side === c.side), attack = mates.indexOf(c) % 2 === 0 || mates.length === 1;
    const lane = (mates.indexOf(c) % 4 < 2 ? 1 : -1) * (c.side ? -1 : 1) * 4, via = (tx, ty) => Math.abs(c.x - tx) > 5 && Math.abs(c.y - (m.centerY + lane)) > 1.2 ? MH.to(c, c.x + (tx > c.x ? 2.5 : -2.5), m.centerY + lane, 1) : MH.to(c, tx, ty, 1);   // attackers keep to their own lane, so the two sides do not meet head-on
    if (theirs.car === c.k) { const foe = MH.nearest(c, MG.live(m).filter(o => o.side !== c.side)); const v = via(g.base[c.side].x, g.base[c.side].y); if (foe && MH.dist(c, foe) < 2.5) { const f = MH.flee(c, m, [foe]); v.x += f.x * 0.6; v.y += f.y * 0.6; } return v; }
    const enemyCarrier = mine.car >= 0 ? m.chairs[mine.car] : null;
    if (enemyCarrier && (!attack || MH.dist(c, enemyCarrier) < 6)) return MG.chase(c, enemyCarrier, 1);
    if (!mine.home && mine.car < 0 && (!attack || MH.dist(c, mine) < 6)) return MH.to(c, mine.x, mine.y, 1);
    if (attack) { if (theirs.car < 0) return via(theirs.x, theirs.y); const mate = m.chairs[theirs.car]; const foe = MH.nearest(mate, MG.live(m).filter(o => o.side !== c.side)); return foe ? MG.chase(c, foe, 1) : MH.to(c, mate.x, mate.y, 0.8); }
    const foe = MH.nearest(g.base[c.side], MG.live(m).filter(o => o.side !== c.side)); const b = g.base[c.side];
    return foe && MH.dist(foe, b) < 9 ? MG.chase(c, foe, 1) : MH.to(c, b.x + (c.side ? -2.5 : 2.5), b.y + (mates.indexOf(c) % 3 - 1) * 2, 0.6);
  },
  hud(m) { const sc = m.gs.score; return { a: MG.up(TEAMS[m.teams[0]].name), b: MG.up(TEAMS[m.teams[1]].name), sa: String(sc[0]), sb: String(sc[1]), mid: `CAPTURE THE FLAG   •   first to ${m.mini.caps}` }; },
  tag(c, m) { return this.carrying(m, c) ? '🚩 ' + (MG.pname(c) || m.name(c)) : c.player ? MG.pname(c) : ''; },
  startLine: () => 'Grab their flag and bring it home!'
};

/* =============================== INFECTION NIGHT =============================== */
MODES.night = {
  noUnstick: true,
  init(m) { const it = m.chairs[Math.floor(Math.random() * m.chairs.length)]; for (const c of m.chairs) { c.side = c === it ? 1 : 0; if (c.player) c.player.side = c.side; } m.sideChanged = (m.sideChanged || 0) + 1; },
  kickoff(m) { const its = m.chairs.filter(c => c.side === 1), run = m.chairs.filter(c => c.side === 0); m.chairs.forEach(c => { let x, y; if (c.side === 1) { x = 3; y = m.centerY + (its.indexOf(c) - (its.length - 1) / 2) * 2; } else { const j = run.indexOf(c), cols = Math.ceil(run.length / 2); x = m.width * 0.45 + (j % cols) * (m.width * 0.5 / Math.max(1, cols - 1)); y = j < cols ? m.centerY - 4 : m.centerY + 4; } Object.assign(c, { x, y, px: x, py: y, heading: c.side ? 0 : Math.PI, ph: c.side ? 0 : Math.PI }); if (c.side === 0) c.safeLeft = 3; }); },
  contact(m, a, b, d) { if (a.side === b.side || d > 2 * R_CART() + MINI.hunt.catchGap) return; const h = a.side === 1 ? a : b, r = h === a ? b : a; if (r.safeLeft <= 0 && h.stunLeft <= 0 && !(h.freezeLeft > 0)) m.caught(r, h); },
  step(m) { m.checkHunt(); },
  timeUp(m) { m.endHunt(false); },
  cmd(c, cmd, m) { if (c.side === 1) c.speedMul *= MINI.hunt.hunterSpeed; return cmd; },
  ai(c, m, h) {                                                            // Manhunt's CPU, but IT only sees runners its lights reach
    const k = m.kind, n = c.aiNext, ac = c.aiCmd; m.kind = 'hunt'; c.aiNext = 0; c.aiCmd = null; let cmd;
    try { cmd = miniAI.base(c, m, h); } finally { m.kind = k; c.aiNext = n; c.aiCmd = ac; }
    if (c.side === 1 && cmd && !m.chairs.some(o => o.side === 0 && MH.dist(c, o) < 6.5)) cmd = { ...cmd, speed: (cmd.speed || 1) * 0.8 };   // nobody in its lights: IT prowls
    return cmd;
  },
  hud(m) { const it = m.chairs.filter(c => c.side === 1).length; return { a: 'RUNNERS', b: 'IT', sa: String(m.chairs.length - it), sb: String(it), mid: 'INFECTION NIGHT', left: MG.peopleLine(m, c => c.side ? 'is IT' : 'free') }; },
  tag(c, m) { return c.player ? MG.pname(c) : ''; },
  startLine: m => `Lights out. ${m.name(m.chairs.find(c => c.side === 1))} is it!`
};

/* =============================== STUNT ARENA =============================== */
const STUNT = { len: 2.6, w: 1.8, rise: 0.55, minSpeed: 2.2 };
MODES.stunt = {
  init(m) {
    const W = m.width, cy = m.centerY;
    for (const [x, y, a] of [[7, cy - 3.8, 0], [W - 7, cy + 3.8, Math.PI], [W / 2, cy, Math.PI / 2], [W / 2 - 6, cy + 4.2, -0.5], [W / 2 + 6, cy - 4.2, Math.PI - 0.5]]) MG.add(m, { t: 'ramp', x, y, a: MG.r2(a), len: STUNT.len, w: STUNT.w });
    for (let i = 0; i < 5; i++) this.star(m);
    for (const c of m.chairs) c.gs = { pts: 0, air: 0, z: 0, combo: 0, lastLand: -9, best: '' };
  },
  star(m) { for (let t = 0; t < 20; t++) { const p = { x: 2 + Math.random() * (m.width - 4), y: 2 + Math.random() * (m.height - 4) }; if (MG.all(m, 'ramp').every(r => Math.hypot(r.x - p.x, r.y - p.y) > 2.5)) return MG.add(m, { t: 'star', x: MG.r2(p.x), y: MG.r2(p.y) }); } },
  onRamp(c, r) { const dx = c.x - r.x, dy = c.y - r.y, u = dx * Math.cos(r.a) + dy * Math.sin(r.a), v = -dx * Math.sin(r.a) + dy * Math.cos(r.a); return Math.abs(u) < r.len / 2 && Math.abs(v) < r.w / 2 ? u : null; },
  step(m, h) {
    for (const c of MG.live(m)) {
      const G = c.gs;
      if (G.air > 0) {
        G.at += h; const T = G.air, t = G.at / T; G.z = MG.r2(Math.max(0, 4.9 * T * T * t * (1 - t)) + STUNT.rise * Math.max(0, 1 - t * 4));
        G.spun += Math.abs(normalizeAngle(c.heading - G.lh)); G.lh = c.heading; c.spinCooldown = 0;
        c.vx = G.av[0]; c.vy = G.av[1];                                    // in the air: no grip, no steering (spins only)
        if (c.x <= R_CART() + 0.02 || c.x >= m.width - R_CART() - 0.02) G.av[0] *= -0.5; if (c.y <= R_CART() + 0.02 || c.y >= m.height - R_CART() - 0.02) G.av[1] *= -0.5;
        if (G.at >= T) this.land(m, c);
        continue;
      }
      G.z = 0;
      for (const r of MG.all(m, 'ramp')) {
        const u = this.onRamp(c, r); if (u === null) continue;
        const sp = c.vx * Math.cos(r.a) + c.vy * Math.sin(r.a); G.z = MG.r2(Math.max(0, (u + r.len / 2) / r.len * STUNT.rise));
        if (u > r.len / 2 - 0.35 && sp > STUNT.minSpeed) { G.air = MG.r2(0.45 + sp * 0.16); G.at = 0; G.spun = 0; G.lh = c.heading; G.av = [c.vx, c.vy]; G.ghost = 1; m.sfx('screech'); }
      }
      for (const s of MG.all(m, 'star')) if (Math.hypot(s.x - c.x, s.y - c.y) < R_CART() + 0.35) { G.pts += 25; MG.remove(m, s); this.star(m); m.sfx('blip'); }
    }
    const best = m.chairs.reduce((a, c) => c.gs.pts > a.gs.pts ? c : a, m.chairs[0]); m.gs.lead = best.k;
  },
  land(m, c) {
    const G = c.gs, turns = Math.floor(G.spun / Math.PI + 0.25), dir = Math.atan2(G.av[1], G.av[0]), off = Math.abs(normalizeAngle(c.heading - dir));
    G.air = 0; G.z = 0; G.ghost = 0; let pts = 50 + turns * 100, word = turns >= 4 ? `${turns * 180} MEGA SPIN` : turns >= 2 ? `${turns * 180} SPIN` : turns === 1 ? '180' : 'JUMP';
    if (off < 0.6) { pts = Math.round(pts * 1.5); word += ' • CLEAN LANDING'; } else if (off > 1.9) { pts = Math.round(pts * 0.4); word += ' • SKETCHY'; c.stunLeft = 0.7; }
    G.combo = m.simTime - G.lastLand < 3.5 ? G.combo + 1 : 0; G.lastLand = m.simTime; if (G.combo) { pts = Math.round(pts * (1 + G.combo * 0.5)); word += ` • COMBO x${G.combo + 1}`; }
    G.pts += pts; G.best = word; MG.notice(m, `${MG.up(m.name(c))}: ${word}  +${pts}`, 1.6); m.sfx(turns >= 2 ? 'goal' : 'bump'); if (turns >= 3 && Math.random() < 0.6) m.line(`What a jump by ${m.name(c)}!`);
  },
  timeUp(m) { const r = MG.rankRows(m, m.chairs, c => c.gs.pts, c => `${c.gs.pts} points`); m.finishGame(MG.ffaTitle(m, r.map(x => x.c), c => c.gs.pts), r, -1, 'Time up: the most stunt points wins'); },
  cmd(c, cmd) { if (c.gs.air > 0) return { x: 0, y: 0, spin: cmd.spin, speed: 0 }; return cmd; },
  ai(c, m) {
    const G = c.gs; if (G.air > 0) return { x: 0, y: 0, speed: 0, spin: Math.random() < 0.7 ? 1 : 0 };
    const ramps = MG.all(m, 'ramp'); if (!ramps.length) return MG.wander(c, m);
    let r = ramps.find(x => x.id === G.rid); if (!r || Math.random() < 0.002) { r = ramps[Math.floor(Math.random() * ramps.length)]; G.rid = r.id; G.phase = 0; }
    const ux = Math.cos(r.a), uy = Math.sin(r.a), sx = r.x - ux * (r.len / 2 + 4.5), sy = r.y - uy * (r.len / 2 + 4.5);
    const star = MH.nearest(c, MG.all(m, 'star')); if (star && MH.dist(c, star) < 2.5 && !G.phase) return MH.to(c, star.x, star.y, 1);
    if (!G.phase) { if (Math.hypot(c.x - sx, c.y - sy) < 1.2) G.phase = 1; return MH.to(c, sx, sy, 1); }
    if ((c.x - r.x) * ux + (c.y - r.y) * uy > r.len / 2 + 1) { G.phase = 0; G.rid = ramps[Math.floor(Math.random() * ramps.length)].id; }
    return MH.to(c, r.x + ux * 3, r.y + uy * 3, 1);
  },
  hud(m) { const l = m.chairs[m.gs.lead || 0]; return { a: 'STUNT ARENA', b: l ? `LEADER ${MG.up(m.name(l))} ${l.gs.pts}` : '', mid: 'Ramps, spins, clean landings', left: MG.peopleLine(m, c => c.gs.pts) }; },
  tag(c, m) { return c.gs.air > 0 ? '✈' : c.player ? MG.pname(c) : ''; },
  startLine: () => 'Show us your best tricks!'
};

/* =============================== SLALOM TIME TRIAL (with your ghost) =============================== */
const SLALOM_COURSES = {
  zigzag: { name: 'Zig-zag', laps: 1, gates: () => Array.from({ length: 10 }, (_, i) => [2.8 + i * 2.5, i % 2 ? 11 : 4]) },
  eight: { name: 'Figure of eight', laps: 2, gates: () => Array.from({ length: 12 }, (_, i) => { const t = i / 12 * Math.PI * 2; return [14 + Math.sin(t) * 10.5, 7.5 + Math.sin(2 * t) * 4.6]; }) },
  hairpin: { name: 'Hairpins', laps: 1, gates: () => [[3, 2.5], [25, 2.5], [25, 6], [3, 6], [3, 9.5], [25, 9.5], [25, 12.8], [3, 12.8]] }
};
MODES.slalom = {
  init(m) {
    const C = SLALOM_COURSES[m.mini.course] || SLALOM_COURSES.zigzag, sx = m.width / 28, sy = m.height / 15, pts = C.gates().map(([x, y]) => ({ x: x * sx, y: y * sy }));
    m.gs.gates = pts.map((p, i) => { const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length]; return { x: MG.r2(p.x), y: MG.r2(p.y), a: MG.r2(Math.atan2(b.y - a.y, b.x - a.x)) }; });
    m.gs.laps = C.laps; m.gs.total = pts.length * C.laps; m.gs.name = C.name; m.gs.first = 0;
    for (const c of m.chairs) c.gs = { g: 0, done: 0, ghost: 1, time: 0 };
    m.ghostRec = []; m.ghostKey = 'slalom-' + m.mini.course;
  },
  kickoff(m) { const g0 = m.gs.gates[0], n = m.chairs.length; m.chairs.forEach((c, i) => { const x = Math.max(1.2, g0.x - 2.2 - (i % 2) * 0.4), y = m.centerY + (i - (n - 1) / 2) * 0.9; Object.assign(c, { x, y, px: x, py: y, heading: Math.atan2(g0.y - y, g0.x - x), vx: 0, vy: 0 }); c.ph = c.heading; }); },
  step(m, h) {
    const g = m.gs, G = g.gates;
    for (const c of m.chairs) {
      if (c.gs.done) continue; const gate = G[c.gs.g % G.length];
      if (Math.hypot(c.x - gate.x, c.y - gate.y) < 1.25) { c.gs.g++; if (c.player) m.sfx('blip');
        if (c.gs.g >= g.total) { c.gs.done = 1; c.gs.time = MG.r2(m.simTime); m.order.push(c); m.sfx('goal'); MG.notice(m, `${MG.up(m.name(c))} FINISHES IN ${this.fmt(c.gs.time)}`, 2); if (!g.first) { g.first = m.simTime; m.line(`${m.name(c)} sets the time to beat.`); } this.saveGhost(m, c); } }
    }
    const me = MG.people(m).find(c => !c.player.remote); if (me && !me.gs.done && m.ghostRec && Math.floor(m.simTime * 10) >= m.ghostRec.length) m.ghostRec.push([MG.r2(me.x), MG.r2(me.y), MG.r2(me.heading)]);   // your run, for your ghost next time
    if (m.chairs.every(c => c.gs.done) || (g.first && m.simTime - g.first > 25)) this.end(m);
  },
  saveGhost(m, c) {
    if (!c.player || c.player.remote || !m.ghostRec) return; const all = Settings.ghosts || {}, best = all[m.ghostKey];
    if (!best || c.gs.time < best.t) { all[m.ghostKey] = { t: c.gs.time, name: MG.pname(c), p: m.ghostRec }; Settings.ghosts = all; Settings.save(); MG.notice(m, `NEW BEST TIME: ${this.fmt(c.gs.time)}`, 2.2); }
  },
  fmt: t => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`,
  end(m) { if (m.state !== 'play') return; const rows = [...m.order.map(c => ({ c, text: this.fmt(c.gs.time) })), ...m.chairs.filter(c => !c.gs.done).sort((a, b) => b.gs.g - a.gs.g).map(c => ({ c, text: `gate ${c.gs.g} of ${m.gs.total} (did not finish)` }))]; m.finishGame(m.order[0] ? `${MG.up(m.name(m.order[0]))} WINS!` : 'NOBODY FINISHED', rows, -1, `${m.gs.name}: the fastest time wins`); },
  timeUp(m) { this.end(m); },
  cmd(c, cmd) { if (c.gs.done) return { x: Math.cos(c.heading) * 0.3, y: Math.sin(c.heading) * 0.3, speed: 0.3 }; return cmd; },
  ai(c, m) {
    const G = m.gs.gates, a = G[c.gs.g % G.length], b = G[(c.gs.g + 1) % G.length], d = MH.dist(c, a);
    const k = Math.min(0.5, d / 6), tx = a.x + (b.x - a.x) * 0.12 * (1 - k), ty = a.y + (b.y - a.y) * 0.12 * (1 - k);
    const turn = Math.abs(normalizeAngle(Math.atan2(b.y - a.y, b.x - a.x) - Math.atan2(a.y - c.y, a.x - c.x)));
    return MH.to(c, tx, ty, d < 2.5 && turn > 1.6 ? 0.7 : 1);
  },
  ghost(m) { const best = (Settings.ghosts || {})[m.ghostKey]; if (!best || !best.p || !best.p.length) return null; const i = Math.min(best.p.length - 1, Math.floor(m.simTime * 10)), f = m.simTime * 10 - i, p = best.p[i], q = best.p[Math.min(best.p.length - 1, i + 1)]; return { x: p[0] + (q[0] - p[0]) * f, y: p[1] + (q[1] - p[1]) * f, heading: p[2], t: best.t, name: best.name }; },
  hud(m) { const me = MG.people(m)[0], best = (Settings.ghosts || {})[m.ghostKey]; return { clock: this.fmt(m.simTime), a: me ? `GATE ${Math.min(me.gs.g + 1, m.gs.total)} / ${m.gs.total}` : MG.up(m.gs.name), b: best ? `BEST ${this.fmt(best.t)}` : 'NO BEST TIME YET', mid: `${m.gs.name}${m.gs.laps > 1 ? `, ${m.gs.laps} laps` : ''}`, left: MG.peopleLine(m, c => c.gs.done ? this.fmt(c.gs.time) : `gate ${c.gs.g + 1}`) }; },
  tag(c, m) { return c.player ? MG.pname(c) : ''; },
  startLine: () => 'Through every gate, as fast as you can!'
};

/* =============================== DELIVERY RUSH =============================== */
const HOUSE_COLS = [0xff4d4d, 0xffd23f, 0x3dd6ff, 0x7dff6a, 0xff7ad9, 0xb28dff];
MODES.delivery = {
  init(m) {
    const W = m.width, H = m.height; m.gs.depot = { x: W / 2, y: m.centerY };
    m.gs.houses = [[2.6, 2.4], [W / 2, 1.6], [W - 2.6, 2.4], [2.6, H - 2.4], [W / 2, H - 1.6], [W - 2.6, H - 2.4]].map(([x, y], i) => ({ x, y, c: i }));
    for (const c of m.chairs) c.gs = { pts: 0, del: 0 };
    for (let i = 0; i < 3; i++) this.pkg(m);
  },
  pkg(m) { const d = m.gs.depot, a = Math.random() * Math.PI * 2; return MG.add(m, { t: 'pkg', x: MG.r2(d.x + Math.cos(a) * 0.7), y: MG.r2(d.y + Math.sin(a) * 0.7), to: Math.floor(Math.random() * m.gs.houses.length), car: -1, age: 0 }); },
  carried: (m, c) => MG.all(m, 'pkg').find(p => p.car === c.k),
  step(m, h) {
    const g = m.gs, live = MG.live(m);
    for (const p of MG.all(m, 'pkg')) {
      p.age += h;
      if (p.car >= 0) { const c = m.chairs[p.car], q = c.toWorld(-0.15, 0); p.x = MG.r2(q.x); p.y = MG.r2(q.y);
        const H = g.houses[p.to]; if (Math.hypot(c.x - H.x, c.y - H.y) < 1.7) { const pts = 100 + Math.max(0, Math.round(60 - p.age * 3)); c.gs.pts += pts; c.gs.del++; MG.remove(m, p); m.sfx('goal'); MG.notice(m, `${MG.up(m.name(c))} DELIVERS  +${pts}`, 1.4); if (Math.random() < 0.3) m.line(`Special delivery from ${m.name(c)}!`); g.spawn = (g.spawn || 0) + 1; } continue; }
      for (const c of live) if (!this.carried(m, c) && !(c.gs.drop > m.simTime) && Math.hypot(c.x - p.x, c.y - p.y) < R_CART() + 0.4) { p.car = c.k; m.sfx('select'); break; }
    }
    if (g.spawn > 0 && MG.all(m, 'pkg').filter(p => p.car < 0 && Math.hypot(p.x - g.depot.x, p.y - g.depot.y) < 1.5).length < 3) { g.spawn--; this.pkg(m); }
    if (MG.all(m, 'pkg').length < 3) this.pkg(m);
  },
  bump(m, a, b, closing) {
    if (closing < 2) return;
    for (const [victim, by] of [[a, b], [b, a]]) { const p = this.carried(m, victim); if (p && !this.carried(m, by)) { p.car = -1; victim.gs.drop = m.simTime + 1; const q = victim.toWorld(-1.2, 0); p.x = MG.r2(Math.max(0.6, Math.min(m.width - 0.6, q.x))); p.y = MG.r2(Math.max(0.6, Math.min(m.height - 0.6, q.y))); m.sfx('foul'); MG.notice(m, `${MG.up(m.name(by))} KNOCKS THE PARCEL LOOSE`, 1.3); } }
  },
  cmd(c, cmd, m) { if (this.carried(m, c)) c.speedMul *= 0.93; return cmd; },
  timeUp(m) { const r = MG.rankRows(m, m.chairs, c => c.gs.pts, c => `${c.gs.del} deliver${c.gs.del === 1 ? 'y' : 'ies'}, ${c.gs.pts} points`); m.finishGame(MG.ffaTitle(m, r.map(x => x.c), c => c.gs.pts), r, -1, 'Time up: the most points wins'); },
  ai(c, m) {
    const g = m.gs, mine = this.carried(m, c);
    if (mine) { const H = g.houses[mine.to]; return MH.to(c, H.x, H.y, 1); }
    const thief = MG.live(m).find(o => o !== c && this.carried(m, o) && MH.dist(c, o) < 3.5 && MH.ahead(c, o, 0.6)); if (thief && (c.k % 3 === 0)) return MG.chase(c, thief, 1, 0.2);
    const free = MG.all(m, 'pkg').filter(p => p.car < 0); const p = MH.nearest(c, free); return p ? MH.to(c, p.x, p.y, 1) : MH.to(c, g.depot.x, g.depot.y, 0.7);
  },
  hud(m) { const lead = m.chairs.reduce((a, c) => c.gs.pts > a.gs.pts ? c : a, m.chairs[0]); return { a: 'DELIVERY RUSH', b: `LEADER ${MG.up(m.name(lead))} ${lead.gs.pts}`, mid: 'Deliver to the house of the same colour', left: MG.peopleLine(m, c => `${c.gs.pts}${this.carried(m, c) ? ' 📦' : ''}`) }; },
  tag(c, m) { return this.carried(m, c) ? '📦 ' + (MG.pname(c) || '') : c.player ? MG.pname(c) : ''; },
  itemLine(c, m) { const p = this.carried(m, c); return p ? `📦 Deliver to the ${['RED', 'YELLOW', 'BLUE', 'GREEN', 'PINK', 'PURPLE'][p.to]} house` : 'Grab a parcel from the depot'; },
  startLine: () => 'Parcels are waiting. Go go go!'
};

/* =============================== descriptions (How to play) =============================== */
Object.assign(GAME_INFO, {
  bomb: { name: 'Hot Potato Bomb', cat: 'party', blurb: 'Pass the ticking bomb by bumping someone. Do not be holding it when it blows.', noItems: true,
    goal: 'Be the last cart that has not blown up.',
    rules: ['One cart holds the bomb (it sits on top of the cart and ticks faster as the fuse burns).', 'Bump another cart to pass the bomb to them. You cannot pass it straight back.', 'The holder is a little faster than everyone else.', 'When the fuse runs out, the holder is out and the blast throws everyone near it.', 'A new bomb goes to a random cart. Last one left wins.'],
    controls: [CTRL.drive, CTRL.spin, CTRL.pause], opts: [{ key: 'fuse', label: 'Fuse', values: [10, 15, 20], def: 15, fmt: v => `about ${v}s` }] },
  hill: { name: 'King of the Hill', cat: 'party', blurb: 'Hold the glowing circle alone to score. It moves every 20 seconds.', minutes: 3,
    goal: 'Be first to the target score, or have the most points when the clock runs out.',
    rules: ['A glowing circle is the hill.', 'The cart nearest the middle of the hill is king and scores a point every second.', 'Anyone else on the hill: contested, the king scores at less than half speed. Push them off!', 'The hill moves somewhere new every 20 seconds.'],
    controls: [CTRL.drive, CTRL.spin, CTRL.item, CTRL.pause], opts: [minOpt([2, 3, 4], 3), { key: 'target', label: 'Points to win', values: [20, 30, 45], def: 30 }] },
  sumo: { name: 'Sumo Ring', cat: 'party', blurb: 'Bumps hit extra hard. Shove everyone off the ring.', noItems: true,
    goal: 'Win the most rounds by being the last cart on the ring.',
    rules: ['Everyone starts on a round platform.', 'Bumps hit much harder than usual.', 'Drive off the edge (or get pushed) and you are out for the round.', 'A spin swats whoever it hits right across the ring.', 'After 20 seconds the ring starts to shrink.', 'Last cart on the ring wins the round.'],
    controls: [CTRL.drive, 'Spin (a hard shove): triggers  /  E Q  /  . ,  /  SPIN buttons', CTRL.pause], opts: [{ key: 'rounds', label: 'Rounds', values: [1, 3, 5], def: 3 }] },
  lava: { name: 'Floor Is Lava', cat: 'party', blurb: 'Tiles glow orange, then turn to lava. Keep moving.', minutes: 2,
    goal: 'Be the last cart that has not touched the lava (or survive the clock).',
    rules: ['The floor is a grid of tiles.', 'A tile glows orange for a moment before it turns to lava.', 'Drive onto lava and you are out.', 'Lava cools back down after a while, but more and more tiles melt as the game goes on.', 'Last one left wins; everyone still standing at the end wins together.'],
    controls: [CTRL.drive, CTRL.spin, CTRL.item, CTRL.pause], opts: [minOpt([1, 2, 3], 2)] },
  multiball: { name: 'Multiball Madness', cat: 'ball', blurb: 'Team hockey with lots of balls at once.', minutes: 3, teams: true, noItems: true,
    goal: 'Score more goals than the other team.',
    rules: ['Two teams, two goals, and several balls in play at once.', 'Push a ball over the other team\'s goal line to score.', 'Spin to slap a ball hard.', 'A scored ball comes back in the middle.', 'No crease, no fouls: anything goes.'],
    controls: [CTRL.drive, CTRL.spin, CTRL.pause], opts: [minOpt([2, 3, 5], 3), { key: 'balls', label: 'Balls', values: [3, 5, 8], def: 5 }] },
  giant: { name: 'Giant Ball', cat: 'ball', blurb: 'One huge, heavy ball. Everyone pushes.', minutes: 3, teams: true, noItems: true,
    goal: 'Push the giant ball into the other team\'s wide goal.',
    rules: ['There is one giant ball. It is heavy: it takes teamwork to move it.', 'It rolls a long way once it gets going.', 'Push it into the other team\'s goal to score.', 'First to the target, or the most goals when time runs out.'],
    controls: [CTRL.drive, CTRL.spin, CTRL.pause], opts: [minOpt([2, 3, 5], 3), { key: 'target', label: 'Goals to win', values: [2, 3, 5], def: 3 }] },
  bowling: { name: 'Cart Bowling', cat: 'ball', blurb: 'Take turns pushing a heavy ball down the rink at ten pins.', noItems: true,
    goal: 'Score the most pins over all the frames.',
    rules: ['Players take turns. Everyone else watches from the side.', 'Push the ball towards the pins. Do not cross the foul line (the cart stops there).', 'Each turn has two balls. All ten with the first: STRIKE (+10). All ten with two: SPARE (+5).', 'One point for every pin knocked down.'],
    controls: [CTRL.drive, 'Spin (a sharper push): triggers  /  E Q  /  . ,', CTRL.pause], opts: [{ key: 'frames', label: 'Frames', values: [2, 3, 5], def: 3 }] },
  golf: { name: 'Mini Golf', cat: 'ball', blurb: 'Everyone plays the same hole at once, each with their own ball.', noItems: true,
    goal: 'Finish every hole in the fewest strokes.',
    rules: ['Your ball is the one in your colour. Only your cart can move it.', 'Every touch is a stroke (pushing it along counts again every 0.7 s), so tap it, do not dribble it.', 'Get it in the cup to finish the hole. Walls and blocks bounce it.', 'Not in when the hole\'s time runs out: +3 strokes.', 'Fewest strokes after all the holes wins.'],
    controls: [CTRL.drive, 'Spin (a big hit): triggers  /  E Q  /  . ,', CTRL.pause], opts: [{ key: 'holes', label: 'Holes', values: [2, 3, 4], def: 3 }, { key: 'holeTime', label: 'Time per hole', values: [45, 60, 90], def: 60, fmt: v => v + 's' }] },
  imposter: { name: 'Imposter Carts', cat: 'sneaky', blurb: 'Every cart looks the same. Find the real players among the CPUs.', minutes: 3, noItems: true,
    goal: 'Collect the orbs while blending in, or unmask every other agent.',
    rules: ['All carts look alike. Most are harmless CPUs pottering about; a few are agents (every player is one).', 'Agents collect glowing orbs: sit on one for a second and a half (the ring fills up). Taking one makes you flash for a moment.', 'A: zap the cart in front of you. An agent is unmasked and out. A harmless cart: you are stunned and revealed.', 'First to collect enough orbs wins, or be the last agent left.'],
    controls: [CTRL.drive, 'Zap (in front of you): A or X  /  Space or X  /  Right Shift or \\  /  touch A', CTRL.pause], opts: [minOpt([2, 3, 4], 3), { key: 'orbs', label: 'Orbs to win', values: [5, 7, 9], def: 7 }, { key: 'agents', label: 'Agents', values: [2, 3, 4], def: 3 }] },
  ctf: { name: 'Capture the Flag', cat: 'sneaky', blurb: 'Steal their flag and drive it home.', minutes: 4, teams: true,
    goal: 'Capture the other team\'s flag more times than they capture yours.',
    rules: ['Each team has a flag at its end.', 'Drive over the other team\'s flag to pick it up (you are a little slower carrying it).', 'Bring it to your own base: a capture.', 'Touch an enemy carrier to knock the flag loose. Touch your own dropped flag to send it home.', 'A dropped flag goes home by itself after 8 seconds.'],
    controls: [CTRL.drive, CTRL.spin, CTRL.item, CTRL.pause], opts: [minOpt([3, 4, 6], 4), { key: 'caps', label: 'Captures to win', values: [2, 3, 5], def: 3 }] },
  night: { name: 'Infection Night', cat: 'sneaky', blurb: 'Manhunt in the dark. Headlights only.', minutes: 3,
    goal: 'Runners: still be free when the clock runs out. IT: catch everyone.',
    rules: ['The lights are out: you only see what your headlights and the carts\' glow show.', 'IT glows red. IT catches a runner just by touching them.', 'A caught runner becomes IT (after 2 seconds).', 'Anyone still free at the end wins.'],
    controls: [CTRL.drive, CTRL.spin, CTRL.item, CTRL.pause], opts: [minOpt([2, 3, 4], 3)] },
  stunt: { name: 'Stunt Arena', cat: 'racing', blurb: 'Ramps, jumps and spins in mid-air for points.', minutes: 2,
    goal: 'Score the most trick points.',
    rules: ['Hit a ramp fast to fly.', 'In the air you cannot steer, but you can spin: every half turn is worth 100.', 'Land facing the way you are flying: CLEAN LANDING x1.5. Land sideways or backwards: SKETCHY.', 'Land another jump within 3.5 seconds for a combo.', 'Stars on the floor are worth 25.'],
    controls: [CTRL.drive, 'Spin (tricks in the air): triggers  /  E Q  /  . ,  /  SPIN buttons', CTRL.pause], opts: [minOpt([2, 3], 2)] },
  slalom: { name: 'Slalom Time Trial', cat: 'racing', blurb: 'Through the gates against the clock, and your own ghost.', minutes: 3, noItems: true,
    goal: 'Go through every gate, in order, in the fastest time.',
    rules: ['Drive through the gates (between the two cones) in order; the next one glows.', 'Miss a gate and you must go back for it.', 'Carts pass through each other: it is all about your line.', 'Your best time on each course is saved, and next time its ghost races you.', 'When the first cart finishes, everyone else has 25 seconds.'],
    controls: [CTRL.drive, CTRL.spin, CTRL.pause], opts: [{ key: 'course', label: 'Course', values: ['zigzag', 'eight', 'hairpin'], names: ['Zig-zag', 'Figure of eight', 'Hairpins'], def: 'zigzag' }] },
  delivery: { name: 'Delivery Rush', cat: 'racing', blurb: 'Grab parcels at the depot and deliver them to the right house.', minutes: 3,
    goal: 'Earn the most points delivering parcels.',
    rules: ['Parcels wait at the depot in the middle. Drive over one to pick it up.', 'Its colour is the house it goes to: drive up to that house.', 'Fast deliveries earn a bonus.', 'Ram a courier hard to knock their parcel loose and steal it.'],
    controls: [CTRL.drive, CTRL.spin, CTRL.item, CTRL.pause], opts: [minOpt([2, 3, 4], 3)] }
});
