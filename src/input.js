/* Input: keyboards and gamepads are both "sources" with the same logical buttons,
   so menus and gameplay never care what device is used. */
const BUTTONS = ['up', 'down', 'left', 'right', 'a', 'b', 'y', 'start', 'spinCW', 'spinCCW', 'speedUp', 'speedDown', 'x', 'halfCW', 'halfCCW', 'camera', 'talk', 'quick', 'social'];   // social: Select / View opens Friends and party   // quick: D-pad up on its own, for quick chat in a match   // talk: push to talk (voice chat)
const KEYMAP = {
  kb1: { label: 'Keyboard 1 (WASD)',   up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], a: ['Space'], b: ['Backspace'],
         y: ['KeyF'], start: ['Enter', 'Escape'], spinCW: ['KeyE'], spinCCW: ['KeyQ'], speedUp: ['KeyV'], speedDown: ['KeyC'], x: ['KeyX'], halfCW: ['KeyR'], halfCCW: ['KeyZ'], camera: ['KeyT'], talk: ['KeyG'], quick: [], social: [] },
  kb2: { label: 'Keyboard 2 (Arrows)', up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], a: ['ShiftRight'],
         b: ['ControlRight'], y: ['Slash'], start: ['Escape'], spinCW: ['Period'], spinCCW: ['Comma'], speedUp: ['Quote'], speedDown: ['Semicolon'], x: ['Backslash'], halfCW: ['BracketRight'], halfCCW: ['BracketLeft'], camera: ['KeyP'], talk: ['KeyL'], quick: [], social: [] }
};
const PAD_BUTTON = { a: 0, b: 1, y: 3, start: 9, spinCW: 7, spinCCW: 6, speedUp: 15, speedDown: 14, x: 2, halfCW: 5, halfCCW: 4, camera: 13, social: 8, talk: 10, quick: 12, up: 12, down: 13, left: 14, right: 15 };
const PAD = { deadzone: 0.2, menuThreshold: 0.55 };
const MENU_REPEAT = { delayMs: 350, intervalMs: 110 };   // holding a direction in a menu repeats
const DIRECTIONS = ['up', 'down', 'left', 'right'];

class Source {
  constructor(id, label) {
    this.id = id; this.label = label;
    this.held = {}; this.pressed = {}; this.repeatAt = {}; this.ax = 0; this.ay = 0; this.rx = 0; this.ry = 0;   // rx, ry: right stick (looking around in the 3D views)
    this.raw = { held: {}, pressed: {}, ax: 0, ay: 0, rx: 0, ry: 0 }; this.dead = new Set();
  }
  /* `raw` is what the device is really doing; `held` / `pressed` / the sticks are what the screens see.
     While a pop-up is open (blocked) the screens see nothing: only the pop-up reads `raw`. When it closes, anything still held
     (the A or Esc that closed it) stays dead until it is let go, so it cannot fall through to the screen behind. */
  update(blocked, unblocking) {
    const prev = this.raw.held, now = this.id.startsWith('kb') ? this.readKeyboard() : this.id === 'touch' ? this.readTouch() : this.readPad(), t = performance.now(), pressed = {};
    for (const b of BUTTONS) {
      pressed[b] = !!(now[b] && !prev[b]);
      if (now[b] && !prev[b]) this.repeatAt[b] = t + MENU_REPEAT.delayMs;
      else if (now[b] && DIRECTIONS.includes(b) && t >= this.repeatAt[b]) { pressed[b] = true; this.repeatAt[b] = t + MENU_REPEAT.intervalMs; }
    }
    this.raw = { held: now, pressed, ax: this.ax, ay: this.ay, rx: this.rx, ry: this.ry };
    if (blocked || unblocking) for (const b of BUTTONS) if (now[b]) this.dead.add(b);
    for (const b of [...this.dead]) if (!now[b]) this.dead.delete(b);
    this.held = {}; this.pressed = {};
    if (blocked) { this.ax = this.ay = this.rx = this.ry = 0; return; }
    for (const b of BUTTONS) { const live = !this.dead.has(b); this.held[b] = live && !!now[b]; this.pressed[b] = live && pressed[b]; }
  }
  readKeyboard() {
    const map = KEYMAP[this.id], held = {};
    for (const b of BUTTONS) held[b] = map[b].some(code => Controls.keys[code] || Controls.tapped[code]);   // tapped: down and up again between two frames still counts once
    const x = (held.right ? 1 : 0) - (held.left ? 1 : 0), y = (held.down ? 1 : 0) - (held.up ? 1 : 0), m = Math.hypot(x, y) || 1;
    this.ax = x / m; this.ay = y / m;
    return held;
  }
  readTouch() {                                                    // the on-screen controller (touch.js): its stick and buttons look just like a gamepad's
    const T = TouchPad.state, held = {};
    for (const b of BUTTONS) held[b] = !!(T.held[b] || (T.tapped && T.tapped[b]));
    this.ax = T.ax; this.ay = T.ay;
    held.up = held.up || T.ay < -TOUCH.stickMenuThreshold; held.down = held.down || T.ay > TOUCH.stickMenuThreshold;
    held.left = held.left || T.ax < -TOUCH.stickMenuThreshold; held.right = held.right || T.ax > TOUCH.stickMenuThreshold;
    return held;
  }
  readPad() {
    const pad = navigator.getGamepads()[+this.id.slice(3)], held = {};
    if (!pad) { this.ax = this.ay = this.rx = this.ry = 0; return held; }
    for (const b of BUTTONS) held[b] = [].concat(PAD_BUTTON[b]).some(i => pad.buttons[i] && pad.buttons[i].pressed);   // a button may have more than one pad button (camera: View or R3)
    let x = pad.axes[0], y = pad.axes[1];
    const m = Math.hypot(x, y);
    if (m < PAD.deadzone) { x = y = 0; } else { const k = (Math.min(1, m) - PAD.deadzone) / (1 - PAD.deadzone) / m; x *= k; y *= k; }
    this.ax = x; this.ay = y;
    let lx = pad.axes[2] || 0, ly = pad.axes[3] || 0; const lm = Math.hypot(lx, ly);                // right stick, same dead zone
    if (lm < PAD.deadzone) { lx = ly = 0; } else { const k = (Math.min(1, lm) - PAD.deadzone) / (1 - PAD.deadzone) / lm; lx *= k; ly *= k; }
    this.rx = lx; this.ry = ly;
    held.up = held.up || y < -PAD.menuThreshold; held.down = held.down || y > PAD.menuThreshold;
    held.left = held.left || x < -PAD.menuThreshold; held.right = held.right || x > PAD.menuThreshold;
    return held;
  }
}

const Controls = {
  keys: {}, tapped: {}, sources: {}, lastFrame: -1, wasBlocked: false,
  isBlocked() { return false; },     // ui_overlay.js: true while a pop-up (form, friends window, chat, on-screen keyboard) is open
  isModal() { return false; },       //   ...and this one leaves out chat, which sits beside the game rather than over it
  init() {
    for (const id of Object.keys(KEYMAP)) this.sources[id] = new Source(id, KEYMAP[id].label);
    const used = new Set(Object.values(KEYMAP).flatMap(m => BUTTONS.flatMap(b => m[b])));
    addEventListener('keydown', e => { if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;   // typing in chat or a form: not a game key
      this.keys[e.code] = true; this.tapped[e.code] = true; if (used.has(e.code) && !(e.target && e.target.tagName === 'INPUT')) e.preventDefault(); });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('pointerdown', () => {
      Sound.resume();
      if (Settings.touch && Settings.autoFullscreen && !this.triedFullscreen) { this.triedFullscreen = true; if (!isFullscreen()) goFullscreen(true); }      // the first tap on a phone or tablet goes fullscreen
    });
  },
  update(frame) {                    // call once per frame from any scene
    if (frame === this.lastFrame) return;
    this.lastFrame = frame;
    TouchPad.sync();
    if (Settings.touch && !this.sources.touch) this.sources.touch = new Source('touch', 'Touch controls');     // the on-screen controller is a device like any other
    if (!Settings.touch && this.sources.touch) delete this.sources.touch;
    const pads = navigator.getGamepads ? [...navigator.getGamepads()] : [];
    pads.forEach((p, i) => {
      const id = 'pad' + i;
      if (p && !this.sources[id]) this.sources[id] = new Source(id, 'Gamepad ' + (i + 1));
      if (!p && this.sources[id]) delete this.sources[id];
    });
    const blocked = !!this.isBlocked(), unblocking = this.wasBlocked && !blocked; this.wasBlocked = blocked;
    const esc = !!(this.keys.Escape || this.tapped.Escape); this.escPressed = esc && !this.escWas && !blocked && !unblocking; this.escWas = esc;   // Esc in a list menu means back
    for (const s of this.list()) {
      s.update(blocked, unblocking);
      if (BUTTONS.some(b => s.raw.pressed[b])) Sound.resume();
    }
    this.tapped = {}; if (TouchPad.state) TouchPad.state.tapped = {};
    this.mergeInto(this.combined);
    this.mergeInto(this.mine, this.list().filter(x => !this.claimed.has(x.id)));
  },
  // One source made of all the others: online, whatever device you pick up is "you".
  combined: { id: 'combined', label: 'You', held: {}, pressed: {}, ax: 0, ay: 0, rx: 0, ry: 0 },
  // Online guests: a local guest owns one device. `mine` is everything nobody has claimed (the main player's controls); `combined` stays "any device" for menus.
  claimed: new Set(),
  mine: { id: 'mine', label: 'You', held: {}, pressed: {}, ax: 0, ay: 0, rx: 0, ry: 0 },
  claim(srcs) { const ids = srcs.map(x => x.id); if (ids.length === this.claimed.size && ids.every(i => this.claimed.has(i))) return; this.claimed.clear(); ids.forEach(i => this.claimed.add(i)); },
  freeSources() { return this.list().filter(x => !this.claimed.has(x.id)); },
  mergeInto(c, from) {
    const all = from || this.list(); c.ax = c.ay = 0; let best = 0;
    for (const b of BUTTONS) { c.held[b] = all.some(s => s.held[b]); c.pressed[b] = all.some(s => s.pressed[b]); }
    for (const s of all) { const m = Math.hypot(s.ax, s.ay); if (m > best) { best = m; c.ax = s.ax; c.ay = s.ay; } }
    c.rx = c.ry = 0; best = 0; for (const s of all) { const m = Math.hypot(s.rx || 0, s.ry || 0); if (m > best) { best = m; c.rx = s.rx; c.ry = s.ry; } }
  },
  list() { return Object.values(this.sources); },
  owner: null,                       // while a pause menu is open this is the device of the player who pressed Start: only they drive the menus
  menu() {                           // "any device pressed this" for menu navigation (or just the owner's device when a pause menu has one)
    const out = {}, srcs = this.owner && this.list().includes(this.owner) ? [this.owner] : this.list();
    for (const b of BUTTONS) out[b] = srcs.some(s => s.pressed[b]);
    return out;
  }
};
