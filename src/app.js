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
    return { forWho: '', urgent: false, date: today(), time: nowTime(), caller: '', company: '', phone: '', alt: '', methods: ['Telephoned'], reason: '', topics: '', action: '', extra: '', refs: [], signed: '' };
  }

  /* ---------------- Theme UI ---------------- */
  var ui = load(KEY_UI, {});
  function applyTheme(id) {
    var t = THEMES.filter(function (x) { return x.id === id; })[0] || THEMES[0];
    document.documentElement.dataset.theme = t.id;
    $('#themeLabel').textContent = t.name;
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
    b.addEventListener('click', function () { applyTheme(t.id); closePop(); });
    $('#swatches').appendChild(b);
  });
  function closePop() { $('#themePop').hidden = true; $('#themeBtn').setAttribute('aria-expanded', 'false'); }
  $('#themeBtn').addEventListener('click', function (e) { e.stopPropagation(); var p = $('#themePop'); p.hidden = !p.hidden; this.setAttribute('aria-expanded', String(!p.hidden)); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.pop-wrap')) closePop(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePop(); closeDrawer(); } });
  $('#modeBtn').addEventListener('click', function () {
    var el = document.documentElement;
    var dark = el.dataset.mode ? el.dataset.mode === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    el.dataset.mode = dark ? 'light' : 'dark';
    ui.mode = el.dataset.mode; store(KEY_UI, ui); syncChrome();
  });
  applyTheme(document.documentElement.dataset.theme);

  /* App icon (favicon + touch icon) — six tree icons, Cedar by default */
  var TREES = [
    { id: 'cedar', name: 'Cedar', tip: 'Blue-green cedar & warm wood grain (default)' }, { id: 'pine', name: 'Pine', tip: 'Evergreen needles & amber resin' },
    { id: 'maple', name: 'Maple', tip: 'Crimson & burnt-orange leaves' }, { id: 'hazelnut', name: 'Hazelnut', tip: 'Hazel brown, cream & olive' },
    { id: 'linden', name: 'Linden', tip: 'Luminous green heart-leaf' }, { id: 'beech', name: 'Beech', tip: 'Copper leaves & silver bark' }
  ];
  function applyIcon(id) {
    var t = TREES.filter(function (x) { return x.id === id; })[0] || TREES[0], d = 'assets/icons/' + t.id + '/';
    var dflt = t.id === 'cedar';
    $('#fav32').href = dflt ? 'favicon-32x32.png' : d + 'favicon-32.png';
    $('#fav16').href = dflt ? 'favicon-16x16.png' : d + 'favicon-16.png';
    $('#appleIcon').href = dflt ? 'apple-touch-icon.png' : d + 'apple-touch-icon.png';
    Array.prototype.forEach.call(document.querySelectorAll('.icon-btn'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === t.id)); });
    ui.icon = t.id; store(KEY_UI, ui);
  }
  TREES.forEach(function (t) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'icon-btn'; b.dataset.id = t.id; b.title = t.name + ' — ' + t.tip;
    b.innerHTML = '<img src="assets/icons/' + t.id + '/favicon-48.png" alt="" width="44" height="44">' + esc(t.name);
    b.addEventListener('click', function () { applyIcon(t.id); toast(t.name + ' icon selected'); });
    $('#icons').appendChild(b);
  });
  applyIcon(ui.icon || 'cedar');
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
    h += '<div class="note__top"><div class="note__brand"><svg class="note__mark" viewBox="0 0 512 512" aria-hidden="true"><use href="#wywo-mark"/></svg><div><div class="note__kicker">While You Were Out</div><div class="note__title">Callback request</div></div></div>' +
      '<div class="note__meta">' + (s.urgent ? '<span class="bb-badge bb-badge--danger">URGENT</span><br>' : '') +
      '<div class="note__for">Call is for <span class="for-badge' + (String(s.forWho || '').trim() ? '' : ' for-badge--team') + '">' + esc(forLabel(s)) + '</span></div>' + esc(fmtDate(s.date, s.time)) + '</div></div>';
    h += '<div class="note__caller"><span class="name">' + (s.caller ? esc(s.caller) : '<span class="empty">Caller name</span>') + '</span>' +
      (s.company ? '<span class="company">' + esc(s.company) + '</span>' : '') +
      (s.phone ? (tel ? '<a class="note__phone" href="' + esc(tel) + '">' + esc(s.phone) + '</a>' : '<span class="note__phone">' + esc(s.phone) + '</span>') : '') +
      (s.alt ? '<span>' + esc(s.alt) + '</span>' : '') + '</div>';
    if (s.methods.length) h += '<div class="chips">' + s.methods.map(function (m) { return '<span class="bb-badge">' + esc(m) + '</span>'; }).join('') + '</div>';
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
    var msg = [s.reason, topics.length ? 'Questions re: ' + topics.join(', ') + '.' : '', s.action, s.extra && s.extra.trim(),
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
    if (!saved.length) { box.innerHTML = '<p class="empty">No saved notes yet. Press 💾 Save on a note and it appears here.</p>'; return; }
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
  // Sorts plain words into fields. NOTHING is thrown away: whatever can't be
  // categorised lands in `reason` (if empty) or `extra` (Additional notes).
  function parseQuick(t) {
    var o = {}, refs = [], rest = '\n' + String(t).replace(/\r/g, '').replace(/\s+(?:--+|[—–])\s+/g, '. ') + '\n', cats = 0;
    function take(re, fn) { var m = rest.match(re); if (m) { fn(m); rest = rest.replace(m[0], ' '); cats++; } return !!m; }
    var CAP = "[A-Z][\\w’'.-]*";
    var cap2 = function (re) { return new RegExp(re.replace(/CAP/g, CAP)); };

    // 1. explicit "label: value" lines
    [['caller', /^[ \t]*(?:caller|name)[ \t]*:[ \t]*(.+)$/im], ['company', /^[ \t]*(?:company|org|organization)[ \t]*:[ \t]*(.+)$/im],
     ['phone', /^[ \t]*(?:phone|tel|telephone)[ \t]*:[ \t]*(.+)$/im], ['alt', /^[ \t]*(?:cell|fax|email|e-mail)[ \t]*:[ \t]*(.+)$/im],
     ['forWho', /^[ \t]*for[ \t]*:[ \t]*(.+)$/im], ['reason', /^[ \t]*(?:reason|why)[ \t]*:[ \t]*(.+)$/im],
     ['action', /^[ \t]*(?:action|request)[ \t]*:[ \t]*(.+)$/im], ['extra', /^[ \t]*notes?[ \t]*:[ \t]*(.+)$/im],
     ['topics', /^[ \t]*(?:topics?|re|regarding|about)[ \t]*:[ \t]*(.+)$/im]]
      .forEach(function (kv) { take(kv[1], function (m) { o[kv[0]] = m[1].trim(); }); });

    // 2. links -> references
    var urls = rest.match(/(?:https?:\/\/|www\.)[^\s,;)]+/gi) || [];
    urls.forEach(function (u) { u = u.replace(/[.,;:!?]+$/, ''); rest = rest.replace(u, ' '); cats++;
      refs.push({ title: u.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0], detail: '', url: /^www\./i.test(u) ? 'https://' + u : u }); });

    // 3. email, bare domains, phones, time, urgent
    take(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/, function (m) { o.alt = o.alt ? o.alt + ' · ' + m[0] : m[0]; });
    (rest.match(/\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|net|org|co|io|gov|us|biz|info|edu)\b/gi) || []).forEach(function (d) {
      rest = rest.replace(d, ' '); cats++; if (!refs.some(function (r) { return r.url === 'https://' + d; })) refs.push({ title: d, detail: '', url: 'https://' + d }); });
    rest = rest.replace(/\b(?:web\s*site|site|domain)(?:\s+name)?\s*[:=]?\s*(?=[.,;]|\s*$)/gi, ' ');
    var phones = rest.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?:\s*(?:x|ext\.?)\s*\d+)?/g) || [];
    phones.forEach(function (p, i) { rest = rest.replace(p, ' | '); cats++; var c = p.trim().replace(/^\+?1[\s.-]/, '').replace(/^\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})(.*)$/, function (m, a, b, d, tail) { return a + '-' + b + '-' + d + tail; });
      if (i === 0 && !o.phone) o.phone = c; else o.alt = o.alt ? o.alt + ' · ' + c : c; });
    (function () {
      var m = rest.match(/\b(?:(after|before|until|by|around|from|between)\s+)?(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?\b/i);
      if (m && !m[1]) { var h = +m[2] % 12 + (/p/i.test(m[4]) ? 12 : 0); o.time = pad(h) + ':' + (m[3] || '00'); rest = rest.replace(m[0], ' '); cats++; }
    })();
    take(/\b(?:very\s+)?(?:urgent(?:ly)?|asap|emergency)\b[!.]*/i, function () { o.urgent = true; });

    // 4. transfer + topics + callback wording
    if (!o.caller) take(/^\s*([A-Za-z][\w’'.-]*(?:\s+[A-Za-z][\w’'.-]*)?)\s+(?:called|phoned|rang|is\s+calling)\b/, function (m) { o.caller = m[1].replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); });
    var again = take(/\bwill\s+call\s+(?:you\s+)?again\b/i, function () {});
    var cb = take(/\b(?:(?:wants?|asked?|would\s+like|needs?)\s+(?:someone|somebody|you|us)\s+to\s+)?(?:please\s+)?(?:call|ring|phone)\s+(?:him|her|them|me|back)(?:\s+back)?\b|\bcall\s?back\b|\breturn\s+(?:the\s+|his\s+|her\s+|their\s+)?call\b/i, function () {});
    var tr = '';
    take(/\b(?:was\s+|were\s+)?transferred\s+(?:by|from)\s+(?:the\s+)?([^,.;\n]+)/i, function (m) { tr = m[1].trim(); });
    if (!o.topics && !take(/(?:\bre\s*:|\bregarding\b|\bconcerning\b|\bquestions?\s+(?:on|about|regarding|concerning)\b|\bwants?\s+to\s+know\s+about\b)\s*([^\n]+?)(?=\.(?:\s|$)|\n|$)/i, function (m) { o.topics = m[1]; }))
      take(/\b(?:asking|calling|call(?:ed)?|phoned|wondering)?\s*\babout\s+([^,.;\n]+)/i, function (m) { o.topics = m[1]; });
    if (o.topics) o.topics = o.topics.split(/\s*(?:,|;|\band\b|\+|&|\n)\s*/i).map(function (x) { return x.trim().replace(/\.$/, ''); })
      .filter(Boolean).map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1); }).join('\n');
    var spoke = '';
    take(/\b(?:wants?|would\s+like|asked?)\s+to\s+(?:speak|talk)\s+(?:to|with)\s+(?:the\s+)?([^,.;\n|]+)/i, function (m) { spoke = m[1].trim().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); });
    rest = rest.replace(/\b(?:and\s+)?(?:(?:web\s*site|site|domain)(?:\s+name)?|e-?mail(?:\s+address)?)\s*(?:is|:|=)\s*/gi, ' ')
      .replace(/\b(?:and\s+)?(?:is\s+)?also\s+(?:reachable|available)\s*(?:at|on)?\s*/gi, ' ');
    var prefs = [];
    for (var pm; (pm = rest.match(/\b(?:prefers?|best\s+(?:time|way)|can\s+be\s+reached)\b[^.\n]*/i));) { prefs.push(pm[0].trim().replace(/^./, function (c) { return c.toUpperCase(); }).replace(/\s+/g, ' ')); rest = rest.replace(pm[0], ' '); cats++; }
    rest = rest.replace(/\b(?:also\s+)?(?:reachable|available)\s*(?:at|on)?\s*(?=[.|,]|\s*$)/gi, ' ');

    // 5. people & places
    if (!o.forWho) take(/\b(?:check\s+with\s+(?:the\s+)?team|for\s+(?:the\s+|any\s*one|whoever)[^,.;\n]*team|for\s+anyone)\b/i, function () { o.forWho = TEAM; });
    if (!o.forWho) take(cap2('\\b(?:[Mm]essage|[Nn]ote|[Cc]all)\\s+for\\s+(CAP(?:\\s+CAP)?)'), function (m) { o.forWho = m[1]; });
    if (!o.forWho) take(cap2('\\b(?:asking\\s+for|looking\\s+for|trying\\s+to\\s+reach|wants?\\s+to\\s+reach|needs?|tell|let)\\s+((?:Mr\\.?|Mrs\\.?|Ms\\.?|Dr\\.?)?\\s*CAP(?:\\s+CAP)?)(?=\\s*(?:,|\\.|\\bto\\b|\\bthat\\b|\\bknow\\b|$))'), function (m) { o.forWho = m[1].trim(); });
    if (!o.caller) take(cap2('^\\s*(?:(?:call|message|note)\\s+(?:from\\s+)?|(?:got\\s+a\\s+call\\s+from\\s+))?(CAP(?:\\s+CAP){0,2}?)(?=\\s*(?:,|\\||\\bfrom\\b|\\bwith\\b|\\bat\\b|\\bof\\b|\\bcalled\\b|\\bwas\\b|\\bwith\\b|[.\\n]|$))'), function (m) { o.caller = m[1]; });
    if (!o.company) take(cap2('\\b(?:from|with|of|at|calling\\s+for)\\s+(CAP(?:\\s+(?:CAP|&|and\\s+CAP))*)'), function (m) { o.company = m[1].replace(/\s+(?:and|&)$/, ''); });

    if (!o.company && o.caller) take(cap2('^[\\s,|\\-–—(]+(CAP(?:\\s+(?:CAP|&))*)\\s*(?=[,.;)\\n]|\\s+(?:or|and|called|\\d))'), function (m) { o.company = m[1].trim(); });

    if (spoke && !o.forWho) o.forWho = spoke;
    if (prefs.length) o.extra = ((o.extra ? o.extra + '\n' : '') + prefs.join('. ').replace(/\.?$/, '.'));

    // 6. compose the sentences we can
    var who = o.caller ? first(o.caller) : 'Caller';
    if (spoke && !o.reason) o.reason = who + ' wants to speak with ' + spoke + '.';
    if (tr && !o.reason) o.reason = who + ' was transferred by the ' + tr.replace(/^the\s+/i, '') + '.';
    else if (tr) o.extra = ((o.extra ? o.extra + '\n' : '') + 'Transferred by the ' + tr.replace(/^the\s+/i, '') + '.');
    if (again) o.methods = ['Telephoned', 'Will call again'];
    else if (cb || o.caller || o.phone) o.methods = ['Telephoned', 'Please call'];
    if (!o.action && (cb || o.caller)) o.action = 'Please return ' + who + (/s$/i.test(who) ? '’' : '’s') + ' call' + (o.topics ? ' regarding the above matters.' : '.');

    // 7. leftovers: never lose anything
    rest = rest.replace(/\b(?:or|and)?\s*(?:(?:her|his|their|my)\s+)?(?:cell|fax|e-?mail|mobile|phone|number|website|site|see|at|is|called|phoned|calling)\s*(?:is|:)?\s*(?=[,.;]|\s*$)/gi, ' ');
    var left = rest.replace(/[ \t]+/g, ' ').split('\n').map(function (l) { return l.replace(/^[\s,;:.|\-–—]+|[\s,;:|\-–—]+$/g, '').trim(); })
      .filter(function (l) { return l.length > 1 && !/^(?:and|the|a|to|re|for|from|with|at|of|by)$/i.test(l); }).join('\n');
    left = left.replace(/(?:\s*[,;.|]\s*){2,}/g, ', ').replace(/\s+,/g, ',').replace(/\s*\|\s*/g, ' ').replace(/^[\s,;:.]+|[\s,;:.]+$/g, '');
    if (left) { if (!o.reason) o.reason = left; else o.extra = (o.extra ? o.extra + '\n' : '') + left; }
    if (refs.length) o.refs = refs;
    o.__cats = cats;
    return o;
  }
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
  var picked = ui.seeds || BirdSeed.SEEDS.map(function (x) { return x.id; });
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
    $('#seedSub').textContent = n === 1 ? 'Pick the seeds to scatter. We’ll look at your note and suggest details — you choose what goes in.' : 'Tick what you want in the note. Guesses are never ticked for you.';
  }
  function openSeed() { readForm(); seedStep(1); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  function closeSeed() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  $('#birdBtn').addEventListener('click', openSeed);
  $('#seedClose').addEventListener('click', closeSeed);
  $('#seedBack').addEventListener('click', function () { seedStep(1); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeSeed(); });

  var TRUST = { verified: ['✓ From a source', 'tr tr--v'], derived: ['Worked out from your note', 'tr tr--d'], guess: ['Guess — confirm first', 'tr tr--g'] };
  function sgRow(x, i) {
    var t = x.apply.kind === 'link' ? ['Opens in a new tab', 'tr tr--d'] : (TRUST[x.trust] || TRUST.derived);
    var lead = x.apply.kind === 'link' ? '<a class="bb-btn bb-btn--sm" href="' + esc(x.apply.url) + '" target="_blank" rel="noopener noreferrer">Open ↗</a>' : '<input type="checkbox" data-i="' + i + '"' + (x.checked ? ' checked' : '') + ' aria-label="Add: ' + esc(x.label) + '">';
    return '<label class="sg">' + lead + '<span class="sg__t"><b>' + esc(x.label) + '</b><span class="sg__v">' + esc(x.value) + '</span><small><span class="' + t[1] + '">' + t[0] + '</span>' + (x.source ? ' · ' + esc(x.source) : '') + '</small></span></label>';
  }
  function renderSeedResults() {
    var n = 0, html = '';
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
  function updateAddBtn() { var c = $('#seedResults').querySelectorAll('input[type=checkbox]:checked').length; $('#seedAdd').textContent = c ? 'Add ' + c + ' to my note' : 'Nothing ticked'; $('#seedAdd').disabled = !c; }
  $('#seedResults').addEventListener('change', function (e) { var i = e.target.dataset.i; if (i != null && window.__seedAll) window.__seedAll[i].checked = e.target.checked; updateAddBtn(); });

  $('#scatterBtn').addEventListener('click', function () {
    readForm();
    var ids = ui.seeds.slice(); if (!ids.length) return;
    seedRes = ids.map(function (id) { return { seed: BirdSeed.SEEDS.filter(function (x) { return x.id === id; })[0], pending: true, suggestions: [] }; });
    window.__seedAll = []; seedStep(2); renderSeedResults();
    BirdSeed.scatter(ids, { state: JSON.parse(JSON.stringify(state)), saved: saved, city: cityEl.value }, function (r) {
      var slot = seedRes.filter(function (x) { return x.seed.id === r.seed.id; })[0];
      slot.pending = false; slot.message = r.message; slot.suggestions = r.suggestions; slot.all = window.__seedAll;
      r.suggestions.forEach(function (x) { window.__seedAll.push(x); });
      renderSeedResults();
    });
  });

  function applySg(a) {
    var cur;
    if (a.kind === 'field') {
      cur = state[a.field] || '';
      if (a.mode === 'ifEmpty' && cur) return 0;
      if (a.mode === 'append') { if (cur.toLowerCase().indexOf(a.value.toLowerCase()) > -1) return 0; state[a.field] = cur ? cur + ' · ' + a.value : a.value; return 1; }
      if (cur === a.value) return 0; state[a.field] = a.value; return 1;
    }
    if (a.kind === 'ref') {
      if (state.refs.some(function (r) { return (a.url && r.url === a.url) || (a.title && r.title === a.title); })) return 0;
      state.refs.push({ title: a.title, detail: a.detail || '', url: a.url || '' }); return 1;
    }
    if (a.kind === 'extra') {
      if ((state.extra || '').indexOf(a.text) > -1) return 0;
      state.extra = (state.extra ? state.extra + '\n' : '') + a.text; return 1;
    }
    return 0;
  }
  $('#seedAdd').addEventListener('click', function () {
    readForm(); var n = 0;
    (window.__seedAll || []).forEach(function (x) { if (x.checked && x.apply.kind !== 'link') n += applySg(x.apply); });
    writeForm(); update(); closeSeed();
    toast(n ? '🐦 Added ' + n + ' detail' + (n > 1 ? 's' : '') + ' to your note' : 'Nothing new to add');
  });

  /* ---------------- Boot ---------------- */
  if (!Array.isArray(state.refs)) state.refs = [];
  if (!Array.isArray(state.methods)) state.methods = [];
  writeForm(); renderSaved(); renderPane();

  // expose for tests
  window.__wywo = { toText: toText, toMarkdown: toMarkdown, parseQuick: parseQuick, EXAMPLE: EXAMPLE };
})();
