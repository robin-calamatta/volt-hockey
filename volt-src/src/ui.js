/* Visual polish shared by every scene: colours, animated backdrop, panels, selection bar, scoreboard, celebrations.
   Everything here is cosmetic. Colours and timings are in THEME so the look can be re-skinned in one place. */

const THEME = {
  bgTop: 0x0d2233, bgBottom: 0x04080c, accent: 0x19c3ff, gold: 0xf2c200, hot: 0xff3d81,
  panel: 0x0c1c29, panelAlpha: 0.82, panelLine: 0x2d5068, text: '#e9f3fa', dim: '#8fa8b8', gold_css: '#f2c200', accent_css: '#19c3ff',
  streaks: 7, dust: 40, streakAlpha: 0.07, courtMotifAlpha: 0.08, vignetteStrength: 0.8, fadeMs: 260,
  crowdDots: 900, crowdAlpha: 0.32,
  confetti: 70, confettiSeconds: 1.8, shake: { ms: 260, strength: 0.006 },
  trailLength: 9, trailAlpha: 0.35
};
const rand = (a, b) => a + Math.random() * (b - a);

function ensureVignette(scene) {                                   // one shared dark-edges texture
  const W = CONFIG.view.width, H = CONFIG.view.height;
  if (!scene.textures.exists('vignette')) {
    const t = scene.textures.createCanvas('vignette', W, H), c = t.getContext(), g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.66);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + THEME.vignetteStrength + ')'); c.fillStyle = g; c.fillRect(0, 0, W, H); t.refresh();
  }
  return scene.add.image(W / 2, H / 2, 'vignette').setDepth(900);
}

/* Moving background for menus: gradient, faint rink markings, drifting light streaks and dust, dark edges, quick fade-in. */
function menuBackdrop(scene, opts = {}) {
  const W = CONFIG.view.width, H = CONFIG.view.height, T = THEME, accent = opts.accent || T.accent;
  scene.add.graphics().setDepth(-100).fillGradientStyle(T.bgTop, T.bgTop, T.bgBottom, T.bgBottom, 1).fillRect(0, 0, W, H);
  const motif = scene.add.graphics().setDepth(-90).setAlpha(T.courtMotifAlpha);                          // a huge rink outline behind everything
  motif.lineStyle(5, accent).strokeRoundedRect(90, 90, W - 180, H - 180, 130); motif.lineBetween(W / 2, 90, W / 2, H - 90); motif.strokeCircle(W / 2, H / 2, 110);
  motif.strokeRect(90, H / 2 - 70, 120, 140); motif.strokeRect(W - 210, H / 2 - 70, 120, 140);
  for (let i = 0; i < T.streaks; i++) {                                                                 // slow diagonal light streaks
    const s = scene.add.rectangle(rand(-200, W), rand(0, H), rand(180, 420), rand(10, 34), i % 3 ? accent : T.gold, rand(T.streakAlpha * 0.5, T.streakAlpha)).setRotation(-0.38).setDepth(-80);
    scene.tweens.add({ targets: s, x: W + 500, duration: rand(14000, 26000), repeat: -1, delay: rand(0, 6000), onRepeat: () => { s.x = -500; s.y = rand(0, H); } });
  }
  for (let i = 0; i < T.dust; i++) {                                                                    // rising dust motes
    const d = scene.add.circle(rand(0, W), rand(0, H), rand(1, 2.6), 0xffffff, rand(0.1, 0.35)).setDepth(-70);
    scene.tweens.add({ targets: d, y: d.y - rand(120, 320), alpha: 0, duration: rand(5000, 11000), repeat: -1, delay: rand(0, 5000), onRepeat: () => { d.y = rand(H * 0.4, H + 20); d.x = rand(0, W); d.alpha = rand(0.1, 0.35); } });
  }
  ensureVignette(scene);
  if (opts.fade !== false) scene.cameras.main.fadeIn(T.fadeMs, 4, 8, 12);
}

function panel(scene, x, y, w, h, opts = {}) {                       // rounded translucent card with a thin bright border
  const g = scene.add.graphics().setDepth(opts.depth === undefined ? -50 : opts.depth), r = opts.radius || 18;
  g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 5, y + 8, w, h, r);                                    // soft drop shadow
  g.fillStyle(THEME.panel, opts.alpha === undefined ? THEME.panelAlpha : opts.alpha).fillRoundedRect(x, y, w, h, r);
  g.lineStyle(2, opts.line || THEME.panelLine, 1).strokeRoundedRect(x, y, w, h, r);
  if (opts.accent) g.fillStyle(opts.accent, 1).fillRoundedRect(x, y + 10, 6, h - 20, 3);                  // coloured edge
  return g;
}

function drawBolt(g, cx, cy, s, color, alpha = 1) {                  // the lightning-bolt emblem
  const p = [[0.18, -1], [-0.55, 0.12], [-0.05, 0.12], [-0.3, 1], [0.6, -0.2], [0.08, -0.2], [0.45, -1]].map(([x, y]) => ({ x: cx + x * s, y: cy + y * s }));
  g.fillStyle(color, alpha).fillPoints(p, true);
}

/* The highlight bar behind the selected menu row. Call update(y) each frame. */
class SelectionBar {
  constructor(scene, cx, width, height) { this.g = scene.add.graphics().setDepth(-40); this.cx = cx; this.w = width; this.h = height; this.y = null; this.scene = scene; }
  moveTo(y) {
    this.y = this.y === null ? y : this.y + (y - this.y) * 0.35;                                          // eases between rows
    const g = this.g, x = this.cx - this.w / 2, t = this.scene.time.now / 1000;
    g.clear().fillStyle(THEME.accent, 0.20).fillRoundedRect(x, this.y - this.h / 2, this.w, this.h, 12);
    g.fillStyle(THEME.accent, 0.85).fillRoundedRect(x, this.y - this.h / 2 + 5, 6, this.h - 10, 3);
    g.lineStyle(2, THEME.accent, 0.5 + 0.2 * Math.sin(t * 5)).strokeRoundedRect(x, this.y - this.h / 2, this.w, this.h, 12);
  }
}

/* Confetti burst from a point, in a team colour plus white and gold. Pure Graphics tweens: nothing to preload. */
function confettiBurst(scene, x, y, color) {
  const palette = [color, 0xffffff, THEME.gold, color];
  for (let i = 0; i < THEME.confetti; i++) {
    const p = scene.add.rectangle(x, y, rand(5, 11), rand(5, 11), palette[i % palette.length]).setDepth(800).setRotation(rand(0, 6));
    const a = rand(-Math.PI, 0), v = rand(120, 520), life = rand(0.7, 1) * THEME.confettiSeconds * 1000;
    scene.tweens.add({ targets: p, x: x + Math.cos(a) * v, y: { value: y + Math.sin(a) * v + 380, ease: 'Quad.easeIn' }, rotation: p.rotation + rand(-9, 9), alpha: 0, duration: life, onComplete: () => p.destroy() });
  }
}
