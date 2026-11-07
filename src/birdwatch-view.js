/*
 * 🐦 Bird Watch — screens. Pure functions: data in, HTML string out (so they can be unit-tested).
 * Design language: the "bike computer" idea from the Long Beach Bike Club's Ride Weather page — a score gauge, a
 * verdict, a best window, tiles with segment bars, charts — redrawn for the Bluebird UI forest themes:
 * the bluebird logo is the gauge marker and the wind arrow; lines and colours come from the current theme.
 */
(function (root) {
  'use strict';
  var BW = root.BirdWatch || (typeof require !== 'undefined' ? require('./birdwatch.js') : null);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function f1(n) { return Math.round(n * 10) / 10; }
  function clock(iso) { return BW.time12(String(iso).slice(11, 16)); }
  function hourLbl(iso) { var h = +String(iso).slice(11, 13); return (h % 12 || 12) + (h < 12 ? 'a' : 'p'); }
  function segs(p) { var n = Math.round(Math.max(0, Math.min(1, p)) * 10), o = ''; for (var i = 0; i < 10; i++) o += '<i' + (i < n ? ' class="on"' : '') + '></i>'; return '<div class="wv-segs" aria-hidden="true">' + o + '</div>'; }
  function tile(label, val, unit, sub, bar) { return '<div class="wv-tile"><span class="wv-tile__l">' + esc(label) + '</span><span class="wv-tile__v">' + val + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</span><span class="wv-tile__s">' + esc(sub) + '</span>' + (bar || '') + '</div>'; }
  function head(n, title) { return '<h3 class="wv-h"><span class="wv-h__n">' + n + '</span><span>' + esc(title) + '</span></h3>'; }
  function wd(date, i) { return i === 0 ? 'Today' : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }); }

  /* ---------------- gauge (the bluebird rides the arc) ---------------- */
  function gauge(score, tone) {
    var th = Math.PI * (1 - score / 100), x = 110 + 90 * Math.cos(th), y = 110 - 90 * Math.sin(th);
    return '<svg class="wv-gauge" viewBox="0 0 220 132" role="img" aria-label="Watch score ' + score + ' out of 100" data-tone="' + esc(tone) + '">' +
      '<path class="wv-gauge__track" pathLength="100" d="M20 110A90 90 0 0 1 200 110"/>' +
      '<path class="wv-gauge__val" pathLength="100" stroke-dasharray="' + score + ' 100" d="M20 110A90 90 0 0 1 200 110"/>' +
      '<g class="wv-gauge__bird" transform="translate(' + f1(x) + ' ' + f1(y) + ')"><circle r="15"/><use href="#wywo-mark" x="-10" y="-10" width="20" height="20"/></g>' +
      '<text class="wv-gauge__num" x="110" y="104" text-anchor="middle">' + score + '</text><text class="wv-gauge__of" x="110" y="124" text-anchor="middle">WATCH SCORE</text></svg>';
  }
  /* ---------------- wind compass (the bluebird flies with the wind) ---------------- */
  function compass(dir, wind, gust, u) {
    var to = (dir + 180) % 360, ticks = '', i;
    for (i = 0; i < 36; i++) { var a = i * 10 * Math.PI / 180, r1 = i % 9 === 0 ? 78 : 84, r2 = 90; ticks += '<line x1="' + f1(100 + r1 * Math.sin(a)) + '" y1="' + f1(100 - r1 * Math.cos(a)) + '" x2="' + f1(100 + r2 * Math.sin(a)) + '" y2="' + f1(100 - r2 * Math.cos(a)) + '"/>'; }
    return '<div class="wv-compass"><svg viewBox="0 0 200 200" role="img" aria-label="Wind from the ' + BW.dirName(dir) + ' at ' + BW.S(wind, u) + ' ' + BW.SU(u) + '">' +
      '<circle class="wv-compass__ring" cx="100" cy="100" r="92"/><g class="wv-compass__ticks">' + ticks + '</g>' +
      '<text x="100" y="28" text-anchor="middle">N</text><text x="176" y="105" text-anchor="middle">E</text><text x="100" y="182" text-anchor="middle">S</text><text x="24" y="105" text-anchor="middle">W</text>' +
      '<g class="wv-compass__arrow" transform="translate(100 100) rotate(' + to + ')"><path d="M0 -64 L13 -40 H4.5 V34 H-4.5 V-40 H-13 Z"/><circle r="5"/></g></svg>' +
      '<div class="wv-compass__t"><b>' + BW.dirName(dir) + ' ' + BW.S(wind, u) + ' ' + BW.SU(u) + '</b><small>gusts ' + BW.S(gust || wind, u) + '</small></div></div>';
  }

  /* ---------------- charts ---------------- */
  function scale(v, a, b, c, d) { return b === a ? (c + d) / 2 : c + (v - a) * (d - c) / (b - a); }
  function areaLine(vals, o) {
    // vals: numbers; o: { w,h,pad,min,max,cls }
    var w = o.w || 480, h = o.h || 120, p = o.pad || 14, n = vals.length, mn = o.min != null ? o.min : Math.min.apply(null, vals), mx = o.max != null ? o.max : Math.max.apply(null, vals);
    if (mx === mn) { mx += 1; mn -= 1; }
    var pts = vals.map(function (v, i) { return [scale(i, 0, Math.max(1, n - 1), p, w - p), scale(v, mn, mx, h - p, p)]; });
    var d = pts.map(function (q, i) { return (i ? 'L' : 'M') + f1(q[0]) + ' ' + f1(q[1]); }).join('');
    return { pts: pts, line: d, area: d + 'L' + f1(pts[n - 1][0]) + ' ' + (h - p) + 'L' + f1(pts[0][0]) + ' ' + (h - p) + 'Z', w: w, h: h, pad: p, min: mn, max: mx };
  }
  function hoursChart(hours, u) {
    var temps = hours.map(function (h) { return BW.T(h.temp, u); }), c = areaLine(temps, { w: 480, h: 150, pad: 18, min: Math.min.apply(null, temps) - 2, max: Math.max.apply(null, temps) + 2 }), out = '';
    c.pts.forEach(function (q, i) {
      if (i % 3) return;
      out += '<text class="wv-ch__ico" x="' + f1(q[0]) + '" y="22" text-anchor="middle">' + BW.emoji(hours[i].code, hours[i].day) + '</text><text class="wv-ch__t" x="' + f1(q[0]) + '" y="' + f1(q[1] - 9) + '" text-anchor="middle">' + temps[i] + '°</text><text class="wv-ch__x" x="' + f1(q[0]) + '" y="146" text-anchor="middle">' + hourLbl(hours[i].time) + '</text>';
      out += '<circle class="wv-ch__dot" cx="' + f1(q[0]) + '" cy="' + f1(q[1]) + '" r="3.5"/>';
    });
    return '<svg class="wv-chart" viewBox="0 0 480 150" role="img" aria-label="Temperature over the next 24 hours"><path class="wv-ch__area" d="' + c.area + '"/><path class="wv-ch__line" d="' + c.line + '"/>' + out + '</svg>';
  }
  function bars(vals, o) {
    var w = 480, h = o.h || 130, base = h - 22, n = vals.length, bw = (w - 28) / n, out = '', top = o.max || 100;
    vals.forEach(function (v, i) {
      var bh = Math.max(v > 0 ? 3 : 0, (v / top) * (base - 22)), x = 14 + i * bw;
      out += '<rect class="wv-bar" x="' + f1(x + 2) + '" y="' + f1(base - bh) + '" width="' + f1(bw - 4) + '" height="' + f1(bh) + '" rx="3"' + (o.colors ? ' style="fill:' + o.colors[i] + '"' : '') + '/>';
      if (!(i % 3)) out += '<text class="wv-ch__x" x="' + f1(x + bw / 2) + '" y="' + (h - 5) + '" text-anchor="middle">' + esc(o.labels[i]) + '</text>';
      if (!(i % 3) && o.top) out += '<text class="wv-ch__t" x="' + f1(x + bw / 2) + '" y="' + f1(base - bh - 5) + '" text-anchor="middle">' + esc(o.top[i]) + '</text>';
    });
    return '<svg class="wv-chart" viewBox="0 0 480 ' + h + '" role="img" aria-label="' + esc(o.aria) + '">' + out + '</svg>';
  }

  /* ---------------- HERO ---------------- */
  function hero(d, ctx) {
    var u = ctx.units, n = d.now, sc = BW.watchScore(n), bw = BW.bestWindow(d.hours), place = d.place.name;
    var win = bw ? 'Best window <b>' + clock(d.hours[bw.i].time) + ' to ' + clock(d.hours[bw.i + 1].time) + '</b><span>Score <b>' + bw.avg + '</b></span>' : '<span>No daylight window in the next 24 hours</span>';
    return '<div class="wv-hero" data-tone="' + sc.tone + '"><div class="wv-hero__g">' + gauge(sc.score, sc.tone) +
      '<div class="wv-verdict"><span class="wv-badge">' + esc(sc.label) + '</span><p>' + esc(BW.verdict(sc.tone)) + '</p></div></div>' +
      '<div class="wv-hero__n"><div class="wv-nowline"><span class="wv-ico" aria-hidden="true">' + BW.emoji(n.code, n.day) + '</span><div><div class="wv-temp">' + BW.T(n.temp, u) + BW.TU(u) + '</div><div class="wv-desc">' + esc(BW.describe(n.code)) + ' · feels ' + BW.T(n.feels, u) + BW.TU(u) + '</div><div class="wv-place">' + esc(place) + '</div></div></div>' +
      '<div class="wv-window">' + win + '</div></div></div>';
  }

  /* ---------------- NOW ---------------- */
  function nowTab(d, ctx) {
    var u = ctx.units, n = d.now, d0 = d.days[0];
    var tiles = [
      tile('Temp', BW.T(n.temp, u), BW.TU(u), 'Feels ' + BW.T(n.feels, u) + BW.TU(u), segs((n.temp - 20) / 80)),
      tile('Wind', BW.S(n.wind, u), BW.SU(u), 'Gusts ' + BW.S(n.gust || n.wind, u), segs(n.wind / 30)),
      tile('Rain', Math.round(n.pop), '%', n.precip > 0 ? 'Raining now' : 'Chance this hour', segs(n.pop / 100)),
      tile('UV', f1(n.uv), '', BW.uvInfo(n.uv).level, segs(n.uv / 11)),
      tile('Humidity', Math.round(n.humidity), '%', 'Relative', segs(n.humidity / 100)),
      tile('Sunset', clock(d0.sunset).replace(/ (AM|PM)/, ''), clock(d0.sunset).slice(-2), 'Rise ' + clock(d0.sunrise), '')
    ].join('');
    var days = d.days.map(function (x, i) {
      return '<div class="wv-day"><span class="wv-day__w">' + wd(x.date, i) + '</span><i aria-hidden="true">' + BW.emoji(x.code, true) + '</i><span class="wv-day__p">' + (x.pop >= 20 ? '☔ ' + x.pop + '%' : '') + '</span><b>' + BW.T(x.hi, u) + '°</b><span class="wv-day__lo">' + BW.T(x.lo, u) + '°</span></div>';
    }).join('');
    var strip = d.hours.slice(0, 12).map(function (h, i) {
      var sc = BW.watchScore(h);
      return '<div class="wv-hr" data-tone="' + sc.tone + '"><span class="wv-hr__t">' + (i === 0 ? 'Now' : hourLbl(h.time)) + '</span><i aria-hidden="true">' + BW.emoji(h.code, h.day) + '</i><div class="wv-hr__bar" aria-hidden="true"><b style="height:' + Math.max(8, sc.score) + '%"></b></div><span class="wv-hr__s" title="Watch score">' + sc.score + '</span><span class="wv-hr__m">' + BW.T(h.temp, u) + '°</span><span class="wv-hr__m">' + BW.dirName(h.dir) + ' ' + BW.S(h.wind, u) + '</span><span class="wv-hr__m">' + Math.round(h.pop) + '%</span></div>';
    }).join('');
    var lis = function (a) { return '<ul class="wv-tips">' + a.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>'; };
    var nowIso = String(n.time || d.hours[0].time);
    return '<div class="wv-grid"><div class="wv-card wv-tiles">' + tiles + '</div><div class="wv-card">' + head('B-02', 'Wind') + compass(n.dir, n.wind, n.gust, u) + '</div></div>' +
      '<div class="wv-card">' + head('B-03', 'Next hours') + '<div class="wv-strip">' + strip + '</div><p class="wv-note">The bar is the Watch score for that hour. Scroll sideways for more.</p></div>' +
      '<div class="wv-grid"><div class="wv-card">' + head('B-04', 'What to wear') + '<p class="wv-sub">Based on feels-like ' + BW.T(n.feels, u) + BW.TU(u) + ' right now</p>' + lis(BW.dress(n)) + '</div>' +
      '<div class="wv-card">' + head('B-05', 'Light & daylight') + '<p class="wv-sub">Sunrise <b>' + clock(d0.sunrise) + '</b> · Sunset <b>' + clock(d0.sunset) + '</b></p>' + lis(BW.daylightTips(d0, nowIso)) + '</div></div>' +
      '<div class="wv-card">' + head('B-06', 'Temperature, next 24 hours') + hoursChart(d.hours, u) + '</div><div class="wv-card">' + head('B-07', '7 days') + '<div class="wv-days">' + days + '</div></div>';
  }

  /* ---------------- RAIN ---------------- */
  function rainTab(d, ctx, nowcast) {
    var u = ctx.units, r = BW.rainOutlook(d.hours, nowcast, u), pops = d.hours.map(function (h) { return h.pop; });
    var days = d.days.map(function (x, i) { return '<div class="wv-rowbar"><span>' + wd(x.date, i) + '</span><div class="wv-meter"><i style="width:' + x.pop + '%"></i></div><b>' + x.pop + '%</b></div>'; }).join('');
    return '<div class="wv-card wv-lead" data-tone="' + (r.firstWet < 0 ? 'prime' : 'fair') + '"><span class="wv-lead__i" aria-hidden="true">' + (r.firstWet < 0 ? '🌤' : '🌧️') + '</span><div><div class="wv-lead__h">' + esc(r.headline) + '</div>' + (r.nowcast ? '<div class="wv-lead__s">⏱ ' + esc(r.nowcast) + '</div>' : '') + '</div></div>' +
      '<div class="wv-grid wv-grid--3"><div class="wv-card wv-stat"><span>Peak chance</span><b>' + r.peak + '%</b></div><div class="wv-card wv-stat"><span>24-hour total</span><b>' + r.amount + ' ' + r.unit + '</b></div><div class="wv-card wv-stat"><span>Right now</span><b>' + (d.now.precip > 0 ? 'Raining' : 'Dry') + '</b></div></div>' +
      '<div class="wv-card"><h3 class="wv-h">Chance of rain, next 24 hours</h3>' + bars(pops, { labels: d.hours.map(function (h) { return hourLbl(h.time); }), top: pops.map(function (p) { return p >= 20 ? p + '%' : ''; }), aria: 'Chance of rain by hour' }) + '</div>' +
      '<div class="wv-card"><h3 class="wv-h">7-day outlook</h3><div class="wv-rows">' + days + '</div></div>';
  }

  /* ---------------- UV ---------------- */
  function uvTab(d, ctx) {
    var n = d.now, info = BW.uvInfo(n.uv), uvs = d.hours.map(function (h) { return h.day ? h.uv : 0; }), peak = Math.max.apply(null, uvs), pi = uvs.indexOf(peak);
    var colors = uvs.map(function (v) { return BW.uvInfo(v).color; });
    var days = d.days.map(function (x, i) { var q = BW.uvInfo(x.uv); return '<div class="wv-rowbar"><span>' + wd(x.date, i) + '</span><div class="wv-meter"><i style="width:' + Math.min(100, x.uv / 11 * 100) + '%;background:' + q.color + '"></i></div><b>' + f1(x.uv) + '</b></div>'; }).join('');
    var scaleBar = BW.UV_LEVELS.slice(0, 4).map(function (l, i) { return '<i style="background:' + l[2] + ';flex:' + (i === 0 ? 3 : i === 1 ? 3 : i === 2 ? 2 : 3) + '"></i>'; }).join('') + '<i style="background:' + BW.UV_LEVELS[4][2] + ';flex:2"></i>';
    return '<div class="wv-card wv-lead" style="--tone:' + info.color + '"><span class="wv-lead__n">' + info.value + '</span><div><div class="wv-lead__h">UV ' + esc(info.level) + '</div><div class="wv-lead__s">' + esc(info.advice) + '</div></div></div>' +
      '<div class="wv-grid wv-grid--3"><div class="wv-card wv-stat"><span>Peak (24 h)</span><b>' + f1(peak) + '</b><small>' + (peak > 0 ? clock(d.hours[pi].time) : 'after dark') + '</small></div><div class="wv-card wv-stat"><span>Burn time*</span><b>' + (info.burnMin ? '~' + info.burnMin + ' min' : 'n/a') + '</b><small>unprotected fair skin</small></div><div class="wv-card wv-stat"><span>Today’s max</span><b>' + f1(d.days[0].uv) + '</b><small>' + esc(BW.uvInfo(d.days[0].uv).level) + '</small></div></div>' +
      '<div class="wv-card"><h3 class="wv-h">UV through the day</h3>' + bars(uvs, { max: Math.max(11, peak), labels: d.hours.map(function (h) { return hourLbl(h.time); }), top: uvs.map(function (v) { return v >= 1 ? String(Math.round(v)) : ''; }), colors: colors, aria: 'UV index by hour' }) + '<div class="wv-uvscale">' + scaleBar + '</div><div class="wv-uvscale__l"><span>Low</span><span>Moderate</span><span>High</span><span>Very high</span><span>Extreme</span></div></div>' +
      '<div class="wv-card"><h3 class="wv-h">7-day peak UV</h3><div class="wv-rows">' + days + '</div></div><p class="wv-note">*A rough estimate for fair skin with no protection.</p>';
  }

  /* ---------------- TIDES ---------------- */
  function tideChart(t, ctx) {
    var ev = t.events, nowMs = ctx.nowMs, from = nowMs - 6 * 36e5, to = nowMs + 42 * 36e5, W = 480, H = 236, pL = 12, pR = 12, pT = 34, pB = 52;
    var cx = function (x) { return Math.max(26, Math.min(W - 26, x)); };   // keep labels inside the chart
    var pts = BW.tideCurve(ev, from, to, 20); if (pts.length < 3) return '<p class="wv-note">Not enough tide data to draw the chart.</p>';
    var hs = pts.map(function (p) { return p.ft; }), mn = Math.min.apply(null, hs) - 0.5, mx = Math.max.apply(null, hs) + 0.7;
    var X = function (ms) { return scale(ms, from, to, pL, W - pR); }, Y = function (ft) { return scale(ft, mn, mx, H - pB, pT); };
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + f1(X(p.ms)) + ' ' + f1(Y(p.ft)); }).join('');
    var area = d + 'L' + f1(X(pts[pts.length - 1].ms)) + ' ' + (H - pB) + 'L' + f1(X(pts[0].ms)) + ' ' + (H - pB) + 'Z';
    // night shading from sunrise / sunset
    var night = '', days = ctx.days || [];
    days.slice(0, 3).forEach(function (dy, i) {
      var sr = BW.noaaTime(String(dy.sunrise).replace('T', ' ')), ss = BW.noaaTime(String(dy.sunset).replace('T', ' ')), prevSs = i ? BW.noaaTime(String(days[i - 1].sunset).replace('T', ' ')) : sr - 14 * 36e5;
      if (isFinite(sr) && isFinite(prevSs)) night += '<rect class="wv-night" x="' + f1(Math.max(pL, X(prevSs))) + '" y="' + pT + '" width="' + f1(Math.max(0, Math.min(W - pR, X(sr)) - Math.max(pL, X(prevSs)))) + '" height="' + (H - pB - pT) + '"/>';
      if (isFinite(ss) && i === days.slice(0, 3).length - 1) night += '<rect class="wv-night" x="' + f1(Math.max(pL, X(ss))) + '" y="' + pT + '" width="' + f1(Math.max(0, W - pR - Math.max(pL, X(ss)))) + '" height="' + (H - pB - pT) + '"/>';
    });
    var labels = '', ticks = '';
    ev.filter(function (e) { return e.ms > from && e.ms < to; }).forEach(function (e) {
      var x = X(e.ms), y = Y(e.ft);
      labels += '<circle class="wv-tide__pt" cx="' + f1(x) + '" cy="' + f1(y) + '" r="3.5"/><text class="wv-ch__t" x="' + f1(cx(x)) + '" y="' + f1(e.type === 'H' ? y - 9 : y + 17) + '" text-anchor="middle">' + BW.ftToUnit(e.ft, ctx.units) + '</text>' +
        '<text class="wv-ch__x" x="' + f1(cx(x)) + '" y="' + f1(e.type === 'H' ? y - 21 : y + 29) + '" text-anchor="middle">' + BW.time12(e.t.slice(11, 16)).replace(':00', '').replace(' ', '') + '</text>';
    });
    for (var m = Math.ceil(from / 864e5) * 864e5; m < to; m += 864e5) ticks += '<line class="wv-day-line" x1="' + f1(X(m)) + '" x2="' + f1(X(m)) + '" y1="' + pT + '" y2="' + (H - pB) + '"/><text class="wv-ch__d" x="' + f1(cx(X(m) + 4)) + '" y="' + (H - 6) + '">' + new Date(m).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }) + '</text>';
    var nx = X(nowMs), nh = BW.tideAt(ev, nowMs);
    return '<svg class="wv-chart wv-chart--tide" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Tide height over the next two days">' + night + ticks + '<path class="wv-ch__area" d="' + area + '"/><path class="wv-ch__line" d="' + d + '"/>' + labels +
      '<line class="wv-now-line" x1="' + f1(nx) + '" x2="' + f1(nx) + '" y1="' + pT + '" y2="' + (H - pB) + '"/>' + (nh != null ? '<g class="wv-now-bird" transform="translate(' + f1(nx) + ' ' + f1(Y(nh)) + ')"><circle r="12"/><use href="#wywo-mark" x="-8" y="-8" width="16" height="16"/></g>' : '') + '</svg>';
  }
  function tidesTab(t, ctx) {
    var u = ctx.units, nowMs = ctx.nowMs, tn = BW.tideNow(t.events, nowMs), L = BW.lenUnit(u);
    var nextEv = t.events.filter(function (e) { return e.ms > nowMs; }).slice(0, 4).map(function (e) {
      var mins = Math.round((e.ms - nowMs) / 6e4), inTxt = mins >= 60 ? Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min' : mins + ' min';
      return '<div class="wv-ev wv-ev--' + e.type + '"><span class="wv-ev__i" aria-hidden="true">' + (e.type === 'H' ? '⬆️' : '⬇️') + '</span><div><b>' + (e.type === 'H' ? 'High tide' : 'Low tide') + '</b><small>' + BW.time12(e.t.slice(11, 16)) + ' · in ' + inTxt + '</small></div><span class="wv-ev__h">' + BW.ftToUnit(e.ft, u) + ' ' + L + '</span></div>';
    }).join('');
    var lead = tn ? '<div class="wv-card wv-lead" data-tone="' + (tn.rising ? 'good' : 'fair') + '"><span class="wv-lead__i" aria-hidden="true">' + (tn.rising ? '🌊' : '🏖️') + '</span><div><div class="wv-lead__h">' + (tn.rising ? 'Tide rising' : 'Tide falling') + ' · ' + BW.ftToUnit(tn.ft, u) + ' ' + L + '</div><div class="wv-lead__s">' + (tn.rising ? 'High' : 'Low') + ' tide at ' + BW.time12(tn.next.t.slice(11, 16)) + ' (' + (tn.minToNext >= 60 ? Math.floor(tn.minToNext / 60) + ' h ' + (tn.minToNext % 60) + ' min' : tn.minToNext + ' min') + ')</div></div></div>' : '';
    return lead + '<div class="wv-card"><h3 class="wv-h">Next two days</h3>' + tideChart(t, ctx) + '</div><div class="wv-card"><h3 class="wv-h">Coming up</h3><div class="wv-evs">' + (nextEv || '<p class="wv-note">No upcoming tides in range.</p>') + '</div></div>' +
      '<p class="wv-note">Predictions from NOAA station ' + esc(t.station.id) + ' (' + esc(t.station.name) + (t.station.distKm ? ', ' + t.station.distKm + ' km away' : '') + '). Shaded areas are night. Heights are above the lowest tide level (MLLW).</p>';
  }

  /* ---------------- AQI ---------------- */
  function aqiTab(a, ctx) {
    var n = a.now, info = BW.aqiInfo(n.aqi), seg = BW.AQI_LEVELS.map(function (l, i) { var lo = i ? BW.AQI_LEVELS[i - 1][0] : 0; return '<i style="background:' + l[2] + ';flex:' + Math.max(1, Math.min(l[0], 300) - Math.min(lo, 300)) + '"></i>'; }).join('');
    var P = [['PM2.5', n.pm25, 35, 'µg/m³'], ['PM10', n.pm10, 150, 'µg/m³'], ['Ozone', n.o3, 100, 'µg/m³'], ['NO₂', n.no2, 100, 'µg/m³'], ['SO₂', n.so2, 75, 'µg/m³'], ['CO', n.co, 10000, 'µg/m³']]
      .map(function (p) { return tile(p[0], p[1] == null ? '–' : f1(p[1]), p[3], p[1] == null ? 'not reported' : (p[1] / p[2] < 0.5 ? 'Low' : p[1] / p[2] < 1 ? 'Elevated' : 'High'), segs(p[1] == null ? 0 : p[1] / p[2])); }).join('');
    var vals = a.hours.map(function (h) { return h.aqi; }), ch = vals.length > 2 ? areaLine(vals, { w: 480, h: 130, pad: 16, min: 0, max: Math.max(100, Math.max.apply(null, vals) + 10) }) : null;
    return '<div class="wv-card wv-lead" style="--tone:' + info.color + '"><span class="wv-lead__n">' + info.value + '</span><div><div class="wv-lead__h">' + esc(info.level) + '</div><div class="wv-lead__s">' + esc(info.advice) + '</div></div></div>' +
      '<div class="wv-card"><h3 class="wv-h">US Air Quality Index</h3><div class="wv-aqibar"><div class="wv-aqibar__s">' + seg + '</div><span class="wv-aqibar__p" style="left:' + (info.pct * 100) + '%"></span></div><div class="wv-aqibar__l"><span>0</span><span>50</span><span>100</span><span>150</span><span>200</span><span>300+</span></div>' + (n.eaqi != null ? '<p class="wv-note">European AQI: ' + n.eaqi + '</p>' : '') + '</div>' +
      '<div class="wv-card wv-tiles">' + P + '</div>' +
      (ch ? '<div class="wv-card"><h3 class="wv-h">Next 24 hours</h3><svg class="wv-chart" viewBox="0 0 480 130" role="img" aria-label="Air quality index over 24 hours"><path class="wv-ch__area" d="' + ch.area + '"/><path class="wv-ch__line" d="' + ch.line + '"/>' + ch.pts.map(function (q, i) { return i % 4 ? '' : '<text class="wv-ch__x" x="' + f1(q[0]) + '" y="126" text-anchor="middle">' + hourLbl(a.hours[i].time) + '</text><text class="wv-ch__t" x="' + f1(q[0]) + '" y="' + f1(q[1] - 7) + '" text-anchor="middle">' + Math.round(vals[i]) + '</text>'; }).join('') + '</svg></div>' : '');
  }

  function status(kind, msg) { return '<div class="wv-card wv-status wv-status--' + kind + '"><span aria-hidden="true">' + (kind === 'load' ? '🌱' : '⚠️') + '</span><p>' + esc(msg) + '</p>' + (kind === 'err' ? '<button type="button" class="bb-btn bb-btn--sm" data-retry>Try again</button>' : '') + '</div>'; }

  root.BirdWatchView = { hero: hero, now: nowTab, rain: rainTab, uv: uvTab, tides: tidesTab, aqi: aqiTab, status: status, gauge: gauge, compass: compass };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BirdWatchView;
})(typeof window !== 'undefined' ? window : globalThis);
