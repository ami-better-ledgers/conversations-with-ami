/* Newsletter signup. Fills every element with class "signup-form-slot" with the Still Building
   with Ami signup form. It posts to /api/subscribe, which sends a confirmation email; the person
   is only added to the list after they click the link in it (double opt-in). */
(function () {
  var counter = 0;

  function build(slot) {
    var id = "sb-email-" + ++counter;
    slot.classList.add("is-form");
    slot.innerHTML =
      '<form class="sb-form" novalidate>' +
      '<label class="sb-form-label" for="' + id + '">Your email</label>' +
      '<div class="sb-form-row">' +
      '<input class="sb-form-input" id="' + id + '" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required>' +
      '<button class="sb-form-btn" type="submit">Join Still Building</button>' +
      "</div>" +
      '<div class="sb-form-hp" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<p class="sb-form-note">One idea from a real conversation, every two weeks. No spam. Unsubscribe anytime.</p>' +
      '<p class="sb-form-status" role="status" aria-live="polite"></p>' +
      "</form>";

    var form = slot.querySelector("form");
    var input = form.querySelector(".sb-form-input");
    var btn = form.querySelector(".sb-form-btn");
    var status = form.querySelector(".sb-form-status");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "sb-form-status";
      status.textContent = "";
      var email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.className = "sb-form-status is-error";
        status.textContent = "Enter a valid email address.";
        input.focus();
        return;
      }
      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = "One moment…";
      fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, website: form.elements.website.value }),
      })
        .then(function (res) {
          return res.json().then(function (d) { return { ok: res.ok, d: d }; });
        })
        .then(function (r) {
          if (!r.ok) throw new Error((r.d && r.d.error) || "Something went wrong. Please try again.");
          slot.innerHTML =
            '<div class="sb-form-done" role="status"><strong>Check your email.</strong> ' +
            (r.d.message || "Tap the confirm button we sent to finish joining.") +
            "</div>";
        })
        .catch(function (err) {
          btn.disabled = false;
          btn.textContent = label;
          status.className = "sb-form-status is-error";
          status.textContent = err.message || "Something went wrong. Please try again.";
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".signup-form-slot").forEach(build);
  });
})();
