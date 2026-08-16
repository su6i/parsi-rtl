---
title: Parsi RTL — Architecture
description: How the direction decision, the streaming pass and the CSS cascade fit together, and how to extend them.
location: docs/ARCHITECTURE.md
last_updated: 2026-08-16
---

# Architecture

[Back to README](../README.md) · [فارسی](fa/README.fa.md)

## Tree

```text
parsi-rtl/
├── manifest.json              MV3, Chromium — the canonical one
├── tools/
│   ├── firefox.overrides.json the keys Firefox needs differently
│   └── stage-firefox.mjs      derives build/firefox/ from the two above
├── src/
│   ├── rtl.js                 content script: the decision + the streaming pass
│   ├── rtl.css                the cascade: direction, font scope, code guards
│   ├── background.js          service worker: Alt+R shortcut, right-click menu
│   ├── popup.html / popup.js  state readout and the per-site switch
│   ├── icon{16,48,128}.png
│   └── fonts/                 Vazirmatn subsets + the OFL text
├── test/
│   ├── direction.test.js      12 cases pinning the algorithm
│   ├── manifest.test.js       pins the Chrome/Firefox manifest split
│   └── visual/cascade.html    the fixture unit tests cannot replace
├── assets/
│   ├── project_logo.svg
│   └── shots/*.html + *.png   README screenshots, rendered from real markup
└── docs/
    ├── ARCHITECTURE.md        this file
    └── fa/README.fa.md
```

The two README screenshots are generated, not captured: `npm run render:shots`
re-renders `assets/shots/*.html` with headless Chrome, so a UI change cannot
leave the README showing something that no longer exists.

## The decision

`decideDirection(text)` in `src/rtl.js` is the whole idea, and it is deliberately
small:

1. Strip digits. Persian digits (`U+06F0`–`U+06F9`) sit **inside** the Arabic
   Unicode block, so counting them makes a table of numbers look strongly RTL.
2. Count letters by script — `\p{Script=Arabic}`, `Hebrew`, `Syriac`, `Thaana`,
   `Nko`, `Adlam`, `Samaritan`, `Mandaic` — against `\p{Script=Latin}`.
3. Fewer than `MIN_STRONG_CHARS` letters ⇒ return `null`. A two-character
   fragment carries no signal, and leaving it alone always beats guessing.
4. Otherwise RTL wins when `rtl >= latin * RTL_RATIO` (0.35 — roughly one RTL
   letter per three Latin ones).

It returns `'rtl' | 'ltr' | null` and touches no DOM, which is what makes it
testable in plain Node.

**Why not `unicode-bidi: plaintext`?** That applies the Unicode first-strong
rule: direction comes from the first strongly-directional character. A Persian
sentence opening with an English product name is then laid out left-to-right.
Direction is a property of the **language**, and the script ratio is the cheapest
usable proxy for it.

## The passes

| Pass | Trigger | Does |
| --- | --- | --- |
| Initial scan | `document_idle` | `scan(document.body)` over `BLOCK_SELECTOR` |
| Streaming | `MutationObserver` (childList + characterData) | queues touched elements, flushes once per animation frame |
| Editors | `input` event, capture phase | recomputes `dir` on the focused field live |
| Manual | message from the context menu | forces a block and marks it `data-parsi-forced` |

Two guards keep this cheap on long conversations: a `WeakMap` remembers the text
length last judged per element and skips re-decisions under a 4-character delta,
and the observer batches into a single `requestAnimationFrame` instead of running
per streamed token.

`apply()` never overwrites a block carrying `data-parsi-forced`, and it only ever
*removes* `dir` from blocks it set itself — the extension does not impose LTR on
markup it never touched.

## The cascade

Setting `dir="rtl"` on the block is **not** enough, and this is the subtlest
failure in the project's history. Chat UIs ship `unicode-bidi: plaintext` (or
`direction: ltr`) on the inner `<p>`, with higher specificity than an attribute
selector. Direction is then re-derived from the first strong character of that
inner node: the block looks right-aligned while its runs are still ordered
left-to-right — the original bug, one level down.

`src/rtl.css` therefore:

- marks the block `[data-parsi-rtl='rtl']` with `direction`, `text-align` and
  `unicode-bidi: isolate`, all `!important`;
- forces descendants — except `pre`, `code`, `kbd`, `samp` and their subtrees —
  to `direction: inherit !important; unicode-bidi: inherit !important`;
- holds code and tables at `direction: ltr !important`;
- scopes the font to `html[data-parsi-font='on'] [data-parsi-rtl='rtl']`, and
  **never** uses `*` for `font-family`: the universal selector also hits icon
  fonts (Material Symbols, Lucide, each site's own glyph font) and turns every
  icon into a tofu box.

`test/visual/cascade.html` renders the bug, the fix and the code guard side by
side; `npm run render:fixture` writes the PNG. This is the only honest proof for
a cascade problem — reading the CSS is not.

## State

Two keys in `chrome.storage.local`, read once at startup by the content script
and written by the popup and the service worker:

| Key | Meaning |
| --- | --- |
| `parsiDisabledHosts` | hostnames the user switched off |
| `parsiFontOff` | the font checkbox |

The content script answers a `parsi-status` message with
`{ host, fixed, enabled, font }`. **`enabled` is load-bearing**: the message
listener is registered even on a site that is switched off, so a popup treating
"got a reply" as "running" reports active when it is not. That was a real bug.

## Extending it

### Add a language or script

1. Add its `\p{Script=…}` name to `RTL_LETTERS` in `src/rtl.js`.
2. Add a line to the multi-script test in `test/direction.test.js`.
3. If the script needs different glyphs, do **not** widen the Vazirmatn
   `unicode-range` in `rtl.css` — a font without the script's glyphs is worse
   than the site's own font.

### Add a control

1. Register the command in `manifest.json` (`commands`) or a menu item in
   `src/background.js` (`chrome.contextMenus.create`).
2. Send a message from `background.js`; handle it in the `onMessage` listener in
   `src/rtl.js`.
3. Mark anything the user chose by hand with `data-parsi-forced` so the automatic
   pass leaves it alone.
4. Surface the new state in `popup.js` — a control the popup cannot report is a
   control nobody can debug.

### Ship to another browser

The two stores disagree about exactly one key. Chrome MV3 wants
`background.service_worker` and treats `background.scripts` as manifest-v2-only;
Firefox has no MV3 service worker at all and needs `background.scripts`, which it
runs as a non-persistent event page. A single manifest carrying both keys does
run in both browsers, but Chrome then logs
`'background.scripts' requires manifest version of 2 or lower` on every load and
the Chrome Web Store validator sees an MV2 key in an MV3 submission.

So `manifest.json` is Chrome's and stays canonical — it is what `load unpacked`
reads and what `npm run package` zips. Firefox's is *derived*, never a second
copy: `tools/stage-firefox.mjs` replaces the top-level keys listed in
`tools/firefox.overrides.json` (`background`, `browser_specific_settings`) and
writes `build/firefox/`. `test/manifest.test.js` fails if the two ever differ in
any other key, which is the drift a hand-maintained duplicate would invite.
Chromium forks (Brave, Edge, Arc, Opera, Comet) install the Chrome build
unchanged.

Firefox additionally requires `gecko.data_collection_permissions`; this
extension declares `required: ["none"]`, which is why `strict_min_version` is
`140.0` — the key is ignored by anything older, so the floor is what makes the
declaration meaningful. Firefox for Android only learned the key in 142, hence
the separate `gecko_android` floor. Verify before every submission:

```bash
npm run lint:ext       # stages build/firefox, then addons-linter — 0 errors, 0 warnings
npm run sign:firefox   # needs WEB_EXT_API_KEY / WEB_EXT_API_SECRET in the env
```
