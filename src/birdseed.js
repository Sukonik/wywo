/*
 * 🐦 Bird Seed — suggests details to add to a call note.
 *
 * Each "seed" inspects the current note and returns suggestions. Nothing is
 * applied automatically: the UI lets the user review & tick what to add.
 * No API keys. Network seeds use free, CORS-enabled services (Google public
 * DNS-over-HTTPS and Wikidata) and fail gracefully when offline.
 *
 * Suggestion: { id, seed, label, value, trust, source, checked, apply }
 *   trust: 'verified' (read from an official/public source)
 *          'derived'  (computed from what you typed)
 *          'guess'    (plausible but unconfirmed — never pre-ticked)
 *   apply: { kind:'field', field, value, mode:'replace'|'append'|'ifEmpty' }
 *        | { kind:'ref', title, detail, url }
 *        | { kind:'extra', text }
 *        | { kind:'link', url }            (opens a search, not added to the note)
 */
(function (root) {
  'use strict';

  var SEEDS = [
    { id: 'sunflower', emoji: '🌻', name: 'Sunflower', does: 'Full name', hint: 'Tidy the name; complete it from an email or past call' },
    { id: 'millet',    emoji: '🌾', name: 'Millet',    does: 'Phone check', hint: 'Format, area-code region, flags invalid or fake numbers' },
    { id: 'nyjer',     emoji: '⚫', name: 'Nyjer',     does: 'Email', hint: 'Check an email’s domain, or suggest likely addresses' },
    { id: 'safflower', emoji: '🌼', name: 'Safflower', does: 'Websites', hint: 'Find a company website that really exists' },
    { id: 'hemp',      emoji: '🌿', name: 'Hemp',      does: 'LinkedIn', hint: 'Company page and people-search links' },
    { id: 'peanut',    emoji: '🥜', name: 'Peanut',    does: 'City departments', hint: 'Relevant Long Beach, NY departments with phone numbers' },
    { id: 'corn',      emoji: '🌽', name: 'Cracked corn', does: 'Company profile', hint: 'Public summary & website from Wikidata' },
    { id: 'thistle',   emoji: '🌱', name: 'Thistle',   does: 'Past calls', hint: 'Earlier notes from this caller or company' }
  ];

  /* ---------------- helpers ---------------- */
  var FREE = /^(gmail|yahoo|hotmail|outlook|aol|icloud|me|msn|live|proton|protonmail|comcast|verizon|optonline)\./i;
  var GENERIC = /^(group|inc|incorporated|llc|l\.l\.c|corp|corporation|company|co|ltd|holdings|development|developments|properties|realty|partners|associates|enterprises|services|solutions|the)$/i;
  var TITLES = /^(dr|mr|mrs|ms|mx|prof|judge|mayor|rev|sgt|capt|hon)\.?$/i;
  function digits(p) { return String(p || '').replace(/\D/g, ''); }
  function lines(s) { return String(s || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function words(s) { return String(s || '').trim().split(/\s+/).filter(Boolean); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function emailIn(s) { var m = String(s || '').match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/); return m ? m[0] : ''; }
  function nameParts(full) { var w = words(full).filter(function (x) { return !TITLES.test(x); }); return { first: (w[0] || ''), last: (w.length > 1 ? w[w.length - 1] : '') }; }
  function cleanName(s) {
    return words(s).map(function (w) {
      if (TITLES.test(w)) return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      var l = w.toLowerCase().replace(/'/g, '’');
      l = l.replace(/(^|[-’])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
      l = l.replace(/^Mc([a-z])/, function (m, c) { return 'Mc' + c.toUpperCase(); });
      return l;
    }).join(' ');
  }
  function sameName(a, b) { return norm(String(a).replace(/[’']/g, '')) === norm(String(b).replace(/[’']/g, '')); }
  function slugVariants(company) {
    var w = norm(company).split(' ').filter(Boolean), out = [];
    for (var n = w.length; n >= 1; n--) {
      var joined = w.slice(0, n).join('');
      if (n < w.length && !GENERIC.test(w[n])) continue;          // only drop generic trailing words
      if (joined.length >= 4 && out.indexOf(joined) < 0) out.push(joined);
    }
    return out;
  }
  function stem(w) { return w.length > 3 ? w.replace(/(?:ies|es|s)$/, function (m) { return m === 'ies' ? 'y' : (m === 'es' && /(ch|sh|x|ss)es$/.test(w) ? '' : (m === 'es' ? 'e' : '')); }) : w; }
  function stems(s) { return norm(s).split(' ').filter(Boolean).map(stem).join(' '); }
  function hyphenSlug(company) { return norm(company).replace(/ /g, '-'); }
  function g(q) { return 'https://www.google.com/search?q=' + encodeURIComponent(q); }
  function sg(seed, id, label, value, trust, source, apply, checked) {
    return { id: seed + ':' + id, seed: seed, label: label, value: value, trust: trust, source: source || '', apply: apply,
      checked: checked === undefined ? trust !== 'guess' && apply.kind !== 'link' : checked };
  }
  function ft(ctx, url, ms) {
    var f = ctx.fetch || (root.fetch && root.fetch.bind(root)); if (!f) return Promise.reject(new Error('no fetch'));
    var ac = typeof AbortController !== 'undefined' ? new AbortController() : null, t = ac && setTimeout(function () { ac.abort(); }, ms || 7000);
    return f(url, ac ? { signal: ac.signal } : {}).then(function (r) { if (t) clearTimeout(t); return r.json(); }, function (e) { if (t) clearTimeout(t); throw e; });
  }
  function dns(ctx, name, type) {
    return ft(ctx, 'https://dns.google/resolve?name=' + encodeURIComponent(name) + '&type=' + type).then(function (j) { return j.Answer || []; }, function () { return null; });
  }
  function companyHint(s) { return s.company || ''; }

  /* ---------------- area codes ---------------- */
  var AREA = {
    212: 'Manhattan, New York City, NY', 646: 'Manhattan, New York City, NY', 332: 'Manhattan, New York City, NY', 917: 'New York City, NY (mobile overlay)',
    718: 'Bronx / Brooklyn / Queens / Staten Island, NY', 347: 'Bronx / Brooklyn / Queens / Staten Island, NY', 929: 'Bronx / Brooklyn / Queens / Staten Island, NY',
    516: 'Nassau County (Long Island), NY', 363: 'Nassau County (Long Island), NY', 631: 'Suffolk County (Long Island), NY', 934: 'Suffolk County (Long Island), NY',
    914: 'Westchester County, NY', 845: 'Hudson Valley, NY', 518: 'Albany / Capital Region, NY', 838: 'Albany / Capital Region, NY', 585: 'Rochester, NY',
    716: 'Buffalo, NY', 315: 'Syracuse / Central NY', 607: 'Binghamton / Southern Tier, NY',
    201: 'Northern New Jersey', 973: 'Northern New Jersey', 908: 'Central New Jersey', 732: 'Central New Jersey', 609: 'Central/South New Jersey', 856: 'Southwest New Jersey',
    203: 'Connecticut (coastal)', 860: 'Connecticut', 215: 'Philadelphia, PA', 202: 'Washington, DC', 617: 'Boston, MA', 305: 'Miami, FL', 312: 'Chicago, IL', 310: 'Los Angeles, CA', 415: 'San Francisco, CA'
  };
  var TOLL = { 800: 1, 833: 1, 844: 1, 855: 1, 866: 1, 877: 1, 888: 1 };

  /* ---------------- seeds ---------------- */
  var run = {};

  run.sunflower = function (ctx) {
    var s = ctx.state, out = [], cur = s.caller || '', em = emailIn(s.alt) || emailIn(s.reason);
    if (cur) {
      var tidy = cleanName(cur);
      if (tidy !== cur && !(sameName(tidy, cur) && /[’']/.test(cur) && !/[’']/.test(tidy)))
        out.push(sg('sunflower', 'tidy', 'Tidy the name', tidy, 'derived', 'capitalisation', { kind: 'field', field: 'caller', value: tidy, mode: 'replace' }));
    }
    var np = nameParts(cur), first = np.first.toLowerCase();
    if (em) {
      var local = em.split('@')[0].toLowerCase(), m = local.match(/^([a-z]{2,})[._-]([a-z]{2,})$/);
      if (m && (!cur || (!np.last && m[1] === first))) {
        var full = cleanName(m[1] + ' ' + m[2]);
        out.push(sg('sunflower', 'email', cur ? 'Complete the name from the email' : 'Name from the email', full, 'guess', 'email address ' + em, { kind: 'field', field: 'caller', value: full, mode: 'replace' }));
      }
    }
    (ctx.history || []).forEach(function (h) {
      var n = h.data.caller || '';
      if (n && words(n).length > words(cur).length && (!cur || norm(n).indexOf(norm(np.first)) === 0))
        if (!out.some(function (x) { return x.value === n; })) out.push(sg('sunflower', 'hist' + h.at, 'Full name from an earlier call', n, 'derived', 'saved note, ' + new Date(h.at).toLocaleDateString(), { kind: 'field', field: 'caller', value: n, mode: 'replace' }));
    });
    return { suggestions: out.slice(0, 3), message: out.length ? '' : (cur ? 'Name already looks complete.' : 'No name to work with yet.') };
  };

  run.millet = function (ctx) {
    var raw = ctx.state.phone || '', out = [];
    var ext = (raw.match(/(?:x|ext\.?)\s*(\d+)\s*$/i) || [])[1] || '';
    var d = digits(raw.replace(/(?:x|ext\.?)\s*\d+\s*$/i, ''));
    if (!d) return { suggestions: [], message: 'No phone number yet.' };
    if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
    if (d.length !== 10) return { suggestions: [sg('millet', 'len', 'Check the number', 'This has ' + d.length + ' digits — a US/Canada number needs 10.', 'derived', 'format check', { kind: 'extra', text: '⚠ Phone number "' + raw + '" does not look complete (' + d.length + ' digits) — confirm with the caller.' }, true)], message: '' };
    var ac = d.slice(0, 3), ex = d.slice(3, 6), ln = d.slice(6), pretty = ac + '-' + ex + '-' + ln + (ext ? ' x' + ext : ''), warn = [];
    if (/^[01]/.test(ac)) warn.push('area code ' + ac + ' is not valid');
    if (/^[01]/.test(ex)) warn.push('exchange ' + ex + ' is not valid');
    if (/^\d11$/.test(ac) || /^\d11$/.test(ex)) warn.push('N11 service code');
    if (ex === '555' && /^01\d\d$/.test(ln)) warn.push('555-01xx numbers are reserved for fiction, so this cannot be a real line');
    var where = TOLL[ac] ? 'Toll-free number' : AREA[ac] ? 'Area code ' + ac + ' — ' + AREA[ac] : 'Area code ' + ac + ' (US/Canada)';
    if (pretty !== raw.trim()) out.push(sg('millet', 'fmt', 'Standard format', pretty, 'derived', 'format', { kind: 'field', field: 'phone', value: pretty, mode: 'replace' }));
    out.push(sg('millet', 'where', warn.length ? 'Phone check — ' + warn.length + ' problem' + (warn.length > 1 ? 's' : '') : 'Phone check', where + (warn.length ? ' · ⚠ ' + warn.join('; ') : ' · valid US format'), 'derived',
      'North American numbering rules (line owner is not checked)', { kind: 'extra', text: 'Phone: ' + where + (warn.length ? ' — ⚠ ' + warn.join('; ') : '') + '.' }, warn.length > 0 || !!AREA[ac]));
    out.push(sg('millet', 'rev', 'Who has called from this number?', 'Opens a web search', 'derived', 'web search', { kind: 'link', url: g('"' + ac + '-' + ex + '-' + ln + '" OR "(' + ac + ') ' + ex + '-' + ln + '"') }));
    return { suggestions: out, message: '' };
  };

  // candidate company domains that really exist (DNS says so). Shared by Nyjer + Safflower.
  function domains(ctx) {
    if (ctx._dom) return ctx._dom;
    var s = ctx.state, found = [], known = [];
    var e = emailIn(s.alt); if (e && !FREE.test(e.split('@')[1])) known.push(e.split('@')[1].toLowerCase());
    (s.refs || []).forEach(function (r) { var m = String(r.url || '').match(/^https?:\/\/(?:www\.)?([^\/?#]+)/i); if (m && !/(linkedin|facebook|google|wikipedia|longbeachny\.gov)/i.test(m[1])) known.push(m[1].toLowerCase()); });
    var cand = [];
    slugVariants(companyHint(s)).forEach(function (v) { ['com', 'net', 'org'].forEach(function (t) { cand.push(v + '.' + t); }); });
    if (known.length) cand = [];
    cand = cand.filter(function (d) { return known.indexOf(d) < 0; }).slice(0, 9);
    ctx._dom = Promise.all(cand.map(function (d) {
      return Promise.all([dns(ctx, d, 'A'), dns(ctx, d, 'MX')]).then(function (r) { return { domain: d, web: !!(r[0] && r[0].length), mail: !!(r[1] && r[1].length), net: r[0] !== null }; });
    })).then(function (rows) { return { known: known, guesses: rows.filter(function (r) { return r.web || r.mail; }), offline: rows.length > 0 && rows.every(function (r) { return !r.net; }) }; });
    return ctx._dom;
  }

  run.nyjer = function (ctx) {
    var s = ctx.state, out = [], em = emailIn(s.alt);
    if (em) {
      var dom = em.split('@')[1];
      return dns(ctx, dom, 'MX').then(function (a) {
        if (a === null) return { suggestions: [], message: 'Couldn’t reach the DNS service (offline?).' };
        out.push(sg('nyjer', 'mx', a.length ? 'Email domain checked' : 'Email domain problem', a.length ? dom + ' accepts email ✓ (the mailbox itself can’t be checked)' : dom + ' has no mail servers — the address may be mistyped', 'verified', 'public DNS (dns.google)',
          { kind: 'extra', text: a.length ? 'Email ' + em + ': domain accepts mail.' : '⚠ Email ' + em + ': domain has no mail servers — confirm the spelling.' }, !a.length));
        return { suggestions: out, message: '' };
      });
    }
    var np = nameParts(s.caller);
    return domains(ctx).then(function (d) {
      var mail = d.guesses.filter(function (x) { return x.mail; });
      if (!mail.length) return { suggestions: [], message: d.offline ? 'Couldn’t reach the DNS service (offline?).' : 'No email yet and no company mail domain found. Ask the caller for their email.' };
      var dom = mail[0].domain, pats = [];
      if (np.first && np.last) { var f = np.first.toLowerCase().replace(/[^a-z]/g, ''), l = np.last.toLowerCase().replace(/[^a-z]/g, ''); pats = [f + '.' + l, f.charAt(0) + l, f]; }
      pats.slice(0, 2).forEach(function (p, i) { out.push(sg('nyjer', 'p' + i, 'Possible email', p + '@' + dom, 'guess', dom + ' receives email; the exact address is a guess — confirm with the caller', { kind: 'field', field: 'alt', value: p + '@' + dom, mode: 'append' })); });
      if (!pats.length) out.push(sg('nyjer', 'gen', 'Company mail domain', '@' + dom, 'guess', dom + ' receives email — add a full name for specific suggestions', { kind: 'extra', text: 'Company email domain (unconfirmed): @' + dom }, false));
      return { suggestions: out, message: '' };
    });
  };

  run.safflower = function (ctx) {
    var s = ctx.state, out = [];
    if (!s.company) return Promise.resolve({ suggestions: [], message: 'Add a company first.' });
    return domains(ctx).then(function (d) {
      d.known.filter(function (k) { return !(s.refs || []).some(function (r) { return String(r.url).indexOf(k) > -1; }); }).slice(0, 1).forEach(function (k) {
        out.push(sg('safflower', 'k' + k, 'Website from the email domain', k, 'derived', 'taken from the caller’s email address', { kind: 'ref', title: s.company + ' — website', detail: '', url: 'https://' + k }));
      });
      d.guesses.filter(function (x) { return x.web; }).slice(0, 3).forEach(function (x, i) {
        out.push(sg('safflower', 'd' + i, 'Website that exists', x.domain, 'guess', 'DNS confirms the domain exists — confirm it is the right company',
          { kind: 'ref', title: s.company + ' — website', detail: '', url: 'https://' + x.domain }));
      });
      out.push(sg('safflower', 'search', 'Search the web for ' + s.company, 'Opens a web search', 'derived', 'web search', { kind: 'link', url: g(s.company + (ctx.city ? ' ' + ctx.city : '')) }));
      return { suggestions: out, message: d.offline ? 'DNS service unreachable — only the search link is available.' : (out.length === 1 ? 'No matching website found by name.' : '') };
    });
  };

  run.hemp = function (ctx) {
    var s = ctx.state, out = [];
    if (s.company) {
      out.push(sg('hemp', 'co', 'LinkedIn company page (guess)', 'linkedin.com/company/' + hyphenSlug(s.company), 'guess', 'built from the company name — LinkedIn can’t be checked from here, open it to confirm',
        { kind: 'ref', title: s.company + ' — LinkedIn', detail: '', url: 'https://www.linkedin.com/company/' + hyphenSlug(s.company) }));
      out.push(sg('hemp', 'cosearch', 'Search LinkedIn companies', s.company, 'derived', 'LinkedIn search', { kind: 'link', url: 'https://www.linkedin.com/search/results/companies/?keywords=' + encodeURIComponent(s.company) }));
    }
    if (s.caller) out.push(sg('hemp', 'people', 'Search LinkedIn for ' + cleanName(s.caller), [cleanName(s.caller), s.company].filter(Boolean).join(' · '), 'derived', 'LinkedIn search',
      { kind: 'link', url: 'https://www.linkedin.com/search/results/people/?keywords=' + encodeURIComponent([s.caller, s.company].filter(Boolean).join(' ')) }));
    return Promise.resolve({ suggestions: out, message: out.length ? '' : 'Add a caller or company first.' });
  };

  run.peanut = function (ctx) {
    var s = ctx.state, city = (ctx.city || '').trim(), out = [];
    var text = stems([s.topics, s.reason, s.action, s.extra].join(' ')), tl = lines(s.topics);
    var isLB = /long\s*beach/i.test(city) && !/\b(ca|california)\b/i.test(city) || (!city);
    if (isLB && root.LB_DIRECTORY) {
      var D = root.LB_DIRECTORY;
      var scored = D.depts.map(function (d) {
        var sc = 0;
        d.keys.forEach(function (k) { var nk = stems(k); if (nk && (' ' + text + ' ').indexOf(' ' + nk + ' ') > -1) sc += nk.indexOf(' ') > -1 ? 3 : 2; });
        var nm = stems(d.name.split(/ [—(]/)[0]); if (nm && text.indexOf(nm) > -1) sc += 4;   // e.g. "transferred by the Building Department"
        return { d: d, sc: sc };
      }).filter(function (x) { return x.sc > 0; }).sort(function (a, b) { return b.sc - a.sc; }).slice(0, 5);
      scored.forEach(function (x, i) {
        var d = x.d, det = [d.phone, d.room, d.fax && 'fax ' + d.fax, d.email].filter(Boolean).join(' · ');
        out.push(sg('peanut', d.id, 'City of Long Beach — ' + d.name, det, 'verified', D.source + ', checked ' + D.checked, { kind: 'ref', title: 'City of Long Beach — ' + d.name, detail: det, url: d.url }, i < 3));
      });
      out.push(sg('peanut', 'hall', D.hall.name, D.hall.phone + ' · ' + D.hall.address, 'verified', D.source + ', checked ' + D.checked, { kind: 'ref', title: D.hall.name, detail: D.hall.phone + ' · ' + D.hall.address, url: D.hall.url }, !scored.length));
      return Promise.resolve({ suggestions: out, message: scored.length ? '' : 'No department matched the topics — City Hall main line added.' });
    }
    (tl.length ? tl : [s.reason || '']).filter(Boolean).slice(0, 4).forEach(function (t, i) {
      out.push(sg('peanut', 'q' + i, (city || 'Local') + ' — ' + t, 'Opens a search for the right office and phone', 'derived', 'web search', { kind: 'link', url: g((city ? city + ' ' : '') + t + ' office phone number') }));
    });
    return Promise.resolve({ suggestions: out, message: city ? 'Verified directory is only built for Long Beach, NY — search links provided for ' + city + '.' : '' });
  };

  run.corn = function (ctx) {
    var s = ctx.state, q = s.company;
    if (!q) return Promise.resolve({ suggestions: [], message: 'Add a company first.' });
    var api = 'https://www.wikidata.org/w/api.php?format=json&origin=*&';
    return ft(ctx, api + 'action=wbsearchentities&language=en&limit=3&search=' + encodeURIComponent(q)).then(function (j) {
      var key = norm(q).split(' ').filter(function (w) { return !GENERIC.test(w); }).join(' ');
      var hit = (j.search || []).filter(function (r) { var l = norm(r.label); return l === norm(q) || (key && l === key); })[0];
      if (!hit) return { suggestions: [], message: 'No public profile found for “' + q + '” (small or private companies often have none).' };
      return ft(ctx, api + 'action=wbgetentities&props=claims|sitelinks&ids=' + hit.id).then(function (e) {
        var ent = (e.entities || {})[hit.id] || {}, cl = ent.claims || {};
        var site = (((cl.P856 || [])[0] || {}).mainsnak || {}).datavalue; site = site && site.value;
        var hq = (((cl.P159 || [])[0] || {}).mainsnak || {}).datavalue; hq = hq && hq.value && hq.value.id;
        var wiki = ent.sitelinks && ent.sitelinks.enwiki && 'https://en.wikipedia.org/wiki/' + encodeURIComponent(ent.sitelinks.enwiki.title.replace(/ /g, '_'));
        var done = function (hqLabel) {
          var det = [hit.description, hqLabel && 'HQ: ' + hqLabel].filter(Boolean).join(' · ');
          return { suggestions: [sg('corn', hit.id, hit.label + ' — public profile', det || 'Wikidata entry', 'verified', 'Wikidata ' + hit.id + ' (matched by name — confirm it is the same company)',
            { kind: 'ref', title: hit.label, detail: det, url: site || wiki || 'https://www.wikidata.org/wiki/' + hit.id })], message: '' };
        };
        if (!hq) return done('');
        return ft(ctx, api + 'action=wbgetentities&props=labels&languages=en&ids=' + hq).then(function (h) { return done((((h.entities || {})[hq] || {}).labels || {}).en && h.entities[hq].labels.en.value); }, function () { return done(''); });
      });
    }).catch(function () { return { suggestions: [], message: 'Couldn’t reach Wikidata (offline?).' }; });
  };

  run.thistle = function (ctx) {
    var s = ctx.state, h = ctx.history || [], out = [];
    if (!h.length) return { suggestions: [], message: 'No earlier calls from this caller or company on this device.' };
    var last = h[0], topics = [];
    h.forEach(function (n) { lines(n.data.topics).forEach(function (t) { if (topics.indexOf(t) < 0) topics.push(t); }); });
    out.push(sg('thistle', 'sum', h.length + ' earlier call' + (h.length > 1 ? 's' : ''), 'Last: ' + new Date(last.at).toLocaleDateString() + (topics.length ? ' · about ' + topics.slice(0, 4).join(', ') : ''), 'verified', 'your saved notes',
      { kind: 'extra', text: 'Previous calls: ' + h.length + ' (last ' + new Date(last.at).toLocaleDateString() + (topics.length ? ', re: ' + topics.slice(0, 4).join(', ') : '') + ').' }));
    ['company', 'phone', 'alt'].forEach(function (f) {
      var v = last.data[f]; if (v && !s[f]) out.push(sg('thistle', f, 'Fill ' + (f === 'alt' ? 'email / cell' : f) + ' from last call', v, 'verified', 'your saved notes', { kind: 'field', field: f, value: v, mode: 'ifEmpty' }));
    });
    (last.data.refs || []).filter(function (r) { return r.title || r.url; }).slice(0, 4).forEach(function (r, i) {
      if (!(s.refs || []).some(function (x) { return (r.url && x.url === r.url) || (x.title && x.title === r.title); }))
        out.push(sg('thistle', 'r' + i, 'Reference from last call', r.title, 'verified', 'your saved notes', { kind: 'ref', title: r.title, detail: r.detail, url: r.url }, false));
    });
    return { suggestions: out, message: '' };
  };

  /* ---------------- runner ---------------- */
  function previous(state, saved) {
    var d = digits(state.phone).replace(/^1(?=\d{10}$)/, ''), c = norm(state.caller), co = norm(state.company);
    return (saved || []).filter(function (n) {
      var x = n.data || {};
      return (d && digits(x.phone).replace(/^1(?=\d{10}$)/, '') === d) || (c && norm(x.caller) === c) || (co && c && norm(x.company) === co && norm(x.caller).split(' ')[0] === c.split(' ')[0]);
    });
  }
  function scatter(ids, ctx, onEach) {
    ctx.history = previous(ctx.state, ctx.saved);
    return Promise.all(ids.map(function (id) {
      var meta = SEEDS.filter(function (x) { return x.id === id; })[0];
      return Promise.resolve().then(function () { return run[id](ctx); }).catch(function (e) { return { suggestions: [], message: 'Something went wrong: ' + e.message }; })
        .then(function (r) { r.seed = meta; if (onEach) onEach(r); return r; });
    }));
  }

  root.BirdSeed = { SEEDS: SEEDS, scatter: scatter, _t: { cleanName: cleanName, slugVariants: slugVariants, previous: previous, AREA: AREA } };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BirdSeed;
})(typeof window !== 'undefined' ? window : globalThis);
