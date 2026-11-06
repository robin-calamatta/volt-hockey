/* The title screen's opening: a sparkler burns the VOLT HOCKEY logo in letter by letter, throwing fizzling, crackling sparks, then the logo
   flashes and the rest of the title fades in. Plays once per visit; any key, button or tap skips it. Afterwards the logo keeps an
   occasional fizzle. Used by TitleScene (scenes.js). */
const INTRO = { dark: 350, volt: 1300, gap: 180, hockey: 1500, flash: 260, fade: 700, gravity: 520 };

class Sparks {                                                   // hand-drawn sparks: short glowing streaks that fall, fade and sometimes crackle
  constructor(sc, depth) {
    this.list = [];
    this.g = sc.add.graphics().setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
  }
  burst(x, y, n, power = 1, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = opts.up ? -Math.PI / 2 + (Math.random() - 0.5) * 2.4 : Math.random() * Math.PI * 2, s = (70 + Math.random() * 360) * power;
      this.list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 50 * power, age: 0, life: 0.22 + Math.random() * 0.6 * Math.max(0.5, power), crackle: !opts.small && Math.random() < 0.16, w: opts.small ? 1.6 : 3 });
    }
  }
  update(dt) {
    const g = this.g; g.clear(); const keep = [];
    for (const s of this.list) {
      s.age += dt;
      if (s.age >= s.life) { if (s.crackle) this.burst(s.x, s.y, 4 + (Math.random() * 4 | 0), 0.35, { small: true }); continue; }   // a crackle: the spark splits into tiny ones
      s.vy += INTRO.gravity * dt; s.vx *= 0.986; s.x += s.vx * dt; s.y += s.vy * dt;
      const t = s.age / s.life, col = t < 0.35 ? 0xffffff : t < 0.65 ? 0xffe27a : 0xff8a2a;
      g.lineStyle(s.w * (1 - t * 0.6), col, 1 - t).lineBetween(s.x, s.y, s.x - s.vx * 0.04, s.y - s.vy * 0.04);
      keep.push(s);
    }
    this.list = keep.length > 1600 ? keep.slice(-1600) : keep;
  }
}

class SparklerIntro {
  /* words: the logo's text objects, in the order they burn in. under: everything else on the title, shown when the logo is done. */
  constructor(sc, words, onDone) {
    this.sc = sc; this.words = words; this.onDone = onDone; this.t = 0; this.done = false;
    const V = CONFIG.view;
    this.cover = sc.add.rectangle(V.width / 2, V.height / 2, V.width, V.height, 0x05080b, 1).setDepth(30);
    this.copies = words.map(w => {                                   // the logo above the cover, revealed behind the sparkler
      const c = sc.add.text(w.x, w.y, w.text, w.style).setOrigin(0.5).setDepth(32), b = c.getBounds();
      const mg = sc.make.graphics({ add: false }); c.setMask(mg.createGeometryMask());
      return { c, b, mg };
    });
    this.sparks = new Sparks(sc, 34); this.glow = sc.add.graphics().setDepth(35).setBlendMode(Phaser.BlendModes.ADD);
    this.ends = []; let at = INTRO.dark;
    words.forEach((w, i) => { const len = i === 0 ? INTRO.volt : INTRO.hockey; this.ends.push([at, at + len]); at += len + INTRO.gap; });
    this.flashAt = at; this.fadeAt = at + INTRO.flash; this.endAt = this.fadeAt + INTRO.fade;
  }
  head(i, p) {                                                       // where the sparkler is: sweeping along the word, scribbling up and down through the letters
    const b = this.copies[i].b, x = b.x + 6 + (b.width - 12) * p, y = b.centerY + Math.sin(p * Math.PI * (i === 0 ? 10 : 14)) * b.height * 0.3 + Math.sin(p * 61) * 6;
    return { x, y };
  }
  update(dt) {
    if (this.done) return; const ms = dt * 1000; this.t += ms; this.glow.clear();
    this.copies.forEach((cp, i) => {
      const [a, z] = this.ends[i], p = Phaser.Math.Clamp((this.t - a) / (z - a), 0, 1), b = cp.b;
      cp.mg.clear().fillStyle(0xffffff).fillRect(b.x - 20, b.y - 30, (b.width + 40) * (this.t < a ? 0 : p) + (p >= 1 ? 40 : 0), b.height + 60);
      if (this.t >= a && this.t < z) {                               // the burning tip
        const h = this.head(i, p), flick = 0.7 + Math.random() * 0.6;
        this.sparks.burst(h.x, h.y, 10 + (Math.random() * 8 | 0), 0.9);
        if (Math.random() < 0.35) this.sparks.burst(h.x, h.y, 3, 1.6, { up: true });
        this.glow.fillStyle(0xff9a3c, 0.22 * flick).fillCircle(h.x, h.y, 46 * flick).fillStyle(0xffe27a, 0.5 * flick).fillCircle(h.x, h.y, 16 * flick).fillStyle(0xffffff, 0.95).fillCircle(h.x, h.y, 5);
        if (!cp.lit) { cp.lit = true; this.sparks.burst(h.x, h.y, 70, 1.4); }   // it catches with a pop
      }
    });
    if (this.t >= this.flashAt && !this.flashed) {                   // the whole logo flares and throws sparks off every edge
      this.flashed = true;
      for (const cp of this.copies) { const b = cp.b; for (let k = 0; k < 9; k++) this.sparks.burst(b.x + Math.random() * b.width, b.y + Math.random() * b.height, 26, 1.3); cp.c.setTint(0xffffff); }
      this.sc.cameras.main.flash(INTRO.flash, 255, 236, 180);
    }
    if (this.t >= this.fadeAt) {                                     // the dark lifts: the real title shows through
      const f = Phaser.Math.Clamp((this.t - this.fadeAt) / INTRO.fade, 0, 1);
      this.cover.setAlpha(1 - f); this.copies.forEach(cp => { cp.c.clearTint(); cp.c.setAlpha(1 - f); });
    }
    this.sparks.update(dt);
    if (this.t >= this.endAt && this.sparks.list.length === 0) this.finish(false);
    else if (this.t >= this.endAt && !this.ended) { this.ended = true; this.onDone(); }   // the title is usable while the last sparks fall
  }
  skip() { if (!this.ended) { this.ended = true; this.onDone(); } this.finish(true); }
  finish() {
    if (this.done) return; this.done = true;
    this.cover.destroy(); this.copies.forEach(cp => { cp.c.clearMask(true); cp.c.destroy(); }); this.glow.destroy(); this.sparks.g.destroy();
  }
  get running() { return !this.ended; }
}
SparklerIntro.played = false;

/* v13.5.1: the sparkler SIZZLES while it burns the logo in: a hiss of bright noise that flickers, little crackles and pops,
   a whoosh when the logo flares, and it fizzles away as the title shows. (Browsers only let a page make sound after you've
   clicked or pressed something, so on a first visit with no click yet the opening may be silent.) */
const Sizzle = {
  start() {
    const S = Sound; try { S.resume(); } catch (e) { return; } const c = S.ctx; if (!c || !S.noiseBuffer || this.on) return;
    const src = c.createBufferSource(); src.buffer = S.noiseBuffer; src.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3200;
    const pk = c.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 6500; pk.Q.value = 1.4; pk.gain.value = 8;
    const g = c.createGain(); g.gain.value = 0.0001; src.connect(hp); hp.connect(pk); pk.connect(g); g.connect(S.sfxBus); src.start();
    this.on = { src, g, pk, c }; this.level = 0;
  },
  update(level) {                                                    // level 0..1: how hard it is burning; flickers like the real thing
    const o = this.on; if (!o) return; const t = o.c.currentTime, v = level * (0.07 + Math.random() * 0.05);
    o.g.gain.cancelScheduledValues(t); o.g.gain.setTargetAtTime(Math.max(0.0001, v), t, 0.02); o.pk.frequency.setTargetAtTime(5200 + Math.random() * 3000, t, 0.03);
    if (level > 0.2 && Math.random() < 0.35 * level) Sound.nz({ type: 'bandpass', f: 2500 + Math.random() * 5000, q: 3, vol: 0.05 + Math.random() * 0.08, a: 0.001, d: 0.008 + Math.random() * 0.02 });   // crackles
    if (level > 0.5 && Math.random() < 0.04) Sound.nz({ type: 'bandpass', f: 1400 + Math.random() * 900, q: 2, vol: 0.12, a: 0.001, d: 0.03 });                                  // a pop
  },
  flare() { if (!this.on) return; Sound.nz({ type: 'bandpass', f: 800, f2: 6000, q: 0.8, vol: 0.16, a: 0.08, d: 0.5, wet: 0.3 }); Sound.nz({ type: 'highpass', f: 5000, vol: 0.1, a: 0.01, d: 0.9 }); },
  stop(fast) { const o = this.on; if (!o) return; this.on = null; const t = o.c.currentTime; o.g.gain.cancelScheduledValues(t); o.g.gain.setTargetAtTime(0.0001, t, fast ? 0.03 : 0.35); try { o.src.stop(t + (fast ? 0.2 : 1.8)); } catch (e) { /* already stopped */ } }
};
{ const P = SparklerIntro.prototype, up = P.update, sk = P.skip, fin = P.finish;
  P.update = function (dt) {
    if (!this.done) {
      if (!this.sizzled) { this.sizzled = true; Sizzle.start(); this.sc.events.once('shutdown', () => { this.sizzleOut = true; Sizzle.stop(true); }); MUSIC_READY.then(() => { if (PLAYLISTS.intro.length && !this.introSong) { this.introSong = true; Sound.playMusic('intro'); } }); }   /* (a song from assets/music/intro/ behind the opening, if there are any) */
      const burning = this.ends.some(([a, z]) => this.t >= a && this.t < z), fizz = this.t >= this.flashAt ? Math.max(0, 1 - (this.t - this.flashAt) / (INTRO.flash + INTRO.fade)) * 0.6 : 0;
      if (!Sizzle.on && this.t < this.flashAt) Sizzle.start();       // (sound unlocked part-way through: join in)
      Sizzle.update(burning ? 1 : fizz);
      if (this.t >= this.flashAt && !this.sizzleFlare) { this.sizzleFlare = true; Sizzle.flare(); }
      if (this.t >= this.fadeAt + INTRO.fade && !this.sizzleOut) { this.sizzleOut = true; Sizzle.stop(false); }
    }
    return up.call(this, dt);
  };
  P.skip = function () { Sizzle.stop(true); return sk.call(this); };
  P.finish = function (...a) { if (!this.sizzleOut) { this.sizzleOut = true; Sizzle.stop(false); } return fin.apply(this, a); };
}
