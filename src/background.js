/* Service worker: the two entry points a content script cannot own itself —
 * the keyboard shortcut and the right-click menu. It holds no state; the
 * per-site switch lives in chrome.storage.local, read by every surface. */

const DISABLED_KEY = 'parsiDisabledHosts';

async function disabledHosts() {
    const stored = await chrome.storage.local.get(DISABLED_KEY);
    return stored[DISABLED_KEY] || [];
}

async function toggleHost(tab) {
    if (!tab || !tab.url) return;
    let host;
    try {
        host = new URL(tab.url).host;
    } catch (e) {
        return;
    }
    const hosts = await disabledHosts();
    const next = hosts.includes(host)
        ? hosts.filter((h) => h !== host)
        : hosts.concat(host);
    await chrome.storage.local.set({ [DISABLED_KEY]: next });
    // The content script reads the switch once at startup, so the page has to
    // reload for the change to take hold.
    chrome.tabs.reload(tab.id);
}

chrome.commands.onCommand.addListener(async (command) => {
    if (command !== 'toggle-site') return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    toggleHost(tab);
});

// Right-click override: the automatic decision is a heuristic, so the user
// needs a way to overrule it on one specific block without editing settings.
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'parsi-force-rtl',
            title: 'Force this block right-to-left',
            contexts: ['selection', 'editable']
        });
        chrome.contextMenus.create({
            id: 'parsi-force-ltr',
            title: 'Force this block left-to-right',
            contexts: ['selection', 'editable']
        });
        chrome.contextMenus.create({
            id: 'parsi-clear-force',
            title: 'Clear forced direction here',
            contexts: ['selection', 'editable']
        });
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || !String(info.menuItemId).startsWith('parsi-')) return;
    const dir = info.menuItemId === 'parsi-force-rtl' ? 'rtl'
        : info.menuItemId === 'parsi-force-ltr' ? 'ltr'
            : null;
    chrome.tabs.sendMessage(tab.id, { type: 'parsi-force-dir', dir }).catch(() => {
        // No content script in this tab (chrome:// page, PDF viewer, …).
    });
});
