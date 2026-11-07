/* WYWO — While You Were Out. Plain JS, no build step. */
(function () {
  'use strict';

  /* ---------------- Constants ---------------- */
  var THEMES = [
    { id: 'bluebird',  name: 'Bluebird',         color: '#2563c9', dk: '#7aa7ff' },
    { id: 'parakeet',  name: 'Monk Parakeet',    color: '#23913f', dk: '#62d98a' },
    { id: 'cardinal',  name: 'Cardinal',         color: '#c4112f', dk: '#ff7288' },
    { id: 'goldfinch', name: 'Goldfinch',        color: '#f0b400', dk: '#ffd43b' },
    { id: 'spoonbill', name: 'Roseate Spoonbill', color: '#d9488d', dk: '#ff93c4' },
    { id: 'sparrow',   name: 'Song Sparrow',     color: '#865538', dk: '#d1a07a' },
    { id: 'robin',     name: 'American Robin',   color: '#e0651a', dk: '#ffa05c' },
    { id: 'heron',     name: 'Night-Heron',      color: '#262b36', dk: '#cdd3e0' }
  ];
  var METHODS = ['Telephoned', 'Came to see you', 'Returned your call', 'Please call', 'Will call again', 'Wants to see you'];
  var KEY_UI = 'wywo.ui', KEY_DRAFT = 'wywo.draft', KEY_SAVED = 'wywo.saved';

  var EXAMPLE = {
    forWho: 'Law Staff', urgent: false, date: today(), time: nowTime(),
    caller: 'Phil Gordon', company: 'SWA Development Corp', phone: '516-787-9090', alt: 'pgordon@swadevelopment.co · 646-898-0560',
    methods: ['Telephoned', 'Please call'],
    reason: 'Phil wants to speak with Law Staff.',
    topics: 'Industrial Zone\nDevelopment of 4 retail sites\nDevelopment of 2 residential sites',
    action: 'Please call Phil back after 3 pm.',
    extra: 'Prefers calls after 3 pm. Can also be reached by email or SMS.',
    refs: [
      { title: 'SWA Development Corp', detail: 'Company website', url: 'https://swadevelopment.co' }
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
  var TEAM = 'Check with team';
  function forLabel(s) { return String(s.forWho || '').trim() || TEAM; }
  function first(name) { var w = String(name || '').trim().split(/\s+/); if (/^(?:dr|mr|mrs|ms|mx|prof|judge|mayor|rev|sgt|capt)\.?$/i.test(w[0]) && w[1]) return w[0] + ' ' + w[1]; return w[0] || 'the caller'; }

  /* ---------------- State ---------------- */
  var form = $('#form'), pane = $('#pane');
  var state = Object.assign(blank(), load(KEY_DRAFT, {}));
  var view = 'modern';

  function blank() {
    return { forWho: '', urgent: false, date: today(), time: nowTime(), caller: '', company: '', phone: '', alt: '', methods: ['Telephoned'], reason: '', topics: '', action: '', extra: '', refs: [], signed: '', wx: null, tagsOn: { when: true, season: true, weather: true, sun: false, holiday: true } };
  }

  /* ---------------- Theme UI ---------------- */
  var ui = load(KEY_UI, {});
  function applyTheme(id) {
    var t = THEMES.filter(function (x) { return x.id === id; })[0] || THEMES[0];
    document.documentElement.dataset.theme = t.id;
    $('#themeLabel').textContent = t.name; $('#themeDot').style.background = t.color;
    Array.prototype.forEach.call(document.querySelectorAll('.bb-swatch'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === t.id)); });
    ui.theme = t.id; store(KEY_UI, ui);
    syncChrome();
  }
  function syncChrome() {
    var el = document.documentElement, t = THEMES.filter(function (x) { return x.id === el.dataset.theme; })[0] || THEMES[0];
    var dark = el.dataset.mode ? el.dataset.mode === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    $('#themeColor').content = dark ? '#0d0f14' : t.color;
  }
  THEMES.forEach(function (t) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'bb-swatch'; b.dataset.id = t.id;
    b.innerHTML = '<span class="dot"></span>' + esc(t.name);
    b.style.setProperty('--c', t.color);
    b.addEventListener('click', function () { applyTheme(t.id); });
    $('#swatches').appendChild(b);
  });
  var isMobile = function () { return matchMedia('(max-width: 760px)').matches; };
  // Mount the menu at page level: the header's blur would otherwise become the anchor for fixed children and push the sheet off-screen.
  document.body.appendChild($('#popScrim')); document.body.appendChild($('#themePop'));
  function placePop() {
    var p = $('#themePop');
    if (isMobile()) { p.style.top = p.style.right = ''; return; }
    var r = $('#themeBtn').getBoundingClientRect(); p.style.top = Math.round(r.bottom + 8) + 'px'; p.style.right = Math.max(8, Math.round(innerWidth - r.right - 8)) + 'px';
  }
  window.addEventListener('resize', function () { if (!$('#themePop').hidden) { placePop(); $('#popScrim').hidden = !isMobile(); } });
  function openPop() { $('#themePop').hidden = false; $('#themeBtn').setAttribute('aria-expanded', 'true'); placePop(); if (isMobile()) $('#popScrim').hidden = false; }
  function closePop() { $('#themePop').hidden = true; $('#popScrim').hidden = true; $('#themeBtn').setAttribute('aria-expanded', 'false'); }
  $('#themeBtn').addEventListener('click', function (e) { e.stopPropagation(); $('#themePop').hidden ? openPop() : closePop(); });
  $('#popClose').addEventListener('click', closePop);
  $('#popScrim').addEventListener('click', closePop);
  document.addEventListener('click', function (e) { if (!e.target.closest('.pop-wrap, #themePop')) closePop(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePop(); closeDrawer(); } });
  /* light / dark / auto */
  function effDark() { var el = document.documentElement; return el.dataset.mode ? el.dataset.mode === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
  function setMode(m) {
    var el = document.documentElement; if (m === 'auto') delete el.dataset.mode; else el.dataset.mode = m;
    ui.mode = m; store(KEY_UI, ui); syncChrome();
    Array.prototype.forEach.call(document.querySelectorAll('#modeSeg button'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === m)); });
    var d = effDark(); $('#modeBtn').textContent = d ? '☀️' : '🌙'; $('#modeBtn').setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode');
  }
  $('#modeBtn').addEventListener('click', function () { setMode(effDark() ? 'light' : 'dark'); });
  $('#modeSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setMode(b.dataset.mode); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (!document.documentElement.dataset.mode) setMode('auto'); });
  applyTheme(document.documentElement.dataset.theme);
  setMode(ui.mode || 'auto');

  /* App icon (favicon + touch icon) — six tree icons, Cedar by default */
  var TREES = [
    { id: 'cedar', name: 'Cedar', tip: 'Blue-green cedar & warm wood grain (default)' }, { id: 'pine', name: 'Pine', tip: 'Evergreen needles & amber resin' },
    { id: 'maple', name: 'Maple', tip: 'Crimson & burnt-orange leaves' }, { id: 'hazelnut', name: 'Hazelnut', tip: 'Hazel brown, cream & olive' },
    { id: 'linden', name: 'Linden', tip: 'Luminous green heart-leaf' }, { id: 'beech', name: 'Beech', tip: 'Copper leaves & silver bark' }
  ];
  var forest = 'cedar';
  function applyIcon(id) {
    var t = TREES.filter(function (x) { return x.id === id; })[0] || TREES[0], d = 'assets/icons/' + t.id + '/';
    var dflt = t.id === 'cedar';
    $('#fav32').href = dflt ? 'favicon-32x32.png' : d + 'favicon-32.png';
    $('#fav16').href = dflt ? 'favicon-16x16.png' : d + 'favicon-16.png';
    $('#appleIcon').href = dflt ? 'apple-touch-icon.png' : d + 'apple-touch-icon.png';
    Array.prototype.forEach.call(document.querySelectorAll('.icon-btn'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === t.id)); });
    forest = t.id; Array.prototype.forEach.call(document.querySelectorAll('use.art-ref'), function (u) { u.setAttribute('href', '#' + (u.dataset.kind === 'strip' ? 'strip' : 'art') + '-' + t.id); });
    ui.icon = t.id; store(KEY_UI, ui);
  }
  TREES.forEach(function (t) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'icon-btn'; b.dataset.id = t.id; b.title = t.name + ' — ' + t.tip;
    b.innerHTML = '<img src="assets/icons/' + t.id + '/favicon-48.png" alt="" width="44" height="44">' + esc(t.name);
    b.addEventListener('click', function () { applyIcon(t.id); toast('🌲 ' + t.name + ' forest'); if (view === 'modern') renderPane(); });
    $('#icons').appendChild(b);
  });
  applyIcon(ui.icon || 'cedar');
  var artToggle = $('#artToggle'); artToggle.checked = ui.art !== false; document.documentElement.dataset.art = artToggle.checked ? 'on' : 'off';
  artToggle.addEventListener('change', function () { ui.art = artToggle.checked; store(KEY_UI, ui); document.documentElement.dataset.art = ui.art ? 'on' : 'off'; });
  var sizeSel = $('#sizeSel'); sizeSel.value = document.documentElement.dataset.size || 'l';
  sizeSel.addEventListener('change', function () { document.documentElement.dataset.size = sizeSel.value; ui.size = sizeSel.value; store(KEY_UI, ui); });

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
    normTags(); syncBw(); scheduleTagIfStale();
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
    var h = '<article class="note"><svg class="note__art" viewBox="0 0 320 200" aria-hidden="true"><use class="art-ref" href="#art-' + forest + '"/></svg>';
    h += '<div class="note__top"><div class="note__brand"><svg class="note__mark" viewBox="0 0 512 512" aria-hidden="true"><use href="#wywo-mark"/></svg><div><div class="note__kicker">While You Were Out</div><div class="note__title">Callback request</div></div></div>' +
      '<div class="note__meta">' + (s.urgent ? '<span class="bb-badge bb-badge--danger">URGENT</span><br>' : '') +
      '<div class="note__for">Call is for <span class="for-badge' + (String(s.forWho || '').trim() ? '' : ' for-badge--team') + '">' + esc(forLabel(s)) + '</span></div>' + esc(fmtDate(s.date, s.time)) + '</div></div>';
    h += '<div class="note__caller"><span class="name">' + (s.caller ? esc(s.caller) : '<span class="empty">Caller name</span>') + '</span>' +
      (s.company ? '<span class="company">' + esc(s.company) + '</span>' : '') +
      (s.phone ? (tel ? '<a class="note__phone" href="' + esc(tel) + '">' + esc(s.phone) + '</a>' : '<span class="note__phone">' + esc(s.phone) + '</span>') : '') +
      (s.alt ? '<span>' + esc(s.alt) + '</span>' : '') + '</div>';
    if (s.methods.length) h += '<div class="chips">' + s.methods.map(function (m) { return '<span class="bb-badge">' + esc(m) + '</span>'; }).join('') + '</div>';
    h += condHtml(s);
    if (s.reason || topics.length) {
      h += '<div><h3>Reason for call</h3>' + (s.reason ? '<p>' + esc(s.reason) + '</p>' : '');
      if (topics.length) h += (s.reason ? '<p style="margin-top:.5em">' + esc(first(s.caller)) + ' has questions concerning:</p>' : '') + '<ul>' + topics.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
      h += '</div>';
    }
    if (s.action) h += '<div><h3>Requested action</h3><p>' + esc(s.action) + '</p></div>';
    if (s.extra && s.extra.trim()) h += '<div><h3>Additional notes</h3><p>' + esc(s.extra) + '</p></div>';
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
    var topics = lines(s.topics);
    var msg = [s.reason, topics.length ? 'Questions re: ' + topics.join(', ') + '.' : '', s.action, s.extra && s.extra.trim(), condLine(s) && 'Notes: ' + condLine(s) + '.',
      s.refs.filter(function (r) { return r.title || r.detail; }).map(function (r) { return r.title + (r.detail ? ' — ' + r.detail : ''); }).join('\n')].filter(Boolean).join('\n');
    var f = function (label, v, extra) { return '<div class="ln"><span class="lbl2">' + label + '</span><span class="hw">' + esc(v) + '</span>' + (extra || '') + '</div>'; };
    return '<div class="slip">' +
      '<div class="urgent2"><span class="lbl2">Urgent</span><b>' + (s.urgent ? '✓' : '') + '</b></div>' +
      f('For', forLabel(s)) +
      '<div class="ln"><span class="lbl2">Date</span><span class="hw">' + esc(s.date ? fmtDate(s.date, '') : '') + '</span><span class="lbl2">Time</span><span class="hw" style="flex:.6">' + esc(s.time ? fmtDate('', s.time) : '') + '</span></div>' +
      '<div class="banner">While You Were Out</div>' +
      f('M', s.caller) +
      '<div class="two"><div>' + f('Of', s.company) + f('Phone', s.phone) + f('Cell / Fax', s.alt) + '</div>' +
      '<div class="opts">' + METHODS.map(box).join('') + '</div></div>' +
      '<div class="msg-title">Message</div><div class="lines">' + esc(msg) + '</div>' +
      '<div class="sign"><span class="hw">' + esc(s.signed) + '</span><span class="lbl2">Signed</span></div></div>';
  }

  function toText(s) {
    var o = [], refs = s.refs.filter(function (r) { return r.title || r.detail || r.url; }), topics = lines(s.topics);
    o.push('WHILE YOU WERE OUT', '');
    o.push(s.urgent ? 'CALLBACK REQUEST — URGENT' : 'CALLBACK REQUEST', '');
    o.push('CALL IS FOR: ' + forLabel(s));
    if (fmtDate(s.date, s.time)) o.push('DATE: ' + fmtDate(s.date, s.time));
    if (condLine(s)) o.push('CONDITIONS: ' + condLine(s));
    o.push('');
    o.push('CALLER: ' + s.caller, 'COMPANY: ' + s.company, 'PHONE: ' + s.phone);
    if (s.alt) o.push('ALSO: ' + s.alt);
    if (s.methods.length) o.push('TYPE: ' + s.methods.join(', '));
    if (s.reason || topics.length) {
      o.push('', '—'.repeat(3), '', 'REASON FOR CALL', '');
      if (s.reason) o.push(s.reason, '');
      if (topics.length) o.push(first(s.caller) + ' has questions concerning:', '', topics.join('\n'));
    }
    if (s.action) o.push('', '—'.repeat(3), '', 'REQUESTED ACTION', '', s.action);
    if (s.extra && s.extra.trim()) o.push('', '—'.repeat(3), '', 'ADDITIONAL NOTES', '', s.extra.trim());
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
    o.push('**Call is for:** ' + forLabel(s) + '  ');
    if (fmtDate(s.date, s.time)) o.push('**Date:** ' + fmtDate(s.date, s.time) + '  ');
    if (condLine(s)) o.push('**Conditions:** ' + condLine(s) + '  ');
    o.push('**Caller:** ' + s.caller + '  ', '**Company:** ' + s.company + '  ', '**Phone:** ' + s.phone);
    if (s.alt) o.push('', '**Also:** ' + s.alt);
    if (s.reason || topics.length) {
      o.push('', '### Reason for call', '');
      if (s.reason) o.push(s.reason, '');
      if (topics.length) o.push(first(s.caller) + ' has questions concerning:', '', topics.map(function (t) { return '- ' + t; }).join('\n'));
    }
    if (s.action) o.push('', '### Requested action', '', s.action);
    if (s.extra && s.extra.trim()) o.push('', '### Additional notes', '', s.extra.trim());
    if (refs.length) {
      o.push('', '### Relevant reference information');
      refs.forEach(function (r) { o.push('', '**' + r.title + '**', [r.detail, r.url].filter(Boolean).join('  \n')); });
    }
    if (s.signed) o.push('', '_Taken by ' + s.signed + '_');
    return o.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  function currentText() { return view === 'markdown' ? toMarkdown(state) : toText(state); }

  function renderPane() {
    previewBw();
    if (view === 'modern') pane.innerHTML = renderModern(state);
    else if (view === 'classic') pane.innerHTML = renderClassic(state);
    else pane.innerHTML = '<textarea class="textbox" readonly aria-label="' + view + ' output" wrap="off">' + esc(currentText()) + '</textarea>';
  }

  var raf = 0;
  function update() { readForm(); store(KEY_DRAFT, state); cancelAnimationFrame(raf); raf = requestAnimationFrame(renderPane); }

  /* ---------------- Tabs ---------------- */
  $('#tabs').addEventListener('click', function (e) {
    var b = e.target.closest('.seg__b'); if (!b) return;
    view = b.dataset.view;
    Array.prototype.forEach.call(document.querySelectorAll('.seg__b'), function (t) { t.setAttribute('aria-selected', String(t === b)); });
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
  // Usable area per layout in CSS px (96 per inch) after @page margins; each slip must fit ONE page.
  var PAGE = { full: { w: 700, h: 930, cols: 1 }, pad: { w: 360, h: 470, cols: 1 }, two: { w: 450, h: 710, cols: 2 } };
  function fitToPage(area, layout) {
    var P = PAGE[layout], els = Array.prototype.slice.call(area.querySelectorAll('.note, .slip'));
    area.style.cssText = 'display:block;position:absolute;left:-99999px;top:0;visibility:hidden;width:' + (P.w * P.cols + (P.cols > 1 ? 38 : 0)) + 'px';
    var start = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs')) || 1.15, fs = Math.min(start, layout === 'full' ? start : 1);
    for (; fs > 0.3; fs -= 0.02) {
      els.forEach(function (e) { e.style.setProperty('--fs', fs.toFixed(2)); });
      if (els.every(function (e) { return e.offsetHeight <= P.h; })) break;
    }
    area.style.cssText = '';
    return fs;
  }
  $('#printBtn').addEventListener('click', function () {
    var layout = $('#printLayout').value, one = view === 'classic' ? renderClassic(state) : renderModern(state);
    var n = layout === 'two' ? 2 : 1, h = '';
    for (var i = 0; i < n; i++) h += one;
    var area = $('#printArea');
    area.innerHTML = '<div class="pa-sheet ' + layout + '">' + h + '</div>';
    fitToPage(area, layout);
    var st = $('#pageStyle') || document.head.appendChild(Object.assign(document.createElement('style'), { id: 'pageStyle' }));
    st.textContent = '@page{' + ({ full: 'size:letter portrait;margin:.6in', pad: 'size:4.25in 5.5in;margin:.25in', two: 'size:letter landscape;margin:.5in' })[layout] + '}';
    toast('Choose “Save as PDF” as the destination to export');
    setTimeout(function () { window.print(); }, 350);
  });
  $('#exampleBtn').addEventListener('click', function () { state = JSON.parse(JSON.stringify(EXAMPLE)); writeForm(); update(); toast('Example loaded'); });
  var clearDlg = $('#clearDlg');
  $('#clearBtn').addEventListener('click', function () { $('#clearSure').checked = false; $('#clearGo').disabled = true; if (clearDlg.showModal) clearDlg.showModal(); else clearDlg.setAttribute('open', ''); });
  $('#clearSure').addEventListener('change', function () { $('#clearGo').disabled = !this.checked; });
  $('#clearCancel').addEventListener('click', function () { clearDlg.close ? clearDlg.close() : clearDlg.removeAttribute('open'); });
  clearDlg.addEventListener('click', function (e) { if (e.target === clearDlg) clearDlg.close(); });
  $('#clearGo').addEventListener('click', function () {
    if (!$('#clearSure').checked) return;
    state = blank(); $('#quick').value = ''; writeForm(); update();
    clearDlg.close ? clearDlg.close() : clearDlg.removeAttribute('open'); toast('🗑 Cleared. Fresh note ready'); $('#quick').focus();
  });

  /* ---------------- Saved notes ---------------- */
  var saved = load(KEY_SAVED, []);
  function renderSaved() {
    $('#savedCount').textContent = saved.length;
    var box = $('#saved');
    if (!saved.length) { box.innerHTML = '<div class="empty-art"><svg viewBox="0 0 320 200" aria-hidden="true"><use class="art-ref" href="#art-' + forest + '"/></svg><p>No saved notes yet.<br>Press <b>💾 Save</b> on a note and it appears here.</p></div>'; return; }
    box.innerHTML = saved.map(function (n, i) {
      var d = n.data, snip = d.reason || lines(d.topics).join(', ') || d.extra || '';
      return '<div class="saved__item"><b>' + esc(d.caller || 'Unnamed caller') + (d.urgent ? ' 🚨' : '') + '</b><small>' + esc(d.company || '—') + ' · ' + esc(new Date(n.at).toLocaleString()) + '</small>' +
        (snip ? '<p>' + esc(snip) + '</p>' : '') +
        '<div class="saved__act"><button class="bb-btn bb-btn--sm" data-open="' + i + '">Open</button><button class="bb-btn bb-btn--sm bb-btn--ghost bb-btn--danger" data-del="' + i + '">Delete</button></div></div>';
    }).join('');
  }
  function openDrawer() { $('#drawer').hidden = false; $('#scrim').hidden = false; $('#notesBtn').setAttribute('aria-expanded', 'true'); }
  function closeDrawer() { $('#drawer').hidden = true; $('#scrim').hidden = true; $('#notesBtn').setAttribute('aria-expanded', 'false'); }
  $('#notesBtn').addEventListener('click', function () { $('#drawer').hidden ? openDrawer() : closeDrawer(); });
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#scrim').addEventListener('click', closeDrawer);
  $('#saveBtn').addEventListener('click', function () {
    readForm();
    if (!state.caller && !state.reason) { toast('Add a caller or reason first'); return; }
    saved.unshift({ at: Date.now(), data: JSON.parse(JSON.stringify(state)) });
    saved = saved.slice(0, 50); store(KEY_SAVED, saved); renderSaved(); toast('Note saved');
  });
  $('#saved').addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]'), d = e.target.closest('[data-del]');
    if (o) { state = Object.assign(blank(), JSON.parse(JSON.stringify(saved[+o.dataset.open].data))); writeForm(); update(); closeDrawer(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (d) { saved.splice(+d.dataset.del, 1); store(KEY_SAVED, saved); renderSaved(); }
  });

  /* ---------------- Quick type: plain words -> fields ---------------- */
  var parseQuick = QuickType.parse;
  function runQuick() {
    var t = $('#quick').value; if (!t.trim()) { toast('Type something first'); return; }
    readForm(); var p = parseQuick(t), n = 0;
    Object.keys(p).forEach(function (k) {
      if (k === '__cats') return;
      if (k === 'refs') { p.refs.forEach(function (r) { if (!state.refs.some(function (x) { return x.url === r.url; })) state.refs.push(r); }); n += p.refs.length; return; }
      state[k] = p[k]; n++;
    });
    writeForm(); update(); toast('Organized — ' + n + ' fields filled. Check the note, edit anything.');
  }
  $('#quickBtn').addEventListener('click', runQuick);
  $('#quick').addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runQuick(); });

  /* ---------------- 🐦 Bird Seed ---------------- */
  var dlg = $('#seedDlg'), seedRes = [], cityEl = $('#city');
  cityEl.value = ui.city == null ? 'Long Beach, NY' : ui.city;
  cityEl.addEventListener('input', function () { ui.city = cityEl.value; store(KEY_UI, ui); });
  /* look-up engine (website reader) — keys stay in this browser only */
  var KEYS = load('wywo.keys', {}), engId = ui.engine || 'reader';
  var ENOTE = {
    reader: 'Free, no key. Reads public web pages through the Jina Reader service (r.jina.ai). Only the company website address is sent.',
    firecrawl: 'Firecrawl (firecrawl.dev) reads the site using your API key. The key stays in this browser and is sent only to api.firecrawl.dev. Beta: needs your key to try.',
    crawl4ai: 'Crawl4AI (crawl4ai.com). Use their cloud with your key, or your own self-hosted server URL (it must allow browser requests). Beta: needs your key or server to try.',
    scrapegraph: 'ScrapeGraphAI (scrapegraphai.com) uses AI to pull name, phones, emails and address from the site with your API key. The key stays in this browser and is sent only to scrapegraphai.com. Beta: needs your key to try.'
  };
  var esel = $('#engineSel');
  BirdSeed.ENGINES.forEach(function (e) { var o = document.createElement('option'); o.value = e.id; o.textContent = e.name + (e.needs ? ' (your key)' : ''); esel.appendChild(o); });
  function showEngine() {
    var e = BirdSeed.ENGINES.filter(function (x) { return x.id === esel.value; })[0] || BirdSeed.ENGINES[0];
    $('#engineName').textContent = e.name.replace(' (free, no key)', ' (free)');
    $('#keyRow').hidden = !e.needs; $('#urlRow').hidden = !e.url;
    $('#keyLbl').textContent = e.name + ' API key' + (e.id === 'crawl4ai' ? ' / token' : '');
    $('#engineKey').value = KEYS[e.id] || ''; $('#engineUrl').value = KEYS.c4url || '';
    $('#engineNote').textContent = ENOTE[e.id];
  }
  esel.value = engId; showEngine();
  esel.addEventListener('change', function () { ui.engine = esel.value; store(KEY_UI, ui); showEngine(); });
  $('#engineKey').addEventListener('input', function () { KEYS[esel.value] = this.value.trim(); store('wywo.keys', KEYS); });
  $('#engineUrl').addEventListener('input', function () { KEYS.c4url = this.value.trim(); store('wywo.keys', KEYS); });
  var allIds = BirdSeed.SEEDS.map(function (x) { return x.id; });
  var picked = (ui.seeds || []).filter(function (id) { return allIds.indexOf(id) > -1; }); if (!picked.length) picked = allIds;
  var grid = $('#seedGrid');
  BirdSeed.SEEDS.forEach(function (sd) {
    var l = document.createElement('label'); l.className = 'seed-card';
    l.innerHTML = '<input type="checkbox" value="' + sd.id + '"' + (picked.indexOf(sd.id) > -1 ? ' checked' : '') + '><span class="seed-card__e">' + sd.emoji + '</span><span><b>' + esc(sd.name) + '</b> <em>' + esc(sd.does) + '</em><small>' + esc(sd.hint) + '</small></span>';
    grid.appendChild(l);
  });
  function seedBoxes() { return Array.prototype.slice.call(grid.querySelectorAll('input')); }
  function syncAll() { var b = seedBoxes(); $('#seedAll').checked = b.every(function (x) { return x.checked; }); $('#seedAll').indeterminate = !$('#seedAll').checked && b.some(function (x) { return x.checked; }); ui.seeds = b.filter(function (x) { return x.checked; }).map(function (x) { return x.value; }); store(KEY_UI, ui); $('#scatterBtn').disabled = !ui.seeds.length; }
  grid.addEventListener('change', syncAll);
  $('#seedAll').addEventListener('change', function () { var on = this.checked; seedBoxes().forEach(function (x) { x.checked = on; }); syncAll(); });
  syncAll();

  function seedStep(n) {
    $('#seedStep1').hidden = n !== 1; $('#seedStep2').hidden = n !== 2;
    $('#scatterBtn').hidden = n !== 1; $('#seedAdd').hidden = n !== 2; $('#seedBack').hidden = n !== 2;
    $('#seedSub').textContent = n === 1 ? '' : 'Here’s what we found. Tick what you want added to the note. Guesses are never ticked for you.'; $('#seedSub').hidden = n === 1;
  }
  function openSeed() {
    readForm(); seedStep(1);
    var site = (state.refs || []).map(function (r) { return r.url || ''; }).filter(function (u) { return /^https?:\/\//i.test(u) && !/(linkedin|facebook|instagram|twitter|x\.com|youtube|google|wikipedia|longbeachny\.gov)/i.test(u); })[0];
    if (site && !$('#seedSite').value) $('#seedSite').value = site; if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  function closeSeed() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  $('#birdBtn').addEventListener('click', openSeed);
  $('#seedClose').addEventListener('click', closeSeed);
  $('#seedBack').addEventListener('click', function () { seedStep(1); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeSeed(); });

  var TRUST = { verified: ['✓ From a source', 'tr tr--v'], derived: ['Worked out from your note', 'tr tr--d'], guess: ['Guess — confirm first', 'tr tr--g'] };
  function sgRow(x, i) {
    var t = x.apply.kind === 'link' ? ['Opens in a new tab', 'tr tr--d'] : (TRUST[x.trust] || TRUST.derived);
    var lead = x.apply.kind === 'link' ? '<a class="bb-btn bb-btn--sm" href="' + esc(x.apply.url) + '" target="_blank" rel="noopener noreferrer">Open ↗</a>' : '<span class="sg__lead"><input type="checkbox" data-i="' + i + '"' + (x.checked ? ' checked' : '') + ' aria-label="Add to note: ' + esc(x.label) + '"><span class="sg__add">Add?</span></span>';
    return '<label class="sg">' + lead + '<span class="sg__t"><b>' + esc(x.label) + '</b><span class="sg__v">' + esc(x.value) + '</span><small><span class="' + t[1] + '">' + t[0] + '</span>' + (x.source ? ' · ' + esc(x.source) : '') + (x.srcUrl ? ' · <a href="' + esc(x.srcUrl) + '" target="_blank" rel="noopener noreferrer">see source ↗</a>' : '') + '</small></span></label>';
  }
  function renderSeedResults() {
    var n = 0, html = '';
    var found = seedRes.reduce(function (a, r) { return a + (r.pending ? 0 : r.suggestions.filter(function (x) { return x.apply.kind !== 'link'; }).length); }, 0), pend = seedRes.some(function (r) { return r.pending; });
    html += '<div class="seedsum">' + (pend ? '🌱 Looking things up…' : found ? '✅ Found <b>' + found + '</b> detail' + (found === 1 ? '' : 's') + ' to review. Nothing is added until you tick it.' : '😕 Nothing to add yet. Try pasting the company <b>website</b> in the box on the previous screen.') + '</div>';
    seedRes.forEach(function (r) {
      html += '<section class="sgrp"><h3>' + r.seed.emoji + ' ' + esc(r.seed.name) + ' <em>' + esc(r.seed.does) + '</em></h3>';
      if (r.pending) html += '<p class="bb-hint">🌱 Looking…</p>';
      else {
        if (r.message) html += '<p class="bb-hint">' + esc(r.message) + '</p>';
        html += r.suggestions.map(function (x) { var i = r.all.indexOf(x); n += x.checked ? 1 : 0; return sgRow(x, i); }).join('');
      }
      html += '</section>';
    });
    $('#seedResults').innerHTML = html;
    updateAddBtn();
  }
  function seedCfg() { return { id: esel.value, keys: { firecrawl: KEYS.firecrawl, crawl4ai: KEYS.crawl4ai, scrapegraph: KEYS.scrapegraph }, c4url: KEYS.c4url }; }
  $('#seedCheckBtn').addEventListener('click', function () {
    var box = $('#seedCheck'); box.hidden = false; box.innerHTML = '<p class="bb-hint">🩺 Testing each look-up service from your browser…</p>';
    BirdSeed.selfCheck({ engine: seedCfg() }).then(function (rows) {
      var ok = rows.filter(function (r) { return r.ok; }).length;
      box.innerHTML = '<div class="seedcheck__h">' + (ok === rows.length ? '✅ All look-up tools are working' : '⚠️ ' + ok + ' of ' + rows.length + ' tools working') + '</div>' + rows.map(function (r) {
        return '<div class="seedcheck__r ' + (r.ok ? 'ok' : 'bad') + '"><span>' + (r.ok ? '✅' : '❌') + '</span><b>' + esc(r.name) + '</b><small>' + esc(r.detail) + ' · ' + r.ms + ' ms</small></div>';
      }).join('');
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  });
  $('#seedDemoBtn').addEventListener('click', function () {
    readForm();
    if ((state.caller || state.company || state.reason) && !confirm('Replace the current note with the demo call (a real public organisation, so every seed has something to find)?')) return;
    state = Object.assign(blank(), JSON.parse(JSON.stringify(BirdSeed.DEMO))); writeForm(); update();
    $('#seedSite').value = ''; toast('▶ Demo loaded: City of Long Beach'); $('#scatterBtn').click();
  });
  function updateAddBtn() { var c = $('#seedResults').querySelectorAll('input[type=checkbox]:checked').length; $('#seedAdd').textContent = c ? 'Add ' + c + ' to my note' : 'Nothing ticked'; $('#seedAdd').disabled = !c; }
  $('#seedResults').addEventListener('change', function (e) { var i = e.target.dataset.i; if (i != null && window.__seedAll) window.__seedAll[i].checked = e.target.checked; updateAddBtn(); });

  $('#scatterBtn').addEventListener('click', function () {
    readForm();
    var ids = ui.seeds.slice(); if (!ids.length) return;
    seedRes = ids.map(function (id) { return { seed: BirdSeed.SEEDS.filter(function (x) { return x.id === id; })[0], pending: true, suggestions: [] }; });
    window.__seedAll = []; seedStep(2); renderSeedResults();
    BirdSeed.scatter(ids, { state: JSON.parse(JSON.stringify(state)), saved: saved, city: cityEl.value, website: $('#seedSite').value, engine: { id: esel.value, keys: { firecrawl: KEYS.firecrawl, crawl4ai: KEYS.crawl4ai, scrapegraph: KEYS.scrapegraph }, c4url: KEYS.c4url } }, function (r) {
      var slot = seedRes.filter(function (x) { return x.seed.id === r.seed.id; })[0];
      slot.pending = false; slot.message = r.message; slot.suggestions = r.suggestions; slot.all = window.__seedAll;
      r.suggestions.forEach(function (x) { window.__seedAll.push(x); });
      renderSeedResults();
    });
  });

  function applySg(a) { return BirdSeed.apply(state, a); }
  $('#seedAdd').addEventListener('click', function () {
    readForm(); var n = 0;
    (window.__seedAll || []).forEach(function (x) { if (x.checked && x.apply.kind !== 'link') n += applySg(x.apply); });
    writeForm(); update(); closeSeed();
    toast(n ? '🐦 Added ' + n + ' detail' + (n > 1 ? 's' : '') + ' to your note' : 'Nothing new to add');
  });

  /* ---------------- 🌤 Bird Watch: weather & time tags + weather panel ---------------- */
  var BW = BirdWatch, wxData = null, wxTimer = 0;
  var TAGS = [['when', '🗓 Day & time'], ['season', '🍂 Season'], ['weather', '🌦 Weather'], ['sun', '🌇 Sunrise & sunset'], ['holiday', '🇺🇸 Holiday']];
  function allPlaces() { return BW.PLACES.concat(ui.places || []); }
  function placeById(id) { return allPlaces().filter(function (p) { return p.id === id; })[0] || BW.PLACES[0]; }
  function curPlace() { return placeById(ui.place || 'long-beach'); }
  function U() { return ui.units === 'metric' ? 'metric' : 'imperial'; }
  function normTags() { state.tagsOn = Object.assign({ when: true, season: true, weather: true, sun: false, holiday: true }, state.tagsOn || {}); }
  function condHtml(s) {
    var c = BW.conditions(s, U());
    return c.length ? '<div class="note__conds">' + c.map(function (x) { return '<span class="cond cond--' + x.k + '"><i aria-hidden="true">' + x.ico + '</i>' + esc(x.text) + '</span>'; }).join('') + '</div>' : '';
  }
  function condLine(s) { return BW.conditions(s, U()).filter(function (c) { return !c.d; }).map(function (c) { return c.text; }).join(' · '); }

  // form section
  var bwT = $('#bwToggles');
  TAGS.forEach(function (t) { var l = document.createElement('label'); l.className = 'bb-check'; l.innerHTML = '<input type="checkbox" data-k="' + t[0] + '"> ' + esc(t[1]); bwT.appendChild(l); });
  bwT.addEventListener('change', function (e) {
    var k = e.target.dataset.k; if (!k) return;
    readForm(); normTags(); state.tagsOn[k] = e.target.checked;
    if (k === 'weather' && e.target.checked && !state.wx) tagWeather();
    update(); previewBw();
  });
  function fillPlaces(sel) {
    var cur = ui.place || 'long-beach';
    sel.innerHTML = allPlaces().map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === cur ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('');
  }
  function syncBw() {
    normTags();
    Array.prototype.forEach.call(bwT.querySelectorAll('input'), function (i) { i.checked = !!state.tagsOn[i.dataset.k]; });
    fillPlaces($('#bwPlace')); $('#bwAuto').checked = ui.auto !== false;
    previewBw();
  }
  function previewBw() {
    if (!$('#bwSummary')) return;
    var c = BW.conditions(state, U()).filter(function (x) { return !x.d; });
    $('#bwSummary').textContent = c.length ? c.map(function (x) { return x.text.replace(/ \(.*?\)/, ''); }).slice(0, 4).join(' · ') : 'day · time · season · weather';
    $('#bwPreview').innerHTML = condHtml(state) || '<p class="bb-hint">Nothing tagged yet.</p>';
    if (state.wx && state.tagsOn.weather && state.wx.at !== state.date + ' ' + (state.time || '') && ui.auto === false) bwStatus('Date or time changed. Press “Tag weather now” to refresh the weather.');
  }
  function bwStatus(msg) { $('#bwStatus').textContent = msg || ''; }
  function tagWeather() {
    readForm(); normTags();
    if (!state.date) { bwStatus('Pick a date first.'); return Promise.resolve(); }
    var p = curPlace(), d0 = state.date, t0 = state.time;
    bwStatus('Looking up weather in ' + p.name + '…');
    return BW.at(p, state.date, state.time || '12:00').then(function (w) {
      if (state.date !== d0 || state.time !== t0) return;      // edited while loading; a newer lookup is coming
      w.at = d0 + ' ' + (t0 || ''); state.wx = w; state.tagsOn.weather = true; update(); syncBw();
      bwStatus('✓ Tagged: ' + BW.describe(w.code) + ', ' + BW.T(w.temp, U()) + BW.TU(U()) + ' in ' + p.name + '.');
    }).catch(function (e) { bwStatus('⚠ ' + e.message + '. Day, time and season are still tagged.'); });
  }
  function scheduleTag() { clearTimeout(wxTimer); if (ui.auto === false || state.tagsOn.weather === false) return; wxTimer = setTimeout(tagWeather, 700); }
  function scheduleTagIfStale() { if (!state.wx || state.wx.at !== state.date + ' ' + (state.time || '')) scheduleTag(); }
  form.addEventListener('input', function (e) { if (e.target.name === 'date' || e.target.name === 'time') scheduleTag(); });
  $('#bwFetch').addEventListener('click', tagWeather);
  $('#bwAuto').addEventListener('change', function () { ui.auto = this.checked; store(KEY_UI, ui); if (this.checked) scheduleTagIfStale(); });
  $('#bwPlace').addEventListener('change', function () { ui.place = this.value; store(KEY_UI, ui); fillPlaces($('#wxPlace')); refreshChip(); state.wx = null; scheduleTag(); });

  // header chip + the full-screen Bird Watch view
  var V = BirdWatchView, wvTab = 'now', wvAir = null, wvTides = null, wvNowcast = null;
  var wvEl = $('#wxView');
  function wvOpen() { return !wvEl.hidden; }
  function nowNaive() { var d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()); }
  function vctx() { var lt = wxData && wxData.localTime ? BW.noaaTime(String(wxData.localTime).replace('T', ' ')) : NaN; return { units: U(), nowMs: isFinite(lt) ? lt : nowNaive(), days: wxData ? wxData.days : [] }; }
  function wvResetData() { wvAir = wvTides = wvNowcast = null; wxData = null; }
  function refreshChip() {
    var p = curPlace(), chip = $('#wxChip');
    return BW.load(p).then(function (d) {
      wxData = d; var n = d.now, u = U();
      chip.hidden = false; chip.dataset.tone = BW.tone(n.code);
      $('#wxChipI').textContent = BW.emoji(n.code, n.day); $('#wxChipT').textContent = BW.T(n.temp, u) + BW.TU(u); $('#wxChipD').textContent = BW.describe(n.code);
      chip.setAttribute('aria-label', 'Weather in ' + p.name + ': ' + BW.describe(n.code) + ', ' + BW.T(n.temp, u) + BW.TU(u) + '. Open Bird Watch.');
      if (wvOpen()) { renderHero(); renderBody(); }
    }, function (e) { chip.hidden = true; wxData = null; if (wvOpen()) { $('#wvHero').innerHTML = V.status('err', e.message + '.'); $('#wvBody').innerHTML = ''; } });
  }
  function renderHero() {
    var box = $('#wvHero');
    if (!wxData) { box.innerHTML = V.status('load', 'Loading the weather for ' + curPlace().name + '…'); return; }
    box.innerHTML = V.hero(wxData, vctx());
    var art = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); art.setAttribute('class', 'wv-art'); art.setAttribute('viewBox', '0 0 372 96'); art.setAttribute('aria-hidden', 'true');
    art.innerHTML = '<use class="art-ref" data-kind="strip" href="#strip-' + forest + '"/>'; box.firstChild.appendChild(art);
  }
  function loadTab(t) {
    var p = curPlace(), gone = function () { return !wvOpen() || wvTab !== t || curPlace().id !== p.id; };
    if (t === 'rain' && wvNowcast === null) BW.loadNowcast(p).then(function (m) { wvNowcast = m; if (!gone()) renderBody(); });
    if (t === 'aqi' && !wvAir) BW.loadAir(p).then(function (a) { wvAir = a; if (!gone()) renderBody(); }, function (e) { if (!gone()) $('#wvBody').innerHTML = V.status('err', e.message + '.'); });
    if (t === 'tides' && !wvTides) BW.loadTides(p).then(function (x) { wvTides = x; if (!gone()) renderBody(); }, function (e) { if (!gone()) $('#wvBody').innerHTML = V.status('err', e.message + '.'); });
  }
  function renderBody() {
    var body = $('#wvBody'), c = vctx();
    if (wvTab === 'tides') { if (!wvTides) { body.innerHTML = V.status('load', 'Reading the tide tables for ' + curPlace().name + '…'); loadTab('tides'); return; } body.innerHTML = V.tides(wvTides, c); return; }
    if (wvTab === 'aqi') { if (!wvAir) { body.innerHTML = V.status('load', 'Checking the air quality…'); loadTab('aqi'); return; } body.innerHTML = V.aqi(wvAir, c); return; }
    if (!wxData) { body.innerHTML = ''; return; }
    if (wvTab === 'rain') { if (wvNowcast === null) loadTab('rain'); body.innerHTML = V.rain(wxData, c, wvNowcast || []); return; }
    body.innerHTML = wvTab === 'uv' ? V.uv(wxData, c) : V.now(wxData, c);
  }
  function setTabs() { Array.prototype.forEach.call(document.querySelectorAll('#wxTabs button'), function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === wvTab)); }); }
  function openWx(tab) {
    readForm(); closeDrawer(); closePop(); wvTab = tab || 'now'; fillPlaces($('#wxPlace')); syncUnits(); setTabs();
    wvEl.hidden = false; document.body.classList.add('wv-open'); renderHero(); renderBody(); if (!wxData) refreshChip();
    $('#wvScroll').scrollTop = 0; $('#wxClose').focus();
  }
  function closeWx() { wvEl.hidden = true; document.body.classList.remove('wv-open'); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && wvOpen()) closeWx(); });
  $('#wxChip').addEventListener('click', function () { openWx('now'); });
  $('#mWx').addEventListener('click', function () { openWx('now'); });
  $('#wxClose').addEventListener('click', closeWx);
  $('#wxTabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; wvTab = b.dataset.tab; setTabs(); renderBody(); });
  $('#wvBody').addEventListener('click', function (e) { if (e.target.closest('[data-retry]')) { wvTides = wvAir = null; renderBody(); } });
  $('#wvHero').addEventListener('click', function (e) { if (e.target.closest('[data-retry]')) refreshChip(); });
  $('#wxPlace').addEventListener('change', function () { ui.place = this.value; store(KEY_UI, ui); fillPlaces($('#bwPlace')); wvResetData(); renderHero(); renderBody(); refreshChip(); state.wx = null; scheduleTag(); });
  $('#wxUnits').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; ui.units = b.dataset.u; store(KEY_UI, ui); syncUnits();
    if (wxData) refreshChip(); if (wvOpen()) { renderHero(); renderBody(); } renderPane();
  });
  function syncUnits() { Array.prototype.forEach.call(document.querySelectorAll('#wxUnits button'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.u === U())); }); }
  syncUnits();
  function doSearch() {
    var q = $('#wxSearch').value.trim(), box = $('#wxResults'); if (q.length < 2) return;
    box.hidden = false; box.innerHTML = '<p class="bb-hint">Searching…</p>';
    BW.search(q).then(function (list) {
      box._list = list;
      box.innerHTML = list.length ? list.map(function (r, i) { return '<button type="button" class="bb-btn bb-btn--sm" data-i="' + i + '">' + esc(r.name) + '</button>'; }).join('') : '<p class="bb-hint">No match. Try a nearby city.</p>';
    }, function (e) { box.innerHTML = '<p class="bb-hint">⚠ ' + esc(e.message) + '</p>'; });
  }
  $('#wxSearchBtn').addEventListener('click', doSearch);
  $('#wxSearch').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
  function pickPlace(r) {
    ui.places = (ui.places || []).filter(function (p) { return p.id !== r.id; }).concat([r]).slice(-6); ui.place = r.id; store(KEY_UI, ui);
    fillPlaces($('#wxPlace')); fillPlaces($('#bwPlace')); $('#wxResults').hidden = true; $('#wxSearch').value = ''; wvResetData(); renderHero(); renderBody(); refreshChip(); state.wx = null; scheduleTag();
  }
  $('#wxResults').addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) pickPlace(this._list[+b.dataset.i]); });
  $('#wxGeo').addEventListener('click', function () {
    if (!navigator.geolocation) { toast('Location isn’t available on this device'); return; }
    navigator.geolocation.getCurrentPosition(function (pos) { pickPlace({ id: 'geo', name: 'My location', lat: +pos.coords.latitude.toFixed(3), lon: +pos.coords.longitude.toFixed(3) }); },
      function () { toast('Couldn’t get your location'); }, { timeout: 8000 });
  });
  $('#wxTag').addEventListener('click', function () { tagWeather().then(function () { closeWx(); toast('🏷 Weather tagged on this note'); }); });

  /* ---------------- Mobile: Edit / Preview switch ---------------- */
  function setPane(p) {
    document.body.dataset.pane = p;
    Array.prototype.forEach.call(document.querySelectorAll('.mnav [data-pane]'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.pane === p)); });
    window.scrollTo(0, 0);
  }
  $('.mnav').addEventListener('click', function (e) { var b = e.target.closest('[data-pane]'); if (b) setPane(b.dataset.pane); });
  $('#mBird').addEventListener('click', openSeed);
  document.body.dataset.pane = 'edit';

  /* ---------------- Boot ---------------- */
  if (!Array.isArray(state.refs)) state.refs = [];
  if (!Array.isArray(state.methods)) state.methods = [];
  writeForm(); renderSaved(); renderPane(); refreshChip();

  // expose for tests
  window.__wywo = { toText: toText, toMarkdown: toMarkdown, parseQuick: parseQuick, EXAMPLE: EXAMPLE };
})();
