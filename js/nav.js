(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const nav = document.querySelector(".site-nav");
    const toggle = document.querySelector(".nav-toggle");
    if (!nav) return;
    if (toggle) {
      toggle.addEventListener("click", function () {
        const open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    // "Our Companies" dropdown: opens on click or keyboard; hover also works on desktop (CSS).
    const drop = nav.querySelector(".nav-drop");
    const dropBtn = nav.querySelector(".nav-drop-btn");
    if (drop && dropBtn) {
      const setOpen = function (open) {
        drop.classList.toggle("is-open", open);
        dropBtn.setAttribute("aria-expanded", open ? "true" : "false");
      };
      dropBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        setOpen(!drop.classList.contains("is-open"));
      });
      document.addEventListener("click", function (e) {
        if (!drop.contains(e.target)) setOpen(false);
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && drop.classList.contains("is-open")) {
          setOpen(false);
          dropBtn.focus();
        }
      });
    }
  });
})();
