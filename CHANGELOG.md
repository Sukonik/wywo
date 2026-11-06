# Changelog 📝

All notable changes to WYWO / Bluebird UI. Versions follow [SemVer](https://semver.org/).

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
