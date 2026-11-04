/* All Phaser scenes. Menus are driven by Controls.menu(), so keyboard and gamepad behave identically. */
const FONT = '"Barlow Condensed","Arial Narrow",Impact,sans-serif';
const CX = CONFIG.view.width / 2;
const STYLE = {
  title: { fontFamily: FONT, fontSize: '110px', fontStyle: 'bold', color: '#ffffff', stroke: '#04080c', strokeThickness: 8, shadow: { offsetX: 0, offsetY: 5, color: '#000000', blur: 10, fill: true, stroke: true } },
  row:   { fontFamily: FONT, fontSize: '40px', color: '#9fb2bf', shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 4, fill: true } },
  hint:  { fontFamily: FONT, fontSize: '26px', color: '#f2c200' },
  hud:   { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: '#ffffff' },
  tag:   { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#ffffff', stroke: '#0d151b', strokeThickness: 4, backgroundColor: '#0d151bb3', padding: { x: 5, y: 1 } },   // dark outline and plate: readable on ice and every other court
  big:   { fontFamily: FONT, fontSize: '56px', fontStyle: 'bold', color: '#ffffff' },
  colorSelected: '#ffffff', colorIdle: '#9fb2bf'
};
// The controls guide (Settings > Controls and screen > Controls guide). Edit freely: one block per device.
const CONTROLS_GUIDE = [
  ['GAMEPAD', ['Left stick   drive  (1st / 3rd person: up = go, ◀ ▶ = turn)', 'Right stick   look around (springs back)', 'L3 (hold)   push to talk      D-pad ▲   quick chat', 'D-pad ▼   camera      Select (View)   friends and party', 'RT / LT   spin clockwise / counter-clockwise', 'RB / LB   half spin (half a trigger)', 'D-pad ◀ ▶   speed down / up', 'X   full press on / off  (minigames: A or X uses a power-up)', 'Y   switch cart', 'Start   pause      A / B   select / back']],
  ['KEYBOARD 1', ['WASD   drive', 'T   camera view', 'Tab chat   1-9 quick chat   G (hold) talk   ` friends', 'E / Q   spin', 'R / Z   half spin', 'X   full press  (minigames: Space or X = power-up)', 'V / C   speed up / down', 'F   switch cart', 'Esc   pause', 'Space / Backspace   select / back']],
  ['KEYBOARD 2', ['Arrows   drive', 'P   camera view', 'L (hold)   push to talk', '. / ,   spin', '] / [   half spin', '\\   full press  (minigames: Right Shift or \\ = power-up)', "' / ;   speed up / down", '/   switch cart', 'Right Shift / Right Ctrl   select / back']],
  ['TOUCH', ['Stick   drive', 'VIEW   camera view', '💬   chat      🎙   talk (hold) / mic on-off (tap)', 'Spin buttons   spin', 'Small spin buttons   half spin', 'PRESS   full press  (minigames: A = power-up)', '+ / -   speed up / down', 'Cart button   switch cart', 'II   pause', 'Settings > Touch and screen   move the buttons']]
];
const pct = v => Math.round(v * 100) + '%', times = v => v.toFixed(1) + 'x';
const teamColorHex = i => '#' + TEAMS[i].color.toString(16).padStart(6, '0');

/* Settings are split into pages so no screen is crowded. Each page is a list of menu items; SettingsScene shows the page list. */
/* Your name: left / right steps through the presets, select types your own. onChange lets the online room tell everyone. */
const nameItem = onChange => ({
  label: () => `Your name   ◀ ${Settings.myName() || 'Player'} ▶`,
  change: d => { Settings.setMyName(Settings.nextName(Settings.myName() || CONFIG.playerNames[0], d)); if (onChange) onChange(Settings.myName()); },
  select: () => Settings.askName(Settings.myName(), t => { Settings.setMyName(t); if (onChange) onChange(t); })
});
const slider = (name, key, fmt) => ({ rule: Settings.rulesKeys.includes(key), label: () => `${name}   ◀ ${fmt(Settings[key])} ▶`, change: d => Settings.adjust(key, d) });
const solveHomography = (pts) => {            // pts: [[u, v, x, y] x4] -> the 8 numbers of the map (u, v) -> (x, y) in perspective
  const A = [], b = [];
  for (const [u, v, x, y] of pts) { A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x); A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y); }
  const n = 8; for (let i = 0; i < n; i++) A[i].push(b[i]);
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; if (Math.abs(A[i][i]) < 1e-12) return null;
    for (let r = 0; r < n; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c = i; c <= n; c++) A[r][c] -= f * A[i][c]; }
  }
  return A.map((row, i) => row[n] / row[i]);
};
const VIEW_NAMES = { nhl: 'Upright, follows the puck (NHL)', side: 'Sideways, follows the puck', classic: 'Whole rink (classic)' };
const cycleCamMode = d => { const c = Settings.camCycle(), i = Math.max(0, c.indexOf(Settings.camMode)); Settings.camMode = c[(i + (d || 1) + c.length) % c.length]; Settings.save(); };
const GFX = [undefined, 'Low', 'Medium', 'High'], gfxLabel = () => Settings.gfx ? Settings.gfx : `Auto (${Settings.touch ? 'Medium' : 'High'})`;
const cycleGfx = d => { const i = Math.max(0, GFX.indexOf(Settings.gfx)); Settings.gfx = GFX[(i + (d || 1) + GFX.length) % GFX.length]; Settings.save(); };
const cycleView = d => { const v = ['nhl', 'side', 'classic'], i = Math.max(0, v.indexOf(Settings.view || 'nhl')); Settings.setView(v[(i + (d || 1) + 3) % 3]); };
const toggle = (name, key) => ({ rule: Settings.rulesKeys.includes(key), label: () => `${name}   ◀ ${Settings[key] ? 'On' : 'Off'} ▶`, change: () => Settings.toggle(key), select: () => Settings.toggle(key) });
/* Maximum cart speed (the host's lock): wraps around, so tapping it steps through every option on any device. */
const speedCapItem = (name = 'Maximum cart speed (locks everyone)') => {
  const n = CONFIG.speedLevels.length, step = d => { Settings.speedCap = ((Settings.speedCap - 1 + d + n) % n) + 1; Settings.save(); };
  return { rule: true, label: () => `${name}   ◀ ${Settings.speedCap >= n ? 'No limit' : Settings.speedCap + ' of ' + n} ▶`, change: step, select: () => step(1) };
};
/* Lock each person to one cart for the whole game (Y no longer switches). Online it is the host's rule for everyone. */
const lockCartItem = () => ({ rule: true, label: () => `Switch carts with Y   ◀ ${Settings.lockCart ? 'Off - one cart all game' : 'On'} ▶`, change: () => Settings.toggle('lockCart'), select: () => Settings.toggle('lockCart') });
/* The settings, grouped. Each page is a list of menu items; SettingsScene lists the pages with a line saying what is on each (SETTINGS_HINTS).
   'Camera and graphics' is its own scene (CameraPageScene) with a live picture of the game behind it. */
const SETTINGS_PAGES = {
  'Player': () => [
    { label: () => 'Account, friends and party: the 👥 button (top left), Select on a gamepad, or the ` key' },
    nameItem(), { label: () => `Career:  ${(Settings.career || {}).games || 0} matches   ${(Settings.career || {}).wins || 0} wins   ${(Settings.career || {}).goals || 0} goals   ${(Settings.career || {}).shots || 0} shots on net` }],
  'Sound and commentary': () => [slider('Music volume', 'musicVolume', pct), slider('Effects volume', 'sfxVolume', pct), slider('Crowd volume', 'crowdVolume', pct),
    { label: () => `Commentator   ◀ ${{ full: 'Voice and captions', voice: 'Voice only', captions: 'Captions only', off: 'Off' }[Settings.commentaryMode || 'full']} ▶`, change: d => Commentator.cycleMode(d), select: () => Commentator.cycleMode(1) },
    slider('Commentary volume', 'commentVolume', pct),
    { label: () => 'Hear the play-by-play caller', select: () => sampleCall('goalLead') },
    { label: () => 'Hear the colour commentator', select: () => sampleCall('lull') }],
  'Game rules': () => [
    slider('Game clock speed', 'timeSpeed', times), slider('Starting cart speed (D-pad ◀ ▶ in game)', 'speedLevel', v => `${v} of ${CONFIG.speedLevels.length}`),
    speedCapItem(), lockCartItem(),
    toggle('Cart collisions', 'collisions'), toggle('Penalties', 'penalties')],
  'Ball and carts': () => [
    slider('Cart turning speed', 'turnSpeed', times), slider('Stick length', 'stickLength', v => Math.round(v * 100) + ' cm'),
    slider('Ball bounce off carts', 'ballBounce', pct), slider('Ball grip', 'ballGrip', v => String(Math.round(v))), slider('Ball friction (higher = slows sooner)', 'ballFriction', v => v.toFixed(1))],
  'CPU opponent': () => [
    { label: () => `Difficulty   ◀ ${Settings.difficulty} ▶`, change: d => Settings.cycleDifficulty(d) },
    { label: () => `The CPU keeps learning how you play   (${Learn.data.shots} shots, ${Learn.data.passes} passes seen)`, hint: 'Always on: it remembers your habits from game to game' }],
  'Controls and screen': sc => [
    { label: () => 'Controls guide', hint: 'What every button does on a gamepad, keyboard and touch', select: () => sc.scene.start('ControlsGuide', { ctx: sc.ctx, page: 'Controls and screen' }) },
    { label: () => `Look up / down (right stick)   ◀ ${Settings.invertLook ? 'Inverted' : 'Normal'} ▶`, change: () => Settings.toggle('invertLook'), select: () => Settings.toggle('invertLook') },
    { label: () => `Touch controls   ◀ ${Settings.touch ? 'On' : 'Off'} ▶`, change: () => TouchPad.toggle(), select: () => TouchPad.toggle() },
    { label: () => 'Adjust touch buttons', select: () => TouchPad.edit() },
    { label: () => `Fullscreen   ◀ ${isFullscreen() ? 'On' : 'Off'} ▶`, change: () => toggleFullscreen(), select: () => toggleFullscreen() },
    toggle('Fullscreen on first tap', 'autoFullscreen')]
};
const SETTINGS_HINTS = {
  'Player': 'Your name and your career totals',
  'Voice chat': 'Voice on or off, push to talk, microphone, mic volume, hear yourself, voice volume',
  'Sound and commentary': 'Master volume, speakers, music, effects and crowd volume, commentator voice and captions',
  'Camera and graphics': 'First person, 2D view, third person and broadcast on / off, field of view, court, crowd, graphics quality',
  'Game rules': 'Game clock, cart speeds, switching carts, collisions, penalties',
  'Ball and carts': 'Turning speed, stick length, ball bounce, grip and friction',
  'CPU opponent': 'Difficulty, and what the CPU has learned about your play',
  'Controls and screen': 'Controls guide, right-stick look, touch buttons, fullscreen'
};
const sampleCall = key => { const e = Commentary.pick(key, { whoT: 'Volts', whoN: 2, who: 'Robin', a: 3, o: 2, sa: 12, sb: 7, team: 'Volts', opp: 'Comets', tail: ' 3 to 2.' }); if (e) { const l = Commentary.parse(e); Commentator.speak({ ...l, mood: Math.max(l.mood, 2) }); } };
const SETTINGS_ORDER = ['Camera and graphics', 'Sound and commentary', 'Voice chat', 'Game rules', 'Ball and carts', 'CPU opponent', 'Controls and screen', 'Player'];

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() { for (const t of TEAMS) this.load.image('logo-' + t.id, t.logo); }
  create() { this.scene.start('Title'); }
}

class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    menuBackdrop(this);
    const ring = this.add.graphics().setDepth(-60); ring.lineStyle(3, THEME.accent, 0.35).strokeCircle(CX, 255, 190); ring.lineStyle(2, THEME.gold, 0.25).strokeCircle(CX, 255, 215);
    const bolt = this.add.graphics().setDepth(-55); drawBolt(bolt, CX, 255, 150, THEME.accent, 0.16);
    this.tweens.add({ targets: [ring, bolt], alpha: { from: 0.7, to: 1 }, scale: { from: 1, to: 1.04 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const volt = this.add.text(CX, 190, 'VOLT', { ...STYLE.title, fontSize: '170px', color: THEME.accent_css, strokeThickness: 10 }).setOrigin(0.5);
    const hockey = this.add.text(CX, 330, 'HOCKEY', { ...STYLE.title, fontSize: '130px', strokeThickness: 10 }).setOrigin(0.5);
    const bob = () => this.tweens.add({ targets: [volt, hockey], y: '+=6', duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.logo = [volt, hockey]; this.fizz = new Sparks(this, 12); this.fizzAt = 0;               // the logo keeps fizzling now and then
    if (!SparklerIntro.played) { SparklerIntro.played = true; this.intro = new SparklerIntro(this, [volt, hockey], bob); } else bob();   // the sparkler opening, once per visit
    this.add.rectangle(CX, 414, 520, 3, THEME.gold, 0.9);
    this.add.text(CX, 446, '3 v 3   POWER CHAIR   HOCKEY', { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: THEME.gold_css }).setOrigin(0.5).setShadow(0, 3, '#000', 6, true, true);
    panel(this, CX - 210, 500, 420, 68, { radius: 34, depth: -20 });
    this.prompt = this.add.text(CX, 534, 'PRESS START  /  TAP', { ...STYLE.hint, fontSize: '36px', color: '#ffffff' }).setOrigin(0.5);
    this.touchPills();
    this.input.on('pointerdown', (p, over) => { if (this.intro && this.intro.running) return this.intro.skip(); if (!over.length && !TouchPad.editing) this.begin(); });   // a tap during the opening only skips it       // tap anywhere else to start
    this.musicInfo = this.add.text(CX, 696, '', { ...STYLE.hint, fontSize: '16px', color: THEME.dim }).setOrigin(0.5);
    MUSIC_READY.then(() => {                                  // tells you whether your own songs were found
      if (!this.musicInfo || !this.musicInfo.active) return;
      const songs = PLAYLISTS.menu.length;
      this.musicInfo.setText(songs ? `Music: ${songs} song(s) found in assets/music (menus and matches)` : 'Music: no song files found, using built-in 8-bit tunes (see README, "Your own music")');
    });
    this.add.text(CX, 660, 'Gamepad: left stick / D-pad, A select, B back, Start pause        Keyboard: WASD, Space, Enter', { ...STYLE.hint, fontSize: '19px', color: THEME.dim }).setOrigin(0.5);
  }
  begin() { if (this.leaving) return; this.leaving = true; Sound.resume(); Sound.playMusic('menu'); Sound.play('select'); this.scene.start('Main'); }
  /* Three tappable pills under PRESS START: turn the on-screen controller on or off, adjust its buttons, and go fullscreen (best for phones). */
  touchPills() {
    const y = 600, mk = (x, w, label, fn) => {
      const bg = panel(this, x - w / 2, y - 24, w, 48, { radius: 24, depth: -20 }), t = this.add.text(x, y, '', { ...STYLE.hint, fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);
      const hit = this.add.zone(x, y, w, 56).setInteractive({ useHandCursor: true }); hit.on('pointerdown', (p, lx, ly, ev) => { if (ev) ev.stopPropagation(); Sound.resume(); Sound.play('select'); fn(); });
      return { bg, t, label };
    };
    this.pills = [
      mk(CX - 300, 330, () => `TOUCH CONTROLS: ${Settings.touch ? 'ON' : 'OFF'}`, () => TouchPad.toggle()),
      mk(CX + 40, 330, () => 'ADJUST BUTTONS', () => TouchPad.edit()),
      mk(CX + 330, 220, () => 'FULLSCREEN', () => toggleFullscreen())
    ];
  }
  update(time, delta) {
    Controls.update(this.game.loop.frame); const dt = Math.min(0.05, delta / 1000);
    this.prompt.setAlpha(0.55 + 0.45 * Math.sin(time / 260));
    this.pills.forEach(p => p.t.setText(p.label()));
    const e = Controls.menu();
    if (this.intro) {
      if (this.intro.running && (e.start || e.a || e.b || Controls.escPressed)) return this.intro.skip();
      this.intro.update(dt); if (this.intro.done) this.intro = null; if (this.intro && this.intro.running) return;
    }
    if (time > this.fizzAt) {                                                       // a little fizzle off a random edge of the logo
      this.fizzAt = time + 900 + Math.random() * 1800; const w = this.logo[Math.random() < 0.5 ? 0 : 1], b = w.getBounds();
      this.fizz.burst(b.x + 10 + Math.random() * (b.width - 20), b.y + 18 + Math.random() * (b.height - 36), 14, 0.55);
    }
    this.fizz.update(dt);
    if (e.start || e.a) this.begin();
  }
}

/* Base class for every list menu. Items: { label(): string, select?(), change?(dir) }. */
class ListMenuScene extends Phaser.Scene {
  fitRow(row, want) {                                                  // a long label is shrunk so it never spills out of the panel
    const room = this.panelBox ? this.panelBox.w - 36 : CONFIG.view.width - 40, w = row.width || 1;
    row.setScale(Math.min(want, room / w));
  }
  buildMenu(title, items, top = 210, opts = {}) {                    // opts: { x: row centre, size: max font size, noFooter }
    this.items = items; this.cursor = 0; if (!opts.noBackdrop) menuBackdrop(this);
    const long = items.length > 8, V = CONFIG.view;                   // long menus use a smaller title and tighter rows
    if (long) top = 110;
    if (title) {
      this.add.text(CX, long ? 45 : 90, title, { ...STYLE.title, fontSize: long ? '52px' : '78px' }).setOrigin(0.5);
      this.add.rectangle(CX, long ? 80 : 142, 150, 4, THEME.gold, 0.95);
    }
    const gap = Math.min(58, (V.height - top - 60) / items.length), size = Math.min(opts.size || 40, Math.floor(gap * 0.7)), cx = opts.x || CX, w = opts.panelWidth || Math.min(900, Math.max(560, 40 + (opts.size ? 600 : 640)));
    panel(this, cx - w / 2, top - gap * 0.75, w, gap * items.length + gap * 0.5);
    this.panelBox = { x: cx - w / 2, w };                              // rows are shrunk to fit inside it (fitRow)
    this.bar = new SelectionBar(this, cx, w - 24, gap - 6);
    this.rows = items.map((_, i) => this.add.text(cx, top + i * gap, '', { ...STYLE.row, fontSize: size + 'px' }).setOrigin(0.5));
    items.forEach((item, i) => {                                       // tap a row: left third = less, right third = more, middle = select
      const zone = this.add.zone(cx, top + i * gap, w, gap).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', p => {
        this.cursor = i; const rel = (p.x - (cx - w / 2)) / w;
        if (item.change && rel < 0.25) { item.change(-1); Sound.play('blip'); }
        else if (item.change && rel > 0.75) { item.change(1); Sound.play('blip'); }
        else if (item.select) { Sound.play('select'); item.select(); }
        else if (item.change) { item.change(1); Sound.play('blip'); }
      });
    });
    this.hintText = items.some(it => it.hint) ? this.add.text(opts.hintX || CX, opts.hintY || V.height - 58, '', { fontFamily: FONT, fontSize: opts.hintSize || '22px', color: '#9fb2bf', align: 'center', wordWrap: opts.hintWidth ? { width: opts.hintWidth } : undefined, ...(opts.hintBg ? { backgroundColor: opts.hintBg, padding: { x: 8, y: 4 } } : {}) }).setOrigin(0.5) : null;   // a line saying what the highlighted item is for
    if (!opts.noFooter) this.add.text(CX, V.height - 22, '▲ ▼  choose        ◀ ▶  change        A  select        B  back', { fontFamily: FONT, fontSize: '19px', color: THEME.dim }).setOrigin(0.5);
  }
  update() {
    Controls.update(this.game.loop.frame);
    if (!this.items || (typeof PadNav !== 'undefined' && PadNav.stack.some(x => x.modal))) return;      // a pop-up (form, friends) has the controls
    const e = Controls.menu(), n = this.items.length, item = this.items[this.cursor];
    if (Controls.escPressed) { if (this.onBack) { Sound.play('back'); this.onBack(); } return; }   // Esc on a keyboard: back (it is also Start, which would select)
    if (e.up) { this.cursor = (this.cursor + n - 1) % n; Sound.play('blip'); }
    if (e.down) { this.cursor = (this.cursor + 1) % n; Sound.play('blip'); }
    if (e.left && item.change) { item.change(-1); Sound.play('blip'); }
    if (e.right && item.change) { item.change(1); Sound.play('blip'); }
    if ((e.a || e.start) && item.select) { Sound.play('select'); item.select(); return; }
    if (e.b && this.onBack) { Sound.play('back'); this.onBack(); return; }
    this.rows.forEach((row, i) => { row.setText(this.items[i].label()).setColor(i === this.cursor ? STYLE.colorSelected : STYLE.colorIdle); this.fitRow(row, i === this.cursor ? 1.04 : 1); });
    this.bar.moveTo(this.rows[this.cursor].y);
    if (this.hintText) this.hintText.setText(item && item.hint ? (typeof item.hint === 'function' ? item.hint() : item.hint) : '');
  }
}

/* On-screen name entry: a letter grid for gamepads and touch (tap a key), plus plain typing on a real keyboard.
   Opened with Settings.askName(current, callback); the calling scene is paused underneath and resumed afterwards. */
class NameEntryScene extends Phaser.Scene {
  constructor() { super('NameEntry'); }
  init(data) { this.text = Settings.cleanName(data.initial || ''); this.done = data.done; this.under = data.under; this.src = data.src || null; }
  create() {
    this.scene.bringToTop(); this.cameras.main.setBackgroundColor('#0d151b'); menuBackdrop(this);
    this.keys = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 'SPACE', 'DEL', 'OK']; this.cols = 10; this.cursor = this.keys.length - 1;
    this.add.text(CX, 70, 'YOUR NAME', { ...STYLE.title, fontSize: '64px' }).setOrigin(0.5);
    this.shown = this.add.text(CX, 160, '', { ...STYLE.row, fontSize: '56px', color: '#f2c200' }).setOrigin(0.5);
    const w = 96, h = 82, x0 = CX - (this.cols - 1) * w / 2, y0 = 270;
    this.cells = this.keys.map((k, i) => {
      const x = x0 + (i % this.cols) * w, y = y0 + Math.floor(i / this.cols) * h, big = k.length > 1;
      const box = this.add.rectangle(x, y, w - 8, h - 8, 0x16222c, 0.95).setStrokeStyle(2, 0x2d4252).setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, k === 'SPACE' ? '␣' : k === 'DEL' ? '⌫' : k, { ...STYLE.row, fontSize: big && k === 'OK' ? '34px' : '40px' }).setOrigin(0.5);
      box.on('pointerdown', () => { this.cursor = i; this.press(); });
      return { box, label };
    });
    this.add.text(CX, 650, 'Pick letters with ◀ ▲ ▼ ▶ + A    Start: done    B: cancel      On a keyboard just type, Enter = done', { fontFamily: FONT, fontSize: '20px', color: THEME.dim }).setOrigin(0.5);
    this.onKey = e => {
      if (keyForPopup(e)) return;                                // typing in a pop-up or chat over this screen
      if (e.key === 'Enter') { this.finish(true); e.preventDefault(); }
      else if (e.key === 'Escape') { this.finish(false); e.preventDefault(); }
      else if (e.key === 'Backspace') { this.text = this.text.slice(0, -1); e.preventDefault(); }
      else if (e.key.startsWith('Arrow')) { this.move(e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0, e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0); e.preventDefault(); }
      else if (e.key.length === 1) { this.add1(e.key); e.preventDefault(); }
    };
    window.addEventListener('keydown', this.onKey, true);
    this.events.once('shutdown', () => window.removeEventListener('keydown', this.onKey, true));
    this.ready = 0;
  }
  add1(ch) { if (this.text.length < CONFIG.nameMax && /[\w .'\-!]/.test(ch)) this.text += ch; }
  move(dx, dy) {
    const n = this.keys.length, rows = Math.ceil(n / this.cols); let c = this.cursor % this.cols, r = Math.floor(this.cursor / this.cols);
    c = (c + dx + this.cols) % this.cols; r = (r + dy + rows) % rows;
    this.cursor = Math.min(n - 1, r * this.cols + c); Sound.play('blip');
  }
  press() {
    const k = this.keys[this.cursor];
    if (k === 'OK') return this.finish(true);
    if (k === 'DEL') this.text = this.text.slice(0, -1);
    else if (this.text.length < CONFIG.nameMax) this.text += k === 'SPACE' ? ' ' : k;
    Sound.play('select');
  }
  finish(ok) {
    const name = Settings.cleanName(this.text);
    Sound.play(ok ? 'select' : 'back');
    this.scene.stop(); if (this.under) this.scene.resume(this.under);
    if (ok && name && this.done) this.done(name);
  }
  update() {
    Controls.update(this.game.loop.frame);
    this.ready++; const devices = (this.src && !this.src.id.startsWith('kb') ? [this.src] : Controls.list().filter(s => !s.id.startsWith('kb')));
    const p = b => this.ready > 8 && devices.some(s => s.pressed[b]);
    if (p('left')) this.move(-1, 0); if (p('right')) this.move(1, 0); if (p('up')) this.move(0, -1); if (p('down')) this.move(0, 1);
    if (p('a')) this.press(); if (p('start')) this.finish(true); if (p('b')) this.finish(false);
    this.shown.setText((this.text || '') + (Math.floor(this.time.now / 450) % 2 ? '_' : ' '));
    this.cells.forEach((c, i) => { const on = i === this.cursor; c.box.setFillStyle(on ? 0xf2c200 : 0x16222c, on ? 1 : 0.95); c.label.setColor(on ? '#10181e' : '#ffffff'); });
  }
}

class MainMenuScene extends ListMenuScene {
  constructor() { super('Main'); }
  create() {
    this.buildMenu('VOLT HOCKEY', [
      { label: () => 'Play' + leaderPicks(), hint: 'A match against the CPU or friends on this screen (in a party: your whole party)', select: () => memberWaits() || this.scene.start('Setup', { practice: false }) },
      { label: () => 'Season' + leaderPicks(), hint: 'A full season, playoffs and the Volt Hockey World Cup (in a party: your party plays for your team)', select: () => memberWaits() || this.scene.start('SeasonMenu') },
      { label: () => 'Practice' + leaderPicks(), hint: 'Any team sizes, no clock', select: () => memberWaits() || this.scene.start('Setup', { practice: true }) },
      { label: () => 'Minigames' + leaderPicks(), hint: 'Balloon Bash, Race and Manhunt: power-ups, CPUs, split screen and online', select: () => memberWaits() || this.scene.start('Minigames') },
      { label: () => 'Leaderboard', hint: 'The best players everywhere: World Cups, wins, goals and win %', select: () => this.scene.start('Leaderboard') },
      { label: () => 'Online' + leaderPicks(), hint: 'Host or join a room, public or private', select: () => memberWaits() || this.scene.start('OnlineMenu') },
      { label: () => 'Settings', hint: 'Camera, sound, rules, CPU, controls and your name', select: () => this.scene.start('Settings') }
    ], 280);
  }
}

class SettingsScene extends ListMenuScene {                         // the list of settings pages. from: 'Pause' returns to the pause menu afterwards.
  constructor() { super('Settings'); }
  init(data) { this.ctx = data || {}; }
  create() {
    if (this.ctx.from === 'Pause') { this.scene.bringToTop(); this.cameras.main.setBackgroundColor('#0d151b'); }   // opened from the pause menu: sit in front of the (paused) court
    const back = () => this.ctx.from === 'Pause' ? this.scene.start('Pause', { game: this.ctx.game }) : this.scene.start('Main');
    this.buildMenu('SETTINGS', [
      ...SETTINGS_ORDER.map(name => ({ label: () => name, hint: SETTINGS_HINTS[name], select: () => this.scene.start(name === 'Camera and graphics' ? 'CameraPage' : 'SettingsPage', { page: name, ctx: this.ctx }) })),
      { label: () => 'Back', select: back }
    ], 190);
    this.onBack = back;
  }
}

class SettingsPageScene extends ListMenuScene {
  constructor() { super('SettingsPage'); }
  init(data) { this.page = data.page; this.ctx = data.ctx || {}; }
  create() {
    if (this.ctx.from === 'Pause') { this.scene.bringToTop(); this.cameras.main.setBackgroundColor('#0d151b'); }   // opened from the pause menu: sit in front of the (paused) court
    const back = () => this.scene.start('Settings', this.ctx);
    const on = this.ctx.game && this.ctx.game.online, locked = !!(on && on.role !== 'host');      // inside an online match the rules belong to the host: it can change them (everyone gets the new values at once), the others see them as read-only
    if (this.page === 'Voice chat' || this.page === 'Sound and commentary') AudioDevices.load();   // microphone / speaker names (shown once the browser has mic permission)
    const rows = SETTINGS_PAGES[this.page](this).map(it => (locked && it.rule) ? { label: () => it.label().replace(/ {3}◀.*$/, '') + '   (set by the host)' } : it);
    this.buildMenu(this.page.toUpperCase(), [...rows, { label: () => 'Back', select: back }], 200);
    this.onBack = back;
  }
}

class ControlsGuideScene extends Phaser.Scene {                    // what every button does, one card per device (it used to sit beside the court during play)
  constructor() { super('ControlsGuide'); }
  init(data) { this.ctx = data.ctx || {}; this.page = data.page; }
  create() {
    if (this.ctx.from === 'Pause') { this.scene.bringToTop(); this.cameras.main.setBackgroundColor('#0d151b'); }   // opened from the pause menu: sit in front of the (paused) court
    menuBackdrop(this); const V = CONFIG.view;
    this.add.text(CX, 52, 'CONTROLS', { ...STYLE.title, fontSize: '56px' }).setOrigin(0.5); this.add.rectangle(CX, 92, 130, 4, THEME.gold, 0.95);
    const cols = 2, w = 560, h = 272, gx = 40, x0 = CX - w - gx / 2, y0 = 104;
    CONTROLS_GUIDE.forEach(([title, lines], i) => {
      const x = x0 + (i % cols) * (w + gx), y = y0 + Math.floor(i / cols) * (h + 16);
      panel(this, x, y, w, h, { depth: -50, accent: THEME.accent });
      this.add.text(x + 26, y + 14, title, { ...STYLE.hint, fontSize: '26px', color: THEME.gold_css });
      this.add.text(x + 26, y + 48, lines.join('\n'), { fontFamily: FONT, fontSize: '18px', color: '#dbe7ee', lineSpacing: 1 });
    });
    const back = () => { Sound.play('back'); if (this.page) this.scene.start('SettingsPage', { page: this.page, ctx: this.ctx }); else this.scene.start('Settings', this.ctx); };
    tapButton(this, CX, V.height - 26, 220, 'Back  (B)', back);
    this.back = back;
  }
  update() { Controls.update(this.game.loop.frame); if (Controls.menu().b || Controls.menu().a) this.back(); }
}

class SetupScene extends ListMenuScene {
  constructor() { super('Setup'); }
  init(data) { this.practice = !!(data && data.practice); }
  create() {
    const size = (name, key) => ({ label: () => `${name}   ◀ ${Settings[key]} cart${Settings[key] > 1 ? 's' : ''} ▶`, change: d => Settings.adjust(key, d) });
    const toLobby = () => partyGame(this, { teamA: Settings.teamA, teamB: Settings.teamB, difficulty: Settings.difficulty, practice: this.practice, sizes: this.practice ? [Settings.sizeA, Settings.sizeB].map(n => Math.min(n, CONFIG.match.chairsPerTeam)) : [CONFIG.match.chairsPerTeam, CONFIG.match.chairsPerTeam] }) || this.scene.start('Lobby', { practice: this.practice, sizes: this.practice ? [Settings.sizeA, Settings.sizeB] : [CONFIG.match.chairsPerTeam, CONFIG.match.chairsPerTeam] });
    this.buildMenu(this.practice ? 'PRACTICE SETUP' : 'MATCH SETUP', [
      { label: () => `Left team   ◀ ${TEAMS[Settings.teamA].name} ▶`, change: d => Settings.cycleTeam('teamA', d) },
      { label: () => `Right team   ◀ ${TEAMS[Settings.teamB].name} ▶`, change: d => Settings.cycleTeam('teamB', d) },
      ...(this.practice ? [size('Left team size', 'sizeA'), size('Right team size', 'sizeB')] : []),
      { label: () => `Difficulty   ◀ ${Settings.difficulty} ▶`, change: d => Settings.cycleDifficulty(d) },
      speedCapItem('Max cart speed'), lockCartItem(),
      ...(this.practice ? [] : [{ label: () => `Game clock   ◀ ${times(Settings.timeSpeed)} ▶`, change: d => Settings.adjust('timeSpeed', d) }]),
      { label: () => 'How to play', hint: 'The rules and controls of hockey, with a demo game', select: () => this.scene.start('HowTo', { kind: 'hockey', back: { scene: 'Setup', data: { practice: this.practice } } }) },
      { label: () => 'Choose players', select: toLobby },
      { label: () => 'Back', select: () => this.scene.start('Main') }
    ], 250);
    this.onBack = () => this.scene.start('Main');
    this.logoA = this.add.image(190, 400, 'logo-' + TEAMS[Settings.teamA].id).setDisplaySize(240, 240);
    this.logoB = this.add.image(CONFIG.view.width - 190, 400, 'logo-' + TEAMS[Settings.teamB].id).setDisplaySize(240, 240);
    this.nameA = this.add.text(190, 540, '', { ...STYLE.big, fontSize: '44px' }).setOrigin(0.5);
    this.nameB = this.add.text(CONFIG.view.width - 190, 540, '', { ...STYLE.big, fontSize: '44px' }).setOrigin(0.5);
  }
  update() { super.update(); if (this.logoA) { this.logoA.setTexture('logo-' + TEAMS[Settings.teamA].id); this.logoB.setTexture('logo-' + TEAMS[Settings.teamB].id);
      this.nameA.setText(TEAMS[Settings.teamA].name.toUpperCase()).setColor(teamColorHex(Settings.teamA));
      this.nameB.setText(TEAMS[Settings.teamB].name.toUpperCase()).setColor(teamColorHex(Settings.teamB)); } }
}

/* Lobby: any device presses A to join, D-pad left/right picks a side, Start begins. B leaves (or goes back). */
class LobbyScene extends Phaser.Scene {
  constructor() { super('Lobby'); }
  init(data) { this.mini = (data && data.mini) || null; this.sizes = (data && data.sizes) || [CONFIG.match.chairsPerTeam, CONFIG.match.chairsPerTeam]; this.practice = !!(data && data.practice); this.season = (data && data.season) || null; this.teams = this.season ? this.season.teams : [Settings.teamA, Settings.teamB]; }
  create() {
    this.players = []; this.ready = 0;
    this.add.text(CX, 90, 'CHOOSE PLAYERS', { ...STYLE.title, fontSize: '72px' }).setOrigin(0.5);
    this.add.text(CX, 596, 'A: join   ◀ ▶: team   X: lock to one cart   ▲ ▼: pick your name   Y: type a name   Start: kick off   B: leave.\nEmpty carts are played by NPCs. A locked player keeps the cart they start in all game (Y will not switch).', { ...STYLE.hint, fontSize: '22px' }).setOrigin(0.5);
    // mouse and touch: leave, join with the on-screen controller, kick off (with whoever has joined, or CPU v CPU)
    tapButton(this, 150, 676, 220, 'Back', () => { if (this.players.length) this.players = []; else this.scene.start(this.season ? 'SeasonHub' : 'Setup', { practice: this.practice }); });
    if (Settings.touch || navigator.maxTouchPoints > 0) tapButton(this, CX, 676, 360, 'Join (touch controls)', () => {
      if (!Settings.touch) TouchPad.toggle();
      if (!Controls.sources.touch) Controls.sources.touch = new Source('touch', 'Touch controls');
      const src = Controls.sources.touch; if (!src || this.playerOf(src) || this.openSide() === null) return;
      this.players.push({ src, side: this.openSide(), chair: null, spinQueued: 0, speedLevel: Settings.speedLevel, name: this.firstName() });
    });
    tapButton(this, 1130, 676, 260, 'Kick off', () => { Controls.owner = null; this.scene.start('Game', { players: this.players, sizes: this.sizes, practice: this.practice, season: this.season, mini: this.mini }); });
    this.colA = this.add.text(300, 270, '', STYLE.row).setOrigin(0.5, 0); this.colB = this.add.text(980, 270, '', STYLE.row).setOrigin(0.5, 0);
    this.idle = this.add.text(CX, 220, '', { ...STYLE.row, fontSize: '28px', align: 'center', wordWrap: { width: 1180 } }).setOrigin(0.5, 0);
    this.add.image(300, 160, 'logo-' + TEAMS[this.teams[0]].id).setDisplaySize(90, 90);
    this.add.image(980, 160, 'logo-' + TEAMS[this.teams[1]].id).setDisplaySize(90, 90);
    this.add.text(300, 222, TEAMS[this.teams[0]].name.toUpperCase(), { ...STYLE.hud, color: teamColorHex(this.teams[0]) }).setOrigin(0.5);
    this.add.text(980, 222, TEAMS[this.teams[1]].name.toUpperCase(), { ...STYLE.hud, color: teamColorHex(this.teams[1]) }).setOrigin(0.5);
    if (this.season) this.add.text(CX, 150, this.season.side ? 'AWAY' : 'HOME', { ...STYLE.hint, fontSize: '22px', color: '#9fb2bf' }).setOrigin(0.5);
  }
  playerOf(src) { return this.players.find(p => p.src === src); }
  firstName() {                                              // the first player to join gets your saved name; everyone else a free preset
    const taken = this.players.map(p => p.name), mine = Settings.myName();
    if (mine && !taken.includes(mine)) return mine;
    return Settings.nextName(CONFIG.playerNames[this.players.length % CONFIG.playerNames.length], 0, taken.concat(mine));
  }
  rename(p, name) { if (name && !this.players.some(q => q !== p && q.name === name)) { p.name = name; if (this.players[0] === p) Settings.setMyName(name); } }
  openSide() {                                              // side with room and the fewest players, or null when both are full
    const open = [0, 1].filter(s => this.count(s) < this.sizes[s] && (!this.season || s === this.season.side));      // a season game: every person plays for your team
    return open.length ? open.reduce((a, b) => (this.count(b) < this.count(a) ? b : a)) : null;
  }
  count(side) { return this.players.filter(p => p.side === side).length; }
  update() {
    Controls.update(this.game.loop.frame); this.ready = (this.ready || 0) + 1;
    for (const src of Controls.list()) {
      const p = this.playerOf(src);
      if (!p) {
        if (src.pressed.a && this.openSide() !== null) {
          this.players.push({ src, side: this.openSide(), chair: null, spinQueued: 0, speedLevel: Settings.speedLevel, name: this.firstName() }); Sound.play('select');
        } else if (src.pressed.start && this.ready > 12 && this.players.length === 0) { Sound.play('select'); Controls.owner = null; return this.scene.start('Game', { players: [], sizes: this.sizes, practice: this.practice, season: this.season, mini: this.mini }); }   // nobody joined: watch CPU v CPU, people can jump in with Start
        else if (src.pressed.b && this.players.length === 0) { Sound.play('back'); return this.scene.start(this.season ? 'SeasonHub' : 'Setup', { practice: this.practice }); }
        continue;
      }
      const want = this.season ? p.side : src.pressed.left ? 0 : src.pressed.right ? 1 : p.side;
      if (want !== p.side && this.count(want) < this.sizes[want]) { p.side = want; Sound.play('blip'); }
      if (src.pressed.up || src.pressed.down) { this.rename(p, Settings.nextName(p.name, src.pressed.down ? 1 : -1, this.players.filter(q => q !== p).map(q => q.name))); Sound.play('blip'); }   // up / down: step through preset names
      if (src.pressed.x) { p.locked = !p.locked; Sound.play('blip'); }                                                                                                    // X: lock to one cart for the whole game
      if (src.pressed.y) Settings.askName(p.name, t => this.rename(p, t), src);                                                                                         // Y: type your own
      if (src.pressed.b) { this.players = this.players.filter(q => q !== p); Sound.play('back'); }
      else if (src.pressed.start) { Sound.play('select'); Controls.owner = null; return this.scene.start('Game', { players: this.players, sizes: this.sizes, practice: this.practice, season: this.season, mini: this.mini }); }
    }
    const names = side => this.players.map((p, i) => ({ p, i })).filter(o => o.p.side === side).map(o => `${o.p.name}  (${o.p.src.label})${o.p.locked ? '   🔒 ONE CART' : ''}`).join('\n');
    this.colA.setText(names(0)).setColor(teamColorHex(this.teams[0])); this.colB.setText(names(1)).setColor(teamColorHex(this.teams[1]));
    this.idle.setText(this.players.length ? '' : 'Press A on a gamepad, Space / Right Shift on a keyboard, or the A button on the touch controller to join.\nOr press Start to watch CPU v CPU: anyone can jump in later with Start.').setY(this.players.length ? 270 : 340);
  }
}

class GameScene extends Phaser.Scene {
  constructor(key = 'Game') { super(key); }
  init(data) { this.setup = data; this.online = data.online || null; }     // online: { role: 'host' | 'client', session, match, players, me / sim }
  create() {
    const V = CONFIG.view, C = CONFIG.court;
    this.recorded = this.filed = false; this.result = null; this.resultHint = null; this.overAt = undefined;      // a scene object is reused for every match: forget the last one's bookkeeping
    if (this.online) { this.match = this.online.match; this.setup = { players: this.online.players }; }
    else {
      const se = this.setup.season || null;                                                   // Season mode: these two teams, each at its own skill, with the season's game length
      this.match = makeMatch({ mini: this.setup.mini || null, teamA: se ? se.teams[0] : Settings.teamA, teamB: se ? se.teams[1] : Settings.teamB, players: this.setup.players, difficulty: se ? se.difficulty : Settings.difficulty, sizes: this.setup.sizes, practice: this.setup.practice,
        periodSeconds: se ? se.periodSeconds : undefined, diffBySide: se ? se.levels : undefined }, !this.setup.demo);
      this.setup.players.forEach((p, i) => { p.tag = 'P' + (i + 1); });
    }
    /* The camera: everything on the court is drawn in metres inside one container that is moved, turned and scaled every frame so the view follows the ball
       (see updateCamera). The scoreboard, banners and the off-screen arrows live outside it, in screen pixels. */
    this.demo = !!this.setup.demo; if (this.demo) this.match.call = () => {}; this.flipped = false; if (!this.demo) viewFlip = false; this.readView(); this.focus = { x: C.width / 2, y: C.height / 2 }; this.camSeen = false;
    this.world = this.add.container(0, 0);
    const layer = () => { const g = this.add.graphics(); this.world.add(g); return g; };    // drawn in metres
    this.crowd = Settings.crowd !== false && !this.match.map ? new Crowd(this) : null;     // (a race map is outdoors: no stands)
    if (this.crowd) { this.standG = layer(); this.fansG = layer(); this.crowd.drawStands(this.standG); this.crowd.initTexts(this.world); if (!this.demo && Sound.crowd) Sound.crowd.start(); }
    if (!this.demo) Commentator.warm(this.match);
    this.layers = [layer(), layer(), layer()]; this.drawFloor(...this.layers); this.arenaKey = this.arenaId();
    this.tags = this.match.chairs.map(() => this.add.text(0, 0, '', STYLE.tag).setOrigin(0.5).setDepth(10));
    this.dyn = layer();
    this.setupTilt();
    this.arrows = this.add.graphics().setDepth(24); this.arrowTags = [];
    this.buildScoreboard(V, C);
    this.cap = this.add.text(V.width / 2, V.height - 40, '', { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#ffffff', align: 'center', backgroundColor: '#0d151bcc', padding: { x: 16, y: 8 }, wordWrap: { width: V.width - 120 } }).setOrigin(0.5).setDepth(30).setVisible(false); this.capLeft = 0;
    this.events.once('shutdown', () => { if (!this.demo && this.match && (this.match.map || this.match.mini)) setWorld(null); Commentator.stop(); if (this.crowd) { this.crowd.destroyTexts(); this.crowd = null; } if (Sound.crowd) Sound.crowd.stop(); if (!this.demo) { viewFlip = false; viewInv = null; } this.teardownTilt(); });
    this.events.on('resume', () => { try { this.applyCamera(); } catch (e) {} });
    this.lastScore = this.match.score.slice();
    this.banner = this.add.text(this.courtCX, this.viewY, '', STYLE.big).setOrigin(0.5).setStroke('#0d151b', 8);
    this.pingText = this.add.text(V.width - 10, V.height - 22, '', { ...STYLE.hint, fontSize: '14px', color: '#9fb2bf' }).setOrigin(1, 0);   // online: ping and players
    this.noticeText = this.add.text(this.courtCX, this.viewTop + 14, '', { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#ffe27a', align: 'center' }).setOrigin(0.5, 0).setStroke('#0d151b', 6).setAlpha(0.92).setDepth(30);   // fouls and other events: over the top of the court, smallish so play stays visible
    this.setup3d();                                          // first / third person and broadcast cameras (scenes_3d.js)
    if (this.setup.win) { const W = this.setup.win; this.cameras.main.setViewport(W.x, W.y, W.w, W.h).setZoom(W.w / V.width).centerOn(V.width / 2, V.height / 2); if (this.v3) this.v3.win = W; }   // a demo shown in a window on a menu
    if (!this.demo) {                                          // a pause button for the mouse (the touch controller has its own)
      this.pauseBtn = tapButton(this, 155, 30, 62, 'II', () => this.pauseFromTap());   // between the 👥 button and the scoreboard (clear of split-screen labels)
      for (const o of [this.pauseBtn.bg, this.pauseBtn.t, this.pauseBtn.hit]) o.setDepth(60).setScrollFactor(0);
      this.pauseBtn.bg.setAlpha(0.8);
    }
    if (!this.demo) Sound.playMusic('match');
    if (this.online) {                                         // leave cleanly if the host goes away or the room returns to its lobby
      const o = this.online;
      if (o.role === 'client') { o.session.onClosed = reason => this.leaveOnline(netErrorText({ type: reason })); o.session.onLobby = () => this.scene.start('Room', { role: 'client', session: o.session }); }
      else { o.idle = { ax: 0, ay: 0, pressed: {} }; o.session.onError = () => {}; }
    }
  }
  /* A name tag fades almost away while the ball is under it or right next to it, so the ball is never hidden; it comes back as the ball moves on. */
  fadeTagNearBall(tag, key, bx, by, br) {
    const F = CONFIG.render.tagFade, s = tag.scaleX || 1, hw = (tag.width * s) / 2 + br + F.margin, hh = (tag.height * s) / 2 + br + F.margin;
    const near = Math.abs(bx - tag.x) < hw && Math.abs(by - tag.y) < hh, want = near ? F.alpha : 1;
    this.tagAlpha = this.tagAlpha || new Map(); const a0 = this.tagAlpha.has(key) ? this.tagAlpha.get(key) : 1, a = a0 + (want - a0) * (1 - Math.exp(-F.speed * Math.min(0.1, this.game.loop.delta / 1000)));   // eased over time, the same on any frame rate
    this.tagAlpha.set(key, a); tag.setAlpha(a);
  }
  pauseFromTap() {
    if (!this.match || this.match.state === 'over' || this.scene.isActive('Pause') || this.scene.isActive('JoinMenu')) return;
    Controls.owner = null; this.scene.launch('Pause', { game: this, online: !!this.online }); if (!this.online) this.scene.pause();
  }
  showPauseBtn() { const b = this.pauseBtn; if (!b) return; const v = !Settings.touch && this.match.state !== 'over'; if (b.t.visible !== v) { b.bg.setVisible(v); b.t.setVisible(v); b.hit.input.enabled = v; } }
  leaveOnline(message) {
    Controls.owner = null; Controls.claimed.clear();
    const o = this.online; if (o.role === 'host') o.session.close(); else o.session.leave();
    Settings.restoreRules(); Sound.playMusic('menu'); this.scene.stop('Pause'); this.scene.start('OnlineMenu', { message: message || '' });
  }
  updateOnline(delta) {                                        // an online match: the host simulates, clients predict their own cart and draw host snapshots
    const o = this.online, m = this.match, dt = Math.min(delta / 1000, 0.05), pad = Controls.combined, menuOpen = this.scene.isActive('Pause') || FriendsBar.open || Forms.isOpen;   // (the friends window or a form is open: your cart coasts)
    const idle = { ax: 0, ay: 0, pressed: {}, held: {} };                                    // while the menu is open your carts get no input
    if (pad.pressed.start && m.state !== 'over' && !menuOpen) { Sound.play('select'); Controls.owner = Controls.list().find(src => src.pressed.start) || null; this.scene.launch('Pause', { game: this, online: true }); }
    Controls.claim(o.session.claimedSources());
    const guests = [...o.session.guestSrc];                                                  // local guests: [id, device]; you drive with every device nobody has claimed
    if (o.role === 'host') {
      const locals = [[o.me, Controls.mine], ...guests.map(([id, src]) => [o.players.find(q => q.id === id), src])];
      for (const [me, src] of locals) {
        if (!me) continue; const input = menuOpen ? idle : src; me.src = menuOpen ? o.idle : src;
        if (input.pressed.halfCW) me.spinQueued = 0.5; if (input.pressed.halfCCW) me.spinQueued = -0.5;
        if (input.pressed.spinCW) me.spinQueued = 1; if (input.pressed.spinCCW) me.spinQueued = -1;
        if (m.mini && (input.pressed.a || input.pressed.x)) m.useBy(me); else if (input.pressed.x) m.togglePress(me.side);
        if (input.pressed.y) m.switchChair(me);
        if (input.pressed.speedUp && me.speedLevel < Settings.speedCap) { me.speedLevel++; Sound.play('blip'); }
        if (input.pressed.speedDown && me.speedLevel > 1) { me.speedLevel--; Sound.play('blip'); }
      }
      this.pre3d(dt); m.update(dt); o.session.tick(dt);
      this.pingText.setText(`${o.session.roster.length} player${o.session.roster.length > 1 ? 's' : ''} online   room ${o.session.code}`);
      if (m.state === 'over' && o.session.seasonFx && !this.filed) { this.filed = true; Season.record(Season.cur, o.session.seasonFx, m.score[0], m.score[1], m.overtime); Season.save(Season.cur); }   // a party season game counts in the leader's season
      const tapA = this.resultTap === 'a' && this.resultReady(); if (this.resultTap && this.resultReady()) this.resultTap = null;
      if (m.state === 'over' && o.session.seasonFx && this.resultReady() && (Controls.menu().a || tapA) && !menuOpen) { Controls.owner = null; Controls.claimed.clear(); o.session.close('party_done'); Sound.playMusic('menu'); this.scene.start('SeasonHub'); return; }
      if (m.state === 'over' && this.resultReady() && (Controls.menu().a || tapA) && !menuOpen) { o.session.backToLobby(); this.scene.start('Room', { role: 'host', session: o.session }); return; }
    } else {
      this.pre3d(dt); o.sim.frame(dt, [{ id: o.session.myId, input: menuOpen ? idle : Controls.mine }, ...guests.map(([id, src]) => ({ id, input: menuOpen ? idle : src }))]);
      if (m.mini) { const me = o.sim.locals[0] && o.sim.locals[0].me; if (me && me.chair) Object.assign(m.ball, { x: me.chair.x, y: me.chair.y }); }   // minigames: the cameras follow your own cart
      if (o.session.silent()) o.session.finish('lost');
      this.pingText.setText(`ping ${Math.round(o.session.rtt)} ms   room ${o.session.code}`);
    }
    this.render();
  }
  /* Broadcast-style bar across the top: [team colour + logo + name + score] [clock] [score + name + logo + colour]. */
  buildScoreboard(V, C) {                                   // a slim bar so the court gets the room
    const m = this.match, cx = this.courtCX, barW = 900, h = 42, y = 5;
    panel(this, cx - barW / 2, y, barW, h, { depth: 20, alpha: 0.92, radius: 12 });
    [0, 1].forEach(s => {
      const dir = s ? 1 : -1, edge = cx + dir * barW / 2, hex = Phaser.Display.Color.HexStringToColor(teamColorHex(m.teams[s])).color;
      this.add.rectangle(edge - dir * 5, y + h / 2, 10, h - 6, hex).setDepth(21);                    // team colour block at the outer end
      this.add.image(edge - dir * 38, y + h / 2, 'logo-' + TEAMS[m.teams[s]].id).setDisplaySize(32, 32).setDepth(22);
    });
    const small = { ...STYLE.hud, fontSize: '20px' };
    this.nameA = this.add.text(cx - barW / 2 + 62, y + h / 2, '', small).setOrigin(0, 0.5).setDepth(22);
    this.nameB = this.add.text(cx + barW / 2 - 62, y + h / 2, '', small).setOrigin(1, 0.5).setDepth(22);
    this.scoreA = this.add.text(cx - 62, y + h / 2, '', { ...STYLE.hud, fontSize: '32px' }).setOrigin(0.5).setDepth(22);
    this.scoreB = this.add.text(cx + 62, y + h / 2, '', { ...STYLE.hud, fontSize: '32px' }).setOrigin(0.5).setDepth(22);
    this.clockText = this.add.text(cx, y + h / 2, '', { ...STYLE.hud, fontSize: '22px' }).setOrigin(0.5).setDepth(22);
    // Second strip under the bar: shots on net, penalty clocks and the power-play count (3 v 2 ...), in their own box so they are easy to see.
    const y2 = y + h + 4, h2 = 40, mid = y2 + h2 / 2;
    panel(this, cx - barW / 2, y2, barW, h2, { depth: 20, alpha: 0.92, radius: 12 });
    const st = { ...STYLE.hud, fontSize: '22px' };
    this.shotsA = this.add.text(cx - barW / 2 + 16, mid, '', st).setOrigin(0, 0.5).setDepth(22);
    this.shotsB = this.add.text(cx + barW / 2 - 16, mid, '', st).setOrigin(1, 0.5).setDepth(22);
    const pen = { ...STYLE.hud, fontSize: '22px', color: '#ff7a59' };
    this.penA = this.add.text(cx - barW / 2 + 128, mid, '', pen).setOrigin(0, 0.5).setDepth(22);
    this.penB = this.add.text(cx + barW / 2 - 128, mid, '', pen).setOrigin(1, 0.5).setDepth(22);
    this.ppText = this.add.text(cx, mid, '', { ...STYLE.hud, fontSize: '22px' }).setOrigin(0.5).setDepth(22);
  }

  updateStrip(m) {                                          // shots, penalty clocks and the 3 v 2 style strength count
    const shots = m.shots || [0, 0], st = m.strength(), pens = s => m.chairs.filter(c => c.benched && c.side === s).map(c => `#${c.index + 1}  ${Math.max(0, Math.ceil(c.binLeft))}s`).join('   ');
    this.shotsA.setText('SHOTS ' + shots[0]).setColor(teamColorHex(m.teams[0])); this.shotsB.setText('SHOTS ' + shots[1]).setColor(teamColorHex(m.teams[1]));
    const pa = pens(0), pb = pens(1);
    this.penA.setText(pa ? 'PENALTY ' + pa : ''); this.penB.setText(pb ? 'PENALTY ' + pb : '');
    if (st[0] !== st[1]) { const adv = st[0] > st[1] ? 0 : 1; this.ppText.setText(`POWER PLAY  ${st[adv]} v ${st[1 - adv]}`).setColor(teamColorHex(m.teams[adv])); }
    else this.ppText.setText(`${st[0]} v ${st[1]}`).setColor('#9fb2bf');
  }
  resultReady() { return this.overAt !== undefined && this.time.now - this.overAt > 1000; }          // buttons only count a moment after the whistle, so a late press does not skip the result
  showResult() {                                           // full time: who won, the score, a few stats and what to press
    if (this.result) return; const m = this.match, V = CONFIG.view, cx = V.width / 2, cy = V.height / 2 + 10, o = this.online, se = this.setup.season;
    this.overAt = this.time.now; const win = m.score[0] === m.score[1] ? -1 : m.score[0] > m.score[1] ? 0 : 1, col = s => teamColorHex(m.teams[s]), nm = s => TEAMS[m.teams[s]].name.toUpperCase();
    const items = []; const add = x => { items.push(x); return x; }, T = (x, y, str, st) => add(this.add.text(x, y, str, { fontFamily: FONT, ...st }).setOrigin(0.5).setDepth(41));
    add(this.add.rectangle(cx, V.height / 2, V.width, V.height, 0x0d151b, 0.55).setDepth(39));
    const w = 760, h = 470; add(panel(this, cx - w / 2, cy - h / 2, w, h, { depth: 40, alpha: 0.94, radius: 22 }));
    T(cx, cy - 195, m.overtime || (m.shootout) ? 'FULL TIME  -  OVERTIME' : 'FULL TIME', { fontSize: '24px', fontStyle: 'bold', color: THEME.gold_css });
    T(cx, cy - 135, win < 0 ? 'IT\'S A DRAW' : nm(win) + ' WIN!', { fontSize: '66px', fontStyle: 'bold', color: win < 0 ? '#ffffff' : col(win) }).setStroke('#0d151b', 8);
    T(cx - 230, cy - 55, nm(0), { fontSize: '26px', fontStyle: 'bold', color: col(0) }); T(cx + 230, cy - 55, nm(1), { fontSize: '26px', fontStyle: 'bold', color: col(1) });
    T(cx - 230, cy - 5, String(m.score[0]), { fontSize: '86px', fontStyle: 'bold', color: '#ffffff' }).setStroke('#0d151b', 8); T(cx + 230, cy - 5, String(m.score[1]), { fontSize: '86px', fontStyle: 'bold', color: '#ffffff' }).setStroke('#0d151b', 8);
    T(cx, cy - 5, '-', { fontSize: '60px', color: THEME.dim });
    const sh = m.shots || [0, 0], pct = s => sh[s] ? Math.round(100 * m.score[s] / sh[s]) + '%' : '-', rows = [['Shots on net', sh[0], sh[1]], ['Shooting', pct(0), pct(1)]];
    if (m.pens) rows.push(['Penalties', m.pens[0], m.pens[1]]);
    const best = s => { const sc = m.scorers || {}, mine = Object.entries(sc).filter(([n]) => m.players && m.players.some(p => p.name === n && p.side === s)).sort((a, b) => b[1] - a[1])[0]; return mine ? `${mine[0]} (${mine[1]})` : '-'; };
    if (m.scorers && Object.keys(m.scorers).length) rows.push(['Top scorer', best(0), best(1)]);
    rows.forEach((r, i) => { const y = cy + 62 + i * 31; T(cx, y, r[0], { fontSize: '20px', color: THEME.dim }); T(cx - 230, y, String(r[1]), { fontSize: '24px', fontStyle: 'bold', color: '#ffffff' }); T(cx + 230, y, String(r[2]), { fontSize: '24px', fontStyle: 'bold', color: '#ffffff' }); });
    const hint = o ? (o.role === 'host' ? 'A: back to the room' : 'Waiting for the host...') : se ? 'A: continue the season' : 'A: rematch      B: main menu';
    const hintT = T(cx, cy + h / 2 - 28, hint, { fontSize: '28px', fontStyle: 'bold', color: '#ffffff' });
    // the same choices as buttons for a mouse or a finger (they act like A / B once the result can be dismissed)
    const btns = o ? (o.role === 'host' ? [['Back to the room', 'a']] : []) : se ? [['Continue the season', 'a']] : [['Rematch', 'a'], ['Main menu', 'b']];
    if (btns.length) { hintT.setY(cy + h / 2 - 100).setFontSize(20).setColor(THEME.dim); hintT.setText(hint.replace(/ {2,}/g, '   ')); }
    btns.forEach(([label, b], i) => { const x = cx + (i - (btns.length - 1) / 2) * 280, t = tapButton(this, x, cy + h / 2 - 44, 250, label, () => { this.resultTap = b; }); for (const o2 of [t.bg, t.t, t.hit]) { o2.setDepth(42); add(o2); } });
    items.forEach(x => { x.setAlpha(0); if (x !== hintT) this.tweens.add({ targets: x, alpha: x.fillAlpha !== undefined && x.type === 'Rectangle' ? 0.55 : 1, duration: 350 }); });
    this.resultHint = hintT;
    if (win >= 0) confettiBurst(this, cx, cy - 150, Phaser.Display.Color.HexStringToColor(col(win)).color);
    this.result = items; this.events.once('shutdown', () => { this.result = null; this.resultHint = null; this.overAt = undefined; });
  }
  celebrate(side) {                                         // confetti, flash, shake and a pop on the score
    const C = CONFIG.court, col = Phaser.Display.Color.HexStringToColor(teamColorHex(this.match.teams[side])).color;
    confettiBurst(this, this.viewX, this.viewY, col);
    this.cameras.main.shake(THEME.shake.ms, THEME.shake.strength); if (this.v3 && !this.flat) this.v3.shake(); this.cameras.main.flash(180, 255, 255, 255, true);
    const t = side ? this.scoreB : this.scoreA; this.tweens.add({ targets: t, scale: { from: 1.7, to: 1 }, duration: 450, ease: 'Back.easeOut' });
  }

  drawFloor(back, wood, g) {                                // back = boards, wood = floor planks (masked to the rounded rink), g = lines and nets
    const C = CONFIG.court, cy = C.height / 2, S = this.surf();
    back.fillStyle(S.board).fillRoundedRect(-0.4, -0.4, C.width + 0.8, C.height + 0.8, C.cornerRadius + 0.4);
    this.drawSurface(wood, S);
    this.maskG = this.make.graphics({ add: false }); this.maskG.fillStyle(0xffffff).fillRoundedRect(0, 0, C.width, C.height, C.cornerRadius); wood.setMask(this.maskG.createGeometryMask());      // the rounded rink shape: moves with the camera (updateCamera)
    const L = CONFIG.look;                                  // 3D look: bevelled board rim and a soft shadow thrown onto the floor by the boards
    back.lineStyle(L.boardRimWidth, S.rim, 1).strokeRoundedRect(-0.2, -0.2, C.width + 0.4, C.height + 0.4, C.cornerRadius + 0.2);
    for (let i = 0; i < L.innerShadowSteps; i++) {
      const w = L.innerShadowWidth * (1 - i / L.innerShadowSteps);
      g.lineStyle(w * 2, 0x000000, L.innerShadowAlpha).strokeRoundedRect(0, 0, C.width, C.height, C.cornerRadius);
    }
    g.lineStyle(C.lineWidth, S.line);
    g.strokeRoundedRect(0, 0, C.width, C.height, C.cornerRadius); g.lineBetween(C.width / 2, 0, C.width / 2, C.height); g.strokeCircle(C.width / 2, cy, C.centerCircleRadius);
    [0, 1].forEach(s => { const im = this.add.image(C.width * (s ? 0.66 : 0.34), cy, 'logo-' + TEAMS[this.match.teams[s]].id).setAlpha(0.28).setDisplaySize(4, 4).setRotation(-this.rot); this.world.add(im); (this.logoImgs || (this.logoImgs = [])).push(im); });          // upright whichever way the rink is turned
    for (const n of this.match.nets) this.drawCrease(g, n);
    for (const n of this.match.nets) {                      // nets: white frame plus mesh lines
      g.lineStyle(0.1, 0xffffff, 0.9); g.strokeRect(Math.min(n.backX, n.mouthX), n.y1, CONFIG.net.depth, n.y2 - n.y1);
      g.lineStyle(0.03, 0xffffff, 0.35);
      for (let y = n.y1; y < n.y2; y += 0.4) g.lineBetween(n.backX, y, n.mouthX, y);
    }
  }
  surf() { return CONFIG.surfaces[Math.max(0, Math.min(CONFIG.surfaces.length - 1, Settings.court | 0))]; }
  drawSurface(g, S) {                                       // the court material: hardwood, sport tiles, concrete, ice or turf
    const C = CONFIG.court;
    if (S.kind === 'wood') return this.drawWood(g);
    let a = 11; const rnd = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const W = C.width, H = C.height, shade = (c, f) => { const r = Math.max(0, Math.min(255, ((c >> 16) & 255) * f)), gg = Math.max(0, Math.min(255, ((c >> 8) & 255) * f)), b = Math.max(0, Math.min(255, (c & 255) * f)); return (r << 16) | (gg << 8) | b; };
    g.fillStyle(S.base).fillRect(-0.1, -0.1, W + 0.2, H + 0.2);
    if (S.kind === 'tiles') {                               // interlocking sport tiles: a chequer of two blues, bevelled joints
      const t = 0.5;
      for (let i = 0; i * t < W; i++) for (let j = 0; j * t < H; j++) {
        g.fillStyle((i + j) % 2 ? S.alt : S.base).fillRect(i * t, j * t, t, t);
        if (rnd() < 0.18) g.fillStyle(0xffffff, 0.04).fillRect(i * t, j * t, t, t);
      }
      g.lineStyle(0.012, 0x0b2447, 0.55); for (let i = 0; i * t <= W; i++) g.lineBetween(i * t, 0, i * t, H); for (let j = 0; j * t <= H; j++) g.lineBetween(0, j * t, W, j * t);
      g.lineStyle(0.012, 0xffffff, 0.12); for (let i = 0; i * t <= W; i++) g.lineBetween(i * t + 0.012, 0, i * t + 0.012, H);
    } else if (S.kind === 'concrete') {                     // poured slab: mottled, with saw-cut joints and a few hairline cracks
      for (let n = 0; n < 220; n++) { const x = rnd() * W, y = rnd() * H, r = 0.15 + rnd() * 0.7; g.fillStyle(rnd() < 0.5 ? 0xffffff : 0x000000, 0.025 + rnd() * 0.03).fillEllipse(x, y, r, r * (0.5 + rnd() * 0.6)); }
      for (let n = 0; n < 600; n++) g.fillStyle(rnd() < 0.5 ? 0x3a3d40 : 0xc9cdd0, 0.35).fillRect(rnd() * W, rnd() * H, 0.02, 0.02);
      g.lineStyle(0.02, 0x2d3033, 0.55); for (let x = 3.5; x < W; x += 3.5) g.lineBetween(x, 0, x, H); for (let y = 2.5; y < H; y += 2.5) g.lineBetween(0, y, W, y);
      g.lineStyle(0.012, 0x2d3033, 0.45); for (let n = 0; n < 6; n++) { let x = rnd() * W, y = rnd() * H; g.beginPath().moveTo(x, y); for (let k = 0; k < 7; k++) { x += (rnd() - 0.4) * 0.5; y += (rnd() - 0.5) * 0.5; g.lineTo(x, y); } g.strokePath(); }
    } else if (S.kind === 'ice') {                          // fresh ice: pale blue, long skate scratches and a soft sheen
      for (let n = 0; n < 40; n++) { const x = rnd() * W, y = rnd() * H, r = 1 + rnd() * 3; g.fillStyle(0xffffff, 0.12).fillEllipse(x, y, r * 1.8, r); }
      for (let n = 0; n < 170; n++) {
        const x = rnd() * W, y = rnd() * H, len = 0.6 + rnd() * 3.2, ang = rnd() * Math.PI, bend = (rnd() - 0.5) * 0.9;
        g.lineStyle(0.012 + rnd() * 0.012, rnd() < 0.7 ? 0xffffff : 0x8fbfdc, 0.18 + rnd() * 0.3).beginPath().moveTo(x, y);
        for (let k = 1; k <= 6; k++) g.lineTo(x + Math.cos(ang + bend * k / 6) * len * k / 6, y + Math.sin(ang + bend * k / 6) * len * k / 6); g.strokePath();
      }
    } else if (S.kind === 'turf') {                         // artificial grass: mown stripes and flecks of blade
      for (let i = 0; i * 1.0 < W; i++) g.fillStyle(i % 2 ? S.alt : S.base).fillRect(i * 1.0, 0, 1.0, H);
      for (let n = 0; n < 1100; n++) g.fillStyle(rnd() < 0.5 ? shade(S.base, 0.7) : shade(S.alt, 1.25), 0.45).fillRect(rnd() * W, rnd() * H, 0.015, 0.05);
    }
  }
  drawWood(g) {                                             // staggered hardwood planks with seams and a hint of grain
    const C = CONFIG.court, K = CONFIG.wood; let a = K.seed;
    const rnd = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    for (let y = 0; y < C.height; y += K.plankWidth) {
      for (let x = -rnd() * K.plankLength; x < C.width; ) {
        const len = K.plankLength * (0.7 + 0.6 * rnd());
        g.fillStyle(K.colors[Math.floor(rnd() * K.colors.length)]).fillRect(x, y, len, K.plankWidth);
        g.lineStyle(K.grainWidth, K.grainColor, K.grainAlpha).lineBetween(x, y + K.plankWidth * (0.25 + 0.5 * rnd()), x + len, y + K.plankWidth * (0.25 + 0.5 * rnd()));
        g.lineStyle(K.seamWidth, K.seamColor, K.seamAlpha).lineBetween(x, y, x, y + K.plankWidth);
        x += len;
      }
      g.lineStyle(K.seamWidth, K.seamColor, K.seamAlpha).lineBetween(0, y, C.width, y);
    }
  }
  drawCrease(g, n) {                                        // arc from one post to the other, bulging into the court
    const Z = CONFIG.crease, half = CONFIG.net.width / 2 + (Z.wing || 0), R = (half * half + Z.bulge * Z.bulge) / (2 * Z.bulge);
    const dir = n.end === 0 ? 1 : -1, cx = n.mouthX + dir * (Z.bulge - R), cy = this.match.centerY, phi = Math.atan2(half, R - Z.bulge), pts = [];
    for (let i = 0; i <= Z.segments; i++) { const a = -phi + 2 * phi * i / Z.segments; pts.push({ x: cx + dir * R * Math.cos(a), y: cy + R * Math.sin(a) }); }
    g.fillStyle(Z.fillColor, Z.fillAlpha).fillPoints(pts, true);
    g.lineStyle(CONFIG.court.lineWidth, this.surf().line).strokePoints(pts, false);
  }
  drawSpeedRing(g, c, level) {                              // ring around the cart: one lit segment per speed level
    const R = CONFIG.render, n = CONFIG.speedLevels.length, r = CONFIG.chair.radius + R.ringOffset, step = 2 * Math.PI / n;
    g.lineStyle(R.ringWidth + 0.07, 0x0b0f12, 0.6).strokeCircle(c.x, c.y, r);                       // a dark band under the segments so they show on pale courts (ice)
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + i * step + R.ringGapRadians / 2;
      g.lineStyle(R.ringWidth, 0xffffff, i < level ? 1 : R.ringDimAlpha).beginPath().arc(c.x, c.y, r, a0, a0 + step - R.ringGapRadians, false).strokePath();
    }
  }
  /* The ball rolls: a few dark spots sit on a virtual sphere that is turned by however far the ball moved (a top-down view of a rolling ball). */
  drawBallRoll(g, b, r) {
    const R = this.ballRot || (this.ballRot = { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], x: b.x, y: b.y });
    const dx = b.x - R.x, dy = b.y - R.y, d = Math.hypot(dx, dy); R.x = b.x; R.y = b.y;
    if (d > 0.0005 && d < 2) {                                                   // (a jump, e.g. a kick-off reset, does not spin it)
      const ang = d / r, ax = -dy / d, ay = dx / d, c = Math.cos(ang), s2 = Math.sin(ang), t = 1 - c;
      const Q = [t * ax * ax + c, t * ax * ay, ay * s2, t * ax * ay, t * ay * ay + c, -ax * s2, -ay * s2, ax * s2, c], M = R.m, N = new Array(9);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) N[i * 3 + j] = Q[i * 3] * M[j] + Q[i * 3 + 1] * M[3 + j] + Q[i * 3 + 2] * M[6 + j];
      R.m = N;
    }
    const spots = this.ballSpots || (this.ballSpots = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0.577, 0.577, 0.577], [-0.577, -0.577, 0.577], [0.577, -0.577, -0.577], [-0.577, 0.577, -0.577]]), M = R.m;
    for (const v of spots) {
      const x = M[0] * v[0] + M[1] * v[1] + M[2] * v[2], y = M[3] * v[0] + M[4] * v[1] + M[5] * v[2], z = M[6] * v[0] + M[7] * v[1] + M[8] * v[2];
      if (z <= 0.05) continue;                                                   // on the far side
      g.fillStyle(0x0f1820, 1).fillEllipse(b.x + x * r * 0.72, b.y + y * r * 0.72, r * 0.5 * (0.35 + 0.65 * z), r * 0.5 * (0.35 + 0.65 * z));
    }
  }
  drawChair(g, c, color, speedLevel) {
    const K = CONFIG.chair, cup = CONFIG.cup, T = (x, y) => c.toWorld(x, y), L = CONFIG.look, hw = K.bodyWidth / 2;
    const poly = (pts, fill, a = 1) => g.fillStyle(fill, a).fillPoints(pts.map(p => T(p[0], p[1])), true);
    const rect = (x0, y0, x1, y1, fill, a) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], fill, a);
    const ell = (cx, cy, rx, ry, fill, a, n = 14) => { const pts = []; for (let i = 0; i < n; i++) { const t = i / n * 6.2832; pts.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]); } poly(pts, fill, a); };
    const line = (x0, y0, x1, y1, w, col, a = 1) => g.lineStyle(w, col, a).strokePoints([T(x0, y0), T(x1, y1)], false);
    const tipX0 = cup.frontX - cup.recess + Settings.stickLength, k = c.index + c.side * 3, skin = CROWD_SKIN[(k * 2 + 1) % CROWD_SKIN.length], hair = CROWD_HAIR[(k * 3 + 2) % CROWD_HAIR.length];
    const sh = pts => pts.map(p => ({ x: p.x + L.shadowDx, y: p.y + L.shadowDy }));
    // shadows of the chair and its stick
    g.fillStyle(0x000000, L.shadowAlpha).fillPoints(sh([[-0.45, -hw - 0.04], [0.5, -hw - 0.04], [0.5, hw + 0.04], [-0.45, hw + 0.04]].map(p => T(p[0], p[1]))), true);
    g.lineStyle(0.16, 0x000000, L.shadowAlpha).strokePoints(sh([T(-0.1, 0), T(tipX0, 0)]), false).strokePoints(sh(CUP_POINTS.map(p => T(p.x, p.y))), false);
    // drive wheels (big, rear), tread blocks and hubs
    for (const sd of [-1, 1]) {
      const y0 = sd * (hw - 0.07);
      rect(-0.34, y0 - 0.075, 0.12, y0 + 0.075, 0x14181c); rect(-0.34, y0 - 0.075, 0.12, y0 + 0.075, 0x2a3036, 0.0);
      for (let x = -0.32; x < 0.12; x += 0.07) line(x, y0 - 0.075, x, y0 + 0.075, 0.018, 0x2e353b);
      ell(-0.11, y0, 0.06, 0.06, 0x8b959e); ell(-0.11, y0, 0.025, 0.025, 0x2a3036);
      ell(0.38, sd * 0.25, 0.065, 0.045, 0x20262b); ell(0.38, sd * 0.25, 0.03, 0.03, 0x6a747d);                          // front casters
      line(0.22, sd * 0.22, 0.38, sd * 0.25, 0.035, 0x3a434a);
    }
    // frame: the battery shell in the team colour over a dark chassis
    poly([[-0.42, -0.2], [-0.3, -0.27], [0.18, -0.25], [0.3, -0.16], [0.3, 0.16], [0.18, 0.25], [-0.3, 0.27], [-0.42, 0.2]], 0x1b2025);
    poly([[-0.38, -0.17], [-0.28, -0.22], [0.12, -0.2], [0.22, -0.12], [0.22, 0.12], [0.12, 0.2], [-0.28, 0.22], [-0.38, 0.17]], color);
    poly([[-0.38, -0.17], [-0.28, -0.22], [0.12, -0.2], [0.22, -0.12], [0.22, -0.02], [-0.38, -0.02]], 0xffffff, 0.16);       // gloss on one side
    line(-0.34, -0.2, 0.16, -0.18, 0.02, 0x000000, 0.35); line(-0.34, 0.2, 0.16, 0.18, 0.02, 0x000000, 0.35);
    rect(0.24, -0.17, 0.46, 0.17, 0x2c3238); rect(0.26, -0.15, 0.44, 0.15, 0x3d454c);                                        // footplate
    // seat, backrest, armrests
    rect(-0.3, -0.19, 0.04, 0.19, 0x2a3036); rect(-0.28, -0.17, 0.02, 0.17, 0x3a424a);
    rect(-0.44, -0.2, -0.3, 0.2, 0x20262b); rect(-0.43, -0.18, -0.34, 0.18, color, 0.55);
    rect(-0.28, -0.3, 0.06, -0.23, 0x14181c); rect(-0.28, 0.23, 0.06, 0.3, 0x14181c);
    // joystick box on the right arm
    rect(-0.04, 0.2, 0.16, 0.33, 0x1d2227); ell(0.06, 0.265, 0.035, 0.035, 0xd8392b); ell(0.06, 0.265, 0.015, 0.015, 0xffffff, 0.5);
    // the player: legs, shoes, torso in the team jersey, arms to the armrest and the joystick, head
    rect(0.0, -0.17, 0.3, -0.04, 0x2f3b55); rect(0.0, 0.04, 0.3, 0.17, 0x2f3b55);
    rect(0.28, -0.185, 0.43, -0.03, 0xf0f0f0); rect(0.28, 0.03, 0.43, 0.185, 0xf0f0f0);
    ell(-0.2, 0, 0.12, 0.25, color); ell(-0.2, 0, 0.12, 0.25, 0xffffff, 0.12);
    rect(-0.27, -0.2, -0.13, -0.17, 0xffffff, 0.8); rect(-0.27, 0.17, -0.13, 0.2, 0xffffff, 0.8);                           // sleeve trim on the shoulders
    rect(-0.23, -0.07, -0.14, 0.07, 0xffffff, 0.85);                                                                         // number patch on the back
    line(-0.2, -0.22, -0.04, -0.27, 0.085, color); line(-0.2, 0.22, 0.04, 0.265, 0.085, color);
    ell(-0.03, -0.27, 0.04, 0.04, skin); ell(0.05, 0.265, 0.04, 0.04, skin);
    ell(-0.17, 0, 0.095, 0.095, skin); ell(-0.19, 0, 0.1, 0.1, hair);                                                         // head, then hair (or helmet)
    ell(-0.19, 0, 0.09, 0.09, color, 0.0);
    ell(-0.17, -0.095, 0.02, 0.03, skin); ell(-0.17, 0.095, 0.02, 0.03, skin);                                                 // ears
    // the "c" cup and the stick
    const crossX = cup.frontX - cup.recess - 0.02, tipX = cup.frontX - cup.recess + Settings.stickLength;
    g.lineStyle(0.1, color).strokePoints(CUP_POINTS.map(p => T(p.x, p.y)), false);
    g.lineStyle(0.06, 0x0b0f12).strokePoints([T(crossX, -0.14), T(crossX, 0.14)], false);
    g.lineStyle(cup.stickColliderRadius * 2, 0x0b0f12).strokePoints([T(0.2, 0), T(tipX, 0)], false);
    if (speedLevel) this.drawSpeedRing(g, c, speedLevel);
  }
  update(time, delta) {
    if (!this.clockText || !this.clockText.active || !this.world || !this.world.scene) return;      // the scene is being torn down (backing out to the menu): nothing left to draw
    Controls.update(this.game.loop.frame); this.showPauseBtn();
    if (this.demo) {                                                                   // the camera-settings preview and the menu demos: the CPU plays itself, nobody can pause it
      const vid = this.scene.key === 'Demo', dt = vid ? Math.min((this.game.loop.rawDelta || delta) / 1000, 0.1) * CONFIG.demoSpeed : Math.min(delta / 1000, 0.05);   // rawDelta: the real time between frames (Phaser's smoothed delta turns a slow frame rate into slow motion)   
      if (vid && this.match.state === 'countdown' && this.match.timer > 0.3) this.match.timer = 0.3;      // no 3-2-1 in a demo
      this.match.update(dt); this.pre3d(dt); this.render(); return;
    }          // the camera-settings preview: the CPU plays itself, nobody can pause it
    if (this.online) return this.updateOnline(delta);
    const m = this.match;
    for (const p of this.setup.players) {
      if (p.src.pressed.halfCW) p.spinQueued = 0.5; if (p.src.pressed.halfCCW) p.spinQueued = -0.5;
      if (p.src.pressed.spinCW) p.spinQueued = 1; if (p.src.pressed.spinCCW) p.spinQueued = -1;
      if (m.mini && (p.src.pressed.a || p.src.pressed.x)) m.useBy(p); else if (p.src.pressed.x) m.togglePress(p.side);
      if (p.src.pressed.y) m.switchChair(p);
      if (p.src.pressed.speedUp && p.speedLevel < Settings.speedCap) { p.speedLevel++; Sound.play('blip'); }   // RB
      if (p.src.pressed.speedDown && p.speedLevel > 1) { p.speedLevel--; Sound.play('blip'); }                      // LB
      if (p.src.pressed.start && m.state !== 'over') { Sound.play('select'); Controls.owner = p.src; this.scene.launch('Pause', { game: this }); return this.scene.pause(); }
    }
    if (!this.scene.isActive('Pause') && !this.scene.isActive('JoinMenu')) for (const src of Controls.list()) {     // a device nobody is using presses Start: choose a side and jump in
      if (src.pressed.start && m.state !== 'over' && !this.setup.players.some(p => p.src === src)) { Sound.play('select'); Controls.owner = src; this.scene.launch('JoinMenu', { game: this, src }); return this.scene.pause(); }
    }
    this.pre3d(Math.min(delta / 1000, 0.05));
    m.update(Math.min(delta / 1000, 0.05));
    this.render();
    if (m.state === 'over') {
      if (!this.recorded && !m.mini) { this.recorded = true; const sides = [...new Set(this.setup.players.map(p => p.side))]; if (sides.length) Settings.record(m, sides); }
      const e = this.resultReady() ? { ...Controls.menu() } : {}, se = this.setup.season;
      if (this.resultTap) { if (this.resultReady()) e[this.resultTap] = true; this.resultTap = null; }
      if (se) {                                                                                      // Season: file the result and go back to the season screen
        if (!this.filed) { this.filed = true; Season.record(Season.cur, se.fx, m.score[0], m.score[1], m.overtime); Season.save(Season.cur); }
        if (e.a || e.b || e.start) { Sound.playMusic('menu'); Controls.owner = null; this.scene.start('SeasonHub'); }
      } else {
        if (e.a) { this.scene.restart(this.setup); }
        if (e.b) { Sound.playMusic('menu'); this.scene.start('Main'); }
      }
    }
  }
  /* ----- the camera ----- */
  /* Tilted camera ("looking down the court"): the court is drawn flat into a big off-screen texture, which is shown on a plane that leans back in perspective.
     The plane's four corners tell us where any texture pixel lands on the screen (a homography), so tags and arrows can still be placed exactly. */
  readView() {                                             // work out the view from the settings: which way up, how close, and whether it is tilted
    const V = CONFIG.view, C = this.match && this.match.map ? { ...CONFIG.court, ...CONFIG.courtBase } : CONFIG.court;     // a big race map: the same closeness as on the rink (the view follows you round it)
    this.viewX = V.width / 2; this.viewTop = V.hudHeight; this.viewW = V.width; this.viewH = V.height - V.hudHeight; this.viewY = this.viewTop + this.viewH / 2; this.courtCX = V.width / 2;
    this.vertical = Settings.vertical !== false; this.baseRot = this.vertical ? -Math.PI / 2 : 0; this.rot = this.baseRot + (this.flipped ? Math.PI : 0);      // vertical: the far end of the court (x = width) is at the top of the screen, like a hockey broadcast
    this.classic = Settings.view === 'classic';
    const A = CONFIG.arena, cr = Settings.crowd !== false; this.mx = A.endMargin; this.my = cr ? A.visible - 0.1 : 0.8; const sideRoom = cr ? 2 * A.visible : 1.6;
    this.baseZoom = this.classic ? Math.min(V.width / (C.width + 1.6), this.viewH / (C.height + sideRoom)) : this.vertical ? V.width * 0.96 / (C.height + (cr ? 2 * A.visible : 0)) : V.width / (C.width * 0.6);      // "100%": the width of the rink nearly fills the screen
    this.zoom = this.classic ? this.baseZoom : this.baseZoom * (Settings.zoomPct || 100) / 100;
    this.cx = this.viewX; this.cy = this.viewY; this.tilted = false;
  }
  teardownTilt() {
    if (this.plane) { try { this.plane.destroy(); } catch (e) {} this.plane = null; }
    if (this.dtKey) { try { this.textures.remove(this.dtKey); } catch (e) {} this.dtKey = null; this.dt = null; }
    if (this.world) { this.world.cameraFilter = 0; this.world.each(ch => { ch.cameraFilter = 0; }); }
    this.tilted = false;
  }
  arenaId() { return (Settings.court | 0) + '/' + (Settings.crowd !== false); }
  refreshArena() {                                         // the court material or the crowd was changed (e.g. from the pause menu): redraw them now
    const key = this.arenaId(); if (key === this.arenaKey || !this.layers || !this.world) return; this.arenaKey = key;
    const [back, wood, g] = this.layers; back.clear(); wood.clear(); g.clear(); wood.clearMask(); if (this.maskG) { this.maskG.destroy(); this.maskG = null; }
    (this.logoImgs || []).forEach(im => im.destroy()); this.logoImgs = [];
    this.drawFloor(back, wood, g); if (this.dyn) this.world.bringToTop(this.dyn);                // the new logos must sit under the carts and the ball
    const want = Settings.crowd !== false;
    if (!want && this.crowd) { this.crowd.destroyTexts(); this.crowd = null; this.standG.clear(); this.fansG.clear(); if (Sound.crowd) Sound.crowd.stop(); }
    else if (want && !this.crowd) {
      this.crowd = new Crowd(this); this.standG = this.standG || this.add.graphics(); this.fansG = this.fansG || this.add.graphics();
      [this.standG, this.fansG].forEach(x => { if (!this.world.exists(x)) this.world.add(x); }); this.crowd.drawStands(this.standG); this.crowd.initTexts(this.world);
      if (!this.demo && Sound.crowd) Sound.crowd.start();
    }
    if (this.dyn) this.world.bringToTop(this.dyn);
    if (this.v3) { this.v3.buildArena(); this.v3.buildFans(); }                     // the 3D arena too
  }
  applyCamera() {                                          // the camera settings changed (or the match came back from the settings): rebuild the view
    try { this.refreshArena(); } catch (e) { console.error(e); }
    this.teardownTilt(); this.readView(); this.camSeen = false; this.setupTilt();
    (this.logoImgs || []).forEach(im => im.setRotation(-this.rot));
    if (this.apply3d) this.apply3d();
  }
  setupTilt() {
    const T = (Settings.tiltDeg === undefined ? 40 : Settings.tiltDeg) * Math.PI / 180, ok = !this.classic && this.vertical && T > 0 && this.add.plane && this.textures.addDynamicTexture && this.game.renderer.type === Phaser.WEBGL;
    this.tiltOk = !!ok || this.classic || !this.vertical || T <= 0;                // (the settings preview says so when the tilt cannot be shown on this device)
    if (!ok) return;
    try {
      const RW = CONFIG.camera.rtW, RH = CONFIG.camera.rtH, key = 'camtex' + (this.demo ? 'd' : 'g') + (Date.now() % 1000000);
      this.dt = this.textures.addDynamicTexture(key, RW, RH); this.dtKey = key; this.RW = RW; this.RH = RH;
      const pl = this.add.plane(this.viewX, this.viewY, key, undefined, 48, 36).setDepth(1); pl.setPerspective(RW, RH, 45); pl.modelRotation.x = -T; pl.preUpdate(0, 0);
      const top = pl.vertices.reduce((m, q) => Math.min(m, q.vy), 1e9); pl.y = CONFIG.camera.topEdge - top; pl.preUpdate(0, 0);      // slide the picture so its far edge sits just above the top of the screen: no hard edge showing   // plenty of little squares, so the picture is not bent by the perspective
      const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => { const w = pl.vertices.find(q => Math.abs(q.u - u) < 1e-4 && Math.abs(q.v - v) < 1e-4); return [u, v, pl.x + w.vx, pl.y + w.vy]; });
      this.H = solveHomography(corners);
      if (!this.H || corners.some(c => !isFinite(c[2]) || !isFinite(c[3]))) throw new Error('no tilt');
      this.plane = pl; this.cameras.main.ignore(this.world); this.world.each(ch => { ch.cameraFilter |= this.cameras.main.id; }); this.tilted = true; this.cx = RW / 2; this.cy = RH / 2;
      const s = this.s0 = this.pixelScale(this.cx, this.cy);                         // how big one texture pixel is on the screen around the middle
      this.zoom = this.baseZoom * (Settings.zoomPct || 100) / 100 / s;
    } catch (e) { this.teardownTilt(); this.readView(); this.tiltOk = false; }
  }
  project(px, py) {                                          // a pixel of the off-screen court texture -> a pixel on the screen
    const H = this.H, u = px / this.RW, v = py / this.RH, w = H[6] * u + H[7] * v + 1;
    return { x: (H[0] * u + H[1] * v + H[2]) / w, y: (H[3] * u + H[4] * v + H[5]) / w };
  }
  pixelScale(px, py) { const a = this.project(px, py), b = this.project(px + 1, py); return Math.hypot(b.x - a.x, b.y - a.y); }
  toScreen(x, y) {                                           // a point on the court (metres) -> a pixel on the screen
    const z = this.zoom, c = Math.cos(this.rot), s = Math.sin(this.rot), dx = x - this.focus.x, dy = y - this.focus.y;
    const r = { x: this.cx + z * (dx * c - dy * s), y: this.cy + z * (dx * s + dy * c) };
    if (!this.tilted) return r;
    const q = this.project(r.x, r.y); q.k = this.pixelScale(r.x, r.y) / this.s0; return q;
  }
  inView(p, pad = 0) { return p.x > this.viewX - this.viewW / 2 + pad && p.x < this.viewX + this.viewW / 2 - pad && p.y > this.viewTop + pad && p.y < this.viewTop + this.viewH - pad; }
  checkFlip() {                                            // after half time the teams swap ends, so the view turns round with them
    const m = this.match, flip = !this.demo && !m.practice && m.period > CONFIG.match.periods / 2;
    if (flip === this.flipped) return;
    this.flipped = flip; if (!this.demo) viewFlip = flip; this.rot = this.baseRot + (flip ? Math.PI : 0); this.camSeen = false;
    (this.logoImgs || []).forEach(im => im.setRotation(-this.rot));
  }
  updateCamera(dt) {
    this.checkFlip();                                         // follow the ball (a little ahead of where it is going), but never show past the boards
    const m = this.match, C = CONFIG.court, K = CONFIG.camera, b = m.ball, z = this.zoom, f = this.focus;
    const lead = (v) => Math.max(-K.maxLead, Math.min(K.maxLead, v * K.look));
    const tx = b.x + lead(b.vx), ty = b.y + lead(b.vy);
    if (!this.camSeen || Math.hypot(tx - f.x, ty - f.y) > K.snapDistance) { f.x = tx; f.y = ty; this.camSeen = true; }
    else { const k = 1 - Math.exp(-K.follow * Math.min(dt, 0.05)); f.x += (tx - f.x) * k; f.y += (ty - f.y) * k; }
    const halfX = (this.vertical ? this.viewH : this.viewW) / 2 / z, halfY = (this.vertical ? this.viewW : this.viewH) / 2 / z, Mx = this.mx, My = this.my;         // how much court (and stand) the screen shows past each edge
    f.x = C.width + 2 * Mx <= 2 * halfX ? C.width / 2 : Math.max(halfX - Mx, Math.min(C.width - halfX + Mx, f.x));
    f.y = C.height + 2 * My <= 2 * halfY ? C.height / 2 : Math.max(halfY - My, Math.min(C.height - halfY + My, f.y));
    this.camView = { cx: f.x, cy: f.y, hx: halfX * (this.tilted ? 1.45 : 1.08) + 1.5, hy: halfY * (this.tilted ? 1.45 : 1.08) + 1.5 };
    const c = Math.cos(this.rot), s = Math.sin(this.rot), px = this.cx - z * (f.x * c - f.y * s), py = this.cy - z * (f.x * s + f.y * c);
    if (!this.demo) {                                      // keep the controls matching the picture: with a tilt, work out which court direction the screen's up / right really are
      if (this.tilted) viewInv = (x, y) => {
        if (!isFinite(x) || !isFinite(y)) { x = this.focus.x; y = this.focus.y; }
        const a = this.toScreen(x - 0.5, y), b = this.toScreen(x + 0.5, y), c2 = this.toScreen(x, y - 0.5), d2 = this.toScreen(x, y + 0.5), j0 = b.x - a.x, j2 = b.y - a.y, j1 = d2.x - c2.x, j3 = d2.y - c2.y, det = j0 * j3 - j1 * j2;
        return Math.abs(det) > 1e-9 ? [j3 / det, -j1 / det, -j2 / det, j0 / det] : null;
      };
      else viewInv = null;
    }
    this.world.setPosition(px, py).setRotation(this.rot).setScale(z);
    if (this.maskG) this.maskG.setPosition(px, py).setRotation(this.rot).setScale(z);
  }
  /* Players on this screen whose cart is out of view get an arrow at the edge of the screen, in their team colour with their name, pointing at them. */
  localPlayer(p) {
    const o = this.online;
    if (!o) return this.setup.players.includes(p);
    return o.role === 'host' ? !p.remote : o.sim.localIds.has(p.id);
  }
  drawArrows() {
    const g = this.arrows, m = this.match, half = { w: this.viewW / 2, h: this.viewH / 2 }; g.clear(); let n = 0;
    for (const c of m.chairs) {
      if (!c.player || c.benched || !this.localPlayer(c.player)) continue;
      const sp = this.toScreen(c.x, c.y); if (this.inView(sp, 22)) continue;
      const dx = sp.x - this.viewX, dy = sp.y - this.viewY, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, inset = 46;
      const t = Math.min((half.w - inset) / Math.abs(ux || 1e-6), (half.h - inset) / Math.abs(uy || 1e-6)), ax = this.viewX + ux * t, ay = this.viewY + uy * t;
      const col = TEAMS[m.teams[c.side]].color, S = 20, nx = -uy, ny = ux;
      const tip = { x: ax + ux * S, y: ay + uy * S }, l = { x: ax - ux * S * 0.6 + nx * S * 0.8, y: ay - uy * S * 0.6 + ny * S * 0.8 }, r = { x: ax - ux * S * 0.6 - nx * S * 0.8, y: ay - uy * S * 0.6 - ny * S * 0.8 };
      g.fillStyle(0x000000, 0.35).fillTriangle(tip.x + 2, tip.y + 3, l.x + 2, l.y + 3, r.x + 2, r.y + 3);
      g.fillStyle(col, 1).fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y).lineStyle(3, 0xffffff, 1).strokeTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
      const label = this.arrowTags[n] || (this.arrowTags[n] = this.add.text(0, 0, '', { ...STYLE.tag, fontSize: '18px' }).setOrigin(0.5).setDepth(25).setStroke('#0d151b', 4));
      label.setText(c.player.name || c.player.tag).setColor(teamColorHex(m.teams[c.side])).setPosition(ax - ux * (S + 22) + (Math.abs(ux) > 0.8 ? 0 : 0), ay - uy * (S + 18)).setVisible(true); n++;
    }
    for (let i = n; i < this.arrowTags.length; i++) this.arrowTags[i].setVisible(false);
  }
  commentary(dt) {                                         // show (and speak) the play-by-play lines the match has produced
    const m = this.match, q = m.heard; this.capLeft -= dt;
    if (q && q.length) {
      const t = Commentary.parse(q.splice(0).pop()), mode = Settings.commentaryMode || 'full';
      if (mode === 'full' || mode === 'captions') { this.cap.setText(t.text).setColor(t.mood >= 3 ? '#ffe45c' : '#ffffff').setFontSize(t.mood >= 3 ? 30 : 24).setVisible(true); this.capLeft = 3 + t.text.length * 0.05; }
      if (mode === 'full' || mode === 'voice') Commentator.speak(t);
    }
    if (this.capLeft <= 0 && this.cap.visible) this.cap.setVisible(false);
  }
  render() { if (this.match && this.match.drawBetween) return this.match.drawBetween(() => this.renderNow()); return this.renderNow(); }   // smooth: carts and ball drawn between simulation steps
  renderNow() {
    if (!this.clockText || !this.clockText.active || !this.banner || !this.banner.active) return;
    const m = this.match, g = this.dyn, B = CONFIG.ball, V = CONFIG.view, dt3 = this.game.loop.delta / 1000; this.sync3d(); this.commentary(dt3);
    if (!this.flat) { if (this.crowd) this.crowd.update(Math.min(dt3, 0.05)); this.render3d(dt3); }        // the 3D view (first / third person, broadcast)
    else {                                                                 // the classic 2D view
      g.clear(); this.updateCamera(dt3); this.drawArrows();
      const bs = this.toScreen(m.ball.x, m.ball.y), bz = this.tilted ? this.zoom * this.s0 * (bs.k || 1) : this.zoom, bpx = Math.max(B.radius * (B.drawScale || 1) * bz, B.minDrawRadiusPx || 0);
      if (m.mini && this.drawMode2D && modeOf(m)) this.drawMode2D(g, true);   // a minigame's floor (rings, lava, goals...), under the carts
      m.chairs.forEach((c, i) => {
        const tag = this.tags[i]; tag.setVisible(!c.benched);
        if (c.benched) return;
        this.drawChair(g, c, TEAMS[m.teams[c.side]].color, c.player ? c.player.speedLevel : 0);
        const sp = this.toScreen(c.x, c.y), k = sp.k || 1, z = this.tilted ? this.zoom * this.s0 * k : this.zoom; const label = m.mini ? this.miniTag(c) : c.player ? (c.player.name || c.player.tag) : (this.demo && c.side === 0 && c.index === 1 ? 'YOU' : ''); tag.setText(label).setScale(Math.max(0.55, Math.min(1.2, k))).setPosition(sp.x, sp.y - 0.75 * z).setVisible(!!label && this.inView(sp, 10));
        if (label && !m.noBall) this.fadeTagNearBall(tag, 'flat' + i, bs.x, bs.y, bpx);
      });
      const r = Math.max(B.radius * (B.drawScale || 1), B.minDrawRadiusPx / (this.tilted ? this.zoom * this.s0 : this.zoom));
      const L = CONFIG.look;
      if (m.mini) this.drawMini2D(g);                                        // minigames: the track, balloons, boxes, shots, oil
      if (!m.noBall) {
      g.fillStyle(0x000000, L.shadowAlpha).fillCircle(m.ball.x + L.ballShadowDx + r * 0.3, m.ball.y + L.ballShadowDy + r * 0.3, r);       // ball shadow
      g.fillStyle(0xffffff).fillCircle(m.ball.x, m.ball.y, r); this.drawBallRoll(g, m.ball, r); g.fillStyle(0xffffff, L.ballHighlight).fillCircle(m.ball.x - r * 0.3, m.ball.y - r * 0.3, r * 0.45); g.lineStyle(0.03, 0x111111).strokeCircle(m.ball.x, m.ball.y, r);
      }
      if (this.crowd) {                                                    // the stands: reactions every frame, the fans themselves redrawn ~30 times a second
        const dtc = Math.min(this.game.loop.delta / 1000, 0.05), cr = this.crowd; cr.update(dtc); cr.acc += dtc;
        if (cr.acc >= 1 / CONFIG.arena.hz && this.camView) { cr.acc = 0; cr.drawFans(this.fansG, this.camView, this.rot); }
        if (this.camView) cr.placeTexts(this.rot, this.camView);
      }
      if (this.tilted) { this.dt.clear(); this.dt.draw(this.world); }        // the court (floor, carts, ball) is now drawn: photograph it onto the tilted plane
    }
    const t = Math.max(0, Math.ceil(m.clock));
    if (m.mini) this.updateMiniHud(m); else {
    this.clockText.setText(m.practice ? 'PRACTICE' : m.overtime ? 'GOLDEN GOAL' : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`).setColor('#f2c200');
    this.nameA.setText(TEAMS[m.teams[0]].name.toUpperCase() + (m.press[0] ? '  ⚡PRESS' : '')).setColor(teamColorHex(m.teams[0])); this.nameB.setText((m.press[1] ? 'PRESS⚡  ' : '') + TEAMS[m.teams[1]].name.toUpperCase()).setColor(teamColorHex(m.teams[1]));
    this.scoreA.setText(String(m.score[0])).setColor('#ffffff'); this.scoreB.setText(String(m.score[1])).setColor('#ffffff');
    [0, 1].forEach(s => { if (m.score[s] > this.lastScore[s]) this.celebrate(s); });
    this.lastScore = m.score.slice();
    this.updateStrip(m);
    }
    this.noticeText.setText(m.noticeLeft > 0 ? m.notice : '');
    if (m.state === 'over') { this.banner.setText(''); if (!this.demo) { if (m.mini) this.showMiniResult(); else this.showResult(); if (this.resultHint && this.resultHint.active) this.resultHint.setAlpha(this.resultReady() ? 0.72 + 0.28 * Math.sin(this.time.now / 220) : 0); } }
    else if (m.state === 'countdown') this.banner.setText(String(Math.ceil(m.timer))).setFontSize(110);
    else this.banner.setText(m.bannerLeft > 0 ? m.banner : '').setFontSize(56);
  }
}

/* The same game screen, but with nobody playing: shown behind the Camera settings so you can see what each choice does. */
class PreviewScene extends GameScene {
  constructor() { super('Preview'); }
  init(data) { super.init({ ...data, demo: true }); }
  create() { super.create(); this.cameras.main.setBackgroundColor('#0d151b'); }
}

/* Camera settings with a live picture of the game behind them: view, zoom and tilt. */
class CameraPageScene extends ListMenuScene {
  constructor() { super('CameraPage'); }
  init(data) { this.ctx = data.ctx || {}; }
  create() {
    const V = CONFIG.view;
    // hide any game paused underneath so only the example is visible
    const hidden = ['Game', 'Title', 'MainMenu', 'Settings', 'Lobby', 'Setup'].filter(k => { try { const sc = this.scene.get(k); return sc && sc !== this && sc.sys && sc.sys.isVisible() && (this.scene.setVisible(false, k), true); } catch (e) { return false; } });
    const show = () => hidden.forEach(k => { try { this.scene.setVisible(true, k); } catch (e) {} });
    this.scene.launch('Preview', { players: [], sizes: [3, 3], practice: true }); this.scene.bringToTop();
    const apply = () => { const p = this.scene.get('Preview'); if (p && p.sys && p.sys.isActive() && p.applyCamera) p.applyCamera(); };
    const redo = () => { const p = this.scene.get('Preview'); if (p && p.scene) { p.scene.restart({ players: [], sizes: [3, 3], practice: true }); this.scene.bringToTop(); } };
    const preview = () => this.scene.get('Preview'), tiltOff = () => preview() && preview().tiltOk === false;
    const back = () => { show(); this.scene.stop('Preview'); this.scene.start('Settings', this.ctx); };
    const N3 = CONFIG.view3d.names, is2d = () => Settings.camMode === '2d', no3d = () => Render3D.ok === false;
    this.items = [
      { label: () => no3d() ? 'Camera   (3D is not supported on this device: Classic 2D)' : `Camera   ◀ ${N3[Settings.camMode] || N3.third} ▶`, change: d => { cycleCamMode(d); apply(); }, select: () => { cycleCamMode(1); apply(); } },
      { label: () => `Broadcast view   ◀ ${Settings.allowBroadcast ? 'On' : 'Off'} ▶`, change: () => { Settings.setBroadcast(!Settings.allowBroadcast); apply(); }, select: () => { Settings.setBroadcast(!Settings.allowBroadcast); apply(); } },
      { label: () => `Third person view   ◀ ${Settings.allowThird ? 'On' : 'Off'} ▶`, hint: 'On: the camera button also offers the chase camera behind your cart', change: () => { Settings.setThird(!Settings.allowThird); apply(); }, select: () => { Settings.setThird(!Settings.allowThird); apply(); } },
      { label: () => `Court   ◀ ${CONFIG.surfaces[Settings.court | 0].name} ▶`, change: d => { Settings.court = ((Settings.court | 0) + d + CONFIG.surfaces.length) % CONFIG.surfaces.length; Settings.save(); redo(); }, select: () => { Settings.court = ((Settings.court | 0) + 1) % CONFIG.surfaces.length; Settings.save(); redo(); } },
      { label: () => `Crowd   ◀ ${Settings.crowd !== false ? 'On' : 'Off'} ▶`, change: () => { Settings.toggle('crowd'); redo(); }, select: () => { Settings.toggle('crowd'); redo(); } },
      { label: () => is2d() ? `2D view   ◀ ${VIEW_NAMES[Settings.view || 'nhl']} ▶` : '2D view   (Classic 2D camera only)', change: d => { if (is2d()) { cycleView(d); apply(); } }, select: () => { if (is2d()) { cycleView(1); apply(); } } },
      { label: () => !is2d() ? 'Zoom   (Classic 2D camera only)' : Settings.view === 'classic' ? 'Zoom   (the whole rink is always shown)' : `Zoom   ◀ ${Settings.zoomPct}% ▶`, change: d => { if (is2d()) { Settings.adjust('zoomPct', d); apply(); } } },
      { label: () => !is2d() ? 'Tilt   (Classic 2D camera only)' : Settings.view !== 'nhl' ? 'Tilt   (only the upright view is tilted)' : tiltOff() ? 'Tilt   (not supported on this device)' : `Tilt   ◀ ${Settings.tiltDeg < 1 ? 'Straight down' : Settings.tiltDeg + ' degrees'} ▶`, change: d => { if (is2d()) { Settings.adjust('tiltDeg', d); apply(); } } },
      { label: () => `First-person field of view   ◀ ${Settings.fov3d}° ▶`, change: d => Settings.adjust('fov3d', d) },
      { label: () => `Third-person chase distance   ◀ ${(+Settings.chaseDist).toFixed(1)} m ▶`, change: d => Settings.adjust('chaseDist', d) },
      { label: () => `3D graphics   ◀ ${gfxLabel()} ▶`, change: d => { cycleGfx(d); apply(); }, select: () => { cycleGfx(1); apply(); } },
      { label: () => 'Back', select: back }];
    this.cursor = 0; this.onBack = back;
    const w = 900, cx = V.width / 2, gap = Settings.touch ? 44 : 30, top = 720 - 24 - gap * this.items.length + gap / 2 - 36, y0 = top - 34;
    panel(this, cx - w / 2, y0 - 30, w, gap * this.items.length + 64, { alpha: 0.78 });
    this.add.text(cx, y0 - 12, 'CAMERA   -   this is what you will see in the game', { fontFamily: FONT, fontSize: '18px', color: THEME.dim }).setOrigin(0.5);
    this.bar = new SelectionBar(this, cx, w - 24, gap - 6); this.panelBox = { x: cx - w / 2, w };
    this.rows = this.items.map((_, i) => this.add.text(cx, top + i * gap, '', { ...STYLE.row, fontSize: Settings.touch ? '28px' : '23px' }).setOrigin(0.5));
    this.items.forEach((item, i) => {
      const zone = this.add.zone(cx, top + i * gap, w, gap).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', p => {
        this.cursor = i; const rel = (p.x - (cx - w / 2)) / w;
        if (item.change && rel < 0.25) { item.change(-1); Sound.play('blip'); } else if (item.change && rel > 0.75) { item.change(1); Sound.play('blip'); }
        else if (item.select) { Sound.play('select'); item.select(); } else if (item.change) { item.change(1); Sound.play('blip'); }
      });
    });
    this.events.once('shutdown', () => { show(); try { this.scene.stop('Preview'); } catch (e) {} });
  }
}

/* Someone pressed Start on a device that is not playing: pick a side and take over a CPU cart. Only that device drives this menu. */
class JoinMenuScene extends ListMenuScene {
  constructor() { super('JoinMenu'); }
  init(data) { this.gameScene = data.game; this.src = data.src; }
  create() {
    this.scene.bringToTop(); this.cameras.main.setBackgroundColor('rgba(13,21,27,0.88)');
    const g = this.gameScene, m = g.match, close = () => { Controls.owner = null; this.scene.resume('Game'); this.scene.stop(); };
    const free = s => m.chairs.filter(c => c.side === s && !c.player && !c.benched).length;
    const join = side => () => {
      if (!free(side)) return Sound.play('back');
      const taken = g.setup.players.map(p => p.name), mine = Settings.myName();
      const name = g.setup.players.length === 0 && mine ? mine : Settings.nextName(CONFIG.playerNames[g.setup.players.length % CONFIG.playerNames.length], 0, taken.concat(mine));
      const p = { src: this.src, side, chair: null, spinQueued: 0, speedLevel: Settings.speedLevel, name, tag: 'P' + (g.setup.players.length + 1) };
      if (!g.setup.players.includes(p)) g.setup.players.push(p);
      if (!m.addPlayer(p)) { g.setup.players = g.setup.players.filter(q => q !== p); return Sound.play('back'); }
      Sound.play('select'); close();
    };
    const row = side => ({ label: () => `Join ${TEAMS[m.teams[side]].name}   (${free(side)} free cart${free(side) === 1 ? '' : 's'})`, select: join(side) });
    const se = g.setup.season;
    this.buildMenu('JOIN THE GAME', [...[0, 1].filter(s => !se || s === se.side).map(row), { label: () => 'Cancel', select: close }], 230);
    this.onBack = close;
  }
}

class PauseScene extends ListMenuScene {
  constructor() { super('Pause'); }
  init(data) { this.gameScene = data.game; }
  create() {
    this.scene.bringToTop(); this.cameras.main.setBackgroundColor('rgba(13,21,27,0.88)');
    const m = this.gameScene.match, online = this.gameScene.online, resume = online ? () => { Controls.owner = null; try { this.gameScene.applyCamera(); } catch (e) {} this.scene.stop(); } : () => { Controls.owner = null; this.scene.resume('Game'); this.scene.stop(); };   // online: the match keeps running behind the menu
    const toSettings = { label: () => 'Settings', select: () => this.scene.start('Settings', { from: 'Pause', game: this.gameScene }) };
    const camItem = { label: () => `Camera   ◀ ${CONFIG.view3d.names[Settings.camMode] || ''} ▶`, change: d => { cycleCamMode(d); this.gameScene.apply3d(); }, select: () => { cycleCamMode(1); this.gameScene.apply3d(); } };
    const social = { label: () => 'Friends and party', select: () => FriendsBar.toggle(true) };
    const onlineItems = [{ label: () => 'Resume', select: resume }, camItem, toSettings, social, { label: () => 'Leave room', select: () => { Controls.owner = null; this.gameScene.leaveOnline(''); } }];
    const switchTeam = p => () => { if (m.switchSide(p)) Sound.play('select'); else Sound.play('back'); };
    this.buildMenu('PAUSED', online ? onlineItems : [
      { label: () => 'Resume', select: resume },
      camItem,
      ...(this.gameScene.setup.season || m.mini ? [] : this.gameScene.setup.players).map(p => ({
        label: () => `${p.name || p.tag}  ${p.src.label}:   ◀ ${TEAMS[m.teams[p.side]].name} ▶`, change: switchTeam(p), select: switchTeam(p) })),
      ...(m.practice && !m.mini ? [{ label: () => 'Reset score and kickoff', select: () => { m.score = [0, 0]; m.kickoff(); resume(); } }] : []),
      ...(Sound.playlist ? [{ label: () => 'Next song', select: () => Sound.nextTrack() }] : []),
      toSettings, social,
      ...(this.gameScene.setup.players.some(p => p.src === Controls.owner) ? [{ label: () => 'Leave the match (a CPU takes your cart)', select: () => { const me = this.gameScene.setup.players.find(p => p.src === Controls.owner); m.removePlayer(me); this.gameScene.setup.players = this.gameScene.setup.players.filter(p => p !== me); resume(); } }] : []),
      { label: () => this.gameScene.setup.season ? 'Leave the game (it is not counted)' : 'Quit to main menu', select: () => { Controls.owner = null; this.scene.stop('Game'); Sound.playMusic('menu'); this.scene.start(this.gameScene.setup.season ? 'SeasonHub' : 'Main'); } }
    ], 180);
    this.onBack = resume;
  }
}
