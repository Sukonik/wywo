/*
 * 🐦 Bird Seed 2.0 — looks up REAL information about a call and ASKS before adding it.
 *
 * Each seed reads your note, looks things up (the company's own website, public DNS,
 * Wikidata, OpenStreetMap, your saved notes, a verified city directory) and returns
 * suggestions. Nothing is applied automatically: the UI shows each finding with its
 * source and you tick what to add.
 *
 * Website reading ("crawling") engines — pick one in the Bird Seed window:
 *   reader       free, no key  → Jina Reader (https://r.jina.ai) returns the page HTML
 *   firecrawl    your API key  → POST https://api.firecrawl.dev/v2/scrape
 *   crawl4ai     your key/URL  → cloud POST https://api.crawl4ai.com/scrape, or your
 *                                self-hosted server POST <url>/md
 *   scrapegraph  your API key  → POST https://v2-api.scrapegraphai.com/api/extract
 *                                (AI extraction with a prompt, header SGAI-APIKEY)
 *
 * Suggestion: { id, seed, label, value, trust, source, srcUrl, checked, apply }
 *   trust: 'verified' (read from a real source)  'derived' (worked out from your note)
 *          'guess' (plausible, unconfirmed — never pre-ticked)
 *   apply: { kind:'field', field, value, mode:'replace'|'append'|'ifEmpty' }
 *        | { kind:'ref', title, detail, url } | { kind:'extra', text } | { kind:'link', url }
 */
(function (root) {
  'use strict';

  var SEEDS = [
    { id: 'sunflower',  emoji: '🌻', name: 'Sunflower Seeds',  does: 'Name data',        hint: 'Tidy the name, find the full name & job title on the company website' },
    { id: 'thistle',    emoji: '🌱', name: 'Thistle Seeds',    does: 'Past calls',       hint: 'Earlier calls from this caller or company, from your saved notes' },
    { id: 'corn',       emoji: '🌽', name: 'Cracked Corn',     does: 'Company profile',  hint: 'Public company profile & official website from Wikidata' },
    { id: 'pumpkin',    emoji: '🎃', name: 'Pumpkin Seeds',    does: 'Phone data',       hint: 'Checks the number, its region, and phone numbers published on the company site' },
    { id: 'flax',       emoji: '🌾', name: 'Flax Seed',        does: 'Email data',       hint: 'Emails found on the company site; checks the email domain really takes mail' },
    { id: 'kale',       emoji: '🥬', name: 'Kale Seeds',       does: 'Website data',     hint: 'Finds the real company website and its contact page' },
    { id: 'watermelon', emoji: '🍉', name: 'Watermelon Seeds', does: 'LinkedIn & social', hint: 'LinkedIn and social links the company site points to' },
    { id: 'pepper',     emoji: '🌶️', name: 'Pepper Seeds',     does: 'City departments', hint: 'Verified Long Beach, NY departments & phones for the call topics' },
    { id: 'cucumber',   emoji: '🥒', name: 'Cucumber Seeds',   does: 'Address data',     hint: 'Business address from the company site, checked on a map' },
    { id: 'honeydew',   emoji: '🍈', name: 'Honeydew Seeds',   does: 'Company summary',  hint: 'A short “about” blurb from the company’s own website' }
  ];
  var ENGINES = [
    { id: 'reader',      name: 'Built-in reader (free, no key)', needs: '' },
    { id: 'firecrawl',   name: 'Firecrawl', needs: 'key' },
    { id: 'crawl4ai',    name: 'Crawl4AI', needs: 'key', url: true },
    { id: 'scrapegraph', name: 'ScrapeGraphAI', needs: 'key' }
  ];

  /* ---------------- helpers ---------------- */
  var FREE = /^(gmail|yahoo|hotmail|outlook|aol|icloud|me|msn|live|proton|protonmail|comcast|verizon|optonline)\./i;
  var GENERIC = /^(group|inc|incorporated|llc|l\.l\.c|corp|corporation|company|co|ltd|holdings|development|developments|properties|realty|partners|associates|enterprises|services|solutions|the)$/i;
  var TITLES = /^(dr|mr|mrs|ms|mx|prof|judge|mayor|rev|sgt|capt|hon)\.?$/i;
  var JOB = '(?:Managing\\s+)?(?:Partner|Principal|Director|Manager|President|Vice\\s+President|VP|CEO|COO|CFO|CTO|Founder|Co-?Founder|Owner|Broker|Attorney|Counsel|Associate|Architect|Engineer|Developer|Administrator|Coordinator|Executive|Chairman|Chair|Officer|Agent|Realtor|Consultant|Analyst|Secretary|Treasurer)';
  var SOCIAL = { linkedin: /linkedin\.com\//i, facebook: /facebook\.com\//i, instagram: /instagram\.com\//i, x: /(?:twitter|x)\.com\//i, youtube: /youtube\.com\//i };

  function digits(p) { return String(p || '').replace(/\D/g, ''); }
  function lines(s) { return String(s || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function words(s) { return String(s || '').trim().split(/\s+/).filter(Boolean); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function stem(w) { return w.length > 3 ? w.replace(/(?:ies|es|s)$/, function (m) { return m === 'ies' ? 'y' : (m === 'es' && /(ch|sh|x|ss)es$/.test(w) ? '' : (m === 'es' ? 'e' : '')); }) : w; }
  function stems(s) { return norm(s).split(' ').filter(Boolean).map(stem).join(' '); }
  function emailIn(s) { var m = String(s || '').match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/); return m ? m[0] : ''; }
  function nameParts(full) { var w = words(full).filter(function (x) { return !TITLES.test(x); }); return { first: w[0] || '', last: w.length > 1 ? w[w.length - 1] : '' }; }
  function cleanName(s) {
    return words(s).map(function (w) {
      if (TITLES.test(w)) return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      var l = w.toLowerCase().replace(/'/g, '’');
      l = l.replace(/(^|[-’])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
      return l.replace(/^Mc([a-z])/, function (m, c) { return 'Mc' + c.toUpperCase(); });
    }).join(' ');
  }
  function sameName(a, b) { return norm(String(a).replace(/[’']/g, '')) === norm(String(b).replace(/[’']/g, '')); }
  function slugVariants(company) {
    var w = norm(company).split(' ').filter(Boolean), out = [];
    for (var n = w.length; n >= 1; n--) {
      var joined = w.slice(0, n).join('');
      if (n < w.length && !GENERIC.test(w[n])) continue;
      if (joined.length >= 4 && out.indexOf(joined) < 0) out.push(joined);
    }
    return out;
  }
  function hyphenSlug(company) { return norm(company).replace(/ /g, '-'); }
  function g(q) { return 'https://www.google.com/search?q=' + encodeURIComponent(q); }
  function host(u) { var m = String(u || '').match(/^https?:\/\/(?:www\.)?([^\/?#]+)/i); return m ? m[1].toLowerCase() : ''; }
  function absUrl(href, base) { try { return new URL(href, base).href; } catch (e) { return ''; } }
  function clip(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }
  function pretty10(d) { return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6); }
  function uniq(a) { var seen = {}; return a.filter(function (x) { var k = String(x).toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }); }

  // sg(seed, id, label, value, trust, source, apply, checked, srcUrl)
  function sg(seed, id, label, value, trust, source, apply, checked, srcUrl) {
    return { id: seed + ':' + id, seed: seed, label: label, value: value, trust: trust, source: source || '', srcUrl: srcUrl || '', apply: apply,
      checked: checked === undefined ? trust !== 'guess' && apply.kind !== 'link' : checked };
  }

  /* ---------------- network ---------------- */
  function reqOnce(ctx, url, opts, mode, ms) {
    var f = ctx.fetch || (root.fetch && root.fetch.bind(root)); if (!f) return Promise.reject(new Error('no network'));
    opts = opts || {};
    var ac = typeof AbortController !== 'undefined' ? new AbortController() : null, t = ac && setTimeout(function () { ac.abort(); }, ms || 15000);
    if (ac) opts.signal = ac.signal;
    return f(url, opts).then(function (r) {
      if (t) clearTimeout(t);
      if (!r.ok) { var he = new Error('HTTP ' + r.status); he.status = r.status; throw he; }
      return mode === 'text' ? r.text() : r.json();
    }, function (e) { if (t) clearTimeout(t); throw e; });
  }
  // Free services rate-limit now and then (HTTP 429/503): wait a moment and try once more.
  function req(ctx, url, opts, mode, ms) {
    opts = opts || {};
    return reqOnce(ctx, url, Object.assign({}, opts), mode, ms).catch(function (e) {
      if (e && (e.status === 429 || e.status === 503 || (e.status == null && !/abort/i.test(e.name || '')))) return new Promise(function (ok) { setTimeout(ok, ctx.retryDelay == null ? 1500 : ctx.retryDelay); }).then(function () { return reqOnce(ctx, url, Object.assign({}, opts), mode, ms); });
      throw e;
    });
  }
  function dns(ctx, name, type) {
    return req(ctx, 'https://dns.google/resolve?name=' + encodeURIComponent(name) + '&type=' + type, {}, 'json', 7000).then(function (j) { return j.Answer || []; }, function () { return null; });
  }

  /* ---------------- website reading engines ---------------- */
  var SG_PROMPT = 'Extract this organisation\'s contact details: company_name, description (1-2 sentences), phones (list), emails (list), address (one line), linkedin_url, social_urls (list), people (list of {name, title}).';
  var ENGINE = {
    reader: function (ctx, url) {
      return req(ctx, 'https://r.jina.ai/' + url, { headers: { 'X-Return-Format': 'html' } }, 'text', 25000).then(function (html) { return { html: html }; });
    },
    firecrawl: function (ctx, url) {
      var k = ctx.engine.keys.firecrawl; if (!k) return Promise.reject(new Error('add your Firecrawl API key'));
      return req(ctx, 'https://api.firecrawl.dev/v2/scrape', { method: 'POST', headers: { Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url, formats: ['html'] }) }, 'json', 40000)
        .then(function (j) { var d = j.data || j; return { html: d.html || '', markdown: d.markdown || '' }; });
    },
    crawl4ai: function (ctx, url) {
      var k = ctx.engine.keys.crawl4ai, base = (ctx.engine.c4url || 'https://api.crawl4ai.com').replace(/\/+$/, '');
      var path = /api\.crawl4ai\.com$/i.test(base) ? '/scrape' : '/md';               // cloud vs self-hosted
      if (!k && /api\.crawl4ai\.com$/i.test(base)) return Promise.reject(new Error('add your Crawl4AI API key'));
      return req(ctx, base + path, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, k ? { Authorization: 'Bearer ' + k } : {}), body: JSON.stringify({ url: url }) }, 'json', 40000)
        .then(function (j) { return { markdown: j.markdown || (j.data && j.data.markdown) || '', html: j.html || '' }; });
    },
    scrapegraph: function (ctx, url) {
      var k = ctx.engine.keys.scrapegraph; if (!k) return Promise.reject(new Error('add your ScrapeGraphAI API key'));
      return req(ctx, 'https://v2-api.scrapegraphai.com/api/extract', { method: 'POST', headers: { 'SGAI-APIKEY': k, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url, prompt: SG_PROMPT }) }, 'json', 90000)
        .then(function (j) { return { structured: j.json || (j.data && j.data.json) || null }; });
    }
  };
  function fetchPage(ctx, url) { return (ENGINE[ctx.engine.id] || ENGINE.reader)(ctx, url); }

  /* ---------------- extraction: page -> facts ---------------- */
  function phonesIn(text) {
    var out = [], re = /(?:\+?1[\s.-]?)?\(?([2-9]\d{2})\)?[\s.-]?([2-9]\d{2})[\s.-]?(\d{4})\b/g, m;
    while ((m = re.exec(text))) {
      var before = text.slice(Math.max(0, m.index - 14), m.index);
      out.push({ num: m[1] + '-' + m[2] + '-' + m[3], fax: /fax/i.test(before) });
    }
    return out;
  }
  function analyse(parts) {            // parts: {text, links:[{href,text}], jsonld:[], title, desc, siteName}
    var f = { title: parts.title || '', siteName: parts.siteName || '', description: parts.desc || '', emails: [], phones: [], faxes: [], social: {}, addresses: [], people: [], links: parts.links || [], headings: parts.headings || [] };
    var text = parts.text || '', i;
    (text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) || []).forEach(function (e) { if (!/\.(png|jpg|gif|svg|webp)$/i.test(e) && !/(sentry|example\.|wixpress|domain\.com|yourdomain)/i.test(e)) f.emails.push(e.toLowerCase()); });
    phonesIn(text).forEach(function (p) { (p.fax ? f.faxes : f.phones).push(p.num); });
    f.links.forEach(function (l) {
      var h = l.href || '';
      if (/^mailto:/i.test(h)) f.emails.push(h.replace(/^mailto:/i, '').split('?')[0].toLowerCase());
      else if (/^tel:/i.test(h)) { var d = digits(h).replace(/^1(?=\d{10}$)/, ''); if (d.length === 10) f.phones.push(pretty10(d)); }
      Object.keys(SOCIAL).forEach(function (k) { if (SOCIAL[k].test(h) && !/\/(share|intent|sharer|dialog)/i.test(h)) (f.social[k] = f.social[k] || []).push(h.replace(/[?#].*$/, '').replace(/\/$/, '')); });
    });
    (parts.jsonld || []).forEach(function (o) {
      if (o.telephone) phonesIn(String(o.telephone)).forEach(function (p) { f.phones.push(p.num); });
      if (o.email) f.emails.push(String(o.email).replace(/^mailto:/i, '').toLowerCase());
      [].concat(o.sameAs || []).forEach(function (u) { Object.keys(SOCIAL).forEach(function (k) { if (SOCIAL[k].test(u)) (f.social[k] = f.social[k] || []).push(String(u).replace(/\/$/, '')); }); });
      var a = o.address; if (a && typeof a === 'object') { var s = [a.streetAddress, a.addressLocality, [a.addressRegion, a.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', '); if (s) f.addresses.push(s); }
      if (!f.description && o.description) f.description = String(o.description);
      if (!f.siteName && o.name && /Organization|Business|Company|Agent|Realty|Law|Attorney/i.test([].concat(o['@type'] || []).join(' '))) f.siteName = String(o.name);
      [].concat(o.employee || o.founder || o.member || []).forEach(function (pp) { if (pp && pp.name) f.people.push({ name: pp.name, title: pp.jobTitle || '' }); });
      if (/Person/i.test([].concat(o['@type'] || []).join(' ')) && o.name) f.people.push({ name: o.name, title: o.jobTitle || '' });
    });
    var addrRe = /\b\d{1,6}\s+[A-Z0-9][\w.'&-]*(?:\s+[A-Za-z0-9.'&-]+){0,4}?\s(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Place|Pl|Court|Ct|Highway|Hwy|Parkway|Pkwy|Plaza|Broadway|Turnpike|Tpke)\b\.?(?:,?\s*(?:Suite|Ste|Unit|Floor|Fl|Room|Rm|#)\.?\s*#?[\w-]+)?,?\s*[A-Z][A-Za-z.'-]+(?:\s[A-Z][A-Za-z.'-]+){0,2},?\s*[A-Z]{2}\.?\s+\d{5}(?:-\d{4})?/g;
    (text.replace(/\s+/g, ' ').match(addrRe) || []).forEach(function (a) { f.addresses.push(a.trim()); });
    var L = lines(text), nameRe = '([A-Z][a-z]+(?:\\s[A-Z]\\.?)?(?:\\s[A-Z][a-zA-Z\'’-]+){1,2})';
    L.forEach(function (ln, idx) {
      var m = ln.match(new RegExp('^' + nameRe + '\\s*[,–—|:-]\\s*(' + JOB + '[\\w ,&/-]{0,40})$')) || ln.match(new RegExp('^' + nameRe + '\\s*\\(' + '(' + JOB + '[^)]{0,40})\\)$'));
      if (m) f.people.push({ name: m[1], title: m[2].trim() });
      else if (new RegExp('^' + nameRe + '$').test(ln) && L[idx + 1] && new RegExp('^' + JOB + '[\\w ,&/-]{0,40}$', 'i').test(L[idx + 1])) f.people.push({ name: ln, title: L[idx + 1] });
    });
    f.emails = uniq(f.emails); f.phones = uniq(f.phones); f.faxes = uniq(f.faxes); f.addresses = uniq(f.addresses);
    Object.keys(f.social).forEach(function (k) { f.social[k] = uniq(f.social[k]); });
    var seen = {}; f.people = f.people.filter(function (p) { var k = norm(p.name); if (seen[k] || words(p.name).length < 2) return false; seen[k] = 1; return true; });
    if (!f.description) { var para = L.filter(function (x) { return x.length > 70 && !/@|©|cookie|privacy/i.test(x); })[0]; if (para) f.description = para; }
    return f;
  }
  function parseHtml(html, base) {
    var doc = new DOMParser().parseFromString(html, 'text/html'), jsonld = [];
    Array.prototype.forEach.call(doc.querySelectorAll('script[type="application/ld+json"]'), function (s) {
      try { var j = JSON.parse(s.textContent); (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { jsonld.push(o); if (o['@graph']) walk(o['@graph']); } })(j); } catch (e) {}
    });
    var meta = function (n) { var e = doc.querySelector('meta[name="' + n + '"],meta[property="' + n + '"]'); return e ? (e.getAttribute('content') || '') : ''; };
    var links = Array.prototype.map.call(doc.querySelectorAll('a[href]'), function (a) { return { href: /^(mailto|tel):/i.test(a.getAttribute('href')) ? a.getAttribute('href') : absUrl(a.getAttribute('href'), base), text: (a.textContent || '').trim() }; });
    var headings = Array.prototype.map.call(doc.querySelectorAll('h1,h2'), function (h) { return (h.textContent || '').replace(/\s+/g, ' ').trim(); }).filter(function (t) { return t.length > 3 && t.length < 90; });
    Array.prototype.forEach.call(doc.querySelectorAll('script,style,noscript,svg,nav'), function (e) { e.remove(); });
    Array.prototype.forEach.call(doc.querySelectorAll('p,div,li,h1,h2,h3,h4,h5,h6,br,tr,section,address,td'), function (e) { e.appendChild(doc.createTextNode('\n')); });
    return analyse({ text: (doc.body ? doc.body.textContent : '') || '', links: links, jsonld: jsonld, headings: headings, title: (doc.title || '').trim(), desc: meta('description') || meta('og:description'), siteName: meta('og:site_name') });
  }
  function parseMarkdown(md, base) {
    var links = [], re = /\[([^\]]*)\]\((https?:[^)\s]+|mailto:[^)\s]+|tel:[^)\s]+)\)/g, m;
    while ((m = re.exec(md))) links.push({ href: m[2], text: m[1] });
    var title = (md.match(/^#\s+(.+)$/m) || [])[1] || '';
    return analyse({ text: md.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1'), links: links, headings: (md.match(/^#{1,2}\s+.+$/gm) || []).map(function (h) { return h.replace(/^#+\s+/, ''); }), title: title });
  }
  function fromStructured(j) {
    j = j || {}; var a = function (v) { return [].concat(v || []).filter(Boolean); }, f = analyse({ text: '', links: [], title: j.company_name || '', desc: j.description || '' });
    f.siteName = j.company_name || ''; a(j.phones).forEach(function (p) { var d = digits(p).replace(/^1(?=\d{10}$)/, ''); if (d.length === 10) f.phones.push(pretty10(d)); });
    f.emails = uniq(a(j.emails).map(function (e) { return String(e).toLowerCase(); })); if (j.address) f.addresses = [String(j.address)];
    a([j.linkedin_url].concat(a(j.social_urls))).forEach(function (u) { Object.keys(SOCIAL).forEach(function (k) { if (SOCIAL[k].test(u)) (f.social[k] = f.social[k] || []).push(u); }); });
    f.people = a(j.people).filter(function (p) { return p && p.name; }).map(function (p) { return { name: p.name, title: p.title || '' }; });
    return f;
  }
  function pageFacts(raw, url) { return raw.structured ? fromStructured(raw.structured) : (raw.html ? parseHtml(raw.html, url) : parseMarkdown(raw.markdown || '', url)); }
  function merge(a, b) {
    ['emails', 'phones', 'faxes', 'addresses', 'headings'].forEach(function (k) { a[k] = uniq(a[k].concat(b[k] || [])); });
    Object.keys(b.social || {}).forEach(function (k) { a.social[k] = uniq((a.social[k] || []).concat(b.social[k])); });
    var seen = {}; a.people = a.people.concat(b.people || []).filter(function (p) { var k = norm(p.name); if (seen[k]) return false; seen[k] = 1; return true; });
    a.links = a.links.concat(b.links || []); a.description = a.description || b.description; a.siteName = a.siteName || b.siteName;
    return a;
  }

  /* ---------------- finding & crawling the company site ---------------- */
  function domains(ctx) {
    if (ctx._dom) return ctx._dom;
    var s = ctx.state, known = [], cand = [];
    var w = String(ctx.website || '').trim().replace(/^(?!https?:\/\/)/i, 'https://');
    if (/^https?:\/\/[a-z0-9][a-z0-9.-]*\.[a-z]{2,}/i.test(w)) known.push(w.replace(/^(https?:\/\/[^\/?#]+).*$/i, '$1').toLowerCase());
    var e = emailIn(s.alt); if (e && !FREE.test(e.split('@')[1])) known.push('https://' + e.split('@')[1].toLowerCase());
    (s.refs || []).forEach(function (r) { var u = String(r.url || ''); if (/^https?:\/\//i.test(u) && !/(linkedin|facebook|google|wikipedia|instagram|twitter|x\.com|youtube|longbeachny\.gov)/i.test(u)) known.push(u.replace(/^(https?:\/\/[^\/?#]+).*$/i, '$1')); });
    known = uniq(known);
    if (!known.length) slugVariants(s.company || '').forEach(function (v) { ['com', 'co', 'net', 'org'].forEach(function (t) { cand.push(v + '.' + t); }); });
    cand = cand.slice(0, 12);
    ctx._dom = Promise.all(cand.map(function (d) {
      return Promise.all([dns(ctx, d, 'A'), dns(ctx, d, 'MX')]).then(function (r) { return { domain: d, web: !!(r[0] && r[0].length), mail: !!(r[1] && r[1].length), net: r[0] !== null }; });
    })).then(function (rows) { return { known: known, guesses: rows.filter(function (r) { return r.web || r.mail; }), offline: rows.length > 0 && rows.every(function (r) { return !r.net; }) }; });
    return ctx._dom;
  }
  function site(ctx) {
    if (ctx._site) return ctx._site;
    ctx._site = domains(ctx).then(function (d) {
      var web = d.guesses.filter(function (x) { return x.web; })[0];
      var base = d.known[0] || (web ? 'https://' + web.domain : '');
      if (!base) return { ok: false, reason: d.offline ? 'offline' : (ctx.state.company ? 'no website found for “' + ctx.state.company + '”' : 'no company or website yet'), mailDomain: (d.guesses.filter(function (x) { return x.mail; })[0] || {}).domain };
      var out = { ok: false, base: base, fromUser: !!d.known.length, pages: [base], mailDomain: ((d.guesses.filter(function (x) { return x.mail; })[0]) || {}).domain || host(base) };
      return fetchPage(ctx, base).then(function (raw) {
        var f = pageFacts(raw, base); out.ok = true; out.f = f;
        var rank = function (u) { var t = u.replace(base, ''); return /(team|people|leadership|staff|attorneys|our-people|professionals)/i.test(t) ? 0 : /contact/i.test(t) ? 1 : /about/i.test(t) ? 2 : 3; };
        var subs = uniq(f.links.map(function (l) { return l.href; }).filter(function (h) { return /^https?:/i.test(h) && host(h) === host(base) && /(contact|about|team|people|leadership|staff|attorneys|professionals|our-)/i.test(h.replace(base, '')); }))
          .sort(function (a, b) { return rank(a) - rank(b); }).slice(0, 3);
        out.contactUrl = (subs.filter(function (u) { return /contact/i.test(u); })[0]) || '';
        return Promise.all(subs.map(function (u) { return fetchPage(ctx, u).then(function (r) { out.pages.push(u); return pageFacts(r, u); }, function () { return null; }); })).then(function (more) {
          more.forEach(function (m) { if (m) merge(f, m); });
          return out;
        });
      }, function (e) { out.reason = 'couldn’t read ' + host(base) + ' (' + e.message + ')'; return out; });
    });
    return ctx._site;
  }
  function needSite(s, what) { return { suggestions: [], message: 'Couldn’t read the company website — ' + s.reason + '. Nothing to suggest for ' + what + '.' }; }

  /* ---------------- area codes ---------------- */
  var AREA = { 212: 'Manhattan, New York City, NY', 646: 'Manhattan, New York City, NY', 332: 'Manhattan, New York City, NY', 917: 'New York City, NY (mobile overlay)',
    718: 'Bronx / Brooklyn / Queens / Staten Island, NY', 347: 'Bronx / Brooklyn / Queens / Staten Island, NY', 929: 'Bronx / Brooklyn / Queens / Staten Island, NY',
    516: 'Nassau County (Long Island), NY', 363: 'Nassau County (Long Island), NY', 631: 'Suffolk County (Long Island), NY', 934: 'Suffolk County (Long Island), NY',
    914: 'Westchester County, NY', 845: 'Hudson Valley, NY', 518: 'Albany / Capital Region, NY', 838: 'Albany / Capital Region, NY', 585: 'Rochester, NY', 716: 'Buffalo, NY', 315: 'Syracuse / Central NY', 607: 'Binghamton / Southern Tier, NY',
    201: 'Northern New Jersey', 973: 'Northern New Jersey', 908: 'Central New Jersey', 732: 'Central New Jersey', 609: 'Central/South New Jersey', 856: 'Southwest New Jersey',
    203: 'Connecticut (coastal)', 860: 'Connecticut', 215: 'Philadelphia, PA', 202: 'Washington, DC', 617: 'Boston, MA', 305: 'Miami, FL', 312: 'Chicago, IL', 310: 'Los Angeles, CA', 415: 'San Francisco, CA' };
  var TOLL = { 800: 1, 833: 1, 844: 1, 855: 1, 866: 1, 877: 1, 888: 1 };

  /* ---------------- seeds ---------------- */
  var run = {};

  // 🌻 Name data
  run.sunflower = function (ctx) {
    var s = ctx.state, cur = s.caller || '', em = emailIn(s.alt) || emailIn(s.reason), out = [];
    var tidy = cur && cleanName(cur);
    if (cur && tidy !== cur && !(sameName(tidy, cur) && /[’']/.test(cur) && !/[’']/.test(tidy))) out.push(sg('sunflower', 'tidy', 'Tidy the name', tidy, 'derived', 'capitalisation', { kind: 'field', field: 'caller', value: tidy, mode: 'replace' }));
    var np = nameParts(cur), first = np.first.toLowerCase();
    if (em) { var m = em.split('@')[0].toLowerCase().match(/^([a-z]{2,})[._-]([a-z]{2,})$/);
      if (m && (!cur || (!np.last && m[1] === first))) { var full = cleanName(m[1] + ' ' + m[2]); out.push(sg('sunflower', 'email', cur ? 'Complete the name from the email' : 'Name from the email', full, 'guess', 'email address ' + em, { kind: 'field', field: 'caller', value: full, mode: 'replace' })); } }
    (ctx.history || []).forEach(function (h) { var n = h.data.caller || '';
      if (n && words(n).length > words(cur).length && (!cur || norm(n).indexOf(norm(np.first)) === 0) && !out.some(function (x) { return x.value === n; }))
        out.push(sg('sunflower', 'hist' + h.at, 'Full name from an earlier call', n, 'verified', 'your saved note, ' + new Date(h.at).toLocaleDateString(), { kind: 'field', field: 'caller', value: n, mode: 'replace' })); });
    return site(ctx).then(function (st) {
      if (st.ok && cur) {
        var hit = st.f.people.filter(function (p) { var pp = nameParts(p.name); return pp.first.toLowerCase() === first && (!np.last || pp.last.toLowerCase() === np.last.toLowerCase()); })[0];
        if (hit) {
          var nm = cleanName(hit.name);
          if (!sameName(nm, cur)) out.push(sg('sunflower', 'site', 'Full name found on the company website', nm, 'verified', 'team page on ' + host(st.base), { kind: 'field', field: 'caller', value: nm, mode: 'replace' }, true, st.base));
          if (hit.title) out.push(sg('sunflower', 'title', 'Job title', hit.title, 'verified', 'team page on ' + host(st.base), { kind: 'extra', text: nm + ' — ' + hit.title + '.' }, true, st.base));
        }
      }
      return { suggestions: out, message: out.length ? '' : (cur ? 'Name already looks complete' + (st.ok ? ' and isn’t listed on ' + host(st.base) + '’s pages.' : '.') : 'No name to work with yet.') };
    });
  };

  // 🌱 Past calls
  run.thistle = function (ctx) {
    var s = ctx.state, h = ctx.history || [], out = [];
    if (!h.length) return { suggestions: [], message: 'No earlier calls from this caller or company on this device.' };
    var last = h[0], topics = [];
    h.forEach(function (n) { lines(n.data.topics).forEach(function (t) { if (topics.indexOf(t) < 0) topics.push(t); }); });
    out.push(sg('thistle', 'sum', h.length + ' earlier call' + (h.length > 1 ? 's' : ''), 'Last: ' + new Date(last.at).toLocaleDateString() + (topics.length ? ' · about ' + topics.slice(0, 4).join(', ') : ''), 'verified', 'your saved notes',
      { kind: 'extra', text: 'Previous calls: ' + h.length + ' (last ' + new Date(last.at).toLocaleDateString() + (topics.length ? ', re: ' + topics.slice(0, 4).join(', ') : '') + ').' }));
    ['company', 'phone', 'alt'].forEach(function (f) { var v = last.data[f]; if (v && !s[f]) out.push(sg('thistle', f, 'Fill ' + (f === 'alt' ? 'email / cell' : f) + ' from last call', v, 'verified', 'your saved notes', { kind: 'field', field: f, value: v, mode: 'ifEmpty' })); });
    (last.data.refs || []).filter(function (r) { return r.title || r.url; }).slice(0, 4).forEach(function (r, i) {
      if (!(s.refs || []).some(function (x) { return (r.url && x.url === r.url) || (x.title && x.title === r.title); })) out.push(sg('thistle', 'r' + i, 'Reference from last call', r.title, 'verified', 'your saved notes', { kind: 'ref', title: r.title, detail: r.detail, url: r.url }, false));
    });
    return { suggestions: out, message: '' };
  };

  // 🌽 Company profile (Wikidata)
  run.corn = function (ctx) {
    var q = ctx.state.company; if (!q) return Promise.resolve({ suggestions: [], message: 'Add a company first.' });
    var api = 'https://www.wikidata.org/w/api.php?format=json&origin=*&';
    return req(ctx, api + 'action=wbsearchentities&language=en&limit=3&search=' + encodeURIComponent(q), {}, 'json', 9000).then(function (j) {
      var key = norm(q).split(' ').filter(function (w) { return !GENERIC.test(w); }).join(' ');
      var hit = (j.search || []).filter(function (r) { var l = norm(r.label); return l === norm(q) || (key && l === key); })[0];
      if (!hit) return { suggestions: [], message: 'No public profile found for “' + q + '” — small or private companies often have none.' };
      return req(ctx, api + 'action=wbgetentities&props=claims|sitelinks&ids=' + hit.id, {}, 'json', 9000).then(function (e) {
        var ent = (e.entities || {})[hit.id] || {}, cl = ent.claims || {};
        var site = (((cl.P856 || [])[0] || {}).mainsnak || {}).datavalue; site = site && site.value;
        var hq = (((cl.P159 || [])[0] || {}).mainsnak || {}).datavalue; hq = hq && hq.value && hq.value.id;
        var wiki = ent.sitelinks && ent.sitelinks.enwiki && 'https://en.wikipedia.org/wiki/' + encodeURIComponent(ent.sitelinks.enwiki.title.replace(/ /g, '_'));
        var done = function (hqLabel) {
          var det = [hit.description, hqLabel && 'HQ: ' + hqLabel].filter(Boolean).join(' · ');
          return { suggestions: [sg('corn', hit.id, hit.label + ' — public profile', det || 'Wikidata entry', 'verified', 'Wikidata ' + hit.id + ' (matched by name — confirm it’s the same company)',
            { kind: 'ref', title: hit.label, detail: det, url: site || wiki || 'https://www.wikidata.org/wiki/' + hit.id }, true, 'https://www.wikidata.org/wiki/' + hit.id)], message: '' };
        };
        if (!hq) return done('');
        return req(ctx, api + 'action=wbgetentities&props=labels&languages=en&ids=' + hq, {}, 'json', 9000).then(function (h) { return done(((((h.entities || {})[hq] || {}).labels || {}).en || {}).value); }, function () { return done(''); });
      });
    }).catch(function (e) { return { suggestions: [], message: e && e.status === 429 ? 'Wikidata is busy right now (too many requests). Try again in a minute.' : 'Couldn’t reach Wikidata (offline?).' }; });
  };

  // 🎃 Phone data
  run.pumpkin = function (ctx) {
    var raw = ctx.state.phone || '', out = [];
    var ext = (raw.match(/(?:x|ext\.?)\s*(\d+)\s*$/i) || [])[1] || '';
    var d = digits(raw.replace(/(?:x|ext\.?)\s*\d+\s*$/i, '')).replace(/^1(?=\d{10}$)/, '');
    if (!d) return Promise.resolve({ suggestions: [], message: 'No phone number yet.' });
    if (d.length !== 10) return Promise.resolve({ suggestions: [sg('pumpkin', 'len', 'Check the number', 'This has ' + d.length + ' digits; a US/Canada number needs 10.', 'derived', 'format check', { kind: 'extra', text: '⚠ Phone number "' + raw + '" does not look complete (' + d.length + ' digits). Confirm with the caller.' }, true)], message: '' });
    var ac = d.slice(0, 3), ex = d.slice(3, 6), ln = d.slice(6), pretty = pretty10(d) + (ext ? ' x' + ext : ''), warn = [];
    if (/^[01]/.test(ac)) warn.push('area code ' + ac + ' is not valid'); if (/^[01]/.test(ex)) warn.push('exchange ' + ex + ' is not valid');
    if (/^\d11$/.test(ac) || /^\d11$/.test(ex)) warn.push('N11 service code'); if (ex === '555' && /^01\d\d$/.test(ln)) warn.push('555-01xx numbers are reserved for fiction, so this cannot be a real line');
    var where = TOLL[ac] ? 'Toll-free number' : AREA[ac] ? 'Area code ' + ac + ' — ' + AREA[ac] : 'Area code ' + ac + ' (US/Canada)';
    if (pretty !== raw.trim()) out.push(sg('pumpkin', 'fmt', 'Standard format', pretty, 'derived', 'format', { kind: 'field', field: 'phone', value: pretty, mode: 'replace' }));
    out.push(sg('pumpkin', 'where', warn.length ? 'Phone check: ' + warn.length + ' problem' + (warn.length > 1 ? 's' : '') : 'Phone check', where + (warn.length ? ' · ⚠ ' + warn.join('; ') : ' · valid US format'), 'derived',
      'North American numbering rules (who owns the line is not checked)', { kind: 'extra', text: 'Phone: ' + where + (warn.length ? ' — ⚠ ' + warn.join('; ') : '') + '.' }, warn.length > 0 || !!AREA[ac]));
    out.push(sg('pumpkin', 'rev', 'Who has called from this number?', 'Opens a web search', 'derived', 'web search', { kind: 'link', url: g('"' + ac + '-' + ex + '-' + ln + '" OR "(' + ac + ') ' + ex + '-' + ln + '"') }));
    return site(ctx).then(function (st) {
      if (st.ok) {
        var mine = st.f.phones.concat(st.f.faxes).map(digits);
        if (mine.indexOf(d) > -1) out.push(sg('pumpkin', 'match', 'Matches the company’s published number', pretty10(d) + ' is listed on ' + host(st.base), 'verified', 'company website', { kind: 'extra', text: 'Caller’s number matches a number published on ' + host(st.base) + '.' }, true, st.base));
        st.f.phones.filter(function (p) { return digits(p) !== d; }).slice(0, 3).forEach(function (p, i) {
          out.push(sg('pumpkin', 'site' + i, 'Company phone published on its website', p, 'verified', 'company website ' + host(st.base), { kind: 'ref', title: (ctx.state.company || host(st.base)) + ' — phone', detail: p, url: st.base }, false, st.base));
        });
      }
      return { suggestions: out, message: st.ok ? '' : 'Number checked. Company site not read: ' + st.reason + '.' };
    });
  };

  // 🌾 Email data
  run.flax = function (ctx) {
    var s = ctx.state, em = emailIn(s.alt), out = [], np = nameParts(s.caller), f1 = np.first.toLowerCase().replace(/[^a-z]/g, ''), l1 = np.last.toLowerCase().replace(/[^a-z]/g, '');
    var mx = em ? dns(ctx, em.split('@')[1], 'MX') : Promise.resolve(undefined);
    return Promise.all([mx, site(ctx)]).then(function (r) {
      var a = r[0], st = r[1];
      var offline = em && a === null;
      if (em && !offline) out.push(sg('flax', 'mx', a.length ? 'Email domain checked' : 'Email domain problem', a.length ? em.split('@')[1] + ' accepts email ✓ (the mailbox itself can’t be checked)' : em.split('@')[1] + ' has no mail servers; the address may be mistyped', 'verified', 'public DNS (dns.google)',
        { kind: 'extra', text: a.length ? 'Email ' + em + ': domain accepts mail.' : '⚠ Email ' + em + ': domain has no mail servers. Confirm the spelling.' }, !a.length));
      if (st.ok) {
        var mine = f1 ? st.f.emails.filter(function (e) { var lp = e.split('@')[0]; return lp.indexOf(f1) > -1 || (l1 && lp.indexOf(l1) > -1 && lp.charAt(0) === f1.charAt(0)); }) : [];
        mine.slice(0, 2).forEach(function (e, i) { if (!em || em.toLowerCase().indexOf(e) < 0) out.push(sg('flax', 'p' + i, 'Caller’s email found on the company website', e, 'verified', 'company website ' + host(st.base), { kind: 'field', field: 'alt', value: e, mode: 'append' }, true, st.base)); });
        var general = st.f.emails.filter(function (e) { return mine.indexOf(e) < 0 && /^(info|contact|hello|office|admin|mail|inquir|law|legal|general)/.test(e.split('@')[0]); }).slice(0, 2);
        general.forEach(function (e, i) { out.push(sg('flax', 'g' + i, 'Company email (general)', e, 'verified', 'company website ' + host(st.base), { kind: 'ref', title: (s.company || host(st.base)) + ' — email', detail: e, url: 'mailto:' + e }, false, st.base)); });
        var pat = st.f.emails.map(function (e) { return e.split('@')[0]; }).filter(function (lp) { return /^[a-z]+[._][a-z]+$|^[a-z]\.?[a-z]{3,}$/.test(lp) && !/^(info|contact|hello|office|admin|sales|mail|support)$/.test(lp); })[0];
        if (!mine.length && !em && f1 && l1 && pat) {
          var guess = /[._]/.test(pat) ? f1 + pat.match(/[._]/)[0] + l1 : f1.charAt(0) + l1;
          out.push(sg('flax', 'pat', 'Likely email (pattern used on their site)', guess + '@' + (st.mailDomain || host(st.base)), 'guess', 'their site shows “' + pat + '@…”; this address is inferred — confirm with the caller', { kind: 'field', field: 'alt', value: guess + '@' + (st.mailDomain || host(st.base)), mode: 'append' }, false, st.base));
        }
      } else if (!em && f1 && l1 && st.mailDomain) {
        out.push(sg('flax', 'dom', 'Possible email', f1 + '.' + l1 + '@' + st.mailDomain, 'guess', st.mailDomain + ' receives email; the exact address is a guess. Confirm with the caller', { kind: 'field', field: 'alt', value: f1 + '.' + l1 + '@' + st.mailDomain, mode: 'append' }, false));
      }
      return { suggestions: out, message: offline ? 'Couldn’t check the email domain (DNS service unreachable — offline?).' : (out.length ? '' : (!em && !st.ok ? 'No email yet, and the company site couldn’t be read (' + st.reason + '). Ask the caller for it.' : (em ? '' : 'Nothing found. Ask the caller for their email.'))) };
    });
  };

  // 🥬 Website data
  run.kale = function (ctx) {
    var s = ctx.state;
    if (!s.company && !emailIn(s.alt) && !(s.refs || []).length) return Promise.resolve({ suggestions: [], message: 'Add a company or an email first.' });
    return site(ctx).then(function (st) {
      if (!st.ok && !st.base) return { suggestions: [], message: 'No company website found: ' + st.reason + '.', };
      var out = [], title = st.ok ? (st.f.siteName || st.f.title) : '', det = st.ok ? clip(st.f.description || title, 170) : '';
      out.push(sg('kale', 'site', (st.fromUser ? 'Company website' : 'Website that exists'), host(st.base) + (title ? ' — ' + clip(title, 60) : ''), st.fromUser && st.ok ? 'verified' : 'guess',
        st.ok ? 'read ' + st.pages.length + ' page' + (st.pages.length > 1 ? 's' : '') + ' of ' + host(st.base) + (st.fromUser ? '' : ' — found by name; confirm it’s the right company') : 'domain exists by name; couldn’t read it (' + st.reason + ')',
        { kind: 'ref', title: (s.company || host(st.base)) + ' — website', detail: det, url: st.base }, st.fromUser ? !(s.refs || []).some(function (r) { return host(r.url) === host(st.base); }) : false, st.base));
      if (st.contactUrl) out.push(sg('kale', 'contact', 'Contact page', st.contactUrl, 'verified', 'linked from ' + host(st.base), { kind: 'ref', title: (s.company || host(st.base)) + ' — contact page', detail: '', url: st.contactUrl }, false, st.contactUrl));
      out.push(sg('kale', 'search', 'Search the web for ' + (s.company || host(st.base)), 'Opens a web search', 'derived', 'web search', { kind: 'link', url: g(s.company || host(st.base)) }));
      return { suggestions: out, message: '' };
    });
  };

  // 🍉 LinkedIn & social
  run.watermelon = function (ctx) {
    var s = ctx.state, out = [];
    return site(ctx).then(function (st) {
      var soc = st.ok ? st.f.social : {}, np = nameParts(s.caller);
      var co = (soc.linkedin || []).filter(function (u) { return /\/company\//i.test(u); })[0];
      if (co) out.push(sg('watermelon', 'co', 'LinkedIn company page', co, 'verified', 'linked from ' + host(st.base), { kind: 'ref', title: (s.company || host(st.base)) + ' — LinkedIn', detail: '', url: co }, true, co));
      else if (s.company) out.push(sg('watermelon', 'coguess', 'LinkedIn company page (guess)', 'linkedin.com/company/' + hyphenSlug(s.company), 'guess', 'built from the company name; LinkedIn can’t be checked from here, open it to confirm',
        { kind: 'ref', title: s.company + ' — LinkedIn', detail: '', url: 'https://www.linkedin.com/company/' + hyphenSlug(s.company) }));
      if (np.first && st.ok) {
        var who = (soc.linkedin || []).filter(function (u) { return /\/in\//i.test(u) && (u.toLowerCase().indexOf(np.first.toLowerCase()) > -1 || (np.last && u.toLowerCase().indexOf(np.last.toLowerCase()) > -1)); })[0];
        if (who) out.push(sg('watermelon', 'me', 'LinkedIn profile for ' + cleanName(s.caller), who, 'verified', 'linked from ' + host(st.base), { kind: 'ref', title: cleanName(s.caller) + ' — LinkedIn', detail: '', url: who }, true, who));
      }
      [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['x', 'X / Twitter'], ['youtube', 'YouTube']].forEach(function (k) { var u = (soc[k[0]] || [])[0];
        if (u) out.push(sg('watermelon', k[0], k[1] + ' page', u, 'verified', 'linked from ' + host(st.base), { kind: 'ref', title: (s.company || host(st.base)) + ' — ' + k[1], detail: '', url: u }, false, u)); });
      if (s.company) out.push(sg('watermelon', 'cosearch', 'Search LinkedIn companies', s.company, 'derived', 'LinkedIn search', { kind: 'link', url: 'https://www.linkedin.com/search/results/companies/?keywords=' + encodeURIComponent(s.company) }));
      if (s.caller) out.push(sg('watermelon', 'people', 'Search LinkedIn for ' + cleanName(s.caller), [cleanName(s.caller), s.company].filter(Boolean).join(' · '), 'derived', 'LinkedIn search', { kind: 'link', url: 'https://www.linkedin.com/search/results/people/?keywords=' + encodeURIComponent([cleanName(s.caller), s.company].filter(Boolean).join(' ')) }));
      return { suggestions: out, message: out.length ? (st.ok ? '' : 'Company site not read (' + st.reason + '), so only guesses and search links.') : 'Add a caller or company first.' };
    });
  };

  // 🌶️ City departments (verified Long Beach, NY directory)
  run.pepper = function (ctx) {
    var s = ctx.state, city = (ctx.city || '').trim(), out = [];
    var text = stems([s.topics, s.reason, s.action, s.extra].join(' ')), tl = lines(s.topics);
    var isLB = /long\s*beach/i.test(city) && !/\b(ca|california)\b/i.test(city) || !city;
    if (isLB && root.LB_DIRECTORY) {
      var D = root.LB_DIRECTORY;
      var scored = D.depts.map(function (d) {
        var sc = 0; d.keys.forEach(function (k) { var nk = stems(k); if (nk && (' ' + text + ' ').indexOf(' ' + nk + ' ') > -1) sc += nk.indexOf(' ') > -1 ? 3 : 2; });
        var nm = stems(d.name.split(/ [—(]/)[0]); if (nm && text.indexOf(nm) > -1) sc += 4; return { d: d, sc: sc };
      }).filter(function (x) { return x.sc > 0; }).sort(function (a, b) { return b.sc - a.sc; }).slice(0, 5);
      scored.forEach(function (x, i) { var d = x.d, det = [d.phone, d.room, d.fax && 'fax ' + d.fax, d.email].filter(Boolean).join(' · ');
        out.push(sg('pepper', d.id, 'City of Long Beach — ' + d.name, det, 'verified', D.source + ', checked ' + D.checked, { kind: 'ref', title: 'City of Long Beach — ' + d.name, detail: det, url: d.url }, i < 3, d.url)); });
      out.push(sg('pepper', 'hall', D.hall.name, D.hall.phone + ' · ' + D.hall.address, 'verified', D.source + ', checked ' + D.checked, { kind: 'ref', title: D.hall.name, detail: D.hall.phone + ' · ' + D.hall.address, url: D.hall.url }, !scored.length, D.hall.url));
      return Promise.resolve({ suggestions: out, message: scored.length ? '' : 'No department matched the topics. City Hall main line offered.' });
    }
    (tl.length ? tl : [s.reason || '']).filter(Boolean).slice(0, 4).forEach(function (t, i) { out.push(sg('pepper', 'q' + i, (city || 'Local') + ' — ' + t, 'Opens a search for the right office and phone', 'derived', 'web search', { kind: 'link', url: g((city ? city + ' ' : '') + t + ' office phone number') })); });
    return Promise.resolve({ suggestions: out, message: city ? 'The verified directory covers Long Beach, NY only; search links provided for ' + city + '.' : '' });
  };

  // 🥒 Address data
  run.cucumber = function (ctx) {
    var s = ctx.state;
    return site(ctx).then(function (st) {
      var addr = st.ok && st.f.addresses[0];
      if (!addr) {
        if (!s.company) return { suggestions: [], message: 'Add a company first.' };
        return { suggestions: [sg('cucumber', 'search', 'Find ' + s.company + '’s address', 'Opens a map search', 'derived', 'map search', { kind: 'link', url: 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(s.company + (ctx.city ? ' ' + ctx.city : '')) })], message: st.ok ? 'No street address is published on ' + host(st.base) + '.' : 'Company site not read: ' + st.reason + '.' };
      }
      return req(ctx, 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' + encodeURIComponent(addr), {}, 'json', 9000).then(function (j) {
        var hit = j[0], url = hit ? 'https://www.openstreetmap.org/?mlat=' + hit.lat + '&mlon=' + hit.lon + '#map=18/' + hit.lat + '/' + hit.lon : 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(addr);
        return { suggestions: [
          sg('cucumber', 'addr', 'Business address', addr, 'verified', 'company website ' + host(st.base) + (hit ? ' · found on the map (OpenStreetMap)' : ' · couldn’t place it on the map; check the spelling'),
            { kind: 'ref', title: (s.company || host(st.base)) + ' — address', detail: addr, url: url }, true, st.base)], message: '' };
      }, function () { return { suggestions: [sg('cucumber', 'addr', 'Business address', addr, 'verified', 'company website ' + host(st.base) + ' · map check unavailable', { kind: 'ref', title: (s.company || host(st.base)) + ' — address', detail: addr, url: st.base }, true, st.base)], message: '' }; });
    });
  };

  // 🍈 Company summary
  run.honeydew = function (ctx) {
    var s = ctx.state;
    return site(ctx).then(function (st) {
      if (!st.ok) return needSite(st, 'a summary');
      var d = clip(st.f.description, 320); if (!d) return { suggestions: [], message: host(st.base) + ' doesn’t publish an “about” description.' };
      var name = st.f.siteName || s.company || host(st.base), out = [sg('honeydew', 'about', 'About ' + name, d, 'verified', 'company website ' + host(st.base), { kind: 'extra', text: 'About ' + name + ': ' + d }, true, st.base)];
      var heads = uniq(st.f.headings.filter(function (h) { return !/^(home|menu|contact|about|welcome)/i.test(h) && h.length > 8; })).slice(0, 4);
      if (heads.length) out.push(sg('honeydew', 'topics', 'What the site highlights', heads.join(' · '), 'verified', 'headings on ' + host(st.base), { kind: 'extra', text: 'Site highlights: ' + heads.join('; ') + '.' }, false, st.base));
      return { suggestions: out, message: '' };
    });
  };

  /* ---------------- runner ---------------- */
  function previous(state, saved) {
    var d = digits(state.phone).replace(/^1(?=\d{10}$)/, ''), c = norm(state.caller), co = norm(state.company);
    return (saved || []).filter(function (n) { var x = n.data || {};
      return (d && digits(x.phone).replace(/^1(?=\d{10}$)/, '') === d) || (c && norm(x.caller) === c) || (co && c && norm(x.company) === co && norm(x.caller).split(' ')[0] === c.split(' ')[0]); });
  }
  function scatter(ids, ctx, onEach) {
    ctx.history = previous(ctx.state, ctx.saved);
    ctx.engine = ctx.engine || { id: 'reader', keys: {} }; ctx.engine.keys = ctx.engine.keys || {};
    return Promise.all(ids.map(function (id) {
      var meta = SEEDS.filter(function (x) { return x.id === id; })[0];
      return Promise.resolve().then(function () { return run[id](ctx); }).catch(function (e) { return { suggestions: [], message: 'Something went wrong: ' + e.message }; })
        .then(function (r) { r.seed = meta; if (onEach) onEach(r); return r; });
    }));
  }

  // Apply one suggestion's `apply` instruction to a note state. Returns 1 if the note changed, else 0 (already there / not applicable).
  function applySuggestion(state, a) {
    var cur;
    if (!a) return 0;
    if (a.kind === 'field') {
      cur = state[a.field] || '';
      if (a.mode === 'ifEmpty' && cur) return 0;
      if (a.mode === 'append') { if (cur.toLowerCase().indexOf(String(a.value).toLowerCase()) > -1) return 0; state[a.field] = cur ? cur + ' · ' + a.value : a.value; return 1; }
      if (cur === a.value) return 0; state[a.field] = a.value; return 1;
    }
    if (a.kind === 'ref') {
      state.refs = state.refs || [];
      if (state.refs.some(function (r) { return (a.url && r.url === a.url) || (a.title && r.title === a.title); })) return 0;
      state.refs.push({ title: a.title, detail: a.detail || '', url: a.url || '' }); return 1;
    }
    if (a.kind === 'extra') {
      if (!a.text) return 0;
      if ((state.extra || '').indexOf(a.text) > -1) return 0;
      state.extra = (state.extra ? state.extra + '\n' : '') + a.text; return 1;
    }
    return 0;
  }

  // A real call about a real public organisation, so every seed has something true to find.
  var DEMO = { caller: 'sam ortiz', company: 'City of Long Beach', phone: '516-431-1000', alt: 'sortiz@longbeachny.gov', reason: 'Sam called about opening a new shop on West Park Avenue.', topics: 'Building permits\nMercantile license', forWho: 'Law Staff' };

  // Probes each service Bird Seed depends on, right now, from this browser. -> [{ id, name, ok, ms, detail }]
  function selfCheck(ctx) {
    ctx = ctx || {}; ctx.engine = ctx.engine || { id: 'reader', keys: {} }; ctx.engine.keys = ctx.engine.keys || {};
    var probes = [
      ['dns', 'Domain lookups (DNS)', function () { return dns(ctx, 'example.com', 'A').then(function (a) { if (a === null) throw new Error('unreachable'); return a.length ? 'resolves example.com' : 'reachable'; }); }],
      ['reader', 'Website reader (' + ((ENGINES.filter(function (x) { return x.id === ctx.engine.id; })[0] || ENGINES[0]).name.replace(' (free, no key)', '')) + ')', function () { return fetchPage(ctx, 'https://example.com').then(function (raw) { var f = pageFacts(raw, 'https://example.com'); if (!(f.title || f.headings.length || f.description || (raw.structured))) throw new Error('read the page but found nothing'); return 'read example.com: “' + clip(f.title || f.headings[0] || 'ok', 40) + '”'; }); }],
      ['wikidata', 'Company profiles (Wikidata)', function () { return req(ctx, 'https://www.wikidata.org/w/api.php?format=json&origin=*&action=wbsearchentities&language=en&limit=1&search=Wikipedia', {}, 'json', 9000).then(function (j) { if (!(j.search || []).length) throw new Error('no answer'); return 'found “' + j.search[0].label + '”'; }); }],
      ['osm', 'Address check (OpenStreetMap)', function () { return req(ctx, 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' + encodeURIComponent('1 West Chester Street Long Beach NY 11561'), {}, 'json', 9000).then(function (j) { if (!j.length) throw new Error('no answer'); return 'placed an address on the map'; }); }]
    ];
    return Promise.all(probes.map(function (p) {
      var t0 = Date.now();
      return Promise.resolve().then(p[2]).then(function (d) { return { id: p[0], name: p[1], ok: true, ms: Date.now() - t0, detail: d }; },
        function (e) { return { id: p[0], name: p[1], ok: false, ms: Date.now() - t0, detail: e && e.status === 429 ? 'busy (rate limited), try again in a minute' : (e && e.message) || 'failed' }; });
    }));
  }

  root.BirdSeed = { DEMO: DEMO, selfCheck: selfCheck, apply: applySuggestion, SEEDS: SEEDS, ENGINES: ENGINES, scatter: scatter, _t: { cleanName: cleanName, analyse: analyse, parseHtml: parseHtml, parseMarkdown: parseMarkdown, fromStructured: fromStructured, ENGINE: ENGINE, slugVariants: slugVariants, previous: previous } };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BirdSeed;
})(typeof window !== 'undefined' ? window : globalThis);
