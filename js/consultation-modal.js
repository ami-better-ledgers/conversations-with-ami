(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const trigger = document.getElementById("consultation-modal-trigger");
    const overlay = document.getElementById("consultation-modal-overlay");
    const closeBtn = document.getElementById("consultation-modal-close");
    const iframe = document.getElementById("consultation-modal-iframe");
    if (!trigger || !overlay || !iframe) return;

    function open() {
      if (!iframe.src) iframe.src = "https://meet.conversationswithami.com/consultation";
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
