/**
 * Жуй-Малыш (ChewTracker) - Модуль игр, заданий, челленджа и диплома
 */

// Sound Synthesizer for Crunchy Chewing using Web Audio API
function playCrunchSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.12);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.13);
  } catch (e) {
    // Audio context may require user interaction
  }
}

// "Прожуй яблоко или морковку" Interactive Chewing Game
let chewTimer = null;
let chewsCount = 0;
let chewSecondsLeft = 15;
let isChewGameRunning = false;

window.startChewGame = function(foodType = 'яблочко') {
  const modal = document.getElementById('chewGameModal');
  if (modal) modal.classList.remove('hidden');

  chewsCount = 0;
  chewSecondsLeft = 15;
  isChewGameRunning = true;

  document.getElementById('chewGameFoodName').textContent = foodType;
  document.getElementById('chewCountDisplay').textContent = chewsCount;
  document.getElementById('chewTimerDisplay').textContent = `${chewSecondsLeft}с`;
  document.getElementById('chewMascotIcon').className = 'text-6xl anim-chewing transition-transform select-none cursor-pointer';

  if (chewTimer) clearInterval(chewTimer);

  chewTimer = setInterval(() => {
    chewSecondsLeft--;
    document.getElementById('chewTimerDisplay').textContent = `${chewSecondsLeft}с`;
    if (chewSecondsLeft <= 0) {
      finishChewGame(foodType);
    }
  }, 1000);
};

window.recordChewClick = function() {
  if (!isChewGameRunning) return;
  chewsCount++;
  document.getElementById('chewCountDisplay').textContent = chewsCount;
  playCrunchSound();

  const mascot = document.getElementById('chewMascotIcon');
  mascot.style.transform = 'scale(1.2) rotate(' + (Math.random() * 20 - 10) + 'deg)';
  setTimeout(() => {
    mascot.style.transform = 'scale(1)';
  }, 150);

  if (chewsCount >= 10 && chewSecondsLeft > 0) {
    finishChewGame(document.getElementById('chewGameFoodName').textContent);
  }
};

function finishChewGame(foodName) {
  clearInterval(chewTimer);
  isChewGameRunning = false;
  document.getElementById('chewTimerDisplay').textContent = 'Финиш!';
  document.getElementById('chewMascotIcon').classList.remove('anim-chewing');

  if (window.confetti) {
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
  }

  showToast(`Ура! Сделано ${chewsCount} жевательных движений! Малыш прожевал ${foodName}! 🏆`, 'success');

  // Trigger achievement unlock if eligible
  fetch('/api/achievements/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ code: 'first_chew' })
  }).then(() => {
    if (window.loadAchievements) window.loadAchievements();
  });
}

window.closeChewGame = function() {
  if (chewTimer) clearInterval(chewTimer);
  isChewGameRunning = false;
  const modal = document.getElementById('chewGameModal');
  if (modal) modal.classList.add('hidden');
};

// "Неделя без пюре" Challenge
window.loadChallengeProgress = async function() {
  try {
    const res = await fetch('/api/challenge', { credentials: 'same-origin' });
    const days = await res.json();
    renderChallengeUI(days);
  } catch (err) {
    console.error('Ошибка загрузки челленджа:', err);
  }
};

const CHALLENGE_TIPS = [
  'День 1: Начинаем с очень спелого банана брусочками. Пусть малыш берет сам!',
  'День 2: Паровые соцветия брокколи. Мягкие, текстурные и интересные для захвата.',
  'День 3: Отварная морковь брусочками. Тренируем боковое жевание деснами.',
  'День 4: Паровая тефтелька из индейки, размятая вилкой на микро-комочки.',
  'День 5: Печеное яблочко ломтиками. Первый опыт с легким хрустом!',
  'День 6: Пальчиковый омлет на пару с кабачком. Нежная пористая текстура.',
  'День 7: Финал! Общий обед за семейным столом без единой баночки пюре!'
];

function renderChallengeUI(days) {
  const container = document.getElementById('challengeDaysGrid');
  if (!container) return;

  const completedCount = days.filter(d => d.completed).length;
  document.getElementById('challengeProgressText').textContent = `${completedCount} из 7 дней`;
  document.getElementById('challengeProgressBar').style.width = `${Math.round((completedCount / 7) * 100)}%`;

  container.innerHTML = days.map((day, idx) => {
    const isDone = Boolean(day.completed);
    return `
      <div onclick="toggleChallengeDay(${day.day_number}, ${isDone ? 0 : 1})" 
           class="cursor-pointer p-4 rounded-2xl border transition-all ${
             isDone 
               ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-sm' 
               : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
           }">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-black px-2 py-0.5 rounded-lg ${isDone ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
            День ${day.day_number}
          </span>
          <span class="text-lg">
            ${isDone ? '✅' : '⚪'}
          </span>
        </div>
        <p class="text-xs font-semibold ${isDone ? 'text-emerald-900' : 'text-slate-700'} leading-snug">
          ${CHALLENGE_TIPS[idx] || 'Вводим кусочки!'}
        </p>
      </div>
    `;
  }).join('');
}

window.toggleChallengeDay = async function(dayNumber, newStatus) {
  try {
    const res = await fetch('/api/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ day_number: dayNumber, completed: newStatus })
    });
    const result = await res.json();
    if (result.status === 'success') {
      showToast(newStatus ? `День ${dayNumber} челленджа пройден!` : `День ${dayNumber} сброшен`, 'info');
      window.loadChallengeProgress();

      if (newStatus && window.confetti) {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      }
    }
  } catch (err) {
    console.error('Ошибка переключения дня:', err);
  }
};

// "Диплом: Юный Жеватель" Generator
window.openDiplomaModal = function() {
  const modal = document.getElementById('diplomaModal');
  if (!modal) return;

  const childName = (window.AppState.profile && window.AppState.profile.name) || 'Малыш';
  document.getElementById('diplomaChildName').textContent = childName;
  document.getElementById('diplomaDate').textContent = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  modal.classList.remove('hidden');

  if (window.confetti) {
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 }
    });
  }
};

window.closeDiplomaModal = function() {
  const modal = document.getElementById('diplomaModal');
  if (modal) modal.classList.add('hidden');
};

window.printDiploma = function() {
  window.print();
};
