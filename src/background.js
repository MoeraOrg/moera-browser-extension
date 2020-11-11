import browser from 'webextension-polyfill';
import * as Base64js from 'base64-js';

import {
    deleteData,
    hasClientData,
    isStorageV1,
    loadData,
    migrateStorageToV2,
    storeData,
    switchData,
    transferredData
} from "./data";
import { addTab } from "./tabs";
import { storeName } from "./names";
import { getClientUrl } from "./settings";

const MAX_MATCHING_URLS_SIZE = 100;
const matchingUrls = new Map();

const MAX_COM_PASSWORDS_SIZE = 100;
const comPasswords = new Map();

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
    let headers = requestHeaders.filter(header => header.name.toLowerCase() !== "x-accept-moera");
    headers.push({
        name: "X-Accept-Moera",
        value: "1.0"
    });
    return {
        requestHeaders: headers
    };
}

function getContentType(responseHeaders) {
    const header = responseHeaders.find(({name}) => name.toLowerCase() === "content-type");
    if (!header) {
        return null;
    }
    const m = header.value.toLowerCase().match(/^[a-z-]+\/[a-z-]+/);
    return m ? m[0] : null;
}

function parseHeader(value) {
    const params = {};
    value.split(/\s+/).map(s => s.split("=")).forEach(v => params[v[0].toLowerCase()] = decodeURIComponent(v[1]));
    return params;
}

function scanHeaders({responseHeaders, url}) {
    if (!responseHeaders) {
        return;
    }
    const header = responseHeaders.find(({name}) => name.toLowerCase() === "x-moera");
    if (!header) {
        return;
    }

    const params = parseHeader(header.value);
    if (params.redirect) {
        if (params.connectedonly !== "true" || hasClientData) {
            return {redirectUrl: params.redirect};
        } else {
            return;
        }
    }
    matchingUrls.set(url, {header: header.value, accessed: Date.now()});
    cleanupFlash(matchingUrls, MAX_MATCHING_URLS_SIZE);

    if (getContentType(responseHeaders) !== "text/plain") {
        const headers = responseHeaders.filter(({name}) => name.toLowerCase() !== "content-type");
        headers.push({name: "Content-Type", value: "text/plain; charset=utf-8"});
        return {responseHeaders: headers};
    }
}

function randomComPassword() {
    const buf = new Uint8Array(16);
    window.crypto.getRandomValues(buf);
    return Base64js.fromByteArray(buf);
}

async function modifyPage({tabId, url}) {
    if (matchingUrls.has(url)) {
        const clientUrl = await getClientUrl();
        const comPassword = randomComPassword();
        registerComPassword(comPassword);
        const header = getHeader(url);
        browser.tabs.executeScript(tabId, {
            code: `window.moera = {clientUrl: "${clientUrl}", comPassword: "${comPassword}", header: "${header}"}`
        });
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

function getHeader(url) {
    return matchingUrls.has(url) ? matchingUrls.get(url).header : "";
}

browser.runtime.onInstalled.addListener(async (details) => {
    if (await isStorageV1()) {
        await migrateStorageToV2();
    }
    if (details.reason === "install") {
        browser.tabs.create({
            url : "https://web.moera.org"
        });
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
                return;
            case "validateComPassword":
                return validateComPassword(sender.tab.id, message.payload);
            case "loadData":
                return loadData(sender.tab.id);
            case "storeData":
                storeData(sender.tab.id, message.payload);
                return;
            case "deleteData":
                deleteData(sender.tab.id, message.payload);
                return;
            case "switchData":
                switchData(sender.tab.id, message.payload);
                return;
            case "transferredData":
                return transferredData(sender.tab.id, message.payload);
            case "storeName":
                storeName(sender.tab.id, message.payload);
                return;
        }
    }
);
