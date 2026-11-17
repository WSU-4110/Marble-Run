
import { db } from './supabase.js';
import { requireLogin, isGuest } from './auth.js';

// Stores all the player's completed races.
let raceResults = [];

const PAGE_SIZE = 10;

let currentPage = 1;
let totalPages = 1;

// Calculate the score for one race.
function calculateScore(race) {
    const total = race.correct + race.wrong + race.timeouts;

    if (total === 0) return 0;

    return Math.round((race.correct / total) * 100);
}

// Update the three summary cards.
function showSummary() {
    const totalRaces = raceResults.length;

    document.getElementById('total-races').textContent = totalRaces;

    if (totalRaces === 0) {
        document.getElementById('average-score').textContent = '--%';
        document.getElementById('latest-score').textContent = '--%';
        return;
    }

    const scores = raceResults.map(calculateScore);

    const average = Math.round(
        scores.reduce((sum, score) => sum + score, 0) / totalRaces
    );

    document.getElementById('average-score').textContent = `${average}%`;
    document.getElementById('latest-score').textContent = `${scores[0]}%`;
}



function showRaceHistory() {
    const history = document.getElementById('race-history');

    // Clear the table before displaying the current page.
    history.innerHTML = '';

    if (raceResults.length === 0) {
        const row = history.insertRow();
        const cell = row.insertCell();

        cell.colSpan = 5;
        cell.textContent = 'No race history yet.';

    } else {
        // Find where the current page starts.
        const start = (currentPage - 1) * PAGE_SIZE;

        // Get only the races for this page.
        const racesOnPage = raceResults.slice(
            start,
            start + PAGE_SIZE
        );

        racesOnPage.forEach((race) => {
            const row = history.insertRow();

            const date = new Date(
                race.finished_at
            ).toLocaleDateString();

            const values = [
                date,
                `${calculateScore(race)}%`,
                race.correct,
                race.wrong,
                race.timeouts
            ];

            values.forEach((value) => {
                const cell = row.insertCell();
                cell.textContent = value;
            });
        });
    }

    // Update pagination controls.
    document.getElementById('page-info').textContent =
        `Page ${currentPage} of ${totalPages}`;

    document.getElementById('prev-page').disabled =
        currentPage === 1;

    document.getElementById('next-page').disabled =
        currentPage === totalPages;
}



let scoreChart = null;

function showProgressGraph() {
    const canvas = document.getElementById('score-chart');
    const message = document.getElementById('chart-message');

    // Display a message if the player has no saved races.
    if (raceResults.length === 0) {
        canvas.hidden = true;
        message.hidden = false;
        return;
    }

    canvas.hidden = false;
    message.hidden = true;

    // Supabase returns newest races first.
    // Reverse a copy so the graph goes oldest to newest.
    const races = [...raceResults].reverse();

    const labels = races.map((race, index) => `Race ${index + 1}`);
    const scores = races.map(calculateScore);

    // Remove the previous chart before creating a new one.
    if (scoreChart) {
        scoreChart.destroy();
    }

    scoreChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Score (%)',
                data: scores,
                borderColor: '#fca311',
                backgroundColor: 'rgba(252, 163, 17, 0.15)',
                borderWidth: 3,
                tension: 0.3,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Score (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Race Number'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}



// Retrieve the player's races from Supabase.
async function loadProgress() {
    try {
        const profile = await requireLogin();

        if (!profile) return;

        // Guest players don't have saved race history.
        if (isGuest()) {
            showSummary();
            showRaceHistory();
            showProgressGraph();


            return;
        }

        const { data, error } = await db
            .from('race_results')
            .select('id, finished_at, correct, wrong, timeouts')
            .eq('user_id', profile.id)
            .order('finished_at', { ascending: false });

        if (error) throw error;

        raceResults = data || [];

        currentPage = 1;
        totalPages = Math.max(
            1,
            Math.ceil(raceResults.length / PAGE_SIZE)
        );

        showSummary();
        showRaceHistory();
        showProgressGraph();



        console.log('Race history loaded:', raceResults);

    } catch (error) {
        console.error('Could not load progress:', error);
        document.getElementById('average-score').textContent = 'Error';
        document.getElementById('latest-score').textContent = 'Error';
        document.getElementById('total-races').textContent = '--';
    }
}

const progressTab = document.getElementById('progress-tab');
const historyTab = document.getElementById('history-tab');

const progressSection = document.getElementById('progress-section');
const historySection = document.getElementById('history-section');

// Show Score Progress when its tab is clicked
progressTab.addEventListener('click', () => {
    progressSection.hidden = false;
    historySection.hidden = true;

    progressTab.classList.add('active');
    historyTab.classList.remove('active');
});

// Show Race History when its tab is clicked
historyTab.addEventListener('click', () => {
    progressSection.hidden = true;
    historySection.hidden = false;

    historyTab.classList.add('active');
    progressTab.classList.remove('active');
});

document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        showRaceHistory();
    }
});

document.getElementById('next-page').addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        showRaceHistory();
    }
});

loadProgress();
