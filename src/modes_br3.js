/* BATTLE ROYALE, part 3 (v13.3): how you interact with the world.
   - X is the interact button: tap it next to a gun or item to pick it up (ammo and rez cards are still picked up by driving over them),
     HOLD it at a chest or an ammo crate to open it (the loot spills out), tap it at a door to open or shut it, hold it next to a downed
     team-mate to revive them. With nothing to interact with, X reloads.
   - B (hold while turning) drifts. Melee bash: R3 (click the right stick), B on keyboard 1, middle mouse, touch MELEE: not a lot of damage, but decent (it breaks doors).
   - Your bag keeps its slots: use or drop something and its slot is left empty.
   - Doors on houses: open, shut, shoot or bash them down; a broken door is rebuilt a while later.
   - New items: the RIOT SHIELD (hold it: hits from the front go into the shield until it breaks; RT bashes) and the BUBBLE
     (carts drive through it, bullets don't; it fades after a while).
   - Headshots: hit the top of a driver (aim a little up). Snipers: 105, or 210 to the head. Every hit shows its damage over the target
     to whoever made it (blue: armour, white: health, yellow: headshot).
   - Heals stop as soon as they are no longer doing anything (that one is used up, not the stack). */

Object.assign(BR_GUNS.sniper, { dmg: 105 });
const BR_HEAD = { sniper: 2, pistol: 1.6, rifle: 1.6, smg: 1.4, shotgun: 1.4, rocket: 1 };
Object.assign(BR_ITEMS, {
  riot: { name: 'RIOT SHIELD', icon: '🛡️', stack: 1, pick: 1, col: 0x9fb8c8, hold: 1, hp: 220, about: 'hold it: stops hits from the front until it breaks. RT: shield bash' },
  bubble: { name: 'BUBBLE', icon: '🫧', stack: 2, pick: 1, col: 0x7fd8ff, about: 'a dome you can drive through but bullets cannot (12 s)' }
});
BR_LOOT.push(['riot', 1.1], ['bubble', 1.6]);
const BR_MELEE = { dmg: 20, bash: 28, range: 2.0, arc: 0.9, cd: 0.75, push: 4.5, door: 45 };
const BR_DOOR = { hp: 160, rebuild: 30, reach: 2.4 };
const BR_BUBBLE = { r: 3.6, life: 12 };

/* doors: every gap of 1.6 - 3.2 m in a house's walls (ground floor) gets a door. Doors are walls in the map with a door number. */
function brDoors(M) {
  if (M.doors) return M.doors; M.doors = [];
  for (const d of M.deco) {
    if (d.t !== 'bldg' || d.lv) continue; const { x, y, w, h } = d;
    const sides = [[x, y, x + w, y, 1], [x, y + h, x + w, y + h, 1], [x, y, x, y + h, 0], [x + w, y, x + w, y + h, 0]];
    for (const [ax, ay, bx, by, horiz] of sides) {
      const on = M.walls.filter(q => q.lv === 0 && q.kind === d.kind && (horiz ? Math.abs((q.y0 + q.y1) / 2 - ay) < 0.3 && q.x1 > ax - 0.1 && q.x0 < bx + 0.1 : Math.abs((q.x0 + q.x1) / 2 - ax) < 0.3 && q.y1 > ay - 0.1 && q.y0 < by + 0.1));
      const segs = on.map(q => horiz ? [q.x0, q.x1] : [q.y0, q.y1]).sort((p, q) => p[0] - q[0]); let s = horiz ? ax : ay;
      for (const [a, b] of [...segs, [horiz ? bx : by, horiz ? bx : by]]) { const gap = a - s;
        if (gap >= 1.6 && gap <= 3.2) { const t = 0.16, wall = horiz ? { x0: s, y0: ay - t, x1: a, y1: ay + t } : { x0: ax - t, y0: s, x1: ax + t, y1: a };
          const door = { ...wall, lv: 0, kind: 'door', door: M.doors.length, horiz, cx: (wall.x0 + wall.x1) / 2, cy: (wall.y0 + wall.y1) / 2, len: gap, inX: horiz ? 0 : (x + w / 2 > ax ? 1 : -1), inY: horiz ? (y + h / 2 > ay ? 1 : -1) : 0 };
          M.doors.push(door); M.walls.push(door); }
        s = Math.max(s, b); }
    }
  }
  return M.doors;
}
/* doors that are open or broken are taken out of the world (moved to level -99): every wall check in the game then ignores them */
function brDoorSync(m) { const M = MODES.br.map(m), g = m.gs; if (!M.doors || !g.dr) return; for (const d of M.doors) d.lv = g.dr[d.door] === 0 ? 0 : -99; }

/* the bag keeps its slots: every item knows its slot (it.s), the list stays in slot order */
function brSlots(G) {
  if (!G || !G.inv) return; const held = G.inv[G.sel], last = G.inv[G.last], used = new Set();
  for (const it of G.inv) { if (it.s === undefined || it.s === null || used.has(it.s) || it.s >= BR.slots) it.s = undefined; else used.add(it.s); }
  for (const it of G.inv) if (it.s === undefined) { let s = 0; while (used.has(s)) s++; it.s = s; used.add(s); }
  G.inv.sort((a, b) => a.s - b.s); if (held) G.sel = Math.max(0, G.inv.indexOf(held)); if (last) G.last = Math.max(0, G.inv.indexOf(last));
  if (G.use) { const it = G.inv.find(x => x.k === G.use.k); if (it) G.use.s = G.inv.indexOf(it); }
}
const brSlotItem = (G, s) => G.inv.find(it => it.s === s) || null;

{ const BRm = MODES.br, P2 = { ...BRm };
  const mates = (m, c) => m.chairs.filter(o => o !== c && !o.out && o.gs.team === c.gs.team);
  const ANG = a => Math.atan2(Math.sin(a), Math.cos(a));
  const needsPress = k => !!(BR_GUNS[k] || BR_ITEMS[k] || k === 'chest' || k === 'ammo');
  Object.assign(BRm, {
    init(m) {
      P2.init.call(this, m); const M = this.map(m), g = m.gs; brDoors(M); g.dr = M.doors.map(() => 0); g.dh = M.doors.map(() => BR_DOOR.hp); g.db = M.doors.map(() => 0); brDoorSync(m);
      for (const c of m.chairs) Object.assign(c.gs, { foc: 0, op: 0, mcd: 0, melT: -9 });
    },
    /* where things land: loot from a chest or a cart flies out in an arc (L[9] when, L[10] L[11] from where) and can't be grabbed mid-air */
    drop(m, x, y, lv, k, a) {
      const O = this.spillO; if (O) { const ang = O.a + (O.n++) * 2.39996, r = O.r0 + Math.random() * O.r1; x = O.x + Math.cos(ang) * r; y = O.y + Math.sin(ang) * r; }
      const L = P2.drop.call(this, m, x, y, lv, k, a); if (O) { L[9] = MG.r2(m.gs.t); L[10] = MG.r2(O.x); L[11] = MG.r2(O.y); L[6] = MG.r2(m.gs.t + 0.6); L[7] = -2; } return L;
    },
    spill(m, x, y, r0, r1, fn) { this.spillO = { x, y, a: Math.random() * 6.28, n: 0, r0, r1 }; try { fn(); } finally { this.spillO = null; } },
    finish(m, c, by) { if (c.out) return; return this.spill(m, c.x, c.y, 1.0, 1.4, () => P2.finish.call(this, m, c, by)); },
    /* picking things up: ammo and rez cards when you drive over them; guns, items, chests and crates only when you ask (X) */
    take(m, c, L) {
      const k = L[1]; if (k === 'chestO' || k === 'ammoO') return false;
      if (L[9] !== undefined && L[9] !== null && m.gs.t - L[9] < 0.6) return false;                    // (still flying out)
      if (c.player && needsPress(k) && c.grant !== L[0] && !(BR_ITEMS[k] && c.gs.inv.some(it => it.k === k && it.a < BR_ITEMS[k].stack))) return false;   // (driving over it only tops up a stack you already have)
      c.grant = 0;
      if (k === 'chest' || k === 'ammo') { this.openBox(m, c, L); return false; }
      const r = P2.take.call(this, m, c, L); brSlots(c.gs); return r;
    },
    openBox(m, c, L) {                                                    // a chest or a crate opens where it stands; the loot spills out
      const chest = L[1] === 'chest'; L[1] = chest ? 'chestO' : 'ammoO'; L[9] = MG.r2(m.gs.t); m.sfx(chest ? 'chest_open' : 'crate_open');
      if (c.player && !c.player.remote && chest) Progress.ev('chest');
      this.spill(m, L[2], L[3], 1.1, 1.0, () => {
        if (chest) { const hi = L[4] > 0, gun = (hi && Math.random() < 0.6 ? ['rifle', 'sniper', 'rocket', 'shotgun'] : ['pistol', 'pistol', 'smg', 'smg', 'shotgun', 'rifle', 'rifle', 'sniper', 'rocket'])[Math.floor(Math.random() * (hi ? 4 : 9))];
          this.drop(m, 0, 0, L[4], gun); this.drop(m, 0, 0, L[4], 'am_' + BR_GUNS[gun].type); if (Math.random() < 0.8) this.drop(m, 0, 0, L[4], ['band', 'band', 'plate', 'plate', 'medkit', 'armour', 'boost', 'wall', 'fullkit', 'riot', 'bubble', 'bubble'][Math.floor(Math.random() * 12)]); }
        else { const types = new Set(c.gs.inv.filter(it => BR_GUNS[it.k]).map(it => BR_GUNS[it.k].type)); types.add(AMMO_KEYS[Math.floor(Math.random() * 4)]); for (const t of types) this.drop(m, 0, 0, L[4], 'am_' + t, BR_AMMO[t].pack * 2); }
      });
      if (c.player) this.say(m, c, chest ? 'CHEST OPENED' : 'AMMO CRATE OPENED');
    },
    swap(m, c) { const G = c.gs, it = G.inv[G.sel], s = it && it.s, r = P2.swap.call(this, m, c); if (r && G.inv[G.sel]) G.inv[G.sel].s = s; brSlots(G); return r; },
    spend(c, slot) { const G = c.gs, it = G.inv[slot]; if (!it) return; it.a--; if (it.a <= 0) { G.inv.splice(slot, 1); G.sel = Math.max(0, Math.min(G.sel, G.inv.length - 1)); G.last = Math.min(G.last, Math.max(0, G.inv.length - 1)); } },
    /* the bag screen works in SLOTS (the screen shows slots, with gaps) */
    invAct(c, act, m) {
      const G = c.gs; if (!act || c.out) return; const { op, a, b } = act; brSlots(G);
      if (op === 'ammo') return P2.invAct.call(this, c, act, m);
      G.use = null; G.rl = 0; const A = brSlotItem(G, a);
      if (op === 'swap' && A && b >= 0 && b < BR.slots) { const B = brSlotItem(G, b); A.s = b; if (B) B.s = a; brSlots(G); }
      else if (op === 'sel' && A) { G.sel = G.inv.indexOf(A); G.hol = 0; }
      else if (op === 'drop' && A) { const i = G.inv.indexOf(A), q = c.toWorld(-1.3, 0); G.inv.splice(i, 1); const L = this.drop(m, q.x, q.y, G.lv, A.k, A.a); L[6] = MG.r2(m.gs.t + 2.5); L[7] = c.k; G.sel = Math.max(0, Math.min(G.sel > i ? G.sel - 1 : G.sel, G.inv.length - 1)); m.sfx('back'); }
    },
    /* what X would act on right now (shown as a prompt): a door, then the nearest thing to pick up or open */
    interactFocus(m, c) {
      const G = c.gs, M = this.map(m), g = m.gs; if (c.out || G.down || G.air) return null; let best = null, bd = R_CART() + 1.1;
      for (const L of g.L) { if (L[4] !== G.lv || !needsPress(L[1])) continue; const d = Math.hypot(L[2] - c.x, L[3] - c.y); if (d < bd && !(L[9] !== undefined && L[9] !== null && g.t - L[9] < 0.6) && !(L[7] === c.k && L[6] > g.t)) { bd = d; best = { L }; } }
      if (!best && G.lv === 0) for (const d of M.doors || []) { if (g.dr[d.door] === 2) continue; const dd = Math.hypot(d.cx - c.x, d.cy - c.y); if (dd < BR_DOOR.reach && dd < bd + 1) { bd = dd; best = { door: d }; } }
      return best;
    },
    /* X tapped */
    xPress(c, m) {
      const G = c.gs; if (c.out || G.down) return; if (this.reviveTarget(m, c)) return;      // (holding X revives)
      const f = this.interactFocus(m, c);
      if (f && f.door) return this.toggleDoor(m, c, f.door);
      if (f && f.L) { const L = f.L, k = L[1];
        if (k === 'chest' || k === 'ammo') { if (c.player) this.say(m, c, 'HOLD X TO OPEN'); return; }
        if (G.inv.length >= BR.slots && !G.inv.some(it => it.k === k && (BR_GUNS[k] || (BR_ITEMS[k] && it.a < BR_ITEMS[k].stack)))) { G.swapL = L[0]; c.grant = 0; if (G.hol || !G.inv[G.sel]) { if (c.player) this.say(m, c, 'BAG FULL: take out what you want to swap, then press X'); return; } this.swapFar(m, c, L); return; }
        c.grant = L[0]; if (this.take(m, c, L)) m.gs.L = m.gs.L.filter(x => x !== L); return; }
      this.reload(c, m);
    },
    swapFar(m, c, L) {                                                    // (the swap, from the pickup range rather than on top of it)
      const G = c.gs, it = G.inv[G.sel]; m.gs.L = m.gs.L.filter(x => x !== L); G.inv[G.sel] = { k: L[1], a: L[5], s: it.s }; const d = this.drop(m, c.x, c.y, G.lv, it.k, it.a); d[6] = MG.r2(m.gs.t + 2.5); d[7] = c.k; G.swapL = 0; m.sfx('pickup'); if (c.player) this.say(m, c, (BR_GUNS[L[1]] || BR_ITEMS[L[1]]).name);
    },
    toggleDoor(m, c, d) {
      const g = m.gs, i = d.door; if (g.dr[i] === 2) return;
      if (g.dr[i] === 1) { if (m.chairs.some(o => !o.out && o.gs.lv === 0 && o.x > d.x0 - R_CART() && o.x < d.x1 + R_CART() && o.y > d.y0 - R_CART() && o.y < d.y1 + R_CART())) { if (c.player) this.say(m, c, 'SOMETHING IS IN THE DOORWAY'); return; } g.dr[i] = 0; m.sfx('door_close'); }
      else { g.dr[i] = 1; m.sfx('door_open'); }
      brDoorSync(m);
    },
    hitDoor(m, i, dmg) {
      const g = m.gs; if (g.dr[i] !== 0) return; g.dh[i] -= dmg; m.sfx('wood_hit');
      if (g.dh[i] <= 0) { g.dr[i] = 2; g.db[i] = MG.r2(g.t + BR_DOOR.rebuild); m.sfx('wood_break'); const d = this.map(m).doors[i]; MG.add(m, { t: 'splint', x: d.cx, y: d.cy, life: 1.2, horiz: d.horiz ? 1 : 0 }); brDoorSync(m); }
    },
    /* B: melee. Something in front of you within reach takes a hit (a door too) */
    melee(c, m, bash) {
      const G = c.gs; if (c.out || G.down || G.mcd > 0 || G.use) return; G.mcd = BR_MELEE.cd; G.melT = MG.r2(m.gs.t); const M = this.map(m);
      let hit = null, bd = BR_MELEE.range + R_CART();
      for (const o of MG.live(m)) { if (o === c || o.gs.team === G.team || o.gs.lv !== G.lv || Math.abs(o.gs.z - G.z) > 1) continue; const d = MH.dist(c, o), a = Math.abs(ANG(Math.atan2(o.y - c.y, o.x - c.x) - c.heading)); if (d < bd && a < BR_MELEE.arc) { bd = d; hit = o; } }
      if (hit) { this.hurt(m, hit, bash ? BR_MELEE.bash : BR_MELEE.dmg, c, false, { melee: 1 }); const a = Math.atan2(hit.y - c.y, hit.x - c.x); hit.vx += Math.cos(a) * BR_MELEE.push; hit.vy += Math.sin(a) * BR_MELEE.push; m.sfx(bash ? 'shield_bash' : 'melee_hit'); return; }
      if (G.lv === 0) for (const d of M.doors || []) { if (m.gs.dr[d.door] !== 0) continue; const dd = Math.hypot(d.cx - c.x, d.cy - c.y), a = Math.abs(ANG(Math.atan2(d.cy - c.y, d.cx - c.x) - c.heading)); if (dd < BR_MELEE.range + 0.8 && a < 1.2) { this.hitDoor(m, d.door, BR_MELEE.door); return; } }
      m.sfx('melee_whiff');
    },
    use(c, m) {
      const G = c.gs; if (c.out || G.down || G.use) return; const it = !G.hol && G.inv[G.sel];
      if (it && it.k === 'riot') return this.melee(c, m, true);           // the riot shield: RT bashes with it
      if (it && it.k === 'bubble' && G.cd <= 0) { MG.add(m, { t: 'bub', x: MG.r2(c.x), y: MG.r2(c.y), z: G.z, lv: G.lv, r: BR_BUBBLE.r, until: MG.r2(m.gs.t + BR_BUBBLE.life), t0: MG.r2(m.gs.t) }); m.sfx('bubble'); G.cd = 0.8; this.spend(c, G.sel); return; }
      return P2.use.call(this, c, m);
    },
    cmd(c, cmd, m) { const r = P2.cmd.call(this, c, cmd, m); const it = !c.gs.hol && c.gs.inv[c.gs.sel]; if (it && it.k === 'riot') c.speedMul *= 0.88; return r; },
    /* getting hit: the riot shield takes hits from the front; headshots; the damage shows over the target for whoever hit them */
    hurt(m, c, dmg, by, storm, o = {}) {
      const G = c.gs; if (c.out || (!storm && m.gs.t < BR.grace)) return;
      const riot = !storm && !G.hol && G.inv[G.sel] && G.inv[G.sel].k === 'riot' ? G.inv[G.sel] : null;
      if (riot && by && by !== c && !o.splash) { const a = Math.abs(ANG(Math.atan2(by.y - c.y, by.x - c.x) - c.heading)); if (a < 1.25) {
        riot.h = (riot.h === undefined ? BR_ITEMS.riot.hp : riot.h) - dmg; this.num(m, c, by, 0, 0, 0, dmg); m.sfx('shield_hit');
        if (riot.h <= 0) { G.inv.splice(G.sel, 1); G.sel = Math.max(0, Math.min(G.sel, G.inv.length - 1)); m.sfx('shield_break'); if (c.player) this.say(m, c, 'YOUR RIOT SHIELD BROKE'); }
        return; } }
      const sh0 = G.sh, hp0 = G.hp, d0 = G.dhp, dn0 = G.down;
      P2.hurt.call(this, m, c, dmg, by, storm);
      if (by && by !== c && !storm) { const shL = Math.max(0, sh0 - G.sh), hpL = dn0 ? Math.max(0, d0 - (G.dhp || 0)) : Math.max(0, hp0 - Math.max(0, G.hp)); if (shL + hpL > 0.05) { this.num(m, c, by, shL, hpL, o.head ? 1 : 0); by.gs.dd = (by.gs.dd || 0) + shL + hpL; } }   // (dd: real damage done, for the end screen)
    },
    num(m, c, by, sh, hp, head, blocked) { MG.add(m, { t: 'dn', x: MG.r2(c.x), y: MG.r2(c.y), z: MG.r2(c.gs.z || 0), s: Math.round(sh), h: Math.round(hp), hd: head, bl: blocked ? Math.round(blocked) : 0, by: by.k, life: 1.0 }); },
    /* bullets: as before, plus doors, bubbles and headshots */
    bullet(m, o, h) {
      const M = this.map(m), n = 4, g = m.gs; let hit = false, lv = 0; const top = Math.max(0, ...M.floors.map(f => f.lv)), bubs = MG.all(m, 'bub');
      for (let s = 0; s < n && !hit; s++) {
        const hz0 = o.z + 0.55, px = o.x, py = o.y; o.x += o.vx * h / n; o.y += o.vy * h / n; o.z += (o.vz || 0) * h / n; const hz = o.z + 0.55; lv = Math.max(0, Math.floor(hz / BR.H));
        if (o.x < 0 || o.y < 0 || o.x > m.width || o.y > m.height || hz < 0.02 || hz > (top + 2) * BR.H) { hit = true; break; }
        if (o.vz) for (let k = 1; k <= top; k++) if ((hz0 - k * BR.H) * (hz - k * BR.H) < 0 && this.floorAt(M, k, o.x, o.y)) { hit = true; break; }
        if (hit) break;
        for (const b of bubs) if (b.lv === lv && (Math.hypot(px - b.x, py - b.y) < b.r) !== (Math.hypot(o.x - b.x, o.y - b.y) < b.r)) { hit = true; b.hit = MG.r2(g.t); break; }   // a bubble: nothing gets in or out
        if (hit) break;
        const w = M.walls.find(w => w.lv === lv && o.x > w.x0 && o.x < w.x1 && o.y > w.y0 && o.y < w.y1);
        if (w) { if (w.door !== undefined) this.hitDoor(m, w.door, BR_GUNS[o.w].dmg * (o.w === 'rocket' ? 3 : 1)); hit = true; break; }
        if (lv === 0 && M.trees.some(t => Math.hypot(o.x - t.x, o.y - t.y) < t.r)) { hit = true; break; }
        for (const dw of MG.all(m, 'dwall')) if (dw.lv === lv && this.wallPosts(dw).some(p => Math.hypot(o.x - p.x, o.y - p.y) < 0.5)) { dw.hp -= BR_GUNS[o.w].dmg * (o.w === 'rocket' ? 3 : 1); hit = true; break; }
        if (hit) break;
        const sh = m.chairs[o.k];
        for (const c of m.chairs) { if (c === sh || c.out || (sh && c.gs.team === sh.gs.team) || hz < c.gs.z - 0.1 || hz > c.gs.z + 1.3) continue;
          if (Math.hypot(c.x - o.x, c.y - o.y) < R_CART() + 0.12) { if (o.w !== 'rocket') { const head = hz >= c.gs.z + 0.98; this.hurt(m, c, BR_GUNS[o.w].dmg * (head ? BR_HEAD[o.w] || 1.5 : 1), sh, false, { head }); if (head && sh && sh.player) m.sfx('headshot'); } hit = true; break; } }
      }
      if (hit && o.w === 'rocket') { const G = BR_GUNS.rocket; MG.add(m, { t: 'boom', x: MG.r2(o.x), y: MG.r2(o.y), z: o.z, life: 0.7 }); m.sfx('boom');
        for (const c of m.chairs) { if (c.out || Math.abs(c.gs.z - o.z) > 1.5) continue; const d = Math.hypot(c.x - o.x, c.y - o.y); if (d < G.splash) { const sh = m.chairs[o.k]; if (!(sh && c.gs.team === sh.gs.team && c !== sh)) this.hurt(m, c, G.dmg * (1 - d / G.splash * 0.6), sh, false, { splash: 1 }); } }
        for (const d of M.doors || []) if (Math.hypot(d.cx - o.x, d.cy - o.y) < G.splash) this.hitDoor(m, d.door, 90); }
      if (hit || g.t > o.until) MG.remove(m, o); else { o.x = MG.r2(o.x); o.y = MG.r2(o.y); o.z = Math.round(o.z * 1000) / 1000; }
    },
    step(m, h) {
      const g = m.gs, M = this.map(m); brDoorSync(m);
      for (const c of m.chairs) { if (c.out) continue; const G = c.gs; brSlots(G); G.mcd = Math.max(0, (G.mcd || 0) - h);
        if (c.player) { const f = G.down ? null : this.interactFocus(m, c), L = f && f.L; G.foc = L ? L[0] : f && f.door ? -1 - f.door.door : 0;   // (for the prompt)
          if (L && (L[1] === 'chest' || L[1] === 'ammo') && c.wantInt && !this.reviveTarget(m, c)) { G.op = Math.min(1, (G.op || 0) + h / (L[1] === 'chest' ? 0.75 : 0.5)); G.opL = L[0]; if (G.op >= 1) { G.op = 0; c.grant = L[0]; this.take(m, c, L); } }
          else G.op = 0;
          c.intPress = false;                                              // (X is handled by xPress; holding it revives or opens)
        } else {                                                           // the CPU: opens doors in its way
          if (G.lv === 0) for (const d of M.doors || []) if (g.dr[d.door] === 0 && Math.hypot(d.cx - c.x, d.cy - c.y) < 1.7) { g.dr[d.door] = 1; m.sfx('door_open'); brDoorSync(m); }
        }
      }
      P2.step.call(this, m, h);
      for (const c of m.chairs) { const G = c.gs; if (c.out) continue; brSlots(G);
        if (G.use) { const U = G.use, I = BR_ITEMS[U.k], t = U.tk >= 0 ? m.chairs[U.tk] : c; if (I && t && !this.helps(t, I)) { this.spend(c, U.s); G.use = null; m.sfx('select'); } }   // full: stop, that one is used up
      }
      for (const i in g.dr || []) if (g.dr[i] === 2 && g.t >= g.db[i]) { const d = M.doors[i]; if (!m.chairs.some(o => !o.out && o.gs.lv === 0 && o.x > d.x0 - R_CART() && o.x < d.x1 + R_CART() && o.y > d.y0 - R_CART() && o.y < d.y1 + R_CART())) { g.dr[i] = 0; g.dh[i] = BR_DOOR.hp; m.sfx('door_close'); brDoorSync(m); } }
      for (const o of MG.all(m, 'bub')) if (g.t > o.until) MG.remove(m, o);
      for (const o of MG.all(m, 'dn').concat(MG.all(m, 'splint'))) { o.life -= h; if (o.life <= 0) MG.remove(m, o); }
      if (g.L.some(L => L[1] === 'chestO' || L[1] === 'ammoO')) g.L = g.L.filter(L => !((L[1] === 'chestO' || L[1] === 'ammoO') && g.t - L[9] > 60));   // opened boxes go after a minute
    },
    /* the storm: a big warning on screen (g.sw: [text, time, kind]) and the storm siren */
    storm(m, h) {
      const S = m.gs.st, g = m.gs, wait0 = S.wait, ph = S.ph; P2.storm.call(this, m, h);
      const say = (txt, kind) => { g.sw = [txt, MG.r2(g.t), kind]; m.sfx(kind === 'go' ? 'storm_close' : 'storm_warn'); };
      if (S.wait > 0 && wait0 > 30 && S.wait <= 30) say(`STORM CLOSING IN 30 SECONDS`, 'warn');
      if (S.wait > 0 && wait0 > 10 && S.wait <= 10) say(`STORM CLOSING IN 10 SECONDS!`, 'warn');
      if (wait0 > 0 && S.wait <= 0 && S.shrink > 0) say(`THE STORM IS CLOSING IN!`, 'go');
      if (S.ph > ph && ph >= 0) say(S.ph >= 6 ? 'FINAL STORM' : `STORM STAGE ${ph + 1} DONE`, 'done');
    },
    /* the CPU: melee when an enemy is right next to it (or it has no ammo) */
    ai(c, m) {
      const r = P2.ai.call(this, c, m), G = c.gs; if (c.out || G.down) return r;
      const foe = MG.live(m).find(o => o.gs.team !== G.team && o.gs.lv === G.lv && MH.dist(c, o) < BR_MELEE.range + R_CART() - 0.2 && Math.abs(ANG(Math.atan2(o.y - c.y, o.x - c.x) - c.heading)) < BR_MELEE.arc);
      if (foe && G.mcd <= 0 && (Math.random() < 0.04 || !G.inv.some(it => BR_GUNS[it.k] && it.a > 0))) this.melee(c, m);
      return r;
    }
  });
}

/* the CPU's map of where it can drive: doors count as open (it opens them as it gets there) */
{ const nav = MODES.br.nav; MODES.br.nav = function (m) { if (m.brNav) return m.brNav; const M = this.map(m); brDoors(M); for (const d of M.doors) d.lv = -99; try { return nav.call(this, m); } finally { brDoorSync(m); } }; }

/* the buttons: X interacts (or reloads), hold X to open / revive, B melee */
function brPadInput(sc, m, p, src, dt) {
  const M = MODES.br, c = p.chair; if (!c || !src || p.invOpen) return; const H = src.held || {}, P = src.pressed || {}, ms = Mouse.for(src, sc);
  if (src.bagTap) { src.bagTap = false; if (!c.out && !c.gs.down && m.state === 'play') sc.openInventory(p); return; }
  if (c.out) { if (P.y) sc.brTakeOver(p); return; }
  brAimInput(p, src, dt); c.gs.ap = MG.r2(p.brAp || 0);
  p.brAds = H.spinCCW || (ms && ms.right) ? 1 : 0; c.gs.ads = p.brAds;
  c.driftHeld = !!H.b;                                                  // B (hold, while turning): drift
  if (P.a) M.jump(c, m); if (P.x) M.xPress(c, m); if (P.y) M.holster(c, m); if (P.melee || (src.id === 'touch' && P.speedUp) || (ms && ms.mid)) { M.melee(c, m); if (ms) ms.mid = false; }
  if (P.halfCW || P.halfCCW) M.cycle(c, m, P.halfCCW ? -1 : 1); if (ms && ms.wheel) { M.cycle(c, m, ms.wheel > 0 ? 1 : -1); ms.wheel = 0; }
  c.wantInt = !!H.x;
  const fire = H.spinCW || (ms && ms.left), press = P.spinCW || (ms && ms.left && !p._ml); if (ms) p._ml = ms.left;
  if (press || (fire && M.holdFire)) m.useBy(p);
}
function brPadEvents(L, input, dt, clock) {
  const H = input.held || {}, P = input.pressed || {}, me = L.me, ms = Mouse.for(input, { online: true }); if (!me || me.invOpen) return;
  if (P.a) L.pending.push('jmp'); if (P.x) L.pending.push('rl'); if (P.y) L.pending.push(me.chair && me.chair.out ? 'take:' + (me.specK == null ? -1 : me.specK) : 'sw');
  if (P.melee || (input.id === 'touch' && P.speedUp) || (ms && ms.mid)) { L.pending.push('mel'); if (ms) ms.mid = false; }
  if (ms && ms.wheel) { L.pending.push(ms.wheel > 0 ? 'cyc:1' : 'cyc:-1'); ms.wheel = 0; }
  const b = H.x ? 1 : 0; if (b !== (L.intSent || 0)) { L.pending.push('int:' + b); L.intSent = b; }
  const fire = H.spinCW || (ms && ms.left), press = P.spinCW || (ms && ms.left && !L._ml); if (ms) L._ml = ms.left;
  if (press || (fire && clock - (L.holdAt || 0) > 0.08)) { L.pending.push('use'); L.holdAt = clock; }
  if (ms && ms.right && !(H.spinCCW)) { if (!me.brAds) { L.pending.push('ads:1'); me.brAds = 1; } }
}
/* the middle mouse button: melee */
if (typeof window !== 'undefined') window.addEventListener('mousedown', e => { if (e.button === 1 && e.target && e.target.tagName === 'CANVAS') { Mouse.mid = true; e.preventDefault(); } });

/* ---- the end of a game: your squad's stats, like the big battle royales (eliminations, knocks, assists, damage, revives, rezzes, time alive) ---- */
{ const BRm = MODES.br, P3 = { ...BRm };
  Object.assign(BRm, {
    hurt(m, c, dmg, by, storm, o) {
      const G = c.gs, dn0 = G.down, out0 = c.out; if (by && by !== c && !storm && by.gs.team !== G.team) (G.dby || (G.dby = {}))[by.k] = m.gs.t;
      P3.hurt.call(this, m, c, dmg, by, storm, o);
      if ((!dn0 && G.down) || (!out0 && c.out)) this.credit(m, c, by && by !== c ? by : null, !dn0 && G.down);
    },
    credit(m, c, by, knock) {                                            // a knock or an elimination: the hitter, and everyone else who hurt them in the last 10 s (an assist)
      const G = c.gs; if (by) { if (knock) by.gs.knocks = (by.gs.knocks || 0) + 1; }
      for (const k in G.dby || {}) { const o = m.chairs[k]; if (!o || o === by || m.gs.t - G.dby[k] > 10 || o.gs.team === G.team) continue; o.gs.ast = (o.gs.ast || 0) + 1; }
      if (!knock) { G.dby = {}; G.outAt = MG.r2(m.gs.t); }
    },
    step(m, h) {
      const before = m.chairs.map(c => ({ out: c.out, down: c.gs.down })), rvr = {}, holder = {};
      for (const c of m.chairs) { if (c.gs.rvk >= 0 && c.gs.rv > 0) rvr[c.gs.rvk] = c; for (const k of c.gs.cards || []) holder[k] = c; }
      P3.step.call(this, m, h);
      m.chairs.forEach((c, i) => { const b = before[i];
        if (b.down && !c.gs.down && !c.out && rvr[c.k]) rvr[c.k].gs.rvs = (rvr[c.k].gs.rvs || 0) + 1;              // revived
        if (b.out && !c.out && holder[c.k]) holder[c.k].gs.rzs = (holder[c.k].gs.rzs || 0) + 1;                   // brought back at a rez garage
        if (!b.out && c.out && c.gs.outAt === undefined) c.gs.outAt = MG.r2(m.gs.t); });
    },
    end(m, team) {
      if (m.state !== 'play') return; const g = m.gs, order = [];                                            // teams, best first: the winners, then by how late they went out
      const last = t => Math.max(...m.chairs.filter(c => c.gs.team === t).map(c => c.out ? (c.gs.outAt === undefined ? 0 : c.gs.outAt) : 1e9));
      const teams = [...new Set(m.chairs.map(c => c.gs.team))].sort((a, b) => last(b) - last(a)); if (team !== undefined) { teams.splice(teams.indexOf(team), 1); teams.unshift(team); }
      P3.end.call(this, m, team); if (!m.result) return;
      m.result.br = { teams: teams.length, place: Object.fromEntries(teams.map((t, i) => [t, i + 1])), at: MG.r2(g.t),
        stats: m.chairs.map(c => ({ k: c.k, team: c.gs.team, name: MG.pname(c) || m.name(c), kills: c.gs.kills || 0, knocks: c.gs.knocks || 0, ast: c.gs.ast || 0, dmg: Math.round(c.gs.dd || 0), rvs: c.gs.rvs || 0, rzs: c.gs.rzs || 0, alive: Math.round(c.out ? (c.gs.outAt || g.t) : g.t), out: !!c.out })) };
    }
  });
}
