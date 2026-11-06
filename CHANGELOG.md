# Changelog 📝

All notable changes to WYWO / Bluebird UI. Versions follow [SemVer](https://semver.org/).

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
