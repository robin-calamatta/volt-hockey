/* v14.1: after every game, the XP you earned, line by line: each line slides in and its number fizzes up in sparks, the total counts up and the
   level bar fills (with a burst when you level up). Any button (or a tap) skips it. It shows for the player whose profile this is. */
const XPS = { delay: 1.8, row: 0.55, hold: 6 };
{ const tt = Progress.toast.bind(Progress);
  Progress.toast = function (title, sub, big) { try { const g = window.voltGame, sc = g && g.scene.isActive('Game') && g.scene.getScene('Game'); if (sc && !sc.setup.demo && /^\+\d+ XP$/.test(title)) return; } catch (e) { /* show it */ } return tt(title, sub, big); };   // (in a game: the showcase at the end shows these)
}
function xpRows(sc) {
  const log = (Progress.xpLog || []).slice(sc.xpMark || 0), rows = [], M = Progress.lastMatch && Progress.lastMatchAt >= (sc.xpMarkT || 0) ? Progress.lastMatch : null;
  const nice = t => { let m;
    if (t === 'played') return ['🎮', 'Played the match']; if ((m = /^(\d+) min$/.exec(t))) return ['⏱️', `Time played (${m[1]} min)`]; if ((m = /^(\d+) eliminations$/.exec(t))) return ['💥', `Eliminations  ×${m[1]}`];
    if ((m = /^(\d+) goals$/.exec(t))) return ['🏒', `Goals  ×${m[1]}`]; if (t === 'win') return ['🏆', 'VICTORY']; if (t === 'top 3') return ['🥉', 'Top 3 finish']; return ['⚡', t]; };
  for (const e of log) {
    if (M && /^Match (won|played)/.test(e.why || '')) { for (const [x, t] of M.parts) { const [ic, s] = nice(t); rows.push({ ic, s, xp: x, big: t === 'win' }); } continue; }
    const q = /^Quest complete: (.*)$/.exec(e.why || ''); rows.push(q ? { ic: '📜', s: 'Quest: ' + q[1], xp: e.xp } : { ic: '⚡', s: e.why || 'Bonus', xp: e.xp });
  }
  return rows;
}
{ const mo = Progress.matchOver; Progress.matchOver = function (...a) { this.lastMatchAt = Date.now(); return mo.apply(this, a); }; }
{ const P = GameScene.prototype, ini = P.init, up = P.update;
  P.init = function (...a) { this.xpMark = (Progress.xpLog || []).length; this.xpMarkT = Date.now(); this.xpS = null; this.xpOverT = 0; this.xpOverAt = 0; return ini.apply(this, a); };
  P.update = function (time, delta) {
    const dt = Math.min(0.05, delta / 1000), m = this.match, X = this.xpS;
    if (X && X.on) {                                                       // the showcase has the controls: any button skips it
      Controls.update(this.game.loop.frame); const srcs = [...Controls.list(), Controls.combined, Controls.mine];
      const hit = srcs.some(s => s && s.pressed && ['a', 'b', 'start', 'x', 'y'].some(b => s.pressed[b])) || Controls.escPressed || X.tapped;
      for (const s of srcs) if (s && s.pressed) for (const b of BUTTONS) s.pressed[b] = false; Controls.escPressed = false;
      if (hit && X.t > 0.35) this.xpClose();
    }
    try { this.xpTick(dt, delta); } catch (e) { console.warn('xp showcase', e); }
    return up.call(this, time, delta);
  };
  P.xpTick = function (dt, delta) {
    const m = this.match; if (!this.sys.isActive() || !m || this.setup.demo) return;
    if (m.state === 'over' || this.xpOverAt) { const now = performance.now(); this.xpOverAt = this.xpOverAt || now; this.xpOverT = (now - this.xpOverAt) / 1000; if (!this.xpS && this.xpOverT > XPS.delay) { const rows = xpRows(this); this.xpS = { on: false, done: true }; if (rows.length) this.xpOpen(rows); } }
    if (this.xpS && this.xpS.on) this.xpDraw(dt);
  };
  P.xpOpen = function (rows) {
    const V = CONFIG.view, total = rows.reduce((a, r) => a + r.xp, 0), per = SEASON1.xpPerTier, after = Progress.P.xp, before = Math.max(0, after - total);
    const X = this.xpS = { on: true, t: 0, rows, total, before, after, per, sparks: [], objs: [], shown: 0, lvShown: 1 + Math.floor(before / per), tapped: false };
    const D = 300, o = (obj) => { X.objs.push(obj); return obj.setDepth(D + 1); };
    X.g = o(this.add.graphics()); X.fx = o(this.add.graphics()); X.fx.setDepth(D + 3);
    X.zone = o(this.add.zone(V.width / 2, V.height / 2, V.width, V.height).setInteractive()); X.zone.on('pointerdown', () => { X.tapped = true; });
    const tx = (x, y, s, size, col, ox = 0, bold = true) => o(this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', fontStyle: bold ? 'bold' : 'normal', color: col, stroke: '#05070f', strokeThickness: 4 }).setOrigin(ox, 0.5)).setDepth(D + 2);
    X.title = tx(V.width / 2, 132, 'XP EARNED', 58, '#ffd23f', 0.5); X.name = tx(V.width / 2, 178, (Settings.myName() || 'Player').toUpperCase(), 22, '#9fb2bf', 0.5);
    const top = 216, rh = Math.min(46, 300 / Math.max(1, rows.length)), px = V.width / 2 - 330;
    X.rowObjs = rows.map((r, i) => { const y = top + i * rh + rh / 2, ic = tx(px, y, r.ic, Math.min(28, rh - 10), '#ffffff').setFontFamily('sans-serif'), s = tx(px + 46, y, r.s, Math.min(24, rh - 14), r.big ? '#ffd23f' : '#ffffff', 0, !!r.big), n = tx(px + 660, y, '', Math.min(26, rh - 12), '#5fd6ff', 1);
      if (s.width > 470) s.setScale(470 / s.width); [ic, s, n].forEach(q => q.setAlpha(0)); return { ic, s, n, y, at: XPS.delay * 0 + 0.5 + i * XPS.row, shown: 0 }; });
    X.totY = top + rows.length * rh + 34; X.tot = tx(px, X.totY, 'TOTAL', 30, '#ffffff'); X.totN = tx(px + 660, X.totY, '+0 XP', 36, '#ffd23f', 1);
    X.lvY = X.totY + 62; X.lv = tx(px, X.lvY - 26, '', 20, '#c9d6df'); X.hint = tx(V.width / 2, Math.min(V.height - 40, X.lvY + 66), 'A  /  tap  to continue', 18, '#9fb2bf', 0.5);
    X.end = 0.5 + rows.length * XPS.row + 1.2; Sound.play('select');
  };
  P.xpDraw = function (dt) {
    const X = this.xpS, V = CONFIG.view; X.t += dt; const t = X.t, g = X.g.clear(), fx = X.fx.clear(), px = V.width / 2 - 330;
    const fade = Math.min(1, t / 0.3); g.fillStyle(0x05070f, 0.8 * fade).fillRect(0, 0, V.width, V.height);
    const ph = X.lvY + 46 - 90; g.fillStyle(0x0c1424, 0.96 * fade).fillRoundedRect(V.width / 2 - 370, 90, 740, ph, 20).lineStyle(3, 0xffd23f, (0.6 + 0.3 * Math.sin(t * 4)) * fade).strokeRoundedRect(V.width / 2 - 370, 90, 740, ph, 20);
    X.title.setScale(t < 0.3 ? 0.6 + t * 1.4 : 1 + 0.02 * Math.sin(t * 3)).setAlpha(fade); X.name.setAlpha(fade);
    let sum = 0;
    X.rowObjs.forEach((R, i) => { const k = Math.max(0, Math.min(1, (t - R.at) / 0.35)), e = 1 - Math.pow(1 - k, 3), r = X.rows[i];
      R.ic.setAlpha(e).setX(px - 40 * (1 - e)); R.s.setAlpha(e).setX(px + 46 - 40 * (1 - e));
      const c = Math.max(0, Math.min(1, (t - R.at - 0.1) / 0.4)), val = Math.round(r.xp * c); R.n.setAlpha(c > 0 ? 1 : 0).setText(`+${val} XP`).setScale(c > 0 && c < 1 ? 1.15 : 1); sum += val;
      if (c > 0 && !R.burst) { R.burst = true; Sound.play('blip'); this.xpBurst(px + 640, R.y, r.big ? 46 : 22, r.big ? [0xffd23f, 0xffffff, 0xff7a1c] : [0x5fd6ff, 0x9fe8ff, 0xffffff]); }
      if (c > 0 && c < 1 && Math.random() < 0.6) X.sparks.push({ x: px + 600 + Math.random() * 60, y: R.y + 8, vx: (Math.random() - 0.5) * 40, vy: -60 - Math.random() * 120, life: 0.6, max: 0.6, c: 0x9fe8ff, r: 2 }); });
    X.totN.setText(`+${sum} XP`).setScale(1 + (sum < X.total && sum > 0 ? 0.04 * Math.sin(t * 30) : 0)); X.tot.setAlpha(t > 0.4 ? 1 : 0); X.totN.setAlpha(t > 0.4 ? 1 : 0);
    /* the level bar, filling with what's been counted so far */
    const xp = X.before + sum, lv = 1 + Math.floor(xp / X.per), into = (xp % X.per) / X.per, bx = px, bw = 660, by = X.lvY;
    if (lv > X.lvShown) { X.lvShown = lv; Sound.play('goal'); this.xpBurst(bx + bw / 2, by, 90, [0xffd23f, 0xff5fa2, 0x3dd6ff, 0x7dff6a, 0xffffff]); this.cameras.main.flash(250, 255, 230, 140); X.lvUp = t; }
    X.lv.setText(`LEVEL ${lv}${X.lvUp && t - X.lvUp < 2.5 ? '   ·   LEVEL UP!' : ''}     ${Math.round(xp % X.per)} / ${X.per}`).setColor(X.lvUp && t - X.lvUp < 2.5 ? '#ffd23f' : '#c9d6df');
    g.fillStyle(0x223040, 1).fillRoundedRect(bx, by - 8, bw, 16, 8).fillStyle(0x5fd6ff, 1).fillRoundedRect(bx, by - 8, Math.max(16, bw * into), 16, 8);
    if (sum < X.total && sum > 0) for (let k = 0; k < 2; k++) X.sparks.push({ x: bx + bw * into, y: by, vx: (Math.random() - 0.3) * 120, vy: (Math.random() - 0.5) * 120, life: 0.5, max: 0.5, c: 0xffffff, r: 2.2 });
    X.hint.setAlpha(t > X.end ? 0.5 + 0.5 * Math.sin(t * 5) : 0);
    X.sparks = X.sparks.filter(s => (s.life -= dt) > 0); for (const s of X.sparks) { s.vy += 200 * dt; s.x += s.vx * dt; s.y += s.vy * dt; const k = s.life / s.max; fx.fillStyle(s.c, k).fillCircle(s.x, s.y, s.r * (0.5 + k)); }
    if (t > X.end + XPS.hold) this.xpClose();
  };
  P.xpBurst = function (x, y, n, cols) { const X = this.xpS; for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 260; X.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.5 + Math.random() * 0.6, max: 1.1, c: cols[i % cols.length], r: 1.6 + Math.random() * 2.2 }); } };
  P.xpClose = function () { const X = this.xpS; if (!X || !X.on) return; X.on = false; X.objs.forEach(o => o.destroy()); Sound.play('back'); };
}
