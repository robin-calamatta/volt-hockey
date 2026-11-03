// node tools/dump_commentary.js > clips.json   (the list of every spoken clip, for tools/make_commentary.py)
const fs = require('fs'), vm = require('vm'), ctx = { console }; vm.createContext(ctx);
for (const f of ['teams', 'commentary']) vm.runInContext(fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8') + '\n', ctx);
console.log(JSON.stringify(vm.runInContext('Commentary.allClips(TEAMS)', ctx)));
