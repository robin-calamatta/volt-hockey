/* v14.3.14 the list of files the game saves on the device so it also starts with no internet (sw.js reads it).
   Netlify runs this on every deploy (netlify.toml). Run it yourself before a drag-and-drop upload:  node tools/make-offline-list.js
   It lists the page, the code, the libraries, the icons, the team logos and the music/commentary lists. The songs and the spoken
   commentary clips (big) are saved as they're played, not up front. The version ("v") changes whenever any listed file changes, which
   tells every device to fetch the new set. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..'), out = [];
const add = rel => { const p = path.join(root, rel); if (fs.existsSync(p) && fs.statSync(p).isFile()) out.push(rel); };
const walk = (dir, test) => { const p = path.join(root, dir); if (!fs.existsSync(p)) return; for (const f of fs.readdirSync(p).sort()) { const rel = dir + '/' + f, full = path.join(root, rel); if (fs.statSync(full).isDirectory()) walk(rel, test); else if (test(f)) out.push(rel); } };
['index.html', 'manifest.webmanifest', 'privacy.html', 'legal.html', 'assets/music/playlist.json', 'assets/commentary/index.json'].forEach(add);
walk('src', f => /\.(js|css|json)$/.test(f)); walk('lib', f => /\.js$/.test(f)); walk('icons', f => /\.(png|svg|ico)$/.test(f)); walk('assets/logos', f => /\.(png|svg|jpg|webp)$/.test(f));
const h = crypto.createHash('sha256'); for (const f of out) h.update(f + '\0').update(fs.readFileSync(path.join(root, f)));
fs.writeFileSync(path.join(root, 'offline-files.json'), JSON.stringify({ v: h.digest('hex').slice(0, 16), files: out }, null, 1));
console.log(`offline-files.json: ${out.length} files`);
