/* v14.3.26 playing sideways when the phone won't turn the page.
   The "turn your phone sideways" screen only goes away when the browser itself switches to landscape. With the phone's rotation lock on
   (common on iPhones), or inside an app's own browser (TikTok, Instagram, Facebook, Messenger, Snapchat...) that stays upright, it never
   does, and players were stuck on that screen. Now it has a button, PLAY SIDEWAYS ANYWAY:
   - on Android it first asks for full screen locked to landscape (the proper way);
   - otherwise (or if that's refused) the game turns itself a quarter turn on the upright screen, so you hold the phone sideways and play.
   While turned, everything that measures the screen or a finger is told the turned sizes and positions (Rot.pt, Rot.rect, and the window
   size the rest of the game reads), so the controls, taps, the 3D view and the menus all line up. It turns back by itself as soon as the
   browser really is landscape. */
const Rot = {
  on: false, forced: false,
  realW() { return document.documentElement.clientWidth || 0; }, realH() { return document.documentElement.clientHeight || 0; },
  phone() { try { return matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) <= 700; } catch (e) { return false; } },
  portrait() { return this.realH() > this.realW(); },
  apply() {
    const on = this.forced && this.phone() && this.portrait(), R = document.documentElement;
    R.style.setProperty('--rw', this.realW() + 'px'); R.style.setProperty('--rh', this.realH() + 'px');
    if (on === this.on) return; this.on = on; R.classList.toggle('rot', on);
    dispatchEvent(new Event('resize'));                   // everything that sizes itself to the screen does it again
  },
  /* a point on the screen (clientX, clientY) -> the same point on the turned page. The page is turned a quarter turn clockwise about its
     top-left corner and moved right by the screen's width, so page (u, v) shows at screen (width - v, u). */
  pt(x, y) { return this.on ? { x: y, y: this.realW() - x } : { x, y }; },
  /* an element's box on the turned page (left, top, width, height), like getBoundingClientRect() would give unturned */
  rect(el) {
    const r = el.getBoundingClientRect(); if (!this.on) return r;
    const W = this.realW(), left = r.top, top = W - r.right;
    return { left, top, x: left, y: top, width: r.height, height: r.width, right: left + r.height, bottom: top + r.width };
  },
  force() {
    try { localStorage.setItem('volt.sideways', '1'); } catch (e) { /* private mode */ }
    const turnSelf = () => { if (this.portrait()) { this.forced = true; this.apply(); } };
    /* Android: full screen, locked to landscape. iPhones and most in-app browsers can't: then the game turns itself */
    try {
      const el = document.documentElement, fs = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : null;
      if (fs && screen.orientation && screen.orientation.lock) { fs.then(() => screen.orientation.lock('landscape')).then(() => setTimeout(turnSelf, 500), turnSelf).catch(turnSelf); return; }
    } catch (e) { /* not supported */ }
    turnSelf();
  },
  init() {
    try { this.forced = localStorage.getItem('volt.sideways') === '1'; } catch (e) { /* private mode */ }
    /* the rest of the game reads the window's size: while turned, it gets the turned (landscape) size */
    try {                                                  // (only while turned: otherwise the browser's own values, untouched)
      const own = n => { const d = Object.getOwnPropertyDescriptor(window, n) || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), n); return d && d.get ? () => d.get.call(window) : null; };
      const gw = own('innerWidth'), gh = own('innerHeight');
      if (gw && gh) {
        Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => (Rot.on ? Rot.realH() : gw()) });
        Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => (Rot.on ? Rot.realW() : gh()) });
      }
    } catch (e) { /* this browser won't allow it: the layout code still mostly works from the stage's own size */ }
    const css = document.createElement('style');
    css.textContent = `html.rot #rotate{display:none!important}
      html.rot body{position:fixed;left:0;top:0;width:var(--rh);height:var(--rw);overflow:hidden;transform-origin:0 0;transform:translateX(var(--rw)) rotate(90deg)}
      #rotate button{font:700 20px Arial,sans-serif;color:#0d151b;background:#ffd23f;border:0;border-radius:12px;padding:14px 22px;margin-top:4px}`;
    document.head.append(css);
    const box = document.getElementById('rotate');
    if (box && !box.querySelector('button')) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = '▶ PLAY SIDEWAYS ANYWAY'; b.onclick = () => this.force();
      box.append(b);
    }
    const upd = () => this.apply();
    addEventListener('resize', () => { if (Rot._busy) return; Rot._busy = true; try { upd(); } finally { Rot._busy = false; } });
    addEventListener('orientationchange', () => setTimeout(upd, 300));
    upd();
  }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Rot.init()); else Rot.init();

/* Phaser: size the game to the stage's turned box, and turn taps on the game into the turned page's coordinates */
if (typeof Phaser !== 'undefined') {
  const SM = Phaser.Scale.ScaleManager.prototype, gpb = SM.getParentBounds;
  SM.getParentBounds = function () {
    if (!Rot.on || !this.parent) return gpb.call(this);
    const t = this.parentSize, w = this.parent.clientWidth, h = this.parent.clientHeight;
    if (t.width !== w || t.height !== h) { t.setSize(w, h); return true; } return false;
  };
  const uc = SM.updateCenter;     // (it centres the canvas by its box on the screen, which is turned: centre by its size on the page)
  SM.updateCenter = function () {
    if (!Rot.on || !this.autoCenter) return uc.call(this);
    const st = this.canvas.style, w = parseFloat(st.width) || this.displaySize.width, h = parseFloat(st.height) || this.displaySize.height;
    st.marginLeft = Math.floor((this.parentSize.width - w) / 2) + 'px'; st.marginTop = Math.floor((this.parentSize.height - h) / 2) + 'px';
  };
  const IM = Phaser.Input.InputManager.prototype, tp = IM.transformPointer;
  IM.transformPointer = function (pointer, pageX, pageY, wasMove) {
    if (!Rot.on) return tp.call(this, pointer, pageX, pageY, wasMove);
    const P = Rot.pt(pageX, pageY), r = Rot.rect(this.game.canvas), p0 = pointer.position, p1 = pointer.prevPosition;
    p1.x = p0.x; p1.y = p0.y; p0.x = (P.x - r.left) * (this.scaleManager.width / r.width); p0.y = (P.y - r.top) * (this.scaleManager.height / r.height);
  };
}
