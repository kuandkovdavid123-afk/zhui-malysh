/**
 * Жуй-Малыш (ChewTracker) - Модуль клинической выгрузки отчета для врача
 */

window.openDoctorReportModal = async function() {
  const modal = document.getElementById('doctorModal');
  if (!modal) return;

  try {
    const res = await fetch('/api/doctor-report', { credentials: 'same-origin' });
    const report = await res.json();
    renderDoctorReport(report);
    modal.classList.remove('hidden');
  } catch (err) {
    console.error('Ошибка генерации отчета для врача:', err);
    showToast('Не удалось сформировать отчет для врача', 'error');
  }
};

window.closeDoctorReportModal = function() {
  const modal = document.getElementById('doctorModal');
  if (modal) modal.classList.add('hidden');
};

function renderDoctorReport(report) {
  const container = document.getElementById('doctorReportContent');
  if (!container) return;

  const child = report.child || {};
  const sum = report.period_summary || {};
  const meals = report.recent_meals || [];

  const allergiesStr = (child.allergies && child.allergies.length > 0) 
    ? child.allergies.join(', ') 
    : 'Не зафиксированы';

  const gagLevels = {
    low: 'Низкая (редкие поперхивания)',
    medium: 'Умеренная физиологическая (адаптация к волокнам)',
    high: 'Повышенная гиперчувствительность (требует массажа десен)'
  };

  const mealsRows = meals.map((m, idx) => `
    <tr class="border-b border-slate-200 text-xs">
      <td class="py-2 px-3 text-slate-500">${m.date}</td>
      <td class="py-2 px-3 font-medium text-slate-800">${m.food_name}</td>
      <td class="py-2 px-3">
        <span class="px-2 py-0.5 rounded text-[11px] font-semibold ${
          m.texture === 'puree' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
        }">
          ${m.texture === 'puree' ? 'Пюре' : m.texture === 'soft_pieces' ? 'Кусочки' : 'Твердое'}
        </span>
      </td>
      <td class="py-2 px-3 font-semibold ${
        m.chewing_status === 'self' ? 'text-emerald-700' : m.chewing_status === 'with_help' ? 'text-amber-700' : 'text-rose-700'
      }">
        ${m.chewing_status === 'self' ? 'Жевал сам' : m.chewing_status === 'with_help' ? 'С помощью' : 'Отказ'}
      </td>
      <td class="py-2 px-3 text-center">
        ${m.gag_occurred ? '<span class="text-rose-600 font-bold">Да (рефлекс)</span>' : '<span class="text-slate-400">Нет</span>'}
      </td>
      <td class="py-2 px-3 text-slate-500 italic">${m.notes || '—'}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <!-- Medical Report Header -->
    <div class="border-b-2 border-slate-800 pb-4 mb-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">Система мониторинга детского прикорма и челюстного аппарата «Жуй-Малыш»</div>
          <h2 class="text-xl sm:text-2xl font-black text-slate-900 mt-1">ВЫПИСКА ДЛЯ ЛЕЧАЩЕГО ВРАЧА</h2>
          <div class="text-xs text-slate-500 mt-0.5">Для педиатра, детского стоматолога, ортодонта, логопеда-дефектолога</div>
        </div>
        <div class="text-left sm:text-right text-xs text-slate-600 bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
          <div><span class="font-bold">Дата выгрузки:</span> ${report.generated_at}</div>
          <div><span class="font-bold">Протокол:</span> ESPGHAN / Союз педиатров</div>
        </div>
      </div>
    </div>

    <!-- Patient Details Card -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-5 text-xs">
      <div>
        <div class="mb-1.5"><span class="text-slate-500 font-bold">Пациент:</span> <span class="font-black text-slate-800 text-sm">${child.name || 'Малыш'}</span></div>
        <div class="mb-1.5"><span class="text-slate-500 font-bold">Дата рождения:</span> ${child.birth_date || '—'}</div>
        <div class="mb-1.5"><span class="text-slate-500 font-bold">Количество зубов:</span> <span class="font-bold text-slate-800">${child.teeth_count || 0} (резцы / моляры)</span></div>
        <div><span class="text-slate-500 font-bold">Текущий этап:</span> ${child.feeding_stage || 'Мягкие кусочки'}</div>
      </div>
      <div>
        <div class="mb-1.5"><span class="text-slate-500 font-bold">Аллергоанамнез:</span> <span class="text-rose-700 font-bold">${allergiesStr}</span></div>
        <div class="mb-1.5"><span class="text-slate-500 font-bold">Рвотный рефлекс (gag reflex):</span> ${gagLevels[child.gag_reflex_level] || 'Умеренный'}</div>
        <div><span class="text-slate-500 font-bold">Особенности:</span> <span class="text-slate-700">${child.gag_reflex_notes || 'Без патологий'}</span></div>
      </div>
    </div>

    <!-- Clinical Chewing Metrics Summary -->
    <div class="mb-5">
      <h3 class="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider mb-2.5">Сводные показатели навыка жевания за период</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div class="text-[11px] text-amber-800 font-semibold">Доля твердой пищи</div>
          <div class="text-xl sm:text-2xl font-black text-amber-900 mt-1">${sum.solid_food_ratio}</div>
          <div class="text-[10px] text-amber-700">от рациона</div>
        </div>
        <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div class="text-[11px] text-emerald-800 font-semibold">Жевал сам</div>
          <div class="text-xl sm:text-2xl font-black text-emerald-900 mt-1">${sum.self_chewing_ratio}</div>
          <div class="text-[10px] text-emerald-700">автономия</div>
        </div>
        <div class="p-3 bg-purple-50 border border-purple-200 rounded-xl">
          <div class="text-[11px] text-purple-800 font-semibold">Gag-рефлекс</div>
          <div class="text-xl sm:text-2xl font-black text-purple-900 mt-1">${sum.gag_episodes_recorded}</div>
          <div class="text-[10px] text-purple-700">эпизодов</div>
        </div>
        <div class="p-3 bg-sky-50 border border-sky-200 rounded-xl">
          <div class="text-[11px] text-sky-800 font-semibold">Всего блюд</div>
          <div class="text-xl sm:text-2xl font-black text-sky-900 mt-1">${sum.meals_logged}</div>
          <div class="text-[10px] text-sky-700">в дневнике</div>
        </div>
      </div>
    </div>

    <!-- Recent Feeding Log Table -->
    <div class="mb-5">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">Журнал приемов пищи</h3>
        <span class="text-[11px] text-slate-400 block sm:hidden">👈 свайпайте таблицу 👉</span>
      </div>
      <div class="overflow-x-auto border border-slate-200 rounded-xl touch-scroll">
        <table class="w-full text-left border-collapse min-w-[580px]">
          <thead>
            <tr class="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
              <th class="py-2.5 px-3">Дата</th>
              <th class="py-2.5 px-3">Блюдо / Продукт</th>
              <th class="py-2.5 px-3">Текстура</th>
              <th class="py-2.5 px-3">Статус жевания</th>
              <th class="py-2.5 px-3 text-center">Gag-рефлекс</th>
              <th class="py-2.5 px-3">Заметки и реакция</th>
            </tr>
          </thead>
          <tbody>${mealsRows}</tbody>
        </table>
      </div>
    </div>

    <!-- Doctor Recommendations Box -->
    <div class="border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50">
      <div class="text-xs font-bold uppercase text-slate-700 mb-2">Заключение и рекомендации специалиста:</div>
      <div class="text-xs text-slate-600 leading-relaxed mb-8">
        ✓ Развитие жевательной мускулатуры соответствует возрасту. Рекомендовано продолжать стимуляцию бокового жевания деснами с помощью безопасных finger foods.<br>
        ✓ Аллергологический контроль: соблюдение элиминационной диеты по указанным триггерам.<br>
        ✓ Профилактика нарушений речи и прикуса: избегать длительного возврата к гомогенизированным пюре.
      </div>
      <div class="flex justify-between items-end text-xs text-slate-600 pt-3 border-t border-slate-200">
        <div>
          <span>Врач / Специалист: __________________________________</span>
        </div>
        <div>
          <span>Подпись / Печать: _____________________</span>
        </div>
      </div>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

window.printDoctorReport = function() {
  window.print();
};
