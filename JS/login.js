import { db, isConfigured } from './supabase.js';
import { getProfile, START_PAGE } from './auth.js';
//healper function to get an element by id
const searchId = (id) => document.getElementById(id);
let mode = 'SI'; // 'SI' = log in, 'SU' = create account

function say(text, kind = '') {
    searchId('msg').textContent = text;
    searchId('msg').className = 'msg ' + kind;
}

function setMode(next) {
    mode = next;
    searchId('tab-in').setAttribute('aria-selected', next === 'SI');
    searchId('tab-up').setAttribute('aria-selected', next === 'SU');
    searchId('signup-fields').classList.toggle('hidden', next === 'SI');
    searchId('submit').textContent = next === 'SI' ? 'Log in' : 'Create account';
    //chnages the text of the submit button based on the mode
    say('');
}

// Send the user to the game page
async function goHome() {
    const profile = await getProfile();
    if (profile) window.location.replace(START_PAGE);
    else say('Could not load your profile.', 'error');
}

searchId('tab-in').addEventListener('click', () => setMode('SI'));
searchId('tab-up').addEventListener('click', () => setMode('SU'));

// Runs when the form is submitted
searchId('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = searchId('email').value.trim();
    const password = searchId('password').value;
    if (!email || password.length < 6) {
        return say('Enter an email and a password of at least 6 characters.', 'error');
    }

    searchId('submit').disabled = true;
    try {
        if (mode === 'SI') {

            const { error } = await db.auth.signInWithPassword({ email, password });
            if (error) throw error;
            await goHome();
        } else {

            const display_name = searchId('name').value.trim();
            if (!display_name) throw new Error('Pick a player name.');
            // Create a new user and store the display name in the user metadata
            const { data, error } = await db.auth.signUp({
                email,
                password,
                options: { data: { display_name } },
            });
            if (error) throw error;

            if (data.session) {
                await goHome();
            } else {
                // user must click email link before trying to login
                setMode('SI');
                say('Account created. Check your email to confirm it, then log in.', 'ok');
            }
        }
    } catch (err) {
        say(err.message, 'error');
    } finally {
        searchId('submit').disabled = false;
    }
});

//checks for existing session and redirects to the starting page if the user is already logged in
if (isConfigured) {
    getProfile().then((profile) => {
        if (profile) window.location.replace(START_PAGE);
    });
}