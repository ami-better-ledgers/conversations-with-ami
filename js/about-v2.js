/* About page: scroll reveal + the "My story" chapter tabs.
   Without JavaScript every chapter is shown one after another. */
(function () {
  // scroll reveal
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // chapter tabs
  var box = document.querySelector("[data-tabs]");
  if (!box) return;
  var tabs = Array.prototype.slice.call(box.querySelectorAll('[role="tab"]'));
  var panels = Array.prototype.slice.call(box.querySelectorAll('[role="tabpanel"]'));
  var current = 0;

  function show(i, focus) {
    current = (i + tabs.length) % tabs.length;
    tabs.forEach(function (t, k) {
      var on = k === current;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(function (p, k) {
      p.hidden = k !== current;
      if (k === current) { p.classList.remove("swap"); void p.offsetWidth; p.classList.add("swap"); }
    });
    if (focus) tabs[current].focus();
    var prev = box.querySelector("[data-story-prev]"), next = box.querySelector("[data-story-next]");
    if (prev) prev.disabled = current === 0;
    if (next) next.textContent = current === tabs.length - 1 ? "Back to the start" : "Next chapter →";
  }

  box.classList.add("is-tabs");
  tabs.forEach(function (t, k) {
    t.addEventListener("click", function () { show(k); });
    t.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); show(k + 1, true); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); show(k - 1, true); }
      if (e.key === "Home") { e.preventDefault(); show(0, true); }
      if (e.key === "End") { e.preventDefault(); show(tabs.length - 1, true); }
    });
  });
  var prev = box.querySelector("[data-story-prev]"), next = box.querySelector("[data-story-next]");
  if (prev) prev.addEventListener("click", function () { show(current - 1); });
  if (next) next.addEventListener("click", function () { show(current === tabs.length - 1 ? 0 : current + 1); });
  show(0);
})();
