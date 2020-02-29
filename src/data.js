import browser from 'webextension-polyfill';

const DEFAULT_SETTINGS = {
    clientUrl: "https://client.moera.org/releases/latest"
};

let activeTabs = [];

export async function getSettings() {
    const data = await browser.storage.local.get("settings");
    return data && data.settings ? data.settings : DEFAULT_SETTINGS;
}

export async function setSettings(settings) {
    await browser.storage.local.set({settings});
}

export function addTab(tabId) {
    if (!activeTabs.includes(tabId)) {
        activeTabs.push(tabId);
    }
}

function broadcastMessage(message) {
    let closedTabs = [];
    activeTabs
        .forEach(tabId => browser.tabs.sendMessage(tabId, message)
        .catch(() => closedTabs.push(tabId)));
    closedTabs.forEach(tabId => {
        const i = activeTabs.indexOf(tabId);
        if (i > 0) {
            activeTabs.splice(i, 1);
        }
    })
}

export async function loadData() {
    const {clientData} = await browser.storage.local.get("clientData");
    return {
        source: "moera",
        action: "loadedData",
        payload: clientData
    }
}

export function storeData(clientData) {
    browser.storage.local.set({clientData});
    broadcastMessage({
        source: "moera",
        action: "loadedData",
        payload: clientData
    });
}
