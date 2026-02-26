import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const PAYMENT_KEY = "lingua_paid_v1";
const PLAYER_KEY = "lingua_player_v1";

const seedTasks = [
  { word: "hello", answer: "привет", options: ["пока", "привет", "спасибо", "извини"] },
  { word: "book", answer: "книга", options: ["газета", "книга", "ручка", "стол"] },
  { word: "water", answer: "вода", options: ["чай", "кофе", "вода", "молоко"] },
  { word: "teacher", answer: "учитель", options: ["студент", "учитель", "директор", "врач"] },
];

const cfg = window.APP_CONFIG || {};
const hasSupabase = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
const supabase = hasSupabase ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

const state = {
  tasks: [],
  currentIndex: 0,
  score: 0,
  answered: false,
  editingId: null,
  teacher: null,
  leaderboard: [],
  player: loadPlayer(),
};

const views = {
  student: document.getElementById("student-view"),
  admin: document.getElementById("admin-view"),
};

const tabs = document.querySelectorAll(".tab");
const card = document.getElementById("card");
const cardFront = document.querySelector(".card-front");
const cardBack = document.querySelector(".card-back");
const optionsWrap = document.getElementById("options");
const progressLabel = document.getElementById("progress-label");
const scoreLabel = document.getElementById("score-label");
const nextBtn = document.getElementById("next-btn");
const resetBtn = document.getElementById("reset-btn");
const studentStatus = document.getElementById("student-status");

const playerForm = document.getElementById("player-form");
const playerNameInput = document.getElementById("player-name");
const dailyBonusBtn = document.getElementById("daily-bonus-btn");
const bonusStatus = document.getElementById("bonus-status");
const leagueLabel = document.getElementById("league-label");
const xpLabel = document.getElementById("xp-label");
const coinsLabel = document.getElementById("coins-label");
const streakLabel = document.getElementById("streak-label");
const rankLabel = document.getElementById("rank-label");
const leaderboardTable = document.getElementById("leaderboard-table");

const authBlock = document.getElementById("auth-block");
const adminContent = document.getElementById("admin-content");
const adminStatus = document.getElementById("admin-status");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");

const taskForm = document.getElementById("task-form");
const wordInput = document.getElementById("word");
const answerInput = document.getElementById("answer");
const optionsInput = document.getElementById("options-input");
const tableBody = document.getElementById("tasks-table");
const clearEditBtn = document.getElementById("clear-edit");
const seedBtn = document.getElementById("seed-btn");

const payBtn = document.getElementById("pay-btn");
const paymentLocked = document.getElementById("payment-locked");
const callForm = document.getElementById("call-form");
const callStatus = document.getElementById("call-status");

function loadPlayer() {
  try {
    const raw = localStorage.getItem(PLAYER_KEY);
    if (!raw) {
      return {
        name: "",
        xp: 0,
        coins: 0,
        streak: 0,
        lastStudyDate: "",
        lastBonusDate: "",
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      name: "",
      xp: 0,
      coins: 0,
      streak: 0,
      lastStudyDate: "",
      lastBonusDate: "",
    };
  }
}

function savePlayer() {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(state.player));
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function getLeagueByXp(xp) {
  if (xp >= 1200) return "Diamond";
  if (xp >= 700) return "Gold";
  if (xp >= 350) return "Silver";
  return "Bronze";
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function parseOptions(raw) {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setStatus(el, text, isError = false) {
  el.textContent = text;
  el.style.color = isError ? "var(--bad)" : "var(--muted)";
}

function updateDailyStreak() {
  const today = getTodayKey();
  if (state.player.lastStudyDate === today) return;

  if (state.player.lastStudyDate === getYesterdayKey()) {
    state.player.streak += 1;
  } else {
    state.player.streak = 1;
  }

  state.player.lastStudyDate = today;
}

function renderGamification() {
  playerNameInput.value = state.player.name || "";
  leagueLabel.textContent = getLeagueByXp(state.player.xp);
  xpLabel.textContent = String(state.player.xp);
  coinsLabel.textContent = String(state.player.coins);
  streakLabel.textContent = String(state.player.streak);

  const today = getTodayKey();
  const hasBonus = state.player.lastBonusDate === today;
  dailyBonusBtn.disabled = hasBonus;
  if (hasBonus) {
    setStatus(bonusStatus, "Сегодня бонус уже получен");
  } else {
    setStatus(bonusStatus, "Daily бонус: +40 XP и +25 коинов");
  }

  renderLeaderboard();
}

function renderLeaderboard() {
  const merged = [...state.leaderboard];

  if (state.player.name) {
    const existingIndex = merged.findIndex((x) => x.nickname === state.player.name);
    const playerItem = {
      nickname: state.player.name,
      xp: state.player.xp,
      league: getLeagueByXp(state.player.xp),
    };

    if (existingIndex >= 0) {
      merged[existingIndex] = playerItem;
    } else {
      merged.push(playerItem);
    }
  }

  merged.sort((a, b) => b.xp - a.xp);
  const top = merged.slice(0, 10);

  leaderboardTable.innerHTML = "";
  top.forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}</td><td>${escapeHtml(row.nickname)}</td><td>${escapeHtml(row.league)}</td><td>${row.xp}</td>`;
    leaderboardTable.appendChild(tr);
  });

  const rank = merged.findIndex((x) => x.nickname === state.player.name);
  rankLabel.textContent = state.player.name ? (rank >= 0 ? `#${rank + 1}` : "-") : "-";
}

async function syncPlayerProgress() {
  if (!supabase || !state.player.name) return;

  const payload = {
    nickname: state.player.name,
    xp: state.player.xp,
    coins: state.player.coins,
    streak: state.player.streak,
    league: getLeagueByXp(state.player.xp),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("player_progress").upsert(payload, { onConflict: "nickname" });
  if (!error) {
    await fetchLeaderboard();
  }
}

async function fetchLeaderboard() {
  if (!supabase) {
    state.leaderboard = [
      { nickname: "lexi_master", xp: 860, league: "Gold" },
      { nickname: "word_runner", xp: 620, league: "Silver" },
      { nickname: "english_fox", xp: 410, league: "Silver" },
    ];
    renderGamification();
    return;
  }

  const { data, error } = await supabase
    .from("player_progress")
    .select("nickname, xp, league")
    .order("xp", { ascending: false })
    .limit(30);

  if (error) {
    setStatus(studentStatus, `Ошибка загрузки рейтинга: ${error.message}`, true);
    return;
  }

  state.leaderboard = data || [];
  renderGamification();
}

function applyAnswerReward(isCorrect) {
  if (!isCorrect) return;

  updateDailyStreak();
  state.player.xp += 10;
  state.player.coins += 3;
  savePlayer();
  renderGamification();
  syncPlayerProgress();
}

function renderStudentCard() {
  if (!state.tasks.length) {
    cardFront.textContent = "Нет карточек";
    cardBack.textContent = "Преподаватель добавит задания в админке";
    optionsWrap.innerHTML = "";
    progressLabel.textContent = "Карточек нет";
    nextBtn.disabled = true;
    return;
  }

  const task = state.tasks[state.currentIndex];
  state.answered = false;
  card.classList.remove("flipped");
  nextBtn.disabled = true;

  cardFront.textContent = task.word;
  cardBack.textContent = task.answer;
  progressLabel.textContent = `Карточка ${state.currentIndex + 1} / ${state.tasks.length}`;
  scoreLabel.textContent = `Верно: ${state.score}`;

  optionsWrap.innerHTML = "";
  const options = shuffle(task.options);
  const template = document.getElementById("option-template");

  options.forEach((opt) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.textContent = opt;
    node.addEventListener("click", () => checkAnswer(node, opt, task.answer));
    optionsWrap.appendChild(node);
  });
}

function checkAnswer(button, selected, correct) {
  if (state.answered) {
    return;
  }

  state.answered = true;
  const all = optionsWrap.querySelectorAll(".option-btn");
  all.forEach((btn) => {
    btn.disabled = true;
  });

  if (selected === correct) {
    state.score += 1;
    button.classList.add("correct");
    card.classList.add("flipped");
    applyAnswerReward(true);
  } else {
    button.classList.add("wrong");
    all.forEach((btn) => {
      if (btn.textContent === correct) {
        btn.classList.add("correct");
      }
    });
  }

  scoreLabel.textContent = `Верно: ${state.score}`;
  nextBtn.disabled = false;
}

function nextCard() {
  if (!state.tasks.length) return;
  state.currentIndex = (state.currentIndex + 1) % state.tasks.length;
  renderStudentCard();
}

function resetTraining() {
  state.currentIndex = 0;
  state.score = 0;
  renderStudentCard();
}

function renderTable() {
  tableBody.innerHTML = "";

  state.tasks.forEach((task, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(task.word)}</td>
      <td>${escapeHtml(task.answer)}</td>
      <td>${escapeHtml(task.options.join(", "))}</td>
      <td>
        <div class="inline-actions">
          <button class="btn ghost small" data-action="edit" data-id="${task.id}">Изменить</button>
          <button class="btn ghost small" data-action="delete" data-id="${task.id}">Удалить</button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function switchView(view) {
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === view);
  });
  Object.entries(views).forEach(([key, el]) => {
    el.classList.toggle("show", key === view);
  });
}

function toggleAdminUi() {
  const isTeacher = Boolean(state.teacher);
  authBlock.classList.toggle("hidden", isTeacher);
  adminContent.classList.toggle("hidden", !isTeacher);
  if (!supabase) {
    setStatus(adminStatus, "Заполните supabaseUrl и supabaseAnonKey в config.js", true);
    return;
  }
  setStatus(adminStatus, isTeacher ? `Вы вошли как ${state.teacher.email}` : "Войдите как преподаватель");
}

async function fetchCards() {
  if (!supabase) {
    state.tasks = [...seedTasks];
    setStatus(studentStatus, "Работаем в демо-режиме. Добавьте ключи Supabase в config.js", true);
    renderStudentCard();
    renderTable();
    return;
  }

  const { data, error } = await supabase.from("flashcards").select("id, word, answer, options").order("created_at", { ascending: true });

  if (error) {
    setStatus(studentStatus, `Ошибка загрузки карточек: ${error.message}`, true);
    return;
  }

  state.tasks = data || [];
  if (!state.tasks.length) {
    setStatus(studentStatus, "Пока нет карточек. Преподаватель может загрузить тестовые.");
  } else {
    setStatus(studentStatus, `Загружено карточек: ${state.tasks.length}`);
  }

  if (state.currentIndex >= state.tasks.length) {
    state.currentIndex = 0;
  }

  renderStudentCard();
  renderTable();
}

function resetForm() {
  taskForm.reset();
  state.editingId = null;
  clearEditBtn.classList.add("hidden");
}

async function upsertTask(event) {
  event.preventDefault();
  if (!supabase || !state.teacher) return;

  const word = wordInput.value.trim();
  const answer = answerInput.value.trim();
  const options = parseOptions(optionsInput.value);

  if (options.length < 3) {
    alert("Нужно минимум 3 варианта ответа.");
    return;
  }

  if (!options.includes(answer)) {
    options.push(answer);
  }

  const payload = { word, answer, options };

  let result;
  if (state.editingId) {
    result = await supabase.from("flashcards").update(payload).eq("id", state.editingId);
  } else {
    result = await supabase.from("flashcards").insert(payload);
  }

  if (result.error) {
    alert(`Ошибка сохранения: ${result.error.message}`);
    return;
  }

  resetForm();
  await fetchCards();
  setStatus(adminStatus, "Карточка сохранена");
}

async function onTableClick(event) {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;

  if (action === "delete") {
    if (!supabase || !state.teacher) return;
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (error) {
      alert(`Ошибка удаления: ${error.message}`);
      return;
    }

    await fetchCards();
    setStatus(adminStatus, "Карточка удалена");
    return;
  }

  if (action === "edit") {
    state.editingId = id;
    wordInput.value = task.word;
    answerInput.value = task.answer;
    optionsInput.value = task.options.join(", ");
    clearEditBtn.classList.remove("hidden");
  }
}

async function seedTestCards() {
  if (!supabase || !state.teacher) return;

  const { error } = await supabase.from("flashcards").insert(seedTasks);
  if (error) {
    alert(`Ошибка загрузки тестовых карточек: ${error.message}`);
    return;
  }

  await fetchCards();
  setStatus(adminStatus, "Тестовые карточки добавлены");
}

async function signupTeacher() {
  if (!supabase) return;

  const email = authEmail.value.trim();
  const password = authPassword.value.trim();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    alert(`Ошибка регистрации: ${error.message}`);
    return;
  }

  setStatus(adminStatus, "Аккаунт создан. Подтвердите email (если включено), затем войдите.");
}

async function loginTeacher(event) {
  event.preventDefault();
  if (!supabase) return;

  const email = authEmail.value.trim();
  const password = authPassword.value.trim();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert(`Ошибка входа: ${error.message}`);
    return;
  }

  state.teacher = data.user;
  toggleAdminUi();
}

async function restoreSession() {
  if (!supabase) return;

  const { data } = await supabase.auth.getUser();
  state.teacher = data.user || null;
  toggleAdminUi();
}

async function logoutTeacher() {
  if (!supabase) return;

  await supabase.auth.signOut();
  state.teacher = null;
  toggleAdminUi();
  resetForm();
}

function buildJitsiRoom(name, slot) {
  const slug = `${name}-${slot}-${Date.now()}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const room = `linguasprint-${slug}`.slice(0, 70);
  return {
    room,
    url: `https://meet.jit.si/${room}`,
  };
}

function setupPaymentFlow() {
  const isPaid = localStorage.getItem(PAYMENT_KEY) === "1";
  if (isPaid) {
    paymentLocked.classList.add("hidden");
    callForm.classList.remove("hidden");
  }

  payBtn.addEventListener("click", () => {
    localStorage.setItem(PAYMENT_KEY, "1");
    paymentLocked.classList.add("hidden");
    callForm.classList.remove("hidden");
    callStatus.textContent = "Оплата подтверждена. Выберите слот для созвона.";
  });

  callForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("student-name").value.trim();
    const email = document.getElementById("student-email").value.trim();
    const slot = document.getElementById("call-slot").value;
    const { room, url } = buildJitsiRoom(name, slot);

    if (supabase) {
      const { error } = await supabase.from("lesson_bookings").insert({
        student_name: name,
        student_email: email,
        slot,
        payment_status: "paid",
        jitsi_room: room,
        jitsi_url: url,
      });

      if (error) {
        callStatus.textContent = `Ошибка записи: ${error.message}`;
        callStatus.style.color = "var(--bad)";
        return;
      }
    }

    callStatus.style.color = "var(--good)";
    callStatus.innerHTML = `Запись оформлена: ${slot}. Ссылка на созвон: <a href="${url}" target="_blank" rel="noreferrer">${url}</a>`;
    callForm.reset();
  });
}

function setupGamificationActions() {
  playerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = playerNameInput.value.trim().toLowerCase();
    if (!name) return;

    state.player.name = name.slice(0, 24);
    savePlayer();
    renderGamification();
    syncPlayerProgress();
    setStatus(bonusStatus, "Ник сохранен. Теперь ваш прогресс участвует в рейтинге.");
  });

  dailyBonusBtn.addEventListener("click", () => {
    const today = getTodayKey();
    if (state.player.lastBonusDate === today) {
      setStatus(bonusStatus, "Сегодня бонус уже получен");
      return;
    }

    state.player.lastBonusDate = today;
    state.player.xp += 40;
    state.player.coins += 25;
    savePlayer();
    renderGamification();
    syncPlayerProgress();
    setStatus(bonusStatus, "Бонус получен: +40 XP и +25 коинов");
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

nextBtn.addEventListener("click", nextCard);
resetBtn.addEventListener("click", resetTraining);
authForm.addEventListener("submit", loginTeacher);
signupBtn.addEventListener("click", signupTeacher);
logoutBtn.addEventListener("click", logoutTeacher);
taskForm.addEventListener("submit", upsertTask);
tableBody.addEventListener("click", onTableClick);
clearEditBtn.addEventListener("click", resetForm);
seedBtn.addEventListener("click", seedTestCards);

setupPaymentFlow();
setupGamificationActions();
toggleAdminUi();
renderGamification();
await restoreSession();
await fetchCards();
await fetchLeaderboard();
