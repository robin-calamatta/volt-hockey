/* HTML pop-ups over the game (forms, the friends panel, chat), made usable with ANY single device:
   - mouse / touch: click as usual. Clicks on a pop-up never reach the game behind it.
   - keyboard: Tab / Shift+Tab, Enter, Esc, and typing, as on any web page.
   - gamepad: the D-pad or left stick moves between buttons and boxes (by direction, like a console), A presses, B goes back.
     A on a text box opens the on-screen keyboard (OSK): A types the key, B deletes, X shift, Y space, Start or "Done" finishes.
   PadNav.open(element, { onBack }) makes a pop-up the one the gamepad drives (they stack); PadNav.close(element) when it goes.
   While a pop-up is open, Controls.menu() reports nothing, so the Phaser menu behind it does not move as well. */
const PadNav = {
  stack: [], loopOn: false,
  css() {
    if (this.styled) return; this.styled = true; const css = document.createElement('style');
    css.textContent = `.padfocus{outline:3px solid #ffe27a !important;outline-offset:2px;box-shadow:0 0 0 6px rgba(255,226,122,.18) !important}
      #osk{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:60;background:#0b141b;border:1px solid #2f4a5c;border-radius:14px;padding:10px;box-shadow:0 10px 40px #000c;font-family:"Barlow Condensed",Arial,sans-serif;width:min(760px,96vw)}
      #osk .what{color:#9fb2bf;font-size:16px;margin:0 4px 6px}#osk .val{background:#0a1116;border:1px solid #3c5566;border-radius:8px;color:#fff;font-size:22px;padding:4px 10px;min-height:30px;margin-bottom:8px;word-break:break-all}
      #osk .r{display:flex;gap:5px;justify-content:center;margin-top:5px}#osk button{font:inherit;font-size:20px;min-width:52px;height:44px;background:#1b2a35;color:#fff;border:1px solid #3c5566;border-radius:8px;cursor:pointer;flex:0 0 auto}
      #osk button.w{min-width:120px}#osk button.on{background:#19c3ff;color:#06222f}#osk .tip{color:#9fb2bf;font-size:14px;text-align:center;margin-top:6px}`;
    document.head.append(css);
  },
  /* make el a pop-up: swallow its clicks, and let the gamepad drive it */
  open(el, opts = {}) {
    this.css(); this.guard(el); this.close(el); this.stack.push({ el, onBack: opts.onBack || (() => {}), onKey: opts.onKey || null, modal: !!opts.modal });
    if (opts.modal) this.blockGame(true);
    if (opts.focusFirst || this.padRecently()) this.focus(this.focusables(el)[0]);
    this.loop();
  },
  close(el) { const was = this.stack.length; this.stack = this.stack.filter(s => s.el !== el); if (was !== this.stack.length && !this.stack.some(s => s.modal)) this.blockGame(false); },
  active() { return this.stack.length > 0; },
  top() { return this.stack[this.stack.length - 1]; },
  guard(el) {                                                  // clicks and touches on a pop-up stay on the pop-up
    if (el._guarded) return; el._guarded = true;
    for (const ev of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'wheel']) el.addEventListener(ev, e => e.stopPropagation());
  },
  /* The pop-ups lay a backdrop over the whole screen, so the game cannot be clicked or tapped behind them, and keys / pads are held back by
     Controls.isBlocked. The game's own pointer input stays switched on: turning it off while a finger was still down (the tap that opened
     the pop-up) lost that finger's release, and the next tap on the game was ignored. Any pointer left down is released on close. */
  blockGame(on) { try { const g = window.voltGame; if (!on && g && g.input) for (const ptr of g.input.pointers || []) if (ptr && ptr.isDown && ptr.reset) ptr.reset(); } catch (e) { /* not started */ } },
  padRecently() { return Controls.list().some(s => s.id.startsWith('pad') && Object.values(s.raw.held).some(Boolean)); },
  focusables(el) { return [...el.querySelectorAll('button, input, select, [data-nav]')].filter(x => !x.disabled && x.offsetParent !== null && getComputedStyle(x).visibility !== 'hidden'); },
  focus(x) {
    for (const o of document.querySelectorAll('.padfocus')) o.classList.remove('padfocus');
    if (!x) return; x.classList.add('padfocus'); this.current = x;
    if (x.tagName !== 'INPUT') x.focus({ preventScroll: false }); x.scrollIntoView({ block: 'nearest' });
  },
  move(dx, dy) {                                               // spatial navigation: the nearest control in that direction
    const t = this.top(), list = this.focusables(t.el), cur = list.includes(this.current) ? this.current : null;
    if (!cur) return this.focus(list[0]);
    const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let best = null, bestScore = Infinity;
    for (const o of list) {
      if (o === cur) continue; const q = o.getBoundingClientRect(), ox = q.left + q.width / 2 - cx, oy = q.top + q.height / 2 - cy;
      const along = dx ? ox * dx : oy * dy;
      // controls sharing a row (for left/right) or a column (for up/down) count as straight ahead
      const overlap = dx ? Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > 4 : Math.min(r.right, q.right) - Math.max(r.left, q.left) > 4;
      const off = dx ? Math.abs(oy) : Math.abs(ox), across = overlap ? off * 0.05 : off;     // small tie-break: the more centred one
      if (along <= 4) continue; const score = along + across * 2.2 + (across > along * 1.5 ? 100000 : 0);   // far off to the side: only if nothing else
      if (score < bestScore) { bestScore = score; best = o; }
    }
    if (best) { this.focus(best); Sound.play('blip'); }
  },
  loop() {
    if (this.loopOn) return; this.loopOn = true;
    const step = () => {
      try { if (window.voltGame) Controls.update(voltGame.loop.frame); this.frame(); } catch (e) { console.error(e); }
      if (this.stack.length) requestAnimationFrame(step); else this.loopOn = false;
    };
    requestAnimationFrame(step);
  },
  frame() {
    const t = this.top(); if (!t) return;
    const pads = Controls.list().filter(s => s.id.startsWith('pad')); if (!pads.length) return;
    const p = b => pads.some(s => s.raw.pressed[b]);            // the raw presses: the screens behind see nothing while this is open
    if (t.onKey && t.onKey(p)) return;                           // the OSK handles its own buttons
    if (p('up')) this.move(0, -1); else if (p('down')) this.move(0, 1); else if (p('left')) this.move(-1, 0); else if (p('right')) this.move(1, 0);
    if (p('a')) { const cur = this.current; if (!cur || !t.el.contains(cur)) return this.focus(this.focusables(t.el)[0]); Sound.play('select'); if (cur.tagName === 'INPUT' && /^(text|password|email|number|search|)$/.test(cur.type)) OSK.open(cur); else cur.click(); }
    else if (p('b')) { Sound.play('back'); t.onBack(); }
  }
};
// the Phaser menus ignore buttons while a pop-up is open
{ const menu = Controls.menu.bind(Controls); Controls.menu = function () { return PadNav.active() ? {} : menu(); }; }
/* What counts as "something is in front": any pop-up PadNav knows about (forms, the friends window, chat, the on-screen keyboard). */
Controls.isBlocked = () => PadNav.active() || (typeof TouchPad !== 'undefined' && TouchPad.editing) || (typeof Forms !== 'undefined' && Forms.isOpen) || (typeof FriendsBar !== 'undefined' && FriendsBar.open);
Controls.isModal = () => PadNav.stack.some(x => x.modal) || (typeof TouchPad !== 'undefined' && TouchPad.editing) || (typeof Forms !== 'undefined' && Forms.isOpen) || (typeof FriendsBar !== 'undefined' && FriendsBar.open) || (typeof OSK !== 'undefined' && !!OSK.input);
/* For window keyboard listeners of the screens (name entry, room code): ignore keys meant for a pop-up or a text box. */
function keyForPopup(e) { return Controls.isBlocked() || !!(e && e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)); }

/* ---------------- on-screen keyboard (for gamepads) ---------------- */
const OSK = {
  el: null, input: null, shift: false, symbols: false,
  rows() {
    if (this.symbols) return [['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], ['!', '@', '#', '$', '%', '&', '*', '(', ')', '-'], ['_', '+', '=', '?', '/', ':', ';', "'", '"', ','], ['.', '~', '^', '[', ']', '{', '}', '<', '>', '|']];
    const L = [['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '@'], ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '_', '-']];
    return this.shift ? L.map(r => r.map(k => k.toUpperCase())) : L;
  },
  open(input) {
    this.input = input; if (!this.el) { this.el = document.createElement('div'); this.el.id = 'osk'; document.body.append(this.el); }
    this.el.style.display = 'block'; this.draw(); PadNav.open(this.el, { onBack: () => this.key('⌫'), onKey: p => this.pad(p), modal: true });
    PadNav.focus(this.el.querySelector('[data-k="q"], [data-k="Q"], [data-k="1"]'));
  },
  label() { const id = this.input.getAttribute('aria-label') || (this.input.previousElementSibling && this.input.previousElementSibling.tagName === 'LABEL' ? this.input.previousElementSibling.textContent : '') || this.input.placeholder || 'Type'; return id; },
  draw() {
    const hidden = this.input.type === 'password' && !this.input.dataset.peek, v = this.input.value;
    this.el.innerHTML = `<div class="what">${esc(this.label())}</div><div class="val">${esc(hidden ? '•'.repeat(v.length) : v) || '&nbsp;'}</div>` +
      this.rows().map(r => `<div class="r">${r.map(k => `<button data-k="${esc(k)}">${esc(k)}</button>`).join('')}</div>`).join('') +
      `<div class="r"><button class="w ${this.shift ? 'on' : ''}" data-k="⇧">⇧ Shift</button><button class="w ${this.symbols ? 'on' : ''}" data-k="#+=">${this.symbols ? 'abc' : '#+='}</button><button class="w" data-k=" ">Space</button><button class="w" data-k="⌫">⌫</button><button class="w" data-k="✓">Done</button></div>` +
      `<div class="tip">A: type   B: delete   X: shift   Y: space   Start: done</div>`;
    this.el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => this.key(b.dataset.k));
  },
  key(k) {
    const inp = this.input; if (!inp) return; const keep = PadNav.current && PadNav.current.dataset.k;
    if (k === '✓') return this.close(true);
    if (k === '⇧') this.shift = !this.shift; else if (k === '#+=') this.symbols = !this.symbols;
    else if (k === '⌫') inp.value = inp.value.slice(0, -1);
    else { const max = +inp.getAttribute('maxlength') || 300; if (inp.value.length < max && !(inp.type === 'number' && !/[0-9]/.test(k))) inp.value += k; if (this.shift && k.length === 1 && /[A-Z]/.test(k)) this.shift = false; }
    inp.dispatchEvent(new Event('input', { bubbles: true })); this.draw();
    const again = keep && [...this.el.querySelectorAll('[data-k]')].find(b => b.dataset.k.toLowerCase() === keep.toLowerCase()); PadNav.focus(again || this.el.querySelector('[data-k]'));
  },
  pad(p) {                                                     // the shortcuts; arrows and A are handled by PadNav
    if (p('x')) { this.key('⇧'); return true; } if (p('y')) { this.key(' '); return true; }
    if (p('start')) { this.close(true); return true; } return false;
  },
  close(next) {
    if (!this.el) return; this.el.style.display = 'none'; PadNav.close(this.el); const inp = this.input; this.input = null;
    if (inp && next) {                                         // Done: on to the next box or button
      const t = PadNav.top(), list = t ? PadNav.focusables(t.el) : [], i = list.indexOf(inp);
      PadNav.focus(list[i + 1] || inp); if (inp.dataset.enter) inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
  }
};
