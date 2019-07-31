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
    elements.sort((e1, e2) => e1.value.accessed - e2.value.accessed);
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

async function loadData() {
    const {clientData} = await browser.storage.local.get("clientData");
    return {
        source: "moera",
        action: "loadedData",
        payload: clientData
    }
}

function storeData(clientData) {
    browser.storage.local.set({clientData});
}

function registerComPassword(password) {
    comPasswords.set(password, {accessed: Date.now()});
    cleanupFlash(comPasswords, MAX_COM_PASSWORDS_SIZE);
}

function validateComPassword(password) {
    if (comPasswords.has(password)) {
        comPasswords.set(password, {accessed: Date.now()});
        return true;
    }
    return false;
}

function getHeader(url) {
    return matchingUrls.has(url) ? matchingUrls.get(url).header : "";
}

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
        if (!message || typeof message !== "object" || !message.action) {
            return;
        }
        if (message.action === "openOptions") {
            browser.runtime.openOptionsPage();
        }
        if (message.action === "storeData") {
            storeData(message.payload);
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
        if (message.action === "getHeader") {
            return Promise.resolve(getHeader(message.payload));
        }
    }
);
