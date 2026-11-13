/* Volt Royale, part 2 (v13): bigger maps (and new ones made of whole districts), Random map; ammo types you carry without a gun,
   magazines and reloading; heals that take time (bandages, first aid kits, cart armour, full body kits) and healing a team-mate with LT;
   putting your item away (Y) to drive faster; going down (last stand), being revived, rez cards and rez garages; storm stages with
   announcements. Loaded after modes_br.js: it replaces some of MODES.br's parts and wraps others. */

/* ---------- guns, ammo, items ---------- */
const BR_AMMO = { light: { i: 0, name: 'LIGHT AMMO', icon: '🟡', max: 240, pack: 30 }, shells: { i: 1, name: 'SHELLS', icon: '🔴', max: 40, pack: 8 }, medium: { i: 2, name: 'MEDIUM AMMO', icon: '🟢', max: 200, pack: 30 },
  heavy: { i: 3, name: 'HEAVY AMMO', icon: '🟣', max: 24, pack: 6 }, rockets: { i: 4, name: 'ROCKETS', icon: '🚀', max: 8, pack: 2 } };
const AMMO_KEYS = Object.keys(BR_AMMO);
Object.assign(BR_GUNS.pistol, { type: 'light', mag: 12, rl: 1.1 }); Object.assign(BR_GUNS.smg, { type: 'light', mag: 30, rl: 1.7 }); Object.assign(BR_GUNS.shotgun, { type: 'shells', mag: 5, rl: 0.55, shell: 1 });   /* (the shotgun loads a shell at a time) */
Object.assign(BR_GUNS.rifle, { type: 'medium', mag: 25, rl: 1.9 }); Object.assign(BR_GUNS.sniper, { type: 'heavy', mag: 4, rl: 2.5 }); Object.assign(BR_GUNS.rocket, { type: 'rockets', mag: 1, rl: 2.6 });
for (const g of Object.values(BR_GUNS)) g.ammo = g.mag;                  // (a gun on the ground comes with a full magazine)
for (const k of Object.keys(BR_ITEMS)) delete BR_ITEMS[k];
Object.assign(BR_ITEMS, {
  band: { name: 'BANDAGES', icon: '🩹', stack: 15, pick: 5, hp: 15, cap: 75, time: 2.6, col: 0xf4f1ea, heal: 1, about: '+15 health (up to 75)' },
  medkit: { name: 'FIRST AID KIT', icon: '🧰', stack: 3, pick: 1, hp: 60, cap: 100, time: 5.5, col: 0xc0392b, heal: 1, about: '+60 health' },
  plate: { name: 'ARMOUR PLATE', icon: '🛡', stack: 6, pick: 2, sh: 25, shCap: 50, time: 2.2, col: 0x4a7fd8, heal: 1, about: '+25 cart armour (up to 50)' },
  armour: { name: 'HEAVY CART ARMOUR', icon: '🛡', stack: 2, pick: 1, sh: 75, time: 4.5, col: 0x1e3f8a, heal: 1, about: '+75 cart armour' },
  fullkit: { name: 'FULL BODY KIT', icon: '✚', stack: 1, pick: 1, hp: 100, cap: 100, sh: 100, time: 9, col: 0x2ecc71, heal: 1, about: 'full health and full cart armour' },
  boost: { name: 'BOOST', icon: '🚀', stack: 3, pick: 1, col: 0xffd23f, about: 'a few seconds of extra speed' },
  wall: { name: 'SHIELD WALL', icon: '🧱', stack: 2, pick: 1, col: 0x7d8790, about: 'a wall in front of you that stops bullets' }
});
BR_LOOT.length = 0; BR_LOOT.push(['pistol', 5], ['smg', 4], ['shotgun', 4], ['rifle', 3], ['sniper', 1.5], ['rocket', 1], ['band', 4], ['medkit', 2], ['plate', 3], ['armour', 1.5], ['fullkit', 0.5], ['boost', 2], ['wall', 1.5], ['am_light', 3], ['am_shells', 2], ['am_medium', 3], ['am_heavy', 1.5], ['am_rockets', 0.6]);
Object.assign(BR, { downHp: 100, bleed: 30, reviveTime: 4, reviveHp: 30, rezTime: 6, rezCool: 90, cardLife: 90, holsterSpeed: 1.12, useSpeed: 0.5, downSpeed: 0.35, mateRange: 3.2 });

/* ---------- bigger maps, more maps, Random ---------- */
function brCopy(M, ox, oy, into) {                                        // copy a map's pieces, moved by (ox, oy)
  const T = into || { walls: [], floors: [], ramps: [], trees: [], loot: [], deco: [] };
  const mv = r => ({ ...r, x0: r.x0 + ox, x1: r.x1 + ox, y0: r.y0 + oy, y1: r.y1 + oy });
  T.walls.push(...M.walls.map(mv)); T.floors.push(...M.floors.map(mv)); M.ramps.forEach(r => T.ramps.push({ ...mv(r), id: T.ramps.length }));
  T.trees.push(...M.trees.map(t => ({ ...t, x: t.x + ox, y: t.y + oy }))); T.loot.push(...M.loot.map(([x, y, lv]) => [x + ox, y + oy, lv]));
  T.deco.push(...M.deco.map(d => ({ ...d, x: d.x + ox, y: d.y + oy }))); return T;
}
function brFill(M, W, H, look, seed) {                                     // fill the empty ground: sheds with loot, trees, rocks, loot in the open
  const r = Look.rnd(seed), cs = 2, gw = Math.ceil(W / cs), gh = Math.ceil(H / cs), used = new Uint8Array(gw * gh);
  const mark = (x0, y0, x1, y1, pad) => { for (let j = Math.max(0, Math.floor((y0 - pad) / cs)); j <= Math.min(gh - 1, Math.floor((y1 + pad) / cs)); j++) for (let i = Math.max(0, Math.floor((x0 - pad) / cs)); i <= Math.min(gw - 1, Math.floor((x1 + pad) / cs)); i++) used[j * gw + i] = 1; };
  const free = (x0, y0, x1, y1) => { if (x0 < 3 || y0 < 3 || x1 > W - 3 || y1 > H - 3) return false; for (let j = Math.floor(y0 / cs); j <= Math.floor(y1 / cs); j++) for (let i = Math.floor(x0 / cs); i <= Math.floor(x1 / cs); i++) if (used[j * gw + i]) return false; return true; };
  for (const w of M.walls) mark(w.x0, w.y0, w.x1, w.y1, 3); for (const f of M.floors) mark(f.x0, f.y0, f.x1, f.y1, 3); for (const q of M.ramps) mark(q.x0, q.y0, q.x1, q.y1, 4); for (const t of M.trees) mark(t.x, t.y, t.x, t.y, 2);
  const B = { wall: (x0, y0, x1, y1, lv = 0, kind = 'wall') => M.walls.push({ x0, y0, x1, y1, lv, kind }), floor: (x0, y0, x1, y1, lv, kind = 'roof') => M.floors.push({ x0, y0, x1, y1, lv, kind }) };
  const shed = (x, y, w, h) => {                                        // a little shed: three walls and a door, a roof, loot inside
    const t = 0.3, kind = look === 'canyon' ? 'cliff' : look === 'port' ? 'container' : look === 'suburbs' ? 'house' : 'bldg', door = r() < 0.5 ? 'x' : 'y';
    B.wall(x, y, x + w, y + t, 0, kind); B.wall(x, y + h - t, x + w * 0.35, y + h, 0, kind); B.wall(x + w * 0.65, y + h - t, x + w, y + h, 0, kind); B.wall(x, y, x + t, y + h, 0, kind); if (door === 'x') { B.wall(x + w - t, y, x + w, y + h * 0.35, 0, kind); B.wall(x + w - t, y + h * 0.65, x + w, y + h, 0, kind); } else B.wall(x + w - t, y, x + w, y + h, 0, kind);
    B.floor(x, y, x + w, y + h, 1, 'roof'); M.loot.push([x + w / 2, y + h / 2, 0]); M.deco.push({ t: 'bldg', x, y, w, h, lv: 0, kind }); mark(x, y, x + w, y + h, 3);
  };
  const area = W * H, nShed = Math.round(area / 900), nTree = Math.round(area / (look === 'jungle' ? 60 : look === 'suburbs' ? 160 : look === 'canyon' ? 600 : 260)), nRock = look === 'canyon' ? Math.round(area / 450) : Math.round(area / 1400), nLoot = Math.round(area / 260);
  for (let k = 0, made = 0; k < nShed * 30 && made < nShed; k++) { const w = 5 + Math.round(r() * 2), h = 4 + Math.round(r() * 2), x = 3 + r() * (W - w - 6), y = 3 + r() * (H - h - 6); if (free(x, y, x + w, y + h)) { shed(x, y, w, h); made++; } }
  for (let k = 0, made = 0; k < nRock * 20 && made < nRock; k++) { const s = 1.2 + r() * (look === 'canyon' ? 3.5 : 1.6), x = 3 + r() * (W - 6), y = 3 + r() * (H - 6); if (free(x - s, y - s, x + s, y + s)) { B.wall(x - s / 2, y - s / 2, x + s / 2, y + s / 2, 0, 'cliff'); mark(x - s, y - s, x + s, y + s, 2); made++; } }
  for (let k = 0, made = 0; k < nTree * 10 && made < nTree; k++) { const x = 3 + r() * (W - 6), y = 3 + r() * (H - 6); if (free(x - 1, y - 1, x + 1, y + 1)) { M.trees.push({ x, y, r: 0.45 + r() * 0.25 }); mark(x, y, x, y, 1.5); made++; } }
  for (let k = 0, made = 0; k < nLoot * 10 && made < nLoot; k++) { const x = 3 + r() * (W - 6), y = 3 + r() * (H - 6); if (free(x - 1, y - 1, x + 1, y + 1)) { M.loot.push([x, y, 0]); mark(x, y, x, y, 4); made++; } }
  return free;
}
function brRezGarages(M, W, H, n, seed) {                                  // rez garages: a short tunnel (open front and back) with a sign; bring a rez card inside
  const r = Look.rnd(seed), cs = 2, ok = (x0, y0, x1, y1) => x0 > 4 && y0 > 4 && x1 < W - 4 && y1 < H - 4 && !M.walls.some(w => w.lv === 0 && w.x0 < x1 + 2 && w.x1 > x0 - 2 && w.y0 < y1 + 2 && w.y1 > y0 - 2) && !M.ramps.some(q => q.x0 < x1 + 3 && q.x1 > x0 - 3 && q.y0 < y1 + 3 && q.y1 > y0 - 3) && !M.floors.some(f => f.lv === 1 && f.x0 < x1 + 1 && f.x1 > x0 - 1 && f.y0 < y1 + 1 && f.y1 > y0 - 1) && !M.trees.some(t => t.x > x0 - 2 && t.x < x1 + 2 && t.y > y0 - 2 && t.y < y1 + 2) && !M.rez.some(g => Math.hypot(g.cx - (x0 + x1) / 2, g.cy - (y0 + y1) / 2) < Math.max(W, H) / (n + 1));
  M.rez = [];
  for (let k = 0; k < 600 && M.rez.length < n; k++) {
    const along = r() < 0.5, L = 6, Wd = 4.2, cx = 6 + r() * (W - 12), cy = 6 + r() * (H - 12), x0 = cx - (along ? L : Wd) / 2, y0 = cy - (along ? Wd : L) / 2, x1 = x0 + (along ? L : Wd), y1 = y0 + (along ? Wd : L);
    if (!ok(x0, y0, x1, y1)) continue; const t = 0.35;
    if (along) { M.walls.push({ x0, y0, x1, y1: y0 + t, lv: 0, kind: 'rez' }, { x0, y0: y1 - t, x1, y1, lv: 0, kind: 'rez' }); } else { M.walls.push({ x0, y0, x1: x0 + t, y1, lv: 0, kind: 'rez' }, { x0: x1 - t, y0, x1, y1, lv: 0, kind: 'rez' }); }
    M.rez.push({ x0: x0 + (along ? 0.3 : t), y0: y0 + (along ? t : 0.3), x1: x1 - (along ? 0.3 : t), y1: y1 - (along ? t : 0.3), cx, cy, along });
  }
}
function brBig(key, M, pad, look, seed) {                                  // an original map in the middle of new outskirts
  const W = M.size.width + pad * 2, H = M.size.height + pad * 2, T = brCopy(M, pad, pad); T.name = M.name; T.size = { width: W, height: H }; T.theme = M.theme; T.blurb = M.blurb + ' Now with outskirts all round.'; T.look = look;
  brFill(T, W, H, look, seed); brRezGarages(T, W, H, Math.max(3, Math.round(W * H / 3500)), seed + 1); return T;
}
function brJoin(name, look, theme, blurb, parts, W, H, seed) {             // districts side by side, with country in between
  const T = { walls: [], floors: [], ramps: [], trees: [], loot: [], deco: [] }; for (const [M, ox, oy] of parts) brCopy(M, ox, oy, T); if (brJoin.pre) brJoin.pre(T);   /* (v14.3.5: the roads are kept clear before the country is filled in) */
  Object.assign(T, { name, size: { width: W, height: H }, theme, blurb, look }); brFill(T, W, H, look, seed); brRezGarages(T, W, H, Math.max(4, Math.round(W * H / 3500)), seed + 1); return T;
}
{ const O = { ...BR_MAPS }, P = 22; globalThis.BR_BASE = O;   /* (the original compact maps, for building bigger ones: modes_br_maps.js) */
  for (const [k, look] of [['downtown', 'downtown'], ['jungle', 'jungle'], ['port', 'port'], ['suburbs', 'suburbs'], ['canyon', 'canyon']]) BR_MAPS[k] = brBig(k, O[k], P, look, k.length * 97);
  BR_MAPS.island = brJoin('Volt Island', 'suburbs', O.suburbs.theme, 'The big one: Downtown, the Jungle, the Suburbs and the Canyon on one island, with farmland in between.', [[O.downtown, 14, 14], [O.jungle, 104, 10], [O.suburbs, 12, 102], [O.canyon, 100, 98]], 186, 184, 4242);
  BR_MAPS.metro = brJoin('Twin Cities', 'downtown', O.downtown.theme, 'Downtown and the Port, joined by an industrial strip.', [[O.downtown, 12, 14], [O.port, 100, 16]], 186, 96, 777);
  BR_MAPS.wilds = brJoin('The Wilds', 'jungle', O.jungle.theme, 'The Jungle and the Canyon, with wild country between them.', [[O.jungle, 10, 12], [O.canyon, 106, 10]], 192, 96, 31337);
  BR_MAPS.sprawl = brJoin('Suburban Sprawl', 'suburbs', O.suburbs.theme, 'Two suburbs and a mall district: lots of houses to loot.', [[O.suburbs, 10, 10], [O.suburbs, 92, 30]], 170, 108, 99);
}
const BR_MAP_KEYS = Object.keys(BR_MAPS);
{ const o = GAME_INFO.br.opts.find(x => x.key === 'map'); o.values = ['random', ...BR_MAP_KEYS]; o.names = ['Random (a new map each game)', ...BR_MAP_KEYS.map(k => `${BR_MAPS[k].name} (${BR_MAPS[k].size.width} x ${BR_MAPS[k].size.height} m)`)]; o.def = 'random'; o.hint = () => { const k = modeOpts('br').map; return k === 'random' || !BR_MAPS[k] ? 'Every game picks one of the ' + BR_MAP_KEYS.length + ' maps at random.' : BR_MAPS[k].blurb; }; }
{ const mc = miniCfg; miniCfg = function (kind, ...a) { const c = mc(kind, ...a); if (c && kind === 'br' && (!c.map || c.map === 'random' || !BR_MAPS[c.map])) c.map = BR_MAP_KEYS[Math.floor(Math.random() * BR_MAP_KEYS.length)]; return c; }; }   // Random: pick now, once (everyone online gets the same one)
GAME_INFO.br.court = mini => (BR_MAPS[mini && mini.map] || BR_MAPS.downtown).size;
GAME_INFO.br.label = cfg => `${cfg.map === 'random' ? 'Random map' : (BR_MAPS[cfg.map] || BR_MAPS.downtown).name}, ${['solo', 'duos', 'trios'][(cfg.squad || 1) - 1]}`;

/* ---------- the game ---------- */
{ const M0 = { ...MODES.br }, BRm = MODES.br;
  const mates = (m, c) => m.chairs.filter(o => o !== c && !o.out && o.gs.team === c.gs.team);
  const gunOf = c => { const it = c.gs.inv[c.gs.sel]; return it && !c.gs.hol && BR_GUNS[it.k] ? it : null; };
  Object.assign(BRm, {
    init(m) {
      M0.init.call(this, m); const g = m.gs, M = this.map(m), k = Math.max(1, M.size.width * M.size.height / 4096);
      g.L = g.L.filter(L => L[1] === 'chest' || L[1] === 'ammo'); g.gar = (M.rez || []).map(() => 0);
      for (let i = 0; i < Math.round(30 * k); i++) { const p = this.freeGround(m); if (p) this.drop(m, p.x, p.y, 0, this.pickLoot()); }   // loot lying in the open
      for (let i = 0; i < Math.round(8 * k); i++) { const p = this.freeGround(m); if (p) this.drop(m, p.x, p.y, 0, Math.random() < 0.6 ? 'chest' : 'ammo'); }
      this.squads(m);
      for (const c of m.chairs) Object.assign(c.gs, { am: [0, 0, 0, 0, 0], hol: 0, last: 0, rl: 0, use: null, down: 0, dhp: 0, rv: 0, rvk: -1, cards: [], rz: 0 });
      g.stage = 0; g.warn = 0;
    },
    /* squads: people in the same party (online) or picked for the same squad (on this screen) play together; the CPU fills the rest */
    squads(m) {
      const sq = m.mini.squad || 1; if (sq < 2) return; const people = m.chairs.filter(c => c.player), cpu = m.chairs.filter(c => !c.player), groups = new Map();
      for (const c of people) { const key = c.player.squadKey || (c.player.squad ? 'local' + c.player.squad : 'p' + (c.player.id != null ? c.player.id : c.k)); (groups.get(key) || groups.set(key, []).get(key)).push(c); }
      let t = 0; const teams = [], fill = [];
      for (const [key, list] of groups) { if (key === 'mm' || key.startsWith('fill:')) { for (let i = 0; i < list.length; i += sq) fill.push(list.slice(i, i + sq)); continue; } for (let i = 0; i < list.length; i += sq) teams.push(list.slice(i, i + sq)); }
      /* v14.3.1 public matches with FILL: parties and solo players who said "fill" share squads (biggest groups first); NO FILL groups keep their own squad */
      fill.sort((a, b) => b.length - a.length); const open = []; for (const grp of fill) { const tm = open.find(x => x.length + grp.length <= sq); if (tm) tm.push(...grp); else { const nt = grp.slice(); open.push(nt); teams.push(nt); } }
      for (const team of teams) while (team.length < sq && cpu.length) team.push(cpu.shift());
      while (cpu.length) teams.push(cpu.splice(0, sq));
      for (const team of teams) { for (const c of team) c.gs.team = t; t++; } m.gs.teams = t;
    },
    pickLoot() { let tot = 0; for (const [, w] of BR_LOOT) tot += w; let r = Math.random() * tot; for (const [k, w] of BR_LOOT) { if ((r -= w) <= 0) return k; } return 'band'; },
    drop(m, x, y, lv, k, a) {
      k = k || (lv > 0 && Math.random() < 0.6 ? ['rifle', 'sniper', 'rocket', 'armour', 'shotgun', 'medkit', 'fullkit'][Math.floor(Math.random() * 7)] : this.pickLoot());   // the high ground has the better loot
      if (a === undefined) a = BR_GUNS[k] ? BR_GUNS[k].mag : BR_ITEMS[k] ? BR_ITEMS[k].pick : k.startsWith('am_') ? BR_AMMO[k.slice(3)].pack : 0;
      const g = m.gs; g.L.push([++g.lid, k, MG.r2(x), MG.r2(y), lv, a]); return g.L[g.L.length - 1];
    },
    /* ---- picking things up ---- */
    take(m, c, L) {
      const G = c.gs, [, k, , , , a] = L, inv = G.inv;
      if (G.down) return false;
      if (k === 'card') { if (m.chairs[a] && m.chairs[a].gs.team === G.team && m.chairs[a] !== c) { G.cards.push(a); if (c.player) { this.psfx(m, c, 'select'); this.say(m, c, `${MG.up(m.name(m.chairs[a]))}'S REZ CARD: TAKE IT TO A REZ GARAGE`); } MG.notice(m, `${MG.up(m.name(c))} HAS ${MG.up(m.name(m.chairs[a]))}'S REZ CARD`, 1.6); return true; } return false; }
      if (k === 'chest') {                                                // a chest bursts open: a gun with ammo for it, often a heal
        if (c.player && !c.player.remote) Progress.ev('chest');
        const gun = (L[4] > 0 && Math.random() < 0.6 ? ['rifle', 'sniper', 'rocket', 'shotgun'] : ['pistol', 'pistol', 'smg', 'smg', 'shotgun', 'rifle', 'rifle', 'sniper', 'rocket'])[Math.floor(Math.random() * (L[4] > 0 ? 4 : 9))];
        const a0 = c.heading + Math.PI, out = (k2, n) => this.drop(m, L[2] + Math.cos(a0 + n) * 1.2, L[3] + Math.sin(a0 + n) * 1.2, L[4], k2);
        out(gun, -0.6); out('am_' + BR_GUNS[gun].type, 0); if (Math.random() < 0.75) out(['band', 'band', 'plate', 'plate', 'medkit', 'armour', 'boost', 'wall', 'fullkit'][Math.floor(Math.random() * 9)], 0.6);
        m.sfx('select'); MG.add(m, { t: 'boom', x: L[2], y: L[3], z: L[4] * BR.H, life: 0.5, wave: 1 }); if (c.player) this.say(m, c, 'CHEST OPENED'); return true;
      }
      if (k === 'ammo') {                                                 // an ammo crate: ammo for the guns you have, and some of another kind
        const types = new Set(inv.filter(it => BR_GUNS[it.k]).map(it => BR_GUNS[it.k].type)); types.add(AMMO_KEYS[Math.floor(Math.random() * 4)]); let got = [];
        for (const t of types) { const A = BR_AMMO[t], before = G.am[A.i]; G.am[A.i] = Math.min(A.max, G.am[A.i] + A.pack * 2); if (G.am[A.i] > before) got.push(A.name); }
        if (c.player) this.say(m, c, got.length ? 'AMMO CRATE: ' + got.join(', ') : 'AMMO FULL'); if (got.length) m.sfx('select'); return got.length > 0;
      }
      if (k.startsWith('am_')) { const A = BR_AMMO[k.slice(3)]; if (!A || G.am[A.i] >= A.max) return false; const n = Math.min(a, A.max - G.am[A.i]); G.am[A.i] += n; L[5] -= n; if (c.player) { this.psfx(m, c, 'blip'); this.say(m, c, `+${n} ${A.name}`); } return L[5] <= 0 || (L[5] > 0 && false); }
      const same = inv.find(it => it.k === k);
      if (BR_GUNS[k] && same) { const A = BR_AMMO[BR_GUNS[k].type]; if (G.am[A.i] >= A.max || a <= 0) return false; G.am[A.i] = Math.min(A.max, G.am[A.i] + a); if (c.player) this.say(m, c, `+${a} ${A.name}`); return true; }   // the same gun again: its bullets
      if (BR_ITEMS[k] && same && same.a < BR_ITEMS[k].stack) { const n = Math.min(a, BR_ITEMS[k].stack - same.a); same.a += n; L[5] -= n; if (c.player) this.say(m, c, `${BR_ITEMS[k].name} x${same.a}`); return L[5] <= 0; }
      if (inv.length >= BR.slots) { if (c.player && !(G.fullAt > m.simTime)) { G.fullAt = m.simTime + 2.5; this.say(m, c, 'BAG FULL: X swaps it for what you hold'); } G.swapL = L[0]; return false; }
      inv.push({ k, a: BR_ITEMS[k] ? Math.min(a, BR_ITEMS[k].stack) : a }); if (BR_ITEMS[k] && a > BR_ITEMS[k].stack) { L[5] = a - BR_ITEMS[k].stack; return false; }
      if (c.player) { this.psfx(m, c, 'select'); this.say(m, c, (BR_GUNS[k] || BR_ITEMS[k]).name); if (G.hol) { G.last = inv.length - 1; } }
      if (!c.player) G.sel = this.bestSlot(c, 99);
      return true;
    },
    swap(m, c) {                                                          // B (bag full): swap what you hold for the thing you are sitting on
      const G = c.gs, L = m.gs.L.find(x => x[0] === G.swapL), it = G.inv[G.sel]; if (!L || !it || G.hol || Math.hypot(L[2] - c.x, L[3] - c.y) > R_CART() + 0.6) return false;
      m.gs.L = m.gs.L.filter(x => x !== L); G.inv[G.sel] = { k: L[1], a: L[5] }; const d = this.drop(m, c.x, c.y, G.lv, it.k, it.a); d[6] = MG.r2(m.gs.t + 2.5); d[7] = c.k; G.swapL = 0; m.sfx('select'); if (c.player) this.say(m, c, (BR_GUNS[L[1]] || BR_ITEMS[L[1]]).name); return true;
    },
    /* ---- holding things: Y puts your item away (faster driving), Y again takes the last one out; LB / RB step through ---- */
    holster(c, m) { const G = c.gs; if (c.out || G.down) return; G.use = null; G.rl = 0; if (G.hol) { G.hol = 0; if (G.inv[G.last]) G.sel = G.last; } else { G.hol = 1; G.last = G.sel; } if (c.player) this.psfx(m, c, 'blip'); },
    cycle(c, m, d = 1) { const G = c.gs; if (!G.inv.length || c.out || G.down) return; G.use = null; G.rl = 0; if (G.hol) { G.hol = 0; G.sel = Math.min(G.last, G.inv.length - 1); } else G.sel = (G.sel + (d < 0 ? G.inv.length - 1 : 1)) % G.inv.length; if (c.player) this.psfx(m, c, 'blip'); },
    reload(c, m) {
      const G = c.gs, it = gunOf(c); if (!it || G.rl > 0 || G.down || G.use) return; const gun = BR_GUNS[it.k], A = BR_AMMO[gun.type];
      if (it.a >= gun.mag) return; if (G.am[A.i] <= 0) { if (c.player && !(G.noAmmoAt > m.simTime)) { G.noAmmoAt = m.simTime + 2; this.say(m, c, 'NO ' + A.name); m.sfx('back'); } return; }
      G.rl = gun.rl; G.rlT = gun.rl; G.rlS = G.sel; G.rlN = 0; if (c.player) this.psfx(m, c, 'rl_' + it.k);
    },
    /* ---- RT: fire, or start using a heal (it takes time); boosts and walls are instant ---- */
    use(c, m) {
      const G = c.gs; if (c.out || G.down || G.use) return; if (G.hol) { this.holster(c, m); return; }
      const it = G.inv[G.sel]; if (!it || G.cd > 0) return; const gun = BR_GUNS[it.k];
      if (gun) { if (G.rl > 0 && gun.shell && it.a > 0) G.rl = 0;   /* a shotgun can fire part-way through loading */
        if (G.rl > 0) return; if (it.a <= 0) { this.reload(c, m); G.cd = 0.25; return; } const a0 = it.a, r = M0.use.call(this, c, m); if (it.a < a0) { G.shotT = m.gs.t; G.shotN = (G.shotN || 0) + 1; } return r; }   // (shotT: the recoil)
      const I = BR_ITEMS[it.k]; if (!I) return;
      if (I.heal) { if (!this.helps(c, I)) { if (c.player) this.say(m, c, I.hp && !I.sh ? (G.hp >= (I.cap || 100) ? (I.cap < 100 ? 'BANDAGES ONLY HEAL UP TO 75' : 'HEALTH IS FULL') : '') : I.shCap && G.sh >= I.shCap && G.sh < BR.maxShield ? `PLATES ONLY GO UP TO ${I.shCap}` : 'CART ARMOUR IS FULL'); G.cd = 0.5; return; } G.use = { k: it.k, s: G.sel, left: I.time, tot: I.time, tk: -1 }; m.sfx('blip'); return; }
      if (it.k === 'boost') { G.boost = 3; c.vx += Math.cos(c.heading) * 2.2; c.vy += Math.sin(c.heading) * 2.2; } else if (it.k === 'wall') { const p = c.toWorld(1.6, 0); MG.add(m, { t: 'dwall', x: MG.r2(p.x), y: MG.r2(p.y), a: MG.r2(c.heading), lv: G.lv, z: G.z, hp: 150, until: m.gs.t + 25 }); }
      m.sfx('select'); G.cd = 0.8; this.spend(c, G.sel);
    },
    helps(o, I) { const G = o.gs; return (I.hp && G.hp < (I.cap || 100)) || (I.sh && G.sh < (I.shCap || BR.maxShield)); },
    spend(c, slot) { const G = c.gs, it = G.inv[slot]; if (!it) return; it.a--; if (it.a <= 0) { G.inv.splice(slot, 1); G.sel = Math.max(0, Math.min(G.sel, G.inv.length - 1)); G.last = Math.min(G.last, Math.max(0, G.inv.length - 1)); } },
    healMate(c, m) {                                                       // LT with a heal: use it on the nearest team-mate who needs it
      const G = c.gs, it = G.inv[G.sel], I = it && BR_ITEMS[it.k]; if (!I || !I.heal || G.use || G.hol || G.down || c.out) return false;
      const t = mates(m, c).filter(o => !o.gs.down && MH.dist(c, o) < BR.mateRange && Math.abs(o.gs.z - G.z) < 1 && this.helps(o, I)).sort((a, b) => MH.dist(c, a) - MH.dist(c, b))[0];
      if (!t) { if (c.player && !(G.mateMsg > m.simTime)) { G.mateMsg = m.simTime + 2; this.say(m, c, 'NO TEAM-MATE CLOSE ENOUGH WHO NEEDS IT'); } return false; }
      G.use = { k: it.k, s: G.sel, left: I.time, tot: I.time, tk: t.k }; m.sfx('blip'); if (t.player) this.say(m, t, `${MG.up(m.name(c))} IS PATCHING YOU UP`); return true;
    },
    cmd(c, cmd, m) {
      const G = c.gs; if (c.player && c.player.invOpen) return { x: 0, y: 0, spin: 0, speed: 0 };
      if (G.boost > 0) c.speedMul *= 1.75; if (G.ads && gunOf(c)) c.speedMul *= 0.55; if (G.hol) c.speedMul *= BR.holsterSpeed; if (G.use) c.speedMul *= BR.useSpeed; if (G.down) c.speedMul *= BR.downSpeed;
      if (G.rv) return { ...cmd, speed: 0 };                               // reviving: you stay put
      return cmd;
    },
    /* ---- every step ---- */
    step(m, h) {
      const g = m.gs, M = this.map(m);
      for (const c of m.chairs) {                                         // input from people: B held (revive / swap)
        const G = c.gs; if (c.out) continue; if (G.down) c.wantUse = false;
        if (c.intPress) { c.intPress = false; if (!G.down && G.swapL && !this.reviveTarget(m, c)) this.swap(m, c); }
      }
      M0.step.call(this, m, h);
      for (const c of m.chairs) {
        const G = c.gs; if (c.out) continue;
        if (G.rl > 0) { const it = G.inv[G.rlS]; if (!it || G.sel !== G.rlS || G.hol || G.down) G.rl = 0; else if ((G.rl -= h) <= 0) { const gun = BR_GUNS[it.k], A = BR_AMMO[gun.type], n = Math.min(gun.shell ? 1 : gun.mag - it.a, G.am[A.i]); it.a += n; G.am[A.i] -= n; G.rl = 0;
          if (gun.shell) { G.rlN = (G.rlN || 0) + 1; if (it.a < gun.mag && G.am[A.i] > 0) { G.rl = G.rlT = gun.rl; if (c.player) this.psfx(m, c, 'rl_shell'); } else { G.pumpT = m.gs.t; if (c.player) this.psfx(m, c, 'rl_pump'); } } } }   // shell by shell, then a pump
        if (G.use) { const U = G.use, it = G.inv[U.s], t = U.tk >= 0 ? m.chairs[U.tk] : c;   // a heal in progress (on you or a team-mate)
          if (!it || it.k !== U.k || G.sel !== U.s || G.hol || G.down || !t || t.out || t.gs.down || (t !== c && (MH.dist(c, t) > BR.mateRange + 0.5 || (c.player && U.tk >= 0 && !G.ads)))) { if (it && it.k === U.k && U.left < U.tot) this.spend(c, U.s); G.use = null; }   // stopped part-way: what went on stays on, and the item is used up
          else { const I = BR_ITEMS[U.k], T = t.gs, f = Math.min(h, U.left) / U.tot;   // health and armour go on bit by bit while you apply it
            if (I.hp && T.hp < (I.cap || 100)) T.hp = Math.min(I.cap || 100, T.hp + I.hp * f); if (I.sh && T.sh < (I.shCap || BR.maxShield)) T.sh = Math.min(I.shCap || BR.maxShield, T.sh + I.sh * f);
            if ((U.left -= h) <= 0) { T.hp = Math.round(T.hp); T.sh = Math.round(T.sh); this.spend(c, U.s); G.use = null; m.sfx('select'); if (t !== c && c.player && !c.player.remote) Progress.ev('healMate'); } } }
        else if (G.ads && !c.wantAdsUsed) { const it = G.inv[G.sel]; if (it && BR_ITEMS[it.k] && BR_ITEMS[it.k].heal) { c.wantAdsUsed = true; this.healMate(c, m); } }
        if (!G.ads) c.wantAdsUsed = false;
        if (G.down) { if (!(G.srz > 0 || G.rvN > 0 || m.chairs.some(o => o.gs && o.gs.rvk === c.k && o.gs.rv > 0))) G.dhp -= BR.downHp / BR.bleed * h;   /* (v14.1.5: no bleeding while a team-mate revives you or you're getting yourself up at a rez garage; storm and hits still hurt) */ if (G.dhp <= 0) this.finish(m, c, m.chairs[G.kb] || null); continue; }
        const rt = c.wantInt ? this.reviveTarget(m, c) : null;           // reviving: hold B next to a downed team-mate
        if (rt) { if (G.rvk !== rt.k) { G.rvk = rt.k; G.rv = 0; } G.rv += h / BR.reviveTime; if (G.rv >= 1) { Object.assign(rt.gs, { down: 0, dhp: 0, hp: BR.reviveHp }); G.rv = 0; G.rvk = -1; m.sfx('select'); MG.notice(m, `${MG.up(m.name(c))} REVIVED ${MG.up(m.name(rt))}`, 1.8); if (c.player && !c.player.remote) Progress.ev('revive'); } }
        else { G.rv = 0; G.rvk = -1; }
        if (G.cards.length) {                                             // carrying rez cards: sit in a ready rez garage to bring them back
          const i = (M.rez || []).findIndex(q => c.x > q.x0 && c.x < q.x1 && c.y > q.y0 && c.y < q.y1 && G.lv === 0);
          if (i >= 0 && g.gar[i] <= g.t) { G.rz += h; if (G.rz >= BR.rezTime) this.rez(m, c, i); } else G.rz = 0;
        } else G.rz = 0;
      }
      for (const L of g.L) if (L[1] === 'card' && L[8] && g.t > L[8]) { L[8] = -1; const o = m.chairs[L[5]]; if (o) MG.notice(m, `${MG.up(m.name(o))}'S REZ CARD HAS EXPIRED`, 1.6); }
      g.L = g.L.filter(L => !(L[1] === 'card' && L[8] === -1) && !(L[1] === 'card' && (!m.chairs[L[5]] || !mates(m, m.chairs[L[5]]).length)));
    },
    reviveTarget(m, c) { const G = c.gs; if (G.down || c.out) return null; return mates(m, c).filter(o => o.gs.down && MH.dist(c, o) < 2.4 && Math.abs(o.gs.z - G.z) < 1).sort((a, b) => MH.dist(c, a) - MH.dist(c, b))[0] || null; },
    rez(m, c, i) {
      const g = m.gs, q = this.map(m).rez[i], back = c.gs.cards.map(k => m.chairs[k]).filter(o => o && o.out);
      back.forEach((o, j) => { o.out = false; o.binLeft = 0; m.order = (m.order || []).filter(x => x !== o); g.dead = g.dead.filter(k => k !== o.k); const x = q.cx + (j - (back.length - 1) / 2) * 1.4, y = q.cy;
        Object.assign(o, { x, y, px: x, py: y, vx: 0, vy: 0 }); Object.assign(o.gs, { hp: 50, sh: 0, inv: [], sel: 0, am: [12, 0, 0, 0, 0], hol: 1, last: 0, rl: 0, use: null, down: 0, dhp: 0, rv: 0, rvk: -1, cards: [], rz: 0, lv: 0, z: 0, ramp: -1, air: 0, vz: 0, by: -1 }); });
      c.gs.cards = []; c.gs.rz = 0; g.gar[i] = MG.r2(g.t + BR.rezCool); m.sfx('goal');
      if (back.length) { MG.notice(m, `${back.map(o => MG.up(m.name(o))).join(' + ')} ${back.length > 1 ? 'ARE' : 'IS'} BACK!`, 2.2); m.line(`${back.map(o => m.name(o)).join(' and ')} ${back.length > 1 ? 'are' : 'is'} back in the game!`); if (c.player && !c.player.remote) Progress.ev('rez'); }
    },
    /* ---- getting hurt: a team-mate left standing means you go DOWN first (last stand) ---- */
    hurt(m, c, dmg, by, storm) {
      const G = c.gs; if (c.out || (!storm && m.gs.t < BR.grace)) return;
      if (storm) { G.sacc = (G.sacc || 0) + dmg; if (G.sacc < 1) return; dmg = G.sacc; G.sacc = 0; }   /* the storm hurts health only (never armour), a point at a time */
      if (G.down) { G.dhp -= dmg; if (by && by !== c) { by.gs.dmg += dmg; by.gs.hm = MG.r2(m.gs.t); G.kb = by.k; } G.hitT = 0.25; if (G.dhp <= 0) this.finish(m, c, by && by !== c ? by : m.chairs[G.kb] || null); return; }
      if (!storm) { const s = Math.min(G.sh, dmg); G.sh -= s; dmg -= s; } G.hp -= dmg; G.hitT = 0.25; if (by && by !== c) { by.gs.dmg += dmg; by.gs.hm = MG.r2(m.gs.t); G.hurtAt = m.gs.t; }
      if (G.hp > 0) return; G.hp = 0;
      const standing = mates(m, c).filter(o => !o.gs.down);
      if ((m.mini.squad || 1) > 1 && standing.length) {                   // DOWN: crawl, can't fire or use things; a team-mate can revive you (hold B); bleed out in 30 s
        Object.assign(G, { down: 1, dhp: BR.downHp, hp: 0, sh: 0, use: null, rl: 0, rv: 0, rvk: -1, hol: 1, kb: by && by !== c ? by.k : -1 }); G.last = G.sel; c.wantUse = false;
        m.sfx('foul'); MG.notice(m, by && by !== c ? `${MG.up(m.name(by))} KNOCKED DOWN ${MG.up(m.name(c))}` : `${MG.up(m.name(c))} IS DOWN`, 1.8);
        const feed = m.gs.feed || (m.gs.feed = []); feed.push([by && by !== c ? m.name(by) : '', m.name(c), 'down', MG.r2(m.gs.t), by ? by.gs.team : -1, G.team]); if (feed.length > 5) feed.shift();
        return;
      }
      this.finish(m, c, by && by !== c ? by : null);
    },
    finish(m, c, by) {                                                    // eliminated: everything is dropped, and (with a team-mate still in) a rez card
      if (c.out) return; const G = c.gs, team = G.team, hp0 = G.hp; G.hp = 0; G.down = 0;
      const drops = G.am.map((n, i) => [AMMO_KEYS[i], n]).filter(([, n]) => n > 0);
      G.inv.forEach((it, i) => this.drop(m, c.x + Math.cos(i * 1.3) * 0.9, c.y + Math.sin(i * 1.3) * 0.9, G.lv, it.k, it.a)); G.inv = [];
      drops.forEach(([t, n], i) => this.drop(m, c.x + Math.cos(i * 1.3 + 0.6) * 1.3, c.y + Math.sin(i * 1.3 + 0.6) * 1.3, G.lv, 'am_' + t, n)); G.am = [0, 0, 0, 0, 0];
      for (const k of G.cards) { const L = this.drop(m, c.x, c.y + 0.6, G.lv, 'card', k); L[8] = MG.r2(m.gs.t + BR.cardLife); } G.cards = [];
      if ((m.mini.squad || 1) > 1 && mates(m, c).length) { const L = this.drop(m, c.x, c.y, G.lv, 'card', c.k); L[8] = MG.r2(m.gs.t + BR.cardLife); }
      G.hp = 1; G.sh = 0; M0.hurt.call(this, m, c, 999, by, true);   // (the original elimination: feed, notices, the end of the game)
      const left = m.chairs.filter(o => !o.out && o.gs.team === team);    // the whole team down? then they are all out
      if (left.length && left.every(o => o.gs.down)) for (const o of left) this.finish(m, o, m.chairs[o.gs.kb] || null);
    },
    /* ---- the storm: stages, each closing faster and hurting more; warnings and announcements ---- */
    storm(m, h) {
      const S = m.gs.st, g = m.gs, ph = S.ph, wait0 = S.wait; M0.storm.call(this, m, h);
      if (S.wait > 0 && wait0 > 30 && S.wait <= 30) { MG.notice(m, `STORM STAGE ${S.ph + 1}: CLOSING IN 30 SECONDS`, 2.2); m.line(`Storm stage ${S.ph + 1} closes in thirty seconds. Head for the safe zone.`); }
      if (S.wait > 0 && wait0 > 10 && S.wait <= 10) { MG.notice(m, `STORM STAGE ${S.ph + 1}: 10 SECONDS!`, 2); }
      if (wait0 > 0 && S.wait <= 0 && S.shrink > 0) { g.stage = S.ph + 1; m.line(`Storm stage ${S.ph + 1}! The storm is closing in, and it hurts more now.`); }
      if (S.ph > ph) MG.notice(m, S.ph >= 6 ? 'FINAL STORM: NOWHERE IS SAFE' : `STAGE ${ph + 1} DONE. NEXT STAGE IN ${Math.ceil(S.wait)} SECONDS`, 2);
    },
    /* ---- the CPU: heal properly, reload, revive team-mates, carry rez cards to a garage ---- */
    ai(c, m) {
      const G = c.gs, g = m.gs; if (c.out) return { x: 0, y: 0, speed: 0 };
      c.wantInt = false;
      if (G.down) { const t = mates(m, c).filter(o => !o.gs.down).sort((a, b) => MH.dist(c, a) - MH.dist(c, b))[0]; return t && MH.dist(c, t) > 1.8 ? MH.to(c, t.x, t.y, 0.9) : { x: 0, y: 0, speed: 0 }; }   // (crawl to a team-mate, then keep still while they revive you)
      if (G.use) return { x: Math.cos(c.heading), y: Math.sin(c.heading), speed: 0.2 };
      const foeNear = MG.live(m).some(o => o.gs.team !== G.team && MH.dist(c, o) < 12 && Math.abs(o.gs.z - G.z) < 1);
      if (G.hol && G.inv.length) { G.hol = 0; G.sel = Math.min(G.last, G.inv.length - 1); }
      const held = G.inv[G.sel]; if (held && BR_GUNS[held.k] && held.a <= 0 && G.rl <= 0) this.reload(c, m);
      const attacked = (G.hurtAt !== undefined && g.t - G.hurtAt < 2.5) || MG.live(m).some(o => o.gs.team !== G.team && !o.gs.down && MH.dist(c, o) < 10 && Math.abs(o.gs.z - G.z) < 1);
      const dn = mates(m, c).filter(o => o.gs.down).sort((a, b) => MH.dist(c, a) - MH.dist(c, b))[0];   // a team-mate down and nobody shooting at you: go and revive them
      if (dn && !attacked && MH.dist(c, dn) < 80 && G.hp >= 25 && !(G.inStorm && !(G.hp > 50 && G.rv > 0.5))) {   /* (v14.2: in the storm, only finish a revive that's nearly done with health to spare) */
        if (MH.dist(c, dn) < 2 && Math.abs(dn.gs.z - G.z) < 1) { c.wantInt = true; return { x: dn.x - c.x, y: dn.y - c.y, speed: 0 }; }
        const save = c.goTo; c.goTo = { x: dn.x, y: dn.y, lv: dn.gs.lv }; const out = M0.ai.call(this, c, m); c.goTo = save; if (out && MH.dist(c, dn) < 6 && !(out.speed > 0.3)) { const a = Math.atan2(dn.y - c.y, dn.x - c.x); return { x: Math.cos(a), y: Math.sin(a), speed: 0.6 }; } return out;
      }
      if (!foeNear) {                                                      // heal up when it is calm
        const find = ks => G.inv.findIndex(it => ks.includes(it.k));
        const want = G.hp < 40 ? find(['medkit', 'fullkit', 'band']) : G.hp < 75 ? find(['band', 'medkit']) : G.sh < 50 ? find(['armour', 'plate', 'fullkit']) : -1;
        if (want >= 0 && G.cd <= 0 && this.helps(c, BR_ITEMS[G.inv[want].k])) { G.sel = want; c.wantUse = true; return { x: Math.cos(c.heading), y: Math.sin(c.heading), speed: 0.15 }; }
        /* (reviving is handled above, when nobody is attacking) */
        const card = g.L.find(L => L[1] === 'card' && m.chairs[L[5]] && m.chairs[L[5]].gs.team === G.team && Math.hypot(L[2] - c.x, L[3] - c.y) < 60);
        const M = this.map(m), gi = (M.rez || []).map((q, i) => ({ q, i })).filter(o => g.gar[o.i] <= g.t).sort((a, b) => Math.hypot(a.q.cx - c.x, a.q.cy - c.y) - Math.hypot(b.q.cx - c.x, b.q.cy - c.y))[0];
        const save = c.goTo; if (card) c.goTo = { x: card[2], y: card[3], lv: card[4] }; else if (G.cards.length && gi) c.goTo = { x: gi.q.cx, y: gi.q.cy, lv: 0 };
        const out = M0.ai.call(this, c, m); c.goTo = save; return out;
      }
      return M0.ai.call(this, c, m);
    },
    bestSlot(c, d) { const inv = c.gs.inv; let best = -1, bs = -1; inv.forEach((it, i) => { const g = BR_GUNS[it.k]; if (!g || (it.a <= 0 && c.gs.am[BR_AMMO[g.type].i] <= 0)) return; const s = (d <= g.range ? 10 : 2) + g.dmg * (g.pellets || 1) / g.cd / 20 - Math.max(0, d - g.range) * 0.5; if (s > bs) { bs = s; best = i; } }); return best < 0 ? c.gs.sel : best; },
    invAct(c, act, m) {
      const G = c.gs; if (act && act.op === 'ammo' && !c.out) { const t = AMMO_KEYS[act.a], A = BR_AMMO[t]; if (A && G.am[A.i] > 0) { const n = Math.min(G.am[A.i], A.pack), q = c.toWorld(-1.3, 0), L = this.drop(m, q.x, q.y, G.lv, 'am_' + t, n); G.am[A.i] -= n; L[6] = MG.r2(m.gs.t + 2.5); L[7] = c.k; if (typeof brToss === 'function') brToss(this, m, c, L); m.sfx('back'); } return; }
      G.use = null; G.rl = 0; return M0.invAct.call(this, c, act, m);
    },
    tag(c, m, vp) {                                                       // team-mates: name, health, down / carrying a card (enemies: nothing, no tags through walls)
      const me = vp && vp.p && vp.p.chair; if (c.out) return '';
      if (me && c.gs.team === me.gs.team && c !== me) return `${MG.pname(c) || m.name(c)}${c.gs.down ? '  ✚ DOWN' : ''}${c.gs.cards && c.gs.cards.length ? '  🎴' : ''}`;
      return !vp && c.player ? MG.pname(c) : '';
    },
    hud(m) { const o = M0.hud.call(this, m), S = m.gs.st; o.mid = S.ph >= 6 ? 'FINAL STORM' : S.wait > 0 ? `Storm stage ${S.ph + 1} in` : `STORM STAGE ${S.ph + 1}: MOVING`; return o; },
    itemLine(c, m) {
      const G = c.gs; if (c.out) return 'ELIMINATED: spectating'; if (G.down) return `DOWN!  ✚ ${Math.ceil(G.dhp)}   Crawl to a team-mate: they hold B next to you to revive you`;
      const it = G.inv[G.sel], gun = it && BR_GUNS[it.k];
      return G.hol || !it ? 'Nothing in hand (driving faster)    Y: take out your last item' : gun ? `${gun.name}  ${it.a}/${gun.mag}  (${G.am[BR_AMMO[gun.type].i]} ${BR_AMMO[gun.type].name.toLowerCase()})` : `${BR_ITEMS[it.k].name} x${it.a}: ${BR_ITEMS[it.k].about}`;
    }
  });
  BRm.shooterPad = true; BRm.jumpOnA = true;
}

/* ---------- controls ----------
   Volt Royale: RT fire / use · LT aim (or heal a team-mate when you hold a heal) · A jump (hold: drift) · X reload · Y put away / take out
   LB RB switch item · B (hold) revive, or swap with what you're sitting on · D-pad ▲ tap: bag, hold: emote wheel.
   Keyboard + mouse: left click fire, right click aim, mouse wheel switch item. */
const Mouse = {
  left: 0, right: 0, wheel: 0, on: false,
  init() {
    if (this.on || typeof window === 'undefined') return; this.on = true; const inGame = () => { const g = window.voltGame; return g && g.scene.isActive('Game') && !g.scene.isActive('Pause') && !g.scene.isActive('BRInv') && g.scene.getScene('Game').match && g.scene.getScene('Game').match.kind === 'br'; };
    window.addEventListener('mousedown', e => { if (e.target && e.target.tagName === 'CANVAS' && inGame()) { if (e.button === 0) this.left = 1; if (e.button === 2) this.right = 1; } });
    window.addEventListener('mouseup', e => { if (e.button === 0) this.left = 0; if (e.button === 2) this.right = 0; });
    window.addEventListener('wheel', e => { if (inGame()) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    window.addEventListener('contextmenu', e => { if (inGame()) e.preventDefault(); });
    window.addEventListener('blur', () => { this.left = this.right = 0; });
  },
  for(src, sc) { return src && (src.id === 'kb1' || (sc && sc.online && src === Controls.mine)) ? this : null; }
};
Mouse.init();
/* a person on this device (or the host's own players): what their buttons do in Volt Royale */
function brPadInput(sc, m, p, src, dt) {
  const M = MODES.br, c = p.chair; if (!c || !src || p.invOpen) return; const H = src.held || {}, P = src.pressed || {}, ms = Mouse.for(src, sc);
  if (src.bagTap) { src.bagTap = false; if (!c.out && !c.gs.down && m.state === 'play') sc.openInventory(p); return; }
  if (c.out) { if (P.y) sc.brTakeOver(p); return; }                  // spectating: Y takes over the CPU team-mate you are watching
  brAimInput(p, src, dt); c.gs.ap = MG.r2(p.brAp || 0);
  p.brAds = H.spinCCW || (ms && ms.right) ? 1 : 0; c.gs.ads = p.brAds;
  c.driftHeld = !!H.a;
  if (P.a) M.jump(c, m); if (P.x) M.reload(c, m); if (P.y) M.holster(c, m);
  if (P.halfCW || P.halfCCW) M.cycle(c, m, P.halfCCW ? -1 : 1); if (ms && ms.wheel) { M.cycle(c, m, ms.wheel > 0 ? 1 : -1); ms.wheel = 0; }
  const b = !!H.b; if (b && !c.wantInt) c.intPress = true; c.wantInt = b;
  const fire = H.spinCW || (ms && ms.left), press = P.spinCW || (ms && ms.left && !p._ml); if (ms) p._ml = ms.left;
  if (press || (fire && M.holdFire)) m.useBy(p);
}
/* the same for a guest online: their device sends events to the host */
function brPadEvents(L, input, dt, clock) {
  const H = input.held || {}, P = input.pressed || {}, me = L.me, ms = Mouse.for(input, { online: true }); if (!me || me.invOpen) return;
  if (P.a) L.pending.push('jmp'); if (P.x) L.pending.push('rl'); if (P.y) L.pending.push(me.chair && me.chair.out ? 'take:' + (me.specK == null ? -1 : me.specK) : 'sw');
  if (ms && ms.wheel) { L.pending.push(ms.wheel > 0 ? 'cyc:1' : 'cyc:-1'); ms.wheel = 0; }
  const b = H.b ? 1 : 0; if (b !== (L.intSent || 0)) { L.pending.push('int:' + b); L.intSent = b; }
  const fire = H.spinCW || (ms && ms.left), press = P.spinCW || (ms && ms.left && !L._ml); if (ms) L._ml = ms.left;
  if (press || (fire && clock - (L.holdAt || 0) > 0.08)) { L.pending.push('use'); L.holdAt = clock; }
  if (ms && ms.right && !(H.spinCCW)) { if (!me.brAds) { L.pending.push('ads:1'); me.brAds = 1; } }
}
GameScene.prototype.brTakeOver = function (p, k) {                        // out, watching a CPU team-mate: take their cart
  const m = this.match, me = p.chair, t = k != null && k >= 0 ? m.chairs[k] : m.chairs.find(c => c.k === p.specK);
  if (!me || !t || t.out || t.player || t.gs.team !== me.gs.team) { Sound.play('back'); return false; }
  m.assign(p, t); t.wantUse = false; Sound.play('select'); MG.notice(m, `${MG.up(p.name || m.name(t))} TAKES OVER A TEAM-MATE'S CART`, 1.8); return true;
};
