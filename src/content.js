import browser from 'webextension-polyfill';
import * as Base64js from 'base64-js';

import { getClientUrl } from "./settings";

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

function randomPassword() {
    let buf = new Uint8Array(16);
    window.crypto.getRandomValues(buf);
    return Base64js.fromByteArray(buf);
}

async function load() {
    if (document.contentType !== "text/plain") {
        return;
    }

    const clientUrl = await getClientUrl();
    if (clientUrl) {
        const comPassword = randomPassword();
        await browser.runtime.sendMessage({action: "registerComPassword", payload: comPassword});
        const header = await browser.runtime.sendMessage({action: "getHeader", payload: window.location.href});
        scriptCode = scriptCode
            .replace(/%URL%/g, clientUrl)
            .replace(/%PASSWD%/g, comPassword)
            .replace(/%HEADER%/g, header);
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
