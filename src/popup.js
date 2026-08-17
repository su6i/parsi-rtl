/* Popup: says whether the content script is live on this tab and how many
 * blocks it has switched to RTL — the only way to tell a working content-script
 * extension from a broken one, since Chrome greys the toolbar icon of any
 * extension that has no action of its own. */

const DISABLED_KEY = 'parsiDisabledHosts';

const el = {
    host: document.getElementById('host'),
    status: document.getElementById('status'),
    fixed: document.getElementById('fixed'),
    toggle: document.getElementById('toggle'),
    font: document.getElementById('font'),
    shortcut: document.getElementById('shortcut')
};

async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

async function disabledHosts() {
    const stored = await chrome.storage.local.get(DISABLED_KEY);
    return stored[DISABLED_KEY] || [];
}

function paint(state) {
    el.host.textContent = state.host || '—';
    el.status.textContent = state.label;
    el.status.className = 'badge ' + (state.active ? 'on' : 'off');
    el.fixed.textContent = state.active ? String(state.fixed) : '—';
}

async function render() {
    const tab = await activeTab();
    let host = '—';
    try {
        host = new URL(tab.url).host;
    } catch (e) {
        paint({ host: '—', label: 'not a web page', active: false });
        return;
    }

    const off = (await disabledHosts()).includes(host);

    let status = null;
    try {
        status = await chrome.tabs.sendMessage(tab.id, { type: 'parsi-status' });
    } catch (e) {
        // No content script in this tab: either the site is not in the
        // manifest's match list, or the tab predates the extension's install.
        status = null;
    }

    // `status.enabled` is the load-bearing part: the content script answers even
    // on a site that is switched off, so "got a reply" does not mean "running".
    if (status && status.enabled) {
        paint({ host, label: 'active', active: true, fixed: status.fixed });
        el.toggle.textContent = 'Turn off for this site';
    } else if (status || off) {
        paint({ host, label: 'off for this site', active: false });
        el.toggle.textContent = 'Turn back on';
    } else {
        paint({ host, label: 'reload the tab', active: false });
        el.toggle.textContent = 'Turn off for this site';
    }
    el.toggle.hidden = false;

    const fontOff = (await chrome.storage.local.get('parsiFontOff')).parsiFontOff;
    el.font.checked = !fontOff;
}

el.toggle.addEventListener('click', async () => {
    const tab = await activeTab();
    const host = new URL(tab.url).host;
    const hosts = await disabledHosts();
    const next = hosts.includes(host)
        ? hosts.filter((h) => h !== host)
        : hosts.concat(host);

    await chrome.storage.local.set({ [DISABLED_KEY]: next });

    // Toggle the live page rather than reloading it: the tab may hold a prompt
    // the user is halfway through typing. The popup then stays open and repaints
    // so the switch shows its own effect instead of closing on a guess.
    try {
        await chrome.tabs.sendMessage(tab.id, {
            type: 'parsi-set-enabled',
            enabled: !next.includes(host)
        });
        await render();
    } catch (e) {
        // No content script listening in this tab — only a reload can apply it.
        chrome.tabs.reload(tab.id);
        window.close();
    }
});

// Font override is independent of the direction fix: some users want their
// site's own typography and only the direction corrected.
el.font.addEventListener('change', async () => {
    await chrome.storage.local.set({ parsiFontOff: !el.font.checked });
    const tab = await activeTab();
    try {
        await chrome.tabs.sendMessage(tab.id, { type: 'parsi-set-font', font: el.font.checked });
    } catch (e) {
        // Nothing to tell — the setting still applies on the next page load.
    }
});

// The hint has to show the shortcut that is actually bound, not the one the
// manifest suggested: the user may have rebound or cleared it, and on macOS the
// key the browser reports as "Alt" is printed "⌥" on the keyboard itself.
const MAC_KEYS = { Alt: '⌥', Ctrl: '⌃', Shift: '⇧', Command: '⌘', MacCtrl: '⌃' };

async function paintShortcut() {
    const mac = /Mac/i.test(navigator.userAgentData?.platform || navigator.userAgent);
    const commands = await chrome.commands.getAll();
    const bound = commands.find((c) => c.name === 'toggle-site');

    if (!bound || !bound.shortcut) {
        // Unbound is a real state — a stale hint pointing at a dead key is worse
        // than no hint, so drop the whole row.
        el.shortcut.closest('.hint').hidden = true;
        return;
    }
    el.shortcut.textContent = mac
        ? bound.shortcut.split('+').map((k) => MAC_KEYS[k] || k).join('')
        : bound.shortcut;
}

render();
paintShortcut();
