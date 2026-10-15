export function generateQuestion() {
  const MIN = 0;
  const MAX = 9;
  const num1 = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
  const num2 = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;

  //currently only addition, subtraction, and multiplication 
  //will be imporved for difficulty levels and more oeprations
  const operation = Math.floor(Math.random() * (2 - 0 + 1)) + 0;
  let answer = 0;
  let symbol = 'x';
  // 0 = addition
  // 1 = subtraction
  // 2 = multiplication

  if (operation === 0) {
    answer = num1 + num2;
    symbol = '+';
  }
  else if (operation === 1) {
    answer = num1 - num2;
    symbol = '-';
  }
  else if (operation === 2) {
    answer = num1 * num2;
    symbol = '*';
  }

  return {
    text: "What is ".concat(num1, " ", symbol, " ", num2, "?"),
    answer: answer,
  };
}