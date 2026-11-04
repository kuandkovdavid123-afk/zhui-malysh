/**
 * Жуй-Малыш (ChewTracker) - Модуль обучения, инфографики и безопасной нарезки
 */

// Safe Cutting Guide Database
const CUTTING_GUIDE_DATA = {
  apple: {
    name: 'Яблоко',
    icon: '🍎',
    danger: 'Сырое твердое яблоко круглыми дольками — одна из главных причин удушья у детей до 3 лет!',
    safeWays: [
      { age: '6-8 мес', method: 'Запеченное половинками или на пару до полной мягкости (легко сминается губами).' },
      { age: '9-12 мес', method: 'Натертое на крупной/мелкой терке тонкой стружкой или томленое ломтиками.' },
      { age: '12+ мес', method: 'Тончайшие слайсы (полупрозрачные пластинки толщиной 1-2 мм).' }
    ],
    prepTip: 'Никаких круглых твердых кубиков! Текстура должна сминаться между вашим указательным и большим пальцем.'
  },
  carrot: {
    name: 'Морковь',
    icon: '🥕',
    danger: 'Сырая морковь кружочками способна полностью перекрыть дыхательные пути младенца.',
    safeWays: [
      { age: '6-9 мес', method: 'Отваренная на пару брусочками размером с указательный палец взрослого. Мягкая, держит форму.' },
      { age: '9-12 мес', method: 'Отварная мягкая соломка или мелкие кубики 5х5 мм для пинцетного захвата.' },
      { age: '12+ мес', method: 'Сырая морковь — ТОЛЬКО натертая на мелкой терке в салаты.' }
    ],
    prepTip: 'Тест на готовность: сожмите брусочек двумя пальцами — он должен легко размяться в пюре.'
  },
  grape: {
    name: 'Виноград и томаты черри',
    icon: '🍇',
    danger: 'Круглая скользкая форма идеально совпадает с диаметром трахеи ребенка!',
    safeWays: [
      { age: '6-9 мес', method: 'Снять кожицу, удалить косточки, разрезать ВДОЛЬ на 4 продолговатые части.' },
      { age: '9-12 мес', method: 'Разрез вдоль на 4 части, затем поперек на мелкие кусочки.' },
      { age: '1-3 года', method: 'Всегда разрезать вдоль минимум пополам! Целиком давать запрещено до 4-5 лет.' }
    ],
    prepTip: 'Главное правило: никогда не режьте поперек кружочками! Только продольный разрез «лодочками».'
  },
  banana: {
    name: 'Банан и Авокадо',
    icon: '🍌',
    danger: 'Слишком спелый банан может быть скользким и выпадать из кулачка, вызывая раздражение малыша.',
    safeWays: [
      { age: '6-8 мес', method: 'Половинка банана с частично сохраненной кожурой снизу (ребенок держит за кожуру как за ручку).' },
      { age: '8-10 мес', method: 'Разделенный вдоль на 3 естественные волокнистые полоски (нажмите пальцем в центр торца очищенного банана).' },
      { age: '10+ мес', method: 'Поперечные шайбочки, обвалянные в детском печенье или молотых льняных семенах (чтобы не скользили).' }
    ],
    prepTip: 'Авокадо подавайте рифленым ножом для фигурной нарезки, чтобы ручка не соскальзывала.'
  },
  meat: {
    name: 'Мясо и Птица (Индейка, Кролик, Говядина)',
    icon: '🍗',
    danger: 'Сухие крупные волокна мяса — главный триггер срабатывания рвотного рефлекса.',
    safeWays: [
      { age: '6-8 мес', method: 'Нежные суфле на пару или паштеты, размятые вилкой до волокон 1-2 мм.' },
      { age: '8-10 мес', method: 'Мягкие паровые тефтельки и фрикадельки, легко рассыпающиеся во рту.' },
      { age: '10+ мес', method: 'Волокна тушеного мягкого мяса, разобранные вручную поперек волокон.' }
    ],
    prepTip: 'Добавляйте в мясной фарш кабачок или цветную капусту для сохранения сочности.'
  }
};

window.renderCuttingGuide = function(productKey = 'apple') {
  const container = document.getElementById('cuttingGuideContent');
  if (!container) return;

  const data = CUTTING_GUIDE_DATA[productKey];
  if (!data) return;

  // Highlight selected filter button
  document.querySelectorAll('.cutting-btn').forEach(btn => {
    const isSelected = btn.dataset.product === productKey;
    btn.classList.toggle('bg-amber-500', isSelected);
    btn.classList.toggle('text-white', isSelected);
    btn.classList.toggle('bg-slate-100', !isSelected);
    btn.classList.toggle('text-slate-700', !isSelected);
  });

  container.innerHTML = `
    <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-3xl">${data.icon}</span>
        <div>
          <h3 class="text-xl font-bold text-slate-800">${data.name}</h3>
          <p class="text-xs text-slate-400">Правила безопасной подачи и нарезки по возрастам</p>
        </div>
      </div>

      <!-- Danger alert -->
      <div class="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl mb-5">
        <div class="flex items-start gap-2">
          <i data-lucide="alert-octagon" class="w-5 h-5 text-rose-600 shrink-0 mt-0.5"></i>
          <div>
            <h5 class="text-xs font-bold text-rose-900 uppercase tracking-wider">В чем опасность круглой/сырой подачи?</h5>
            <p class="text-sm text-rose-800 mt-0.5">${data.danger}</p>
          </div>
        </div>
      </div>

      <!-- Age Steps -->
      <div class="space-y-3 mb-5">
        <h4 class="font-bold text-slate-800 text-sm flex items-center gap-2">
          <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
          Безопасная подача по этапам развития:
        </h4>
        ${data.safeWays.map((item, idx) => `
          <div class="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <span class="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold shrink-0">
              ${item.age}
            </span>
            <p class="text-sm text-slate-700 font-medium">${item.method}</p>
          </div>
        `).join('')}
      </div>

      <!-- Chef / Nutritionist Tip -->
      <div class="bg-amber-50 rounded-xl p-4 border border-amber-200/80 flex items-start gap-3">
        <i data-lucide="lightbulb" class="w-5 h-5 text-amber-600 shrink-0 mt-0.5"></i>
        <div class="text-xs text-amber-900">
          <span class="font-bold">Лайфхак нутрициолога:</span> ${data.prepTip}
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();
};

// Interactive Video Lessons data
const VIDEO_LESSONS = [
  {
    id: 1,
    title: 'Как жевание развивает речь и прикус: анатомия челюсти',
    duration: '3:45 мин',
    badge: 'Логопедия',
    summary: 'Объяснение логопеда: как боковые движения языка при жевании готовят артикуляцию к звукам Р, Ш, Ж.',
    thumbnail: '🦷',
    takeaways: ['Стимуляция роста нижней челюсти', 'Формирование правильного небного свода', 'Тонус круговой мышцы рта против слюнотечения']
  },
  {
    id: 2,
    title: 'Рвотный рефлекс против удушья: как сохранять спокойствие',
    duration: '4:10 мин',
    badge: 'Безопасность',
    summary: 'Практический видео-разбор: почему красное лицо и кашель — это защитный рефлекс, а не повод для паники.',
    thumbnail: '🛡️',
    takeaways: ['Физиология перемещения рецепторов', 'Почему нельзя хлопать по спине сидящего', 'Как научить малыша выплевывать']
  },
  {
    id: 3,
    title: 'Техника нарезки finger foods: первый брусочек',
    duration: '2:50 мин',
    badge: 'Прикорм',
    summary: 'Пошаговый мастер-класс: правильная плотность, форма брусочка и пальчиковый захват.',
    thumbnail: '🥕',
    takeaways: ['Правило двух пальцев для проверки мягкости', 'Длина брусочка под детский кулачок', 'Как избежать страха перед кусочками']
  }
];

window.renderVideoLessons = function() {
  const container = document.getElementById('videoLessonsList');
  if (!container) return;

  container.innerHTML = VIDEO_LESSONS.map(vid => `
    <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover-lift">
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-2xl">${vid.thumbnail}</span>
          <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 flex items-center gap-1">
            <i data-lucide="clock" class="w-3 h-3"></i> ${vid.duration}
          </span>
        </div>
        <span class="text-[11px] font-bold uppercase tracking-wider text-amber-600">${vid.badge}</span>
        <h4 class="font-bold text-slate-800 text-base mt-1 leading-snug">${vid.title}</h4>
        <p class="text-xs text-slate-500 mt-2 leading-relaxed">${vid.summary}</p>

        <div class="mt-4 pt-3 border-t border-slate-100">
          <div class="text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Ключевые тезисы:</div>
          <ul class="space-y-1">
            ${vid.takeaways.map(t => `
              <li class="text-xs text-slate-600 flex items-center gap-1.5">
                <i data-lucide="check" class="w-3 h-3 text-emerald-500"></i> ${t}
              </li>
            `).join('')}
          </ul>
        </div>
      </div>

      <button onclick="playLessonModal(${vid.id})" class="mt-5 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition">
        <i data-lucide="play" class="w-4 h-4"></i> Смотреть урок
      </button>
    </div>
  `).join('');

  lucide.createIcons();
};

window.playLessonModal = function(lessonId) {
  const lesson = VIDEO_LESSONS.find(l => l.id === lessonId);
  if (!lesson) return;
  showToast(`Запуск обучающего урока: «${lesson.title}»`, 'info');
};

document.addEventListener('DOMContentLoaded', () => {
  renderCuttingGuide('apple');
  renderVideoLessons();
});
