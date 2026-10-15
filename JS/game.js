import { requireLogin } from './auth.js';
import { generateQuestion } from './questions.js';

const REQUIRE_LOGIN = true; // set to false to test this page without Supabase
const QUESTION_SECONDS = 3;    
const TRACK_METERS = 100;      
const BASE_SPEED = 3;           
const BOOST_SPEED = 5;         
const SLOW_SPEED = 1;           
const EFFECT_MS = 1000;   // how long a boost or slowdown lasts

const PIXELS_PER_METER = 60;    // how far the background scrolls for each meter the marble moves
const MARBLE_Y = 0.35;          // marble's height on screen (0 = top, 1 = bottom) this will 
//probably chnaged when we implement bots 
const ZOOM = 0.5; // how close the camera is, smaller = farther away

const searchID = (id) => document.getElementById(id);

let current = null;   // the question on screen: { text, answer }
let timerId = null;
let endTime = 0;

let distance = 0;  //meters covered
let effect = null; //{ speed, endsAt } while a boost or slowdown is active
let lastTime = null;
let racing = false;

function say(text, kind = '') {
    searchID('feedback').textContent = text;
    searchID('feedback').className = 'feedback ' + kind;
}

function announce(name, detail = {}) {//currently not used,
//  but could be useful for a future multiplayer version and for other funcitonalities 
    document.dispatchEvent(new CustomEvent(name, { detail }));
}

//track, landscape, finish line, marble
const canvas = searchID('canvas');//canvas has default width and height of 300x150
const context = canvas.getContext('2d');//get the 2d rendering context for the canvas,
//  which is used to draw graphics on the canvas element.

const landscape = new Image();
landscape.src = 'images/landscape.png';

const track = new Image();
track.src = 'images/track.png';

let imagesLoaded = 0;//used for tracking the # of images that have finished loading.

function onImageLoaded() {//called once by each image's onload event
    imagesLoaded++;
    if (imagesLoaded === 2) {
        drawRace();   // first picture as soon as both images are ready
    }
}
landscape.onload = onImageLoaded;
track.onload = onImageLoaded;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawRace();
}

function drawRace() {
    if (imagesLoaded < 2) {
        return;
    }

    const cw = canvas.width;
    const ch = canvas.height;
    context.clearRect(0, 0, cw, ch);

    // Scale everything down if the screen is too narrow for landscape + track + landscape
    const scale = Math.min(1, cw / (landscape.width * 2 + track.width)) * ZOOM;
    const trackW = track.width * scale;
    const trackH = track.height * scale;
    const landW = landscape.width * scale;
    const landH = landscape.height * scale;
    const trackX = (cw - trackW) / 2;

    // The background position comes from the marble's distance, not from time
    // (zoomed out = everything smaller, so it also scrolls fewer pixels per meter)
    const pixelsPerMeter = PIXELS_PER_METER * scale;
    const scrollY = distance * pixelsPerMeter;

    // Track: centered, tiled vertically, scrolling
    const trackStartY = ((ch - trackH) / 2 + scrollY % trackH) % trackH - trackH;
    const trackCopies = Math.ceil(ch / trackH) + 2;
    for (let i = 0; i < trackCopies; i++) {
        context.drawImage(track, trackX, trackStartY + i * trackH, trackW, trackH);
    }

    // Landscape: left and right of the track
    const landStartY = ((ch - landH) / 2 + scrollY % landH) % landH - landH;
    const landCopies = Math.ceil(ch / landH) + 2;
    for (let i = 0; i < landCopies; i++) {
        const y = landStartY + i * landH;
        context.drawImage(landscape, trackX - landW, y, landW, landH);
        context.drawImage(landscape, trackX + trackW, y, landW, landH);
    }

    const marbleY = ch * MARBLE_Y;
    drawFinishLine(trackX, trackW, marbleY, pixelsPerMeter);
    drawMarble(cw / 2, marbleY, Math.max(10, trackW * 0.12));
}

// Checkered line across the track. It starts off-screen above the marble
// and scrolls down until it reaches the marble at the end of the race.
function drawFinishLine(trackX, trackW, marbleY, pixelsPerMeter) {
    const metersLeft = TRACK_METERS - distance;
    const y = marbleY - metersLeft * pixelsPerMeter;
    const square = trackW / 8;

    if (y < -square * 2 || y > canvas.height) {
        return;   // not on screen yet
    }

    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 8; col++) {
            context.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#14213d';
            context.fillRect(trackX + col * square, y - square * (row + 1), square, square);
        }
    }
}

// Placeholder marble until the real marble art is ready
function drawMarble(x, y, radius) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = '#fca311';
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = '#14213d';
    context.stroke();
}
//called once 
resizeCanvas();
//resize the canvas when the window event resize is triggered
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
    drawRace();   // move the background, finish line, and marble
}

function frame(now) {//main loop, called by requestAnimationFrame around 60 times per second
    if (!racing) return;
    if (lastTime === null) lastTime = now;//runs once,now is in ms

    // seconds since the last frame, capped so a hidden tab can't cause a huge jump

    const dt = Math.min((now - lastTime) / 1000, 0.1);//0.1 is capped to avoid a huge jump in
    //  distance if the tab is hidden or the frame rate drops

    lastTime = now;

    const speed = currentSpeed(now);
    distance = Math.min(distance + speed * dt, TRACK_METERS);
    render(speed);

    if (distance >= TRACK_METERS) {
        finishRace();
        return;
    }
    requestAnimationFrame(frame);
}

function startRace() {// called once at the start and again when the player clicks "Restart"
    distance = 0;
    effect = null;
    lastTime = null;
    racing = true;
    searchID('answer').disabled = false;
    searchID('answer-form').querySelector('button').disabled = false;
    searchID('popup').hidden = true;
    say('');
    render(BASE_SPEED);
    newQuestion();
    startTimer();
    requestAnimationFrame(frame);
}

function finishRace() {
    racing = false;
    stopTimer();
    searchID('answer').disabled = true;
    searchID('answer-form').querySelector('button').disabled = true;
    say('You crossed the finish line!', 'ok');
    searchID('popup').hidden = false;
    searchID('restart').focus();
    announce('race:finished', { meters: distance });
}

searchID('restart').addEventListener('click', () => {
    announce('race:restart');
    startRace();
});

// The questions come from questions.js; this just shows the next one
function newQuestion() {
    current = generateQuestion();
    searchID('question').textContent = current.text;
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

// Time ran out: slow the marble, keep the same question, restart the timer
function onTimeUp() {
    stopTimer();
    if (!racing) return;
    applyEffect(SLOW_SPEED);
    say("Time's up! Same question, try again.", 'error');
    searchID('answer').value = '';
    searchID('answer').focus();
    announce('timer:expired');
    startTimer();
}


searchID('answer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!racing) return;
    const raw = searchID('answer').value.trim();

    // Invalid input: show a message and keep the timer running
    if (!/^-?\d+$/.test(raw)) {
        say('Enter a whole number.', 'error');
        searchID('answer').focus();
        return;
    }

    if (Number(raw) === current.answer) {
        stopTimer();
        applyEffect(BOOST_SPEED);
        say('Correct! Boost!', 'ok');
        announce('question:answered', { correct: true });
        newQuestion();
        startTimer();
    } else {
        // Wrong: slow the marble, clear the box, retry with the time that is left
        applyEffect(SLOW_SPEED);
        say('Not quite. Try again!', 'error');
        announce('question:answered', { correct: false });
        searchID('answer').value = '';
        searchID('answer').focus();
    }
});


if (REQUIRE_LOGIN) {
    await requireLogin();
}
startRace();