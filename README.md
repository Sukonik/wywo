<div align="center">

# 📞 WYWO — While You Were Out

**Turn a quick phone call into a clear, detailed, printable callback note.**
Built for office staff, municipal staff, and anyone who transfers calls.

Powered by **Bluebird UI** — a tiny, themeable design system with 8 bird themes.

[![Version](https://img.shields.io/badge/version-0.2.0-2563c9)](CHANGELOG.md)
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
| 🔎 | **Look up** missing details | Lookup card |
| 🏢 | Company info (adds a reference) | Lookup button |
| ☎ | Phone lookup — who called / find a number | Lookup button |
| 🏛 | Agency / municipal office for a topic | Lookup buttons |
| ↺ | Fill from a previous call | Lookup button |
| ＋ | Add a reference or item | Buttons |
| 🖨️ | Export PDF / Print | Preview toolbar |
| 💾 | Save note (on this device only) | Saved notes |
| 🌗 | Light / dark mode | Header |
| 🗂 | Saved notes drawer | Header |
| ✨ | Organize — sort what you typed into fields | Quick type |
| 🐦 | Bluebird UI themes | Header swatches |
| 🔄 | Automatic merge & publish | Workflows |
| 🔒 | Privacy — stays in your browser | Footer / README |
| 🚨 | Urgent call | Urgent flag (red badge) |
| ✅ | Checked call type (Telephoned, Please call…) | Classic slip |

**Quick workflow:** ⚡ type it → 🔎 fill the gaps → 🖨️ export → 💾 save.

## ✨ What it does

| | |
|---|---|
| ⚡ **Quick type** | Type or paste the call in plain words — *"Cian O'Brien from OCS Development Group 646-331-2205, transferred by the Building Department, re: zoning, permits, mercantile license"* — and the form fills itself. **Nothing is dropped:** anything that can't be sorted goes into *Additional notes* and prints with the note. |
| 🔎 **Look up missing details** | One or two clicks: fill from a previous call, company info (adds a reference), Google / LinkedIn, "who called this number?", and agency-office searches per topic for your city, each with a **＋ ref** button to drop it into the note. |
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

CALLER: Cian O’Brien
COMPANY: OCS Development Group
PHONE: 646-331-2205

REASON FOR CALL
Cian was transferred by the City of Long Beach Building Department.
Cian has questions concerning:
Industrial Zone / Zoning
Building Permits
Mercantile License

REQUESTED ACTION
Please return Cian’s call regarding the above matters.

RELEVANT REFERENCE INFORMATION
City of Long Beach — Building Department
516-431-1005
https://www.longbeachny.gov/building
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

## 🏷️ Versions & updates

Current version: **0.2.0**. Every merge to `main` publishes automatically, and the footer shows the build hash of what you're running (`build a1b2c3d`). Full history lives in the [Changelog](CHANGELOG.md).

| Version | Highlights |
|---|---|
| **0.2.0** | ✨ Calmer Keep × Apple Notes layout, nothing lost in Quick type (leftovers → Additional notes), clean calligraphy Vintage slip, larger text by default |
| **0.1.0** | 🚀 First release: Bluebird UI (8 themes), ⚡ Quick type, 🔎 lookups, 🖨️ PDF layouts, 🔄 auto-publish |

**Releasing a new version:** bump the version in this README and [`CHANGELOG.md`](CHANGELOG.md), push to a `claude/**` branch (or open a PR to `main`) and the Publish workflow does the rest.

## 🔒 Privacy

Everything runs in your browser. Drafts and saved notes live in `localStorage`. The only network calls are the optional lookup buttons (links open in a new tab; *Company info* queries Wikipedia). Always verify looked-up details before relying on them.

## 🗂️ Project layout

```
index.html            app shell
bluebird-ui/          design system (tokens, 8 themes, components)
src/app.css           app layout + print styles
assets/logo.svg      logo (replace this file with your own)
src/app.js            form, quick-type parser, lookups, renderers, export
.github/workflows/    auto-merge + Pages publish
```

## 📄 License

See [LICENSE](LICENSE).
