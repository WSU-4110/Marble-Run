import { db } from './supabase.js';

// The page everyone lands on after login. Change the file name here if you rename it.
export const START_PAGE = 'Start_Screen.html';

export async function getProfile() {
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

// Call at the top of game.js. Sends logged-out visitors back to the login page.
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
    await db.auth.signOut();
    window.location.replace('index.html');
}