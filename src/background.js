import browser from "webextension-polyfill";

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
            matchingUrls.set(url, true);
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

browser.webRequest.onBeforeSendHeaders.addListener(
    sendHeaders,
    {urls: ["<all_urls>"], types: ["main_frame", "speculative"]},
    ["blocking", "requestHeaders"]
);

browser.webRequest.onCompleted.addListener(
    scanHeaders,
    {urls: ["<all_urls>"], types: ["main_frame", "speculative"]},
    ["responseHeaders"]
);

browser.webNavigation.onCommitted.addListener(
    modifyPage
);

browser.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (message === "openOptions") {
            browser.runtime.openOptionsPage();
        }
    }
);
