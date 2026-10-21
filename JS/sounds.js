import { getSettings } from './settings.js';
import { setMusicDuckFactor } from './music.js';

const correctSound = new Audio('audio/correct.mp3');
const incorrectSound = new Audio('audio/incorrect.mp3');

let activeSound = null;

function playAnswerSound(sound) {
    const settings = getSettings();

    if (activeSound) {
        activeSound.pause();
        activeSound.currentTime = 0;
    }

    activeSound = null;
    setMusicDuckFactor(1);

    if (settings.muted || settings.sfxVolume === 0) return;

    sound.volume = settings.sfxVolume / 100;
    sound.currentTime = 0;
    activeSound = sound;

    //lower the background music while the sound effect plays
    setMusicDuckFactor(0.25);

    sound.play().catch(() => {
        if (activeSound === sound) {
            activeSound = null;
            setMusicDuckFactor(1);
        }
    });
}

function finishSound(sound) {
    if (activeSound === sound) {
        activeSound = null;
        setMusicDuckFactor(1);
    }
}

correctSound.addEventListener('ended', () => finishSound(correctSound));
incorrectSound.addEventListener('ended', () => finishSound(incorrectSound));

document.addEventListener('question:answered', (event) => {
    playAnswerSound(event.detail.correct ? correctSound : incorrectSound);
});