# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-08-16

First release.

### Added

- Per-block direction decided by **script ratio** instead of the Unicode
  first-strong rule, written onto the element as a real `dir` attribute so
  caret movement, selection and punctuation mirroring follow it too.
- Support for every RTL script: Arabic (Persian, Urdu, Pashto, Kurdish,
  Sindhi), Hebrew, Syriac, Thaana, N'Ko, Adlam, Samaritan, Mandaic.
- Streaming support — a frame-batched `MutationObserver` keeps up with answers
  that arrive token by token, without the per-token slowdown a naive handler
  causes.
- Live direction for the composer (`textarea`, `input`, `contenteditable`).
- Bundled Vazirmatn (Arabic + Latin subsets, 400/500/700), applied only to
  blocks judged RTL and guarded by `unicode-range`, so icon fonts and
  non-Arabic scripts are left alone.
- Per-site off switch from the popup or `Alt+R` (`⌥R` on macOS); right-click
  override that the
  automatic pass never overwrites; independent font checkbox.
- Popup status: whether the content script is live in the tab and how many
  blocks it switched — Chrome greys the icon of action-less extensions, so
  without this "running" and "silently broken" look identical.
- Popup shortcut hints as two separate labelled rows, one control per row, with
  the key drawn as a `<kbd>` chip. The keyboard shortcut is read from
  `chrome.commands.getAll()` rather than printed from the manifest, so a
  rebound key shows its real binding and an unbound one hides the row instead
  of advertising a dead key; on macOS the modifiers are rendered as glyphs
  (`⌥R`), which is what is actually printed on the keyboard.
- Firefox support as its own build derived from the same source:
  `tools/stage-firefox.mjs` applies `tools/firefox.overrides.json` — a
  `background.scripts` entry in place of Chrome's `background.service_worker`,
  plus `browser_specific_settings.gecko` — and writes `build/firefox/`. Chrome
  MV3 refuses `background.scripts` and Firefox MV3 has no service worker, so a
  manifest carrying both keys makes Chrome warn on every load; the derivation
  keeps one manifest canonical instead of two copies that drift.
- `data_collection_permissions: { required: ["none"] }` in the Gecko block —
  the extension makes no network requests and transmits nothing, and Firefox
  now requires that to be declared rather than implied. This sets the Firefox
  floor to 140, the first version that reads the key, and the Firefox for
  Android floor to 142.
- `npm run lint:ext` (addons-linter, 0 errors, 0 warnings) and `npm run sign:firefox`,
  which reads `WEB_EXT_API_KEY` / `WEB_EXT_API_SECRET` from the environment so
  no credential is ever written into the repository.

### Fixed

- Digits are excluded from the script count. Persian digits live inside the
  Arabic Unicode block, so counting them turned a table of numbers RTL.
- Inner nodes are forced to inherit the block's direction. A site that ships
  `unicode-bidi: plaintext` on its message paragraphs otherwise re-derives the
  direction from the first strong character one level down: the block looks
  right-aligned while its runs are still ordered left-to-right. Covered by
  `test/visual/cascade.html`.
