import { NumberRange } from './NumberRange.js';

// Abstract Creator.
// Subclasses implement createQuestion(difficulty); this base supplies the
// shared difficulty -> NumberRange mapping so it lives in exactly one place.
export class QuestionFactory {
    // Returns a NumberRange for the given difficulty. Unknown values fall back to 'easy',
    // matching the original behavior and the "No Difficulty Setting Saved" alt flow.
    makeRange(difficulty) {
        switch (difficulty) {
            case 'medium':
                return new NumberRange({ min: 0, max: 100, min2: 0, max2: 10 });
            case 'hard':
                return new NumberRange({ min: -100, max: 100, min2: -10, max2: 10 });
            case 'easy':
            default:
                return new NumberRange({ min: 0, max: 10, min2: 0, max2: 10 });
        }
    }

    // Factory Method — subclasses must override.
    createQuestion(difficulty) {
        throw new Error('createQuestion(difficulty) must be implemented by a subclass');
    }
}