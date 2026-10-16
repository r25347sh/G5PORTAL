(function(){"use strict";if(window.__G5_MZ42__)return;window.__G5_MZ42__=true;
var D={easy:{s:23,v:6.5,t:2,e:1,L:"EASY"},normal:{s:33,v:5.2,t:5,e:2,L:"NORMAL"},hard:{s:43,v:4.2,t:9,e:3,L:"HARD"},nightmare:{s:53,v:3.4,t:14,e:5,L:"NIGHTMARE"}};
function go(k){if(document.getElementById("g5-maze-root"))return;var diff=D[k]||D.hard,S=diff.s,V=diff.v;
var root=document.createElement("div");root.id="g5-maze-root";
root.innerHTML='<div class="mh"><span class="mt">G5 MAZE · '+diff.L+'</span><span class="ms" id="ms">HP 3</span><span class="mk" id="mk">🔑0</span><button id="mx" class="mb">×</button></div><canvas id="mc"></canvas><div id="mo" class="mo hidden"></div>';
if(!document.getElementById("g5mazecss")){var st=document.createElement("style");st.id="g5mazecss";
st.textContent="#g5-maze-root{position:fixed;inset:0;z-index:100100;background:#05040c;overflow:hidden;font-family:ui-monospace,Menlo,monospace}"+ 
".mh{position:absolute;top:0;left:0;right:0;z-index:5;display:flex;align-items:center;gap:.6rem;padding:max(.5rem,env(safe-area-inset-top)) .9rem .35rem;background:linear-gradient(180deg,rgba(0,0,0,.85),transparent)}"+ 
".mt{font-weight:800;letter-spacing:.15em;font-size:clamp(.85rem,2.8vw,1.1rem);color:#00f5ff;text-shadow:0 0 12px #00f5ff;margin-right:auto}"+ 
".ms,.mk{font-size:.75rem;color:#ff6b9a}.mk{color:#ffd700}"+ 
".mb{border:1px solid rgba(255,45,149,.5);background:rgba(255,45,149,.12);color:#ff8cc8;border-radius:6px;padding:.15rem .5rem;cursor:pointer}"+ 
"#mc{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}"+ 
".mo{position:absolute;inset:0;z-index:12;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(5,4,12,.94);backdrop-filter:blur(8px);color:#e8f7ff;text-align:center}"+ 
".mo h2{letter-spacing:.25em;font-size:clamp(1.4rem,5vw,2.2rem);color:#00f5ff;text-shadow:0 0 24px #00f5ff;margin:0 0 .6rem}.mo.hidden{display:none}"+ 
".mo button{margin:.4rem;padding:.4rem 1.2rem;border:1px solid #00f5ff;background:rgba(0,245,255,.1);color:#00f5ff;border-radius:8px;cursor:pointer;font-family:inherit}"+ 
".md{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:20;display:flex;flex-direction:column;gap:.5rem;background:rgba(8,6,16,.96);padding:1.2rem 1.6rem;border-radius:12px;border:1px solid rgba(0,245,255,.35)}"+ 
".md button{padding:.5rem 1.4rem;border:1px solid rgba(0,245,255,.4);background:rgba(0,245,255,.08);color:#e8f7ff;border-radius:8px;cursor:pointer;font-family:inherit;letter-spacing:.08em}"+ 
".md button:hover{background:rgba(0,245,255,.2)}";
document.head.appendChild(st);}
document.body.appendChild(root);
var cv=document.getElementById("mc"),ctx=cv.getContext("2d");
var W,H,cell,map=[],px,py,hp=3,keys=0,traps=[],enemies=[],items=[],fog=[],vis=diff.v,alive=1,won=0,raf=0,keysHeld={};
function resize(){W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;cell=Math.floor(Math.min(W,H)/(S+2));}
function gen(){map=[];for(var y=0;y<S;y++){map[y]=[];for(var x=0;x<S;x++)map[y][x]=1;}
var stack=[[1,1]];map[1][1]=0;while(stack.length){var cur=stack[stack.length-1],cx=cur[0],cy=cur[1],dirs=[[0,-2],[0,2],[-2,0],[2,0]].sort(function(){return Math.random()-0.5}),moved=0;
for(var i=0;i<dirs.length;i++){var nx=cx+dirs[i][0],ny=cy+dirs[i][1];if(nx>0&&nx<S-1&&ny>0&&ny<S-1&&map[ny][nx]===1){map[ny][nx]=0;map[cy+dirs[i][1]/2][cx+dirs[i][0]/2]=0;stack.push([nx,ny]);moved=1;break;}}if(!moved)stack.pop();}
map[1][1]=0;map[S-2][S-2]=0;px=1;py=1;traps=[];enemies=[];items=[];fog=[];
for(var i=0;i<diff.t;i++){var tx,ty;do{tx=1+Math.floor(Math.random()*(S-2));ty=1+Math.floor(Math.random()*(S-2));}while(map[ty][tx]||(tx===1&&ty===1)||(tx===S-2&&ty===S-2));traps.push({x:tx,y:ty});}
for(var i=0;i<diff.e;i++){var ex,ey;do{ex=1+Math.floor(Math.random()*(S-2));ey=1+Math.floor(Math.random()*(S-2));}while(map[ey][ex]||(ex===1&&ey===1));enemies.push({x:ex,y:ey,dir:Math.floor(Math.random()*4),cd:0});}
for(var i=0;i<3+Math.floor(S/15);i++){var ix,iy;do{ix=1+Math.floor(Math.random()*(S-2));iy=1+Math.floor(Math.random()*(S-2));}while(map[iy][ix]||(ix===1&&iy===1));items.push({x:ix,y:iy,t:Math.random()<0.4?"key":"heart"});}
for(var y=0;y<S;y++){fog[y]=[];for(var x=0;x<S;x++)fog[y][x]=0;}}
function see(){for(var y=0;y<S;y++)for(var x=0;x<S;x++){var d=Math.hypot(x-px,y-py);if(d<=vis)fog[y][x]=1;}}
function move(dx,dy){if(won||!alive)return;var nx=px+dx,ny=py+dy;if(nx<0||nx>=S||ny<0||ny>=S||map[ny][nx])return;px=nx;py=ny;see();
for(var i=traps.length-1;i>=0;i--)if(traps[i].x===px&&traps[i].y===py){hp--;traps.splice(i,1);if(hp<=0){alive=0;end(0);}document.getElementById("ms").textContent="HP "+hp;}
for(var i=items.length-1;i>=0;i--)if(items[i].x===px&&items[i].y===py){if(items[i].t==="key"){keys++;document.getElementById("mk").textContent="🔑"+keys;}else{hp=Math.min(5,hp+1);document.getElementById("ms").textContent="HP "+hp;}items.splice(i,1);}
if(px===S-2&&py===S-2){if(keys>=1){won=1;end(1);}else{/* need key */}}}
function tickEn(){for(var i=0;i<enemies.length;i++){var e=enemies[i];e.cd--;if(e.cd>0)continue;e.cd=8+Math.floor(Math.random()*6);var dirs=[[0,-1],[0,1],[-1,0],[1,0]],d=dirs[e.dir],nx=e.x+d[0],ny=e.y+d[1];
if(nx<1||nx>=S-1||ny<1||ny>=S-1||map[ny][nx]){e.dir=Math.floor(Math.random()*4);continue;}e.x=nx;e.y=ny;if(e.x===px&&e.y===py){hp--;document.getElementById("ms").textContent="HP "+hp;if(hp<=0){alive=0;end(0);}}}}
function end(win){var o=document.getElementById("mo");o.classList.remove("hidden");
o.innerHTML=win?"<h2>CLEARED</h2><p>Keys "+keys+" · HP "+hp+'</p><button id="mr">RETRY</button><button id="mdiff">DIFFICULTY</button>':"<h2>GAME OVER</h2><p>HP depleted</p><button id="mr">RETRY</button><button id="mdiff">DIFFICULTY</button>";
document.getElementById("mr").onclick=function(){o.classList.add("hidden");hp=3;keys=0;alive=1;won=0;document.getElementById("ms").textContent="HP 3";document.getElementById("mk").textContent="🔑0";gen();see();};
document.getElementById("mdiff").onclick=function(){cleanup();showDiff();};}
function draw(){ctx.fillStyle="#05040c";ctx.fillRect(0,0,W,H);var ox=(W-S*cell)/2,oy=(H-S*cell)/2;
for(var y=0;y<S;y++)for(var x=0;x<S;x++){if(!fog[y][x])continue;var px2=ox+x*cell,py2=oy+y*cell;if(map[y][x]){ctx.fillStyle="#1a1530";ctx.fillRect(px2,py2,cell,cell);ctx.strokeStyle="rgba(0,245,255,.08)";ctx.strokeRect(px2,py2,cell,cell);}else{ctx.fillStyle="#0c0a18";ctx.fillRect(px2,py2,cell,cell);}}
for(var i=0;i<traps.length;i++){var t=traps[i];if(!fog[t.y][t.x])continue;ctx.fillStyle="#ff2d95";ctx.fillRect(ox+t.x*cell+cell*0.25,oy+t.y*cell+cell*0.25,cell*0.5,cell*0.5);}
for(var i=0;i<items.length;i++){var it=items[i];if(!fog[it.y][it.x])continue;ctx.fillStyle=it.t==="key"?"#ffd700":"#ff6b9a";ctx.beginPath();ctx.arc(ox+it.x*cell+cell/2,oy+it.y*cell+cell/2,cell*0.28,0,6.28);ctx.fill();}
for(var i=0;i<enemies.length;i++){var e=enemies[i];if(!fog[e.y][e.x])continue;ctx.fillStyle="#a855f7";ctx.fillRect(ox+e.x*cell+cell*0.15,oy+e.y*cell+cell*0.15,cell*0.7,cell*0.7);}
ctx.fillStyle="#00f5ff";ctx.shadowColor="#00f5ff";ctx.shadowBlur=10;ctx.beginPath();ctx.arc(ox+px*cell+cell/2,oy+py*cell+cell/2,cell*0.32,0,6.28);ctx.fill();ctx.shadowBlur=0;
/* exit */if(fog[S-2][S-2]){ctx.strokeStyle="#ffd700";ctx.lineWidth=2;ctx.strokeRect(ox+(S-2)*cell+2,oy+(S-2)*cell+2,cell-4,cell-4);}}
function loop(){if(!alive&&!won)return;tickEn();draw();raf=requestAnimationFrame(loop);}
function onKey(e){keysHeld[e.key]=e.type==="keydown";if(e.key==="Escape"){cleanup();return;}if(e.type!=="keydown")return;
var dx=0,dy=0;if(e.key==="ArrowUp"||e.key==="w"||e.key==="W")dy=-1;if(e.key==="ArrowDown"||e.key==="s"||e.key==="S")dy=1;if(e.key==="ArrowLeft"||e.key==="a"||e.key==="A")dx=-1;if(e.key==="ArrowRight"||e.key==="d"||e.key==="D")dx=1;if(dx||dy){e.preventDefault();move(dx,dy);}}
function cleanup(){alive=0;cancelAnimationFrame(raf);document.removeEventListener("keydown",onKey);document.removeEventListener("keyup",onKey);window.removeEventListener("resize",resize);if(root.parentNode)root.parentNode.removeChild(root);}
function showDiff(){var d=document.createElement("div");d.className="md";d.id="g5-maze-diff";
["easy","normal","hard","nightmare"].forEach(function(k){var b=document.createElement("button");b.textContent=D[k].L;b.onclick=function(){document.body.removeChild(d);go(k);};d.appendChild(b);});
var c=document.createElement("button");c.textContent="CANCEL";c.onclick=function(){document.body.removeChild(d);};d.appendChild(c);document.body.appendChild(d);}
document.addEventListener("keydown",onKey);document.addEventListener("keyup",onKey);window.addEventListener("resize",resize);
document.getElementById("mx").onclick=cleanup;resize();gen();see();loop();}
window.G5Maze={start:function(d){go(d||"hard");}};
function boot(){document.addEventListener("click",function(e){var t=e.target;if(!t||!t.matches||!t.matches("input,textarea,#btn-gen,button"))return;var v=(t.value||"").trim().toLowerCase();
if(/^(maze|迷路|labyrinth|nightmare|hardmaze|g5maze)$/.test(v))setTimeout(function(){go(/nightmare|hardmaze/.test(v)?"nightmare":"hard");},200);});
var q=document.getElementById("qr-out");if(q){var taps=0,tm;q.onclick=function(){taps++;clearTimeout(tm);tm=setTimeout(function(){taps=0;},900);if(taps>=5){taps=0;go("hard");}};}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
