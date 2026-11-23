// Newsletter archive: lists every issue of Still Building with Ami from /api/issues.
// Each card links to the issue's own page (/newsletter/issue-NN) so every issue is a real,
// shareable, searchable page on this site.
(function () {
  const grid = document.getElementById("archive-grid");
  if (!grid) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(String(iso).slice(0, 10) + "T12:00:00Z");
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  }

  function renderMessage(message) {
    grid.innerHTML = '<p class="state-msg">' + esc(message) + "</p>";
  }

  function render(issues) {
    if (!issues.length) {
      renderMessage("The first issue is on its way. Check back soon.");
      return;
    }
    grid.innerHTML = issues
      .map(function (issue) {
        return (
          '<a class="archive-card" href="' + esc(issue.url) + '">' +
          '<span class="issue-num">Issue ' + String(issue.number).padStart(2, "0") + "</span>" +
          "<h3>" + esc(issue.title) + "</h3>" +
          '<span class="issue-excerpt">' + esc(issue.excerpt) + "</span>" +
          '<span class="issue-date">' + formatDate(issue.date) + "</span>" +
          "</a>"
        );
      })
      .join("");
  }

  renderMessage("Loading past issues…");

  fetch("/api/issues")
    .then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, data: data }; });
    })
    .then(function (result) {
      if (!result.ok || result.data.error) {
        renderMessage("Couldn't load past issues right now. Please check back later.");
        return;
      }
      render(result.data.issues || []);
    })
    .catch(function () {
      renderMessage("Couldn't load past issues right now. Please check back later.");
    });
})();
