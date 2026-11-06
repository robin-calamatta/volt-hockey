/* Run this before uploading your game to a host that doesn't show folder listings (Netlify, GitHub Pages, Wix...):
     node tools/make-playlist.js
   It reads the songs in assets/music/menu/ (menu music), assets/music/game/ (game music) and assets/music/intro/ (the opening splash) and writes assets/music/playlist.json,
   which the game loads. (assets/music/match/ still counts as game music; songs loose in assets/music/ play in both.)
   Re-run it whenever you add or remove songs. Needs Node.js, nothing to install. */
const fs = require('fs'), path = require('path');
const EXTENSIONS = /\.(mp3|ogg|oga|opus|wav|m4a|aac|flac|webm)$/i;
const musicRoot = path.join(__dirname, '..', 'assets', 'music');
const list = sub => { const dir = path.join(musicRoot, sub); return fs.existsSync(dir) ? fs.readdirSync(dir).sort().filter(f => EXTENSIONS.test(f) && fs.statSync(path.join(dir, f)).isFile()).map(f => sub ? sub + '/' + f : f) : []; };
const out = { menu: list('menu'), game: [...list('game'), ...list('match')], intro: list('intro'), songs: list('') };
console.log(`${out.menu.length} menu song(s), ${out.game.length} game song(s), ${out.intro.length} intro song(s), ${out.songs.length} in both`);
fs.writeFileSync(path.join(musicRoot, 'playlist.json'), JSON.stringify(out, null, 2));
console.log('Wrote assets/music/playlist.json');
