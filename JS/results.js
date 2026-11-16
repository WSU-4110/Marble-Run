import { requireLogin } from './auth.js';
const REQUIRE_LOGIN = true;

// Show correct answers

const resultCorrect = document.getElementById('correct');

const correctAnswers = localStorage.getItem("correctAnswers") || "?";

resultCorrect.textContent = "Correct answers: "+ correctAnswers;

// Show wrong answers

const resultWrong = document.getElementById('wrong');

const wrongAnswers = localStorage.getItem("wrongAnswers") || "?";

resultWrong.textContent = "Wrong answers: "+ wrongAnswers;

// Show place

const resultPlace = document.getElementById('place');

const place = localStorage.getItem("resultsPlace") || "1";

resultPlace.textContent = "Placed in: "+ place;

// Show coins earned

const resultCoins = document.getElementById('coins');

const coins = localStorage.getItem("coinsEarned") || "0";

resultCoins.textContent = "Coins earned: "+ coins;

// Let player restart race

const restartButton = document.getElementById('restart-btn');
restartButton.addEventListener('click', () => {
    window.location.href = "racing-screen.html";
});

const coinCount = document.getElementById("coin-count");

// ---- Player info ----
if (REQUIRE_LOGIN) {
    const profile = await requireLogin(); // sends logged-out visitors to the login page
    if (profile) {
        coinCount.textContent = profile.coins ?? 0;
    }
}