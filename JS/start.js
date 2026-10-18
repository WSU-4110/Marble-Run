import { requireLogin, logout } from './auth.js';

const REQUIRE_LOGIN = true;
const GAME_PAGE = 'racing-screen.html';

document.getElementById('start-btn').addEventListener('click', () => {
    window.location.href = GAME_PAGE;
});

document.getElementById('logout-btn').addEventListener('click', logout);

document.getElementById('settings-btn').addEventListener('click', () => {
    // TODO: open the settings menu
});

if (REQUIRE_LOGIN) {
    const profile = await requireLogin(); // sends logged-out visitors to the login page
    if (profile) {
        document.getElementById('greeting').textContent = `Welcome, ${profile.display_name}!`;
    }
}
