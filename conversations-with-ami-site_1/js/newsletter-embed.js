/* Drops the Kit.com embed (from config.js) into every element
   with class "signup-form-slot". innerHTML alone won't execute
   <script> tags, so we rebuild any script nodes manually. */
(function () {
  function injectHTML(container, html) {
    container.innerHTML = html;
    container.querySelectorAll("script").forEach(function (oldScript) {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach(function (attr) {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.text = oldScript.textContent;
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    const html = (window.SITE_CONFIG && window.SITE_CONFIG.KIT_FORM_HTML || "").trim();
    const slots = document.querySelectorAll(".signup-form-slot");

    slots.forEach(function (slot) {
      if (html) {
        injectHTML(slot, html);
      } else {
        slot.textContent = "Newsletter sign-up form goes here — add your Kit.com embed code to js/config.js (KIT_FORM_HTML).";
      }
    });
  });
})();
