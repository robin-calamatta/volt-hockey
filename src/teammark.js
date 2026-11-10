/* v14.2.13: in Volt Hockey it's plain who's on your team: a ring on the floor under every team-mate, in your
   team's colour, and a yellow one under your own cart. Opponents get none. 3D views and the top-down view. */
const teamMarkSides = sc => { const out = new Set(); try { for (const [p] of (sc.localControls ? sc.localControls() : [])) if (p && p.side !== undefined && p.side !== null) out.add(p.side); } catch (e) { /* none */ } return out; };
const teamMarkOn = m => m && !m.mini && m.chairs && m.chairs.length > 2;   // (Volt Hockey: the minigames mostly aren't team games)
{ const P = View3D.prototype, up = P.update;
  P.update = function (dt, ...a) {
    const r = up.call(this, dt, ...a), m = this.m, sc = this.sc; if (!this.carts || !m) return r;
    const on = teamMarkOn(m), sides = on && sc ? teamMarkSides(sc) : new Set(), mine = new Set(on && sc ? (sc.localControls ? sc.localControls() : []).map(([p]) => p && p.chair).filter(Boolean) : []);
    for (const c of this.carts) {
      const ch = c.ch; if (!ch) continue; const show = on && !ch.benched && !ch.out && sides.has(ch.side);
      if (!c.tring) { if (!show) continue; const R = (CONFIG.chair.radius || 0.55) + 0.22;
        c.tring = new THREE.Mesh(new THREE.RingGeometry(R, R + 0.11, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, fog: false })); c.tring.renderOrder = 2; this.scene.add(c.tring); }
      c.tring.visible = show; if (!show) continue;
      c.tring.material.color.setHex(mine.has(ch) ? 0xffd23f : this.teamColor(ch.side)); c.tring.position.set(ch.x, 0.03 + ((ch.gs && ch.gs.z) || 0), ch.y);
    }
    return r;
  };
}
