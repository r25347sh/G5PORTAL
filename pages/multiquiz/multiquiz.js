// multiquiz.js — loader: fetch full core then eval
(function(){
  var urls = [
    'https://raw.githubusercontent.com/r25347sh/multiquiz/main/G5PORTAL/_assets/multiquiz.core.js',
    'https://cdn.jsdelivr.net/gh/r25347sh/multiquiz@main/G5PORTAL/_assets/multiquiz.core.js'
  ];
  function load(i){
    if(i>=urls.length){ console.error('multiquiz core load failed'); return; }
    fetch(urls[i]+'?t='+Date.now()).then(function(r){
      if(!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function(code){
      if(code.indexOf('PLACEHOLDER')>=0 || code.indexOf('core will be replaced')>=0 || code.length < 1000) throw new Error('bad core');
      (0, eval)(code);
    }).catch(function(e){
      console.warn('core try', urls[i], e);
      load(i+1);
    });
  }
  load(0);
})();
