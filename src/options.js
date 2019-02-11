import browser from "webextension-polyfill";

async function updateUI() {
    const {settings} = await browser.storage.local.get("settings");
    if (settings.clientUrl) {
        document.querySelector("#client-url").value = settings.clientUrl;
    }
}

async function saveSettings() {
    const clientUrl = document.querySelector("#client-url").value; 
    await browser.storage.local.set({
        settings: {
            clientUrl
        }
    });
}

function onError(e) {
    console.error(e);
}

document.addEventListener("DOMContentLoaded", updateUI);
document.querySelector("#save").addEventListener("click", saveSettings);
