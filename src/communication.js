function initializeCommunication() {
    window.addEventListener("message", (event) => {
        // Only accept messages from the same frame
        if (event.source !== window) {
            return;
        }

        const message = event.data;

        // Only accept messages that we know are ours
        if (message === null || typeof message !== "object" || !message.source || message.source !== "moera") {
            return;
        }

        chrome.runtime.sendMessage(message)
            .then(response => {
                if (response !== null && typeof response === "object") {
                    window.postMessage(response, "*");
                }
            });
    });

    window.postMessage({
        source: "moera",
        action: "loadData"
    }, "*");
}

async function isInitializationEnabled() {
    let body = document.getElementsByTagName("body")[0];
    if (body.getAttribute("data-com-initialized") != null) {
        return false;
    }
    const comPassword = body.getAttribute("data-com-password");
    if (comPassword == null) {
        return false;
    }
    const response = await chrome.runtime.sendMessage({
        action: "validateComPassword",
        payload: comPassword
    });
    if (response) {
        body.setAttribute("data-com-initialized", "yes");
        body.removeAttribute("data-com-password");
    } else {
        // Forced reload will cause fetching of the page again from the server
        // and activation of the extension that will generate new password
        window.location.assign(window.location);
    }
    return response;
}

isInitializationEnabled().then(enabled => {
    if (enabled) {
        initializeCommunication();
    }
});
