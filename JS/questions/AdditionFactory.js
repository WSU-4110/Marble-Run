import { QuestionFactory } from './QuestionFactory.js';
import { AdditionQuestion } from './AdditionQuestion.js';

export class AdditionFactory extends QuestionFactory {
    createQuestion(difficulty) {
        const range = this.makeRange(difficulty);
        return new AdditionQuestion(range.nextPrimary(), range.nextPrimary());
    }
}