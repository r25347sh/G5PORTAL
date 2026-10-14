/** G5 Calculator — loads full build */
(function () {
  "use strict";
  var s = document.createElement("script");
  s.src = "script.full.js";
  s.onerror = function () {
    s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/gh/r25347sh/G5PORTAL@main/pages/calculator/script.full.js";
    document.head.appendChild(s);
  };
  document.head.appendChild(s);
})();
