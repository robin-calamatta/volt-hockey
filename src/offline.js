/* v14.3.14 offline play and "install as an app".
   - Offline: sw.js keeps a copy of the game on the device (see sw.js). It's switched on here, on the real website (https) only.
   - Install: on a computer (Chrome, Edge) or an Android phone's browser, the game can be installed as an app with its own icon and
     window, no address bar, and it starts with no internet too. When the browser says it can be installed, a notice offers it once
     (and again a week after "Not now"), and Settings > Controls and screen has "Install Volt Hockey as an app" any time.
     Safari (iPhone, iPad, Mac) has no install button for websites: the row explains Share > Add to Home Screen / Add to Dock instead.
   - Already running as an app (installed, or the Google Play app): nothing is offered. */
const Offline = {
  prompt: null, installed: false,
  app() { try { return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: window-controls-overlay)').matches || navigator.standalone === true || document.referrer.startsWith('android-app://'); } catch (e) { return false; } },
  start() {
    const real = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
    if ('serviceWorker' in navigator && real && (!navigator.webdriver || /[?&]sw\b/.test(location.search)) && !/[?&]nosw\b/.test(location.search))   // (automated test browsers only with ?sw)
      navigator.serviceWorker.register('sw.js').then(reg => { setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000); }).catch(() => { /* no offline copy: plays online as before */ });
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.prompt = e; this.offer(); });
    addEventListener('appinstalled', () => { this.installed = true; this.prompt = null; try { Toasts.show('⚡ Volt Hockey is installed. Open it from your apps: it also plays with no internet.', [], 5000); } catch (x) { /* fine */ } });
    addEventListener('offline', () => { try { Toasts.show('📴 No internet: 🏠 THIS SCREEN games still work. Online play is back when you reconnect.', [], 4500); } catch (x) { /* fine */ } });
  },
  can() { return !!this.prompt && !this.installed && !this.app(); },
  async install() {
    if (this.can()) { const p = this.prompt; this.prompt = null; try { p.prompt(); const r = await p.userChoice; if (r && r.outcome === 'accepted') this.installed = true; } catch (e) { /* closed */ } return; }
    try { Toasts.show(this.app() ? 'You\'re already playing the app version.' : /iPhone|iPad|Macintosh/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|Edg/.test(navigator.userAgent)
      ? 'In Safari: tap Share, then "Add to Home Screen" (iPhone, iPad) or File > "Add to Dock" (Mac).' : 'Your browser hasn\'t offered it yet: use Chrome or Edge, or look for the install icon at the right of the address bar.', [], 6000); } catch (e) { /* fine */ }
  },
  offer() {
    let last = 0; try { last = +localStorage.getItem('volt.installAsk') || 0; } catch (e) { /* none */ }
    if (!this.can() || Date.now() - last < 7 * 864e5 || this.asked) return; this.asked = true;
    setTimeout(() => { if (!this.can()) return; try { Toasts.show('⚡ <b>Install Volt Hockey as an app?</b> Its own icon and window, and it plays with no internet too.', [{ label: 'Install', go: true, fn: () => this.install() }, { label: 'Not now', fn: () => { try { localStorage.setItem('volt.installAsk', String(Date.now())); } catch (e) { /* fine */ } } }], 15000); } catch (e) { /* fine */ } }, 4000);
  }
};
Offline.start();
SETTINGS_PAGES['Controls and screen'] = (f => sc => { const rows = f(sc); if (!Offline.app()) rows.push({ label: () => '⚡ Install Volt Hockey as an app', hint: 'Its own icon and window, no address bar, and it plays with no internet too (computer: Chrome or Edge; phone: Android Chrome. iPhone: Share > Add to Home Screen)', select: () => Offline.install() }); return rows; })(SETTINGS_PAGES['Controls and screen']);
