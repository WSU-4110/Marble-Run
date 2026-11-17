
import { db } from './supabase.js';
import { requireLogin } from './auth.js';

const PAGE_SIZE = 10;

let currentPage = 1;
let totalPages = 1;
let raceResults = [];

// Calculate the accuracy for a completed race.
function calculateScore(race) {
    const total = race.correct + race.wrong + race.timeouts;

    return total > 0
        ? Math.round((race.correct / total) * 100)
        : 0;
}

// Display the summary cards.
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

// Show up to 10 races for the selected page.
function showRaceHistory() {
    const history = document.getElementById('race-history');
    history.innerHTML = '';

    if (raceResults.length === 0) {
        const row = history.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 5;
        cell.textContent = 'No race history yet.';
    } else {
        const start = (currentPage - 1) * PAGE_SIZE;
        const racesOnPage = raceResults.slice(start, start + PAGE_SIZE);

        racesOnPage.forEach((race) => {
            const row = history.insertRow();

            const date = new Date(race.finished_at).toLocaleDateString();

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

    document.getElementById('page-info').textContent =
        `Page ${currentPage} of ${totalPages}`;

    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;
}

// Load the current player's results from Supabase.
async function loadProgress() {
    const profile = await requireLogin();
    if (!profile) return;

    const { data, error } = await db
        .from('race_results')
        .select('id, finished_at, correct, wrong, timeouts')
        .eq('user_id', profile.id)
        .order('finished_at', { ascending: false });

    if (error) {
        console.error('Could not load race results:', error.message);
        document.getElementById('race-history').innerHTML =
            '<tr><td colspan="5">Could not load race history.</td></tr>';
        return;
    }

    raceResults = data || [];
    totalPages = Math.max(1, Math.ceil(raceResults.length / PAGE_SIZE));

    showSummary();
    showRaceHistory();
    showProgressGraph();
}

// Pagination buttons
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


const progressTab = document.getElementById('progress-tab');
const historyTab = document.getElementById('history-tab');

const progressSection = document.getElementById('progress-section');
const historySection = document.getElementById('history-section');

// Show the graph when Score Progress is selected
progressTab.addEventListener('click', () => {
    progressSection.hidden = false;
    historySection.hidden = true;

    progressTab.classList.add('active');
    historyTab.classList.remove('active');
});

// Show the table when Race History is selected
historyTab.addEventListener('click', () => {
    progressSection.hidden = true;
    historySection.hidden = false;

    historyTab.classList.add('active');
    progressTab.classList.remove('active');
});



let scoreChart = null;

function showProgressGraph() {
    const canvas = document.getElementById('score-chart');
    const message = document.getElementById('chart-message');

    if (raceResults.length === 0) {
        canvas.hidden = true;
        message.hidden = false;
        return;
    }

    canvas.hidden = false;
    message.hidden = true;

    // Supabase results are newest first, so reverse for the graph.
    const races = [...raceResults].reverse();

    const labels = races.map((race, index) => `Race ${index + 1}`);
    const scores = races.map(calculateScore);

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


loadProgress();
