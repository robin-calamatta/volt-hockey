/* v14.3.1 Volt Royale online: a guest's own actions show at once. Before, a guest pressed fire or changed weapons and waited for the host
   to do it and say so (a round trip, plus the time to the next snapshot) before seeing or hearing anything, so it all felt laggy.
   - Changing items (◀ ▶, the mouse wheel, Y to put your gun away / take it out): the hotbar and your hands change straight away. The host
     still decides; for half a second (or until the host agrees) the snapshots don't undo it.
   - Firing: your gun's sound plays the moment you press (the host's copy of it is skipped, see the gun sounds in modes_br3.js). */
{
  const scan = L => { if (L._pRef !== L.pending || L._pAt > L.pending.length) { L._pRef = L.pending; L._pAt = 0; } const out = L.pending.slice(L._pAt); L._pAt = L.pending.length; return out; };
  const hold = (c, ms) => { const G = c.gs; c._blipPred = performance.now() + ms + 300; c._brPred = { sel: G.sel, hol: G.hol, last: G.last, until: performance.now() + ms }; };
  const pe = brPadEvents;
  brPadEvents = function (L, input, dt, clock) {
    const r = pe.call(this, L, input, dt, clock), me = L.me, c = me && me.chair; if (!c || !c.gs || c.out) { if (L.pending) scan(L); return r; }
    const G = c.gs, rtt = (Online.current && Online.current.rtt) || 150, keep = Math.min(900, Math.max(350, rtt * 1.5 + 120));
    for (const ev of scan(L)) {
      if (G.down) continue;
      if (ev === 'cyc:1' || ev === 'cyc:-1') { if (!G.inv || !G.inv.length) continue; G.use = null; G.rl = 0; if (G.hol) { G.hol = 0; G.sel = Math.min(G.last || 0, G.inv.length - 1); } else G.sel = (G.sel + (ev === 'cyc:-1' ? G.inv.length - 1 : 1)) % G.inv.length; Sound.play('blip'); hold(c, keep); }
      else if (ev === 'sw') { G.use = null; G.rl = 0; if (G.hol) { G.hol = 0; if (G.inv && G.inv[G.last]) G.sel = G.last; } else { G.hol = 1; G.last = G.sel; } Sound.play('blip'); hold(c, keep); }
      else if (ev === 'use') { const it = !G.hol && G.inv && G.inv[G.sel], gun = it && BR_GUNS[it.k], now = performance.now();
        if (gun && it.a > 0 && !G.use && !(G.rl > 0) && now >= (L._fireReady || 0)) { L._fireReady = now + gun.cd * 1000; Sound.play('gun_' + it.k); } }
    }
    return r;
  };
  /* the snapshots keep the change until the host has caught up */
  const P = MiniMatch.prototype, ap = P.miniApply;
  P.miniApply = function (s) {
    const r = ap.call(this, s); if (this.kind !== 'br') return r;
    for (const c of this.chairs) { const q = c._brPred; if (!q) continue; const G = c.gs;
      if (performance.now() > q.until || (G.sel === q.sel && !!G.hol === !!q.hol)) { c._brPred = null; continue; }
      G.sel = q.sel; G.hol = q.hol; G.last = q.last; }
    return r;
  };
}
