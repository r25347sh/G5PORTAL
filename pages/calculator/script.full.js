/** G5 Calculator full — CDN restore */
(function () {
  var s = document.createElement("script");
  s.src =
    "https://cdn.jsdelivr.net/gh/r25347sh/G5PORTAL@dadf875d0407082eea6d109490236d56fc77afa1/pages/calculator/script.full.js";
  s.onerror = function () {
    console.error("[G5 calc] full load failed");
  };
  document.head.appendChild(s);
})();
