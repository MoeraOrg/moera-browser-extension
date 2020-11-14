import { getSettings, setSettings } from "./settings";

function isDefaultClient() {
    return document.getElementById("default-client").checked;
}

function setDefaultClient(defaultClient) {
    document.getElementById("default-client").checked = defaultClient;
}

function isInitialDefaultClient() {
    return document.getElementById("default-client").dataset.initial === "true";
}

function setInitialDefaultClient(defaultClient) {
    document.getElementById("default-client").dataset.initial = defaultClient;
}

function getCustomClientUrl() {
    return document.getElementById("custom-client-url").value;
}

function setCustomClientUrl(customClientUrl) {
    document.getElementById("custom-client-url").value = customClientUrl;
}

function getInitialCustomClientUrl() {
    return document.getElementById("custom-client-url").dataset.initial;
}

function setInitialCustomClientUrl(customClientUrl) {
    document.getElementById("custom-client-url").dataset.initial = customClientUrl;
}

function showCustomClientUrl(visible) {
    document.getElementById("custom-client-url-section").style.display = visible ? "block" : "none";
}

function enableSaveButton(enabled) {
    document.getElementById("save").disabled = !enabled;
}

function update() {
    showCustomClientUrl(!isDefaultClient());
    enableSaveButton(isDefaultClient() !== isInitialDefaultClient()
        || getCustomClientUrl() !== getInitialCustomClientUrl());
}

async function initUI() {
    const {defaultClient, customClientUrl} = await getSettings();
    setInitialDefaultClient(defaultClient);
    setDefaultClient(defaultClient);
    setInitialCustomClientUrl(customClientUrl);
    setCustomClientUrl(customClientUrl);
    update();
}

async function saveSettings() {
    await setSettings({
        defaultClient: isDefaultClient(),
        customClientUrl: getCustomClientUrl()
    });
    setInitialDefaultClient(isDefaultClient());
    setInitialCustomClientUrl(getCustomClientUrl());
    update();
}

document.addEventListener("DOMContentLoaded", initUI);
document.getElementById("default-client").addEventListener("click", update);
document.getElementById("custom-client-url").addEventListener("keyup", update);
document.getElementById("save").addEventListener("click", saveSettings);
