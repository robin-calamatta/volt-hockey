/* v13.5: ready up, and play again.
   - Every real game (not the demos) waits on a READY UP screen until every player has pressed A (online too). The host's START skips the wait.
   - At the end: A plays again straight away (a minigame or Battle Royale gets a new random map), B goes back to the lobby.
     Online the host does the same for the room: A plays again with everyone, B goes back to the room. */
function randomMapFor(mini) {
  if (!mini) return mini; const op = (GAME_INFO[mini.kind] && GAME_INFO[mini.kind].opts || []).find(o => o.key === 'map'); if (!op || !op.values || op.values.length < 2) return mini;
  const vals = op.values.filter(v => v !== mini.map && v !== 'random'); return vals.length ? { ...mini, map: vals[Math.floor(Math.random() * vals.length)] } : mini;
}

{ const P = GameScene.prototype, up = P.update;
  P.update = function (time, delta) {
    const m = this.match, o = this.online;
    if (m && !this.demo && !(o && o.role === 'client')) {
      if (this.rdy === undefined) this.rdy = { t: 0, done: false };
      const R = this.rdy;
      if (!R.done && m.state === 'countdown') {
        R.t += Math.min(0.05, delta / 1000);
        const ps = (o ? o.players : this.setup.players) || [];
        for (const p of ps) { if (p._rdy) continue; const src = o ? (p.id === o.session.myId ? Controls.mine : (o.session.guestSrc && o.session.guestSrc.get(p.id))) : p.src; if (src && src.pressed && src.pressed.a) { p._rdy = true; Sound.play('blip'); } }
        const skip = R.t > 0.4 && Controls.mine.pressed && Controls.mine.pressed.start && (!o || o.role === 'host');
        if (ps.every(p => p._rdy) || skip || R.t > 90) { R.done = true; m.readyText = ''; if (Controls.mine.pressed) Controls.mine.pressed.start = false; }
        else { m.timer = CONFIG.match.countdownSeconds; m.readyText = ps.map(p => `${p._rdy ? '✅' : '⬜'} ${p.name}`).join('     '); }
      } else m.readyText = '';
    }
    if (m && !this.demo && m.state !== 'over') {                                   /* time played, by kind of game (the CAREER tab) */
      const k = m.mini ? (m.mini.kind === 'br' ? 'br' : 'mini') : 'volt', C = Settings.career = Settings.career || {}, T = C.time = C.time || {}; T[k] = (T[k] || 0) + Math.min(0.05, delta / 1000);
      this.timeAcc = (this.timeAcc || 0) + delta / 1000; if (this.timeAcc > 30) { this.timeAcc = 0; Settings.save(); } }
    else if (m && m.state === 'over' && this.timeAcc) { this.timeAcc = 0; Settings.save(); }
    const r = up.call(this, time, delta);
    this.drawReady();
    return r;
  };
  P.drawReady = function () {
    const m = this.match; if (!m || !this.scene.isActive()) return; const V = CONFIG.view, on = !!m.readyText && m.state === 'countdown';
    if (!this.rdyT || !this.rdyT.active) { this.rdyG = this.add.graphics().setDepth(70); this.rdyT = this.add.text(V.width / 2, V.height / 2 - 40, '', { fontFamily: FONT, fontSize: '46px', fontStyle: 'bold', color: '#ffd23f', align: 'center', stroke: '#05070f', strokeThickness: 6 }).setOrigin(0.5).setDepth(71); this.rdyL = this.add.text(V.width / 2, V.height / 2 + 30, '', { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#ffffff', align: 'center', wordWrap: { width: V.width - 120 } }).setOrigin(0.5).setDepth(71); this.rdyH = this.add.text(V.width / 2, V.height / 2 + 90, '', { fontFamily: FONT, fontSize: '18px', color: '#cfd8de', align: 'center' }).setOrigin(0.5).setDepth(71); }
    [this.rdyG, this.rdyT, this.rdyL, this.rdyH].forEach(x => x.setVisible(on)); if (!on) return;
    const pulse = 0.85 + 0.15 * Math.sin(this.time.now / 220); this.rdyG.clear().fillStyle(0x05070f, 0.72).fillRoundedRect(V.width / 2 - 460, V.height / 2 - 100, 920, 230, 22).lineStyle(3, 0xffd23f, pulse).strokeRoundedRect(V.width / 2 - 460, V.height / 2 - 100, 920, 230, 22);
    const o = this.online, host = !o || o.role === 'host';
    this.rdyT.setText('READY UP'); this.rdyL.setText(m.readyText); this.rdyH.setText(`Everyone press A when you're ready${host ? '     ·     START: go now' : ''}`);
  };
}

/* online: guests send "rdy" when they press A while the host is waiting; the host's snapshot carries who is ready */
{ const ap = HostSession.prototype.applyTo;
  HostSession.prototype.applyTo = function (p, x, y, events) { if (p && Array.isArray(events) && events.includes('rdy')) p._rdy = true; return ap.call(this, p, x, y, Array.isArray(events) ? events.filter(e => e !== 'rdy') : events); };
  const sn = HostSession.prototype.snapshot;
  if (sn) HostSession.prototype.snapshot = function (...a) { const s = sn.apply(this, a); if (s && this.match) s.ru = this.match.readyText || ''; return s; };
  const fr = ClientSim.prototype.frame;
  ClientSim.prototype.frame = function (dt, inputs) {
    if (this.m && this.m.readyText && this.m.state === 'countdown') for (const L of this.locals) { const f = inputs.find(x => x.id === L.id); if (f && f.input && f.input.pressed && f.input.pressed.a && !L.rdySent) { L.pending.push('rdy'); L.rdySent = true; } }
    return fr.call(this, dt, inputs);
  };
  const os = ClientSim.prototype.onSnap;
  ClientSim.prototype.onSnap = function (s) { const r = os.call(this, s); if (this.m && s) this.m.readyText = s.ru || ''; return r; };
}

/* online play again: the host's room starts the next game by itself once everyone is back in it */
{ const P = RoomScene.prototype, cr = P.create, up = P.update;
  P.create = function () { cr.call(this); this.againAt = this.again ? this.time.now + 1600 : 0; if (this.again && this.statusText) this.statusText.setText('PLAYING AGAIN...'); };
  P.update = function (...a) { if (this.againAt && this.role === 'host' && this.time.now > this.againAt && this.session && !this.opening) { this.againAt = 0; this.again = false; return this.startHost(); } return up.apply(this, a); };
}
