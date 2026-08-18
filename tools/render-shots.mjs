/* Every store and README image, rendered from markup in `assets/shots/`.
 *
 * The images are never captured by hand: a screenshot taken from a real browser
 * session freezes whatever the UI looked like that day, and nothing fails when
 * the UI moves on. Rendering them from committed markup makes a stale image a
 * diff instead of a lie.
 *
 * Sizes are the stores' own requirements — 1280×800 screenshots, a 440×280
 * small tile, a 1400×560 marquee — so they belong next to the markup, not in a
 * dashboard note. `assets/shots/*.html` load the bundled Vazirmatn over a
 * relative path, which is why they must live in the repository to render.
 */

import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const shots = join(repo, 'assets', 'shots');

const targets = [
    ['before-after', 1280, 800],
    ['popup', 1280, 800],
    ['any-site', 1280, 800],
    ['promo-440x280', 440, 280],
    ['marquee-1400x560', 1400, 560],
];

for (const [name, width, height] of targets) {
    execFileSync(CHROME, [
        '--headless', '--disable-gpu', '--hide-scrollbars',
        `--window-size=${width},${height}`,
        `--screenshot=${join(shots, `${name}.png`)}`,
        join(shots, `${name}.html`),
    ], { stdio: ['ignore', 'ignore', 'ignore'] });
    console.log(`→ assets/shots/${name}.png  ${width}×${height}`);
}
