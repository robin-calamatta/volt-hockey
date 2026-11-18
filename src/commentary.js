/* The commentary booth: a big bank of play-by-play (and the odd "colour" remark) for every kind of moment.
   Marks at the start of a line: each "!" is one notch of excitement (0-3), "#" hands the line to the colour commentator.
   Placeholders: {who} the player, {team} / {opp} team names, {a} / {o} the scorer's and the other score, {p} the period, {n} a count.
   pick() deals each key's lines out in a shuffled order and also avoids anything said in the last few calls, so you rarely hear the same thing twice. */
const Commentary = {
  recent: [], decks: {},
  bank: {
    /* v14.3.25 rewritten for an NFL-style booth: short, punchy calls that build, a play-by-play man who gets loud on the big moments and
       quiet in between, and a colour man who reacts after them. {who} is "Comets number three" (or a recorded name), {score} "two to one". */
    open: [
      "Good evening, everybody, and welcome to Volt Hockey! {team}, and {opp}. This place is packed!",
      "!Hello, everybody! What a night for hockey! {team} against {opp}, and we are ready to roll!",
      "Welcome in, folks! {team} and {opp}. The building is full, and the energy is unreal!",
      "#You can feel it in here tonight. These two do not like each other.",
      "#{team}, and {opp}. Circle this one, folks. It's going to be a battle."],
    drop: [
      "!And we are underway!", "Here we go. Ball is dropped.", "!Here we go again!", "Ball is down, and we're back at it.", "!Off we go!",
      "And play resumes.", "!Ball is dropped, and the battle is on!"],
    newperiod: [
      "Back for period {p}. It's {score}.", "!Period {p} is underway! {score} on the board.", "!Here comes period {p}! Anybody's game!",
      "#Period {p}. This is where games get won. Watch the legs out there."],
    switchEnds: [
      "!The teams change ends! Period {p}, and it's {score}.", "!We turn it around! Period {p} is underway, {score}.",
      "#New end, new look. The bounces can go the other way now.", "!Sides switched, and we are back at it!"],
    endperiod: [
      "!And there's the horn! End of the period. {score}.", "That will do it for the period. {score}.", "!Time! The period is over. {score}.",
      "#Good hockey so far. Both benches need a breather."],
    overtime: [
      "!!!We are tied at the horn! Sudden death! Next goal wins it!", "!!!Overtime! Overtime! One goal takes it all!",
      "!!!All square after regulation! Golden goal overtime, ladies and gentlemen!", "#Sudden death. One mistake and it's over. Nobody blinks."],
    final: [
      "!!!That's the ball game! {team} win it! {score}!", "!!!It is over! {team} take it! {score}! What a performance!",
      "!!And there's the final horn! {team} come away with it, {score}.", "!!!Final score! {team}, {score}! Take a bow!"],
    shootout: [
      "!!!Nobody scores in overtime, and it goes to the shot count! {team} get the win!", "!!!Overtime runs out! The shot count decides it! {team} take it!"],
    goal: [
      "!!!He shoots, he SCORES! {who}! {score}!", "!!!GOAL! GOAL! {who}! What a finish!", "!!!Oh, what a shot! {who}! It's {score}!",
      "!!!THERE IT IS! {who}! Right in the back of the net!", "!!!Did you SEE that?! {who}! Unbelievable!", "!!!Bang! {who} lets it go, and it's IN!",
      "!!!Yes! YES! {who} buries it! {score}!", "!!!Oh, a beauty! {who}! The building is ROCKING!", "!!!Goal! {team}! {who} with the finish!",
      "!!!Are you kidding me?! {who}! Right through him!", "!!!Pure magic! {who}! Pure magic!"],
    goalFirst: [
      "!!!First blood! {who}! {team} strike first!", "!!!We have a goal! {who} breaks the ice!", "!!!{who}! Scores the first of the night! {team} lead!",
      "!!!And the scoreboard is lit! {who}! {team} on the board!"],
    goalTie: [
      "!!!HE'S TIED IT! {who}! {score}! What a response!", "!!!All square! {who}! We are tied, {score}!", "!!!The equalizer! {who}! {team} are right back in this!",
      "!!!Tie game! {who}! When they needed it most!"],
    goalLead: [
      "!!!{team} take the lead! {who}! {score}!", "!!!And they're in front! {who}! {team} lead, {score}!", "!!!What a time for it! {who}! The go ahead goal!",
      "!!!{who}! Flips the whole game! {team} lead it, {score}!"],
    goalExtend: [
      "!!!Another one! {who}! It's {score}!", "!!!{team} are rolling! {who}! {score}, and this is getting out of hand!", "!!!The lead grows! {who}! {score}!",
      "!!!And again! {who}! {team} pulling away!"],
    goalCut: [
      "!!!{who}! Gets one back! It's {score}!", "!!!We have a hockey game! {who}! {team} within {n}!", "!!!{who}! Keeps them alive! {score}!"],
    goalLate: [
      "!!!Late, late, LATE! {who}! With time running out!", "!!!In the dying seconds! {who}! Unbelievable!"],
    goalHat: [
      "!!!HAT TRICK! {who}! Throw your hats on the floor!", "!!!That is three! {who}! A HAT TRICK, folks!", "!!!{who} again! That is {n} tonight! Somebody stop this player!"],
    goalBrace: [
      "!!!{who} again! That's two for the night! He is cooking!", "!!!Two goals! {who}! This player is locked in!", "!!!{who}! Again! Make it a pair!"],
    own: [
      "!!Oh no! Off the wrong stick, and it's in! {team} get the goal.", "!!An own goal! You could hear a pin drop. {score}.", "!!Ouch! A bad bounce, into his own net!"],
    shot: [
      "!!Shot!", "!!He shoots!", "!!{who}, fires!", "!!Here's the shot! {who}!", "!!{who} lets it go!", "!!{who} winds up, and fires!",
      "!!Quick release! {who}!", "!!{who}, on net!", "!!A hard one! {who}!", "!!{who} rips it!"],
    save: [
      "!!!Saved! Oh, what a stop!", "!!!The goalie says no!", "!!!Robbed! {who} is robbed!", "!!!And a big save! The crowd loves it!",
      "!!He got a piece of it! Huge stop!", "!!!Denied! {who} can't believe it!", "!!Turned away!", "!!!The wall holds! Fantastic save!",
      "!!!Not today! The goalie is standing on his head!"],
    nearmiss: [
      "!!!Oh, so close! Just wide!", "!!!Off the post! Inches away!", "!!!Oh, he missed it by a whisker!", "!!Just off target."],
    hit: [
      "!!!Oh, BIG hit!", "!!{who}, and {who2}! Heavy contact!", "!!!Whoa! They are not holding back out there!", "!!!That one was felt in the cheap seats!",
      "!!!Bang! A thunderous check along the boards!", "!!!Somebody is going to feel that one tomorrow!", "!!Big collision!", "!!That is physical hockey right there!"],
    penalty: [
      "!!The whistle goes! {who}, is off for {why}.", "!!Penalty! {who}! Off to the box for {why}!", "!!He has to go! {who}, for {why}!",
      "!{who}, heads to the box. Careless play.", "#That's the kind of thing that costs you a game. {who} gave them a power play.",
      "!!A foul! {who}! {team} will have to kill this one off!", "!The referee has seen enough. {who}, takes a seat."],
    powerplay: [
      "!A man advantage now. Can they make it count?", "#Power play time. Watch for the pass across the crease.", "!{team} are a cart down. Time to dig in!"],
    goalie: [
      "!!Goalie reset! Back to centre!", "!The ball is dead in the crease. Goalie reset.", "!!And the goalie reset! Clean slate!"],
    frozen: [
      "!The ball is frozen. Face off!", "!Nobody can pry it loose. We go to a face off.", "!!Whistle! It's stuck in the corner!",
      "#That is a scramble. Eight carts and one ball. There's only so much room back there."],
    oneMin: [
      "!!One minute left! The clock is ticking!", "!!Sixty seconds to go! Here comes the push!", "!!A minute remaining, and the tension is unreal!",
      "#One minute. This is when legs get heavy and mistakes happen."],
    tenSec: [
      "!!!Ten seconds! Ten seconds left!", "!!!Time is running out! Ten seconds!", "!!!Final ten seconds! The bench is on its feet!"],
    rush: [
      "!!Here's a rush! {who}! Flying up the court!", "!!{who}! Look at the speed!", "!!{who}, gathers it up, and they're off!",
      "!!!Breakaway! {who}! All alone!", "!!{who} has wheels! Off to the races!", "!!{who}, streaking down the court!"],
    pass: [
      "!Nice pass! {who}!", "!Beautiful passing there!", "!A slick feed! {who}!", "!{who}, threads the needle!", "{who}, moves it along.",
      "!!What a pass! {who}!", "{who}, with the give and go."],
    steal: [
      "!!Picked off! {who}!", "!!Takeaway! {who}!", "!!{who}! Steals it!", "!!Turnover! {who}, takes it the other way!", "!!Oh, stripped! {who}, and they're gone!"],
    corner: [
      "#A scrum in the corner now. Nobody wants to give an inch.", "Ball's tied up along the boards.", "!They're digging for it along the boards!",
      "#Dirty work in the corner. This is where games are won."],
    lull: [
      "#{team} have {sa} shots, to {sb}. The shot count tells a story.", "#A tight one so far. Neither team wants to give an inch.",
      "#Look at the discipline on both sides. Real structure out there.", "#{opp} haven't found their rhythm yet. They need to settle down.",
      "#You have to like the way {team} are moving the ball tonight.", "A back and forth affair here at the Volt Arena.",
      "#The pace has really picked up. Both teams are flying.", "#The goalies have been the story tonight. Calm under pressure.",
      "The crowd is on its feet. You can feel the energy in here.", "#Nice work through the middle, taking away time and space.",
      "#That's the tempo coaches dream about. Fast, and clean.", "#It's {score}. One bounce could change everything."],
    comeback: [
      "!!A comeback is brewing! {team} refuse to go away!", "!!Momentum is swinging! {team} smell blood!"],
    shutout: [
      "#Still nothing against {team}. They're playing like a brick wall.", "#A shutout in the works for {team}."],
    /* the colour man's reaction a couple of seconds after a big moment */
    rGoal: [
      "#That is a big time play right there. Patience, patience, and then, bang.", "#Oh, you have to love that. He saw it before anybody else did.",
      "#What a finish. The goalie had no chance on that one.", "#That's veteran hockey. Get to the dirty areas, and good things happen.",
      "#Look at the release on that. Quick, and right where it needed to be.", "#The whole building knew it was going in."],
    rSave: [
      "#Are you kidding me? He got everything on that one.", "#That is a game changing save right there.", "#Square to the shooter, and he made it look easy.",
      "#The goalie is in their heads now. You can see it."],
    rHit: [
      "#You don't see hits like that every night.", "#He's going to feel that one in the morning.", "#Clean hit. Shoulder to shoulder. That's the game."],
    /* v14.3.25 the running play-by-play: who has the ball and what they're doing, every second or two (keys starting "pz"). {who} is
       "Number 3" (or the player's name when the admin page says names and that name is recorded). They never talk over another call. */
    pzHas: ["{who}, has it.", "{who}, picks it up.", "{who}, with the ball.", "{who}, gathers it in.", "Here's {who}.", "{who}, on the ball."],
    pzPass: ["{who}, to {who2}.", "{who}, over to {who2}.", "{who}, feeds {who2}.", "{who}, finds {who2}.", "{who}, slides it to {who2}.", "{who}, drops it for {who2}."],
    pzTake: ["!Picked off! {team}! {who}.", "!Turnover! {team} ball! {who}.", "!{who}, picks it off! {team}!", "!{who}, steals it! {team}!", "!Oh, stripped! {team}, {who}."],
    pzWin: ["{team} come up with it. {who}.", "{team} win it. {who}.", "{who}, wins it for {team}.", "{team} ball. {who}."],
    pzOwn: ["{who}, starts it up.", "{who}, out of the end.", "{who}, turns it up the court.", "{who}, looking up the court.", "{who}, wheels out of the corner."],
    pzMid: ["{who}, through the middle.", "{who}, across centre.", "{who}, carrying it through centre.", "{who}, at centre, looking for room."],
    pzLeft: ["{who}, up the left side.", "{who}, down the left wing.", "{who}, wide on the left."],
    pzRight: ["{who}, up the right side.", "{who}, down the right wing.", "{who}, wide on the right."],
    pzZone: ["!{who}, into the zone!", "!{who}, gets it deep!", "{who}, sets up in the zone.", "!{who}, looking for a shot!", "{who}, with time out there.", "!{who}, drives to the net!"],
    pzBoards: ["{who}, along the boards.", "{who}, working the wall.", "{who}, digs it off the boards."],
    pzBehind: ["{who}, behind the net.", "{who}, wraps around the back.", "{who}, circles behind the goal."],
    pzHold: ["{who}, still has it.", "{who}, keeps it.", "{who}, waiting for support.", "{who}, slows it down.", "{who}, protecting it."],
    pzLoose: ["Loose ball!", "It's loose!", "Up for grabs!", "Loose in the middle!", "Nobody has control!", "Scramble for it!"]
  },
  /* A call is an "entry": { k: key, i: line number, v: the filled-in values }. It is small enough to send to online clients, who turn it into
     the same caption and the same recorded clips. */
  pick(key, vars = {}) {
    const lines = this.bank[key]; if (!lines) return null;
    let deck = this.decks[key];
    if (!deck || !deck.length) deck = this.decks[key] = lines.map((_, i) => i).sort(() => Math.random() - 0.5);
    let idx = deck.pop(), tries = 0;
    while (this.recent.includes(key + idx) && deck.length && tries++ < 6) { const j = deck.pop(); deck.unshift(idx); idx = j; }   // skip anything said very recently
    this.recent.push(key + idx); if (this.recent.length > 24) this.recent.shift();
    return { k: key, i: idx, v: vars };
  },
  raw(e) { const l = e && this.bank[e.k]; return l ? l[e.i] || '' : ''; },
  text(e) { return this.raw(e).replace(/^[!#]*/, '').replace(/\{(\w+)\}/g, (_, k) => (k === 'score' ? (e.v.a === undefined ? '' : `${e.v.a} to ${e.v.o}`) : e.v[k] === undefined ? '' : e.v[k])).replace(/\s+/g, ' ').trim(); },
  parse(e) { const m = /^([!#]*)/.exec(this.raw(e)); return { text: this.text(e), mood: (m[1].match(/!/g) || []).length, colour: m[1].includes('#'), entry: e }; },

  /* ----- recorded clips: each line is spoken as a chain of short clips (the wording, then a team name, a number...) ----- */
  hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); },
  slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24); },
  clean(s) { return s.replace(/^[\s!.,?:;]+/, '').replace(/\s+/g, ' ').trim(); },
  pre(voice, hi) { return voice + (hi ? 'h' : 'l') + '_'; },
  fragId(voice, hi, text) { return this.pre(voice, hi) + 'f_' + this.slug(text) + '_' + this.hash(text); },
  teamId(voice, hi, tid) { return this.pre(voice, hi) + 't_' + tid; },
  numId(voice, hi, n) { return this.pre(voice, hi) + 'n_' + n; },
  whyId(voice, hi, text) { return this.pre(voice, hi) + 'w_' + this.slug(text); },
  NAMES: 'Robin Sparky Bolt Turbo Nitro Ace Rocket Blaze Zap Comet Maverick Viper Storm Dash Titan Echo Pixel Jolt Rogue Flash Gizmo Alex Andrew Anthony Ben Benjamin Brandon Brian Caleb Cameron Carter Charlie Chris Christian Colin Connor Daniel David Dylan Eli Elijah Ethan Evan Felix Finn Gabriel George Henry Hunter Ian Isaac Jack Jackson Jacob Jake James Jason Jayden Jeremy Joe John Jonathan Jordan Joseph Joshua Julian Justin Kevin Kyle Landon Leo Liam Logan Lucas Luke Marcus Mason Matt Matthew Max Michael Mike Nathan Nick Nicholas Noah Oliver Owen Patrick Paul Peter Ryan Sam Samuel Scott Sean Seth Simon Spencer Stephen Steve Thomas Tim Todd Tom Tyler Victor Vincent Will William Wyatt Xavier Zach Zachary Abby Abigail Alexis Alice Alicia Amanda Amber Amy Andrea Angela Anna Ashley Audrey Ava Bella Brooke Caitlin Carla Chloe Claire Daisy Diana Ella Ellie Emily Emma Eva Faith Fiona Grace Hailey Hannah Holly Isabella Isla Jade Jasmine Jenna Jennifer Jessica Julia Kate Katie Kayla Kelly Laura Lauren Layla Lily Lucy Madison Maria Maya Megan Mia Mila Molly Naomi Natalie Nicole Olivia Paige Rachel Rebecca Riley Rose Ruby Samantha Sara Sarah Sophia Sophie Stella Taylor Victoria Zoe Dad Mom Bro Sis Champ Legend Tank Ninja Wolf Tiger Shadow Ghost Hawk Phoenix Dragon Thunder Lightning Jedi Vader Mario Luigi'.split(' '),
  nameKey(n) { return String(n || '').toLowerCase().replace(/[^a-z]/g, ''); },
  nameId(voice, hi, key) { return this.pre(voice, hi) + 'm_' + key; },
  nwId(voice, hi, n) { return this.pre(voice, hi) + 'nw_' + n; },
  tnId(voice, hi, tid, n) { return this.pre(voice, hi) + 'tn_' + tid + '_' + n; },     // v14.3.25 "Comets number three" as one clip
  scId(voice, hi, a, o) { return this.pre(voice, hi) + 'sc_' + a + '_' + o; },          // "two to one" as one clip
  SAY_NUM(n) { return this.NUMW[n] || String(n); },
  NUMW: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'],
  WHYS: ['a foul', 'being in the crease', 'a hit', 'charging', 'a late hit'],
  segments(e, has) {                                    // the clip ids that say this call, in order
    const raw = this.raw(e), m = /^([!#]*)/.exec(raw), hi = (m[1].match(/!/g) || []).length >= 2, voice = m[1].includes('#') ? 'col' : 'pbp', out = [], v = e.v || {};
    const team = name => { const t = typeof TEAMS !== 'undefined' && TEAMS.find(x => x.name === name); return t ? out.push(this.teamId(voice, hi, t.id)) : 0; };
    const num = n => { n = n === 'one' ? 1 : +n; if (isFinite(n)) out.push(this.numId(voice, hi, Math.max(0, Math.min(20, n)))); };
    const frag = t => { t = this.clean(t); if (t && /[a-z0-9]/i.test(t)) out.push(this.fragId(voice, hi, t)); };
    for (const part of raw.slice(m[1].length).split(/(\{\w+\})/)) {
      const ph = /^\{(\w+)\}$/.exec(part);
      if (!ph) { frag(part); continue; }
      const k = ph[1];
      if (k === 'team' || k === 'opp') team(v[k]);
      else if (k === 'who' || k === 'who2') {
        if (!v[k]) continue;
        const key = this.nameKey(v[k]), id0 = this.nameId(voice, hi, key), id1 = this.nameId(voice, false, key), id = has && !has(id0) && has(id1) ? id1 : id0;
        if (key && (has ? has(id) : this.NAMES.some(n => this.nameKey(n) === key))) out.push(id);        // a name we have recorded: say it
        else { const n = Math.max(0, Math.min(20, +v[k + 'N'] || 0)), t = typeof TEAMS !== 'undefined' && TEAMS.find(x => x.name === v[k + 'T']), tn = t && this.tnId(voice, hi, t.id, n), nw = this.nwId(voice, hi, n);
          if (!v[k + 'Q'] && tn && (!has || has(tn))) out.push(tn);                     // "Comets number three": one clip
          else { if (!v[k + 'Q']) team(v[k + 'T']); if (!has || has(nw)) out.push(nw); else { frag('number'); num(n); } } }   // "(Comets) number three"
      }
      else if (k === 'tail' || k === 'score') { if (v.a === undefined) continue; const a = +v.a, o = +v.o, id = this.scId(voice, hi, a, o); if (a <= 9 && o <= 9 && (!has || has(id))) out.push(id); else { num(a); frag('to'); num(o); } }
      else if (k === 'why') { if (v.why) out.push(this.whyId(voice, hi, v.why)); }
      else if (v[k] !== undefined) num(v[k]);
    }
    return out;
  },
  allClips(teams) {                                // every clip the game can ask for: for the offline renderer (tools/make_commentary.js)
    const clips = new Map(), add = (id, voice, hi, text) => clips.set(id, { id, voice, hi, text });
    for (const key in this.bank) for (const raw of this.bank[key]) {
      const m = /^([!#]*)/.exec(raw), hi = (m[1].match(/!/g) || []).length >= 2, voice = m[1].includes('#') ? 'col' : 'pbp';
      for (const part of raw.slice(m[1].length).split(/(\{\w+\})/)) if (!/^\{/.test(part)) { const t = this.clean(part); if (t && /[a-z0-9]/i.test(t)) add(this.fragId(voice, hi, t), voice, hi, t); }
    }
    for (const [voice, hi] of [['pbp', false], ['pbp', true], ['col', false]]) {
      for (const t of ['to', 'number']) add(this.fragId(voice, hi, t), voice, hi, t);
      for (const t of teams) add(this.teamId(voice, hi, t.id), voice, hi, t.name + (hi ? '!' : '.'));
      for (let n = 0; n <= 20; n++) add(this.numId(voice, hi, n), voice, hi, this.SAY_NUM(n) + (hi ? '!' : '.'));
      for (let n = 1; n <= 10; n++) add(this.nwId(voice, hi, n), voice, hi, 'Number ' + this.NUMW[n] + (hi ? '!' : ','));
      if (voice === 'pbp') for (const t of teams) for (let n = 1; n <= 6; n++) add(this.tnId(voice, hi, t.id, n), voice, hi, t.name + ' number ' + this.NUMW[n] + (hi ? '!' : ','));
      if (voice === 'pbp') for (let a = 0; a <= 9; a++) for (let o = 0; o <= 9; o++) add(this.scId(voice, hi, a, o), voice, hi, (a ? this.NUMW[a] : 'nothing') + ' to ' + (o ? this.NUMW[o] : 'nothing') + (hi ? '!' : '.'));
      for (const w of this.WHYS) add(this.whyId(voice, hi, w), voice, hi, w + (hi ? '!' : '.'));
      if (voice === 'pbp' && !hi) for (const nm of this.NAMES) add(this.nameId(voice, hi, this.nameKey(nm)), voice, hi, nm + ',');   // (names: one recording each, used at any energy)
    }
    return [...clips.values()];
  }
};
