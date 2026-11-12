/* v14.2.13 Volt Royale online: the loot travels in small pieces. On the huge maps the loot list is 1,300 to 1,400 items (about 50 KB), and it
   went out whole in a snapshot: a message that big closed the connection, so everyone but the host was dropped the moment the game began.
   Now each snapshot carries a page of 80 items (the whole list comes round every 18 snapshots or so), anything new (drops, opened chests) at
   once, and every 4th snapshot the list of which items still exist. The guest keeps the items it has seen and builds the list from them. */
{
  const P = MiniMatch.prototype, snap = P.miniSnap, apply = P.miniApply, PAGE = 40, KEY = 15;   /* v14.2.25: 40 a page (was 80) */
  if (MODES.br) MODES.br.slowKeys = [];                                     // (the loot no longer goes whole every 8th snapshot)
  const sig = L => L.join('|');
  P.miniSnap = function () {
    const s = snap.call(this); if (this.kind !== 'br' || !s || !s.gs || !Array.isArray(this.gs.L)) return s;
    const L = this.gs.L, n = (this._lpN = (this._lpN || 0) + 1), seen = this._lpSig || (this._lpSig = new Map());
    s.gs = { ...s.gs }; delete s.gs.L;
    /* v14.2.14: the doors (three lists of 400+ numbers) only when one changed, and every 10th snapshot anyway */
    const ds = (this.gs.dr || []).join('') + '|' + (this.gs.dh || []).join(','); if (ds === this._lpDoor && n % 30) { delete s.gs.dr; delete s.gs.dh; delete s.gs.db; } else this._lpDoor = ds;
    const o = (this._lpO || 0) % Math.max(1, L.length); if (n % 2) this._lpO = o + PAGE;
    const page = L.slice(o, o + PAGE), fresh = [];
    if (n % 2 === 0) for (const it of L) { const k = sig(it); if (seen.get(it[0]) !== k) { seen.set(it[0], k); fresh.push(it); } }   // (new or changed: sent straight away; checked every other snapshot)
    if (fresh.length > 60) { for (const it of fresh.slice(60)) seen.delete(it[0]); fresh.length = 60; }   /* (the rest go next time) */
    s.lp = { p: n % 2 ? page : [], f: fresh };                                /* (a page every other snapshot) */
    /* v14.2.25: the carts' own state (inventory, health, ammo... 45 values each, for 32 carts: 3 KB+ in every snapshot) goes whole every 15th
       snapshot; in between, only the values that changed since then. A snapshot is 2 to 4 KB instead of 7 to 14 KB, so a guest on a phone or
       through a relay server keeps up (the host skips a guest who can't, which is what made the game stutter for them). */
    if (Array.isArray(s.cs)) { const key = n % KEY === 1 || !this._csBase, base = key ? (this._csBase = []) : this._csBase, enc = v => v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
      if (key) { s.cs.forEach((g, i) => { const b = base[i] = {}; if (g) for (const k in g) b[k] = enc(g[k]); }); s.csk = 1; }
      else { s.csd = s.cs.map((g, i) => { if (!g) return 0; const b = base[i] || {}, d = {}; let any = 0; for (const k in g) { if (enc(g[k]) !== b[k]) { d[k] = g[k] === undefined ? null : g[k]; any = 1; } } return any ? d : 0; }); delete s.cs; } }
    /* v14.2.25: the full list of which items exist (1,300+ ids, 6 KB) went every 4th snapshot. Now each snapshot names the items gone in the
       last 1.5 s or so (picked up, opened), and the full list comes every 60th */
    { const cur = new Set(), rm = this._lpRm || (this._lpRm = []); for (const it of L) cur.add(it[0]); if (this._lpPrev) for (const id of this._lpPrev) if (!cur.has(id)) rm.push([n, id]);
      this._lpPrev = cur; while (rm.length && rm[0][0] < n - 45) rm.shift(); if (rm.length) s.lp.rm = rm.map(x => x[1]); }
    if (n % 60 === 0) { s.lp.ids = L.map(it => it[0]); if (seen.size > L.length * 2) { const keep = new Set(s.lp.ids); for (const id of seen.keys()) if (!keep.has(id)) seen.delete(id); } }
    return s;
  };
  P.miniApply = function (s) {
    const r = apply.call(this, s);
    if (this.kind === 'br' && s && s.csd) s.csd.forEach((d, i) => { const c = this.chairs[i]; if (c && d) c.gs = Object.assign(c.gs || {}, d); }); if (this.kind !== 'br' || !s || !s.lp || !this.gs) return r;
    const cache = this._lc || (this._lc = new Map()); for (const it of s.lp.p || []) cache.set(it[0], it); for (const it of s.lp.f || []) cache.set(it[0], it);
    let ids = this._lids || [];
    if (s.lp.rm && !s.lp.ids) { const gone = new Set(s.lp.rm); for (const id of gone) cache.delete(id); ids = ids.filter(id => !gone.has(id)); }
    if (s.lp.ids) { ids = s.lp.ids; const keep = new Set(ids); for (const id of cache.keys()) if (!keep.has(id)) cache.delete(id); }
    else { const have = new Set(ids), add = []; for (const it of (s.lp.f || []).concat(s.lp.p || [])) if (!have.has(it[0])) { have.add(it[0]); add.push(it[0]); } if (add.length) ids = ids.concat(add); }
    if (!this._lids && !s.lp.ids) ids = [...cache.keys()];
    this._lids = ids; this.gs.L = ids.map(id => cache.get(id)).filter(Boolean);
    return r;
  };
}
