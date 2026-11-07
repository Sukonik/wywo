// LIVE proof: real network, real websites. Run with:  npm run test:live
// Free public services rate-limit now and then; a 429 shows up as a clear message, not a failure of the engine.
const test = require('node:test'), assert = require('node:assert/strict');
require('../helpers.js');
const { BirdSeed } = require('../helpers.js');
const LIVE = process.env.LIVE === '1';
const opts = { skip: LIVE ? false : 'set LIVE=1 (npm run test:live) to hit the real internet', timeout: 120000 };
// A browser always sends a Referer / User-Agent; OpenStreetMap's Nominatim refuses anonymous clients, so identify like the real site does.
const liveFetch = (url, o = {}) => fetch(url, Object.assign({}, o, { headers: Object.assign({ 'User-Agent': 'WYWO-tests (https://github.com/Sukonik/wywo)', Referer: 'https://sukonik.github.io/wywo/', Origin: 'https://sukonik.github.io' }, o.headers || {}) }));
const clone = o => JSON.parse(JSON.stringify(o));
const state = () => Object.assign({ refs: [], extra: '', action: '', forWho: '' }, clone(BirdSeed.DEMO));

test('LIVE 🩺 every look-up service answers', opts, async () => {
  const rows = await BirdSeed.selfCheck({ retryDelay: 3000, fetch: liveFetch });
  console.log(rows.map(r => (r.ok ? '✅' : '❌') + ' ' + r.name + ' — ' + r.detail + ' (' + r.ms + ' ms)').join('\n'));
  for (const id of ['dns', 'reader', 'osm']) assert.ok(rows.find(r => r.id === id).ok, id + ' must work');
});

test('LIVE ▶ the demo call (City of Long Beach / longbeachny.gov) yields real findings from the website', opts, async () => {
  const res = await BirdSeed.scatter(BirdSeed.SEEDS.map(s => s.id), { state: state(), saved: [], city: 'Long Beach, NY', engine: { id: 'reader', keys: {} }, retryDelay: 3000, fetch: liveFetch });
  const by = Object.fromEntries(res.map(r => [r.seed.id, r]));
  for (const r of res) console.log((r.suggestions.length ? '✅' : '⚠️ ').padEnd(3), r.seed.name.padEnd(18), r.suggestions.length + ' ·', r.message || r.suggestions.slice(0, 2).map(s => s.label).join(' | '));
  assert.equal(by.sunflower.suggestions[0].value, 'Sam Ortiz', 'tidies the name');
  assert.ok(by.pumpkin.suggestions.some(s => /Matches the company/.test(s.label)), 'phone matches the published City Hall number');
  assert.ok(by.flax.suggestions.some(s => /accepts email/.test(s.value)), 'mail domain verified');
  assert.ok(by.kale.suggestions.some(s => s.apply.url === 'https://longbeachny.gov'), 'website found');
  assert.ok(by.watermelon.suggestions.some(s => /linkedin\.com\/company\//.test(s.value)), 'LinkedIn company page read from the site');
  assert.ok(by.pepper.suggestions.some(s => /Building Department/.test(s.apply.title)) && by.pepper.suggestions.some(s => /City Clerk/.test(s.apply.title)), 'departments');
  assert.match(by.cucumber.suggestions[0].value, /West Chester Street/, 'address found on the site');
  assert.ok(by.honeydew.suggestions.length >= 1, 'summary');
});
