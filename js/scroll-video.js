(function () {
  const video = document.getElementById("about-portrait-video");
  const section = document.querySelector(".about-layout");
  if (!video || !section) return;

  const PHONE_MAX_WIDTH = 640; // must match the breakpoint in css/style.css

  if (window.innerWidth <= PHONE_MAX_WIDTH) {
    // Don't even let the browser fetch the video on phones — it's hidden
    // there anyway (see .about-portrait { display: none } in style.css),
    // so there's no reason to spend the visitor's mobile data on it.
    video.querySelectorAll("source").forEach(function (s) { s.removeAttribute("src"); });
    video.removeAttribute("poster");
    video.load();
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return; // leave it on the poster frame, no scroll-linked motion

  const STICKY_OFFSET = 110; // must match .about-portrait { top: ... } in css/style.css
  let duration = 0;
  let ticking = false;

  video.addEventListener("loadedmetadata", function () {
    duration = video.duration || 0;
  });

  function updateFrame() {
    ticking = false;
    if (!duration) return;

    const rect = section.getBoundingClientRect();
    const scrollableDistance = Math.max(section.offsetHeight - window.innerHeight, 1);
    const scrolledIntoSection = STICKY_OFFSET - rect.top;
    const progress = Math.min(Math.max(scrolledIntoSection / scrollableDistance, 0), 1);

    const target = progress * duration;
    // Avoid redundant seeks — only update if the difference is meaningful.
    if (Math.abs(video.currentTime - target) > 0.03) {
      try { video.currentTime = target; } catch (e) { /* ignore seek errors before ready */ }
    }
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateFrame);
      ticking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
})();
