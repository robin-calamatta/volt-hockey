/* v14.1.5: emote sounds, for real. Every emote has its own sound (no two the same) that fits what the body is doing: claps clap, the drum roll
   rolls, the salute gets a bugle call, the Robot whirrs and beeps, Swim splashes, the bike rings its bell, Time Out blows a whistle...
   They're played on little synthesised instruments (plucked and distorted guitar, piano, brass, strings, flute, marimba, bells, drums) and
   foley (claps, splashes, whooshes, crowds), with a touch of room reverb. Every tune is original. Replaces the 8-bit emote jingles. */
const EFX = {
  ready() {
    const S = Sound; if (!S.ctx) return false; if (this.ctx === S.ctx) return true; const c = this.ctx = S.ctx, sr = c.sampleRate;
    this.out = c.createGain(); this.out.gain.value = 0.9; const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.2; this.out.connect(comp); comp.connect(S.sfxBus);   // (a gentle limiter: big chords never clip)
    this.rev = c.createConvolver(); const L = Math.floor(sr * 1.6), ir = c.createBuffer(2, L, sr); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 3.2); }
    this.rev.buffer = ir; this.wet = c.createGain(); this.wet.gain.value = 0.22; this.rev.connect(this.wet); this.wet.connect(this.out);
    this.noise = S.noiseBuffer; this.ks = new Map(); return true;
  },
  f: m => 440 * Math.pow(2, (m - 69) / 12),
  bus(vol, rev = true) { const g = this.ctx.createGain(); g.gain.value = vol; g.connect(this.out); if (rev) g.connect(this.rev); return g; },
  env(g, t, a, peak, d, sus = 0, rel = 0.05) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); if (sus > 0) { g.gain.setTargetAtTime(peak * sus, t + a, d / 3); g.gain.setTargetAtTime(0.0001, t + a + d, rel); } else g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
  osc(type, freq, t, dur, out) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.connect(out); o.start(t); o.stop(t + dur + 0.1); return o; },
  nz(t, dur, out, type = 'bandpass', f = 1000, q = 1, f2) { const s = this.ctx.createBufferSource(), fl = this.ctx.createBiquadFilter(); s.buffer = this.noise; s.loop = true; fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q; s.connect(fl); fl.connect(out); s.start(t, Math.random()); s.stop(t + dur + 0.05); return fl; },
  /* ---- instruments: (time, midi, duration, volume) ---- */
  pluck(t, m, d = 1, v = 0.5, dist = 0) {               // a plucked string (Karplus-Strong), optionally through an amp
    const c = this.ctx, sr = c.sampleRate, key = m + ':' + d.toFixed(1); let buf = this.ks.get(key);
    if (!buf) { const N = Math.max(2, Math.round(sr / this.f(m))), L = Math.floor(sr * d), b = c.createBuffer(1, L, sr), y = b.getChannelData(0); for (let i = 0; i < N; i++) y[i] = Math.random() * 2 - 1; for (let i = N; i < L; i++) y[i] = 0.996 * 0.5 * (y[i - N] + y[i - N + 1 < i ? i - N + 1 : i - N]); this.ks.set(key, buf = b); }
    const s = c.createBufferSource(); s.buffer = buf; let node = s; if (dist) { const w = c.createWaveShaper(), cv = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cv[i] = Math.tanh(x * dist); } w.curve = cv; s.connect(w); node = w; }
    const g = c.createGain(); g.connect(this.bus(1)); if (dist) { g.gain.setValueAtTime(v * 0.35, t); g.gain.setTargetAtTime(v * 0.2, t + 0.05, d / 3); g.gain.setTargetAtTime(0.0001, t + d * 0.85, 0.05); } else g.gain.value = v; node.connect(g); s.start(t); s.stop(t + d + 0.05);   // (through the amp the string never fades by itself: the envelope does it)
  },
  piano(t, m, d = 1, v = 0.3) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.005, 1, d); [[1, 1], [2, 0.4], [3, 0.2], [4, 0.1]].forEach(([h, a]) => { const gg = this.ctx.createGain(); gg.gain.value = a; gg.connect(g); this.osc('sine', this.f(m) * h * (1 + (h - 1) * 0.0008), t, d, gg); }); },
  epiano(t, m, d = 1, v = 0.25) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.01, 1, d); this.osc('sine', this.f(m), t, d, g); const g2 = this.ctx.createGain(); g2.gain.value = 0.3; g2.connect(g); const o = this.osc('sine', this.f(m) * 3, t, d, g2); g2.gain.setTargetAtTime(0, t, 0.15); },
  brass(t, m, d = 0.4, v = 0.22, bend = 0) { const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(2600, t + 0.06); lp.frequency.setTargetAtTime(1500, t + 0.08, 0.2); lp.connect(g); g.connect(this.bus(v)); this.env(g, t, 0.04, 1, d, 0.75, 0.08);
    for (const det of [-4, 4]) { const o = this.osc('sawtooth', this.f(m), t, d + 0.2, lp); o.detune.value = det; if (bend) o.frequency.linearRampToValueAtTime(this.f(m + bend), t + d); const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 6; lfo.connect(lg); lg.connect(o.detune); lfo.start(t + 0.15); lfo.stop(t + d + 0.2); } },
  strings(t, m, d = 1, v = 0.12) { const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.connect(g); g.connect(this.bus(v)); this.env(g, t, Math.min(0.25, d / 3), 1, d, 0.85, 0.3); for (const det of [-8, 0, 7]) { const o = this.osc('sawtooth', this.f(m), t, d + 0.5, lp); o.detune.value = det; } },
  flute(t, m, d = 0.4, v = 0.18) { const c = this.ctx, g = c.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.05, 1, d, 0.8, 0.06); const o = this.osc('sine', this.f(m), t, d + 0.1, g), lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5; lg.gain.value = 7; lfo.connect(lg); lg.connect(o.detune); lfo.start(t); lfo.stop(t + d + 0.1); const b = c.createGain(); b.gain.value = 0.15; b.connect(g); this.nz(t, d, b, 'bandpass', this.f(m) * 2, 3); },
  marimba(t, m, d = 0.5, v = 0.3) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.002, 1, d); this.osc('sine', this.f(m), t, d, g); const g2 = this.ctx.createGain(); g2.gain.value = 0.25; g2.connect(g); this.osc('sine', this.f(m) * 4, t, 0.1, g2); },
  bell(t, m, d = 1.6, v = 0.18) { [[1, 1, d], [2.76, 0.5, d * 0.6], [5.4, 0.25, d * 0.35], [8.9, 0.12, d * 0.2]].forEach(([h, a, dd]) => { const g = this.ctx.createGain(); g.connect(this.bus(v * a)); this.env(g, t, 0.002, 1, dd); this.osc('sine', this.f(m) * h, t, dd, g); }); },
  organ(t, m, d = 0.5, v = 0.12) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.01, 1, d, 0.95, 0.05); [[1, 1], [2, 0.6], [3, 0.4], [4, 0.2]].forEach(([h, a]) => { const gg = this.ctx.createGain(); gg.gain.value = a; gg.connect(g); this.osc('sine', this.f(m) * h, t, d, gg); }); },
  bass(t, m, d = 0.3, v = 0.35) { const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(250, t + d); lp.connect(g); g.connect(this.bus(v, false)); this.env(g, t, 0.005, 1, d, 0.6, 0.05); this.osc('sawtooth', this.f(m), t, d, lp); this.osc('sine', this.f(m), t, d, g); },
  accordion(t, m, d = 0.4, v = 0.1) { const c = this.ctx, g = c.createGain(), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.6; bp.connect(g); g.connect(this.bus(v)); this.env(g, t, 0.03, 1, d, 0.9, 0.05); for (const det of [-12, 12]) { const o = this.osc('sawtooth', this.f(m), t, d, bp); o.detune.value = det; } },
  /* ---- drums and foley ---- */
  kick(t, v = 0.7) { const g = this.ctx.createGain(); g.connect(this.bus(v, false)); this.env(g, t, 0.002, 1, 0.35); const o = this.osc('sine', 150, t, 0.4, g); o.frequency.exponentialRampToValueAtTime(42, t + 0.3); },
  snare(t, v = 0.45) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.001, 1, 0.18); this.nz(t, 0.2, g, 'highpass', 1500, 0.7); const g2 = this.ctx.createGain(); g2.connect(this.bus(v * 0.6)); this.env(g2, t, 0.001, 1, 0.08); this.osc('triangle', 190, t, 0.1, g2); },
  hat(t, v = 0.15, open = false) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.001, 1, open ? 0.3 : 0.05); this.nz(t, open ? 0.35 : 0.06, g, 'highpass', 7000, 0.8); },
  clap(t, v = 0.5) { for (let i = 0; i < 3; i++) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t + i * 0.011, 0.001, 1, i === 2 ? 0.14 : 0.02); this.nz(t + i * 0.011, 0.16, g, 'bandpass', 1200 + Math.random() * 300, 1.2); } },
  tom(t, m = 45, v = 0.5) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.002, 1, 0.3); const o = this.osc('sine', this.f(m), t, 0.35, g); o.frequency.exponentialRampToValueAtTime(this.f(m - 5), t + 0.3); },
  conga(t, hi, v = 0.35) { this.tom(t, hi ? 62 : 55, v); const g = this.ctx.createGain(); g.connect(this.bus(v * 0.3)); this.env(g, t, 0.001, 1, 0.03); this.nz(t, 0.04, g, 'bandpass', 3000, 2); },
  clave(t, v = 0.3) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.001, 1, 0.08); this.osc('sine', 2500, t, 0.1, g); },
  wood(t, v = 0.3, f = 900) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.001, 1, 0.06); this.osc('triangle', f, t, 0.08, g); this.nz(t, 0.03, g, 'bandpass', f * 2, 4); },
  cowbell(t, v = 0.2) { const g = this.ctx.createGain(), bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 3; bp.connect(g); g.connect(this.bus(v)); this.env(g, t, 0.001, 1, 0.25); this.osc('square', 562, t, 0.3, bp); this.osc('square', 845, t, 0.3, bp); },
  shaker(t, d = 0.1, v = 0.15) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.01, 1, d); this.nz(t, d + 0.05, g, 'highpass', 5000, 1); },
  crash(t, v = 0.25, d = 1.8) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.002, 1, d); this.nz(t, d, g, 'highpass', 4000, 0.5); },
  whoosh(t, d = 0.35, v = 0.35, f0 = 400, f1 = 2500) { const g = this.ctx.createGain(); g.connect(this.bus(v)); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + d); this.nz(t, d, g, 'bandpass', f0, 2, f1); },
  thud(t, v = 0.6) { this.kick(t, v); const g = this.ctx.createGain(); g.connect(this.bus(v * 0.5)); this.env(g, t, 0.001, 1, 0.12); this.nz(t, 0.12, g, 'lowpass', 600, 0.7); },
  splash(t, v = 0.4, d = 0.5) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.005, 1, d); this.nz(t, d, g, 'bandpass', 2500, 0.8, 900); for (let i = 0; i < 4; i++) this.drop(t + 0.05 + Math.random() * d * 0.6, v * 0.5); },
  drop(t, v = 0.2) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.001, 1, 0.08); const f = 600 + Math.random() * 900, o = this.osc('sine', f, t, 0.1, g); o.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.07); },
  boing(t, v = 0.3, f = 220) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.003, 1, 0.45); const o = this.osc('sine', f, t, 0.5, g), l = this.ctx.createOscillator(), lg = this.ctx.createGain(); l.frequency.value = 14; lg.gain.setValueAtTime(f * 0.4, t); lg.gain.exponentialRampToValueAtTime(1, t + 0.45); l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + 0.5); o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.4); },
  crowd(t, d = 2, v = 0.3, kind = 'cheer') { const c = this.ctx; for (let i = 0; i < 6; i++) { const g = c.createGain(); g.connect(this.bus(v / 3)); const a = kind === 'aww' ? 0.15 : 0.08; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + a + i * 0.03); g.gain.setTargetAtTime(0.0001, t + d * 0.6, d / 4);
      const f = kind === 'aww' ? 500 + i * 40 : kind === 'ooh' ? 420 + i * 30 : 900 + i * 180; this.nz(t, d, g, 'bandpass', f, kind === 'cheer' ? 1.5 : 6, kind === 'aww' ? f * 0.7 : kind === 'ooh' ? f * 1.3 : f * 1.15); } },
  applause(t, d = 2, v = 0.35) { const n = Math.floor(d * 70); for (let i = 0; i < n; i++) { const tt = t + Math.random() * d, k = Math.min(1, (tt - t) / 0.3) * Math.min(1, (t + d - tt) / 0.6); if (k > 0.05) this.clap(tt, v * 0.25 * k); } },
  whistle(t, d = 0.35, v = 0.25, f = 2900) { const c = this.ctx, g = c.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.01, 1, d, 0.9, 0.03); const o = this.osc('sine', f, t, d, g), l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 38; lg.gain.value = 120; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + d); this.nz(t, d, g, 'bandpass', f, 8); },
  zap(t, v = 0.25) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.001, 1, 0.25); this.nz(t, 0.25, g, 'highpass', 3000, 1); const o = this.osc('sawtooth', 1200, t, 0.25, g); o.frequency.exponentialRampToValueAtTime(200, t + 0.22); },
  sweep(t, d, v, type, f0, f1) { const g = this.ctx.createGain(); g.connect(this.bus(v)); this.env(g, t, 0.02, 1, d, 0.9, 0.05); const o = this.osc(type, f0, t, d, g); o.frequency.exponentialRampToValueAtTime(f1, t + d); return o; },
  chord(fn, t, ms, d, v) { ms.forEach(m => this[fn](t, m, d, v)); }
};
/* the recipes: one per emote (t = start time) */
const EMOTE_SFX = {
  a_thumbs: (E, t) => { [72, 76, 79, 84].forEach((m, i) => E.piano(t + i * 0.09, m, 0.7, 0.22)); E.bell(t + 0.4, 96, 1.2, 0.12); },
  a_wave: (E, t) => { [[79, 0, 0.22], [84, 0.25, 0.4], [83, 0.7, 0.18], [79, 0.9, 0.5]].forEach(([m, a, d]) => E.flute(t + a, m, d, 0.2)); },
  a_cheer: (E, t) => { E.crowd(t, 2.4, 0.4, 'cheer'); E.chord('brass', t + 0.05, [60, 64, 67, 72], 0.35, 0.12); },
  a_clap: (E, t) => { [0, 0.42, 0.84, 1.26, 1.47, 1.68].forEach(a => E.clap(t + a, 0.55)); },
  a_pump: (E, t) => { E.kick(t); E.snare(t + 0.3); E.kick(t + 0.6); E.snare(t + 0.9); E.chord('pluck', t + 0.6, [40, 47, 52], 1.2, 0.25); E.crash(t + 0.6, 0.15); },
  a_salute: (E, t) => { [[67, 0, 0.18], [72, 0.2, 0.18], [76, 0.4, 0.18], [79, 0.6, 0.5], [76, 1.15, 0.18], [79, 1.35, 0.7]].forEach(([m, a, d]) => E.brass(t + a, m, d, 0.2)); },
  a_point: (E, t) => { E.whoosh(t, 0.25, 0.3, 600, 3000); E.bell(t + 0.22, 88, 1.0, 0.2); },
  a_flex: (E, t) => { for (let i = 0; i < 4; i++) E.pluck(t + i * 0.22, [40, 40, 43, 45][i], 0.6, 0.4, 6); E.pluck(t + 0.9, 47, 1.4, 0.45, 6); E.kick(t + 0.9); E.crash(t + 0.9, 0.2); },
  a_shrug: (E, t) => { E.brass(t, 52, 0.3, 0.18, -1); E.brass(t + 0.35, 50, 0.6, 0.18, -2); E.wood(t + 1.1, 0.2, 700); },
  a_facepalm: (E, t) => { E.clap(t + 0.05, 0.6); [[55, 0.35, 0.35], [54, 0.75, 0.35], [53, 1.15, 0.35], [52, 1.55, 0.9]].forEach(([m, a, d], i) => E.brass(t + a, m, d, 0.17, i === 3 ? -1 : 0)); },
  a_dance: (E, t) => { const b = 60 / 108 / 2; for (let i = 0; i < 16; i++) { const a = t + i * b; if (i % 4 === 0) E.kick(a); if (i % 4 === 2) E.snare(a, 0.3); E.hat(a, 0.08); if (i % 2 === 0) E.bass(a, [36, 36, 43, 41, 36, 39, 41, 43][(i / 2) % 8], b * 1.6, 0.3); if (i % 4 === 1) E.chord('epiano', a, [60, 63, 67, 70], b * 1.5, 0.08); } },
  a_drum: (E, t) => { for (let i = 0; i < 40; i++) E.snare(t + i * 0.06, 0.08 + 0.35 * i / 40); E.kick(t + 2.45); E.crash(t + 2.45, 0.35, 2); },
  a_heart: (E, t) => { [[84, 0], [88, 0.3], [91, 0.6], [89, 0.9], [88, 1.2], [84, 1.5]].forEach(([m, a]) => E.bell(t + a, m, 0.9, 0.1)); for (const a of [0, 0.75, 1.5]) { E.kick(t + a, 0.35); E.kick(t + a + 0.18, 0.25); } },
  a_robot: (E, t) => { for (let i = 0; i < 5; i++) { E.sweep(t + i * 0.5, 0.25, 0.12, 'sawtooth', 300 + (i % 2) * 200, 600 + (i % 2) * 300); E.wood(t + i * 0.5 + 0.27, 0.25, 1600); E.sweep(t + i * 0.5 + 0.32, 0.06, 0.1, 'sine', 1800 + i * 200, 1800 + i * 200); } },
  a_conductor: (E, t) => { E.tom(t, 38, 0.6); E.tom(t + 0.15, 38, 0.6); E.chord('strings', t + 0.1, [55, 62, 67, 71], 1.4, 0.06); E.chord('strings', t + 1.5, [57, 64, 69, 72, 76], 1.5, 0.06); E.tom(t + 1.5, 36, 0.7); E.crash(t + 1.5, 0.18); },
  a_muscle: (E, t) => { E.thud(t, 0.8); E.chord('brass', t + 0.02, [41, 48, 53], 0.5, 0.14); E.crowd(t + 0.3, 1.8, 0.35, 'ooh'); },
  a_kick: (E, t) => { E.whoosh(t, 0.3, 0.4, 300, 2200); E.thud(t + 0.3, 0.8); E.crowd(t + 0.45, 1.2, 0.2, 'ooh'); },
  a_raise: (E, t) => { const b = 60 / 124; for (let i = 0; i < 5; i++) { E.kick(t + i * b); E.hat(t + i * b + b / 2, 0.12, true); E.clap(t + i * b + b / 2, 0.25); } E.crowd(t + 0.2, 2.2, 0.25, 'cheer'); },
  a_tap: (E, t) => { for (let i = 0; i < 6; i++) { E.wood(t + i * 0.4, 0.4, 500); E.bass(t + i * 0.4, [33, 37, 40, 42, 40, 37][i], 0.35, 0.3); } },
  a_dab: (E, t) => { E.whoosh(t, 0.2, 0.4, 800, 3500); E.sweep(t + 0.22, 0.9, 0.3, 'sine', 120, 38); E.kick(t + 0.22, 0.6); },
  a_cancan: (E, t) => { const n = [[76, 0], [74, 0.15], [72, 0.3], [74, 0.45], [76, 0.6], [79, 0.75], [77, 0.9], [76, 1.05], [74, 1.2], [72, 1.35], [71, 1.5], [72, 1.65], [74, 1.8], [79, 1.95], [84, 2.1]]; n.forEach(([m, a]) => E.piano(t + a, m, 0.2, 0.18)); for (let i = 0; i < 15; i++) E.piano(t + i * 0.15, i % 2 ? 55 : 48, 0.14, 0.12); E.crash(t + 2.1, 0.15); },
  a_guitar: (E, t) => { [[45, 0, 0.3], [45, 0.3, 0.15], [48, 0.45, 0.3], [50, 0.75, 0.3], [52, 1.05, 0.15], [50, 1.2, 0.3], [48, 1.5, 0.3], [45, 1.8, 1.2]].forEach(([m, a, d]) => { E.pluck(t + a, m, d + 0.3, 0.4, 7); E.pluck(t + a, m + 7, d + 0.3, 0.25, 7); }); for (let i = 0; i < 8; i++) { E.kick(t + i * 0.3, 0.4); if (i % 2) E.snare(t + i * 0.3, 0.3); } },
  a_bike: (E, t) => { E.bell(t, 93, 0.6, 0.18); E.bell(t + 0.15, 93, 0.6, 0.18); for (let i = 0; i < 30; i++) E.wood(t + 0.5 + i * 0.07, 0.1, 3200); E.bell(t + 2.6, 93, 0.6, 0.15); },
  a_box: (E, t) => { for (const a of [0, 0.3, 0.5, 0.9, 1.1]) { E.whoosh(t + a, 0.12, 0.25, 1500, 3500); E.thud(t + a + 0.11, 0.45); } E.bell(t + 1.6, 79, 1.2, 0.2); E.bell(t + 1.85, 79, 1.2, 0.2); },
  a_stomp: (E, t) => { for (const a of [0, 0.4, 0.8, 1.6, 2.0]) E.thud(t + a, 0.75); E.clap(t + 1.2, 0.7); },
  a_peace: (E, t) => { E.chord('epiano', t, [62, 65, 69, 72], 1.2, 0.07); E.chord('epiano', t + 1.0, [60, 64, 67, 71], 1.2, 0.07); E.shaker(t + 0.5, 0.15, 0.08); E.shaker(t + 1.5, 0.15, 0.08); E.bass(t, 38, 0.9, 0.2); E.bass(t + 1, 36, 0.9, 0.2); },
  a_swing: (E, t) => { const b = 0.36; [36, 40, 43, 45, 46, 45, 43, 40].forEach((m, i) => E.bass(t + i * b, m, b * 0.9, 0.3)); for (let i = 0; i < 8; i++) { E.hat(t + i * b, 0.1, true); if (i % 2) E.hat(t + i * b + b * 0.66, 0.07); } E.chord('piano', t + b, [58, 62, 64, 69], 0.3, 0.07); E.chord('piano', t + b * 5, [58, 62, 64, 69], 0.3, 0.07); },
  a_row: (E, t) => { for (let i = 0; i < 3; i++) { E.splash(t + i * 1.0, 0.25, 0.4); E.sweep(t + i * 1.0 + 0.4, 0.3, 0.05, 'sawtooth', 160, 120); } [[62, 0], [66, 0.5], [69, 1.0], [67, 1.5], [66, 2.0], [62, 2.5]].forEach(([m, a]) => E.accordion(t + a, m, 0.45, 0.1)); },
  a_cross: (E, t) => { [60, 64, 67, 71, 72, 76, 79, 83, 84].forEach((m, i) => E.pluck(t + i * 0.08, m, 1.6, 0.22)); E.chord('strings', t + 0.7, [60, 64, 71], 2, 0.04); },
  a_swim: (E, t) => { for (let i = 0; i < 5; i++) E.splash(t + i * 0.55, 0.3, 0.45); for (let i = 0; i < 8; i++) E.drop(t + 0.2 + Math.random() * 2.6, 0.12); },
  a_flutter: (E, t) => { for (let i = 0; i < 18; i++) E.splash(t + i * 0.13, 0.22, 0.12); },
  a_timeout: (E, t) => { E.whistle(t, 0.35, 0.3); E.whistle(t + 0.5, 0.8, 0.3); },
  a_jig: (E, t) => { const n = [74, 76, 78, 79, 78, 76, 74, 76, 74, 71, 74, 76, 78, 81, 79, 78, 76, 74]; n.forEach((m, i) => E.strings(t + i * 0.17, m, 0.16, 0.08)); for (let i = 0; i < 6; i++) E.tom(t + i * 0.51, 43, 0.4); },
  a_binos: (E, t) => { E.sweep(t, 0.4, 0.08, 'sine', 300, 1200); E.sweep(t + 0.9, 0.4, 0.08, 'sine', 1200, 500); [[69, 0.3], [72, 0.7], [71, 1.1], [68, 1.5], [69, 1.9]].forEach(([m, a]) => E.marimba(t + a, m, 0.6, 0.2)); },
  a_goalie: (E, t) => { E.wood(t, 0.6, 400); E.thud(t + 0.02, 0.4); E.chord('brass', t + 0.35, [38, 45, 50], 1.5, 0.14); E.crowd(t + 0.35, 2, 0.3, 'cheer'); },
  a_kiss: (E, t) => { E.nz(t, 0.05, E.bus(0.5), 'bandpass', 2200, 3); E.sweep(t + 0.06, 0.25, 0.12, 'sine', 500, 900); E.chord('accordion', t + 0.4, [65, 69, 72, 77], 0.9, 0.08); },
  a_march: (E, t) => { const r = [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1]; r.forEach((on, i) => { if (on) E.snare(t + i * 0.16, 0.3); if (i % 4 === 0) E.kick(t + i * 0.16, 0.5); }); },
  a_pompom: (E, t) => { for (let i = 0; i < 10; i++) E.shaker(t + i * 0.25, 0.18, 0.18); for (const a of [0.5, 0.75, 1.5, 1.75, 2.0]) E.clap(t + a, 0.45); },
  a_lasso: (E, t) => { for (let i = 0; i < 4; i++) E.whoosh(t + i * 0.5, 0.45, 0.25, 300, 1100); [[64, 1.9], [67, 2.05], [64, 2.2], [62, 2.35], [59, 2.5]].forEach(([m, a]) => E.pluck(t + a, m, 0.6, 0.3)); E.nz(t + 2.0, 0.03, E.bus(0.6), 'highpass', 3000, 1); },
  a_wipe: (E, t) => { const g = E.bus(0.25); E.env(g, t, 0.2, 1, 0.9); E.nz(t, 1.1, g, 'bandpass', 1600, 1.2, 500); E.chord('strings', t + 0.8, [60, 65, 69], 1.2, 0.05); },
  a_split: (E, t) => { E.sweep(t, 0.6, 0.15, 'sawtooth', 300, 1400); E.nz(t + 0.65, 0.35, E.bus(0.3), 'bandpass', 2500, 1.5, 600); E.boing(t + 1.1, 0.25, 160); },
  a_steer: (E, t) => { const o = E.sweep(t, 1.6, 0.12, 'sawtooth', 60, 180); E.sweep(t + 1.6, 0.8, 0.12, 'sawtooth', 180, 120); E.nz(t + 1.7, 0.7, E.bus(0.15), 'bandpass', 2400, 6, 2000); },
  a_sprinkler: (E, t) => { for (let i = 0; i < 12; i++) E.nz(t + i * 0.17, 0.08, E.bus(0.25), 'highpass', 4000, 1); for (let i = 0; i < 10; i++) E.wood(t + 2.1 + i * 0.05, 0.12, 2400); },
  a_bow: (E, t) => { E.applause(t, 2.4, 0.4); E.chord('strings', t, [48, 55, 60, 64, 67, 72], 1.6, 0.05); E.tom(t, 36, 0.5); },
  a_tpose: (E, t) => { [[50, 0], [50, 0.35], [49, 0.7]].forEach(([m, a], i) => { E.chord('brass', t + a, [m, m + 7, m + 12], i === 2 ? 1.2 : 0.25, 0.12); E.tom(t + a, 36, 0.5); }); },
  a_hype: (E, t) => { for (const a of [0, 0.25, 0.5, 1.2]) E.chord('brass', t + a, [62, 66, 69], a === 1.2 ? 0.9 : 0.18, 0.16); E.sweep(t + 1.2, 1.2, 0.3, 'sine', 110, 36); E.kick(t + 1.2, 0.8); E.crowd(t + 1.3, 1.6, 0.25, 'cheer'); },
  a_volt: (E, t) => { E.sweep(t, 1.4, 0.12, 'sawtooth', 80, 900); for (let i = 0; i < 14; i++) E.nz(t + Math.random() * 1.4, 0.02, E.bus(0.3), 'highpass', 5000, 1); E.zap(t + 1.45, 0.4); E.thud(t + 1.45, 0.5); },
  a_karate: (E, t) => { E.whoosh(t, 0.3, 0.45, 700, 4000); E.wood(t + 0.32, 0.8, 300); E.nz(t + 0.32, 0.15, E.bus(0.5), 'bandpass', 1800, 1, 400); E.bell(t + 0.5, 43, 2.5, 0.3); },
  a_juggle: (E, t) => { for (let i = 0; i < 6; i++) E.boing(t + i * 0.42, 0.18, 300 + (i % 3) * 120); [[67, 0], [72, 0.42], [76, 0.84], [74, 1.26], [72, 1.68], [67, 2.1]].forEach(([m, a]) => E.organ(t + a, m, 0.35, 0.07)); },
  a_overclap: (E, t) => { E.applause(t, 2.6, 0.8); E.crowd(t + 0.1, 2.4, 0.2, 'cheer'); },
  a_callme: (E, t) => { for (let i = 0; i < 2; i++) for (let k = 0; k < 8; k++) { const a = t + i * 0.9 + k * 0.05; E.sweep(a, 0.045, 0.07, 'sine', k % 2 ? 1300 : 1700, k % 2 ? 1300 : 1700); } E.bass(t + 1.6, 40, 0.2, 0.3); E.bass(t + 1.8, 43, 0.3, 0.3); },
  a_salsa: (E, t) => { const b = 0.2; [0, 3, 6, 10, 12].forEach(k => E.clave(t + k * b)); for (let i = 0; i < 16; i++) { E.conga(t + i * b, i % 3 === 0, 0.25); if (i % 2 === 0) E.cowbell(t + i * b, 0.08); } [[64, 0], [67, 1], [72, 2], [67, 3], [64, 4], [67, 5], [71, 6], [67, 7]].forEach(([m, k]) => E.piano(t + k * b * 2, m, 0.3, 0.12)); },
  a_windmill: (E, t) => { E.whoosh(t, 0.6, 0.3, 300, 1800); E.chord('pluck', t + 0.55, [40, 47, 52, 56, 59, 64], 2.2, 0.3); E.crash(t + 0.55, 0.25, 2.2); },
  a_hug: (E, t) => { E.chord('strings', t, [57, 64, 69, 73], 2.2, 0.05); E.crowd(t + 0.3, 1.8, 0.25, 'aww'); },
  a_trumpet: (E, t) => { [[67, 0, 0.12], [67, 0.14, 0.12], [67, 0.28, 0.12], [72, 0.42, 0.5], [70, 1.0, 0.15], [72, 1.17, 0.15], [76, 1.34, 1.0]].forEach(([m, a, d]) => E.brass(t + a, m, d, 0.24)); },
  a_think: (E, t) => { for (let i = 0; i < 8; i++) E.wood(t + i * 0.25, 0.2, i % 2 ? 1300 : 1000); [[50, 0.1], [53, 0.6], [52, 1.1], [49, 1.6]].forEach(([m, a]) => E.brass(t + a, m, 0.4, 0.08)); E.bell(t + 2.1, 91, 1.2, 0.25); }
};
/* any emote without its own recipe (added later) still gets a unique little tune from its name, on the marimba */
function emoteFallback(E, t, id) { let h = 7; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const sc = [0, 2, 4, 7, 9], root = 60 + (h % 7); for (let i = 0; i < 6; i++) { h = (h * 1103515245 + 12345) >>> 0; E.marimba(t + i * 0.2, root + sc[h % 5] + 12 * ((h >> 8) % 2), 0.4, 0.2); } }
Jingle.play = function (id, vol = 1) {
  try {
    if (!ACTIONS[id] || !Sound.ctx || !(Settings.sfxVolume > 0) || !EFX.ready()) return; const now = Sound.ctx.currentTime; if (this.live >= 2 && now < this.busyUntil) return;
    const save = EFX.out.gain.value; EFX.out.gain.setValueAtTime(0.9 * vol, now); (EMOTE_SFX[id] || ((E, t) => emoteFallback(E, t, id)))(EFX, now + 0.03);
    const dur = Math.min(3.8, ACTIONS[id].dur || 2.5); this.live = (this.live || 0) + 1; this.busyUntil = now + dur; setTimeout(() => { this.live = Math.max(0, this.live - 1); }, dur * 1000);
  } catch (e) { console.warn('emote sound', e); }
};
