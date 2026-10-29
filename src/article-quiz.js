for (const quiz of document.querySelectorAll("[data-lesson-quiz]")) {
  const questions = [...quiz.querySelectorAll("[data-quiz-question]")];
  const inputs = [...quiz.querySelectorAll('input[type="radio"]')];
  const submit = quiz.querySelector('button[type="submit"]');
  const retry = quiz.querySelector("[data-quiz-retry]");
  const progress = quiz.querySelector("[data-quiz-progress]");
  const result = quiz.querySelector("[data-quiz-result]");

  const selectedAnswer = (question) => question.querySelector("input:checked");

  function updateProgress() {
    const answered = questions.filter(selectedAnswer).length;
    progress.textContent = `${answered} of ${questions.length} questions answered`;
  }

  quiz.addEventListener("change", () => {
    updateProgress();
    result.textContent = "";
  });

  quiz.addEventListener("submit", (event) => {
    event.preventDefault();
    if (submit.disabled) return;

    const unansweredIndex = questions.findIndex((question) => !selectedAnswer(question));
    if (unansweredIndex !== -1) {
      result.textContent = `Answer all ${questions.length} questions before checking. Question ${unansweredIndex + 1} still needs an answer.`;
      questions[unansweredIndex].querySelector("input").focus();
      return;
    }

    let score = 0;
    for (const question of questions) {
      const selected = selectedAnswer(question);
      if (selected.closest("[data-correct]").dataset.correct === "true") score += 1;

      for (const choice of question.querySelectorAll(".lesson-quiz-choice")) {
        const input = choice.querySelector("input");
        const feedback = choice.querySelector(".lesson-quiz-feedback");
        choice.classList.toggle("is-correct", choice.dataset.correct === "true");
        choice.classList.toggle("is-selected", input.checked);
        choice.querySelector(".quiz-your-answer").hidden = !input.checked;
        feedback.hidden = false;
        input.setAttribute("aria-describedby", feedback.id);
        input.disabled = true;
      }
    }

    submit.disabled = true;
    retry.hidden = false;
    result.textContent = `You answered ${score} of ${questions.length} correctly. Every option is explained below. Select Try again for a fresh attempt.`;
    result.focus();
  });

  retry.addEventListener("click", () => {
    quiz.reset();
    for (const input of inputs) {
      input.disabled = false;
      input.removeAttribute("aria-describedby");
    }
    for (const choice of quiz.querySelectorAll(".lesson-quiz-choice")) {
      choice.classList.remove("is-correct", "is-selected");
      choice.querySelector(".lesson-quiz-feedback").hidden = true;
      choice.querySelector(".quiz-your-answer").hidden = true;
    }
    result.textContent = "";
    retry.hidden = true;
    submit.disabled = false;
    updateProgress();
    inputs[0].focus();
  });

  submit.disabled = false;
}
