import browser from 'webextension-polyfill';
import * as Base64js from 'base64-js';

let actualCode = '(' + function() {
    fetch("%URL%")
        .then(response => {
            if (response.ok) {
                return response.text();
            }
            throw new Error("Client download failed.");
        })
        .then(text => {
            const content = text
                .replace(/<head>/i, "<head><base href='%URL%'>")
                .replace(/<body>/i, "<body data-com-password='%PASSWD%' data-x-moera='%HEADER%'>");
            document.open("text/html", "replace");
            document.write(content);
            document.close();
        })
        .catch(error => {
            alert("Cannot open Moera client page: " + error.message);
        });
} + ')();';

function randomPassword() {
    let buf = new Uint8Array(16);
    window.crypto.getRandomValues(buf);
    return Base64js.fromByteArray(buf);
}

browser.storage.local.get("settings")
    .then(data => {
        if (data.settings && data.settings.clientUrl) {
            const comPassword = randomPassword();
            browser.runtime.sendMessage({action: "registerComPassword", payload: comPassword});
            browser.runtime.sendMessage({action: "getHeader", payload: window.location.href})
                .then(header => {
                    actualCode = actualCode
                        .replace(/%URL%/g, data.settings.clientUrl)
                        .replace(/%PASSWD%/g, comPassword)
                        .replace(/%HEADER%/g, header);
                    let script = document.createElement("script");
                    script.textContent = actualCode;
                    (document.head||document.documentElement).appendChild(script);
                });
        } else {
            const ok = window.confirm(
                "Moera client URL is not set in the add-on settings. "
                + "Open the settings page?");
            if (ok) {
                browser.runtime.sendMessage({action: "openOptions"});
            }
        }
    });
