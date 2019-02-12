window.addEventListener("message", (event) => {
    // Only accept messages from the same frame
    if (event.source !== window) {
        return;
    }

    const message = event.data;
    console.log("Message received: " + JSON.stringify(message));

    // Only accept messages that we know are ours
    if (message === null || typeof message !== "object") {
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
    action: "loadData"
}, "*");
