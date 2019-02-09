import browser from "webextension-polyfill";

let matchingUrls = new Map();

function sendHeaders(requestDetails) {
    return new Promise((resolve, reject) => {
        let headers = requestDetails.requestHeaders.filter(header => header.name !== "X-Accept-Moera");
        headers.push({
            name: "X-Accept-Moera",
            value: "1.0"
        });
        resolve({
            requestHeaders: headers
        });
    });
}

function probe(requestDetails) {
    if (requestDetails.responseHeaders) {
        for (let header of requestDetails.responseHeaders) {
            if (header.name === "X-Moera") {
                matchingUrls.set(requestDetails.url, true);
                break;
            }
        }
    }
}

function modifyPage(transitionDetails) {
    if (matchingUrls.has(transitionDetails.url)) {
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
    probe,
    {urls: ["<all_urls>"], types: ["main_frame", "speculative"]},
    ["responseHeaders"]
);

browser.webNavigation.onCommitted.addListener(
    modifyPage
);

browser.runtime.onMessage.addListener(
    function (message, sender, sendResponse) {
        if (message === "openOptions") {
            browser.runtime.openOptionsPage();
        }
    }
);
