/* ==========================================================
   LYNK | Results page behaviour (self-contained)
   1. "Waiting for everyone else to finish..." for about 10 seconds
   2. Then the leaderboard appears
   ========================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Settings you can tweak ---------- */
  var WAIT_MS = 10000;          // how long the waiting screen lasts

  var YOU = 'Sarah M.';         // you are the host in this prototype
  var POINTS_BY_PLACE = [150, 120, 90, 70, 50, 30];

  /* The other players' finishing times, in seconds (made-up for the prototype) */
  var OTHERS = [
    { name: 'Alex K.',   seconds: 52 },
    { name: 'Jordan T.', seconds: 67 },
    { name: 'Chris L.',  seconds: 84 },
    { name: 'Taylor R.', seconds: 101 },
    { name: 'Morgan P.', seconds: 123 }
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
  $('chatBtn').addEventListener('click', function () { toast('Chat is on the meeting screen'); });
  $('moreBtn').addEventListener('click', function () { toast('More options are coming in a later version'); });
  $('peopleBtn').addEventListener('click', function () { toast('6 participants in this meeting'); });

  // Leaving ends the meeting, so forget everything we stored
  $('leaveLink').addEventListener('click', function () {
    store.remove('lynkMeetingStart');
    store.remove('lynkHuntSeconds');
    store.remove('lynkObjective');
  });

  /* ---------- Helpers ---------- */
  function formatStopwatch(totalSeconds) {
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function ordinal(n) {
    var suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
    return n + (suffixes[n] || 'th');
  }

  /* Your time comes from the game page ("Next" button). If someone opens
     this page directly there is no stored time, so use a sensible default. */
  var mySeconds = Number(store.get('lynkHuntSeconds')) || 92;
  var objectiveTitle = store.get('lynkObjective') || 'Scavenger Hunt';

  $('mySubmitTime').textContent = formatStopwatch(mySeconds);

  /* ---------- 1. Waiting screen ---------- */
  var total = OTHERS.length + 1;
  var finishedEl = $('finishedCount');
  var progBar = $('progBar');

  function showFinished(count) {
    finishedEl.textContent = count + ' of ' + total + ' finished';
    progBar.style.width = Math.round((count / total) * 100) + '%';
  }

  showFinished(1); // you have already finished

  // The other players "finish" one by one while we wait
  [0.2, 0.4, 0.6, 0.78, 0.94].forEach(function (fraction, index) {
    setTimeout(function () {
      showFinished(index + 2);
    }, Math.round(WAIT_MS * fraction));
  });

  /* ---------- 2. Leaderboard ---------- */
  function buildLeaderboard() {
    var players = OTHERS.concat([{ name: YOU, seconds: mySeconds, you: true }]);
    players.sort(function (a, b) { return a.seconds - b.seconds; });

    var list = $('boardList');
    list.textContent = '';

    players.forEach(function (player, index) {
      var place = index + 1;
      var points = POINTS_BY_PLACE[index] || 10;

      var row = document.createElement('li');
      row.className = 'r-row' + (place === 1 ? ' is-first' : '') + (player.you ? ' is-you' : '');
      row.style.setProperty('--i', String(index));

      var rank = document.createElement('span');
      rank.className = 'r-rank';
      rank.textContent = String(place);

      var name = document.createElement('span');
      name.className = 'r-name';
      name.appendChild(document.createTextNode(player.name));
      if (player.you) {
        var tag = document.createElement('span');
        tag.className = 'r-you-tag';
        tag.textContent = 'You';
        name.appendChild(tag);
      }

      var time = document.createElement('span');
      time.className = 'r-time';
      time.textContent = formatStopwatch(player.seconds);

      var pts = document.createElement('span');
      pts.className = 'r-pts';
      pts.textContent = '+' + points;

      row.appendChild(rank);
      row.appendChild(name);
      row.appendChild(time);
      row.appendChild(pts);
      list.appendChild(row);

      if (player.you) {
        $('boardSummary').textContent =
          'You placed ' + ordinal(place) + ' and earned +' + points +
          ' points towards your workplace rewards!';
      }
    });

    $('boardObjective').textContent = 'Scavenger Hunt · ' + objectiveTitle;
  }

  setTimeout(function () {
    buildLeaderboard();
    $('viewWaiting').hidden = true;
    $('viewBoard').hidden = false;
    $('statusPill').textContent = 'Status: Hunt complete';

    var heading = $('viewBoard').querySelector('[tabindex="-1"]');
    if (heading) { heading.focus({ preventScroll: true }); }
  }, WAIT_MS);
})();