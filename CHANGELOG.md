# Changelog 📝

All notable changes to WYWO / Bluebird UI. Versions follow [SemVer](https://semver.org/).

## [0.12.0] — 2026-11-07 🔎
### Added: Bird Seed finds people and companies faster
- 🔎 **Look it up yourself:** one-tap searches for the caller and company on **Google, LinkedIn, Facebook, X, Google Maps, OpenCorporates and the Better Business Bureau**, plus Google searches for the phone number and email. They open each site's own search in a new tab; WYWO sends nothing.
- ⚡ **Send to Zapier:** paste a Zapier *Catch Hook* URL and send the note's fields to your own Zap (CRM, sheet, Slack). Only runs when you press the button.
- 🧪 96 tests.

## [0.11.0] — 2026-11-07 🧭
### Changed: Bird Watch looks and reads like Ride Weather
- 🔢 Numbered cards with mono-spaced headers (B-01…B-07) and mono labels on the tiles
- 🧭 **Wind compass** now has a clear arrow showing where the wind blows
- ⏱ **Next hours** strip: scrollable cards with weather, a striped **Watch score** bar, temp, wind and rain chance for each hour
- 👕 **What to wear** (feels-like, gusts, rain chance, UV) and 🌅 **Light & daylight** advice cards
- Fixed page text showing through the sticky tab bar. 94 tests.

## [0.10.2] — 2026-11-07 🧹
### Fixed
- 🧹 **Stale page on phones:** the site's CSS/JS links are now stamped with the build id, so phones load the newest Bird Watch instead of an old cached copy (the footer shows the version you’re on). If you still see the old ClearSky tab, reload once.

## [0.10.1] — 2026-11-07 🔁
### Fixed
- 🔁 **Bird Watch and Bird Seed retry once** after a dropped connection or a brief rate limit (429/5xx), so the weather chip no longer vanishes on a hiccup; real errors (e.g. 400) still show immediately. 92 tests.

## [0.10.0] — 2026-11-07 🌲
### Changed: Bird Watch 2.0 (no more embedded pages)
- 🎯 Rebuilt as a **full-screen, forest-themed weather view** in the spirit of the Bike Club’s Ride Weather: a **Watch score** gauge (the bluebird rides the arc), verdict and **best daylight window**
- Sections **Now · Rain · UV · Tides · AQI**, each with its own native charts: tiles with segment bars, a wind compass where the **bluebird flies with the wind**, 24 h chart, rain bars + nowcast, UV curve + burn time, **NOAA tide curve** with night shading, **AQI** scale and pollutants
- Removed the ClearSky iframes (ClearSky stays linked in the footer); tide data now from **NOAA CO-OPS**, air quality from Open-Meteo
### Added: Bird Seed you can trust
- ✅ **Automated test suite** (`npm test`, 90 tests, plus opt-in live-internet tests `npm run test:live`) covering every seed, all engines, Quick type and Bird Watch; verified able to fail; GitHub Actions runs it on every push
- 🩺 **Check tools** (live self-test of each service), ▶ **Try the real demo** (a real public organisation) and a 🌐 **Company website** box; clearer “nothing found” guidance; Wikidata/OSM rate limits are retried and explained
### Fixed
- ⚡ Quick type: lost caller after a leading `ASAP:` / `Message for X:`, junk fragments like “or cell”, “wants Dana to call back” routing, “Sam at the city clerk” organisations
- 🌊 Tide height rounding; tide station radius (Newark no longer gets Long Beach’s station)
### Internal
- Quick type and Bird Seed “apply to note” moved into testable modules; `package.json`, `tests/`

## [0.9.0] — 2026-11-06 🌤
### Added: Bird Watch
- 🌤 **Weather chip** in the header (icon + temperature) and a **Weather** button in the phone bar open the **Bird Watch panel**: current conditions, next 24 hours, 7 days, place picker (Long Beach area, any city search, or 📍 my location), °F / °C
- 🌐 **ClearSky integration**: the full ClearSky weather app, **Air Quality** and **Tide Charts** open as tabs inside the panel (with “Open full page ↗”)
- 🏷 **Per-note tags**: 🗓 day & time (with daypart), 🍂 season, 🌦 weather, 🌇 sunrise & sunset, 🇺🇸 nearby US holiday. Each has a switch. Shown on the Note, Vintage slip, Text, Markdown and printouts; saved with the note
- Auto-tag: weather fills in for new notes and re-tags when the date/time changes; works for past calls, today and up to 7 days ahead; timezone-correct for the place
- Data: Open-Meteo (free, no key); only coordinates are sent
### Changed (inspired by the Long Beach Bike Club site)
- Soft colour-field background in the theme colours (second colour per bird), shimmer on primary buttons, Inter typeface, richer menu and text styling
- Phone bar is now Edit · Preview · Bird Seed · Weather

## [0.8.1] — 2026-11-06 🩹
### Fixed (from real-iPhone feedback)
- **Call type** chips were stretched into giant checkboxes with clipped labels on phones (text-field styling leaked onto checkboxes)
- Date and time inputs rendered as small pills on iOS; now full width
- Email / cell / fax field spilled past the card edge; stray spacer gap after “Taken by”; section subtitle updated
- Verified no horizontal overflow from 320 px to 1280 px with every section expanded

## [0.8.0] — 2026-11-06 🌲
### Added
- 🌲 **Forest line-art themes**: Cedar, Pine, Maple, Hazelnut, Linden, Beech. Each sets the app icon **and** a clean line illustration, drawn in the current colour theme (quick-card banner, note corner, Bird Seed window, empty states; also printed). Can be switched off
- 🎛 New **Appearance** menu: Light / Dark / Auto, colour theme, forest, line-art switch
- 📱 **Mobile redesign**: Edit / Preview / Bird Seed bottom bar, Appearance and Bird Seed as bottom sheets, 44 px touch targets, stacked export buttons, cleaner header
- 🛠 `tools/build-art.js` and `tools/build-favicons.sh`
### Fixed
- 🪟 Favicons now have **transparent rounded corners** (Chrome showed white corners); all six trees, `.ico`, 16/32/48/192/512
- Appearance menu was rendered off-screen on phones (a header blur trapped it); now mounted at page level
- Quick card hint no longer wraps into a skinny column; note date/“Call is for” aligned on phones
- Printing: phone-layout padding added a blank 2nd page; all 12 layout/size combos print on exactly one page
- Publish: `deploy-pages` waits up to 30 min (the 10 min default timed out twice)

## [0.7.0] — 2026-11-06 🐦
### Changed (Bird Seed 2.0)
- 🐦 Bird Seed now **looks up real information and asks before adding it**. Ten seeds: 🌻 Sunflower (name) · 🌱 Thistle (past calls) · 🌽 Cracked Corn (company profile) · 🎃 Pumpkin (phone) · 🌾 Flax (email) · 🥬 Kale (website) · 🍉 Watermelon (LinkedIn & social) · 🌶️ Pepper (city departments) · 🥒 Cucumber (address) · 🍈 Honeydew (company summary)
- The website seeds **read the company’s own site** (home + team / contact / about pages): names & titles, phones, emails, LinkedIn & social links, street address (checked on a map), description
- Every finding says where it came from, with a **see source ↗** link and an **Add?** checkbox; guesses are never pre-ticked
### Added
- 🛠 **Look-up engines**: free built-in reader (Jina Reader), or **Firecrawl**, **Crawl4AI** (cloud or self-hosted) and **ScrapeGraphAI** with your own key (kept only in your browser; beta)
- README: full Bird Seed section; version history now covers v1–v7

## [0.6.0] — 2026-11-06 📞
### Added
- 📞 **Call is for**: who the call is routed to is now a main field and **always appears** on the Note, Vintage slip, Text and Markdown (and printouts). Blank shows **“Check with team”**
- ⚡ Quick type recognises routing: “message for Sandra”, “asking for Mr. Patel”, “wants to speak to the zoning attorney”, “check with team”
- 🗑 **Clear all** button with an **“Yes, I’m sure”** checkbox: empties the whole current note (saved notes are untouched)

## [0.5.2] — 2026-11-06 🔧
### Fixed
- Publish workflow now cancels a stuck GitHub Pages deployment before deploying (a hung v0.5.0 deploy was blocking every later release with “in progress deployment”)

## [0.5.1] — 2026-11-06 🧼
### Changed
- Header shows just the logo and “WYWO” (removed the “While You Were Out” subtitle)
### Fixed
- 🖨️ Printing: every layout (Full page, Pad slip, 2 per sheet) now auto-fits **one page**, even with Extra large text and long notes (the Pad slip used to spill onto 2–3 pages)
### Added
- 🕰️ Website version history with screenshots of v1–v5 in the README (`docs/history/`)

## [0.5.0] — 2026-11-06 🌲
### Added
- 🌲 **Favicons 2.0**: six botanical tree icons (Cedar default, Pine, Maple, Hazelnut, Linden, Beech) in every size: `.ico`, 16/32/48, Apple touch, 192/512
- **Theme menu → App icon** picker; the choice swaps the tab and touch icons and is remembered
- Relative-path `site.webmanifest` so installing from GitHub Pages works
### Changed
- Replaced the bird-colour favicon set from 0.4.0 (the in-page logo still recolours with the theme)
- Icon board at `assets/icons/` now shows the six trees

## [0.4.0] — 2026-11-06 🪶
### Added
- 🪶 **Icons 2.0**: WYWO bluebird logo (from the Logo Starter) in the header, footer and printed note, recoloured by theme
- Themed favicons and app icons for all 8 birds (`assets/icons/<theme>/`), SVG + PNG + `favicon.ico`, Apple touch icon, 192/512 icons
- The tab icon, touch icon and browser `theme-color` follow the selected theme and light/dark mode
- `site.webmanifest` (installable web app), `tools/build-icons.js`, and an icon board at `assets/icons/`
### Fixed
- 🚑 Deploy workflow now publishes `assets/` (the old placeholder logo was returning 404 on the live site)

## [0.3.1] — 2026-11-06 🧪
### Changed
- New sample call: Phil Gordon · SWA Development Corp · swadevelopment.co (fictional data), used by **Example** and the Quick type hint
### Improved
- ⚡ Quick type: bare websites (`swadevelopment.co`) become references; “wants to speak to Law Staff” fills *For* and *Reason*; “prefers calls after 3pm / can be reached by email or SMS” go to *Additional notes* (and no longer overwrite the call time); bare 10-digit phones are formatted; `--` separators understood
- 🌼 Safflower also tries `.co` domains

## [0.3.0] — 2026-11-06 🐦
### Added
- 🐦 **Bird Seed**: pick any or all of 8 seeds and review suggested details before they go into the note
  - 🌻 Sunflower (full name) · 🌾 Millet (phone check) · ⚫ Nyjer (email) · 🌼 Safflower (websites) · 🌿 Hemp (LinkedIn) · 🥜 Peanut (city departments) · 🌽 Cracked corn (company profile) · 🌱 Thistle (past calls)
- 🏛 Verified Long Beach, NY department directory (phones from longbeachny.gov, checked 2026-11-06)
- Trust labels on every suggestion; guesses are never pre-ticked
### Removed
- The old Look-up panel (replaced by Bird Seed)

## [0.2.0] — 2026-11-06 ✨
### Changed
- 🧹 Redesigned as a calm, Keep × Apple Notes editor: one big quick-type box, soft filled fields, optional details tucked away
- 🔠 Larger text by default, with Standard / Large / Extra large
- ✒️ Vintage slip now uses clean calligraphy (Dancing Script) and larger type
- 🗂 Saved notes moved to a Keep-style drawer; themes in a compact menu
### Fixed
- ⚡ Quick type no longer drops data: unsorted text goes to *Additional notes* (shown in Note, Vintage, Text, Markdown and printouts); also picks up links, extra phones, times, "urgent", titles like Dr.
### Added
- 🖼 `assets/logo.svg` placeholder for your logo

## [0.1.0] — 2026-11-06 🚀
### Added
- 📞 WYWO note generator with Modern, Classic slip, Plain text and Markdown views
- 🐦 Bluebird UI: Bluebird, Monk Parakeet, Cardinal, Goldfinch, Roseate Spoonbill, Song Sparrow, American Robin, Night-Heron — each light and dark
- ⚡ Quick type: plain words fill the form
- 🔎 Lookups: previous call, company info, Google / LinkedIn, phone search, agency offices per topic
- 🖨️ Export PDF / Print: full page, pad slip (4¼×5½), 2 per sheet
- 💾 Saved notes (local to the browser)
- 🔄 Workflows: auto-merge `claude/**` branches and publish to GitHub Pages
