/* One version number, four files. `package.json` is the source; the manifest the
 * stores read and the badges in both READMEs are written from it.
 *
 * Kept as a script rather than a habit because the failure is silent and only
 * visible after submission: a manifest still on the old version is accepted by
 * the store and simply overwrites nothing, and a stale badge is the first thing
 * a reader sees. `test/manifest.test.js` fails the build if they ever drift, so
 * this script is the fix and the test is the guard.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const version = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')).version;

const edits = [];

function rewrite(relative, transform) {
    const path = join(repo, relative);
    const before = readFileSync(path, 'utf8');
    const after = transform(before);
    if (after === before) return;
    writeFileSync(path, after);
    edits.push(relative);
}

rewrite('manifest.json', (text) =>
    text.replace(/("version":\s*")[^"]+(")/, `$1${version}$2`));

for (const readme of ['README.md', 'docs/fa/README.fa.md']) {
    rewrite(readme, (text) => text
        .replace(/(alt="Version: )[^"]+(")/g, `$1${version}$2`)
        .replace(/(badge\/Version-)[^-]+(-blue\.svg)/g, `$1${version}$2`));
}

console.log(edits.length
    ? `→ ${version}: ${edits.join(', ')}`
    : `→ ${version}: already in sync`);
