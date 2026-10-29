import { requireLogin, logout, getProfile } from './auth.js';

import { getSettings, saveSettings } from './settings.js';

import { startMusic, applyMusicSettings } from './music.js';

const REQUIRE_LOGIN = true;
const GAME_PAGE = 'racing-screen.html';

const $ = (id) => document.getElementById(id);


// Settings panel 
const modal = $('settings-modal');
const settings = getSettings();

function showValues() {
    $('music-value').textContent = settings.musicVolume + '%';
    $('sfx-value').textContent = settings.sfxVolume + '%';
}

// Fill the controls with the saved values
$('mute-all').checked = settings.muted;
$('music-volume').value = settings.musicVolume;
$('sfx-volume').value = settings.sfxVolume;
showValues();

// Save on every change
$('mute-all').addEventListener('change', (e) => {
    settings.muted = e.target.checked;
    saveSettings(settings);
    applyMusicSettings();

});
$('music-volume').addEventListener('input', (e) => {
    settings.musicVolume = Number(e.target.value);
    showValues();
    saveSettings(settings);
    applyMusicSettings();

});
$('sfx-volume').addEventListener('input', (e) => {
    settings.sfxVolume = Number(e.target.value);
    showValues();
    saveSettings(settings);
});

function openSettings() {
    modal.hidden = false;
    $('settings-close').focus();
}

function closeSettings() {
    modal.hidden = true;
    $('settings-btn').focus();   // return focus to the button that opened it
}

$('settings-btn').addEventListener('click', openSettings);
$('settings-close').addEventListener('click', closeSettings);

// Click on the dark backdrop closes it
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSettings();
});

// Escape closes it
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeSettings();
});


$('start-btn').addEventListener('click', () => {
    window.location.href = GAME_PAGE;
});
$('logout-btn').addEventListener('click', logout);

if (REQUIRE_LOGIN) {
    const profile = await requireLogin(); // sends logged-out visitors to the login page
    if (profile) {
        document.getElementById('greeting').textContent = `Welcome, ${profile.display_name}!`;
        $('coin-count').textContent = profile.coins ?? 0;
    }
}