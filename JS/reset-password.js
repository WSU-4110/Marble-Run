import { db } from './supabase.js';

const LOGIN_PAGE = 'index.html';
if (!window.location.hash.includes('type=recovery')) {
    window.location.replace(LOGIN_PAGE);
}

const msg = document.getElementById('reset-msg');

document.getElementById('reset-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('new-password').value;
    const confirm = document.getElementById('confirm-password').value;

    if (password.length < 6) {
        msg.textContent = 'Password must be at least 6 characters.';
        return;
    }
    if (password !== confirm) {
        msg.textContent = 'Passwords do not match.';
        return;
    }

    const { error } = await db.auth.updateUser({ password });
    if (error) {
        msg.textContent = 'Error: ' + error.message;
        return;
    }

    await db.auth.signOut();
    msg.textContent = 'Password changed! Please log in with your new password.';
    setTimeout(() => { window.location.href = LOGIN_PAGE; }, 1500);
});