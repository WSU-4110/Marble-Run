export function generateQuestion() {
  

  //currently only addition, subtraction, and multiplication 
  //will be imporved for difficulty levels and more oeprations
  // const operation = Math.floor(Math.random() * (2 - 0 + 1)) + 0;
  let answer = 0;
  let symbol = 'x';
  let operation = localStorage.getItem('operation') || 'addition';
  let difficulty = localStorage.getItem('difficulty') || 'easy';

  let num1 = 0;
  let num2 = 0;
  let MIN = 0;
  let MAX = 1;

  // used in multiplication
  let MIN2 = 0;
  let MAX2 = 0;

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


  // if it's division, it should only give whole number answers
  if (operation === 'division') {
    while (num2 === 0 || num1 % num2 != 0) {
      num1 = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN + 1;
      num2 = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN + 1;
    }
  }
  else {
    num1 = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
    if (operation === 'multiplication') {
      num2 = Math.floor(Math.random() * (MAX2 - MIN2 + 1)) + MIN2;
    }
    else {
      num2 = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
    }
  }


  if (operation === 'addition') {
    answer = num1 + num2;
    symbol = '+';
  }
  else if (operation === 'subtraction') {
    answer = num1 - num2;
    symbol = '-';
  }
  else if (operation === 'multiplication') {
    answer = num1 * num2;
    symbol = '*';
  }
  else if (operation === 'division') {
    answer = num1 / num2;
    symbol = '/';
  }

  return {
    num1: num1,
    symbol: symbol,
    num2: num2,
    answer: answer,
  };
}