(function () {
  const track = document.getElementById("companies-track");
  const wrap = document.getElementById("companies-carousel");
  if (!track || !wrap) return;

  function renderMessage(message) {
    wrap.innerHTML = `<p class="state-msg">${message}</p>`;
  }

  fetch("/api/companies")
    .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
    .then(function (result) {
      if (!result.ok || result.data.error) {
        renderMessage(
          "Featured companies aren't connected yet. Once COMPANIES_SHEET_CSV_URL is set as an environment variable in Cloudflare Pages, logos will show up here automatically."
        );
        return;
      }

      const companies = result.data.companies || [];
      if (!companies.length) {
        renderMessage("Featured companies will show up here as episodes go live.");
        return;
      }

      const logosHtml = companies
        .map(function (c) {
          return `<a class="company-logo" href="${c.websiteUrl}" target="_blank" rel="noopener" aria-label="${c.name}">
            <img src="${c.logoUrl}" alt="${c.name}" loading="lazy">
          </a>`;
        })
        .join("");

      // Duplicate the set so the CSS marquee loop is seamless.
      track.innerHTML = logosHtml + logosHtml;
    })
    .catch(function () {
      renderMessage("Couldn't load featured companies right now — please check back later.");
    });
})();
