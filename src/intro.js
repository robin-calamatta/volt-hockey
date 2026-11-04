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
