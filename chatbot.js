/* AI Assistant widget. Injects its own markup; configured by data-* attributes on the <script> tag. */
(function () {
  var me = document.currentScript;
  var API  = me.dataset.api || 'https://pearltechlab-ai-backend.onrender.com';
  var LOGO = me.dataset.logo || 'images/Face-PTS.png';
  var NAME = me.dataset.name || 'Pearl.Ai';

  var questions = [
    'What are your skills?',
    'Tell me about your projects',
    'What services do you offer?',
    'How can I contact you?',
    'What is your work experience?',
    'What is your education?',
    'Tell me about the Zepto Smart Commerce AI project',
    'How does the Driver Drowsiness Detection work?',
    'Tell me about the Job Acceptance Prediction system',
    'Are you available for freelance work?'
  ];

  document.body.insertAdjacentHTML('beforeend',
    '<button id="ai-launcher" aria-label="Open AI assistant" aria-expanded="false" aria-controls="ai-panel">' +
      '<img src="' + LOGO + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'">' +
      '<i class="fa-solid fa-robot ai-fallback"></i><span class="ai-dot"></span></button>' +
    '<div id="ai-panel" role="dialog" aria-label="AI assistant chat">' +
      '<div class="ai-head"><img src="' + LOGO + '" alt="" onerror="this.style.display=\'none\'">' +
        '<div><div class="ai-title">' + NAME + '</div><div class="ai-status">Online</div></div>' +
        '<button class="ai-close" aria-label="Close">&times;</button></div>' +
      '<div class="ai-msgs" id="ai-msgs" role="log" aria-live="polite"></div>' +
      '<div class="ai-sugg" id="ai-sugg">' +
        '<button type="button" class="ai-sugg-toggle" id="ai-sugg-toggle" aria-expanded="true" aria-controls="ai-sugg-list">' +
          '<span>\uD83D\uDCA1 Suggested questions</span>' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5z"/></svg></button>' +
        '<div class="ai-sugg-list" id="ai-sugg-list"></div>' +
      '</div>' +
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

  function toggle(open) {
    panel.classList.toggle('open', open);
    $('ai-launcher').setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) setTimeout(function () { input.focus(); }, 250);
  }
  $('ai-launcher').onclick = function () { toggle(!panel.classList.contains('open')); };
  panel.querySelector('.ai-close').onclick = function () { toggle(false); $('ai-launcher').focus(); };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('open')) { toggle(false); $('ai-launcher').focus(); }
  });

  add('bot', 'Hi! \uD83D\uDC4B Ask me anything about MuthuRaj\u2019s work.');

  var sugg = $('ai-sugg'), suggList = $('ai-sugg-list'), suggBtn = $('ai-sugg-toggle');
  function setSugg(open) {
    sugg.classList.toggle('closed', !open);
    suggBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  suggBtn.onclick = function () { setSugg(sugg.classList.contains('closed')); };
  questions.forEach(function (q) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = q;
    b.onclick = function () { ask(q); }; suggList.appendChild(b);
  });

  /* Instant replies for greetings / small talk (no server call, works even if the backend is waking up) */
  function smallTalk(t) {
    var s = t.toLowerCase().replace(/['\u2019]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (!s || s.split(' ').length > 5) return null;
    var who = '( (pearl|pearl ai|there|sir|madam|all|everyone|bro|friend))?';
    var m = s.match(new RegExp('^good (morning|afternoon|evening|night)' + who + '$'));
    if (m) {
      if (m[1] === 'night') return 'Good night! \uD83C\uDF19 Come back anytime if you have questions about MuthuRaj\u2019s work.';
      return 'Good ' + m[1] + '! \uD83D\uDE0A How can I help you today? Pick a suggested question below or type your own.';
    }
    if (new RegExp('^(h+i+|he+y+|hell+o+|hola|yo|sup|greetings|namaste|vanakkam|vannakam)' + who + '$').test(s))
      return 'Hello! \uD83D\uDC4B How can I help you today? Ask about MuthuRaj\u2019s skills, projects, experience or services, or pick a suggested question below.';
    if (/^((hi|hello|hey) )?(how are you|how r u|how are u|hows it going|whats up|wassup)( today)?$/.test(s))
      return 'I\u2019m doing great, thanks for asking! \uD83D\uDE0A What would you like to know about MuthuRaj\u2019s work?';
    if (/^(who are you|what are you|what can you do|help|help me)$/.test(s))
      return 'I\u2019m Pearl.Ai, MuthuRaj\u2019s assistant. I can answer questions about his skills, projects, experience, education and services. Try one of the suggested questions below!';
    if (/^(thanks|thank you|thankyou|thank you so much|thanks a lot|thx|ty|nandri)$/.test(s))
      return 'You\u2019re welcome! \uD83D\uDE0A Is there anything else you\u2019d like to know?';
    if (/^(ok|okay|cool|nice|great|good|awesome|fine|super)$/.test(s))
      return 'Great! \uD83D\uDE0A Let me know if you\u2019d like to know anything else about MuthuRaj\u2019s work.';
    if (/^(bye|goodbye|see you|see ya|tata|ok bye)$/.test(s))
      return 'Goodbye! \uD83D\uDC4B Thanks for visiting. Come back anytime.';
    return null;
  }

  async function ask(text) {
    text = (text || '').trim(); if (!text || send.disabled) return;
    add('user', text); input.value = ''; send.disabled = true;
    setSugg(false);
    var talk = smallTalk(text);
    if (talk) {
      var t0 = typing();
      setTimeout(function () {
        t0.remove(); add('bot', talk);
        send.disabled = false; input.focus();
      }, 450);
      return;
    }
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
    send.disabled = false; input.focus();
  }
  $('ai-form').onsubmit = function (e) { e.preventDefault(); ask(input.value); };
})();
