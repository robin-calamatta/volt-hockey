/* Voice chat: with your party the whole time you are in one, and with everyone in your online room.
   Rules: logged-in players only (guests have no voice). If either player is under 18 you only hear each other if you are friends.
   Muted or blocked players are never connected. Audio goes player-to-player over WebRTC (PeerJS media calls): no server in between.
   Settings (Settings > Voice chat): mode (open mic / push to talk / muted mic / off), microphone, mic volume, hear yourself (monitoring),
   voice volume. The speakers are the ones chosen in Settings > Sound (same output as the game). Push to talk: hold L3 on a gamepad,
   G on keyboard 1, L on keyboard 2, or the mic button on screen. */
const Voice = {
  peer: null, id: '', calls: new Map(), stream: null, mic: null, nodes: null, wantIds: new Set(), levels: new Map(), testing: false, opening: null, lastError: '', pttHeld: false,
  myId() { return this.id; },
  supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof Peer === 'function'); },
  mode() { return Settings.voiceMode || 'open'; },

  /* Who should I be connected to right now? (room players, else party members) */
  channel() {
    const out = new Map(), add = p => { if (!p.acct || p.acct === Account.name) return; const k = p.acct.toLowerCase(), was = out.get(k); out.set(k, { ...was, ...p, vid: p.vid || (was && was.vid) || '', party: (was && was.party) || p.party }); };
    if (Party.active) for (const m of Party.others()) add({ vid: m.vid, name: m.name, acct: m.acct, adult: m.adult, party: true });   // your party: the whole time you are in it
    if (Online.current) for (const r of Online.roster()) if (r.id !== Online.myId()) add({ vid: r.vid, name: r.name, acct: r.acct, adult: r.adult });   // plus everyone in your room
    return [...out.values()];
  },
  allowed(p) {
    if (!Account.loggedIn || !p || !p.acct || Social.isMuted(p.acct)) return false;
    return (Account.adult && p.adult) || Social.isFriend(p.acct);            // under 18 on either side: friends only
  },
  /* Called whenever the room, the party, friends or settings change. */
  refresh() {
    clearTimeout(this.refreshTimer); this.refreshTimer = setTimeout(() => this.sync(), 50);
  },
  async sync() {
    const want = this.channel().filter(p => this.allowed(p)), on = this.mode() !== 'off' && this.supported() && Account.loggedIn && want.length > 0;
    if (!on) { this.hangUpAll(); if (!this.testing) this.closeMic(); return; }
    try { await this.ensurePeer(); if (this.mode() !== 'mute') await this.ensureMic(); else if (!this.testing) this.closeMic(); } catch (e) { this.lastError = e.message || String(e); return; }
    this.wantIds = new Set(want.filter(p => p.vid).map(p => p.vid));                 // (someone without a voice id yet gets one in a moment and is called then)
    for (const [vid, c] of this.calls) if (!this.wantIds.has(vid)) this.hangUp(vid);
    for (const p of want) if (p.vid && !this.calls.has(p.vid) && this.id < p.vid) this.call(p.vid);      // the lower id rings, so each pair makes one call
  },

  /* ---- the voice peer (its own PeerJS id, shared through the room roster / party list) ---- */
  ensurePeer() {
    if (this.peer && !this.peer.destroyed && this.id) return Promise.resolve();
    if (this.opening) return this.opening;
    this.opening = new Promise((resolve, reject) => {
      const id = CONFIG.online.roomPrefix + 'v-' + randomId(12), peer = new Peer(id, PEER_OPTS());
      peer.on('open', () => {
        this.peer = peer; this.id = id; this.opening = null; resolve();
        if (Online.current) Online.current.setVid(id); if (Party.active) Party.updateVid();
      });
      peer.on('call', call => this.answer(call));
      peer.on('error', e => { if (!this.id) { this.opening = null; peer.destroy(); reject(e); } });
      peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
    });
    return this.opening;
  },
  outStream() { return this.nodes ? this.nodes.dest.stream : this.silent(); },
  silent() { const c = this.ctx(); if (!this._silent) this._silent = c.createMediaStreamDestination().stream; return this._silent; },   // listen-only: send silence
  ctx() { Sound.resume(); return Sound.ctx; },
  call(vid) { if (!this.peer) return; const call = this.peer.call(vid, this.outStream()); this.track(vid, call); },
  answer(call) {
    const who = this.channel().find(p => p.vid === call.peer);                   // (unknown caller: not in your room or party, or the list has not caught up; they ring again when it has)
    if (!who || !this.allowed(who) || this.mode() === 'off') { try { call.close(); } catch (e) { /* gone */ } return; }
    call.answer(this.outStream()); this.track(call.peer, call);
  },
  track(vid, call) {
    const old = this.calls.get(vid); if (old && old.call !== call) { try { old.call.close(); } catch (e) { /* gone */ } }
    const entry = { call, el: null, an: null, state: 'connecting', at: performance.now() }; this.calls.set(vid, entry);
    call.on('stream', s => this.play(vid, s));
    call.on('close', () => this.drop(vid, call)); call.on('error', () => this.drop(vid, call));
  },
  play(vid, stream) {                                          // their voice: an audio element (so the chosen speaker and volume apply) plus a level meter
    const e = this.calls.get(vid); if (!e) return;
    if (!e.el) { e.el = new Audio(); e.el.autoplay = true; }
    e.el.srcObject = stream; this.applyVolumes(); this.applySpeaker(); e.el.play().catch(() => {});
    try { const c = this.ctx(), src = c.createMediaStreamSource(stream), an = c.createAnalyser(); an.fftSize = 512; src.connect(an); e.an = an; } catch (x) { /* meters only */ }
  },
  drop(vid, call) { const e = this.calls.get(vid); if (e && (!call || e.call === call)) { if (e.el) { e.el.srcObject = null; } this.calls.delete(vid); this.levels.delete(vid); } },
  hangUp(vid) { const e = this.calls.get(vid); if (e) { try { e.call.close(); } catch (x) { /* gone */ } this.drop(vid); } },
  hangUpAll() { for (const vid of [...this.calls.keys()]) this.hangUp(vid); },

  /* ---- your microphone ---- */
  async ensureMic() {
    if (this.nodes && this.micDevice === (Settings.micId || '')) return;
    this.closeMic(true);
    const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }; if (Settings.micId) audio.deviceId = { exact: Settings.micId };
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio }); }
    catch (e) { if (Settings.micId) { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } else throw new Error(e.name === 'NotAllowedError' ? 'Microphone permission was refused.' : 'No microphone found.'); }
    const c = this.ctx(), src = c.createMediaStreamSource(stream), gain = c.createGain(), an = c.createAnalyser(), gate = c.createGain(), dest = c.createMediaStreamDestination(), monitor = c.createGain();
    an.fftSize = 512; src.connect(gain); gain.connect(an); gain.connect(gate); gate.connect(dest); gain.connect(monitor); monitor.connect(Sound.master || c.destination);
    this.mic = stream; this.micDevice = Settings.micId || ''; this.nodes = { src, gain, an, gate, dest, monitor };
    this.applyVolumes(); this.updateGate();
    for (const e of this.calls.values()) { try { const sender = e.call.peerConnection && e.call.peerConnection.getSenders().find(s => s.track && s.track.kind === 'audio'); if (sender) sender.replaceTrack(dest.stream.getAudioTracks()[0]); } catch (x) { /* will be right on the next call */ } }
  },
  closeMic(keepCalls) {
    if (this.mic) for (const t of this.mic.getTracks()) t.stop();
    if (this.nodes) { try { this.nodes.src.disconnect(); this.nodes.monitor.disconnect(); } catch (e) { /* gone */ } }
    this.mic = null; this.nodes = null;
  },
  async devices() {                                             // [{ kind: 'audioinput' | 'audiooutput', id, label }]
    try { const list = await navigator.mediaDevices.enumerateDevices(); return list.filter(d => d.kind === 'audioinput' || d.kind === 'audiooutput').map(d => ({ kind: d.kind, id: d.deviceId, label: d.label || (d.kind === 'audioinput' ? 'Microphone' : 'Speaker') + ' ' + d.deviceId.slice(0, 4) })); }
    catch (e) { return []; }
  },
  /* Mic test in the settings: open the mic (and hear yourself if monitoring is on) without being in a call. */
  async test(on) { this.testing = on; if (on) { try { await this.ensureMic(); } catch (e) { this.lastError = e.message; this.testing = false; } } else this.refresh(); this.updateGate(); this.applyVolumes(); },

  /* ---- volumes, push to talk, levels ---- */
  applyVolumes() {
    const vv = (Settings.voiceVolume === undefined ? 1 : Settings.voiceVolume) * (Settings.masterVolume === undefined ? 1 : Settings.masterVolume);
    for (const e of this.calls.values()) if (e.el) e.el.volume = Math.max(0, Math.min(1, vv));
    if (this.nodes) { this.nodes.gain.gain.value = Settings.micVolume === undefined ? 1 : Settings.micVolume; this.nodes.monitor.gain.value = Settings.micMonitor ? 0.9 : 0; }   // hear yourself
  },
  applySpeaker() { const id = Settings.speakerId || ''; for (const e of this.calls.values()) if (e.el && e.el.setSinkId) e.el.setSinkId(id).catch(() => {}); },
  talking() { const m = this.mode(); return m === 'open' || (m === 'ptt' && this.pttHeld); },
  updateGate() { if (this.nodes) this.nodes.gate.gain.setTargetAtTime(this.talking() ? 1 : 0, this.ctx().currentTime, 0.015); },
  level(an) { if (!an) return 0; const a = new Uint8Array(an.fftSize); an.getByteTimeDomainData(a); let s = 0; for (const v of a) s += (v - 128) * (v - 128); return Math.min(1, Math.sqrt(s / a.length) / 40); },
  micLevel() { return this.nodes ? this.level(this.nodes.an) : 0; },
  /* every frame (from Chat's overlay loop): push to talk and who is speaking */
  frame() {
    const held = Controls.list().some(s => s.raw && s.raw.held.talk) || this.touchTalk;
    if (held !== this.pttHeld) { this.pttHeld = held; this.updateGate(); }
    for (const [vid, e] of this.calls) {
      this.levels.set(vid, this.level(e.an));
      const pc = e.call.peerConnection, ice = pc ? pc.iceConnectionState : '';                     // how each voice link is doing (shown in the friends panel)
      e.state = ice === 'connected' || ice === 'completed' ? 'connected' : ice === 'failed' || (ice !== 'connected' && performance.now() - e.at > 15000 && !e.el) ? 'failed' : 'connecting';
    }
  },
  /* 'connected' | 'connecting' | 'failed' | 'blocked' (age / mute rules) | 'off' for a person in your party or room */
  statusOf(acct, vid) {
    if (this.mode() === 'off' || !Account.loggedIn) return 'off';
    const p = this.channel().find(x => x.acct === acct); if (p && !this.allowed(p)) return 'blocked';
    const e = vid && this.calls.get(vid); return e ? e.state : 'connecting';
  },
  speakers() {                                                  // [{ name, level, me }] for the on-screen list
    const out = []; if (!this.calls.size) return out;
    out.push({ name: Settings.myName() || 'You', level: this.talking() ? this.micLevel() : 0, me: true, muted: !this.talking() });
    const ch = this.channel(); for (const [vid] of this.calls) { const p = ch.find(x => x.vid === vid); out.push({ name: p ? p.name : '?', level: this.levels.get(vid) || 0 }); }
    return out;
  }
};
