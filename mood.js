/* The Quiet Table — mood layer
   Evening candlelight mode (auto after sunset, manual override, remembered)
   and an optional ambient sound: soft rain on the kitchen window, synthesized
   with WebAudio so no audio files are needed. */
(function () {
  "use strict";

  var reduce = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============ EVENING MODE ============ */
  var KEY = "tqt-theme"; /* "evening" | "day" — only set on explicit choice */

  function autoEvening() {
    var h = new Date().getHours();
    return h >= 18 || h < 6;
  }
  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function isEvening() {
    var s = stored();
    if (s === "evening") return true;
    if (s === "day") return false;
    return autoEvening();
  }
  function applyTheme(evening) {
    document.body.classList.toggle("evening", evening);
    if (moodBtn) {
      moodBtn.textContent = evening ? "☀" : "☾";
      moodBtn.title = evening ? "Day mode · দিনের মোড" : "Evening mode · সন্ধ্যার মোড";
      moodBtn.setAttribute("aria-pressed", evening ? "true" : "false");
    }
  }

  /* ============ AMBIENT SOUND (synthesized soft rain) ============ */
  var ctx = null, master = null, nodes = [], dropTimer = null, soundOn = false;

  function noiseBuffer(seconds) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function startSound() {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 2.5); /* fade in */
      master.connect(ctx.destination);

      /* layer 1: rain — filtered noise */
      var rainSrc = ctx.createBufferSource();
      rainSrc.buffer = noiseBuffer(3);
      rainSrc.loop = true;
      var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 400;
      var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400;
      var rainGain = ctx.createGain(); rainGain.gain.value = 0.055;
      rainSrc.connect(hp).connect(lp).connect(rainGain).connect(master);
      rainSrc.start();
      nodes.push(rainSrc);

      /* layer 2: warm room tone — deep filtered noise, barely there */
      var roomSrc = ctx.createBufferSource();
      roomSrc.buffer = noiseBuffer(4);
      roomSrc.loop = true;
      var roomLp = ctx.createBiquadFilter(); roomLp.type = "lowpass"; roomLp.frequency.value = 180;
      var roomGain = ctx.createGain(); roomGain.gain.value = 0.05;
      roomSrc.connect(roomLp).connect(roomGain).connect(master);
      roomSrc.start();
      nodes.push(roomSrc);

      /* layer 3: occasional droplets on the window */
      function droplet() {
        if (!soundOn) return;
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = 1600 + Math.random() * 1800;
        var t = ctx.currentTime;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.012 + Math.random() * 0.015, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        o.connect(g).connect(master);
        o.start(t); o.stop(t + 0.3);
        dropTimer = setTimeout(droplet, 400 + Math.random() * 2200);
      }
      droplet();
    } catch (e) { /* no audio support — stay quiet */ }
  }

  function stopSound() {
    if (dropTimer) clearTimeout(dropTimer);
    if (master && ctx) {
      var m = master, killed = nodes.slice();
      m.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4); /* fade out */
      setTimeout(function () {
        killed.forEach(function (n) { try { n.stop(); } catch (e) {} });
        try { m.disconnect(); } catch (e) {}
      }, 1600);
    }
    nodes = []; master = null;
  }

  /* ============ UI ============ */
  var moodBtn = null, soundBtn = null;

  function buildUI() {
    var nav = document.querySelector(".site-header nav");
    if (!nav) return;

    moodBtn = document.createElement("button");
    moodBtn.className = "tqt-toggle mood-btn";
    moodBtn.type = "button";
    nav.appendChild(moodBtn);
    moodBtn.addEventListener("click", function () {
      var next = !document.body.classList.contains("evening");
      try { localStorage.setItem(KEY, next ? "evening" : "day"); } catch (e) {}
      applyTheme(next);
    });

    soundBtn = document.createElement("button");
    soundBtn.className = "tqt-toggle sound-btn";
    soundBtn.type = "button";
    soundBtn.textContent = "♪";
    soundBtn.title = "Kitchen sounds · রান্নাঘরের শব্দ";
    soundBtn.setAttribute("aria-pressed", "false");
    nav.appendChild(soundBtn);
    soundBtn.addEventListener("click", function () {
      soundOn = !soundOn;
      soundBtn.classList.toggle("on", soundOn);
      soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
      if (soundOn) startSound(); else stopSound();
    });

    /* the candle (visible only in evening via CSS) */
    var candle = document.createElement("div");
    candle.className = "candle";
    candle.setAttribute("aria-hidden", "true");
    candle.innerHTML = '<div class="glow"></div><div class="flame"></div><div class="wax"></div>';
    document.body.appendChild(candle);
  }

  function init() {
    buildUI();
    applyTheme(isEvening());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
