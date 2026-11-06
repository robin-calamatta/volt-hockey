/* YOUR MUSIC. Drop audio files (mp3, ogg, wav, m4a, flac...) into two folders:
     assets/music/menu/   the menus and the lobby play these, shuffled
     assets/music/game/   the games play these, shuffled (Battle Royale only if its "Music" option is On: it's Off by default)
     assets/music/intro/  the opening splash (the sparkler burning in the logo) plays one of these, picked at random
   (Older setups still work: assets/music/match/ counts as game music, and songs loose in assets/music/ play in both.)
   The game finds songs three ways and combines them:
     1. Folder listing: works on a local dev server (npx serve, python3 -m http.server). Nothing to do.
     2. assets/music/playlist.json: what public hosts use (they hide folder listings). Netlify builds it for you on every deploy
        (netlify.toml runs tools/make-playlist.js); anywhere else, run  node tools/make-playlist.js  before uploading.
     3. MUSIC_FILES below: a hand-written list, if you prefer.
   With no music found, the built-in 8-bit tunes in audio.js play instead. */
const MUSIC_DIR = 'assets/music/';
const MUSIC_DIRS = { menu: ['assets/music/menu/'], match: ['assets/music/game/', 'assets/music/match/'], intro: ['assets/music/intro/'] };
const MUSIC_MANIFEST = 'assets/music/playlist.json';
const MUSIC_FILES = { menu: [], match: [], intro: [] };   // optional, e.g. { menu: ['menu/title.mp3'], match: ['game/song.ogg'] } (paths inside assets/music/)
const MUSIC_EXTENSIONS = /\.(mp3|ogg|oga|opus|wav|m4a|aac|flac|webm)$/i;
const MUSIC_SCAN_TIMEOUT_MS = 2000;                        // give up on a listing or manifest after this long
const MUSIC_START_WAIT_MS = 1500;                          // a song never waits longer than this for the scan before the 8-bit tune starts
let MUSIC_READY = Promise.resolve();                       // main.js replaces this with the scan, which runs in the background
const PLAYLISTS = { menu: [], match: [], intro: [] };                 // menu music and game music, each shuffled on its own

async function fetchWithTimeout(url, read) {               // returns read(response), or null on any failure or timeout
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), MUSIC_SCAN_TIMEOUT_MS);
  try { const res = await fetch(url, { signal: ctl.signal }); return res.ok ? await read(res) : null; }
  catch (e) { return null; }
  finally { clearTimeout(timer); }
}

async function listFolder(dir, urls) {                     // the songs in a folder listing (local dev servers)
  const base = new URL(dir, location.href);
  const html = await fetchWithTimeout(base.href, res => /html/i.test(res.headers.get('content-type') || '') ? res.text() : null);
  const link = /href\s*=\s*["']([^"']+)["']/gi;
  for (let m; html && (m = link.exec(html)); ) { const url = new URL(m[1], base); if (url.pathname.startsWith(base.pathname) && url.pathname.slice(base.pathname.length).indexOf('/') < 0 && MUSIC_EXTENSIONS.test(url.pathname)) urls.add(url.href); }
}

const MUSIC_LOCAL = location.protocol === 'file:' || /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]$|[^.]+$)/.test(location.hostname);   // only your own computer / home network lists folders

async function scanMusic() {
  const got = await fetchWithTimeout(new URL(MUSIC_MANIFEST, location.href).href, res => res.json()), manifest = got || {}, root = new URL(MUSIC_DIR, location.href);
  const sets = { menu: new Set(), match: new Set(), intro: new Set() }, both = new Set(), add = (set, file) => set.add(new URL(encodeURI(file), root).href);
  const M = Array.isArray(manifest) ? { songs: manifest } : manifest;
  (M.menu || []).forEach(f => add(sets.menu, f.includes('/') ? f : 'menu/' + f)); (M.intro || []).forEach(f => add(sets.intro, f.includes('/') ? f : 'intro/' + f));
  [...(M.game || []), ...(M.match || [])].forEach(f => add(sets.match, f.includes('/') ? f : 'game/' + f));
  (M.songs || []).forEach(f => f.startsWith('menu/') ? add(sets.menu, f) : f.startsWith('game/') || f.startsWith('match/') ? add(sets.match, f) : add(both, f));
  MUSIC_FILES.menu.forEach(f => add(sets.menu, f)); MUSIC_FILES.match.forEach(f => add(sets.match, f)); MUSIC_FILES.intro.forEach(f => add(sets.intro, f));
  if (!got && MUSIC_LOCAL) {                                          // folder listings: only on a local dev server with no playlist.json (public hosts answer them with 404s)
    for (const k of ['menu', 'match', 'intro']) for (const d of MUSIC_DIRS[k]) await listFolder(d, sets[k]);
    await listFolder(MUSIC_DIR, both); }
  for (const k of ['menu', 'match']) { both.forEach(u => sets[k].add(u)); PLAYLISTS[k] = [...sets[k]]; } PLAYLISTS.intro = [...sets.intro];   // (the intro folder only: loose songs don't play over the splash)
}
