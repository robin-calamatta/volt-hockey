/* v14.3.17 phones: the on-screen keyboard and short screens.
   - The menus that take typing (log in, sign up, add a friend, chat...) fit the part of the screen the keyboard leaves free, and the box you
     type in scrolls into view above the keyboard (it used to hide half the form).
   - The Friends and party panel, the forms and the legal pages scroll all the way to the bottom on a phone (they were cut off by the
     browser's own bars), with room for the phone's rounded corners and gesture bar.
   How: the browser says how much of the screen is visible (visualViewport). That is kept in CSS variables: --vvh (visible height),
   --vvt (how far down it starts) and --kbb (the keyboard's height, 0 when it's closed). html gets the class "kb" while the keyboard is open. */
const Viewport = {
  update() {
    const vv = window.visualViewport, h = vv ? vv.height : innerHeight, t = vv ? vv.offsetTop : 0, kb = Math.max(0, innerHeight - h - t), R = document.documentElement.style;
    R.setProperty('--vvh', h + 'px'); R.setProperty('--vvt', t + 'px'); R.setProperty('--kbb', kb + 'px');
    const typing = /^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '') && !/^(checkbox|radio|button|range)$/.test(document.activeElement.type || '');
    document.documentElement.classList.toggle('kb', typing && (kb > 80 || h < innerHeight * 0.78));
  },
  /* the box being typed in: scrolled into the middle of what's visible, once the keyboard has opened */
  reveal(el) {
    const go = () => { try { el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' }); } catch (e) { el.scrollIntoView(); } };
    setTimeout(go, 120); setTimeout(go, 450);
  },
  start() {
    const css = document.createElement('style');
    css.textContent = `
      :root{--vvh:100dvh;--vvt:0px;--kbb:0px}
      /* the forms, the Friends panel and the legal pages: always inside the visible part of the screen */
      html #form,html #fmodal,html #legal,html #lgdoc{top:var(--vvt)!important;bottom:auto!important;height:var(--vvh)!important;padding:max(6px,env(safe-area-inset-top)) max(6px,env(safe-area-inset-right)) max(6px,env(safe-area-inset-bottom)) max(6px,env(safe-area-inset-left));box-sizing:border-box}
      html #form .box,html #fmodal .box,html #legal .box,html #lgdoc .box{max-height:calc(var(--vvh) - 12px - env(safe-area-inset-top) - env(safe-area-inset-bottom))!important}
      html #form .box{overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y}
      html #fmodal .bd,html #legal .bd,html #lgdoc .bd{flex:1 1 auto;min-height:0;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding-bottom:calc(14px + env(safe-area-inset-bottom))}
      html #form .list,html #fmodal .list{touch-action:pan-y;overscroll-behavior:contain}
      /* keyboard open: the form sits at the top of what's left, and gets more compact */
      html.kb #form,html.kb #fmodal{align-items:flex-start}
      html.kb #form .box{padding:8px 14px}
      html.kb #form h2{font-size:22px;margin-bottom:2px}
      html.kb #form label{margin:3px 0 1px;font-size:15px}
      html.kb #form .note,html.kb #form .pads{display:none}
      /* text chat: above the keyboard */
      html.kb #chat{bottom:calc(var(--kbb) + 8px)!important}
      /* a short screen (a phone on its side): tighter forms */
      @media (max-height:520px){
        html #form .box{padding:10px 16px}html #form h2{font-size:24px;margin-bottom:4px}html #form label{margin:4px 0 2px;font-size:16px}
        html #form input{font-size:18px;padding:5px 9px}html #form .row{margin-top:8px}html #form .pads{display:none}
        html #fmodal .hd{padding:6px 12px}html #fmodal .hd h2{font-size:22px}
      }
      /* touch screens: the gamepad hint isn't needed */
      @media (pointer:coarse){html #form .pads{display:none}}`;
    document.head.append(css);
    const vv = window.visualViewport, up = () => this.update();
    if (vv) { vv.addEventListener('resize', up); vv.addEventListener('scroll', up); }
    addEventListener('resize', up); addEventListener('orientationchange', () => setTimeout(up, 300));
    document.addEventListener('focusin', e => { const t = e.target; up(); if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.closest('#form,#fmodal,#legal,#lgdoc,#chat,#chatq')) this.reveal(t); });
    document.addEventListener('focusout', () => setTimeout(up, 60));
    up();
  }
};
Viewport.start();
