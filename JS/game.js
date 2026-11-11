import { requireLogin } from './auth.js';
import { generateQuestion } from './question.js';
import { initRace3D, setRaceState, resetRace3D } from './race3d.js';
import { QuestionTimer } from './questionTimer.js';

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

let current = null;   // the question on screen: { num1, symbol, num2, answer }

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
    timer.start();
    startMusic();
    requestAnimationFrame(frame);
}

function finishRace() {
    racing = false;
    stopMusic();
    timer.stop();
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

function onTimeUp() {
    if (!racing) return;
    applyEffect(SLOW_SPEED);
    say('', 'error');
    searchID('answer').value = '';
    searchID('answer').focus();
    announce('timer:expired');
    timer.start();   // same question, fresh time
}
const LOW_TIME_MS = 1000;   

class TimerBar {
    constructor(barElement, textElement) {
        this.barElement = barElement;
        this.textElement = textElement;
    }

    onTick(msLeft, totalMs) {
        this.barElement.style.width = (msLeft / totalMs) * 100 + '%';
        this.barElement.classList.toggle('low', msLeft <= LOW_TIME_MS);
        this.textElement.textContent = Math.ceil(msLeft / 1000);
    }
}

class TimeoutPenalty {
    onExpire() {
        onTimeUp();
    }
}

const timer = new QuestionTimer(QUESTION_SECONDS);
timer.subscribe(new TimerBar(searchID('timer-bar'), searchID('timer-text')));
timer.subscribe(new TimeoutPenalty());

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
        timer.stop();
        applyEffect(BOOST_SPEED);
        say('', 'ok');
        announce('question:answered', { correct: true });
        newQuestion();
        timer.start();
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