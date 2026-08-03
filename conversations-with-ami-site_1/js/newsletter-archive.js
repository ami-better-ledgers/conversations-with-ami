(function () {
  const grid = document.getElementById("archive-grid");
  const reader = document.getElementById("newsletter-reader");
  if (!grid) return;

  let issuesData = [];

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  function renderMessage(message) {
    grid.innerHTML = `<p class="state-msg">${message}</p>`;
  }

  function closeReader() {
    if (!reader) return;
    reader.hidden = true;
    reader.innerHTML = "";
    grid.querySelectorAll(".archive-card").forEach(function (c) {
      c.setAttribute("aria-expanded", "false");
    });
  }

  function openReader(index) {
    if (!reader) return;
    const issue = issuesData[index];
    if (!issue) return;

    reader.innerHTML = `
      <button type="button" class="reader-close" aria-label="Close">✕ Close</button>
      <p class="issue-date">${formatDate(issue.publishedAt)}</p>
      <h2>${issue.subject || "Untitled issue"}</h2>
      <div class="reader-body">${issue.content || "<p>This issue doesn't have readable content yet.</p>"}</div>
      <p><a href="${issue.url}" target="_blank" rel="noopener">Open this issue on Kit ↗</a></p>
    `;
    reader.hidden = false;

    grid.querySelectorAll(".archive-card").forEach(function (c, i) {
      c.setAttribute("aria-expanded", String(i === index));
    });

    reader.querySelector(".reader-close").addEventListener("click", closeReader);
    reader.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function render(issues) {
    if (!issues.length) {
      renderMessage(
        "No public issues yet — mark a broadcast \u201cPublic\u201d in Kit when you send it, and it'll show up here automatically."
      );
      return;
    }
    issuesData = issues;
    grid.innerHTML = issues
      .map(function (issue, i) {
        return `
          <button type="button" class="archive-card" data-index="${i}" aria-expanded="false">
            <span class="issue-num">Issue ${String(issue.issueNumber).padStart(2, "0")}</span>
            <h3>${issue.subject || "Untitled issue"}</h3>
            <span class="issue-date">${formatDate(issue.publishedAt)}</span>
          </button>`;
      })
      .join("");

    grid.querySelectorAll(".archive-card").forEach(function (card) {
      card.addEventListener("click", function () {
        const isOpen = card.getAttribute("aria-expanded") === "true";
        if (isOpen) {
          closeReader();
        } else {
          openReader(Number(card.dataset.index));
        }
      });
    });
  }

  renderMessage("Loading past issues…");

  fetch("/api/newsletter")
    .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
    .then(function (result) {
      if (!result.ok || result.data.error) {
        renderMessage(
          "The newsletter archive isn't connected yet. Once KIT_API_KEY is set as an environment variable in Cloudflare Pages, public issues will show up here automatically."
        );
        return;
      }
      render(result.data.issues || []);
    })
    .catch(function () {
      renderMessage("Couldn't load past issues right now — please check back later.");
    });
})();
