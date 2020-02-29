import { getSettings, setSettings } from "./data";

async function updateUI() {
    const {clientUrl} = await getSettings();
    document.querySelector("#client-url").value = clientUrl;
}

async function saveSettings() {
    const clientUrl = document.querySelector("#client-url").value;
    await setSettings({clientUrl});
}

document.addEventListener("DOMContentLoaded", updateUI);
document.querySelector("#save").addEventListener("click", saveSettings);
