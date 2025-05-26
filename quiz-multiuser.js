class QuizMultiUser {
  constructor() {
    this.userData = JSON.parse(localStorage.getItem("userData")) || {
      users: [],
      currentUserId: null,
    };
    this.levels = JSON.parse(localStorage.getItem("quizLevels")) || [];
    this.settings = JSON.parse(localStorage.getItem("gameSettings")) || {
      questionTime: 30,
      showFeedback: true,
      shuffleQuestions: true,
      darkMode: false,
    };
    // Pastikan questionTime minimal 1 detik
    if (this.settings.questionTime < 1) {
      this.settings.questionTime = 1;
      localStorage.setItem("gameSettings", JSON.stringify(this.settings));
    }
    this.currentQuiz = {
      level: 0,
      questions: [],
      currentQuestion: 0,
      score: 0,
      startTime: 0,
      timeRemaining: this.settings.questionTime,
      answers: [],
    };
    this.timerInterval = null;
    this.init();
  }

  init() {
    if (!this.userData.currentUserId) {
      window.location.href = "select-user.html";
      return;
    }
    this.updateUI();
    this.generateParticles();
    this.bindEvents();
    this.loadSettings();
  }

  bindEvents() {
    const settingsForm = document.getElementById("settingsForm");
    if (settingsForm) {
      settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveSettings();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (
          document.getElementById("quizModal") &&
          !document.getElementById("quizModal").classList.contains("hidden")
        ) {
          this.closeQuiz();
        } else if (
          document.getElementById("resultModal") &&
          !document.getElementById("resultModal").classList.contains("hidden")
        ) {
          this.closeResult();
        } else if (
          document.getElementById("settingsModal") &&
          !document.getElementById("settingsModal").classList.contains("hidden")
        ) {
          this.closeSettings();
        }
      }
    });
  }

  getCurrentUser() {
    return (
      this.userData.users.find(
        (user) => user.id === this.userData.currentUserId
      ) || {
        gameStats: { totalScore: 0, completedLevels: 0 },
        levels: [],
        name: "Tamu",
      }
    );
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

  updateUI() {
    const user = this.getCurrentUser();
    const totalScore = document.getElementById("totalScore");
    const progressCircle = document.getElementById("progress-circle");
    const progressText = document.getElementById("progressText");
    const userName = document.getElementById("currentUserName");

    if (totalScore) totalScore.textContent = user.gameStats.totalScore;
    if (userName) userName.textContent = user.name;

    if (progressCircle && progressText) {
      const progress = this.levels.length
        ? (user.gameStats.completedLevels / this.levels.length) * 100
        : 0;
      const circumference = 2 * Math.PI * 20;
      const offset = circumference - (progress / 100) * circumference;
      progressCircle.style.strokeDashoffset = offset;
      progressText.textContent = Math.round(progress) + "%";
    }

    this.renderLevels();
    this.updateLevelRepeatsSettings();
  }

  renderLevels() {
    const container = document.getElementById("levelGrid");
    if (!container) return;
    container.innerHTML = "";

    if (this.levels.length === 0) {
      const message = document.createElement("div");
      message.className = "text-center";
      message.textContent =
        "Belum ada level. Hubungi admin untuk menambahkan level!";
      container.appendChild(message);
      return;
    }

    const user = this.getCurrentUser();
    this.levels.forEach((level, index) => {
      const userLevel = user.levels[index] || {
        score: 0,
        bestTime: 0,
        completed: false,
        currentRepeats: 0,
        requiredRepeats: 2,
      };
      const isUnlocked = index < user.gameStats.unlockedLevels;
      const isCompleted =
        userLevel.completed &&
        userLevel.currentRepeats >= userLevel.requiredRepeats;

      const levelCard = document.createElement("div");
      levelCard.className = `level-card ${!isUnlocked ? "locked" : ""} ${
        isCompleted ? "completed" : ""
      }`;
      levelCard.innerHTML = `
        <div class="level-icon">
          <i class="fas ${
            !isUnlocked
              ? "fa-lock"
              : isCompleted
              ? "fa-trophy"
              : "fa-play-circle"
          }"></i>
        </div>
        <div class="level-number">${level.name}</div>
        <div class="level-questions">${level.questions.length} Soal</div>
        ${
          isCompleted
            ? `<div class="level-score">Skor: ${userLevel.score}</div>`
            : ""
        }
        <div class="repeat-status">Pengulangan: ${userLevel.currentRepeats}/${
        userLevel.requiredRepeats
      }</div>
      `;

      if (isUnlocked && !isCompleted) {
        levelCard.addEventListener("click", () => this.startLevel(index));
      }

      container.appendChild(levelCard);
    });
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

  startLevel(levelIndex) {
    const user = this.getCurrentUser();
    if (levelIndex >= user.gameStats.unlockedLevels) {
      this.showToast("Level ini masih terkunci!", "error");
      return;
    }

    const level = this.levels[levelIndex];
    if (!level.questions || level.questions.length === 0) {
      this.showToast("Level ini belum memiliki soal!", "error");
      return;
    }

    this.currentQuiz.level = levelIndex;
    this.currentQuiz.questions = [...level.questions];
    this.currentQuiz.currentQuestion = 0;
    this.currentQuiz.score = 0;
    this.currentQuiz.startTime = Date.now();
    this.currentQuiz.timeRemaining = this.settings.questionTime;
    this.currentQuiz.answers = [];

    if (this.settings.shuffleQuestions) {
      this.shuffleArray(this.currentQuiz.questions);
    }

    this.showQuizModal();
    this.displayQuestion();
    this.startTimer();
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  showQuizModal() {
    const quizModal = document.getElementById("quizModal");
    if (!quizModal) {
      console.error("Quiz modal tidak ditemukan!");
      this.showToast("Error: Modal kuis tidak ditemukan!", "error");
      return;
    }
    quizModal.classList.remove("hidden");
    document.getElementById("currentLevelBadge").textContent =
      this.levels[this.currentQuiz.level].name;
    document.getElementById("totalQuestions").textContent =
      this.currentQuiz.questions.length;
  }

  displayQuestion() {
    const question =
      this.currentQuiz.questions[this.currentQuiz.currentQuestion];
    console.log("Struktur soal saat ini:", question); // Log untuk debugging
    if (!question || !question.text) {
      console.error("Soal tidak ditemukan atau format salah:", question);
      this.showToast("Error: Soal tidak tersedia!", "error");
      return;
    }
    const questionTitle = document.getElementById("questionTitle");
    const currentQuestion = document.getElementById("currentQuestion");
    const optionsContainer = document.getElementById("optionsGrid");
    if (!questionTitle || !currentQuestion || !optionsContainer) {
      console.error("Elemen UI tidak ditemukan:", {
        questionTitle,
        currentQuestion,
        optionsContainer,
      });
      this.showToast("Error: Elemen UI tidak ditemukan!", "error");
      return;
    }
    questionTitle.textContent = question.text;
    currentQuestion.textContent = this.currentQuiz.currentQuestion + 1;
    optionsContainer.innerHTML = "";
    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.className = "option-button";
      button.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
      button.addEventListener("click", () => this.selectAnswer(index));
      optionsContainer.appendChild(button);
    });
    this.updateQuizProgress();
    this.resetQuestionTimer();
  }

  resetQuestionTimer() {
    this.currentQuiz.timeRemaining = this.settings.questionTime;
    const timer = document.getElementById("timer");
    if (timer) {
      timer.textContent = this.currentQuiz.timeRemaining;
    } else {
      console.error("Timer element tidak ditemukan!");
    }
  }

  selectAnswer(selectedIndex) {
    const question =
      this.currentQuiz.questions[this.currentQuiz.currentQuestion];
    const buttons = document.querySelectorAll(".option-button");

    // Hentikan timer
    this.stopTimer();

    // Nonaktifkan tombol untuk mencegah klik berulang
    buttons.forEach((btn) => (btn.style.pointerEvents = "none"));

    // Tentukan indeks jawaban benar
    let correctIndex;
    if (typeof question.correct === "number") {
      correctIndex = question.correct; // Format indeks (jika ada)
    } else if (question.correctAnswer) {
      correctIndex = question.options.findIndex(
        (option) => option === question.correctAnswer
      );
      if (correctIndex === -1) {
        console.error("Jawaban benar tidak ditemukan di opsi:", question);
        this.showToast("Error: Jawaban benar tidak valid!", "error");
        buttons.forEach((btn) => (btn.style.pointerEvents = "auto"));
        return;
      }
    } else {
      console.error("Properti jawaban benar tidak ditemukan:", question);
      this.showToast("Error: Data soal tidak valid!", "error");
      buttons.forEach((btn) => (btn.style.pointerEvents = "auto"));
      return;
    }

    // Catat jawaban
    this.currentQuiz.answers.push({
      questionIndex: this.currentQuiz.currentQuestion,
      selected: selectedIndex,
      correct: correctIndex,
      isCorrect: selectedIndex === correctIndex,
      timeUsed: this.settings.questionTime - this.currentQuiz.timeRemaining,
    });

    // Tambah skor jika jawaban benar
    if (selectedIndex === correctIndex) {
      const points =
        question.difficulty === "easy"
          ? 10
          : question.difficulty === "medium"
          ? 20
          : 30;
      const timeBonus = Math.floor(
        (this.currentQuiz.timeRemaining / this.settings.questionTime) * 5
      );
      this.currentQuiz.score += points + timeBonus;
    }

    // Tampilkan umpan balik jika diaktifkan
    if (this.settings.showFeedback) {
      buttons.forEach((btn, index) => {
        if (index === selectedIndex) {
          btn.classList.add(
            selectedIndex === correctIndex ? "correct" : "incorrect"
          );
        } else if (index === correctIndex) {
          btn.classList.add("correct");
        }
      });
    }

    // Lanjut ke soal berikutnya setelah jeda (jika feedback aktif)
    setTimeout(
      () => {
        buttons.forEach((btn) => {
          btn.classList.remove("correct", "incorrect");
          btn.style.pointerEvents = "auto";
        });
        this.nextQuestion();
      },
      this.settings.showFeedback ? 1000 : 0
    );
  }

  nextQuestion() {
    this.currentQuiz.currentQuestion++;
    if (this.currentQuiz.currentQuestion >= this.currentQuiz.questions.length) {
      this.finishQuiz();
    } else {
      this.displayQuestion();
      this.startTimer();
    }
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.currentQuiz.timeRemaining--;
      const timer = document.getElementById("timer");
      if (timer) {
        timer.textContent = this.currentQuiz.timeRemaining;
      }
      if (this.currentQuiz.timeRemaining <= 0) {
        this.timeOut();
      }
    }, 1000);
  }

  timeOut() {
    this.stopTimer();
    const question =
      this.currentQuiz.questions[this.currentQuiz.currentQuestion];
    const buttons = document.querySelectorAll(".option-button");

    // Nonaktifkan tombol
    buttons.forEach((btn) => (btn.style.pointerEvents = "none"));

    // Tentukan indeks jawaban benar
    let correctIndex;
    if (typeof question.correct === "number") {
      correctIndex = question.correct;
    } else if (question.correctAnswer) {
      correctIndex = question.options.findIndex(
        (option) => option === question.correctAnswer
      );
      if (correctIndex === -1) {
        console.error("Jawaban benar tidak ditemukan di opsi:", question);
        this.showToast("Error: Jawaban benar tidak valid!", "error");
        buttons.forEach((btn) => (btn.style.pointerEvents = "auto"));
        return;
      }
    } else {
      console.error("Properti jawaban benar tidak ditemukan:", question);
      this.showToast("Error: Data soal tidak valid!", "error");
      buttons.forEach((btn) => (btn.style.pointerEvents = "auto"));
      return;
    }

    // Tampilkan umpan balik jika diaktifkan
    if (this.settings.showFeedback) {
      buttons[correctIndex].classList.add("correct");
    }

    // Catat jawaban sebagai salah karena waktu habis
    this.currentQuiz.answers.push({
      questionIndex: this.currentQuiz.currentQuestion,
      selected: -1,
      correct: correctIndex,
      isCorrect: false,
      timeUsed: this.settings.questionTime,
    });

    // Lanjut ke hasil kuis setelah jeda (jika feedback aktif)
    setTimeout(
      () => {
        buttons.forEach((btn) => {
          btn.classList.remove("correct");
          btn.style.pointerEvents = "auto";
        });
        this.failQuiz();
      },
      this.settings.showFeedback ? 1000 : 0
    );
  }

  failQuiz() {
    this.stopTimer();
    const user = this.getCurrentUser();
    const userLevel = user.levels[this.currentQuiz.level];
    const totalTime = Math.floor(
      (Date.now() - this.currentQuiz.startTime) / 1000
    );
    const correctAnswers = this.currentQuiz.answers.filter(
      (a) => a.isCorrect
    ).length;
    const accuracy = Math.round(
      (correctAnswers / this.currentQuiz.questions.length) * 100
    );

    userLevel.score = Math.max(userLevel.score, this.currentQuiz.score);
    this.saveData();

    const quizModal = document.getElementById("quizModal");
    if (quizModal) {
      quizModal.classList.add("hidden");
    }

    const resultModal = document.getElementById("resultModal");
    const resultIcon = document.getElementById("resultIcon");
    const resultTitle = document.getElementById("resultTitle");
    const resultMessage = document.getElementById("resultMessage");

    if (resultModal && resultIcon && resultTitle && resultMessage) {
      resultIcon.className = "result-icon fail";
      resultIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
      resultTitle.textContent = "Belum Berhasil";
      resultMessage.textContent = `Waktu habis atau akurasi di bawah 70%! Anda telah menyelesaikan ${userLevel.currentRepeats}/${userLevel.requiredRepeats} pengulangan. Coba lagi!`;

      document.getElementById("levelScore").textContent =
        this.currentQuiz.score;
      document.getElementById("levelTime").textContent = totalTime + "s";
      document.getElementById("levelAccuracy").textContent = accuracy + "%";
      document.getElementById("nextLevelBtn").style.display = "none";

      resultModal.classList.remove("hidden");
    } else {
      console.error("Result modal elements tidak ditemukan!");
      this.showToast("Error: Modal hasil tidak ditemukan!", "error");
    }

    this.updateUI();
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  finishQuiz() {
    this.stopTimer();
    const user = this.getCurrentUser();
    const userLevel = user.levels[this.currentQuiz.level];
    const totalTime = Math.floor(
      (Date.now() - this.currentQuiz.startTime) / 1000
    );
    const correctAnswers = this.currentQuiz.answers.filter(
      (a) => a.isCorrect
    ).length;
    const accuracy = Math.round(
      (correctAnswers / this.currentQuiz.questions.length) * 100
    );

    const isNewRecord =
      !userLevel.completed || this.currentQuiz.score > userLevel.score;
    userLevel.score = Math.max(userLevel.score, this.currentQuiz.score);
    userLevel.bestTime =
      userLevel.bestTime === 0
        ? totalTime
        : Math.min(userLevel.bestTime, totalTime);

    if (accuracy >= 70) {
      userLevel.currentRepeats = (userLevel.currentRepeats || 0) + 1;
    }

    userLevel.completed = userLevel.currentRepeats >= userLevel.requiredRepeats;

    if (isNewRecord) {
      user.gameStats.totalScore +=
        this.currentQuiz.score - (userLevel.score - this.currentQuiz.score);
    }

    if (
      userLevel.completed &&
      this.currentQuiz.level + 1 === user.gameStats.completedLevels
    ) {
      user.gameStats.completedLevels++;
      user.gameStats.streak++;
    }

    if (
      userLevel.completed &&
      this.currentQuiz.level + 1 >= user.gameStats.unlockedLevels
    ) {
      user.gameStats.unlockedLevels = Math.min(
        user.gameStats.unlockedLevels + 1,
        this.levels.length
      );
    }

    user.gameStats.totalTime += totalTime;

    this.saveData();
    this.showResult(correctAnswers, totalTime, accuracy);
  }

  showResult(correctAnswers, totalTime, accuracy) {
    const quizModal = document.getElementById("quizModal");
    if (quizModal) {
      quizModal.classList.add("hidden");
    }

    const user = this.getCurrentUser();
    const userLevel = user.levels[this.currentQuiz.level];

    const resultModal = document.getElementById("resultModal");
    const resultIcon = document.getElementById("resultIcon");
    const resultTitle = document.getElementById("resultTitle");
    const resultMessage = document.getElementById("resultMessage");

    if (resultModal && resultIcon && resultTitle && resultMessage) {
      if (
        accuracy >= 70 &&
        userLevel.currentRepeats >= userLevel.requiredRepeats
      ) {
        resultIcon.className = "result-icon success";
        resultIcon.innerHTML = '<i class="fas fa-trophy"></i>';
        resultTitle.textContent = "Selamat!";
        resultMessage.textContent = `Anda berhasil menyelesaikan ${
          this.levels[this.currentQuiz.level].name
        } dengan ${userLevel.currentRepeats}/${
          userLevel.requiredRepeats
        } pengulangan!`;
      } else if (accuracy >= 70) {
        resultIcon.className = "result-icon success";
        resultIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
        resultTitle.textContent = "Pengulangan Berhasil!";
        resultMessage.textContent = `Anda telah menyelesaikan pengulangan ${
          userLevel.currentRepeats
        }/${userLevel.requiredRepeats}. Selesaikan ${
          userLevel.requiredRepeats - userLevel.currentRepeats
        } pengulangan lagi untuk membuka level berikutnya!`;
      } else {
        resultIcon.className = "result-icon fail";
        resultIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
        resultTitle.textContent = "Belum Berhasil";
        resultMessage.textContent = `Akurasi Anda di bawah 70%. Anda telah menyelesaikan ${userLevel.currentRepeats}/${userLevel.requiredRepeats} pengulangan. Coba lagi untuk mendapatkan nilai yang lebih baik!`;
      }

      document.getElementById("levelScore").textContent =
        this.currentQuiz.score;
      document.getElementById("levelTime").textContent = totalTime + "s";
      document.getElementById("levelAccuracy").textContent = accuracy + "%";

      const nextBtn = document.getElementById("nextLevelBtn");
      if (
        this.currentQuiz.level + 1 < this.levels.length &&
        userLevel.currentRepeats >= userLevel.requiredRepeats
      ) {
        nextBtn.style.display = "inline-flex";
      } else {
        nextBtn.style.display = "none";
      }

      resultModal.classList.remove("hidden");
    } else {
      console.error("Result modal elements tidak ditemukan!");
      this.showToast("Error: Modal hasil tidak ditemukan!", "error");
    }
    this.updateUI();
  }

  updateQuizProgress() {
    const progress =
      ((this.currentQuiz.currentQuestion + 1) /
        this.currentQuiz.questions.length) *
      100;
    const quizProgress = document.getElementById("quizProgress");
    if (quizProgress) {
      quizProgress.style.width = progress + "%";
    }
  }

  closeQuiz() {
    this.stopTimer();
    const quizModal = document.getElementById("quizModal");
    if (!quizModal) {
      console.error("Quiz modal tidak ditemukan!");
      this.showToast("Error: Modal kuis tidak ditemukan!", "error");
      return;
    }
    quizModal.classList.add("hidden");
  }

  closeResult() {
    const resultModal = document.getElementById("resultModal");
    if (!resultModal) {
      console.error("Result modal tidak ditemukan!");
      this.showToast("Error: Modal hasil tidak ditemukan!", "error");
      return;
    }
    resultModal.classList.add("hidden");
  }

  startNextLevel() {
    this.closeResult();
    if (this.currentQuiz.level + 1 < this.levels.length) {
      this.startLevel(this.currentQuiz.level + 1);
    }
  }

  showSettings() {
    const settingsModal = document.getElementById("settingsModal");
    if (!settingsModal) {
      console.error("Settings modal tidak ditemukan!");
      this.showToast("Error: Modal pengaturan tidak ditemukan!", "error");
      return;
    }
    settingsModal.classList.remove("hidden");
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
    const questionTime = document.getElementById("questionTime");
    const showFeedback = document.getElementById("showFeedback");
    const shuffleQuestions = document.getElementById("shuffleQuestions");
    const darkMode = document.getElementById("darkMode");

    // Validasi questionTime
    const questionTimeValue = questionTime
      ? parseInt(questionTime.value)
      : this.settings.questionTime;
    if (questionTime && (isNaN(questionTimeValue) || questionTimeValue < 1)) {
      this.showToast("Waktu per soal minimal 1 detik!", "error");
      questionTime.value = this.settings.questionTime; // Kembalikan ke nilai sebelumnya
      return;
    }

    if (questionTime) this.settings.questionTime = questionTimeValue;
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
    let changed = false;
    repeatInputs.forEach((input) => {
      const levelIndex = parseInt(input.dataset.level);
      const value = parseInt(input.value);
      if (
        !isNaN(value) &&
        this.getCurrentUser().levels[levelIndex].requiredRepeats !== value
      ) {
        this.setLevelRepeats(levelIndex, value, true);
        changed = true;
      }
    });

    localStorage.setItem("gameSettings", JSON.stringify(this.settings));
    this.saveData();
    this.showToast("Pengaturan berhasil disimpan!", "success");
    this.closeSettings();
  }

  closeSettings() {
    const settingsModal = document.getElementById("settingsModal");
    if (settingsModal) {
      settingsModal.classList.add("hidden");
      const repeatsContainer = document.getElementById("levelRepeatsSettings");
      const toggleIcon = document.getElementById("toggleIcon");
      if (repeatsContainer) repeatsContainer.classList.add("hidden");
      if (toggleIcon) toggleIcon.classList.remove("rotate");
    }
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
}

function goToDashboard() {
  window.location.href = "index.html";
}

function showSettings() {
  console.log("showSettings dipanggil");
  if (!game) {
    console.error("Game object tidak terdefinisi!");
    return;
  }
  game.showSettings();
}

function closeSettings() {
  console.log("closeSettings dipanggil");
  if (!game) {
    console.error("Game object tidak terdefinisi!");
    return;
  }
  game.closeSettings();
}

function toggleLevelRepeats() {
  console.log("toggleLevelRepeats dipanggil");
  const repeatsContainer = document.getElementById("levelRepeatsSettings");
  const toggleIcon = document.getElementById("toggleIcon");
  if (repeatsContainer) repeatsContainer.classList.toggle("hidden");
  if (toggleIcon) toggleIcon.classList.toggle("rotate");
}

function logout() {
  window.location.href = "select-user.html";
}

let game;
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded triggered, initializing QuizMultiUser");
  game = new QuizMultiUser();
});

window.closeQuiz = () => {
  console.log("closeQuiz dipanggil");
  if (!game) {
    console.error("Game object tidak terdefinisi!");
    return;
  }
  game.closeQuiz();
};

window.closeResult = () => {
  console.log("closeResult dipanggil");
  if (!game) {
    console.error("Game object tidak terdefinisi!");
    return;
  }
  game.closeResult();
};

window.startNextLevel = () => {
  console.log("startNextLevel dipanggil");
  if (!game) {
    console.error("Game object tidak terdefinisi!");
    return;
  }
  game.startNextLevel();
};

window.showSettings = showSettings;
window.closeSettings = closeSettings;
window.toggleLevelRepeats = toggleLevelRepeats;
window.goToDashboard = goToDashboard;
window.logout = logout;
