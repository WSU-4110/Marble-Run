const KEY = 'mmr-settings';
const DEFAULTS = { muted: false, musicVolume: 70, sfxVolume: 80 };

export function getSettings() {
    try {
        return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) };
    } catch {
        return { ...DEFAULTS };
    }
}

export function saveSettings(settings) {
    try {
        localStorage.setItem(KEY, JSON.stringify(settings));
    } catch (err) {
        console.error('Could not save settings:', err);
    }
}