/* v14.3.9 3D sound: you can hear where things are, best on headphones.
   - Sounds made by carts and things in the world (gunshots, explosions, bumps, doors, chests, healing, reloading...) come from where they
     happened: left or right, in front or behind, above or below (the browser's HRTF panner: the same trick 3D games use), quieter and
     duller the further away they are, with more of their echo left at a distance. Your own sounds stay in the middle.
   - In Volt Royale every other cart near you (the 6 closest that are moving, within 40 m) has its own motor and tyre noise, so you hear
     a cart coming, and from where.
   - Direction is relative to where your camera faces. With two or more players on one screen there's no single "where": sounds are
     placed by distance only (from whichever of you is closest).
   - Settings > Sound and commentary: "3D sound (headphones)" turns the direction part off (sounds are then only quieter with distance). */
const Spatial = {
  ear: null, live: 0, voices: new Map(), phone: !!(window.matchMedia && matchMedia('(pointer: coarse)').matches),
  on() { return Settings.spatial !== false; },
  gain(d) { return 1 / (1 + Math.max(0, d - 3) / 10); },
  rel(E, p) {                                   // where p is from the ear: [right, up, forward, distance]
    let best = null; for (const e of E.list) { const dx = p.x - e.x, dy = p.y - e.y, dz = (p.z === undefined ? e.z : p.z) - e.z, d = Math.hypot(dx, dy, dz); if (!best || d < best[3]) best = [dx, dy, dz, d]; }
    const [dx, dy, dz, d] = best; return [dx * -E.fy + dy * E.fx, dz, dx * E.fx + dy * E.fy, d];
  },
  /* the chain one sound plays through: gain (distance) -> lowpass (air) -> panner (direction) */
  chain(c, E, p) {
    const [rx, ry, rf, d] = this.rel(E, p), k = this.gain(d), g = c.createGain(), lp = c.createBiquadFilter(); g.gain.value = k; lp.type = 'lowpass'; lp.frequency.value = Math.max(1400, 19000 * Math.exp(-d / 40)); g.connect(lp);
    let tail = lp; if (E.solo && this.on() && d > 1.2) { const pn = c.createPanner(); pn.panningModel = this.live < 24 && !Spatial.phone ? 'HRTF' : 'equalpower';   /* (v14.3.10: the cheaper panner on a phone) */ pn.distanceModel = 'linear'; pn.rolloffFactor = 0;
      const n = Math.max(1, Math.hypot(rx, ry, rf)); this.setPos(pn, c, rx / n * 2, ry / n * 2, -rf / n * 2); lp.connect(pn); tail = pn; }
    return { g, tail, k, d };
  },
  setPos(pn, c, x, y, z) { if (pn.positionX) { const t = c.currentTime; pn.positionX.setTargetAtTime(x, t, 0.03); pn.positionY.setTargetAtTime(y, t, 0.03); pn.positionZ.setTargetAtTime(z, t, 0.03); } else pn.setPosition(x, y, z); },
  /* where you're listening from: called every frame by the game scene */
  listen(sc) {
    const vps = (sc.vps || []).filter(v => v.chair || v.spect), m = sc.match; if (!m || !vps.length || sc.setup.demo) { this.ear = null; return; }
    const list = vps.map(v => { const ch = v.chair || v.spect; return { x: ch.x, y: ch.y, z: (ch.gs && ch.gs.z) || 0, ch }; });
    let fx = 0, fy = -1; const v0 = vps[0];
    try { if (sc.v3 && sc.v3.camFor) { const cam = sc.v3.camFor(v0.key).cam, f = new THREE.Vector3(); cam.getWorldDirection(f); const n = Math.hypot(f.x, f.z); if (n > 0.05) { fx = f.x / n; fy = f.z / n; } else { const h = list[0].ch.heading || 0; fx = Math.cos(h); fy = Math.sin(h); } } } catch (e) { /* 2D: up the screen */ }
    this.ear = { list, fx, fy, solo: vps.length === 1 };
  },
  /* the other carts' motors (Volt Royale) */
  motors(sc, dt) {
    const m = sc.match, c = Sound.ctx, E = this.ear;
    const want = new Map(); if (c && E && m && m.kind === 'br' && m.state !== 'over' && Settings.cartSound !== false) {
      const mine = new Set(E.list.map(e => e.ch)), cand = [];
      for (const ch of m.chairs) { if (mine.has(ch) || ch.out || !ch.gs || ch.gs.plane || ch.gs.glide) continue;
        const sp = ch._spd = (ch._spd || 0) * 0.8 + 0.2 * (ch._lx === undefined || !dt ? 0 : Math.min(15, Math.hypot(ch.x - ch._lx, ch.y - ch._ly) / dt)); ch._lx = ch.x; ch._ly = ch.y;
        if (sp < 0.6) continue; const [, , , d] = this.rel(E, { x: ch.x, y: ch.y, z: ch.gs.z || 0 }); if (d < 40) cand.push([d, ch, sp]); }
      cand.sort((a, b) => a[0] - b[0]); for (const [d, ch, sp] of cand.slice(0, Spatial.phone ? 3 : 6)) want.set(ch, [d, sp]);
    } else if (m) for (const ch of m.chairs) { ch._lx = ch.x; ch._ly = ch.y; }
    for (const [ch, V] of this.voices) if (!want.has(ch)) { this.stopVoice(V); this.voices.delete(ch); }
    if (!c) return; const vol = (Settings.cartVolume === undefined ? 1 : Settings.cartVolume), t = c.currentTime;
    for (const [ch, [d, sp]] of want) {
      let V = this.voices.get(ch);
      if (!V) { const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), nz = c.createBufferSource(), nf = c.createBiquadFilter(), g = c.createGain(), lp = c.createBiquadFilter(), pn = c.createPanner();
        o.type = 'sawtooth'; o2.type = 'triangle'; f.type = 'lowpass'; f.Q.value = 2; nz.buffer = Sound.noiseBuffer; nz.loop = true; nf.type = 'bandpass'; nf.Q.value = 0.8; lp.type = 'lowpass'; g.gain.value = 0;
        pn.panningModel = Spatial.phone ? 'equalpower' : 'HRTF'; pn.distanceModel = 'linear'; pn.rolloffFactor = 0;
        const og = c.createGain(); og.gain.value = 0.55; o.connect(f); o2.connect(f); f.connect(og); og.connect(g); nz.connect(nf); nf.connect(g); g.connect(lp); lp.connect(pn); pn.connect(Sound.sfxBus);
        o.start(); o2.start(); nz.start(0, Math.random()); V = { o, o2, f, nz, nf, g, lp, pn }; this.voices.set(ch, V); }
      const [rx, ry, rf] = this.rel(E, { x: ch.x, y: ch.y, z: ch.gs.z || 0 }), k = Math.min(1, sp / CONFIG.chair.maxSpeed), n = Math.max(1, Math.hypot(rx, ry, rf));
      if (E.solo && this.on()) this.setPos(V.pn, c, rx / n * 2, ry / n * 2, -rf / n * 2); else this.setPos(V.pn, c, 0, 0, -1);
      V.o.frequency.setTargetAtTime(60 + k * 150, t, 0.08); V.o2.frequency.setTargetAtTime(600 + k * 1300, t, 0.08); V.f.frequency.setTargetAtTime(350 + k * 1300, t, 0.1); V.nf.frequency.setTargetAtTime(500 + k * 900, t, 0.1);
      V.lp.frequency.setTargetAtTime(Math.max(1200, 16000 * Math.exp(-d / 25)), t, 0.1);
      V.g.gain.setTargetAtTime((0.012 + 0.05 * k) * vol / (1 + d / 7), t, 0.08);
    }
  },
  stopVoice(V) { try { const t = Sound.ctx.currentTime; V.g.gain.setTargetAtTime(0, t, 0.08); setTimeout(() => { try { V.o.stop(); V.o2.stop(); V.nz.stop(); V.pn.disconnect(); } catch (e) { /* gone */ } }, 600); } catch (e) { /* no sound */ } },
  stopAll() { for (const V of this.voices.values()) this.stopVoice(V); this.voices.clear(); this.ear = null; }
};
Sound.playAt = function (name, p) {
  const E = Spatial.ear; if (!p || !E || !(p.x >= 0 || p.x < 0)) return this.play(name);
  try {
    if (!SFX[name]) return; this.resume(); const c = this.ctx; if (!c) return;
    const { g, tail, k, d } = Spatial.chain(c, E, p); if (d < 1.2) return this.play(name); if (k < 0.03) return;
    const bus = this.sfxBus, vin = this.verbIn, wet = vin ? c.createGain() : null; if (wet) { wet.gain.value = Math.min(1, k * 1.8); wet.connect(vin); }
    tail.connect(bus); this.sfxBus = g; if (wet) this.verbIn = wet; Spatial.live++;
    try { SFX[name](this); } finally { this.sfxBus = bus; if (vin) this.verbIn = vin; }
    setTimeout(() => { Spatial.live--; try { tail.disconnect(); if (wet) wet.disconnect(); } catch (e) { /* gone */ } }, 4000);
  } catch (e) { console.warn('sound failed', e); }
};
/* a match's sounds carry where they happened (and that goes to online players with the sound) */
Match.prototype.sfx = function (name, playerId = 0, pos) {
  const p = pos || (this._src ? { x: this._src.x, y: this._src.y, z: ((this._src.gs && this._src.gs.z) || 0) + 0.6 } : null);
  Sound.playAt(name, p); if (this.sfxQueue) this.sfxQueue.push(p ? [name, playerId, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10, Math.round((p.z || 0) * 10) / 10] : [name, playerId]);
};
/* while a cart is moving, picking up, using, reloading or swinging, its sounds come from it */
{ const B = MODES.br;
  for (const [k, ci, mi] of [['move', 1, 0], ['take', 1, 0], ['use', 0, 1], ['reload', 0, 1], ['melee', 0, 1]]) { const f = B[k]; if (typeof f !== 'function') continue;
    B[k] = function (...a) { const c = a[ci], m = a[mi]; if (!m || !c || typeof c !== 'object') return f.apply(this, a); const was = m._src; m._src = c; try { return f.apply(this, a); } finally { m._src = was; } }; }
  const sn = B.sfxNear; if (sn) B.sfxNear = function (m, name, x, y, r = 26) { if (m.chairs.some(o => o.player && Math.hypot(o.x - x, o.y - y) < r)) m.sfx(name, 0, { x, y, z: m._src && m._src.gs ? (m._src.gs.z || 0) + 0.6 : undefined }); };
}
/* the listener and the motors follow the game every frame; they stop when the game does */
{ const P = GameScene.prototype, up = P.update;
  P.update = function (time, delta) { const r = up.call(this, time, delta); try { if (this.sys.isActive()) { Spatial.listen(this); Spatial.motors(this, Math.min(0.1, delta / 1000)); } } catch (e) { /* sound must never break the game */ } return r; };
  { const cr = P.create; P.create = function (...a) { const r = cr.apply(this, a); this.events.once('shutdown', () => Spatial.stopAll()); this.events.on('pause', () => { for (const V of Spatial.voices.values()) Spatial.stopVoice(V); Spatial.voices.clear(); }); return r; }; }
}
