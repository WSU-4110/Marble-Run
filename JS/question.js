
  const question = document.getElementById('question-display');
  const feedback = document.getElementById('feedback-display');
  const button = document.getElementById('answer-btn');
  const ansInput = document.getElementById('answer-input');

  let answer = 0;

  // Create the questions
  function generateQuestion() {
    console.log("generating a question")
    const MIN = 0;
    const MAX = 9;
    
    // Generate some random numbers
    const num1 = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
    const num2 = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
  
    // The operation to use. Division will be added later
    // 0 = addition
    // 1 = subtraction
    // 2 = multiplication
    const operation = Math.floor(Math.random() * (2 - 0 + 1)) + 0;
    var symbol = 'x';

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

    // Update the HTML display text
    question.textContent = "What is ".concat(num1," ",symbol," ",num2,"?");
  }

  // When the user answers a question
  function answerQuestion() {
    const userAnswer = ansInput.value;

    // Don't record the answer if the user hasn't typed anything in yet.
    if (userAnswer == "") {
      return;
    }

    // Give feedback on whether the answer was correct or not.
    if (userAnswer == answer) {
      feedback.textContent = "Correct!"
    }
    else {
      feedback.textContent = "Wrong... The answer was ".concat(answer,". You answered ",userAnswer);
    }
    ansInput.value = "";


    generateQuestion();
  }


  // Trigger the function when the button is clicked
  button.addEventListener('click', answerQuestion);
  
  // Generate a question upon loading the page
  generateQuestion();