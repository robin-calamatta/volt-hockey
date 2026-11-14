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
/* v14.3.10 the 3D view with lots of carts (this was most of a phone's frame with 100): carts out of sight (beyond the fog: 125 m, or 85 m on a
   phone or tablet) aren't drawn or updated at all, not even their position in the scene; carts further than 35 m have their arms and
   cosmetics animated every third frame; and what a cart wears is checked twice a second, not every frame. */
const brLodFar = () => isMobileDevice() || Settings.gfx === 'Low' ? 85 : 125;
{ const P = View3D.prototype, up = P.update;
  P.update = function (dt) {
    if (!this.m || this.m.kind !== 'br' || !this.carts) return up.call(this, dt);
    const cams = [...(this.cams ? this.cams.values() : [])].map(s => s.cam && s.cam.position).filter(p => p && (p.x || p.z)), all = this.carts, F = brLodFar() ** 2;
    if (!cams.length) return up.call(this, dt);
    const near = []; this.lodFrame = (this.lodFrame || 0) + 1;
    for (const c of all) { const ch = c.ch, d2 = Math.min(...cams.map(p => (p.x - ch.x) ** 2 + (p.z - ch.y) ** 2));
      if (d2 > F && !ch.player) { if (c.group.visible) c.group.visible = false; c.group.matrixWorldAutoUpdate = false; c.lod = 2; continue; }
      c.group.matrixWorldAutoUpdate = true; c.lod = d2 > 35 * 35 ? 1 : 0; near.push(c); }
    this.carts = near; try { return up.call(this, dt); } finally { this.carts = all; }
  };
}
/* v14.3.10 also not drawn when far away: loot (60 m; 45 m on a phone or with Low graphics) and doors (75 m; 55 m). They were all drawn,
   1,300 pieces of loot and 500 doors, every frame. And the map itself (buildings, rocks, roads: it never moves) isn't re-positioned
   every frame any more. */
{ const P = View3D.prototype, up = P.update;
  P.update = function (dt) {
    const r = up.call(this, dt); if (!this.m || this.m.kind !== 'br') return r;
    if (this.scene.matrixAutoUpdate) { this.scene.updateMatrix(); this.scene.matrixAutoUpdate = false; }   /* (the scene itself never moves: left on, it made every object below it update, frozen or not) */
    if (this.brG && this.brG.matrixAutoUpdate) { this.brG.updateMatrix(); this.brG.matrixAutoUpdate = false; }
    if (this.arena && this.arena.frozen !== this.arena.children.length) { this.arena.traverse(o => { o.updateMatrix(); o.matrixAutoUpdate = false; }); this.arena.updateMatrixWorld(true); this.arena.matrixWorldAutoUpdate = false; this.arena.frozen = this.arena.children.length; }
    const cams = [...(this.cams ? this.cams.values() : [])].map(s => s.cam && s.cam.position).filter(p => p && (p.x || p.z)); if (!cams.length) return r;
    const low = isMobileDevice() || Settings.gfx === 'Low', LF = (low ? 45 : 60) ** 2, DF = (low ? 55 : 75) ** 2, far = (x, z, F) => { for (const p of cams) if ((p.x - x) ** 2 + (p.z - z) ** 2 < F) return false; return true; };
    if (this.brLoot) for (const mesh of this.brLoot.values()) { const U = mesh.userData;
      if (far(mesh.position.x, mesh.position.z, LF)) { if (!U.culled) { U.culled = 1; U.wasVis = mesh.visible; } mesh.visible = false; mesh.matrixWorldAutoUpdate = false; }
      else if (U.culled) { U.culled = 0; mesh.visible = U.wasVis !== false; mesh.matrixWorldAutoUpdate = true; } }
    if (this.doorG) for (const D of this.doorG) { const g = D.grp; if (far(D.d.cx === undefined ? D.d.x0 : D.d.cx, D.d.cy === undefined ? D.d.y0 : D.d.cy, DF)) { g.visible = false; g.matrixWorldAutoUpdate = false; } else g.matrixWorldAutoUpdate = true; }
    return r;
  };
}
