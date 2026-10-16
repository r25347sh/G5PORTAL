(function(){"use strict";if(window.__G5_INV_V5__)return;window.__G5_INV_V5__=true;
function launch(){if(document.getElementById("g5-inv-root"))return;
var root=document.createElement("div");root.id="g5-inv-root";
root.innerHTML='<div class="ih"><span class="it">G5 INVADERS</span><span class="is" id="is">0</span><span class="iw" id="iw">WAVE 1</span><span class="il" id="il">♥♥♥</span><button id="ix" class="ib">×</button></div><canvas id="ic"></canvas><div id="io" class="io hidden"></div><div id="iwv" class="iwv"></div>';
if(!document.getElementById("g5invcss")){var st=document.createElement("style");st.id="g5invcss";
st.textContent="#g5-inv-root{position:fixed;inset:0;z-index:100100;background:#010008;overflow:hidden;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}"+ 
"#g5-inv-root::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:3;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,245,255,.03) 2px,rgba(0,245,255,.03) 4px),radial-gradient(ellipse at 50% 100%,rgba(255,45,149,.1),transparent 50%),radial-gradient(ellipse at 50% 0%,rgba(0,245,255,.08),transparent 40%)}"+ 
".ih{position:absolute;top:0;left:0;right:0;z-index:5;display:flex;align-items:center;gap:.5rem;padding:max(.5rem,env(safe-area-inset-top)) .9rem .4rem;background:linear-gradient(180deg,rgba(0,0,0,.8),transparent);flex-wrap:wrap}"+ 
".it{font-weight:900;letter-spacing:.22em;font-size:clamp(.95rem,3vw,1.2rem);margin-right:auto;background:linear-gradient(90deg,#ff2d95,#00f5ff,#ffd700,#a855f7,#ff2d95);background-size:240% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:ich 2.8s linear infinite;filter:drop-shadow(0 0 10px rgba(255,45,149,.4))}"+ 
"@keyframes ich{to{background-position:240% center}}.is,.iw,.il{font-size:.72rem;color:#00f5ff;text-shadow:0 0 8px rgba(0,245,255,.5)}.il{color:#ff6b9a}"+ 
".ib{border:1px solid rgba(255,45,149,.5);background:rgba(255,45,149,.12);color:#ff8cc8;border-radius:6px;padding:.2rem .55rem;cursor:pointer;font-size:.75rem}"+ 
"#ic{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}"+ 
".io{position:absolute;inset:0;z-index:12;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(1,0,8,.92);backdrop-filter:blur(10px);text-align:center;color:#e8f7ff}"+ 
".io h2{letter-spacing:.28em;font-size:clamp(1.5rem,5vw,2.4rem);color:#00f5ff;text-shadow:0 0 30px #00f5ff,0 0 60px #ff2d95;margin:0 0 .5rem}.io.hidden{display:none}"+ 
".io button{margin-top:1rem;padding:.45rem 1.4rem;border:1px solid #00f5ff;background:rgba(0,245,255,.12);color:#00f5ff;border-radius:8px;cursor:pointer;font-family:inherit;letter-spacing:.1em}"+ 
".iwv{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);z-index:8;font-size:clamp(1.2rem,4vw,2rem);letter-spacing:.3em;color:#00f5ff;text-shadow:0 0 20px #00f5ff;opacity:0;pointer-events:none;transition:opacity .3s;font-weight:900}"+ 
".iwv.show{opacity:1;animation:iwpop .8s ease}";
document.head.appendChild(st);}
document.body.appendChild(root);
var cv=document.getElementById("ic"),ctx=cv.getContext("2d");
var W,H,ship={x:0,y:0,spd:6},bul=[],eb=[],en=[],pow=[],pt=[];
var score=0,lives=3,wave=1,combo=0,cT=0,wep=1,rapid=0,shield=0,bomb=0,spread=0,charge=0,charging=0;
var keys={},mx=0,my=0,touch=0,raf=0,alive=1,over=0,boss=null,shake=0,stars=[];
function resize(){W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;if(!ship.x){ship.x=W/2;ship.y=H-70;}
stars=[];for(var i=0;i<60;i++)stars.push({x:Math.random()*W,y:Math.random()*H,s:.5+Math.random()*1.5,v:.3+Math.random()*1.2});}
function spk(x,y,c,n,spd){for(var i=0;i<(n||8);i++){var a=Math.random()*6.28,s=(spd||2)+Math.random()*2.5;pt.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:18+Math.random()*18,max:36,c:c||"#00f5ff"});}}
function spawnWave(){en=[];var rows=3+Math.min(4,wave),cols=6+Math.min(6,wave);var gapX=W/(cols+1),gapY=36;
for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){var t=r%3;en.push({x:gapX*(c+1),y:60+r*gapY,vx:1.2+wave*0.15,vy:0,hp:1+(wave>3?1:0)+(t===2?1:0),t:t,w:22,h:16,fr:0});}
if(wave%4===0)boss={x:W/2,y:80,hp:20+wave*5,max:20+wave*5,vx:1.5,phase:0,fr:0};var wv=document.getElementById("iwv");if(wv){wv.textContent="WAVE "+wave;wv.classList.add("show");setTimeout(function(){wv.classList.remove("show");},1200);}document.getElementById("iw").textContent="WAVE "+wave;}
function fire(){if(over)return;var n=spread?3:1,sp=spread?12:0;for(var i=0;i<n;i++){var dx=(i-(n-1)/2)*sp;bul.push({x:ship.x+dx,y:ship.y-16,vx:dx*0.1,vy:-10-(wep>1?2:0),dmg:wep,c:wep>1?"#ffd700":"#00f5ff"});}if(rapid)setTimeout(function(){if(!over)for(var j=0;j<(spread?2:1);j++)bul.push({x:ship.x+(j?8:-8),y:ship.y-16,vx:0,vy:-11,dmg:1,c:"#a855f7"});},80);}
function update(){if(over)return;
if(keys["ArrowLeft"]||keys["a"]||keys["A"])ship.x-=ship.spd;if(keys["ArrowRight"]||keys["d"]||keys["D"])ship.x+=ship.spd;
if(touch){ship.x+=(mx-ship.x)*0.18;ship.y=Math.max(H*0.55,Math.min(H-40,my));}else ship.y=H-70;
ship.x=Math.max(20,Math.min(W-20,ship.x));
if(keys[" "]||keys["ArrowUp"]){if(!charging){charging=1;charge=0;}charge=Math.min(100,charge+2.5);if(charge>=100){charging=0;charge=0;bul.push({x:ship.x,y:ship.y-20,vx:0,vy:-16,dmg:5,c:"#ffd700",big:1});spk(ship.x,ship.y-20,"#ffd700",12,4);}}else if(charging){charging=0;if(charge>30)fire();charge=0;}
if(keys["b"]||keys["B"]){if(bomb>0){bomb--;keys["b"]=keys["B"]=0;for(var i=en.length-1;i>=0;i--){spk(en[i].x,en[i].y,"#ff2d95",10,3);en.splice(i,1);score+=50;}if(boss){boss.hp-=15;spk(boss.x,boss.y,"#ff2d95",20,5);}}}
for(var i=bul.length-1;i>=0;i--){var b=bul[i];b.x+=b.vx;b.y+=b.vy;if(b.y<-20||b.x<-20||b.x>W+20){bul.splice(i,1);continue;}
for(var j=en.length-1;j>=0;j--){var e=en[j];if(Math.abs(b.x-e.x)<e.w/2+4&&Math.abs(b.y-e.y)<e.h/2+4){e.hp-=b.dmg;bul.splice(i,1);spk(e.x,e.y,e.t===2?"#ff2d95":"#00f5ff",6,2);if(e.hp<=0){score+=10*(1+combo);combo++;cT=90;en.splice(j,1);if(Math.random()<0.12)pow.push({x:e.x,y:e.y,t:Math.floor(Math.random()*5),vy:1.5});}break;}}
if(boss&&Math.abs(b.x-boss.x)<28&&Math.abs(b.y-boss.y)<22){boss.hp-=b.dmg;bul.splice(i,1);spk(b.x,b.y,"#ffd700",8,3);if(boss.hp<=0){score+=500;spk(boss.x,boss.y,"#ff2d95",30,6);boss=null;wave++;spawnWave();}}}
for(var i=en.length-1;i>=0;i--){var e=en[i];e.x+=e.vx;if(e.x<20||e.x>W-20){e.vx*=-1;e.y+=12;}e.fr++;if(e.fr>40+Math.random()*30){e.fr=0;if(Math.random()<0.4+wave*0.05)eb.push({x:e.x,y:e.y+8,vy:2.5+wave*0.2,vx:(Math.random()-0.5)*1.5});}if(e.y>H-40){lives--;document.getElementById("il").textContent="♥".repeat(Math.max(0,lives));en.splice(i,1);spk(e.x,e.y,"#ff2d95",10,3);if(lives<=0)gameOver();}}
if(boss){boss.x+=boss.vx;if(boss.x<40||boss.x>W-40)boss.vx*=-1;boss.phase++;boss.fr++;if(boss.fr>25){boss.fr=0;for(var k=-1;k<=1;k++)eb.push({x:boss.x+k*18,y:boss.y+20,vy:3,vx:k*1.2});}}
for(var i=eb.length-1;i>=0;i--){var b=eb[i];b.x+=b.vx||0;b.y+=b.vy;if(b.y>H+10){eb.splice(i,1);continue;}if(Math.abs(b.x-ship.x)<14&&Math.abs(b.y-ship.y)<12){if(shield){shield=0;spk(ship.x,ship.y,"#7cff9a",10,3);}else{lives--;document.getElementById("il").textContent="♥".repeat(Math.max(0,lives));spk(ship.x,ship.y,"#ff2d95",12,4);shake=12;if(lives<=0)gameOver();}eb.splice(i,1);}}
for(var i=pow.length-1;i>=0;i--){var p=pow[i];p.y+=p.vy;if(p.y>H){pow.splice(i,1);continue;}if(Math.abs(p.x-ship.x)<18&&Math.abs(p.y-ship.y)<16){if(p.t===0){wep=Math.min(3,wep+1);}else if(p.t===1){rapid=1;setTimeout(function(){rapid=0;},8000);}else if(p.t===2){spread=1;setTimeout(function(){spread=0;},10000);}else if(p.t===3){bomb++;}else{shield=1;}spk(p.x,p.y,"#ffd700",8,2);pow.splice(i,1);}}
for(var i=pt.length-1;i>=0;i--){var p=pt[i];p.x+=p.vx;p.y+=p.vy;p.life--;if(p.life<=0)pt.splice(i,1);}
if(cT>0)cT--;else combo=0;if(en.length===0&&!boss){wave++;spawnWave();}document.getElementById("is").textContent=score;}
function draw(){ctx.save();if(shake>0){ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);shake*=0.85;}
ctx.fillStyle="#010008";ctx.fillRect(0,0,W,H);
for(var i=0;i<stars.length;i++){var s=stars[i];s.y+=s.v;if(s.y>H)s.y=0;ctx.fillStyle="rgba(200,220,255,"+(0.3+s.s*0.2)+")";ctx.fillRect(s.x,s.y,s.s,s.s);}
for(var i=0;i<en.length;i++){var e=en[i];ctx.fillStyle=e.t===0?"#00f5ff":e.t===1?"#a855f7":"#ff2d95";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=8;ctx.fillRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h);ctx.shadowBlur=0;ctx.fillStyle="#fff";ctx.fillRect(e.x-4,e.y-3,3,3);ctx.fillRect(e.x+1,e.y-3,3,3);}
if(boss){ctx.fillStyle="#ff2d95";ctx.shadowColor="#ff2d95";ctx.shadowBlur=16;ctx.beginPath();ctx.moveTo(boss.x,boss.y-20);ctx.lineTo(boss.x-30,boss.y+15);ctx.lineTo(boss.x+30,boss.y+15);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#fff";ctx.fillRect(boss.x-12,boss.y-8,8,6);ctx.fillRect(boss.x+4,boss.y-8,8,6);ctx.fillStyle="rgba(255,45,149,.4)";ctx.fillRect(boss.x-40,boss.y-28,80*(boss.hp/boss.max),4);}
for(var i=0;i<bul.length;i++){var b=bul[i];ctx.fillStyle=b.c;ctx.shadowColor=b.c;ctx.shadowBlur=b.big?12:6;if(b.big){ctx.beginPath();ctx.arc(b.x,b.y,6,0,6.28);ctx.fill();}else ctx.fillRect(b.x-2,b.y-6,4,10);ctx.shadowBlur=0;}
for(var i=0;i<eb.length;i++){var b=eb[i];ctx.fillStyle="#ff6b9a";ctx.fillRect(b.x-2,b.y,4,8);}
for(var i=0;i<pow.length;i++){var p=pow[i];var cols=["#ffd700","#a855f7","#00f5ff","#ff2d95","#7cff9a"];ctx.fillStyle=cols[p.t];ctx.beginPath();ctx.arc(p.x,p.y,7,0,6.28);ctx.fill();}
for(var i=0;i<pt.length;i++){var p=pt[i];ctx.globalAlpha=p.life/p.max;ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,2,2);}ctx.globalAlpha=1;
ctx.shadowColor=shield?"#7cff9a":"#00f5ff";ctx.shadowBlur=16;
var g=ctx.createLinearGradient(ship.x,ship.y-14,ship.x,ship.y+12);g.addColorStop(0,"#fff");g.addColorStop(.4,shield?"#7cff9a":"#00f5ff");g.addColorStop(1,"rgba(0,245,255,.2)");
ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(ship.x,ship.y-14);ctx.lineTo(ship.x-15,ship.y+11);ctx.lineTo(ship.x-5,ship.y+6);ctx.lineTo(ship.x+5,ship.y+6);ctx.lineTo(ship.x+15,ship.y+11);ctx.closePath();ctx.fill();
ctx.shadowBlur=0;/* engine */ctx.fillStyle="rgba(0,245,255,.6)";ctx.fillRect(ship.x-3,ship.y+8,6,4+Math.random()*4);
if(charging){ctx.strokeStyle="rgba(255,215,0,"+(charge/100)+")";ctx.lineWidth=2;ctx.beginPath();ctx.arc(ship.x,ship.y-20,8+charge/20,0,6.28);ctx.stroke();}
var hud=[];if(wep>1)hud.push("W"+wep);if(rapid)hud.push("RAPID");if(spread)hud.push("SPREAD");if(bomb)hud.push("💣"+bomb);if(shield)hud.push("🛡");
if(hud.length){ctx.fillStyle="rgba(0,245,255,.55)";ctx.font="11px monospace";ctx.textAlign="left";ctx.fillText(hud.join("  "),10,H-14);}
ctx.restore();}
function gameOver(){over=1;var o=document.getElementById("io");o.classList.remove("hidden");
o.innerHTML="<h2>GAME OVER</h2><p style=\"color:rgba(232,247,255,.8)\">Score "+score+" · Wave "+wave+'</p><button id="ir">RETRY</button>';document.getElementById("ir").onclick=function(){o.classList.add("hidden");reset();};}
function reset(){score=0;lives=3;wave=1;combo=0;wep=1;rapid=spread=shield=bomb=charge=0;over=0;en=[];bul=[];eb=[];pow=[];boss=null;
document.getElementById("is").textContent="0";document.getElementById("iw").textContent="WAVE 1";document.getElementById("il").textContent="♥♥♥";spawnWave();}
function loop(){if(!alive)return;update();draw();raf=requestAnimationFrame(loop);}
function onKey(e){keys[e.key]=e.type==="keydown";if(e.key==="Escape"){cleanup();return;}if([" ","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.key)>=0)e.preventDefault();}
function cleanup(){alive=0;cancelAnimationFrame(raf);document.removeEventListener("keydown",onKey);document.removeEventListener("keyup",onKey);window.removeEventListener("resize",resize);if(root.parentNode)root.parentNode.removeChild(root);}
document.addEventListener("keydown",onKey);document.addEventListener("keyup",onKey);window.addEventListener("resize",resize);
cv.addEventListener("pointerdown",function(e){touch=1;mx=e.clientX;my=e.clientY;cv.setPointerCapture(e.pointerId);});
cv.addEventListener("pointermove",function(e){if(touch){mx=e.clientX;my=e.clientY;}});
cv.addEventListener("pointerup",function(){touch=0;});
document.getElementById("ix").onclick=cleanup;resize();reset();loop();}
window.G5Invaders={start:launch};
function boot(){document.addEventListener("click",function(e){var t=document.getElementById("color-hex")||document.getElementById("hex-input")||document.querySelector("input[type=text]");
var v=t?((t.value||"").trim().toLowerCase()):"";if(v==="invader"||v==="invaders"||v==="インベーダー")setTimeout(launch,200);});
var sw=document.getElementById("swatch")||document.querySelector(".swatch");
if(sw){var taps=0,t2;sw.addEventListener("click",function(){taps++;clearTimeout(t2);t2=setTimeout(function(){taps=0;},1000);if(taps>=5){taps=0;launch();}});}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
