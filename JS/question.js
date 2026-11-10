import { AdditionFactory } from './questions/AdditionFactory.js';
import { SubtractionFactory } from './questions/SubtractionFactory.js';
import { MultiplicationFactory } from './questions/MultiplicationFactory.js';
import { DivisionFactory } from './questions/DivisionFactory.js';

// Registry keeps the client free of branching. Adding a new operation means
// adding one class pair and one line here — nothing else changes.
const FACTORIES = {
    addition: new AdditionFactory(),
    subtraction: new SubtractionFactory(),
    multiplication: new MultiplicationFactory(),
    division: new DivisionFactory(),
};

// Public API is unchanged, so game.js does not need to be edited.
export function generateQuestion() {
    const operation = localStorage.getItem('operation') || 'addition';
    const difficulty = localStorage.getItem('difficulty') || 'easy';

    // Unknown operation falls back to addition, matching the "No Operand Setting Saved" alt flow.
    const factory = FACTORIES[operation] ?? FACTORIES.addition;
    return factory.createQuestion(difficulty);
}