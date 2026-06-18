const STORAGE_KEY = "xixteen-profile-v1";
const COLORS = [
  "#1f8a8a", "#d95d47", "#c79a2d", "#4b6f9f",
  "#5c7f51", "#9b5a82", "#3b7c6e", "#b26a3c",
  "#6d6aa8", "#2f7d9b", "#a34f55", "#7b6f35",
  "#49714d", "#8a5d9b", "#b07a28", "#386f72"
];

const state = {
  skills: [],
  items: [],
  dailyQuizzes: [],
  assets: [],
  itemById: new Map(),
  skillById: new Map(),
  itemsBySkill: new Map(),
  profile: null,
  quiz: null,
  currentIndex: 0,
  answers: new Map(),
  startedAt: 0,
  itemStartedAt: 0
};

const els = {
  gallery: document.querySelector("#skill-gallery"),
  quizDate: document.querySelector("#quiz-date"),
  quizTitle: document.querySelector("#quiz-title"),
  quizProgress: document.querySelector("#quiz-progress"),
  quizPanel: document.querySelector("#quiz-panel"),
  profileSummary: document.querySelector("#profile-summary"),
  skillList: document.querySelector("#skill-list"),
  leaderboard: document.querySelector("#leaderboard-list"),
  workbench: document.querySelector("#workbench")
};

init().catch((error) => {
  console.error(error);
  els.quizPanel.innerHTML = `<p class="empty-state">XiXteen could not load its question bank.</p>`;
});

async function init() {
  const [skills, items, dailyQuizzes, assets] = await Promise.all([
    fetchJson("data/skills.json"),
    fetchJson("data/question-bank.json"),
    fetchJson("data/daily-quizzes.json"),
    fetchJson("assets/skills/prompts.json")
  ]);

  state.skills = skills;
  state.items = items;
  state.dailyQuizzes = dailyQuizzes;
  state.assets = assets;
  state.profile = loadProfile();
  state.itemById = new Map(items.map((item) => [item.id, item]));
  state.skillById = new Map(skills.map((skill) => [skill.id, skill]));
  state.itemsBySkill = groupBy(items, (item) => item.skill);

  bindEvents();
  renderGallery();
  renderProfile();
  await renderLeaderboard();
  startDaily({ scroll: false });
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

function bindEvents() {
  document.querySelector("#start-daily").addEventListener("click", () => startDaily());
  document.querySelector("#start-practice").addEventListener("click", () => startAdaptivePractice());
  document.querySelector("#reset-stats").addEventListener("click", () => {
    state.profile = createProfile();
    saveProfile();
    renderProfile();
    renderLeaderboard();
  });

  document.querySelectorAll(".mode-button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.mode === "daily") {
        startDaily();
      } else {
        startAdaptivePractice();
      }
    });
  });

  els.quizPanel.addEventListener("click", (event) => {
    const choiceButton = event.target.closest("[data-choice]");
    if (choiceButton) {
      chooseAnswer(choiceButton.dataset.choice);
      return;
    }

    const nextButton = event.target.closest("[data-next]");
    if (nextButton) {
      goNext();
      return;
    }

    const scrollButton = event.target.closest("[data-scroll-grid]");
    if (scrollButton) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

function renderGallery() {
  const assetBySkill = new Map(state.assets.map((asset) => [asset.skill, asset]));
  els.gallery.innerHTML = state.skills.map((skill, index) => {
    const asset = assetBySkill.get(skill.id);
    const accent = COLORS[index % COLORS.length];
    const image = asset?.ready ? asset.file : "";
    return `
      <button class="skill-card" type="button" data-skill="${skill.id}" style="--accent: ${accent}">
        <span class="skill-image">
          ${image ? `<img src="${image}" alt="" loading="lazy" />` : ""}
          <span class="fallback-mark">${index + 1}</span>
        </span>
        <span class="skill-card-label">${escapeHtml(skill.publicLabel)}</span>
      </button>
    `;
  }).join("");

  els.gallery.querySelectorAll("img").forEach((image) => {
    image.addEventListener("error", () => image.classList.add("is-missing"));
  });

  els.gallery.querySelectorAll("[data-skill]").forEach((button) => {
    button.addEventListener("click", () => startSkillPractice(button.dataset.skill));
  });
}

function startDaily(options = {}) {
  setMode("daily");
  const date = todayIso();
  const scheduled = state.dailyQuizzes.find((quiz) => quiz.date === date) || state.dailyQuizzes[0];
  const items = scheduled.items.map((entry) => state.itemById.get(entry.itemId)).filter(Boolean);
  startQuiz({
    mode: "daily",
    title: "Today's XiXteen",
    date: scheduled.date,
    items
  }, options);
}

function startAdaptivePractice(options = {}) {
  setMode("practice");
  const rankedSkills = [...state.skills].sort((a, b) => masteryScore(a.id) - masteryScore(b.id));
  const items = rankedSkills.map((skill, index) => choosePracticeItem(skill.id, index)).filter(Boolean);
  startQuiz({
    mode: "practice",
    title: "Adaptive Practice",
    date: "Practice",
    items
  }, options);
}

function startSkillPractice(skillId) {
  setMode("practice");
  const skill = state.skillById.get(skillId);
  const items = Array.from({ length: 8 }, (_, index) => choosePracticeItem(skillId, index, true)).filter(Boolean);
  startQuiz({
    mode: "practice",
    title: skill.publicLabel,
    date: "Skill Practice",
    items
  });
}

function startQuiz(quiz, options = {}) {
  state.quiz = quiz;
  state.currentIndex = 0;
  state.answers = new Map();
  state.startedAt = performance.now();
  state.itemStartedAt = performance.now();
  renderQuiz();
  if (options.scroll !== false) {
    els.workbench.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function setMode(mode) {
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
}

function renderQuiz() {
  const quiz = state.quiz;
  if (!quiz || quiz.items.length === 0) {
    els.quizPanel.innerHTML = `<p class="empty-state">No quiz items are available.</p>`;
    return;
  }

  els.quizTitle.textContent = quiz.title;
  els.quizDate.textContent = quiz.date === "Practice" || quiz.date === "Skill Practice"
    ? quiz.date
    : formatDate(quiz.date);

  const item = quiz.items[state.currentIndex];
  const skill = state.skillById.get(item.skill);
  const selected = state.answers.get(item.id);
  const answered = Boolean(selected);
  const progress = (state.currentIndex / quiz.items.length) * 100;
  els.quizProgress.style.width = `${progress}%`;

  const choices = item.choices.map((choice) => {
    const classes = ["choice-button"];
    if (answered && choice.id === item.answer) {
      classes.push("is-correct");
    }
    if (answered && choice.id === selected.choiceId && choice.id !== item.answer) {
      classes.push("is-wrong");
    }
    if (!answered && choice.id === selected?.choiceId) {
      classes.push("is-selected");
    }
    return `
      <button class="${classes.join(" ")}" type="button" data-choice="${choice.id}" ${answered ? "disabled" : ""}>
        <span class="choice-key">${choice.id}</span>
        <span>${escapeHtml(choice.text)}</span>
      </button>
    `;
  }).join("");

  els.quizPanel.innerHTML = `
    <div class="question-meta">
      <span class="pill">${state.currentIndex + 1} of ${quiz.items.length}</span>
      <span class="pill">${escapeHtml(skill.publicLabel)}</span>
      <span class="pill">Level ${item.difficulty}</span>
    </div>
    <p class="question-text">${escapeHtml(item.prompt)}</p>
    <div class="choice-list">${choices}</div>
    ${answered ? `<p class="feedback">${escapeHtml(item.explanation)}</p>` : ""}
    <div class="question-actions">
      <button class="next-button" type="button" data-next ${answered ? "" : "disabled"}>
        ${state.currentIndex === quiz.items.length - 1 ? "Finish" : "Next"}
      </button>
    </div>
  `;
}

function chooseAnswer(choiceId) {
  const item = state.quiz.items[state.currentIndex];
  if (state.answers.has(item.id)) {
    return;
  }
  state.answers.set(item.id, {
    choiceId,
    responseMs: Math.round(performance.now() - state.itemStartedAt)
  });
  renderQuiz();
}

function goNext() {
  const item = state.quiz.items[state.currentIndex];
  if (!state.answers.has(item.id)) {
    return;
  }
  if (state.currentIndex < state.quiz.items.length - 1) {
    state.currentIndex += 1;
    state.itemStartedAt = performance.now();
    renderQuiz();
    return;
  }
  finishQuiz();
}

function finishQuiz() {
  const durationMs = Math.round(performance.now() - state.startedAt);
  const results = state.quiz.items.map((item) => {
    const answer = state.answers.get(item.id);
    return {
      item,
      answer,
      correct: answer?.choiceId === item.answer
    };
  });
  const score = results.filter((result) => result.correct).length;
  recordResults(results, durationMs);
  renderResults(results, score, durationMs);
  renderProfile();
  if (state.quiz.mode === "daily") {
    submitScore(results, score, durationMs).finally(() => renderLeaderboard());
  } else {
    renderLeaderboard();
  }
}

function renderResults(results, score, durationMs) {
  els.quizProgress.style.width = "100%";
  const total = results.length;
  els.quizPanel.innerHTML = `
    <div class="question-meta">
      <span class="pill">${score} of ${total}</span>
      <span class="pill">${formatDuration(durationMs)}</span>
    </div>
    <p class="question-text">${resultMessage(score, total)}</p>
    <div class="results-grid">
      ${results.map((result) => {
        const skill = state.skillById.get(result.item.skill);
        return `
          <div class="result-cell">
            <strong>${escapeHtml(skill.publicLabel)}</strong>
            <span>${result.correct ? "Correct" : "Missed"} / Level ${result.item.difficulty}</span>
          </div>
        `;
      }).join("")}
    </div>
    <div class="question-actions">
      <button class="secondary-action" type="button" data-scroll-grid>Skill Grid</button>
      <button class="next-button" type="button" data-next-practice>Practice Again</button>
    </div>
  `;
  els.quizPanel.querySelector("[data-next-practice]").addEventListener("click", () => startAdaptivePractice());
}

function recordResults(results, durationMs) {
  const profile = state.profile;
  profile.seenItems ||= [];
  profile.skillStats ||= {};

  for (const result of results) {
    const skillId = result.item.skill;
    const stat = profile.skillStats[skillId] || {
      attempts: 0,
      correct: 0,
      recent: [],
      byDifficulty: {}
    };
    stat.attempts += 1;
    stat.correct += result.correct ? 1 : 0;
    stat.recent.push(result.correct ? 1 : 0);
    stat.recent = stat.recent.slice(-24);
    const level = String(result.item.difficulty);
    stat.byDifficulty[level] ||= { attempts: 0, correct: 0 };
    stat.byDifficulty[level].attempts += 1;
    stat.byDifficulty[level].correct += result.correct ? 1 : 0;
    profile.skillStats[skillId] = stat;
    profile.seenItems.push(result.item.id);
  }

  profile.seenItems = profile.seenItems.slice(-500);

  if (state.quiz.mode === "daily") {
    profile.dailyScores ||= {};
    profile.dailyScores[state.quiz.date] = {
      score: results.filter((result) => result.correct).length,
      total: results.length,
      durationMs,
      submittedAt: new Date().toISOString()
    };
  }

  saveProfile();
}

function renderProfile() {
  const stats = state.profile.skillStats || {};
  const totals = Object.values(stats).reduce((acc, stat) => {
    acc.attempts += stat.attempts || 0;
    acc.correct += stat.correct || 0;
    return acc;
  }, { attempts: 0, correct: 0 });
  const accuracy = totals.attempts ? Math.round((totals.correct / totals.attempts) * 100) : 0;
  const todayScore = state.profile.dailyScores?.[todayIso()];

  els.profileSummary.innerHTML = `
    <div class="name-field">
      <label for="display-name">Display name</label>
      <input id="display-name" maxlength="28" value="${escapeAttribute(state.profile.displayName)}" />
    </div>
    <div class="metric">
      <strong>${totals.attempts}</strong>
      <span>Attempts</span>
    </div>
    <div class="metric">
      <strong>${accuracy}%</strong>
      <span>Accuracy</span>
    </div>
    <div class="metric">
      <strong>${todayScore ? `${todayScore.score}/16` : "-"}</strong>
      <span>Today</span>
    </div>
    <div class="metric">
      <strong>${weakestSkillLabel()}</strong>
      <span>Focus</span>
    </div>
  `;

  const input = els.profileSummary.querySelector("#display-name");
  input.addEventListener("input", () => {
    state.profile.displayName = input.value.trim() || "Local Thinker";
    saveProfile();
  });

  els.skillList.innerHTML = state.skills.map((skill, index) => {
    const stat = stats[skill.id];
    const attempts = stat?.attempts || 0;
    const accuracyText = attempts ? `${Math.round(((stat.correct || 0) / attempts) * 100)}%` : "new";
    const level = masteryLabel(skill.id);
    const accent = masteryColor(skill.id, index);
    return `
      <div class="skill-row" style="--accent: ${accent}">
        <div>
          <strong>${escapeHtml(skill.publicLabel)}</strong>
          <span>${accuracyText} / ${level}</span>
        </div>
        <span class="mastery-dot" aria-hidden="true"></span>
      </div>
    `;
  }).join("");
}

async function renderLeaderboard() {
  const date = todayIso();
  let entries = [];
  if (apiEnabled()) {
    try {
      const response = await fetch(`/api/leaderboard?date=${encodeURIComponent(date)}`);
      if (response.ok) {
        const payload = await response.json();
        entries = payload.entries || [];
      }
    } catch {
      entries = [];
    }
  }

  if (entries.length === 0) {
    const local = state.profile?.dailyScores?.[date];
    if (local) {
      entries = [{
        displayName: state.profile.displayName,
        score: local.score,
        totalItems: local.total,
        durationMs: local.durationMs
      }];
    }
  }

  if (entries.length === 0) {
    els.leaderboard.innerHTML = `<li><p class="empty-state">No score recorded today.</p></li>`;
    return;
  }

  els.leaderboard.innerHTML = entries.slice(0, 10).map((entry) => `
    <li>
      <strong>${escapeHtml(entry.displayName)}</strong>
      <div>${entry.score}/${entry.totalItems || 16} / ${formatDuration(entry.durationMs || 0)}</div>
    </li>
  `).join("");
}

async function submitScore(results, score, durationMs) {
  if (!apiEnabled()) {
    return;
  }
  const answers = {};
  for (const result of results) {
    answers[result.item.id] = result.answer?.choiceId || null;
  }
  try {
    await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId: state.profile.participantId,
        displayName: state.profile.displayName,
        quizDate: state.quiz.date,
        durationMs,
        answers,
        clientScore: score
      })
    });
  } catch {
    // Local-only use is fine; the public leaderboard appears once the D1 API is deployed.
  }
}

function apiEnabled() {
  const host = window.location.hostname;
  const port = window.location.port;
  if ((host === "127.0.0.1" || host === "localhost") && port !== "8788") {
    return false;
  }
  return true;
}

function choosePracticeItem(skillId, salt, focused = false) {
  const baseDifficulty = difficultyForSkill(skillId);
  const difficulty = focused
    ? clamp(baseDifficulty + Math.floor(salt / 3) - 1, 1, 5)
    : baseDifficulty;
  const pool = (state.itemsBySkill.get(skillId) || []).filter((item) => item.difficulty === difficulty);
  const recent = new Set((state.profile.seenItems || []).slice(-120));
  const freshPool = pool.filter((item) => !recent.has(item.id));
  const source = freshPool.length > 0 ? freshPool : pool;
  if (source.length === 0) {
    return null;
  }
  const attempts = state.profile.skillStats?.[skillId]?.attempts || 0;
  const index = hashString(`${skillId}:${salt}:${attempts}:${Date.now()}`) % source.length;
  return source[index];
}

function difficultyForSkill(skillId) {
  const stat = state.profile.skillStats?.[skillId];
  if (!stat || stat.attempts < 4) {
    return 1;
  }
  const recent = recentAccuracy(stat);
  if (recent >= 0.9 && stat.attempts >= 30) return 5;
  if (recent >= 0.82) return 4;
  if (recent >= 0.68) return 3;
  if (recent >= 0.55) return 2;
  return 1;
}

function masteryScore(skillId) {
  const stat = state.profile.skillStats?.[skillId];
  if (!stat || stat.attempts === 0) {
    return 0;
  }
  const samplePenalty = Math.max(0, 8 - stat.attempts) * 0.04;
  return recentAccuracy(stat) - samplePenalty;
}

function masteryLabel(skillId) {
  const stat = state.profile.skillStats?.[skillId];
  if (!stat || stat.attempts < 4) return "New";
  const score = recentAccuracy(stat);
  if (score >= 0.85) return "Strong";
  if (score >= 0.7) return "Solid";
  if (score >= 0.55) return "Developing";
  return "Needs practice";
}

function masteryColor(skillId, index) {
  const stat = state.profile.skillStats?.[skillId];
  if (!stat || stat.attempts < 4) return COLORS[index % COLORS.length];
  const score = recentAccuracy(stat);
  if (score >= 0.85) return "#5c7f51";
  if (score >= 0.7) return "#1f8a8a";
  if (score >= 0.55) return "#c79a2d";
  return "#d95d47";
}

function recentAccuracy(stat) {
  const recent = stat.recent || [];
  if (recent.length > 0) {
    return recent.reduce((sum, value) => sum + value, 0) / recent.length;
  }
  return stat.attempts ? stat.correct / stat.attempts : 0;
}

function weakestSkillLabel() {
  const attempted = state.skills.filter((skill) => state.profile.skillStats?.[skill.id]?.attempts > 0);
  if (attempted.length === 0) {
    return "Start";
  }
  const weakest = attempted.sort((a, b) => masteryScore(a.id) - masteryScore(b.id))[0];
  return weakest.publicLabel.replace("?", "");
}

function resultMessage(score, total) {
  if (score === total) return "Clean sweep. All sixteen skills landed.";
  if (score >= Math.ceil(total * 0.8)) return "Strong run. The misses point to good practice targets.";
  if (score >= Math.ceil(total * 0.55)) return "Solid work. Your map is starting to show where practice will pay off.";
  return "Useful baseline. The next practice set will lean into the weaker spots.";
}

function loadProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed?.participantId) {
      return parsed;
    }
  } catch {
    // Fall through to a fresh profile.
  }
  return createProfile();
}

function createProfile() {
  return {
    participantId: crypto.randomUUID(),
    displayName: "Local Thinker",
    skillStats: {},
    dailyScores: {},
    seenItems: []
  };
}

function saveProfile() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.profile));
}

function groupBy(values, getKey) {
  const map = new Map();
  for (const value of values) {
    const key = getKey(value);
    const list = map.get(key) || [];
    list.push(value);
    map.set(key, list);
  }
  return map;
}

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${isoDate}T12:00:00`));
}

function formatDuration(milliseconds) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${String(secs).padStart(2, "0")}s` : `${secs}s`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashString(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}
