import { Question } from './Question.js';

export class AdditionQuestion extends Question {
    constructor(num1, num2) {
        super(num1, '+', num2, num1 + num2);
    }
}