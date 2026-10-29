const contents = document.querySelector(".article-contents");
const body = document.querySelector(".article-body");

if (contents && body) {
  const sections = [...contents.querySelectorAll('a[href^="#"]')]
    .map((link) => ({ link, section: document.getElementById(link.getAttribute("href").slice(1)) }))
    .filter(({ section }) => section);
  let activeLink = null;
  let framePending = false;

  function updateCurrentSection() {
    framePending = false;
    // Read near the top of the viewport, retaining the current section through long passages.
    const readingLine = Math.min(160, window.innerHeight * 0.25);
    let current = null;
    for (const entry of sections) {
      if (entry.section.getBoundingClientRect().top <= readingLine) current = entry.link;
    }
    if (window.scrollY > 0 && Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2) {
      current = sections.at(-1)?.link ?? current;
    }
    if (current === activeLink) return;
    activeLink?.removeAttribute("aria-current");
    current?.setAttribute("aria-current", "location");
    activeLink = current;
  }

  function scheduleUpdate() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(updateCurrentSection);
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("hashchange", scheduleUpdate);
  window.addEventListener("pageshow", scheduleUpdate);
  // Model answers and quiz feedback can change section positions without a new scroll event.
  if ("ResizeObserver" in window) new ResizeObserver(scheduleUpdate).observe(body);
  scheduleUpdate();
}
