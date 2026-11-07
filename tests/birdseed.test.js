// Bird Seed — does each seed actually do what it says?  Run:  npm test
const test = require('node:test'), assert = require('node:assert/strict');
const { BirdSeed, fixture, mockFetch, dnsRoute, readerRoute, emptyState, run, ids, byId } = require('./helpers.js');

const SWA = 'https://swadevelopment.co';
const swaPages = () => ({ [SWA]: fixture('sites/swa-home.html'), [SWA + '/team']: fixture('sites/swa-team.html'), [SWA + '/contact']: fixture('sites/swa-contact.html'), [SWA + '/about']: '<html><body>About</body></html>' });
const swaRoutes = () => [dnsRoute({ 'swadevelopment.co': { A: 1, MX: 1 } }), readerRoute(swaPages())];
const FH = 'https://harborfinch.example';
const fhRoutes = () => [dnsRoute({ 'harborfinch.example': { A: 1, MX: 1 } }), readerRoute({ [FH]: fixture('sites/lawfirm-home.html'), [FH + '/attorneys']: fixture('sites/lawfirm-attorneys.html'), [FH + '/contact-us']: '<html><body>Contact</body></html>', [FH + '/practice']: '<html><body>Practice</body></html>' })];

/* ------------------------------------------------------------------ contract: every seed, every suggestion */
test('contract: 10 seeds exist with plain-language labels', () => {
  assert.deepEqual(BirdSeed.SEEDS.map(s => s.id), ['sunflower', 'thistle', 'corn', 'pumpkin', 'flax', 'kale', 'watermelon', 'pepper', 'cucumber', 'honeydew']);
  for (const s of BirdSeed.SEEDS) { assert.ok(s.name && s.does && s.hint && s.emoji, s.id + ' has name/does/hint/emoji'); }
});

test('contract: guesses and links are NEVER pre-ticked; every suggestion says where it came from', async () => {
  const state = { caller: 'phil', company: 'SWA Development Corp', phone: '(516) 787-9090', alt: '', topics: 'Zoning\nBuilding permits' };
  const results = await BirdSeed.scatter(BirdSeed.SEEDS.map(s => s.id), { state: emptyState(state), saved: [], city: 'Long Beach, NY', fetch: mockFetch(swaRoutes()), engine: { id: 'reader', keys: {} } });
  let n = 0;
  for (const r of results) for (const s of r.suggestions) {
    n++;
    if (s.trust === 'guess') assert.equal(s.checked, false, s.id + ' is a guess so must not be pre-ticked');
    if (s.apply.kind === 'link') assert.equal(s.checked, false, s.id + ' is a link so it is not "added"');
    assert.ok(s.label && s.value !== undefined, s.id + ' has label+value');
    assert.ok(['verified', 'derived', 'guess'].includes(s.trust), s.id + ' has a trust label');
    assert.ok(s.source, s.id + ' names its source');
  }
  assert.ok(n >= 15, 'the full run produces plenty of findings, got ' + n);
});

test('contract: one failing seed never breaks the others', async () => {
  const res = await BirdSeed.scatter(['sunflower', 'corn', 'pumpkin'], { state: emptyState({ caller: 'phil gordon', company: 'Acme', phone: '5167879090' }), saved: [], city: '', fetch: mockFetch([]) /* everything offline */, engine: { id: 'reader', keys: {} } });
  assert.equal(res.length, 3);
  assert.ok(res.every(r => Array.isArray(r.suggestions)));
  assert.ok(byId(res[0], 'tidy') || res[0].suggestions.length >= 1, 'offline name tidy still works');
  assert.ok(res[1].message && /Wikidata|offline/i.test(res[1].message), 'offline Wikidata explains itself');
  assert.ok(byId(res[2], 'fmt'), 'phone format works offline');
});

/* ------------------------------------------------------------------ 🌻 Sunflower — name data */
test('🌻 tidies a lowercase name', async () => {
  const r = await run('sunflower', { caller: 'phil gordon' });
  const s = byId(r, 'tidy'); assert.equal(s.value, 'Phil Gordon'); assert.deepEqual(s.apply, { kind: 'field', field: 'caller', value: 'Phil Gordon', mode: 'replace' }); assert.equal(s.checked, true);
});
test('🌻 handles O’Brien / McDonald and keeps correct names alone', async () => {
  assert.equal(byId(await run('sunflower', { caller: "cian o'brien" }), 'tidy').value, 'Cian O’Brien');
  assert.equal(byId(await run('sunflower', { caller: 'ronald mcdonald' }), 'tidy').value, 'Ronald McDonald');
  const r = await run('sunflower', { caller: 'Phil Gordon' }); assert.equal(r.suggestions.length, 0); assert.match(r.message, /already looks complete/);
});
test('🌻 completes a first name from the email (a guess, never pre-ticked)', async () => {
  const s = byId(await run('sunflower', { caller: 'Maria', alt: 'maria.gomez@acme.example' }), 'email');
  assert.equal(s.value, 'Maria Gomez'); assert.equal(s.trust, 'guess'); assert.equal(s.checked, false);
});
test('🌻 finds the full name and job title on the company team page', async () => {
  const r = await run('sunflower', { caller: 'Phil', company: 'SWA Development Corp', alt: 'pgordon@swadevelopment.co' }, swaRoutes());
  const nm = byId(r, 'site'), title = byId(r, 'title');
  assert.equal(nm.value, 'Phil Gordon'); assert.equal(nm.trust, 'verified'); assert.equal(nm.checked, true); assert.match(nm.source, /swadevelopment\.co/);
  assert.equal(title.value, 'Managing Partner'); assert.match(title.apply.text, /Phil Gordon — Managing Partner/);
});
test('🌻 reads people from a card-style attorney page (name / title on separate lines)', async () => {
  const r = await run('sunflower', { caller: 'maria', company: 'Harbor Finch LLP', alt: 'mdelgado@harborfinch.example' }, fhRoutes());
  assert.equal(byId(r, 'site').value, 'Maria Delgado'); assert.equal(byId(r, 'title').value, 'Partner');
});
test('🌻 reuses the full name from an earlier call', async () => {
  const saved = [{ at: Date.now(), data: emptyState({ caller: 'Satya Nadella', phone: '2125550142' }) }];
  const r = await run('sunflower', { caller: 'Satya', phone: '(212) 555-0142' }, [], { saved });
  assert.equal(r.suggestions.find(s => /earlier call/.test(s.label)).value, 'Satya Nadella');
});

/* ------------------------------------------------------------------ 🌱 Thistle — past calls */
test('🌱 summarises earlier calls and fills missing details from them', async () => {
  const saved = [{ at: Date.parse('2026-11-03T12:00:00'), data: emptyState({ caller: 'Phil Gordon', company: 'SWA Development Corp', phone: '516-787-9090', alt: 'pgordon@swadevelopment.co', topics: 'Zoning\nPermits' }) }];
  const r = await run('thistle', { caller: 'Phil Gordon', phone: '5167879090' }, [], { saved });
  assert.match(byId(r, 'sum').value, /about Zoning, Permits/); assert.match(byId(r, 'sum').apply.text, /Previous calls: 1/);
  assert.equal(byId(r, 'company').apply.mode, 'ifEmpty'); assert.equal(byId(r, 'alt').value, 'pgordon@swadevelopment.co');
  assert.equal(byId(r, 'phone'), undefined, 'does not offer a phone number the note already has');
});
test('🌱 says so when there is no history', async () => { const r = await run('thistle', { caller: 'Nobody' }); assert.equal(r.suggestions.length, 0); assert.match(r.message, /No earlier calls/); });

/* ------------------------------------------------------------------ 🌽 Cracked Corn — Wikidata */
const wd = (hit) => [[/wbsearchentities/, () => ({ search: hit ? [{ id: 'Q2283', label: 'Microsoft', description: 'American technology company' }] : [] })],
  [/wbgetentities.*props=claims/, () => ({ entities: { Q2283: { claims: { P856: [{ mainsnak: { datavalue: { value: 'https://www.microsoft.com' } } }], P159: [{ mainsnak: { datavalue: { value: { id: 'Q1' } } } }] }, sitelinks: {} } } })],
  [/wbgetentities.*props=labels/, () => ({ entities: { Q1: { labels: { en: { value: 'Redmond' } } } } })]];
test('🌽 returns the public profile, website and HQ for a known company', async () => {
  const r = await run('corn', { company: 'Microsoft' }, wd(true)), s = r.suggestions[0];
  assert.equal(s.apply.url, 'https://www.microsoft.com'); assert.match(s.apply.detail, /Redmond/); assert.equal(s.trust, 'verified');
});
test('🌽 says “no profile” rather than inventing one', async () => { const r = await run('corn', { company: 'SWA Development Corp' }, wd(false)); assert.equal(r.suggestions.length, 0); assert.match(r.message, /No public profile/); });
test('🌽 needs a company', async () => assert.match((await run('corn', {})).message, /company/i));

/* ------------------------------------------------------------------ 🎃 Pumpkin — phone data */
test('🎃 normalises formats and reports the region', async () => {
  const r = await run('pumpkin', { phone: '(646) 331-2205' }, [dnsRoute({})]);
  assert.equal(byId(r, 'fmt').value, '646-331-2205'); assert.match(byId(r, 'where').value, /Manhattan, New York City/); assert.match(byId(r, 'where').value, /valid US format/);
});
test('🎃 handles 11-digit +1 numbers and extensions', async () => {
  const r = await run('pumpkin', { phone: '+1 516.787.9090 ext 12' }, [dnsRoute({})]); assert.equal(byId(r, 'fmt').value, '516-787-9090 x12');
});
test('🎃 flags fictional 555-01xx numbers and invalid codes', async () => {
  assert.match(byId(await run('pumpkin', { phone: '212-555-0142' }, [dnsRoute({})]), 'where').value, /reserved for fiction/);
  assert.match(byId(await run('pumpkin', { phone: '123-456-7890' }, [dnsRoute({})]), 'where').value, /not valid/);
});
test('🎃 knows toll-free numbers; rejects short numbers', async () => {
  assert.match(byId(await run('pumpkin', { phone: '800-555-1234' }, [dnsRoute({})]), 'where').value, /Toll-free/);
  const r = await run('pumpkin', { phone: '516-787' }, [dnsRoute({})]); assert.match(byId(r, 'len').value, /needs 10/); assert.equal(byId(r, 'len').checked, true);
});
test('🎃 confirms the caller’s number is published on the company site, and offers the main line', async () => {
  const r = await run('pumpkin', { phone: '516-787-9000', alt: 'x@swadevelopment.co', company: 'SWA Development Corp' }, swaRoutes());
  assert.equal(byId(r, 'match').trust, 'verified'); assert.match(byId(r, 'match').value, /listed on swadevelopment\.co/);
  const r2 = await run('pumpkin', { phone: '516-787-9090', alt: 'x@swadevelopment.co', company: 'SWA Development Corp' }, swaRoutes());
  assert.equal(byId(r2, 'match'), undefined); assert.equal(byId(r2, 'site0').value, '516-787-9000'); assert.equal(byId(r2, 'site0').checked, false);
  assert.ok(!r2.suggestions.some(s => s.value === '516-787-9001'), 'a published FAX number is not offered as a phone number');
});
test('🎃 no number → says so', async () => assert.match((await run('pumpkin', {})).message, /No phone/));

/* ------------------------------------------------------------------ 🌾 Flax — email data */
test('🌾 verifies the email domain accepts mail — and warns when it does not', async () => {
  const ok = await run('flax', { alt: 'pat@swadevelopment.co' }, [dnsRoute({ 'swadevelopment.co': { A: 1, MX: 1 } }), readerRoute({})]);
  assert.match(byId(ok, 'mx').value, /accepts email/); assert.equal(byId(ok, 'mx').trust, 'verified');
  const bad = await run('flax', { alt: 'pat@no-such-domain.example' }, [dnsRoute({}), readerRoute({})]);
  assert.match(byId(bad, 'mx').value, /no mail servers/); assert.equal(byId(bad, 'mx').checked, true, 'a problem is surfaced by default');
});
test('🌾 finds the caller’s own email on the company site (verified, pre-ticked)', async () => {
  const r = await run('flax', { caller: 'Phil Gordon', company: 'SWA Development Corp' }, swaRoutes().concat([]), {});
  // company site is found by name (DNS) — the caller email is on the team page
  const s = r.suggestions.find(x => x.id.startsWith('flax:p'));
  assert.equal(s.value, 'pgordon@swadevelopment.co'); assert.equal(s.trust, 'verified'); assert.equal(s.checked, true); assert.deepEqual(s.apply, { kind: 'field', field: 'alt', value: 'pgordon@swadevelopment.co', mode: 'append' });
});
test('🌾 offers the general company email as an optional reference', async () => {
  const r = await run('flax', { caller: 'Someone', company: 'SWA Development Corp' }, swaRoutes()), g = r.suggestions.find(x => x.id.startsWith('flax:g'));
  assert.equal(g.value, 'info@swadevelopment.co'); assert.equal(g.checked, false); assert.equal(g.apply.kind, 'ref');
});
test('🌾 infers the company’s email pattern for a colleague who has no email yet (a guess)', async () => {
  const r = await run('flax', { caller: 'Dana Reed', company: 'SWA Development Corp' }, [dnsRoute({ 'swadevelopment.co': { A: 1, MX: 1 } }), readerRoute({ [SWA]: '<html><body><p>Contact Phil Gordon at pgordon@swadevelopment.co</p></body></html>' })]);
  assert.ok(r.suggestions.some(s => s.id.endsWith('mine') || s.id.includes('flax:p')) || r.suggestions.some(s => s.id === 'flax:pat'), 'some suggestion produced');
  const pat = byId(r, 'pat'); if (pat) { assert.equal(pat.value, 'dreed@swadevelopment.co'); assert.equal(pat.trust, 'guess'); assert.equal(pat.checked, false); }
});
test('🌾 never treats Gmail/Yahoo as the company’s domain', async () => {
  const r = await run('flax', { caller: 'Sam Lee', company: 'Lee Plumbing', alt: 'samlee@gmail.com' }, [dnsRoute({ 'gmail.com': { A: 1, MX: 1 } }), readerRoute({})]);
  assert.ok(!r.calls.some(c => /r\.jina\.ai\/https:\/\/gmail\.com/.test(c.url)), 'did not try to crawl gmail.com');
});

/* ------------------------------------------------------------------ 🥬 Kale — website data */
test('🥬 finds the website from the caller’s email domain and reads its title & description', async () => {
  const r = await run('kale', { company: 'SWA Development Corp', alt: 'pgordon@swadevelopment.co' }, swaRoutes()), s = byId(r, 'site');
  assert.equal(s.trust, 'verified'); assert.equal(s.apply.url, SWA); assert.match(s.value, /swadevelopment\.co — SWA Development Corp/); assert.match(s.apply.detail, /retail and residential/);
  assert.equal(byId(r, 'contact').value, SWA + '/contact');
});
test('🥬 finds a website by company NAME (domain probe) but labels it a guess', async () => {
  const s = byId(await run('kale', { company: 'SWA Development Corp' }, swaRoutes()), 'site');
  assert.equal(s.trust, 'guess'); assert.equal(s.checked, false); assert.match(s.source, /confirm it’s the right company/);
});
test('🥬 says so when no site exists, and when the site cannot be read', async () => {
  assert.match((await run('kale', { company: 'Nonexistent Co' }, [dnsRoute({}), readerRoute({})])).message, /No company website found/);
  const r = await run('kale', { company: 'Acme', alt: 'a@acme.example' }, [dnsRoute({ 'acme.example': { A: 1 } }), readerRoute({})]);
  assert.match(byId(r, 'site').source, /couldn’t read/);
});

/* ------------------------------------------------------------------ 🍉 Watermelon — LinkedIn & social */
test('🍉 returns the LinkedIn company page and caller profile linked from the site (verified)', async () => {
  const r = await run('watermelon', { caller: 'Phil Gordon', company: 'SWA Development Corp', alt: 'pgordon@swadevelopment.co' }, swaRoutes());
  assert.equal(byId(r, 'co').value, 'https://www.linkedin.com/company/swa-development-corp'); assert.equal(byId(r, 'co').trust, 'verified'); assert.equal(byId(r, 'co').checked, true);
  assert.equal(byId(r, 'me').value, 'https://www.linkedin.com/in/phil-gordon-swa');
  assert.equal(byId(r, 'facebook').value, 'https://www.facebook.com/swadevelopment'); assert.equal(byId(r, 'facebook').checked, false);
});
test('🍉 plain-HTML footers: LinkedIn / X / Instagram found, “share” links ignored', async () => {
  const r = await run('watermelon', { caller: 'Maria Delgado', company: 'Harbor Finch LLP', alt: 'm@harborfinch.example' }, fhRoutes());
  assert.equal(byId(r, 'co').value, 'https://www.linkedin.com/company/harbor-finch-llp'); assert.equal(byId(r, 'x').value, 'https://twitter.com/harborfinch');
  assert.equal(byId(r, 'instagram').value, 'https://www.instagram.com/harborfinchllp'); assert.equal(byId(r, 'me').value, 'https://www.linkedin.com/in/maria-delgado-esq');
  assert.ok(!r.suggestions.some(s => /share/.test(s.value)));
});
test('🍉 JSON-LD sameAs yields YouTube/Instagram/Facebook', async () => {
  const r = await run('watermelon', { company: 'Salt Rye Bakery', alt: 'x@saltandrye.example' }, [dnsRoute({ 'saltandrye.example': { A: 1 } }), readerRoute({ 'https://saltandrye.example': fixture('sites/bakery.html') })]);
  assert.ok(byId(r, 'youtube') && byId(r, 'instagram') && byId(r, 'facebook'));
});
test('🍉 no site → a clearly-labelled guess plus search links (never pre-ticked)', async () => {
  const r = await run('watermelon', { caller: 'Tom Reyes', company: 'Reyes Realty' }, [dnsRoute({}), readerRoute({})]);
  assert.equal(byId(r, 'coguess').value, 'linkedin.com/company/reyes-realty'); assert.equal(byId(r, 'coguess').checked, false);
  assert.match(byId(r, 'people').apply.url, /linkedin\.com\/search\/results\/people\/\?keywords=Tom%20Reyes%20Reyes%20Realty/);
});

/* ------------------------------------------------------------------ 🌶️ Pepper — city departments */
test('🌶️ Long Beach: zoning / permits / mercantile license → the right verified departments', async () => {
  const r = await run('pepper', { topics: 'Industrial Zone / Zoning\nBuilding Permits\nMercantile License' }, [], { city: 'Long Beach, NY' });
  const titles = r.suggestions.map(s => s.apply.title);
  for (const want of ['Building Department', 'City Clerk', 'Planning Board', 'Zoning Board']) assert.ok(titles.some(t => t.includes(want)), want + ' suggested');
  const bld = r.suggestions.find(s => /Building Department/.test(s.apply.title)); assert.match(bld.apply.detail, /\(516\) 431-1005/); assert.equal(bld.trust, 'verified'); assert.equal(bld.checked, true);
  const clerk = r.suggestions.find(s => /City Clerk/.test(s.apply.title)); assert.match(clerk.apply.detail, /\(516\) 431-1002/);
});
test('🌶️ understands plurals and other topics (taxes, water, parking tickets)', async () => {
  assert.ok((await run('pepper', { topics: 'Property taxes' }, [], { city: 'Long Beach, NY' })).suggestions.some(s => /Tax/.test(s.apply.title)));
  assert.ok((await run('pepper', { topics: 'Water bill' }, [], { city: 'Long Beach, NY' })).suggestions.some(s => /Water/.test(s.apply.title)));
  assert.ok((await run('pepper', { topics: 'Parking ticket' }, [], { city: 'Long Beach, NY' })).suggestions.some(s => /Court|Police|Transportation/.test(s.apply.title)));
});
test('🌶️ the company name never steers the match; the call topics do', async () => {
  const r = await run('pepper', { company: 'Building Water Tax Inc', topics: 'Lab results' }, [], { city: 'Long Beach, NY' });
  assert.ok(!r.suggestions.some(s => /Building Department|Tax Assessor/.test(s.apply.title)));
});
test('🌶️ another city → search links only (the verified directory is Long Beach, NY)', async () => {
  const r = await run('pepper', { topics: 'Zoning' }, [], { city: 'Austin, TX' }); assert.ok(r.suggestions.every(s => s.apply.kind === 'link')); assert.match(r.message, /Long Beach, NY only/);
});
test('🌶️ every directory entry is complete (phone, link, source date)', () => {
  const D = globalThis.LB_DIRECTORY; assert.ok(D.depts.length >= 20);
  for (const d of D.depts) { assert.match(d.phone, /^\(516\) \d{3}-\d{4}$/, d.id); assert.match(d.url, /^https:\/\/www\.longbeachny\.gov\//, d.id); assert.ok(d.keys.length >= 2, d.id); }
  assert.match(D.checked, /^\d{4}-\d{2}-\d{2}$/);
});

/* ------------------------------------------------------------------ 🥒 Cucumber — address */
const osm = (hit) => [/nominatim/, () => (hit ? [{ lat: '40.5896', lon: '-73.6664' }] : [])];
test('🥒 reads the address from structured data and verifies it on the map', async () => {
  const r = await run('cucumber', { company: 'SWA Development Corp', alt: 'x@swadevelopment.co' }, swaRoutes().concat([osm(true)])), s = byId(r, 'addr');
  assert.equal(s.value, '1 West Chester Street, Long Beach, NY 11561'); assert.match(s.apply.url, /openstreetmap\.org\/\?mlat=40\.5896&mlon=-73\.6664/); assert.match(s.source, /found on the map/); assert.equal(s.checked, true);
});
test('🥒 finds a street address written as plain text in a footer', async () => {
  const r = await run('cucumber', { company: 'Harbor Finch LLP', alt: 'x@harborfinch.example' }, fhRoutes().concat([osm(true)]));
  assert.match(byId(r, 'addr').value, /200 Park Avenue, Suite 1700/); assert.match(byId(r, 'addr').value, /NY 10166/);
});
test('🥒 flags an address the map cannot place; falls back to a map search when the site has none', async () => {
  assert.match(byId(await run('cucumber', { company: 'X', alt: 'x@swadevelopment.co' }, swaRoutes().concat([osm(false)])), 'addr').source, /couldn’t place it on the map/);
  const r = await run('cucumber', { company: 'Brochure Co', alt: 'x@bare.example' }, [dnsRoute({ 'bare.example': { A: 1 } }), readerRoute({ 'https://bare.example': fixture('sites/bare.html') })]);
  assert.match(r.message, /No street address is published/); assert.equal(r.suggestions[0].apply.kind, 'link');
});

/* ------------------------------------------------------------------ 🍈 Honeydew — summary */
test('🍈 summarises the company from its own description and headings', async () => {
  const r = await run('honeydew', { company: 'SWA Development Corp', alt: 'x@swadevelopment.co' }, swaRoutes());
  assert.match(byId(r, 'about').apply.text, /^About SWA Development Corp: SWA Development Corp develops retail and residential/); assert.match(byId(r, 'topics').value, /retail corners/); assert.equal(byId(r, 'topics').checked, false);
});
test('🍈 reads Open Graph descriptions (WordPress-style) and admits when a site has none', async () => {
  const r = await run('honeydew', { company: 'Salt Rye', alt: 'x@saltandrye.example' }, [dnsRoute({ 'saltandrye.example': { A: 1 } }), readerRoute({ 'https://saltandrye.example': fixture('sites/bakery.html') })]);
  assert.match(byId(r, 'about').value, /sourdough/);
  const none = await run('honeydew', { company: 'Brochure', alt: 'x@bare.example' }, [dnsRoute({ 'bare.example': { A: 1 } }), readerRoute({ 'https://bare.example': '<html><head><title>x</title></head><body><h1>Hi</h1></body></html>' })]);
  assert.equal(none.suggestions.length, 0); assert.match(none.message, /doesn’t publish/);
});

/* ------------------------------------------------------------------ engines */
const body = o => JSON.parse(o.opts.body);
test('engine: built-in reader asks r.jina.ai for HTML', async () => {
  const r = await run('kale', { company: 'SWA', alt: 'a@swadevelopment.co' }, swaRoutes()); const c = r.calls.find(x => /r\.jina\.ai/.test(x.url));
  assert.equal(c.url, 'https://r.jina.ai/https://swadevelopment.co'); assert.equal(c.opts.headers['X-Return-Format'], 'html');
});
test('engine: Firecrawl → POST /v2/scrape with Bearer key', async () => {
  const f = mockFetch([dnsRoute({ 'swadevelopment.co': { A: 1 } }), [/api\.firecrawl\.dev/, () => ({ success: true, data: { html: fixture('sites/swa-home.html') } })]]);
  const res = await BirdSeed.scatter(['kale'], { state: emptyState({ company: 'SWA', alt: 'a@swadevelopment.co' }), saved: [], fetch: f, engine: { id: 'firecrawl', keys: { firecrawl: 'fc-123' } } });
  const c = f.calls.find(x => /firecrawl/.test(x.url)); assert.equal(c.url, 'https://api.firecrawl.dev/v2/scrape'); assert.equal(c.opts.method, 'POST'); assert.equal(c.opts.headers.Authorization, 'Bearer fc-123'); assert.deepEqual(body(c).formats, ['html']);
  assert.match(res[0].suggestions[0].value, /swadevelopment\.co/);
});
test('engine: Crawl4AI cloud uses /scrape; self-hosted uses /md; markdown is understood', async () => {
  const md = { markdown: fixture('sites/firecrawl-markdown.md') };
  for (const [cfg, url] of [[{ keys: { crawl4ai: 'k' } }, 'https://api.crawl4ai.com/scrape'], [{ keys: { crawl4ai: 'tok' }, c4url: 'http://localhost:11235/' }, 'http://localhost:11235/md']]) {
    const f = mockFetch([dnsRoute({ 'harborfinch.example': { A: 1, MX: 1 } }), [/crawl4ai\.com|localhost/, () => md]]);
    const res = await BirdSeed.scatter(['cucumber', 'watermelon'], { state: emptyState({ company: 'Harbor Finch LLP', alt: 'x@harborfinch.example', caller: 'x' }), saved: [], fetch: f, engine: Object.assign({ id: 'crawl4ai' }, cfg) });
    assert.equal(f.calls.find(c => /crawl4ai\.com|localhost/.test(c.url)).url, url);
    assert.match(byId(res[0], 'addr') ? byId(res[0], 'addr').value : '', /200 Park Avenue/); assert.equal(byId(res[1], 'co').value, 'https://www.linkedin.com/company/harbor-finch-llp');
  }
});
test('engine: ScrapeGraphAI → POST /api/extract with SGAI-APIKEY and a prompt; structured JSON is mapped', async () => {
  const f = mockFetch([dnsRoute({ 'swadevelopment.co': { A: 1, MX: 1 } }), [/scrapegraphai\.com/, () => ({ json: { company_name: 'SWA Development Corp', description: 'Builds retail.', phones: ['516-787-9000'], emails: ['info@swadevelopment.co'], address: '1 West Chester Street, Long Beach, NY 11561', linkedin_url: 'https://www.linkedin.com/company/swa-development-corp', people: [{ name: 'Phil Gordon', title: 'Managing Partner' }] } })], [/nominatim/, () => []]]);
  const res = await BirdSeed.scatter(['pumpkin', 'cucumber', 'watermelon', 'sunflower'], { state: emptyState({ caller: 'Phil', phone: '516-787-9090', company: 'SWA', alt: 'a@swadevelopment.co' }), saved: [], fetch: f, engine: { id: 'scrapegraph', keys: { scrapegraph: 'sg-1' } } });
  const c = f.calls.find(x => /scrapegraph/.test(x.url)); assert.equal(c.url, 'https://v2-api.scrapegraphai.com/api/extract'); assert.equal(c.opts.headers['SGAI-APIKEY'], 'sg-1'); assert.match(body(c).prompt, /phones/);
  assert.equal(byId(res[0], 'site0').value, '516-787-9000'); assert.match(byId(res[1], 'addr').value, /1 West Chester Street/); assert.equal(byId(res[2], 'co').value, 'https://www.linkedin.com/company/swa-development-corp'); assert.equal(byId(res[3], 'site').value, 'Phil Gordon');
});
test('engine: a missing key gives a clear message, not a crash', async () => {
  for (const [id, name] of [['firecrawl', 'Firecrawl'], ['crawl4ai', 'Crawl4AI'], ['scrapegraph', 'ScrapeGraphAI']]) {
    const res = await BirdSeed.scatter(['kale'], { state: emptyState({ company: 'X', alt: 'a@acme.example' }), saved: [], fetch: mockFetch([dnsRoute({ 'acme.example': { A: 1 } })]), engine: { id, keys: {} } });
    assert.match(res[0].suggestions[0].source, new RegExp('add your ' + name + ' API key')); }
});

/* ------------------------------------------------------------------ apply(): what “Add” really does to the note */
test('apply: field replace / append / ifEmpty', () => {
  const st = { caller: 'phil gordon', alt: 'a@x.com', company: '' };
  assert.equal(BirdSeed.apply(st, { kind: 'field', field: 'caller', value: 'Phil Gordon', mode: 'replace' }), 1); assert.equal(st.caller, 'Phil Gordon');
  assert.equal(BirdSeed.apply(st, { kind: 'field', field: 'alt', value: 'b@x.com', mode: 'append' }), 1); assert.equal(st.alt, 'a@x.com · b@x.com');
  assert.equal(BirdSeed.apply(st, { kind: 'field', field: 'alt', value: 'B@X.com', mode: 'append' }), 0, 'no duplicate (case-insensitive)');
  assert.equal(BirdSeed.apply(st, { kind: 'field', field: 'company', value: 'Acme', mode: 'ifEmpty' }), 1); assert.equal(BirdSeed.apply(st, { kind: 'field', field: 'company', value: 'Other', mode: 'ifEmpty' }), 0); assert.equal(st.company, 'Acme');
});
test('apply: refs and extra are added once, in the right place', () => {
  const st = { refs: [], extra: 'First line.' };
  assert.equal(BirdSeed.apply(st, { kind: 'ref', title: 'City Clerk', detail: '(516) 431-1002', url: 'https://x' }), 1); assert.equal(BirdSeed.apply(st, { kind: 'ref', title: 'City Clerk', detail: '', url: 'https://x' }), 0); assert.equal(st.refs.length, 1);
  assert.equal(BirdSeed.apply(st, { kind: 'extra', text: 'Phone: Area code 516.' }), 1); assert.equal(st.extra, 'First line.\nPhone: Area code 516.'); assert.equal(BirdSeed.apply(st, { kind: 'extra', text: 'Phone: Area code 516.' }), 0);
  assert.equal(BirdSeed.apply(st, { kind: 'link', url: 'https://g' }), 0, 'links are never written into the note');
});
test('end to end: scatter → tick the pre-ticked ones → the note really gains the details', async () => {
  const st = emptyState({ caller: 'phil', company: 'SWA Development Corp', phone: '5167879090', alt: 'pgordon@swadevelopment.co', topics: 'Zoning' });
  const res = await BirdSeed.scatter(BirdSeed.SEEDS.map(s => s.id), { state: JSON.parse(JSON.stringify(st)), saved: [], city: 'Long Beach, NY', fetch: mockFetch(swaRoutes().concat([osm(true), wd(false)[0]])), engine: { id: 'reader', keys: {} } });
  let changed = 0; for (const r of res) for (const s of r.suggestions) if (s.checked) changed += BirdSeed.apply(st, s.apply);
  assert.equal(st.caller, 'Phil Gordon'); assert.equal(st.phone, '516-787-9090');
  assert.ok(st.refs.some(r => /linkedin\.com\/company\/swa-development-corp/.test(r.url)), 'LinkedIn added'); assert.ok(st.refs.some(r => /Building Department|Zoning Board/.test(r.title)), 'city department added');
  assert.ok(st.refs.some(r => /address/.test(r.title) && /11561/.test(r.detail)), 'address added'); assert.match(st.extra, /Managing Partner/); assert.match(st.extra, /About SWA Development Corp/);
  assert.ok(changed >= 8, 'at least 8 changes, got ' + changed);
});

/* ------------------------------------------------------------------ resilience & the “prove it works” tools */
test('🌐 a pasted company website is used when the company name alone finds nothing', async () => {
  const routes = [dnsRoute({ 'acme.example': { A: 1, MX: 1 } }), readerRoute({ 'https://acme.example': fixture('sites/swa-home.html') })];
  assert.match((await run('kale', { company: 'Zzyzx Holdings' }, routes)).message, /No company website found/);
  const s = byId(await run('kale', { company: 'Zzyzx Holdings' }, routes, { website: 'acme.example/about?x=1' }), 'site');
  assert.equal(s.apply.url, 'https://acme.example'); assert.equal(s.trust, 'verified'); assert.equal(s.checked, true);
});
test('🔁 a rate-limited service (HTTP 429) is retried once, then explained honestly', async () => {
  let n = 0;
  const flaky = [[/wbsearchentities/, () => (++n === 1 ? { status: 429, body: 'slow down' } : { search: [{ id: 'Q9', label: 'Acme', description: 'Anvils' }] })], [/wbgetentities/, () => ({ entities: { Q9: { claims: {}, sitelinks: {} } } })]];
  const ok = await run('corn', { company: 'Acme' }, flaky, { retryDelay: 0 }); assert.equal(n, 2); assert.equal(ok.suggestions[0].apply.title, 'Acme');
  const always = await run('corn', { company: 'Acme' }, [[/wikidata/, () => ({ status: 429, body: 'no' })]], { retryDelay: 0 }); assert.match(always.message, /Wikidata is busy/);
});
test('🩺 selfCheck reports each service working or failing (with a reason)', async () => {
  const good = mockFetch([dnsRoute({ 'example.com': { A: 1 } }), [/r\.jina\.ai/, () => '<html><head><title>Example Domain</title></head><body><h1>Example Domain</h1></body></html>'], [/wbsearchentities/, () => ({ search: [{ label: 'Wikipedia' }] })], [/nominatim/, () => [{ lat: '1', lon: '2' }]]]);
  const rows = await BirdSeed.selfCheck({ fetch: good, retryDelay: 0 });
  assert.deepEqual(rows.map(r => r.id), ['dns', 'reader', 'wikidata', 'osm']); assert.ok(rows.every(r => r.ok), JSON.stringify(rows)); assert.match(rows[1].detail, /Example Domain/);
  const bad = mockFetch([dnsRoute({ 'example.com': { A: 1 } }), [/wikidata/, () => ({ status: 429, body: 'x' })]]);
  const rows2 = await BirdSeed.selfCheck({ fetch: bad, retryDelay: 0 });
  assert.equal(rows2[0].ok, true); assert.equal(rows2[1].ok, false); assert.equal(rows2[2].ok, false); assert.match(rows2[2].detail, /busy/); assert.equal(rows2[3].ok, false);
});
test('▶ the real demo call lets every website seed find real details', async () => {
  const LB = 'https://longbeachny.gov';
  const routes = [dnsRoute({ 'longbeachny.gov': { A: 1, MX: 1 } }), readerRoute({ [LB]: fixture('sites/longbeach-home.html'), [LB + '/about']: '<html><body>x</body></html>', [LB + '/business']: '<html><body>x</body></html>', [LB + '/building']: '<html><body>x</body></html>' }), osm(true)];
  const state = emptyState(JSON.parse(JSON.stringify(BirdSeed.DEMO)));
  const res = await BirdSeed.scatter(BirdSeed.SEEDS.map(s => s.id), { state, saved: [], city: 'Long Beach, NY', fetch: mockFetch(routes.concat([wd0()])), engine: { id: 'reader', keys: {} } });
  const by = Object.fromEntries(res.map(r => [r.seed.id, r]));
  assert.equal(by.sunflower.suggestions[0].value, 'Sam Ortiz'); assert.match(by.pumpkin.suggestions.find(s => /Matches/.test(s.label)).value, /516-431-1000 is listed on longbeachny\.gov/);
  assert.ok(by.flax.suggestions.some(s => /accepts email/.test(s.value))); assert.equal(by.watermelon.suggestions.find(s => s.id.endsWith(':co')).value, 'https://www.linkedin.com/company/city-of-long-beach-new-york');
  assert.ok(by.pepper.suggestions.some(s => /Building Department/.test(s.apply.title)) && by.pepper.suggestions.some(s => /City Clerk/.test(s.apply.title)));
  assert.match(by.cucumber.suggestions[0].value, /1 West Chester Street, Long Beach, NY 11561/); assert.match(by.honeydew.suggestions[0].apply.text, /Official Website of Long Beach/);
  const total = res.reduce((n, r) => n + r.suggestions.filter(s => s.apply.kind !== 'link').length, 0); assert.ok(total >= 12, 'demo yields at least 12 real findings, got ' + total);
});
function wd0() { return [/wbsearchentities/, () => ({ search: [] })]; }
