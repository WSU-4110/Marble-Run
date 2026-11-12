import { db } from './supabase.js';

export const START_PAGE = 'start-screen.html';

const GUEST_KEY = 'mmr-guest';

const GUEST_PROFILE = {
    id: 'guest',
    display_name: 'Guest',
    coins: 0,
    equipped_marble: 'classic-orange',
    equipped_landscape: 'grassland',
    unlocked_items: ['classic-orange', 'grassland'],
};

export function startGuestSession() {
    sessionStorage.setItem(GUEST_KEY, 'true');
}

// True if the current player is a guest
export function isGuest() {
    return sessionStorage.getItem(GUEST_KEY) === 'true';
}

export async function getProfile() {
    if (isGuest()) return { ...GUEST_PROFILE };   // guests never touch the database

    const { data: { session } } = await db.auth.getSession();//get current session from supabase auth
    if (!session) return null;
    // Get the profile row for the current user. The profile row has the same id as the user.
    const { data, error } = await db
        .from('profiles')
        .select('id, display_name, coins, equipped_marble, equipped_landscape, unlocked_items')//selected columns

        .eq('id', session.user.id)//look for the profile with the same id as the current session user
        .single();//resturn a single row instead of an array

    //if there is an error, log it and return null
    if (error) { console.error('Could not load profile:', error.message); return null; }

    return data;
}

export async function requireLogin() {
    const profile = await getProfile();
    if (!profile) {
        //window is a js object given by the browser
        window.location.replace('index.html');
        return null;
    }
    return profile;
}
//logout the current user and send them back to the login page
export async function logout() {
    if (isGuest()) {
        sessionStorage.removeItem(GUEST_KEY);   // guests have no Supabase session to end
    } else {
        await db.auth.signOut();
    }
    window.location.replace('index.html');
}