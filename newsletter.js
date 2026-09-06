/* The Quiet Table — newsletter signup.
   Submits through our own secure endpoint /api/subscribe (a Cloudflare Pages
   Function), which holds the Buttondown API key server-side and returns a real
   success/failure — so subscriptions are never silently dropped. */
(function () {
  function isBn() { return document.body.classList.contains("bn"); }

  function showMsg(form, text, isError) {
    var box = form.parentNode.querySelector(".sub-msg");
    if (!box) {
      box = document.createElement("p");
      box.className = "sub-msg";
      form.parentNode.appendChild(box);
    }
    box.textContent = text;
    box.style.color = isError ? "#a5613f" : "";
  }

  document.querySelectorAll("form.subform").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var btn = form.querySelector("button");
      var email = ((input && input.value) || "").trim();
      if (!email) return;

      var label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = isBn() ? "পাঠানো হচ্ছে…" : "Sending…";

      fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email })
      })
        .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
        .then(function (r) {
          if (r.ok && r.d && r.d.ok) {
            input.value = "";
            showMsg(form, isBn()
              ? (r.d.already
                  ? "আপনি তো আগেই যুক্ত আছেন — ধন্যবাদ! ♥"
                  : "ধন্যবাদ — কনফার্ম করতে আপনার ইনবক্স দেখুন। ♥")
              : (r.d.already
                  ? "You're already subscribed — thank you! ♥"
                  : "Thank you — check your inbox to confirm. ♥"), false);
          } else if (r.d && r.d.error === "invalid_email") {
            showMsg(form, isBn()
              ? "ইমেল ঠিকানাটি একবার দেখে নিন।"
              : "That email doesn't look right — please check it.", true);
          } else {
            showMsg(form, isBn()
              ? "কিছু একটা সমস্যা হলো। একটু পরে আবার চেষ্টা করুন।"
              : "Something went wrong — please try again in a moment.", true);
          }
        })
        .catch(function () {
          showMsg(form, isBn()
            ? "সংযোগে সমস্যা হলো। আবার চেষ্টা করুন।"
            : "Connection problem — please try again.", true);
        })
        .finally(function () {
          btn.disabled = false;
          btn.innerHTML = label;
        });
    });
  });
})();