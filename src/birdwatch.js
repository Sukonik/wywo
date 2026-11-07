/*
 * 🐦 Bird Watch — weather & time context for call notes.
 *
 * Free, no API key: Open-Meteo (the same data source behind ClearSky, https://sukonik.github.io/weather-app/).
 * Concepts borrowed from the Long Beach Bike Club "Ride Weather" page: place picker, header chip, units toggle,
 * hourly + 7-day outlook.
 *
 * Everything that can be worked out offline is (day, time, daypart, season, nearby holiday); only the weather
 * itself needs the network, and only a place's coordinates are ever sent — never any note text.
 */
(function (root) {
  'use strict';

  var PLACES = [
    { id: 'long-beach',     name: 'Long Beach, NY',     lat: 40.5884, lon: -73.6579 },
    { id: 'point-lookout',  name: 'Point Lookout, NY',  lat: 40.5937, lon: -73.5768 },
    { id: 'lido-beach',     name: 'Lido Beach, NY',     lat: 40.5884, lon: -73.6180 },
    { id: 'atlantic-beach', name: 'Atlantic Beach, NY', lat: 40.5898, lon: -73.7254 },
    { id: 'rockaway-beach', name: 'Rockaway Beach, NY', lat: 40.5848, lon: -73.8160 },
    { id: 'lawrence',       name: 'Lawrence, NY',       lat: 40.6159, lon: -73.7324 },
    { id: 'cedarhurst',     name: 'Cedarhurst, NY',     lat: 40.6226, lon: -73.7243 },
    { id: 'nyc',            name: 'New York, NY',       lat: 40.7128, lon: -74.0060 }
  ];
  var DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  var CACHE_MS = 10 * 60 * 1000;
  var HOURLY = 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,weather_code,is_day,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index';
  var UNITS_Q = '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto';

  /* ---------------- small helpers ---------------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dirName(deg) { return DIRS[Math.round(deg / 45) % 8]; }
  function round(n) { return Math.round(n); }
  function units(u) { return u === 'metric' ? 'metric' : 'imperial'; }
  function T(f, u) { return u === 'metric' ? round((f - 32) * 5 / 9) : round(f); }
  function TU(u) { return u === 'metric' ? '°C' : '°F'; }
  function S(m, u) { return u === 'metric' ? round(m * 1.609) : round(m); }
  function SU(u) { return u === 'metric' ? 'km/h' : 'mph'; }
  function time12(hhmm) { var p = String(hhmm || '').split(':'); if (p.length < 2) return ''; var h = +p[0], m = p[1]; return (h % 12 || 12) + ':' + m + ' ' + (h < 12 ? 'AM' : 'PM'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = String(s || '').split('-'); return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }

  /* ---------------- weather codes (WMO) ---------------- */
  function describe(code) {
    if (code === 0) return 'Clear';
    if (code <= 2) return 'Partly cloudy';
    if (code === 3) return 'Overcast';
    if (code === 45 || code === 48) return 'Fog';
    if (code >= 51 && code <= 57) return 'Drizzle';
    if (code >= 61 && code <= 67) return 'Rain';
    if (code >= 71 && code <= 77) return 'Snow';
    if (code >= 80 && code <= 82) return 'Showers';
    if (code === 85 || code === 86) return 'Snow showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Cloudy';
  }
  function emoji(code, day) {
    if (code === 0) return day === false ? '🌙' : '☀️';
    if (code <= 2) return day === false ? '☁️' : '⛅';
    if (code === 3) return '☁️';
    if (code === 45 || code === 48) return '🌫️';
    if (code >= 51 && code <= 57) return '🌦️';
    if (code >= 61 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '❄️';
    if (code >= 80 && code <= 82) return '🌦️';
    if (code === 85 || code === 86) return '🌨️';
    if (code >= 95) return '⛈️';
    return '☁️';
  }
  function tone(code) { return code === 0 || code <= 2 ? 'clear' : code === 3 || code === 45 || code === 48 ? 'cloud' : code >= 95 ? 'storm' : (code >= 71 && code <= 77) || code === 85 || code === 86 ? 'snow' : 'rain'; }

  /* ---------------- network (cached, aborting) ---------------- */
  function getJsonOnce(url, ms, fetchFn) {
    var f = fetchFn || (root.fetch && root.fetch.bind(root)); if (!f) return Promise.reject(new Error('no network'));
    var ac = typeof AbortController !== 'undefined' ? new AbortController() : null, t = ac && setTimeout(function () { ac.abort(); }, ms || 10000);
    return f(url, ac ? { signal: ac.signal } : {}).then(function (r) {
      if (t) clearTimeout(t);
      if (!r.ok) { var e = new Error('Weather service returned ' + r.status); e.status = r.status; throw e; }
      return r.json();
    }, function (e) { if (t) clearTimeout(t); var ne = new Error(e && e.name === 'AbortError' ? 'Weather service timed out' : 'Couldn’t reach the weather service'); ne.transient = true; throw ne; });
  }
  // One dropped connection or a brief rate limit must not make the weather vanish: retry once.
  var RETRY_MS = 1200;
  function getJson(url, ms, fetchFn) {
    var key = 'wywo.bw.' + url;
    try { var hit = JSON.parse(sessionStorage.getItem(key)); if (hit && Date.now() - hit.t < CACHE_MS) return Promise.resolve(hit.raw); } catch (e) {}
    return getJsonOnce(url, ms, fetchFn).catch(function (e) {
      if (!(e.transient || e.status === 429 || e.status >= 500)) throw e;
      return new Promise(function (ok) { setTimeout(ok, root.BirdWatchRetryMs != null ? root.BirdWatchRetryMs : RETRY_MS); }).then(function () { return getJsonOnce(url, ms, fetchFn); });
    }).then(function (raw) { try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), raw: raw })); } catch (e) {} return raw; });
  }

  /* ---------------- hourly rows ---------------- */
  function rowAt(h, i, isDayArr) {
    return { time: h.time[i], temp: h.temperature_2m[i], feels: h.apparent_temperature ? h.apparent_temperature[i] : h.temperature_2m[i], humidity: h.relative_humidity_2m ? h.relative_humidity_2m[i] : null,
      pop: h.precipitation_probability ? (h.precipitation_probability[i] || 0) : 0, precip: h.precipitation ? (h.precipitation[i] || 0) : 0, code: h.weather_code[i],
      day: isDayArr ? !!isDayArr[i] : true, wind: h.wind_speed_10m[i], dir: h.wind_direction_10m[i], gust: h.wind_gusts_10m ? h.wind_gusts_10m[i] : h.wind_speed_10m[i], uv: h.uv_index ? (h.uv_index[i] || 0) : 0 };
  }
  function hourIndex(h, dateStr, hhmm) {
    var p = String(hhmm || '12:00').split(':'), hr = +p[0] + (+p[1] >= 30 ? 1 : 0), d = dateStr;
    if (hr > 23) { var nd = parseYmd(dateStr); nd.setDate(nd.getDate() + 1); d = ymd(nd); hr = 0; }
    var want = d + 'T' + pad(hr) + ':00';
    return h.time.indexOf(want);
  }
  function dailyOf(raw, dateStr) {
    var d = raw.daily; if (!d || !d.time) return {};
    var k = d.time.indexOf(dateStr); if (k < 0) return {};
    return { sunrise: d.sunrise ? d.sunrise[k] : '', sunset: d.sunset ? d.sunset[k] : '', hi: d.temperature_2m_max ? d.temperature_2m_max[k] : null, lo: d.temperature_2m_min ? d.temperature_2m_min[k] : null };
  }
  // The note's time is in the user's timezone; forecast hours are in the PLACE's timezone. Convert via the place's UTC offset.
  function placeLocal(dateStr, hhmm, offsetSec) {
    if (offsetSec == null) return { date: dateStr, time: hhmm };
    var d = parseYmd(dateStr), t = String(hhmm || '12:00').split(':'); d.setHours(+t[0], +t[1] || 0, 0, 0);
    var sh = new Date(d.getTime() + offsetSec * 1000).toISOString();
    return { date: sh.slice(0, 10), time: sh.slice(11, 16) };
  }
  function hm(iso) { return iso ? String(iso).slice(11, 16) : ''; }

  /* ---------------- current conditions / outlook (header chip + panel) ---------------- */
  function load(place, fetchFn) {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + place.lat + '&longitude=' + place.lon +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,is_day,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index' +
      '&hourly=' + HOURLY + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max' + UNITS_Q + '&forecast_days=7';
    return getJson(url, 10000, fetchFn).then(function (raw) {
      if (!raw.current || !raw.hourly || !raw.daily) throw new Error('Unexpected weather data');
      var c = raw.current, h = raw.hourly, idx = 0, key = c.time.slice(0, 13);
      for (var i = 0; i < h.time.length; i++) { if (h.time[i].slice(0, 13) === key) { idx = i; break; } }
      var now = { temp: c.temperature_2m, feels: c.apparent_temperature, humidity: c.relative_humidity_2m, precip: c.precipitation, code: c.weather_code, day: !!c.is_day, wind: c.wind_speed_10m, dir: c.wind_direction_10m, gust: c.wind_gusts_10m, uv: c.uv_index, pop: (h.precipitation_probability || [])[idx] || 0 };
      var hours = []; for (var j = idx; j < Math.min(idx + 24, h.time.length); j++) hours.push(rowAt(h, j, h.is_day));
      var d = raw.daily, days = d.time.map(function (t, k) { return { date: t, code: d.weather_code[k], hi: d.temperature_2m_max[k], lo: d.temperature_2m_min[k], pop: d.precipitation_probability_max[k] || 0, uv: d.uv_index_max[k] || 0, sunrise: d.sunrise[k], sunset: d.sunset[k] }; });
      return { place: place, now: now, hours: hours, days: days, sunrise: d.sunrise[0], sunset: d.sunset[0], localTime: c.time };
    });
  }

  /* ---------------- weather AT a note's date + time (past, present or the next week) ---------------- */
  function at(place, dateStr, hhmm, fetchFn) {
    var today = new Date(), diff = Math.round((parseYmd(dateStr) - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 864e5);
    var url;
    if (diff > 6) return Promise.reject(new Error('Forecasts only reach 7 days ahead'));
    if (diff >= -7) url = 'https://api.open-meteo.com/v1/forecast?latitude=' + place.lat + '&longitude=' + place.lon + '&hourly=' + HOURLY + '&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min' + UNITS_Q + '&past_days=7&forecast_days=7';
    else url = 'https://archive-api.open-meteo.com/v1/archive?latitude=' + place.lat + '&longitude=' + place.lon + '&start_date=' + ymd(new Date(parseYmd(dateStr).getTime() - 864e5)) + '&end_date=' + ymd(new Date(parseYmd(dateStr).getTime() + 864e5)) +
      '&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min' + UNITS_Q;
    return getJson(url, 12000, fetchFn).then(function (raw) {
      var loc = placeLocal(dateStr, hhmm, raw.utc_offset_seconds);
      var i = raw.hourly ? hourIndex(raw.hourly, loc.date, loc.time) : -1;
      if (i < 0) throw new Error('No weather data for that date and time yet');
      var r = rowAt(raw.hourly, i, raw.hourly.is_day), dd = dailyOf(raw, loc.date);
      return { place: place.name, lat: place.lat, lon: place.lon, at: dateStr + ' ' + (hhmm || ''), temp: r.temp, feels: r.feels, humidity: r.humidity, code: r.code, text: describe(r.code), day: r.day,
        wind: r.wind, dir: r.dir, gust: r.gust, pop: r.pop, precip: r.precip, uv: r.uv, sunrise: hm(dd.sunrise), sunset: hm(dd.sunset), hi: dd.hi, lo: dd.lo, src: 'Open-Meteo' };
    });
  }
  function search(name, fetchFn) {
    return getJson('https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=' + encodeURIComponent(name), 8000, fetchFn).then(function (j) {
      return (j.results || []).map(function (r) { return { id: 'c:' + r.latitude.toFixed(3) + ',' + r.longitude.toFixed(3), name: [r.name, r.admin1, r.country_code].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude }; });
    });
  }

  /* ---------------- tags worked out offline ---------------- */
  function daypart(hhmm) { var h = +String(hhmm || '12:00').split(':')[0]; return h < 5 ? 'overnight' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night'; }
  function season(dateStr, lat) {
    var m = parseYmd(dateStr).getMonth() + 1, north = (lat == null ? 40 : lat) >= 0;
    var s = (m === 12 || m <= 2) ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'fall';
    if (!north) s = { winter: 'summer', summer: 'winter', spring: 'fall', fall: 'spring' }[s];
    return { name: s, emoji: { winter: '❄️', spring: '🌱', summer: '☀️', fall: '🍂' }[s] };
  }
  function nthWeekday(y, m, wd, n) { var d = new Date(y, m, 1), c = 0; while (true) { if (d.getDay() === wd && ++c === n) return d; d.setDate(d.getDate() + 1); } }
  function lastWeekday(y, m, wd) { var d = new Date(y, m + 1, 0); while (d.getDay() !== wd) d.setDate(d.getDate() - 1); return d; }
  function holidays(y) {
    return [['New Year’s Day', new Date(y, 0, 1)], ['Martin Luther King Jr. Day', nthWeekday(y, 0, 1, 3)], ['Presidents’ Day', nthWeekday(y, 1, 1, 3)], ['Memorial Day', lastWeekday(y, 4, 1)],
      ['Juneteenth', new Date(y, 5, 19)], ['Independence Day', new Date(y, 6, 4)], ['Labor Day', nthWeekday(y, 8, 1, 1)], ['Columbus / Indigenous Peoples’ Day', nthWeekday(y, 9, 1, 2)],
      ['Veterans Day', new Date(y, 10, 11)], ['Thanksgiving', nthWeekday(y, 10, 4, 4)], ['Christmas Day', new Date(y, 11, 25)]];
  }
  // nearest US federal holiday from 1 day ago to 7 days ahead, e.g. "Veterans Day in 5 days"
  function holidayNear(dateStr) {
    var d = parseYmd(dateStr), best = null;
    [d.getFullYear(), d.getFullYear() + 1].forEach(function (y) { holidays(y).forEach(function (h) { var diff = Math.round((h[1] - d) / 864e5); if (diff >= -1 && diff <= 7 && (!best || Math.abs(diff) < Math.abs(best.diff))) best = { name: h[0], diff: diff }; }); });
    if (!best) return null;
    return { name: best.name, diff: best.diff, text: best.diff === 0 ? best.name + ' (today)' : best.diff === -1 ? best.name + ' (yesterday)' : best.name + (best.diff === 1 ? ' tomorrow' : ' in ' + best.diff + ' days') };
  }
  function whenLabel(dateStr, hhmm) {
    var d = parseYmd(dateStr); if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) + (hhmm ? ' · ' + time12(hhmm) : '');
  }

  // The tag chips for a note: [{ k, ico, text }] honouring the per-tag switches (s.tagsOn)
  function conditions(s, u) {
    u = units(u); var on = s.tagsOn || {}, out = [], wx = s.wx, lat = wx ? wx.lat : 40.6;
    if (!s.date) return out;
    var d = parseYmd(s.date);
    if (on.when !== false) {
      out.push({ k: 'when', d: true, ico: '🗓', text: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) });
      if (s.time) { var dp = daypart(s.time); out.push({ k: 'when', ico: { overnight: '🌌', morning: '🌅', afternoon: '🌤', evening: '🌆', night: '🌙' }[dp], text: time12(s.time) + ' (' + dp + ')' }); }
    }
    if (on.season !== false) { var se = season(s.date, lat); out.push({ k: 'season', ico: se.emoji, text: se.name.charAt(0).toUpperCase() + se.name.slice(1) }); }
    if (on.weather !== false && wx) {
      out.push({ k: 'weather', ico: emoji(wx.code, wx.day), text: describe(wx.code) + ', ' + T(wx.temp, u) + TU(u) + (Math.abs(wx.feels - wx.temp) >= 4 ? ' (feels ' + T(wx.feels, u) + TU(u) + ')' : '') });
      out.push({ k: 'weather', ico: '💨', text: 'Wind ' + dirName(wx.dir) + ' ' + S(wx.wind, u) + ' ' + SU(u) + (wx.gust - wx.wind > 10 ? ', gusts ' + S(wx.gust, u) : '') });
      if (wx.pop >= 40 || wx.precip > 0.01) out.push({ k: 'weather', ico: '☔', text: wx.precip > 0.01 ? 'Precipitation now' : wx.pop + '% chance of precipitation' });
    }
    if (on.sun === true && wx && (wx.sunrise || wx.sunset)) out.push({ k: 'sun', ico: '🌇', text: (wx.sunrise ? 'Sunrise ' + time12(wx.sunrise) : '') + (wx.sunrise && wx.sunset ? ' · ' : '') + (wx.sunset ? 'Sunset ' + time12(wx.sunset) : '') });
    if (on.holiday !== false) { var h = holidayNear(s.date); if (h) out.push({ k: 'holiday', ico: '🇺🇸', text: h.text }); }
    return out;
  }

  /* ================= Watch score, best window, rain, UV, AQI ================= */
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  // 0-100 "how good is it to be outside watching birds / walking". Inputs: °F, mph, %, inches, UV index.
  function watchScore(p) {
    var s = 100;
    s -= Math.max(0, p.wind - 8) * 2.2;
    s -= Math.max(0, (p.gust || p.wind) - 20) * 1.0;
    var f = p.feels != null ? p.feels : p.temp;
    if (f < 45) s -= (45 - f) * 1.5; else if (f > 80) s -= (f - 80) * 2.2;
    s -= (p.pop || 0) * 0.3;
    if (p.precip > 0.01) s -= 18 + Math.min(p.precip * 40, 25);
    if (p.uv > 8) s -= (p.uv - 8) * 2;
    if (p.day === false) s -= 14;
    s = clamp(Math.round(s), 0, 100);
    var tone = s >= 80 ? 'prime' : s >= 60 ? 'good' : s >= 40 ? 'fair' : 'stay';
    return { score: s, tone: tone, label: { prime: 'Prime', good: 'Good', fair: 'Fair', stay: 'Stay in' }[tone] };
  }
  // What to wear / bring, from feels-like °F, wind mph, gust mph, rain %, UV (all imperial inputs).
  function dress(p) {
    var f = p.feels != null ? p.feels : p.temp, out = [], g = p.gust || p.wind || 0;
    out.push(f < 25 ? 'Frigid: insulated coat, hat, gloves and a scarf.' : f < 40 ? 'Cold: warm coat, hat and gloves.' : f < 55 ? 'Cool: a jacket and a warm layer underneath.' : f < 70 ? 'Mild: a light layer you can take off.' : f < 82 ? 'Warm: light, breathable clothes.' : 'Hot: light clothes, shade and plenty of water.');
    if (g >= 30) out.push('Very gusty: secure hats and papers, and stay clear of trees and signs.'); else if (g >= 20) out.push('Gusty: a windbreaker helps, and hold on to loose paper.');
    if (p.precip > 0.01 || (p.pop || 0) >= 60) out.push('Rain likely: bring a rain jacket or umbrella.'); else if ((p.pop || 0) >= 30) out.push('A chance of rain: keep a small umbrella handy.');
    if (p.uv >= 6) out.push('Strong sun: sunglasses, a hat and sunscreen.'); else if (p.uv >= 3 && p.day !== false) out.push('Sunglasses are a good idea.');
    out.push('Binoculars, a charged phone and a water bottle.');
    return out;
  }
  // Daylight guidance from a day object ({sunrise, sunset} as local ISO) and the current local ISO time.
  function daylightTips(day, nowIso) {
    var hm = function (v) { var x = /(\d{1,2}):(\d{2})(?!.*\d:\d)/.exec(String(v)); return x ? [+x[1], +x[2]] : [0, 0]; }, m = function (v) { var q = hm(v); return q[0] * 60 + q[1]; },
      t12 = function (v) { var q = hm(v); return time12(q[0] + ':' + (q[1] < 10 ? '0' : '') + q[1]); }, now = m(nowIso), rise = m(day.sunrise), set = m(day.sunset), out = [];
    if (now < rise - 30) out.push('Before dawn. First light is around ' + t12(day.sunrise) + '.');
    else if (now < rise + 90) out.push('Early light: the best birdsong and softest light of the day.');
    else if (now < set - 90) out.push('Daylight now, with about ' + Math.round((set - now) / 6) / 10 + ' hours until sunset.');
    else if (now < set + 15) out.push('Golden hour: sunset is at ' + t12(day.sunset) + '. Head in soon.');
    else out.push('After dark. Take a flashlight and wear something bright.');
    if (now >= set - 45 && now < set + 30) out.push('Lights on if you are out within 45 minutes of dark.');
    return out;
  }
  function verdict(tone) { return { prime: 'Lovely out. A great time to be outside.', good: 'Good conditions. Mind the wind.', fair: 'Fine if you dress for it.', stay: 'Better kept indoors for now.' }[tone]; }
  // best two-hour DAYLIGHT stretch in the next 24 hours -> { i, avg } (index of the first hour)
  function bestWindow(hours) {
    var best = null;
    for (var i = 0; i < hours.length - 1; i++) {
      var a = hours[i], b = hours[i + 1]; if (!a.day || !b.day) continue;
      var avg = (watchScore(a).score + watchScore(b).score) / 2;
      if (!best || avg > best.avg) best = { i: i, avg: Math.round(avg) };
    }
    return best;
  }
  // Plain-language rain summary from the next hours (+ optional 15-minute nowcast)
  function rainOutlook(hours, minutely, u) {
    u = units(u); var total = 0, peak = 0, first = -1, last = -1, i;
    for (i = 0; i < hours.length; i++) {
      total += hours[i].precip || 0; peak = Math.max(peak, hours[i].pop || 0);
      if ((hours[i].pop >= 50 || hours[i].precip > 0.01)) { if (first < 0) first = i; last = i; }
    }
    var unit = u === 'metric' ? 'mm' : 'in', amt = u === 'metric' ? +(total * 25.4).toFixed(1) : +total.toFixed(2);
    var headline;
    if (first < 0) headline = 'Dry for the next ' + hours.length + ' hours';
    else if (first === 0 && hours[0].precip > 0.01) headline = 'Raining now' + (last < hours.length - 1 ? ', easing around ' + time12(hours[last + 1].time.slice(11, 16)) : ', likely to continue');
    else headline = 'Rain likely from ' + time12(hours[first].time.slice(11, 16)) + (amt ? ', about ' + amt + ' ' + unit : '');
    var now = null;
    if (minutely && minutely.length) {
      var wet = minutely.findIndex(function (v) { return v > 0.004; });
      now = wet === -1 ? 'No rain in the next ' + (minutely.length * 15 >= 60 ? Math.round(minutely.length / 4) + ' hours' : minutely.length * 15 + ' minutes') : (wet === 0 ? 'Rain right now' : 'Rain starts in about ' + wet * 15 + ' minutes');
    }
    return { total: total, amount: amt, unit: unit, peak: peak, headline: headline, nowcast: now, firstWet: first };
  }
  var UV_LEVELS = [[3, 'Low', '#2e9d5b', 'No protection needed for most people.'], [6, 'Moderate', '#d4b106', 'Wear sunglasses; sunscreen if outside for long.'], [8, 'High', '#e8891d', 'Sunscreen, hat and shade at midday.'], [11, 'Very high', '#d64545', 'Extra protection; avoid the midday sun.'], [99, 'Extreme', '#8e44ad', 'Stay in the shade; unprotected skin burns fast.']];
  function uvInfo(uv) {
    var v = Math.max(0, uv || 0), lv = UV_LEVELS.filter(function (l) { return v < l[0]; })[0] || UV_LEVELS[4];
    return { value: Math.round(v * 10) / 10, level: lv[1], color: lv[2], advice: lv[3], burnMin: v < 1 ? null : Math.round(200 / (3 * v) / 5) * 5 || 5 };
  }
  var AQI_LEVELS = [[50, 'Good', '#2e9d5b', 'Air quality is great. Enjoy the outdoors.'], [100, 'Moderate', '#d4b106', 'Fine for most; unusually sensitive people may notice.'], [150, 'Unhealthy for sensitive groups', '#e8891d', 'Children, older adults and people with asthma should take it easy outside.'], [200, 'Unhealthy', '#d64545', 'Everyone should limit long or heavy outdoor activity.'], [300, 'Very unhealthy', '#8e44ad', 'Avoid outdoor activity; keep windows closed.'], [999, 'Hazardous', '#7e0023', 'Stay indoors and avoid physical activity.']];
  function aqiInfo(aqi) {
    var v = Math.max(0, Math.round(aqi || 0)), lv = AQI_LEVELS.filter(function (l) { return v <= l[0]; })[0] || AQI_LEVELS[5];
    return { value: v, level: lv[1], color: lv[2], advice: lv[3], pct: clamp(v / 300, 0, 1) };
  }
  function loadAir(place, fetchFn) {
    var url = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + place.lat + '&longitude=' + place.lon +
      '&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi&hourly=us_aqi&timezone=auto&forecast_days=2';
    return getJson(url, 10000, fetchFn).then(function (raw) {
      var c = raw.current; if (!c || c.us_aqi == null) throw new Error('Air quality isn’t available for this place');
      var h = raw.hourly || { time: [], us_aqi: [] }, key = (c.time || '').slice(0, 13), idx = Math.max(0, h.time.findIndex(function (t) { return t.slice(0, 13) === key; })), hours = [];
      for (var i = idx; i < Math.min(idx + 24, h.time.length); i++) hours.push({ time: h.time[i], aqi: h.us_aqi[i] });
      return { place: place, now: { aqi: c.us_aqi, eaqi: c.european_aqi, pm25: c.pm2_5, pm10: c.pm10, o3: c.ozone, no2: c.nitrogen_dioxide, so2: c.sulphur_dioxide, co: c.carbon_monoxide }, hours: hours, localTime: c.time };
    });
  }
  function loadNowcast(place, fetchFn) {
    return getJson('https://api.open-meteo.com/v1/forecast?latitude=' + place.lat + '&longitude=' + place.lon + '&minutely_15=precipitation&forecast_minutely_15=8&timezone=auto', 8000, fetchFn)
      .then(function (raw) { return (raw.minutely_15 && raw.minutely_15.precipitation) || []; }, function () { return []; });
  }

  /* ================= Tides (NOAA CO-OPS — the same source ClearSky uses) ================= */
  var NOAA = 'https://api.tidesandcurrents.noaa.gov', LB_STATION = { id: '8516663', name: 'Long Beach, NY', lat: 40.5883, lon: -73.6583 };
  function km(a, b, c, d) { var R = 6371, r = Math.PI / 180, dLat = (c - a) * r, dLon = (d - b) * r, x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2); return 2 * R * Math.asin(Math.sqrt(x)); }
  function tideStation(place, fetchFn) {
    var d = km(place.lat, place.lon, LB_STATION.lat, LB_STATION.lon);
    if (d <= 25) return Promise.resolve({ id: LB_STATION.id, name: LB_STATION.name, distKm: Math.round(d) });
    return getJson(NOAA + '/mdapi/prod/webapi/stations.json?type=tidepredictions&units=english', 20000, fetchFn).then(function (j) {
      var best = null; (j.stations || []).forEach(function (st) { if (st.lat == null) return; var dd = km(place.lat, place.lon, st.lat, st.lng); if (!best || dd < best.distKm) best = { id: st.id, name: st.name + (st.state ? ', ' + st.state : ''), distKm: Math.round(dd) }; });
      if (!best || best.distKm > 150) throw new Error('No tide station within 150 km of ' + place.name);
      return best;
    });
  }
  function noaaTime(t) { var m = String(t).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : NaN; }   // naive station-local minutes, as epoch ms
  function loadTides(place, fetchFn) {
    return tideStation(place, fetchFn).then(function (st) {
      var y = new Date(Date.now() - 864e5), begin = y.getFullYear() + pad(y.getMonth() + 1) + pad(y.getDate());
      var url = NOAA + '/api/prod/datagetter?station=' + st.id + '&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json&interval=hilo&begin_date=' + begin + '&range=96';
      return getJson(url, 15000, fetchFn).then(function (raw) {
        if (!raw.predictions || !raw.predictions.length) throw new Error((raw.error && raw.error.message) || 'No tide predictions for this station');
        return { station: st, events: raw.predictions.map(function (p) { return { t: p.t, ms: noaaTime(p.t), type: p.type, ft: +p.v }; }) };
      });
    });
  }
  // smooth tide height between high/low events (cosine interpolation is how tide tables are usually drawn)
  function tideAt(events, ms) {
    for (var i = 0; i < events.length - 1; i++) {
      var a = events[i], b = events[i + 1];
      if (ms >= a.ms && ms <= b.ms) { var f = (ms - a.ms) / (b.ms - a.ms); return Math.round((a.ft + (b.ft - a.ft) * (1 - Math.cos(Math.PI * f)) / 2) * 1000) / 1000; }
    }
    return null;
  }
  function tideCurve(events, fromMs, toMs, stepMin) {
    var out = [], step = (stepMin || 30) * 6e4; for (var t = fromMs; t <= toMs; t += step) { var h = tideAt(events, t); if (h != null) out.push({ ms: t, ft: h }); } return out;
  }
  function tideNow(events, nowMs) {
    var prev = null, next = null;
    for (var i = 0; i < events.length; i++) { if (events[i].ms <= nowMs) prev = events[i]; else { next = events[i]; break; } }
    if (!prev || !next) return null;
    return { prev: prev, next: next, rising: next.type === 'H', ft: tideAt(events, nowMs), frac: (nowMs - prev.ms) / (next.ms - prev.ms), minToNext: Math.round((next.ms - nowMs) / 6e4) };
  }
  function ftToUnit(ft, u) { return u === 'metric' ? +(ft * 0.3048).toFixed(2) : +(+ft).toFixed(1); }
  function lenUnit(u) { return u === 'metric' ? 'm' : 'ft'; }

  root.BirdWatch = { dress: dress, daylightTips: daylightTips, watchScore: watchScore, verdict: verdict, bestWindow: bestWindow, rainOutlook: rainOutlook, uvInfo: uvInfo, aqiInfo: aqiInfo, loadAir: loadAir, loadNowcast: loadNowcast,
    tideStation: tideStation, loadTides: loadTides, tideAt: tideAt, tideCurve: tideCurve, tideNow: tideNow, noaaTime: noaaTime, ftToUnit: ftToUnit, lenUnit: lenUnit, km: km, UV_LEVELS: UV_LEVELS, AQI_LEVELS: AQI_LEVELS, PLACES: PLACES, load: load, at: at, search: search, describe: describe, emoji: emoji, tone: tone, dirName: dirName, T: T, TU: TU, S: S, SU: SU, time12: time12, daypart: daypart, season: season, holidayNear: holidayNear, whenLabel: whenLabel, conditions: conditions, ymd: ymd };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BirdWatch;
})(typeof window !== 'undefined' ? window : globalThis);
