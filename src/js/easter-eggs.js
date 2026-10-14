/**
 * G⁵ Easter Eggs (gzip payload)
 */
(function () {
  "use strict";
  if (window.__G5_EASTER_V2__) return;
  var B64 = "REPLACE_ME";
  function boot(code) {
    try { (0, eval)(code); } catch (e) { console.error("[G5 easter]", e); }
  }
  if (typeof DecompressionStream !== "undefined") {
    var bin = atob(B64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var ds = new DecompressionStream("gzip");
    var stream = new Blob([bytes]).stream().pipeThrough(ds);
    new Response(stream).text().then(boot).catch(function (e) {
      console.error("[G5 easter] decompress", e);
    });
  } else {
    console.warn("[G5 easter] DecompressionStream unavailable");
  }
})();
