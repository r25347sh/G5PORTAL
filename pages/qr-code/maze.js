(function(){var n=2,p=[],d=0;function go(){if(d<n)return;var b=p.join("");
if(typeof DecompressionStream==="undefined"){console.error("DecompressionStream required");return;}
fetch("data:application/octet-stream;base64,"+b).then(function(r){return r.blob();}).then(function(blob){
return new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).text();
}).then(function(t){var s=document.createElement("script");s.textContent=t;document.head.appendChild(s);}).catch(function(e){console.error("[g5-maze]",e);});}
for(var i=0;i<n;i++){(function(i){var x=new XMLHttpRequest();x.open("GET","maze.gz"+i+".js",true);
x.onload=function(){p[i]=(x.responseText||"").replace(/\s/g,"");d++;go();};
x.onerror=function(){p[i]="";d++;go();};x.send();})(i);}})();
