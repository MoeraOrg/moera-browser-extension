import browser from "webextension-polyfill";

function probe(requestDetails) {
    if (requestDetails.responseHeaders) {
        for (let header of requestDetails.responseHeaders) {
            if (header.name == "X-Moera") {
                browser.tabs.executeScript({
                    file: "/content.js"
                });
                break;
            }
        }
    }
}

browser.webRequest.onCompleted.addListener(
    probe,
    {urls: ["<all_urls>"], types: ["main_frame"]},
    ["responseHeaders"]
);
