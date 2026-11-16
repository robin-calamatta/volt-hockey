/* v14.3.14 the legal documents as plain web pages (privacy.html, legal.html), for app stores and anyone who wants a link.
   They come straight from src/legal.js (the same text the Game shows), so there is only ever one copy to keep up to date. */
(async function legalPage() {
  const out = document.getElementById('doc'), only = document.body.dataset.doc;
  try {
    const src = await (await fetch('src/legal.js', { cache: 'no-cache' })).text(), cut = src.indexOf('\nconst Legal = {');
    const { LEGAL, LEGAL_DOCS, LEGAL_ORDER } = new Function(src.slice(0, cut) + '\n;return { LEGAL, LEGAL_DOCS, LEGAL_ORDER };')();
    const keys = only ? [only] : LEGAL_ORDER;
    document.title = (only ? LEGAL_DOCS[only].title : 'Legal') + ' · Volt Hockey';
    out.innerHTML = (only ? '' : `<nav>${LEGAL_ORDER.map(k => `<a href="#${k}">${LEGAL_DOCS[k].title}</a>`).join('')}</nav>`) +
      keys.map(k => `<section id="${k}"><h1>${LEGAL_DOCS[k].title}</h1>${LEGAL_DOCS[k].body()}</section>`).join('') +
      `<p class="foot">© ${new Date().getFullYear()} ${LEGAL.owner} · <a href="legal.html">All legal documents</a> · <a href="delete-account.html">Delete your account</a> · <a href="./">Play Volt Hockey</a></p>`;
    if (location.hash) { const el = document.querySelector(location.hash); if (el) el.scrollIntoView(); }
  } catch (e) { out.innerHTML = '<p>Could not load the document. Please try again.</p>'; }
})();
