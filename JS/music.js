import { getSettings } from './settings.js';

const music = new Audio('audio/race_music.mp3');
music.loop = true;

let shouldPlay = false;
let duckFactor = 1;

// Reads the saved settings and applies them to the audio
export function applyMusicSettings() {
    const settings = getSettings();
    //music.volume = settings.muted ? 0 : settings.musicVolume / 100;
    music.volume = settings.muted ? 0 : (settings.musicVolume / 100) * duckFactor;
}
export function setMusicDuckFactor(factor) {
    duckFactor = Math.max(0, Math.min(1, factor));
    applyMusicSettings();
}

export function startMusic() {
    shouldPlay = true;
    applyMusicSettings();
    music.play().catch(() => {
        //waits for the first click or key press and try to play audio again
        const resume = () => music.play();
        document.addEventListener('pointerdown', resume, { once: true });
        document.addEventListener('keydown', resume, { once: true });
    });
}

export function stopMusic() {
    shouldPlay = false;
    music.pause();
    music.currentTime = 0; //the next race starts the music from the beginning instead of where it stopped
}