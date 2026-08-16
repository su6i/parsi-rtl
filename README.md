---
title: Parsi RTL ↔
description: Correct direction and typography for right-to-left text on any website.
location: README.md
last_updated: 2026-08-16
---

<div align="center">

<img alt="Parsi RTL logo" src="assets/project_logo.svg" width="350">

<h1>Parsi RTL ↔</h1>

<p align="center">
  <a href="https://github.com/su6i/parsi-rtl/releases"><img alt="Version: 1.0.0" src="https://img.shields.io/badge/Version-1.0.0-blue.svg" height="20" style="vertical-align: middle;"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-green.svg" height="20" style="vertical-align: middle;"></a>
  <a href="docs/ARCHITECTURE.md"><img alt="Docs: Architecture" src="https://img.shields.io/badge/Docs-Architecture-orange.svg" height="20" style="vertical-align: middle;"></a>
  <a href="#-browsers"><img alt="Browsers: Chromium + Firefox" src="https://img.shields.io/badge/Browsers-Chromium%20%2B%20Firefox-blueviolet.svg" height="20" style="vertical-align: middle;"></a>
  <a href="PRIVACY.md"><img alt="Data collected: none" src="https://img.shields.io/badge/Data%20collected-none-teal.svg" height="20" style="vertical-align: middle;"></a>
  <a href="https://linkedin.com/in/su6i"><img alt="LinkedIn" src="assets/linkedin_su6i.svg" height="20" style="vertical-align: middle; margin-bottom: -1px; margin-left: 3px;"></a>
</p>

<strong>Right-aligned is not right-to-left.</strong><br>
<sub>Direction decided by the language of each block — not by its first character.</sub>

[🇮🇷 فارسی](docs/fa/README.fa.md) • [Architecture](docs/ARCHITECTURE.md) • [Changelog](CHANGELOG.md) • [Privacy](PRIVACY.md)

</div>

---

## 🏗 The problem

The usual one-line fix for RTL text, `unicode-bidi: plaintext`, applies the
Unicode **first-strong** rule: a paragraph takes its direction from its first
strongly-directional character. That is wrong for the most common Persian
sentence shape — one that opens with an English technical term:

```text
Gemini web app رو Google سرو می‌کند (تو نمی‌تونی local app رو modify کنی)
```

First-strong sees the `G`, lays the whole line out left-to-right, and the
trailing parenthesis and clause order visually scramble. You end up reading a
Persian sentence from the wrong end.

<div align="center">
  <img alt="Before and after" src="assets/shots/before-after.png" width="720">
</div>

## ⚡ The solution

**The direction of a line is a property of its language, not of its first
character.** Parsi RTL counts letters by script per block: a Persian sentence
carrying English terms stays RTL, an English sentence with one Persian word
stays LTR. The decision is written onto the element as a real `dir` attribute,
so caret movement, text selection and punctuation mirroring follow it too —
things a CSS-only fix cannot reach.

| | |
| --- | --- |
| **Every RTL script** | Arabic (Persian, Urdu, Pashto, Kurdish, Sindhi), Hebrew, Syriac, Thaana, N'Ko, Adlam, Samaritan, Mandaic |
| **Every site** | AI chats, forums, docs, webmail — it no-ops where there is no RTL text |
| **Streaming-aware** | AI answers arrive token by token; a frame-batched observer keeps up without the per-token slowdown |
| **Code stays LTR** | `pre`, `code`, `kbd`, `samp`, tables — including inline code inside an RTL sentence |
| **Your composer** | the input's direction updates live as you type |
| **Vazirmatn, bundled** | applied only to RTL blocks and guarded by `unicode-range`, so icon fonts survive |
| **Nothing collected** | no network requests, no analytics, no account |

## 🚀 Install

### From a store — one click, auto-updates

<!-- ACTION: replace with the real listing URLs once each review clears -->
- **Chrome Web Store** — *pending review*. The same listing installs on Brave,
  Edge, Arc, Opera and Comet.
- **Firefox Add-ons (AMO)** — *pending review*.

### From this repository — manual, no store account needed

This is the path if you want to run it today, or run your own modified copy.

```bash
git clone https://github.com/su6i/parsi-rtl.git
```

*(Or **Code → Download ZIP** on GitHub and unzip it — the folder you point the
browser at must be the one containing `manifest.json`.)*

**Chrome, Brave, Edge, Arc, Opera, Comet**

1. Open `chrome://extensions` (Edge: `edge://extensions`, Brave: `brave://extensions`).
2. Turn on **Developer mode** — top right.
3. Click **Load unpacked** and select the cloned folder.
4. Reload any tab that was already open: content scripts are only injected at page load.

**Firefox**

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick `manifest.json` inside the folder.
3. Reload your open tabs. Temporary add-ons are removed when Firefox restarts —
   install from AMO once the review clears if you want it to persist.

A manually installed copy does not auto-update: `git pull` and press ↻ on the
extension card to pick up changes.

Chrome warns that the extension can "read and change all your data on all
websites". That is what running on every site means; the code reads text and
writes `dir` attributes, makes no network requests, and stores nothing beyond
your per-site off list.

## 🎛 Controls

| Control | What it does |
| --- | --- |
| **Popup** (click the icon) | current site, whether the script is live in this tab, how many blocks it flipped, font on/off, per-site off switch |
| **`Alt+R`** (macOS **`⌥R`**) | turn this site on/off without opening the popup — rebind in `chrome://extensions/shortcuts` |
| **Right-click a block** | force it right-to-left / left-to-right, or clear the override; the automatic pass never overwrites a manual decision |
| **Font checkbox** | keep the direction fix but leave the site's own typography |

### The toolbar icon looks greyed out — is it broken?

No. Chrome greys the icon of any extension whose work happens entirely in a
content script. Since that makes "running" and "silently broken" look
identical, the popup reports the state and the number of blocks switched — a
number above zero is proof it is working.

Two things that genuinely do disable it: a tab opened **before** the extension
was installed or reloaded (reload it), and a site you switched off.

<div align="center">
  <img alt="Popup" src="assets/shots/popup.png" width="720">
</div>

## 🌐 Browsers

| Browser | How |
| --- | --- |
| Chrome | Chrome Web Store, or load unpacked |
| Brave, Edge, Arc, Opera, Comet | install the Chrome Web Store build directly — same package, nothing to submit |
| Firefox 140+ (Android 142+) | its own build, derived from the same source — Firefox has no MV3 service worker, so its manifest gets `background.scripts` where Chrome's gets `background.service_worker` |

## 🧪 Tests

```bash
npm test               # direction algorithm (12 cases) + manifest derivation
npm run render:fixture # test/visual/cascade.png — the CSS cascade
```

`npm test` locks the algorithm, including the sentence above and both sides of
the ratio boundary, and checks that the Chrome and Firefox manifests still
differ in exactly one key.

The fixture covers what unit tests cannot: **the cascade**. Setting `dir="rtl"`
alone is not enough on a site whose stylesheet puts `unicode-bidi: plaintext`
on the inner `<p>` — the block then looks right-aligned while its runs are
still ordered left-to-right, which is the original bug hiding one level down.
Panel **A** of the fixture is the bug, **B** the fix, **C** guards code blocks.

## 🔧 Tuning

Everything worth adjusting sits at the top of [`src/rtl.js`](src/rtl.js):
`RTL_RATIO` (how much RTL script is enough), `MIN_STRONG_CHARS`,
`BLOCK_SELECTOR`, `SKIP_CLOSEST`. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit and how to
extend them.

## 📄 License

MIT — see [LICENSE](LICENSE).

Vazirmatn 5.3.0 by Saber Rastikerdar, SIL Open Font License 1.1; the license
text ships at [`src/fonts/LICENSE-Vazirmatn.txt`](src/fonts/LICENSE-Vazirmatn.txt).

## 🔗 Related

For desktop **Electron** apps (Claude Desktop, VS Code, Obsidian) the equivalent
route is patching `app.asar` — see
[`rtl-persian-app-patching`](https://github.com/su6i/agent-constitution/blob/main/skills/rtl-persian-app-patching.md).
Native apps
(ChatGPT and Gemini for Mac) have no injection surface at all; the browser is
the only lever there.
