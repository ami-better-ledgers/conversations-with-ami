(function () {
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".share-more-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var title = btn.dataset.shareTitle || document.title;
        var text = btn.dataset.shareText || "";
        var url = btn.dataset.shareUrl || window.location.href;

        if (navigator.share) {
          navigator.share({ title: title, text: text, url: url }).catch(function () {});
          return;
        }
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function () {
            var original = btn.getAttribute("aria-label");
            btn.setAttribute("aria-label", "Link copied");
            setTimeout(function () { btn.setAttribute("aria-label", original); }, 2000);
          }).catch(function () {});
        }
      });
    });
  });
})();
