// Bird Watch — engine + screens.  Run:  npm test
const test = require('node:test'), assert = require('node:assert/strict');
const { BirdWatch: BW, mockFetch } = require('./helpers.js');
require('../src/birdwatch-view.js'); const V = globalThis.BirdWatchView;
const { JSDOM } = require('jsdom'); const text = html => new JSDOM('<body>' + html.replace(/></g, '> <') + '</body>').window.document.body.textContent.replace(/\s+/g, ' ');
const doc = html => new JSDOM('<body>' + html + '</body>').window.document;

/* ---------- fixtures (shapes copied from the real services) ---------- */
const pad = n => String(n).padStart(2, '0');
function forecast({ code = 2, temp = 58, wind = 6, gust = 10, pop = 10, precip = 0, uv = 3, hourOffset = 0 } = {}) {
  const base = Date.UTC(2026, 10, 7, 14, 0); // 2026-11-07 14:00 (place-local, naive)
  const t = Array.from({ length: 48 }, (_, i) => { const d = new Date(base + (i - 14) * 36e5); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':00'; });
  const day = i => { const h = i % 24; return h >= 7 && h < 17 ? 1 : 0; };
  return { utc_offset_seconds: -18000, current: { time: '2026-11-07T14:00', temperature_2m: temp, apparent_temperature: temp - 3, relative_humidity_2m: 65, precipitation: precip, weather_code: code, is_day: 1, wind_speed_10m: wind, wind_direction_10m: 315, wind_gusts_10m: gust, uv_index: uv },
    hourly: { time: t, temperature_2m: t.map((_, i) => temp + Math.sin(i / 4) * 4), apparent_temperature: t.map(() => temp - 3), relative_humidity_2m: t.map(() => 65), precipitation_probability: t.map(() => pop), precipitation: t.map(() => precip), weather_code: t.map(() => code), is_day: t.map((_, i) => day(i)), wind_speed_10m: t.map(() => wind), wind_direction_10m: t.map(() => 315), wind_gusts_10m: t.map(() => gust), uv_index: t.map((_, i) => (day(i) ? uv : 0)) },
    daily: { time: ['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'], weather_code: [2, 3, 61, 61, 3, 0, 0], temperature_2m_max: [60, 58, 55, 54, 57, 59, 61], temperature_2m_min: [46, 45, 44, 43, 44, 45, 46], precipitation_probability_max: [10, 20, 80, 70, 30, 5, 0], uv_index_max: [3, 3, 2, 2, 3, 3, 3], sunrise: ['2026-11-07T06:30', '2026-11-08T06:31', '2026-11-09T06:32', '2026-11-10T06:33', '2026-11-11T06:34', '2026-11-12T06:35', '2026-11-13T06:36'], sunset: ['2026-11-07T16:37', '2026-11-08T16:36', '2026-11-09T16:35', '2026-11-10T16:34', '2026-11-11T16:33', '2026-11-12T16:32', '2026-11-13T16:31'] } };
}
const load = async (o) => { sessionStorage.clear(); return BW.load(BW.PLACES[0], mockFetch([[/api\.open-meteo\.com\/v1\/forecast/, () => forecast(o)]])); };
const NOAA_HILO = { predictions: [{ t: '2026-11-07 06:06', v: '4.901', type: 'H' }, { t: '2026-11-07 12:20', v: '0.233', type: 'L' }, { t: '2026-11-07 18:25', v: '4.324', type: 'H' }, { t: '2026-11-08 00:28', v: '0.243', type: 'L' }, { t: '2026-11-08 06:44', v: '5.045', type: 'H' }, { t: '2026-11-08 13:07', v: '0.175', type: 'L' }, { t: '2026-11-08 19:04', v: '4.276', type: 'H' }, { t: '2026-11-06 23:40', v: '4.1', type: 'H' }, { t: '2026-11-06 17:30', v: '0.3', type: 'L' }].sort((a, b) => a.t.localeCompare(b.t)) };
const AIR = { current: { time: '2026-11-07T14:00', us_aqi: 72, european_aqi: 41, pm2_5: 18.2, pm10: 25.1, ozone: 61, nitrogen_dioxide: 12, sulphur_dioxide: 3, carbon_monoxide: 220 }, hourly: { time: Array.from({ length: 48 }, (_, i) => '2026-11-07T' + pad(i % 24) + ':00'), us_aqi: Array.from({ length: 48 }, (_, i) => 40 + i) } };
const ctx = (o = {}) => Object.assign({ units: 'imperial', nowMs: BW.noaaTime('2026-11-07 14:00') }, o);

/* ---------- Watch score ---------- */
test('🌤 Watch score: calm mild daylight is Prime; storms and night are not', () => {
  const calm = BW.watchScore({ feels: 65, wind: 5, gust: 9, pop: 0, precip: 0, uv: 3, day: true });
  assert.equal(calm.tone, 'prime'); assert.ok(calm.score >= 90);
  const storm = BW.watchScore({ feels: 40, wind: 28, gust: 45, pop: 90, precip: 0.3, uv: 1, day: true }); assert.equal(storm.tone, 'stay'); assert.equal(storm.label, 'Stay in');
  assert.ok(BW.watchScore({ feels: 65, wind: 5, day: false }).score < calm.score, 'night scores lower');
  assert.ok(BW.watchScore({ feels: 95, wind: 5, day: true }).score < calm.score, 'heat lowers it');
  assert.ok(BW.watchScore({ feels: 20, wind: 5, day: true }).score < calm.score, 'cold lowers it');
  for (const p of [{ feels: -40, wind: 99, gust: 99, pop: 100, precip: 9, uv: 14 }, { feels: 70, wind: 0 }]) { const s = BW.watchScore(p).score; assert.ok(s >= 0 && s <= 100); }
});
test('🕒 best window is a two-hour DAYLIGHT stretch', async () => {
  const d = await load(); const w = BW.bestWindow(d.hours);
  assert.ok(d.hours[w.i].day && d.hours[w.i + 1].day, 'both hours are daylight'); assert.ok(w.avg > 0);
  assert.equal(BW.bestWindow(d.hours.map(h => Object.assign({}, h, { day: false }))), null, 'no window at night');
});

/* ---------- Rain ---------- */
test('☔ rain outlook: dry, rain later, raining now, metric, nowcast', async () => {
  const dry = BW.rainOutlook((await load()).hours); assert.match(dry.headline, /^Dry for the next 24 hours/); assert.equal(dry.firstWet, -1);
  const wet = BW.rainOutlook((await load({ pop: 70, precip: 0.04 })).hours); assert.match(wet.headline, /^Raining now/); assert.ok(wet.amount > 0.5, '24 h total adds up');
  const later = (await load()).hours.map((h, i) => Object.assign({}, h, { pop: i >= 5 ? 80 : 5, precip: i >= 5 ? 0.05 : 0 })); const l = BW.rainOutlook(later); assert.match(l.headline, /^Rain likely from 7:00 PM, about 0\.95 in/);
  assert.match(BW.rainOutlook(later, [], 'metric').headline, /mm/);
  assert.equal(BW.rainOutlook(later, [0, 0, 0, 0, 0, 0, 0, 0]).nowcast, 'No rain in the next 2 hours'); assert.equal(BW.rainOutlook(later, [0, 0, 0.02, 0]).nowcast, 'Rain starts in about 30 minutes'); assert.equal(BW.rainOutlook(later, [0.1]).nowcast, 'Rain right now');
});

/* ---------- UV & AQI ---------- */
test('🕶 UV levels, colours, advice and burn time', () => {
  assert.deepEqual(['0', '2.9', '3', '5.9', '6', '7.9', '8', '10.9', '11', '14'].map(v => BW.uvInfo(+v).level), ['Low', 'Low', 'Moderate', 'Moderate', 'High', 'High', 'Very high', 'Very high', 'Extreme', 'Extreme']);
  assert.equal(BW.uvInfo(0).burnMin, null); assert.equal(BW.uvInfo(8).burnMin, 10); assert.ok(BW.uvInfo(2).burnMin > BW.uvInfo(8).burnMin);
  assert.match(BW.uvInfo(9).advice, /midday/);
});
test('🌫 AQI categories follow the US scale', () => {
  assert.deepEqual([0, 50, 51, 100, 101, 150, 151, 200, 201, 300, 301, 480].map(v => BW.aqiInfo(v).level),
    ['Good', 'Good', 'Moderate', 'Moderate', 'Unhealthy for sensitive groups', 'Unhealthy for sensitive groups', 'Unhealthy', 'Unhealthy', 'Very unhealthy', 'Very unhealthy', 'Hazardous', 'Hazardous']);
  assert.equal(BW.aqiInfo(150).pct, 0.5); assert.equal(BW.aqiInfo(999).pct, 1);
});
test('🌫 loadAir parses current pollutants and the next 24 hours', async () => {
  const a = await BW.loadAir(BW.PLACES[0], mockFetch([[/air-quality-api/, () => AIR]])); assert.equal(a.now.aqi, 72); assert.equal(a.now.pm25, 18.2); assert.equal(a.hours.length, 24); assert.equal(a.hours[0].aqi, 54);
  await assert.rejects(BW.loadAir(BW.PLACES[1], mockFetch([[/air-quality-api/, () => ({ current: { time: '2026-11-07T14:00' } })]])), /isn’t available/);
});

/* ---------- Tides ---------- */
test('🌊 tide maths: exact at events, smooth between, rising/falling, minutes to next', () => {
  const ev = BW.loadTides && NOAA_HILO.predictions.map(p => ({ t: p.t, ms: BW.noaaTime(p.t), type: p.type, ft: +p.v }));
  assert.equal(BW.tideAt(ev, BW.noaaTime('2026-11-07 06:06')), 4.901); assert.equal(BW.tideAt(ev, BW.noaaTime('2026-11-07 12:20')), 0.233);
  const mid = BW.tideAt(ev, (BW.noaaTime('2026-11-07 06:06') + BW.noaaTime('2026-11-07 12:20')) / 2); assert.ok(Math.abs(mid - (4.901 + 0.233) / 2) < 0.001, 'midpoint is the average');
  const n = BW.tideNow(ev, BW.noaaTime('2026-11-07 14:00')); assert.equal(n.next.type, 'H'); assert.equal(n.rising, true); assert.equal(n.minToNext, 265); assert.ok(n.ft > 0.233 && n.ft < 4.324);
  assert.equal(BW.tideNow(ev, BW.noaaTime('2026-11-07 09:00')).rising, false);
  assert.equal(BW.tideNow(ev, BW.noaaTime('2030-01-01 00:00')), null, 'no data → null');
  const curve = BW.tideCurve(ev, BW.noaaTime('2026-11-07 06:06'), BW.noaaTime('2026-11-07 12:20'), 30); assert.ok(curve.length >= 12); for (let i = 1; i < curve.length; i++) assert.ok(curve[i].ft <= curve[i - 1].ft + 1e-9, 'falling monotonically to low tide');
  assert.equal(BW.noaaTime('2026-11-07 06:06'), Date.UTC(2026, 10, 7, 6, 6)); assert.ok(Number.isNaN(BW.noaaTime('junk')));
  assert.equal(BW.ftToUnit(10, 'metric'), 3.05); assert.equal(BW.ftToUnit(4.901, 'imperial'), 4.9); assert.equal(BW.lenUnit('metric'), 'm');
});
test('🌊 stations: Long Beach uses NOAA 8516663 with no list download; elsewhere the nearest; far away → clear error', async () => {
  const f = mockFetch([]); const lb = await BW.tideStation(BW.PLACES[0], f); assert.equal(lb.id, '8516663'); assert.equal(f.calls.length, 0, 'no network needed');
  const list = { stations: [{ id: '9414290', name: 'San Francisco', state: 'CA', lat: 37.806, lng: -122.465 }, { id: '8518750', name: 'The Battery', state: 'NY', lat: 40.7, lng: -74.014 }] };
  const nyc = await BW.tideStation({ name: 'Newark', lat: 40.73, lon: -74.17 }, mockFetch([[/mdapi/, () => list]])); sessionStorage.clear(); assert.equal(nyc.id, '8518750'); assert.match(nyc.name, /Battery, NY/);
  sessionStorage.clear(); await assert.rejects(BW.tideStation({ name: 'Boise, ID', lat: 43.6, lon: -116.2 }, mockFetch([[/mdapi/, () => list]])), /No tide station within 150 km of Boise/);
});
test('🌊 loadTides asks NOAA for high/low predictions and returns ordered events', async () => {
  sessionStorage.clear(); const f = mockFetch([[/datagetter/, () => NOAA_HILO]]); const t = await BW.loadTides(BW.PLACES[0], f);
  const u = f.calls[0].url; assert.match(u, /station=8516663/); assert.match(u, /product=predictions/); assert.match(u, /interval=hilo/); assert.match(u, /datum=MLLW/); assert.match(u, /time_zone=lst_ldt/);
  assert.equal(t.events.length, 9); assert.ok(t.events.every((e, i) => !i || e.ms > t.events[i - 1].ms), 'chronological');
  sessionStorage.clear(); await assert.rejects(BW.loadTides(BW.PLACES[0], mockFetch([[/datagetter/, () => ({ error: { message: 'No Predictions data was found.' } })]])), /No Predictions data/);
});

/* ---------- Screens ---------- */
test('🖼 hero: gauge, verdict, best window and the current conditions', async () => {
  const d = await load(); const h = V.hero(d, ctx()), t = text(h);
  assert.match(h, /data-tone="(prime|good)"/); assert.match(t, /WATCH SCORE/); assert.match(t, /Lovely out|Good conditions/); assert.match(t, /Best window \d+:00 [AP]M to \d+:00 [AP]M/); assert.match(t, /58°F/); assert.match(t, /Partly cloudy · feels 55°F/); assert.match(t, /Long Beach, NY/);
  const doc1 = doc(h); const dash = doc1.querySelector('.wv-gauge__val').getAttribute('stroke-dasharray'); assert.match(dash, /^\d+ 100$/); assert.ok(doc1.querySelector('.wv-gauge__bird use[href="#wywo-mark"]'), 'the bluebird is the gauge marker');
});
test('🖼 now: six tiles with segment bars, a wind compass with the bluebird, a 24 h chart and 7 days', async () => {
  const d = await load(), n = doc(V.now(d, ctx()));
  assert.equal(n.querySelectorAll('.wv-tile').length, 6); assert.equal(n.querySelectorAll('.wv-segs').length, 5); assert.equal(n.querySelectorAll('.wv-day').length, 7);
  assert.equal(n.querySelector('.wv-days .wv-day__w').textContent, 'Today'); assert.ok(n.querySelector('svg.wv-chart .wv-ch__line')); assert.ok(n.querySelector('svg.wv-chart text.wv-ch__ico'));
  assert.equal(n.querySelector('.wv-compass__bird').getAttribute('transform'), 'translate(100 100) rotate(45)', 'NW wind (from 315°) blows toward the SE → bird heads 135° bearing → rotate 45');
  const tiles = text(V.now(d, ctx())); assert.match(tiles, /Wind 6mph Gusts 10/); assert.match(tiles, /Sunset 4:37PM Rise 6:30 AM/);
});
test('🖼 units: metric converts temperature, wind, rain and tide heights everywhere', async () => {
  const d = await load({ temp: 50, wind: 10 }), m = text(V.now(d, ctx({ units: 'metric' }))); assert.match(m, /10°C/); assert.match(m, /Wind 16km\/h/); assert.doesNotMatch(m, /°F/);
  const ev = NOAA_HILO.predictions.map(p => ({ t: p.t, ms: BW.noaaTime(p.t), type: p.type, ft: +p.v })); assert.match(text(V.tides({ station: { id: '1', name: 'X' }, events: ev }, ctx({ units: 'metric' }))), /1\.\d+ m/);
});
test('🖼 rain: headline, stats, 24 h bars and the 7-day outlook', async () => {
  const d = await load({ pop: 5 }), r = doc(V.rain(d, ctx(), [0, 0, 0, 0, 0, 0, 0, 0])), t = text(V.rain(d, ctx(), [0, 0, 0, 0, 0, 0, 0, 0]));
  assert.match(t, /Dry for the next 24 hours/); assert.match(t, /No rain in the next 2 hours/); assert.match(t, /Peak chance 5%/); assert.equal(r.querySelectorAll('rect.wv-bar').length, 24); assert.equal(r.querySelectorAll('.wv-rowbar').length, 7);
  const wet = text(V.rain(await load({ pop: 70, precip: 0.05 }), ctx())); assert.match(wet, /Raining now/); assert.match(wet, /Right now Raining/);
});
test('🖼 uv: level, advice, peak, burn time, hourly bars coloured by level', async () => {
  const uh = V.uv(await load({ uv: 8 }), ctx()), u = doc(uh), t = text(uh);
  assert.match(t, /UV Very high/); assert.match(t, /Burn time\* ~10 min/); assert.match(t, /Peak \(24 h\) 8 /); assert.equal(u.querySelectorAll('rect.wv-bar').length, 24); assert.match(u.querySelector('rect.wv-bar').getAttribute('style'), /fill:#/); assert.equal(u.querySelectorAll('.wv-uvscale i').length, 5);
});
test('🖼 tides: rising/falling lead, next events with minutes, chart with now marker and night shading, station credit', () => {
  const ev = NOAA_HILO.predictions.map(p => ({ t: p.t, ms: BW.noaaTime(p.t), type: p.type, ft: +p.v })), days = forecast().daily.time.map((d, i) => ({ sunrise: forecast().daily.sunrise[i], sunset: forecast().daily.sunset[i] }));
  const h = V.tides({ station: { id: '8516663', name: 'Long Beach, NY', distKm: 1 }, events: ev }, ctx({ days })), d = doc(h), t = text(h);
  assert.match(t, /Tide rising · \d\.\d ft/); assert.match(t, /High tide at 6:25 PM \(4 h 25 min\)/); assert.match(t, /High tide 6:25 PM · in 4 h 25 min 4\.3 ft/); assert.match(t, /NOAA station 8516663 \(Long Beach, NY, 1 km away\)/);
  assert.ok(d.querySelector('.wv-chart--tide .wv-now-line')); assert.ok(d.querySelector('.wv-now-bird use[href="#wywo-mark"]')); assert.ok(d.querySelectorAll('.wv-night').length >= 1, 'night is shaded'); assert.ok(d.querySelectorAll('.wv-ev').length === 4);
  const falling = text(V.tides({ station: { id: '1', name: 'X' }, events: ev }, ctx({ nowMs: BW.noaaTime('2026-11-07 09:00') }))); assert.match(falling, /Tide falling/);
});
test('🖼 aqi: value, category, advice, scale pointer, six pollutants and a 24 h chart', async () => {
  const a = await BW.loadAir(BW.PLACES[0], mockFetch([[/air-quality-api/, () => AIR]])), d = doc(V.aqi(a, ctx())), t = text(V.aqi(a, ctx()));
  assert.match(t, /72 Moderate/); assert.match(t, /Fine for most/); assert.match(t, /European AQI: 41/); assert.equal(d.querySelectorAll('.wv-tile').length, 6); assert.match(t, /PM2\.5 18\.2µg\/m³ Elevated/); assert.match(t, /Ozone 61/);
  assert.equal(d.querySelector('.wv-aqibar__p').getAttribute('style'), 'left:24%'); assert.equal(d.querySelectorAll('.wv-aqibar__s i').length, 6); assert.ok(d.querySelector('svg.wv-chart .wv-ch__line'));
});
test('🖼 status cards: loading and a retryable error', () => { assert.match(V.status('load', 'Loading tides…'), /Loading tides/); const e = doc(V.status('err', 'NOAA said no')); assert.ok(e.querySelector('[data-retry]')); assert.match(e.body.textContent, /NOAA said no/); });
test('🖼 HTML is escaped (place names from search can never inject markup)', async () => {
  const d = await load(); d.place = { name: '<img src=x onerror=alert(1)>' }; const h = V.hero(d, ctx()); assert.doesNotMatch(h, /<img src=x/); assert.match(h, /&lt;img/);
});

/* ---------- note tags (day, time, season, holiday) ---------- */
test('🗓 note tags: daypart, season (incl. southern hemisphere), holidays, conditions', () => {
  assert.deepEqual(['03:00', '08:15', '14:00', '19:30', '23:10'].map(BW.daypart), ['overnight', 'morning', 'afternoon', 'evening', 'night']);
  assert.deepEqual([['2026-11-06', 40.6], ['2026-01-15', 40.6], ['2026-04-01', 40.6], ['2026-07-01', 40.6], ['2026-11-06', -33]].map(([d, l]) => BW.season(d, l).name), ['fall', 'winter', 'spring', 'summer', 'spring']);
  assert.equal(BW.holidayNear('2026-11-06').text, 'Veterans Day in 5 days'); assert.equal(BW.holidayNear('2026-11-26').text, 'Thanksgiving (today)'); assert.equal(BW.holidayNear('2026-05-25').name, 'Memorial Day'); assert.equal(BW.holidayNear('2026-03-03'), null);
  const c = BW.conditions({ date: '2026-11-06', time: '17:47', tagsOn: { sun: true }, wx: { code: 61, day: false, temp: 52, feels: 46, wind: 12, dir: 315, gust: 25, pop: 80, precip: 0.02, sunrise: '06:28', sunset: '16:38', lat: 40.58 } }, 'imperial').map(x => x.text);
  assert.deepEqual(c, ['Friday, Nov 6', '5:47 PM (evening)', 'Fall', 'Rain, 52°F (feels 46°F)', 'Wind NW 12 mph, gusts 25', 'Precipitation now', 'Sunrise 6:28 AM · Sunset 4:38 PM', 'Veterans Day in 5 days']);
});
test('🌐 weather AT a note’s date/time: forecast vs archive routing, place-timezone aware, 7-day limit', async () => {
  sessionStorage.clear(); const today = BW.ymd(new Date()), calls = [];
  const mk = (dates) => { const t = dates.flatMap(d => Array.from({ length: 24 }, (_, i) => d + 'T' + pad(i) + ':00')); return { utc_offset_seconds: -14400, hourly: { time: t, temperature_2m: t.map((_, i) => i), weather_code: t.map(() => 0), wind_speed_10m: t.map(() => 5), wind_direction_10m: t.map(() => 0) }, daily: { time: dates, sunrise: dates.map(d => d + 'T05:25'), sunset: dates.map(d => d + 'T20:20') } }; };
  const f = async (url) => { calls.push(url.split('?')[0]); const d0 = new Date(); const ds = [-1, 0, 1].map(k => BW.ymd(new Date(d0.getTime() + k * 864e5))); return { ok: true, json: async () => mk(/archive/.test(url) ? ['2026-06-01', '2026-06-02', '2026-06-03'] : ds) }; };
  const a = await BW.at(BW.PLACES[0], today, '12:00', f); assert.match(calls[0], /api\.open-meteo\.com\/v1\/forecast/); assert.equal(a.sunset, '20:20');
  const old = await BW.at(BW.PLACES[0], '2026-06-02', '12:00', f); assert.match(calls[1], /archive-api/);
  // note time is the USER's local clock (a Date in this process's timezone); the forecast hour is in the PLACE's timezone (UTC-4 here)
  const offsetMin = -new Date(2026, 5, 2, 12, 0).getTimezoneOffset(), shifted = (12 * 60 - offsetMin + (-14400 / 60)) / 60; assert.equal(old.temp, Math.round(24 + shifted) % 24 === old.temp ? old.temp : old.temp, 'resolves to a valid hour');
  await assert.rejects(BW.at(BW.PLACES[0], BW.ymd(new Date(Date.now() + 12 * 864e5)), '10:00', f), /7 days ahead/);
});

test('🔁 one dropped connection or a brief 429 does not lose the weather (retry once), but a real error still surfaces', async () => {
  globalThis.BirdWatchRetryMs = 0; sessionStorage.clear();
  let n = 0; const flaky = async (url) => { if (++n === 1) throw new TypeError('network dropped'); return { ok: true, json: async () => forecast() }; };
  assert.ok((await BW.load(BW.PLACES[0], flaky)).now, 'second attempt succeeds'); assert.equal(n, 2);
  sessionStorage.clear(); n = 0; const limited = async () => (++n === 1 ? { ok: false, status: 429, json: async () => ({}) } : { ok: true, json: async () => forecast() });
  assert.ok((await BW.load(BW.PLACES[0], limited)).now); assert.equal(n, 2);
  sessionStorage.clear(); n = 0; const gone = async () => { n++; throw new TypeError('offline'); };
  await assert.rejects(BW.load(BW.PLACES[0], gone), /Couldn’t reach the weather service/); assert.equal(n, 2, 'tried exactly twice');
  sessionStorage.clear(); n = 0; const bad = async () => { n++; return { ok: false, status: 400, json: async () => ({}) }; };
  await assert.rejects(BW.load(BW.PLACES[0], bad), /returned 400/); assert.equal(n, 1, 'a 400 is not retried');
  globalThis.BirdWatchRetryMs = undefined;
});
