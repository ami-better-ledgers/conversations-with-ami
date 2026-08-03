(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const triggers = document.querySelectorAll("#apply-modal-trigger, #apply-modal-trigger-inline");
    const overlay = document.getElementById("apply-modal-overlay");
    const closeBtn = document.getElementById("apply-modal-close");
    const iframe = document.getElementById("apply-modal-iframe");
    if (!triggers.length || !overlay || !iframe) return;

    function open() {
      if (!iframe.src) iframe.src = "apply/";
      overlay.hidden = false;
      document.body.style.overflow = "hidden";
    }
    function close() {
      overlay.hidden = true;
      document.body.style.overflow = "";
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", open);
    });
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !overlay.hidden) close();
    });
  });
})();
