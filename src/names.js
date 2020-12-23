import browser from 'webextension-polyfill';

import AsyncLock from "./async-lock";
import { broadcastMessage, getTabClientUrl } from "./tabs";

const MAX_NAMES_SIZE = 500;
const namesLock = new AsyncLock();

function storedName(details) {
    return {
        source: "moera",
        action: "storedName",
        payload: details
    };
}

export async function getNames(clientUrl) {
    const namesKey = `names;${clientUrl}`;
    const {[namesKey]: names} = await browser.storage.local.get(namesKey);
    return names != null ? names : [];
}

export async function clearNames(clientUrl) {
    await namesLock.acquire("names", async () => {
        const namesKey = `names;${clientUrl}`;
        await browser.storage.local.remove(namesKey);
    });
}

export async function storeName(tabId, details) {
    const clientUrl = await getTabClientUrl(tabId);
    await namesLock.acquire("names", async () => {
        const namesKey = `names;${clientUrl}`;
        let {[namesKey]: names} = await browser.storage.local.get(namesKey);
        if (names == null) {
            names = [];
        }
        names = names.filter(info => info.name !== details.name);
        if (details.updated != null) {
            details.updated = Math.round(Date.now() / 1000);
        }
        names.push(details);
        names.sort((a, b) => a.updated - b.updated);
        if (names.length > MAX_NAMES_SIZE) {
            names.splice(0, names.length - MAX_NAMES_SIZE);
        }
        await browser.storage.local.set({[namesKey]: names});
    });
    broadcastMessage(storedName(details), clientUrl);
}
