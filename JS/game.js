import { requireLogin } from './auth.js';
import { generateQuestion } from './question.js';
import { initRace3D, setRaceState, resetRace3D } from './race3d.js';

import { startMusic, stopMusic } from './music.js';

import './sounds.js';

const REQUIRE_LOGIN = true; 
const QUESTION_SECONDS = 10;    
const TRACK_METERS = 100;      
const BASE_SPEED = 3;           
const BOOST_SPEED = 5;         
const SLOW_SPEED = 1;           
const EFFECT_MS = 1000;   // how long a boost or slowdown lasts

const searchID = (id) => document.getElementById(id);//shortcut for document.getElementById

let current = null;   // the question on screen: { text, answer }
let timerId = null;
let endTime = 0;

let distance = 0;
let effect = null;               
let lastTime = null;
let racing = false;

function say(text, kind = '') {//usde to show feedback to the player, like "correct" or "wrong"
    const gameBox = document.querySelector('.game');
    searchID('feedback').textContent = text;
    
    gameBox.classList.remove('glow-ok', 'glow-error');
    void gameBox.offsetWidth; 

    if (kind === 'ok') {
        gameBox.classList.add('glow-ok');
    } else if (kind === 'error') {
        gameBox.classList.add('glow-error');
    }
}

function announce(name, detail = {}) {//announces a event to the rest of game, used in sound.js and coin.js
    document.dispatchEvent(new CustomEvent(name, { detail }));
}
// race3d.js draws the track, marble, finish line and camera into the canvas.
// This file only tells it how far the marble has gone and how fast it's moving.
initRace3D(searchID('canvas'), { trackMeters: TRACK_METERS, baseSpeed: BASE_SPEED });

function currentSpeed(now) {
    return effect && now < effect.endsAt ? effect.speed : BASE_SPEED;
}

function applyEffect(speed) {
    effect = { speed, endsAt: performance.now() + EFFECT_MS };
}

function render(speed) {
    searchID('hud').textContent = distance.toFixed(1) + ' / ' + TRACK_METERS + ' m  |  ' + speed + ' m/s';
    setRaceState(distance, speed);
}

function frame(now) {//rusn 60 times per second
    if (!racing) return;
    if (lastTime === null) lastTime = now;
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    const speed = currentSpeed(now);
    
    // Advance the race distance (the 3D view moves the marble to match)
    distance = Math.min(distance + speed * dt, TRACK_METERS);

    render(speed);
    if (distance >= TRACK_METERS) { finishRace(); return; }
    requestAnimationFrame(frame);
}

function startRace() {
    distance = 0;
    effect = null;
    lastTime = null;
    racing = true;

    resetRace3D();

    searchID('answer').disabled = false;
    searchID('popup').hidden = true;
    say('');
    render(BASE_SPEED);
    newQuestion();
    startTimer();
    startMusic();
    requestAnimationFrame(frame);
}

function finishRace() {
    racing = false;
    stopMusic();
    stopTimer();
    searchID('answer').disabled = true;
    say('');
    searchID('popup').hidden = false;
    searchID('restart').focus();
    announce('race:finished', { meters: distance });
}

searchID('restart').addEventListener('click', () => {
    announce('race:restart');
    startRace();
});

function newQuestion() {
    current = generateQuestion();
    
    // Inject the math pieces into the DOM
    searchID('q-num1').textContent = current.num1;
    searchID('q-symbol').textContent = current.symbol;
    searchID('q-num2').textContent = current.num2;
    
    searchID('answer').value = '';
    searchID('answer').focus();
    announce('question:shown', current);
}

function startTimer() {
    stopTimer();
    endTime = Date.now() + QUESTION_SECONDS * 1000;
    timerId = setInterval(tick, 50);
    tick();
}

function stopTimer() {
    clearInterval(timerId);
}

function tick() {
    const left = Math.max(0, endTime - Date.now());
    searchID('timer-bar').style.width = (left / (QUESTION_SECONDS * 1000)) * 100 + '%';
    searchID('timer-bar').classList.toggle('low', left <= 1000);
    searchID('timer-text').textContent = Math.ceil(left / 1000);
    if (left === 0) onTimeUp();
}

function onTimeUp() {
    stopTimer();
    if (!racing) return;
    applyEffect(SLOW_SPEED);
    say('', 'error');
    searchID('answer').value = '';
    searchID('answer').focus();
    announce('timer:expired');
    startTimer();
}

searchID('answer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!racing) return;
    const raw = searchID('answer').value.trim();

    if (!/^-?\d+$/.test(raw)) {
        say('Enter a whole number.', 'error');
        searchID('answer').focus();
        return;
    }

    if (Number(raw) === current.answer) {
        stopTimer();
        applyEffect(BOOST_SPEED);
        say('', 'ok');
        announce('question:answered', { correct: true });
        newQuestion();
        startTimer();
    } else {
        applyEffect(SLOW_SPEED);
        say('', 'error');
        announce('question:answered', { correct: false });
        searchID('answer').value = '';
        searchID('answer').focus();
    }
});

if (REQUIRE_LOGIN) {//start if logged in
    await requireLogin();
}
startRace();//starts the race after page loads