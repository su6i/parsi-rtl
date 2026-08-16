/* Parsi RTL — decides the direction of each text block in an AI chat UI.
 *
 * Why this exists: `unicode-bidi: plaintext` (the usual one-liner fix) applies
 * the Unicode first-strong rule — the paragraph inherits the direction of its
 * first strongly-directional character. That is wrong for the most common
 * Persian sentence shape, one that opens with a Latin technical term:
 *
 *     "Gemini web app رو Google سرو می‌کند (تو نمی‌تونی local app رو modify کنی)"
 *
 * First-strong sees "G", lays the whole line out LTR, and the trailing
 * parenthesis and clause order visually scramble. Direction is a property of
 * the line's LANGUAGE, not of its first character — so we decide by script
 * ratio and write the result onto the element with `dir`.
 */
(function () {
    'use strict';

    // Count LETTERS only. Digits are directionally weak: Persian digits live
    // inside the Arabic block (U+06F0-06F9), so a naive block-range match reads
    // "۱۲۳۴ ۵۶۷۸" as strongly RTL and would flip a table of numbers.
    const DIGITS = /\p{Nd}/gu;
    // Every RTL script, not just Persian: Arabic (Persian, Urdu, Pashto,
    // Kurdish, Sindhi), Hebrew, Syriac, Thaana (Dhivehi), N'Ko, Adlam,
    // Samaritan, Mandaic. The bundled font only covers the Arabic script —
    // other scripts get correct DIRECTION and keep the site's own font,
    // which is the right outcome (see the unicode-range guards in rtl.css).
    const RTL_LETTERS = new RegExp(
        '[' + [
            '\\p{Script=Arabic}', '\\p{Script=Hebrew}', '\\p{Script=Syriac}',
            '\\p{Script=Thaana}', '\\p{Script=Nko}', '\\p{Script=Adlam}',
            '\\p{Script=Samaritan}', '\\p{Script=Mandaic}'
        ].join('') + ']',
        'gu'
    );
    const LATIN_LETTERS = /\p{Script=Latin}/gu;

    // A Persian sentence carrying English technical terms is still Persian.
    // One Persian letter per three Latin ones is enough to call the line RTL;
    // an English answer with a stray Persian word stays LTR.
    const RTL_RATIO = 0.35;

    // Below this, a fragment is too short to classify ("OK", ":", an emoji).
    // Leaving it alone is always safer than guessing.
    const MIN_STRONG_CHARS = 2;

    const BLOCK_SELECTOR = [
        'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'dd', 'dt', 'figcaption', 'td', 'th', 'summary'
    ].join(',');

    const EDITOR_SELECTOR = 'textarea, input[type="text"], input[type="search"], [contenteditable="true"]';

    // Never touch these: code keeps its own direction, and rewriting a
    // site's own dir on structural containers breaks its layout.
    const SKIP_CLOSEST = 'pre, code, kbd, samp, svg, [data-parsi-skip]';

    /**
     * @returns {'rtl'|'ltr'|null} null when there is not enough signal to decide.
     */
    function decideDirection(text) {
        if (!text) return null;
        const letters = text.replace(DIGITS, '');
        const rtl = (letters.match(RTL_LETTERS) || []).length;
        const latin = (letters.match(LATIN_LETTERS) || []).length;
        if (rtl + latin < MIN_STRONG_CHARS) return null;
        if (rtl === 0) return 'ltr';
        return rtl >= latin * RTL_RATIO ? 'rtl' : 'ltr';
    }

    // How many blocks we have switched to RTL. Chrome greys the toolbar icon of
    // an extension that declares no action, so this counter is what the popup
    // uses to show the difference between "running" and "silently broken".
    let fixedCount = 0;

    // Streamed answers grow token by token; remember what we last judged so a
    // 400-token answer is not re-measured 400 times at full length.
    const seen = new WeakMap();

    function apply(el) {
        if (!el || el.nodeType !== 1) return;
        if (el.closest(SKIP_CLOSEST)) return;
        // A block the user overruled by hand keeps that direction forever.
        if (el.dataset.parsiForced) return;

        const text = el.textContent || '';
        const previous = seen.get(el);
        // Re-decide only when the text actually changed materially.
        if (previous !== undefined && Math.abs(previous - text.length) < 4) return;
        seen.set(el, text.length);

        const dir = decideDirection(text);
        if (!dir) return;

        if (dir === 'rtl') {
            if (el.dataset.parsiRtl !== 'rtl') fixedCount++;
            el.setAttribute('dir', 'rtl');
            el.dataset.parsiRtl = 'rtl';
        } else if (el.dataset.parsiRtl === 'rtl') {
            // A block that turned Latin after streaming more text: undo, but
            // never impose ltr on blocks we did not touch.
            el.removeAttribute('dir');
            delete el.dataset.parsiRtl;
        }
    }

    function scan(root) {
        if (!root || root.nodeType !== 1) return;
        if (root.matches && root.matches(BLOCK_SELECTOR)) apply(root);
        if (!root.querySelectorAll) return;
        const blocks = root.querySelectorAll(BLOCK_SELECTOR);
        for (let i = 0; i < blocks.length; i++) apply(blocks[i]);
    }

    // --- editors -----------------------------------------------------------
    // The composer needs its dir updated as you type, not once on load:
    // `dir` (not just CSS) is what makes the caret, selection, and punctuation
    // mirroring behave inside the input.
    function applyEditor(el) {
        if (!el || el.dataset.parsiForced) return;
        const text = el.value !== undefined ? el.value : (el.textContent || '');
        const dir = decideDirection(text);
        if (!dir) {
            el.removeAttribute('dir');
            delete el.dataset.parsiRtl;
            return;
        }
        el.setAttribute('dir', dir);
        if (dir === 'rtl') el.dataset.parsiRtl = 'rtl';
        else delete el.dataset.parsiRtl;
    }

    // Everything below needs a DOM. Guarded so the file can also be required
    // by the unit tests, which only exercise decideDirection().
    if (typeof document === 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = { decideDirection };
        }
        return;
    }

    document.addEventListener('input', function (event) {
        const el = event.target;
        if (el && el.matches && el.matches(EDITOR_SELECTOR)) applyEditor(el);
    }, true);

    // --- streaming ---------------------------------------------------------
    // A naive observer callback re-runs on every streamed token and visibly
    // slows long answers, so work is batched into one animation frame.
    const pending = new Set();
    let frame = 0;

    function flush() {
        frame = 0;
        const roots = Array.from(pending);
        pending.clear();
        for (const root of roots) scan(root);
    }

    function enqueue(node) {
        if (!node) return;
        const el = node.nodeType === 1 ? node : node.parentElement;
        if (!el) return;
        pending.add(el);
        if (!frame) frame = requestAnimationFrame(flush);
    }

    const observer = new MutationObserver(function (mutations) {
        for (const mutation of mutations) {
            if (mutation.type === 'characterData') {
                enqueue(mutation.target.parentElement);
            } else {
                mutation.addedNodes.forEach(enqueue);
            }
        }
    });

    function start() {
        scan(document.body);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    // Live state, reported to the popup. `enabled` must be part of the answer:
    // this listener is registered even on a site the user switched off, so a
    // popup that treated "got a reply" as "running" would always show active.
    let enabled = false;
    let fontOn = true;

    function boot() {
        enabled = true;
        if (document.body) start();
        else document.addEventListener('DOMContentLoaded', start, { once: true });
    }

    function applyFontFlag() {
        if (!document.documentElement) return;
        if (fontOn) document.documentElement.dataset.parsiFont = 'on';
        else delete document.documentElement.dataset.parsiFont;
    }

    // Manual override from the right-click menu: the automatic decision is a
    // heuristic, and the user gets the last word on a specific block.
    function forceDirection(dir) {
        const selection = window.getSelection();
        let node = selection && selection.anchorNode;
        if ((!node || !selection.toString()) && document.activeElement) {
            node = document.activeElement;
        }
        if (!node) return;

        let el = node.nodeType === 1 ? node : node.parentElement;
        if (!el) return;
        const block = el.closest(BLOCK_SELECTOR) || el.closest(EDITOR_SELECTOR) || el;

        if (!dir) {
            block.removeAttribute('dir');
            delete block.dataset.parsiRtl;
            delete block.dataset.parsiForced;
            seen.delete(block);
            return;
        }
        block.setAttribute('dir', dir);
        block.dataset.parsiForced = dir;
        if (dir === 'rtl') block.dataset.parsiRtl = 'rtl';
        else delete block.dataset.parsiRtl;
    }

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
            if (!message) return false;
            if (message.type === 'parsi-status') {
                sendResponse({ host: location.host, fixed: fixedCount, enabled, font: fontOn });
            } else if (message.type === 'parsi-force-dir') {
                forceDirection(message.dir);
            } else if (message.type === 'parsi-set-font') {
                fontOn = !!message.font;
                applyFontFlag();
            }
            return false;
        });
    }

    // Settings, read once at startup: a site the user switched off is simply
    // never scanned, and the font override can be turned off independently of
    // the direction fix.
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['parsiDisabledHosts', 'parsiFontOff'], function (stored) {
            const disabled = (stored && stored.parsiDisabledHosts) || [];
            fontOn = !(stored && stored.parsiFontOff);
            applyFontFlag();
            if (!disabled.includes(location.host)) boot();
        });
    } else {
        applyFontFlag();
        boot();
    }

    // Exported for the unit tests; undefined inside the content script.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { decideDirection };
    }
})();
