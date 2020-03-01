import browser from 'webextension-polyfill';
import AsyncLock from 'async-lock';

const DEFAULT_SETTINGS = {
    clientUrl: "https://client.moera.org/releases/latest"
};

let activeTabs = [];
const dataLock = new AsyncLock();

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
        payload: {
            version: 2,
            ...clientData
        }
    };
}

export async function storeData(data) {
    const clientData = await dataLock.acquire("clientData", async () => {
        let {clientData} = await browser.storage.local.get("clientData");
        clientData = {
            ...clientData,
            ...data
        };
        browser.storage.local.set({clientData});
        return clientData;
    });
    broadcastMessage({
        source: "moera",
        action: "loadedData",
        payload: clientData
    });
}
