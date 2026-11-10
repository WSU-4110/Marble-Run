import { QuestionFactory } from './QuestionFactory.js';
import { SubtractionQuestion } from './SubtractionQuestion.js';

export class SubtractionFactory extends QuestionFactory {
    createQuestion(difficulty) {
        const range = this.makeRange(difficulty);
        return new SubtractionQuestion(range.nextPrimary(), range.nextPrimary());
    }
}