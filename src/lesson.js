const share = document.querySelector("[data-copy-student-link]");
if (share) share.addEventListener("click", async () => {
  const status = document.querySelector("#share-status");
  const link = document.querySelector("#student-view-link");
  try {
    await navigator.clipboard.writeText(link.href);
    status.textContent = "Student link copied. It opens the activity without model answers.";
  } catch {
    status.textContent = "Use the Student view link above, then copy its address from your browser.";
  }
});
document.querySelector("[data-print]")?.addEventListener("click", () => window.print());
