/** G5 Maze v4 loader — base64 parts, no DecompressionStream */
(function(){
  var n=3,parts=[],done=0;
  function tryGo(){
    if(done<n)return;
    var b=parts.join("");
    try{
      var bin=atob(b);
      var u=new Uint8Array(bin.length);
      for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
      var txt=new TextDecoder("utf-8").decode(u);
      var s=document.createElement("script");
      s.textContent=txt;
      document.head.appendChild(s);
    }catch(e){console.error("[g5-maze]",e);}
  }
  for(var i=0;i<n;i++){(function(i){
    var x=new XMLHttpRequest();
    x.open("GET","maze.b"+i+".js",true);
    x.onload=function(){parts[i]=(x.responseText||"").replace(/\s/g,"");done++;tryGo();};
    x.onerror=function(){console.error("chunk fail",i);parts[i]="";done++;tryGo();};
    x.send();
  })(i);}
})();
