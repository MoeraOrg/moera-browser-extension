import browser from 'webextension-polyfill';
import AsyncLock from 'async-lock';
import ObjectPath from 'object-path';

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
    const clientUrl = ObjectPath.get(settings, "clientUrl", DEFAULT_CLIENT_URL);
    const data = {
        defaultClient: clientUrl === DEFAULT_CLIENT_URL,
        customClientUrl: clientUrl !== DEFAULT_CLIENT_URL ?  clientUrl : "",
    };
    const homeRoot = ObjectPath.get(clientData, "home.location");
    ObjectPath.del(clientData, "home.location");
    ObjectPath.del(clientData, "clientId");
    if (homeRoot) {
        data[`roots;${clientUrl}`] = [homeRoot];
        data[`currentRoot;${clientUrl}`] = homeRoot;
        data[`clientData;${clientUrl};${homeRoot}`] = clientData;
    }
    await browser.storage.local.set(data);
}

export async function getSettings() {
    let {defaultClient, customClientUrl} = await browser.storage.local.get(["defaultClient", "customClientUrl"]);
    defaultClient = defaultClient != null ? defaultClient : true;
    customClientUrl = customClientUrl ? customClientUrl : DEFAULT_CLIENT_URL;
    return {defaultClient, customClientUrl};
}

export async function setSettings({defaultClient, customClientUrl}) {
    await browser.storage.local.set({defaultClient, customClientUrl});
}

export async function getClientUrl() {
    const {defaultClient, customClientUrl} = await browser.storage.local.get(["defaultClient", "customClientUrl"]);
    return defaultClient == null || defaultClient ? DEFAULT_CLIENT_URL : customClientUrl;
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

function loadedData(homeRoot, clientData) {
    let data = {};
    if (homeRoot) {
        data = {...clientData};
        ObjectPath.set(data, "home.location", homeRoot);
    }
    return {
        source: "moera",
        action: "loadedData",
        payload: {
            version: 2,
            ...data
        }
    };
}

export async function loadData(tabId) {
    const clientUrl = await getTabClientUrl(tabId);
    const rootKey = `currentRoot;${clientUrl}`;
    const {[rootKey]: homeRoot} = await browser.storage.local.get(rootKey);
    if (!homeRoot) {
        return loadedData();
    }
    const dataKey = `clientData;${clientUrl};${homeRoot}`;
    const {[dataKey]: clientData} = await browser.storage.local.get(dataKey);
    return loadedData(homeRoot, clientData);
}

export async function storeData(tabId, data) {
    const clientUrl = await getTabClientUrl(tabId);
    const {homeRoot, clientData} = await dataLock.acquire("clientData", async () => {
        const rootKey = `currentRoot;${clientUrl}`;
        let {[rootKey]: homeRoot} = await browser.storage.local.get(rootKey);
        const location = ObjectPath.get(data, "home.location");
        if (location && homeRoot !== location) {
            if (!homeRoot) {
                await browser.storage.local.set({[rootKey]: location});
            }
            homeRoot = location;
            const rootsKey = `roots;${clientUrl}`;
            let {[rootsKey]: roots} = await browser.storage.local.get(rootsKey);
            if (roots == null) {
                roots = [];
            }
            if (!roots.includes(homeRoot)) {
                roots.push(homeRoot);
                await browser.storage.local.set({[rootsKey]: roots});
            }
        }
        if (!homeRoot) {
            return {};
        }

        const dataKey = `clientData;${clientUrl};${homeRoot}`;
        let {[dataKey]: clientData} = await browser.storage.local.get(dataKey);
        clientData = {
            ...clientData,
            ...data
        };
        ObjectPath.del(clientData, "home.location");

        const storedClientData = {...clientData};
        ObjectPath.del(storedClientData, "clientId");
        browser.storage.local.set({[dataKey]: storedClientData});

        return {homeRoot, clientData};
    });
    broadcastMessage(loadedData(homeRoot, clientData), clientUrl);
}

export async function deleteData(tabId, location) {
    const clientUrl = await getTabClientUrl(tabId);
    const {loadedData} = await dataLock.acquire("clientData", async () => {
        const rootKey = `currentRoot;${clientUrl}`;
        let {[rootKey]: homeRoot} = await browser.storage.local.get(rootKey);
        if (!location) {
            location = homeRoot;
        }
        const rootsKey = `roots;${clientUrl}`;
        let {[rootsKey]: roots} = await browser.storage.local.get(rootsKey);
        if (!roots.includes(location) && location !== homeRoot) {
            return {};
        }
        roots = roots.filter(r => r !== location);
        await browser.storage.local.set({[rootsKey]: roots});
        await browser.storage.local.remove(`clientData;${clientUrl};${location}`);

        if (location === homeRoot) {
            if (roots.length === 0) {
                await browser.storage.local.remove(rootKey);
                return {loadedData: loadedData()};
            }
            homeRoot = roots[roots.length - 1];
            await browser.storage.local.set({[rootKey]: homeRoot});

            const dataKey = `clientData;${clientUrl};${homeRoot}`;
            const {[dataKey]: clientData} = await browser.storage.local.get(dataKey);
            return {loadedData: loadedData(homeRoot, clientData)};
        }
        return {};
    });
    if (loadedData != null) {
        broadcastMessage(loadedData, clientUrl);
    }
}
