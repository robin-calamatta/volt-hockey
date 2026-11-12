/* v14: VICTORY ROYALE. When the last team is left, the game doesn't stop dead: a big party starts. "VICTORY ROYALE" over the screen,
   confetti and fireworks, and the winners keep driving round for a while: they can't be hurt, their guns never run dry, and they can
   shoot and emote all they like. Then the results. (Online the host runs it; the guests see it from the snapshot.) */
const VIC = { secs: 12 };
{ const M = MODES.br, end0 = M.end, hurt0 = M.hurt, step0 = M.step;
  M.end = function (m, team) {
    const g = m.gs; if (m.state !== 'play') return;
    if (team === undefined || (g.vic && g.t - g.vic.t0 >= VIC.secs)) return end0.call(this, m, g.vic ? g.vic.team : team);
    if (!g.vic) { g.vic = { team, t0: g.t }; m.sfx('goal'); m.notice = ''; }
  };
  M.hurt = function (m, c, ...a) { if (m.gs && m.gs.vic) return; return hurt0.call(this, m, c, ...a); };
  M.step = function (m, h, ...a) {
    const r = step0.call(this, m, h, ...a), g = m.gs;
    if (g && g.vic && m.state === 'play') {
      for (const c of m.chairs) if (c.gs.team === g.vic.team && !c.out) { const G = c.gs; G.down = false; G.hp = Math.max(G.hp, 100); for (const it of G.inv) if (BR_GUNS[it.k]) it.a = BR_GUNS[it.k].ammo; }   // (bottomless guns)
      if (g.t - g.vic.t0 >= VIC.secs) this.end(m, g.vic.team);
    }
    return r;
  };
}

/* the party on screen */
{ const P = GameScene.prototype, up = P.update;
  P.update = function (time, delta) { const r = up.call(this, time, delta); try { this.drawVictory(Math.min(0.05, delta / 1000)); } catch (e) { console.warn(e); } return r; };
  P.drawVictory = function (dt) {
    const m = this.match, g = m && m.kind === 'br' && m.gs, v = g && g.vic, on = !!v && m.state === 'play' && this.scene.isActive();
    const V = CONFIG.view, X = this.vic || (this.vic = {});
    if (!on) { if (X.g && X.g.active) [X.g, X.t, X.s, X.c].forEach(o => o.setVisible(false)); X.on = false; return; }
    if (!X.g || !X.g.active) { X.g = this.add.graphics().setDepth(37); X.t = this.add.text(V.width / 2, 150, 'VICTORY ROYALE', { fontFamily: FONT, fontSize: '104px', fontStyle: 'bold', color: '#ffd23f', stroke: '#2a1450', strokeThickness: 14 }).setOrigin(0.5).setDepth(38).setShadow(0, 6, '#000000', 14, true, true);
      X.s = this.add.text(V.width / 2, 232, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffffff', stroke: '#05070f', strokeThickness: 6, align: 'center' }).setOrigin(0.5).setDepth(38);
      X.c = this.add.text(V.width / 2, V.height - 46, '', { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#cfd8de', stroke: '#05070f', strokeThickness: 5 }).setOrigin(0.5).setDepth(38); }
    if (!X.on) { X.on = true; X.age = 0; X.bits = []; X.fw = []; X.nextFw = 0.2; X.mine = this.vicMine(); X.won = X.mine === v.team || X.mine < 0; X.place = X.won ? 1 : brPlaceOf(m, X.mine); if (X.won) { try { Sound.play('goal'); if (Sound.crowd) Sound.crowd.cheer(1); } catch (e) { } this.cameras.main.flash(400, 255, 230, 120); } else { try { Sound.play('back'); } catch (e) { } } }
    X.age += dt; const age = X.age, won = X.won, names = m.chairs.filter(c => c.gs.team === v.team).map(c => m.name(c)).join(' + ');
    [X.g, X.t, X.s, X.c].forEach(o => o.setVisible(true));
    const pop = age < 0.35 ? 0.3 + age * 2.4 : 1 + 0.04 * Math.sin(age * 5); X.t.setText(won ? 'VICTORY ROYALE' : `YOU PLACED #${X.place}`).setScale(pop).setAngle(Math.sin(age * 2.2) * 2).setColor(won ? '#ffd23f' : '#ffffff');
    const hue = (age * 0.25) % 1; X.t.setStroke(Phaser.Display.Color.HSLToColor(hue, 0.8, 0.28).rgba, 14);
    X.s.setText(won ? 'PARTY TIME!  Drive, shoot and emote: nothing can hurt you now' : `${names.toUpperCase()} ${names.includes('+') ? 'WIN' : 'WINS'} THIS ONE.  Better luck next drop!`);   // (v14.2.11: losers see their place, not VICTORY)
    X.c.setText(`Results in ${Math.max(0, Math.ceil(VIC.secs - (g.t - v.t0)))}`);
    /* confetti: a steady fall from the top, more at the start */
    const G = X.g.clear(), want = !won ? 0 : age < 1.2 ? 14 : 3, cols = [0xffd23f, 0xff5fa2, 0x3dd6ff, 0x7dff6a, 0xc44dff, 0xffffff, 0xff7a1c];
    for (let i = 0; i < want; i++) X.bits.push({ x: Math.random() * V.width, y: age < 1.2 ? V.height * 0.35 + (Math.random() - 0.5) * 80 : -10, vx: (Math.random() - 0.5) * (age < 1.2 ? 900 : 60), vy: age < 1.2 ? -300 - Math.random() * 500 : 40 + Math.random() * 60, r: Math.random() * 6, vr: (Math.random() - 0.5) * 14, s: 5 + Math.random() * 6, c: cols[(Math.random() * cols.length) | 0], life: 6 });
    X.bits = X.bits.filter(b => (b.life -= dt) > 0 && b.y < V.height + 20).slice(-420);
    for (const b of X.bits) { b.vy += 520 * dt; b.vy = Math.min(b.vy, 170); b.vx *= Math.exp(-1.6 * dt); b.x += (b.vx + 30 * Math.sin(b.r * 2)) * dt; b.y += b.vy * dt; b.r += b.vr * dt; const w = Math.abs(Math.cos(b.r)) * b.s + 1; G.fillStyle(b.c, 0.95).fillRect(b.x - w / 2, b.y - b.s * 0.35, w, b.s * 0.7); }
    /* fireworks */
    if (won && (X.nextFw -= dt) <= 0) { X.nextFw = 0.35 + Math.random() * 0.5; const fx = V.width * (0.12 + Math.random() * 0.76), fy = V.height * (0.12 + Math.random() * 0.35), c = cols[(Math.random() * cols.length) | 0], n = 46;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, sp = 180 + Math.random() * 120; X.fw.push({ x: fx, y: fy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c, life: 1.3, max: 1.3 }); }
      try { if (Math.random() < 0.6) Sound.play('boom'); } catch (e) { } }
    X.fw = X.fw.filter(f => (f.life -= dt) > 0);
    for (const f of X.fw) { f.vx *= Math.exp(-2.2 * dt); f.vy = f.vy * Math.exp(-2.2 * dt) + 90 * dt; f.x += f.vx * dt; f.y += f.vy * dt; const k = f.life / f.max; G.fillStyle(f.c, k).fillCircle(f.x, f.y, 2 + 2.5 * k); G.fillStyle(0xffffff, k * 0.6).fillCircle(f.x, f.y, 1.2); }
    /* a glow band behind the words */
    G.fillStyle(0x05070f, 0.35).fillRect(0, 86, V.width, 170); G.lineStyle(3, won ? 0xffd23f : 0x8fa3b3, 0.5 + 0.4 * Math.sin(age * 6)).lineBetween(0, 86, V.width, 86).lineBetween(0, 256, V.width, 256);
  };
  P.vicMine = function () { const mine = this.brMine().map(p => p.chair); let c = mine[0]; if (!c && this.online && this.brMyChair) c = this.brMyChair(); return c ? c.gs.team : -1; };
}

/* v14.2.11: your team's place: the last team standing is #1, the first team knocked out is last */
function brPlaceOf(m, team) {
  const teams = [...new Set(m.chairs.map(c => c.gs && c.gs.team).filter(t => t !== undefined))], dead = (m.gs && m.gs.dead) || [], outOrder = [];
  dead.forEach((k, i) => { const c = m.chairs.find(q => q.k === k); if (!c) return; const t = c.gs.team, so = dead.slice(0, i + 1); if (outOrder.includes(t)) return; if (m.chairs.filter(q => q.gs.team === t).every(q => so.includes(q.k))) outOrder.push(t); });
  const i = outOrder.indexOf(team); return i < 0 ? 1 : teams.length - i;
}
