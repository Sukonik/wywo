/*
 * Forest line art — generates the six line illustrations (cedar, pine, maple, hazelnut, linden, beech)
 * as an inline SVG sprite and injects it into index.html between the art markers.
 * Also writes standalone previews to assets/art/<tree>.svg.   Run: node tools/build-art.js
 * Everything is drawn with strokes in `currentColor`, so each theme recolours it automatically.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const f = n => +n.toFixed(2);
const W = 320, H = 200;

// main branch: cubic Bezier, gently rising left → right
let P = [[12, 182], [92, 178], [160, 74], [282, 46]];
let K = 1;   // global scale for leaves / fruit (the wide strip uses smaller ones)
const pt = t => { const u = 1 - t, [a, b, c, d] = P; return [0, 1].map(i => u*u*u*a[i] + 3*u*u*t*b[i] + 3*u*t*t*c[i] + t*t*t*d[i]); };
const tan = t => { const u = 1 - t, [a, b, c, d] = P; const dx = [0, 1].map(i => 3*u*u*(b[i]-a[i]) + 6*u*t*(c[i]-b[i]) + 3*t*t*(d[i]-c[i])); return Math.atan2(dx[1], dx[0]) * 180 / Math.PI; };
const branch = () => `<path d="M${P[0]} C${P[1]} ${P[2]} ${P[3]}"/>`;
const at = (x, y, rot, s, inner) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s * K)})">${inner}</g>`;

/* ---- leaf templates: origin at the stem, pointing +x, ~40 units long ---- */
const oval = (L, Wd, veins) => {
  let v = `<path d="M0 0H${f(L*.94)}"/>`;
  for (let i = 1; i <= veins; i++) { const x = L * i / (veins + 1), y = Wd * .78 * Math.sin(Math.PI * i / (veins + 1)); v += `<path d="M${f(x)} 0L${f(x + L*.12)} ${f(-y)}M${f(x)} 0L${f(x + L*.12)} ${f(y)}"/>`; }
  return `<path d="M0 0C${f(L*.2)} ${-Wd} ${f(L*.7)} ${-Wd} ${L} 0C${f(L*.7)} ${Wd} ${f(L*.2)} ${Wd} 0 0Z"/>` + v;
};
const heart = (L, Wd) => `<path d="M0 0C${f(-L*.1)} ${f(-Wd*.15)} ${f(-L*.1)} ${f(-Wd*.95)} ${f(L*.28)} ${f(-Wd*.85)}C${f(L*.7)} ${f(-Wd*.75)} ${f(L*.95)} ${f(-Wd*.3)} ${L} 0C${f(L*.95)} ${f(Wd*.3)} ${f(L*.7)} ${f(Wd*.75)} ${f(L*.28)} ${f(Wd*.85)}C${f(-L*.1)} ${f(Wd*.95)} ${f(-L*.1)} ${f(Wd*.15)} 0 0Z"/>`
  + `<path d="M0 0H${f(L*.9)}M${f(L*.25)} 0L${f(L*.5)} ${f(-Wd*.6)}M${f(L*.25)} 0L${f(L*.5)} ${f(Wd*.6)}M${f(L*.5)} 0L${f(L*.72)} ${f(-Wd*.38)}M${f(L*.5)} 0L${f(L*.72)} ${f(Wd*.38)}M${f(L*.1)} ${f(-Wd*.1)}L${f(L*.05)} ${f(-Wd*.6)}M${f(L*.1)} ${f(Wd*.1)}L${f(L*.05)} ${f(Wd*.6)}"/>`;
// classic five-lobed maple leaf, drawn in a 100-unit box pointing up, re-oriented to point +x
const maple = s => `<g transform="rotate(90) translate(${f(-50*s)} ${f(-94*s)}) scale(${s})"><path d="M50 6L58 24L72 18L68 36L88 34L78 50L92 58L70 62L72 76L56 70L56 94H44L44 70L28 76L30 62L8 58L22 50L12 34L32 36L28 18L42 24Z"/><path d="M50 94V10M50 70L22 50M50 70L78 50M50 56L30 36M50 56L70 36M50 40L42 24M50 40L58 24"/></g>`;
const nut = () => `<ellipse cx="0" cy="3" rx="6.2" ry="8"/><path d="M-7 -3C-6 -9 6 -9 7 -3L5 -1L2.5 -4L0 -1L-2.5 -4L-5 -1Z"/><path d="M0 -9V-14"/>`;
const cone = () => `<ellipse cx="0" cy="0" rx="7" ry="13"/><path d="M-6 -6L6 6M6 -6L-6 6M-7 0L7 0M-3.5 -11L5 9M3.5 -11L-5 9"/>`;
const needles = (n, len, spread) => Array.from({ length: n }, (_, i) => { const a = (i / (n - 1) - .5) * spread; return `<path d="M0 0L${f(len * Math.cos(a * Math.PI / 180))} ${f(len * Math.sin(a * Math.PI / 180))}"/>`; }).join('');
const scale = (L) => `<path d="M0 0L${f(L*.5)} ${f(-L*.28)}L${L} 0L${f(L*.5)} ${f(L*.28)}Z"/>`;

/* ---- the six forests ---- */
const ART = {
  cedar() { // flat scale-leaf sprays
    let o = branch();
    for (let i = 0; i < 9; i++) { const t = .1 + i * .1, [x, y] = pt(t), a = tan(t);
      [-1, 1].forEach(sd => { const len = (30 - i * 1.4) * (.8 + .2 * Math.sin(i)), ang = a + sd * 52;
        o += at(x, y, ang, 1, `<path d="M0 0H${f(len)}"/>` + [.35, .6, .85].map(k => `<path d="M${f(len*k)} 0L${f(len*k + 7)} ${f(-sd * 5)}M${f(len*k)} 0L${f(len*k + 5)} ${f(sd * 5)}"/>`).join('')); }); }
    return o + at(...pt(1), tan(1), 1, `<path d="M0 0L9 -2.5L16 0L9 2.5Z"/>`);
  },
  pine() { // needle fascicles + a cone
    let o = branch();
    for (let i = 0; i < 9; i++) { const t = .08 + i * .1, [x, y] = pt(t), a = tan(t);
      o += at(x, y, a - 62, 1, needles(5, 30 - i, 36)) + (Math.abs(t - .5) < .06 ? '' : at(x, y, a + 62, 1, needles(5, 30 - i, 36))); }
    const [cx, cy] = pt(.5); o += at(cx, cy, 0, 1, `<path d="M0 0V12"/><g transform="translate(0 26) rotate(8)">${cone()}</g>`);
    return o + at(...pt(1), tan(1), 1, needles(5, 26, 50));
  },
  maple() { // three maple leaves on a stem
    let o = branch();
    [[.18, -1, .6], [.46, 1, .72], [.76, -1, .56]].forEach(([t, sd, s]) => { const [x, y] = pt(t), a = tan(t);
      o += `<path d="M${f(x)} ${f(y)}L${f(x + Math.cos((a + sd * 70) * Math.PI / 180) * 18 * K)} ${f(y + Math.sin((a + sd * 70) * Math.PI / 180) * 18 * K)}"/>` + at(x + Math.cos((a + sd * 70) * Math.PI / 180) * 18 * K, y + Math.sin((a + sd * 70) * Math.PI / 180) * 18 * K, a + sd * 70, 1, maple(s)); });
    return o + at(...pt(1), tan(1) - 20, 1, maple(.34));
  },
  hazelnut() { // serrated oval leaves + a cluster of nuts hanging below the branch
    let o = branch();
    [[.1, -1], [.22, 1], [.36, -1], [.74, 1], [.88, -1]].forEach(([t, sd], i) => { const [x, y] = pt(t), a = tan(t); o += at(x, y, a + sd * (48 + i * 2), 1, oval(44 - i * 2, 14, 5)); });
    const [nx, ny] = pt(.56); o += at(nx, ny, 0, 1, `<path d="M0 0V16M0 16L-13 24M0 16L13 24"/><g transform="translate(0 33)">${nut()}</g><g transform="translate(-14 33) rotate(14)">${nut()}</g><g transform="translate(14 33) rotate(-14)">${nut()}</g>`);
    return o + at(...pt(1), tan(1), 1, oval(26, 10, 4));
  },
  linden() { // heart-shaped leaves with a hanging bract & flower cluster
    let o = branch();
    [[.1, -1], [.22, 1], [.36, -1], [.78, 1], [.9, -1]].forEach(([t, sd], i) => { const [x, y] = pt(t), a = tan(t); o += at(x, y, a + sd * (58 + i), 1, heart(40 - i * 2, 26 - i)); });
    const [bx, by] = pt(.58); o += at(bx, by, 0, 1, `<path d="M0 0V10"/><path d="M0 10C9 22 9 38 0 52C-9 38 -9 22 0 10Z"/><path d="M0 14V46"/>` + `<g transform="translate(0 58)"><circle r="2.4"/><circle cx="-6" cy="5" r="2.4"/><circle cx="6" cy="5" r="2.4"/><circle cy="10" r="2.4"/></g>`);
    return o + at(...pt(1), tan(1), 1, heart(26, 17));
  },
  beech() { // pointed, strongly veined leaves + a prickly husk
    let o = branch();
    [[.08, -1], [.2, 1], [.34, -1], [.72, 1], [.86, -1]].forEach(([t, sd], i) => { const [x, y] = pt(t), a = tan(t); o += at(x, y, a + sd * (40 + i * 2), 1, oval(44 - i * 2, 13, 7)); });
    const [hx, hy] = pt(.54); o += at(hx, hy, 0, 1, `<path d="M0 0V12"/><g transform="translate(0 25)"><circle r="11"/>${Array.from({ length: 12 }, (_, k) => { const a = k * 30 * Math.PI / 180; return `<path d="M${f(11 * Math.cos(a))} ${f(11 * Math.sin(a))}L${f(16 * Math.cos(a))} ${f(16 * Math.sin(a))}"/>`; }).join('')}<path d="M-4 -2L4 2M-4 3L4 -1"/></g>`);
    return o + at(...pt(1), tan(1), 1, oval(26, 9, 5));
  }
};

const STYLE = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
const crisp = svg => svg.replace(/<(path|ellipse|circle)\b/g, '<$1 vector-effect="non-scaling-stroke"');
const SQ = { P: [[12, 182], [92, 178], [160, 74], [282, 46]], K: 1, vb: `0 0 ${W} ${H}`, pre: 'art' };           // tall corner piece
const STRIP = { P: [[14, 66], [120, 72], [240, 30], [356, 50]], K: .74, vb: '0 0 372 96', pre: 'strip' };        // wide banner
const build = v => { P = v.P; K = v.K; return Object.keys(ART).map(k => `<symbol id="${v.pre}-${k}" viewBox="${v.vb}"><g ${STYLE}>${crisp(ART[k]())}</g></symbol>`).join('\n  '); };
const symbols = build(SQ) + '\n  ' + build(STRIP);
P = SQ.P; K = SQ.K;
const sprite = `<!-- art:start -->\n<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">\n  ${symbols}\n</svg>\n<!-- art:end -->`;

fs.mkdirSync(path.join(ROOT, 'assets/art'), { recursive: true });
Object.keys(ART).forEach(k => fs.writeFileSync(path.join(ROOT, `assets/art/${k}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" color="#2f5d4a"><title>${k} line art</title><g ${STYLE}>${crisp(ART[k]())}</g></svg>\n`));

const idx = path.join(ROOT, 'index.html'); let h = fs.readFileSync(idx, 'utf8');
if (/<!-- art:start -->/.test(h)) h = h.replace(/<!-- art:start -->[\s\S]*?<!-- art:end -->/, sprite);
else h = h.replace('<body>\n', '<body>\n' + sprite + '\n');
fs.writeFileSync(idx, h);
console.log('art sprite written:', Object.keys(ART).join(', '), '·', (sprite.length / 1024).toFixed(1) + ' KB');
