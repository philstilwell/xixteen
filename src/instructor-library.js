const cards = [...document.querySelectorAll("[data-pack]")];
const search = document.querySelector("#lesson-search");
const duration = document.querySelector("#lesson-duration");
const count = document.querySelector("#resource-count");
const empty = document.querySelector("#library-empty");
function filterLessons() {
  const query = search.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const card of cards) {
    const matches = (!query || card.dataset.search.toLocaleLowerCase().includes(query)) &&
      (duration.value === "all" || Number(card.dataset.minutes) <= Number(duration.value));
    card.hidden = !matches;
    if (matches) visible++;
  }
  count.textContent = `${visible} teaching ${visible === 1 ? "pack" : "packs"}`;
  empty.hidden = visible > 0;
}
search.addEventListener("input", filterLessons);
duration.addEventListener("change", filterLessons);
document.querySelector("#reset-filters").addEventListener("click", () => {
  search.value = "";
  duration.value = "all";
  filterLessons();
  search.focus();
});
document.querySelector(".library-filters").hidden = false;
filterLessons();
