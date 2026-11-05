/* TEAMS: add, remove or edit entries freely (new teams go at the END so saved settings keep pointing at the same team).
   - logo: any square-ish SVG/PNG path (drop files in assets/logos/).
   - color: cart colour (0xRRGGBB). Keep at least two teams.
   - abbr: three letters for tables. rating: how good the team is in Season mode (about 55 to 90): it sets how often they win simulated games and how sharp the CPU plays for them. */
const TEAMS = [
  { id: 'volts', name: 'Volts', abbr: 'VOL', color: 0x19c3ff, rating: 80, logo: 'assets/logos/volts.svg' },
  { id: 'comets', name: 'Comets', abbr: 'COM', color: 0xff3d7f, rating: 74, logo: 'assets/logos/comets.svg' },
  { id: 'timber', name: 'Timber', abbr: 'TIM', color: 0x5fd35f, rating: 66, logo: 'assets/logos/timber.svg' },
  { id: 'ember', name: 'Ember', abbr: 'EMB', color: 0xff9a1f, rating: 71, logo: 'assets/logos/ember.svg' },
  { id: 'phantoms', name: 'Phantoms', abbr: 'PHA', color: 0x9b5de5, rating: 78, logo: 'assets/logos/phantoms.svg' },
  { id: 'titans', name: 'Titans', abbr: 'TIT', color: 0xc1121f, rating: 84, logo: 'assets/logos/titans.svg' },
  { id: 'wolves', name: 'Wolves', abbr: 'WOL', color: 0xc9d6df, rating: 69, logo: 'assets/logos/wolves.svg' },
  { id: 'sharks', name: 'Sharks', abbr: 'SHA', color: 0x0fa3a3, rating: 76, logo: 'assets/logos/sharks.svg' },
  { id: 'cobras', name: 'Cobras', abbr: 'COB', color: 0xb5e61d, rating: 62, logo: 'assets/logos/cobras.svg' },
  { id: 'mustangs', name: 'Mustangs', abbr: 'MUS', color: 0x3a86ff, rating: 72, logo: 'assets/logos/mustangs.svg' },
  { id: 'raptors', name: 'Raptors', abbr: 'RAP', color: 0xd62ff0, rating: 88, logo: 'assets/logos/raptors.svg' },
  { id: 'blizzard', name: 'Blizzard', abbr: 'BLI', color: 0x7cf5c0, rating: 58, logo: 'assets/logos/blizzard.svg' },
  { id: 'stingers', name: 'Stingers', abbr: 'STI', color: 0xffe066, rating: 64, logo: 'assets/logos/stingers.svg' },
  { id: 'phoenix', name: 'Phoenix', abbr: 'PHX', color: 0xff7f6e, rating: 82, logo: 'assets/logos/phoenix.svg' },
  { id: 'knights', name: 'Knights', abbr: 'KNI', color: 0x4b3fd6, rating: 68, logo: 'assets/logos/knights.svg' },
  /* v13.2: national teams */
  ...[['sweden', 'Sweden', 'SWE', 0x2a7fd4, 86], ['denmark', 'Denmark', 'DEN', 0xd8202e, 76], ['usa', 'USA', 'USA', 0x3c5bd6, 88], ['canada', 'Canada', 'CAN', 0xe01d2f, 91],
      ['france', 'France', 'FRA', 0x1f5fc4, 70], ['england', 'England', 'ENG', 0xf2f2f2, 68], ['malta', 'Malta', 'MLT', 0xcf142b, 58], ['australia', 'Australia', 'AUS', 0xffcd00, 64],
      ['finland', 'Finland', 'FIN', 0x2b5fb8, 87], ['norway', 'Norway', 'NOR', 0xba0c2f, 72], ['germany', 'Germany', 'GER', 0x2a2a2a, 79], ['italy', 'Italy', 'ITA', 0x0d9b4f, 66],
      ['switzerland', 'Switzerland', 'SUI', 0xff3b30, 82], ['czechia', 'Czechia', 'CZE', 0x11457e, 84], ['japan', 'Japan', 'JPN', 0xbc002d, 61], ['ireland', 'Ireland', 'IRL', 0x169b62, 60], ['netherlands', 'Netherlands', 'NED', 0xff7f00, 63]]
    .map(([id, name, abbr, color, rating]) => ({ id: 'n_' + id, name, abbr, color, rating, logo: `assets/logos/nat_${id}.svg`, league: 'national' })),
  /* v13.2: cities */
  ...[['barrie', 'Barrie', 'BAR', 0x0b6e4f, 78], ['toronto', 'Toronto', 'TOR', 0x1d3c8f, 84], ['london', 'London', 'LDN', 0x2e7d32, 74], ['kitchener', 'Kitchener', 'KIT', 0x8e1b1b, 72],
      ['niagara', 'Niagara', 'NIA', 0x0277bd, 66], ['ottawa', 'Ottawa', 'OTT', 0xb71c1c, 80], ['hamilton', 'Hamilton', 'HAM', 0xf9a825, 71], ['montreal', 'Montreal', 'MTL', 0x1565c0, 85],
      ['vancouver', 'Vancouver', 'VAN', 0x00897b, 81], ['waterloo', 'Waterloo', 'WAT', 0x5e35b1, 69], ['guelph', 'Guelph', 'GUE', 0xc62828, 63], ['orillia', 'Orillia', 'ORI', 0xff6f00, 60],
      ['sudbury', 'Sudbury', 'SUD', 0x78909c, 65], ['windsor', 'Windsor', 'WSR', 0x8e24aa, 67], ['oshawa', 'Oshawa', 'OSH', 0xef5350, 70], ['kingston', 'Kingston', 'KGN', 0x2e7d32, 68]]
    .map(([id, name, abbr, color, rating]) => ({ id: 'c_' + id, name, abbr, color, rating, logo: `assets/logos/city_${id}.svg`, league: 'cities' }))
];
TEAMS.forEach(t => { t.league = t.league || 'premier'; });
/* the leagues (team categories). Season mode is played in the Premier League. */
const LEAGUES = [{ id: 'premier', name: 'Premier League' }, { id: 'national', name: 'National Teams' }, { id: 'cities', name: 'Cities' }];
const leagueTeams = id => TEAMS.map((t, i) => i).filter(i => TEAMS[i].league === id);
const SEASON_N = leagueTeams('premier').length;                          // (the Premier League teams are TEAMS[0 .. SEASON_N - 1])
/* made-up but steady team ratings for the team-select screen: offence, defence, speed and goalie around the overall rating */
function teamStats(i) { const t = TEAMS[i], h = [...t.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7), v = k => Math.max(40, Math.min(99, Math.round(t.rating + ((h >> (k * 5)) % 15) - 7)));
  return { OVR: t.rating, OFF: v(0), DEF: v(1), SPD: v(2), GOA: v(3) }; }
