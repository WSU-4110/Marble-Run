export function generateQuestion() {
  

  //currently only addition, subtraction, and multiplication 
  //will be imporved for difficulty levels and more oeprations
  // const operation = Math.floor(Math.random() * (2 - 0 + 1)) + 0;
  let answer = 0;
  let symbol = 'x';
  let operation = JSON.parse(localStorage.getItem('operation')) || Array('addition');
  let difficulty = localStorage.getItem('difficulty') || 'easy';

  let num1 = 0;
  let num2 = 0;
  let MIN = 0;
  let MAX = 1;

  // used in multiplication
  let MIN2 = 0;
  let MAX2 = 0;

  let chosenOperand = 'addition';

  if (difficulty === 'easy') {
    MIN = 0;
    MAX = 10;

    MIN2 = 0;
    MAX2 = 10;
  }

  else if (difficulty === 'medium') {
    MIN = 0;
    MAX = 100;

    MIN2 = 0;
    MIN2 = 10;
  }

  else if (difficulty === 'hard') {
    MIN = -100;
    MAX = 100;
    
    MIN2 = -10;
    MIN2 = 10;
  }

  // Create question template

  class CreateQuestion {
    static create() {
      this.setOperands();
      this.setAnswer();
      this.setSymbol();
    }
     static setOperands() {
        num1 = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
        num2 = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
     }
     static setAnswer() {
        throw new Error("Method 'setAnswer()' must be implemented.");
     }
     static setSymbol() {
        throw new Error("Method 'setSymbol()' must be implemented.");
     }
  }

  // Use the create question template to create questions of various operands

  class AdditionQuestion extends CreateQuestion {
    static setAnswer() {
      answer = num1 + num2;
    }
    static setSymbol() {
      symbol = "+";
    }
  }

  class SubtractionQuestion extends CreateQuestion {
    static setAnswer() {
      answer = num1 - num2;
    }
    static setSymbol() {
      symbol = "-";
    }
  }

  class MultiplicationQuestion extends CreateQuestion {
    static setOperands() {
      num1 = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
      num2 = Math.floor(Math.random() * (MAX2 - MIN2 + 1)) + MIN2;
    }
    static setAnswer() {
      answer = num1 * num2;
    }
    static setSymbol() {
      symbol = "*";
    }
  }

  class DivisionQuestion extends CreateQuestion {
    static setOperands() {
      while (num2 === 0 || num1 % num2 != 0) {
      num1 = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN + 1;
      num2 = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN + 1;
    }
    }
    static setAnswer() {
      answer = num1 / num2;
    }
    static setSymbol() {
      symbol = "/";
    }
  }


    // Finally, pick a random operation to use from the list of selected ones, and make a question with it.
    chosenOperand = operation[Math.floor(Math.random() * operation.length)];

    console.log(chosenOperand);

    if (chosenOperand === "addition") {
      AdditionQuestion.create();
    }
    if (chosenOperand === "subtraction") {
      SubtractionQuestion.create();
    }
    if (chosenOperand === "multiplication") {
      MultiplicationQuestion.create();
    }
    if (chosenOperand === "division") {
      DivisionQuestion.create();
    }

  return {
    num1: num1,
    symbol: symbol,
    num2: num2,
    answer: answer,
  };
}