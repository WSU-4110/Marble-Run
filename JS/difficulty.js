const form = document.getElementById('level-form');

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const difficulty = document.querySelector(
        'input[name="difficulty"]:checked'
    ).value;

    const operation = document.querySelector(
        'input[name="operation"]:checked'
    ).value;

    localStorage.setItem('difficulty', difficulty);
    localStorage.setItem('operation', operation);

    window.location.href = 'start-screen.HTML';
});

const savedDifficulty = localStorage.getItem('difficulty') || 'easy';
const savedOperation = localStorage.getItem('operation') || 'addition';

document.querySelector(
  `input[name="difficulty"][value="${savedDifficulty}"]`
).checked = true;

document.querySelector(
  `input[name="operation"][value="${savedOperation}"]`
).checked = true;

