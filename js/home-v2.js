/* Home page behavior (design v2):
   - scroll reveal (content is visible by default; hidden only when JS is running)
   - the "what do you need right now?" picker, built from the real episode tags
   - play episodes in place (one at a time)
   - latest episode card and latest Still Building issue card */
(function () {
  var KINDS = {
    "peer story": "Peer story",
    "nuanced literacy": "Nuanced literacy",
    "future planning": "Future planning",
    "what not to do": "What not to do",
    "core skills": "Core skills",
  };
  var PLAY = '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function text(html) {
    try { return new DOMParser().parseFromString(String(html || ""), "text/html").body.textContent.replace(/\s+/g, " ").trim(); }
    catch (e) { return String(html || ""); }
  }
  function when(iso) {
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }
  function path(url) {
    try { var u = new URL(url); return /conversationswithami\.com$/.test(u.hostname) ? u.pathname : url; } catch (e) { return url; }
  }
  function parts(title) {
    var bits = String(title || "").split("|");
    return { hook: (bits[0] || "").trim(), guest: bits.slice(1).join("|").trim() };
  }
  function kindsOf(ep) {
    return (ep.pillars || []).map(function (p) { return KINDS[String(p).toLowerCase()]; }).filter(Boolean);
  }

  /* ---------- scroll reveal ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- one-at-a-time audio ---------- */
  var current = null; // { btn, audio }
  function stopCurrent() {
    if (!current) return;
    try { current.audio.pause(); } catch (e) {}
    current.btn.setAttribute("aria-pressed", "false");
    current.btn.setAttribute("aria-label", current.btn.dataset.label);
    if (current.holder) { current.holder.innerHTML = ""; }
    current = null;
  }
  function wirePlay(root) {
    root.querySelectorAll(".play").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var same = current && current.btn === btn;
        stopCurrent();
        if (same) return;
        var holder = btn.closest("[data-player-host]").querySelector(".player");
        var audio = document.createElement("audio");
        audio.controls = true; audio.preload = "none"; audio.src = btn.dataset.audio;
        audio.addEventListener("ended", stopCurrent);
        holder.innerHTML = "";
        holder.appendChild(audio);
        btn.setAttribute("aria-pressed", "true");
        btn.setAttribute("aria-label", "Pause " + btn.dataset.title);
        current = { btn: btn, audio: audio, holder: holder };
        var p = audio.play(); if (p && p.catch) p.catch(function () {});
      });
    });
  }
  function playButton(ep) {
    var p = parts(ep.title);
    var label = "Play " + p.hook;
    return '<button type="button" class="play" aria-pressed="false" aria-label="' + esc(label) + '" data-label="' + esc(label) + '" data-title="' + esc(p.hook) + '" data-audio="' + esc(ep.audioUrl) + '">' + PLAY + "</button>";
  }

  /* ---------- picker + latest episode ---------- */
  var out = document.getElementById("picker-out");
  var kindBtns = document.querySelectorAll(".kind[data-kind]");
  var episodes = [];

  function miniCard(ep) {
    var p = parts(ep.title);
    var chips = kindsOf(ep).map(function (k) { return '<span class="chip">' + esc(k) + "</span>"; }).join(" ");
    return '<li class="mini" data-player-host>' +
      '<p class="meta">Episode ' + esc(ep.episode || "") + (p.guest ? " · " + esc(p.guest) : "") + "</p>" +
      '<h4><a href="' + esc(path(ep.link)) + '">' + esc(p.hook) + "</a></h4>" +
      (chips ? "<div>" + chips + "</div>" : "") +
      '<div class="actions">' + (ep.audioUrl ? playButton(ep) : "") + '<a class="more" href="' + esc(path(ep.link)) + '">Episode page</a></div>' +
      '<div class="player"></div></li>';
  }

  function showKind(key, label) {
    if (!out) return;
    stopCurrent();
    var list = episodes.filter(function (ep) { return kindsOf(ep).indexOf(label) !== -1; }).slice(0, 6);
    if (!list.length) {
      out.innerHTML = '<h3>' + esc(label) + '</h3><p>No episodes are tagged this way yet. <a href="/podcast">See every episode</a>.</p>';
      return;
    }
    out.innerHTML = '<h3>Episodes for ' + (label.charAt(0).toLowerCase() + label.slice(1)) + '</h3><ul class="pick-list">' + list.map(miniCard).join("") + '</ul>' +
      '<p style="margin:1.2rem 0 0"><a class="btn btn-line-dark btn-sm" href="/podcast">See every episode</a></p>';
    wirePlay(out);
  }

  function setupPicker() {
    kindBtns.forEach(function (btn) {
      var label = KINDS[btn.dataset.kind];
      var n = episodes.filter(function (ep) { return kindsOf(ep).indexOf(label) !== -1; }).length;
      var c = btn.querySelector(".count");
      if (c) c.textContent = n + (n === 1 ? " episode" : " episodes");
      btn.addEventListener("click", function () {
        var pressed = btn.getAttribute("aria-pressed") === "true";
        kindBtns.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        if (pressed) {
          stopCurrent();
          out.innerHTML = '<p class="state-msg" style="margin:0">Pick what you need right now and we\'ll show episodes that fit.</p>';
          return;
        }
        btn.setAttribute("aria-pressed", "true");
        showKind(btn.dataset.kind, label);
        out.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  }

  function renderLatest(ep) {
    var el = document.getElementById("latest-episode");
    if (!el) return;
    var p = parts(ep.title);
    var desc = text(ep.description);
    if (desc.length > 260) desc = desc.slice(0, 257).replace(/\s+\S*$/, "") + "…";
    el.innerHTML =
      '<article class="ep-card" data-player-host>' +
      '<div class="ep-art"' + (ep.image ? ' style="background-image:url(\'' + esc(ep.image) + '\')"' : "") + ">" +
      '<span class="ep-num">' + esc(ep.episode ? String(ep.episode).padStart(2, "0") : "") + "</span></div>" +
      "<div><p class=\"ep-meta\">" + esc(when(ep.pubDate)) + (ep.duration ? " · " + esc(ep.duration) : "") + (p.guest ? " · " + esc(p.guest) : "") + "</p>" +
      "<h3>" + esc(p.hook) + "</h3>" +
      '<p class="ep-desc">' + esc(desc) + "</p>" +
      '<div class="btn-row">' + (ep.audioUrl ? playButton(ep) : "") + '<a class="btn btn-blue btn-sm" href="' + esc(path(ep.link)) + '">Read the episode page</a><a class="btn btn-line-dark btn-sm" href="/podcast">All episodes</a></div>' +
      '<div class="player"></div></div></article>';
    wirePlay(el);
  }

  fetch("/api/episodes")
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (res) {
      episodes = (res.ok && res.d && res.d.episodes) || [];
      if (!episodes.length) {
        var el = document.getElementById("latest-episode");
        if (el) el.innerHTML = '<p class="state-msg">The newest episode is on the <a href="/podcast">podcast page</a>.</p>';
        return;
      }
      renderLatest(episodes[0]);
      setupPicker();
    })
    .catch(function () {
      var el = document.getElementById("latest-episode");
      if (el) el.innerHTML = '<p class="state-msg">The newest episode is on the <a href="/podcast">podcast page</a>.</p>';
    });

  /* ---------- latest Still Building issue ---------- */
  var issueEl = document.getElementById("latest-issue");
  if (issueEl) {
    fetch("/api/issues")
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        var i = res.ok && res.d && res.d.issues && res.d.issues[0];
        if (!i) return;
        issueEl.innerHTML =
          '<a class="issue-card" href="' + esc(i.url) + '"><p class="meta">Latest issue · Issue ' + esc(String(i.number).padStart(2, "0")) + " · " + esc(when(String(i.date).slice(0, 10) + "T12:00:00Z")) + "</p>" +
          "<h3>" + esc(i.title) + "</h3><p>" + esc(i.excerpt) + '</p><span class="go">Read this issue →</span></a>';
      })
      .catch(function () {});
  }

  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
