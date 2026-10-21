import { db } from './supabase.js';

const forgotBtn = document.getElementById('forgot-btn');
const forgotForm = document.getElementById('forgot-form');
const forgotMsg = document.getElementById('forgot-msg');

// Show or hide the forgot form
forgotBtn.addEventListener('click', () => {
    forgotForm.classList.toggle('hidden');
});

document.getElementById('tab-in').addEventListener('click', () => {
    forgotBtn.classList.remove('hidden');
});
document.getElementById('tab-up').addEventListener('click', () => {
    forgotBtn.classList.add('hidden');
    forgotForm.classList.add('hidden');
});

forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();

    if (!email) {
        forgotMsg.textContent = 'Enter your email first.';
        return;
    }

    const { error } = await db.auth.resetPasswordForEmail(email, {
        // the page the email link opens
        redirectTo: new URL('reset-password.html', window.location.href).href
    });

    forgotMsg.textContent = error
        ? 'Error: ' + error.message
        : 'If that email has an account, a reset link is on its way.';
});