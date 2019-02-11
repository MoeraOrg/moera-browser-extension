import browser from "webextension-polyfill";

const MAX_MATCHING_URLS_SIZE = 100;
let matchingUrls = new Map();

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
            cleanupMatchingUrls();
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

function cleanupMatchingUrls() {
    if (matchingUrls.size <= MAX_MATCHING_URLS_SIZE) {
        return;
    }
    let elements = [];
    matchingUrls.forEach((value, key) => elements.push({key, value}));
    elements.sort((e1, e2) => e1.value - e2.value);
    for (let i = 0; i < elements.length - MAX_MATCHING_URLS_SIZE; i++) {
        matchingUrls.delete(elements[i].key);
    }
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

browser.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
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
            sendResponse(browser.storage.local.get("clientData"));
        }
    }
);
