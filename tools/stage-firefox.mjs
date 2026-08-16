/* Builds the Firefox package from the Chrome manifest plus a small overlay.
 *
 * The two stores disagree on one key. Chrome MV3 wants `background.service_worker`
 * and rejects `background.scripts` as manifest-v2-only; Firefox has no MV3 service
 * worker at all and needs `background.scripts` (a non-persistent event page). A
 * single manifest carrying both keys runs in both browsers but makes Chrome log
 * "'background.scripts' requires manifest version of 2 or lower" on every load,
 * so the repo keeps Chrome's manifest canonical and derives Firefox's from it —
 * one source of truth, no second copy to drift.
 */

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(repo, 'build', 'firefox');

const manifest = JSON.parse(readFileSync(join(repo, 'manifest.json'), 'utf8'));
const overrides = JSON.parse(readFileSync(join(repo, 'tools', 'firefox.overrides.json'), 'utf8'));

// Top-level replace, not a deep merge: every overridden key states Firefox's
// value in full, so a deep merge would only risk leaving a Chrome-only leaf
// (`background.service_worker`) behind in the result.
Object.assign(manifest, overrides);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
cpSync(join(repo, 'src'), join(out, 'src'), { recursive: true });

console.log(`→ ${out}`);
