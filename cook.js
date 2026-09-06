/* The Quiet Table — cooking mode
   Full-screen, one-step-at-a-time recipe view. Wake lock keeps the screen on;
   timers are auto-detected from step text in English AND Bengali. */
(function () {
  "use strict";

  var article = document.querySelector(".article-body");
  var startBtn = document.querySelector(".cook-start");
  if (!article || !startBtn) return;

  /* ---------- bilingual labels ---------- */
  var L = {
    en: {
      gather: "first, gather everything",
      ings: "Ingredients", step: "step", of: "of",
      begin: "Begin →", next: "Next →", back: "← Back", done: "Finish",
      timer: "start timer", pause: "pause", resume: "resume", reset: "reset",
      finale: "the table is set",
      finaleText: "You're done — serve it warm, and enjoy the quiet.",
      close: "Close cooking mode"
    },
    bn: {
      gather: "প্রথমে সব গুছিয়ে নিন",
      ings: "উপকরণ", step: "ধাপ", of: "/",
      begin: "শুরু করুন →", next: "পরের ধাপ →", back: "← আগের ধাপ", done: "শেষ",
      timer: "টাইমার চালু করুন", pause: "থামান", resume: "আবার চালু", reset: "রিসেট",
      finale: "টেবিল সাজানো",
      finaleText: "হয়ে গেছে — গরম গরম পরিবেশন করুন, আর শান্তিটুকু উপভোগ করুন।",
      close: "রান্না মোড বন্ধ করুন"
    }
  };
  function lang() { return document.documentElement.lang === "bn" ? "bn" : "en"; }
  function toBnDigits(s) {
    return String(s).replace(/\d/g, function (d) { return "০১২৩৪৫৬৭৮৯"[+d]; });
  }
  function num(n) { return lang() === "bn" ? toBnDigits(n) : String(n); }

  /* ---------- timer detection (EN + BN numerals) ---------- */
  function normalizeDigits(t) {
    return t.replace(/[০-৯]/g, function (d) {
      return String("০১২৩৪৫৬৭৮৯".indexOf(d));
    });
  }
  function detectMinutes(text) {
    var t = normalizeDigits(text);
    var best = 0;
    // ranges like "8 to 10 minutes" / "৮ থেকে ১০ মিনিট" — take the upper bound
    var re = /(\d+)(?:\s*(?:to|-|–|থেকে)\s*(\d+))?\s*(?:minutes?|mins?|min\b|মিনিট)/gi;
    var m;
    while ((m = re.exec(t))) {
      var v = parseInt(m[2] || m[1], 10);
      if (v > best) best = v;
    }
    var rh = /(\d+)(?:\s*(?:to|-|–|থেকে)\s*(\d+))?\s*(?:hours?|hrs?\b|ঘণ্টা)/gi;
    while ((m = rh.exec(t))) {
      var hv = parseInt(m[2] || m[1], 10) * 60;
      if (hv > best) best = hv;
    }
    return best; // minutes; 0 = no timer
  }

  /* ---------- gentle chime (WebAudio, created on user gesture) ---------- */
  var audioCtx = null;
  function chime() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.35].forEach(function (offset, i) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = "sine";
        o.frequency.value = i === 0 ? 830 : 1108; /* soft two-note bell */
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime + offset);
        g.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + offset + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + offset + 1.4);
        o.connect(g).connect(audioCtx.destination);
        o.start(audioCtx.currentTime + offset);
        o.stop(audioCtx.currentTime + offset + 1.5);
      });
    } catch (e) { /* silence is acceptable in a quiet kitchen */ }
  }

  /* ---------- wake lock ---------- */
  var wakeLock = null;
  function requestWake() {
    if (!("wakeLock" in navigator)) return;
    navigator.wakeLock.request("screen").then(function (wl) {
      wakeLock = wl;
    }).catch(function () { /* not fatal */ });
  }
  function releaseWake() {
    if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
  }
  document.addEventListener("visibilitychange", function () {
    if (overlay && overlay.classList.contains("open") && !document.hidden) requestWake();
  });

  /* ---------- build overlay ---------- */
  var overlay = document.createElement("div");
  overlay.className = "cookmode";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  document.body.appendChild(overlay);

  var idx = 0;          /* 0 = ingredients, 1..N = steps, N+1 = finale */
  var steps = [];       /* {text, minutes} in current language */
  var ings = [];
  var checked = [];     /* persisted across screens while open */
  var timer = null;     /* {total, left, interval, running} */

  function collect() {
    var l = lang();
    ings = Array.prototype.map.call(
      document.querySelectorAll("ul.ingredients li"),
      function (li) { return li.getAttribute("data-" + l) || li.textContent; });
    steps = Array.prototype.map.call(
      document.querySelectorAll("ol.steps li"),
      function (li) {
        var t = li.getAttribute("data-" + l) || li.textContent;
        return { text: t, minutes: detectMinutes(t) };
      });
    if (checked.length !== ings.length) checked = ings.map(function () { return false; });
  }

  function fmt(sec) {
    var mm = Math.floor(sec / 60), ss = sec % 60;
    var s = (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss;
    return lang() === "bn" ? toBnDigits(s) : s;
  }

  function stopTimer() {
    if (timer && timer.interval) clearInterval(timer.interval);
    timer = null;
  }

  function render() {
    var l = L[lang()];
    var title = document.querySelector("h1");
    var titleText = title ? title.textContent : "";
    var total = steps.length;
    var html = '' +
      '<div class="cm-top">' +
        '<div class="cm-title">' + titleText + '</div>' +
        '<button class="cm-close" aria-label="' + l.close + '">×</button>' +
      '</div>' +
      '<div class="cm-stage slide">';

    if (idx === 0) {
      html += '<div class="cm-eyebrow">' + l.gather + '</div>' +
              '<ul class="cm-ings">' +
              ings.map(function (t, i) {
                return '<li data-i="' + i + '" class="' + (checked[i] ? "done" : "") + '">' + t + '</li>';
              }).join("") + '</ul>';
    } else if (idx <= total) {
      var st = steps[idx - 1];
      html += '<div class="cm-eyebrow">' + l.step + ' ' + num(idx) + ' ' + l.of + ' ' + num(total) + '</div>' +
              '<div class="cm-text">' + st.text + '</div>';
      if (st.minutes > 0) {
        var secs = st.minutes * 60;
        html += '<div class="cm-timer" data-total="' + secs + '">' +
                  '<span class="t-read">' + fmt(secs) + '</span>' +
                  '<button class="t-go">' + l.timer + '</button>' +
                  '<button class="t-reset">' + l.reset + '</button>' +
                '</div>';
      }
    } else {
      html += '<div class="cm-eyebrow">' + l.finale + '</div>' +
              '<div class="cm-text">' + l.finaleText + '</div>';
    }

    html += '</div>' +
      '<div class="cm-bar">' +
        '<div class="cm-nav">' +
          (idx > 0 ? '<button class="btn btn-ghost cm-prev">' + l.back + '</button>' : '<span></span>') +
        '</div>' +
        '<div class="cm-dots">' +
          Array.apply(null, Array(total + 2)).map(function (_, i) {
            return '<i class="' + (i === idx ? "on" : "") + '"></i>';
          }).join("") +
        '</div>' +
        '<div class="cm-nav">' +
          (idx <= total
            ? '<button class="btn btn-solid cm-next">' + (idx === 0 ? l.begin : (idx === total ? l.done : l.next)) + '</button>'
            : '<button class="btn btn-solid cm-close2">' + l.done + ' ✓</button>') +
        '</div>' +
      '</div>';

    overlay.innerHTML = html;

    /* wire */
    overlay.querySelector(".cm-close").addEventListener("click", close);
    var nx = overlay.querySelector(".cm-next");
    if (nx) nx.addEventListener("click", function () { go(idx + 1); });
    var pv = overlay.querySelector(".cm-prev");
    if (pv) pv.addEventListener("click", function () { go(idx - 1); });
    var c2 = overlay.querySelector(".cm-close2");
    if (c2) c2.addEventListener("click", close);

    overlay.querySelectorAll(".cm-ings li").forEach(function (li) {
      li.addEventListener("click", function () {
        var i = +li.getAttribute("data-i");
        checked[i] = !checked[i];
        li.classList.toggle("done", checked[i]);
      });
    });

    var tEl = overlay.querySelector(".cm-timer");
    if (tEl) wireTimer(tEl);
  }

  function wireTimer(tEl) {
    var l = L[lang()];
    var read = tEl.querySelector(".t-read");
    var go = tEl.querySelector(".t-go");
    var reset = tEl.querySelector(".t-reset");
    var totalSec = +tEl.getAttribute("data-total");
    stopTimer();
    timer = { total: totalSec, left: totalSec, interval: null, running: false };

    function paint() { read.textContent = fmt(timer.left); }
    go.addEventListener("click", function () {
      if (timer.running) {
        clearInterval(timer.interval); timer.running = false;
        go.textContent = l.resume;
      } else {
        timer.running = true;
        go.textContent = l.pause;
        tEl.classList.remove("ringing");
        timer.interval = setInterval(function () {
          timer.left--;
          paint();
          if (timer.left <= 0) {
            clearInterval(timer.interval);
            timer.running = false;
            timer.left = 0;
            tEl.classList.add("ringing");
            go.textContent = l.timer;
            timer.left = timer.total;
            chime();
            setTimeout(function () { paint(); }, 4000);
          }
        }, 1000);
      }
    });
    reset.addEventListener("click", function () {
      stopTimer();
      timer = { total: totalSec, left: totalSec, interval: null, running: false };
      tEl.classList.remove("ringing");
      go.textContent = l.timer;
      paint();
    });
  }

  function go(n) {
    stopTimer();
    idx = Math.max(0, Math.min(n, steps.length + 1));
    render();
  }

  function open() {
    collect();
    idx = 0;
    overlay.classList.add("open");
    document.body.classList.add("cooking");
    requestWake();
    render();
  }
  function close() {
    stopTimer();
    overlay.classList.remove("open");
    document.body.classList.remove("cooking");
    releaseWake();
  }

  startBtn.addEventListener("click", open);

  /* keyboard */
  document.addEventListener("keydown", function (e) {
    if (!overlay.classList.contains("open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") go(idx + 1);
    else if (e.key === "ArrowLeft") go(idx - 1);
  });

  /* if the visitor flips language while cooking, re-render in place */
  document.querySelectorAll(".lang-toggle button").forEach(function (b) {
    b.addEventListener("click", function () {
      if (overlay.classList.contains("open")) {
        setTimeout(function () { collect(); render(); }, 0);
      }
    });
  });
})();
