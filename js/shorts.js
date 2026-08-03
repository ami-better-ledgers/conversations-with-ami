(function () {
  const grid = document.getElementById("shorts-grid");
  if (!grid) return;

  function renderMessage(message) {
    grid.innerHTML = `<p class="state-msg">${message}</p>`;
  }

  function render(shorts) {
    if (!shorts.length) {
      renderMessage("No Shorts found yet — check back soon.");
      return;
    }

    grid.innerHTML = shorts
      .map(function (v) {
        return `
          <div class="shorts-card">
            <div class="shorts-frame" data-yt="${v.videoId}">
              <img src="https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg" alt="" loading="lazy">
              <div class="shorts-play-overlay"><span>▶</span></div>
            </div>
            <p class="shorts-title">${v.title || ""}</p>
          </div>`;
      })
      .join("");

    grid.querySelectorAll(".shorts-frame").forEach(function (frame) {
      frame.addEventListener("click", function () {
        const videoId = frame.dataset.yt;
        frame.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" title="YouTube short" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      }, { once: true });
    });
  }

  renderMessage("Loading Shorts…");

  if (typeof fetchYouTubeVideos !== "function") {
    renderMessage("Shorts aren't connected yet.");
    return;
  }

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
      extras.sort(function (a, b) { return new Date(b.publishedAt) - new Date(a.publishedAt); });
      render(extras);
    })
    .catch(function () {
      renderMessage("Couldn't load Shorts right now — please check back later.");
    });
})();
