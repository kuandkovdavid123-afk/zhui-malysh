/**
 * Жуй-Малыш (ChewTracker) - Модуль умных напоминаний и голосовой колонки
 */

// Smart Speaker Voice Simulation using Web Speech API
window.speakSmartSpeaker = function(text) {
  if (!('speechSynthesis' in window)) {
    showToast('Синтез речи не поддерживается браузером. Сообщение: ' + text, 'info');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ru-RU';
  utterance.rate = 1.0;
  utterance.pitch = 1.1;

  // Visual waves animation
  const wavesContainer = document.getElementById('speakerWaves');
  if (wavesContainer) wavesContainer.classList.remove('hidden');

  utterance.onend = () => {
    if (wavesContainer) wavesContainer.classList.add('hidden');
  };

  utterance.onerror = () => {
    if (wavesContainer) wavesContainer.classList.add('hidden');
  };

  window.speechSynthesis.speak(utterance);
  showToast('🔊 Алиса / Маруся озвучивает рекомендацию', 'info');
};

window.playSpeakerPrompt = function(presetKey) {
  const childName = (window.AppState.profile && window.AppState.profile.name) || 'малыш';

  const prompts = {
    lunch_pieces: `Внимание, время обеда! Напоминание для мамы: сегодня предлагаем ${childName} паровую тефтельку кусочками. Не перебивайте блендером, пусть тренирует боковые десенки!`,
    chew_exercise: `Алиса включила таймер жевания! Дайте ${childName} ломтик печеного яблочка. Хвалите за каждый самостоятельный хруст!`,
    water_reminder: `Время предложить водичку из открытой чашки или поильника с трубочкой! Это укрепляет круговую мышцу рта и помогает будущей речи.`,
    gag_calm: `Спокойствие! Если сработал рвотный рефлекс, не стучите по спинке. Улыбнитесь и покажите ребенку, как откашляться.`
  };

  const text = prompts[presetKey] || `Напоминание по прикорму для ${childName}.`;
  document.getElementById('speakerOutputText').textContent = `«${text}»`;
  speakSmartSpeaker(text);
};

// Export to .ics Calendar format
window.exportCalendarICS = function() {
  const childName = (window.AppState.profile && window.AppState.profile.name) || 'Малыш';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ZhuiMalysh//ChewTracker//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'SUMMARY:🥣 ' + childName + ' - Завтрак (Каша с кусочками фруктов)',
    'DESCRIPTION:Тренировка самостоятельного зачерпывания ложкой и жевания мягких кусочков.',
    'RRULE:FREQ=DAILY',
    'DTSTART:20261102T090000',
    'DTEND:20261102T093000',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:🥕 ' + childName + ' - Обед (Паровые овощи брусочками + суфле)',
    'DESCRIPTION:Finger foods: брусочки моркови и кабачка. Жевание боковыми деснами.',
    'RRULE:FREQ=DAILY',
    'DTSTART:20261102T130000',
    'DTEND:20261102T134500',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:🍎 ' + childName + ' - Полдник (Печеное яблоко / Банан)',
    'DESCRIPTION:Хрустим и развиваем челюсть.',
    'RRULE:FREQ=DAILY',
    'DTSTART:20261102T163000',
    'DTEND:20261102T170000',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Расписание_кормлений_${childName}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Календарь кормлений скачан (.ics). Откройте его на телефоне или компьютере!', 'success');
};

// Request Browser Web Notifications
window.requestPushNotifications = async function() {
  if (!('Notification' in window)) {
    showToast('Уведомления не поддерживаются вашим браузером', 'warning');
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    showToast('Уведомления успешно включены! Вы не пропустите время кусочков.', 'success');
    new Notification('Жуй-Малыш активен 🥕', {
      body: 'Напоминания о кормлениях и тренировках жевания включены!',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🥕</text></svg>'
    });
  } else {
    showToast('Разрешение на уведомления отклонено', 'warning');
  }
};
