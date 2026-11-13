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
  /* v14.2.3: the storm is the CPU's first priority. While the storm waits, the next circle isn't known yet, but it must fit inside the
     current one: anywhere within "rSafe" of the middle is inside it wherever it lands. A CPU heads there in good time (allowing for the
     roads not being straight). Once the storm moves, it heads well inside the final circle and makes sure the edge never catches it. */
  const PHT = BR_PHASES;   // (v14.2.24: the same stages as the game; times per map from brPhases)
  const stormDanger = (m, c) => {
    const S = m.gs.st; if (!S || S.ph >= PHT.length) return null; const sp = CONFIG.chair.maxSpeed * 0.55, dNow = Math.hypot(c.x - S.x, c.y - S.y) - S.r;
    const deep = (cx, cy, rr) => { const d = Math.hypot(c.x - cx, c.y - cy) || 1, k = Math.min(d, rr) / d; return { x: cx + (c.x - cx) * k, y: cy + (c.y - cy) * k }; };
    if (dNow > -5) { const p = deep(S.fx !== undefined && S.shrink > 0 ? S.fx : S.x, S.fx !== undefined && S.shrink > 0 ? S.fy : S.y, (S.shrink > 0 ? S.fr : S.r) * 0.5); return { ...p, urgent: true }; }   // in it, or about to be: go now
    if (S.wait > 0) {                                                                                                // waiting: be inside the guaranteed-safe part in time
      const [, sh, f] = brPhases(m)[S.ph], nr = f ? Math.max(1.5, Math.min(m.width, m.height) * f) : 0, rSafe = Math.max(nr * 0.4, nr - 0.6 * Math.max(0, S.r - nr));
      const d0 = Math.hypot(c.x - S.x, c.y - S.y), need = d0 - rSafe * 0.85; if (need <= 0) return null;
      const t = need / sp, left = S.wait + sh * 0.4, p = deep(S.x, S.y, rSafe * 0.6);
      if (t > left - 15) return { ...p, urgent: true };   /* (v14.3.8: more to spare, with the shorter stages) */                                                              // cutting it fine: drop everything
      if (t > left - 45) return { ...p, urgent: false };                                                            // time to start heading in
      return null;
    }
    if (S.shrink > 0 && S.fx !== undefined) {                                                                       // closing in: get well inside the final circle, never let the edge reach us
      const dFin = Math.hypot(c.x - S.fx, c.y - S.fy) - S.fr * 0.7, p = deep(S.fx, S.fy, S.fr * 0.5); if (dFin <= 0) return null;
      const edgeV = Math.max(0.5, (S.sr - S.fr) / Math.max(1, S.st) + Math.hypot(S.fx - S.sx, S.fy - S.sy) / Math.max(1, S.st)), catchT = -dNow / edgeV;
      if (catchT < 12 || dFin / sp > S.shrink - 3) return { ...p, urgent: true };
      return { ...p, urgent: false };
    }
    return null;
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

/* v14.2.3: a CPU that's driving but not moving (nosed into a wall, wedged on a roof edge) backs off at an angle, then finds a new way */
{ const M = MODES.br, ai = M.ai;
  M.ai = function (c, m, ...a) {
    const G = c.gs, t = m.simTime; if (!G || c.out || G.down || G.plane || G.glide || G.air || m.state !== 'play') return ai.call(this, c, m, ...a);
    if (c.esc && t < c.esc.until) return { x: Math.cos(c.esc.a), y: Math.sin(c.esc.a), speed: 1, spin: 0 };
    const r = ai.call(this, c, m, ...a), v = Math.hypot(c.vx || 0, c.vy || 0), wants = r && (r.speed || 0) > 0.4 && (r.x || r.y);
    if (wants && v < 0.4 && !G.use) c.stuckT = (c.stuckT || 0) + (t - (c.stuckAt || t)); else c.stuckT = 0; c.stuckAt = t;
    if (c.stuckT > 1.2) { c.stuckT = 0; const want = Math.atan2(r.y, r.x), side = Math.random() < 0.5 ? 1 : -1; c.esc = { until: t + 0.5 + Math.random() * 0.5, a: want + Math.PI + side * (0.7 + Math.random() * 0.8) }; if (c.brNav) c.brNav.path = null; aiStat && aiStat(m, 'br.unstick'); }
    return r;
  };
}
