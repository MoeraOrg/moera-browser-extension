import browser from "webextension-polyfill";

const DEFAULT_SETTINGS = {
    clientUrl: "https://client.moera.org/releases/latest"
};

export async function getSettings() {
    const data = await browser.storage.local.get("settings");
    return data && data.settings ? data.settings : DEFAULT_SETTINGS;
}

export async function setSettings(settings) {
    await browser.storage.local.set({settings});
}
