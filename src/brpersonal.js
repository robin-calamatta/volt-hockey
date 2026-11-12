/* v14.2.25 Volt Royale: your own messages and sounds stay yours. "ROBIN: CHEST OPENED", "OUT OF AMMO", the pick-up blip... were shouted to
   the whole match (a notice and a sound every screen showed), so a party's guests saw and heard everything the leader picked up. Now each
   one belongs to the cart it happened to: it travels with that cart (c.gs.sy / c.gs.ps) and only the screen that plays the cart shows it. */
{
  const B = MODES.br;
  B.say = function (m, c, t) { if (!c || !c.gs) return; c.gs.sy = t; c.gs.syT = MG.r2(m.gs.t + 1.4); };
  B.psfx = function (m, c, n) {
    if (!c || !c.player) return;
    if (!c.player.remote) { try { Sound.play(n); } catch (e) { /* no sound */ } return; }      // (a cart played on the host's own screen)
    const G = c.gs; G.ps = [((G.ps && G.ps[0]) || 0) + 1, n];                                   // (a guest's cart: their screen plays it)
  };
  const P = GameScene.prototype, up = P.update;
  P.update = function (...a) {
    const r = up.apply(this, a), m = this.match; if (!m || m.kind !== 'br' || !m.gs || !this.brMine) return r;
    const mine = this.brMine().map(p => p.chair).filter(Boolean), t = m.gs.t;
    if (this.online && this.online.role === 'client') for (const c of mine) { const ps = c.gs && c.gs.ps; if (ps && ps[0] !== c._psSeen) { if (c._psSeen !== undefined && !(ps[1] === 'blip' && performance.now() < (c._blipPred || 0))) { try { Sound.play(ps[1]); } catch (e) { /* no sound */ } } c._psSeen = ps[0]; } }
    if (this.noticeText && !(m.noticeLeft > 0) && m.state === 'play') { const c = mine.find(o => o.gs && o.gs.sy && t < o.gs.syT); this.noticeText.setText(c ? c.gs.sy : ''); }
    /* the stats line under the clock: only the carts on this screen (it listed every person in the match, which a 30-player public match
       couldn't fit, and on a guest's screen it ran into the storm line) */
    if (this.shotsA && this.shotsA.active) this.shotsA.setText(mine.map(c => c.out ? 'OUT' : `✖ ${c.gs.kills || 0} ${mine.length > 1 ? m.name(c) : 'ELIMS'}`).join('   '));
    return r;
  };
}
