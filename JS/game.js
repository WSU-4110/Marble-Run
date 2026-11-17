import { requireLogin, isGuest } from './auth.js';
import { db } from './supabase.js';import { generateQuestion } from './question.js';
import { initRace3D, setRaceState, resetRace3D, setBotStates } from './race3d.js';
import { QuestionTimer } from './questionTimer.js';
import { BotFactory } from './bot.js';
import { getEquippedImages } from './equipped.js';
import { startMusic, stopMusic } from './music.js';
import './sounds.js';

const REQUIRE_LOGIN = true; 
const QUESTION_SECONDS = 10;    
const TRACK_METERS = 100;      
const BASE_SPEED = 3;           
const BOOST_SPEED = 5;         
const SLOW_SPEED = 1;           
const EFFECT_MS = 1000;

//speed boost
const FIRE_BOOST_SPEED = 7;
const FIRE_BOOST_DURATION = 3000;
const FIRE_BOOST_COOLDOWN = 8000;

const searchID = (id) => document.getElementById(id);

let current = null;   // the question on screen: { num1, symbol, num2, answer }

let distance = 0;
let effect = null;               
let lastTime = null;
let racing = false;
let bots = [];

// Some stats that will be tracked
let correctAnswers = 0;
let wrongAnswers = 0;
let unansweredQuestions = 0;


let fireBoostUnlocked = false;
let fireBoostEndsAt = 0;
let fireBoostCooldownEndsAt = 0;
let speedBoostsOwned = 0;
let raceVersion = 0;


let totalTime = 0;
let endingPlace = 1;

let raceStartTime = 0;
let raceSavePromise = null;
let lastRaceResults = null;


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

function announce(name, detail = {}) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
}


function currentSpeed(now) {
    // Fire Boost takes priority over other speed effects
    if (now < fireBoostEndsAt) {
        return FIRE_BOOST_SPEED;
    }

    // Normal speed effects from answering questions
    return effect && now < effect.endsAt
        ? effect.speed
        : BASE_SPEED;
}


function applyEffect(speed) {
    effect = { speed, endsAt: performance.now() + EFFECT_MS };
}

function render(speed) {
    searchID('hud').textContent = distance.toFixed(1) + ' / ' + TRACK_METERS + ' m  |  ' + speed + ' m/s';
    setRaceState(distance, speed);
    setBotStates(bots.map((b) => b.toState()));

}

function frame(now) {
    if (!racing) return;

   
    if (fireBoostCooldownEndsAt > 0) {
        const fireButton = searchID('fire-boost');

        const remaining = Math.max(
            0,
            Math.ceil((fireBoostCooldownEndsAt - now) / 1000)
        );

        if (remaining > 0) {
            // Show seconds remaining
            fireButton.textContent = remaining;
        } else {
            // Cooldown finished
            fireBoostCooldownEndsAt = 0;
            fireButton.textContent = '🔥';

            // Only enable the button if boosts are available
            fireBoostUnlocked = speedBoostsOwned > 0;

            fireButton.disabled = !fireBoostUnlocked;
            fireButton.classList.toggle('ready', fireBoostUnlocked);
        }
    }

    if (lastTime === null) lastTime = now;
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    const speed = currentSpeed(now);
    distance = Math.min(distance + speed * dt, TRACK_METERS);

    for (const bot of bots) {
        bot.update(now, dt, TRACK_METERS);
    }

    render(speed);
    if (distance >= TRACK_METERS) { finishRace(); return; }
    requestAnimationFrame(frame);
}

function startRace() {

    raceVersion++;

    distance = 0;
    effect = null;
    lastTime = null;
    racing = true;

    totalTime = 0;
    raceStartTime = performance.now();
    endingPlace = 1;
    correctAnswers = 0;
    wrongAnswers = 0;
    unansweredQuestions = 0;
    bots = BotFactory.createBotsForLanes(3);

    // Unlock the Fire Boost if the player owns at least one
    fireBoostUnlocked = speedBoostsOwned > 0;

    fireBoostEndsAt = 0;
    fireBoostCooldownEndsAt = 0;

    const fireButton = searchID('fire-boost');

    fireButton.disabled = !fireBoostUnlocked;
    fireButton.classList.toggle('ready', fireBoostUnlocked);
    fireButton.textContent = '🔥';



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


async function saveRaceResults(results) {
    console.count('saveRaceResults called');
    // Guests do not have an account to save results to.
    if (isGuest()) return true;

    try {
        // Get the currently logged-in player.
        const { data: { session }, error: authError } =
            await db.auth.getSession();

        if (authError) throw authError;

        if (!session) {
            throw new Error('No active login session.');
        }

        // Get the operations selected by the player.
        const operations = JSON.parse(
            localStorage.getItem('operation') || '["addition"]'
        );

        // Save the completed race to Supabase.
        const { error } = await db.from('race_results').insert({
            user_id: session.user.id,
            finish_time: results.finishTime,
            correct: results.correct,
            wrong: results.wrong,
            timeouts: results.timeouts,
            operation: operations.join(', ')
        });

        if (error) throw error;

        console.log('Race results saved successfully!');
        return true;

    } catch (error) {
        console.error('Could not save race results:', error);
        return false;
    }
}


function finishRace() {
    racing = false;
    stopMusic();
    timer.stop();
    totalTime = Number(
    ((performance.now() - raceStartTime) / 1000).toFixed(2)
    );
    searchID('answer').disabled = true;
    say('');
    searchID('popup').hidden = false;
    searchID('restart').focus();
    localStorage.setItem("correctAnswers", correctAnswers);
    localStorage.setItem("wrongAnswers", wrongAnswers);

    localStorage.setItem("unansweredQuestions", unansweredQuestions);

    const totalQuestions = correctAnswers + wrongAnswers + unansweredQuestions;

    const score = totalQuestions > 0
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : 0;

    localStorage.setItem("raceScore", score);

    // !! This should be set to whatever place the player marble ends up in, but for now it will default to 1st. !!
    endingPlace = 1 + bots.filter(bot => bot.finished).length;

    localStorage.setItem("resultsPlace", endingPlace);
    
    lastRaceResults = {
        finishTime: totalTime,
        correct: correctAnswers,
        wrong: wrongAnswers,
        timeouts: unansweredQuestions
    };

    raceSavePromise = saveRaceResults(lastRaceResults);
    announce('race:finished', { meters: distance });
}

searchID('restart').addEventListener('click', () => {
    announce('race:restart');
    startRace();
});




searchID('fire-boost').addEventListener('click', async () => {
    if (!racing || !fireBoostUnlocked || speedBoostsOwned <= 0) return;

    const now = performance.now();
    const currentRaceVersion = raceVersion;

    // Prevent using the boost during cooldown
    if (now < fireBoostCooldownEndsAt) return;

    const fireButton = searchID('fire-boost');

    // Disable the button while processing
    fireButton.disabled = true;
    fireButton.classList.remove('ready');

    // Deduct one boost from Supabase
    const { data, error } = await db.rpc('use_speed_boost');

    if (error) {
        console.error('Could not use speed boost:', error.message);

        fireButton.disabled = false;
        fireButton.classList.add('ready');

        searchID('answer').focus();
        return;
    }

    // Update the player's remaining boosts
    speedBoostsOwned = data;
    fireBoostUnlocked = speedBoostsOwned > 0;

    // Don't activate if the race ended or restarted
    if (!racing || currentRaceVersion !== raceVersion) return;

    const boostTime = performance.now();

    // Activate Fire Boost for 3 seconds
    fireBoostEndsAt = boostTime + FIRE_BOOST_DURATION;

    // Start the cooldown
    fireBoostCooldownEndsAt = boostTime + FIRE_BOOST_COOLDOWN;

    // Display cooldown
    fireButton.textContent = Math.ceil(FIRE_BOOST_COOLDOWN / 1000);

    // Keep the answer box focused
    searchID('answer').focus();
});





searchID('results').addEventListener('click', async () => {
    const resultsButton = searchID('results');

    resultsButton.disabled = true;
    resultsButton.textContent = 'Saving...';

    let saved = raceSavePromise
        ? await raceSavePromise
        : false;

    // If the first save failed, try again.
    if (!saved && lastRaceResults) {
        raceSavePromise = saveRaceResults(lastRaceResults);
        saved = await raceSavePromise;
    }

    if (!saved) {
        alert('Could not save your race results. Please check your connection and try again.');

        resultsButton.disabled = false;
        resultsButton.textContent = 'Results';
        return;
    }

    window.location.href = 'performance-screen.HTML';
});



function newQuestion() {
    current = generateQuestion();
    searchID('q-num1').textContent = current.num1;
    searchID('q-symbol').textContent = current.symbol;
    searchID('q-num2').textContent = current.num2;
    searchID('answer').value = '';
    searchID('answer').focus();
    announce('question:shown', current);
}

function onTimeUp() {
    if (!racing) return;
    unansweredQuestions++;
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
        searchID('answer').value = '';
        searchID('answer').focus();
        return;
    }

    
    if (Number(raw) === current.answer) {
        timer.stop();
        applyEffect(BOOST_SPEED);
        say('', 'ok');
        correctAnswers++;

        announce('question:answered', { correct: true });
        newQuestion();
        timer.start();
    }

    else {
        applyEffect(SLOW_SPEED);
        say('', 'error');
        wrongAnswers++;
        announce('question:answered', { correct: false });
        searchID('answer').value = '';
        searchID('answer').focus();
    }
});

// Look up the player's equipped shop items first, so the 3D scene loads them directly
// instead of showing the default images and then swapping.
let equippedImages = {};
if (REQUIRE_LOGIN) {//start if logged in
    const profile = await requireLogin();
    if (!profile) throw new Error('Not logged in');   // requireLogin is already redirecting
    speedBoostsOwned = profile.speed_boosts ?? 0;
    equippedImages = await getEquippedImages(profile);
}

// race3d.js draws the track, marble, finish line and camera into the canvas.
// This file only tells it how far the marble has gone and how fast it's moving.
// Wait until every texture is loaded and the first frame is drawn before showing the page.
await initRace3D(searchID('canvas'), { trackMeters: TRACK_METERS, baseSpeed: BASE_SPEED, images: equippedImages });
document.body.classList.remove('loading');
startRace();//starts the race once everything is rendered