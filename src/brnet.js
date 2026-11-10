/* v14.2.13 Volt Royale online: the loot travels in small pieces. On the huge maps the loot list is 1,300 to 1,400 items (about 50 KB), and it
   went out whole in a snapshot: a message that big closed the connection, so everyone but the host was dropped the moment the game began.
   Now each snapshot carries a page of 80 items (the whole list comes round every 18 snapshots or so), anything new (drops, opened chests) at
   once, and every 4th snapshot the list of which items still exist. The guest keeps the items it has seen and builds the list from them. */
{
  const P = MiniMatch.prototype, snap = P.miniSnap, apply = P.miniApply, PAGE = 80;
  if (MODES.br) MODES.br.slowKeys = [];                                     // (the loot no longer goes whole every 8th snapshot)
  const sig = L => L.join('|');
  P.miniSnap = function () {
    const s = snap.call(this); if (this.kind !== 'br' || !s || !s.gs || !Array.isArray(this.gs.L)) return s;
    const L = this.gs.L, n = (this._lpN = (this._lpN || 0) + 1), seen = this._lpSig || (this._lpSig = new Map());
    s.gs = { ...s.gs }; delete s.gs.L;
    const o = (this._lpO || 0) % Math.max(1, L.length); this._lpO = o + PAGE;
    const page = L.slice(o, o + PAGE), fresh = [];
    if (n % 2 === 0) for (const it of L) { const k = sig(it); if (seen.get(it[0]) !== k) { seen.set(it[0], k); fresh.push(it); } }   // (new or changed: sent straight away; checked every other snapshot)
    s.lp = { p: page, f: fresh.length > 120 ? fresh.slice(0, 120) : fresh };
    if (n % 4 === 0) { s.lp.ids = L.map(it => it[0]); if (seen.size > L.length * 2) { const keep = new Set(s.lp.ids); for (const id of seen.keys()) if (!keep.has(id)) seen.delete(id); } }
    return s;
  };
  P.miniApply = function (s) {
    const r = apply.call(this, s); if (this.kind !== 'br' || !s || !s.lp || !this.gs) return r;
    const cache = this._lc || (this._lc = new Map()); for (const it of s.lp.p || []) cache.set(it[0], it); for (const it of s.lp.f || []) cache.set(it[0], it);
    let ids = this._lids || [];
    if (s.lp.ids) { ids = s.lp.ids; const keep = new Set(ids); for (const id of cache.keys()) if (!keep.has(id)) cache.delete(id); }
    else { const have = new Set(ids); for (const it of s.lp.f || []) if (!have.has(it[0])) ids = ids.concat([it[0]]); }
    if (!this._lids && !s.lp.ids) ids = [...cache.keys()];
    this._lids = ids; this.gs.L = ids.map(id => cache.get(id)).filter(Boolean);
    return r;
  };
}
