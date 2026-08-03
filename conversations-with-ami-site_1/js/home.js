(function () {
  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  /* ---------- Latest episode ---------- */
  const epEl = document.getElementById("home-episode");
  if (epEl) {
    let matchYouTube = function () { return null; };

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
        if (!result.ok || result.data.error || !(result.data.episodes || []).length) {
          epEl.innerHTML = `<p class="state-msg">New episodes coming soon.</p>`;
          return;
        }
        const ep = result.data.episodes[0];
        const audio = ep.audioUrl || ep.link || "";
        const youtubeId = matchYouTube(ep);
        const fullDesc = ep.description || "";
        const shortDesc = fullDesc.slice(0, 200) + (fullDesc.length > 200 ? "…" : "");

        epEl.innerHTML = `
          <article class="episode">
            <div class="episode-num">${ep.episode ? String(ep.episode).padStart(2, "0") : "•"}</div>
            <div class="episode-body">
              <p class="episode-meta">${formatDate(ep.pubDate)}${ep.duration ? " · " + ep.duration : ""}</p>
              <h3>${ep.title || "Untitled episode"}</h3>
              <p class="episode-desc">${shortDesc}</p>
              <div class="episode-embed" hidden></div>
            </div>
            <div class="episode-actions">
              ${audio ? `<button type="button" class="episode-play" data-audio="${audio}" aria-expanded="false" aria-label="Listen">▶</button>` : ""}
              ${youtubeId ? `<button type="button" class="episode-watch" data-yt="${youtubeId}" aria-expanded="false">Watch</button>` : ""}
            </div>
          </article>`;

        const playBtn = epEl.querySelector(".episode-play");
        const watchBtn = epEl.querySelector(".episode-watch");
        const embed = epEl.querySelector(".episode-embed");

        if (playBtn) {
          playBtn.addEventListener("click", function () {
            const isOpen = !embed.hidden && embed.dataset.kind === "audio";
            if (isOpen) {
              embed.hidden = true; embed.innerHTML = ""; playBtn.textContent = "▶"; playBtn.setAttribute("aria-expanded", "false");
            } else {
              embed.innerHTML = `<audio controls autoplay src="${playBtn.dataset.audio}" style="width:100%;"></audio>`;
              embed.dataset.kind = "audio"; embed.hidden = false;
              playBtn.textContent = "◼"; playBtn.setAttribute("aria-expanded", "true");
              if (watchBtn) { watchBtn.textContent = "Watch"; watchBtn.setAttribute("aria-expanded", "false"); }
            }
          });
        }
        if (watchBtn) {
          watchBtn.addEventListener("click", function () {
            const isOpen = !embed.hidden && embed.dataset.kind === "video";
            if (isOpen) {
              embed.hidden = true; embed.innerHTML = ""; watchBtn.textContent = "Watch"; watchBtn.setAttribute("aria-expanded", "false");
            } else {
              embed.innerHTML = `<iframe src="https://www.youtube.com/embed/${watchBtn.dataset.yt}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
              embed.dataset.kind = "video"; embed.hidden = false;
              watchBtn.textContent = "Hide video"; watchBtn.setAttribute("aria-expanded", "true");
              if (playBtn) { playBtn.textContent = "▶"; playBtn.setAttribute("aria-expanded", "false"); }
            }
          });
        }
      })
      .catch(function () {
        epEl.innerHTML = `<p class="state-msg">Couldn't load the latest episode right now.</p>`;
      });
  }

  /* ---------- Shorts carousel ---------- */
  const shortsRow = document.getElementById("home-shorts-row");
  if (shortsRow && typeof fetchYouTubeVideos === "function") {
    const videosPromise = fetchYouTubeVideos();
    const episodesPromise = fetch("/api/episodes")
      .then(function (res) { return res.json(); })
      .then(function (data) { return data.episodes || []; })
      .catch(function () { return []; });

    Promise.all([videosPromise, episodesPromise])
      .then(function (results) {
        const videos = results[0];
        const episodes = results[1];
        const extras = typeof filterNonEpisodeVideos === "function"
          ? filterNonEpisodeVideos(videos, episodes)
          : videos;
        const shorts = extras
          .sort(function (a, b) { return new Date(b.publishedAt) - new Date(a.publishedAt); })
          .slice(0, 8);

        if (!shorts.length) {
          shortsRow.innerHTML = `<p class="state-msg">No Shorts yet.</p>`;
          return;
        }

        shortsRow.innerHTML = shorts
          .map(function (v) {
            return `
              <div class="shorts-card">
                <div class="shorts-frame" data-yt="${v.videoId}">
                  <img src="https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg" alt="" loading="lazy">
                  <div class="shorts-play-overlay"><span>▶</span></div>
                </div>
              </div>`;
          })
          .join("");

        shortsRow.querySelectorAll(".shorts-frame").forEach(function (frame) {
          frame.addEventListener("click", function () {
            const videoId = frame.dataset.yt;
            frame.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" title="YouTube short" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
          }, { once: true });
        });
      })
      .catch(function () {
        shortsRow.innerHTML = `<p class="state-msg">Couldn't load Shorts right now.</p>`;
      });
  }

  /* ---------- Latest newsletter issue ---------- */
  const nlEl = document.getElementById("home-newsletter");
  if (nlEl) {
    fetch("/api/newsletter")
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok || result.data.error || !(result.data.issues || []).length) {
          nlEl.innerHTML = `<p class="state-msg">The first issue is on its way — check back soon.</p>`;
          return;
        }
        const issue = result.data.issues[0];
        nlEl.innerHTML = `
          <div class="archive-card home-newsletter-card">
            <span class="issue-num">Issue ${String(issue.issueNumber).padStart(2, "0")}</span>
            <h3>${issue.subject || "Untitled issue"}</h3>
            <span class="issue-date">${formatDate(issue.publishedAt)}</span>
            <button type="button" class="btn" id="home-newsletter-read">Read this issue</button>
            <div class="reader-body" id="home-newsletter-body" hidden>${issue.content || ""}</div>
          </div>`;

        const readBtn = document.getElementById("home-newsletter-read");
        const body = document.getElementById("home-newsletter-body");
        readBtn.addEventListener("click", function () {
          const isOpen = !body.hidden;
          body.hidden = isOpen;
          readBtn.textContent = isOpen ? "Read this issue" : "Hide";
        });
      })
      .catch(function () {
        nlEl.innerHTML = `<p class="state-msg">Couldn't load the newsletter right now.</p>`;
      });
  }
})();
