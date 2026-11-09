/* v14: team minigames (Paintball, Capture the Flag, Multiball, Giant Ball...) open on the same team screen as Volt Hockey, from the very
   first visit: a big card for each team (◀ ▶ team, LB / RB league, Y random), X opens the game's settings, A goes on to the players.
   (Before, they opened on the old list of options, and the team cards only showed after going in and back out.) */
const isTeamMini = k => k !== 'br' && !!(MODES[k] && ((GAME_INFO[k] || {}).teams || MODES[k].teams));
{ const P = MiniSetupScene.prototype, cr = P.create, up = P.update;
  P.create = function (...a) {
    this.tsMode = false; this.ts = null;
    const k = this.kind; if (!isTeamMini(k)) return cr.apply(this, a);
    this.tsMode = true; const IK = GAME_INFO[k] || {}, o = () => miniOpts(), step = (key, d, lo, hi) => miniSave({ [key]: clamp(o()[key] + d, lo, hi) }), settings = [];
    for (const op of IK.opts || []) {
      const val = () => modeOpts(k)[op.key], show = v => op.names ? op.names[op.values.indexOf(v)] : op.fmt ? op.fmt(v) : String(v);
      const chg = d => { if (op.values) { const i = op.values.indexOf(val()); modeSave(k, { [op.key]: op.values[(i + d + op.values.length) % op.values.length] }); } else modeSave(k, { [op.key]: clamp(+(val() + d * (op.step || 1)).toFixed(2), op.min, op.max) }); };
      settings.push({ label: () => `${op.label}   ◀ ${show(val())} ▶`, change: chg, select: op.values ? () => chg(1) : undefined });
    }
    if (!IK.noCarts) settings.push({ label: () => `Carts   ◀ ${o().carts} ▶`, change: d => step('carts', d, 2, CONFIG.match.chairsPerTeam * 2) });
    const itemsOn = () => miniCfg(k).items, flipItems = () => miniSave({ items: { ...o().items, [k]: !itemsOn() } });
    if (!IK.noItems) settings.push({ label: () => `Power-ups   ◀ ${itemsOn() ? 'On' : 'Off'} ▶`, change: flipItems, select: flipItems });
    const flipCpu = () => miniSave({ nocpu: { ...(o().nocpu || {}), [k]: !(o().nocpu || {})[k] } });
    settings.push({ label: () => `CPU carts   ◀ ${(o().nocpu || {})[k] ? 'Off (players only)' : 'On'} ▶`, change: flipCpu, select: flipCpu });
    settings.push({ label: () => `CPU skill   ◀ ${Settings.difficulty} ▶`, change: d => Settings.cycleDifficulty(d) });
    settings.push({ label: () => 'How to play', select: () => this.scene.start('HowTo', { kind: k, back: { scene: 'MiniSetup', data: { kind: k } } }) });
    settings.push({ label: () => 'Host an online room instead', select: () => this.online() });
    TeamSelect.build(this, {
      title: (IK.name || k).toUpperCase(), sub: IK.blurb || '',
      cards: [{ side: 'HOME', get: () => Settings.teamA, set: t => { Settings.teamA = t; Settings.save(); } },
              { side: 'AWAY', get: () => Settings.teamB, set: t => { Settings.teamB = t; Settings.save(); } }],
      settings, onNext: () => this.start(), onBack: () => this.scene.start('MiniList', { cat: IK.cat || 'party' })
    });
  };
  P.update = function (...a) { if (this.tsMode) return TeamSelect.update(this); return up.apply(this, a); };
}
