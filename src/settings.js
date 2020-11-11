import browser from 'webextension-polyfill';

export const DEFAULT_CLIENT_URL = "https://client.moera.org/releases/latest";

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
