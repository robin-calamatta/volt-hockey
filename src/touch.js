/* On-screen "digital" controller for phones and tablets.
   It is an ordinary DOM overlay on top of the game (so it works in every scene, including while paused) that acts as one more input source
   called "touch" (see input.js). You can move and resize every button in the layout editor, then lock the layout in; it is saved in the browser.
   Positions are fractions of the screen (0..1) so a layout survives rotating the phone. Look and defaults are all in TOUCH below. */
const TOUCH = {
  baseWidth: 900, minUnit: 0.6, maxUnit: 1.5, stickDeadzone: 0.12, stickMenuThreshold: 0.55, edgeMargin: 0.04, opacity: 0.6, opacitySteps: [0.3, 0.45, 0.6, 0.8, 1], scaleStep: 0.15, scaleMin: 0.5, scaleMax: 2,
  /* x, y: centre as a fraction of the screen. size: pixels at the base screen size. button: the logical button it presses (see BUTTONS in input.js). */
  gameOnly: ['spinCW', 'spinCCW', 'halfCW', 'halfCCW', 'x', 'y', 'speedUp', 'speedDown', 'camera', 'quick', 'aimUp', 'aimDown'],     // hidden in menus so they do not cover the menu items
  controls: {
    stick:    { kind: 'stick',  x: 0.14, y: 0.68, size: 176, name: 'Move stick' },
    rstick:   { kind: 'stick',  right: true, x: 0.735, y: 0.60, size: 140, name: 'Aim stick (Volt Royale): look and aim, and aims down the sights while you hold it' },
    spinCW:   { kind: 'button', x: 0.93, y: 0.60, size: 104, button: 'spinCW',   label: '↻', sub: 'SPIN',  name: 'Spin clockwise (RT)' },
    spinCCW:  { kind: 'button', x: 0.80, y: 0.76, size: 104, button: 'spinCCW',  label: '↺', sub: 'SPIN',  name: 'Spin counter-clockwise (LT)' },
    halfCW:   { kind: 'button', x: 0.80, y: 0.50, size: 66,  button: 'halfCW',   label: '↻', sub: 'HALF',  name: 'Half spin clockwise (RB)' },
    halfCCW:  { kind: 'button', x: 0.66, y: 0.74, size: 66,  button: 'halfCCW',  label: '↺', sub: 'HALF',  name: 'Half spin counter-clockwise (LB)' },
    x:        { kind: 'button', x: 0.07, y: 0.40, size: 56,  button: 'x',        label: 'X', sub: 'PRESS', name: 'Full press on / off (X)' },
    a:        { kind: 'button', x: 0.94, y: 0.88, size: 62,  button: 'a',        label: 'A', sub: 'OK',    name: 'A: select / rematch' },
    b:        { kind: 'button', x: 0.64, y: 0.90, size: 56,  button: 'b',        label: 'B', sub: 'BACK',  name: 'B: back' },
    y:        { kind: 'button', x: 0.93, y: 0.36, size: 60,  button: 'y',        label: '⇄', sub: 'CART',  name: 'Switch cart (Y)' },
    speedUp:  { kind: 'button', x: 0.07, y: 0.25, size: 54,  button: 'speedUp',  label: '+', sub: 'HIT', name: 'Melee (Volt Royale)' },
    speedDown:{ kind: 'button', x: 0.165, y: 0.25, size: 54,  button: 'speedDown',label: '−', sub: 'PING', name: 'Ping (Volt Royale)' },
    camera:   { kind: 'button', x: 0.93, y: 0.235, size: 50, button: 'camera',   label: '◉', sub: 'VIEW',  name: 'Camera view (1st / 3rd person, broadcast, 2D)' },
    start:    { kind: 'button', x: 0.50, y: 0.92, size: 50,  button: 'start',    label: 'II', sub: '',     name: 'Pause' },
    quick:    { kind: 'button', x: 0.165, y: 0.40, size: 54,  button: 'quick',    label: '🙌', sub: 'EMOTE', name: 'Emotes (hold for the wheel); Volt Royale: tap for your bag' },
    aimUp:    { kind: 'button', x: 0.68, y: 0.30, size: 52,  button: 'aimUp',    label: '▲', sub: 'AIM UP', name: 'Volt Royale: tilt your gun up' },
    aimDown:  { kind: 'button', x: 0.68, y: 0.44, size: 52,  button: 'aimDown',  label: '▼', sub: 'AIM DOWN', name: 'Volt Royale: tilt your gun down' }
  }
};

/* Volt Royale has more buttons and a hotbar along the bottom right: its own starting spots for them */
TOUCH.profilePos = {
  /* v14.2.18 Volt Hockey: the half turns sit nearest the bottom-right corner, the bigger 90-degree turns further in */
  hockey: { halfCW: { x: 0.94, y: 0.66 }, halfCCW: { x: 0.84, y: 0.80 }, spinCW: { x: 0.83, y: 0.42 }, spinCCW: { x: 0.70, y: 0.68 } },
  br: { spinCW: { x: 0.92, y: 0.52 }, spinCCW: { x: 0.79, y: 0.66 }, a: { x: 0.93, y: 0.75 }, b: { x: 0.66, y: 0.76 }, x: { x: 0.81, y: 0.42 }, y: { x: 0.93, y: 0.32 },
  halfCCW: { x: 0.70, y: 0.21 }, halfCW: { x: 0.80, y: 0.21 }, camera: { x: 0.60, y: 0.21 }, rstick: { x: 0.735, y: 0.60 }, b: { x: 0.625, y: 0.74 }, x: { x: 0.83, y: 0.36 }, speedUp: { x: 0.555, y: 0.79 }, quick: { x: 0.07, y: 0.40 }, speedDown: { x: 0.165, y: 0.40 } } };   // (v14.2.17: PING next to the bag)

const TouchPad = {
  state: { held: {}, tapped: {}, ax: 0, ay: 0 }, els: {}, root: null, bar: null, hint: null, editing: false, selected: null, built: false,
  detect() { return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0 && !!window.matchMedia && matchMedia('(pointer: coarse)').matches); },
  init() {
    if (Settings.touch === undefined) Settings.touch = this.detect();                      // phones and tablets start with it on
    const css = document.createElement('style');
    css.textContent = `
      #touch{position:fixed;inset:0;z-index:5;pointer-events:none;display:none;font-family:"Barlow Condensed",Arial,sans-serif;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
      #touch .tc{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;touch-action:none;display:flex;flex-direction:column;align-items:center;justify-content:center;
        border-radius:50%;box-sizing:border-box;color:#fff;font-weight:800;text-shadow:0 2px 4px #000a;background:rgba(14,32,46,.62);border:3px solid rgba(25,195,255,.8);box-shadow:0 4px 14px #0008}
      #touch .tc.down{background:rgba(25,195,255,.55);border-color:#fff}
      #touch .tc .l{line-height:1}#touch .tc .s{font-size:max(11px,.3em);opacity:1;letter-spacing:.04em;margin-top:.18em;font-weight:800;color:#fff;background:rgba(0,0,0,.55);padding:1px 5px;border-radius:6px;white-space:nowrap;text-shadow:none}   /* (v14.2.17: the names are easier to read) */
      #touch .stick .knob{position:absolute;left:50%;top:50%;width:46%;height:46%;margin:-23% 0 0 -23%;border-radius:50%;background:rgba(25,195,255,.65);border:3px solid #fff;pointer-events:none}
      #touch.editing{pointer-events:auto;background:rgba(4,10,16,.45)}   /* v14.2.17: while you move the buttons, taps can't reach the menu behind */
      #touch.editing .tc{outline:2px dashed #f2c200;cursor:grab}
      #touch.editing .tc.sel{outline:4px solid #f2c200;background:rgba(242,194,0,.35)}
      #touchbar{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:6;pointer-events:auto;display:none;flex-direction:column;align-items:center;gap:10px;
        background:rgba(8,16,24,.9);border:2px solid #2d5068;border-radius:16px;padding:14px 16px;font-family:"Barlow Condensed",Arial,sans-serif;color:#e9f3fa;max-width:80vw}
      #touchbar .row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
      #touchbar button{font:700 20px "Barlow Condensed",Arial,sans-serif;color:#fff;background:#173247;border:2px solid #19c3ff;border-radius:10px;padding:10px 14px;touch-action:manipulation}
      #touchbar button.go{background:#f2c200;color:#111;border-color:#f2c200}
      #touchbar .msg{font-size:18px;text-align:center;max-width:520px;opacity:.9}`;
    document.head.append(css);
    this.root = document.createElement('div'); this.root.id = 'touch'; document.body.append(this.root);
    for (const id of Object.keys(TOUCH.controls)) this.makeControl(id);
    this.makeBar();
    addEventListener('resize', () => this.place()); addEventListener('orientationchange', () => setTimeout(() => this.place(), 200));
    document.addEventListener('contextmenu', e => { if (Settings.touch) e.preventDefault(); });
    this.built = true; this.sync();
  },
  unit() { return Math.max(TOUCH.minUnit, Math.min(TOUCH.maxUnit, Math.min(innerWidth, innerHeight * 1.8) / TOUCH.baseWidth)); },
  layout(id) { const d0 = TOUCH.controls[id], pp = this.posProfile && TOUCH.profilePos[this.posProfile], d = pp && pp[id] ? { ...d0, ...pp[id] } : d0, o = (Settings.touchLayout || {})[id] || {};   /* (a game's own starting spots, until you move a button yourself) */ return { x: o.x !== undefined ? o.x : d.x, y: o.y !== undefined ? o.y : d.y, scale: o.scale !== undefined ? o.scale : 1 }; },
  setLayout(id, patch) { Settings.touchLayout = Settings.touchLayout || {}; Settings.touchLayout[id] = { ...this.layout(id), ...patch }; },
  makeControl(id) {
    const d = TOUCH.controls[id], el = document.createElement('div'); el.className = 'tc ' + d.kind;
    if (d.kind === 'stick') el.innerHTML = '<div class="knob"></div>'; else el.innerHTML = `<div class="l">${d.label}</div>${d.sub ? `<div class="s">${d.sub}</div>` : ''}`;
    this.els[id] = el; this.root.append(el); this.wire(id, el, d);
  },
  place() {                                                                      // put every control where its layout says, at the right size
    if (!this.built) return; const u = this.unit() * (Settings.touchScale || 1);
    for (const id of Object.keys(TOUCH.controls)) {
      const d = TOUCH.controls[id], L = this.layout(id), el = this.els[id]; if (!el) continue; const px = d.size * u * L.scale;
      el.style.width = el.style.height = px + 'px'; el.style.left = L.x * innerWidth + 'px'; el.style.top = L.y * innerHeight + 'px'; el.style.fontSize = px * 0.42 + 'px';
      el.style.opacity = this.editing ? 1 : (Settings.touchOpacity || TOUCH.opacity);
      el.classList.toggle('sel', this.editing && this.selected === id);
    }
  },
  sync() {                                                                       // called every frame: show or hide with the setting
    if (!this.built) return;
    if (this.editing && Controls.list().some(x => x.raw && (x.raw.pressed.b || x.raw.pressed.start))) this.action('lock');   // B / Start / Esc: done adjusting
    const show = !!Settings.touch; if (show !== this.shown) { this.shown = show; this.root.style.display = show ? 'block' : 'none'; if (show) this.place(); else this.clear(); }
    const sc = window.voltGame && voltGame.scene, inGame = !!(sc && sc.isActive('Game') && !sc.isActive('Pause') && !sc.isActive('BRInv') && !sc.isActive('BRMap') && !sc.isActive('JoinMenu') && !sc.isActive('Settings') && !sc.isActive('SettingsPage') && !sc.isActive('CameraPage'));   // the online pause menu sits over a running match
    if (inGame !== this.inGame || this.editing !== this.wasEditing) {
      this.inGame = inGame; this.wasEditing = this.editing;
      // only in a match (or while adjusting them): every menu can be tapped, and the buttons would cover its rows
      if (!inGame && !this.editing) { for (const id of Object.keys(TOUCH.controls)) this.els[id].style.display = 'none'; this.clear(); this.relabel(null); this.press = null; this.profKey = null; this.posProfile = null; }
      else if (this.editing) { for (const id of Object.keys(TOUCH.controls)) this.els[id].style.display = TOUCH.gameOnly.includes(id) ? 'flex' : ''; this.profKey = null; }
    }
    if (inGame && !this.editing) this.applyProfile(sc.getScene('Game'));
  },
  clear() { this.state.held = {}; this.state.ax = this.state.ay = this.state.rx = this.state.ry = 0; for (const el of Object.values(this.els)) el.classList.remove('down'); for (const sk of [this.els.stick, this.els.rstick]) if (sk) { const kn = sk.querySelector('.knob'); if (kn) kn.style.transform = ''; } },
  wire(id, el, d) {
    let pointer = null, drag = null;
    const stickMove = e => {
      const r = el.getBoundingClientRect(), R = r.width / 2, dx = (e.clientX - (r.left + R)) / R, dy = (e.clientY - (r.top + R)) / R, m = Math.hypot(dx, dy), k = m > 1 ? 1 / m : 1;
      let x = dx * k, y = dy * k; const mag = Math.hypot(x, y);
      if (mag < TOUCH.stickDeadzone) { x = y = 0; } else { const s = (mag - TOUCH.stickDeadzone) / (1 - TOUCH.stickDeadzone) / mag; x *= s; y *= s; }
      if (d.right) { this.state.rx = x; this.state.ry = y; this.state.held.spinCCW = true; } else { this.state.ax = x; this.state.ay = y; } el.querySelector('.knob').style.transform = `translate(${dx * k * R * 0.55}px,${dy * k * R * 0.55}px)`;
    };
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); if (typeof Sound !== 'undefined') Sound.resume();
      if (this.editing) { drag = { dx: e.clientX - parseFloat(el.style.left), dy: e.clientY - parseFloat(el.style.top) }; this.selected = id; el.setPointerCapture(e.pointerId); this.place(); return; }
      if (pointer !== null) return; pointer = e.pointerId; el.setPointerCapture(e.pointerId); el.classList.add('down');
      if (d.kind === 'stick') stickMove(e); else { const bt = el.btn = (this.press && this.press[id]) || d.button; this.state.held[bt] = true; this.state.tapped[bt] = true; }   // tapped: a quick tap between two frames still counts (press: what this button does in the game being played)
    });
    el.addEventListener('pointermove', e => {
      if (this.editing && drag) { const m = TOUCH.edgeMargin; this.setLayout(id, { x: Math.min(1 - m, Math.max(m, (e.clientX - drag.dx) / innerWidth)), y: Math.min(1 - m, Math.max(m, (e.clientY - drag.dy) / innerHeight)) }); this.place(); return; }
      if (e.pointerId === pointer && d.kind === 'stick') stickMove(e);
    });
    const end = e => {
      drag = null; if (e.pointerId !== pointer) return; pointer = null; el.classList.remove('down');
      if (d.kind === 'stick') { if (d.right) { this.state.rx = this.state.ry = 0; this.state.held.spinCCW = false; } else this.state.ax = this.state.ay = 0; el.querySelector('.knob').style.transform = ''; } else this.state.held[el.btn || d.button] = false;
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
  },
  /* ---- layout editor ---- */
  makeBar() {
    const bar = document.createElement('div'); bar.id = 'touchbar';
    bar.innerHTML = `<div class="msg">Drag any button where you want it. Tap one to select it, then make it smaller or bigger. Lock it in when you are happy.</div>
      <div class="row"><button data-a="smaller">− Smaller</button><button data-a="bigger">+ Bigger</button><button data-a="opacity">Opacity</button><button data-a="reset">Reset</button></div>
      <div class="row"><button class="go" data-a="lock">🔒 Lock it in</button></div><div class="msg" id="touchinfo"></div>`;
    bar.addEventListener('pointerdown', e => e.stopPropagation());
    bar.addEventListener('click', e => { const a = e.target.dataset && e.target.dataset.a; if (a) this.action(a); });
    document.body.append(bar); this.bar = bar;
  },
  edit() {                                                                       // open the layout editor (turns the controller on first)
    Settings.touch = true; this.sync(); this.clear(); this.editing = true; this.selected = null; this.root.classList.add('editing'); this.bar.style.display = 'flex'; this.place(); this.info();
  },
  info() { const t = document.getElementById('touchinfo'); if (t) t.textContent = (this.selected ? 'Selected: ' + TOUCH.controls[this.selected].name : 'Nothing selected: Smaller / Bigger change every button') + '   (opacity ' + Math.round((Settings.touchOpacity || TOUCH.opacity) * 100) + '%)'; },
  action(a) {
    const T = TOUCH;
    if (a === 'smaller' || a === 'bigger') {
      const k = a === 'bigger' ? T.scaleStep : -T.scaleStep, clampS = v => Math.min(T.scaleMax, Math.max(T.scaleMin, +v.toFixed(2)));
      if (this.selected) this.setLayout(this.selected, { scale: clampS(this.layout(this.selected).scale + k) }); else Settings.touchScale = clampS((Settings.touchScale || 1) + k);
    } else if (a === 'opacity') {
      const i = T.opacitySteps.indexOf(Settings.touchOpacity || T.opacity); Settings.touchOpacity = T.opacitySteps[(i + 1) % T.opacitySteps.length];
    } else if (a === 'reset') { Settings.touchLayout = null; Settings.touchScale = 1; Settings.touchOpacity = T.opacity; this.selected = null; }
    else if (a === 'lock') { this.editing = false; this.selected = null; this.root.classList.remove('editing'); this.bar.style.display = 'none'; Settings.save(); }
    this.place(); this.info();
  },
  toggle() { Settings.touch = !Settings.touch; Settings.save(); this.sync(); },
  /* v13.5.4: every game gets the buttons it uses, named for what they do there, and no others.
     hockey: SPIN on the two big buttons (LB / RB), PRESS (X), CART (Y), DRIFT (hold B)
     minigames: SPIN, DRIFT, and X named for the game's action (USE an item, FIRE, ZAP) when it has one
     Volt Royale: FIRE, AIM, JUMP, GRAB (X), AWAY (Y), DRIFT, MELEE, the bag, ITEM ◀ ▶, and AIM UP / DOWN */
  profile(g) {
    const m = g && g.match; if (!m) return null; const k = m.mini ? m.mini.kind : 'hockey', common = ['stick', 'a', 'b', 'start', 'camera', 'quick'];
    if (k === 'br') return { key: 'br', show: [...common, 'spinCW', 'rstick', 'halfCW', 'halfCCW', 'x', 'y', 'speedUp', 'speedDown'],   /* (v14.2.18: the right stick aims and looks, and holding it aims down the sights: it replaces AIM, AIM UP and AIM DOWN) */ press: {}, labels: typeof BR_TOUCH !== 'undefined' ? BR_TOUCH : {} };
    const spin = { spinCW: 'halfCW', spinCCW: 'halfCCW' }, spinL = { spinCW: ['↻', 'SPIN'], spinCCW: ['↺', 'SPIN'], b: ['💨', 'DRIFT'], a: ['A', 'OK'] };
    if (k === 'hockey') return { key: 'hockey', show: [...common.filter(x => x !== 'a'), 'spinCW', 'spinCCW', 'halfCW', 'halfCCW', 'x', 'y'], press: {}, labels: { ...spinL, spinCW: ['↻', '90° TURN'], spinCCW: ['↺', '90° TURN'], halfCW: ['↻', 'HALF'], halfCCW: ['↺', 'HALF'], x: ['X', 'PRESS'], y: ['⇄', 'CART'] } };   // (v14.2.17: the big buttons turn 90 degrees like the triggers, the small ones half turn like the bumpers)
    const lines = ((GAME_INFO[k] || {}).controls || []).join(' '), act = /Zap/.test(lines) ? ['⚡', 'ZAP'] : /Fire:/.test(lines) ? ['🎯', 'FIRE'] : lines.includes(CTRL.item) ? ['★', 'USE'] : null;
    const useA = lines.includes(CTRL.item);   /* (v14.3.4: A is only on screen in a match when it does something: a power-up) */
    return { key: 'mini:' + k, show: [...common.filter(x => x !== 'a' || useA), 'spinCW', 'spinCCW', ...(act ? ['x'] : [])], press: { ...spin, x: 'spinCW' }, labels: { ...spinL, ...(useA ? { a: ['★', 'USE'] } : {}), ...(act ? { x: act } : {}) } };   // (the touch USE / FIRE / ZAP button presses RT)
  },
  applyProfile(g) {
    const P = this.profile(g); if (!P) return; const m = g.match, wait = m.state === 'over' || !!m.readyText;
    if (m.state === 'over') { P.key += ':over'; P.show = ['a', 'b', 'start']; }   /* (v14.2.17: the match is over: just AGAIN, LOBBY and pause, nothing covering the results) */
    if (wait && !P.show.includes('a')) { P.show = [...P.show, 'a']; P.key += ':wait'; }   /* (the ready screen needs A) */
    if (wait) P.labels = { ...P.labels, a: ['A', m.state === 'over' ? 'AGAIN' : 'READY'], ...(m.state === 'over' ? { b: ['B', 'HOLD: LOBBY'] } : {}) };   /* (the result and ready screens) */
    if (P.key !== this.profKey) { this.profKey = P.key; this.press = P.press; this.posProfile = TOUCH.profilePos[P.key.split(':')[0]] ? P.key.split(':')[0] : null; this.place(); for (const id of Object.keys(TOUCH.controls)) this.els[id].style.display = P.show.includes(id) ? 'flex' : 'none'; this.clear(); }
    this.relabel(P.labels);
  },
  relabel(map) {                                                               // a game can rename the buttons (Volt Royale: FIRE, AIM, JUMP...); null puts them back
    const key = map ? JSON.stringify(map) : ''; if (key === this.lblKey || !this.built) return; this.lblKey = key;
    for (const id of Object.keys(TOUCH.controls)) { const d = TOUCH.controls[id], el = this.els[id]; if (!el || d.kind === 'stick') continue; const r = (map && map[id]) || [d.label, d.sub], l = el.querySelector('.l'), s = el.querySelector('.s'); if (l) l.textContent = r[0]; if (s) s.textContent = r[1] || ''; }
  }
};

/* ---- fullscreen: hides the browser bars (address bar and all) ---- */
function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement || navigator.standalone || (window.matchMedia && (matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches)));
}
function toast(text, ms = 7000) {                                  // a short message over the game
  let t = document.getElementById('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.style.cssText = 'position:fixed;left:50%;bottom:14%;transform:translateX(-50%);z-index:20;max-width:80vw;padding:12px 18px;border-radius:12px;background:rgba(8,16,24,.94);border:2px solid #19c3ff;color:#fff;font:700 20px "Barlow Condensed",Arial,sans-serif;text-align:center;pointer-events:none'; document.body.append(t); }
  t.textContent = text; t.style.display = 'block'; clearTimeout(t.timer); t.timer = setTimeout(() => { t.style.display = 'none'; }, ms);
}
function goFullscreen(silent) {                                    // must be called from a tap or click
  const el = document.documentElement, go = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!go) { if (!silent) toast(/iPhone|iPod/.test(navigator.userAgent) ? 'iPhone: Safari cannot hide its bars for web pages. Tap Share, then "Add to Home Screen", and open Volt Hockey from the new icon: it runs fullscreen with no address bar.' : 'This browser does not offer fullscreen. Try "Add to Home Screen" / "Install app" in its menu.'); return; }
  Promise.resolve(go.call(el, { navigationUI: 'hide' })).then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { }); }).catch(() => { if (!silent) toast('Fullscreen was blocked. Tap the button again.'); });
}
function toggleFullscreen() {
  if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
  if (navigator.standalone) { toast('Already running as an app (no address bar).'); return; }
  goFullscreen(false);
}
