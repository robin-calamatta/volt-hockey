/* v14.1: lots more 8-bit music. Still only when your music folders are empty (your own songs always win).
   - Pools that shuffle: the menus, Volt Hockey, Volt Royale, racing and driving games, and the party minigames. A new song each time the
     music starts, and a long session moves on to another song in the same pool every couple of minutes. The original two tunes are in there too.
   - The songs are written by a little composer from a seed (key, chords, groove, a melody built from a motif), so each one is its own tune.
   - Emotes have their own little jingles: dances get a groove, cheers a fanfare, a salute gets a bugle, thinking gets something puzzled... */
const Chip = {
  NAMES: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  n(m) { return this.NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); },
  rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); },
  SCALE: { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixo: [0, 2, 4, 5, 7, 9, 10] },
  DRUMS: {
    rock: 'K . H . S . H . K . H K S . H .', four: 'K . H . S . H . K . H . S . H H', half: 'K . H . . . H . S . H . . . H .', brk: 'K . H K S . H . . K H . S . H H',
    shuffle: 'K . . H S . . H K . . H S . H .', gallop: 'K . K H S . H . K . K H S . H H', march: 'K . S . K . S . K . S S K . S .'
  },
  RHYTHMS: [[4, 2, 2, 4, 4], [3, 3, 2, 4, 4], [2, 2, 2, 2, 4, 4], [6, 2, 4, 4], [2, 2, 4, 2, 2, 4], [3, 3, 4, 2, 2, 2], [1, 1, 2, 4, 4, 4], [4, 4, 2, 2, 4]],
  /* one song: { seed, bpm, root (midi of the key note, octave 4), mode, prog (scale degrees per bar, 4 or 8), bass, drums, lead, arp } */
  song(o) {
    const R = this.rng(o.seed), sc = this.SCALE[o.mode || 'major'], prog = o.prog.length === 4 ? [...o.prog, ...o.prog] : o.prog, root = o.root;
    const deg = (d, oct = 0) => { const k = ((d % 7) + 7) % 7, o2 = Math.floor(d / 7); return root + sc[k] + 12 * (o2 + oct); };
    const chord = d => [deg(d), deg(d + 2), deg(d + 4)];
    /* bass */
    const bass = prog.map(d => { const r = deg(d, -2), f = deg(d + 4, -2), oc = r + 12;
      switch (o.bass) { case 'bounce': return Array.from({ length: 8 }, (_, i) => this.n(i % 2 ? oc : r) + ':2').join(' ');
        case 'walk': return [r, f, oc, deg(d + 5, -2)].map(x => this.n(x) + ':4').join(' ');
        case 'half': return `${this.n(r)}:12 ${this.n(f)}:2 ${this.n(oc)}:2`;
        case 'gallop': return Array.from({ length: 4 }, () => `${this.n(r)}:2 ${this.n(r)} ${this.n(r)}`).join(' ');
        default: return Array.from({ length: 8 }, () => this.n(r) + ':2').join(' '); } }).join(' ');
    /* arpeggio */
    const arp = prog.map(d => { const c = chord(d).map(x => x - 12), seq = o.arp === 'down' ? [c[2] + 12, c[2], c[1], c[0]] : o.arp === 'bounce' ? [c[0], c[2], c[1], c[2]] : [c[0], c[1], c[2], c[0] + 12]; return Array.from({ length: 16 }, (_, i) => this.n(seq[i % 4])).join(' '); }).join(' ');
    /* the melody: a two-bar motif, answered, then a new idea, then the motif again with a cadence home */
    const motif = (startDeg, bars) => { let out = [], cur = startDeg; for (let b = 0; b < bars; b++) { const rh = this.RHYTHMS[Math.floor(R() * this.RHYTHMS.length)], cd = prog[b % prog.length];
      rh.forEach((len, j) => { const strong = j === 0 || len >= 4; if (strong) { const ct = [cd, cd + 2, cd + 4, cd + 7]; cur = ct.reduce((a, x) => Math.abs(x - cur) < Math.abs(a - cur) ? x : a, ct[0]) + (R() < 0.25 ? 2 : 0); } else cur += R() < 0.5 ? 1 : -1; cur = Math.max(-1, Math.min(9, cur));
        out.push(R() < 0.08 && !strong ? '.:' + len : this.n(deg(cur, 1)) + ':' + len); }); } return out; };
    const A = motif(prog[0] + 2, 2), B = motif(prog[2] + 4, 2), A2 = motif(prog[4] + 2, 2);
    const fixRest = s => s.map(t => t.startsWith('.:') ? Array(+t.slice(2)).fill('.').join(' ') : t).join(' ');
    const end = this.n(deg(prog[0] + 7, 1 - 1)) + ':8 ' + this.n(deg(prog[0] + 4, 0)) + ':4 ' + this.n(deg(prog[0], 1)) + ':4';
    const lead = [fixRest(A), fixRest(A.map((t, i) => i < 2 ? t : t)), fixRest(B), fixRest(A2.slice(0, Math.max(1, A2.length - 3))) ].join(' ');
    const leadSteps = this.count(lead), pad = 128 - leadSteps - this.count(end), leadFull = lead + (pad > 0 ? ' ' + Array(pad).fill('.').join(' ') : '') + ' ' + end;
    const pads = prog.map(d => this.n(deg(d + 2, -1)) + ':16').join(' ');
    const voices = [
      { wave: o.lead || 'square', vol: 0.15, loop: this.trim(leadFull, 128) },
      { wave: 'sawtooth', vol: 0.045, loop: pads },
      { wave: 'square', vol: o.arp === 'none' ? 0 : 0.06, loop: arp },
      { wave: 'triangle', vol: 0.3, loop: bass },
      { drums: true, vol: 1, loop: Array(8).fill(this.DRUMS[o.drums || 'rock']).join(' ') }
    ].filter(v => v.vol > 0);
    return { bpm: o.bpm, stepsPerBeat: 4, voices, title: o.title };
  },
  count(s) { return s.trim().split(/\s+/).reduce((a, t) => a + (+(t.split(':')[1]) || 1), 0); },
  trim(s, n) { const out = []; let k = 0; for (const t of s.trim().split(/\s+/)) { const [note, len] = t.split(':'), l = +len || 1; if (k + l > n) { if (n - k > 0) out.push(note + ':' + (n - k)); k = n; break; } out.push(t); k += l; } if (k < n) out.push(Array(n - k).fill('.').join(' ')); return out.join(' '); }
};
const C4 = 60, KEY = { C: 60, Db: 61, D: 62, Eb: 63, E: 64, F: 65, Gb: 66, G: 67, Ab: 56, A: 57, Bb: 58, B: 59 };
const SONG_LIST = {
  menu: [
    { title: 'Lobby Lights', seed: 11, bpm: 100, root: KEY.F, mode: 'major', prog: [0, 5, 3, 4], bass: 'half', drums: 'half', arp: 'up' },
    { title: 'Neon Locker', seed: 12, bpm: 108, root: KEY.A, mode: 'minor', prog: [0, 5, 2, 6], bass: 'bounce', drums: 'shuffle', arp: 'bounce', lead: 'triangle' },
    { title: 'Cart Park', seed: 13, bpm: 96, root: KEY.D, mode: 'mixo', prog: [0, 6, 3, 0], bass: 'walk', drums: 'half', arp: 'down' },
    { title: 'Season Pass', seed: 14, bpm: 112, root: KEY.Eb, mode: 'major', prog: [3, 4, 0, 5], bass: 'drive', drums: 'four', arp: 'up' },
    { title: 'Late Night Lobby', seed: 15, bpm: 90, root: KEY.E, mode: 'dorian', prog: [0, 3, 0, 4], bass: 'half', drums: 'shuffle', arp: 'bounce', lead: 'triangle' },
    { title: 'Party Up', seed: 16, bpm: 118, root: KEY.G, mode: 'major', prog: [0, 4, 5, 3], bass: 'bounce', drums: 'four', arp: 'up' }
  ],
  hockey: [
    { title: 'Face Off', seed: 21, bpm: 144, root: KEY.E, mode: 'minor', prog: [0, 5, 6, 4], bass: 'drive', drums: 'rock', arp: 'up' },
    { title: 'Power Play', seed: 22, bpm: 138, root: KEY.G, mode: 'major', prog: [0, 3, 4, 3], bass: 'drive', drums: 'rock', arp: 'bounce' },
    { title: 'Top Shelf', seed: 23, bpm: 150, root: KEY.C, mode: 'mixo', prog: [0, 6, 3, 0], bass: 'gallop', drums: 'gallop', arp: 'up' },
    { title: 'Overtime', seed: 24, bpm: 132, root: KEY.Bb, mode: 'minor', prog: [0, 3, 4, 4], bass: 'drive', drums: 'march', arp: 'down' },
    { title: 'Breakaway', seed: 25, bpm: 146, root: KEY.A, mode: 'major', prog: [0, 4, 5, 3], bass: 'bounce', drums: 'four', arp: 'up' }
  ],
  br: [
    { title: 'The Storm', seed: 31, bpm: 152, root: KEY.D, mode: 'minor', prog: [0, 0, 5, 6], bass: 'drive', drums: 'brk', arp: 'down' },
    { title: 'Drop Zone', seed: 32, bpm: 140, root: KEY.F, mode: 'minor', prog: [0, 6, 5, 6], bass: 'gallop', drums: 'gallop', arp: 'up' },
    { title: 'Last Squad', seed: 33, bpm: 160, root: KEY.B, mode: 'minor', prog: [0, 3, 5, 4], bass: 'drive', drums: 'four', arp: 'bounce' },
    { title: 'Loot Run', seed: 34, bpm: 136, root: KEY.E, mode: 'dorian', prog: [0, 3, 0, 6], bass: 'bounce', drums: 'brk', arp: 'up' },
    { title: 'Circle Closing', seed: 35, bpm: 148, root: KEY.G, mode: 'minor', prog: [0, 5, 3, 4], bass: 'drive', drums: 'march', arp: 'down', lead: 'sawtooth' }
  ],
  race: [
    { title: 'Green Light', seed: 41, bpm: 168, root: KEY.A, mode: 'major', prog: [0, 4, 5, 3], bass: 'drive', drums: 'four', arp: 'up' },
    { title: 'Slipstream', seed: 42, bpm: 176, root: KEY.E, mode: 'mixo', prog: [0, 6, 3, 4], bass: 'gallop', drums: 'gallop', arp: 'bounce' },
    { title: 'Final Lap', seed: 43, bpm: 160, root: KEY.D, mode: 'minor', prog: [0, 5, 6, 4], bass: 'drive', drums: 'rock', arp: 'down' },
    { title: 'Sky Road', seed: 44, bpm: 172, root: KEY.Db, mode: 'major', prog: [3, 4, 0, 0], bass: 'bounce', drums: 'four', arp: 'up', lead: 'sawtooth' }
  ],
  party: [
    { title: 'Bumper Bash', seed: 51, bpm: 128, root: KEY.C, mode: 'major', prog: [0, 5, 3, 4], bass: 'bounce', drums: 'shuffle', arp: 'bounce' },
    { title: 'Hot Potato', seed: 52, bpm: 136, root: KEY.F, mode: 'mixo', prog: [0, 6, 0, 4], bass: 'walk', drums: 'four', arp: 'up', lead: 'triangle' },
    { title: 'Balloon Pop', seed: 53, bpm: 124, root: KEY.G, mode: 'major', prog: [0, 3, 0, 4], bass: 'bounce', drums: 'shuffle', arp: 'bounce' },
    { title: 'Sneaky Carts', seed: 54, bpm: 112, root: KEY.A, mode: 'minor', prog: [0, 3, 6, 4], bass: 'walk', drums: 'half', arp: 'down', lead: 'triangle' },
    { title: 'Floor Is Lava', seed: 55, bpm: 140, root: KEY.E, mode: 'minor', prog: [0, 5, 6, 0], bass: 'drive', drums: 'brk', arp: 'up' }
  ]
};
const MUSIC_POOLS = {};
for (const [k, list] of Object.entries(SONG_LIST)) MUSIC_POOLS[k] = list.map(o => { try { return Chip.song(o); } catch (e) { console.warn('song', o.title, e); return null; } }).filter(Boolean);
MUSIC_POOLS.menu.unshift(MUSIC.menu); MUSIC_POOLS.hockey.unshift(MUSIC.match);                // (the original two stay in)
const RACEY = new Set(['race', 'timetrial', 'slalom', 'stunt', 'delivery']);
function musicPoolNow(name) {
  if (name !== 'match') return MUSIC_POOLS[name] ? name : null;
  try { const g = window.voltGame, sc = g && (g.scene.getScene('Game')), k = sc && sc.setup && sc.setup.mini && sc.setup.mini.kind; if (!k) return 'hockey'; if (k === 'br') return 'br'; if (RACEY.has(k)) return 'race'; return 'party'; } catch (e) { return 'hockey'; }
}
{ const ps = Sound.playSynth.bind(Sound), pm = Sound.pumpMusic.bind(Sound);
  Sound.playSynth = function (name) {
    const pool = musicPoolNow(name); if (!pool || !MUSIC_POOLS[pool].length) return ps(name);
    const list = MUSIC_POOLS[pool], last = (this.lastSong || {})[pool]; let i = Math.floor(Math.random() * list.length); if (list.length > 1 && i === last) i = (i + 1) % list.length;
    (this.lastSong = this.lastSong || {})[pool] = i; const track = list[i];
    clearInterval(this.musicTimer); this.music = { name, pool, track, voices: track.voices.map(v => ({ ...v, steps: this.compile(v.loop) })), step: 0, next: this.ctx.currentTime + 0.1, started: this.ctx.currentTime };
    this.musicTimer = setInterval(() => this.pumpMusic(), 50);
  };
  Sound.pumpMusic = function () { const m = this.music; if (m && m.pool && this.ctx && this.ctx.currentTime - m.started > 150 && m.step % 128 === 0 && m.step > 0) { const name = m.name; this.music = null; clearInterval(this.musicTimer); this.playSynth(name); return; } return pm(); };
}

/* ---------- emote jingles ---------- */
const Jingle = {
  busyUntil: 0, live: 0,
  mood(id) {
    const s = (id + ' ' + ((ACTIONS[id] || {}).name || '')).toLowerCase();
    if (/trumpet|horn/.test(s)) return 'trumpet'; if (/salute/.test(s)) return 'bugle';
    if (/dance|salsa|disco|groove|shuffle|cancan|twist|floss|robot|moon|wiggle|bop|seat|boogie|hips|sway|step|kick ?line|jig|swim|sprinkler|chicken|dab|macarena|wave arms/.test(s)) return 'dance';
    if (/cheer|pump|flex|volt|champ|trophy|raise|win|applause|clap|hype|yes|party|fist|celebrat/.test(s)) return 'fanfare';
    if (/wave|hello|hi\b|call|point|thumb|peace|nod|bow|tip|wink/.test(s)) return 'greet';
    if (/think|face ?palm|shrug|sad|cry|sigh|yawn|sleep|confus|scratch/.test(s)) return 'puzzled';
    if (/karate|chop|kick|punch|box|ninja|flex|strong|slam/.test(s)) return 'action';
    if (/hug|heart|love|kiss|blow/.test(s)) return 'love';
    if (/drum|guitar|air|rock|piano|band/.test(s)) return 'rock';
    return 'playful';
  },
  play(id, vol = 1) {
    try {
      if (!ACTIONS[id] || !Sound.ctx || !(Settings.sfxVolume > 0)) return; const now = Sound.ctx.currentTime; if (this.live >= 2 && now < this.busyUntil) return;
      const A = ACTIONS[id], dur = Math.min(3.6, A.dur || 2.5), R = Chip.rng(id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7)), key = 60 + Math.floor(R() * 7), mood = this.mood(id), t0 = now + 0.03, v = 0.11 * vol;
      const T = (midi, at, len, wave = 'square', vv = v, to) => { if (at > dur) return; const f = 440 * Math.pow(2, (midi - 69) / 12); Sound.tone({ wave, from: f, to: to ? 440 * Math.pow(2, (to - 69) / 12) : f, dur: Math.min(len, dur - at) * 0.92, vol: vv, at: t0 + at }); };
      const maj = [0, 4, 7, 12, 16, 19, 24], pent = [0, 2, 4, 7, 9, 12, 14, 16];
      switch (mood) {
        case 'fanfare': [[0, 0, 0.11], [4, 0.11, 0.11], [7, 0.22, 0.11], [12, 0.33, 0.3], [7, 0.66, 0.15], [12, 0.82, 0.7]].forEach(([n, a, l]) => { T(key + n, a, l); T(key + n - 12, a, l, 'triangle', v * 1.6); }); T(key + 16, 1.55, 0.18); T(key + 19, 1.75, 0.6); break;
        case 'trumpet': [[7, 0, 0.12], [7, 0.13, 0.12], [7, 0.26, 0.12], [12, 0.4, 0.5], [9, 0.95, 0.15], [12, 1.12, 0.15], [16, 1.3, 0.9]].forEach(([n, a, l]) => T(key + n, a, l, 'sawtooth', v * 0.9)); break;
        case 'bugle': [[7, 0, 0.28], [7, 0.3, 0.12], [12, 0.45, 0.6], [7, 1.1, 0.28], [12, 1.4, 0.12], [16, 1.55, 0.9]].forEach(([n, a, l]) => T(key - 5 + n, a, l, 'triangle', v * 2)); break;
        case 'greet': T(key + 7, 0, 0.16); T(key + 12, 0.18, 0.3); T(key + 16, 0.55, 0.08, 'triangle', v * 1.5); T(key + 19, 0.64, 0.08, 'triangle', v * 1.5); T(key + 24, 0.73, 0.3, 'triangle', v * 1.5); break;
        case 'puzzled': [[7, 0, 0.3], [6, 0.32, 0.3], [5, 0.64, 0.3], [3, 0.96, 0.7]].forEach(([n, a, l]) => T(key + n, a, l, 'triangle', v * 1.8)); T(key + 2, 1.8, 0.25, 'square', v * 0.7, key + 9); break;
        case 'action': for (let i = 0; i < 6; i++) { const a = i * 0.16; T(key - 12 + (i % 2 ? 7 : 0), a, 0.07, 'square', v * 1.3); if (i % 3 === 2) T(key + 12, a, 0.12, 'sawtooth', v, key); } T(key + 12, 1.1, 0.4, 'square', v, key + 19); break;
        case 'love': [[0, 0], [4, 0.3], [7, 0.6], [12, 0.9], [11, 1.2], [12, 1.5]].forEach(([n, a]) => { T(key + n, a, 0.32, 'triangle', v * 2); T(key + n + 4, a, 0.32, 'sine', v); }); break;
        case 'rock': for (let i = 0; i * 0.15 < dur; i++) { const a = i * 0.15; T(key - 24 + [0, 0, 7, 5][Math.floor(i / 2) % 4], a, 0.13, 'sawtooth', v * 1.1); if (i % 4 === 2) Sound.drum && Sound.drum('S', t0 + a, 0.6); else if (i % 2 === 0) Sound.drum && Sound.drum('K', t0 + a, 0.7); } break;
        case 'dance': { const beat = 60 / 126 / 2, riff = [0, 7, 12, 7, 10, 7, 12, 14].map(x => x + (R() < 0.3 ? 0 : 0)); for (let i = 0; i * beat < dur; i++) { const a = i * beat; T(key - 24 + (i % 2 ? 12 : 0) + (Math.floor(i / 8) % 2 ? 5 : 0), a, beat * 0.9, 'triangle', v * 2.2); if (i % 2 === 0) T(key + riff[(i / 2) % riff.length], a, beat * 0.8, 'square', v * 0.8); if (Sound.drum) { if (i % 4 === 0) Sound.drum('K', t0 + a, 0.6); else if (i % 4 === 2) Sound.drum('S', t0 + a, 0.5); else Sound.drum('H', t0 + a, 0.4); } } break; }
        default: { let a = 0, cur = 2; while (a < dur - 0.2) { const step = 0.1 + Math.floor(R() * 3) * 0.06; cur = Math.max(0, Math.min(7, cur + (R() < 0.5 ? 1 : -1) * (1 + Math.floor(R() * 2)))); T(key + pent[cur], a, step, R() < 0.3 ? 'triangle' : 'square', v); a += step; } T(key + 12, a, 0.3, 'square', v, key + 19); }
      }
      this.live++; this.busyUntil = now + dur; setTimeout(() => { this.live = Math.max(0, this.live - 1); }, dur * 1000);
    } catch (e) { console.warn('jingle', e); }
  }
};
{ const sh = Emotes.show.bind(Emotes); Emotes.show = function (chair, e) { const r = sh(chair, e); if (chair && ACTIONS[e]) Jingle.play(e, chair.player && !chair.player.remote ? 1 : 0.45); return r; }; }
{ const P = LobbyStage.prototype, pl = P.play, pf = P.playFor; P.play = function (id) { const r = pl.call(this, id); if (ACTIONS[id] && !this.quietNext) Jingle.play(id, 1); this.quietNext = false; return r; }; if (pf) P.playFor = function (key, id) { const r = pf.call(this, key, id); if (ACTIONS[id]) Jingle.play(id, 0.6); return r; }; }
