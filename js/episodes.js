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
        const teaser = ep.description || "";
        const fullNotes = ep.content || "";
        const notesToggle = fullNotes && fullNotes.length > teaser.length
          ? `<button type="button" class="episode-notes-toggle">See more</button>`
          : "";
        const curated = curatedByEpisodeNumber[ep.episode];
        const slug = curated ? curated.slug : slugifyTitle(ep.title);
        const episodeUrl = "/episodes/" + slug;
        return `
          <article class="episode">
            <div class="episode-num">${String(num).padStart(2, "0")}</div>
            <div class="episode-body">
              <p class="episode-meta">${formatDate(ep.pubDate)}${ep.duration ? " · " + ep.duration : ""}</p>
              <h3><a href="${episodeUrl}">${ep.title || "Untitled episode"}</a></h3>
              <p class="episode-desc">${teaser}</p>
              <div class="episode-notes-full">${fullNotes}</div>
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

    // Explicitly set the collapsed state in JS (rather than relying only
    // on markup) so this can't end up stuck open regardless of CSS.
    listEl.querySelectorAll(".episode-notes-full").forEach(function (el) {
      el.style.display = "none";
    });

    listEl.querySelectorAll(".episode-notes-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const body = btn.closest(".episode-body");
        const full = body.querySelector(".episode-notes-full");
        const teaserEl = body.querySelector(".episode-desc");
        const isOpen = full.style.display !== "none";
        if (isOpen) {
          full.style.display = "none";
          teaserEl.style.display = "";
          btn.textContent = "See more";
        } else {
          full.style.display = "block";
          teaserEl.style.display = "none";
          btn.textContent = "See less";
        }
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
      render(result.data.episodes || []);
    })
    .catch(function () {
      renderEmpty("Couldn't load episodes right now — please check back later.");
    });
})();
