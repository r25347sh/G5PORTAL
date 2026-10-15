(function(){"use strict";if(window.__G5_MAZE_V41__)return;window.__G5_MAZE_V41__=true;
var D={easy:{s:21,v:6,t:2,e:1,L:"EASY"},normal:{s:31,v:5,t:5,e:2,L:"NORMAL"},hard:{s:41,v:4,t:8,e:3,L:"HARD"},nightmare:{s:51,v:3.2,t:12,e:5,L:"NIGHTMARE"}};
function go(k){if(document.getElementById("g5-maze-root"))return;var diff=D[k]||D.hard,S=diff.s,V=diff.v;
var root=document.createElement("div");root.id="g5-maze-root";
root.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;width:min(96vw,640px);margin-bottom:.3rem;z-index:2;font-family:monospace"><span style="font-weight:900;letter-spacing:.2em;font-size:1.1rem;margin-right:auto;background:linear-gradient(90deg,#00f5ff,#ff2d95,#ffd700);-webkit-background-clip:text;background-clip:text;color:transparent">G5 MAZE</span><span id="g5-mz-diff" style="font-size:.6rem;padding:.15rem .4rem;border:1px solid #ff2d95;color:#ff8cc8;border-radius:4px">'+diff.L+'</span><span id="g5-mz-stat" style="font-size:.65rem;color:#00f5ff;flex:1">—</span><button data-d="easy" class="mb">E</button><button data-d="normal" class="mb">N</button><button data-d="hard" class="mb">H</button><button data-d="nightmare" class="mb">X</button><button id="g5-mz-new" class="mb">NEW</button><button id="g5-mz-x" class="mb" style="border-color:#ff2d95;color:#ff8cc8">×</button></div><canvas id="g5-mz-cv" style="border:1px solid rgba(0,245,255,.35);border-radius:10px;background:#0a0e18;max-width:96vw;max-height:calc(100vh - 5.5rem);touch-action:none"></canvas><p style="font-size:.6rem;color:rgba(0,245,255,.4);margin-top:.3rem;font-family:monospace">矢印/WASD · 🔑鍵で出口 · Esc</p>';
if(!document.getElementById("g5-mz-css")){var st=document.createElement("style");st.id="g5-mz-css";
st.textContent="#g5-maze-root{position:fixed;inset:0;z-index:100090;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#02010a;padding:.4rem}.mb{border:1px solid #00f5ff;background:rgba(0,245,255,.1);color:#00f5ff;border-radius:6px;padding:.2rem .45rem;cursor:pointer;font-size:.65rem;font-family:monospace}.g5-mz-win{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(2,1,10,.92);color:#00f5ff;text-align:center;font-family:monospace}.g5-mz-win h2{letter-spacing:.2em;text-shadow:0 0 20px #00f5ff}";
document.head.appendChild(st);}
document.body.appendChild(root);
var cv=document.getElementById("g5-mz-cv"),ctx=cv.getContext("2d");
var maze=[],px=1,py=1,gx,gy,steps=0,score=0,won=0,dead=0,t0=Date.now(),trail={},cell=10,anim={x:1,y:1};
var traps=[],enemies=[],items=[],keys=0,keysN=1,shield=0,hp=3,raf=0,alive=1,lastM=0;
function resize(){var side=Math.min(window.innerWidth-20,window.innerHeight-100,640);cell=Math.max(6,Math.floor(side/S)|0);cv.width=cell*S;cv.height=cell*S;}
function dist(a,b,c,d){return Math.abs(a-c)+Math.abs(b-d);}
function gen(){maze=[];for(var y=0;y<S;y++){maze[y]=[];for(var x=0;x<S;x++)maze[y][x]=1;}
function carve(x,y){maze[y][x]=0;var dirs=[[0,-2],[0,2],[-2,0],[2,0]];for(var i=3;i>0;i--){var j=(Math.random()*(i+1))|0,t=dirs[i];dirs[i]=dirs[j];dirs[j]=t;}
for(var d=0;d<4;d++){var nx=x+dirs[d][0],ny=y+dirs[d][1];if(nx>0&&ny>0&&nx<S-1&&ny<S-1&&maze[ny][nx]===1){maze[y+dirs[d][1]/2][x+dirs[d][0]/2]=0;carve(nx,ny);}}}
carve(1,1);maze[1][1]=0;maze[S-2][S-2]=0;px=py=1;gx=gy=S-2;anim={x:1,y:1};steps=score=won=dead=0;t0=Date.now();trail={"1,1":1};hp=3;keys=0;keysN=Math.max(1,S/28|0);shield=0;traps=[];enemies=[];items=[];
var open=[];for(var yy=1;yy<S-1;yy++)for(var xx=1;xx<S-1;xx++)if(maze[yy][xx]===0&&!(xx===1&&yy===1)&&!(xx===gx&&yy===gy)&&Math.abs(xx-1)+Math.abs(yy-1)>4)open.push({x:xx,y:yy});
for(var i=open.length-1;i>0;i--){var j=(Math.random()*(i+1))|0,t=open[i];open[i]=open[j];open[j]=t;}
for(var ti=0;ti<Math.min(diff.t,open.length);ti++){var c=open[ti];traps.push({x:c.x,y:c.y,ox:c.x,oy:c.y,ax:Math.random()<.5?"x":"y",ph:Math.random()*6.28,rg:1.5+(Math.random()*2|0),sp:.014+Math.random()*.012});}
for(var ei=0;ei<Math.min(diff.e,open.length-diff.t);ei++){var c=open[diff.t+ei];enemies.push({x:c.x,y:c.y,dir:[[1,0],[-1,0],[0,1],[0,-1]][Math.random()*4|0],sp:.022,ph:0});}
var types=["key","vision","shield"];for(var ii=0;ii<Math.min(6,open.length);ii++){var c=open[(diff.t+diff.e+ii)%open.length];items.push({x:c.x,y:c.y,type:types[Math.random()*3|0],ok:1});}
var kc=items.filter(function(it){return it.type==="key";}).length;for(var kk=kc;kk<keysN;kk++)items.push({x:open[open.length-1-kk].x,y:open[open.length-1-kk].y,type:"key",ok:1});
var w=root.querySelector(".g5-mz-win");if(w)w.remove();draw();}
function draw(){var vis=V+(shield?.5:0);ctx.fillStyle="#0a0e18";ctx.fillRect(0,0,cv.width,cv.height);
for(var y=0;y<S;y++)for(var x=0;x<S;x++){var d=dist(x,y,px,py);var show=d<=vis||(x===gx&&y===gy&&d<=vis+3)||trail[x+","+y];
if(!show)continue;
var al=d<=vis?Math.max(.45,1-d/(vis+1.5)*.5):(trail[x+","+y]?0.35:0.2);
if(maze[y][x]){ctx.fillStyle="rgba(40,120,160,"+(0.55*al)+")";ctx.fillRect(x*cell+.2,y*cell+.2,cell-.4,cell-.4);ctx.strokeStyle="rgba(0,220,255,"+(0.45*al)+")";ctx.lineWidth=1;ctx.strokeRect(x*cell+.2,y*cell+.2,cell-.4,cell-.4);}
else{if(trail[x+","+y]){ctx.fillStyle="rgba(255,45,149,"+(0.12*al)+")";ctx.fillRect(x*cell,y*cell,cell,cell);}
else if(d<=vis){ctx.fillStyle="rgba(15,25,40,"+(0.4*al)+")";ctx.fillRect(x*cell,y*cell,cell,cell);}}}
items.forEach(function(it){if(!it.ok||dist(it.x,it.y,px,py)>vis+1.5)return;ctx.fillStyle=it.type==="key"?"#ffd700":it.type==="vision"?"#00f5ff":"#7cff9a";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(it.x*cell+cell/2,it.y*cell+cell/2,cell*.2,0,6.28);ctx.fill();ctx.shadowBlur=0;});
traps.forEach(function(tr){if(dist(Math.round(tr.x),Math.round(tr.y),px,py)>vis+1.5)return;ctx.fillStyle="rgba(255,50,80,.85)";ctx.shadowColor="#ff2d55";ctx.shadowBlur=12;ctx.beginPath();ctx.arc(tr.x*cell+cell/2,tr.y*cell+cell/2,cell*.2,0,6.28);ctx.fill();ctx.shadowBlur=0;});
enemies.forEach(function(en){if(dist(Math.round(en.x),Math.round(en.y),px,py)>vis+1.5)return;var ex=en.x*cell+cell/2,ey=en.y*cell+cell/2;ctx.fillStyle="#ff6b35";ctx.shadowColor="#ff6b35";ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(ex,ey-cell*.24);ctx.lineTo(ex+cell*.2,ey+cell*.18);ctx.lineTo(ex-cell*.2,ey+cell*.18);ctx.fill();ctx.shadowBlur=0;});
if(dist(gx,gy,px,py)<=vis+3){ctx.fillStyle=keys<keysN?"#666":"#ff2d95";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=16;ctx.beginPath();ctx.arc(gx*cell+cell/2,gy*cell+cell/2,cell*.28,0,6.28);ctx.fill();ctx.shadowBlur=0;}
var ax=anim.x*cell+cell/2,ay=anim.y*cell+cell/2;ctx.fillStyle=shield?"#7cff9a":"#00f5ff";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=16;ctx.beginPath();ctx.arc(ax,ay,cell*.34,0,6.28);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(ax,ay,cell*.12,0,6.28);ctx.fill();
var el=((Date.now()-t0)/1000)|0,ht="";for(var h=0;h<3;h++)ht+=h<hp?"♥":"♡";
document.getElementById("g5-mz-stat").textContent=ht+" · "+steps+" · "+(el/60|0)+":"+(el%60<10?"0":"")+(el%60)+" · 🔑"+keys+"/"+keysN+" · "+score;}
function hit(){if(won||dead)return;if(shield){shield--;return;}hp--;if(hp<=0){dead=1;var ov=document.createElement("div");ov.className="g5-mz-win";ov.innerHTML="<h2>FAIL</h2><p>"+steps+" steps · "+score+'</p><button class="mb" id="g5-mz-retry">RETRY</button>';root.appendChild(ov);document.getElementById("g5-mz-retry").onclick=gen;}}
function loop(){if(!alive)return;var now=Date.now();anim.x+=(px-anim.x)*.35;anim.y+=(py-anim.y)*.35;
traps.forEach(function(tr){tr.ph+=tr.sp;var off=Math.sin(tr.ph)*tr.rg;if(tr.ax==="x"){var nx=Math.round(tr.ox+off);if(nx>0&&nx<S-1&&maze[tr.oy][nx]===0)tr.x=tr.ox+off;}else{var ny=Math.round(tr.oy+off);if(ny>0&&ny<S-1&&maze[ny][tr.ox]===0)tr.y=tr.oy+off;}
if(!won&&!dead&&Math.abs(tr.x-px)<.5&&Math.abs(tr.y-py)<.5&&(!tr.cd||now-tr.cd>800)){tr.cd=now;hit();}});
enemies.forEach(function(en){en.ph+=en.sp;if(en.ph>=1){en.ph=0;var nx=Math.round(en.x)+en.dir[0],ny=Math.round(en.y)+en.dir[1];if(nx<=0||ny<=0||nx>=S-1||ny>=S-1||maze[ny][nx])en.dir=[[1,0],[-1,0],[0,1],[0,-1]][Math.random()*4|0];else{en.x=nx;en.y=ny;}}
if(!won&&!dead&&Math.abs(en.x-px)<.55&&Math.abs(en.y-py)<.55&&(!en.cd||now-en.cd>850)){en.cd=now;hit();}});
draw();raf=requestAnimationFrame(loop);}
function move(dx,dy){if(won||dead)return;var now=Date.now();if(now-lastM<85)return;lastM=now;var nx=px+dx,ny=py+dy;if(nx<0||ny<0||nx>=S||ny>=S||maze[ny][nx])return;px=nx;py=ny;steps++;trail[px+","+py]=1;
items.forEach(function(it){if(it.ok&&it.x===px&&it.y===py){it.ok=0;score+=70;if(it.type==="key")keys++;else if(it.type==="vision")V=Math.min(V+1.2,8);else if(it.type==="shield")shield=Math.min(2,shield+1);}});
if(px===gx&&py===gy){if(keys<keysN)return;won=1;score+=300+hp*80;var ov=document.createElement("div");ov.className="g5-mz-win";ov.innerHTML="<h2>CLEAR</h2><p>"+steps+" steps · "+diff.L+" · score "+score+'</p><button class="mb" id="g5-mz-again">NEXT</button>';root.appendChild(ov);document.getElementById("g5-mz-again").onclick=gen;}}
function onKey(e){if(!document.getElementById("g5-maze-root"))return;var m={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};if(e.key==="Escape"){cleanup();return;}if(m[e.key]){e.preventDefault();move(m[e.key][0],m[e.key][1]);}}
var sx=0,sy=0;
function cleanup(){alive=0;cancelAnimationFrame(raf);document.removeEventListener("keydown",onKey,true);if(root.parentNode)root.parentNode.removeChild(root);}
document.addEventListener("keydown",onKey,true);window.addEventListener("resize",function(){resize();});
cv.addEventListener("touchstart",function(e){if(e.touches[0]){sx=e.touches[0].clientX;sy=e.touches[0].clientY;}},{passive:true});
cv.addEventListener("touchend",function(e){if(!e.changedTouches[0])return;var dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.abs(dx)<16&&Math.abs(dy)<16)return;if(Math.abs(dx)>Math.abs(dy))move(dx>0?1:-1,0);else move(0,dy>0?1:-1);},{passive:true});
document.getElementById("g5-mz-new").onclick=gen;document.getElementById("g5-mz-x").onclick=cleanup;
root.querySelectorAll("[data-d]").forEach(function(b){b.onclick=function(){diff=D[b.getAttribute("data-d")]||D.hard;S=diff.s;V=diff.v;document.getElementById("g5-mz-diff").textContent=diff.L;resize();gen();};});
resize();gen();loop();}
window.G5Maze={start:function(d){go(d||"hard");}};window.maze=function(d){go(d||"hard");};
function boot(){document.addEventListener("click",function(e){var t=document.getElementById("qr-text");if(!t||!e.target.closest("#btn-gen,button"))return;var v=(t.value||"").trim().toLowerCase();
if(/^(maze|迷路|labyrinth|nightmare|hardmaze|g5maze)$/.test(v))setTimeout(function(){go(/nightmare|hardmaze/.test(v)?"nightmare":"hard");},200);});
var q=document.getElementById("qr-out");if(q){var taps=0,tm;q.onclick=function(){taps++;clearTimeout(tm);tm=setTimeout(function(){taps=0;},900);if(taps>=5){taps=0;go("hard");}};}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
