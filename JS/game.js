import { requireLogin } from './auth.js';
import { generateQuestion } from './question.js';

import { startMusic, stopMusic } from './music.js';

import './sounds.js';

const REQUIRE_LOGIN = true; // set to false to test this page without Supabase
const QUESTION_SECONDS = 10;    
const TRACK_METERS = 100;      
const BASE_SPEED = 3;           
const BOOST_SPEED = 5;         
const SLOW_SPEED = 1;           
const EFFECT_MS = 1000;   // how long a boost or slowdown lasts

const PIXELS_PER_METER = 60;    // how far the background scrolls for each meter the marble moves
const MARBLE_START_Y = 0.35;    // marble's starting height (0 = top, 1 = bottom)
const ZOOM = 0.5;               // how close the camera is, smaller = farther away
const BG_SCROLL_SPEED = 150;    // pixels per second (constant background movement)

const searchID = (id) => document.getElementById(id);

let current = null;   // the question on screen: { text, answer }
let timerId = null;
let endTime = 0;

let distance = 0;
let scrollY = 0;                 
let marbleY = 0;                 // Absolute screen position (not an offset anymore)
let marbleMinY = 0;              // Top of the screen
let marbleMaxY = 0;              // Just above the question box
let effect = null;               
let lastTime = null;
let racing = false;

function say(text, kind = '') {
    const gameBox = document.querySelector('.game');
    
    // 1. Remove any existing glow classes
    gameBox.classList.remove('glow-ok', 'glow-error');
    
    // 2. Trigger a browser reflow. 
    // Reading the offsetWidth forces the browser to calculate the layout immediately,
    // which "resets" the animation state.
    void gameBox.offsetWidth; 

    // 3. Add the new class back
    if (kind === 'ok') {
        gameBox.classList.add('glow-ok');
    } else if (kind === 'error') {
        gameBox.classList.add('glow-error');
    }
}

function announce(name, detail = {}) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
}

const canvas = searchID('canvas');
const context = canvas.getContext('2d');

const landscape = new Image();
landscape.src = 'images/landscape.png';

const track = new Image();
track.src = 'images/track.png';

let imagesLoaded = 0;

function onImageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === 2) {
        drawRace();   
    }
}
landscape.onload = onImageLoaded;
track.onload = onImageLoaded;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 1. Top bound: Just below the new top question box
    const gameBox = document.querySelector('.game');
    const gameBottom = gameBox ? gameBox.getBoundingClientRect().bottom : canvas.height * 0.15;
    marbleMinY = gameBottom + (canvas.height * 0.05); 

    // 2. Bottom bound: Keep the original bottom limit (90% of screen height)
    marbleMaxY = canvas.height * 0.9; 

    // If it's the very first load, set the starting position
    if (marbleY === 0) {
        // Start near the bottom, exactly like before
        marbleY = marbleMaxY - (canvas.height * 0.05);
    } else {
        // If resizing, keep the marble within the new bounds
        marbleY = Math.max(marbleMinY, Math.min(marbleY, marbleMaxY));
    }

    drawRace();
}

function drawRace() {
    if (imagesLoaded < 2) return;

    const cw = canvas.width;
    const ch = canvas.height;
    context.clearRect(0, 0, cw, ch);

    const scale = Math.min(1, cw / (landscape.width * 2 + track.width)) * ZOOM;
    const trackW = track.width * scale;
    const trackH = track.height * scale;
    const landW = landscape.width * scale;
    const landH = landscape.height * scale;
    const trackX = (cw - trackW) / 2;

    // Background Tiling
    const trackStartY = ((ch - trackH) / 2 + scrollY % trackH) % trackH - trackH;
    const trackCopies = Math.ceil(ch / trackH) + 2;
    for (let i = 0; i < trackCopies; i++) {
        context.drawImage(track, trackX, trackStartY + i * trackH, trackW, trackH);
    }

    const landStartY = ((ch - landH) / 2 + scrollY % landH) % landH - landH;
    const landCopies = Math.ceil(ch / landH) + 2;
    for (let i = 0; i < landCopies; i++) {
        const y = landStartY + i * landH;
        context.drawImage(landscape, trackX - landW, y, landW, landH);
        context.drawImage(landscape, trackX + trackW, y, landW, landH);
    }

    // Finish line (locked to distance)
    drawFinishLine(trackX, trackW, marbleY, PIXELS_PER_METER * scale);
    
    // Draw the marble at its absolute Y position
    drawMarble(cw / 2, marbleY, Math.max(10, trackW * 0.12));
}

function drawFinishLine(trackX, trackW, marbleY, pixelsPerMeter) {
    const metersLeft = TRACK_METERS - distance;
    const y = marbleY - metersLeft * pixelsPerMeter;
    const square = trackW / 8;

    if (y < -square * 2 || y > canvas.height) {
        return;   
    }

    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 8; col++) {
            context.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#14213d';
            context.fillRect(trackX + col * square, y - square * (row + 1), square, square);
        }
    }
}

function drawMarble(x, y, radius) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = '#fca311';
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = '#14213d';
    context.stroke();
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ---- Race ----
function currentSpeed(now) {
    return effect && now < effect.endsAt ? effect.speed : BASE_SPEED;
}

function applyEffect(speed) {
    effect = { speed, endsAt: performance.now() + EFFECT_MS };
}

function render(speed) {
    searchID('hud').textContent = distance.toFixed(1) + ' / ' + TRACK_METERS + ' m  |  ' + speed + ' m/s';
    drawRace();   
}

function frame(now) {
    if (!racing) return;
    if (lastTime === null) lastTime = now;
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    const speed = currentSpeed(now);
    
    // 1. Advance the race distance
    distance = Math.min(distance + speed * dt, TRACK_METERS);

    // 2. Background scroll: Always moves at a constant rate
    scrollY += BG_SCROLL_SPEED * dt;

    // 3. Marble movement: Only moves when an effect is active
    if (effect && now < effect.endsAt) {
        // Calculate how much faster/slower we are going compared to normal
        const speedDiff = speed - BASE_SPEED;
        // Move marble up (negative) on boost, down (positive) on slow
        marbleY -= speedDiff * dt * PIXELS_PER_METER * 0.5;
        
        // Clamp marble so it never leaves the screen or goes under the UI
        marbleY = Math.max(marbleMinY, Math.min(marbleY, marbleMaxY));
    }

    render(speed);
    if (distance >= TRACK_METERS) { finishRace(); return; }
    requestAnimationFrame(frame);
}

function startRace() {
    distance = 0;
    scrollY = 0;
    effect = null;
    lastTime = null;
    racing = true;
    
    // Spawn marble just above the question box
    marbleY = marbleMaxY - (canvas.height * 0.05);

    searchID('answer').disabled = false;
    //searchID('answer-form').querySelector('button').disabled = false;
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
    //searchID('answer-form').querySelector('button').disabled = true;
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

if (REQUIRE_LOGIN) {
    await requireLogin();
}
startRace();