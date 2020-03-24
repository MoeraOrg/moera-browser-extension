import browser from 'webextension-polyfill';

import { deleteData, isStorageV1, loadData, migrateStorageToV2, storeData, switchData } from "./data";
import { addTab } from "./tabs";
import { storeName } from "./names";

const MAX_MATCHING_URLS_SIZE = 100;
let matchingUrls = new Map();

const MAX_COM_PASSWORDS_SIZE = 100;
let comPasswords = new Map();

function cleanupFlash(flash, maxSize) {
    if (flash.size <= maxSize) {
        return;
    }
    let elements = [];
    flash.forEach((value, key) => elements.push({key, value}));
    elements.sort((e1, e2) => e1.value.accessed - e2.value.accessed);
    for (let i = 0; i < elements.length - maxSize; i++) {
        flash.delete(elements[i].key);
    }
}

function sendHeaders({requestHeaders}) {
    let headers = requestHeaders.filter(header => header.name !== "X-Accept-Moera");
    headers.push({
        name: "X-Accept-Moera",
        value: "1.0"
    });
    return {
        requestHeaders: headers
    };
}

function scanHeaders({responseHeaders, url}) {
    if (responseHeaders) {
        const header = responseHeaders.find(({name}) => name === "X-Moera");
        if (header) {
            matchingUrls.set(url, {header: header.value, accessed: Date.now()});
            cleanupFlash(matchingUrls, MAX_MATCHING_URLS_SIZE);
        }
    }
}

function modifyPage({tabId, url}) {
    if (matchingUrls.has(url)) {
        browser.tabs.executeScript(tabId, {file: "/content.js"});
    }
}

function startCommunication({tabId}) {
    browser.tabs.executeScript(tabId, {file: "/communication.js"});
    return {
        cancel: true
    };
}

function registerComPassword(password) {
    comPasswords.set(password, {accessed: Date.now()});
    cleanupFlash(comPasswords, MAX_COM_PASSWORDS_SIZE);
}

async function validateComPassword(tabId, password) {
    if (comPasswords.has(password)) {
        comPasswords.set(password, {accessed: Date.now()});
        await addTab(tabId);
        return true;
    }
    return false;
}

async function getHeader(url) {
    return matchingUrls.has(url) ? matchingUrls.get(url).header : "";
}

browser.runtime.onInstalled.addListener(async () => {
    if (await isStorageV1()) {
        await migrateStorageToV2();
    }
});

browser.webRequest.onBeforeSendHeaders.addListener(
    sendHeaders,
    {urls: ["<all_urls>"], types: ["main_frame"]},
    ["blocking", "requestHeaders"]
);

browser.webRequest.onHeadersReceived.addListener(
    scanHeaders,
    {urls: ["<all_urls>"], types: ["main_frame"]},
    ["blocking", "responseHeaders"] // "blocking" seems to be important to prevent race with onCommitted
);

browser.webNavigation.onCommitted.addListener(
    modifyPage
);

browser.webRequest.onBeforeSendHeaders.addListener(
    startCommunication,
    {urls: ["*://moera.please.start.communication/*"], types: ["xmlhttprequest"]},
    ["blocking"]
);

browser.runtime.onMessage.addListener(
    (message, sender) => {
        if (!message || typeof message !== "object" || !message.action || sender.id !== browser.runtime.id) {
            return;
        }
        switch (message.action) {
            case "openOptions":
                browser.runtime.openOptionsPage();
                break;
            case "registerComPassword":
                registerComPassword(message.payload);
                break;
            case "validateComPassword":
                return validateComPassword(sender.tab.id, message.payload);
            case "getHeader":
                return getHeader(message.payload);
            case "loadData":
                return loadData(sender.tab.id);
            case "storeData":
                storeData(sender.tab.id, message.payload);
                break;
            case "deleteData":
                deleteData(sender.tab.id, message.payload);
                break;
            case "switchData":
                switchData(sender.tab.id, message.payload);
                break;
            case "storeName":
                storeName(sender.tab.id, message.payload);
                break;
        }
    }
);
