/*
 * Icons 2.0 builder — generates themed favicons / app icons for all 8 Bluebird UI birds
 * from the SVGs in assets/logo/.   Run:  node tools/build-icons.js
 * Needs Playwright (only to rasterise PNGs). Output is committed, so the site itself needs no build.
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), LOGO = path.join(ROOT, 'assets/logo'), OUT = path.join(ROOT, 'assets/icons');

// brand: light colour, dark-mode colour, ink on the colour (mirrors bluebird-ui/bluebird.css)
const THEMES = [
  { id: 'bluebird',  name: 'Bluebird',          c: '#2563c9', dk: '#7aa7ff', on: '#ffffff', ondk: '#0b1730' },
  { id: 'parakeet',  name: 'Monk Parakeet',     c: '#23913f', dk: '#62d98a', on: '#ffffff', ondk: '#08210f' },
  { id: 'cardinal',  name: 'Cardinal',          c: '#c4112f', dk: '#ff7288', on: '#ffffff', ondk: '#2a0610' },
  { id: 'goldfinch', name: 'Goldfinch',         c: '#f0b400', dk: '#ffd43b', on: '#2b2000', ondk: '#2b2000' },
  { id: 'spoonbill', name: 'Roseate Spoonbill', c: '#d9488d', dk: '#ff93c4', on: '#ffffff', ondk: '#2c0a1b' },
  { id: 'sparrow',   name: 'Song Sparrow',      c: '#865538', dk: '#d1a07a', on: '#ffffff', ondk: '#24140a' },
  { id: 'robin',     name: 'American Robin',    c: '#e0651a', dk: '#ffa05c', on: '#ffffff', ondk: '#2b1100' },
  { id: 'heron',     name: 'Night-Heron',       c: '#262b36', dk: '#cdd3e0', on: '#ffffff', ondk: '#11141a' }
];

const read = f => fs.readFileSync(path.join(LOGO, f), 'utf8');
const favTpl = read('wywo-favicon.svg'), tileTpl = read('wywo-app-icon.svg');
const favPath = favTpl.match(/<path[^>]*\sd="([^"]+)"/)[1];

// Small favicon: bare bird, theme colour, lighter in dark browser tabs.
const faviconSvg = t => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <title>WYWO ${t.name}</title>
  <style>.b{fill:${t.c}}@media (prefers-color-scheme:dark){.b{fill:${t.dk}}}</style>
  <defs><mask id="e"><rect width="64" height="64" fill="#fff"/><circle cx="47" cy="26" r="2.2"/></mask></defs>
  <path class="b" mask="url(#e)" d="${favPath}"/>
</svg>
`;
// Tile: rounded square in the theme colour, bird in its ink colour.
const tileSvg = (t, { dark = false, rx = 112 } = {}) => tileTpl
  .replace('rx="112" fill="#111111"', `rx="${rx}" fill="${dark ? t.dk : t.c}"`)
  .replace('color:#ffffff', `color:${dark ? t.ondk : t.on}`)
  .replace('WYWO bluebird app icon', `WYWO ${t.name} app icon`);
const markSvg = t => read('wywo-bluebird-mark.svg').replace('color:#111111', `color:${t.c}`).replace('WYWO bluebird mark', `WYWO ${t.name} mark`);

function ico(pngs) { // PNG-in-ICO
  const n = pngs.length, head = Buffer.alloc(6 + 16 * n); head.writeUInt16LE(1, 2); head.writeUInt16LE(n, 4);
  let off = head.length;
  pngs.forEach(({ size, buf }, i) => { const o = 6 + 16 * i; head[o] = size; head[o + 1] = size; head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6); head.writeUInt32LE(buf.length, o + 8); head.writeUInt32LE(off, o + 12); off += buf.length; });
  return Buffer.concat([head, ...pngs.map(p => p.buf)]);
}

// Raster favicons can't switch with the tab colour, so the near-black Night-Heron gets a tile (readable on light AND dark tabs).
const smallSvg = t => t.id === 'heron' ? tileSvg(t) : faviconSvg(t);

(async () => {
  const browser = await chromium.launch(), page = await browser.newPage();
  const png = async (svg, n) => {
    await page.setViewportSize({ width: n, height: n });
    await page.setContent(`<html><body style="margin:0;background:transparent"><div style="width:${n}px;height:${n}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`);
    return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: n, height: n } });
  };
  for (const t of THEMES) {
    const d = path.join(OUT, t.id); fs.mkdirSync(d, { recursive: true });
    const fsvg = faviconSvg(t);
    fs.writeFileSync(path.join(d, 'favicon.svg'), fsvg);
    fs.writeFileSync(path.join(d, 'mark.svg'), markSvg(t));
    fs.writeFileSync(path.join(d, 'app-icon.svg'), tileSvg(t));
    fs.writeFileSync(path.join(d, 'favicon-16.png'), await png(smallSvg(t), 16));
    fs.writeFileSync(path.join(d, 'favicon-32.png'), await png(smallSvg(t), 32));
    fs.writeFileSync(path.join(d, 'apple-touch-icon.png'), await png(tileSvg(t, { rx: 0 }), 180));
    fs.writeFileSync(path.join(d, 'icon-192.png'), await png(tileSvg(t), 192));
    fs.writeFileSync(path.join(d, 'icon-512.png'), await png(tileSvg(t), 512));
    console.log('✓', t.id);
  }
  // Site-wide defaults (Bluebird): favicon.ico, favicon.svg, apple-touch-icon.png
  const b = THEMES[0];
  fs.writeFileSync(path.join(ROOT, 'favicon.svg'), faviconSvg(b));
  fs.copyFileSync(path.join(OUT, 'bluebird/apple-touch-icon.png'), path.join(ROOT, 'apple-touch-icon.png'));
  const icoPngs = []; for (const size of [16, 32, 48]) icoPngs.push({ size, buf: await png(faviconSvg(b), size) });
  fs.writeFileSync(path.join(ROOT, 'favicon.ico'), ico(icoPngs));
  fs.writeFileSync(path.join(ROOT, 'site.webmanifest'), JSON.stringify({
    name: 'WYWO — While You Were Out', short_name: 'WYWO', description: 'Clean, printable callback notes.',
    start_url: './', scope: './', display: 'standalone', background_color: '#f6f7f9', theme_color: b.c,
    icons: [{ src: 'assets/icons/bluebird/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'assets/icons/bluebird/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'assets/icons/bluebird/app-icon.svg', sizes: 'any', type: 'image/svg+xml' }]
  }, null, 2) + '\n');
  await browser.close();
  console.log('done');
})();
