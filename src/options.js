import browser from "webextension-polyfill";

async function updateUI() {
    const settings = await browser.storage.local.get();
    if (settings.bundle) {
        document.querySelector("#bundle").value = settings.bundle;
    }
}

function saveSettings() {
    const bundle = document.querySelector("#bundle").value; 
    browser.storage.local.set({
        bundle
    });
}

function onError(e) {
    console.error(e);
}

document.addEventListener('DOMContentLoaded', updateUI);
document.querySelector('#save').addEventListener('click', saveSettings)
