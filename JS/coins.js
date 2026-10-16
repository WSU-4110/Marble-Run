// when they cross the finish line. Listens to the events game.js announces
import { db } from './supabase.js';
console.log('coins.js loaded');

const COINS_PER_CORRECT = 1;   
const FINISH_BONUS = 5; 

let coinsThisRace = 0;

document.addEventListener('question:answered', (e) => {
    if (e.detail.correct) {
        coinsThisRace += COINS_PER_CORRECT;
    }
});

document.addEventListener('race:restart', () => {
    coinsThisRace = 0;
});

// save to the database
document.addEventListener('race:finished', async () => {
    const earned = coinsThisRace + FINISH_BONUS;

    // Calls the add_coins function in Supabase (see add_coins.sql)
    const { data: newTotal, error } = await db.rpc('add_coins', { earned });

    if (error) {
        console.error('Could not save coins:', error.message);
        return;
    }

    document.dispatchEvent(new CustomEvent('coins:saved', { detail: { earned, total: newTotal } }));
});