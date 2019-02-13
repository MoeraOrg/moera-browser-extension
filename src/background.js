import browser from "webextension-polyfill";

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
    elements.sort((e1, e2) => e1.value - e2.value);
    for (let i = 0; i < elements.length - maxSize; i++) {
        flash.delete(elements[i].key);
    }
}

function sendHeaders({requestHeaders}) {
    return new Promise((resolve, reject) => {
        let headers = requestHeaders.filter(header => header.name !== "X-Accept-Moera");
        headers.push({
            name: "X-Accept-Moera",
            value: "1.0"
        });
        resolve({
            requestHeaders: headers
        });
    });
}

function scanHeaders({responseHeaders, url}) {
    if (responseHeaders) {
        const header = responseHeaders.find(({name}) => name === "X-Moera");
        if (header) {
            matchingUrls.set(url, Date.now());
            cleanupFlash(matchingUrls, MAX_MATCHING_URLS_SIZE);
        }
    }
}

function modifyPage({url}) {
    if (matchingUrls.has(url)) {
        browser.tabs.executeScript({
            file: "/content.js"
        });
    }
}

function startCommunication() {
    browser.tabs.executeScript({
        file: "/communication.js"
    });
    return {
        cancel: true
    };
}

async function loadData() {
    const {clientData} = await browser.storage.local.get("clientData");
    return {
        source: "moera",
        action: "loadedData",
        payload: clientData
    }
}

function registerComPassword(password) {
    comPasswords.set(password, Date.now());
    cleanupFlash(comPasswords, MAX_COM_PASSWORDS_SIZE);
}

function validateComPassword(password) {
    if (comPasswords.has(password)) {
        comPasswords.set(password, Date.now());
        return true;
    }
    return false;
}

browser.webRequest.onBeforeSendHeaders.addListener(
    sendHeaders,
    {urls: ["<all_urls>"], types: ["main_frame", "speculative"]},
    ["blocking", "requestHeaders"]
);

browser.webRequest.onHeadersReceived.addListener(
    scanHeaders,
    {urls: ["<all_urls>"], types: ["main_frame", "speculative"]},
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
        if (!message || typeof message !== "object" || !message.action) {
            return;
        }
        if (message.action === "openOptions") {
            browser.runtime.openOptionsPage();
        }
        if (message.action === "storeData") {
            browser.storage.local.set({clientData: message.payload});
        }
        if (message.action === "loadData") {
            return loadData();
        }
        if (message.action === "registerComPassword") {
            registerComPassword(message.payload);
        }
        if (message.action === "validateComPassword") {
            return Promise.resolve(validateComPassword(message.payload));
        }
    }
);
