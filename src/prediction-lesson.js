const probability = document.querySelector("#forecast-probability");
const probabilityValue = document.querySelector("#forecast-probability-value");
const score = document.querySelector("#forecast-score");

if (probability && probabilityValue && score) {
  function updateScore() {
    const p = Number(probability.value) / 100;
    probabilityValue.value = `${probability.value}%`;
    score.value = ((8 * (p - 1) ** 2 + 2 * p ** 2) / 10).toFixed(4);
  }
  probability.addEventListener("input", updateScore);
  updateScore();
}
