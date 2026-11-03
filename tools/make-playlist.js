/* Run this before uploading your game to a host that doesn't show folder listings (Netlify, GitHub Pages, Wix...):
     node tools/make-playlist.js
   It reads every song in assets/music/ (and the older menu/ and match/ subfolders) and writes assets/music/playlist.json, which the game loads.
   Re-run it whenever you add or remove songs. Needs Node.js, nothing to install. */
const fs = require('fs'), path = require('path');
const EXTENSIONS = /\.(mp3|ogg|oga|opus|wav|m4a|aac|flac|webm)$/i;
const musicRoot = path.join(__dirname, '..', 'assets', 'music'), songs = [];
for (const sub of ['', 'menu', 'match']) {
  const dir = path.join(musicRoot, sub);
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).sort()) if (EXTENSIONS.test(f) && fs.statSync(path.join(dir, f)).isFile()) songs.push(sub ? sub + '/' + f : f);
}
console.log(songs.length + ' song(s)', songs);
fs.writeFileSync(path.join(musicRoot, 'playlist.json'), JSON.stringify({ songs }, null, 2));
console.log('Wrote assets/music/playlist.json');
