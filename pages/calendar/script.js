/**
 * G5 Calendar — load known-good build (HTML-safe descriptions, search, filter)
 */
(function () {
  "use strict";
  var s = document.createElement("script");
  s.src =
    "https://cdn.jsdelivr.net/gh/r25347sh/G5PORTAL@6a6f894068cf5fcdab1195a9678837e5f2da1bfb/pages/calendar/script.js";
  s.onerror = function () {
    var el = document.getElementById("cal-status");
    if (el) el.textContent = "script load failed";
  };
  document.head.appendChild(s);
})();
