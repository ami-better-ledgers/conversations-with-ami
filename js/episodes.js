(function () {
  const listEl = document.getElementById("episode-list");
  if (!listEl) return;

  // Same slug rule as functions/episodes/[slug].js — keep both in sync.
  // Curated episodes (content/episodes.json) override this with a
  // hand-picked, SEO-friendly slug.
  function slugifyTitle(title) {
    const hook = (title || "").split("|")[0];
    return hook
      .toLowerCase()
      .replace(/['’"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  let curatedByEpisodeNumber = {};
  let allEpisodes = [];

  function formatDate(pubDate) {
    if (!pubDate) return "";
    const d = new Date(pubDate);
    if (isNaN(d)) return "";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  function renderEmpty(message) {
    listEl.innerHTML = `<p class="state-msg">${message}</p>`;
  }

  let matchYouTube = function () { return null; };

  // Splits "Hook | Guest Name, Company" into its two halves.
  function splitTitle(title) {
    const parts = (title || "").split("|");
    return { hook: parts[0].trim(), guestLine: parts.length > 1 ? parts.slice(1).join("|").trim() : "" };
  }

  function episodeUrl(ep) {
    const curated = curatedByEpisodeNumber[ep.episode];
    return "/episodes/" + (curated ? curated.slug : slugifyTitle(ep.title));
  }

  function thumbFor(ep) {
    const ytMatch = matchYouTube(ep);
    return (ytMatch && ytMatch.thumbnail) || ep.image || "";
  }

  function actionButtons(ep) {
    const audio = ep.audioUrl || ep.link || "";
    const ytMatch = matchYouTube(ep);
    const watchBtn = ytMatch
      ? `<button type="button" class="episode-watch" data-yt="${ytMatch.videoId}" aria-expanded="false">Watch</button>`
      : "";
    const playBtn = audio
      ? `<button type="button" class="episode-play" data-audio="${audio}" aria-expanded="false" aria-label="Listen to ${ep.title || "this episode"}">▶</button>`
      : "";
    const embedRow = (ytMatch || audio) ? `<div class="episode-embed" hidden></div>` : "";
    return { playBtn, watchBtn, embedRow };
  }

  function tagRow(ep) {
    const pillars = ep.pillars || [];
    const subjects = ep.subjects || [];
    if (!pillars.length && !subjects.length) return "";
    return `<div class="tag-row">
      ${pillars.map(function (p) { return `<span class="tag-pillar">${p}</span>`; }).join("")}
      ${subjects.map(function (s) { return `<span class="tag-subject">${s}</span>`; }).join("")}
    </div>`;
  }

  function renderHero(ep, num) {
    const { hook, guestLine } = splitTitle(ep.title);
    const { playBtn, watchBtn, embedRow } = actionButtons(ep);
    const thumb = thumbFor(ep);
    const url = episodeUrl(ep);
    return `
      <article class="episode-hero">
        <a class="episode-hero-media" href="${url}">
          ${thumb ? `<img src="${thumb}" alt="" loading="lazy">` : ""}
          <span class="episode-badge">EP ${String(num).padStart(2, "0")}</span>
        </a>
        <div class="episode-hero-body">
          <p class="eyebrow">Latest episode</p>
          <h2><a href="${url}">${hook || "Untitled episode"}</a></h2>
          ${guestLine ? `<p class="guest-line">${guestLine}</p>` : ""}
          <p class="episode-meta">${formatDate(ep.pubDate)}${ep.duration ? " · " + ep.duration : ""}</p>
          ${tagRow(ep)}
          <p class="episode-desc">${ep.description || ""}</p>
          <div class="episode-actions">
            ${playBtn}
            ${watchBtn}
            <a class="read-link" href="${url}">See what you'll learn &rarr;</a>
          </div>
          ${embedRow}
        </div>
      </article>`;
  }

  function renderCard(ep, num) {
    const { hook, guestLine } = splitTitle(ep.title);
    const { playBtn, watchBtn, embedRow } = actionButtons(ep);
    const thumb = thumbFor(ep);
    const url = episodeUrl(ep);
    return `
      <article class="episode-card">
        <a class="episode-card-media" href="${url}">
          ${thumb ? `<img src="${thumb}" alt="" loading="lazy">` : ""}
          <span class="episode-badge">EP ${String(num).padStart(2, "0")}</span>
        </a>
        <div class="episode-card-body">
          <p class="episode-meta">${formatDate(ep.pubDate)}${ep.duration ? " · " + ep.duration : ""}</p>
          <h3><a href="${url}">${hook || "Untitled episode"}</a></h3>
          ${guestLine ? `<p class="guest-line">${guestLine}</p>` : ""}
          ${tagRow(ep)}
          <p class="episode-desc">${ep.description || ""}</p>
          <div class="episode-actions">
            ${playBtn}
            ${watchBtn}
          </div>
          ${embedRow}
          <a class="read-link" href="${url}">See what you'll learn &rarr;</a>
        </div>
      </article>`;
  }

  function render(episodes) {
    if (!episodes.length) {
      renderEmpty("No episodes found yet — check back soon.");
      return;
    }

    const total = episodes.length;
    const [latest, ...rest] = episodes;

    const heroHtml = renderHero(latest, latest.episode || total);
    const gridHtml = rest.length
      ? `<div class="episode-grid">${rest.map(function (ep, i) { return renderCard(ep, ep.episode || total - i - 1); }).join("")}</div>`
      : "";

    listEl.innerHTML = heroHtml + gridHtml;
    wireInteractions();
  }

  function renderSearchResults(matches) {
    if (!matches.length) {
      listEl.innerHTML = `<p class="state-msg">No episodes match that search.</p>`;
      return;
    }
    listEl.innerHTML = `<div class="episode-grid">${matches.map(function (ep) { return renderCard(ep, ep.episode); }).join("")}</div>`;
    wireInteractions();
  }

  function wireInteractions() {
    listEl.querySelectorAll(".episode-play").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const embed = btn.closest("article").querySelector(".episode-embed");
        const otherBtn = btn.closest("article").querySelector(".episode-watch");
        const isOpen = !embed.hidden && embed.dataset.kind === "audio";
        if (isOpen) {
          embed.hidden = true;
          embed.innerHTML = "";
          btn.textContent = "▶";
          btn.setAttribute("aria-expanded", "false");
        } else {
          const audioUrl = btn.dataset.audio;
          embed.innerHTML = `<audio controls autoplay src="${audioUrl}" style="width:100%;"></audio>`;
          embed.dataset.kind = "audio";
          embed.hidden = false;
          btn.textContent = "◼";
          btn.setAttribute("aria-expanded", "true");
          if (otherBtn) {
            otherBtn.textContent = "Watch";
            otherBtn.setAttribute("aria-expanded", "false");
          }
        }
      });
    });

    listEl.querySelectorAll(".episode-watch").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const embed = btn.closest("article").querySelector(".episode-embed");
        const otherBtn = btn.closest("article").querySelector(".episode-play");
        const isOpen = !embed.hidden && embed.dataset.kind === "video";
        if (isOpen) {
          embed.hidden = true;
          embed.innerHTML = "";
          btn.textContent = "Watch";
          btn.setAttribute("aria-expanded", "false");
        } else {
          const videoId = btn.dataset.yt;
          embed.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
          embed.dataset.kind = "video";
          embed.hidden = false;
          btn.textContent = "Hide video";
          btn.setAttribute("aria-expanded", "true");
          if (otherBtn) {
            otherBtn.textContent = "▶";
            otherBtn.setAttribute("aria-expanded", "false");
          }
        }
      });
    });
  }

  renderEmpty("Loading episodes…");

  const episodesPromise = fetch("/api/episodes").then(function (res) {
    return res.json().then(function (data) { return { ok: res.ok, data: data }; });
  });
  const youtubePromise = typeof fetchYouTubeVideos === "function" ? fetchYouTubeVideos() : Promise.resolve([]);
  const curatedPromise = fetch("/content/episodes.json")
    .then(function (res) { return res.ok ? res.json() : { episodes: [] }; })
    .catch(function () { return { episodes: [] }; });

  Promise.all([episodesPromise, youtubePromise, curatedPromise])
    .then(function (results) {
      const result = results[0];
      const videos = results[1];
      const curatedData = results[2];
      (curatedData.episodes || []).forEach(function (e) {
        curatedByEpisodeNumber[String(e.episodeNumber)] = e;
      });
      if (typeof buildYouTubeMatcher === "function") {
        matchYouTube = buildYouTubeMatcher(videos);
      }
      if (!result.ok || result.data.error) {
        renderEmpty(
          "Episodes aren't connected yet. Once the RSS feed is set as the PODCAST_RSS_URL environment variable in Cloudflare Pages, they'll show up here automatically."
        );
        return;
      }
      allEpisodes = result.data.episodes || [];
      render(allEpisodes);
      setupSearch();
    })
    .catch(function () {
      renderEmpty("Couldn't load episodes right now — please check back later.");
    });

  function setupSearch() {
    const input = document.getElementById("episode-search");
    if (!input) return;
    input.addEventListener("input", function () {
      const query = input.value.trim().toLowerCase();
      if (!query) {
        render(allEpisodes);
        return;
      }
      const matches = allEpisodes.filter(function (ep) {
        return splitTitle(ep.title).guestLine.toLowerCase().includes(query);
      });
      renderSearchResults(matches);
    });
  }
})();
