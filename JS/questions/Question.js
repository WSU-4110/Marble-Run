// Product: the object the game consumes. game.js only relies on these four
// fields, so this is the entire contract between question generation and the race.
export class Question {
    constructor(num1, symbol, num2, answer) {
        this.num1 = num1;
        this.symbol = symbol;
        this.num2 = num2;
        this.answer = answer;
    }
}