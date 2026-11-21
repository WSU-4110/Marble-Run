import { expect, test } from 'vitest'
import { generateQuestion } from './question.js'

// All tests are commented out except the current test which is being used.

/*
test('generates bounds of varying difficulties, making sure they pick the right maximum and minimum numbers', () => {
    localStorage.setItem('difficulty', 'easy');
    expect(generateQuestion.pickDifficulty()).toStrictEqual({"MAX":10,"MIN":0});

    localStorage.setItem('difficulty', 'medium');
    expect(generateQuestion.pickDifficulty()).toStrictEqual({"MAX":100,"MIN":0});

    localStorage.setItem('difficulty', 'hard');
    expect(generateQuestion.pickDifficulty()).toStrictEqual({"MAX":100,"MIN":-100});
})
    */

/*
test('Setting basic operands', () => {
    localStorage.setItem('difficulty', 'easy');
    for (let i = 0; i < 100; i++) {
    expect(generateQuestion.CreateQuestion.setOperands()).toBeLessThanOrEqual(10);
    expect(generateQuestion.CreateQuestion.setOperands()).toBeGreaterThanOrEqual(0);
    }
    localStorage.setItem('difficulty', 'medium');
    for (let i = 0; i < 100; i++) {
    expect(generateQuestion.CreateQuestion.setOperands()).toBeLessThanOrEqual(100);
    expect(generateQuestion.CreateQuestion.setOperands()).toBeGreaterThanOrEqual(0);
    }
    localStorage.setItem('difficulty', 'hard');
    for (let i = 0; i < 100; i++) {
    expect(generateQuestion.CreateQuestion.setOperands()).toBeLessThanOrEqual(100);
    expect(generateQuestion.CreateQuestion.setOperands()).toBeGreaterThanOrEqual(-100);
    }
})
    */

/*
test('Creating an addition answer', () => {

    const question = new generateQuestion.AdditionQuestion;
    question.manualSetOperands(1, 2);
    expect(question.setAnswer()).toStrictEqual(question.num1 + question.num2);

})
    */

/*
test('Setting subtraction operation symbol', () => {

    expect(generateQuestion.SubtractionQuestion.setSymbol()).toStrictEqual("-");

})
    */


/*
test('Creating a multiplication answer', () => {

    const question = new generateQuestion.MultiplicationQuestion;
    for (let i = 0; i < 100; i++) {
        for (let j = 0; j < 100; j++) {
            question.manualSetOperands(i, j);
            expect(question.setAnswer()).toStrictEqual(question.num1 * question.num2);
        }
    }
})
    */



test('Obtaining division operands', () => {
    const question = new generateQuestion.DivisionQuestion;
    for (let i = 0; i < 100; i++) {
        let list = question.setOperands()
        expect(list[0] % list[1]).toBe(0);
    }
})
