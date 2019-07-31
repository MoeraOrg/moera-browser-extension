import browser from 'webextension-polyfill';

import { getSettings, setSettings } from "./settings";

async function updateUI() {
    const {clientUrl} = await getSettings();
    document.querySelector("#client-url").value = clientUrl;
}

async function saveSettings() {
    const clientUrl = document.querySelector("#client-url").value;
    setSettings({clientUrl});
}

function onError(e) {
    console.error(e);
}

document.addEventListener("DOMContentLoaded", updateUI);
document.querySelector("#save").addEventListener("click", saveSettings);
