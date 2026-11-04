/**
 * Жуй-Малыш (ChewTracker) - Модуль сообщества и онлайн-консультаций со специалистами
 */

let activeSpecialistRole = 'speech_therapist'; // 'speech_therapist' or 'nutritionist'

// Switch active specialist tab in chat
window.selectSpecialist = function(role) {
  activeSpecialistRole = role;

  const isLogoped = role === 'speech_therapist';
  document.getElementById('specTabLogoped').className = `flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
    isLogoped ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`;
  document.getElementById('specTabNutri').className = `flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
    !isLogoped ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`;

  document.getElementById('specialistTitle').textContent = isLogoped 
    ? 'Консультация детского логопеда-дефектолога' 
    : 'Консультация детского нутрициолога по прикорму';
  document.getElementById('specialistSubtitle').textContent = isLogoped 
    ? 'Прикус, уздечка, тонус языка, звуки речи и рвотный рефлекс' 
    : 'Баланс тарелки, безопасная подача, аллергии и аппетит';
  document.getElementById('specialistAvatar').textContent = isLogoped ? '👩‍⚕️' : '🥗';
};

// Ask specialist helper
window.askSpecialistPrompt = function(presetText) {
  document.getElementById('specialistQueryInput').value = presetText;
  window.sendSpecialistQuery();
};

window.sendSpecialistQuery = async function() {
  const input = document.getElementById('specialistQueryInput');
  const query = input.value.trim();
  if (!query) return;

  const chatContainer = document.getElementById('specialistChatMessages');
  if (!chatContainer) return;

  // Append user bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'flex justify-end mb-3';
  userBubble.innerHTML = `
    <div class="bg-amber-500 text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-[85%] text-sm shadow-sm font-medium">
      ${query}
      <div class="text-[10px] text-amber-100 text-right mt-1">${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  `;
  chatContainer.appendChild(userBubble);
  input.value = '';
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // Show typing loader
  const typingBubble = document.createElement('div');
  typingBubble.id = 'specialistTyping';
  typingBubble.className = 'flex justify-start mb-3';
  typingBubble.innerHTML = `
    <div class="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] text-xs text-slate-500 flex items-center gap-2 shadow-sm">
      <span class="inline-block animate-bounce font-bold">●</span>
      <span class="inline-block animate-bounce delay-100 font-bold">●</span>
      <span class="inline-block animate-bounce delay-200 font-bold">●</span>
      <span>Специалист анализирует вопрос...</span>
    </div>
  `;
  chatContainer.appendChild(typingBubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    const res = await fetch('/api/specialist-consult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: activeSpecialistRole, query })
    });
    const data = await res.json();
    typingBubble.remove();

    const specBubble = document.createElement('div');
    specBubble.className = 'flex justify-start mb-3';
    specBubble.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 max-w-[88%] text-sm text-slate-800 shadow-sm leading-relaxed">
        <div class="flex items-center gap-1.5 text-xs font-bold ${activeSpecialistRole === 'speech_therapist' ? 'text-amber-700' : 'text-emerald-700'} mb-1.5">
          <span>${activeSpecialistRole === 'speech_therapist' ? '👩‍⚕️ Логопед' : '🥗 Нутрициолог'}</span>
          <span class="text-slate-400 font-normal">· ${data.time}</span>
        </div>
        <div class="whitespace-pre-line">${data.response}</div>
      </div>
    `;
    chatContainer.appendChild(specBubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;

  } catch (err) {
    if (typingBubble) typingBubble.remove();
    console.error('Ошибка консультации специалиста:', err);
    showToast('Сбой при связи с экспертом', 'error');
  }
};

// Forum Module
window.loadForumPosts = async function() {
  try {
    const res = await fetch('/api/forum');
    const posts = await res.json();
    renderForumList(posts);
  } catch (err) {
    console.error('Ошибка загрузки форума:', err);
  }
};

function renderForumList(posts) {
  const container = document.getElementById('forumPostsContainer');
  if (!container) return;

  container.innerHTML = posts.map(post => `
    <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover-lift">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2.5">
          <span class="w-10 h-10 rounded-xl bg-amber-100 text-xl flex items-center justify-center">${post.avatar || '👶'}</span>
          <div>
            <div class="font-bold text-slate-800 text-sm leading-tight">${post.author}</div>
            <span class="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-0.5">${post.badge}</span>
          </div>
        </div>
        <span class="text-xs text-slate-400 font-medium">${post.created_at}</span>
      </div>

      <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 mb-2"># ${post.tag}</span>
      <h4 class="font-bold text-slate-800 text-base mb-2 leading-snug">${post.title}</h4>
      <p class="text-sm text-slate-600 leading-relaxed mb-4">${post.content}</p>

      <div class="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
        <button onclick="likeForumPost(${post.id})" class="flex items-center gap-1.5 hover:text-rose-600 transition">
          <i data-lucide="heart" class="w-4 h-4 text-rose-500"></i>
          <span>${post.likes || 0} полезно</span>
        </button>
        <div class="flex items-center gap-1.5 text-slate-400">
          <i data-lucide="message-square" class="w-4 h-4"></i>
          <span>${post.comments_count || 0} ответов</span>
        </div>
      </div>
    </div>
  `).join('');

  lucide.createIcons();
}

window.likeForumPost = async function(postId) {
  try {
    await fetch(`/api/forum/like/${postId}`, { method: 'POST' });
    window.loadForumPosts();
  } catch (e) {
    console.error(e);
  }
};

window.openNewPostModal = function() {
  const modal = document.getElementById('newPostModal');
  if (modal) {
    modal.classList.remove('hidden');
    const form = document.getElementById('newPostForm');
    if (form && window.AppState.user && window.AppState.user.username) {
      form.author.value = window.AppState.user.username;
    }
  }
};

window.closeNewPostModal = function() {
  const modal = document.getElementById('newPostModal');
  if (modal) modal.classList.add('hidden');
};

window.submitNewForumPost = async function(event) {
  event.preventDefault();
  const form = event.target;

  const payload = {
    author: form.author.value.trim() || (window.AppState.user && window.AppState.user.username) || 'Мама малыша',
    tag: form.tag.value,
    title: form.title.value.trim(),
    content: form.content.value.trim()
  };

  if (!payload.title || !payload.content) {
    showToast('Заполните заголовок и текст сообщения', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/forum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.status === 'success') {
      showToast('Ваш пост опубликован на форуме!', 'success');
      closeNewPostModal();
      window.loadForumPosts();
    }
  } catch (err) {
    console.error('Error posting to forum:', err);
    showToast('Ошибка при публикации', 'error');
  }
};
