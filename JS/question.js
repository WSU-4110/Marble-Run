export class generateQuestion {
  

  //currently only addition, subtraction, and multiplication 
  //will be imporved for difficulty levels and more oeprations
  // const operation = Math.floor(Math.random() * (2 - 0 + 1)) + 0;
  answer = 0;
  symbol = 'x';
  operation = JSON.parse(localStorage.getItem('operation')) || Array('addition');

  num1 = 0;
  num2 = 0;
  MIN = 0;
  MAX = 1;

  // used in multiplication
  MIN2 = 0;
  MAX2 = 0;

  chosenOperand = 'addition';

  static pickDifficulty() {

    let difficulty = localStorage.getItem('difficulty') || 'easy';
  if (difficulty === 'easy') {
    this.MIN = 0;
    this.MAX = 10;

    this.MIN2 = 0;
    this.MAX2 = 10;
  }

  else if (difficulty === 'medium') {
    this.MIN = 0;
    this.MAX = 100;

    this.MIN2 = 0;
    this.MIN2 = 10;
  }

  else if (difficulty === 'hard') {
    this.MIN = -100;
    this.MAX = 100;
    
    this.MIN2 = -10;
    this.MIN2 = 10;
  }

  let MIN = this.MIN;
  let MAX = this.MAX;

  return {MIN, MAX};

}

  // Create question template

  static CreateQuestion = class {
    num1;
    num2;
    answer;
    symbol;
    static create() {
      this.setOperands();
      this.setAnswer();
      this.setSymbol();
    }
     static setOperands() {
        generateQuestion.pickDifficulty();
        let x = Math.floor(Math.random() * (generateQuestion.MAX - generateQuestion.MIN + 1)) + generateQuestion.MIN;
        let y = Math.floor(Math.random() * (generateQuestion.MAX - generateQuestion.MIN + 1)) + generateQuestion.MIN;
        this.num1 = x;
        this.num2 = y;
        return x;
     }
     static setAnswer() {
        throw new Error("Method 'setAnswer()' must be implemented.");
     }
     static setSymbol() {
        throw new Error("Method 'setSymbol()' must be implemented.");
     }
     manualSetOperands(x, y) {
      this.num1 = x;
      this.num2 = y;
     }
  }

  // Use the create question template to create questions of various operands

  static AdditionQuestion = class extends generateQuestion.CreateQuestion {
    setAnswer() {
      this.answer = this.num1 + this.num2;
      return(this.answer);
    }
    static setSymbol() {
      symbol = "+";
    }
  }

  static SubtractionQuestion = class extends generateQuestion.CreateQuestion {
    static setAnswer() {
      answer = num1 - num2;
    }
    static setSymbol() {
      this.symbol = "-";
      return this.symbol;
    }
  }

  static MultiplicationQuestion = class extends generateQuestion.CreateQuestion {
    static setOperands() {
      num1 = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
      num2 = Math.floor(Math.random() * (MAX2 - MIN2 + 1)) + MIN2;
    }
    setAnswer() {
      this.answer = this.num1 * this.num2;
      return(this.answer)
    }
    static setSymbol() {
      symbol = "*";
    }
  }

  static DivisionQuestion = class extends generateQuestion.CreateQuestion {
    setOperands() {
      generateQuestion.pickDifficulty();
      while (this.num2 === 0 || this.num1 % this.num2 != 0) {
      this.num1 = Math.floor(Math.random() * (generateQuestion.MAX - generateQuestion.MIN + 1)) + generateQuestion.MIN + 1;
      this.num2 = Math.floor(Math.random() * (generateQuestion.MAX - generateQuestion.MIN + 1)) + generateQuestion.MIN + 1;
      }
    return([this.num1,this.num2]);
    }
    static setAnswer() {
      answer = num1 / num2;
    }
    static setSymbol() {
      symbol = "/";
    }
  }


    // Finally, pick a random operation to use from the list of selected ones, and make a question with it.

    question() {
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
}