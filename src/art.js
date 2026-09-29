// Small generated images (all original, made in the browser), used as seed content.

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const svgUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
const esc = (s) => String(s).replace(/[<>&"']/g, '');

const PAIRS = [
  ['#C9F2C7', '#111'], ['#FFD6E8', '#111'], ['#D9D2FF', '#111'], ['#FFE3B3', '#111'],
  ['#BDE6FF', '#111'], ['#CCFF00', '#111'], ['#1E1E1A', '#F4F1EA'], ['#FF8A3D', '#111'],
];

// Symmetric pixel face, 8x8.
export function pixelAvatar(seed) {
  const r = rng(seed * 97 + 13);
  const [bg, fg] = PAIRS[Math.floor(r() * PAIRS.length)];
  let cells = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 4; x++) {
      const eye = y === 3 && x === 2;
      const mouth = y === 5 && x >= 1;
      const on = eye || mouth || (y > 0 && y < 7 && x > 0 && r() < 0.18);
      if (on) cells += `<rect x="${x}" y="${y}" width="1" height="1"/><rect x="${7 - x}" y="${y}" width="1" height="1"/>`;
    }
  }
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges"><rect width="8" height="8" fill="${bg}"/><g fill="${fg}">${cells}</g></svg>`);
}

// Simple geometric icon.
export function icon(seed) {
  const r = rng(seed * 31 + 7);
  const [bg, fg] = PAIRS[Math.floor(r() * PAIRS.length)];
  const shapes = [
    `<circle cx="16" cy="16" r="9" fill="${fg}"/>`,
    `<rect x="8" y="8" width="16" height="16" fill="${fg}"/>`,
    `<path d="M16 6 L27 26 H5 Z" fill="${fg}"/>`,
    `<path d="M6 16h20M16 6v20" stroke="${fg}" stroke-width="4"/>`,
    `<circle cx="11" cy="13" r="3" fill="${fg}"/><circle cx="21" cy="13" r="3" fill="${fg}"/><path d="M9 21q7 6 14 0" stroke="${fg}" stroke-width="2.5" fill="none"/>`,
    `<path d="M16 5l3 8h8l-6.5 5 2.5 8-7-5-7 5 2.5-8L5 13h8z" fill="${fg}"/>`,
  ];
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${bg}"/>${shapes[Math.floor(r() * shapes.length)]}</svg>`);
}

// Wide wordmark-style logo.
export function logo(seed, word) {
  const r = rng(seed * 53 + 3);
  const colors = ['#F4F1EA', '#CCFF00', '#FF8A3D', '#B388FF', '#5EB8FF', '#FF5FA2'];
  const c = colors[Math.floor(r() * colors.length)];
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><rect width="200" height="60" fill="#23221E"/><circle cx="30" cy="30" r="11" fill="${c}"/><text x="50" y="37" font-family="Arial Black,Arial,sans-serif" font-size="19" font-weight="900" fill="${c}">${esc(word)}</text></svg>`);
}

// Big poster ad with a fake QR-style block.
export function poster(seed, title, sub) {
  const r = rng(seed * 11 + 5);
  const g = [['#3B1D78', '#7B3FE4'], ['#0F3D2E', '#1FAE6B'], ['#4A1030', '#E0457B'], ['#102A4A', '#2F80ED']][Math.floor(r() * 4)];
  let qr = '';
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    const on = finder ? (x % 20 === 0 || y % 20 === 0 || x === 6 || y === 6 || x === 14 || y === 14 || (x > 1 && x < 5 && y > 1 && y < 5) || (x > 15 && x < 19 && y > 1 && y < 5) || (x > 1 && x < 5 && y > 15 && y < 19)) : r() < 0.5;
    if (on) qr += `<rect x="${x * 8}" y="${y * 8}" width="8" height="8"/>`;
  }
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${g[0]}"/><stop offset="1" stop-color="${g[1]}"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="84" cy="96" r="38" fill="#CCFF00"/><text x="136" y="92" font-family="Arial Black,Arial,sans-serif" font-size="34" font-weight="900" fill="#fff">${esc(title)}</text><text x="136" y="122" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#CCFF00">${esc(sub)}</text><rect x="40" y="160" width="120" height="26" rx="13" fill="#ffffff22"/><text x="100" y="178" text-anchor="middle" font-family="monospace" font-size="12" fill="#fff">SOLANA</text><rect x="170" y="160" width="120" height="26" rx="13" fill="#ffffff22"/><text x="230" y="178" text-anchor="middle" font-family="monospace" font-size="12" fill="#fff">PUMP.FUN</text><text x="40" y="250" font-family="Arial Black,Arial,sans-serif" font-size="30" font-weight="900" fill="#fff">@${esc(title.toLowerCase().replace(/\s+/g, '_'))}</text><text x="40" y="280" font-family="monospace" font-size="12" fill="#ffffffaa">SCAN · OR SEARCH ON X</text><rect x="420" y="60" width="184" height="184" rx="16" fill="#fff"/><g transform="translate(428 68)" fill="${g[0]}">${qr}</g></svg>`);
}
