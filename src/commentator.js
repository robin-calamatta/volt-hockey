/* The voices of the commentary booth. Calls are spoken from pre-recorded clips (made with a neural voice, see tools/make_commentary.py): an excited
   play-by-play caller and a calmer colour commentator. A call is a chain of short clips (wording, team name, number...) played back to back.
   If the clips are not there (or cannot be decoded) the browser's own speech is used instead. */
const Commentator = {
  base: 'assets/commentary/', index: null, indexTried: false, cache: new Map(), token: 0, current: null, mood: -1, until: 0,
  init() {
    if (this.indexTried) return; this.indexTried = true;
    fetch(this.base + 'index.json').then(r => (r.ok ? r.json() : null)).then(list => { if (list) this.index = new Set(list); }).catch(() => {});
    if (window.speechSynthesis) { const get = () => { this.voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); }; get(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', get); }
  },
  warm(m) {                                        // match start: fetch only what this match is likely to need (its two teams, shirt numbers, the players' names); everything else loads the first time it is called
    this.init(); if (!m || !Sound.ctx || !this.index) return;
    const ids = [];
    for (const hi of [false, true]) {
      for (const s of [0, 1]) { ids.push(Commentary.teamId('pbp', hi, TEAMS[m.teams[s]].id)); if (!hi) ids.push(Commentary.teamId('col', false, TEAMS[m.teams[s]].id));
        for (let n = 1; n <= 6; n++) ids.push(Commentary.tnId('pbp', hi, TEAMS[m.teams[s]].id, n)); }   // (v14.3.25 "Comets number three", "Number three", and the early scores)
      for (let n = 1; n <= 6; n++) { ids.push(Commentary.numId('pbp', hi, n)); ids.push(Commentary.nwId('pbp', hi, n)); }
      for (let a = 0; a <= 3; a++) for (let o = 0; o <= 3; o++) ids.push(Commentary.scId('pbp', hi, a, o));
      for (const p of m.players || []) if (p.name) ids.push(Commentary.nameId('pbp', hi, Commentary.nameKey(p.name)));
    }
    for (const id of ids) if (this.index.has(id)) this.clip(id);
    /* v14.3.25 then, a few at a time, every phrase the booth can say (about 3 MB), so no call waits on a download */
    if (!this.phrasesQueued) { this.phrasesQueued = true; const all = [...this.index].filter(id => id.includes('_f_')); let i = 0;
      const next = () => { if (i >= all.length) return; for (const id of all.slice(i, i + 8)) this.clip(id); i += 8; setTimeout(next, 250); }; setTimeout(next, 1500); }
  },
  clip(id) {
    const ctx0 = Sound.ctx; if (!ctx0 || !this.index) return Promise.resolve(null);            // not ready yet: do not remember the miss
    if (!this.cache.has(id)) {
      const ctx = ctx0;
      this.cache.set(id, !this.index.has(id) ? Promise.resolve(null)
        : fetch(this.base + id + '.mp3').then(r => (r.ok ? r.arrayBuffer() : null)).then(b => (b ? new Promise(res => ctx.decodeAudioData(b, res, () => res(null))) : null)).catch(() => null));
    }
    return this.cache.get(id);
  },
  stop() { this.token++; this.mood = -1; try { if (this.current) for (const s of this.current) { try { s.stop(); } catch (e) {} } } catch (e) {} this.current = null; try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} },
  cycleMode(d) { const modes = ['full', 'voice', 'captions', 'off']; const i = Math.max(0, modes.indexOf(Settings.commentaryMode || 'full')); Settings.commentaryMode = modes[(i + (d || 1) + modes.length) % modes.length]; Settings.save(); if (Settings.commentaryMode !== 'full' && Settings.commentaryMode !== 'voice') this.stop(); },
  async speak(line) {                              // line: Commentary.parse() of a call
    this.init(); Sound.resume(); const ctx = Sound.ctx, now = ctx ? ctx.currentTime : 0;
    const chat = line.entry && /^pz/.test(line.entry.k);
    if (chat && this.current && now < this.until - 0.05) return;                     // (v14.3.25: the running play-by-play never talks over anything)
    if (line.entry && /^r[A-Z]/.test(line.entry.k) && this.current && now < this.until && !line.waited) { const w = { ...line, waited: true }; setTimeout(() => this.speak(w), (this.until - now + 0.35) * 1000); return; }   // (the colour man waits for the call to finish, then reacts)
    if (this.current && now < this.until && line.mood < this.mood) return;          // don't talk over a bigger moment
    const my = ++this.token; this.stopClips();
    const ids = Commentary.segments(line.entry, this.index ? (id => this.index.has(id)) : null), bufs = ctx && this.index ? await Promise.all(ids.map(id => this.clip(id))) : [];
    if (my !== this.token) return;                 // a newer call took over while the clips were loading
    if (!bufs.length || bufs.some(b => !b)) { if (!chat) this.say(line); return; }   /* (the running play-by-play is only spoken from recordings, never by the browser's robot voice) */
    /* v14.3.25 highs and lows: the clips are all recorded at one loudness; a calm line plays quieter, a big call louder */
    const lift = line.colour ? 0.8 : [0.68, 0.82, 1.0, 1.18][Math.max(0, Math.min(3, line.mood))];
    const bus = ctx.createGain(); bus.gain.value = Math.min(1.25, (Settings.commentVolume === undefined ? 1 : Settings.commentVolume) * lift); bus.connect(Sound.sfxBus || ctx.destination);
    let t = ctx.currentTime + 0.04; const sources = [];
    for (const b of bufs) { const s = ctx.createBufferSource(); s.buffer = b; s.connect(bus); s.start(t); sources.push(s); t += b.duration + 0.05; }   /* (a breath between the pieces of a call) */
    this.current = sources; this.mood = line.mood; this.until = t;
  },
  stopClips() { try { if (this.current) for (const s of this.current) { try { s.stop(); } catch (e) {} } } catch (e) {} this.current = null; try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} },
  say(line) {                                      // fallback: the browser's own voice
    if (!window.speechSynthesis) return;
    try {
      const v = (this.voices || []).slice().sort((a, b) => /natural|neural|premium|enhanced|google/i.test(b.name) - /natural|neural|premium|enhanced|google/i.test(a.name))[0], r = (a, b) => a + Math.random() * (b - a);
      for (const raw of line.text.match(/[^.!?]+[.!?]*/g) || [line.text]) {
        const u = new SpeechSynthesisUtterance(raw.trim()); if (v) { u.voice = v; u.lang = v.lang; }
        u.pitch = (line.colour ? 0.85 : 1) + line.mood * 0.1 + r(-0.05, 0.05); u.rate = 1 + line.mood * 0.07 + r(-0.04, 0.04); u.volume = Math.min(1, 0.75 + line.mood * 0.09);
        speechSynthesis.speak(u);
      }
    } catch (e) {}
  }
};
if (typeof window !== 'undefined') Commentator.init();
