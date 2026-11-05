const form = document.getElementById('level-form');

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const difficulty = document.querySelector(
        'input[name="difficulty"]:checked'
    ).value;

    const operationInput = document.querySelectorAll(
        'input[name="operation"]:checked'
    );

    const operations = Array.from(operationInput).map(cb => cb.value);

    localStorage.setItem('difficulty', difficulty);
    localStorage.setItem('operation', JSON.stringify(operations));

    console.log("Saved difficulty as "+difficulty);
    console.log("Saved operations as "+operations);

    window.location.href = 'start-screen.HTML';
});

const savedDifficulty = localStorage.getItem('difficulty') || 'easy';
const savedOperation = JSON.parse(localStorage.getItem('operation')) || Array('addition');

document.querySelector(
  `input[name="difficulty"][value="${savedDifficulty}"]`
).checked = true;

savedOperation.forEach((item) => {
document.querySelector(
  `input[name="operation"][value="${item}"]`
).checked = true;
})

