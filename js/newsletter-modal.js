(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const trigger = document.getElementById("newsletter-modal-trigger");
    const overlay = document.getElementById("newsletter-modal-overlay");
    const closeBtn = document.getElementById("newsletter-modal-close");
    if (!trigger || !overlay || !closeBtn) return;

    function open() {
      overlay.hidden = false;
      document.body.style.overflow = "hidden";
    }
    function close() {
      overlay.hidden = true;
      document.body.style.overflow = "";
    }

    trigger.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !overlay.hidden) close();
    });
  });
})();
