const KEY = 'mmr-settings';
const DEFAULTS = {
    muted: false,
    musicVolume: 70,
    sfxVolume: 80
};

export class SettingsManager {
    static #instance = null;

    constructor() {
        if (SettingsManager.#instance) {
            return SettingsManager.#instance;
        }

        try {
            this.settings = {
                ...DEFAULTS,
                ...JSON.parse(localStorage.getItem(KEY))
            };
        } catch {
            this.settings = { ...DEFAULTS };
        }

        SettingsManager.#instance = this;
    }

    static getInstance() {
        if (!SettingsManager.#instance) {
            SettingsManager.#instance = new SettingsManager();
        }

        return SettingsManager.#instance;
    }

    getSettings() {
        return this.settings;
    }

    saveSettings(settings) {
        Object.assign(this.settings, settings);

        try {
            localStorage.setItem(KEY, JSON.stringify(this.settings));
        } catch (err) {
            console.error('Could not save settings:', err);
        }
    }
}

export function getSettings() {
    return SettingsManager.getInstance().getSettings();
}

export function saveSettings(settings) {
    SettingsManager.getInstance().saveSettings(settings);
}