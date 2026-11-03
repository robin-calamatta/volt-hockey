/* The crowd: bleachers along both long sides of the rink, drawn from above in court metres (so they tilt and zoom with the court).
   Every fan has their own seat, shirt, skin, hair, energy and reaction delay, so the stands never move in lock-step.
   The crowd watches the match (score, shots, steals, fouls...) and reacts; it also does the wave, holds up signs, strips down to show a painted team name,
   and lets vendors walk the aisle. Nothing here touches the game itself, so it is the same on every machine (and different every match). */
const CROWD_SIGNS = ['#INCLUSIVE\nSPORTS', 'SPORTS\nFOR ALL', 'GO\n{T}', 'GO\n{T}', 'GO\n{T}', '{T}\nPOWER!', 'ROLL\nON!', 'EVERY BODY\nPLAYS', '#VOLT\nHOCKEY', 'LET\'S GO\n{T}', 'NO\nLIMITS', 'POWER\nUP!', '#INCLUSIVE\nSPORTS', 'SPORTS\nFOR ALL', 'WE BACK\n{T}'];
const CROWD_SKIN = [0xf1c7a0, 0xe0a97d, 0xc68a5c, 0xa86b43, 0x7b4a2d, 0x5a3520, 0xf6d5b8];
const CROWD_HAIR = [0x1a1410, 0x2d1d12, 0x4a2c17, 0x7a4a22, 0xb98a4a, 0xd9b870, 0xa8a8a8, 0x6b2a1a, 0xe8e8e8];
const CROWD_CASUAL = [0x44566b, 0x8a3b3b, 0x3d6b4f, 0xc9a43a, 0x6b5a8a, 0x2e2e36, 0xd0d4d8, 0x7a5a3c, 0x3b7f8a, 0xb4547a];

class Crowd {
  constructor(scene) {
    this.sc = scene; this.t = 0; this.acc = 0; this.last = null; this.fans = []; this.rows = [[], []]; this.pending = null;
    this.wave = null; this.nextWave = 25 + Math.random() * 30; this.nextStrip = 40 + Math.random() * 50; this.strip = null; this.excite = 0.25; this.reading = 1;
    this.rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
    this.build();
  }
  /* ----- the people ----- */
  build() {
    const m = this.sc.match, C = CONFIG.court, A = CONFIG.arena, teamCol = [TEAMS[m.teams[0]].color, TEAMS[m.teams[1]].color], r = this.rnd;
    const mix = c => { const f = r(0.55, 1); return (Math.floor(((c >> 16) & 255) * f) << 16) | (Math.floor(((c >> 8) & 255) * f) << 8) | Math.floor((c & 255) * f); };
    this.fans = []; this.rows = [[], []]; this.teamCol = teamCol;
    const mood = r(0.7, 1.3);                                                         // some nights the building is livelier than others
    for (let stand = 0; stand < 2; stand++) for (let row = 0; row < A.rows; row++) {
      const list = this.rows[stand][row] = [], fy = stand ? -1 : 1, y = stand ? C.height + A.firstRow + row * A.rowGap : -(A.firstRow + row * A.rowGap);
      for (let x = -1.3 + (row % 2) * A.seatGap / 2; x <= C.width + 1.3; x += A.seatGap) {
        if (Math.random() < 0.03 + row * 0.018) { list.push(null); continue; }                  // empty seat
        const near = (C.width / 2 - x) / (C.width / 2), p = Math.random(), pA = 0.43 + 0.3 * near, pB = 0.43 - 0.3 * near;
        const team = p < pA ? 0 : p < pA + pB ? 1 : -1;
        const kit = team >= 0 && Math.random() < 0.86;
        const f = {
          x: x + r(-0.05, 0.05), y: y + r(-0.04, 0.04), fy, stand, row, team, sc: r(0.9, 1.12), ph: r(0, 6.28), en: r(0.5, 1.5) * mood, delay: r(0, 0.5),
          skin: CROWD_SKIN[Math.floor(Math.random() * CROWD_SKIN.length)], hair: CROWD_HAIR[Math.floor(Math.random() * CROWD_HAIR.length)],
          shirt: kit ? (Math.random() < 0.25 ? 0xffffff : Math.random() < 0.2 ? mix(teamCol[team]) : teamCol[team]) : CROWD_CASUAL[Math.floor(Math.random() * CROWD_CASUAL.length)],
          hat: team >= 0 && Math.random() < 0.18 ? teamCol[team] : Math.random() < 0.05 ? 0x202428 : -1, mood: null, until: 0, at: 0, sign: null, signAt: 0, signUp: false, letter: null, item: null, itemUntil: 0, phone: Math.random() < 0.05, hail: 0, gap: 0
        };
        list.push(f); this.fans.push(f);
      }
    }
    // signs: a handful of fans own one and hold it up now and then
    const signers = this.fans.filter(f => f.row < 3).sort(() => Math.random() - 0.5).slice(0, 15);
    signers.forEach((f, i) => { f.sign = CROWD_SIGNS[i % CROWD_SIGNS.length].replace(/\{T\}/g, TEAMS[m.teams[f.team >= 0 ? f.team : (i % 2)]].name.toUpperCase()); f.signAt = r(2, 14); f.signCol = f.team >= 0 ? teamCol[f.team] : 0xffffff; });
    this.vendors = [0, 1].map(stand => ({ stand, kind: Math.random() < 0.5 ? 'beer' : 'dog', state: 'away', timer: r(6, 22) + stand * 8, x: 0, dir: 1, pause: 0, nextStop: 0, vy: 0 }));
    this.last = null;
  }
  /* ----- what the match tells us ----- */
  sideOf(name) { const m = this.sc.match; for (let s = 0; s < 2; s++) if (TEAMS[m.teams[s]].name === name) return s; return -1; }
  react(pick, type, dur, chance = 1, delayScale = 1) {          // give a mood to every fan the picker likes (each starts a moment later, and lasts a different time)
    for (const f of this.fans) {
      if (f.letter && type !== 'cheer') continue;
      if (!pick(f) || Math.random() > chance) continue;
      f.mood = type; f.at = this.t + f.delay * delayScale; f.until = f.at + dur * this.rnd(0.6, 1.4) * (0.7 + f.en * 0.3);
    }
  }
  goal(s) {
    const m = this.sc.match, a = m.score[s], o = m.score[1 - s], lead = a - o, st = m.strength ? m.strength() : [3, 3], short = st[1 - s] < st[s];
    this.pending = null; this.excite = Math.min(1.4, this.excite + 0.8);
    if (lead >= 3 && short) {                                      // piling on a team with a man in the sin bin: that gets booed
      this.react(f => f.team !== s, 'boo', 5, 0.85); this.react(f => f.team === s, Math.random() < 0.5 ? 'cheer' : 'clap', 3, 0.7);
      Sound.crowd && Sound.crowd.boo(1); Sound.crowd && Sound.crowd.cheer(0.35);
    } else {
      this.react(f => f.team === s, 'cheer', 6, 1); this.react(f => f.team === -1, 'cheer', 4, 0.85); this.react(f => f.team === 1 - s, 'groan', 3.2, 0.8);
      Sound.crowd && Sound.crowd.cheer(1);
    }
    this.signsUp(s); if (Math.random() < 0.55) this.stripGroup(s);
  }
  signsUp(s) { for (const f of this.fans) if (f.sign && (f.team === s || f.team === -1 || Math.random() < 0.3)) { f.signUp = true; f.signAt = this.t + this.rnd(5, 11); } }
  hear(e) {                                                      // a commentary entry {k, v}: the same lines the announcer reads out
    if (!e || !e.k) return; const v = e.v || {}, side = this.sideOf(v.whoT || v.team || '');
    switch (e.k) {
      case 'shot':
        this.pending = { side, at: this.t }; this.react(f => true, 'ooh', 1.6, 0.8); this.excite = Math.min(1.4, this.excite + 0.25); Sound.crowd && Sound.crowd.rise(); break;
      case 'save': this.miss(); break;
      case 'steal':
        this.react(f => f.team === side, 'cheer', 1.4, 0.55); this.react(f => f.team === 1 - side && side >= 0, 'groan', 1.4, 0.5); Sound.crowd && Sound.crowd.oh(0.6); break;
      case 'hit': this.react(f => true, 'ooh', 1.1, 0.5); Sound.crowd && Sound.crowd.oh(0.5); break;
      case 'penalty':
        this.react(f => f.team === side && side >= 0, 'groan', 2.5, 0.8); this.react(f => f.team !== side, 'boo', 2.2, 0.5); Sound.crowd && Sound.crowd.boo(0.5); break;
      case 'final': this.react(f => true, 'clap', 9, 1); Sound.crowd && Sound.crowd.cheer(0.8); break;
      case 'overtime': this.react(f => true, 'cheer', 3, 0.9); this.excite = 1.2; break;
      case 'drop': case 'open': this.react(f => true, 'clap', 3, 0.9); Sound.crowd && Sound.crowd.clap(); break;
    }
  }
  miss() {                                                       // a shot that did not go in: the crowd rises with it, then sinks
    const p = this.pending; if (!p) return; this.pending = null;
    this.react(f => f.team === p.side, 'groan', 2.2, 0.8); this.react(f => f.team === 1 - p.side, 'cheer', 1.6, 0.7); Sound.crowd && Sound.crowd.fall();
  }
  observe() {                                                    // things we can see on any machine: shots, goals, sin-bin trips, kick-off, full time
    const m = this.sc.match; if (!m) return;
    const bench = m.chairs.map(c => c.benched ? 1 : 0);
    if (this.last) {
      for (let s = 0; s < 2; s++) if (m.score[s] > this.last.score[s]) this.goal(s);
      for (let s = 0; s < 2; s++) if ((m.shots || [0, 0])[s] > this.last.shots[s]) this.hear({ k: 'shot', v: { team: TEAMS[m.teams[s]].name } });
      m.chairs.forEach((c, i) => { if (bench[i] && !this.last.bench[i]) this.hear({ k: 'penalty', v: { team: TEAMS[m.teams[c.side]].name } }); });
      if (this.last.state !== 'play' && m.state === 'play') { this.react(f => true, 'clap', 2, 0.6); Sound.crowd && Sound.crowd.clap(); }
      if (this.last.state !== 'over' && m.state === 'over') this.hear({ k: 'final', v: {} });
    }
    this.last = { score: m.score.slice(), shots: (m.shots || [0, 0]).slice(), bench, state: m.state };
  }
  /* ----- little shows: the wave, painted fans, vendors ----- */
  startWave() { const C = CONFIG.court; this.wave = { pos: 0, len: 2 * (C.width + 5), speed: this.rnd(6, 8) }; }
  stripGroup(s) {                                                // a run of fans in the front rows take their jerseys off: a letter of the team name painted on each
    if (this.strip) return; const name = TEAMS[this.sc.match.teams[s]].name.toUpperCase().replace(/[^A-Z]/g, ''), n = name.length; if (n < 2 || n > 9) return;
    for (let tries = 0; tries < 12; tries++) {
      const stand = Math.floor(Math.random() * 2), row = Math.floor(Math.random() * 2), list = this.rows[stand][row], i0 = Math.floor(Math.random() * Math.max(1, list.length - n));
      const run = list.slice(i0, i0 + n); if (run.length < n || run.some(f => !f)) continue;
      this.strip = { until: this.t + this.rnd(26, 40), fans: run, name, side: s };
      run.forEach((f, k) => { f.team = s; f.letter = name[k]; f.mood = 'cheer'; f.at = this.t + k * 0.12; f.until = this.t + 26; f.jersey = f.shirt; f.toss = this.t + k * 0.12; });
      return;
    }
  }
  endStrip() { if (!this.strip) return; for (const f of this.strip.fans) { f.letter = null; f.toss = null; } this.strip = null; }
  updateVendors(dt) {
    const C = CONFIG.court, A = CONFIG.arena;
    for (const v of this.vendors) {
      if (v.state === 'away') { v.timer -= dt; if (v.timer <= 0) { v.state = 'walk'; v.dir = Math.random() < 0.5 ? 1 : -1; v.x = v.dir > 0 ? -2.4 : C.width + 2.4; v.kind = Math.random() < 0.5 ? 'beer' : 'dog'; v.nextStop = this.rnd(2, 5); v.pause = 0; } continue; }
      if (v.pause > 0) { v.pause -= dt; if (v.pause <= 0) v.nextStop = this.rnd(3, 7); continue; }
      v.x += v.dir * 1.0 * dt; v.nextStop -= dt;
      if (v.nextStop <= 0 && v.x > 0 && v.x < C.width) {          // stop to serve somebody in the front row
        v.pause = this.rnd(2, 3.5); const list = this.rows[v.stand][0].filter(f => f && Math.abs(f.x - v.x) < 1.3);
        const f = list[Math.floor(Math.random() * list.length)]; if (f) { f.hail = this.t + v.pause + 1; f.item = v.kind; f.itemUntil = this.t + this.rnd(25, 50); }
      }
      if ((v.dir > 0 && v.x > C.width + 2.6) || (v.dir < 0 && v.x < -2.6)) { v.state = 'away'; v.timer = this.rnd(14, 38); }
    }
  }
  /* ----- each frame ----- */
  update(dt) {
    const m = this.sc.match; this.t += dt; this.observe();
    if (this.pending && this.t - this.pending.at > 2.2) this.miss();
    this.excite += (0.25 - this.excite) * Math.min(1, dt * 0.18);
    if (Sound.crowd) Sound.crowd.level(this.excite);
    if (!this.wave && this.t > this.nextWave) { if (m.state === 'play' && Math.abs(m.score[0] - m.score[1]) < 6) this.startWave(); this.nextWave = this.t + this.rnd(55, 100); }
    if (this.wave) { this.wave.pos += this.wave.speed * dt; if (this.wave.pos > this.wave.len + 3) this.wave = null; }
    if (!this.strip && this.t > this.nextStrip) { this.stripGroup(Math.random() < 0.5 ? 0 : 1); this.nextStrip = this.t + this.rnd(70, 130); }
    if (this.strip && this.t > this.strip.until) this.endStrip();
    this.updateVendors(dt);
    for (const f of this.fans) {
      if (f.mood && this.t > f.until) f.mood = null;
      if (f.sign) { if (this.t > f.signAt) { f.signUp = !f.signUp; f.signAt = this.t + (f.signUp ? this.rnd(5, 11) : this.rnd(9, 24)); } }
      if (f.item && this.t > f.itemUntil) f.item = null;
    }
  }
  waveUp(f) {
    const w = this.wave; if (!w) return 0; const C = CONFIG.court, p = f.stand ? (C.width + 5) + (C.width + 2.5 - f.x) : f.x + 2.5, d = Math.abs(p - w.pos);
    return d < 1.5 && (f.ph * 7.3 % 1) > 0.1 ? 1 - d / 1.5 : 0;
  }
  /* The fixed part: bleacher steps, rails, the back wall with its banners and the walkway. Drawn once (and again when the court changes). */
  drawStands(g) {
    const C = CONFIG.court, A = CONFIG.arena, m = this.sc.match; g.clear();
    for (let stand = 0; stand < 2; stand++) {
      const fy = stand ? -1 : 1, edge = stand ? C.height + 0.5 : -0.5, x0 = -3.2, w = C.width + 6.4, depthFull = A.firstRow + A.rows * A.rowGap + 0.3;
      const y = d => stand ? C.height + d : -d;                        // d metres out from the court edge
      g.fillStyle(0x23282d).fillRect(x0, Math.min(y(0.5), y(depthFull)), w, depthFull - 0.5);                    // dark concrete
      g.fillStyle(0x30363c).fillRect(x0, Math.min(y(0.5), y(1.15)), w, 0.65);                                    // the walkway
      for (let r = 0; r < A.rows; r++) {                              // each row is a bench on a step
        const c = y(A.firstRow + r * A.rowGap), shade = 0x59626b - r * 0x040404;
        g.fillStyle(shade).fillRect(x0, c - 0.31, w, 0.62);
        g.fillStyle(0x8a949d, 0.55).fillRect(x0, c + (stand ? -0.31 : 0.27), w, 0.04);                         // lit nosing of the step
        g.fillStyle(0x000000, 0.28).fillRect(x0, c + (stand ? 0.27 : -0.31), w, 0.04);
      }
      g.lineStyle(0.05, 0xb9c2c9, 0.9).lineBetween(x0, y(1.17), x0 + w, y(1.17));                              // rail along the walkway
      for (let x = x0; x <= x0 + w; x += 3.2) g.lineStyle(0.04, 0x1a1e22, 0.8).lineBetween(x, y(1.17), x, y(1.17) + fy * 0.12);   // posts
      for (let x = x0; x <= x0 + w; x += 7) g.lineStyle(0.06, 0x14181c, 0.6).lineBetween(x, y(1.2), x, y(depthFull));    // aisles
      const wall = y(depthFull);                                         // advertising banners on the back wall, in the two team colours
      g.fillStyle(0x15191d).fillRect(x0, Math.min(wall, wall + fy * 0.7), w, 0.7);
      for (let x = x0 + 0.3, i = 0; x < x0 + w - 1; x += 3.2, i++) g.fillStyle(i % 2 ? TEAMS[m.teams[1]].color : TEAMS[m.teams[0]].color, 0.9).fillRect(x, wall + (stand ? 0.1 : -0.6), 2.8, 0.5);
    }
  }
  /* The fans, redrawn a few times a second. view = { cx, cy, hx, hy } the part of the stands that can be seen (world metres). */
  drawFans(g, view, rot) {
    g.clear(); const t = this.t;
    const P = this.pen || (this.pen = {                                   // a light drawing pen: few-sided ovals keep the number of drawing commands (replayed every frame) small
      fillStyle(c, a) { P.g.fillStyle(c, a); return P; }, fillEllipse(x, y, w, h) { P.g.fillEllipse(x, y, w, h, 8); return P; }, fillCircle(x, y, r) { P.g.fillEllipse(x, y, 2 * r, 2 * r, 8); return P; },
      fillRect(...a) { P.g.fillRect(...a); return P; }, lineStyle(...a) { P.g.lineStyle(...a); return P; }, lineBetween(...a) { P.g.lineBetween(...a); return P; }, strokeRect(...a) { P.g.strokeRect(...a); return P; } });
    P.g = g;
    for (const f of this.fans) {
      if (Math.abs(f.x - view.cx) > view.hx || Math.abs(f.y - view.cy) > view.hy) continue;
      this.drawFan(P, f, t);
    }
    for (const v of this.vendors) if (v.state === 'walk') this.drawVendor(P, v, t);
  }
  drawFan(g, f, t) {
    const sc = f.sc, fy = f.fy, mood = f.mood && t >= f.at ? f.mood : null, w = this.waveUp(f), hail = f.hail > t;
    let up = w, lean = 0, bob = 0, head = 1, sway = Math.sin(t * 0.7 * f.en + f.ph) * 0.025, shake = 0, clap = 0, down = 0;
    if (mood === 'cheer') { up = Math.max(up, 1); bob = Math.max(0, Math.sin(t * (7 + f.en * 2) + f.ph)) * 0.07; }
    else if (mood === 'clap') { clap = 1; bob = Math.sin(t * 9 + f.ph) * 0.01; }
    else if (mood === 'groan') { down = 1; lean = -0.04; head = 0.92; }
    else if (mood === 'boo') { up = 0.55; shake = Math.sin(t * 6 + f.ph) * 0.05; down = 0.5; }
    else if (mood === 'ooh') { lean = 0.07; up = 0.35; }
    else if (!w && Math.sin(t * 0.13 * f.en + f.ph * 3) > 0.93) clap = 0.7;            // now and then somebody claps along
    if (hail) up = 1;
    const standing = Math.max(w, mood === 'cheer' ? 0.6 : 0), s2 = sc * (1 + standing * 0.1);
    const x = f.x + sway + shake, y = f.y + fy * lean - fy * bob * 0.5, sk = f.skin;
    const torso = f.letter ? sk : f.shirt;
    g.fillStyle(0x000000, 0.18).fillEllipse(x + 0.04, y + 0.05, 0.52 * s2, 0.34 * s2);                                              // shadow on the bench
    g.fillStyle(torso).fillEllipse(x, y, 0.5 * s2, 0.31 * s2);                                                                       // shoulders
    if (!f.letter && f.team >= 0 && f.shirt === this.teamCol[f.team]) { g.fillStyle(0xffffff, 0.8).fillRect(x - 0.15 * s2, y - 0.02 * s2, 0.3 * s2, 0.035 * s2); }   // kit stripe
    if (f.letter) g.fillStyle(0x000000, 0.12).fillEllipse(x, y, 0.5 * s2, 0.31 * s2);
    // arms and hands
    const hx = (0.22 + up * 0.1) * s2, hy = fy * (0.12 - up * 0.2 + down * 0.1 - clap * 0.05) * s2, hr = (0.045 + up * 0.03) * s2;
    for (const sd of [-1, 1]) {
      const ax = x + sd * 0.2 * s2, ay = y, bx = clap ? x + sd * 0.04 * s2 : x + sd * hx, by = clap ? y + fy * (0.16 + Math.sin(t * 11 + f.ph) * 0.03) * s2 : y + hy + (down && !up ? -fy * 0.02 : 0);
      g.lineStyle(0.1 * s2, f.letter ? sk : f.shirt, 1).lineBetween(ax, ay, bx, by);
      g.fillStyle(sk).fillCircle(bx, by, hr);
    }
    if (f.item && f.itemUntil > t) {                                                                                                  // a drink or a hot dog from the vendor
      const ix = x + 0.22 * s2, iy = y + fy * 0.2 * s2;
      if (f.item === 'beer') g.fillStyle(0xe8a317).fillRect(ix - 0.04, iy - 0.05, 0.08, 0.1).fillStyle(0xffffff).fillRect(ix - 0.045, iy - 0.075, 0.09, 0.03);
      else g.fillStyle(0xd9a05b).fillRect(ix - 0.08, iy - 0.03, 0.16, 0.06).fillStyle(0xc0392b).fillRect(ix - 0.075, iy - 0.015, 0.15, 0.03);
    }
    // head: hair behind, face towards the court, ears, cap
    const hxp = x, hyp = y + fy * 0.03 * s2 + fy * lean * 0.5, hr2 = 0.115 * s2 * head * (1 + up * 0.08);
    g.fillStyle(sk).fillCircle(hxp, hyp, hr2);
    g.fillStyle(f.hair).fillEllipse(hxp, hyp - fy * 0.035 * s2, hr2 * 1.9, hr2 * 1.5);
    if (f.hat >= 0) g.fillStyle(f.hat).fillCircle(hxp, hyp - fy * 0.01, hr2 * 1.02).fillStyle(f.hat).fillEllipse(hxp, hyp + fy * hr2 * 0.95, hr2 * 1.5, hr2 * 0.6);
    if (f.phone && Math.sin(t * 0.3 + f.ph * 5) > 0.8 && !mood) g.fillStyle(0xdfe9ff, 0.95).fillRect(x - 0.05, y + fy * 0.25 - 0.07, 0.1, 0.14);   // filming it on a phone
    if (f.toss !== null && f.toss !== undefined && t - f.toss < 0.9 && t >= f.toss) { const k = (t - f.toss) / 0.9; g.fillStyle(f.jersey, 1 - k).fillCircle(x + 0.1, y - fy * (0.2 + k * 1.6), 0.2 + k * 0.1); }   // the jersey flies off
  }
  drawVendor(g, v, t) {
    const C = CONFIG.court, A = CONFIG.arena, fy = v.stand ? -1 : 1, y = v.stand ? C.height + 0.82 : -0.82, x = v.x, bob = Math.sin(t * 6) * 0.015 * (v.pause > 0 ? 0 : 1), col = v.kind === 'beer' ? 0xf4b400 : 0xe53935;
    g.fillStyle(0x000000, 0.25).fillEllipse(x + 0.05, y + 0.06, 0.6, 0.4);
    g.fillStyle(0xf5f5f5).fillEllipse(x, y + bob, 0.5, 0.34);                                                    // apron
    g.fillStyle(col).fillRect(x - 0.17, y - 0.05 + bob, 0.34, 0.1);                                              // coloured vest stripe
    const ty = y + fy * 0.3;                                                                                      // the tray hangs in front, towards the court
    g.fillStyle(0x6b4a2b).fillRect(x - 0.34, ty - 0.17, 0.68, 0.34).lineStyle(0.03, 0x3b2814).strokeRect(x - 0.34, ty - 0.17, 0.68, 0.34);
    for (let i = 0; i < 5; i++) {
      const ix = x - 0.26 + i * 0.13;
      if (v.kind === 'beer') { const cc = [0xe8a317, 0xd9423b, 0x3c9de8, 0x5cc26a, 0xe8a317][i]; g.fillStyle(cc).fillCircle(ix, ty - 0.06, 0.05).fillStyle(0xffffff).fillCircle(ix, ty - 0.06, 0.03).fillStyle(cc).fillCircle(ix, ty + 0.07, 0.05).fillStyle(0xffffff).fillCircle(ix, ty + 0.07, 0.03); }
      else g.fillStyle(0xd9a05b).fillRect(ix - 0.045, ty - 0.12, 0.09, 0.24).fillStyle(0xc0392b).fillRect(ix - 0.015, ty - 0.12, 0.03, 0.24);
    }
    g.lineStyle(0.07, 0xf5f5f5).lineBetween(x - 0.2, y, x - 0.3, ty - 0.1).lineBetween(x + 0.2, y, x + 0.3, ty - 0.1);
    g.fillStyle(0xe0a97d).fillCircle(x, y + bob - fy * 0.02, 0.11);
    g.fillStyle(col).fillCircle(x, y + bob - fy * 0.03, 0.115).fillEllipse(x, y + bob + fy * 0.1, 0.2, 0.07);     // cap
  }

  /* Words (signs, painted letters, vendor calls) are text objects kept upright on the screen whichever way the rink is turned. */
  initTexts(world) {
    const sc = this.sc, mk = (style) => { const t = sc.add.text(0, 0, '', style).setOrigin(0.5).setVisible(false); world.add(t); return t; };
    this.signTx = Array.from({ length: 14 }, () => mk({ fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', align: 'center', color: '#ffffff', padding: { x: 7, y: 4 }, lineSpacing: -2 }));
    this.letterTx = Array.from({ length: 9 }, () => mk({ fontFamily: FONT, fontSize: '44px', fontStyle: 'bold', color: '#ffffff', stroke: '#ffffff', strokeThickness: 0 }));
    this.vendorTx = Array.from({ length: 2 }, () => mk({ fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#1b1b1b', backgroundColor: '#ffffff', padding: { x: 6, y: 3 } }));
  }
  placeTexts(rot, view) {
    if (!this.signTx) return; const inV = f => Math.abs(f.x - view.cx) < view.hx && Math.abs(f.y - view.cy) < view.hy, t = this.t;
    let n = 0;
    for (const f of this.fans) {
      if (!f.sign || !f.signUp || !inV(f) || n >= this.signTx.length) continue;
      const tx = this.signTx[n++], dark = (f.signCol === 0xffffff || f.signCol === 0xffe066 || f.signCol === 0xc9d6df || f.signCol === 0x7cf5c0 || f.signCol === 0xb5e61d);
      if (tx.text !== f.sign) tx.setText(f.sign);
      tx.setColor(dark ? '#14181c' : '#ffffff').setBackgroundColor('#' + f.signCol.toString(16).padStart(6, '0'));
      const k = Math.min(0.0125, 1.7 / Math.max(40, tx.width));
      tx.setScale(k).setRotation(-rot + Math.sin(t * 1.7 + f.ph) * 0.07).setPosition(f.x, f.y + f.fy * 0.32).setVisible(true).setDepth(5);
    }
    for (let i = n; i < this.signTx.length; i++) this.signTx[i].setVisible(false);
    const S = this.strip, order = Math.cos(rot) + Math.sin(rot) >= 0 ? 1 : -1;
    for (let i = 0; i < this.letterTx.length; i++) {
      const tx = this.letterTx[i]; const f = S && S.fans[order > 0 ? i : S.fans.length - 1 - i];
      if (!f || !f.letter || this.t < f.at || !inV(f)) { tx.setVisible(false); continue; }
      const col = '#' + this.teamCol[S.side].toString(16).padStart(6, '0');
      if (tx.text !== f.letter) tx.setText(f.letter);
      tx.setColor(col).setStroke('#ffffff', 5).setScale(0.0095).setRotation(-rot).setPosition(f.x, f.y).setVisible(true).setDepth(5);
    }
    for (let i = 0; i < 2; i++) {
      const v = this.vendors[i], tx = this.vendorTx[i]; if (v.state !== 'walk' || Math.abs(v.x - view.cx) > view.hx) { tx.setVisible(false); continue; }
      const word = v.kind === 'beer' ? 'COLD DRINKS!' : 'HOT DOGS!'; if (tx.text !== word) tx.setText(word);
      tx.setColor('#1b1b1b').setBackgroundColor(v.kind === 'beer' ? '#f4b400' : '#ff6b5e').setScale(0.0095).setRotation(-rot).setPosition(v.x, v.stand ? CONFIG.court.height + 0.82 + 0.78 : -0.82 - 0.78).setVisible(true).setDepth(6);
    }
  }
  destroyTexts() { for (const k of ['signTx', 'letterTx', 'vendorTx']) (this[k] || []).forEach(t => { try { t.destroy(); } catch (e) {} }); this.signTx = this.letterTx = this.vendorTx = null; }
}
