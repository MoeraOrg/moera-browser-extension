import browser from 'webextension-polyfill';

import { getClientUrl } from "./settings";

const activeTabs = new Map();

export async function addTab(tabId) {
    const clientUrl = await getClientUrl();
    activeTabs.set(tabId, {clientUrl});
}

export function broadcastMessage(message, clientUrl) {
    let closedTabs = [];
    activeTabs.forEach((value, tabId) => {
        if (value.clientUrl === clientUrl) {
            browser.tabs.sendMessage(tabId, message)
                .catch(() => closedTabs.push(tabId));
        }
    });
    closedTabs.forEach(tabId => activeTabs.delete(tabId));
}

export async function getTabClientUrl(tabId) {
    const {clientUrl} = activeTabs.get(tabId);
    return clientUrl != null ? clientUrl : await getClientUrl();
}
