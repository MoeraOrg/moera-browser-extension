import browser from 'webextension-polyfill';

let scriptCode = '(' + function() {
    fetch("%URL%", {redirect: "follow"})
        .then(response => {
            if (response.ok) {
                return Promise.all([response.text(), response.url]);
            }
            throw new Error("Client download failed.");
        })
        .then(([text, baseUrl]) => {
            const content = text
                .replace(/<head>/i, `<head><base href='${baseUrl}'>`)
                .replace(/<body>/i, "<body data-com-password='%PASSWD%' data-x-moera='%HEADER%'>");
            document.open("text/html", "replace");
            document.write(content);
            document.close();
        })
        .catch(error => {
            alert("Cannot open Moera client page: " + error.message);
        });
} + ')();';

async function load() {
    if (document.contentType !== "text/plain") {
        return;
    }

    if (window.moera.clientUrl) {
        scriptCode = scriptCode
            .replace(/%URL%/g, window.moera.clientUrl)
            .replace(/%PASSWD%/g, window.moera.comPassword)
            .replace(/%HEADER%/g, window.moera.header);
        let script = document.createElement("script");
        script.textContent = scriptCode;
        (document.head || document.documentElement).appendChild(script);
    } else {
        const ok = window.confirm(
            "Moera client URL is not set in the add-on settings. "
            + "Open the settings page?");
        if (ok) {
            browser.runtime.sendMessage({action: "openOptions"});
        }
    }
}

load();
