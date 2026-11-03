/* The commentary booth: a big bank of play-by-play (and the odd "colour" remark) for every kind of moment.
   Marks at the start of a line: each "!" is one notch of excitement (0-3), "#" hands the line to the colour commentator.
   Placeholders: {who} the player, {team} / {opp} team names, {a} / {o} the scorer's and the other score, {p} the period, {n} a count.
   pick() deals each key's lines out in a shuffled order and also avoids anything said in the last few calls, so you rarely hear the same thing twice. */
const Commentary = {
  recent: [], decks: {},
  bank: {
    open: [
      "!Hello and welcome to Volt Hockey! {team} take on {opp} tonight, and we are ready to go!",
      "!!Good evening, hockey fans! The arena is buzzing, {team} against {opp}, and here we go!",
      "!Power chairs, a hardwood floor, and a whole lot of pride on the line. {team} versus {opp}, let's play!",
      "#Big night for both clubs. {team} and {opp} have been circling this one on the calendar.",
      "!We are LIVE! {team} versus {opp}. Strap in, folks!"],
    drop: [
      "!And the puck is dropped!", "!Play is live!", "We're back underway.", "!Here we go again!", "Face-off done, and they're off!",
      "!The whistle goes and play resumes!", "Puck down, and the battle starts anew."],
    newperiod: [
      "!And we are back for period {p}. It's {a} to {o}.", "Period {p} is underway! {a} to {o} on the board.",
      "!Here comes period {p}! Anybody's game out there!", "#Period {p}. This is where games get won. Keep an eye on the legs out there."],
    switchEnds: [
      "!Half time is done and the teams swap ends! Period {p} is underway, {a} to {o}.", "!We turn it around! The sides switch for period {p}, and it's {a} to {o}.",
      "#New ends, new look. The teams switch sides for period {p}, and the bounces can go the other way.", "!They change ends and we are back at it! {a} to {o} on the board."],
    endperiod: [
      "!That's the horn! End of the period, and it's {a} to {o}.", "And that will do it for this period. {a}, {o}.",
      "!Time! The period is over with the score at {a} to {o}.", "#Good hockey so far. Both benches will want to catch their breath."],
    overtime: [
      "!!We're tied at the horn and we are going to sudden death! Next goal wins it!",
      "!!Overtime! Overtime! Everything on the line, one goal takes it all!", "!!Level after regulation! Golden goal overtime, ladies and gentlemen!",
      "#Sudden death. One mistake and it's over. Nobody blinks here."],
    final: [
      "!!That's the game! {team} take it, {a} to {o}!", "!!It is over! {team} win {a} to {o}! What a performance!",
      "!The final horn sounds, and {team} come away with it, {a} to {o}.", "!!Final score, {team} {a}, {opp} {o}. Take a bow!"],
    shootout: [
      "!!The sudden death clock runs out! It goes to the tiebreaker and {team} get the nod on shots!",
      "!!No goal in overtime, and the shot count decides it! {team} take it!"],
    goal: [
      "!!!GOAL! GOAL! {who} scores for {team}! It's {a} to {o}!", "!!!He shoots, he SCORES! {who}! Absolutely buried!{tail}",
      "!!!Oh, what a shot by {who}! {team} light the lamp!{tail}", "!!!THERE IT IS! {who} finds the net! Unbelievable!{tail}",
      "!!!{who} with the goal! Did you SEE that?!{tail}", "!!!Back of the net! {who} is on fire!{tail}",
      "!!!Bang! {who} lets it fly and it's IN! {team} score!{tail}", "!!!Yes! YES! {who} puts it away!{tail}",
      "!!!Wow! A beauty from {who}! {team} are on the board!{tail}", "!!!He's done it! {who}! The crowd goes wild!{tail}",
      "!!!Goal for {team}! {who} with the finish!{tail}", "!!!Sweet mercy, what a goal from {who}!{tail}",
      "!!!{who}! Right through the goalie! {team} score!{tail}", "!!!Pure magic from {who}! Pure magic!{tail}"],
    goalFirst: [
      "!!!First blood goes to {team}! {who} opens the scoring!", "!!!We have a goal! {who} breaks the ice for {team}!",
      "!!!{who} scores the first of the night! {team} lead one to nothing!", "!!!The scoreboard is lit! {who} gets {team} on the board first!"],
    goalTie: [
      "!!!HE'S TIED IT! {who} levels it at {a}! What a response!", "!!!All square! {who} brings {team} right back into it, {a} to {a}!",
      "!!!Equalizer! {who} with the big one for {team}!", "!!!They are tied! {who} does it when they needed it most!"],
    goalLead: [
      "!!!{team} take the lead! {who} with the go-ahead goal, {a} to {o}!", "!!!And they're in front! {who} puts {team} ahead, {a} to {o}!",
      "!!!What a time for it! {who} gives {team} the lead!", "!!!{who} flips the whole game on its head! {team} lead {a} to {o}!"],
    goalExtend: [
      "!!!{who} adds to the lead! {team} are pulling away, {a} to {o}!", "!!!Another one! {who} makes it {a} to {o} and this is getting out of hand!",
      "!!!{team} are rolling! {who} scores again, {a} to {o}!", "!!!The lead grows! {who} with a gorgeous finish, it's {a} to {o}!"],
    goalCut: [
      "!!!{who} gets one back! {opp} are hanging on, it's {o} to {a}!", "!!!We have a game! {who} pulls {team} to within {n}!",
      "!!!{who} keeps {team} alive! It's {o} to {a} now!"],
    goalLate: [
      "!!!Late, late, LATE! {who} scores with time running out!", "!!!In the dying seconds! {who} with the goal! Unbelievable!"],
    goalHat: [
      "!!!HAT TRICK! {who} has three! Throw the hats on the floor!", "!!!{who} with the third! That is a HAT TRICK, folks!",
      "!!!{who} again! That is {n} for the night! Somebody stop this player!"],
    goalBrace: [
      "!!!{who} with his second of the night! He is cooking!", "!!!A brace for {who}! Two goals and counting!",
      "!!!{who} again! That's two! This player is locked in!"],
    own: [
      "!!Oh no! That one went off the wrong stick! {team} get the goal!", "!!An own goal! You could hear a pin drop. {team} take it, {a} to {o}.",
      "!!Ouch! A bad bounce and it's in their own net! That's going to sting."],
    shot: [
      "!{who} lets one go!", "!!Shot! {who} fires!", "!{who} with the shot!", "!!Here comes the shot from {who}!", "!{who} rips it on net!",
      "!!{who} winds up and fires!", "!Quick release from {who}!", "!!{who} tests the goalie!", "!{who} throws it toward the net!",
      "!!A hard one from {who}!", "!{who} fires it in!", "!!{who} shoots, and the goalie has to be sharp!"],
    save: [
      "!!Saved! What a stop by the goalie!", "!!The goalie says no! Great save!", "!!Robbed! The goalie robs {who}!", "!!A big save, and the crowd loves it!",
      "!!He got a piece of it! Huge stop!", "!!Denied! {who} can't believe it!", "!The goalie covers the angle and turns it away.",
      "!!The wall holds firm! Fantastic save!", "!!Not today! The goalie is standing on his head!"],
    nearmiss: [
      "!!Oh, so close! Just wide!", "!!Off the post! Inches away!", "!!He missed it by a whisker! Can you believe that?", "!Just a touch off target."],
    hit: [
      "!!Ooh, that was a big hit!", "!!{who} and {who2} collide! Heavy contact!", "!!Wow! They are not holding anything back out there!",
      "!!That one was felt in the cheap seats!", "!!Bang! A thunderous check along the boards!", "!!Somebody felt that one tomorrow!",
      "!!Big collision! Both carts rocking from the impact!", "!!That's physical hockey right there!"],
    penalty: [
      "!!The whistle goes! {who} is off for {why}. {team} will be shorthanded!", "!!Penalty on {who}! Off to the sin bin for {why}!",
      "!!He has to go! {who} for {why}!", "!{who} heads to the box. Careless play there.", "#That's the kind of thing that costs you a game. {who} gave them a power play.",
      "!!A foul on {who}! {team} will have to kill this one off!", "!The referee has seen enough. {who} takes a seat for {why}."],
    powerplay: [
      "!A man advantage now. Can they make it count?", "#Power play time. Watch for the pass across the crease.", "!{team} are a cart down. Time to dig in!"],
    goalie: [
      "!!Goalie reset! Nobody wants it, so it's back to centre!", "!The ball is dead in the crease. Goalie reset, back to the middle!",
      "!!And the goalie reset sends it back out! Clean slate!"],
    frozen: [
      "!The puck is frozen! Face-off!", "!Nobody can pry it loose. The officials blow it dead and we go to a face-off.", "!!Whistle! It's stuck in the corner. Face-off time!",
      "#That is a classic scramble. Eight carts and one ball, there's only so much room back there."],
    oneMin: [
      "!!One minute left! The clock is ticking!", "!!Sixty seconds to go! Here comes the push!", "!!A minute remaining and the tension is unreal!",
      "#One minute. This is when legs get heavy and mistakes happen."],
    tenSec: [
      "!!!Ten seconds! Ten seconds left!", "!!!Time is running out! Ten seconds on the clock!", "!!!Final ten seconds, the bench is on its feet!"],
    rush: [
      "!!Here's a rush! {who} is flying up the court!", "!!{who} is moving! Look at that speed!", "!{who} gathers it up and heads for the other end!",
      "!!Breakaway! {who} is in all alone!", "!!{who} has some wheels! Off to the races!", "!{who} streaks down the court!"],
    pass: [
      "!Nice pass from {who}!", "!Beautiful tic-tac-toe passing there!", "!A slick feed from {who}!", "!{who} threads the needle!",
      "{who} moves it along.", "!!What a pass! {who} finds the open cart!", "{who} with the quick give-and-go."],
    steal: [
      "!{who} picks the pocket! Turnover!", "!!Takeaway by {who}!", "!{who} steals it!", "!!Turnover! {who} takes it the other way!", "!{who} with the strip, and they're going back the other way!"],
    corner: [
      "#A scrum in the corner now. Nobody wants to give an inch.", "The ball is tied up along the boards.", "!They're digging for it along the boards!",
      "#Dirty work in the corner. This is where games are won."],
    lull: [
      "#{team} have {sa} shots to {sb} so far. The shot count tells a story.", "#It's been a tight game. Neither team wants to give an inch.",
      "#Look at the discipline on both sides. Real structure out there.", "#{opp} have not found their rhythm yet. They need to settle down.",
      "#You have to like the way {team} are moving the ball tonight.", "A back-and-forth affair here at the Volt Arena.",
      "#The pace has really picked up. Both teams are skating hard.", "#The goalies have been the story tonight. Calm under pressure.",
      "The crowd is on its feet. You can feel the energy in here.", "#Nice work in the neutral zone, taking away the time and space.",
      "#That's the kind of tempo coaches dream about. Fast and clean.", "#It's {a} to {o}. One bounce could change everything."],
    comeback: [
      "!!A comeback is brewing! {team} refuse to go away!", "!!Momentum is swinging! {team} smell blood!"],
    shutout: [
      "#Still no goals against {team}. They are playing like a brick wall.", "#A shutout in the works for {team}."]
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
  text(e) { return this.raw(e).replace(/^[!#]*/, '').replace(/\{(\w+)\}/g, (_, k) => (e.v[k] === undefined ? '' : e.v[k])).replace(/\s+/g, ' ').trim(); },
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
        const key = this.nameKey(v[k]), id = this.nameId(voice, hi, key);
        if (key && (has ? has(id) : this.NAMES.some(n => this.nameKey(n) === key))) out.push(id);        // a name we have recorded: say it
        else { team(v[k + 'T']); frag('number'); num(v[k + 'N']); }                                         // anything else: "Volts number two"
      }
      else if (k === 'tail') { num(v.a); frag('to'); num(v.o); }
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
      for (let n = 0; n <= 20; n++) add(this.numId(voice, hi, n), voice, hi, String(n) + (hi ? '!' : '.'));
      for (const w of this.WHYS) add(this.whyId(voice, hi, w), voice, hi, w + (hi ? '!' : '.'));
      if (voice === 'pbp') for (const nm of this.NAMES) add(this.nameId(voice, hi, this.nameKey(nm)), voice, hi, nm + (hi ? '!' : '.'));
    }
    return [...clips.values()];
  }
};
