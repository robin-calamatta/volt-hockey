/* The CPU learns how YOU play. While humans play, this watches three habits and remembers them in the browser (they fade slowly, so it keeps up if you change):
     lane  - which part of the net you shoot at   (-1 = top, 0 = middle, +1 = bottom)
     pass  - how often you pass instead of shoot  (0 = never, 1 = always)
     side  - which wing you carry the ball down   (-1 = top, +1 = bottom)
   Opposing CPU carts then shade their guarding towards those habits (see rolePoint in ai.js). It is always on and never wiped (v10): an ongoing record of how you play. */
const Learn = {
  key: 'voltHockeyHabits',
  data: { games: 0, shots: 0, passes: 0, lane: 0, pass: 0.3, side: 0 },
  lastSave: 0,
  load() { try { Object.assign(this.data, JSON.parse(localStorage.getItem(this.key) || '{}')); } catch (e) { } },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { } },
  reset() { this.data = { games: 0, shots: 0, passes: 0, lane: 0, pass: 0.3, side: 0 }; this.save(); },
  mix(name, value, rate) { this.data[name] += (value - this.data[name]) * rate; },
  confidence() { return Math.min(1, (this.data.shots + this.data.passes) / CONFIG.learn.samplesForFull); },    // trust the habits more the more we have seen
  /* what the CPU uses: each habit scaled by how sure we are and by how clever this skill level is */
  profile(D) {
    const k = this.confidence() * (D.adapt || 0);
    return k > 0 ? { lane: this.data.lane * k, pass: this.data.pass * k, side: this.data.side * k, k } : null;
  },
  /* Called every physics step by the match. Watches human carts only. */
  observe(m) {
    const L = CONFIG.learn;
    for (const c of m.chairs) {
      if (!c.player || c.benched) continue;
      const holding = c.hasBall(m.ball), was = c._lh === true; c._lh = holding;
      const dir = m.nets[1 - c.side].mouthX > m.width / 2 ? 1 : -1;
      if (holding && dir * (c.x - m.width / 2) > 2) { c._ls = (c._ls || 0) + 1; if (c._ls % L.sideEvery === 0) this.mix('side', Math.max(-1, Math.min(1, (c.y - m.centerY) / (m.height / 2))), L.sideRate); }
      if (!was || holding) continue;
      const b = m.ball, sp = Math.hypot(b.vx, b.vy); if (sp < L.minReleaseSpeed) continue;          // the ball just left a human's cup hard: a shot or a pass?
      const net = m.nets[1 - c.side], t = (net.mouthX - b.x) / (b.vx || 1e-6), half = CONFIG.net.width / 2;
      const yAt = b.y + b.vy * t;
      if (t > 0 && Math.abs(yAt - m.centerY) < half + L.shotSlack) { this.mix('lane', Math.max(-1, Math.min(1, (yAt - m.centerY) / half)), L.laneRate); this.mix('pass', 0, L.passRate); this.data.shots++; }
      else if (m.chairs.some(k => k !== c && !k.benched && k.side === c.side && ((k.x - b.x) * b.vx + (k.y - b.y) * b.vy) / (sp * (Math.hypot(k.x - b.x, k.y - b.y) || 1)) > L.passCos)) { this.mix('pass', 1, L.passRate); this.data.passes++; }
    }
    if (m.simTime - this.lastSave > L.saveEvery) { this.lastSave = m.simTime; this.save(); }
  }
};
