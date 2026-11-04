/**
 * Жуй-Малыш (ChewTracker) - Модуль профиля ребенка
 */

// Helper to calculate exact age in months and days
function calculateAge(birthDateStr) {
  if (!birthDateStr) return { months: 0, days: 0, text: '' };
  const birth = new Date(birthDateStr);
  const now = new Date();
  
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  const totalMonths = Math.max(0, years * 12 + months);
  return {
    totalMonths,
    days: Math.max(0, days),
    text: `${totalMonths} мес. ${Math.max(0, days)} дн.`
  };
}

const STAGE_LABELS = {
  stage_1: '1 этап: Первое знакомство / микродозы (4-6 мес)',
  stage_2: '2 этап: Гомогенные пюре (6-7 мес)',
  stage_3: '3 этап: Пюре с мягкими микро-комочками (7-8 мес)',
  stage_4: '4 этап: Мягкие кусочки 0.5-1 см (8-9 мес)',
  stage_5: '5 этап: Пальчиковая еда / finger foods (9-10 мес)',
  stage_6: '6 этап: Твердые кусочки и общий стол (11-12+ мес)'
};

// Load Profile
window.loadProfile = async function() {
  try {
    const res = await fetch('/api/profile', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Failed to load profile');
    const profile = await res.json();
    
    // Ensure arrays
    if (!Array.isArray(profile.allergies)) profile.allergies = [];
    if (!Array.isArray(profile.favorite_foods)) profile.favorite_foods = [];
    window.AppState.profile = profile;

    // Update Header Pill
    const ageInfo = calculateAge(profile.birth_date);
    const headerName = document.getElementById('headerChildName');
    const headerAge = document.getElementById('headerChildAge');
    const headerStage = document.getElementById('headerChildStage');

    if (headerName) headerName.textContent = profile.name || 'Малыш';
    if (headerAge) headerAge.textContent = ageInfo.text || `${profile.teeth_count || 0} зубок`;
    if (headerStage) {
      headerStage.textContent = STAGE_LABELS[profile.feeding_stage] 
        ? STAGE_LABELS[profile.feeding_stage].split(':')[0] 
        : 'Прикорм';
    }

    // Toggle welcome onboarding banner
    const welcomeBanner = document.getElementById('trackerWelcomeBanner');
    if (welcomeBanner) {
      if (!profile.name || profile.name === 'Малыш') {
        welcomeBanner.classList.remove('hidden');
      } else {
        welcomeBanner.classList.add('hidden');
      }
    }

    // Populate Form Inputs
    const form = document.getElementById('childProfileForm');
    if (form) {
      form.name.value = profile.name || '';
      form.birth_date.value = profile.birth_date || new Date().toISOString().split('T')[0];
      form.gender.value = profile.gender || 'boy';
      form.feeding_stage.value = profile.feeding_stage || 'stage_1';
      form.teeth_count.value = profile.teeth_count !== undefined ? profile.teeth_count : 0;
      form.gag_reflex_level.value = profile.gag_reflex_level || 'low';
      form.gag_reflex_notes.value = profile.gag_reflex_notes || '';
      form.notes.value = profile.notes || '';
    }

    // Render teeth diagram
    renderTeethMap(profile.teeth_count || 0);

    // Render Allergy tags
    renderAllergyBadges(profile.allergies || []);

    // Render Favorite foods
    renderFavoriteFoods(profile.favorite_foods || []);

  } catch (err) {
    console.error('Ошибка загрузки профиля:', err);
  }
};

// Render interactive teeth map with upper and lower jaw rows
function renderTeethMap(teethCount) {
  const container = document.getElementById('teethVisualMap');
  if (!container) return;

  container.innerHTML = `
    <div class="flex flex-col items-center gap-2 w-full max-w-xs mx-auto">
      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Верхняя челюсть</div>
      <div id="teethUpperRow" class="flex items-center justify-center gap-1.5 sm:gap-2"></div>
      <div class="w-24 h-0.5 bg-slate-200 rounded-full my-1"></div>
      <div id="teethLowerRow" class="flex items-center justify-center gap-1.5 sm:gap-2"></div>
      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Нижняя челюсть</div>
    </div>
  `;

  const upperRow = document.getElementById('teethUpperRow');
  const lowerRow = document.getElementById('teethLowerRow');
  
  for (let idx = 0; idx < 12; idx++) {
    const isErupted = idx < teethCount;
    const btn = document.createElement('div');
    btn.className = `tooth-slot ${isErupted ? 'active' : ''}`;
    btn.textContent = isErupted ? '🦷' : '·';
    btn.title = `Зуб №${idx + 1}: ${isErupted ? 'Прорезался' : 'Еще не прорезался'}`;
    btn.onclick = () => {
      const newCount = idx + 1;
      const teethInput = document.getElementById('profileTeethCount');
      if (teethInput) teethInput.value = newCount;
      renderTeethMap(newCount);
    };
    if (idx < 6) {
      upperRow.appendChild(btn);
    } else {
      lowerRow.appendChild(btn);
    }
  }
}

// Render allergy badges with remove capability
function renderAllergyBadges(allergies) {
  const container = document.getElementById('allergiesList');
  if (!container) return;
  container.innerHTML = '';

  allergies.forEach((allergy, index) => {
    const badge = document.createElement('span');
    badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200';
    badge.innerHTML = `
      <span>⚠️ ${allergy}</span>
      <button type="button" class="hover:text-rose-900 focus:outline-none" onclick="removeAllergy(${index})">&times;</button>
    `;
    container.appendChild(badge);
  });
}

window.removeAllergy = function(index) {
  if (!window.AppState.profile) window.AppState.profile = {};
  if (!Array.isArray(window.AppState.profile.allergies)) window.AppState.profile.allergies = [];
  window.AppState.profile.allergies.splice(index, 1);
  renderAllergyBadges(window.AppState.profile.allergies);
};

window.addAllergy = function() {
  const input = document.getElementById('newAllergyInput');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;
  if (!window.AppState.profile) window.AppState.profile = {};
  if (!Array.isArray(window.AppState.profile.allergies)) window.AppState.profile.allergies = [];
  if (!window.AppState.profile.allergies.includes(val)) {
    window.AppState.profile.allergies.push(val);
    renderAllergyBadges(window.AppState.profile.allergies);
  }
  input.value = '';
};

// Render favorite foods
function renderFavoriteFoods(foods) {
  const container = document.getElementById('favoriteFoodsList');
  if (!container) return;
  container.innerHTML = '';

  foods.forEach((food, index) => {
    const badge = document.createElement('span');
    badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200';
    badge.innerHTML = `
      <span>😋 ${food}</span>
      <button type="button" class="hover:text-emerald-950 focus:outline-none" onclick="removeFavoriteFood(${index})">&times;</button>
    `;
    container.appendChild(badge);
  });
}

window.removeFavoriteFood = function(index) {
  if (!window.AppState.profile) window.AppState.profile = {};
  if (!Array.isArray(window.AppState.profile.favorite_foods)) window.AppState.profile.favorite_foods = [];
  window.AppState.profile.favorite_foods.splice(index, 1);
  renderFavoriteFoods(window.AppState.profile.favorite_foods);
};

window.addFavoriteFood = function() {
  const input = document.getElementById('newFoodInput');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;
  if (!window.AppState.profile) window.AppState.profile = {};
  if (!Array.isArray(window.AppState.profile.favorite_foods)) window.AppState.profile.favorite_foods = [];
  if (!window.AppState.profile.favorite_foods.includes(val)) {
    window.AppState.profile.favorite_foods.push(val);
    renderFavoriteFoods(window.AppState.profile.favorite_foods);
  }
  input.value = '';
};

// Save Profile handler
window.saveProfileHandler = async function(event) {
  event.preventDefault();
  const form = event.target;
  
  const payload = {
    name: form.name.value.trim(),
    birth_date: form.birth_date.value,
    gender: form.gender.value,
    feeding_stage: form.feeding_stage.value,
    teeth_count: parseInt(form.teeth_count.value) || 0,
    allergies: (window.AppState.profile && window.AppState.profile.allergies) || [],
    gag_reflex_level: form.gag_reflex_level.value,
    gag_reflex_notes: form.gag_reflex_notes.value.trim(),
    favorite_foods: (window.AppState.profile && window.AppState.profile.favorite_foods) || [],
    notes: form.notes.value.trim()
  };

  try {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.status === 'success') {
      showToast('Профиль ребенка успешно сохранен!', 'success');
      await window.loadProfile();
    }
  } catch (err) {
    console.error('Error saving profile:', err);
    showToast('Ошибка при сохранении профиля', 'error');
  }
};
