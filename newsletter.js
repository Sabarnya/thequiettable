/* The Quiet Table — newsletter signup.

   ============================================================
   EDIT THIS ONE LINE. Put your Buttondown username in the quotes
   (create a free account at buttondown.com first). That's the only
   change needed to make every subscribe button on the site work.
   ============================================================ */
var NEWSLETTER_USERNAME = "https://buttondown.com/the_quiet_table";
/* ============================================================ */

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

      // Not configured yet — tell the owner instead of failing silently.
      if (NEWSLETTER_USERNAME === "YOUR_BUTTONDOWN_USERNAME") {
        showMsg(form, isBn()
          ? "নিউজলেটার এখনো সেট করা হয়নি — newsletter.js-এ আপনার Buttondown ইউজারনেম দিন (README দেখুন)।"
          : "Newsletter isn't connected yet — add your Buttondown username in newsletter.js (see README).", true);
        return;
      }

      var label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = isBn() ? "পাঠানো হচ্ছে…" : "Sending…";

      var data = new FormData();
      data.append("email", email);

      fetch("https://buttondown.com/api/emails/embed-subscribe/" + NEWSLETTER_USERNAME, {
        method: "POST",
        body: data,
        mode: "no-cors"
      }).then(function () {
        input.value = "";
        showMsg(form, isBn()
          ? "ধন্যবাদ — কনফার্ম করতে আপনার ইনবক্স দেখুন। ♥"
          : "Thank you — check your inbox to confirm. ♥", false);
      }).catch(function () {
        showMsg(form, isBn()
          ? "কিছু একটা সমস্যা হলো। আবার চেষ্টা করুন।"
          : "Something went wrong — please try again.", true);
      }).finally(function () {
        btn.disabled = false;
        btn.innerHTML = label;
      });
    });
  });
})();
