import browser from "webextension-polyfill";

async function updateUI() {
    const settings = await browser.storage.local.get();
    if (settings.clientUrl) {
        document.querySelector("#client-url").value = settings.clientUrl;
    }
}

function saveSettings() {
    const clientUrl = document.querySelector("#client-url").value; 
    browser.storage.local.set({
        clientUrl
    });
}

function onError(e) {
    console.error(e);
}

document.addEventListener("DOMContentLoaded", updateUI);
document.querySelector("#save").addEventListener("click", saveSettings)
