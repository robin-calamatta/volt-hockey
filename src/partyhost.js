/* v14.3.1 Phones don't host. A browser stops a page whose screen turns off (or that goes behind another app), so a phone hosting a game
   froze it for everyone else in it. Now:
   - A party leader on a phone or tablet hands the hosting to a party member on a computer: that computer opens the room with the leader's
     game, and the leader and everyone else are brought in automatically. (No computer in the party: the leader's phone hosts as before.)
   - Public matches pick a computer to host when one is in the match (server/core.mjs).
   - The screen is kept awake while you're in an online game or room (Screen Wake Lock), so a phone doesn't doze off mid-match.
   - If a host does go to sleep anyway, the guests are told why the game stopped, and nobody is dropped for it (net.js). */
const isMobileDevice = () => !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
{ const mi = Party.meInfo; Party.meInfo = function (...a) { return { ...mi.apply(this, a), dev: isMobileDevice() ? 'mobile' : 'desktop' }; }; }
{ const fm = Party.fromMember, fl = Party.fromLeader;
  Party.fromMember = function (key, conn, msg) {
    if (msg && msg.t === 'hosted') { const code = cleanCode(msg.code); if (code && this.handing && this.handing.key === key) { clearTimeout(this.handing.timer); this.handing = null;
        for (const [k, c] of this.conns) if (k !== key) { try { c.send({ t: 'room', code }); } catch (e) { /* gone */ } }
        joinRoomFromAnywhere(code); } return; }
    if (msg && msg.t === 'hostno') { if (this.handing && this.handing.key === key) { clearTimeout(this.handing.timer); const H = this.handing; this.handing = null; H.fallback(); } return; }
    const r = fm.call(this, key, conn, msg);
    if (msg && msg.t === 'hello') { const m = this.members.find(x => x.key === key); if (m) { m.dev = msg.dev === 'mobile' ? 'mobile' : 'desktop'; } }
    return r;
  };
  Party.fromLeader = function (msg) {
    if (msg && msg.t === 'hostfor' && msg.preset && typeof msg.preset === 'object') {
      const g = typeof voltGame !== 'undefined' && voltGame.scene, busy = !g || ['Game', 'Room', 'Pause', 'BRQueue'].some(k => g.isActive(k));
      if (busy) { try { this.link.send({ t: 'hostno' }); } catch (e) { /* gone */ } return; }
      Toasts.show('Your party leader is on a phone, so your computer hosts this game. Starting...', [], 4000);
      g.getScenes(true).forEach(s => g.stop(s.sys.settings.key)); g.start('Room', { role: 'host', preset: { ...msg.preset, forLeader: 1 } }); return;
    }
    return fl.call(this, msg);
  };
}
/* the computer hosting for its leader: send the room's code back so the leader can bring everyone in */
{ const P = RoomScene.prototype, up = P.update;
  P.update = function (...a) { const r = up.apply(this, a), S = this.session; if (this.preset && this.preset.forLeader && !this.forSent && S && S.code && Party.link) { this.forSent = true; try { Party.link.send({ t: 'hosted', code: S.code }); } catch (e) { /* gone */ } } return r; };
}
/* the leader on a phone: hand the game to a computer in the party */
{ const pg = partyGame;
  partyGame = function (scene, preset) {
    if (Party.role !== 'leader' || !Party.others().length || !isMobileDevice() || (preset && (preset.season || preset.mm))) return pg(scene, preset);
    const pc = Party.others().find(m => m.dev === 'desktop' && Party.conns.get(m.key)); if (!pc) return pg(scene, preset);
    const full = { ...preset, autoStart: Party.members.length }, fallback = () => { Toasts.show('Your phone hosts this one.', [], 2500); pg(voltGame.scene.getScenes(true)[0] || scene, preset); };
    try { Party.conns.get(pc.key).send({ t: 'hostfor', preset: JSON.parse(JSON.stringify(full)) }); } catch (e) { return pg(scene, preset); }
    Party.handing = { key: pc.key, fallback, timer: setTimeout(() => { if (Party.handing && Party.handing.key === pc.key) { Party.handing = null; fallback(); } }, 12000) };
    Sound.play('select'); Toasts.show(`<b>${esc(pc.name)}</b>'s computer will host this game (a phone stops hosting when its screen turns off). Bringing everyone in...`, [], 5000);
    return true;
  };
}
/* keep the screen awake while you're online in a game or room */
const WakeKeep = {
  lock: null, busy: false,
  want() { const g = typeof voltGame !== 'undefined' && voltGame.scene; return !document.hidden && !!(typeof Online !== 'undefined' && Online.current) || !!(g && g.isActive('Game') && isMobileDevice()); },
  async tick() {
    if (this.busy || !navigator.wakeLock) return; const want = this.want();
    if (want && !this.lock) { this.busy = true; try { this.lock = await navigator.wakeLock.request('screen'); this.lock.addEventListener('release', () => { this.lock = null; }); } catch (e) { /* not allowed right now */ } this.busy = false; }
    else if (!want && this.lock) { try { await this.lock.release(); } catch (e) { /* gone */ } this.lock = null; }
  }
};
setInterval(() => WakeKeep.tick(), 3000); document.addEventListener('visibilitychange', () => WakeKeep.tick());
