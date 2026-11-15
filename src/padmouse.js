/* v14.3.12 the SELECT button (View / Back / Share, the small one left of the middle) on a controller:
   - Tap it in the menus or the lobby: a mouse pointer appears. The left stick moves it (push further to go faster), A clicks, and the
     right stick scrolls. Tap SELECT again (or B) and it's gone, and the controller works the menus as usual again.
   - Hold it (about half a second) when a notice with a button pops up (a party invite, a friend request, "join?"): that's its main
     button pressed (Accept / Join). Notices with a button say so while a controller is plugged in.
   (In a match SELECT doesn't bring up the pointer: it's still free for the game.) */
const PadMouse = {
  on: false, x: 0, y: 0, el: null, downAt: 0, used: false, aWas: false, bWas: false, last: 0, hover: null,
  HOLD: 550,
  pads() { try { return [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean); } catch (e) { return []; } },
  btn(pads, i) { return pads.some(p => p.buttons[i] && p.buttons[i].pressed); },
  inPlay() { const g = window.voltGame && voltGame.scene; if (!g) return false; const G = g.getScene('Game'); return !!(G && G.sys.isActive() && !G.sys.isPaused() && G.match && !G.demo && !g.isActive('Pause') && !(typeof FriendsBar !== 'undefined' && FriendsBar.open)); },
  toastGo() { const r = document.getElementById('toasts'); if (!r) return null; const all = [...r.querySelectorAll('button.go')]; return all[all.length - 1] || null; },
  build() {
    if (this.el) return; const css = document.createElement('style');
    css.textContent = `#padmouse{position:fixed;left:0;top:0;width:28px;height:28px;z-index:9999;pointer-events:none;display:none;transform:translate(-3px,-2px)}
      #padmouse svg{filter:drop-shadow(0 2px 3px #000c)} #padmouse.down svg{transform:scale(.88)}
      #padmousehint{position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:9998;pointer-events:none;display:none;background:rgba(13,21,27,.92);border:1px solid #2f4a5c;border-radius:9px;padding:4px 12px;color:#cfd8de;font:600 15px "Barlow Condensed",Arial,sans-serif}
      #toasts .padhold{margin-top:6px;color:#9fb2bf;font-size:14px} #toasts .padhold b{color:#ffe27a} #toasts .t .bar{height:3px;background:#ffe27a;width:0;border-radius:2px;margin-top:4px}`;
    document.head.append(css);
    this.el = document.createElement('div'); this.el.id = 'padmouse';
    this.el.innerHTML = '<svg width="26" height="30" viewBox="0 0 26 30"><path d="M2 2 L2 24 L8 18.5 L12.5 28 L16.5 26.2 L12 16.8 L20 16.8 Z" fill="#ffffff" stroke="#0d151b" stroke-width="2" stroke-linejoin="round"/></svg>';
    this.hint = document.createElement('div'); this.hint.id = 'padmousehint'; this.hint.textContent = 'Pointer: left stick moves · A clicks · right stick scrolls · SELECT or B to put it away';
    document.body.append(this.el, this.hint);
  },
  set(on) {
    this.build(); this.on = !!on; this.el.style.display = on ? 'block' : 'none'; this.hint.style.display = on ? 'block' : 'none';
    if (on) { if (!this.x && !this.y) { this.x = innerWidth / 2; this.y = innerHeight / 2; } this.place(); this.aWas = true; this.bWas = true; clearTimeout(this.hintT); this.hintT = setTimeout(() => { if (this.hint) this.hint.style.display = 'none'; }, 4000); }
    try { Sound.play(on ? 'select' : 'back'); } catch (e) { /* no sound */ }
  },
  place() { this.el.style.left = this.x + 'px'; this.el.style.top = this.y + 'px'; },
  target() { this.el.style.display = 'none'; const t = document.elementFromPoint(this.x, this.y); this.el.style.display = 'block'; return t; },
  fire(t, type, extra = {}) {
    if (!t) return; const o = { bubbles: true, cancelable: true, composed: true, clientX: this.x, clientY: this.y, screenX: this.x, screenY: this.y, button: 0, buttons: type.includes('down') ? 1 : 0, view: window, ...extra };
    try { if (type.startsWith('pointer')) t.dispatchEvent(new PointerEvent(type, { pointerId: 77, pointerType: 'mouse', isPrimary: true, ...o })); else t.dispatchEvent(new MouseEvent(type, o)); } catch (e) { /* old browser */ }
  },
  click() {
    const t = this.target(); if (!t) return;
    this.fire(t, 'pointerdown'); this.fire(t, 'mousedown'); this.el.classList.add('down');
    setTimeout(() => { const u = this.target() || t; this.fire(u, 'pointerup'); this.fire(u, 'mouseup'); if (u === t || t.contains(u) || u.contains(t)) { if (typeof t.click === 'function' && t.tagName !== 'CANVAS') t.click(); else this.fire(t, 'click'); } if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) t.focus(); this.el.classList.remove('down'); }, 70);
  },
  tick(now) {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000); this.last = now; const pads = this.pads(); if (!pads.length) { if (this.on) this.set(false); this.downAt = 0; return; }
    const sel = this.btn(pads, 8);
    /* SELECT: hold for a notice's button, tap for the pointer */
    if (sel && !this.downAt) { this.downAt = now; this.used = false; }
    if (sel && this.downAt && !this.used) { const go = this.toastGo(), k = Math.min(1, (now - this.downAt) / this.HOLD); if (go) { const bar = go.closest('.t') && go.closest('.t').querySelector('.bar'); if (bar) bar.style.width = (k * 100) + '%'; if (k >= 1) { this.used = true; go.click(); try { Sound.play('select'); } catch (e) { /* none */ } } } }
    if (!sel && this.downAt) { const held = now - this.downAt; this.downAt = 0; for (const b of document.querySelectorAll('#toasts .bar')) b.style.width = '0';
      if (!this.used && held < this.HOLD) { if (this.on) this.set(false); else if (!this.inPlay()) this.set(true); } }
    if (!this.on) return;
    if (this.inPlay()) { this.set(false); return; }
    /* move: the left stick, faster the further it's pushed (and the D-pad, slowly, for fine aiming) */
    const p = pads.find(q => Math.hypot(q.axes[0] || 0, q.axes[1] || 0) > 0.18) || pads[0]; let ax = p.axes[0] || 0, ay = p.axes[1] || 0; const m = Math.hypot(ax, ay);
    if (m < 0.18) ax = ay = 0; else { const k = Math.pow((Math.min(1, m) - 0.18) / 0.82, 1.6) / m; ax *= k; ay *= k; }
    const dp = (i, j) => (this.btn(pads, i) ? 1 : 0) - (this.btn(pads, j) ? 1 : 0), sp = Math.max(innerWidth, innerHeight) * 0.9;
    const vx = ax * sp + dp(15, 14) * 160, vy = ay * sp + dp(13, 12) * 160;
    if (vx || vy) { this.x = Math.max(0, Math.min(innerWidth - 2, this.x + vx * dt)); this.y = Math.max(0, Math.min(innerHeight - 2, this.y + vy * dt)); this.place();
      const t = this.target(); this.fire(t, 'pointermove'); this.fire(t, 'mousemove'); if (t !== this.hover) { if (this.hover) { this.fire(this.hover, 'mouseout'); this.fire(this.hover, 'pointerout'); } this.fire(t, 'mouseover'); this.fire(t, 'pointerover'); this.hover = t; } }
    /* scroll: the right stick */
    const ry = pads.reduce((a, q) => Math.abs(q.axes[3] || 0) > Math.abs(a) ? q.axes[3] || 0 : a, 0); if (Math.abs(ry) > 0.25) { const t = this.target(); let s = t; while (s && s !== document.body && !(s.scrollHeight > s.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(s).overflowY))) s = s.parentElement; if (s && s !== document.body) s.scrollTop += ry * 900 * dt; else this.fire(t, 'wheel', { deltaY: ry * 900 * dt }); }
    /* A clicks, B puts the pointer away */
    const a = this.btn(pads, 0), b = this.btn(pads, 1);
    if (a && !this.aWas) this.click(); if (b && !this.bWas) this.set(false); this.aWas = a; this.bWas = b;
  }
};
/* while the pointer is out, the controller's other buttons don't also drive the menu underneath */
{ const rp = Source.prototype.readPad; Source.prototype.readPad = function (...a) { if (PadMouse.on) { this.ax = this.ay = this.rx = this.ry = 0; return {}; } return rp.apply(this, a); }; }
/* notices with a button: "hold SELECT" when a controller is plugged in */
{ const sh = Toasts.show.bind(Toasts); Toasts.show = function (html, actions = [], ms) {
    const close = sh(html, actions, ms); try { if (actions && actions.some(a => a.go) && PadMouse.pads().length) { const r = document.getElementById('toasts'), box = r && r.lastElementChild; if (box && !box.querySelector('.padhold')) { const h = document.createElement('div'); h.className = 'padhold'; h.innerHTML = `🎮 Hold <b>SELECT</b> for ${esc((actions.find(a => a.go) || {}).label || 'OK')}`; const bar = document.createElement('div'); bar.className = 'bar'; box.append(h, bar); } } } catch (e) { /* plain notice */ }
    return close; }; }
(function padMouseLoop() { const f = t => { try { PadMouse.tick(t); } catch (e) { /* keep going */ } requestAnimationFrame(f); }; requestAnimationFrame(f);
  setInterval(() => { const t = performance.now(); if (t - (PadMouse.last || 0) > 40) { try { PadMouse.tick(t); } catch (e) { /* keep going */ } } }, 33); })();   // (a busy or hidden page draws less often: the controller is still read)
