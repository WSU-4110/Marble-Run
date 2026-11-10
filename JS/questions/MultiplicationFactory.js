import { QuestionFactory } from './QuestionFactory.js';
import { MultiplicationQuestion } from './MultiplicationQuestion.js';

export class MultiplicationFactory extends QuestionFactory {
    createQuestion(difficulty) {
        const range = this.makeRange(difficulty);
        return new MultiplicationQuestion(range.nextPrimary(), range.nextSecondary());
    }
}