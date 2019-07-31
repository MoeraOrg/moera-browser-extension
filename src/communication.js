import browser from 'webextension-polyfill';

async function isInitializationEnabled() {
    let body = document.getElementsByTagName("body")[0];
    if ("comInitialized" in body.dataset) {
        return false;
    }
    const comPassword = body.dataset.comPassword;
    if (comPassword == null) {
        return false;
    }
    const response = await browser.runtime.sendMessage({
        action: "validateComPassword",
        payload: comPassword
    });
    if (response) {
        body.dataset.comInitialized = "yes";
        delete body.dataset.comPassword;
    } else {
        // Forced reload will cause fetching of the page again from the server
        // and activation of the extension that will generate a new password
        window.location.assign(window.location);
    }
    return response;
}

function initializeCommunication() {
    const origin = window.location.href;
    window.addEventListener("message", event => {
        // Only accept messages from the same frame
        if (event.source !== window) {
            return;
        }

        const message = event.data;

        // Only accept messages that we know are ours
        if (message === null || typeof message !== "object" || !message.source || message.source !== "moera") {
            return;
        }

        browser.runtime.sendMessage(message)
            .then(response => {
                if (response !== null && typeof response === "object") {
                    window.postMessage(response, origin);
                }
            });
    });

    browser.runtime.onMessage.addListener(
        (message, sender) => {
            window.postMessage(message, origin);
        }
    );

    window.postMessage({
        source: "moera",
        action: "loadData"
    }, origin);
}

isInitializationEnabled().then(enabled => {
    if (enabled) {
        initializeCommunication();
    }
});
