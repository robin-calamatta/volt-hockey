/* v14.2: the CPU's skill level shows in every minigame, and Volt Royale CPUs play the storm and play as a team.
   MINIGAMES: before, most games' CPUs drove flat out whatever the level. Now each level has its own top speed (its `speed`), its
   own steering error (`aimError`, a wobble that changes every half second or so) and its own reaction time (it re-thinks less often).
   A cart may carry its own level (c.cpuDiff: the tests use this to race Legends against Easies).
   VOLT ROYALE:
   - The storm comes first: a CPU works out how long it needs to drive to the next safe circle and leaves in time. Caught outside, it
     stops fighting and drives for safety (shooting only at what's straight ahead on the way).
   - Squads stick together: a CPU that strays too far from its team-mates (and isn't fighting) heads back to them.
   - It comes to help: a team-mate under fire within range pulls the others in.
   - Focus fire: it prefers the enemy its team-mates are already shooting at.
   - It calls out enemies with a ping (so you see what your CPU team-mates see).
   - Its aim and its reactions follow its level: an Easy CPU wobbles and is slow on the trigger, a Legend isn't. */
const AIM = { regroup: 24, regroupBack: 10, help: 45, pingEvery: 9, stormMargin: 4, flee: 0.95 };
const cpuDiffOf = (c, m) => c.cpuDiff || m.difficulty || {};

/* ---- every minigame: level-true speed, wobble and reactions ---- */
{ const base = miniAI;
  miniAI = function (c, m, h) {
    const own = c.cpuDiff, saved = m.difficulty; if (own) m.difficulty = own;
    try {
      const D = m.difficulty || {}, M = modeOf(m), cmd = base(c, m, h); if (!cmd || !M) return cmd;
      if (!c.wob || m.simTime > c.wob.until) c.wob = { until: m.simTime + 0.4 + Math.random() * 0.5, a: (Math.random() * 2 - 1) * (D.aimError || 0.05) * 1.6 };
      const out = { ...cmd }, sp = out.speed === undefined ? 1 : out.speed, top = D.speed || 0.9;
      if (!M.noSkillSpeed) out.speed = Math.min(sp, top);                                                  // never faster than this level drives
      if ((out.x || out.y) && !M.noWobble) { const a = Math.atan2(out.y, out.x) + c.wob.a, l = Math.hypot(out.x, out.y); out.x = Math.cos(a) * l; out.y = Math.sin(a) * l; }
      return out;
    } finally { m.difficulty = saved; }
  };
  miniAI.base = base.base || base;
}

/* ---- Volt Royale ---- */
{ const M = MODES.br, ai = M.ai; M.noWobble = true; M.aiV1 = ai; const team = (m, c) => m.chairs.filter(o => o !== c && !o.out && o.gs && o.gs.team === c.gs.team);
  /* how long until the storm reaches this spot, and where safety is */
  const stormDanger = (m, c) => {
    const S = m.gs.st; if (!S) return null; const sp = CONFIG.chair.maxSpeed * 0.75, dNow = Math.hypot(c.x - S.x, c.y - S.y) - S.r;
    if (dNow > -2) return { x: S.fx || S.x, y: S.fy || S.y, urgent: true };                                           // in it (or on the edge)
    const dNext = Math.hypot(c.x - (S.fx || S.x), c.y - (S.fy || S.y)) - (S.fr || S.r) + AIM.stormMargin;          // outside where the next circle will be
    if (dNext <= 0) return null;
    const left = S.wait > 0 ? S.wait + Math.max(0, S.st || 0) * 0.5 : Math.max(0, S.shrink) * 0.6;                // time we have before it catches us, roughly
    return dNext / sp > left - 6 ? { x: S.fx || S.x, y: S.fy || S.y, urgent: false } : null;
  };
  M.ai = function (c, m, ...a) {
    const G = c.gs, g = m.gs, D = cpuDiffOf(c, m); if (!G || c.out || G.down || G.plane || G.glide || m.state !== 'play') return ai.call(this, c, m, ...a);
    const now = g.t, mates = team(m, c).filter(o => !o.gs.down);
    /* 1. the storm first */
    const st = stormDanger(m, c); G.inStorm = !!(st && st.urgent);
    if (st) {
      if (st.urgent && G.use) G.use = null;                                                                         // (v14.2: never stand in the storm healing: get out first)
      const live0 = MG.live, saveGo = c.goTo; c.goTo = { x: st.x, y: st.y, lv: 0 };
      if (st.urgent) MG.live = mm => live0(mm).filter(o => !o.gs || o.gs.team === G.team);                        // in the storm: no stopping to fight
      let r; try { r = ai.call(this, c, m, ...a); } finally { MG.live = live0; c.goTo = saveGo; }
      if (st.urgent) { const it = G.inv[G.sel], gun = it && BR_GUNS[it.k];                                          // still shoot anyone right ahead on the way out
        const foe = live0(m).find(o => o.gs.team !== G.team && !o.gs.down && MH.dist(c, o) < (gun ? gun.range : 0) && Math.abs(normalizeAngle(Math.atan2(o.y - c.y, o.x - c.x) - c.heading)) < 0.12);
        if (foe && gun && it.a > 0 && G.cd <= 0) c.wantUse = true; aiStat && aiStat(m, 'br.storm'); }
      if (st.urgent && c.wantUse) { const it = G.inv[G.sel]; if (it && !BR_GUNS[it.k] && it.k !== 'boost') c.wantUse = false; }        // (a heal would stop it in the storm)
      if (r && r.speed !== undefined) r.speed = Math.max(r.speed, AIM.flee);
      return r;
    }
    /* 2. squads: come to a team-mate in a fight, or regroup when strayed */
    const seenFoe = MG.live(m).some(o => o.gs.team !== G.team && !o.gs.down && MH.dist(c, o) < 18 && Math.abs((o.gs.z || 0) - (G.z || 0)) < 1);
    if (!seenFoe && mates.length) {
      const hurt = mates.filter(o => o.gs.hurtAt !== undefined && now - o.gs.hurtAt < 3 && MH.dist(c, o) < AIM.help).sort((p, q) => MH.dist(c, p) - MH.dist(c, q))[0];
      const cx = mates.reduce((s, o) => s + o.x, 0) / mates.length, cy = mates.reduce((s, o) => s + o.y, 0) / mates.length, far = Math.hypot(c.x - cx, c.y - cy);
      let goal = hurt && MH.dist(c, hurt) > 6 ? { x: hurt.x, y: hurt.y, lv: hurt.gs.lv || 0 } : far > AIM.regroup || (G.regroup && far > AIM.regroupBack) ? { x: cx, y: cy, lv: 0 } : null;
      const S = g.st, safeAt = p => !S || (Math.hypot(p.x - S.x, p.y - S.y) < S.r - 5 && (S.wait > 0 || Math.hypot(p.x - (S.fx || S.x), p.y - (S.fy || S.y)) < (S.fr || S.r) - 2));
      if (goal && !safeAt(goal)) goal = null;                                                                       // (v14.2: never regroup or go to help somewhere the storm is about to be)
      G.regroup = !!goal && !hurt;
      if (goal && !c.goTo) { c.goTo = goal; try { return ai.call(this, c, m, ...a); } finally { c.goTo = null; } }
    }
    /* 3. fighting: focus the enemy the team is on, ping it, and aim / react by level */
    const focus = mates.map(o => o.gs.tgt).find(k => k !== undefined && m.chairs[k] && !m.chairs[k].out);
    let r;
    if (focus !== undefined && MH.dist(c, m.chairs[focus]) < 25) {                                                    // see only the shared target (if it's in view) so the base picks it
      const live0 = MG.live, T = m.chairs[focus]; MG.live = mm => { const L = live0(mm), v = L.filter(o => o.gs.team === G.team || o === T); return v.length > 1 ? v : L; };
      try { r = ai.call(this, c, m, ...a); } finally { MG.live = live0; }
    } else r = ai.call(this, c, m, ...a);
    if (G.seenAt === m.simTime) {                                                                                     // the base AI is fighting this frame
      const foe = MG.live(m).filter(o => o.gs.team !== G.team && !o.gs.down).sort((p, q) => MH.dist(c, p) - MH.dist(c, q))[0];
      if (foe) {
        G.tgt = m.chairs.indexOf(foe);
        if (!G.spotT || m.simTime - G.spotT > 4) G.firstSeen = m.simTime; G.spotT = m.simTime;
        if (m.simTime - G.firstSeen < (D.reaction || 0.15) * 2.6) c.wantUse = false;                                 // a moment to react
        if (!G.pingT || g.t - G.pingT > AIM.pingEvery) { if (team(m, c).some(o => o.player) && M.ping) { G.pingT = g.t; const h0 = c.heading; c.heading = Math.atan2(foe.y - c.y, foe.x - c.x); try { M.ping(m, c); } finally { c.heading = h0; } } }
      }
      if (r && (r.x || r.y)) { if (!c.bAim || m.simTime > c.bAim.until) c.bAim = { until: m.simTime + 0.35 + Math.random() * 0.3, a: (Math.random() * 2 - 1) * (D.aimError || 0.05) * 2.2 };   // the level's aim wobble
        const ang = Math.atan2(r.y, r.x) + c.bAim.a; r = { ...r, x: Math.cos(ang), y: Math.sin(ang) }; }
    } else G.tgt = undefined;
    return r;
  };
}
