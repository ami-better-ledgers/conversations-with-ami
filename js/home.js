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

  /* ---------- Facebook Page feed ---------- */
  const fbEl = document.getElementById("home-facebook");
  if (fbEl) {
    const pageUrl = (window.SITE_CONFIG && window.SITE_CONFIG.FACEBOOK_PAGE_URL) || "";

    if (!pageUrl) {
      fbEl.innerHTML = `<p class="state-msg">Add FACEBOOK_PAGE_URL in js/config.js to show the feed here.</p>`;
    } else {
      const src = "https://www.facebook.com/plugins/page.php?href="
        + encodeURIComponent(pageUrl)
        + "&tabs=timeline&width=500&height=600&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId";
      fbEl.innerHTML = `<iframe src="${src}" width="500" height="600" style="border:none;overflow:hidden;max-width:100%;" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" loading="lazy"></iframe>`;
    }
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
