/**
 * Жуй-Малыш (ChewTracker) - Модуль ежедневного трекера питания и жевания
 */

const MEAL_TYPES = {
  breakfast: { title: 'Завтрак', icon: 'sunrise', color: 'amber' },
  lunch: { title: 'Обед', icon: 'sun', color: 'orange' },
  snack: { title: 'Полдник', icon: 'coffee', color: 'teal' },
  dinner: { title: 'Ужин', icon: 'moon', color: 'indigo' }
};

const TEXTURE_INFO = {
  puree: { label: 'Пюре / Гомогенное', class: 'badge-puree', icon: '🥣' },
  soft_pieces: { label: 'Мягкие кусочки', class: 'badge-soft_pieces', icon: '🍲' },
  finger_food: { label: 'Пальчиковая еда', class: 'badge-finger_food', icon: '🥦' },
  solid: { label: 'Твердая пища', class: 'badge-solid', icon: '🥕' }
};

const CHEW_STATUS_INFO = {
  self: { label: 'Жевал сам', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: 'check-circle-2', dotColor: 'bg-emerald-500' },
  with_help: { label: 'Ел с помощью', badge: 'bg-amber-100 text-amber-800 border-amber-300', icon: 'help-circle', dotColor: 'bg-amber-500' },
  refused: { label: 'Отказался', badge: 'bg-rose-100 text-rose-800 border-rose-300', icon: 'x-circle', dotColor: 'bg-rose-500' }
};

// Load meals for given date
window.loadMealsForDate = async function(dateStr) {
  window.AppState.selectedDate = dateStr;
  const dateInput = document.getElementById('trackerDateInput');
  if (dateInput) dateInput.value = dateStr;

  const displayDate = document.getElementById('currentDateDisplay');
  if (displayDate) {
    const d = new Date(dateStr);
    displayDate.textContent = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
  }

  try {
    const res = await fetch(`/api/meals?date=${dateStr}`, { credentials: 'same-origin' });
    const meals = await res.json();
    window.AppState.meals = meals;
    renderMealsChecklist(meals);
    renderDaySummary(meals);
  } catch (err) {
    console.error('Ошибка загрузки приемов пищи:', err);
  }
};

// Render meals cards organized by meal type
function renderMealsChecklist(meals) {
  const container = document.getElementById('mealsContainer');
  if (!container) return;
  container.innerHTML = '';

  const types = ['breakfast', 'lunch', 'snack', 'dinner'];

  types.forEach(type => {
    const typeConfig = MEAL_TYPES[type];
    const typeMeals = meals.filter(m => m.meal_type === type);

    const section = document.createElement('div');
    section.className = 'bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition-all hover:shadow-md';

    let cardsHtml = '';
    if (typeMeals.length === 0) {
      cardsHtml = `
        <div class="py-4 text-center text-slate-400 text-sm italic">
          Пока нет записей. Нажмите «+ Добавить блюдо», чтобы отметить прием пищи.
        </div>
      `;
    } else {
      cardsHtml = typeMeals.map(m => {
        const tex = TEXTURE_INFO[m.texture] || TEXTURE_INFO.soft_pieces;
        const st = CHEW_STATUS_INFO[m.chewing_status] || CHEW_STATUS_INFO.self;
        const gagWarning = m.gag_occurred ? `
          <div class="mt-2 text-xs bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-200 inline-flex items-center gap-1 font-medium">
            <span>⚠️ Сработал рвотный рефлекс</span>
          </div>
        ` : '';

        return `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 mb-2 rounded-xl bg-slate-50 border border-slate-200/70 gap-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-slate-800">${m.food_name}</span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${tex.class}">
                  ${tex.icon} ${tex.label}
                </span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold border inline-flex items-center gap-1 ${st.badge}">
                  <span class="w-1.5 h-1.5 rounded-full ${st.dotColor}"></span>
                  ${st.label}
                </span>
              </div>
              ${m.notes ? `<p class="text-xs text-slate-500 mt-1.5">${m.notes}</p>` : ''}
              ${gagWarning}
            </div>
            <div class="flex items-center gap-2 self-end sm:self-center">
              <button onclick="deleteMealItem(${m.id})" class="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition" title="Удалить запись">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    section.innerHTML = `
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-${typeConfig.color}-100 text-${typeConfig.color}-600 flex items-center justify-center font-bold">
            <i data-lucide="${typeConfig.icon}" class="w-5 h-5"></i>
          </div>
          <div>
            <h3 class="font-bold text-slate-800 text-base leading-tight">${typeConfig.title}</h3>
            <span class="text-xs text-slate-400 font-medium">${typeMeals.length} блюд(а)</span>
          </div>
        </div>
        <button onclick="openAddMealModal('${type}')" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          Добавить
        </button>
      </div>
      <div>${cardsHtml}</div>
    `;

    container.appendChild(section);
  });

  lucide.createIcons();
}

// Calculate and render day stats (chewed independently, solid food ratio, gag episodes)
function renderDaySummary(meals) {
  const container = document.getElementById('daySummaryStats');
  if (!container) return;

  if (meals.length === 0) {
    container.innerHTML = `
      <div class="text-sm text-slate-500 py-2">
        Заполните чек-лист кормлений за сегодня, чтобы увидеть статистику жевательного навыка.
      </div>
    `;
    return;
  }

  const total = meals.length;
  const selfChew = meals.filter(m => m.chewing_status === 'self').length;
  const solidMeals = meals.filter(m => m.texture !== 'puree').length;
  const gagCount = meals.filter(m => m.gag_occurred).length;

  const selfChewPercent = Math.round((selfChew / total) * 100);
  const solidPercent = Math.round((solidMeals / total) * 100);

  container.innerHTML = `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="bg-amber-50/60 p-3.5 rounded-xl border border-amber-100">
        <div class="text-xs text-amber-800 font-medium">Всего блюд</div>
        <div class="text-2xl font-black text-amber-900 mt-1">${total}</div>
        <div class="text-[11px] text-amber-700/80">в дневнике за день</div>
      </div>
      <div class="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
        <div class="text-xs text-emerald-800 font-medium">Жевал сам</div>
        <div class="text-2xl font-black text-emerald-900 mt-1">${selfChewPercent}%</div>
        <div class="text-[11px] text-emerald-700/80">${selfChew} из ${total} приемов</div>
      </div>
      <div class="bg-sky-50/60 p-3.5 rounded-xl border border-sky-100">
        <div class="text-xs text-sky-800 font-medium">Кусочки и твердое</div>
        <div class="text-2xl font-black text-sky-900 mt-1">${solidPercent}%</div>
        <div class="text-[11px] text-sky-700/80">доля текстурной пищи</div>
      </div>
      <div class="bg-purple-50/60 p-3.5 rounded-xl border border-purple-100">
        <div class="text-xs text-purple-800 font-medium">Рвотный рефлекс</div>
        <div class="text-2xl font-black ${gagCount > 0 ? 'text-amber-700' : 'text-purple-900'} mt-1">${gagCount}</div>
        <div class="text-[11px] text-purple-700/80">${gagCount === 0 ? 'Без поперхиваний' : 'Физиологично'}</div>
      </div>
    </div>
  `;
}

// Modal handling
window.openAddMealModal = function(defaultType = 'lunch') {
  const modal = document.getElementById('addMealModal');
  const form = document.getElementById('addMealForm');
  if (!modal || !form) return;

  form.meal_type.value = defaultType;
  form.food_name.value = '';
  form.texture.value = 'soft_pieces';
  form.chewing_status.value = 'self';
  form.gag_occurred.checked = false;
  form.notes.value = '';

  modal.classList.remove('hidden');
};

window.closeAddMealModal = function() {
  const modal = document.getElementById('addMealModal');
  if (modal) modal.classList.add('hidden');
};

// Quick template select
window.applyMealTemplate = function(foodName, texture, notes) {
  const form = document.getElementById('addMealForm');
  if (!form) return;
  form.food_name.value = foodName;
  form.texture.value = texture;
  if (notes) form.notes.value = notes;
};

// Add Meal Form Submit
window.submitMealHandler = async function(event) {
  event.preventDefault();
  const form = event.target;

  const payload = {
    date: window.AppState.selectedDate,
    meal_type: form.meal_type.value,
    food_name: form.food_name.value.trim(),
    texture: form.texture.value,
    chewing_status: form.chewing_status.value,
    gag_occurred: form.gag_occurred.checked ? 1 : 0,
    notes: form.notes.value.trim()
  };

  if (!payload.food_name) {
    showToast('Введите название блюда или продукта', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.status === 'success') {
      showToast('Блюдо успешно добавлено в чек-лист!', 'success');
      closeAddMealModal();
      window.loadMealsForDate(window.AppState.selectedDate);
    }
  } catch (err) {
    console.error('Error adding meal:', err);
    showToast('Ошибка при добавлении блюда', 'error');
  }
};

// Delete meal
window.deleteMealItem = async function(mealId) {
  if (!confirm('Удалить эту запись из чек-листа?')) return;
  try {
    const res = await fetch(`/api/meals/${mealId}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });
    const result = await res.json();
    if (result.status === 'success') {
      showToast('Запись удалена', 'info');
      window.loadMealsForDate(window.AppState.selectedDate);
    }
  } catch (err) {
    console.error('Error deleting meal:', err);
  }
};

// Quick date navigators: Today, Yesterday
window.setTrackerDate = function(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const dateStr = d.toISOString().split('T')[0];
  window.loadMealsForDate(dateStr);
};
