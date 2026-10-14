/** G5 gzip multi-loader */(function(){
var n=3,parts=[],done=0;
function tryGo(){
  if(done<n)return;
  var b=parts.join("");
  function go(u){var s=document.createElement("script");s.textContent=u;document.head.appendChild(s);}
  if(typeof DecompressionStream==="undefined"){console.error("DecompressionStream required");return;}
  fetch("data:application/octet-stream;base64,"+b).then(function(r){return r.blob();}).then(function(blob){
    return new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).text();
  }).then(go).catch(function(e){console.error("[g5-loader]",e);});
}
for(var i=0;i<n;i++){(function(i){
  var x=new XMLHttpRequest();
  x.open("GET","invaders.b"+i+".js",true);
  x.onload=function(){parts[i]=(x.responseText||"").replace(/\s/g,"");done++;tryGo();};
  x.onerror=function(){console.error("chunk fail",i);parts[i]="";done++;tryGo();};
  x.send();
})(i);}
})();
