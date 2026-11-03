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
  { id: 'knights', name: 'Knights', abbr: 'KNI', color: 0x4b3fd6, rating: 68, logo: 'assets/logos/knights.svg' }
];
