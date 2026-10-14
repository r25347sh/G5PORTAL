/** G5 Invaders — see repo for full source; loader bootstrap */
(function(){
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/gh/r25347sh/G5PORTAL@main/pages/color-picker/invaders.full.js';
  s.onerror=function(){console.error('[G5] invaders load failed')};
  document.head.appendChild(s);
})();
