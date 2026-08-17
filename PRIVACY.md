# Privacy Policy — Parsi RTL

**Last updated: 2026-08-16**

Parsi RTL collects nothing. There is no analytics, no telemetry, no account, and
no server: the extension makes **no network requests of any kind**. The font it
applies is bundled inside the extension package rather than fetched from a CDN,
so no third party — not even a font host — ever learns which pages you read.

One honest caveat: the bundled font has to be readable by the page in order to
be applied to it, which is what `web_accessible_resources` in the manifest
declares. A site that goes looking can therefore detect that this extension is
installed, the same way it can detect any extension that ships a web-accessible
file. It learns nothing beyond that fact — no settings, no history, no text.

## What the extension reads

To decide whether a paragraph should be laid out right-to-left, the content
script reads the **text already visible on the page** and counts letters by
script. This happens entirely inside your browser, in the page it is running in.
The text is never copied, stored, or transmitted.

## What the extension stores

Two values, in `chrome.storage.local` on your own machine:

| Key | Contents | Why |
| --- | --- | --- |
| `parsiDisabledHosts` | list of hostnames you switched the extension off on | so the choice survives a reload |
| `parsiFontOff` | true/false | remembers whether you turned the bundled font off |

Nothing else is written. Uninstalling the extension removes both. `storage.local`
never leaves the device — it is not the synced storage area, so these two values
are not uploaded to your Google or Mozilla account and are not carried to your
other computers. The extension does not use `storage.sync` at all.

## Permissions and why each one exists

| Permission | Why it is needed |
| --- | --- |
| Host access to pages (`http://*/*`, `https://*/*`) | RTL text appears on any site, so the direction fix has to be able to run anywhere. Sites you don't want it on can be switched off individually. |
| `storage` | to remember the two settings above |
| `activeTab` | so the popup can ask the current tab whether the content script is running there |
| `contextMenus` | to add the right-click "force this block right-to-left / left-to-right" items |

## Data sale and transfer

There is no data to sell, share, or transfer, and none is. The extension is not
used for creditworthiness, lending, or any purpose unrelated to its single
function of correcting text direction and typography.

## Contact

Issues and questions: <https://github.com/su6i/parsi-rtl/issues>
