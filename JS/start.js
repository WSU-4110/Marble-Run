import { requireLogin, logout, isGuest} from './auth.js';
import { getSettings, saveSettings } from './settings.js';

import { applyMusicSettings } from './music.js';

const REQUIRE_LOGIN = true;
const GAME_PAGE = 'racing-screen.html';

// Find every element this page uses once, up front, with a clear name for each.
const ui = {
    greeting: document.getElementById('greeting'),
    coinCount: document.getElementById('coin-count'),
    startButton: document.getElementById('start-btn'),
    logoutButton: document.getElementById('logout-btn'),

    settingsButton: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    settingsClose: document.getElementById('settings-close'),
    muteAll: document.getElementById('mute-all'),
    musicVolume: document.getElementById('music-volume'),
    musicValue: document.getElementById('music-value'),
    sfxVolume: document.getElementById('sfx-volume'),
    sfxValue: document.getElementById('sfx-value'),
};

const settings = getSettings();

function showVolumeLabels() {
    ui.musicValue.textContent = settings.musicVolume + '%';
    ui.sfxValue.textContent = settings.sfxVolume + '%';
}

// Fill the controls with the saved values
ui.muteAll.checked = settings.muted;
ui.musicVolume.value = settings.musicVolume;
ui.sfxVolume.value = settings.sfxVolume;
showVolumeLabels();

// Save on every change
ui.muteAll.addEventListener('change', (e) => {
    settings.muted = e.target.checked;
    saveSettings(settings);
    applyMusicSettings();
});

ui.musicVolume.addEventListener('input', (e) => {
    settings.musicVolume = Number(e.target.value);
    showVolumeLabels();
    saveSettings(settings);
    applyMusicSettings();
});

ui.sfxVolume.addEventListener('input', (e) => {
    settings.sfxVolume = Number(e.target.value);
    showVolumeLabels();
    saveSettings(settings);
});

function openSettings() {
    ui.settingsModal.hidden = false;
    ui.settingsClose.focus();
}

function closeSettings() {
    ui.settingsModal.hidden = true;
    ui.settingsButton.focus();   // return focus to the button that opened it
}

ui.settingsButton.addEventListener('click', openSettings);
ui.settingsClose.addEventListener('click', closeSettings);

// Clicking the dark backdrop closes it
ui.settingsModal.addEventListener('click', (e) => {
    if (e.target === ui.settingsModal) closeSettings();
});

// Escape closes it
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !ui.settingsModal.hidden) closeSettings();
});


// ---- Start / log out ----
ui.startButton.addEventListener('click', () => {
    window.location.href = GAME_PAGE;
});

// Guests see "Log In" instead of "Log Out". The same logout() handles both:
// for a guest it just ends the guest session and goes to the login page.
if (isGuest()) {
    ui.logoutButton.textContent = 'Log In';
}
ui.logoutButton.addEventListener('click', logout);


// ---- Player info ----
if (REQUIRE_LOGIN) {
    const profile = await requireLogin(); // sends logged-out visitors to the login page
    if (profile) {
        ui.greeting.textContent = `Welcome, ${profile.display_name}!`;
        ui.coinCount.textContent = profile.coins ?? 0;
    }
}