/* YOUR MUSIC. Drop audio files (mp3, ogg, wav, m4a, flac...) into ONE folder:
     assets/music/        the menus and the matches both play songs from here, shuffled
   (Older setups still work: files in assets/music/menu/ and assets/music/match/ are added to the same pool.)
   The game finds songs three ways and combines them:
     1. Folder listing: works on a local dev server (npx serve, python3 -m http.server). Nothing to do.
     2. assets/music/playlist.json: needed on public hosts that hide folder listings (Netlify, GitHub Pages, Wix).
        Generate it with:  node tools/make-playlist.js   (run it before every upload)
     3. MUSIC_FILES below: a hand-written list (file names inside assets/music/), if you prefer.
   With no music found, the built-in 8-bit tunes in audio.js play instead. */
const MUSIC_DIR = 'assets/music/';
const MUSIC_LEGACY_DIRS = ['assets/music/menu/', 'assets/music/match/'];
const MUSIC_MANIFEST = 'assets/music/playlist.json';
const MUSIC_FILES = [];        // optional, e.g. ['title-theme.mp3', 'song-one.ogg']
const MUSIC_EXTENSIONS = /\.(mp3|ogg|oga|opus|wav|m4a|aac|flac|webm)$/i;
const MUSIC_SCAN_TIMEOUT_MS = 2000;                        // give up on a listing or manifest after this long
const MUSIC_START_WAIT_MS = 1500;                          // a song never waits longer than this for the scan before the 8-bit tune starts
let MUSIC_READY = Promise.resolve();                       // main.js replaces this with the scan, which runs in the background
const PLAYLISTS = { menu: [], match: [] };                 // both point at the same song list after scanMusic()

async function fetchWithTimeout(url, read) {               // returns read(response), or null on any failure or timeout
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), MUSIC_SCAN_TIMEOUT_MS);
  try { const res = await fetch(url, { signal: ctl.signal }); return res.ok ? await read(res) : null; }
  catch (e) { return null; }
  finally { clearTimeout(timer); }
}

async function scanMusic() {
  const manifest = await fetchWithTimeout(new URL(MUSIC_MANIFEST, location.href).href, res => res.json()) || {};
  const listed = Array.isArray(manifest) ? manifest : [...(manifest.songs || []), ...(manifest.menu || []).map(f => 'menu/' + f), ...(manifest.match || []).map(f => 'match/' + f)];
  const urls = new Set(), root = new URL(MUSIC_DIR, location.href);
  for (const file of [...MUSIC_FILES, ...listed]) urls.add(new URL(encodeURI(file), root).href);
  for (const dir of [MUSIC_DIR, ...MUSIC_LEGACY_DIRS]) {
    const base = new URL(dir, location.href);
    const html = await fetchWithTimeout(base.href, res => /html/i.test(res.headers.get('content-type') || '') ? res.text() : null);
    const link = /href\s*=\s*["']([^"']+)["']/gi;
    for (let m; html && (m = link.exec(html)); ) {         // links in the server's folder listing
      const url = new URL(m[1], base);
      if (url.pathname.startsWith(base.pathname) && MUSIC_EXTENSIONS.test(url.pathname)) urls.add(url.href);
    }
  }
  PLAYLISTS.menu = PLAYLISTS.match = [...urls];
}
