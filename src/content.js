let actualCode = '(' + function() {
    fetch("%URL%")
        .then(response => {
            if (response.ok) {
                return response.text();
            }
            throw new Error("Client download failed.");
        })
        .then(text => {
            const content = text.replace(
                /<head>/i,
                "<head><base href='%URL%'>");
            document.open("text/html", "replace");
            document.write(content);
            document.close();
        })
        .catch(error => {
            alert("Cannot open Moera client page: " + error.message);
        });
} + ')();';

(browser||chrome).storage.local.get("settings")
    .then(({settings}) => {
        if (settings.clientUrl) {
            actualCode = actualCode.replace(/%URL%/g, settings.clientUrl);
            let script = document.createElement("script");
            script.textContent = actualCode;
            (document.head||document.documentElement).appendChild(script);

            window.addEventListener("message", (event) => {
                // Only accept messages from the same frame
                if (event.source !== window) {
                    return;
                }

                const message = event.data;

                // Only accept messages that we know are ours
                if (message === null
                    || typeof message !== "object"
                    || !!message.source && message.source !== "dataaccessgateway-agent") {
                    return;
                }

                chrome.runtime.sendMessage(message)
                    .then(response => {
                        if (response !== null && typeof response === "object") {
                            window.postMessage(response, "*");
                        }
                    });
            });
        } else {
            const ok = window.confirm(
                "Moera client URL is not set in the add-on settings. "
                + "Open the settings page?");
            if (ok) {
                (browser||chrome).runtime.sendMessage({action: "openOptions"});
            }
        }
    });
