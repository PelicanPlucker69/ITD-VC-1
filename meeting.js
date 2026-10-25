/* ==========================================================
   LYNK | Meeting page behaviour
   - live clock + meeting length
   - mic / camera toggles (update your own tile)
   - working chat
   - "Are you ready for an activity?" confirm
   ========================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var YOU = 'Sarah M.'; // you are the host in this prototype

  /* ---------- Safe sessionStorage (shared between pages) ---------- */
  function readStore(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }

  function writeStore(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  function clearStore() {
    try {
      sessionStorage.removeItem('lynkMeetingStart');
      sessionStorage.removeItem('lynkHuntSeconds');
      sessionStorage.removeItem('lynkObjective');
    } catch (e) { /* ignore */ }
  }

  /* ---------- Clock + meeting length ---------- */
  var clockEl = $('clock');
  var elapsedEl = $('elapsed');
  var startedAt = Number(readStore('lynkMeetingStart'));
  if (!startedAt) {
    startedAt = Date.now();
    writeStore('lynkMeetingStart', String(startedAt));
  }

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function formatLength(ms) {
    var mins = Math.floor(ms / 60000);
    if (mins < 60) { return mins + ' min'; }
    var hrs = Math.floor(mins / 60);
    return hrs + (hrs === 1 ? ' hour' : ' hours') + ' & ' + (mins % 60) + ' min';
  }

  function tick() {
    clockEl.textContent = formatTime(new Date());
    elapsedEl.textContent = formatLength(Date.now() - startedAt);
  }

  tick();
  setInterval(tick, 1000);

  /* ---------- Toast ---------- */
  var toastEl = $('toast');
  var toastTimer;

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2400);
  }

  /* ---------- Chat ---------- */
  var chatLog = $('chatLog');
  var chatForm = $('chatForm');
  var chatInput = $('chatInput');

  function addMessage(name, text, options) {
    options = options || {};
    var when = options.time || new Date();

    var msg = document.createElement('div');
    msg.className = 'm-msg' + (options.system ? ' is-system' : '');

    var head = document.createElement('div');
    head.className = 'm-msg-head';

    var nameEl = document.createElement('span');
    nameEl.className = 'm-msg-name';
    nameEl.textContent = name;

    var timeEl = document.createElement('span');
    timeEl.className = 'm-msg-time';
    timeEl.textContent = formatTime(when);

    head.appendChild(nameEl);
    head.appendChild(timeEl);

    var body = document.createElement('p');
    body.className = 'm-msg-text';
    body.textContent = text; // textContent keeps user input safe

    msg.appendChild(head);
    msg.appendChild(body);
    chatLog.appendChild(msg);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  // Starter messages (times are relative to "now" so they always look current)
  var seed = [
    { name: 'System',    text: 'The host is preparing an activity. Are we ready for an activity? 🏃', ago: 5, system: true },
    { name: 'Sarah M.',  text: 'Let’s get started everyone! 👋', ago: 5 },
    { name: 'Alex K.',   text: 'Ready! Sharing my screen now.', ago: 4 },
    { name: 'Jordan T.', text: 'Can everyone see the dashboard?', ago: 3 },
    { name: 'Taylor R.', text: 'Yes, looks good!', ago: 3 }
  ];

  seed.forEach(function (m) {
    addMessage(m.name, m.text, {
      system: m.system,
      time: new Date(Date.now() - m.ago * 60000)
    });
  });

  chatForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var text = chatInput.value.trim();
    if (!text) { return; }
    addMessage(YOU, text);
    chatInput.value = '';
    chatInput.focus();
  });

  /* ---------- Mic / camera toggles ---------- */
  var selfTile = $('selfTile');
  var micBtn = $('micBtn');
  var camBtn = $('camBtn');

  function toggle(btn, onChange) {
    btn.addEventListener('click', function () {
      var nowOn = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(nowOn));
      btn.classList.toggle('is-off', !nowOn);
      onChange(nowOn);
    });
  }

  toggle(micBtn, function (on) {
    selfTile.classList.toggle('is-muted', !on);
    toast(on ? 'Microphone on' : 'Microphone muted');
  });

  toggle(camBtn, function (on) {
    selfTile.classList.toggle('is-cam-off', !on);
    toast(on ? 'Camera on' : 'Camera off');
  });

  /* ---------- Other control buttons ---------- */
  $('chatBtn').addEventListener('click', function () {
    $('chatPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    chatInput.focus();
  });

  $('peopleBtn').addEventListener('click', function () {
    var count = document.querySelectorAll('.m-person').length;
    toast(count + ' participants in this meeting');
  });

  $('shareBtn').addEventListener('click', function () {
    toast('Screen sharing is coming in a later version');
  });

  $('moreBtn').addEventListener('click', function () {
    toast('More options are coming in a later version');
  });

  /* ---------- Leaving ends the meeting ---------- */
  var leaveLink = document.querySelector('.m-leave');
  if (leaveLink) { leaveLink.addEventListener('click', clearStore); }

  /* ---------- Activity prompt ---------- */
  var confirmBtn = $('confirmBtn');
  var activityNote = $('activityNote');

  confirmBtn.addEventListener('click', function () {
    if (confirmBtn.classList.contains('is-confirmed')) { return; }

    confirmBtn.classList.add('is-confirmed');
    confirmBtn.textContent = 'Ready ✓';
    confirmBtn.setAttribute('aria-disabled', 'true');
    activityNote.hidden = false;

    addMessage('System', YOU + ' is ready for the activity ✅', { system: true });

    // Give the "Ready" state a moment to show, then head to the game rules
    setTimeout(function () {
      window.location.href = 'game.html';
    }, 900);
  });
})();