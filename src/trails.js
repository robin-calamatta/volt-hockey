/* v14.1.9: Mini golf is gone. In its place: LIGHT TRAILS.
   Every cart lays a glowing wall of light behind it. Touch any trail (anyone's, even your own older one) and you're out for the round.
   You can't stop: let go of the stick and the cart keeps rolling forward. Trails have a short gap now and then (squeeze through!) and fade
   after a few seconds. Last cart driving wins the round; most rounds wins. Spin to snap round a corner. State lives in m.gs (online: it
   travels in the snapshot), so the host decides who crashed. */
delete GAME_INFO.golf; delete MODES.golf;
if (typeof Settings !== 'undefined' && Settings.lobbyMini === 'golf') Settings.lobbyMini = 'trails';
{ const ball = GAME_CATS.find(c => c.id === 'ball'); if (ball) ball.blurb = 'Hockey with a twist, giant balls and bowling'; }
{ const M = (typeof LOBBY_MODES !== 'undefined' ? LOBBY_MODES : []).find(x => x.id === 'mini'); if (M && M.sub) M.sub = M.sub.replace('golf', 'light trails'); }
if (typeof MINI_ICON !== 'undefined') MINI_ICON.trails = '〰️';

const TRAIL = { every: 0.2, safe: 0.45, hitR: 0.36, gapEvery: 3.4, gapLen: 0.32, h: 0.75, sudden: 40 };
GAME_INFO.trails = { name: 'Light Trails', cat: 'party', blurb: 'Every cart leaves a wall of light. Touch one and you crash. Last one driving wins.', noItems: true, court: { width: 40, height: 24 },
  goal: 'Win the most rounds by being the last cart still driving.',
  rules: ['Every cart lays a glowing wall of light behind it, in its own colour.', 'Touch ANY trail (someone else\'s, or your own older one) and you crash out of the round.', 'You can\'t stop: let go of the stick and you keep rolling straight on.', 'Every few seconds a trail has a short gap: thread through it!', 'Trails fade away after a while (you pick how long), and vanish when their cart crashes.', 'Spin to snap round a tight corner. Trap people by cutting across in front of them.', 'Bumping the rink walls or other carts is fine. Last cart driving wins the round.', 'After 40 seconds it\'s SUDDEN DEATH: the trails stop fading. If two or more are still going 45 seconds after that, nobody wins the round.'],
  controls: [CTRL.drive, CTRL.drift, 'Spin (snap round a corner): LB / RB  /  R Z  /  ] [  /  touch SPIN', CTRL.pause],
  opts: [{ key: 'rounds', label: 'Rounds', values: [3, 5, 7], def: 5 }, { key: 'life', label: 'Trail length', values: [4, 7, 12, 60], names: ['Short', 'Medium', 'Long', 'Endless'], def: 7, fmt: v => ({ 4: 'Short', 7: 'Medium', 12: 'Long', 60: 'Endless' })[v] || v + ' s' }] };
MINI.hints.trails = GAME_INFO.trails.blurb;

const trailSegs = (m, skipC) => {                       // every live trail segment: [x0, y0, x1, y1, owner k, newest time]
  const g = m.gs, out = [];
  for (const c of m.chairs) { const P = g.tr && g.tr[c.k]; if (!P) continue;
    for (let i = 4; i < P.length; i += 4) if (P[i + 3]) out.push([P[i - 4], P[i - 3], P[i], P[i + 1], c.k, P[i + 2]]);
    if (!c.out && c !== skipC && P.length && P[P.length - 1]) out.push([P[P.length - 4], P[P.length - 3], c.x, c.y, c.k, g.t]);   // (still being laid: up to the cart)
  }
  return out;
};
const segDist = (px, py, s) => { const dx = s[2] - s[0], dy = s[3] - s[1], l2 = dx * dx + dy * dy || 1e-6, u = Math.max(0, Math.min(1, ((px - s[0]) * dx + (py - s[1]) * dy) / l2)); return Math.hypot(px - s[0] - dx * u, py - s[1] - dy * u); };

MODES.trails = {
  init(m) { const g = m.gs; g.round = 1; g.pause = 0; g.t = 0; g.tr = {}; for (const c of m.chairs) c.gs.wins = 0; },
  kickoff(m) {
    const g = m.gs, n = m.chairs.length, R = Math.min(m.width, m.height) * 0.36; g.tr = {}; g.t = 0; g.rs = 0; g.sdOn = 0;
    m.chairs.forEach((c, i) => { const a = i / n * Math.PI * 2, x = m.width / 2 + Math.cos(a) * R * (m.width / m.height > 1.3 ? 1.5 : 1), y = m.centerY + Math.sin(a) * R, h = a;   // (facing out from the middle, away from each other)
      Object.assign(c, { x, y, px: x, py: y, heading: h, ph: h, vx: 0, vy: 0 }); c.gs.lay = 0; c.gs.gap = TRAIL.gapEvery * (0.5 + (i % 3) * 0.25); g.tr[c.k] = []; });
  },
  step(m, h) {
    const g = m.gs; for (const o of MG.all(m, 'boom')) { o.life -= h; if (o.life <= 0) MG.remove(m, o); }
    if (g.pause > 0) { g.pause -= h; if (g.pause <= 0) { g.round++; for (const c of m.chairs) MG.unout(c); m.order = []; m.kickoff(); } return; }
    g.t = MG.r2(g.t + h); g.rs = (g.rs || 0) + h; const sd = g.rs > TRAIL.sudden, life = sd ? 999 : m.mini.life || 7;   // sudden death: after a while the trails stop fading
    if (sd && !g.sdOn) { g.sdOn = 1; MG.notice(m, 'SUDDEN DEATH: THE TRAILS STAY!', 2.2); m.sfx('whistle'); }
    for (const c of m.chairs) { const P = g.tr[c.k] || (g.tr[c.k] = []); if (c.out) continue; const G = c.gs;
      G.gap -= h; const on = G.gap > 0 ? 1 : 0; if (G.gap < -TRAIL.gapLen) G.gap = TRAIL.gapEvery * (0.8 + Math.random() * 0.4);
      G.lay -= h; if (g.rs > 0.35 && G.lay <= 0) { G.lay = TRAIL.every; P.push(Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10, Math.round(g.t * 10) / 10, P.length ? on : 0);   /* (one decimal: keeps the online snapshot small) */ }
      while (P.length > 8 && g.t - P[2] > life) P.splice(0, 4);           // old light fades away
      if (P.length >= 4 && g.t - P[2] > life) P[3] = 0;
    }
    if (g.rs < 0.6) return;
    const segs = trailSegs(m);
    for (const c of MG.live(m)) {
      const hit = segs.find(s => !(s[4] === c.k && g.t - s[5] < TRAIL.safe) && segDist(c.x, c.y, s) < TRAIL.hitR);
      if (!hit) continue;
      MH.out(m, c); g.tr[c.k] = []; MG.add(m, { t: 'boom', x: MG.r2(c.x), y: MG.r2(c.y), life: 0.6 }); m.sfx('foul');
      const by = hit[4] === c.k ? null : m.chairs[hit[4]]; MG.notice(m, by ? `${MG.up(m.name(c))} HIT ${MG.up(m.name(by))}'S TRAIL` : `${MG.up(m.name(c))} CRASHED INTO THEIR OWN TRAIL`, 1.5);
      if (by && !by.out) by.gs.kos = (by.gs.kos || 0) + 1;
    }
    const live = MG.live(m), timeUp = g.rs > TRAIL.sudden + 45; if (live.length > 1 && !timeUp) return;
    if (m.chairs.length === 1 && live.length === 1) return;                // (alone: just drive about)
    const w = live.length === 1 ? live[0] : null; if (w) { w.gs.wins++; m.line(`${m.name(w)} wins round ${g.round}!`); } MG.notice(m, w ? `${MG.up(m.name(w))} WINS ROUND ${g.round}` : live.length > 1 ? 'TIME! NOBODY WINS THE ROUND' : 'NOBODY WINS THE ROUND', 2.2);
    if (g.round >= m.mini.rounds) { const r = MG.rankRows(m, m.chairs, c => c.gs.wins * 100 + (c.gs.kos || 0), c => `${c.gs.wins} round${c.gs.wins === 1 ? '' : 's'} won${c.gs.kos ? `, ${c.gs.kos} trapped` : ''}`); m.finishGame(MG.ffaTitle(m, r.map(x => x.c), c => c.gs.wins * 100 + (c.gs.kos || 0)), r, -1, `${m.mini.rounds} rounds`); }
    else g.pause = 2.2;
  },
  cmd(c, cmd, m) {
    if (m.gs.pause > 0) return { x: 0, y: 0, spin: 0, speed: 0 };
    const mag = Math.hypot(cmd.x || 0, cmd.y || 0); if (mag < 0.45) return { ...cmd, x: Math.cos(c.heading) * 0.8, y: Math.sin(c.heading) * 0.8, speed: Math.max(0.8, cmd.speed || 1) };   // no stopping
    return cmd;
  },
  ai(c, m) {
    const g = m.gs, segs = m._tsAt === m.simTime ? m._ts : (m._tsAt = m.simTime, m._ts = trailSegs(m)), free = a => { const ca = Math.cos(a), sa = Math.sin(a); let d = 0;
      for (; d < 8; d += 0.45) { const x = c.x + ca * (d + 0.5), y = c.y + sa * (d + 0.5); if (x < 0.7 || y < 0.7 || x > m.width - 0.7 || y > m.height - 0.7) break; if (segs.some(s => !(s[4] === c.k && g.t - s[5] < TRAIL.safe + 0.3) && segDist(x, y, s) < 0.62)) break; }
      return d; };
    const foe = MH.nearest(c, MG.live(m)); let best = c.heading, bs = -1;
    for (let i = -6; i <= 6; i++) { const a = c.heading + i * 0.38, f = free(a); let sc = f * 1.0 - Math.abs(i) * 0.08 + Math.random() * 0.25;
      if (foe && f > 4) { const tx = foe.x + Math.cos(foe.heading) * 3.5, ty = foe.y + Math.sin(foe.heading) * 3.5, ang = Math.atan2(ty - c.y, tx - c.x); sc += Math.cos(ang - a) * 0.9 * ((m.difficulty || {}).speed || 0.9); }   // cut them off
      if (sc > bs) { bs = sc; best = a; } }
    const tight = free(c.heading) < 1.2 && bs < 2;
    return { x: Math.cos(best), y: Math.sin(best), speed: 1, spin: tight && Math.random() < 0.3 ? (Math.random() < 0.5 ? 1 : -1) : 0 };
  },
  hud(m) { const live = MG.live(m); return { clock: `ROUND ${Math.min(m.gs.round, m.mini.rounds)} / ${m.mini.rounds}`, a: 'LIGHT TRAILS', b: `${live.length} LEFT`, mid: m.gs.sdOn ? 'SUDDEN DEATH: the trails stay!' : 'Don\'t touch the light!', left: MG.peopleLine(m, c => `${c.gs.wins}${c.out ? ' (out)' : ''}`) }; },
  tag(c, m) { return c.gs.wins ? '★'.repeat(c.gs.wins) : ''; },
  startLine: m => `Round ${m.gs.round}: don't touch the light!`
};
const trailCol = c => MINI.palette[c.k % MINI.palette.length];

/* ---- drawing: glowing ribbons in 3D, lines in 2D ---- */
{ const P = View3D.prototype, um = P.updateMode;
  P.updateMode = function (dt) {
    const r = um.call(this, dt), m = this.m;
    if (!m || m.kind !== 'trails') { if (this.trailG) { this.scene.remove(this.trailG); this.trailG = null; } return r; }
    if (!this.trailG) { this.trailG = new THREE.Group(); this.scene.add(this.trailG); this.trailM = new Map(); }
    const g = m.gs || {}, life = (m.mini && m.mini.life) || 7, tNow = g.t || 0, pulse = 0.85 + 0.15 * Math.sin(performance.now() / 90);
    for (const c of m.chairs) {
      let T = this.trailM.get(c.k);
      if (!T) { const CAP = 700, geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CAP * 18), 3)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(CAP * 18), 3));
        const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.82, side: THREE.DoubleSide, depthWrite: false, fog: false });
        const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; this.trailG.add(mesh);
        const lgeo = new THREE.BufferGeometry(); lgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CAP * 6), 3)); const line = new THREE.LineSegments(lgeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false })); line.frustumCulled = false; this.trailG.add(line);
        T = { mesh, line, CAP, col: new THREE.Color(trailCol(c)) }; this.trailM.set(c.k, T); }
      const Pt = (g.tr && g.tr[c.k]) || [], pos = [], col = [], lp = [];
      const pts = []; for (let i = 0; i < Pt.length; i += 4) pts.push([Pt[i], Pt[i + 1], Pt[i + 2], Pt[i + 3]]); if (!c.out && pts.length && pts[pts.length - 1][3]) pts.push([c.x, c.y, tNow, 1]);
      for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (!b[3]) continue;
        const ka = Math.max(0.45, 1 - (tNow - a[2]) / life) * pulse, kb = Math.max(0.45, 1 - (tNow - b[2]) / life) * pulse, H = TRAIL.h;
        const quad = [[a[0], 0, a[1], ka * 0.7], [b[0], 0, b[1], kb * 0.7], [b[0], H, b[1], kb], [a[0], 0, a[1], ka * 0.7], [b[0], H, b[1], kb], [a[0], H, a[1], ka]];
        for (const [x, y, z, k] of quad) { pos.push(x, y, z); col.push(T.col.r * k, T.col.g * k, T.col.b * k); }
        lp.push(a[0], H, a[1], b[0], H, b[1]); }
      const n = Math.min(pos.length, T.CAP * 18), G0 = T.mesh.geometry, ln = Math.min(lp.length, T.CAP * 6);   /* (fixed buffers, refilled each frame: no new GPU buffers every frame) */
      G0.attributes.position.array.set(pos.length > n ? pos.slice(pos.length - n) : pos); G0.attributes.color.array.set(col.length > n ? col.slice(col.length - n) : col); G0.attributes.position.needsUpdate = G0.attributes.color.needsUpdate = true; G0.setDrawRange(0, n / 3);
      const L0 = T.line.geometry; L0.attributes.position.array.set(lp.length > ln ? lp.slice(lp.length - ln) : lp); L0.attributes.position.needsUpdate = true; L0.setDrawRange(0, ln / 3); T.line.material.color.copy(T.col).lerp(new THREE.Color(0xffffff), 0.6);
    }
    return r;
  };
}
{ const P = GameScene.prototype, d2 = P.drawMode2D;
  P.drawMode2D = function (g, floor) {
    const r = d2.call(this, g, floor), m = this.match; if (!floor || !m || m.kind !== 'trails') return r; const s = m.gs || {}, life = (m.mini && m.mini.life) || 7;
    for (const c of m.chairs) { const P2 = (s.tr && s.tr[c.k]) || [], col = trailCol(c);
      for (let i = 4; i < P2.length; i += 4) if (P2[i + 3]) g.lineStyle(0.22, col, Math.max(0.25, 1 - ((s.t || 0) - P2[i + 2]) / life)).lineBetween(P2[i - 4], P2[i - 3], P2[i], P2[i + 1]);
      if (!c.out && P2.length && P2[P2.length - 1]) g.lineStyle(0.22, col, 1).lineBetween(P2[P2.length - 4], P2[P2.length - 3], c.x, c.y); }
    return r;
  };
}
