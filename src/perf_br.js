/* v14.3.6 Volt Royale with 64 carts, smoother:
   - CPUs far from every person (over 110 m away, past the fog) think a third as often: they keep doing what they decided until their next think.
     Close to anyone, every CPU thinks every step, exactly as before.
   - Carts beyond the fog (over 125 m from your camera) aren't drawn at all.
   (Also this version: the simulation steps 120 times a second instead of 240 (match.js), ramps are found from an 8 m grid instead of
   checking every ramp on the map (modes_br.js), and carts far apart skip the full collision check (minigames.js).) */
{ const ai0 = miniAI, FAR = 110 * 110;
  miniAI = function (c, m, h) {
    if (m.kind !== 'br' || m.state !== 'play' || c.player) return ai0(c, m, h);
    if (m._humT !== m.simTime) { m._humT = m.simTime; m._hum = m.chairs.filter(o => o.player && !o.out); }
    const far = m._hum.length && m._hum.every(o => (o.x - c.x) ** 2 + (o.y - c.y) ** 2 > FAR) && !(c.gs && (c.gs.ramp >= 0 || c.gs.down))   /* (v14.3.7: gliding down too, for 100 carts) */;
    c._aiH = (c._aiH || 0) + h;
    if (far && c._aiCmd && ((c._aiN = (c._aiN || 0) + 1) % 3)) return c._aiCmd;
    const hh = c._aiH; c._aiH = 0; return (c._aiCmd = ai0(c, m, hh));
  };
}
{ const P = View3D.prototype, up = P.update, FAR = 125 * 125;
  P.update = function (dt) {
    const r = up.call(this, dt); if (!this.m || this.m.kind !== 'br' || !this.carts) return r;
    const cams = [...(this.cams ? this.cams.values() : [])].map(s => s.cam && s.cam.position).filter(Boolean); if (!cams.length) return r;
    for (const c of this.carts) if (c.group.visible) { const x = c.group.position.x, z = c.group.position.z; if (cams.every(p => (p.x - x) ** 2 + (p.z - z) ** 2 > FAR)) c.group.visible = false; }
    return r;
  };
}
