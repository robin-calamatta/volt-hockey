/* v14.2.16 Menu buttons for touch screens: a small D-pad (bottom left) and A / B / X / Y / START (bottom right) on every menu screen, so a
   phone or tablet can do everything a controller does there: join and pick a side, change teams, open game settings, start the game.
   They act exactly like the on-screen controller's buttons (the "Touch controls" device), so every menu understands them. They show
   whenever the touch controller is on and you aren't in a match (in a match the full on-screen controller takes over). */
/* v14.3.1: raised 54 px, clear of a phone browser's bottom bar */
const MenuPad = {
  built: false, shown: false,
  keys: [
    { id: 'up', l: '▲', g: 'd', x: 1, y: 0 }, { id: 'left', l: '◀', g: 'd', x: 0, y: 1 }, { id: 'right', l: '▶', g: 'd', x: 2, y: 1 }, { id: 'down', l: '▼', g: 'd', x: 1, y: 2 },
    { id: 'y', l: 'Y', s: '', g: 'f', x: 1, y: 0, c: '#f2c200' }, { id: 'x', l: 'X', s: '', g: 'f', x: 0, y: 1, c: '#2f8fff' }, { id: 'b', l: 'B', s: 'BACK', g: 'f', x: 2, y: 1, c: '#ff4b5c' }, { id: 'a', l: 'A', s: 'OK', g: 'f', x: 1, y: 2, c: '#3ddc84' },
    { id: 'start', l: 'START', s: '', g: 's' }
  ],
  build() {
    const css = document.createElement('style');
    css.textContent = `
      #menupad{position:fixed;inset:0;z-index:7;pointer-events:none;display:none;font-family:"Barlow Condensed",Arial,sans-serif;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
      #menupad .grp{position:absolute;bottom:max(64px,calc(env(safe-area-inset-bottom) + 64px));width:120px;height:120px}
      #menupad .grp.d{left:max(10px,env(safe-area-inset-left))} #menupad .grp.f{right:max(10px,env(safe-area-inset-right))}
      #menupad .k{position:absolute;width:38px;height:38px;pointer-events:auto;touch-action:none;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;
        color:#fff;font-weight:800;font-size:17px;line-height:1;text-shadow:0 2px 3px #000a;background:rgba(14,32,46,.55);border:2px solid rgba(25,195,255,.75);border-radius:12px;box-shadow:0 3px 10px #0008}
      #menupad .f .k{border-radius:50%}
      #menupad .k .s{font-size:9px;letter-spacing:.06em;opacity:.9;margin-top:2px;font-weight:700}
      #menupad .k.down{background:rgba(25,195,255,.6);border-color:#fff;transform:scale(.94)}
      #menupad .k.st{position:absolute;right:max(34px,calc(env(safe-area-inset-right) + 34px));bottom:max(206px,calc(env(safe-area-inset-bottom) + 206px));width:78px;height:36px;border-radius:18px;font-size:16px}`;
    document.head.append(css);
    const root = this.root = document.createElement('div'); root.id = 'menupad'; document.body.append(root);
    const grp = { d: document.createElement('div'), f: document.createElement('div') }; grp.d.className = 'grp d'; grp.f.className = 'grp f'; root.append(grp.d, grp.f);
    for (const k of this.keys) {
      const el = document.createElement('div'); el.className = 'k' + (k.g === 's' ? ' st' : ''); el.innerHTML = `<span>${k.l}</span>${k.s ? `<span class="s">${k.s}</span>` : ''}`;
      if (k.c) el.style.borderColor = k.c;
      if (k.g !== 's') { el.style.left = (k.x * 41) + 'px'; el.style.top = (k.y * 41) + 'px'; grp[k.g].append(el); } else root.append(el);
      const T = () => TouchPad.state;
      const down = e => { e.preventDefault(); e.stopPropagation(); if (!Controls.sources.touch) Controls.sources.touch = Controls.touchSrc || (Controls.touchSrc = new Source('touch', 'Touch controls')); T().held[k.id] = true; T().tapped[k.id] = true; el.classList.add('down'); try { el.setPointerCapture(e.pointerId); } catch (er) { /* fine */ } };
      const up = e => { T().held[k.id] = false; el.classList.remove('down'); };
      el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    }
    this.built = true;
  },
  sync() {
    if (!TouchPad.built) return; if (!this.built) this.build();
    const sc = window.voltGame && voltGame.scene, inGame = !!TouchPad.inGame, show = !!Settings.touch && !inGame && !TouchPad.editing && !!sc && !['Boot', 'Title', 'Main'].some(k => sc.isActive(k));   // (the home screen and title are made for tapping already)
    if (show !== this.shown) { this.shown = show; this.root.style.display = show ? 'block' : 'none'; if (!show) for (const k of this.keys) { TouchPad.state.held[k.id] = false; } }
  }
};
{ const s0 = TouchPad.sync; TouchPad.sync = function (...a) { const r = s0.apply(this, a); try { MenuPad.sync(); } catch (e) { /* never stop the frame */ } return r; }; }
