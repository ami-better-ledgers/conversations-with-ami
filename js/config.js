/* ==========================================================================
   SITE CONFIG — edit this file when your accounts are ready.
   Nothing else in the codebase needs to change for these three things.
   ========================================================================== */

window.SITE_CONFIG = {

  /* 1. RIVERSIDE / PODCAST RSS FEED
     -------------------------------
     Already wired in — https://api.riverside.com/hosting/qfuudTdb.rss
     is set as the default feed inside functions/api/episodes.js, so
     episodes will show up with no further setup needed.
     This field isn't used for fetching; it's just here for reference.
     If the feed URL ever changes, either edit DEFAULT_FEED_URL in
     functions/api/episodes.js, or set PODCAST_RSS_URL as an environment
     variable in Cloudflare Pages (Settings > Environment variables) —
     the environment variable always overrides the default in code.    */
  PODCAST_RSS_URL: "https://api.riverside.com/hosting/qfuudTdb.rss",

  /* 2. KIT.COM (ConvertKit) NEWSLETTER FORM
     ----------------------------------------
     Wired in below using the short async <script> embed. You sent two
     versions of the same form (uid b7fc8c6ebf) — this one and a longer
     self-contained <form> block with inline styles. Only one is used
     (using both would render the form twice); this one is used because
     it's simplest and lets Kit serve the form's live styling from your
     dashboard, so any styling changes you make in Kit show up here
     automatically without editing this file again.                     */
  KIT_FORM_HTML: '<script async data-uid="b7fc8c6ebf" src="https://conversations-with-ami.kit.com/b7fc8c6ebf/index.js"></script>',

  /* 3. DOMAIN
     ---------
     Used only for the canonical link tags / share previews. e.g.
     "https://conversationswithami.com"                                    */
  SITE_URL: "",
};
