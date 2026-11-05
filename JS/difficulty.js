const form = document.getElementById('level-form');

form.addEventListener('submit', (event) => {
    event.preventDefault();

    console.log("a");

    const difficulty = document.querySelector(
        'input[name="difficulty"]:checked'
    ).value;

    const operationInput = document.querySelectorAll(
        'input[name="operation"]:checked'
    );

    const operations = Array.from(operationInput).map(cb => cb.value);

    localStorage.setItem('difficulty', difficulty);
    localStorage.setItem('operation', JSON.stringify(operations));

    window.location.href = 'start-screen.HTML';
});

const savedDifficulty = localStorage.getItem('difficulty') || 'easy';
const savedOperation = JSON.parse(localStorage.getItem('operation')) || Array('addition');

document.querySelector(
  `input[name="difficulty"][value="${savedDifficulty}"]`
).checked = true;

document.querySelector(
  `input[name="operation"][value="${savedOperation}"]`
).checked = true;

