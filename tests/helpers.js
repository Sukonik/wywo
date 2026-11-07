// Shared test setup: a DOM for the page-reading code, a mock network, and the modules under test.
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.DOMParser = dom.window.DOMParser;
const mem = {}; global.sessionStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, clear: () => { for (const k in mem) delete mem[k]; } };

require('../src/directory.js'); require('../src/quicktype.js');
const BirdSeed = require('../src/birdseed.js'), BirdWatch = require('../src/birdwatch.js'), QuickType = require('../src/quicktype.js');

const fixture = name => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

/**
 * mockFetch(routes) -> fetch-compatible function that also records calls.
 * routes: [[RegExp|string, (url, opts) => body | {status, body, json}], ...]  (first match wins)
 *   body: object → JSON, string → text. Unmatched URLs throw "network down" (like being offline).
 */
function mockFetch(routes) {
  const calls = [];
  const f = async (url, opts = {}) => {
    calls.push({ url, opts });
    for (const [pat, h] of routes) {
      if (typeof pat === 'string' ? url.includes(pat) : pat.test(url)) {
        let r = typeof h === 'function' ? await h(url, opts) : h;
        if (r && r.status && r.status >= 400) return { ok: false, status: r.status, json: async () => r.body, text: async () => String(r.body) };
        const body = r && r.body !== undefined && r.__resp ? r.body : r;
        return { ok: true, status: 200, json: async () => (typeof body === 'string' ? JSON.parse(body) : body), text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) };
      }
    }
    throw new TypeError('network down: ' + url);
  };
  f.calls = calls;
  return f;
}
// DNS-over-HTTPS answers: dnsRoute({ 'example.com': { A: true, MX: true } })
function dnsRoute(map) {
  return [/dns\.google\/resolve/, url => {
    const name = decodeURIComponent(url.match(/name=([^&]+)/)[1]), type = url.match(/type=(\w+)/)[1], rec = map[name];
    return rec && rec[type] ? { Status: 0, Answer: [{ name, type: type === 'MX' ? 15 : 1, data: type === 'MX' ? '10 mail.' + name + '.' : '93.184.216.34' }] } : { Status: 3 };
  }];
}
// Page reading through the free reader: readerRoute({ 'https://acme.test': html, 'https://acme.test/team': html2 })
function readerRoute(pages) {
  return [/r\.jina\.ai\//, url => {
    const u = url.replace('https://r.jina.ai/', '');
    if (u in pages) return pages[u];
    return { status: 404, body: 'not found' };
  }];
}
const emptyState = (o = {}) => Object.assign({ caller: '', company: '', phone: '', alt: '', reason: '', topics: '', action: '', extra: '', refs: [], forWho: '' }, o);
const ids = (r) => r.suggestions.map(s => s.id);
const byId = (r, id) => r.suggestions.find(s => s.id === id || s.id.endsWith(':' + id));
async function run(seed, state, routes, extra = {}) {
  const fetch = mockFetch(routes || []);
  const res = await BirdSeed.scatter([seed], Object.assign({ state: emptyState(state), saved: [], city: '', fetch, engine: { id: 'reader', keys: {} } }, extra));
  res[0].calls = fetch.calls; return res[0];
}
module.exports = { BirdSeed, BirdWatch, QuickType, fixture, mockFetch, dnsRoute, readerRoute, emptyState, run, ids, byId, JSDOM };
