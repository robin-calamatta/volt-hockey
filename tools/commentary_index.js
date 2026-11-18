// node tools/commentary_index.js   writes assets/commentary/index.json: the clips the game may ask for (it only fetches listed ones)
const fs = require('fs'), dir = __dirname + '/../assets/commentary';
const ids = fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).map(f => f.slice(0, -4)).sort();
fs.writeFileSync(dir + '/index.json', JSON.stringify(ids)); console.log(ids.length, 'clips listed');
