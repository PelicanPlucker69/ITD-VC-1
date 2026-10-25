/* ==========================================================
   LYNK | Game page behaviour (self-contained)
   1. Rules screen  -> player presses "Are you ready?"
   2. Countdown     -> 10 down to 1
   3. Objective     -> what to go and find + a running timer
   4. "Next"        -> pretends the photo was submitted from the
                       phone and moves on to the results page
   ========================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Settings you can tweak ---------- */
  var COUNT_FROM = 10;          // countdown starts at this number
  var READY_DELAY_MS = 1200;    // pause between "Ready" and the countdown
  var TOTAL_PLAYERS = 6;
  var RING_LENGTH = 553;        // circumference of the countdown ring (2 * PI * 88)

  /* The scavenger hunt objectives. One is picked at random each game. */
  var OBJECTIVES = [
    { title: 'Find something BLUE',   hint: 'Any blue object counts: a mug, a book, a cushion, a pen…', swatch: '#2F6BFF' },
    { title: 'Find something RED',    hint: 'Any red object counts: a fruit, a jumper, a bottle cap…',  swatch: '#E5484D' },
    { title: 'Find something GREEN',  hint: 'Any green object counts: a plant, a folder, a pair of socks…', swatch: '#2FA84F' },
    { title: 'Find something YELLOW', hint: 'Any yellow object counts: a banana, a sticky note, a highlighter…', swatch: '#F5C518' },
    { title: 'Find something you can drink from', hint: 'A mug, cup, glass or water bottle all count.', emoji: '🥤' },
    { title: 'Find something with words on it',   hint: 'A book, a cereal box, a letter, a mug with a slogan…', emoji: '📖' }
  ];

  /* ---------- Safe sessionStorage (shared between pages) ---------- */
  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    remove: function (k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  /* ---------- Clock + meeting length ---------- */
  var clockEl = $('clock');
  var elapsedEl = $('elapsed');
  var startedAt = Number(store.get('lynkMeetingStart'));
  if (!startedAt) {
    startedAt = Date.now();
    store.set('lynkMeetingStart', String(startedAt));
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

  /* ---------- Control bar ---------- */
  function toggle(btn, onChange) {
    btn.addEventListener('click', function () {
      var nowOn = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(nowOn));
      btn.classList.toggle('is-off', !nowOn);
      onChange(nowOn);
    });
  }

  toggle($('micBtn'), function (on) { toast(on ? 'Microphone on' : 'Microphone muted'); });
  toggle($('camBtn'), function (on) { toast(on ? 'Camera on' : 'Camera off'); });

  $('shareBtn').addEventListener('click', function () { toast('Screen sharing is coming in a later version'); });
  $('chatBtn').addEventListener('click', function () { toast('Chat is paused during the game'); });
  $('moreBtn').addEventListener('click', function () { toast('More options are coming in a later version'); });
  $('peopleBtn').addEventListener('click', function () { toast(TOTAL_PLAYERS + ' participants in this meeting'); });

  // Leaving ends the meeting, so forget everything we stored
  $('leaveLink').addEventListener('click', function () {
    store.remove('lynkMeetingStart');
    store.remove('lynkHuntSeconds');
    store.remove('lynkObjective');
  });

  /* ---------- Switching between the three screens ---------- */
  var views = {
    rules: $('viewRules'),
    countdown: $('viewCountdown'),
    hunt: $('viewHunt')
  };

  function showView(name) {
    Object.keys(views).forEach(function (key) {
      views[key].hidden = key !== name;
    });
    // Move focus to the new heading so screen readers announce the change
    var heading = views[name].querySelector('[tabindex="-1"]');
    if (heading) { heading.focus({ preventScroll: true }); }
  }

  var statusPill = $('statusPill');

  /* ---------- 1. Ready up ---------- */
  var readyBtn = $('readyBtn');
  var readyNum = $('readyNum');

  readyBtn.addEventListener('click', function () {
    if (readyBtn.classList.contains('is-ready')) { return; }

    readyBtn.classList.add('is-ready');
    readyBtn.setAttribute('aria-disabled', 'true');
    readyBtn.textContent = 'Ready ✓';
    readyNum.textContent = String(TOTAL_PLAYERS); // you were the last one everyone was waiting for

    setTimeout(startCountdown, READY_DELAY_MS);
  });

  /* ---------- 2. Countdown ---------- */
  var countNum = $('countNum');
  var ringBar = $('ringBar');
  var countLive = $('countLive');
  var countTimer;

  function renderCount(n) {
    countNum.textContent = String(n);

    // The ring slowly empties as the numbers go down
    ringBar.style.strokeDashoffset = String(RING_LENGTH * (COUNT_FROM - n) / COUNT_FROM);

    // Re-trigger the little "pop" animation
    countNum.classList.remove('is-pop');
    void countNum.offsetWidth;
    countNum.classList.add('is-pop');

    // Only announce some numbers to screen readers so it isn't noisy
    if (n === COUNT_FROM) {
      countLive.textContent = 'Hunt starting in ' + COUNT_FROM + ' seconds';
    } else if (n === 5 || n <= 3) {
      countLive.textContent = String(n);
    }
  }

  function startCountdown() {
    statusPill.textContent = 'Status: Scavenger Hunt';
    showView('countdown');

    var n = COUNT_FROM;
    renderCount(n);

    countTimer = setInterval(function () {
      n -= 1;
      if (n < 1) {
        clearInterval(countTimer);
        startHunt();
        return;
      }
      renderCount(n);
    }, 1000);
  }

  /* ---------- 3. The objective ---------- */
  var huntStartedAt = 0;
  var huntTimer;

  function formatStopwatch(totalSeconds) {
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function startHunt() {
    var objective = OBJECTIVES[Math.floor(Math.random() * OBJECTIVES.length)];
    store.set('lynkObjective', objective.title);

    $('objTitle').textContent = objective.title;
    $('objHint').textContent = objective.hint;

    var badge = $('objBadge');
    if (objective.swatch) {
      badge.textContent = '';
      badge.style.background = objective.swatch;
    } else {
      badge.textContent = objective.emoji;
      badge.style.background = '';
    }

    showView('hunt');

    // Phones that support it will buzz when the hunt begins
    try { if (navigator.vibrate) { navigator.vibrate([200, 100, 200]); } } catch (e) { /* ignore */ }

    huntStartedAt = Date.now();
    var timeEl = $('huntTime');
    huntTimer = setInterval(function () {
      timeEl.textContent = formatStopwatch(Math.floor((Date.now() - huntStartedAt) / 1000));
    }, 1000);
  }

  /* ---------- 4. Next (stands in for the phone submission) ---------- */
  $('nextBtn').addEventListener('click', function () {
    clearInterval(huntTimer);
    var seconds = Math.max(1, Math.round((Date.now() - huntStartedAt) / 1000));
    store.set('lynkHuntSeconds', String(seconds));
    window.location.href = 'results.html';
  });
})();