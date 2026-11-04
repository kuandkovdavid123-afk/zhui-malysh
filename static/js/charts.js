/**
 * Жуй-Малыш (ChewTracker) - Модуль диаграмм, аналитики и жевательных медалей
 */

let textureChartInstance = null;
let chewingDynamicsChartInstance = null;

window.loadAnalyticsData = async function() {
  try {
    const res = await fetch('/api/analytics', { credentials: 'same-origin' });
    const data = await res.json();
    window.AppState.analytics = data;

    renderAnalyticsKPIs(data);
    renderTextureChart(data.texture_counts);
    renderDynamicsChart(data.daily_dynamics);
    loadAchievements();
  } catch (err) {
    console.error('Ошибка аналитики:', err);
  }
};

function renderAnalyticsKPIs(data) {
  const container = document.getElementById('analyticsKPIs');
  if (!container) return;

  container.innerHTML = `
    <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Доля твердой пищи</span>
        <span class="p-2 rounded-xl bg-amber-50 text-amber-600"><i data-lucide="pie-chart" class="w-4 h-4"></i></span>
      </div>
      <div class="text-3xl font-extrabold text-slate-800">${data.solid_percent}%</div>
      <p class="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
        <i data-lucide="trending-up" class="w-3.5 h-3.5"></i> +18% к прошлой неделе
      </p>
    </div>

    <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Жевал самостоятельно</span>
        <span class="p-2 rounded-xl bg-emerald-50 text-emerald-600"><i data-lucide="check-circle" class="w-4 h-4"></i></span>
      </div>
      <div class="text-3xl font-extrabold text-slate-800">${data.self_chew_percent}%</div>
      <p class="text-xs text-slate-500 font-medium mt-1">
        ${data.chewing_counts.self} из ${data.total_meals} приемов пищи
      </p>
    </div>

    <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Рвотный рефлекс</span>
        <span class="p-2 rounded-xl bg-purple-50 text-purple-600"><i data-lucide="shield" class="w-4 h-4"></i></span>
      </div>
      <div class="text-3xl font-extrabold text-slate-800">${data.gag_count}</div>
      <p class="text-xs text-slate-500 font-medium mt-1">
        Эпизодов адаптации за все время
      </p>
    </div>

    <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Врачебная готовность</span>
        <span class="p-2 rounded-xl bg-sky-50 text-sky-600"><i data-lucide="file-check" class="w-4 h-4"></i></span>
      </div>
      <div class="text-2xl font-black text-sky-600">Готов к отчету</div>
      <p class="text-xs text-slate-500 font-medium mt-1">
        Сформирован клинический файл
      </p>
    </div>
  `;
  lucide.createIcons();
}

function renderTextureChart(counts) {
  const ctx = document.getElementById('textureDoughnutChart');
  if (!ctx) return;

  if (textureChartInstance) {
    textureChartInstance.destroy();
  }

  const labels = ['Пюре', 'Мягкие кусочки', 'Пальчиковая еда', 'Твердые продукты'];
  const values = [
    counts.puree || 0,
    counts.soft_pieces || 0,
    counts.finger_food || 0,
    counts.solid || 0
  ];

  textureChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#fbbf24', // Puree
          '#38bdf8', // Soft pieces
          '#34d399', // Finger food
          '#f472b6'  // Solid
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: { family: 'Nunito', size: 12 }
          }
        }
      },
      cutout: '68%'
    }
  });
}

function renderDynamicsChart(dailyDynamics) {
  const ctx = document.getElementById('chewingDynamicsChart');
  if (!ctx) return;

  if (chewingDynamicsChartInstance) {
    chewingDynamicsChartInstance.destroy();
  }

  const labels = dailyDynamics.map(d => {
    const parts = d.date.split('-');
    return `${parts[2]}.${parts[1]}`;
  });

  const selfChewData = dailyDynamics.map(d => d.self);
  const helpData = dailyDynamics.map(d => d.with_help);
  const solidRatioData = dailyDynamics.map(d => d.solid_ratio);

  chewingDynamicsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Жевал сам (блюд)',
          data: selfChewData,
          backgroundColor: '#10b981',
          borderRadius: 6
        },
        {
          label: 'С помощью (блюд)',
          data: helpData,
          backgroundColor: '#f59e0b',
          borderRadius: 6
        },
        {
          label: 'Доля твердого (%)',
          data: solidRatioData,
          type: 'line',
          borderColor: '#8b5cf6',
          backgroundColor: '#8b5cf6',
          borderWidth: 3,
          yAxisID: 'y1',
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        x: {
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Кол-во блюд' }
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          max: 100,
          title: { display: true, text: '% твердой пищи' },
          grid: { drawOnChartArea: false }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Nunito', size: 12 } }
        }
      }
    }
  });
}

// Achievements / Medals
window.loadAchievements = async function() {
  try {
    const res = await fetch('/api/achievements', { credentials: 'same-origin' });
    const achievements = await res.json();
    window.AppState.achievements = achievements;
    renderAchievements(achievements);
  } catch (err) {
    console.error('Ошибка загрузки медалей:', err);
  }
};

function renderAchievements(achievements) {
  const container = document.getElementById('achievementsGrid');
  if (!container) return;
  container.innerHTML = '';

  achievements.forEach(ach => {
    const card = document.createElement('div');
    const isUnlocked = Boolean(ach.unlocked);

    card.className = `p-4 rounded-2xl border transition-all ${
      isUnlocked 
        ? 'bg-gradient-to-br from-amber-50/70 to-orange-50/50 border-amber-200 shadow-sm' 
        : 'bg-slate-50/80 border-slate-200 opacity-60'
    }`;

    card.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
          isUnlocked 
            ? 'bg-amber-400 text-amber-950 shadow-md shadow-amber-200' 
            : 'bg-slate-200 text-slate-400'
        }">
          <i data-lucide="${ach.icon || 'award'}" class="w-6 h-6"></i>
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-slate-800 text-sm">${ach.title}</h4>
            ${isUnlocked 
              ? `<span class="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Открыто!</span>` 
              : `<span class="text-[10px] text-slate-400 font-medium">В процессе</span>`}
          </div>
          <p class="text-xs text-slate-500 mt-1">${ach.description}</p>
          ${ach.unlocked_at ? `<div class="text-[10px] text-slate-400 mt-1.5 font-medium">Получено: ${ach.unlocked_at}</div>` : ''}
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  lucide.createIcons();
}
