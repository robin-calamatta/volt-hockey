/* Season mode: the rules and the data, with no screens in here (scenes_season.js draws it). A season is a round-robin between every team
   (everybody plays everybody once, or twice), then the best teams play off in best-of-N series for the Volt Hockey World Cup.
   You play your own team's games (or simulate them); every other game is simulated from the team ratings. Everything is plain data so it
   saves to the browser (Season.save) and a season can be resumed later. Teams are numbers: indexes into TEAMS. */
const Season = {
  cur: null, fx: null,                                  // the season being played right now (in memory), and the game being played
  key: 'voltHockeySeason', historyKey: 'voltHockeyHistory',
  C() { return CONFIG.season; },
  levels() { return Object.keys(CONFIG.difficulties); },

  /* ---- creating a season ---- */
  create({ team, difficulty, periodSeconds, double, year, ratings, history }) {
    const n = TEAMS.length, rt = ratings ? ratings.slice() : TEAMS.map(t => t.rating);
    const rounds = this.schedule(n, !!double);
    return { v: 1, year: year || 1, team, difficulty: difficulty || 'Normal', periodSeconds: periodSeconds || 300, double: !!double,
             ratings: rt, rounds, day: 0, stage: 'regular', playoffs: null, champion: null, userPlayoffResult: '', log: [], settings: { cup: this.C().cupName } };
  },
  schedule(n, double) {                                 // the circle method: every team plays every other once, one team sits out each round when n is odd
    const ids = Array.from({ length: n }, (_, i) => i); if (n % 2) ids.push(-1);
    const m = ids.length, rounds = [];
    for (let r = 0; r < m - 1; r++) {
      const fx = [];
      for (let i = 0; i < m / 2; i++) {
        const a = ids[i], b = ids[m - 1 - i]; if (a < 0 || b < 0) continue;
        const flip = (r + i) % 2 === 0; fx.push({ h: flip ? a : b, a: flip ? b : a, hs: 0, as: 0, ot: false, done: false });
      }
      rounds.push(fx); ids.splice(1, 0, ids.pop());
    }
    for (let i = rounds.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rounds[i], rounds[j]] = [rounds[j], rounds[i]]; }   // shuffle the order of the rounds
    if (double) rounds.push(...rounds.map(fx => fx.map(f => ({ h: f.a, a: f.h, hs: 0, as: 0, ot: false, done: false }))));
    return rounds;
  },

  /* ---- results and the table ---- */
  standings(s) {
    const row = {}; TEAMS.forEach((_, t) => { row[t] = { t, gp: 0, w: 0, l: 0, otl: 0, pts: 0, gf: 0, ga: 0, form: [] }; });
    const C = this.C();
    for (const fx of s.rounds.flat()) {
      if (!fx.done) continue;
      const H = row[fx.h], A = row[fx.a], hw = fx.hs > fx.as;
      H.gp++; A.gp++; H.gf += fx.hs; H.ga += fx.as; A.gf += fx.as; A.ga += fx.hs;
      const [W, L] = hw ? [H, A] : [A, H]; W.w++; W.pts += C.winPoints; W.form.push('W');
      if (fx.ot) { L.otl++; L.pts += C.otLossPoints; L.form.push('O'); } else { L.l++; L.form.push('L'); }
    }
    return Object.values(row).sort((a, b) => b.pts - a.pts || b.w - a.w || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.t - b.t).map((r, i) => ({ ...r, rank: i + 1, gd: r.gf - r.ga }));
  },
  rank(s, team) { return this.standings(s).find(r => r.t === team).rank; },

  /* ---- simulating a game from the ratings ---- */
  poisson(l) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L && k < 30); return k - 1; },
  simGame(s, h, a) {
    const C = this.C(), minutes = 2 * s.periodSeconds / 60, G = C.goalsPerMinute * minutes, d = (s.ratings[h] + C.homeEdge) - s.ratings[a];
    let hs = this.poisson(G * Math.exp(C.ratingK * d / 2)), as = this.poisson(G * Math.exp(-C.ratingK * d / 2)), ot = false;
    if (hs === as) { ot = true; if (Math.random() < 1 / (1 + Math.exp(-C.otK * d))) hs++; else as++; }       // level after regulation: sudden death
    return { hs, as, ot };
  },
  /* How sharp the CPU plays for a team in games you play: your chosen difficulty, a step up for the strongest teams and a step down for the weakest. */
  levelFor(s, team) {
    const L = this.levels(), base = Math.max(0, L.indexOf(s.difficulty)), sorted = s.ratings.slice().sort((a, b) => b - a), r = s.ratings[team];
    const shift = r >= sorted[Math.floor(sorted.length * 0.25)] ? 1 : r <= sorted[Math.floor(sorted.length * 0.7)] ? -1 : 0;
    return L[Math.max(0, Math.min(L.length - 1, base + shift))];
  },

  /* ---- the calendar: today's games, yours, and moving on ---- */
  fixtures(s) {                                          // today's games (regular season: the round; playoffs: one game from every series still going)
    if (s.stage === 'regular') return s.rounds[s.day] || [];
    if (s.stage !== 'playoffs') return [];
    const out = [];
    s.playoffs.rounds[s.playoffs.round].forEach((ser, i) => {
      if (ser.winner !== null) return;
      const g = ser.games.length, home = g % 2 === 0 ? ser.a : ser.b;
      if (!ser.today) ser.today = { h: home, a: home === ser.a ? ser.b : ser.a, hs: 0, as: 0, ot: false, done: false, series: i, game: g + 1 };
      out.push(ser.today);
    });
    return out;
  },
  mine(s) { return this.fixtures(s).find(f => !f.done && (f.h === s.team || f.a === s.team)) || null; },    // your game today, if you have one and it is not played yet
  bye(s) { return s.stage === 'regular' && !this.fixtures(s).some(f => f.h === s.team || f.a === s.team); },
  /* Record a result for one of today's games. Fixtures are the objects from fixtures(s). */
  record(s, fx, hs, as, ot) {
    fx.hs = hs; fx.as = as; fx.ot = !!ot; fx.done = true;
    if (fx.h === s.team || fx.a === s.team) { const mine = fx.h === s.team ? [hs, as] : [as, hs]; s.last = { stage: s.stage, round: s.stage === 'regular' ? s.day : s.playoffs.round, opp: fx.h === s.team ? fx.a : fx.h, home: fx.h === s.team, gf: mine[0], ga: mine[1], ot: !!ot, win: mine[0] > mine[1] }; }
  },
  /* Play out everything that is left today except your own unplayed game, then move to the next day when nothing is left. Returns true when the day moved on. */
  finishDay(s, includeMine) {
    if (s.stage === 'done') return false;
    for (const fx of this.fixtures(s)) {
      if (fx.done) continue;
      if (!includeMine && (fx.h === s.team || fx.a === s.team)) continue;
      const r = this.simGame(s, fx.h, fx.a); this.record(s, fx, r.hs, r.as, r.ot);
    }
    if (this.fixtures(s).some(f => !f.done)) return false;
    this.nextDay(s); return true;
  },
  nextDay(s) {
    if (s.stage === 'regular') { s.day++; if (s.day >= s.rounds.length) this.startPlayoffs(s); return; }
    const P = s.playoffs, round = P.rounds[P.round];
    round.forEach(ser => {
      if (!ser.today || !ser.today.done) return;
      const t = ser.today; ser.games.push({ h: t.h, a: t.a, hs: t.hs, as: t.as, ot: t.ot }); ser.today = null;
      const winner = t.hs > t.as ? t.h : t.a; ser.wins[winner === ser.a ? 0 : 1]++;
      if (ser.wins[0] >= ser.need) ser.winner = ser.a; else if (ser.wins[1] >= ser.need) ser.winner = ser.b;
    });
    if (round.some(ser => ser.winner === null)) return;
    if (round.length === 1) { this.crown(s, round[0].winner); return; }
    P.round++; P.rounds[P.round] = this.pairUp(s, round.map(ser => ser.winner), P.round);
  },

  /* ---- the playoffs ---- */
  qualifiers() { let q = 1; while (q * 2 <= Math.min(this.C().qualifiers, TEAMS.length)) q *= 2; return q; },
  seriesLength(round, rounds) { const L = this.C().series; return L[Math.max(0, L.length - (rounds - round))] || 3; },   // the last round is always the last length in the list
  roundName(round, rounds) { const left = rounds - round; return left === 1 ? CONFIG.season.cupName + ' Final' : left === 2 ? 'Semifinal' : left === 3 ? 'Quarterfinal' : 'Round of ' + Math.pow(2, left); },
  startPlayoffs(s) {
    const Q = this.qualifiers(), seeds = this.standings(s).slice(0, Q).map(r => r.t);
    s.seeds = seeds; s.stage = 'playoffs'; s.playoffs = { round: 0, rounds: [], total: Math.log2(Q) };
    const first = [];
    for (let i = 0; i < Q / 2; i++) first.push(this.series(s, seeds[i], seeds[Q - 1 - i], 0));
    s.playoffs.rounds.push(first);
    if (!seeds.includes(s.team)) s.userPlayoffResult = 'Missed the playoffs';
  },
  series(s, a, b, round) {                              // a is the better seed and has home advantage in games 1, 3 and 5
    const sa = s.seeds.indexOf(a), sb = s.seeds.indexOf(b), len = this.seriesLength(round, s.playoffs.total), need = Math.ceil(len / 2);
    return sa <= sb ? { a, b, len, need, wins: [0, 0], games: [], winner: null, today: null } : { a: b, b: a, len, need, wins: [0, 0], games: [], winner: null, today: null };
  },
  pairUp(s, winners, round) { const out = []; for (let i = 0; i < winners.length / 2; i++) out.push(this.series(s, winners[i], winners[winners.length - 1 - i], round)); return out; },
  crown(s, team) {
    s.champion = team; s.stage = 'done';
    const rounds = s.playoffs.rounds;
    if (team === s.team) s.userPlayoffResult = 'WORLD CUP CHAMPIONS';
    else if (s.seeds.includes(s.team)) { let out = 0; rounds.forEach((rd, i) => { if (rd.some(ser => ser.winner !== null && (ser.a === s.team || ser.b === s.team) && ser.winner !== s.team)) out = i; }); s.userPlayoffResult = 'Out in the ' + this.roundName(out, rounds.length); }
    this.addHistory(s);
  },
  // Your team is still alive in the playoffs?
  alive(s) { if (s.stage === 'regular') return true; if (s.stage !== 'playoffs') return false; return s.playoffs.rounds[s.playoffs.round].some(ser => ser.winner === null && (ser.a === s.team || ser.b === s.team)); },
  /* Sim everything until the end of the regular season / the end of the whole thing. */
  simToPlayoffs(s) { let guard = 0; while (s.stage === 'regular' && guard++ < 500) this.finishDay(s, true); },
  simToEnd(s) { let guard = 0; while (s.stage !== 'done' && guard++ < 2000) this.finishDay(s, true); },

  /* ---- keeping it ---- */
  next(s) {                                              // the next season: the same team and settings, ratings drift a little
    const D = this.C().drift, ratings = s.ratings.map(r => Math.round(Math.max(45, Math.min(95, r + (Math.random() * 2 - 1) * D))));
    return this.create({ team: s.team, difficulty: s.difficulty, periodSeconds: s.periodSeconds, double: s.double, year: s.year + 1, ratings });
  },
  save(s) { try { localStorage.setItem(this.key, JSON.stringify(s)); } catch (e) { /* storage blocked */ } if (typeof Account !== 'undefined') Account.changed(); },   // logged in: also saved online
  load() { try { const s = JSON.parse(localStorage.getItem(this.key) || 'null'); return s && s.v === 1 && Array.isArray(s.rounds) && s.ratings && s.ratings.length === TEAMS.length ? s : null; } catch (e) { return null; } },
  clear() { try { localStorage.removeItem(this.key); } catch (e) { /* storage blocked */ } if (typeof Account !== 'undefined') Account.changed(); },
  history() { try { const h = JSON.parse(localStorage.getItem(this.historyKey) || '[]'); return Array.isArray(h) ? h : []; } catch (e) { return []; } },
  addHistory(s) {
    const h = this.history(), rec = this.standings(s).find(r => r.t === s.team);
    h.push({ year: s.year, team: s.team, champion: s.champion, result: s.userPlayoffResult, w: rec.w, l: rec.l, otl: rec.otl, rank: rec.rank });
    try { localStorage.setItem(this.historyKey, JSON.stringify(h.slice(-60))); } catch (e) { /* storage blocked */ }
    if (typeof Account !== 'undefined') Account.changed();
    if (s.champion === s.team) { Settings.career = Settings.career || {}; Settings.career.cups = (Settings.career.cups || 0) + 1; Settings.save(); }
  }
};
