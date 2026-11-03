/* Chat filter, shared by the game (window.ChatFilter) and the server (require / import).
   clean(text) masks swear words with asterisks; ok(name) says whether a username is acceptable.
   The list is deliberately short and common; add words to WORDS (lower case). Matching ignores case and simple disguises (sh1t, f.u.c.k). */
(function (root) {
  const WORDS = ['fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'asshole', 'bastard', 'slut', 'whore', 'fag', 'faggot', 'nigger', 'nigga', 'retard', 'twat', 'wanker', 'prick', 'motherfucker', 'bollocks', 'douche', 'jizz', 'porn', 'rape', 'nazi', 'kys'];
  const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
  const norm = s => String(s).toLowerCase().replace(/[013457@$!]/g, c => LEET[c]);
  // each word may have separators between its letters (f.u.c.k, f u c k) and repeated letters (fuuuck)
  // these only count as whole words (so "grape", "scrape", "cockpit" and "Dickens" are fine); the rest count anywhere ("bullshit")
  const WHOLE = ['dick', 'cock', 'rape', 'fag', 'twat', 'prick', 'kys', 'porn', 'nazi', 'slut', 'douche'];
  const pattern = new RegExp(WORDS.map(w => { const p = w.split('').map(ch => ch + '+').join('[\\s._*-]*'); return WHOLE.includes(w) ? '\\b' + p + '\\b' : p; }).join('|'), 'gi');
  function clean(text) {
    const raw = String(text == null ? '' : text).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 300), n = norm(raw);
    let out = raw.split(''); pattern.lastIndex = 0; let m;
    while ((m = pattern.exec(n))) { for (let i = m.index; i < m.index + m[0].length; i++) if (/\S/.test(out[i])) out[i] = '*'; if (!m[0].length) pattern.lastIndex++; }
    return out.join('');
  }
  function ok(text) { pattern.lastIndex = 0; return !pattern.test(norm(String(text).replace(/[\s._-]/g, ''))); }
  const api = { clean, ok, WORDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ChatFilter = api;
})(typeof window !== 'undefined' ? window : globalThis);
