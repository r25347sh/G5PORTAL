/**
 * G⁵ Easter Eggs — load known-good build, then local patch handles subpage awaken
 */
(function () {
  "use strict";
  if (window.__G5_EASTER_V2__) return;
  var s = document.createElement("script");
  s.src =
    "https://cdn.jsdelivr.net/gh/r25347sh/G5PORTAL@bb6acd553048b1174b3793093f1704f5af3b3d6f/src/js/easter-eggs.js";
  s.async = true;
  s.onerror = function () {
    console.error("[G5 easter] CDN load failed");
  };
  document.head.appendChild(s);
})();
