(function(){"use strict";if(window.__G5_INV_V4__)return;window.__G5_INV_V4__=true;
function launch(){if(document.getElementById("g5-inv-root"))return;
var root=document.createElement("div");root.id="g5-inv-root";
root.innerHTML='<div class="g5ih"><span class="g5it">G5 INVADERS</span><span id="g5is">0</span><span id="g5iw">W1</span><span id="g5il">♥♥♥</span><button id="g5ix" class="g5ib">×</button></div><canvas id="g5ic"></canvas><div id="g5io" class="g5io hidden"></div>';
if(!document.getElementById("g5-inv-css")){var st=document.createElement("style");st.id="g5-inv-css";
st.textContent="#g5-inv-root{position:fixed;inset:0;z-index:100100;background:#010008;display:flex;flex-direction:column;overflow:hidden}"+ ".g5ih{position:absolute;top:0;left:0;right:0;z-index:4;display:flex;align-items:center;gap:.5rem;padding:max(.45rem,env(safe-area-inset-top)) .8rem .4rem;background:linear-gradient(180deg,rgba(0,0,0,.75),transparent);font-family:ui-monospace,monospace}"+ ".g5it{font-weight:900;letter-spacing:.2em;font-size:clamp(.9rem,3vw,1.15rem);margin-right:auto;background:linear-gradient(90deg,#ff2d95,#00f5ff,#ffd700);-webkit-background-clip:text;background-clip:text;color:transparent}"+ "#g5is,#g5iw,#g5il{color:#00f5ff;font-size:.75rem}#g5il{color:#ff6b9a}.g5ib{border:1px solid #ff2d95;background:rgba(255,45,149,.15);color:#ff8cc8;border-radius:6px;padding:.2rem .5rem;cursor:pointer}"+ "#g5ic{flex:1;width:100%;display:block;touch-action:none}.g5io{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(1,0,8,.9);color:#00f5ff;font-family:ui-monospace,monospace;text-align:center}"+ ".g5io h2{letter-spacing:.25em;font-size:clamp(1.4rem,5vw,2.2rem);text-shadow:0 0 24px #00f5ff}.g5io.hidden{display:none}.g5io button{margin-top:1rem;padding:.4rem 1.2rem;border:1px solid #00f5ff;background:rgba(0,245,255,.12);color:#00f5ff;border-radius:8px;cursor:pointer;font-family:inherit}";
document.head.appendChild(st);}
document.body.appendChild(root);
var cv=document.getElementById("g5ic"),ctx=cv.getContext("2d");
var W,H,ship={x:0,y:0,w:28,h:18,spd:5.5},bullets=[],ebullets=[],enemies=[],pows=[],particles=[];
var score=0,lives=3,wave=1,combo=0,comboT=0,weapon=1,rapid=0,shield=0,bomb=0,spread=0;
var keys={},mx=0,my=0,touching=0,raf=0,alive=1,over=0,boss=null,shake=0;
function resize(){W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;ship.x=W/2;ship.y=H-60;}
function spark(x,y,col,n,spd){for(var i=0;i<(n||8);i++){var a=Math.random()*6.28,s=(spd||2)+Math.random()*2;particles.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:20+Math.random()*15,max:35,c:col||"#00f5ff",sz:1.5+Math.random()*2});}}
function addScore(n){var m=1+Math.min(combo,12)*.15;score+=Math.floor(n*m);combo++;comboT=120;document.getElementById("g5is").textContent=score+(combo>2?" x"+combo:"");}
function spawnWave(){var n=6+wave*2,rows=Math.min(4,1+(wave/3|0));
for(var r=0;r<rows;r++)for(var c=0;c<n;c++){var t=wave>=4&&Math.random()<.25?"tank":(wave>=3&&Math.random()<.3?"zig":"basic");
enemies.push({x:40+c*((W-80)/n),y:50+r*36,hp:t==="tank"?3:1,type:t,ph:Math.random()*6.28,dir:1,w:t==="tank"?28:22,h:t==="tank"?20:16});}
if(wave%3===0){boss={x:W/2,y:70,hp:20+wave*8,max:20+wave*8,ph:0,w:60,h:36};}}
function fire(){var now=Date.now();if(ship._cd&&now-ship._cd<(rapid?90:180))return;ship._cd=now;
var bx=ship.x,by=ship.y-12;bullets.push({x:bx,y:by,vy:-9,dmg:1});
if(weapon>=2||spread){bullets.push({x:bx-10,y:by,vy:-8.5,vx:-1.2,dmg:1});bullets.push({x:bx+10,y:by,vy:-8.5,vx:1.2,dmg:1});}
if(weapon>=3){bullets.push({x:bx-16,y:by+4,vy:-8,vx:-2,dmg:1});bullets.push({x:bx+16,y:by+4,vy:-8,vx:2,dmg:1});}}
function dropPow(x,y){if(Math.random()>.35)return;var types=["rapid","spread","shield","bomb","weapon"];pows.push({x:x,y:y,type:types[Math.random()*types.length|0],vy:1.4,life:400});}
function useBomb(){if(bomb<=0)return;bomb--;enemies.forEach(function(e){e.hp-=5;spark(e.x,e.y,"#ffd700",12,3);});if(boss)boss.hp-=15;spark(ship.x,ship.y,"#ffd700",30,4);shake=12;}
function update(){if(over)return;var now=Date.now();
if(keys["ArrowLeft"]||keys["a"]||keys["A"])ship.x-=ship.spd;if(keys["ArrowRight"]||keys["d"]||keys["D"])ship.x+=ship.spd;
if(keys["ArrowUp"]||keys["w"]||keys["W"])ship.y-=ship.spd;if(keys["ArrowDown"]||keys["s"]||keys["S"])ship.y+=ship.spd;
if(touching){ship.x+=(mx-ship.x)*.12;ship.y+=(my-20-ship.y)*.1;}
ship.x=Math.max(20,Math.min(W-20,ship.x));ship.y=Math.max(40,Math.min(H-30,ship.y));
if(keys[" "]||keys["Spacebar"]||touching)fire();
if(keys["b"]||keys["B"]){if(!ship._bc){useBomb();ship._bc=1;}}else ship._bc=0;
if(comboT>0)comboT--;else combo=0;
if(rapid>0)rapid--;if(spread>0)spread--;
bullets=bullets.filter(function(b){b.x+=(b.vx||0);b.y+=b.vy;return b.y>-20&&b.x>-20&&b.x<W+20;});
ebullets=ebullets.filter(function(b){b.x+=(b.vx||0);b.y+=b.vy;return b.y<H+20;});
enemies.forEach(function(e){e.ph+=.02;if(e.type==="zig"){e.x+=Math.sin(e.ph*2)*1.5;e.y+=.4;}else if(e.type==="tank"){e.y+=.25;e.x+=Math.sin(e.ph)*.4;}else{e.y+=.35+wave*.02;e.x+=Math.sin(e.ph)*.8;}
if(Math.random()<.003+wave*.0008)ebullets.push({x:e.x,y:e.y+10,vy:2.5+Math.random(),vx:(Math.random()-.5)*1.5});});
if(boss){boss.ph+=.015;boss.x=W/2+Math.sin(boss.ph)*W*.28;if(Math.random()<.04){for(var i=-2;i<=2;i++)ebullets.push({x:boss.x+i*12,y:boss.y+20,vy:3,vx:i*.8});}}
pows=pows.filter(function(p){p.y+=p.vy;p.life--;if(Math.abs(p.x-ship.x)<22&&Math.abs(p.y-ship.y)<22){if(p.type==="rapid")rapid=400;else if(p.type==="spread")spread=350;else if(p.type==="shield")shield=1;else if(p.type==="bomb")bomb=Math.min(3,bomb+1);else if(p.type==="weapon")weapon=Math.min(3,weapon+1);spark(p.x,p.y,"#ffd700",10);return false;}return p.life>0&&p.y<H;});
bullets.forEach(function(b){enemies.forEach(function(e){if(e.hp>0&&Math.abs(b.x-e.x)<e.w/2+4&&Math.abs(b.y-e.y)<e.h/2+4){e.hp-=b.dmg;b.y=-999;spark(e.x,e.y,"#00f5ff",6);if(e.hp<=0){addScore(e.type==="tank"?150:50);dropPow(e.x,e.y);spark(e.x,e.y,"#ff2d95",14,3);}}});
if(boss&&boss.hp>0&&Math.abs(b.x-boss.x)<boss.w/2&&Math.abs(b.y-boss.y)<boss.h/2){boss.hp-=b.dmg;b.y=-999;spark(b.x,b.y,"#ffd700",4);if(boss.hp<=0){addScore(1000);spark(boss.x,boss.y,"#ffd700",40,5);boss=null;shake=16;}}});
enemies=enemies.filter(function(e){return e.hp>0&&e.y<H+30;});
ebullets.forEach(function(b){if(Math.abs(b.x-ship.x)<16&&Math.abs(b.y-ship.y)<14){b.y=H+99;if(shield){shield=0;spark(ship.x,ship.y,"#7cff9a",12);}else{lives--;shake=10;spark(ship.x,ship.y,"#ff2d55",16);document.getElementById("g5il").textContent="♥".repeat(Math.max(0,lives))+"♡".repeat(Math.max(0,3-lives));if(lives<=0)gameOver();}}});
enemies.forEach(function(e){if(Math.abs(e.x-ship.x)<20&&Math.abs(e.y-ship.y)<18){e.hp=0;if(shield){shield=0;}else{lives--;shake=10;document.getElementById("g5il").textContent="♥".repeat(Math.max(0,lives))+"♡".repeat(Math.max(0,3-lives));if(lives<=0)gameOver();}}});
if(enemies.length===0&&!boss){wave++;document.getElementById("g5iw").textContent="W"+wave;spawnWave();}
particles=particles.filter(function(p){p.x+=p.vx;p.y+=p.vy;p.life--;return p.life>0;});
if(shake>0)shake--;}
function draw(){ctx.save();if(shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
ctx.fillStyle="#010008";ctx.fillRect(0,0,W,H);
for(var i=0;i<40;i++){ctx.fillStyle="rgba(0,245,255,"+(.05+Math.random()*.08)+")";ctx.fillRect((i*97+Date.now()/50)%W,(i*53)%H,1.5,1.5);}
enemies.forEach(function(e){ctx.fillStyle=e.type==="tank"?"#ff6b35":e.type==="zig"?"#c084fc":"#ff2d95";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=8;ctx.fillRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h);ctx.shadowBlur=0;});
if(boss){ctx.fillStyle="#ffd700";ctx.shadowColor="#ffd700";ctx.shadowBlur=16;ctx.fillRect(boss.x-boss.w/2,boss.y-boss.h/2,boss.w,boss.h);ctx.shadowBlur=0;ctx.fillStyle="#010008";ctx.fillRect(boss.x-boss.w/2+4,boss.y-8,(boss.w-8)*(boss.hp/boss.max),6);}
bullets.forEach(function(b){ctx.fillStyle="#00f5ff";ctx.shadowColor="#00f5ff";ctx.shadowBlur=6;ctx.fillRect(b.x-2,b.y-6,4,10);ctx.shadowBlur=0;});
ebullets.forEach(function(b){ctx.fillStyle="#ff2d55";ctx.fillRect(b.x-2,b.y,4,8);});
pows.forEach(function(p){var col=p.type==="rapid"?"#00f5ff":p.type==="spread"?"#c084fc":p.type==="shield"?"#7cff9a":p.type==="bomb"?"#ffd700":"#ff8c42";ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(p.x,p.y,8,0,6.28);ctx.fill();ctx.shadowBlur=0;});
particles.forEach(function(p){ctx.globalAlpha=p.life/p.max;ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,p.sz,p.sz);});ctx.globalAlpha=1;
ctx.fillStyle=shield?"#7cff9a":"#00f5ff";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=14;
ctx.beginPath();ctx.moveTo(ship.x,ship.y-12);ctx.lineTo(ship.x-14,ship.y+10);ctx.lineTo(ship.x+14,ship.y+10);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
if(rapid||spread||weapon>1){ctx.fillStyle="rgba(0,245,255,.5)";ctx.font="11px monospace";ctx.fillText((weapon>1?"W"+weapon+" ":"")+(rapid?"RAPID ":"")+(spread?"SPREAD ":"")+(bomb?"💣"+bomb:""),8,H-12);}
ctx.restore();}
function gameOver(){over=1;var o=document.getElementById("g5io");o.classList.remove("hidden");o.innerHTML="<h2>GAME OVER</h2><p>Score "+score+" · Wave "+wave+'</p><button id="g5ir">RETRY</button>';document.getElementById("g5ir").onclick=function(){o.classList.add("hidden");reset();};}
function reset(){score=0;lives=3;wave=1;combo=0;weapon=1;rapid=spread=shield=bomb=0;over=0;enemies=[];bullets=[];ebullets=[];pows=[];boss=null;document.getElementById("g5is").textContent="0";document.getElementById("g5iw").textContent="W1";document.getElementById("g5il").textContent="♥♥♥";spawnWave();}
function loop(){if(!alive)return;update();draw();raf=requestAnimationFrame(loop);}
function onKey(e){keys[e.key]=e.type==="keydown";if(e.key==="Escape"){cleanup();return;}if([" ","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.key)>=0)e.preventDefault();}
function cleanup(){alive=0;cancelAnimationFrame(raf);document.removeEventListener("keydown",onKey);document.removeEventListener("keyup",onKey);window.removeEventListener("resize",resize);if(root.parentNode)root.parentNode.removeChild(root);}
document.addEventListener("keydown",onKey);document.addEventListener("keyup",onKey);window.addEventListener("resize",resize);
cv.addEventListener("pointerdown",function(e){touching=1;mx=e.clientX;my=e.clientY;});
cv.addEventListener("pointermove",function(e){if(touching){mx=e.clientX;my=e.clientY;}});
cv.addEventListener("pointerup",function(){touching=0;});
document.getElementById("g5ix").onclick=cleanup;
resize();reset();loop();}
window.G5Invaders={start:launch};
function boot(){document.addEventListener("click",function(e){var t=document.getElementById("color-hex")||document.getElementById("hex-input")||document.querySelector("input[type=text]");
var v=t?((t.value||"").trim().toLowerCase()):"";
if(v==="invader"||v==="invaders"||v==="インベーダー"){setTimeout(launch,200);}});
var seq=[],tm;document.addEventListener("click",function(e){var el=e.target;var c=(el.style&&el.style.backgroundColor)||"";
if(/rgb\(255,\s*0,\s*0\)|#f00|#ff0000/i.test(c)||el.dataset&&el.dataset.color==="red")seq.push("R");
else if(/rgb\(0,\s*255,\s*0\)|#0f0|#00ff00/i.test(c))seq.push("G");
else if(/rgb\(0,\s*0,\s*255\)|#00f|#0000ff/i.test(c))seq.push("B");
else return;clearTimeout(tm);tm=setTimeout(function(){seq=[];},1500);
if(seq.slice(-3).join("")==="RGB"){seq=[];launch();}});
var sw=document.getElementById("swatch")||document.querySelector(".swatch");
if(sw){var taps=0,t2;sw.addEventListener("click",function(){taps++;clearTimeout(t2);t2=setTimeout(function(){taps=0;},1000);if(taps>=5){taps=0;launch();}});}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
