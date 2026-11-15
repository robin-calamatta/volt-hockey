/* v14.3.12 RIZE ENTERTAINMENT: the studio's opening card, before the VOLT HOCKEY title (like a film studio's logo).
   About 3 seconds: on black, the word RIZE in dark grey, then fire catches at its left edge and runs through the letters one by one,
   each lighting up yellow-orange with flames licking off the top and embers drifting up; ENTERTAINMENT glows in underneath, the whole
   word flares, and it all fades to black into the title. It can't be skipped, unless the admin page says it can (Game tab). */
const RIZE = { dark: 280, ignite: 300, per: 330, catch: 220, flare: 2050, fadeAt: 2500, end: 3000 };
class RizeScene extends Phaser.Scene {
  constructor() { super('Rize'); }
  create() {
    const V = CONFIG.view, cx = V.width / 2, cy = V.height / 2 - 20; this.t = 0; this.cameras.main.setBackgroundColor('#020203');
    this.add.rectangle(cx, V.height / 2, V.width, V.height, 0x020203).setDepth(-10);
    const style = { fontFamily: FONT, fontSize: '250px', fontStyle: '900', color: '#2b2b2f', stroke: '#141416', strokeThickness: 6 };
    /* the letters, laid out as one word */
    const word = 'RIZE', meas = word.split('').map(ch => { const t = this.add.text(0, 0, ch, style).setVisible(false), w = t.width; t.destroy(); return w; }), gap = 6, total = meas.reduce((a, b) => a + b, 0) + gap * (word.length - 1);
    let x = cx - total / 2; this.L = word.split('').map((ch, i) => {
      const lx = x + meas[i] / 2; x += meas[i] + gap;
      const base = this.add.text(lx, cy, ch, style).setOrigin(0.5).setAlpha(0).setDepth(2);
      const fire = this.add.text(lx, cy, ch, { ...style, color: '#ffb02e', stroke: '#ff4d00', strokeThickness: 5 }).setOrigin(0.5).setAlpha(0).setDepth(3);
      try { const grd = fire.context.createLinearGradient(0, 0, 0, fire.height); grd.addColorStop(0, '#fff3b0'); grd.addColorStop(0.35, '#ffd23f'); grd.addColorStop(0.7, '#ff7a1c'); grd.addColorStop(1, '#c81e00'); fire.setFill(grd); } catch (e) { /* plain orange */ }
      return { base, fire, x: lx, w: meas[i], at: RIZE.ignite + i * RIZE.per };
    });
    this.sub = this.add.text(cx, cy + 150, 'E N T E R T A I N M E N T', { fontFamily: FONT, fontSize: '30px', fontStyle: '700', color: '#3a3a40' }).setOrigin(0.5).setAlpha(0).setDepth(2);
    this.glow = this.add.graphics().setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
    this.fx = this.add.graphics().setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
    this.flames = []; this.sparks = new Sparks(this, 5);
    this.top = cy - 105; this.bot = cy + 105; this.x0 = cx - total / 2; this.x1 = cx + total / 2;
    this.cover = this.add.rectangle(cx, V.height / 2, V.width, V.height, 0x000000).setAlpha(0).setDepth(20);
    this.skipOk = () => typeof GameCfg !== 'undefined' && GameCfg.rizeSkip === true;
    this.input.on('pointerdown', () => { if (this.skipOk()) this.done(); }); this.input.keyboard && this.input.keyboard.on('keydown', () => { if (this.skipOk()) this.done(); });
    try { if (typeof Sizzle !== 'undefined' && Sound.ctx && Sound.ctx.state === 'running') { Sizzle.start(); this.sizz = true; } } catch (e) { /* no sound yet */ }
  }
  flame(x, y, power) { this.flames.push({ x: x + (Math.random() - 0.5) * 18, y, vx: (Math.random() - 0.5) * 24, vy: -(90 + Math.random() * 150) * power, r: 3 + Math.random() * 7 * power, age: 0, life: 0.3 + Math.random() * 0.4, sw: Math.random() * 6 }); }
  update(time, delta) {
    const dt = Math.min(0.1, delta / 1000), ms = dt * 1000;   /* (a slow device still takes about 3 seconds) */ this.t += ms; const t = this.t, g = this.glow.clear(), fx = this.fx.clear();
    if (Controls && Controls.update) { Controls.update(this.game.loop.frame); if (this.skipOk() && [...Controls.list(), Controls.combined].some(s => s && s.pressed && ['a', 'b', 'start'].some(b => s.pressed[b]))) return this.done(); }
    /* the dark grey word comes out of the black */
    const k0 = Phaser.Math.Clamp(t / RIZE.dark, 0, 1); for (const l of this.L) l.base.setAlpha(k0);
    /* the fire runs through the letters, left to right */
    const head = Phaser.Math.Clamp((t - RIZE.ignite) / (RIZE.per * this.L.length), 0, 1), hx = this.x0 + (this.x1 - this.x0) * head, burning = t >= RIZE.ignite && head < 1;
    if (burning) { const fl = 0.7 + Math.random() * 0.6, hy = this.bot - 20 - Math.random() * 120;
      this.sparks.burst(hx, hy, 6 + (Math.random() * 6 | 0), 0.8, { up: true }); for (let i = 0; i < 4; i++) this.flame(hx, this.top + 20 + Math.random() * 140, 1.1);
      g.fillStyle(0xff7a1c, 0.08 * fl).fillEllipse(hx, this.top + 105, 150 * fl, 280 * fl).fillStyle(0xffd23f, 0.2 * fl).fillEllipse(hx, this.top + 105, 40 * fl, 200 * fl); }
    if (this.sizz && typeof Sizzle !== 'undefined') Sizzle.update(burning ? 1 : 0.3);
    for (const l of this.L) {
      if (t < l.at) continue; const k = Phaser.Math.Clamp((t - l.at) / RIZE.catch, 0, 1), flick = 0.86 + Math.random() * 0.14;
      if (!l.lit) { l.lit = true; this.sparks.burst(l.x, this.top + 60, 40, 1.2, { up: true }); }
      l.fire.setAlpha(k * flick).setScale(1 + 0.012 * Math.sin(t / 37 + l.x)); l.base.setAlpha(1 - k * 0.6);
      if (Math.random() < 0.9) this.flame(l.x + (Math.random() - 0.5) * l.w * 0.8, this.top + 26 + Math.random() * 22, 0.8 * k);   // flames off the top of the letter
      if (Math.random() < 0.15) this.sparks.burst(l.x + (Math.random() - 0.5) * l.w, this.top + 30, 2, 0.6, { up: true, small: true });
      g.fillStyle(0xff5a1c, 0.035 * k * flick).fillEllipse(l.x, this.top + 105, l.w * 1.6, 260);
    }
    /* ENTERTAINMENT warms up underneath once most of the word is alight */
    const ks = Phaser.Math.Clamp((t - RIZE.ignite - RIZE.per * 2.5) / 500, 0, 1); this.sub.setAlpha(ks).setColor(ks > 0.5 ? '#ffb02e' : '#5a5a60');
    /* the whole word flares white-hot */
    if (t >= RIZE.flare && !this.flared) { this.flared = true; this.cameras.main.flash(160, 120, 70, 20); for (const l of this.L) { this.sparks.burst(l.x, this.top + 60, 40, 1.4); l.fire.setTint(0xffffff); } if (this.sizz && Sizzle.flare) Sizzle.flare(); }
    if (this.flared) for (const l of this.L) { const w = Phaser.Math.Clamp(1 - (t - RIZE.flare) / 350, 0, 1); if (w <= 0) l.fire.clearTint(); }
    /* the flames: soft blobs rising, yellow to orange to red */
    this.flames = this.flames.filter(f => (f.age += dt) < f.life); for (const f of this.flames) { f.x += (f.vx + Math.sin(f.age * 14 + f.sw) * 30) * dt; f.y += f.vy * dt; f.vy *= 0.97; const q = f.age / f.life, col = q < 0.25 ? 0xfff0a0 : q < 0.5 ? 0xffb02e : q < 0.75 ? 0xff5a1c : 0xb01800, r = f.r * (1 - q * 0.6); fx.fillStyle(col, (1 - q) * 0.6).fillEllipse(f.x, f.y, r * 1.3, r * 3.4); }   /* (tongues of flame: tall, flickering side to side, white-yellow to red as they rise) */
    if (this.flames.length > 900) this.flames.splice(0, this.flames.length - 900);
    this.sparks.update(dt);
    /* and to black */
    if (t >= RIZE.fadeAt) this.cover.setAlpha(Phaser.Math.Clamp((t - RIZE.fadeAt) / (RIZE.end - RIZE.fadeAt), 0, 1));
    if (t >= RIZE.end) this.done();
  }
  done() { if (this.over) return; this.over = true; try { if (this.sizz) Sizzle.stop(false); } catch (e) { /* none */ } this.scene.start('Title'); }
}
