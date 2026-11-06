<div align="center">

<img src="assets/logo/wywo-mark-bluebird.svg" alt="WYWO bluebird logo" width="120">

# WYWO — While You Were Out

**Turn a quick phone call into a clear, detailed, printable callback note.**
Built for office staff, municipal staff, and anyone who transfers calls.

Powered by **Bluebird UI** — a tiny, themeable design system with 8 bird themes.

[![Version](https://img.shields.io/badge/version-0.5.0-2563c9)](CHANGELOG.md)
[![Publish](https://github.com/Sukonik/wywo/actions/workflows/pages.yml/badge.svg)](https://github.com/Sukonik/wywo/actions/workflows/pages.yml)
[![License](https://img.shields.io/github/license/Sukonik/wywo)](LICENSE)

[🌐 **Live site**](https://sukonik.github.io/wywo/) · [📦 **Repository**](https://github.com/Sukonik/wywo) · [📝 **Changelog**](CHANGELOG.md) · [🐛 **Report an issue**](https://github.com/Sukonik/wywo/issues)

</div>

---

## 🔗 Links

| | |
|---|---|
| 🌐 Live website | https://sukonik.github.io/wywo/ |
| 📦 Source code | https://github.com/Sukonik/wywo |
| 🔄 Deploys / versions | https://github.com/Sukonik/wywo/actions |
| 🐦 Design system | [`bluebird-ui/bluebird.css`](bluebird-ui/bluebird.css) |
| 🏛️ Sister project (style inspiration) | https://github.com/Sukonik/GoldenSunLaw |

## 🧭 Emoji guide

Every emoji in the app and this README means the same thing everywhere.

| Emoji | Meaning | Where you'll see it |
|---|---|---|
| 📞 | The call / the note itself | Title, Markdown export |
| ⚡ | **Quick type** — plain words → filled form | Top card in the app |
| 🐦 | **Bird Seed** — suggest details for the note | Quick type bar |
| 🌰 | Select all seeds | Bird Seed |
| 🌻🌾⚫🌼🌿🥜🌽🌱 | The 8 seeds: name · phone · email · websites · LinkedIn · city departments · company profile · past calls | Bird Seed |
| ＋ | Add a reference or item | Buttons |
| 🖨️ | Export PDF / Print | Preview toolbar |
| 💾 | Save note (on this device only) | Saved notes |
| 🌗 | Light / dark mode | Header |
| 🗂 | Saved notes drawer | Header |
| ✨ | Organize — sort what you typed into fields | Quick type |
| 🎨 | Bluebird UI themes | Theme menu |
| 🪶 | The WYWO bluebird logo | Header, footer, printed note |
| 🌲 | App icon (Cedar, Pine, Maple, Hazelnut, Linden, Beech) | Tab, home screen, Theme → App icon |
| 🔄 | Automatic merge & publish | Workflows |
| 🔒 | Privacy — stays in your browser | Footer / README |
| 🚨 | Urgent call | Urgent flag (red badge) |
| ✅ | Checked call type (Telephoned, Please call…) | Classic slip |

**Quick workflow:** ⚡ type it → 🐦 Bird Seed the gaps → 🖨️ export → 💾 save.

## ✨ What it does

| | |
|---|---|
| ⚡ **Quick type** | Type or paste the call in plain words — *"call Phil Gordon 5167879090 SWA Development Corp, Industrial Zone, wants to speak to Law Staff, questions about development of 4 retail sites… email pgordon@swadevelopment.co… prefers calls after 3pm"* — and the form fills itself. **Nothing is dropped:** anything that can't be sorted goes into *Additional notes* and prints with the note. |
| 🐦 **Bird Seed** | Press **Bird Seed**, tick the seeds you want (or **Select all**), and review suggested details for your note. See below. |
| 🖨️ **Export PDF / Print** | Pick **Full page**, **Pad slip (4¼ × 5½ in)** or **2 per sheet**, press *Export PDF / Print*, choose **Save as PDF** (or your printer). |
| 🗒️ **Four views** | **Note**, **Vintage** slip that mirrors the paper pad, **Plain text**, and **Markdown** — copy or download any of them. |
| 💾 **Saved notes** | Notes are saved locally in your browser (nothing is uploaded). Re-open or delete them any time. |
| 🔠 **Large, readable text** | Large by default (Standard / Large / Extra large), applied to every view and printout. The Vintage slip uses a clean calligraphy hand (Dancing Script) instead of scratchy handwriting. |
| 🗂 **Notes drawer** | Saved notes as simple cards, one click to reopen. |
| 🌗 **Light / dark + 8 themes** | Responsive from phone to desktop. |

### Example output

```
WHILE YOU WERE OUT

CALLBACK REQUEST

FOR: Law Staff

CALLER: Phil Gordon
COMPANY: SWA Development Corp
PHONE: 516-787-9090
ALSO: pgordon@swadevelopment.co · 646-898-0560

REASON FOR CALL
Phil wants to speak with Law Staff.
Phil has questions concerning:
Industrial Zone
Development of 4 retail sites
Development of 2 residential sites

REQUESTED ACTION
Please call Phil back after 3 pm.

ADDITIONAL NOTES
Prefers calls after 3 pm. Can also be reached by email or SMS.

RELEVANT REFERENCE INFORMATION
SWA Development Corp
Company website
https://swadevelopment.co
```

Press **Load example** in the app to see the full version.

## 🐦 Bluebird UI themes

| Theme | Colour | `data-theme` |
|---|---|---|
| Bluebird | blue | `bluebird` |
| Monk Parakeet | green | `parakeet` |
| Cardinal | red | `cardinal` |
| Goldfinch | yellow | `goldfinch` |
| Roseate Spoonbill | pink | `spoonbill` |
| Song Sparrow | brown | `sparrow` |
| American Robin | orange | `robin` |
| Night-Heron | black | `heron` |

Each theme ships light and dark variants (`data-mode="light|dark"`, or follows the OS). All colours derive from one brand colour per theme, so adding a ninth bird is one line in [`bluebird-ui/bluebird.css`](bluebird-ui/bluebird.css).

Components: container, card, button (primary / ghost / danger / icon), input / textarea / select, check chips, tabs, badges, swatches, toast.

```html
<html data-theme="cardinal" data-mode="dark">
  <link rel="stylesheet" href="bluebird-ui/bluebird.css">
  <button class="bb-btn bb-btn--primary">Save</button>
```

## 🚀 Run it

No build step, no dependencies. Open `index.html`, or:

```bash
python3 -m http.server 8080
```

## 🔄 Automatic merge & publish

Every new version is shipped automatically:

1. Push to a `claude/**` branch.
2. [`auto-merge.yml`](.github/workflows/auto-merge.yml) opens a PR into `main` and squash-merges it.
3. [`pages.yml`](.github/workflows/pages.yml) deploys the site to **GitHub Pages**, stamping the commit hash into the footer.

**One-time setup (repo owner):**
- *Settings → Pages → Source:* **GitHub Actions**
- *Settings → Actions → General → Workflow permissions:* **Read and write**, and tick **Allow GitHub Actions to create and approve pull requests**

## 🐦 Bird Seed

Bird Seed reads your note and **suggests details to add**. Pick any seeds (or select them all), press **🌱 Scatter seeds**, then tick what you want. Ticked items are written into the right place: fields, *Additional notes*, or *References*, so they print with the note. Nothing is added until you press **Add**, and **guesses are never pre-ticked**.

| Seed | Does | How it works |
|---|---|---|
| 🌻 **Sunflower** | Full name | Fixes capitalisation (`phil gordon` → `Phil Gordon`), completes a first name from an email like `first.last@…`, or from an earlier call |
| 🌾 **Millet** | Phone check | Standard `###-###-####` format, area-code region (NY area codes built in), flags short, invalid or reserved-for-fiction `555-01xx` numbers. It can’t tell who owns the line |
| ⚫ **Nyjer** | Email | Confirms an email’s domain accepts mail (public DNS). With no email, proposes likely addresses on the company’s verified mail domain, marked as guesses |
| 🌼 **Safflower** | Websites | Tries sensible domains for the company and keeps only ones that exist. Confirm it’s the right company |
| 🌿 **Hemp** | LinkedIn | Company page guess plus LinkedIn company and people search links (LinkedIn can’t be checked from the browser) |
| 🥜 **Peanut** | City departments | **Verified Long Beach, NY directory**: matches your topics (zoning, permits, mercantile license, taxes, water…) to departments with phone, room and links |
| 🌽 **Cracked corn** | Company profile | Public summary, HQ and website from Wikidata when the company has an entry |
| 🌱 **Thistle** | Past calls | How many times they called before, what about, and fills missing details from your saved notes |

Trust labels on every suggestion: **✓ From a source** · **Worked out from your note** · **Guess — confirm first**. Items marked *Opens in a new tab* are search links and aren’t added to the note.

**No keys, no accounts.** Network seeds use free public services (Google public DNS and Wikidata) and say so if you’re offline.

**Long Beach directory:** [`src/directory.js`](src/directory.js) holds each department’s phone, room and link, copied from the department’s own page on longbeachny.gov (checked 2026-11-06). City numbers change, so re-check before relying on them. Add or edit departments there.

## 🌲 Favicons 2.0 & logo

The WYWO bluebird (pen-nib wing, paper-fold tail) is the brand mark. It appears in the header, footer and printed note, recoloured by the colour theme.

Six botanical app icons wrap the same black bluebird: **Cedar** (default), **Pine**, **Maple**, **Hazelnut**, **Linden**, **Beech**.

| Where | What |
|---|---|
| Browser tab | `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png` (Cedar by default) |
| Phone home screen | `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `site.webmanifest` |
| Pick another icon | **Theme menu → App icon**. It changes the tab and home-screen icon and is remembered on this device |
| All six, every size | [`assets/icons/<tree>/`](assets/icons/) (16 · 32 · 48 · `.ico` · 180 touch · 192 · 512) |

👀 **See them all:** [`assets/icons/index.html`](assets/icons/index.html) (live: https://sukonik.github.io/wywo/assets/icons/)

The icons already include their own rounded styling, so don’t add borders or shadows. iOS applies its own mask: test on a device before an App Store release (the 1024 px Cedar source is `assets/icons/cedar/app-icon-1024.png`). The logo’s source SVGs are in [`assets/logo/`](assets/logo/).

## 🏷️ Versions & updates

Current version: **0.5.0**. Every merge to `main` publishes automatically, and the footer shows the build hash of what you're running (`build a1b2c3d`). Full history lives in the [Changelog](CHANGELOG.md).

| Version | Highlights |
|---|---|
| **0.5.0** | 🌲 **Favicons 2.0**: six botanical tree icons (Cedar default), choose yours in Theme → App icon |
| **0.4.0** | 🪶 **Icons 2.0**: the WYWO bluebird logo, themed favicons / app icons for all 8 birds, installable web-app manifest |
| **0.3.1** | 🧪 New sample call (Phil Gordon, SWA Development Corp); Quick type understands “wants to speak to…”, preferences like “after 3pm”, and bare websites |
| **0.3.0** | 🐦 **Bird Seed**: 8 seeds that suggest names, phone checks, emails, websites, LinkedIn, verified Long Beach, NY departments, company profiles and past calls — you tick what goes in your note |
| **0.2.0** | ✨ Calmer Keep × Apple Notes layout, nothing lost in Quick type (leftovers → Additional notes), clean calligraphy Vintage slip, larger text by default |
| **0.1.0** | 🚀 First release: Bluebird UI (8 themes), ⚡ Quick type, 🔎 lookups, 🖨️ PDF layouts, 🔄 auto-publish |

**Releasing a new version:** bump the version in this README and [`CHANGELOG.md`](CHANGELOG.md), push to a `claude/**` branch (or open a PR to `main`) and the Publish workflow does the rest.

## 🔒 Privacy

Everything runs in your browser. Drafts and saved notes live in `localStorage`. The only network calls are the optional Bird Seed lookups (Google public DNS and Wikidata); only the company name or email domain is sent, never the whole note. Always verify looked-up details before relying on them.

## 🗂️ Project layout

```
index.html            app shell
bluebird-ui/          design system (tokens, 8 themes, components)
src/app.css           app layout + print styles
assets/logo/          logo source SVGs (mark, favicon, app icon)
assets/icons/         six tree icons × every size (+ index.html board)
favicon*.png / .ico, apple-touch-icon.png, android-chrome-*.png, site.webmanifest   Cedar defaults
src/app.js            form, quick-type parser, Bird Seed UI, renderers, export
src/birdseed.js       Bird Seed engine (8 seeds)
src/directory.js      verified Long Beach, NY department directory
.github/workflows/    auto-merge + Pages publish
```

## 📄 License

See [LICENSE](LICENSE).
