import browser from 'webextension-polyfill';
import AsyncLock from 'async-lock';

const DEFAULT_CLIENT_URL = "https://client.moera.org/releases/latest";

const activeTabs = new Map();
const dataLock = new AsyncLock();

export async function isStorageV1() {
    const {settings, clientData} = await browser.storage.local.get(["settings", "clientData"]);
    return settings != null || clientData != null;
}

export async function migrateStorageToV2() {
    const {settings, clientData} = await browser.storage.local.get(["settings", "clientData"]);
    await browser.storage.local.clear();
    const clientUrl = settings && settings.clientUrl ? settings.clientUrl : DEFAULT_CLIENT_URL;
    await browser.storage.local.set({
        defaultClient: clientUrl === DEFAULT_CLIENT_URL,
        customClientUrl: clientUrl !== DEFAULT_CLIENT_URL ?  clientUrl : "",
        [`clientData;${clientUrl}`]: clientData
    });
}

async function getClientUrl() {
    const {defaultClient, customClientUrl} = await browser.storage.local.get(["defaultClient", "customClientUrl"]);
    return defaultClient == null || defaultClient ? DEFAULT_CLIENT_URL : customClientUrl;
}

export async function getSettings() {
    return {
        clientUrl: await getClientUrl()
    }
}

export async function setSettings({clientUrl}) {
    const data = {};
    data.defaultClient = clientUrl === DEFAULT_CLIENT_URL;
    if (clientUrl !== DEFAULT_CLIENT_URL) {
        data.customClientUrl = clientUrl;
    }
    await browser.storage.local.set(data);
}

export async function addTab(tabId) {
    const clientUrl = await getClientUrl();
    activeTabs.set(tabId, {clientUrl});
}

function broadcastMessage(message, clientUrl) {
    let closedTabs = [];
    activeTabs.forEach((value, tabId) => {
        if (value.clientUrl === clientUrl) {
            browser.tabs.sendMessage(tabId, message)
                .catch(() => closedTabs.push(tabId));
        }
    });
    closedTabs.forEach(tabId => activeTabs.delete(tabId));
}

async function getTabClientUrl(tabId) {
    const {clientUrl} = activeTabs.get(tabId);
    return clientUrl != null ? clientUrl : await getClientUrl();
}

export async function loadData(tabId) {
    const key = "clientData;" + await getTabClientUrl(tabId);
    const {[key]: clientData} = await browser.storage.local.get(key);
    return {
        source: "moera",
        action: "loadedData",
        payload: {
            version: 2,
            ...clientData
        }
    };
}

export async function storeData(tabId, data) {
    const clientUrl = await getTabClientUrl(tabId);
    const clientData = await dataLock.acquire("clientData", async () => {
        const key = `clientData;${clientUrl}`;
        let {[key]: clientData} = await browser.storage.local.get(key);
        clientData = {
            ...clientData,
            ...data
        };
        browser.storage.local.set({[key]: clientData});
        return clientData;
    });
    broadcastMessage({
        source: "moera",
        action: "loadedData",
        payload: clientData
    }, clientUrl);
}
