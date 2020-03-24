import { getSettings, setSettings } from "./settings";

function isDefaultClient() {
    return document.querySelector("#default-client").checked;
}

function setDefaultClient(defaultClient) {
    document.querySelector("#default-client").checked = defaultClient;
}

function showCustomClientUrl(visible) {
    document.querySelector("#custom-client-url-section").style.display = visible ? "block" : "none";
}

function getCustomClientUrl() {
    return document.querySelector("#custom-client-url").value;
}

function setCustomClientUrl(customClientUrl) {
    document.querySelector("#custom-client-url").value = customClientUrl;
}

async function updateUI() {
    const {defaultClient, customClientUrl} = await getSettings();
    setDefaultClient(defaultClient);
    showCustomClientUrl(!defaultClient);
    setCustomClientUrl(customClientUrl);
}

function defaultClientChanged() {
    showCustomClientUrl(!isDefaultClient());
}

async function saveSettings() {
    await setSettings({
        defaultClient: isDefaultClient(),
        customClientUrl: getCustomClientUrl()
    });
}

document.addEventListener("DOMContentLoaded", updateUI);
document.querySelector("#default-client").addEventListener("click", defaultClientChanged);
document.querySelector("#save").addEventListener("click", saveSettings);
