(function () {
  const listEl = document.getElementById("episode-list");
  if (!listEl) return;

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

  function render(episodes) {
    if (!episodes.length) {
      renderEmpty("No episodes found yet — check back soon.");
      return;
    }

    const total = episodes.length;
    listEl.innerHTML = episodes
      .map(function (ep, i) {
        const num = ep.episode || total - i;
        const audio = ep.audioUrl || ep.link || "";
        const youtubeId = matchYouTube(ep);
        const watchBtn = youtubeId
          ? `<button type="button" class="episode-watch" data-yt="${youtubeId}" aria-expanded="false">Watch</button>`
          : "";
        const playBtn = audio
          ? `<button type="button" class="episode-play" data-audio="${audio}" aria-expanded="false" aria-label="Listen to ${ep.title || "this episode"}">▶</button>`
          : "";
        const hasEmbedRow = youtubeId || audio;
        const embedRow = hasEmbedRow ? `<div class="episode-embed" hidden></div>` : "";
        const fullDesc = ep.description || "";
        const shortDesc = fullDesc.slice(0, 180) + (fullDesc.length > 180 ? "…" : "");
        const notesToggle = fullDesc.length > 180
          ? `<button type="button" class="episode-notes-toggle">Show full show notes</button>`
          : "";
        return `
          <article class="episode">
            <div class="episode-num">${String(num).padStart(2, "0")}</div>
            <div class="episode-body">
              <p class="episode-meta">${formatDate(ep.pubDate)}${ep.duration ? " · " + ep.duration : ""}</p>
              <h3>${ep.title || "Untitled episode"}</h3>
              <p class="episode-desc episode-desc-short">${shortDesc}</p>
              <p class="episode-desc episode-desc-full" hidden>${fullDesc}</p>
              ${notesToggle}
              ${embedRow}
            </div>
            <div class="episode-actions">
              ${playBtn}
              ${watchBtn}
            </div>
          </article>`;
      })
      .join("");

    listEl.querySelectorAll(".episode-notes-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const body = btn.closest(".episode-body");
        const short = body.querySelector(".episode-desc-short");
        const full = body.querySelector(".episode-desc-full");
        const isFull = !full.hidden;
        short.hidden = isFull;
        full.hidden = !isFull;
        btn.textContent = isFull ? "Show full show notes" : "Show less";
      });
    });

    listEl.querySelectorAll(".episode-play").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const embed = btn.closest(".episode").querySelector(".episode-embed");
        const otherBtn = btn.closest(".episode").querySelector(".episode-watch");
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
        const embed = btn.closest(".episode").querySelector(".episode-embed");
        const otherBtn = btn.closest(".episode").querySelector(".episode-play");
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

  Promise.all([episodesPromise, youtubePromise])
    .then(function (results) {
      const result = results[0];
      const videos = results[1];
      if (typeof buildYouTubeMatcher === "function") {
        matchYouTube = buildYouTubeMatcher(videos);
      }
      if (!result.ok || result.data.error) {
        renderEmpty(
          "Episodes aren't connected yet. Once the RSS feed is set as the PODCAST_RSS_URL environment variable in Cloudflare Pages, they'll show up here automatically."
        );
        return;
      }
      render(result.data.episodes || []);
    })
    .catch(function () {
      renderEmpty("Couldn't load episodes right now — please check back later.");
    });
})();
