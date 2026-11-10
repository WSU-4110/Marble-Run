import { QuestionFactory } from './QuestionFactory.js';
import { DivisionQuestion } from './DivisionQuestion.js';

// Enforces SpReq:WC-1 (no decimal answers) by construction:
// it only returns pairs where num1 is an exact multiple of num2.
export class DivisionFactory extends QuestionFactory {
    createQuestion(difficulty) {
        const range = this.makeRange(difficulty);
        let num1, num2;
        do {
            num1 = range.nextPositivePrimary();
            num2 = range.nextPositiveSecondary();
        } while (num2 === 0 || num1 % num2 !== 0);
        return new DivisionQuestion(num1, num2);
    }
}