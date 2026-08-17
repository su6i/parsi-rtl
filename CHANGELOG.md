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
- `npm run test:behaviour` and `test/visual/toggle.html`, a fixture that drives
  the content script in a real DOM against a stubbed `chrome` — the on/off
  switch, the counter and the composer rules cannot be reached by the unit
  tests, which only see `decideDirection()`.
- `npm run sync:version` writes the version from `package.json` into the
  manifest and both README badges, and a test fails the build if they drift.
  Four hand-maintained copies of one number is a silent way to ship a stale
  manifest to a store.
- `minimum_chrome_version: 111`, the floor for the `color-mix()` the popup uses.
  Below it the popup lost its borders and background with no explanation.

### Fixed

- Persian tables came out with mixed alignment — long cells right-aligned, short
  ones left-aligned, in the same row. `table` was listed with `pre`/`code` as
  something to force back to LTR, but the inherit rule for inner nodes outranks
  that selector on specificity (0,2,6 against 0,1,1), so only the `text-align`
  half of the rule ever landed. A Persian table is Persian: it now follows its
  block like any other content.
- The per-site switch no longer reloads the tab. It wrote the setting and
  reloaded, because the content script read the setting only at startup — which
  threw away whatever the user was typing, in the exact situation the extension
  is for. A `parsi-set-enabled` message now turns the running page on or off in
  place, restoring every element it had touched; a reload remains the fallback
  for tabs with no content script listening.
- Typing the first letter into a composer no longer throws the caret to the
  left. When a field held too little text to judge, the extension deleted its
  `dir` attribute outright — including one the site had set itself, which is
  common on Persian sites. The site's own value is now recorded on first touch
  and put back, instead of the attribute being cleared.
- The popup's "blocks set to RTL" counter only ever went up. A block that turned
  Latin as the answer streamed in, or was released by the user, now decrements
  it, so the number stays a truthful signal rather than drifting upward.
- A block rewritten in place is re-judged. Change detection compared text
  lengths alone, so an edited message or a translation swapped in at the same
  length kept its old direction; it now also compares the leading characters,
  which stays stable while an answer streams in at the end.
- Digits are excluded from the script count. Persian digits live inside the
  Arabic Unicode block, so counting them turned a table of numbers RTL.
- Inner nodes are forced to inherit the block's direction. A site that ships
  `unicode-bidi: plaintext` on its message paragraphs otherwise re-derives the
  direction from the first strong character one level down: the block looks
  right-aligned while its runs are still ordered left-to-right. Covered by
  `test/visual/cascade.html`.
