/* WYWO — While You Were Out. Plain JS, no build step. */
(function () {
  'use strict';

  /* ---------------- Constants ---------------- */
  var THEMES = [
    { id: 'bluebird',  name: 'Bluebird',         color: '#2563c9' },
    { id: 'parakeet',  name: 'Monk Parakeet',    color: '#23913f' },
    { id: 'cardinal',  name: 'Cardinal',         color: '#c4112f' },
    { id: 'goldfinch', name: 'Goldfinch',        color: '#f0b400' },
    { id: 'spoonbill', name: 'Roseate Spoonbill', color: '#d9488d' },
    { id: 'sparrow',   name: 'Song Sparrow',     color: '#865538' },
    { id: 'robin',     name: 'American Robin',   color: '#e0651a' },
    { id: 'heron',     name: 'Night-Heron',      color: '#262b36' }
  ];
  var METHODS = ['Telephoned', 'Came to see you', 'Returned your call', 'Please call', 'Will call again', 'Wants to see you'];
  var KEY_UI = 'wywo.ui', KEY_DRAFT = 'wywo.draft', KEY_SAVED = 'wywo.saved';

  var EXAMPLE = {
    forWho: '', urgent: false, date: today(), time: nowTime(),
    caller: 'Cian O’Brien', company: 'OCS Development Group', phone: '646-331-2205', alt: '',
    methods: ['Telephoned', 'Please call'],
    reason: 'Cian was transferred by the City of Long Beach Building Department.',
    topics: 'Industrial Zone / Zoning\nBuilding Permits\nMercantile License',
    action: 'Please return Cian’s call regarding the above matters.',
    refs: [
      { title: 'OCS Development Group', detail: 'New York real estate development and investment company.', url: 'https://www.linkedin.com/company/ocs-development-group' },
      { title: 'City of Long Beach — Building Department', detail: '516-431-1005', url: 'https://www.longbeachny.gov/building' },
      { title: 'City Clerk — Mercantile Licensing', detail: '516-431-1002', url: 'https://www.longbeachny.gov/business' }
    ],
    signed: ''
  };

  /* ---------------- Helpers ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function nowTime() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function safeUrl(u) { return /^https?:\/\//i.test(u) ? u : (u && /^[\w-]+(\.[\w-]+)+/.test(u) ? 'https://' + u : ''); }
  function telHref(p) { var d = String(p || '').replace(/[^\d+]/g, ''); return d ? 'tel:' + d : ''; }
  function lines(s) { return String(s || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function fmtDate(d, t) {
    if (!d && !t) return '';
    var out = '';
    if (d) { var p = d.split('-'); out = new Date(+p[0], p[1] - 1, +p[2]).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }
    if (t) { var q = t.split(':'); var dt = new Date(); dt.setHours(+q[0], +q[1]); out += (out ? ' · ' : '') + dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
    return out;
  }
  function first(name) { return String(name || '').trim().split(/\s+/)[0] || 'the caller'; }

  /* ---------------- State ---------------- */
  var form = $('#form'), pane = $('#pane');
  var state = Object.assign(blank(), load(KEY_DRAFT, {}));
  var view = 'modern';

  function blank() {
    return { forWho: '', urgent: false, date: today(), time: nowTime(), caller: '', company: '', phone: '', alt: '', methods: ['Telephoned'], reason: '', topics: '', action: '', refs: [], signed: '' };
  }

  /* ---------------- Theme UI ---------------- */
  var ui = load(KEY_UI, {});
  function applyTheme(id) {
    var t = THEMES.filter(function (x) { return x.id === id; })[0] || THEMES[0];
    document.documentElement.dataset.theme = t.id;
    $('#themeLabel').textContent = t.name;
    Array.prototype.forEach.call(document.querySelectorAll('.bb-swatch'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === t.id)); });
    ui.theme = t.id; store(KEY_UI, ui);
  }
  THEMES.forEach(function (t) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'bb-swatch'; b.dataset.id = t.id; b.title = t.name; b.setAttribute('aria-label', t.name);
    b.style.setProperty('--c', t.color);
    b.addEventListener('click', function () { applyTheme(t.id); });
    $('#swatches').appendChild(b);
  });
  $('#modeBtn').addEventListener('click', function () {
    var el = document.documentElement;
    var dark = el.dataset.mode ? el.dataset.mode === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    el.dataset.mode = dark ? 'light' : 'dark';
    ui.mode = el.dataset.mode; store(KEY_UI, ui);
  });
  applyTheme(document.documentElement.dataset.theme);

  /* ---------------- Form <-> state ---------------- */
  var methodsEl = $('#methods');
  METHODS.forEach(function (m) {
    var l = document.createElement('label'); l.className = 'bb-check';
    l.innerHTML = '<input type="checkbox" value="' + esc(m) + '"> ' + esc(m);
    methodsEl.appendChild(l);
  });

  function writeForm() {
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') el.checked = !!state[el.name]; else el.value = state[el.name] || '';
    });
    Array.prototype.forEach.call(methodsEl.querySelectorAll('input'), function (i) { i.checked = state.methods.indexOf(i.value) > -1; });
    renderRefs();
  }

  function readForm() {
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      state[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
    state.methods = Array.prototype.map.call(methodsEl.querySelectorAll('input:checked'), function (i) { return i.value; });
    state.refs = Array.prototype.map.call(document.querySelectorAll('.ref-item'), function (r) {
      return { title: $('[data-f=title]', r).value, detail: $('[data-f=detail]', r).value, url: $('[data-f=url]', r).value };
    });
  }

  function renderRefs() {
    var box = $('#refs'); box.innerHTML = '';
    state.refs.forEach(function (r, i) {
      var d = document.createElement('div'); d.className = 'ref-item';
      d.innerHTML =
        '<div class="ref-item__top"><input class="bb-input" data-f="title" placeholder="Name (e.g. City Clerk — Licensing)" value="' + esc(r.title) + '">' +
        '<button type="button" class="bb-btn bb-btn--icon bb-btn--ghost bb-btn--danger" data-rm="' + i + '" aria-label="Remove reference">✕</button></div>' +
        '<input class="bb-input" data-f="detail" placeholder="Phone or description" value="' + esc(r.detail) + '">' +
        '<input class="bb-input" data-f="url" type="url" placeholder="https://…" value="' + esc(r.url) + '">';
      box.appendChild(d);
    });
  }
  $('#addRef').addEventListener('click', function () { readForm(); state.refs.push({ title: '', detail: '', url: '' }); renderRefs(); update(); var all = document.querySelectorAll('.ref-item [data-f=title]'); all[all.length - 1].focus(); });
  $('#refs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rm]'); if (!b) return;
    readForm(); state.refs.splice(+b.dataset.rm, 1); renderRefs(); update();
  });
  form.addEventListener('input', update);
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* ---------------- Renderers ---------------- */
  function renderModern(s) {
    var tel = telHref(s.phone), topics = lines(s.topics);
    var h = '<article class="note">';
    h += '<div class="note__top"><div><div class="note__kicker">While You Were Out</div><div class="note__title">Callback request</div></div>' +
      '<div class="note__meta">' + (s.urgent ? '<span class="bb-badge bb-badge--danger">URGENT</span><br>' : '') +
      (s.forWho ? 'For <b>' + esc(s.forWho) + '</b><br>' : '') + esc(fmtDate(s.date, s.time)) + '</div></div>';
    h += '<div class="note__caller"><span class="name">' + (s.caller ? esc(s.caller) : '<span class="empty">Caller name</span>') + '</span>' +
      (s.company ? '<span class="company">' + esc(s.company) + '</span>' : '') +
      (s.phone ? (tel ? '<a class="note__phone" href="' + esc(tel) + '">' + esc(s.phone) + '</a>' : '<span class="note__phone">' + esc(s.phone) + '</span>') : '') +
      (s.alt ? '<span>' + esc(s.alt) + '</span>' : '') + '</div>';
    if (s.methods.length) h += '<div class="chips">' + s.methods.map(function (m) { return '<span class="bb-badge">' + esc(m) + '</span>'; }).join('') + '</div>';
    if (s.reason || topics.length) {
      h += '<div><h3>Reason for call</h3>' + (s.reason ? '<p>' + esc(s.reason) + '</p>' : '');
      if (topics.length) h += (s.reason ? '<p style="margin-top:.5rem">' + esc(first(s.caller)) + ' has questions concerning:</p>' : '') + '<ul>' + topics.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
      h += '</div>';
    }
    if (s.action) h += '<div><h3>Requested action</h3><p>' + esc(s.action) + '</p></div>';
    var refs = s.refs.filter(function (r) { return r.title || r.detail || r.url; });
    if (refs.length) {
      h += '<div><h3>Relevant reference information</h3>' + refs.map(function (r) {
        var u = safeUrl(r.url), t = telHref(r.detail);
        return '<div class="ref"><b>' + esc(r.title) + '</b>' +
          (r.detail ? (/^[\d\s().+-]{7,}$/.test(r.detail) && t ? '<a href="' + esc(t) + '">' + esc(r.detail) + '</a>' : '<span>' + esc(r.detail) + '</span>') : '') +
          (u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(r.url) + '</a>' : '') + '</div>';
      }).join('') + '</div>';
    }
    if (s.signed) h += '<div class="note__sig">Taken by ' + esc(s.signed) + '</div>';
    return h + '</article>';
  }

  function renderClassic(s) {
    var box = function (m) { return '<div><u>' + (s.methods.indexOf(m) > -1 ? '✓' : '') + '</u>' + esc(m.toUpperCase()) + '</div>'; };
    var msg = [s.reason, lines(s.topics).length ? 'Questions re: ' + lines(s.topics).join(', ') : '', s.action].filter(Boolean).join('\n');
    return '<div class="slip">' +
      '<div class="urgent">Urgent <b>' + (s.urgent ? '✓' : '') + '</b></div>' +
      '<div class="ln"><i>FOR</i><span>' + esc(s.forWho) + '</span></div>' +
      '<div class="ln"><i>DATE</i><span>' + esc(s.date) + '</span><i>TIME</i><span>' + esc(s.time) + '</span></div>' +
      '<div class="banner">While You Were Out</div>' +
      '<div class="ln"><i>M</i><span>' + esc(s.caller) + '</span></div>' +
      '<div class="two"><div><div class="ln"><i>OF</i><span>' + esc(s.company) + '</span></div>' +
      '<div class="ln"><i>PHONE</i><span>' + esc(s.phone) + '</span></div>' +
      '<div class="ln"><i>CELL/FAX</i><span>' + esc(s.alt) + '</span></div></div>' +
      '<div class="opts">' + METHODS.map(box).join('') + '</div></div>' +
      '<div class="msg-title">Message</div><div class="lines">' + esc(msg) + '</div>' +
      '<div class="sign"><span>' + esc(s.signed) + '</span>SIGNED</div></div>';
  }

  function toText(s) {
    var o = [], refs = s.refs.filter(function (r) { return r.title || r.detail || r.url; }), topics = lines(s.topics);
    o.push('WHILE YOU WERE OUT', '');
    o.push(s.urgent ? 'CALLBACK REQUEST — URGENT' : 'CALLBACK REQUEST', '');
    var meta = [s.forWho && 'FOR: ' + s.forWho, fmtDate(s.date, s.time) && 'DATE: ' + fmtDate(s.date, s.time)].filter(Boolean);
    if (meta.length) o.push(meta.join('   '), '');
    o.push('CALLER: ' + s.caller, 'COMPANY: ' + s.company, 'PHONE: ' + s.phone);
    if (s.alt) o.push('ALSO: ' + s.alt);
    if (s.methods.length) o.push('TYPE: ' + s.methods.join(', '));
    if (s.reason || topics.length) {
      o.push('', '—'.repeat(3), '', 'REASON FOR CALL', '');
      if (s.reason) o.push(s.reason, '');
      if (topics.length) o.push(first(s.caller) + ' has questions concerning:', '', topics.join('\n'));
    }
    if (s.action) o.push('', '—'.repeat(3), '', 'REQUESTED ACTION', '', s.action);
    if (refs.length) {
      o.push('', '—'.repeat(3), '', 'RELEVANT REFERENCE INFORMATION');
      refs.forEach(function (r) { o.push('', [r.title, r.detail, r.url].filter(Boolean).join('\n')); });
    }
    if (s.signed) o.push('', '—'.repeat(3), '', 'TAKEN BY: ' + s.signed);
    return o.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  function toMarkdown(s) {
    var o = [], refs = s.refs.filter(function (r) { return r.title || r.detail || r.url; }), topics = lines(s.topics);
    o.push('# 📞 While You Were Out', '', '## Callback request' + (s.urgent ? ' — **URGENT**' : ''), '');
    if (s.forWho) o.push('**For:** ' + s.forWho + '  ');
    if (fmtDate(s.date, s.time)) o.push('**Date:** ' + fmtDate(s.date, s.time) + '  ');
    o.push('**Caller:** ' + s.caller + '  ', '**Company:** ' + s.company + '  ', '**Phone:** ' + s.phone);
    if (s.alt) o.push('', '**Also:** ' + s.alt);
    if (s.reason || topics.length) {
      o.push('', '### Reason for call', '');
      if (s.reason) o.push(s.reason, '');
      if (topics.length) o.push(first(s.caller) + ' has questions concerning:', '', topics.map(function (t) { return '- ' + t; }).join('\n'));
    }
    if (s.action) o.push('', '### Requested action', '', s.action);
    if (refs.length) {
      o.push('', '### Relevant reference information');
      refs.forEach(function (r) { o.push('', '**' + r.title + '**', [r.detail, r.url].filter(Boolean).join('  \n')); });
    }
    if (s.signed) o.push('', '_Taken by ' + s.signed + '_');
    return o.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  function currentText() { return view === 'markdown' ? toMarkdown(state) : toText(state); }

  function renderPane() {
    if (view === 'modern') pane.innerHTML = renderModern(state);
    else if (view === 'classic') pane.innerHTML = renderClassic(state);
    else pane.innerHTML = '<textarea class="textbox" readonly aria-label="' + view + ' output" wrap="off">' + esc(currentText()) + '</textarea>';
  }

  var raf = 0;
  function update() { readForm(); store(KEY_DRAFT, state); cancelAnimationFrame(raf); raf = requestAnimationFrame(renderPane); }

  /* ---------------- Tabs ---------------- */
  $('#tabs').addEventListener('click', function (e) {
    var b = e.target.closest('.bb-tab'); if (!b) return;
    view = b.dataset.view;
    Array.prototype.forEach.call(document.querySelectorAll('.bb-tab'), function (t) { t.setAttribute('aria-selected', String(t === b)); });
    renderPane();
  });

  /* ---------------- Actions ---------------- */
  var toastT;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('is-on'); }, 1800); }

  $('#copyBtn').addEventListener('click', function () {
    var txt = view === 'modern' || view === 'classic' ? toText(state) : currentText();
    function fallback() { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Copied'); } catch (e) { toast('Copy failed'); } ta.remove(); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(function () { toast('Copied ' + (view === 'markdown' ? 'Markdown' : 'text')); }, fallback); else fallback();
  });
  $('#downloadBtn').addEventListener('click', function () {
    var md = view === 'markdown', blob = new Blob([md ? toMarkdown(state) : toText(state)], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a'), slug = (state.caller || 'call').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    a.href = URL.createObjectURL(blob); a.download = 'wywo-' + (slug || 'call') + (md ? '.md' : '.txt');
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $('#printBtn').addEventListener('click', function () {
    var layout = $('#printLayout').value, one = view === 'classic' ? renderClassic(state) : renderModern(state);
    var n = layout === 'two' ? 2 : 1, h = '';
    for (var i = 0; i < n; i++) h += one;
    $('#printArea').innerHTML = '<div class="pa-sheet ' + layout + '">' + h + '</div>';
    var st = $('#pageStyle') || document.head.appendChild(Object.assign(document.createElement('style'), { id: 'pageStyle' }));
    st.textContent = '@page{' + ({ full: 'size:letter portrait;margin:.6in', pad: 'size:4.25in 5.5in;margin:.25in', two: 'size:letter landscape;margin:.5in' })[layout] + '}';
    toast('Choose “Save as PDF” as the destination to export');
    setTimeout(function () { window.print(); }, 350);
  });
  $('#exampleBtn').addEventListener('click', function () { state = JSON.parse(JSON.stringify(EXAMPLE)); writeForm(); update(); toast('Example loaded'); });
  $('#clearBtn').addEventListener('click', function () { state = blank(); writeForm(); update(); });

  /* ---------------- Saved notes ---------------- */
  var saved = load(KEY_SAVED, []);
  function renderSaved() {
    $('#savedCount').textContent = saved.length;
    var box = $('#saved');
    if (!saved.length) { box.innerHTML = '<p class="empty" style="margin:0">No saved notes yet.</p>'; return; }
    box.innerHTML = saved.map(function (n, i) {
      return '<div class="saved__item"><div><b>' + esc(n.data.caller || 'Unnamed caller') + (n.data.urgent ? ' · URGENT' : '') + '</b><small>' + esc(n.data.company || '—') + ' · ' + esc(new Date(n.at).toLocaleString()) + '</small></div>' +
        '<button class="bb-btn bb-btn--sm" data-open="' + i + '">Open</button><button class="bb-btn bb-btn--sm bb-btn--ghost bb-btn--danger" data-del="' + i + '" aria-label="Delete note">✕</button></div>';
    }).join('');
  }
  $('#saveBtn').addEventListener('click', function () {
    readForm();
    if (!state.caller && !state.reason) { toast('Add a caller or reason first'); return; }
    saved.unshift({ at: Date.now(), data: JSON.parse(JSON.stringify(state)) });
    saved = saved.slice(0, 50); store(KEY_SAVED, saved); renderSaved(); toast('Note saved');
  });
  $('#saved').addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]'), d = e.target.closest('[data-del]');
    if (o) { state = Object.assign(blank(), JSON.parse(JSON.stringify(saved[+o.dataset.open].data))); writeForm(); update(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (d) { saved.splice(+d.dataset.del, 1); store(KEY_SAVED, saved); renderSaved(); }
  });

  /* ---------------- Quick type: plain words -> fields ---------------- */
  function parseQuick(t) {
    var o = {}, txt = t.trim();
    // "key: value" lines win
    var keyed = { caller: /^(?:caller|name)\s*:\s*(.+)$/im, company: /^(?:company|org|from)\s*:\s*(.+)$/im, phone: /^(?:phone|tel|cell)\s*:\s*(.+)$/im, forWho: /^for\s*:\s*(.+)$/im, reason: /^(?:reason|why)\s*:\s*(.+)$/im, action: /^(?:action|please)\s*:\s*(.+)$/im };
    Object.keys(keyed).forEach(function (k) { var m = txt.match(keyed[k]); if (m) o[k] = m[1].trim(); });
    var ph = txt.match(/(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
    if (!o.phone && ph) o.phone = ph[1].trim().replace(/^\+?1[\s.-]/, '');
    var em = txt.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/); if (em) o.alt = em[0];
    var flat = txt.replace(/\n+/g, ', ');
    var cap = "[A-Z][\\w’'.-]*";
    if (!o.caller) { var nm = flat.match(new RegExp('^(?:(?:call|message)\\s+(?:from|for)\\s+)?(' + cap + '(?:\\s+' + cap + '){0,2})')); if (nm) o.caller = nm[1]; }
    if (!o.company) { var co = flat.match(new RegExp('\\b(?:from|with|of|at|calling for)\\s+(' + cap + '(?:\\s+(?:' + cap + '|&|and\\s+' + cap + '))*)')); if (co && co[1] !== o.caller) o.company = co[1].replace(/\s+(?:and|&)$/, ''); }
    var tr = flat.match(/transferred\s+(?:by|from)\s+(?:the\s+)?([^,.;]+)/i);
    if (!o.reason && tr) o.reason = (o.caller ? first(o.caller) : 'Caller') + ' was transferred by the ' + tr[1].replace(/^the\s+/i, '').trim() + '.';
    var tp = flat.match(/(?:re:|regarding|about|concerning|questions?\s+(?:on|about|concerning)|wants to know about)\s*(.+)$/i);
    if (tp) o.topics = tp[1].split(/\s*(?:,|;|\band\b|\+|&)\s*/i).map(function (x) { return x.trim().replace(/\.$/, ''); }).filter(Boolean).map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1); }).join('\n');
    if (/\b(urgent|asap|emergency)\b/i.test(txt)) o.urgent = true;
    if (/\bwill call (?:you )?again\b/i.test(txt)) o.methods = ['Telephoned', 'Will call again'];
    else if (/\b(please )?call (?:back|him|her|them)|callback|return (?:the |his |her )?call\b/i.test(txt) || o.caller) o.methods = ['Telephoned', 'Please call'];
    if (!o.action && o.caller) o.action = 'Please return ' + first(o.caller) + (/’s|\'s/.test(first(o.caller)) ? '' : '’s') + ' call' + (o.topics ? ' regarding the above matters.' : '.');
    return o;
  }
  function runQuick() {
    var t = $('#quick').value; if (!t.trim()) { toast('Type something first'); return; }
    readForm(); var p = parseQuick(t), n = 0;
    Object.keys(p).forEach(function (k) { state[k] = p[k]; n++; });
    writeForm(); update(); renderLookups(); toast('Filled ' + n + ' fields — review & edit');
  }
  $('#quickBtn').addEventListener('click', runQuick);
  $('#quick').addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runQuick(); });

  /* ---------------- Lookups ---------------- */
  var cityEl = $('#city'); cityEl.value = ui.city || '';
  function g(q) { return 'https://www.google.com/search?q=' + encodeURIComponent(q); }
  function digits(p) { return String(p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); }
  function previous() {
    var d = digits(state.phone), c = (state.caller || '').trim().toLowerCase();
    return saved.filter(function (n) { return (d && digits(n.data.phone) === d) || (c && (n.data.caller || '').trim().toLowerCase() === c); })[0];
  }
  function renderLookups() {
    var box = $('#lookups'), btns = [], city = cityEl.value.trim(), s = state;
    var prev = previous();
    if (prev) btns.push({ t: '↺ Fill from previous call', run: function () {
      ['caller', 'company', 'phone', 'alt'].forEach(function (k) { if (!state[k]) state[k] = prev.data[k] || ''; });
      if (!state.refs.length) state.refs = JSON.parse(JSON.stringify(prev.data.refs || []));
      writeForm(); update(); toast('Filled from ' + new Date(prev.at).toLocaleDateString()); } });
    if (s.company) {
      btns.push({ t: '🏢 Company info → add reference', run: function () { companyInfo(s.company); } });
      btns.push({ t: 'Google company', href: g(s.company + (city ? ' ' + city : '')) });
      btns.push({ t: 'LinkedIn', href: 'https://www.linkedin.com/search/results/companies/?keywords=' + encodeURIComponent(s.company) });
    }
    if (s.phone) btns.push({ t: '☎ Who called this number?', href: g('"' + s.phone + '"') });
    else if (s.caller) btns.push({ t: '☎ Find ' + first(s.caller) + '’s number', href: g(s.caller + ' ' + (s.company || '')) });
    var topics = lines(s.topics);
    topics.slice(0, 6).forEach(function (tp) {
      btns.push({ t: '🏛 ' + (city ? city.split(',')[0] + ': ' : '') + tp, href: g((city ? city + ' ' : '') + tp + ' office phone number'),
        add: { title: (city ? city.split(',')[0] + ' — ' : '') + tp, detail: '', url: '' } });
    });
    box.innerHTML = '';
    if (!btns.length) { box.innerHTML = '<span class="bb-hint">Add a caller, company, phone or topics and lookup buttons appear here.</span>'; return; }
    btns.forEach(function (b) {
      var el = document.createElement(b.href ? 'a' : 'button'); el.className = 'bb-btn bb-btn--sm'; el.textContent = b.t;
      if (b.href) { el.href = b.href; el.target = '_blank'; el.rel = 'noopener noreferrer'; } else { el.type = 'button'; el.addEventListener('click', b.run); }
      box.appendChild(el);
      if (b.add) { var a = document.createElement('button'); a.type = 'button'; a.className = 'bb-btn bb-btn--sm bb-btn--ghost'; a.textContent = '＋ ref'; a.title = 'Add as a reference to fill in';
        a.addEventListener('click', function () { readForm(); state.refs.push(b.add); renderRefs(); update(); toast('Reference added — paste the number'); }); box.appendChild(a); }
    });
  }
  function companyInfo(q) {
    var msg = $('#lookupMsg'); msg.textContent = 'Looking up “' + q + '”…';
    fetch('https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=' + encodeURIComponent(q) + '&gsrlimit=1&prop=extracts%7Cinfo&exintro=1&explaintext=1&exsentences=2&inprop=url&format=json&origin=*')
      .then(function (r) { return r.json(); }).then(function (j) {
        var pg = j.query && Object.values(j.query.pages)[0];
        if (!pg || !pg.extract) { msg.textContent = 'No public summary found — try the Google / LinkedIn buttons.'; return; }
        readForm(); state.refs.push({ title: q, detail: pg.extract.trim(), url: pg.fullurl }); renderRefs(); update();
        msg.textContent = 'Added a reference from Wikipedia ("' + pg.title + '"). Check it is the right company.';
      }).catch(function () { msg.textContent = 'Lookup unavailable offline — use the Google / LinkedIn buttons.'; });
  }
  cityEl.addEventListener('input', function () { ui.city = cityEl.value; store(KEY_UI, ui); renderLookups(); });
  var _renderPane = renderPane; renderPane = function () { _renderPane(); renderLookups(); };

  /* ---------------- Boot ---------------- */
  if (!Array.isArray(state.refs)) state.refs = [];
  if (!Array.isArray(state.methods)) state.methods = [];
  writeForm(); renderSaved(); renderPane();

  // expose for tests
  window.__wywo = { toText: toText, toMarkdown: toMarkdown, EXAMPLE: EXAMPLE };
})();
