import browser from 'webextension-polyfill';

const DISABLED = 0;
const RESTRICTED = 1;
const ENABLED = 2;

async function isInitializationEnabled() {
    let body = document.getElementsByTagName("body")[0];
    if ("comInitialized" in body.dataset) {
        return DISABLED;
    }
    const comPassword = body.dataset.comPassword;
    if (comPassword == null) {
        return RESTRICTED;
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
    return response ? ENABLED : DISABLED;
}

function initializeCommunication(enabled) {
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

        if (enabled === RESTRICTED && message.action !== "transferredData") {
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
        message => window.postMessage(message, origin)
    );

    window.postMessage({
        source: "moera",
        action: enabled === ENABLED ? "loadData" : "transferData"
    }, origin);
}

isInitializationEnabled().then(enabled => {
    if (enabled !== DISABLED) {
        initializeCommunication(enabled);
    }
});
