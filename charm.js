/* The Quiet Table — charm layer v2
   Sakura petals with cursor wind, scroll reveals, hero parallax, steam wisps.
   Everything bows out if the visitor prefers reduced motion. No dependencies. */
(function () {
  "use strict";

  var reduce = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Page-load arrival ---------- */
  function arrive() {
    var first = document.querySelector(".hero, .page-intro, header.site-header + section");
    if (first) first.classList.add("tqt-arrive");
  }

  /* ---------- 2. Scroll reveal ---------- */
  function setupReveal() {
    var targets = document.querySelectorAll(
      ".about, .week, .news, .page-intro .wrap > *, .bento .ccard, .grid .ccard, .article-body, .related"
    );
    if (!targets.length) return;

    var gridCards = document.querySelectorAll(".bento .ccard, .grid .ccard");
    gridCards.forEach(function (c, i) {
      c.classList.add("reveal", "d" + ((i % 4) + 1));
    });
    targets.forEach(function (t) {
      if (!t.classList.contains("reveal")) t.classList.add("reveal");
    });

    if (reduce || !("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(function (el) {
        el.classList.add("is-in");
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  }

  /* ---------- 3. Sakura petals with cursor wind ---------- */
  function setupPetals() {
    if (reduce) return;

    var canvas = document.createElement("canvas");
    canvas.id = "petals";
    canvas.setAttribute("aria-hidden", "true");
    document.body.insertBefore(canvas, document.body.firstChild);
    var ctx = canvas.getContext("2d");

    var w, h, dpr;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = Math.floor(innerWidth * dpr);
      h = canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = innerWidth + "px";
      canvas.style.height = innerHeight + "px";
    }
    resize();
    addEventListener("resize", resize);

    /* Sakura pinks in front, sage/terracotta as supporting notes. */
    var tints = [
      "rgba(233,175,200,",  // sakura pink
      "rgba(243,199,216,",  // pale blossom
      "rgba(236,186,190,",  // blush
      "rgba(233,175,200,",  // sakura again (weighted)
      "rgba(192,112,74,",   // terracotta accent
      "rgba(163,180,133,"   // soft sage
    ];

    var count = Math.max(18, Math.min(42, Math.round(innerWidth / 42)));
    var petals = [];

    /* cursor wind */
    var mx = -9999, my = -9999, mvx = 0, mvy = 0, lastX = null, lastY = null;
    addEventListener("mousemove", function (e) {
      var x = e.clientX * dpr, y = e.clientY * dpr;
      if (lastX !== null) {
        mvx = mvx * 0.8 + (x - lastX) * 0.2;
        mvy = mvy * 0.8 + (y - lastY) * 0.2;
      }
      lastX = mx = x; lastY = my = y;
    }, { passive: true });

    function makePetal(y) {
      var size = (8 + Math.random() * 10) * dpr;
      return {
        x: Math.random() * w,
        y: y != null ? y : Math.random() * h,
        size: size,
        speedY: (0.25 + Math.random() * 0.5) * dpr,
        drift: (Math.random() * 0.8 - 0.4) * dpr,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.006 + Math.random() * 0.012,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.03,
        alpha: 0.45 + Math.random() * 0.4,
        vx: 0, vy: 0,          // wind-imparted velocity
        tint: tints[(Math.random() * tints.length) | 0]
      };
    }
    for (var i = 0; i < count; i++) petals.push(makePetal());

    function drawPetal(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.tint + p.alpha + ")";
      /* five-lobed hint: main petal + small notch, reads as blossom at small size */
      ctx.beginPath();
      ctx.moveTo(0, -p.size / 2);
      ctx.quadraticCurveTo(p.size / 2, -p.size / 6, p.size / 4, p.size / 2);
      ctx.quadraticCurveTo(0, p.size / 3, -p.size / 4, p.size / 2);
      ctx.quadraticCurveTo(-p.size / 2, -p.size / 6, 0, -p.size / 2);
      ctx.fill();
      ctx.restore();
    }

    var WIND_RADIUS = 140;   /* px (CSS) around cursor that feels the wind */
    var running = true;
    document.addEventListener("visibilitychange", function () {
      running = !document.hidden;
      if (running) requestAnimationFrame(tick);
    });

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      var wr = WIND_RADIUS * dpr;
      for (var i = 0; i < petals.length; i++) {
        var p = petals[i];

        /* cursor wind: impulse falls off with distance */
        var dx = p.x - mx, dy = p.y - my;
        var d2 = dx * dx + dy * dy;
        if (d2 < wr * wr) {
          var d = Math.sqrt(d2) || 1;
          var force = (1 - d / wr) * 0.6;
          p.vx += (dx / d) * force + mvx * 0.02 * force;
          p.vy += (dy / d) * force * 0.5 + mvy * 0.02 * force;
          p.rotSpeed += force * 0.01 * (Math.random() - 0.5);
        }
        p.vx *= 0.94; p.vy *= 0.94;   /* wind decays; serenity returns */

        p.sway += p.swaySpeed;
        p.x += p.drift + Math.sin(p.sway) * 0.5 * dpr + p.vx;
        p.y += p.speedY + p.vy;
        p.rot += p.rotSpeed;
        p.rotSpeed *= 0.99;

        if (p.y - p.size > h) { petals[i] = makePetal(-p.size); }
        else if (p.y < -p.size * 3) { petals[i] = makePetal(-p.size); }
        else if (p.x < -p.size) { p.x = w + p.size; }
        else if (p.x > w + p.size) { p.x = -p.size; }
        drawPetal(p);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- 4. Gentle hero parallax ---------- */
  function setupParallax() {
    if (reduce) return;
    var hero = document.querySelector(".hero");
    if (!hero) return;
    var ticking = false;
    addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, 600);
        hero.style.transform = "translateY(" + (y * 0.12) + "px)";
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- 5. Steam over the recipe photo ---------- */
  function setupSteam() {
    if (reduce) return;
    var hero = document.querySelector(".recipe-hero");
    if (!hero) return;
    ["s1", "s2", "s3"].forEach(function (cls) {
      var s = document.createElement("div");
      s.className = "steam " + cls;
      s.setAttribute("aria-hidden", "true");
      hero.appendChild(s);
    });
  }

  function init() {
    arrive();
    setupReveal();
    setupPetals();
    setupParallax();
    setupSteam();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
