/**
 * G⁵ Easter Eggs — load known-good full build, then easter-patch hardens subpage + console v5.1
 */
(function () {
  "use strict";
  if (window.__G5_EASTER_V2__) return;
  var s = document.createElement("script");
  s.src =
    "https://cdn.jsdelivr.net/gh/r25347sh/G5PORTAL@7e5ddc18177ed568520c91e3acbd4836d1ff837e/src/js/easter-eggs.js";
  s.async = true;
  s.onerror = function () {
    console.error("[G5 easter] CDN load failed");
  };
  document.head.appendChild(s);
})();
