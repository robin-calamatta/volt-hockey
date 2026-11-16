/* v14.3.14 Volt Hockey's offline copy (a "service worker": the browser runs it beside the page).
   - The first time the game opens with internet, it saves the files listed in offline-files.json on the device. After that the game
     starts with no internet too: 🏠 THIS SCREEN games against the CPU or with controllers, settings, the locker and the rest work.
     Online play, LAN, accounts and leaderboards still need the internet.
   - With internet, every file comes fresh from the server first (and the saved copy is updated), so an update is never held back. The
     saved copy is only used when the server can't be reached.
   - The game's server (/api/...) is never saved: it always goes to the network.
   - Songs, spoken commentary and the Google font are saved as they're used. */
const CACHE = 'volt-offline-v1', RUNTIME = 'volt-runtime-v1';
const NET_TIMEOUT = 6000;   // after this long with no answer, use the saved copy (a very slow or dead connection)

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    try {
      const list = await (await fetch('offline-files.json', { cache: 'no-store' })).json(), c = await caches.open(CACHE);
      await c.put('offline-files.json', new Response(JSON.stringify(list), { headers: { 'content-type': 'application/json' } }));
      /* one by one, so one missing file doesn't stop the rest */
      await Promise.all([...new Set(['./', ...list.files])].map(f => fetch(f, { cache: 'no-cache' }).then(r => (r.ok ? c.put(f, r) : null)).catch(() => null)));
    } catch (err) { /* no list yet (an old upload): files are saved as they're used */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k !== RUNTIME) await caches.delete(k);
    await self.clients.claim();
    refresh();
  })());
});

/* when the files change on the server (a new deploy), save the new set in the background */
async function refresh() {
  try {
    const c = await caches.open(CACHE), had = await c.match('offline-files.json'), old = had ? await had.json() : null;
    const list = await (await fetch('offline-files.json', { cache: 'no-store' })).json(); if (old && old.v === list.v) return;
    await Promise.all(list.files.map(f => fetch(f, { cache: 'no-cache' }).then(r => (r.ok ? c.put(f, r) : null)).catch(() => null)));
    await c.put('offline-files.json', new Response(JSON.stringify(list), { headers: { 'content-type': 'application/json' } }));
  } catch (err) { /* offline: next time */ }
}
self.addEventListener('message', e => { if (e.data === 'refresh') refresh(); });

const withTimeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then(v => { clearTimeout(t); res(v); }, er => { clearTimeout(t); rej(er); }); });

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  const same = url.origin === self.location.origin;
  if (same && (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/') || url.pathname.startsWith('/admin') || url.pathname.endsWith('/sw.js'))) return;   // the server and the admin page: always live
  const fonts = /^(fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (!same && !fonts) return;   // other sites (the online matchmaking helpers): not ours to save
  const big = /\.(mp3|ogg|oga|opus|wav|m4a|aac|flac|webm)$/i.test(url.pathname);
  e.respondWith((async () => {
    const home = req.mode === 'navigate' && (url.pathname === '/' || url.pathname.endsWith('/index.html')), store = await caches.open(same && !big ? CACHE : RUNTIME), key = home ? './' : req.mode === 'navigate' ? url.pathname.replace(/^\//, '') : req;
    if (fonts || big) {   // fonts and sounds: the saved copy straight away if there is one (they never change), else fetch and keep it
      const hit = await store.match(req); if (hit) return hit;
      const r = await fetch(req); if (r.ok || r.type === 'opaque') store.put(req, r.clone()).catch(() => {}); return r;
    }
    try {   // everything else: fresh from the server first, the saved copy if that fails
      const r = await withTimeout(fetch(req, { cache: 'no-cache' }), NET_TIMEOUT);
      if (r.ok && (url.search === '' || req.mode === 'navigate')) store.put(key, r.clone()).catch(() => {});
      return r;
    } catch (err) {
      const hit = (await store.match(key, { ignoreSearch: true })) || (await caches.match(key, { ignoreSearch: true }));
      if (hit) return hit;
      if (req.mode === 'navigate') return new Response('<!doctype html><meta name="viewport" content="width=device-width"><body style="background:#0d151b;color:#e8eef2;font:18px system-ui;padding:24px">Volt Hockey needs the internet the first time it opens. Connect once, and after that it also plays offline.</body>', { headers: { 'content-type': 'text/html' } });
      throw err;
    }
  })());
});
