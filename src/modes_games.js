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
  r2: v => Math.round(v * 100) / 100,
  autoItem(c, m) {                                                     // when the CPU fires its power-up
    const foes = MG.live(m).filter(o => o !== c && (m.mini.mode !== 'teams' || o.side !== c.side)), it = c.item;
    if (it === 'wave' && foes.filter(o => MH.dist(c, o) < 2.8).length >= (m.kind === 'hill' ? 1 : 2)) c.wantUse = true;
    else if (it === 'zap' && foes.some(o => MH.dist(c, o) < 8 && MH.ahead(c, o, 0.97))) c.wantUse = true;
    else if (it === 'oil' && foes.some(o => MH.dist(c, o) < 4 && !MH.ahead(c, o, 0))) c.wantUse = true;
    else if (it === 'boost' && Math.random() < 0.03) c.wantUse = true;
  }
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
  items: ['zap', 'wave', 'boost', 'wave', 'oil'],
  init(m) {
    const g = m.gs; g.zones = [{ x: m.width * 0.3, y: m.centerY, r: 2.6, king: -1, crowd: 0, over: 0, move: 15 }, { x: m.width * 0.7, y: m.centerY, r: 2.6, king: -1, crowd: 0, over: 0, move: 22 }];
    for (const c of m.chairs) c.gs.pts = 0;
  },
  step(m, h) {
    const g = m.gs, live = MG.live(m);
    for (const [zi, Z] of g.zones.entries()) {
      if ((Z.move -= h) <= 0) {                                           // the hills move (one at a time), well away from the other one
        const other = g.zones[1 - zi]; let p; for (let t = 0; t < 40; t++) { p = { x: 4.5 + Math.random() * (m.width - 9), y: 4 + Math.random() * (m.height - 8) }; if (Math.hypot(p.x - Z.x, p.y - Z.y) > 10 && Math.hypot(p.x - other.x, p.y - other.y) > 14) break; }
        Object.assign(Z, { x: MG.r2(p.x), y: MG.r2(p.y), move: 15, over: 0 }); MG.notice(m, 'A HILL MOVES!', 1.4); m.sfx('whistle');
      }
      const inside = live.filter(c => Math.hypot(c.x - Z.x, c.y - Z.y) < Z.r);
      Z.crowd = inside.length; Z.king = inside.length === 1 ? inside[0].k : -1;
      if (inside.length === 1) { const k = inside[0]; k.gs.pts += h; if (k.gs.pts >= m.mini.target) return this.end(m, false); }   // only a cart alone on a hill scores
      Z.over = inside.length >= 3 ? Z.over + h * 2 : inside.length === 2 ? Z.over + h : Math.max(0, Z.over - h * 2);
      if (Z.over > 2.5) {                                                  // too crowded: the hill overloads and throws everyone off
        Z.over = 0; for (const c of inside) { const dx = c.x - Z.x, dy = c.y - Z.y, d = Math.hypot(dx, dy) || 1, k = 7; c.vx += dx / d * k; c.vy += dy / d * k; c.stunLeft = Math.max(c.stunLeft, 1); }
        g.objs = g.objs || []; MG.add(m, { t: 'boom', x: Z.x, y: Z.y, life: 0.7, wave: 1 }); m.sfx('goal'); MG.notice(m, 'HILL OVERLOAD!  EVERYBODY OFF!', 1.6); if (Math.random() < 0.5) m.line('Too crowded! The hill blows everyone off.');
      }
    }
    for (const o of MG.all(m, 'boom')) { o.life -= h; if (o.life <= 0) MG.remove(m, o); }
  },
  end(m, timeUp) { if (m.state !== 'play') return; const r = MG.rankRows(m, m.chairs, c => c.gs.pts, c => `${Math.floor(c.gs.pts)} points`); m.finishGame(MG.ffaTitle(m, r.map(x => x.c), c => Math.floor(c.gs.pts)), r, -1, timeUp ? 'Time up: the most points wins' : `First to ${m.mini.target} points`); },
  timeUp(m) { this.end(m, true); },
  ai(c, m) {
    const g = m.gs, live = MG.live(m), on = (Z, o) => Math.hypot(o.x - Z.x, o.y - Z.y) < Z.r;
    const mine = g.zones.find(Z => on(Z, c));
    if (mine) {                                                            // on a hill: push the others off (or blast them), then sit near the middle
      const rival = live.find(o => o !== c && Math.hypot(o.x - mine.x, o.y - mine.y) < mine.r + 0.6);
      if (rival) { if (mine.over > 1.6 && !c.gs.stay) return MH.to(c, c.x + (c.x - mine.x), c.y + (c.y - mine.y), 1); return MG.chase(c, rival, 1, 0.1); }   // about to overload: get off
      return MH.to(c, mine.x + Math.cos(c.k) * 0.5, mine.y + Math.sin(c.k) * 0.5, 0.35);
    }
    const score = Z => Math.hypot(c.x - Z.x, c.y - Z.y) / 6 + live.filter(o => o !== c && on(Z, o)).length * 2.5 + live.filter(o => o !== c && Math.hypot(o.x - Z.x, o.y - Z.y) < Z.r + 3).length * 0.5;
    const Z = g.zones.slice().sort((a, b) => score(a) - score(b))[0], busy = live.filter(o => o !== c && on(Z, o)).length;
    if (!c.gs.mood || m.simTime > c.gs.moodAt) { c.gs.mood = Math.random() < 0.35 ? 'push' : 'wait'; c.gs.moodAt = m.simTime + 4 + Math.random() * 4; }   // sometimes pile in, usually wait for a gap
    if (busy >= 2 || (busy === 1 && c.gs.mood === 'wait' && !(c.item === 'wave' || c.item === 'zap'))) {                                                       // both hills crowded: grab a power-up, or wait at the edge to pounce
      const box = !c.item && MH.nearest(c, m.boxes || []); if (box && MH.dist(c, box) < 12) return MH.to(c, box.x, box.y, 1);
      const a = Math.atan2(c.y - Z.y, c.x - Z.x) + 0.02 * c.k; return MH.to(c, Z.x + Math.cos(a) * (Z.r + 1.6), Z.y + Math.sin(a) * (Z.r + 1.6), 0.7);
    }
    return MH.to(c, Z.x, Z.y, 1);
  },
  hud(m) { const g = m.gs, lead = m.chairs.slice().sort((a, b) => b.gs.pts - a.gs.pts)[0], kings = g.zones.map(Z => Z.king >= 0 ? `👑 ${MG.up(m.name(m.chairs[Z.king]))}` : Z.crowd ? 'CONTESTED' : 'EMPTY'); return { a: 'KING OF THE HILL', b: kings.join('   '), mid: `Alone on a hill = points  •  ${m.name(lead)} ${Math.floor(lead.gs.pts)} / ${m.mini.target}`, left: MG.peopleLine(m, c => Math.floor(c.gs.pts)) }; },
  tag(c, m) { return m.gs.zones && m.gs.zones.some(Z => Z.king === c.k) ? '👑 ' + Math.floor(c.gs.pts) : c.player ? `${MG.pname(c)} ${Math.floor(c.gs.pts)}` : ''; },
  startLine: () => 'Two hills. Be alone on one!'
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
  init(m) { const g = m.gs; g.cols = 14; g.rows = 7; g.t = '0'.repeat(g.cols * g.rows); g.el = 0; g.next = 2.5; g.snakeIn = 8; m.lavaT = new Array(g.cols * g.rows).fill(0); },
  tileAt(m, x, y) { const g = m.gs, i = Math.floor(x / (m.width / g.cols)), j = Math.floor(y / (m.height / g.rows)); return i < 0 || j < 0 || i >= g.cols || j >= g.rows ? -1 : j * g.cols + i; },
  center(m, k) { const g = m.gs, w = m.width / g.cols, hh = m.height / g.rows; return { x: (k % g.cols + 0.5) * w, y: (Math.floor(k / g.cols) + 0.5) * hh }; },
  step(m, h) {
    const g = m.gs, T = g.t.split(''), N = T.length; g.el += h; if (!m.lavaT) m.lavaT = new Array(N).fill(0);
    for (let k = 0; k < N; k++) { if (T[k] === '0') continue; m.lavaT[k] -= h; if (m.lavaT[k] > 0) continue; if (T[k] === '1') { T[k] = '2'; m.lavaT[k] = Math.min(10, 3 + g.el * 0.04); } else T[k] = '0'; }
    if ((g.next -= h) <= 0) {                                            // more and more of the floor turns to lava as the game goes on
      g.next = Math.max(1.2, 3 - g.el * 0.015); const safe = []; for (let k = 0; k < N; k++) if (T[k] === '0') safe.push(k);
      const want = Math.min(Math.floor(safe.length - N * 0.5), 2 + Math.floor(g.el / 20));
      for (let n = 0; n < want; n++) { const k = safe.splice(Math.floor(Math.random() * safe.length), 1)[0]; T[k] = '1'; m.lavaT[k] = 1.7; }
    }
    this.snake(m, h, T);
    g.t = T.join('');
    for (const o of MG.all(m, 'boom')) { o.life -= h; if (o.life <= 0) MG.remove(m, o); }
    const S = g.sn;
    for (const c of MG.live(m)) {
      const k = this.tileAt(m, c.x, c.y), bitten = S && S.p.some(([x, y], i) => Math.hypot(c.x - x, c.y - y) < (i === 0 ? 0.95 : 0.75));
      if ((k >= 0 && T[k] === '2') || bitten) { MH.out(m, c); MG.add(m, { t: 'boom', x: MG.r2(c.x), y: MG.r2(c.y), life: 0.6, lava: 1 }); m.sfx('foul'); MG.notice(m, bitten ? `THE LAVA SNAKE GOT ${MG.up(m.name(c))}` : `${MG.up(m.name(c))} IS TOAST`, 1.5); if (Math.random() < 0.5) m.line(bitten ? `The snake gets ${m.name(c)}!` : `${m.name(c)} touched the lava!`); }
    }
    MG.lastStanding(m, () => 'melted');
  },
  snake(m, h, T) {                                                      // a snake of lava that wakes up after a few seconds and hunts the nearest cart, melting the floor behind it
    const g = m.gs; if ((g.snakeIn -= h) > 0) return;
    if (!g.sn) { const x = m.width / 2, y = -0.5; g.sn = { a: Math.PI / 2, p: Array.from({ length: 8 }, (_, i) => [x, y - i * 0.7]) }; MG.notice(m, 'THE LAVA SNAKE IS AWAKE!', 2); m.sfx('whistle'); m.line('Look out, here comes the lava snake!'); }
    const S = g.sn, H = S.p[0], live = MG.live(m), tgt = live.slice().sort((a, b) => Math.hypot(a.x - H[0], a.y - H[1]) - Math.hypot(b.x - H[0], b.y - H[1]))[0];
    const want = tgt ? Math.atan2(tgt.y - H[1], tgt.x - H[0]) : S.a, turn = 1.1 + Math.min(1.1, g.el * 0.008), sp = Math.min(4.2, 1.8 + g.el * 0.015);
    const da = normalizeAngle(want - S.a); S.a += Math.max(-turn * h, Math.min(turn * h, da));
    let nx = H[0] + Math.cos(S.a) * sp * h, ny = H[1] + Math.sin(S.a) * sp * h;
    if (nx < 0.4 || nx > m.width - 0.4) S.a = Math.PI - S.a; if (ny < 0.4 && g.snakeIn < -2 || ny > m.height - 0.4) S.a = -S.a;
    nx = Math.max(0.3, Math.min(m.width - 0.3, nx)); ny = Math.max(-1, Math.min(m.height - 0.3, ny));
    S.p[0] = [nx, ny];
    for (let i = 1; i < S.p.length; i++) { const a = S.p[i - 1], b = S.p[i], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; if (d > 0.7) S.p[i] = [a[0] + dx / d * 0.7, a[1] + dy / d * 0.7]; }
    const want2 = 8 + Math.floor(g.el / 15); if (S.p.length < Math.min(16, want2)) S.p.push(S.p[S.p.length - 1].slice());
    const k = this.tileAt(m, nx, ny); if (k >= 0 && T[k] === '0') { T[k] = '2'; m.lavaT[k] = 1.6; }   // its trail is lava for a moment
  },
  timeUp(m) { const live = MG.live(m); m.finishGame(live.length === 1 ? `${MG.up(m.name(live[0]))} WINS!` : live.length ? `${live.length} SURVIVORS WIN!` : 'NOBODY WINS', [...live.map(c => ({ c, text: 'survived' })), ...m.order.slice().reverse().map(c => ({ c, text: 'melted' }))], -1, 'Time up: everyone still standing wins'); },
  ai(c, m) {
    const T = m.gs.t, S = m.gs.sn, here = this.tileAt(m, c.x, c.y), ahead = this.tileAt(m, c.x + Math.cos(c.heading) * 1.2, c.y + Math.sin(c.heading) * 1.2);
    const bad = k => k < 0 || T[k] !== '0', snakeD = (x, y) => S ? Math.min(...S.p.map(([a, b]) => Math.hypot(a - x, b - y))) : 99;
    const clear = (x1, y1) => { const n = Math.ceil(Math.hypot(x1 - c.x, y1 - c.y) / 0.35); for (let i = 1; i <= n; i++) { const k = this.tileAt(m, c.x + (x1 - c.x) * i / n, c.y + (y1 - c.y) * i / n); if (k < 0 || T[k] === '2' || (T[k] === '1' && i > n / 2)) return false; } return true; };
    if (S && snakeD(c.x, c.y) < 6) {                                    // run from the snake, in the direction with no lava on the way
      let best = null, bs = -Infinity; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, x = c.x + Math.cos(a) * 2.2, y = c.y + Math.sin(a) * 2.2; if (!clear(x, y)) continue; const sc = snakeD(x, y) - Math.abs(normalizeAngle(a - c.heading)) * 0.4; if (sc > bs) { bs = sc; best = a; } }
      if (best !== null) { c.safeK = null; return { x: Math.cos(best), y: Math.sin(best), speed: 1 }; }
    }
    if (!c.safeK || bad(c.safeK) || bad(here) || bad(ahead) || snakeD(...Object.values(this.center(m, c.safeK))) < 3 || (c.reachedAt && m.simTime - c.reachedAt > 2 + (c.k % 3))) {   // pick a safe tile (and a new one every few seconds)
      let best = -1, bd = Infinity; for (let k = 0; k < T.length; k++) { if (T[k] !== '0' || k === here) continue; const p = this.center(m, k); if (!clear(p.x, p.y)) continue; let d = Math.hypot(p.x - c.x, p.y - c.y) + Math.random() * 3; for (const nb of [k - 1, k + 1, k - m.gs.cols, k + m.gs.cols]) if (nb >= 0 && nb < T.length && T[nb] !== '0') d += 1.5; d += Math.max(0, 6 - snakeD(p.x, p.y)) * 2; if (d < bd) { bd = d; best = k; } }
      c.safeK = best; c.reachedAt = 0;
    }
    if (c.safeK < 0) return MG.wander(c, m); const p = this.center(m, c.safeK), d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < 0.6 && !c.reachedAt) c.reachedAt = m.simTime;
    return MH.to(c, p.x, p.y, d < 1.5 ? 0.45 : 0.9);
  },
  hud(m) { return { a: 'FLOOR IS LAVA', b: `${MG.live(m).length} LEFT`, mid: m.gs.sn ? 'Run from the lava snake!' : 'Orange melts.  Red is lava!', left: MG.peopleLine(m, c => c.out ? 'TOAST' : 'safe') }; },
  startLine: () => 'The floor is lava!'
};

/* =============================== GOAL GAMES: MULTIBALL MADNESS and GIANT BALL =============================== */
const BEACH = { gravity: 6.5, bounce: 0.78, reach: 1.0, goalZ: 1.9 };
const goalGame = (big) => ({
  teams: true,
  init(m) {
    const g = m.gs; g.score = [0, 0]; g.gw = big ? 3.3 : 1.7; g.gl = big ? 2.3 : 1.1;
    const n = big ? 1 : m.mini.balls; for (let i = 0; i < n; i++) this.spawn(m, i, n);
    for (const c of m.chairs) c.gs.goals = 0;
  },
  spawn(m, i, n, ball) {
    const x = m.width / 2, y = n > 1 ? m.centerY + (i - (n - 1) / 2) * Math.min(2.4, (m.height - 3) / n) : m.centerY;
    const b = ball || MG.add(m, { t: big ? 'bigball' : 'ball', r: big ? 1.1 : 0.2, mass: big ? 70 : 0.5, x, y, vx: 0, vy: 0, wait: 0, last: -1, z: 0, vz: 0 });
    Object.assign(b, { x, y, vx: big ? 0 : (Math.random() - 0.5) * 2, vy: big ? 0 : (Math.random() - 0.5) * 2, wait: 0, z: big ? 3.5 : 0, vz: 0 }); return b;
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
      if (big) {                                                          // the giant ball is a beach ball: light, floaty, bouncy. Carts hit it when it is low enough to reach
        b.vz -= BEACH.gravity * h; b.z += b.vz * h;
        if (b.z <= 0) { b.z = 0; if (b.vz < -0.8) b.vz = -b.vz * BEACH.bounce; else b.vz = 0; }
        if (b.z < BEACH.reach) for (const c of live) {
          const d = Math.hypot(b.x - c.x, b.y - c.y); if (d >= b.r + R_CART() + 0.05) continue; who = c;
          const before = Math.hypot(b.vx, b.vy), closing = Physics.circles(b, b.r, b.mass, c, R_CART(), K.mass * (c.massMul || 1), 0.6);
          if (closing > 0.3 && !(b.popAt > m.simTime)) { b.vz = Math.max(b.vz, 1.4 + closing * (c.spinLeft > 0 ? 1.3 : 0.55)); b.popAt = m.simTime + 0.25; if (closing > 1.5) m.sfx('bump'); }   // a hit pops it up into the air
        }
        const air = b.z > 0.05, sp = Math.hypot(b.vx, b.vy); if (sp > 0) { const k = Math.max(0, sp - (air ? 0.25 : 0.7) * h) / sp; b.vx *= k; b.vy *= k; } b.x += b.vx * h; b.y += b.vy * h;
        const r = b.r, e = 0.7; if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy) * e; } if (b.y > m.height - r) { b.y = m.height - r; b.vy = -Math.abs(b.vy) * e; } if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx) * e; } if (b.x > m.width - r) { b.x = m.width - r; b.vx = -Math.abs(b.vx) * e; }

      } else who = MH.ballPhys(m, b, h, live, { bounce: 0.45, friction: 0.9, wallBounce: 0.7 });
      for (const o of balls) if (o !== b && !(o.wait > 0) && b.id < o.id) Physics.circles(b, b.r, b.mass, o, o.r, o.mass, 0.8);
      if (who) b.last = who.k;
      for (const bx of boxes) {                                           // the goal line: the ball's centre over it, between the posts
        const inMouth = Math.abs(b.y - cy) < g.gw - (big ? 0 : b.r) && !(big && b.z > BEACH.goalZ);
        if (inMouth && ((bx.side === 0 && b.x < g.gl) || (bx.side === 1 && b.x > m.width - g.gl))) { this.goal(m, b, 1 - bx.side); break; }
        if (!inMouth) MG.rectPush(b, b.r, bx, 0.6);
      }
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
const BOWL = { foul: 0.33, headX: 5.2, pinR: 0.13, pinMass: 0.35, ballR: 0.26, ballMass: 3, gap: 0.62, laneHalf: 2.1, turn: 12 };
MODES.bowling = {
  init(m) { const g = m.gs; g.turn = 0; g.frame = 1; g.roll = 1; g.phase = 'aim'; g.t = 0; g.last = ''; for (const c of m.chairs) { c.gs.score = 0; c.gs.strikes = 0; } this.setPins(m, true); },
  spot(m, i) { const row = [0, 1, 1, 2, 2, 2, 3, 3, 3, 3][i], j = [0, 0, 1, 0, 1, 2, 0, 1, 2, 3][i]; return { x: m.width - BOWL.headX + row * BOWL.gap * 0.87, y: m.centerY + (j - row / 2) * BOWL.gap }; },
  setPins(m, all) {
    if (all) { for (const p of MG.all(m, 'pin')) MG.remove(m, p); for (let i = 0; i < 10; i++) { const s = this.spot(m, i); MG.add(m, { t: 'pin', i, x: s.x, y: s.y, vx: 0, vy: 0, r: BOWL.pinR, mass: BOWL.pinMass, down: 0 }); } }
    else for (const p of MG.all(m, 'pin')) if (p.down) MG.remove(m, p); else { const s = this.spot(m, p.i); Object.assign(p, { x: s.x, y: s.y, vx: 0, vy: 0 }); }
    let b = MG.all(m, 'bball')[0]; if (!b) b = MG.add(m, { t: 'bball', r: BOWL.ballR, mass: BOWL.ballMass }); Object.assign(b, { x: m.width * BOWL.foul - 1.6, y: m.centerY, vx: 0, vy: 0 });
  },
  bowler: m => m.chairs[m.gs.turn % m.chairs.length],
  rails: m => { const x0 = m.width * BOWL.foul, cy = m.centerY, w = BOWL.laneHalf; return [{ x0, y0: cy - w - 0.25, x1: m.width + 1, y1: cy - w }, { x0, y0: cy + w, x1: m.width + 1, y1: cy + w + 0.25 }]; },   // the bumper rails down each side of the lane
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
    const who = MH.ballPhys(m, b, h, g.phase === 'aim' ? [bw] : [], { bounce: 0.35, friction: 0.22, wallBounce: 0.4 }), rails = this.rails(m);
    for (const rl of rails) { MG.rectPush(b, b.r, rl, 0.85); MG.rectPush(bw, R_CART(), rl, 0.3); }
    for (const p of pins) {
      MH.ballPhys(m, p, h, [], { friction: 2.2, wallBounce: 0.3 }); for (const rl of rails) MG.rectPush(p, p.r, rl, 0.5);
      Physics.circles(b, b.r, b.mass, p, p.r, p.mass, 0.7);
      for (const q of pins) if (q.id > p.id) Physics.circles(p, p.r, p.mass, q, q.r, q.mass, 0.6);
      const s = this.spot(m, p.i); if (!p.down && (Math.hypot(p.vx, p.vy) > 0.9 || Math.hypot(p.x - s.x, p.y - s.y) > 0.22)) p.down = 1;
    }
    if (g.phase === 'aim') {
      if (bw.x > m.width * BOWL.foul - R_CART()) { bw.vx = Math.min(bw.vx, 0); bw.x = m.width * BOWL.foul - R_CART(); }   // the foul line
      if (b.x > m.width * BOWL.foul && Math.hypot(b.vx, b.vy) > 0.4) { g.phase = 'roll'; g.t = 0; m.sfx('screech'); }
      else if (g.t > BOWL.turn) { g.phase = 'roll'; g.t = 0; MG.notice(m, `TIME! ${MG.up(m.name(bw))} TOOK TOO LONG`, 1.4); m.sfx('foul'); }
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
  hud(m) { const bw = this.bowler(m); return { clock: m.gs.phase === 'aim' ? `${Math.max(0, Math.ceil(BOWL.turn - m.gs.t))}s` : `FRAME ${Math.min(m.gs.frame, m.mini.frames)} / ${m.mini.frames}`, a: 'BOWLING', b: `${MG.up(m.name(bw))}, BALL ${m.gs.roll}  •  FRAME ${Math.min(m.gs.frame, m.mini.frames)}/${m.mini.frames}`, mid: m.gs.last || 'Push the ball at the pins', left: MG.peopleLine(m, c => c.gs.score) }; },
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
const GOLF = { r: 0.12, roll: 0.85, cup: 0.2, sink: 2.4, power: 1.55, base: 1.0, spin: 8, reach: 0.42, cool: 0.9 };
MODES.golf = {
  init(m) { m.gs.hole = 0; m.gs.ht = 0; for (const c of m.chairs) { c.gs.strokes = 0; c.gs.total = 0; } this.setHole(m); },
  H: m => { const s = m.width / 28, sy = m.height / 15, H = GOLF_HOLES[m.gs.hole % GOLF_HOLES.length]; return { name: H.name, tee: { x: H.tee[0] * s, y: H.tee[1] * sy }, cup: { x: H.cup[0] * s, y: H.cup[1] * sy }, blocks: H.blocks.map(b => ({ x0: b[0] * s, y0: b[1] * sy, x1: b[2] * s, y1: b[3] * sy })), via: H.via.map(v => ({ x: v[0] * s, y: v[1] * sy })) }; },
  setHole(m) {
    const H = this.H(m), g = m.gs; g.ht = 0; g.cup = H.cup; g.blocks = H.blocks; g.name = H.name;
    for (const o of MG.all(m, 'gball')) MG.remove(m, o);
    const ux = H.cup.x > H.tee.x ? 1 : -1, n = m.chairs.length;
    m.chairs.forEach((c, i) => { c.gs.strokes = 0; c.gs.holed = 0; c.gs.plan = null; const off = (i - (n - 1) / 2) * 1.0;
      MG.add(m, { t: 'gball', k: c.k, x: H.tee.x + ux * 1.3, y: H.tee.y + off, vx: 0, vy: 0, r: GOLF.r, cd: 0 });
      Object.assign(c, { x: H.tee.x - ux * 0.2, y: H.tee.y + off, vx: 0, vy: 0, heading: ux > 0 ? 0 : Math.PI }); c.px = c.x; c.py = c.y; c.ph = c.heading; c.gs.ghost = 1; });   // carts pass through each other: everyone plays their own ball
  },
  kickoff(m) { this.setHole(m); },
  step(m, h) {
    const g = m.gs, live = MG.live(m), K = CONFIG.chair; g.ht += h;
    if (g.wait > 0) { g.wait -= h; if (g.wait <= 0) { g.hole++; if (g.hole >= m.mini.holes) return this.end(m); this.setHole(m); m.line(`Hole ${g.hole + 1}: ${g.name}.`); } return; }
    for (const c of live) for (const b of g.blocks) MG.rectPush(c, R_CART(), b, K.boardBounce);
    for (const b of MG.all(m, 'gball')) {
      const c = m.chairs[b.k]; b.cd = Math.max(0, b.cd - h);
      if (c && !c.gs.holed && b.cd <= 0) {                               // the strike: the front of your cart (or a spin) hits your ball. Aim with your heading, power with your speed
        const f = c.toWorld(0.62, 0), spin = c.spinLeft > 0, hx = Math.cos(c.heading), hy = Math.sin(c.heading), fwd = c.vx * hx + c.vy * hy;
        if (Math.hypot(b.x - f.x, b.y - f.y) < GOLF.reach + (spin ? 0.35 : 0) && (spin || fwd > 0.25)) {
          let v = spin ? GOLF.spin : GOLF.base + fwd * GOLF.power, ax = hx, ay = hy;
          if (spin) { const dx = b.x - c.x, dy = b.y - c.y, d = Math.hypot(dx, dy) || 1, s = Math.sign(c.spinOmega || 1); ax = dx / d * 0.5 + (-dy / d * s) * 0.5; ay = dy / d * 0.5 + (dx / d * s) * 0.5; const l = Math.hypot(ax, ay) || 1; ax /= l; ay /= l; }   // a spin swats it off the side of the stick
          b.vx = ax * v; b.vy = ay * v; b.cd = GOLF.cool; c.gs.strokes++; m.sfx(spin ? 'bump' : 'blip');
        }
      }
      if (c) { const d = Math.hypot(b.x - c.x, b.y - c.y), R = R_CART() + b.r; if (d < R && d > 0 && b.cd <= 0) { b.x = c.x + (b.x - c.x) / d * R; b.y = c.y + (b.y - c.y) / d * R; } }   // the cart's body nudges it aside (no free dribbling)
      const sp = Math.hypot(b.vx, b.vy); if (sp > 0) { const k = Math.max(0, sp - GOLF.roll * h - sp * 0.08 * h) / sp; b.vx *= k; b.vy *= k; }   // a golf ball on a green: steady rolling friction, a little drag
      b.x += b.vx * h; b.y += b.vy * h;
      const r = b.r, e = 0.6; if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx) * e; } if (b.x > m.width - r) { b.x = m.width - r; b.vx = -Math.abs(b.vx) * e; } if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy) * e; } if (b.y > m.height - r) { b.y = m.height - r; b.vy = -Math.abs(b.vy) * e; } m.roundCorners(b, r, e);
      for (const bl of g.blocks) MG.rectPush(b, b.r, bl, 0.6);
      const dc = Math.hypot(b.x - g.cup.x, b.y - g.cup.y), v = Math.hypot(b.vx, b.vy);
      if (dc < GOLF.cup && v < GOLF.sink) { c.gs.holed = 1; c.gs.total += c.gs.strokes; MG.remove(m, b); m.sfx('goal'); MG.notice(m, `${MG.up(m.name(c))} SINKS IT IN ${c.gs.strokes}`, 1.6); if (c.gs.strokes === 1) m.line(`A hole in one for ${m.name(c)}!`); continue; }
      if (dc < GOLF.cup && v >= GOLF.sink && !b.lip) { b.lip = 1; const k = 0.35; b.vx += (Math.random() - 0.5) * v * k; b.vy += (Math.random() - 0.5) * v * k; } else if (dc >= GOLF.cup) b.lip = 0;   // too fast: it lips out
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
    if (Math.hypot(b.vx, b.vy) > 0.15) { c.gs.plan = null; return { x: 0, y: 0, speed: 0 }; }   // wait for it to stop
    const g = m.gs, H = this.H(m);
    if (!c.gs.plan) {                                                     // line up: the target (the cup, or a way round the blocks), the power, and where to start the run-up
      let tgt = g.cup;
      if (!MG.clearPath(b.x, b.y, g.cup.x, g.cup.y, g.blocks)) { let best = null, bd = Infinity; for (const v of H.via) { if (!MG.clearPath(b.x, b.y, v.x, v.y, g.blocks)) continue; const d = Math.hypot(v.x - b.x, v.y - b.y) + Math.hypot(g.cup.x - v.x, g.cup.y - v.y) * (MG.clearPath(v.x, v.y, g.cup.x, g.cup.y, g.blocks) ? 1 : 1.6); if (d < bd) { bd = d; best = v; } } if (best) tgt = best; }
      const dist = Math.hypot(tgt.x - b.x, tgt.y - b.y) + (tgt === g.cup ? 0.15 : 1.5), v0 = Math.min(GOLF.base + GOLF.power * CONFIG.chair.maxSpeed, Math.sqrt(2 * GOLF.roll * dist) + 0.3);
      const fwd = Math.max(0.3, (v0 - GOLF.base) / GOLF.power), err = ((m.difficulty || {}).reaction || 0.2) * 0.25 * (Math.random() - 0.5);
      const a = Math.atan2(tgt.y - b.y, tgt.x - b.x) + err, R = R_CART() + 0.2; let run = 1.4 + fwd * fwd / (2 * CONFIG.chair.accel);
      const free = d => { const x = b.x - Math.cos(a) * d, y = b.y - Math.sin(a) * d; return x > R && x < m.width - R && y > R && y < m.height - R && !g.blocks.some(k => x > k.x0 - R && x < k.x1 + R && y > k.y0 - R && y < k.y1 + R); };
      while (run > 1.0 && !free(run)) run -= 0.2;                         // a ball by a wall: a shorter run-up (or a spin, below)
      const spin = !free(run);
      c.gs.plan = { a, sp: fwd / CONFIG.chair.maxSpeed, sx: b.x - Math.cos(a) * run, sy: b.y - Math.sin(a) * run, go: 0, at: m.simTime, spin };
    }
    const P = c.gs.plan, ux = Math.cos(P.a), uy = Math.sin(P.a);
    if (m.simTime - P.at > 9) { c.gs.plan = null; return { x: 0, y: 0, speed: 0 }; }   // could not line up: think again
    if (P.spin) { if (MH.dist(c, b) > 1.0) return MH.to(c, b.x, b.y, 0.4); return { x: 0, y: 0, speed: 0, spin: Math.random() < 0.5 ? 1 : -1 }; }   // pinned against a wall: swat it out with a spin
    if (!P.go) { if (Math.hypot(c.x - P.sx, c.y - P.sy) > 0.5) return MH.to(c, P.sx, P.sy, 0.5); if (Math.abs(normalizeAngle(c.heading - P.a)) > 0.12) return { x: ux * 0.2, y: uy * 0.2, speed: 0.12 }; P.go = 1; }
    if (b.cd > 0) { c.gs.plan = null; return { x: 0, y: 0, speed: 0 }; }
    return { x: ux, y: uy, speed: Math.min(1, P.sp * 1.08) };
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
        if (c.side !== s && !this.carrying(m, c) && !(c.gs.noPick > m.simTime) && !(f.lock > m.simTime)) { f.car = c.k; f.home = 0; m.sfx('select'); MG.notice(m, `${MG.up(m.name(c))} HAS THE ${MG.up(TEAMS[m.teams[s]].name)} FLAG!`, 1.6); if (Math.random() < 0.6) m.line(`${m.name(c)} grabs the flag!`); break; }
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
    for (const [car, tagger] of [[a, b], [b, a]]) { const f = m.gs.flag.find(x => x.car === car.k); if (f) { f.car = -1; f.drop = 8; f.lock = m.simTime + 0.8; car.gs.noPick = m.simTime + 3; car.stunLeft = 1.2; m.sfx('foul'); MG.notice(m, `${MG.up(m.name(tagger))} KNOCKS THE FLAG LOOSE`, 1.4); } }
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

/* =============================== PAINTBALL =============================== */
/* Big maps with walls, a bunker, mazes and moving things. Walls: [x0, y0, x1, y1, kind] (kind: wall, bags (sandbags), crate).
   Moving things are functions of the game clock (m.gs.t), so every player computes the same positions:
     slide { w, h, a: [x, y], b: [x, y], period }   a block sliding to and fro
     gate  { w, h, a, b, period }                   a gate that stays shut, slides open, stays open, slides shut
     spin  { x, y, len, speed }                     a spinning bar (a row of round posts) */
const PB = { speed: 18, life: 1.3, ammo: 12, maxAmmo: 24, pickup: 8, cool: 0.42, rapidCool: 0.14, respawn: 3.5, protect: 2, wallH: 1.5 };
const PB_MAPS = {
  bunker: { name: 'Bunker Hill', size: { width: 48, height: 28 }, blurb: 'A sandbag bunker on the left, a fort on the right, a maze in the middle and sliding gates on both flanks.',
    walls: [[3, 8.5, 10, 9.1, 'bags'], [3, 18.9, 10, 19.5, 'bags'], [9.4, 9.1, 10, 12.4, 'bags'], [9.4, 15.6, 10, 18.9, 'bags'], [3, 9.1, 3.6, 12, 'bags'], [3, 16, 3.6, 18.9, 'bags'],
      [38, 10.5, 44, 11.1, 'wall'], [38, 16.9, 44, 17.5, 'wall'], [38, 11.1, 38.6, 12.6, 'wall'], [38, 15.4, 38.6, 16.9, 'wall'],
      [19.5, 5, 20.1, 11, 'wall'], [19.5, 5, 25, 5.6, 'wall'], [27.9, 17, 28.5, 23, 'wall'], [23, 22.4, 28.5, 23, 'wall'], [16, 13.4, 17.2, 14.6, 'crate'], [30.8, 13.4, 32, 14.6, 'crate'],
      [13, 4, 14.2, 5.2, 'crate'], [13, 22.8, 14.2, 24, 'crate'], [33.8, 4, 35, 5.2, 'crate'], [33.8, 22.8, 35, 24, 'crate'], [35, 8, 36.2, 9.2, 'crate'], [11.8, 18.8, 13, 20, 'crate']],
    moving: [{ type: 'gate', w: 0.7, h: 5, a: [24, 2.6], b: [24, -2.4], period: 9 }, { type: 'gate', w: 0.7, h: 5, a: [24, 25.4], b: [24, 30.4], period: 9, phase: 0.5 }, { type: 'spin', x: 24, y: 14, len: 3.4, speed: 0.7 }],
    spawn: [[[1.6, 11], [1.6, 14], [1.6, 17], [6.5, 14]], [[46.4, 11], [46.4, 14], [46.4, 17], [41.5, 14]]] },
  maze: { name: 'The Maze', size: { width: 44, height: 30 }, blurb: 'A maze of corners and corridors, with blocks sliding down the long halls.',
    walls: (() => { const w = []; let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let gx = 2; gx <= 8; gx++) for (let gy = 1; gy <= 6; gy++) { if (gy === 3 && gx % 2 === 0) continue; const x = gx * 4.4, y = gy * 4.1, r = rnd(), kind = gx === 5 && gy === 3 ? 'crate' : 'wall';
        if (r < 0.4) w.push([x - 2, y - 0.3, x + 2, y + 0.3, kind]); else if (r < 0.8) w.push([x - 0.3, y - 2, x + 0.3, y + 2, kind]); else { w.push([x - 2, y - 0.3, x + 0.3, y + 0.3, kind]); w.push([x - 0.3, y - 0.3, x + 0.3, y + 2, kind]); } }
      return w; })(),
    moving: [{ type: 'slide', w: 1.6, h: 1.6, a: [11, 14.4], b: [33, 14.4], period: 10 }, { type: 'slide', w: 1.6, h: 1.6, a: [22, 2], b: [22, 28], period: 12 }, { type: 'gate', w: 4.4, h: 0.7, a: [6.6, 14.4], b: [1.6, 14.4], period: 8 }, { type: 'gate', w: 4.4, h: 0.7, a: [37.4, 14.4], b: [42.4, 14.4], period: 8, phase: 0.5 }],
    spawn: [[[1.6, 4], [1.6, 10], [1.6, 20], [1.6, 26]], [[42.4, 4], [42.4, 10], [42.4, 20], [42.4, 26]]] },
  warehouse: { name: 'The Warehouse', size: { width: 50, height: 30 }, blurb: 'Rows of shelves, forklifts racing down the aisles, a big sliding door and a sandbag bunker.',
    walls: [...[11, 17, 23, 29, 35].flatMap(x => [[x, 3, x + 1.4, 12, 'crate'], [x, 18, x + 1.4, 27, 'crate']]), [2.5, 10, 6.5, 10.6, 'bags'], [2.5, 19.4, 6.5, 20, 'bags'], [6, 10.6, 6.6, 13, 'bags'], [6, 17, 6.6, 19.4, 'bags'],
      [42, 6, 46, 6.6, 'wall'], [45.4, 6.6, 46, 11, 'wall'], [42, 23.4, 46, 24, 'wall'], [45.4, 19, 46, 23.4, 'wall']],
    moving: [{ type: 'slide', w: 1.8, h: 1.2, a: [14.2, 3.5], b: [14.2, 26.5], period: 9 }, { type: 'slide', w: 1.8, h: 1.2, a: [32.2, 26.5], b: [32.2, 3.5], period: 9 }, { type: 'gate', w: 0.8, h: 6, a: [26, 15], b: [26, 21.5], period: 10 }, { type: 'spin', x: 20.2, y: 15, len: 2.6, speed: -0.9 }],
    spawn: [[[1.6, 12], [1.6, 15], [1.6, 18], [4.5, 15]], [[48.4, 9], [48.4, 15], [48.4, 21], [44, 15]]] }
};
const PB_ITEMS = { ammo: { icon: '🎯', label: 'AMMO' }, shield: { icon: '🛡', label: 'SHIELD' }, rapid: { icon: '⚡', label: 'RAPID FIRE' } };
MODES.paintball = {
  map: m => PB_MAPS[m.mini.map] || PB_MAPS.bunker,
  walls(m) { const M = this.map(m); return M._w || (M._w = M.walls.map(([x0, y0, x1, y1, kind]) => ({ x0, y0, x1, y1, kind }))); },
  movers(m) {                                                            // the moving blocks now (boxes) and the spinning posts (circles)
    const t = m.gs.t || 0, boxes = [], posts = [];
    for (const [i, o] of this.map(m).moving.entries()) {
      if (o.type === 'spin') { const a = t * o.speed; for (let k = -3; k <= 3; k++) posts.push({ x: o.x + Math.cos(a) * o.len * k / 3, y: o.y + Math.sin(a) * o.len * k / 3, r: 0.38, i }); continue; }
      let u = ((t / o.period + (o.phase || 0)) % 1 + 1) % 1, k;
      if (o.type === 'gate') k = u < 0.4 ? 0 : u < 0.5 ? (u - 0.4) / 0.1 : u < 0.9 ? 1 : 1 - (u - 0.9) / 0.1; else k = (1 - Math.cos(u * Math.PI * 2)) / 2;
      const x = o.a[0] + (o.b[0] - o.a[0]) * k, y = o.a[1] + (o.b[1] - o.a[1]) * k; boxes.push({ x0: x - o.w / 2, y0: y - o.h / 2, x1: x + o.w / 2, y1: y + o.h / 2, kind: o.type, i });
    }
    return { boxes, posts };
  },
  allWalls(m) { const mv = this.movers(m); return [...this.walls(m), ...mv.boxes, ...mv.posts.map(p => ({ x0: p.x - p.r, y0: p.y - p.r, x1: p.x + p.r, y1: p.y + p.r }))]; },
  foes: (m, c) => m.chairs.filter(o => o !== c && !o.out && !(o.gs.dead > 0) && (m.mini.mode !== 'teams' || o.side !== c.side)),
  init(m) {
    const g = m.gs; g.map = m.mini.map; g.t = 0; g.score = [0, 0]; g.boxIn = 3; g.powIn = 8;
    for (const c of m.chairs) c.gs = { ammo: PB.ammo, cd: 0, hits: 0, outs: 0, dead: 0, prot: 0, shield: 0, rapid: 0 };
  },
  spawnAt(m, c) {
    const S = this.map(m).spawn, list = m.mini.mode === 'teams' ? S[c.side] : [...S[0], ...S[1]], foes = this.foes(m, c);
    const p = list.slice().sort((a, b) => Math.min(...foes.map(o => Math.hypot(o.x - b[0], o.y - b[1])), 99) - Math.min(...foes.map(o => Math.hypot(o.x - a[0], o.y - a[1])), 99))[m.mini.mode === 'teams' ? Math.floor(Math.random() * 2) : 0];
    const x = p[0] + (Math.random() - 0.5) * 0.6, y = p[1] + (Math.random() - 0.5) * 0.6, h = x < m.width / 2 ? 0 : Math.PI;
    Object.assign(c, { x, y, px: x, py: y, vx: 0, vy: 0, heading: h, ph: h });
  },
  kickoff(m) { m.chairs.forEach((c, i) => { const S = this.map(m).spawn, side = m.mini.mode === 'teams' ? c.side : i % 2, list = S[side], p = list[Math.floor(i / 2) % list.length], x = p[0], y = p[1] + (i % 3 - 1) * 0.4, h = x < m.width / 2 ? 0 : Math.PI; Object.assign(c, { x, y, px: x, py: y, heading: h, ph: h, vx: 0, vy: 0 }); }); },
  freeSpot(m) { const W = this.allWalls(m); for (let t = 0; t < 40; t++) { const x = 2 + Math.random() * (m.width - 4), y = 2 + Math.random() * (m.height - 4); if (!W.some(b => x > b.x0 - 0.8 && x < b.x1 + 0.8 && y > b.y0 - 0.8 && y < b.y1 + 0.8) && m.chairs.every(c => Math.hypot(c.x - x, c.y - y) > 3) && (m.gs.objs || []).every(o => Math.hypot(o.x - x, o.y - y) > 2.5)) return { x: MG.r2(x), y: MG.r2(y) }; } return null; },
  step(m, h) {
    const g = m.gs, K = CONFIG.chair, R = R_CART(); g.t += h;
    const walls = this.walls(m), mv = this.movers(m), all = [...walls, ...mv.boxes];
    for (const c of m.chairs) {
      const G = c.gs; G.cd = Math.max(0, G.cd - h); G.prot = Math.max(0, G.prot - h); G.rapid = Math.max(0, G.rapid - h); G.hitT = Math.max(0, (G.hitT || 0) - h);
      if (G.dead > 0) { G.dead -= h; c.binLeft = Math.max(0.01, G.dead); if (G.dead <= 0) { G.dead = 0; c.binLeft = 0; G.ghost = 0; G.prot = PB.protect; G.ammo = Math.max(G.ammo, PB.ammo); this.spawnAt(m, c); } continue; }
      for (const b of all) MG.rectPush(c, R, b, K.boardBounce);
      for (const p of mv.posts) { const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy), mn = R + p.r; if (d < mn && d > 0) { c.x = p.x + dx / d * mn; c.y = p.y + dy / d * mn; const vn = c.vx * dx / d + c.vy * dy / d; if (vn < 0) { c.vx -= 1.6 * vn * dx / d; c.vy -= 1.6 * vn * dy / d; } } }
    }
    // paintballs
    for (const o of MG.all(m, 'pb')) {
      const n = 3; let gone = false;
      for (let s = 0; s < n && !gone; s++) {
        o.x += o.vx * h / n; o.y += o.vy * h / n;
        if (o.x < 0 || o.y < 0 || o.x > m.width || o.y > m.height || all.some(b => o.x > b.x0 && o.x < b.x1 && o.y > b.y0 && o.y < b.y1) || mv.posts.some(p => Math.hypot(o.x - p.x, o.y - p.y) < p.r)) { this.splat(m, o.x - o.vx * 0.012, o.y - o.vy * 0.012, o.col); gone = true; break; }
        const sh = m.chairs[o.k];
        for (const c of m.chairs) { if (c === sh || c.out || c.gs.dead > 0 || (m.mini.mode === 'teams' && sh && c.side === sh.side)) continue; if (Math.hypot(c.x - o.x, c.y - o.y) < R + 0.08) { this.hit(m, c, sh, o); gone = true; break; } }
      }
      if (gone || g.t > o.until) MG.remove(m, o); else { o.x = MG.r2(o.x); o.y = MG.r2(o.y); }
    }
    for (const o of MG.all(m, 'splat')) if (g.t > o.until) MG.remove(m, o);
    // pick-ups: ammo often, power-ups now and then
    if ((g.boxIn -= h) <= 0) { g.boxIn = 3.5 + Math.random() * 2.5; if (MG.all(m, 'pbammo').length < 6) { const p = this.freeSpot(m); if (p) MG.add(m, { t: 'pbammo', ...p }); } }
    if ((g.powIn -= h) <= 0) { g.powIn = 9 + Math.random() * 6; if (MG.all(m, 'pbpow').length < 2) { const p = this.freeSpot(m); if (p) MG.add(m, { t: 'pbpow', kind: Math.random() < 0.55 ? 'shield' : 'rapid', ...p }); } }
    for (const o of [...MG.all(m, 'pbammo'), ...MG.all(m, 'pbpow')]) for (const c of m.chairs) {
      if (c.out || c.gs.dead > 0 || Math.hypot(c.x - o.x, c.y - o.y) > R + 0.45) continue;
      if (o.t === 'pbammo') { if (c.gs.ammo >= PB.maxAmmo) continue; c.gs.ammo = Math.min(PB.maxAmmo, c.gs.ammo + PB.pickup); }
      else if (o.kind === 'shield') { if (c.gs.shield) continue; c.gs.shield = 1; } else c.gs.rapid = 8;
      MG.remove(m, o); if (c.player) { m.sfx('select'); MG.notice(m, `${MG.up(m.name(c))}: ${o.t === 'pbammo' ? '+' + PB.pickup + ' PAINTBALLS' : PB_ITEMS[o.kind].label}`, 1.1); } break;
    }
  },
  splat(m, x, y, col) { MG.add(m, { t: 'splat', x: MG.r2(x), y: MG.r2(y), col, until: MG.r2(m.gs.t + 9), a: Math.round(Math.random() * 6) }); const sp = MG.all(m, 'splat'); if (sp.length > 36) MG.remove(m, sp[0]); },
  hit(m, c, by, o) {
    this.splat(m, c.x + (Math.random() - 0.5) * 0.4, c.y + (Math.random() - 0.5) * 0.4, o.col);
    if (c.gs.prot > 0) return;
    if (c.gs.shield) { c.gs.shield = 0; c.gs.hitT = 0.4; m.sfx('bump'); MG.notice(m, `${MG.up(m.name(c))}'S SHIELD TAKES THE HIT`, 1.2); return; }
    c.gs.dead = PB.respawn; c.gs.outs++; c.gs.ghost = 1; c.binLeft = PB.respawn; c.gs.rapid = 0; m.sfx('foul');
    if (by) { by.gs.hits++; if (m.mini.mode === 'teams') m.gs.score[by.side]++; }
    MG.notice(m, `${MG.up(m.name(by))} TAGS ${MG.up(m.name(c))}`, 1.4); if (Math.random() < 0.35) m.line(`${m.name(c)} is splatted by ${m.name(by)}!`);
    const top = m.mini.mode === 'teams' ? Math.max(...m.gs.score) : Math.max(...m.chairs.map(k => k.gs.hits)); if (top >= m.mini.target) this.end(m, false);
  },
  use(c, m) {                                                            // A / X: fire
    const G = c.gs; if (G.dead > 0 || G.cd > 0) return;
    if (G.ammo <= 0) { G.cd = 0.4; if (c.player) { m.sfx('back'); MG.notice(m, 'OUT OF PAINT: FIND AMMO 🎯', 1); } return; }
    G.ammo--; G.cd = G.rapid > 0 ? PB.rapidCool : PB.cool; G.prot = 0;
    const err = c.player ? 0 : (Math.random() - 0.5) * (0.06 + ((m.difficulty || {}).reaction || 0.2) * 0.35), f = c.toWorld(0.75, 0), hx = Math.cos(c.heading + err), hy = Math.sin(c.heading + err), col = m.mini.mode === 'teams' ? TEAMS[m.teams[c.side]].color : MINI.palette[c.k % MINI.palette.length];
    MG.add(m, { t: 'pb', k: c.k, x: MG.r2(f.x), y: MG.r2(f.y), vx: MG.r2(hx * PB.speed + c.vx * 0.3), vy: MG.r2(hy * PB.speed + c.vy * 0.3), until: MG.r2(m.gs.t + PB.life), col }); m.sfx('gun_paint');
  },
  end(m, timeUp) {
    if (m.state !== 'play') return; const teams = m.mini.mode === 'teams', sc = m.gs.score;
    const rows = MG.rankRows(m, m.chairs, c => c.gs.hits * 100 - c.gs.outs, c => `${c.gs.hits} tag${c.gs.hits === 1 ? '' : 's'}, splatted ${c.gs.outs} time${c.gs.outs === 1 ? '' : 's'}`);
    if (teams) m.finishGame(MG.teamTitle(m, sc), rows, sc[0] === sc[1] ? -1 : sc[0] > sc[1] ? 0 : 1, `${sc[0]} - ${sc[1]}${timeUp ? ' (time up)' : ''}`);
    else m.finishGame(MG.ffaTitle(m, rows.map(r => r.c), c => c.gs.hits), rows, -1, timeUp ? 'Time up: the most tags wins' : `First to ${m.mini.target} tags`);
  },
  timeUp(m) { this.end(m, true); },
  cmd(c, cmd) { return c.gs.dead > 0 ? { x: 0, y: 0, spin: 0, speed: 0 } : cmd; },
  /* The CPU: a route through the maze (A* on a 0.8 m grid of the fixed walls), shoot what it can see. */
  nav(m) {
    if (m.pbNav) return m.pbNav; const cs = 0.8, W = Math.ceil(m.width / cs), H = Math.ceil(m.height / cs), g = new Uint8Array(W * H), pad = R_CART() + 0.2, walls = this.walls(m);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const x = (i + 0.5) * cs, y = (j + 0.5) * cs; if (x < pad || y < pad || x > m.width - pad || y > m.height - pad || walls.some(b => x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad)) g[j * W + i] = 1; }
    return (m.pbNav = { cs, W, H, g });
  },
  route(m, c, tx, ty) {
    const N = this.nav(m), { cs, W, H, g } = N, cell = (x, y) => [Math.max(0, Math.min(W - 1, Math.floor(x / cs))), Math.max(0, Math.min(H - 1, Math.floor(y / cs)))];
    const free = ([i, j]) => { if (!g[j * W + i]) return [i, j]; for (let r = 1; r < 4; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < W && b < H && !g[b * W + a]) return [a, b]; } return [i, j]; };
    const [si, sj] = free(cell(c.x, c.y)), [ti, tj] = free(cell(tx, ty)), start = sj * W + si, goal = tj * W + ti;
    const gs = new Float32Array(W * H).fill(Infinity), from = new Int32Array(W * H).fill(-1), heap = [[0, start]]; gs[start] = 0;
    const push = e => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === i) break; [heap[s], heap[i]] = [heap[i], heap[s]]; i = s; } } return top; };
    let found = false, n = 0;
    while (heap.length && n++ < 6000) { const [, cur] = pop(); if (cur === goal) { found = true; break; } const ci = cur % W, cj = (cur / W) | 0;
      for (const [di, dj, w] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41], [1, -1, 1.41], [-1, 1, 1.41], [-1, -1, 1.41]]) { const a = ci + di, b = cj + dj; if (a < 0 || b < 0 || a >= W || b >= H) continue; const k = b * W + a; if (g[k] || (di && dj && (g[cj * W + a] || g[b * W + ci]))) continue; const ng = gs[cur] + w; if (ng < gs[k]) { gs[k] = ng; from[k] = cur; push([ng + Math.hypot(a - ti, b - tj), k]); } } }
    if (!found) return null; const path = []; for (let k = goal; k !== -1 && k !== start; k = from[k]) path.push({ x: (k % W + 0.5) * cs, y: (((k / W) | 0) + 0.5) * cs }); return path.reverse();
  },
  ai(c, m) {
    const G = c.gs; if (G.dead > 0) return { x: 0, y: 0, speed: 0 };
    const walls = this.allWalls(m), foes = this.foes(m, c), sees = o => MH.dist(c, o) < 17 && MG.clearPath(c.x, c.y, o.x, o.y, walls, 0.05);
    const t = foes.filter(sees).sort((a, b) => MH.dist(c, a) - MH.dist(c, b))[0];
    if (t && G.ammo > 0) {                                               // aim (lead the target a little) and fire when lined up
      const d = MH.dist(c, t), lead = d / PB.speed, ax = t.x + (t.vx || 0) * lead - c.x, ay = t.y + (t.vy || 0) * lead - c.y, a = Math.atan2(ay, ax), off = Math.abs(normalizeAngle(a - c.heading));
      if (off < 0.06 + 0.35 / Math.max(1, d) && G.cd <= 0 && Math.random() < 0.8) c.wantUse = true;
      return { x: Math.cos(a), y: Math.sin(a), speed: off > 0.5 ? 0.15 : d > 10 ? 0.55 : d < 4 ? 0.05 : 0.25 };
    }
    let goal = null;
    if (G.ammo < 5) goal = MH.nearest(c, MG.all(m, 'pbammo'));
    if (!goal) { const pw = MH.nearest(c, MG.all(m, 'pbpow')); if (pw && MH.dist(c, pw) < 10) goal = pw; }
    if (!goal) goal = foes.sort((a, b) => MH.dist(c, a) - MH.dist(c, b))[0] || { x: m.width / 2, y: m.centerY };
    const N = c.pbNav || (c.pbNav = {});                                 // (kept on the cart, not in c.gs: it is not sent online)
    if (!N.path || !N.at || m.simTime - N.at > 0.9 || N.goal !== (goal.id || goal.k)) { N.path = this.route(m, c, goal.x, goal.y); N.at = m.simTime; N.goal = goal.id || goal.k; }
    const P = N.path; if (!P || !P.length) return MH.to(c, goal.x, goal.y, 0.8);
    while (P.length > 1 && Math.hypot(P[0].x - c.x, P[0].y - c.y) < 0.9) P.shift();
    let wp = P[0]; for (let i = Math.min(P.length - 1, 9); i > 0; i--) if (MG.clearPath(c.x, c.y, P[i].x, P[i].y, walls, 0.5)) { wp = P[i]; break; }   // cut corners where the way is clear
    return MH.to(c, wp.x, wp.y, 0.9);
  },
  hud(m) {
    const teams = m.mini.mode === 'teams', sc = m.gs.score;
    if (teams) return { a: MG.up(TEAMS[m.teams[0]].name), b: MG.up(TEAMS[m.teams[1]].name), sa: String(sc[0]), sb: String(sc[1]), mid: `PAINTBALL   •   first to ${m.mini.target}`, left: MG.peopleLine(m, c => `🎯${c.gs.ammo}`) };
    const lead = m.chairs.reduce((a, c) => c.gs.hits > a.gs.hits ? c : a, m.chairs[0]); return { a: 'PAINTBALL', b: `LEADER ${MG.up(m.name(lead))} ${lead.gs.hits}`, mid: `First to ${m.mini.target} tags`, left: MG.peopleLine(m, c => `${c.gs.hits}  🎯${c.gs.ammo}`) };
  },
  tag(c, m) { return c.gs.dead > 0 ? '' : c.player ? MG.pname(c) + (c.gs.shield ? ' 🛡' : '') : c.gs.shield ? '🛡' : ''; },
  itemLine(c, m) { const G = c.gs; return G.dead > 0 ? `SPLATTED: back in ${Math.ceil(G.dead)}s` : `🎯 ${G.ammo}${G.ammo === 0 ? ' (find ammo!)' : ''}${G.shield ? '   🛡 SHIELD' : ''}${G.rapid > 0 ? `   ⚡ RAPID ${Math.ceil(G.rapid)}s` : ''}   A: fire`; },
  startLine: () => 'Paintball! Lock and load.'
};

/* =============================== descriptions (How to play) =============================== */
Object.assign(GAME_INFO, {
  bomb: { name: 'Hot Potato Bomb', cat: 'party', blurb: 'Pass the ticking bomb by bumping someone. Do not be holding it when it blows.', noItems: true,
    goal: 'Be the last cart that has not blown up.',
    rules: ['One cart holds the bomb (it sits on top of the cart and ticks faster as the fuse burns).', 'Bump another cart to pass the bomb to them. You cannot pass it straight back.', 'The holder is a little faster than everyone else.', 'When the fuse runs out, the holder is out and the blast throws everyone near it.', 'A new bomb goes to a random cart. Last one left wins.'],
    controls: [CTRL.drive, CTRL.drift, CTRL.spin, CTRL.pause], opts: [{ key: 'fuse', label: 'Fuse', values: [10, 15, 20], def: 15, fmt: v => `about ${v}s` }] },
  hill: { name: 'King of the Hill', cat: 'party', blurb: 'Two moving hills on a big rink, and weapons. Be alone on a hill to score.', minutes: 3, court: { width: 44, height: 24 }, itemsOn: true,
    goal: 'Be first to the target score, or have the most points when the clock runs out.',
    rules: ['There are two glowing hills.', 'Alone on a hill, you are king and score a point every second. Anyone else on it: nobody scores. Push them off!', 'Crowd a hill (two carts for a few seconds, or three or more) and it OVERLOADS: it throws everyone off and stuns them.', 'The hills move somewhere new every 15 seconds or so.', 'Weapons in the ? boxes: SHOCKWAVE (throws everyone near you away), ZAP (a shot that spins a cart out), BOOST and OIL.'],
    controls: [CTRL.drive, CTRL.drift, CTRL.spin, CTRL.item, CTRL.pause], opts: [minOpt([2, 3, 4], 3), { key: 'target', label: 'Points to win', values: [20, 30, 45], def: 30 }] },
  sumo: { name: 'Sumo Ring', cat: 'party', blurb: 'Bumps hit extra hard. Shove everyone off the ring.', noItems: true,
    goal: 'Win the most rounds by being the last cart on the ring.',
    rules: ['Everyone starts on a round platform.', 'Bumps hit much harder than usual.', 'Drive off the edge (or get pushed) and you are out for the round.', 'A spin swats whoever it hits right across the ring.', 'After 20 seconds the ring starts to shrink.', 'Last cart on the ring wins the round.'],
    controls: [CTRL.drive, CTRL.drift, 'Spin (a hard shove): triggers  /  E Q  /  . ,  /  SPIN buttons', CTRL.pause], opts: [{ key: 'rounds', label: 'Rounds', values: [1, 3, 5], def: 3 }] },
  lava: { name: 'Floor Is Lava', cat: 'party', blurb: 'Tiles glow orange, then turn to lava. Keep moving.', minutes: 2,
    goal: 'Be the last cart that has not touched the lava (or survive the clock).',
    rules: ['The floor is a grid of tiles.', 'A tile glows orange for a moment before it turns to lava.', 'Drive onto lava and you are out.', 'Lava cools back down after a while, but more and more tiles melt as the game goes on.', 'After a few seconds the LAVA SNAKE wakes up: it chases the nearest cart, gets faster and longer, and melts the floor behind it. Touch it and you are out.', 'Last one left wins; everyone still standing at the end wins together.'],
    controls: [CTRL.drive, CTRL.drift, CTRL.spin, CTRL.item, CTRL.pause], opts: [minOpt([1, 2, 3], 2)] },
  multiball: { name: 'Multiball Madness', cat: 'ball', blurb: 'Team hockey with lots of balls at once.', minutes: 3, teams: true, noItems: true,
    goal: 'Score more goals than the other team.',
    rules: ['Two teams, two goals, and several balls in play at once.', 'Push a ball over the other team\'s goal line to score.', 'Spin to slap a ball hard.', 'A scored ball comes back in the middle.', 'No crease, no fouls: anything goes.'],
    controls: [CTRL.drive, CTRL.drift, CTRL.spin, CTRL.pause], opts: [minOpt([2, 3, 5], 3), { key: 'balls', label: 'Balls', values: [3, 5, 8], def: 5 }] },
  giant: { name: 'Giant Ball', cat: 'ball', blurb: 'One huge, heavy ball. Everyone pushes.', minutes: 3, teams: true, noItems: true,
    goal: 'Push the giant ball into the other team\'s wide goal.',
    rules: ['There is one giant beach ball. It bounces!', 'Hit it while it is low and it pops up into the air; a spin sends it higher. When it is high you drive right under it.', 'It floats a long way once it gets going.', 'Push it into the other team\'s goal to score.', 'First to the target, or the most goals when time runs out.'],
    controls: [CTRL.drive, CTRL.drift, CTRL.spin, CTRL.pause], opts: [minOpt([2, 3, 5], 3), { key: 'target', label: 'Goals to win', values: [2, 3, 5], def: 3 }] },
  bowling: { name: 'Cart Bowling', cat: 'ball', blurb: 'Take turns pushing a heavy ball down the rink at ten pins.', noItems: true,
    goal: 'Score the most pins over all the frames.',
    rules: ['Players take turns. Everyone else watches from the side.', 'Push the ball down the lane at the pins. The bumper rails bounce it back in, so there are no gutters.', 'Do not cross the foul line (the cart stops there).', 'You have 12 seconds to bowl each ball.', 'Each turn has two balls. All ten with the first: STRIKE (+10). All ten with two: SPARE (+5).', 'One point for every pin knocked down.'],
    controls: [CTRL.drive, CTRL.drift, 'Spin (a sharper push): triggers  /  E Q  /  . ,', CTRL.pause], opts: [{ key: 'frames', label: 'Frames', values: [2, 3, 5], def: 3 }] },
  golf: { name: 'Mini Golf', cat: 'ball', blurb: 'Everyone plays the same hole at once, each with their own ball.', noItems: true,
    goal: 'Finish every hole in the fewest strokes.',
    rules: ['Your golf ball is the one in your colour. Only your cart can hit it; carts drive through each other.', 'Drive into it to putt: aim with the way you face, and the faster you drive, the harder you hit. A spin is a big drive.', 'Every hit is a stroke. A ball going too fast skips over the cup.', 'Get it in the cup to finish the hole. Walls and blocks bounce it.', 'Not in when the hole\'s time runs out: +3 strokes.', 'Fewest strokes after all the holes wins.'],
    controls: [CTRL.drive, CTRL.drift, 'Spin (a big hit): triggers  /  E Q  /  . ,', CTRL.pause], opts: [{ key: 'holes', label: 'Holes', values: [2, 3, 4], def: 3 }, { key: 'holeTime', label: 'Time per hole', values: [45, 60, 90], def: 60, fmt: v => v + 's' }] },
  imposter: { name: 'Imposter Carts', cat: 'sneaky', blurb: 'Every cart looks the same. Find the real players among the CPUs.', minutes: 3, noItems: true,
    goal: 'Collect the orbs while blending in, or unmask every other agent.',
    rules: ['All carts look alike. Most are harmless CPUs pottering about; a few are agents (every player is one).', 'Agents collect glowing orbs: sit on one for a second and a half (the ring fills up). Taking one makes you flash for a moment.', 'A: zap the cart in front of you. An agent is unmasked and out. A harmless cart: you are stunned and revealed.', 'First to collect enough orbs wins, or be the last agent left.'],
    controls: [CTRL.drive, CTRL.drift, 'Zap (in front of you): X  /  X  /  \\  /  touch X', CTRL.pause], opts: [minOpt([2, 3, 4], 3), { key: 'orbs', label: 'Orbs to win', values: [5, 7, 9], def: 7 }, { key: 'agents', label: 'Agents', values: [2, 3, 4], def: 3 }] },
  ctf: { name: 'Capture the Flag', cat: 'sneaky', blurb: 'Steal their flag and drive it home.', minutes: 4, teams: true,
    goal: 'Capture the other team\'s flag more times than they capture yours.',
    rules: ['Each team has a flag at its end.', 'Drive over the other team\'s flag to pick it up (you are a little slower carrying it).', 'Bring it to your own base: a capture.', 'Touch an enemy carrier to knock the flag loose. Touch your own dropped flag to send it home.', 'A dropped flag goes home by itself after 8 seconds.'],
    controls: [CTRL.drive, CTRL.drift, CTRL.spin, CTRL.item, CTRL.pause], opts: [minOpt([3, 4, 6], 4), { key: 'caps', label: 'Captures to win', values: [2, 3, 5], def: 3 }] },
  night: { name: 'Infection Night', cat: 'sneaky', blurb: 'Manhunt in the dark. Headlights only.', minutes: 3,
    goal: 'Runners: still be free when the clock runs out. IT: catch everyone.',
    rules: ['The lights are out: you only see what your headlights and the carts\' glow show.', 'IT glows red. IT catches a runner just by touching them.', 'A caught runner becomes IT (after 2 seconds).', 'Anyone still free at the end wins.'],
    controls: [CTRL.drive, CTRL.drift, CTRL.spin, CTRL.item, CTRL.pause], opts: [minOpt([2, 3, 4], 3)] },
  stunt: { name: 'Stunt Arena', cat: 'racing', blurb: 'Ramps, jumps and spins in mid-air for points.', minutes: 2,
    goal: 'Score the most trick points.',
    rules: ['Hit a ramp fast to fly.', 'In the air you cannot steer, but you can spin: every half turn is worth 100.', 'Land facing the way you are flying: CLEAN LANDING x1.5. Land sideways or backwards: SKETCHY.', 'Land another jump within 3.5 seconds for a combo.', 'Stars on the floor are worth 25.'],
    controls: [CTRL.drive, CTRL.drift, 'Spin (tricks in the air): triggers  /  E Q  /  . ,  /  SPIN buttons', CTRL.pause], opts: [minOpt([2, 3], 2)] },
  slalom: { name: 'Slalom Time Trial', cat: 'racing', blurb: 'Through the gates against the clock, and your own ghost.', minutes: 3, noItems: true,
    goal: 'Go through every gate, in order, in the fastest time.',
    rules: ['Drive through the gates (between the two cones) in order; the next one glows.', 'Miss a gate and you must go back for it.', 'Carts pass through each other: it is all about your line.', 'Your best time on each course is saved, and next time its ghost races you.', 'When the first cart finishes, everyone else has 25 seconds.'],
    controls: [CTRL.drive, CTRL.drift, CTRL.spin, CTRL.pause], opts: [{ key: 'course', label: 'Course', values: ['zigzag', 'eight', 'hairpin'], names: ['Zig-zag', 'Figure of eight', 'Hairpins'], def: 'zigzag' }] },
  paintball: { name: 'Paintball', cat: 'sneaky', blurb: 'Every cart has a paintball gun. Big maps, a bunker, mazes and moving gates.', minutes: 4, teams: true, noItems: true,
    court: mini => (PB_MAPS[mini && mini.map] || PB_MAPS.bunker).size, label: cfg => `${(PB_MAPS[cfg.map] || PB_MAPS.bunker).name}, ${cfg.mode === 'teams' ? 'teams' : 'free for all'}`,
    goal: 'Tag the other team (or everyone) with paint more times than they tag you.',
    rules: ['Every cart has a paintball gun: A fires straight ahead.', 'One hit and you are splatted: back at your spawn in a few seconds (with a moment of protection).', 'Paint is limited (24 at most). Ammo crates 🎯 appear around the map: drive over one for 8 more.', 'Power-ups: SHIELD 🛡 blocks the next shot, RAPID FIRE ⚡ for 8 seconds.', 'Walls, crates and moving gates stop paint. Use the bunker and the maze for cover.', 'First to the target, or the most when time runs out.'],
    controls: [CTRL.drive, CTRL.drift, 'Fire: X  /  X  /  \\  /  touch X', CTRL.spin, CTRL.pause],
    opts: [{ key: 'map', label: 'Map', values: ['bunker', 'maze', 'warehouse'], names: ['Bunker Hill', 'The Maze', 'The Warehouse'], def: 'bunker', hint: () => (PB_MAPS[modeOpts('paintball').map] || PB_MAPS.bunker).blurb },
      { key: 'mode', label: 'Mode', values: ['teams', 'ffa'], names: ['Teams', 'Free for all'], def: 'teams' }, minOpt([3, 4, 6], 4), { key: 'target', label: 'Tags to win', values: [10, 20, 30], def: 20 }] },
  delivery: { name: 'Delivery Rush', cat: 'racing', blurb: 'Grab parcels at the depot and deliver them to the right house.', minutes: 3,
    goal: 'Earn the most points delivering parcels.',
    rules: ['Parcels wait at the depot in the middle. Drive over one to pick it up.', 'Its colour is the house it goes to: drive up to that house.', 'Fast deliveries earn a bonus.', 'Ram a courier hard to knock their parcel loose and steal it.'],
    controls: [CTRL.drive, CTRL.drift, CTRL.spin, CTRL.item, CTRL.pause], opts: [minOpt([2, 3, 4], 3)] }
});
