/* The two stores need two different `background` keys, so the repo ships one
 * canonical manifest (Chrome's) and derives Firefox's. These tests pin the part
 * that is easy to break silently: the derivation must not leave Chrome's key in
 * the Firefox output, and the canonical manifest must not grow Firefox's key
 * back — that is exactly what made Chrome warn about a manifest-v2-only key. */

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const repo = path.join(__dirname, '..');
const chrome = JSON.parse(readFileSync(path.join(repo, 'manifest.json'), 'utf8'));

test('the canonical manifest is Chrome-clean: a service worker, no MV2 scripts key', () => {
    assert.equal(chrome.manifest_version, 3);
    assert.equal(chrome.background.service_worker, 'src/background.js');
    assert.equal(chrome.background.scripts, undefined);
    assert.equal(chrome.browser_specific_settings, undefined);
});

test('the staged Firefox manifest swaps the background key and keeps everything else', () => {
    execFileSync('node', [path.join(repo, 'tools', 'stage-firefox.mjs')], { cwd: repo });
    const firefox = JSON.parse(
        readFileSync(path.join(repo, 'build', 'firefox', 'manifest.json'), 'utf8')
    );

    assert.deepEqual(firefox.background, { scripts: ['src/background.js'] });
    assert.equal(firefox.background.service_worker, undefined);
    assert.equal(firefox.browser_specific_settings.gecko.id, 'parsi-rtl@su6i.github.io');

    // Everything the two builds share must stay identical — a value edited in
    // one manifest only is the drift this derivation exists to prevent.
    for (const key of Object.keys(chrome)) {
        if (key === 'background') continue;
        assert.deepEqual(firefox[key], chrome[key], `${key} drifted between builds`);
    }
});
