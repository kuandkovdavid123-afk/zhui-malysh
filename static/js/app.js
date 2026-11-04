/**
 * Жуй-Малыш (ChewTracker) - Главный контроллер приложения
 * Поддерживает регистрацию, вход, сессии пользователей и синхронизацию данных.
 */

// Global App State
window.AppState = {
  user: null,
  currentTab: 'tracker',
  profile: null,
  meals: [],
  analytics: null,
  achievements: [],
  selectedDate: new Date().toISOString().split('T')[0]
};

// UI Toast Notification Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const bgColors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-slate-800 text-white'
  };

  const toast = document.createElement('div');
  toast.className = `flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all duration-300 transform translate-y-2 opacity-0 ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info'}" class="w-4 h-4"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
window.showToast = showToast;

// Global function to close all open modals
function closeAllModals() {
  if (window.closeAuthModal) closeAuthModal();
  if (window.closeDoctorReportModal) closeDoctorReportModal();
  if (window.closeAddMealModal) closeAddMealModal();
  if (window.closeChewGame) closeChewGame();
  if (window.closeDiplomaModal) closeDiplomaModal();
  if (window.closeNewPostModal) closeNewPostModal();
}
window.closeAllModals = closeAllModals;

// Global ESC key listener to close any open modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
    closeAllModals();
  }
});

// Navigation Tab Switcher
function switchTab(tabId) {
  window.AppState.currentTab = tabId;

  // Update tabs UI
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle('text-amber-600', isActive);
    btn.classList.toggle('bg-amber-50', isActive);
    btn.classList.toggle('border-amber-500', isActive);
    btn.classList.toggle('text-slate-600', !isActive);
    btn.classList.toggle('border-transparent', !isActive);
  });

  // Update mobile bottom nav UI
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle('text-amber-600', isActive);
    btn.classList.toggle('text-slate-500', !isActive);
  });

  // Toggle content sections
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.add('hidden');
  });
  const targetPane = document.getElementById(`pane-${tabId}`);
  if (targetPane) {
    targetPane.classList.remove('hidden');
  }

  // Refresh tab-specific data / charts
  if (tabId === 'analytics') {
    if (window.loadAnalyticsData) window.loadAnalyticsData();
  } else if (tabId === 'tracker') {
    if (window.loadMealsForDate) window.loadMealsForDate(window.AppState.selectedDate);
  } else if (tabId === 'games') {
    if (window.loadChallengeProgress) window.loadChallengeProgress();
  } else if (tabId === 'community') {
    if (window.loadForumPosts) window.loadForumPosts();
  }

  // Scroll to top smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.switchTab = switchTab;

// ==================== AUTHENTICATION UI & LOGIC ====================

window.openAuthModal = function(tab = 'register') {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  window.switchAuthTab(tab);
  lucide.createIcons();
};

window.closeAuthModal = function() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.add('hidden');
};

window.switchAuthTab = function(tab) {
  const registerForm = document.getElementById('authRegisterForm');
  const loginForm = document.getElementById('authLoginForm');
  const tabBtnRegister = document.getElementById('authTabBtnRegister');
  const tabBtnLogin = document.getElementById('authTabBtnLogin');

  const regError = document.getElementById('regError');
  const loginError = document.getElementById('loginError');
  if (regError) regError.classList.add('hidden');
  if (loginError) loginError.classList.add('hidden');

  if (tab === 'login') {
    if (registerForm) registerForm.classList.add('hidden');
    if (loginForm) loginForm.classList.remove('hidden');
    if (tabBtnLogin) {
      tabBtnLogin.className = 'flex-1 py-2 text-xs font-black rounded-xl transition bg-white text-amber-700 shadow-sm';
    }
    if (tabBtnRegister) {
      tabBtnRegister.className = 'flex-1 py-2 text-xs font-black rounded-xl transition text-slate-500 hover:text-slate-800';
    }
  } else {
    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.remove('hidden');
    if (tabBtnRegister) {
      tabBtnRegister.className = 'flex-1 py-2 text-xs font-black rounded-xl transition bg-white text-amber-700 shadow-sm';
    }
    if (tabBtnLogin) {
      tabBtnLogin.className = 'flex-1 py-2 text-xs font-black rounded-xl transition text-slate-500 hover:text-slate-800';
    }
  }
  lucide.createIcons();
};

function updateAuthHeaderUI(user) {
  const userHeaderSection = document.getElementById('userHeaderSection');
  const authHeaderButtons = document.getElementById('authHeaderButtons');
  const headerUserName = document.getElementById('headerUserName');

  if (user) {
    if (userHeaderSection) userHeaderSection.classList.remove('hidden');
    if (authHeaderButtons) authHeaderButtons.classList.add('hidden');
    if (headerUserName) headerUserName.textContent = user.username || user.email;
  } else {
    if (userHeaderSection) userHeaderSection.classList.add('hidden');
    if (authHeaderButtons) authHeaderButtons.classList.remove('hidden');
  }
}

window.checkAuthStatus = async function() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    const data = await res.json();
    if (data.authenticated && data.user) {
      window.AppState.user = data.user;
      updateAuthHeaderUI(data.user);
      await reloadAllUserData();
      return true;
    } else {
      window.AppState.user = null;
      updateAuthHeaderUI(null);
      // Если не авторизован, открываем модалку регистрации/входа
      window.openAuthModal('register');
      return false;
    }
  } catch (e) {
    console.error('Ошибка проверки статуса авторизации:', e);
    updateAuthHeaderUI(null);
    return false;
  }
};

window.handleRegister = async function(event) {
  event.preventDefault();
  const regError = document.getElementById('regError');
  if (regError) regError.classList.add('hidden');

  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const passwordConfirm = document.getElementById('regPasswordConfirm').value;

  const childName = (document.getElementById('regChildName')?.value || '').trim();
  const childBirth = document.getElementById('regChildBirth')?.value || '';
  const childGender = document.getElementById('regChildGender')?.value || 'boy';
  const childStage = document.getElementById('regChildStage')?.value || 'stage_1';

  if (password !== passwordConfirm) {
    if (regError) {
      regError.textContent = 'Пароли не совпадают. Пожалуйста, проверьте правильность ввода.';
      regError.classList.remove('hidden');
    }
    return;
  }

  if (password.length < 4) {
    if (regError) {
      regError.textContent = 'Пароль должен быть длиной не менее 4 символов.';
      regError.classList.remove('hidden');
    }
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        username,
        email,
        password,
        child_name: childName,
        child_birth_date: childBirth,
        child_gender: childGender,
        child_stage: childStage
      })
    });

    const data = await res.json();
    if (!res.ok || data.status === 'error') {
      if (regError) {
        regError.textContent = data.message || 'Ошибка регистрации.';
        regError.classList.remove('hidden');
      }
      return;
    }

    if (window.confetti) {
      window.confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }

    window.AppState.user = data.user;
    updateAuthHeaderUI(data.user);
    window.closeAuthModal();
    showToast(`Добро пожаловать, ${data.user.username}! Аккаунт создан.`, 'success');

    await reloadAllUserData();

    // Если имя ребенка не было заполнено, перенаправляем на вкладку профиля
    if (!childName) {
      switchTab('profile');
      showToast('Заполните данные вашего малыша, чтобы начать вести трекер', 'info');
    } else {
      switchTab('tracker');
    }
  } catch (err) {
    console.error('Registration error:', err);
    if (regError) {
      regError.textContent = 'Сетевая ошибка при регистрации. Повторите попытку.';
      regError.classList.remove('hidden');
    }
  }
};

window.handleLogin = async function(event) {
  event.preventDefault();
  const loginError = document.getElementById('loginError');
  if (loginError) loginError.classList.add('hidden');

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok || data.status === 'error') {
      if (loginError) {
        loginError.textContent = data.message || 'Неверный email или пароль.';
        loginError.classList.remove('hidden');
      }
      return;
    }

    window.AppState.user = data.user;
    updateAuthHeaderUI(data.user);
    window.closeAuthModal();
    showToast(`С возвращением, ${data.user.username}!`, 'success');

    await reloadAllUserData();
    switchTab('tracker');
  } catch (err) {
    console.error('Login error:', err);
    if (loginError) {
      loginError.textContent = 'Ошибка соединения при входе.';
      loginError.classList.remove('hidden');
    }
  }
};

window.handleDemoLogin = async function() {
  try {
    const res = await fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    });
    const data = await res.json();
    if (data.status === 'success') {
      window.AppState.user = data.user;
      updateAuthHeaderUI(data.user);
      window.closeAuthModal();
      showToast('Вы вошли в демо-аккаунт (Тимофей, 9 мес)', 'info');
      await reloadAllUserData();
      switchTab('tracker');
    }
  } catch (err) {
    console.error('Demo login error:', err);
  }
};

window.handleLogout = async function() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });
  } catch (e) {
    console.error(e);
  }
  window.AppState.user = null;
  updateAuthHeaderUI(null);
  showToast('Вы вышли из своего аккаунта', 'info');
  window.openAuthModal('login');
};

async function reloadAllUserData() {
  if (window.loadProfile) await window.loadProfile();
  if (window.loadMealsForDate) await window.loadMealsForDate(window.AppState.selectedDate);
  if (window.loadAchievements) await window.loadAchievements();
  if (window.loadChallengeProgress) await window.loadChallengeProgress();
}
window.reloadAllUserData = reloadAllUserData;

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  lucide.createIcons();

  // Setup tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Check user authentication
  await window.checkAuthStatus();

  // Check Web Speech API availability for Smart Speaker simulator
  if (!('speechSynthesis' in window)) {
    console.info('Синтез речи не поддерживается данным браузером, умная колонка будет работать в текстовом режиме');
  }
});
