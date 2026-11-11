class LevelStorage {
    save(difficulty, operations) {
        localStorage.setItem('difficulty', difficulty);
        localStorage.setItem('operation', JSON.stringify(operations));
    }

    load() {
        return {
            difficulty: localStorage.getItem('difficulty') || 'easy',
            operations: JSON.parse(localStorage.getItem('operation')) || ['addition']
        };
    }
}
class LevelSelection {
    getSelections() {
        const difficulty = document.querySelector(
            'input[name="difficulty"]:checked'
        ).value;

        const operationInput = document.querySelectorAll(
            'input[name="operation"]:checked'
        );

        const operations = Array.from(operationInput).map(
            cb => cb.value
        );

        return { difficulty, operations };
    }

    restoreSelections(difficulty, operations) {
        document.querySelector(
            `input[name="difficulty"][value="${difficulty}"]`
        ).checked = true;

        document.querySelectorAll(
            'input[name="operation"]'
        ).forEach((checkbox) => {
            checkbox.checked = operations.includes(checkbox.value);
        });
    }
}
class LevelSettingsFacade {
    constructor() {
        this.storage = new LevelStorage();
        this.selection = new LevelSelection();
    }

    saveSettings() {
        const { difficulty, operations } = this.selection.getSelections();

        this.storage.save(difficulty, operations);

        console.log("Saved difficulty as " + difficulty);
        console.log("Saved operations as " + operations);
    }

    loadSettings() {
        const { difficulty, operations } = this.storage.load();

        this.selection.restoreSelections(difficulty, operations);
    }
}
const levelSettings = new LevelSettingsFacade();

const form = document.getElementById('level-form');

form.addEventListener('submit', (event) => {
    event.preventDefault();

    levelSettings.saveSettings();

    window.location.href = 'start-screen.HTML';
});

levelSettings.loadSettings();