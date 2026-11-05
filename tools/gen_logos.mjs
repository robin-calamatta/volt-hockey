/* Makes the logos for the National and Cities teams (assets/logos/*.svg). Run: node tools/gen_logos.mjs */
import fs from 'node:fs';
const out = new URL('../assets/logos/', import.meta.url);
const W = 256, C = 128, R = 104;
const ring = (col) => `<circle cx="${C}" cy="${C}" r="116" fill="#0d151b"/><circle cx="${C}" cy="${C}" r="110" fill="${col}"/>`;
const clip = (id, body, col) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}"><defs><clipPath id="${id}"><circle cx="${C}" cy="${C}" r="${R}"/></clipPath><radialGradient id="g${id}" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.25"/></radialGradient></defs>${ring(col)}<g clip-path="url(#${id})">${body}</g><circle cx="${C}" cy="${C}" r="${R}" fill="url(#g${id})"/><circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="#0d151b" stroke-width="3" opacity="0.5"/></svg>`;
const X0 = C - R, Y0 = C - R, S = 2 * R;                                    // the flag fills the circle's square
const rect = (x, y, w, h, f) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`;
const nordic = (bg, cross, inner) => rect(X0, Y0, S, S, bg) + rect(X0, C - 22, S, 44, cross) + rect(C - 52, Y0, 44, S, cross) + (inner ? rect(X0, C - 11, S, 22, inner) + rect(C - 41, Y0, 22, S, inner) : '');
const vert = cs => cs.map((c, i) => rect(X0 + i * S / cs.length, Y0, S / cs.length + 1, S, c)).join('');
const horiz = cs => cs.map((c, i) => rect(X0, Y0 + i * S / cs.length, S, S / cs.length + 1, c)).join('');
const star = (x, y, r, f, n = 5) => { let p = ''; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * 0.45 : r; p += `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)} `; } return `<polygon points="${p}" fill="${f}"/>`; };
const leaf = (x, y, s, f) => `<path transform="translate(${x} ${y}) scale(${s})" fill="${f}" d="M0,-40 L7,-26 L15,-30 L12,-10 L26,-22 L23,-14 L36,-12 L28,-2 L32,2 L12,14 L14,22 L2,20 L2,36 L-2,36 L-2,20 L-14,22 L-12,14 L-32,2 L-28,-2 L-36,-12 L-23,-14 L-26,-22 L-12,-10 L-15,-30 L-7,-26 Z"/>`;
const NAT = {
  sweden: nordic('#006aa7', '#fecc00'), denmark: nordic('#c8102e', '#ffffff'), finland: nordic('#ffffff', '#003580'), norway: nordic('#ba0c2f', '#ffffff', '#00205b'),
  usa: horiz(['#b22234', '#fff', '#b22234', '#fff', '#b22234', '#fff', '#b22234', '#fff', '#b22234', '#fff', '#b22234', '#fff', '#b22234']) + rect(X0, Y0, S * 0.5, S * 0.54, '#3c3b6e') + [0, 1, 2, 3].map(r => [0, 1, 2].map(c => star(X0 + 22 + c * 30 + (r % 2) * 12, Y0 + 24 + r * 26, 9, '#fff')).join('')).join(''),
  canada: vert(['#d80621', '#fff', '#fff', '#d80621']) + leaf(C, C - 2, 1.45, '#d80621'),
  france: vert(['#0055a4', '#fff', '#ef4135']), italy: vert(['#009246', '#fff', '#ce2b37']), ireland: vert(['#169b62', '#fff', '#ff883e']),
  germany: horiz(['#000', '#dd0000', '#ffce00']), netherlands: horiz(['#ae1c28', '#fff', '#21468b']),
  england: rect(X0, Y0, S, S, '#fff') + rect(X0, C - 20, S, 40, '#ce1124') + rect(C - 20, Y0, 40, S, '#ce1124'),
  switzerland: rect(X0, Y0, S, S, '#da291c') + rect(C - 16, C - 56, 32, 112, '#fff') + rect(C - 56, C - 16, 112, 32, '#fff'),
  japan: rect(X0, Y0, S, S, '#fff') + `<circle cx="${C}" cy="${C}" r="52" fill="#bc002d"/>`,
  malta: vert(['#fff', '#cf142b']) + rect(X0 + 30, Y0 + 50, 34, 34, '#9ea7ad') + rect(X0 + 41, Y0 + 52, 12, 30, '#c9d0d4') + rect(X0 + 32, Y0 + 61, 30, 12, '#c9d0d4'),
  czechia: horiz(['#fff', '#d7141a']) + `<polygon points="${X0},${Y0} ${C + 4},${C} ${X0},${Y0 + S}" fill="#11457e"/>`,
  australia: rect(X0, Y0, S, S, '#00008b') + rect(X0, Y0 + 44, S * 0.5, 16, '#fff') + rect(X0 + 44, Y0, 16, S * 0.5, '#fff') + rect(X0, Y0 + 47, S * 0.5, 10, '#c8102e') + rect(X0 + 47, Y0, 10, S * 0.5, '#c8102e') + star(X0 + 52, C + 56, 18, '#fff', 7) + star(C + 54, C - 40, 9, '#fff', 7) + star(C + 80, C - 2, 9, '#fff', 7) + star(C + 30, C + 10, 9, '#fff', 7) + star(C + 56, C + 62, 10, '#fff', 7)
};
const NAT_RING = { sweden: '#fecc00', denmark: '#ffffff', finland: '#003580', norway: '#00205b', usa: '#3c3b6e', canada: '#d80621', france: '#0055a4', italy: '#009246', ireland: '#169b62', germany: '#ffce00', netherlands: '#ff7f00', england: '#ce1124', switzerland: '#ffffff', japan: '#bc002d', malta: '#cf142b', czechia: '#11457e', australia: '#ffcd00' };
for (const [k, body] of Object.entries(NAT)) fs.writeFileSync(new URL(`nat_${k}.svg`, out), clip('c' + k, body, NAT_RING[k]));
/* cities: a shield in the team colours, the initials, and a little emblem */
const CITY = {
  barrie: ['#0b6e4f', '#f2c14e', 'B', 'waves'], toronto: ['#1d3c8f', '#ffffff', 'T', 'tower'], london: ['#2e7d32', '#e8e8e8', 'L', 'tree'], kitchener: ['#8e1b1b', '#f1c40f', 'K', 'gear'],
  niagara: ['#0277bd', '#b3e5fc', 'N', 'falls'], ottawa: ['#b71c1c', '#ffffff', 'O', 'tower'], hamilton: ['#f9a825', '#1a1a1a', 'H', 'gear'], montreal: ['#1565c0', '#e53935', 'M', 'cross'],
  vancouver: ['#00695c', '#80cbc4', 'V', 'mountain'], waterloo: ['#311b92', '#ffd54f', 'W', 'waves'], guelph: ['#c62828', '#fdd835', 'G', 'tree'], orillia: ['#ff6f00', '#004d40', 'O', 'waves'],
  sudbury: ['#455a64', '#ffca28', 'S', 'mountain'], windsor: ['#4a148c', '#ce93d8', 'W', 'cross'], oshawa: ['#263238', '#ef5350', 'O', 'gear'], kingston: ['#1b5e20', '#ffeb3b', 'K', 'tower']
};
const emblem = (kind, f) => ({
  waves: [0, 1, 2].map(i => `<path d="M64 ${166 + i * 14} q16 -10 32 0 t32 0 t32 0 t32 0" fill="none" stroke="${f}" stroke-width="6" stroke-linecap="round"/>`).join(''),
  tower: `<path d="M124 150 h8 l2 -48 h-12 z M118 102 h20 l-4 -10 h-12 z M127 92 v-22" fill="${f}" stroke="${f}" stroke-width="3"/><rect x="88" y="170" width="16" height="30" fill="${f}"/><rect x="152" y="160" width="18" height="40" fill="${f}"/><rect x="106" y="178" width="12" height="22" fill="${f}"/><rect x="138" y="174" width="12" height="26" fill="${f}"/>`,
  tree: `<polygon points="128,140 100,190 156,190" fill="${f}"/><polygon points="128,124 106,166 150,166" fill="${f}"/><rect x="123" y="188" width="10" height="14" fill="${f}"/>`,
  gear: `<circle cx="128" cy="176" r="20" fill="none" stroke="${f}" stroke-width="9"/>` + [...Array(8)].map((_, i) => { const a = i * Math.PI / 4; return `<rect x="${(128 + Math.cos(a) * 26 - 5).toFixed(1)}" y="${(176 + Math.sin(a) * 26 - 5).toFixed(1)}" width="10" height="10" fill="${f}"/>`; }).join(''),
  falls: `<path d="M84 150 h88 v6 h-88 z" fill="${f}"/>` + [0, 1, 2, 3, 4].map(i => `<path d="M${94 + i * 17} 158 v40" stroke="${f}" stroke-width="5" stroke-linecap="round"/>`).join(''),
  mountain: `<polygon points="80,200 116,140 136,170 150,152 180,200" fill="${f}"/><polygon points="116,140 108,154 124,154" fill="#fff" opacity="0.8"/>`,
  cross: `<rect x="122" y="140" width="12" height="62" fill="${f}"/><rect x="104" y="156" width="48" height="12" fill="${f}"/>`
})[kind];
for (const [k, [a, b, ini, em]] of Object.entries(CITY)) {
  const sh = 'M128 18 L222 46 V128 C222 186 182 222 128 242 C74 222 34 186 34 128 V46 Z';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}"><defs><linearGradient id="s${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="1" stop-color="#000" stop-opacity="0.2"/></linearGradient></defs>
<path d="${sh}" fill="#0d151b" transform="translate(128 130) scale(1.06) translate(-128 -130)"/><path d="${sh}" fill="${a}" stroke="${b}" stroke-width="8"/><path d="M50 58 L128 34 L206 58 V70 H50 Z" fill="${b}" opacity="0.9"/>
<text x="128" y="132" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="78" fill="${b}" stroke="#0d151b" stroke-width="4" paint-order="stroke">${ini}</text>${emblem(em, b)}<path d="${sh}" fill="url(#s${k})"/></svg>`;
  fs.writeFileSync(new URL(`city_${k}.svg`, out), svg);
}
console.log('logos written:', Object.keys(NAT).length + Object.keys(CITY).length);
