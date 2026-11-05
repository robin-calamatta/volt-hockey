/* 8-bit sound: everything is synthesised, no audio files needed.
   Add a sound effect: add an entry to SFX.  Add music: add a track to MUSIC and call Sound.playMusic('name'). */

// Each SFX is a function receiving the Sound system. Use s.tone(...) and s.noise(...).
const SFX = {
  blip:     s => s.tone({ from: 660, dur: 0.04, vol: 0.2 }),
  select:   s => s.tone({ from: 880, to: 1320, dur: 0.1, vol: 0.25 }),
  back:     s => s.tone({ from: 440, to: 220, dur: 0.1, vol: 0.25 }),
  count:    s => s.tone({ from: 440, dur: 0.12, vol: 0.3 }),
  whistle:  s => s.tone({ wave: 'sine', from: 2600, to: 2400, dur: 0.45, vol: 0.3 }),
  goal:     s => { s.tone({ wave: 'sawtooth', from: 220, dur: 0.9, vol: 0.3 }); s.tone({ wave: 'sawtooth', from: 330, dur: 0.9, vol: 0.2 }); },
  bump:     s => s.noise({ dur: 0.08, vol: 0.25, from: 400, to: 200 }),
  foul:     s => s.tone({ wave: 'sawtooth', from: 180, to: 90, dur: 0.35, vol: 0.3 }),
  screech:  s => s.noise({ dur: 0.18, vol: 0.07, from: 3400, to: 2200, q: 6 }),   // light, brief tyre squeal for the spin move
  /* gunshots (Battle Royale): a crack, a body, a low thump and an outdoor echo, different for every gun */
  gun_pistol:  s => s.shot({ vol: 0.42, crack: 0.025, body: 0.12, bodyF: 1300, low: 0.12, lowF: 170, tail: 0.35 }),
  gun_smg:     s => s.shot({ vol: 0.3, crack: 0.018, body: 0.07, bodyF: 1600, low: 0.07, lowF: 190, tail: 0.2 }),
  gun_shotgun: s => s.shot({ vol: 0.62, crack: 0.03, body: 0.32, bodyF: 650, low: 0.3, lowF: 90, tail: 0.7 }),
  gun_rifle:   s => s.shot({ vol: 0.44, crack: 0.02, body: 0.15, bodyF: 1050, low: 0.15, lowF: 130, tail: 0.5 }),
  gun_sniper:  s => s.shot({ vol: 0.72, crack: 0.035, body: 0.36, bodyF: 850, low: 0.42, lowF: 75, tail: 1.2 }),
  gun_rocket:  s => { s.shot({ vol: 0.35, crack: 0.01, body: 0.2, bodyF: 500, low: 0.2, lowF: 110, tail: 0.3 }); s.noise({ dur: 0.7, vol: 0.18, from: 1400, to: 300, q: 0.8 }); },
  gun_paint:   s => s.shot({ vol: 0.22, crack: 0.012, crackF: 2400, body: 0.05, bodyF: 1800, low: 0.05, lowF: 240, tail: 0.08 }),   // a paintball marker: a soft pop
  boom:        s => { s.shot({ vol: 0.8, crack: 0.04, body: 0.6, bodyF: 420, low: 0.7, lowF: 60, tail: 1.4 }); },
  /* reloads: a different sequence of clicks, slides and clunks for every gun, spread over its reload time */
  rl_pistol:   s => s.mech([['click', 0.04], ['slideOut', 0.12], ['magIn', 0.62], ['rack', 0.9]], 1.1),
  rl_smg:      s => s.mech([['click', 0.05], ['slideOut', 0.2], ['magIn', 1.0], ['bolt', 1.42]], 1.7),
  rl_rifle:    s => s.mech([['click', 0.06], ['slideOut', 0.28], ['magInHeavy', 1.12], ['rack', 1.55], ['bolt', 1.66]], 1.9),
  rl_sniper:   s => s.mech([['boltUp', 0.15], ['boltBack', 0.42], ['magIn', 1.3], ['boltFwd', 1.95], ['boltDown', 2.2]], 2.5),
  rl_rocket:   s => s.mech([['clank', 0.25], ['slideIn', 1.0], ['clank', 2.05], ['beep', 2.35]], 2.6),
  rl_shotgun:  s => s.mech([['shell', 0.3]], 0.55),
  rl_shell:    s => s.mech([['shell', 0.3]], 0.55),
  rl_pump:     s => s.mech([['pumpBack', 0.02], ['pumpFwd', 0.16]], 0.3),
  drift:       s => s.noise({ dur: 0.12, vol: 0.06, from: 2600, to: 2300, q: 5 }),
  reload:      s => { s.noise({ dur: 0.04, vol: 0.18, from: 3000, q: 3 }); s.noise({ dur: 0.05, vol: 0.2, from: 1800, q: 4, at: s.ctx.currentTime + 0.22 }); }
};

/* MUSIC. A track is { bpm, stepsPerBeat, voices }. Each voice has a `loop`: space-separated steps.
     'D5:4' = note D5 held for 4 steps    'D5' = one step    '.' = rest
   Drum voices set drums: true and use K (kick), S (snare), H (hat).
   With stepsPerBeat 4, one bar is 16 steps. Every loop should be a whole number of bars. All tunes here are original. */
const repeat = (token, n) => Array(n).fill(token).join(' ');
const arp = notes => Array.from({ length: 16 }, (_, i) => notes[i % notes.length]).join(' ');   // one bar of 16th-note arpeggio
const eighths = note => repeat(note + ':2', 8);                                                  // one bar of driving eighth notes
const ROCK = 'K . H . S . H . K . H K S . H .', HALF_TIME = 'K . H . . . H . S . H . . . H .';  // one bar of drums

const MUSIC = {
  // Heroic and slow: A minor / F / C / G, four bars.
  menu: { bpm: 96, stepsPerBeat: 4, voices: [
    { wave: 'square',   vol: 0.15, loop: 'E5:6 A5:2 G5:4 E5:4  F5:6 A5:2 C6:4 A5:4  E5:6 G5:2 C6:4 G5:4  D5:4 G5:4 B5:4 D6:4' },
    { wave: 'sawtooth', vol: 0.05, loop: 'A3:16 F3:16 C4:16 G3:16' },
    { wave: 'square',   vol: 0.07, loop: [arp(['A3','C4','E4','A4']), arp(['F3','A3','C4','F4']), arp(['C4','E4','G4','C5']), arp(['G3','B3','D4','G4'])].join(' ') },
    { wave: 'triangle', vol: 0.30, loop: 'A2:8 A2:8 F2:8 F2:8 C2:8 C2:8 G2:8 G2:8' },
    { drums: true,      vol: 1,    loop: repeat(HALF_TIME, 4) } ] },

  // Big stadium anthem: D minor / B-flat / F / C, eight bars (the second half lifts higher).
  match: (() => {
    const chords = [arp(['D4','F4','A4','D5']), arp(['A#3','D4','F4','A#4']), arp(['F3','A3','C4','F4']), arp(['C4','E4','G4','C5'])].join(' ');
    const bass = [eighths('D2'), eighths('A#1'), eighths('F2'), eighths('C2')].join(' ');
    return { bpm: 140, stepsPerBeat: 4, voices: [
      { wave: 'square',   vol: 0.16, loop: [
          'D5:3 F5 A5:4 G5:2 F5:2 D5:4',   'A#4:3 D5 F5:4 G5:2 D5:2 A#4:4', 'C5:3 F5 A5:4 G5:2 F5:2 C5:4', 'E5:2 G5:2 C6:4 B5:2 G5:2 E5:2 D5:2',
          'D5:2 F5:2 A5:2 D6:6 C6:2 A5:2', 'A#5:2 A5:2 F5:2 D5:6 F5:2 A5:2', 'C6:2 A5:2 F5:2 C6:6 A5:2 F5:2', 'G5:4 E5:2 G5:2 C6:8'].join(' ') },
      { wave: 'sawtooth', vol: 0.05, loop: repeat('A3:16 D4:16 A3:16 G3:16', 2) },
      { wave: 'square',   vol: 0.07, loop: chords + ' ' + chords },
      { wave: 'triangle', vol: 0.30, loop: bass + ' ' + bass },
      { drums: true,      vol: 1,    loop: repeat(ROCK, 8) } ] };
  })()
};

const Sound = {
  ctx: null, musicTimer: null, music: null, player: null, playlist: null, playBlocked: false, musicRequest: 0,

  resume() {                       // browsers only allow audio after a key press or click
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);                 // master volume: everything the game plays goes through here
      this.sfxBus = this.ctx.createGain(); this.musicBus = this.ctx.createGain();
      this.sfxBus.connect(this.master); this.musicBus.connect(this.master);
      this.applySpeaker();
      this.noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.noiseBuffer.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.playBlocked && this.player) { this.playBlocked = false; this.player.play().catch(() => { this.playBlocked = true; }); }   // song was blocked before the first key press
  },
  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = Settings.masterVolume === undefined ? 1 : Settings.masterVolume;
    this.sfxBus.gain.value = Settings.sfxVolume;
    this.musicBus.gain.value = Settings.musicVolume * CONFIG.audio.musicHeadroom;
    if (this.player) this.player.volume = Math.min(1, Settings.musicVolume * CONFIG.audio.realMusicGain * (Settings.masterVolume === undefined ? 1 : Settings.masterVolume));
    if (typeof Voice !== 'undefined') Voice.applyVolumes();
    if (this.crowd) this.crowd.applyVolume();
  },
  /* The speakers / headphones chosen in Settings > Sound (Chrome and Edge can pick; other browsers always use the system's output). */
  canPickSpeaker() { return !!(window.AudioContext && AudioContext.prototype.setSinkId); },
  applySpeaker() {
    const id = Settings.speakerId || '';
    try { if (this.ctx && this.ctx.setSinkId && this.ctx.sinkId !== id) this.ctx.setSinkId(id).catch(() => {}); } catch (e) { /* not supported */ }
    try { if (this.player && this.player.setSinkId) this.player.setSinkId(id).catch(() => {}); } catch (e) { /* not supported */ }
    if (typeof Voice !== 'undefined') Voice.applySpeaker();
  },
  play(name) { try { if (SFX[name]) { this.resume(); SFX[name](this); } } catch (e) { console.warn('sound failed', e); } },   // sound must never break the game

  // `at` (audio-clock time) and `bus` are used by the music player; effects leave them out.
  tone({ wave = 'square', from, to = from, dur = 0.1, vol = 0.3, at = null, bus = null }) {
    const t = at ?? this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = wave; o.frequency.setValueAtTime(from, t); o.frequency.linearRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.01, dur / 4)); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus); o.start(t); o.stop(t + dur);
  },
  shot({ vol = 0.5, crack = 0.025, crackF = 3200, body = 0.15, bodyF = 1000, low = 0.15, lowF = 130, tail = 0.4 }) {   // one gunshot, built from layers
    const c = this.ctx, t = c.currentTime, out = this.sfxBus, env = (g, v, d, t0 = t) => { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); };
    const layer = (type, f, v, d, t0 = t, q = 0.7) => { const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noiseBuffer; fl.type = type; fl.frequency.value = f; fl.Q.value = q; env(g, v, d, t0); s.connect(fl); fl.connect(g); g.connect(out); s.start(t0); s.stop(t0 + d + 0.05); };
    layer('highpass', crackF, vol, crack); layer('lowpass', bodyF, vol * 0.85, body); layer('bandpass', 420, vol * 0.16, tail, t + 0.03, 0.6);
    const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(lowF * 1.7, t); o.frequency.exponentialRampToValueAtTime(lowF * 0.45, t + low); env(g, vol * 0.9, low); o.connect(g); g.connect(out); o.start(t); o.stop(t + low + 0.05);
  },
  mech(steps) {                                                          // gun mechanics: each step is a little layered click or slide
    const t0 = this.ctx.currentTime, N = (at, o) => this.noise({ ...o, at: t0 + at }), T = (at, o) => this.tone({ ...o, at: t0 + at });
    const K = {
      click: a => N(a, { dur: 0.03, vol: 0.16, from: 3600, q: 4 }),
      slideOut: a => { N(a, { dur: 0.12, vol: 0.12, from: 1800, to: 900, q: 2 }); N(a + 0.14, { dur: 0.04, vol: 0.09, from: 500, q: 1.5 }); },
      magIn: a => { N(a, { dur: 0.05, vol: 0.22, from: 900, q: 1.5 }); N(a + 0.03, { dur: 0.025, vol: 0.22, from: 3200, q: 5 }); },
      magInHeavy: a => { N(a, { dur: 0.07, vol: 0.26, from: 650, q: 1.2 }); N(a + 0.04, { dur: 0.03, vol: 0.24, from: 2700, q: 5 }); T(a, { wave: 'sine', from: 160, to: 90, dur: 0.06, vol: 0.12 }); },
      rack: a => { N(a, { dur: 0.06, vol: 0.18, from: 2400, to: 1600, q: 3 }); N(a + 0.1, { dur: 0.04, vol: 0.22, from: 3000, q: 5 }); },
      bolt: a => { N(a, { dur: 0.05, vol: 0.2, from: 2000, q: 3 }); N(a + 0.07, { dur: 0.035, vol: 0.24, from: 3400, q: 6 }); },
      boltUp: a => N(a, { dur: 0.04, vol: 0.18, from: 2900, q: 6 }),
      boltBack: a => N(a, { dur: 0.1, vol: 0.18, from: 1500, to: 2400, q: 3 }),
      boltFwd: a => N(a, { dur: 0.09, vol: 0.18, from: 2400, to: 1400, q: 3 }),
      boltDown: a => { N(a, { dur: 0.04, vol: 0.24, from: 3400, q: 6 }); T(a, { wave: 'sine', from: 220, to: 120, dur: 0.05, vol: 0.1 }); },
      clank: a => { N(a, { dur: 0.1, vol: 0.22, from: 420, q: 2 }); T(a, { wave: 'triangle', from: 380, to: 360, dur: 0.25, vol: 0.08 }); T(a, { wave: 'triangle', from: 910, to: 900, dur: 0.18, vol: 0.04 }); },
      slideIn: a => { N(a, { dur: 0.45, vol: 0.1, from: 700, to: 1400, q: 1.5 }); N(a + 0.45, { dur: 0.06, vol: 0.24, from: 500, q: 1.2 }); },
      beep: a => T(a, { wave: 'sine', from: 1760, dur: 0.06, vol: 0.08 }),
      shell: a => { N(a - 0.08, { dur: 0.06, vol: 0.08, from: 1200, to: 1700, q: 2 }); N(a, { dur: 0.04, vol: 0.2, from: 1400, q: 2.5 }); N(a + 0.02, { dur: 0.02, vol: 0.14, from: 3800, q: 6 }); },
      pumpBack: a => N(a, { dur: 0.08, vol: 0.26, from: 1100, to: 700, q: 2 }),
      pumpFwd: a => { N(a, { dur: 0.06, vol: 0.28, from: 800, to: 1300, q: 2 }); N(a + 0.05, { dur: 0.03, vol: 0.26, from: 3000, q: 5 }); }
    };
    for (const [k, at] of steps) if (K[k]) K[k](at);
  },
  /* the tyre squeal of a drift: one loop per cart, louder and higher as the drift charges */
  driftLoop(id, on, lvl = 0) {
    if (!this.ctx) return; const L = this.drifts || (this.drifts = {}); let d = L[id];
    if (!on) { if (d) { d.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); const s = d.s; clearInterval(d.iv); setTimeout(() => { try { s.stop(); } catch (e) {} }, 400); delete L[id]; } return; }
    if (!d) { const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), f2 = this.ctx.createBiquadFilter(), g = this.ctx.createGain(); s.buffer = this.noiseBuffer; s.loop = true; f.type = 'bandpass'; f.Q.value = 7; f2.type = 'lowpass'; f2.frequency.value = 900; f2.Q.value = 0.7;
      const g2 = this.ctx.createGain(); g2.gain.value = 0.5; s.connect(f); f.connect(g); s.connect(f2); f2.connect(g2); g2.connect(g); g.gain.value = 0; g.connect(this.sfxBus); s.start(); d = L[id] = { s, f, g }; d.iv = setInterval(() => { if (performance.now() - d.at > 300) { clearInterval(d.iv); this.driftLoop(id, false); } }, 150); }   // (stops by itself if nobody keeps it going: you left the match)
    d.at = performance.now(); const t = this.ctx.currentTime; d.f.frequency.setTargetAtTime(2100 + lvl * 380 + Math.random() * 120, t, 0.05); d.g.gain.setTargetAtTime(0.045 + lvl * 0.012, t, 0.06);
  },
  noise({ dur = 0.1, vol = 0.2, from = 1000, to = from, q = 1, at = null, bus = null }) {
    const t = at ?? this.ctx.currentTime, src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    src.buffer = this.noiseBuffer; f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(from, t); f.frequency.linearRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(f); f.connect(g); g.connect(bus || this.sfxBus); src.start(t); src.stop(t + dur);
  },
  drum(name, at, vol) {
    const bus = this.musicBus;
    if (name === 'K') this.tone({ wave: 'sine', from: 160, to: 45, dur: 0.14, vol: 0.5 * vol, at, bus });
    if (name === 'S') this.noise({ dur: 0.12, vol: 0.32 * vol, from: 2200, q: 0.8, at, bus });
    if (name === 'H') this.noise({ dur: 0.04, vol: 0.14 * vol, from: 8000, q: 0.5, at, bus });
  },

  noteFreq(name) {
    const m = /^([A-G])(#?)(\d)$/.exec(name), semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
    return 440 * Math.pow(2, (semis + 12 * (+m[3] + 1) - 69) / 12);
  },
  compile(loop) {                  // 'D5:4 F5' -> one entry per step: { note, len } at the step a note starts, null while it is held
    const steps = [];
    for (const token of loop.trim().split(/\s+/)) {
      const [note, len] = token.split(':'), n = +len || 1;
      steps.push({ note, len: n }); for (let i = 1; i < n; i++) steps.push(null);
    }
    return steps;
  },
  playMusic(name) {                // your own shuffled files if found (see music.js), otherwise the built-in 8-bit tune
    const id = this.musicRequest = (this.musicRequest || 0) + 1;
    this.stopMusic();
    const wait = new Promise(resolve => setTimeout(resolve, MUSIC_START_WAIT_MS));
    Promise.race([MUSIC_READY, wait]).then(() => {            // never blocks the game; a newer request cancels this one
      if (id !== this.musicRequest) return;
      try { this.resume(); if (PLAYLISTS[name] && PLAYLISTS[name].length) this.startPlaylist(name); else this.playSynth(name); }
      catch (e) { console.warn('music failed', e); }
    });
  },
  playSynth(name) {
    const track = MUSIC[name];
    this.music = { track, voices: track.voices.map(v => ({ ...v, steps: this.compile(v.loop) })), step: 0, next: this.ctx.currentTime + 0.1 };
    this.musicTimer = setInterval(() => this.pumpMusic(), 50);
  },
  shuffled(list) { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  startPlaylist(name) { this.playlist = { name, order: this.shuffled(PLAYLISTS[name]), index: -1, failures: 0 }; this.nextTrack(); },
  nextTrack() {                    // plays the next shuffled song; reshuffles after the last one
    const p = this.playlist; if (!p) return;
    if (this.player) { this.player.onended = this.player.onerror = null; this.player.pause(); }
    p.index++; if (p.index >= p.order.length) { p.order = this.shuffled(PLAYLISTS[p.name]); p.index = 0; }
    const audio = new Audio(p.order[p.index]);
    audio.volume = Settings.musicVolume * CONFIG.audio.realMusicGain;
    audio.onended = () => this.nextTrack();
    audio.onerror = () => {        // a missing or unreadable file is skipped; if all fail, fall back to the 8-bit tune
      console.warn('Could not load song', audio.src);
      if (++p.failures >= p.order.length) { this.playlist = null; this.player = null; this.playSynth(p.name); } else this.nextTrack();
    };
    this.player = audio; this.applyVolumes(); try { if (Settings.speakerId && audio.setSinkId) audio.setSinkId(Settings.speakerId).catch(() => {}); } catch (e) { /* not supported */ }
    audio.play().catch(() => { this.playBlocked = true; });
  },
  stopMusic() {
    clearInterval(this.musicTimer); this.music = null; this.playlist = null;
    if (this.player) { this.player.onended = this.player.onerror = null; this.player.pause(); this.player = null; }
  },
  pumpMusic() {                    // schedules notes slightly ahead of the audio clock
    const m = this.music; if (!m) return;
    const stepLen = 60 / m.track.bpm / m.track.stepsPerBeat;
    while (m.next < this.ctx.currentTime + 0.2) {
      for (const v of m.voices) {
        const e = v.steps[m.step % v.steps.length];
        if (!e || e.note === '.') continue;
        if (v.drums) this.drum(e.note, m.next, v.vol);
        else this.tone({ wave: v.wave, from: this.noteFreq(e.note), dur: stepLen * e.len * 0.95, vol: v.vol, at: m.next, bus: this.musicBus });
      }
      m.step++; m.next += stepLen;
    }
  }
};

/* The crowd: a murmur that swells and fades with the excitement, plus one-off reactions (roar, applause, "ooh", "aww", boos).
   All made from filtered noise and a few voice-like tones, so no audio files are needed. Goes through its own volume (Settings > Sound and commentary > Crowd volume). */
Sound.crowd = {
  on: false,
  rnd(a, b) { return a + Math.random() * (b - a); },
  ok() { return !!(Sound.ctx && this.bus && this.on); },
  start() {
    try {
      Sound.resume(); const c = Sound.ctx; if (!c || this.on) return;
      this.bus = c.createGain(); this.bus.connect(Sound.master || c.destination);
      const src = c.createBufferSource(), bp = c.createBiquadFilter(), lp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = Sound.noiseBuffer; src.loop = true; src.playbackRate.value = 0.7;
      bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.45; lp.type = 'lowpass'; lp.frequency.value = 2400; g.gain.value = 0.0;
      src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(this.bus); src.start();
      this.amb = { src, bp, g }; this.on = true; this.lvl = 0.25;
      this.jitter = setInterval(() => { if (this.ok()) this.level(this.lvl, true); }, 450);
      this.applyVolume(); this.level(0.25);
    } catch (e) { console.warn('crowd sound failed', e); }
  },
  applyVolume() { if (this.bus && Sound.ctx) this.bus.gain.value = (Settings.crowdVolume === undefined ? 0.8 : Settings.crowdVolume) * Math.max(0.25, Settings.sfxVolume) * 1.5; },
  stop() {
    clearInterval(this.jitter); this.on = false;
    try { if (this.amb) { this.amb.src.stop(); this.amb = null; } if (this.bus) { this.bus.disconnect(); this.bus = null; } } catch (e) {}
  },
  level(v, jit) {                                                // the background murmur: louder and brighter when the game is exciting
    if (!this.ok() || !this.amb) return; this.lvl = v; const c = Sound.ctx, t = c.currentTime, w = jit ? this.rnd(0.85, 1.15) : 1;
    this.amb.g.gain.setTargetAtTime((0.025 + 0.11 * Math.max(0, v)) * w, t, 0.4); this.amb.bp.frequency.setTargetAtTime(520 + 520 * v, t, 0.5);
  },
  env(node, t, peak, attack, hold, release) { node.gain.setValueAtTime(0.0001, t); node.gain.linearRampToValueAtTime(peak, t + attack); node.gain.setValueAtTime(peak, t + attack + hold); node.gain.linearRampToValueAtTime(0.0001, t + attack + hold + release); },
  swell({ peak = 0.3, attack = 0.2, hold = 0.5, release = 1.2, f0 = 700, f1 = 1200, q = 0.7, delay = 0 }) {    // a burst of crowd noise whose pitch glides f0 -> f1
    if (!this.ok()) return; const c = Sound.ctx, t = c.currentTime + delay, d = attack + hold + release, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = Sound.noiseBuffer; s.loop = true; s.playbackRate.value = this.rnd(0.8, 1.2); f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.linearRampToValueAtTime(f1, t + d);
    this.env(g, t, peak, attack, hold, release); s.connect(f); f.connect(g); g.connect(this.bus); s.start(t); s.stop(t + d + 0.1);
  },
  voices({ f0 = 160, f1 = 160, formants = [[300, 8], [800, 8]], n = 7, peak = 0.12, attack = 0.25, hold = 0.6, release = 0.9, delay = 0, vib = 5 }) {   // a group of people singing one vowel ("oooh", "aaaw")
    if (!this.ok()) return; const c = Sound.ctx, t = c.currentTime + delay, d = attack + hold + release, mix = c.createGain(), out = c.createGain();
    for (let i = 0; i < n; i++) {
      const o = c.createOscillator(), l = c.createOscillator(), lg = c.createGain(), k = this.rnd(0.7, 1.45);
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f0 * k, t); o.frequency.linearRampToValueAtTime(f1 * k, t + d);
      l.frequency.value = vib + this.rnd(-1, 1); lg.gain.value = f0 * k * 0.015; l.connect(lg); lg.connect(o.frequency);
      o.connect(mix); o.start(t); l.start(t); o.stop(t + d + 0.1); l.stop(t + d + 0.1);
    }
    for (const [fr, q] of formants) { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fr; f.Q.value = q; mix.connect(f); f.connect(out); }
    mix.gain.value = 0.5; this.env(out, t, peak, attack, hold, release); out.connect(this.bus);
  },
  clap(n = 16) {                                                 // applause: lots of tiny claps spread over a second or two
    if (!this.ok()) return; const c = Sound.ctx;
    for (let i = 0; i < n; i++) {
      const t = c.currentTime + this.rnd(0, 1.6), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = Sound.noiseBuffer; f.type = 'bandpass'; f.frequency.value = this.rnd(1800, 3600); f.Q.value = 1.2; s.connect(f); f.connect(g); g.connect(this.bus);
      g.gain.setValueAtTime(this.rnd(0.05, 0.14), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); s.start(t, this.rnd(0, 0.8)); s.stop(t + 0.07);
    }
  },
  cheer(i = 1) {                                                 // a goal: roar, a few whoops and applause
    this.swell({ peak: 0.5 * i, attack: 0.18, hold: 0.7 * i, release: 1.9, f0: 650, f1: 1300, q: 0.55 });
    this.swell({ peak: 0.22 * i, attack: 0.3, hold: 0.9, release: 1.6, f0: 1500, f1: 2400, q: 0.9, delay: 0.1 });
    this.voices({ f0: 330, f1: 430, formants: [[650, 6], [1100, 6]], n: 6, peak: 0.1 * i, attack: 0.12, hold: 0.5, release: 1.1, vib: 6 });
    if (i > 0.5) this.clap(Math.round(14 * i));
  },
  boo(i = 1) {                                                   // "booooo": a low vowel that sags
    this.voices({ f0: 125, f1: 98, formants: [[290, 7], [640, 7]], n: 9, peak: 0.16 * i, attack: 0.35, hold: 1.1 * i, release: 1.3, vib: 4.5 });
    this.swell({ peak: 0.18 * i, attack: 0.3, hold: 1.0, release: 1.4, f0: 420, f1: 330, q: 0.8 });
  },
  rise() {                                                       // a shot: the crowd inhales and leans in ("ooooh", rising)
    this.swell({ peak: 0.28, attack: 0.55, hold: 0.25, release: 0.5, f0: 480, f1: 1250, q: 0.8 });
    this.voices({ f0: 190, f1: 285, formants: [[360, 7], [820, 7]], n: 6, peak: 0.1, attack: 0.5, hold: 0.25, release: 0.5, vib: 5.5 });
  },
  fall() {                                                       // it missed: "aaaaw", sinking
    this.swell({ peak: 0.28, attack: 0.1, hold: 0.15, release: 1.0, f0: 1150, f1: 380, q: 0.8 });
    this.voices({ f0: 280, f1: 150, formants: [[700, 7], [1100, 7]], n: 8, peak: 0.13, attack: 0.1, hold: 0.25, release: 0.95, vib: 4 });
  },
  oh(i = 1) { this.swell({ peak: 0.2 * i, attack: 0.12, hold: 0.1, release: 0.6, f0: 600, f1: 900, q: 0.8 }); this.voices({ f0: 230, f1: 260, formants: [[500, 7], [900, 7]], n: 5, peak: 0.07 * i, attack: 0.1, hold: 0.15, release: 0.5 }); }
};
