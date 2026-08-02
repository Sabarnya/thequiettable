/* The Quiet Table — mood + UI layer
   · Evening candlelight mode (auto after sunset, manual override, remembered)
   · Ambient rain, synthesized live — starts on arrival, remembered if turned off
   · Mobile navigation panel
   No dependencies, no audio files, nothing added to the CSP. */
(function () {
  "use strict";

  var reduce = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= EVENING MODE ================= */
  var THEME_KEY = "tqt-theme";
  function autoEvening() { var h = new Date().getHours(); return h >= 18 || h < 6; }
  function readLS(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function writeLS(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function isEvening() {
    var s = readLS(THEME_KEY);
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

  /* ================= AMBIENT SOUND ================= */
  /* Browsers block audio until the visitor interacts with the page, so we build
     the graph immediately and resume it on their first touch/click/scroll. */
  var SOUND_KEY = "tqt-sound";          /* "off" when the visitor opted out */
  var ctx = null, master = null, nodes = [], dropTimer = null;
  var soundOn = false, built = false;

  function noiseBuffer(sec) {
    var len = Math.floor(ctx.sampleRate * sec);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function buildGraph() {
    if (built) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.connect(ctx.destination);

    /* rain — band-passed noise */
    var rain = ctx.createBufferSource();
    rain.buffer = noiseBuffer(3); rain.loop = true;
    var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 400;
    var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400;
    var rg = ctx.createGain(); rg.gain.value = 0.055;
    rain.connect(hp).connect(lp).connect(rg).connect(master);
    rain.start(); nodes.push(rain);

    /* warm room tone underneath */
    var room = ctx.createBufferSource();
    room.buffer = noiseBuffer(4); room.loop = true;
    var rlp = ctx.createBiquadFilter(); rlp.type = "lowpass"; rlp.frequency.value = 180;
    var rmg = ctx.createGain(); rmg.gain.value = 0.05;
    room.connect(rlp).connect(rmg).connect(master);
    room.start(); nodes.push(room);

    built = true;
    droplet();
  }

  function droplet() {
    if (dropTimer) clearTimeout(dropTimer);
    dropTimer = setTimeout(function () {
      if (soundOn && ctx && ctx.state === "running") {
        var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
        o.type = "sine";
        o.frequency.value = 1600 + Math.random() * 1800;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.012 + Math.random() * 0.015, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        o.connect(g).connect(master);
        o.start(t); o.stop(t + 0.3);
      }
      droplet();
    }, 400 + Math.random() * 2200);
  }

  function fadeIn() {
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 2.5);
  }
  function fadeOut() {
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
  }

  function soundStart() {
    try {
      buildGraph();
      soundOn = true;
      // Resuming must happen synchronously inside a user gesture on mobile.
      if (ctx && ctx.state === "suspended") {
        var r = ctx.resume();
        if (r && r.then) r.then(function(){ fadeIn(); });
        else fadeIn();
      } else {
        fadeIn();
      }
      paintSound();
    } catch (e) { /* no audio support — stay quiet */ }
  }
  function soundStop() {
    soundOn = false;
    fadeOut();
    paintSound();
  }
  function paintSound() {
    if (!soundBtn) return;
    soundBtn.classList.toggle("on", soundOn);
    soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
    soundBtn.title = soundOn
      ? "Turn off kitchen sounds · শব্দ বন্ধ করুন"
      : "Kitchen sounds · রান্নাঘরের শব্দ";
  }

  /* Arrive with sound on unless they've turned it off before (or prefer less motion) */
  function armSound() {
    // Default is ON. We only stay silent if the visitor explicitly turned it off.
    if (readLS(SOUND_KEY) === "off" || reduce) { soundOn = false; paintSound(); return; }
    // Mark intent to play, and reflect it in the button immediately.
    soundOn = true;
    paintSound();
    // Browsers block audio until the first interaction, so start the graph now
    // (it begins suspended) and resume it the instant the visitor does anything.
    soundStart();
    var evs = ["pointerdown", "touchstart", "click", "keydown", "scroll", "wheel"];
    function wake() {
      evs.forEach(function (e) { document.removeEventListener(e, wake, true); });
      if (soundOn && ctx) {
        if (ctx.state === "suspended") ctx.resume();
        fadeIn();
      }
    }
    evs.forEach(function (e) {
      document.addEventListener(e, wake, { passive: true, capture: true });
    });
  }

  /* pause while the tab is hidden, resume when they come back */
  document.addEventListener("visibilitychange", function () {
    if (!ctx || !soundOn) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  /* ================= UI ================= */
  var moodBtn = null, soundBtn = null, navToggle = null;

  function mkToggle(cls, label) {
    var b = document.createElement("button");
    b.className = "tqt-toggle " + cls;
    b.type = "button";
    b.setAttribute("aria-label", label);
    return b;
  }

  function buildUI() {
    var header = document.querySelector(".site-header");
    var nav = header && header.querySelector("nav");
    if (!header || !nav) return;

    var tools = document.createElement("div");
    tools.className = "header-tools";
    header.appendChild(tools);

    // Reliable tap on desktop AND mobile: one handler bound to click; we also
    // call preventDefault on a preceding touchend to avoid the 300ms ghost delay.
    function onTap(el, fn) {
      var handled = false;
      el.addEventListener("touchend", function (e) {
        handled = true;
        e.preventDefault();
        e.stopPropagation();
        fn();
        setTimeout(function () { handled = false; }, 500);
      }, { passive: false });
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        if (handled) return;   // touchend already handled it
        fn();
      });
    }

    moodBtn = mkToggle("mood-btn", "Toggle evening mode");
    tools.appendChild(moodBtn);
    onTap(moodBtn, function () {
      var next = !document.body.classList.contains("evening");
      writeLS(THEME_KEY, next ? "evening" : "day");
      applyTheme(next);
    });

    soundBtn = mkToggle("sound-btn", "Toggle kitchen sounds");
    soundBtn.textContent = "\u266a";
    tools.appendChild(soundBtn);
    onTap(soundBtn, function () {
      if (soundOn) { soundStop(); writeLS(SOUND_KEY, "off"); }
      else { soundStart(); writeLS(SOUND_KEY, "on"); }
    });

    /* mobile menu button + scrim */
    navToggle = document.createElement("button");
    navToggle.className = "nav-toggle";
    navToggle.type = "button";
    navToggle.setAttribute("aria-label", "Menu");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.innerHTML = "<span></span>";
    tools.appendChild(navToggle);

    // Move the language toggle and Subscribe button into the nav panel so they
    // live inside the slide-in menu on mobile (CSS decides where they show).
    var navRight = header.querySelector(".nav-right") || header;
    var lang = header.querySelector(".lang-toggle");
    var subscribe = header.querySelector(".subscribe");
    var igNav = header.querySelector(".ig-nav");
    if (lang && nav && !nav.contains(lang)) nav.appendChild(lang);
    if (igNav && nav && !nav.contains(igNav)) nav.appendChild(igNav);
    if (subscribe && nav && !nav.contains(subscribe)) nav.appendChild(subscribe);

    var scrim = document.createElement("div");
    scrim.className = "nav-scrim";
    document.body.appendChild(scrim);

    function setNav(open) {
      document.body.classList.toggle("nav-open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
    navToggle.addEventListener("click", function () {
      setNav(!document.body.classList.contains("nav-open"));
    });
    scrim.addEventListener("click", function () { setNav(false); });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setNav(false);
    });

    /* candle (visible only in evening, via CSS) */
    var candle = document.createElement("div");
    candle.className = "candle";
    candle.setAttribute("aria-hidden", "true");
    candle.innerHTML = '<div class="glow"></div><div class="flame"></div><div class="wax"></div>';
    document.body.appendChild(candle);
  }

  function init() {
    buildUI();
    applyTheme(isEvening());
    armSound();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();