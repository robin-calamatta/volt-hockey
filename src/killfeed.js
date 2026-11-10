/* v14.2.11 Volt Royale kill feed: down the left side of the screen, one line per knock-down or elimination, with a cheeky line for how it
   happened ("ROBIN was splatted by DEVON"). Each kind of death has a few lines; which one is picked when it happens (and travels with the
   feed to everyone online). Feed entries: [killer, victim, gun or 'storm' / 'down', time, killer team, victim team, how, line number]. */
const KF_LINES = {
  rocket:  ['{v} was splatted by {k}', '{k} sent {v} to the moon', '{v} got rocket-mailed by {k}', '{k} turned {v} into confetti', '{v} caught {k}\'s rocket. With their face'],
  sniper:  ['{k} sniped {v} from another postcode', '{v} never saw {k} coming', '{k} sent {v} a long-distance hello', '{v} got scoped by {k}', '{k} booked {v} a one-way ticket from way out'],
  shotgun: ['{k} blasted {v} at point blank', '{v} ate a face full of {k}\'s buckshot', '{k} shotgunned {v} into next week', '{v} got too close to {k}'],
  smg:     ['{k} sprayed {v} down', '{v} got buzzsawed by {k}', '{k} peppered {v} like a steak', '{v} was hosed by {k}'],
  rifle:   ['{k} lasered {v}', '{v} got tagged by {k}', '{k} dropped {v} with a burst', '{v} lost a staring contest with {k}'],
  pistol:  ['{k} popped {v} with a peashooter', '{v} lost a duel to {k}', '{k} plinked {v}', '{v} was finished off by {k}\'s little pistol'],
  melee:   ['{k} bonked {v}', '{v} got whacked by {k}', '{k} rammed {v} into oblivion', '{v} got a wheelie to the face from {k}'],
  storm:   ['{v} got lost in the storm', '{v} forgot the storm was purple', 'The storm ate {v}', '{v} tried to hug the storm'],
  fall:    ['{v} forgot carts can\'t fly', '{v} took the stairs the fast way', '{v} tested gravity. Gravity won', '{v} missed the landing'],
  bleed:   ['{v} bled out', '{v} ran out of patience (and health)', '{v} waited for a revive that never came'],
  self:    ['{v} splatted themselves', '{v} played with their own rocket', '{v} blew themselves up. Oops'],
  down:    ['{k} knocked down {v}', '{v} is crawling, thanks to {k}', '{k} put {v} on the floor', '{v} got flattened by {k}'],
  other:   ['{k} eliminated {v}', '{v} was taken out by {k}']
};
const KF_ICON = { rocket: '💥', sniper: '🎯', shotgun: '💢', smg: '🔫', rifle: '🔫', pistol: '🔫', melee: '👊', storm: '🌀', fall: '🪂', bleed: '🩸', self: '🤦', down: '🔻', other: '☠' };
function kfText(f) {
  const how = f[6] || (f[2] === 'storm' ? 'storm' : f[2] === 'down' ? 'down' : BR_GUNS[f[2]] ? f[2] : 'other'), L = KF_LINES[how] || KF_LINES.other, line = L[(f[7] || 0) % L.length];
  const k = (f[0] || '').toUpperCase(), v = (f[1] || '').toUpperCase();
  let s = (!k && line.includes('{k}')) ? (how === 'down' ? `${v} is down` : `${v} is out`) : line.replace('{k}', k).replace('{v}', v);
  if (f[8]) s += '  (HEADSHOT!)';
  return `${KF_ICON[how] || '☠'}  ${s}`;
}
{
  const B = MODES.br, hurt0 = B.hurt, fin0 = B.finish;
  /* what each new feed line was: the gun, a melee hit, rocket splash, the storm, a fall, bleeding out... */
  const tag = (m, c, n0, how, head) => { const feed = m.gs.feed || []; for (let i = Math.max(0, feed.length - (feed.length - n0)); i < feed.length; i++) { const f = feed[i]; if (!f || f[6] || f[1] !== m.name(c)) continue;
    f[6] = f[2] === 'down' && how !== 'self' ? 'down' : how || (f[0] ? (BR_GUNS[f[2]] ? f[2] : 'other') : f[2] === 'storm' ? 'storm' : 'other');   /* (a killer with no gun in hand: 'other') */ f[7] = Math.floor(Math.random() * 6); if (head) f[8] = 1; } };
  B.hurt = function (m, c, dmg, by, storm, o = {}) {
    const g = m.gs, n0 = (g.feed || []).length, wasDown = c.gs && c.gs.down, S = g.st; this._kfIn = (this._kfIn || 0) + 1;
    try { return hurt0.call(this, m, c, dmg, by, storm, o); } finally {
      this._kfIn--; const n1 = (g.feed || []).length;
      if (n1 > n0 || (g.feed && g.feed.length && !g.feed[g.feed.length - 1][6])) {
        let how = null; const self = by && by === c;
        if (o && o.melee) how = 'melee'; else if (o && o.splash) how = self ? 'self' : 'rocket';
        else if (!by || self) how = S && Math.hypot(c.x - S.x, c.y - S.y) > S.r ? 'storm' : wasDown ? 'bleed' : 'fall';
        tag(m, c, Math.max(0, n0 - 1), how, o && o.head);
      }
    }
  };
  if (fin0) B.finish = function (m, c, by, ...a) {                       // bleeding out: finished from the game step, not by a hit
    const g = m.gs, n0 = (g.feed || []).length, out = !this._kfIn && c.gs && c.gs.down; const r = fin0.call(this, m, c, by, ...a);
    if (out) tag(m, c, Math.max(0, n0 - 1), 'bleed'); return r;
  };
}
/* drawing: the left side, newest at the top, fading out after 7 s */
{ const P = GameScene.prototype, bx = P.brExtras;
  if (bx) P.brExtras = function (m, ...a) {
    const r = bx.call(this, m, ...a); const X = this.brX; if (!X || !m || m.kind !== 'br') return r;
    for (const t of X.feed || []) t.setVisible(false);                     // (the old feed under the minimap)
    if (!X.kf || !X.kf[0] || !X.kf[0].scene) X.kf = Array.from({ length: 6 }, () => this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#0d151bc8', padding: { x: 8, y: 3 } }).setOrigin(0, 0).setDepth(31));
    const g = m.gs, feed = (g.feed || []).filter(f => g.t - f[3] < 7), mine = (this.setup.players || []).filter(p => !p.remote && p.chair), c = (mine[0] && mine[0].chair) || (this.online && this.brMyChair ? this.brMyChair() : null);
    X.kf.forEach((t, i) => { const f = feed[feed.length - 1 - i]; if (!f) return t.setVisible(false); const age = g.t - f[3];
      t.setText(kfText(f)).setPosition(12, 282 + i * 30).setAlpha(age > 6 ? Math.max(0, 7 - age) : 1).setColor(c && f[4] === c.gs.team ? '#7dff6a' : c && f[5] === c.gs.team ? '#ff6b6b' : '#ffffff').setVisible(true); });
    return r;
  };
}
