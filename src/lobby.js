/* The lobby (v12): the main screen. Your character sits on a lit stage; tabs along the top (LB / RB, or Q / E, or click):
   PLAY (the mode you picked, your daily quests, a big PLAY button; ▼ opens every mode), LOCKER (outfit, colours, hat, face, hair, skin,
   cart decal, your emoji wheel), PASS (Season 1: The Beginning, free rewards), QUESTS (daily and weekly) and CAREER. Start opens the menu
   (settings, controls, name, leaderboard). The scene key is still 'Main', so every "back to the menu" lands here. */
const LOBBY_TABS = ['PLAY', 'LOCKER', 'PASS', 'QUESTS', 'CAREER'];
const LOBBY_MODES = [
  { id: 'hockey', name: 'VOLT HOCKEY', sub: 'A match against the CPU or friends', icon: '🏒', col: 0x2f6fed, go: sc => sc.scene.start('Setup', { practice: false }) },
  { id: 'br', name: 'VOLT ROYALE', sub: 'Loot, beat the storm, be the last one left', icon: '⚡', col: 0x8e44ff, go: sc => sc.scene.start('MiniSetup', { kind: 'br' }) },
  { id: 'mini', name: 'MINIGAMES', sub: 'Races, paintball, golf, sumo and more', icon: '🎉', col: 0xff7a1c, go: sc => sc.scene.start('Minigames') },
  { id: 'season', name: 'SEASON', sub: 'A full season, the playoffs and the World Cup', icon: '🏆', col: 0x1f9d55, go: sc => sc.scene.start('SeasonMenu') },
  { id: 'practice', name: 'PRACTICE ARENA', sub: 'Any team sizes, no clock', icon: '🎯', col: 0x139c8a, go: sc => sc.scene.start('Setup', { practice: true }) },
  { id: 'online', name: 'ONLINE', sub: 'Host or join a room with friends', icon: '🌐', col: 0xd63a3a, go: sc => sc.scene.start('OnlineMenu') }
];
const LOCKER_SLOTS = [
  { key: 'outfit', name: 'OUTFIT', list: () => COS.outfits }, { key: 'shirt', name: 'OUTFIT COLOUR', colors: () => COS.colors }, { key: 'hat', name: 'HAT', list: () => COS.hats },
  { key: 'hatCol', name: 'HAT COLOUR', colors: () => COS.colors }, { key: 'face', name: 'FACE', list: () => COS.faces }, { key: 'hairStyle', name: 'HAIRSTYLE', list: () => COS.hairStyles }, { key: 'hair', name: 'HAIR COLOUR', colors: () => COS.hair },
  { key: 'skin', name: 'SKIN TONE', colors: () => COS.skin }, { key: 'decal', name: 'CART DECAL', list: () => COS.decals }, { key: 'wheel', name: 'EMOJI + ACTION WHEEL', wheel: true }
];

class LobbyHomeScene extends Phaser.Scene {
  constructor() { super('Main'); }
  create() {
    Progress.quests(); this.tab = Settings.lobbyTab || 0; this.overlay = null; this.lk = { col: 0, slot: 0, item: 0, pick: -1 }; this.passCur = Math.max(0, Progress.tier() - 1); this.preview = null;
    this.stage = window.__lobbyStage || (window.__lobbyStage = new LobbyStage());
    if (!this.stage.ok) menuBackdrop(this);
    this.events.once('shutdown', () => { Render3D.show(false); Settings.lobbyTab = this.tab; });
    const V = CONFIG.view, g = this.add.graphics().setDepth(5);
    g.fillGradientStyle(0x05070f, 0x05070f, 0x05070f, 0x05070f, 0.85, 0.85, 0, 0).fillRect(0, 0, V.width, 92);              // a dark band behind the tabs
    g.fillGradientStyle(0x05070f, 0x05070f, 0x05070f, 0x05070f, 0, 0, 0.8, 0.8).fillRect(0, V.height - 70, V.width, 70);
    this.add.text(128, 30, '⚡ VOLT', { fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: '#ffd23f' }).setOrigin(0, 0.5).setDepth(6).setShadow(0, 2, '#000', 6, true, true);
    this.tabT = LOBBY_TABS.map((t, i) => { const x = 400 + i * 128, tx = this.add.text(x, 30, t, { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setDepth(6);
      this.add.zone(x, 30, 120, 50).setInteractive({ useHandCursor: true }).setDepth(7).on('pointerdown', () => { Sound.resume(); this.setTab(i); }); return tx; });
    this.add.text(400 - 78, 30, 'LB', { fontFamily: FONT, fontSize: '16px', color: '#0d151b', backgroundColor: '#9fb2bf', padding: { x: 5, y: 1 } }).setOrigin(0.5).setDepth(6);
    this.add.text(400 + 4 * 128 + 84, 30, 'RB', { fontFamily: FONT, fontSize: '16px', color: '#0d151b', backgroundColor: '#9fb2bf', padding: { x: 5, y: 1 } }).setOrigin(0.5).setDepth(6);
    this.tabBar = this.add.rectangle(0, 52, 100, 4, 0xffd23f).setDepth(6);
    this.lvT = this.add.text(V.width - 24, 22, '', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(1, 0.5).setDepth(6);
    this.lvBar = this.add.graphics().setDepth(6);
    this.add.text(V.width - 24, 70, '☰ MENU', { fontFamily: FONT, fontSize: '18px', color: '#ffffff', backgroundColor: '#1b2a35', padding: { x: 8, y: 3 } }).setOrigin(1, 0.5).setDepth(7).setInteractive({ useHandCursor: true }).on('pointerdown', () => { Sound.resume(); this.openMenu(); });
    this.foot = this.add.text(V.width / 2, V.height - 22, '', { fontFamily: FONT, fontSize: '19px', color: '#c9d6df' }).setOrigin(0.5).setDepth(6);
    this.redraw();
  }
  /* ---------- drawing ---------- */
  setTab(i) { if (this.overlay) return; this.tab = (i + LOBBY_TABS.length) % LOBBY_TABS.length; this.preview = null; Sound.play('blip'); this.redraw(); }
  mode() { return LOBBY_MODES.find(m => m.id === Settings.lobbyMode) || LOBBY_MODES[0]; }
  T(x, y, s, size = 22, col = '#ffffff', o = {}) { const t = this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', fontStyle: o.bold === false ? 'normal' : 'bold', color: col, align: o.align || 'left', wordWrap: o.wrap ? { width: o.wrap } : undefined }).setOrigin(o.ox !== undefined ? o.ox : 0, o.oy !== undefined ? o.oy : 0).setDepth(o.depth || 10); this.ui.push(t); return t; }
  box(x, y, w, h, col = 0x0c1424, a = 0.82, line = 0x2d5068, depth = 9) { const g = this.add.graphics().setDepth(depth); g.fillStyle(col, a).fillRoundedRect(x, y, w, h, 12); if (line !== null) g.lineStyle(2, line, 0.9).strokeRoundedRect(x, y, w, h, 12); this.ui.push(g); return g; }
  tap(x, y, w, h, fn, depth = 12) { const z = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true }).setDepth(depth); z.on('pointerdown', () => { Sound.resume(); fn(); }); this.ui.push(z); return z; }
  bar(x, y, w, h, k, col = 0xffd23f) { const g = this.add.graphics().setDepth(11); g.fillStyle(0x223040, 1).fillRoundedRect(x, y, w, h, h / 2).fillStyle(col, 1).fillRoundedRect(x, y, Math.max(h, w * Math.max(0, Math.min(1, k))), h, h / 2); this.ui.push(g); }
  redraw() {
    (this.ui || []).forEach(o => o.destroy()); this.ui = []; const V = CONFIG.view, tab = LOBBY_TABS[this.tab];
    this.tabT.forEach((t, i) => t.setColor(i === this.tab ? '#ffd23f' : '#c9d6df').setScale(i === this.tab ? 1.08 : 1)); const tt = this.tabT[this.tab]; this.tabBar.setPosition(tt.x, 52).setSize(tt.width + 16, 4).setOrigin(0.5, 0.5);
    this.lvT.setText(`${Settings.myName() || 'Player'}   LV ${Progress.level()}`); this.lvBar.clear().fillStyle(0x223040, 1).fillRoundedRect(V.width - 214, 40, 190, 8, 4).fillStyle(0x5fd6ff, 1).fillRoundedRect(V.width - 214, 40, Math.max(8, 190 * Progress.intoLevel() / SEASON1.xpPerTier), 8, 4);
    if (tab === 'PLAY') this.drawPlay(); else if (tab === 'LOCKER') this.drawLocker(); else if (tab === 'PASS') this.drawPass(); else if (tab === 'QUESTS') this.drawQuests(); else this.drawCareer();
    if (this.overlay === 'modes') this.drawModes(); if (this.overlay === 'menu') this.drawMenu();
    this.foot.setText(this.overlay ? '◀ ▶ ▲ ▼  choose      A  select      B  back' : { PLAY: 'A  play      ▼  change mode      Y  emote      X  options      LB / RB  tabs      Start  menu      Right stick  turn your character', LOCKER: '▲ ▼  choose      ▶ / A  open      A  equip      B  back      LB / RB  tabs', PASS: '◀ ▶  browse rewards (try them on)      LB / RB  tabs      Start  menu', QUESTS: 'Quests reset every day and every week      LB / RB  tabs      Start  menu', CAREER: 'A  leaderboard      Y  change your name      LB / RB  tabs' }[tab]);
  }
  drawPlay() {
    const V = CONFIG.view, Q = Progress.quests(), M = this.mode(), R = Progress.untilReset();
    this.box(28, 104, 340, 330); this.T(46, 116, 'DAILY QUESTS', 24, '#ffd23f'); this.T(352, 120, R.daily, 17, '#9fb2bf', { ox: 1 });
    Q.daily.forEach((q, i) => { const y = 156 + i * 82; this.T(46, y, (q.done ? '✓ ' : '') + q.text, 19, q.done ? '#7dff6a' : '#ffffff', { wrap: 300, bold: false }); this.bar(46, y + 48, 230, 10, q.got / q.n, q.done ? 0x7dff6a : 0xffd23f); this.T(352, y + 42, `${q.got}/${q.n}   +${q.xp}`, 16, '#9fb2bf', { ox: 1 }); });
    this.T(46, 400, `WEEKLY: ${Q.weekly.filter(q => q.done).length} / ${Q.weekly.length} done`, 18, '#c9d6df'); this.tap(28, 104, 340, 330, () => this.setTab(3));
    this.box(28, 448, 340, 112, 0x0c1424, 0.82); this.T(46, 460, SEASON1.name.toUpperCase() + ': ' + SEASON1.title.toUpperCase(), 20, '#c44dff'); this.T(46, 490, `Level ${Progress.level()}   Tier ${Progress.tier()} / ${SEASON1.tiers}`, 20); this.bar(46, 524, 300, 12, Progress.intoLevel() / SEASON1.xpPerTier, 0x5fd6ff); this.tap(28, 448, 340, 112, () => this.setTab(2));
    const x = 846, w = 406; this.box(x, 432, w, 150, M.col, 0.9, 0xffffff); this.T(x + 20, 446, M.icon + '  ' + M.name, 34); this.T(x + 20, 492, M.sub, 19, '#eef3ff', { bold: false, wrap: w - 40 }); this.T(x + w - 16, 552, '▼ CHANGE MODE', 18, '#ffffff', { ox: 1 });
    this.tap(x, 432, w, 150, () => this.openModes());
    this.box(x, 594, w, 82, 0xffd23f, 1, 0xffffff); this.T(x + w / 2, 635, 'PLAY', 46, '#10181e', { ox: 0.5, oy: 0.5 }); this.T(x + 22, 635, 'A', 20, '#ffd23f', { ox: 0.5, oy: 0.5, depth: 12 }).setBackgroundColor('#10181e').setPadding(6, 1);
    this.tap(x, 594, w, 82, () => this.play());
    if (typeof Party !== 'undefined' && Party.role === 'member') this.T(x + w / 2, 410, 'Your party leader picks the game', 18, '#ffd23f', { ox: 0.5 });
  }
  previewLook() { return Object.assign({}, Progress.look(), this.preview || {}); }
  drawLocker() {
    const S = LOCKER_SLOTS, L = this.lk, look = Progress.look();
    this.box(28, 100, 300, 560); this.T(44, 108, 'LOCKER', 28, '#ffd23f');
    S.forEach((s, i) => { const y = 146 + i * 46, on = i === L.slot, cur = s.wheel ? Progress.P.wheel.slice(0, 5).map(id => (ACTIONS[id] || {}).icon || id).join('') + '…' : s.colors ? '' : ((s.list().find(it => it.id === look[s.key]) || {}).name || ''); this.box(40, y, 276, 42, on ? (L.col === 0 ? 0x2a4a6b : 0x1d3046) : 0x101a28, 0.95, on ? 0xffd23f : 0x2d5068, 10);
      this.T(54, y + 3, s.name, 15, on ? '#ffd23f' : '#9fb2bf'); this.T(54, y + 21, cur, 16, '#ffffff', { bold: false });
      if (s.colors) { const g = this.add.graphics().setDepth(11); g.fillStyle(Phaser.Display.Color.HexStringToColor(look[s.key]).color, 1).fillCircle(290, y + 21, 12).lineStyle(2, 0xffffff, 0.8).strokeCircle(290, y + 21, 12); this.ui.push(g); }
      this.tap(40, y, 276, 42, () => { L.slot = i; L.col = 1; L.item = 0; L.pick = -1; this.preview = null; this.redraw(); }); });
    const s = S[L.slot], items = this.lockerItems(), cols = s.colors ? 5 : 3, tw = s.colors ? 70 : 118, th = s.colors ? 70 : 118, x0 = 860, y0 = 150;
    this.box(844, 100, 410, 560); this.T(860, 108, s.wheel ? (L.pick >= 0 ? `PICK AN EMOTE FOR SLOT ${L.pick + 1}` : 'YOUR WHEEL: pick a slot') : s.name, 22, '#ffd23f');
    const vis = Math.floor((650 - y0) / (th + 10)), row0 = Math.max(0, Math.floor(L.item / cols) - vis + 1);   // (a long list scrolls with the cursor)
    if (row0 > 0) this.T(1240, 112, '▲ more', 14, '#9fb2bf', { ox: 1 }); if (Math.ceil(items.length / cols) > row0 + vis) this.T(1240, 640, '▼ more', 14, '#9fb2bf', { ox: 1 });
    items.forEach((it, i) => { const cx = x0 + (i % cols) * (tw + 10), cy = y0 + (Math.floor(i / cols) - row0) * (th + 10), on = L.col === 1 && i === L.item, eq = it.equipped, own = it.own;
      if (cy < y0 || cy + th > 650) return;
      if (s.colors) { const g = this.add.graphics().setDepth(11); g.fillStyle(Phaser.Display.Color.HexStringToColor(it.id).color, 1).fillRoundedRect(cx, cy, tw, th, 10).lineStyle(on ? 4 : 2, on ? 0x5fd6ff : eq ? 0xffd23f : 0x000000, on || eq ? 1 : 0.4).strokeRoundedRect(cx, cy, tw, th, 10); this.ui.push(g); if (eq) this.T(cx + tw / 2, cy + th / 2, '✓', 28, '#10181e', { ox: 0.5, oy: 0.5, depth: 12 }); }
      else { this.box(cx, cy, tw, th, own ? 0x1b2a45 : 0x141820, 0.95, on ? 0x5fd6ff : eq ? 0xffd23f : 0x2d5068, 10); this.T(cx + tw / 2, cy + 44, it.icon, 44, '#ffffff', { ox: 0.5, oy: 0.5, depth: 12 }).setFontFamily('sans-serif').setAlpha(own ? 1 : 0.4);
        this.T(cx + tw / 2, cy + 86, it.name, 15, own ? '#ffffff' : '#7d8a96', { ox: 0.5, align: 'center', wrap: tw - 8, depth: 12 }); if (!own) this.T(cx + tw - 8, cy + 6, '🔒 ' + it.tier, 14, '#ffd23f', { ox: 1, depth: 12 }); if (eq) this.T(cx + 8, cy + 6, '✓', 18, '#ffd23f', { depth: 12 }); }
      this.tap(cx, cy, tw, th, () => { L.col = 1; L.item = i; this.lockerHover(); this.lockerPick(); }); });
    const it = items[L.item]; if (L.col === 1 && it && !it.own) this.T(1049, 640, `Unlocks at Season pass tier ${it.tier} (you are tier ${Progress.tier()})`, 16, '#ffd23f', { ox: 0.5 });
  }
  lockerItems() {
    const s = LOCKER_SLOTS[this.lk.slot], look = Progress.look();
    if (s.colors) return s.colors().map(c => ({ id: c, own: true, equipped: look[s.key] === c }));
    if (s.wheel) return this.lk.pick < 0 ? Progress.P.wheel.map((e, i) => ({ id: i, icon: (ACTIONS[e] || {}).icon || e, name: ACTIONS[e] ? ACTIONS[e].name : 'Slot ' + (i + 1), own: true })) : [...COS.emojis, ...COS.actions].map(e => ({ ...e, own: Progress.owns(e), equipped: Progress.P.wheel[this.lk.pick] === e.id }));
    return s.list().map(it => ({ ...it, own: Progress.owns(it), equipped: look[s.key] === it.id }));
  }
  lockerHover() { const s = LOCKER_SLOTS[this.lk.slot], it = this.lockerItems()[this.lk.item]; this.preview = it && !s.wheel && s.key !== 'title' ? { [s.key]: it.id } : null; const act = it && (ACTIONS[it.id] ? it.id : s.wheel && this.lk.pick < 0 && ACTIONS[Progress.P.wheel[it.id]] ? Progress.P.wheel[it.id] : null); if (act && this.stage.ok) this.stage.play(act); this.redraw(); }   // (an action: your character does it)
  lockerPick() {                                                         // A on an item: wear it (or, on the wheel: choose a slot, then its emoji)
    const L = this.lk, s = LOCKER_SLOTS[L.slot], it = this.lockerItems()[L.item]; if (!it) return;
    if (s.wheel) { if (L.pick < 0) { L.pick = it.id; L.item = Math.max(0, [...COS.emojis, ...COS.actions].findIndex(e => e.id === Progress.P.wheel[L.pick])); } else if (it.own) { Progress.P.wheel[L.pick] = it.id; Settings.save(); Sound.play('select'); L.item = L.pick; L.pick = -1; } else Sound.play('back'); this.redraw(); return; }
    if (!it.own) { Sound.play('back'); return; } Progress.setLook(s.key, it.id); Sound.play('select'); this.preview = null; this.redraw();
  }
  drawPass() {
    const V = CONFIG.view, t = Progress.tier(), cur = this.passCur, first = Math.max(1, Math.min(SEASON1.tiers - 6, cur - 2));
    this.T(40, 104, SEASON1.name.toUpperCase() + '  •  FREE PASS', 20, '#c44dff'); this.T(40, 128, SEASON1.title.toUpperCase(), 56, '#ffffff').setShadow(0, 3, '#000', 8, true, true);
    this.T(40, 196, `LEVEL ${Progress.level()}`, 26, '#ffd23f'); this.bar(160, 204, 260, 14, Progress.intoLevel() / SEASON1.xpPerTier, 0x5fd6ff); this.T(430, 200, `${Progress.intoLevel()} / ${SEASON1.xpPerTier} XP`, 18, '#c9d6df');
    this.T(40, 232, 'Earn XP from matches and quests. Every level unlocks the next tier.', 18, '#c9d6df', { bold: false });
    for (let k = 0; k < 7; k++) { const tier = first + k, rw = PASS[tier], x = 64 + k * 166, y = 452, on = tier - 1 === cur, got = tier <= t; if (tier > SEASON1.tiers) break;
      this.box(x, y, 152, 196, got ? 0x2a1f6b : 0x141820, 0.95, on ? 0x5fd6ff : tier === t ? 0xffd23f : 0x2d5068, 10); this.T(x + 10, y + 8, String(tier), 22, got ? '#ffd23f' : '#7d8a96');
      if (rw) { this.T(x + 76, y + 84, rw.icon, 56, '#ffffff', { ox: 0.5, oy: 0.5, depth: 12 }).setFontFamily('sans-serif').setAlpha(got ? 1 : 0.55); this.T(x + 76, y + 132, rw.name, 17, '#ffffff', { ox: 0.5, align: 'center', wrap: 140, depth: 12 }); this.T(x + 76, y + 170, got ? '✓ UNLOCKED' : '🔒 LOCKED', 15, got ? '#7dff6a' : '#9fb2bf', { ox: 0.5, depth: 12 }); }
      this.tap(x, y, 152, 196, () => { this.passCur = tier - 1; this.passHover(); }); }
    const rw = PASS[cur + 1]; if (rw) this.T(V.width / 2, 412, `Tier ${cur + 1}: ${rw.name} (${{ ps: 'player skin', cs: 'cart skin', outfit: 'outfit', hat: 'hat', face: 'face', decal: 'cart decal', emoji: 'emoji', action: 'emote', title: 'title', hairStyle: 'hairstyle' }[rw.slot]})  ${cur + 1 <= t ? '— unlocked, wear it from the Locker' : '— reach level ' + (cur + 1) + ' to unlock'}`, 18, '#ffffff', { ox: 0.5 });
    if (rw && rw.slot === 'emoji') this.T(1040, 250, rw.icon, 90, '#ffffff', { ox: 0.5, oy: 0.5 }).setFontFamily('sans-serif');
  }
  passHover() { const rw = PASS[this.passCur + 1]; this.preview = rw && !['emoji', 'action', 'title'].includes(rw.slot) ? { [rw.slot]: rw.id } : null; if (rw && rw.slot === 'action' && this.stage.ok) this.stage.play(rw.id); this.redraw(); }
  drawQuests() {
    const Q = Progress.quests(), R = Progress.untilReset(), x = 420, w = 830;
    const sec = (title, list, reset, y) => { this.box(x, y, w, 50 + list.length * 50); this.T(x + 18, y + 10, title, 26, '#ffd23f'); this.T(x + w - 18, y + 14, 'resets in ' + reset, 18, '#9fb2bf', { ox: 1 });
      list.forEach((q, i) => { const yy = y + 48 + i * 50; this.T(x + 18, yy + 4, q.done ? '✓' : '○', 24, q.done ? '#7dff6a' : '#9fb2bf'); this.T(x + 52, yy + 2, q.text, 20, q.done ? '#7dff6a' : '#ffffff', { bold: false });
        this.bar(x + 52, yy + 32, 420, 10, q.got / q.n, q.done ? 0x7dff6a : 0xffd23f); this.T(x + 486, yy + 26, `${q.got.toLocaleString()} / ${q.n.toLocaleString()}`, 17, '#c9d6df'); this.T(x + w - 18, yy + 10, `+${q.xp} XP`, 20, '#5fd6ff', { ox: 1 }); }); };
    sec('DAILY QUESTS', Q.daily, R.daily, 96); sec('WEEKLY QUESTS', Q.weekly, R.weekly, 308);
  }
  drawCareer() {
    const k = Object.assign({ games: 0, wins: 0, goals: 0, shots: 0 }, Settings.career), x = 820, w = 430; this.box(x, 100, w, 470);
    this.T(x + 20, 112, (Settings.myName() || 'Player').toUpperCase(), 38, '#ffffff'); this.T(x + 20, 162, `Level ${Progress.level()}   •   ${Progress.P.xp.toLocaleString()} XP`, 22, '#5fd6ff');
    [['Volt Hockey matches', k.games], ['Wins', k.wins], ['Goals', k.goals], ['Shots', k.shots], ['Quests completed', Progress.P.done], ['Season pass tier', `${Progress.tier()} / ${SEASON1.tiers}`], ...(() => { const T = (Settings.career && Settings.career.time) || {}, h = s => { s = s || 0; return s < 3600 ? `${Math.floor(s / 60)} min` : `${(s / 3600).toFixed(1)} h`; }; return [['Time in Volt Hockey', h(T.volt)], ['Time in minigames', h(T.mini)], ['Time in Volt Royale', h(T.br)]]; })()].forEach(([a, b], i) => { this.T(x + 20, 206 + i * 38, a, 21, '#c9d6df', { bold: false }); this.T(x + w - 20, 206 + i * 38, String(b), 21, '#ffffff', { ox: 1 }); });   /* (v13.5: hours played) */
    this.box(x, 586, 205, 64, 0x1b2a35, 1); this.T(x + 102, 618, 'LEADERBOARD (A)', 20, '#ffffff', { ox: 0.5, oy: 0.5 }); this.tap(x, 586, 205, 64, () => this.scene.start('Leaderboard'));
    this.box(x + 225, 586, 205, 64, 0x1b2a35, 1); this.T(x + 327, 618, 'CHANGE NAME (Y)', 20, '#ffffff', { ox: 0.5, oy: 0.5 }); this.tap(x + 225, 586, 205, 64, () => this.askName());
  }
  /* ---------- overlays: modes (▼) and the menu (Start) ---------- */
  openModes() { this.overlay = 'modes'; this.mcur = Math.max(0, LOBBY_MODES.indexOf(this.mode())); Sound.play('select'); this.redraw(); }
  drawModes() {
    const V = CONFIG.view, sh = this.add.rectangle(V.width / 2, V.height / 2, V.width, V.height, 0x05070f, 0.82).setDepth(30).setInteractive(); this.ui.push(sh);
    this.T(V.width / 2, 110, 'SELECT A MODE', 44, '#ffd23f', { ox: 0.5, depth: 31 });
    LOBBY_MODES.forEach((M, i) => { const x = 112 + (i % 3) * 360, y = 190 + Math.floor(i / 3) * 230, on = i === this.mcur, sel = M.id === this.mode().id; this.box(x, y, 336, 206, M.col, on ? 1 : 0.75, on ? 0xffffff : sel ? 0xffd23f : 0x000000, 31);
      this.T(x + 168, y + 66, M.icon, 64, '#ffffff', { ox: 0.5, oy: 0.5, depth: 32 }).setFontFamily('sans-serif'); this.T(x + 168, y + 120, M.name, 30, '#ffffff', { ox: 0.5, depth: 32 }); this.T(x + 168, y + 158, M.sub, 17, '#eef3ff', { ox: 0.5, align: 'center', wrap: 300, bold: false, depth: 32 });
      if (sel) this.T(x + 12, y + 10, '✓ SELECTED', 16, '#ffd23f', { depth: 32 }); this.tap(x, y, 336, 206, () => { this.mcur = i; this.pickMode(); }, 33); });
  }
  pickMode() { Settings.lobbyMode = LOBBY_MODES[this.mcur].id; Settings.save(); Sound.play('select'); this.overlay = null; this.redraw(); }
  menuItems() { return [[FriendsBar.menuLabel(), () => { this.overlay = null; this.redraw(); FriendsBar.toggle(true); }], ['Settings', () => this.scene.start('Settings')], [`Fullscreen: ${isFullscreen() ? 'on' : 'off'}`, () => { toggleFullscreen(); setTimeout(() => this.redraw(), 300); }], [`Touch controls: ${Settings.touch ? 'on' : 'off'}`, () => { TouchPad.toggle(); this.redraw(); }], ['Controls', () => this.scene.start('ControlsGuide')], ['Change your name', () => { this.overlay = null; this.askName(); }], ['Leaderboard', () => this.scene.start('Leaderboard')],  ['Close', () => { this.overlay = null; this.redraw(); }]]; }
  openMenu() { if (this.overlay === 'menu') { this.overlay = null; this.redraw(); return; } this.overlay = 'menu'; this.mcur = 0; Sound.play('select'); this.redraw(); }
  drawMenu() {
    const V = CONFIG.view, sh = this.add.rectangle(V.width / 2, V.height / 2, V.width, V.height, 0x05070f, 0.6).setDepth(30).setInteractive(); this.ui.push(sh); sh.on('pointerdown', () => { this.overlay = null; this.redraw(); });
    this.box(V.width - 420, 0, 420, V.height, 0x0c1424, 0.97, 0x2d5068, 31); this.T(V.width - 390, 40, 'MENU', 40, '#ffd23f', { depth: 32 });
    this.menuItems().forEach(([label, fn], i) => { const y = 104 + i * 62, on = i === this.mcur; this.box(V.width - 396, y, 372, 54, on ? 0x2a4a6b : 0x101a28, 1, on ? 0xffd23f : 0x2d5068, 32); this.T(V.width - 376, y + 27, label, 26, on ? '#ffd23f' : '#ffffff', { oy: 0.5, depth: 33 }); this.tap(V.width - 396, y, 372, 54, () => { Sound.play('select'); fn(); }, 34); });
  }
  askName() { Settings.askName(Settings.myName(), name => { Settings.setMyName(name); this.redraw(); }); }
  play() { const M = this.mode(); Sound.play('select'); if (typeof memberWaits === 'function' && memberWaits()) return; M.go(this); }
  /* ---------- every frame ---------- */
  update(time, delta) {
    Controls.update(this.game.loop.frame); const dt = Math.min(0.05, delta / 1000), tab = LOBBY_TABS[this.tab];
    if (this.stage.ok) { const pad = Controls.combined; if (Math.abs(pad.rx || 0) > 0.2) this.stage.spinV = (pad.rx || 0) * 3; this.stage.setLook(this.previewLook()); this.stage.render(dt, { PLAY: { x: 0.47, zoom: 1 }, LOCKER: { x: 0.5, zoom: 1.12 }, PASS: { x: 0.72, zoom: 1.05 }, QUESTS: { x: 0.17, zoom: 0.95 }, CAREER: { x: 0.33, zoom: 1 } }[tab]); }
    if (typeof PadNav !== 'undefined' && PadNav.stack.some(x => x.modal)) return;
    const e = Controls.menu(); if (Controls.escPressed) e.start = true;
    if (this.overlay === 'modes') { const n = LOBBY_MODES.length; if (e.left) { this.mcur = (this.mcur + n - 1) % n; this.redrawSoon(); } if (e.right) { this.mcur = (this.mcur + 1) % n; this.redrawSoon(); } if (e.down && this.mcur + 3 < n) { this.mcur += 3; this.redrawSoon(); } if (e.up) { if (this.mcur >= 3) { this.mcur -= 3; this.redrawSoon(); } else { this.overlay = null; this.redrawSoon(); } }
      if (e.a) this.pickMode(); else if (e.b || e.start) { Sound.play('back'); this.overlay = null; this.redraw(); } return; }
    if (this.overlay === 'menu') { const it = this.menuItems(), n = it.length; if (e.up) { this.mcur = (this.mcur + n - 1) % n; this.redrawSoon(); } if (e.down) { this.mcur = (this.mcur + 1) % n; this.redrawSoon(); } if (e.a) { Sound.play('select'); it[this.mcur][1](); } else if (e.b || e.start) { Sound.play('back'); this.overlay = null; this.redraw(); } return; }
    if (e.start) return this.openMenu();
    if (e.halfCW || e.spinCW) return this.setTab(this.tab + 1); if (e.halfCCW || e.spinCCW) return this.setTab(this.tab - 1);
    if (tab === 'PLAY') { if (e.a) this.play(); if (e.down) this.openModes(); }
    else if (tab === 'LOCKER') {
      const L = this.lk, S = LOCKER_SLOTS, items = this.lockerItems(), cols = S[L.slot].colors ? 5 : 3;
      if (L.col === 0) { if (e.up) { L.slot = (L.slot + S.length - 1) % S.length; L.pick = -1; this.redrawSoon(); } if (e.down) { L.slot = (L.slot + 1) % S.length; L.pick = -1; this.redrawSoon(); } if (e.right || e.a) { L.col = 1; L.item = Math.max(0, items.findIndex(i => i.equipped)); this.lockerHover(); } if (e.b) this.setTab(0); }
      else { let mv = 0; if (e.left) { if (L.item % cols === 0) { L.col = 0; this.preview = null; L.pick = -1; this.redrawSoon(); } else mv = -1; } if (e.right && L.item + 1 < items.length) mv = 1; if (e.up && L.item >= cols) mv = -cols; if (e.down && L.item + cols < items.length) mv = cols;
        if (mv) { L.item += mv; this.lockerHover(); } if (e.a) this.lockerPick(); if (e.b) { if (L.pick >= 0) { L.item = L.pick; L.pick = -1; } else { L.col = 0; this.preview = null; } Sound.play('back'); this.redraw(); } }
    }
    else if (tab === 'PASS') { if (e.left && this.passCur > 0) { this.passCur--; this.passHover(); } if (e.right && this.passCur < SEASON1.tiers - 1) { this.passCur++; this.passHover(); } if (e.b) this.setTab(0); }
    else if (tab === 'CAREER') { if (e.a) this.scene.start('Leaderboard'); if (e.y) this.askName(); if (e.b) this.setTab(0); }
    else if (e.b) this.setTab(0);
  }
  redrawSoon() { Sound.play('blip'); this.redraw(); }
}
