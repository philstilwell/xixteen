// Preserve links shared before the learner experience moved off the root page.
const url = new URL(window.location.href);
const learnerAnchors = new Set(["#workbench", "#skills", "#skill-gallery", "#profile-title", "#leaderboard-title"]);
if (url.searchParams.has("practice") || learnerAnchors.has(url.hash)) {
  window.location.replace(new URL(`learners/${url.search}${url.hash}`, url).href);
} else if (url.hash === "#teachers") {
  window.location.replace(new URL("instructors/", url).href);
}
