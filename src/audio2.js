/* v13.3: more realistic sound effects. Everything is still made in the browser (no sound files), but built the way real sounds are:
   - a shared REVERB (a synthetic room / outdoor echo) that loud sounds feed, so shots and explosions ring out;
   - MODAL hits: a knock on wood or a clang on metal is a few partials (frequencies) that ring and die away at their own rates;
   - noise shaped by filters for air, cloth, splinters and rumble;
   - a quiet electric-motor whine under your own cart that follows its speed.
   The old effects in audio.js are replaced or layered here. */
{ const S = Sound, res = S.resume.bind(S);
  S.resume = function () {
    res(); const c = this.ctx; if (!c || this.verb) return;
    const len = Math.floor(c.sampleRate * 1.6), ir = c.createBuffer(2, len, c.sampleRate);           // the reverb: decaying noise, a little brighter early on
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); let lp = 0; for (let i = 0; i < len; i++) { const k = i / len, n = Math.random() * 2 - 1; lp += (n - lp) * (0.5 - 0.42 * k); d[i] = lp * Math.pow(1 - k, 3.2) * (i < c.sampleRate * 0.012 ? i / (c.sampleRate * 0.012) : 1); } }
    this.verb = c.createConvolver(); this.verb.buffer = ir; this.verbIn = c.createGain(); this.verbIn.gain.value = 0.5; this.verbIn.connect(this.verb); this.verb.connect(this.sfxBus);
    const pink = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), pd = pink.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;     // pink-ish noise: rumble, wind
    for (let i = 0; i < pd.length; i++) { const w = Math.random() * 2 - 1; b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048; pd[i] = (b0 + b1 + b2 + w * 0.02) * 2.2; }
    this.pinkBuffer = pink;
  };
  Object.assign(S, {
    /* building blocks. at: seconds from now; wet: how much goes to the reverb */
    env(g, t, a, peak, d, curve = 'exp') { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); else g.gain.linearRampToValueAtTime(0, t + a + d); },
    out(g, wet = 0) { g.connect(this.sfxBus); if (wet && this.verbIn) { const w = this.ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(this.verbIn); } },
    nz({ at = 0, type = 'bandpass', f = 1000, f2, q = 1, vol = 0.2, a = 0.002, d = 0.1, wet = 0, pink = false, rate = 1 }) {
      const c = this.ctx, t = c.currentTime + at, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = pink && this.pinkBuffer ? this.pinkBuffer : this.noiseBuffer; s.playbackRate.value = rate; s.loop = true;
      fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + a + d);
      this.env(g, t, a, vol, d); s.connect(fl); fl.connect(g); this.out(g, wet); s.start(t, Math.random()); s.stop(t + a + d + 0.05);
    },
    osc({ at = 0, wave = 'sine', f = 440, f2, vol = 0.2, a = 0.003, d = 0.2, wet = 0, vib = 0, vibF = 6 }) {
      const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain(); o.type = wave; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(10, f2), t + a + d);
      if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = vibF; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + a + d + 0.05); }
      this.env(g, t, a, vol, d); o.connect(g); this.out(g, wet); o.start(t); o.stop(t + a + d + 0.05);
    },
    modal(at, partials, vol, wet = 0.1) { for (const [f, k, d] of partials) this.osc({ at, f: f * (0.98 + Math.random() * 0.04), vol: vol * k, a: 0.001, d, wet }); },   // a struck object
    wood(at = 0, vol = 0.3, size = 1) { this.modal(at, [[180 / size, 1, 0.12], [410 / size, 0.6, 0.07], [760 / size, 0.35, 0.04], [1250 / size, 0.2, 0.025]], vol); this.nz({ at, f: 900 / size, q: 1.2, vol: vol * 0.8, d: 0.05 }); },
    metal(at = 0, vol = 0.25, size = 1, ring = 1) { this.modal(at, [[520 / size, 1, 0.5 * ring], [1340 / size, 0.6, 0.35 * ring], [2210 / size, 0.4, 0.25 * ring], [3170 / size, 0.25, 0.18 * ring], [4380 / size, 0.15, 0.12 * ring]], vol, 0.25); this.nz({ at, type: 'highpass', f: 3000, vol: vol * 0.6, d: 0.03 }); },
    thud(at = 0, vol = 0.4, f = 90) { this.osc({ at, f: f * 1.8, f2: f * 0.6, vol, a: 0.002, d: 0.16 }); this.nz({ at, type: 'lowpass', f: 500, vol: vol * 0.7, d: 0.08 }); },
    creak(at = 0, dur = 0.5, vol = 0.08, f = 380) {                     // a hinge: a rough, wavering squeak
      const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 1.35, t + dur * 0.6); o.frequency.linearRampToValueAtTime(f * 0.9, t + dur);
      l.type = 'square'; l.frequency.value = 23; lg.gain.value = f * 0.12; l.connect(lg); lg.connect(o.frequency); fl.type = 'bandpass'; fl.frequency.value = f * 3; fl.Q.value = 4;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.04); g.gain.linearRampToValueAtTime(vol * 0.7, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(fl); fl.connect(g); this.out(g, 0.15); o.start(t); l.start(t); o.stop(t + dur + 0.05); l.stop(t + dur + 0.05);
    },
    /* the motor under your own cart: a soft whine that rises with speed (one per player) */
    motor(id, speed, on = true) {
      if (!this.ctx) return; const L = this.motors || (this.motors = {}); let d = L[id];
      if (!on) { if (d) { d.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08); const o = d; setTimeout(() => { try { o.o1.stop(); o.o2.stop(); } catch (e) {} }, 500); clearInterval(d.iv); delete L[id]; } return; }
      if (!d) { const c = this.ctx, o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o1.type = 'sawtooth'; o2.type = 'triangle'; f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 2; g.gain.value = 0;
        o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfxBus); o1.start(); o2.start(); d = L[id] = { o1, o2, f, g }; d.iv = setInterval(() => { if (performance.now() - d.at > 300) this.motor(id, 0, false); }, 200); }
      const t = this.ctx.currentTime, k = Math.max(0, Math.min(1, speed)); d.at = performance.now();
      d.o1.frequency.setTargetAtTime(70 + k * 160, t, 0.08); d.o2.frequency.setTargetAtTime(700 + k * 1500, t, 0.08); d.f.frequency.setTargetAtTime(400 + k * 1400, t, 0.1); d.g.gain.setTargetAtTime(k < 0.03 ? 0 : 0.012 + k * 0.022, t, 0.1);
    }
  });
  const R = (a, b) => a + Math.random() * (b - a);
  Object.assign(SFX, {
    /* the menus: soft clicks rather than beeps */
    blip: s => { s.osc({ f: 1900, f2: 1500, vol: 0.06, d: 0.025 }); s.nz({ type: 'highpass', f: 4000, vol: 0.05, d: 0.012 }); },
    select: s => { s.osc({ f: 880, vol: 0.09, d: 0.07 }); s.osc({ at: 0.05, f: 1320, vol: 0.09, d: 0.12 }); s.nz({ type: 'highpass', f: 5000, vol: 0.04, d: 0.015 }); },
    back: s => { s.osc({ f: 700, f2: 420, vol: 0.09, d: 0.1 }); },
    count: s => { s.osc({ f: 880, vol: 0.14, d: 0.18 }); s.osc({ f: 1760, vol: 0.04, d: 0.1 }); },
    /* a referee's pea whistle: two close pitches warbling, with breath */
    whistle: s => { const d = 0.5; s.osc({ f: 2950, vol: 0.12, a: 0.02, d, vib: 70, vibF: 28, wet: 0.2 }); s.osc({ f: 3010, vol: 0.09, a: 0.02, d, vib: 60, vibF: 31 }); s.nz({ f: 3000, q: 3, vol: 0.05, a: 0.02, d }); },
    /* the goal horn: a big brassy chord with a slow swell and the arena's echo */
    goal: s => { for (const [f, v] of [[110, 0.14], [138.6, 0.1], [165, 0.1], [220, 0.06]]) { const c = s.ctx, t = c.currentTime, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.setValueAtTime(400, t); fl.frequency.linearRampToValueAtTime(1600, t + 0.25); fl.Q.value = 1.5; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.12); g.gain.setValueAtTime(v, t + 1.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9); o.connect(fl); fl.connect(g); s.out(g, 0.45); o.start(t); o.stop(t + 2); } },
    foul: s => { for (const f of [196, 247]) s.osc({ wave: 'square', f, vol: 0.06, a: 0.01, d: 0.5 }); },   // a buzzer
    /* carts knocking into things: a hollow plastic-and-metal thump */
    bump: s => { const k = R(0.85, 1.2); s.thud(0, 0.22, 85 * k); s.modal(0.004, [[310 * k, 1, 0.06], [720 * k, 0.5, 0.04]], 0.08); s.nz({ f: 1800 * k, q: 1.5, vol: 0.05, d: 0.04 }); },
    screech: s => s.nz({ f: 2900, f2: 2300, q: 7, vol: 0.06, a: 0.02, d: 0.2 }),
    /* explosions: a crack, a deep thump that falls, rumbling debris and a long echo */
    boom: s => { s.nz({ type: 'highpass', f: 1500, vol: 0.5, d: 0.04, wet: 0.4 }); s.osc({ f: 90, f2: 28, vol: 0.7, a: 0.003, d: 0.7 }); s.nz({ type: 'lowpass', f: 900, f2: 120, vol: 0.6, a: 0.003, d: 1.2, wet: 0.6, pink: true });
      for (let i = 0; i < 6; i++) s.nz({ at: 0.15 + Math.random() * 0.6, f: R(1500, 4000), q: 2, vol: 0.05, d: 0.03 }); },
    /* opening things */
    chest_open: s => { s.metal(0, 0.06, 1.4, 0.4); s.creak(0.06, 0.45, 0.07, 300); s.wood(0.5, 0.2, 1.1); for (let i = 0; i < 6; i++) s.osc({ at: 0.45 + i * 0.06, f: [1568, 1976, 2349, 2637, 3136, 3951][i], vol: 0.04, d: 0.5, wet: 0.5 }); },   // (a latch, a creak, the lid, a little sparkle)
    crate_open: s => { s.metal(0, 0.1, 1.7, 0.3); s.metal(0.12, 0.08, 1.6, 0.3); s.wood(0.3, 0.22, 0.8); },
    pickup: s => { s.nz({ f: 1200, f2: 2400, q: 1.2, vol: 0.1, a: 0.005, d: 0.08 }); s.metal(0.06, 0.04, 2.2, 0.25); },          // a grab: cloth, then a clink
    door_open: s => { s.metal(0, 0.05, 2, 0.3); s.creak(0.05, 0.65, 0.06, 340); },
    door_close: s => { s.creak(0, 0.25, 0.04, 360); s.wood(0.22, 0.4, 1.3); s.thud(0.22, 0.25, 70); s.metal(0.26, 0.05, 2, 0.3); },
    wood_hit: s => { s.wood(0, 0.32, R(0.9, 1.2)); s.thud(0, 0.15, 80); },
    wood_break: s => { s.thud(0, 0.4, 60); s.wood(0, 0.4, 0.9); for (let i = 0; i < 10; i++) { s.wood(0.03 + Math.random() * 0.35, 0.12, R(0.5, 1.6)); s.nz({ at: Math.random() * 0.3, f: R(1500, 5000), q: 3, vol: 0.06, d: 0.02 }); } s.nz({ type: 'lowpass', f: 600, vol: 0.2, d: 0.4, pink: true, wet: 0.3 }); },
    /* fights */
    melee_hit: s => { s.thud(0, 0.45, 70); s.nz({ f: 1600, q: 0.9, vol: 0.25, d: 0.05 }); s.modal(0.003, [[240, 1, 0.08], [510, 0.4, 0.05]], 0.1); },
    melee_whiff: s => s.nz({ f: 500, f2: 1600, q: 1.4, vol: 0.12, a: 0.06, d: 0.14 }),
    shield_hit: s => { s.metal(0, 0.18, R(1.1, 1.3), 0.7); s.nz({ type: 'highpass', f: 2500, vol: 0.2, d: 0.03 }); },
    shield_bash: s => { s.metal(0, 0.2, 1.5, 0.5); s.thud(0, 0.4, 65); },
    shield_break: s => { s.metal(0, 0.25, 1.2, 1); for (let i = 0; i < 8; i++) s.osc({ at: Math.random() * 0.25, f: R(2500, 6000), vol: 0.05, d: R(0.1, 0.3), wet: 0.3 }); s.nz({ type: 'highpass', f: 3000, vol: 0.2, d: 0.35, wet: 0.3 }); },
    headshot: s => { s.osc({ f: 2600, vol: 0.12, d: 0.25 }); s.osc({ f: 3900, vol: 0.06, d: 0.18 }); s.nz({ type: 'highpass', f: 5000, vol: 0.1, d: 0.02 }); },   // the "tink" you hear when you land one
    bubble: s => { s.osc({ f: 180, f2: 620, vol: 0.18, a: 0.01, d: 0.35, wet: 0.4 }); for (let i = 0; i < 5; i++) s.osc({ at: 0.05 + i * 0.05, f: 900 + i * 260, vol: 0.04, d: 0.4, wet: 0.6 }); s.nz({ f: 3000, q: 0.8, vol: 0.06, a: 0.1, d: 0.4, wet: 0.4 }); },
    /* the storm: a rising siren-like swell over a low drone (stage warnings), and thunder when it starts moving */
    storm_warn: s => { const c = s.ctx, t = c.currentTime; for (const [f, v] of [[196, 0.08], [293.7, 0.06], [392, 0.05]]) { const o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.94, t); o.frequency.exponentialRampToValueAtTime(f * 1.06, t + 1.4); fl.type = 'lowpass'; fl.frequency.setValueAtTime(300, t); fl.frequency.exponentialRampToValueAtTime(2600, t + 1.4); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2); o.connect(fl); fl.connect(g); s.out(g, 0.5); o.start(t); o.stop(t + 2.3); }
      for (const [i, f] of [[0, 1318.5], [1, 1567.98], [2, 1975.5]]) s.osc({ at: 1.25 + i * 0.12, f, vol: 0.07, d: 0.9, wet: 0.6 }); s.nz({ type: 'lowpass', f: 200, vol: 0.18, a: 0.6, d: 1.4, pink: true }); },
    storm_close: s => { s.nz({ type: 'lowpass', f: 1800, f2: 90, vol: 0.5, a: 0.02, d: 2.6, pink: true, wet: 0.6 }); s.osc({ f: 55, f2: 30, vol: 0.4, a: 0.05, d: 2.2 }); for (let i = 0; i < 8; i++) s.nz({ at: Math.random() * 0.8, type: 'lowpass', f: R(300, 900), vol: 0.15, d: R(0.2, 0.5), pink: true });
      s.nz({ at: 0.3, f: 700, f2: 1400, q: 0.7, vol: 0.12, a: 0.8, d: 1.8, pink: true }); },   // (thunder, then the wind picks up)
    /* opening a door or a chest the CPU does far away is still heard: fine, it's a game */
    drift: s => s.nz({ f: 2600, f2: 2300, q: 5, vol: 0.05, d: 0.12 })
  });
  /* gunshots: the same layers as before, plus the echo off the world and the shooter's action cycling */
  const shot = S.shot.bind(S);
  S.shot = function (o) { shot(o); if (!this.verbIn) return; this.nz({ type: 'bandpass', f: 900, q: 0.6, vol: (o.vol || 0.5) * 0.35, a: 0.002, d: (o.tail || 0.4) * 0.6, wet: 1.4 }); this.nz({ at: 0.06, type: 'highpass', f: 3500, vol: (o.vol || 0.5) * 0.06, d: 0.015 }); };
}
