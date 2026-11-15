/* v14.3.12 who's on your team, at a glance (Volt Hockey). Some teams' colours are close (and teams from different leagues closer still), so:
   - CLEAR TEAM COLOURS (on unless you turn it off: Settings > Controls and screen): on your screen your team plays in BLUE and the other
     team in RED, carts and shirts, whatever the teams' own colours (the names and logos stay the teams' own).
   - A ring on the floor under every cart: yellow under you, blue under your team-mates, red under the other team.
   - The nets: the one you defend has a blue zone painted in front of it and DEFEND on the floor; the one you shoot at, a red zone and SCORE.
   This is decided by the side the players on this screen are on; with players on both teams on one screen (couch versus) the teams keep
   their own colours and nobody's net is marked.
   Also fixed: a ring could be left behind on the floor, not following anyone (the carts were rebuilt when the host's rules arrived, and
   the old rings stayed). */
const TC = { mine: 0xffd23f, ally: 0x2f8bff, foe: 0xff3b30 };
const teamClearSide = sc => { const s = teamMarkSides(sc); return s.size === 1 ? [...s][0] : null; };
{ const P = View3D.prototype, bc = P.buildCarts, tc = P.teamColor, up = P.update;
  P.buildCarts = function (...a) { if (this.carts) for (const c of this.carts) { if (c.tring) { this.scene.remove(c.tring); c.tring.geometry.dispose(); c.tring = null; } } return bc.apply(this, a); };
  P.clearSide = function () { const m = this.m; if (!m || m.mini || Settings.clearTeams === false || !this.sc) return null; return teamClearSide(this.sc); };
  P.teamColor = function (side) { const s = this.clearSide(); if (s === null || s === undefined) return tc.call(this, side); return side === s ? TC.ally : TC.foe; };
  P.update = function (dt, ...a) {
    /* the carts are coloured when they're built: rebuild them when it's known which side this screen is on (or the setting changes) */
    const key = String(this.clearSide()) + '|' + (Settings.clearTeams !== false); if (this.carts && this.tcKey !== key) { const first = this.tcKey === undefined; this.tcKey = key; if (!first || this.clearSide() !== null) this.buildCarts(); }
    const r = up.call(this, dt, ...a), m = this.m; if (!this.carts || !m || m.mini) return r;
    const s = this.clearSide(), mine = new Set(this.sc && this.sc.localControls ? this.sc.localControls().map(([p]) => p && p.chair).filter(Boolean) : []);
    for (const c of this.carts) { const ch = c.ch; if (!ch || s === null) continue; const show = teamMarkOn(m) && !ch.benched && !ch.out;
      if (!c.tring) { if (!show) continue; const R = (CONFIG.chair.radius || 0.55) + 0.22; c.tring = new THREE.Mesh(new THREE.RingGeometry(R, R + 0.13, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, fog: false })); c.tring.renderOrder = 2; this.scene.add(c.tring); }
      c.tring.visible = show; if (!show) continue; c.tring.material.color.setHex(mine.has(ch) ? TC.mine : ch.side === s ? TC.ally : TC.foe); c.tring.position.set(ch.x, 0.03 + ((ch.gs && ch.gs.z) || 0), ch.y); }
    this.netMarks(s);
    return r;
  };
  /* the nets */
  P.netMarks = function (s) {
    const show = s !== null && s !== undefined && !this.m.mini && !this.m.arena;
    if (!this.nm) { if (!show) return; const C = CONFIG.net, W = this.m.width, H = this.m.height; this.nm = [];
      for (const side of [0, 1]) {   // side 0 defends the left net
        const gx = side === 0 ? C.mouthX : W - C.mouthX, dir = side === 0 ? 1 : -1, g = new THREE.Group();
        const zone = new THREE.Mesh(new THREE.CircleGeometry(2.1, 40, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false, fog: false }));
        zone.rotation.y = dir > 0 ? 0 : Math.PI; zone.position.set(gx, 0.02, H / 2); zone.renderOrder = 1;
        const edge = new THREE.Mesh(new THREE.RingGeometry(2.05, 2.2, 40, 1, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
        edge.rotation.y = zone.rotation.y; edge.position.set(gx, 0.025, H / 2); edge.renderOrder = 1;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, C.width + 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })); bar.position.set(gx - dir * 0.05, 1.32, H / 2);
        const cv = G3.canvas(512, 128), tex = new THREE.CanvasTexture(cv), label = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
        label.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2; label.position.set(gx + dir * 3.0, 0.03, H / 2); label.renderOrder = 2;
        g.add(zone, edge, bar, label); this.scene.add(g); this.nm.push({ side, g, zone, edge, bar, label, cv, tex, txt: '' });
      } }
    if (!this.nm) return;
    for (const N of this.nm) { N.g.visible = show; if (!show) continue; const mineNet = N.side === s, col = mineNet ? TC.ally : TC.foe, txt = mineNet ? 'DEFEND' : 'SCORE';
      N.zone.material.color.setHex(col); N.edge.material.color.setHex(col); N.bar.material.color.setHex(col);
      if (N.txt !== txt) { N.txt = txt; const c = N.cv.getContext('2d'); c.clearRect(0, 0, 512, 128); c.font = '900 92px "Barlow Condensed", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 10; c.strokeStyle = 'rgba(0,0,0,.55)'; c.strokeText(txt, 256, 66); c.fillStyle = mineNet ? '#7fc0ff' : '#ff7a6e'; c.fillText(txt, 256, 66); N.tex.needsUpdate = true; } }
  };
}
SETTINGS_PAGES['Controls and screen'] = (f => sc => { const rows = f(sc); rows.splice(1, 0, { label: () => `Clear team colours (you: blue, them: red)   ◀ ${Settings.clearTeams !== false ? 'On' : 'Off'} ▶`, hint: 'Volt Hockey: your team in blue and the other team in red on your screen, rings under every cart, and your net marked DEFEND', change: () => { Settings.clearTeams = Settings.clearTeams === false; Settings.save(); }, select: () => { Settings.clearTeams = Settings.clearTeams === false; Settings.save(); } }); return rows; })(SETTINGS_PAGES['Controls and screen']);
