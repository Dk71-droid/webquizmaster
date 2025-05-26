class UserSelect {
  constructor() {
    this.userData = JSON.parse(localStorage.getItem("userData")) || {
      users: [],
      currentUserId: null,
    };
    this.init();
  }

  init() {
    this.bindEvents();
    this.renderUsers();
    this.updateUI();
  }

  bindEvents() {
    const addUserForm = document.getElementById("addUserForm");
    if (addUserForm) {
      addUserForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.addUser();
      });
    }

    const addUserBtn = document.getElementById("addUserBtn");
    if (addUserBtn) {
      addUserBtn.addEventListener("click", () => this.showAddUserModal());
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const addUserModal = document.getElementById("addUserModal");
        if (addUserModal && !addUserModal.classList.contains("hidden")) {
          this.closeAddUserModal();
        }
      }
    });
  }

  renderUsers() {
    const container = document.getElementById("userGrid");
    if (!container) return;
    container.innerHTML = "";

    if (this.userData.users.length === 0) {
      const message = document.createElement("div");
      message.className = "text-center";
      message.textContent = "Belum ada pengguna. Tambahkan pengguna baru!";
      container.appendChild(message);
      return;
    }

    this.userData.users.forEach((user) => {
      const userCard = document.createElement("div");
      userCard.className = "level-card";
      userCard.style.position = "relative";
      userCard.innerHTML = `
        <div class="level-icon">
          <i class="fas fa-user"></i>
        </div>
        <div class="level-number" style="font-size: 1.1rem;">${user.name}</div>
        <div class="level-questions">Level Selesai: ${user.gameStats.completedLevels}</div>
        <i class="fas fa-trash delete-icon" style="position: absolute; top: 10px; right: 10px; cursor: pointer; color: #e74c3c;"></i>
      `;
      userCard.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-icon")) {
          this.deleteUser(user.id);
        } else {
          this.selectUser(user.id);
        }
      });
      container.appendChild(userCard);
    });
  }

  addUser() {
    const userName = document.getElementById("userName").value.trim();
    if (!userName) {
      this.showToast("Nama pengguna tidak boleh kosong!", "error");
      return;
    }

    const levels = JSON.parse(localStorage.getItem("quizLevels")) || [];
    const newUser = {
      id: this.userData.users.length
        ? Math.max(...this.userData.users.map((u) => u.id)) + 1
        : 1,
      name: userName,
      gameStats: {
        totalScore: 0,
        completedLevels: 0,
        streak: 0,
        totalTime: 0,
        unlockedLevels: 1,
      },
      levels: levels.map((level) => ({
        ...level,
        score: 0,
        bestTime: 0,
        completed: false,
        currentRepeats: 0,
      })),
    };

    this.userData.users.push(newUser);
    this.saveData();
    this.renderUsers();
    this.closeAddUserModal();
    this.showToast("Pengguna baru berhasil ditambahkan!", "success");
  }

  deleteUser(userId) {
    if (confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) {
      this.userData.users = this.userData.users.filter(
        (user) => user.id !== userId
      );
      if (this.userData.currentUserId === userId) {
        this.userData.currentUserId = null;
      }
      this.saveData();
      this.renderUsers();
      this.updateUI();
      this.showToast("Pengguna berhasil dihapus!", "success");
    }
  }

  selectUser(userId) {
    this.userData.currentUserId = userId;
    this.saveData();
    window.location.href = "quiz.html";
  }

  showAddUserModal() {
    const modal = document.getElementById("addUserModal");
    if (modal) modal.classList.remove("hidden");
  }

  closeAddUserModal() {
    const modal = document.getElementById("addUserModal");
    if (modal) {
      modal.classList.add("hidden");
      document.getElementById("addUserForm").reset();
    }
  }

  updateUI() {
    const currentUser = this.userData.users.find(
      (user) => user.id === this.userData.currentUserId
    ) || {
      gameStats: { totalScore: 0, completedLevels: 0 },
    };
    const totalScore = document.getElementById("totalScore");
    const progressCircle = document.getElementById("progress-circle");
    const progressText = document.getElementById("progressText");

    if (totalScore) totalScore.textContent = currentUser.gameStats.totalScore;

    if (progressCircle && progressText) {
      const levels = JSON.parse(localStorage.getItem("quizLevels")) || [];
      const progress = levels.length
        ? (currentUser.gameStats.completedLevels / levels.length) * 100
        : 0;
      const circumference = 2 * Math.PI * 20;
      const offset = circumference - (progress / 100) * circumference;
      progressCircle.style.strokeDashoffset = offset;
      progressText.textContent = Math.round(progress) + "%";
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

let userSelect;
document.addEventListener("DOMContentLoaded", () => {
  userSelect = new UserSelect();
});

window.closeAddUserModal = () => userSelect.closeAddUserModal();
window.deleteUser = (userId) => userSelect.deleteUser(userId);
