class ManageQuestions {
  constructor() {
    this.userData = JSON.parse(localStorage.getItem("userData")) || {
      users: [],
      currentUserId: null,
    };
    this.settings = JSON.parse(localStorage.getItem("gameSettings")) || {
      questionTime: 30,
      showFeedback: true,
      shuffleQuestions: true,
      darkMode: false,
    };
    this.levels = JSON.parse(localStorage.getItem("quizLevels")) || [];
    console.log("ManageQuestions initialized", { levels: this.levels });
    this.init();
  }

  init() {
    console.log("Initializing UI and events");
    this.updateUI();
    this.generateParticles();
    this.bindEvents();
    this.loadSettings();
    this.renderQuestions();
  }

  bindEvents() {
    const settingsForm = document.getElementById("settingsForm");
    if (settingsForm) {
      settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveSettings();
      });
    }

    const questionForm = document.getElementById("questionForm");
    if (questionForm) {
      questionForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveQuestion();
      });
    }

    const addQuestionBtn = document.getElementById("addQuestionBtn");
    if (addQuestionBtn) {
      addQuestionBtn.addEventListener("click", () => {
        console.log("Add Question button clicked");
        this.showAddQuestionModal();
      });
    }

    const settingsIcon = document.querySelector(".settings-icon");
    if (settingsIcon) {
      settingsIcon.addEventListener("click", () => {
        console.log("Settings icon clicked");
        this.showSettings();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeSettings();
        this.closeQuestionModal();
      }
    });
  }

  generateParticles() {
    const container = document.getElementById("particles");
    if (!container) return;
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      particle.className = "particle";
      particle.style.left = Math.random() * 100 + "%";
      particle.style.top = Math.random() * 100 + "%";
      particle.style.width = Math.random() * 4 + 2 + "px";
      particle.style.height = particle.style.width;
      particle.style.animationDelay = Math.random() * 6 + "s";
      particle.style.animationDuration = Math.random() * 3 + 3 + "s";
      container.appendChild(particle);
    }
  }

  getCurrentUser() {
    return (
      this.userData.users.find(
        (user) => user.id === this.userData.currentUserId
      ) || {
        gameStats: {
          totalScore: 0,
          completedLevels: 0,
          streak: 0,
          totalTime: 0,
        },
        name: "Tamu",
        levels: this.levels.map(() => ({ requiredRepeats: 2 })),
      }
    );
  }

  updateUI() {
    const user = this.getCurrentUser();
    const totalScore = document.getElementById("totalScore");
    const progressCircle = document.getElementById("progress-circle");
    const progressText = document.getElementById("progressText");

    if (totalScore) totalScore.textContent = user.gameStats.totalScore;

    if (progressCircle && progressText) {
      const progress = this.levels.length
        ? (user.gameStats.completedLevels / this.levels.length) * 100
        : 0;
      const circumference = 2 * Math.PI * 20;
      const offset = circumference - (progress / 100) * circumference;
      progressCircle.style.strokeDashoffset = offset;
      progressText.textContent = Math.round(progress) + "%";
    }
  }

  renderQuestions() {
    const levelsList = document.getElementById("levelsList");
    if (!levelsList) return;
    levelsList.innerHTML = "";

    if (this.levels.length === 0) {
      levelsList.innerHTML =
        '<p class="text-center">Belum ada level atau soal.</p>';
      return;
    }

    this.levels.forEach((level, levelIndex) => {
      const levelCard = document.createElement("div");
      levelCard.className = "level-card";
      levelCard.innerHTML = `
        <button class="btn-delete-level" onclick="deleteLevel(${levelIndex})">
          <i class="fas fa-trash"></i>
        </button>
        <div class="level-content">
          <i class="fas fa-layer-group level-icon"></i>
          <span class="level-number">${level.name}</span>
          <span class="level-questions">Soal: ${
            level.questions?.length || 0
          }</span>
        </div>
        <div class="question-items" id="questions-${levelIndex}">
          ${
            level.questions && level.questions.length > 0
              ? level.questions
                  .map(
                    (question, questionIndex) => `
                  <div class="question-item">
                    <span class="question-text">Soal ${questionIndex + 1}</span>
                    <div class="question-actions">
                      <button class="btn-icon" onclick="editQuestion(${levelIndex}, ${questionIndex})">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="btn-icon" onclick="deleteQuestion(${levelIndex}, ${questionIndex})">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                `
                  )
                  .join("")
              : '<p class="text-center">Belum ada soal di level ini.</p>'
          }
        </div>
      `;
      levelCard
        .querySelector(".level-content")
        .addEventListener("click", (e) => {
          if (e.target.closest(".btn-delete-level")) return;
          const questionItems = levelCard.querySelector(".question-items");
          questionItems.classList.toggle("active");
        });
      levelsList.appendChild(levelCard);
    });
  }

  showAddQuestionModal() {
    console.log("showAddQuestionModal called");
    const modal = document.getElementById("questionModal");
    const title = document.getElementById("questionModalTitle");
    const form = document.getElementById("questionForm");
    const levelSelect = document.getElementById("questionLevel");
    const newLevelContainer = document.getElementById("newLevelContainer");

    if (!modal || !title || !form || !levelSelect || !newLevelContainer) {
      console.error("Modal elements not found", {
        modal,
        title,
        form,
        levelSelect,
        newLevelContainer,
      });
      this.showToast("Error: Modal tidak ditemukan!", "error");
      return;
    }

    title.textContent = "Tambah Soal";
    form.reset();
    document.getElementById("questionId").value = "";
    levelSelect.innerHTML =
      '<option value="">Pilih Level</option>' +
      this.levels
        .map(
          (level, index) => `<option value="${index}">${level.name}</option>`
        )
        .join("") +
      '<option value="new">Buat Level Baru</option>';
    newLevelContainer.classList.add("hidden");
    modal.classList.remove("hidden");
    console.log("Modal should be visible now");
  }

  editQuestion(levelIndex, questionIndex) {
    console.log("editQuestion called", { levelIndex, questionIndex });
    const modal = document.getElementById("questionModal");
    const title = document.getElementById("questionModalTitle");
    const form = document.getElementById("questionForm");
    const levelSelect = document.getElementById("questionLevel");
    const questionText = document.getElementById("questionText");
    const option1 = document.getElementById("option1");
    const option2 = document.getElementById("option2");
    const option3 = document.getElementById("option3");
    const option4 = document.getElementById("option4");
    const correctAnswer = document.getElementById("correctAnswer");
    const questionId = document.getElementById("questionId");
    const newLevelContainer = document.getElementById("newLevelContainer");

    if (!modal || !title || !form || !levelSelect || !newLevelContainer) {
      console.error("Modal elements not found");
      return;
    }

    const question = this.levels[levelIndex].questions[questionIndex];
    title.textContent = "Edit Soal";
    levelSelect.innerHTML =
      this.levels
        .map(
          (level, index) =>
            `<option value="${index}" ${
              index === levelIndex ? "selected" : ""
            }>${level.name}</option>`
        )
        .join("") + '<option value="new">Buat Level Baru</option>';
    questionText.value = question.text;
    option1.value = question.options[0];
    option2.value = question.options[1];
    option3.value = question.options[2];
    option4.value = question.options[3];
    correctAnswer.value = question.options.findIndex(
      (opt) => opt === question.correctAnswer
    );
    questionId.value = `${levelIndex},${questionIndex}`;
    newLevelContainer.classList.add("hidden");
    modal.classList.remove("hidden");
  }

  closeQuestionModal() {
    console.log("closeQuestionModal called");
    const modal = document.getElementById("questionModal");
    if (modal) modal.classList.add("hidden");
  }

  saveQuestion() {
    console.log("saveQuestion called");
    const levelSelect = document.getElementById("questionLevel").value;
    const newLevelName = document.getElementById("newLevelName")?.value?.trim();
    const questionText = document.getElementById("questionText").value;
    const option1 = document.getElementById("option1").value;
    const option2 = document.getElementById("option2").value;
    const option3 = document.getElementById("option3").value;
    const option4 = document.getElementById("option4").value;
    const correctAnswerIndex = parseInt(
      document.getElementById("correctAnswer").value
    );
    const questionId = document.getElementById("questionId").value;

    if (
      !questionText ||
      !option1 ||
      !option2 ||
      !option3 ||
      !option4 ||
      isNaN(correctAnswerIndex)
    ) {
      this.showToast("Semua field harus diisi!", "error");
      return;
    }

    if (levelSelect === "" || (levelSelect === "new" && !newLevelName)) {
      this.showToast("Pilih level atau masukkan nama level baru!", "error");
      return;
    }

    let levelIndex;
    if (levelSelect === "new") {
      const newLevel = {
        name: newLevelName,
        questions: [],
      };
      this.levels.push(newLevel);
      levelIndex = this.levels.length - 1;
      const user = this.getCurrentUser();
      user.levels.push({
        score: 0,
        bestTime: 0,
        completed: false,
        currentRepeats: 0,
        requiredRepeats: 2,
      });
    } else {
      levelIndex = parseInt(levelSelect);
    }

    const options = [option1, option2, option3, option4];
    const question = {
      id: questionId
        ? this.levels[levelIndex].questions.length + 1
        : Date.now(),
      text: questionText,
      options,
      correctAnswer: options[correctAnswerIndex],
    };

    if (questionId) {
      const [oldLevelIndex, questionIndex] = questionId.split(",").map(Number);
      if (oldLevelIndex === levelIndex) {
        this.levels[levelIndex].questions[questionIndex] = question;
      } else {
        this.levels[oldLevelIndex].questions.splice(questionIndex, 1);
        this.levels[levelIndex].questions =
          this.levels[levelIndex].questions || [];
        this.levels[levelIndex].questions.push(question);
      }
    } else {
      this.levels[levelIndex].questions =
        this.levels[levelIndex].questions || [];
      this.levels[levelIndex].questions.push(question);
    }

    this.saveLevels();
    this.saveData();
    this.renderQuestions();
    this.closeQuestionModal();
    this.showToast("Soal berhasil disimpan!", "success");
  }

  deleteQuestion(levelIndex, questionIndex) {
    console.log("deleteQuestion called", { levelIndex, questionIndex });
    if (confirm("Apakah Anda yakin ingin menghapus soal ini?")) {
      this.levels[levelIndex].questions.splice(questionIndex, 1);
      this.saveLevels();
      this.renderQuestions();
      this.showToast("Soal berhasil dihapus!", "success");
    }
  }

  deleteLevel(levelIndex) {
    console.log("deleteLevel called", { levelIndex });
    if (
      confirm(
        `Apakah Anda yakin ingin menghapus level ${this.levels[levelIndex].name}?`
      )
    ) {
      const levelName = this.levels[levelIndex].name;
      this.levels.splice(levelIndex, 1);
      const user = this.getCurrentUser();
      user.levels.splice(levelIndex, 1);
      this.saveLevels();
      this.saveData();
      this.renderQuestions();
      this.showToast(`Level ${levelName} berhasil dihapus!`, "success");
    }
  }

  saveLevels() {
    localStorage.setItem("quizLevels", JSON.stringify(this.levels));
  }

  loadSettings() {
    const questionTime = document.getElementById("questionTime");
    const showFeedback = document.getElementById("showFeedback");
    const shuffleQuestions = document.getElementById("shuffleQuestions");
    const darkMode = document.getElementById("darkMode");

    if (questionTime) questionTime.value = this.settings.questionTime;
    if (showFeedback) showFeedback.checked = this.settings.showFeedback;
    if (shuffleQuestions)
      shuffleQuestions.checked = this.settings.shuffleQuestions;
    if (darkMode) darkMode.checked = this.settings.darkMode || false;

    document.documentElement.setAttribute(
      "data-theme",
      this.settings.darkMode ? "dark" : ""
    );
    this.updateLevelRepeatsSettings();
  }

  saveSettings() {
    console.log("saveSettings called");
    const questionTime = document.getElementById("questionTime");
    const showFeedback = document.getElementById("showFeedback");
    const shuffleQuestions = document.getElementById("shuffleQuestions");
    const darkMode = document.getElementById("darkMode");

    if (questionTime) this.settings.questionTime = parseInt(questionTime.value);
    if (showFeedback) this.settings.showFeedback = showFeedback.checked;
    if (shuffleQuestions)
      this.settings.shuffleQuestions = shuffleQuestions.checked;
    if (darkMode) this.settings.darkMode = darkMode.checked;

    document.documentElement.setAttribute(
      "data-theme",
      this.settings.darkMode ? "dark" : ""
    );

    const repeatInputs = document.querySelectorAll(
      "#levelRepeatsSettings input"
    );
    repeatInputs.forEach((input) => {
      const levelIndex = parseInt(input.dataset.level);
      const value = parseInt(input.value);
      if (
        !isNaN(value) &&
        value >= 1 &&
        value <= 10 &&
        this.getCurrentUser().levels[levelIndex].requiredRepeats !== value
      ) {
        this.setLevelRepeats(levelIndex, value, true);
      }
    });

    localStorage.setItem("gameSettings", JSON.stringify(this.settings));
    this.saveData();
    this.showToast("Pengaturan berhasil disimpan!", "success");
    this.closeSettings();
  }

  setLevelRepeats(levelIndex, value, silent = false) {
    const repeats = parseInt(value);
    if (isNaN(repeats) || repeats < 1 || repeats > 10) {
      this.showToast("Jumlah pengulangan harus antara 1 dan 10!", "error");
      return;
    }
    const user = this.getCurrentUser();
    user.levels[levelIndex].requiredRepeats = repeats;
    this.saveData();
    this.updateUI();
    if (!silent) {
      this.showToast(
        `Jumlah pengulangan untuk ${this.levels[levelIndex].name} diatur ke ${repeats}!`,
        "success"
      );
    }
  }

  updateLevelRepeatsSettings() {
    const container = document.getElementById("levelRepeatsSettings");
    if (!container) return;
    container.innerHTML = "";

    if (this.levels.length === 0) {
      const message = document.createElement("div");
      message.className = "text-center";
      message.textContent = "Belum ada level untuk diatur pengulangannya.";
      container.appendChild(message);
      return;
    }

    const user = this.getCurrentUser();
    this.levels.forEach((level, index) => {
      const userLevel = user.levels[index] || { requiredRepeats: 2 };
      const item = document.createElement("div");
      item.className = "level-repeat-item";
      item.innerHTML = `
        <label>${level.name}</label>
        <input type="number" min="1" max="10" value="${userLevel.requiredRepeats}" data-level="${index}">
      `;
      container.appendChild(item);
    });
  }

  saveData() {
    localStorage.setItem("userData", JSON.stringify(this.userData));
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon =
      type === "success"
        ? "fa-check-circle"
        : type === "error"
        ? "fa-exclamation-circle"
        : "fa-info-circle";
    toast.innerHTML = `
      <i class="fas ${icon}"></i>
      <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  showSettings() {
    console.log("showSettings called");
    const settingsModal = document.getElementById("settingsModal");
    if (settingsModal) {
      settingsModal.classList.remove("hidden");
      this.loadSettings();
    } else {
      console.error("Settings modal not found");
      this.showToast("Error: Modal pengaturan tidak ditemukan!", "error");
    }
  }

  closeSettings() {
    console.log("closeSettings called");
    const settingsModal = document.getElementById("settingsModal");
    if (settingsModal) {
      settingsModal.classList.add("hidden");
      const repeatsContainer = document.getElementById("levelRepeatsSettings");
      const toggleIcon = document.getElementById("toggleIcon");
      if (repeatsContainer) repeatsContainer.classList.add("hidden");
      if (toggleIcon) toggleIcon.classList.remove("rotate");
    }
  }
}

// Navigation and Action Functions
function goToDashboard() {
  console.log("goToDashboard called");
  window.location.href = "index.html";
}

function showSettings() {
  console.log("showSettings called");
  game.showSettings();
}

function closeSettings() {
  console.log("closeSettings called");
  game.closeSettings();
}

function toggleLevelRepeats() {
  console.log("toggleLevelRepeats called");
  const repeatsContainer = document.getElementById("levelRepeatsSettings");
  const toggleIcon = document.getElementById("toggleIcon");
  if (repeatsContainer) repeatsContainer.classList.toggle("hidden");
  if (toggleIcon) toggleIcon.classList.toggle("rotate");
}

function showAddQuestionModal() {
  console.log("Global showAddQuestionModal called");
  game.showAddQuestionModal();
}

function closeQuestionModal() {
  console.log("Global closeQuestionModal called");
  game.closeQuestionModal();
}

function editQuestion(levelIndex, questionIndex) {
  console.log("Global editQuestion called", { levelIndex, questionIndex });
  game.editQuestion(levelIndex, questionIndex);
}

function deleteQuestion(levelIndex, questionIndex) {
  console.log("Global deleteQuestion called", { levelIndex, questionIndex });
  game.deleteQuestion(levelIndex, questionIndex);
}

function deleteLevel(levelIndex) {
  console.log("Global deleteLevel called", { levelIndex });
  game.deleteLevel(levelIndex);
}

function toggleNewLevelInput() {
  console.log("toggleNewLevelInput called");
  const levelSelect = document.getElementById("questionLevel");
  const newLevelContainer = document.getElementById("newLevelContainer");
  if (levelSelect.value === "new") {
    newLevelContainer.classList.remove("hidden");
    document.getElementById("newLevelName").focus();
  } else {
    newLevelContainer.classList.add("hidden");
    document.getElementById("newLevelName").value = "";
  }
}

// Initialize Game
let game;
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded, initializing ManageQuestions");
  game = new ManageQuestions();
});

// Export functions for button onclick handlers
window.goToDashboard = goToDashboard;
window.showSettings = showSettings;
window.closeSettings = closeSettings;
window.toggleLevelRepeats = toggleLevelRepeats;
window.showAddQuestionModal = showAddQuestionModal;
window.closeQuestionModal = closeQuestionModal;
window.editQuestion = editQuestion;
window.deleteQuestion = deleteQuestion;
window.deleteLevel = deleteLevel;
window.toggleNewLevelInput = toggleNewLevelInput;
