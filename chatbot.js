/* AI Assistant widget. Injects its own markup; configured by data-* attributes on the <script> tag. */
(function () {
  var me = document.currentScript;
  var API  = me.dataset.api || 'https://pearltechlab-ai-backend.onrender.com';
  var LOGO = me.dataset.logo || 'images/Face-PTS.png';
  var NAME = me.dataset.name || 'Pearl.Ai';

  var chips = ['What are your skills?', 'Tell me about your projects', 'What services do you offer?', 'How can I contact you?'];

  document.body.insertAdjacentHTML('beforeend',
    '<button id="ai-launcher" aria-label="Open AI assistant" aria-expanded="false" aria-controls="ai-panel">' +
      '<img src="' + LOGO + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'">' +
      '<i class="fa-solid fa-robot ai-fallback"></i><span class="ai-dot"></span></button>' +
    '<div id="ai-panel" role="dialog" aria-label="AI assistant chat">' +
      '<div class="ai-head"><img src="' + LOGO + '" alt="" onerror="this.style.display=\'none\'">' +
        '<div><div class="ai-title">' + NAME + '</div><div class="ai-status">Online</div></div>' +
        '<button class="ai-close" aria-label="Close">&times;</button></div>' +
      '<div class="ai-msgs" id="ai-msgs" role="log" aria-live="polite"></div>' +
      '<div class="ai-chips" id="ai-chips"></div>' +
      '<form class="ai-form" id="ai-form"><input id="ai-input" maxlength="500" autocomplete="off" placeholder="Ask about my work, skills, projects..."><button type="submit" id="ai-send" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M3.4 20.4 21 12 3.4 3.6 3.3 10l12 2-12 2z"/></svg></button></form>' +
      '<div class="ai-foot">Answers come from MuthuRaj\u2019s documents only</div>' +
    '</div>');

  var $ = function (id) { return document.getElementById(id); };
  var panel = $('ai-panel'), msgs = $('ai-msgs'), input = $('ai-input'), send = $('ai-send');
  var history = [];

  function esc(s) { return s.replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function fmt(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/\n/g, '<br>');
  }
  function add(role, text, extra) {
    var d = document.createElement('div');
    d.className = 'ai-msg ' + role + (extra ? ' ' + extra : '');
    d.innerHTML = fmt(text);
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d;
  }
  function typing() {
    var d = document.createElement('div'); d.className = 'ai-msg bot ai-typing';
    d.innerHTML = '<span></span><span></span><span></span>'; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d;
  }

  function isMobile() { return window.matchMedia('(max-width:600px)').matches; }

  /* keep the panel exactly as tall as the visible area (shrinks when the keyboard opens) */
  if (window.visualViewport) {
    var setVh = function () {
      document.documentElement.style.setProperty('--ai-vh', window.visualViewport.height + 'px');
      if (panel.classList.contains('open')) msgs.scrollTop = msgs.scrollHeight;
    };
    window.visualViewport.addEventListener('resize', setVh);
    setVh();
  }

  function toggle(open) {
    panel.classList.toggle('open', open);
    $('ai-launcher').setAttribute('aria-expanded', open ? 'true' : 'false');
    document.documentElement.classList.toggle('ai-lock', open && isMobile());
    if (open) {
      msgs.scrollTop = msgs.scrollHeight;
      /* on phones don't auto-focus: it pops the keyboard and hides the chat */
      if (!isMobile()) setTimeout(function () { input.focus(); }, 250);
    }
  }
  $('ai-launcher').onclick = function () { toggle(!panel.classList.contains('open')); };
  panel.querySelector('.ai-close').onclick = function () { toggle(false); $('ai-launcher').focus(); };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('open')) { toggle(false); $('ai-launcher').focus(); }
  });

  add('bot', 'Hi! I\u2019m MuthuRaj\u2019s AI assistant. Ask me about his skills, projects, experience or services.');
  chips.forEach(function (c) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = c;
    b.onclick = function () { ask(c); }; $('ai-chips').appendChild(b);
  });

  async function ask(text) {
    text = (text || '').trim(); if (!text || send.disabled) return;
    $('ai-chips').style.display = 'none';
    add('user', text); input.value = ''; send.disabled = true;
    var t = typing();
    try {
      var r = await fetch(API + '/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history.slice(-6) })
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var data = await r.json();
      t.remove();
      add('bot', data.answer, data.relevant ? '' : 'warn');
      history.push({ role: 'user', content: text }, { role: 'assistant', content: data.answer });
    } catch (e) {
      console.error('Assistant request failed:', e);
      t.remove(); add('bot', 'Sorry, I can\u2019t reach the assistant right now. Please try again in a moment.', 'warn');
    }
    send.disabled = false; if (!isMobile()) input.focus();
  }
  $('ai-form').onsubmit = function (e) { e.preventDefault(); ask(input.value); };
})();
