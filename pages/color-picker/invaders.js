/** G5 INVADERS v11 */
(function(){
"use strict";
if(window.__G5_INV_V11__)return;
window.__G5_INV_V11__=true;
var HS_KEY="g5_invaders_hs";

function launch(){
if(document.getElementById("g5-inv-root"))return;
var root=document.createElement("div");
root.id="g5-inv-root";
root.innerHTML=
'<div class="ih">'+
' <div class="ih-left">'+
'  <span class="it">G⁵ INVADERS</span>'+
'  <span class="is-label">SCORE</span><span class="is" id="is">0</span>'+
'  <span class="hs-label">HI</span><span class="hs" id="ihs">0</span>'+
'  <span class="imul" id="imul"></span>'+
' </div>'+
' <div class="ih-right">'+
'  <span class="iwep" id="iwep">PEW</span>'+
'  <span class="iw" id="iw">WAVE 1</span>'+
'  <span class="icb" id="icb">💣×0</span>'+
'  <span class="il" id="il">♥♥♥</span>'+
'  <button type="button" id="ihelp" class="ib" aria-label="help">?</button>'+
'  <button type="button" id="ipause" class="ib" aria-label="pause">❚❚</button>'+
'  <button type="button" id="ix" class="ib" aria-label="close">×</button>'+
' </div>'+
'</div>'+
'<canvas id="ic"></canvas>'+
'<div id="io" class="io hidden"></div>'+
'<div id="ihelp-panel" class="io hidden"></div>'+
'<div id="iwv" class="iwv"></div>'+
'<div class="pad pad-left"><button type="button" class="pad-btn pad-cycle" id="icycle">WPN</button></div>'+
'<div class="pad pad-right">'+
' <button type="button" class="pad-btn pad-fire" id="ifire">FIRE</button>'+
' <button type="button" class="pad-btn pad-bomb" id="ibomb">BOMB</button>'+
'</div>';

if(!document.getElementById("g5invcss")){
var st=document.createElement("style");
st.id="g5invcss";
st.textContent=
"#g5-inv-root{position:fixed;inset:0;z-index:100100;background:#02040c;overflow:hidden;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#e8f7ff;-webkit-user-select:none;user-select:none}"+ 
"#g5-inv-root::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:4;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,245,255,.025) 2px,rgba(0,245,255,.025) 4px);mix-blend-mode:overlay}"+ 
".ih{position:absolute;top:0;left:0;right:0;z-index:10;display:flex;justify-content:space-between;gap:.5rem;padding:max(.5rem,env(safe-area-inset-top)) .75rem .35rem;background:linear-gradient(180deg,rgba(2,4,12,.95),transparent);flex-wrap:wrap;pointer-events:none}"+ 
".ih-left,.ih-right{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;pointer-events:auto}"+ 
".it{font-weight:900;letter-spacing:.14em;font-size:clamp(.75rem,2.2vw,1rem);background:linear-gradient(90deg,#ff2d95,#00f5ff,#ffd700);-webkit-background-clip:text;background-clip:text;color:transparent;margin-right:.25rem}"+ 
".is-label,.hs-label{font-size:.55rem;opacity:.5}.is,.hs{font-size:.78rem;font-variant-numeric:tabular-nums;min-width:2.4rem}"+ 
".is{color:#00f5ff;text-shadow:0 0 8px rgba(0,245,255,.4)}.hs{color:#ffd700}"+ 
".imul{font-size:.7rem;color:#ffd700;min-width:2rem}"+ 
".iwep{font-size:.65rem;letter-spacing:.08em;color:#00f5ff;border:1px solid rgba(0,245,255,.35);padding:.1rem .4rem;border-radius:6px;background:rgba(0,245,255,.08)}"+ 
".iw{font-size:.65rem;color:#a855f7;letter-spacing:.08em}.icb{font-size:.7rem;color:#ffd700}.il{font-size:.8rem;color:#ff6b9a}"+ 
".ib{border:1px solid rgba(255,45,149,.45);background:rgba(255,45,149,.12);color:#ff8cc8;border-radius:8px;width:2rem;height:2rem;cursor:pointer;font-size:.85rem;display:inline-flex;align-items:center;justify-content:center}"+ 
"#ic{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:crosshair}"+ 
".io{position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(2,4,12,.92);backdrop-filter:blur(8px);text-align:center;padding:1.2rem;overflow:auto}"+ 
".io.hidden{display:none}.io h2{font-size:clamp(1.1rem,4vw,1.7rem);letter-spacing:.14em;margin:0 0 .5rem;background:linear-gradient(90deg,#ff2d95,#00f5ff);-webkit-background-clip:text;background-clip:text;color:transparent}"+ 
".io p{margin:.18rem 0;opacity:.88;font-size:.82rem;line-height:1.45}.io .big{font-size:1.3rem;color:#ffd700;margin:.5rem 0}"+ 
".io .help-grid{text-align:left;max-width:28rem;width:100%;margin:.4rem auto;font-size:.78rem;line-height:1.55}"+ 
".io .help-grid b{color:#00f5ff}.io .help-sec{color:#ffd700;margin-top:.55rem;display:block;letter-spacing:.08em;font-size:.7rem}"+ 
".io button{margin-top:.8rem;border:1px solid rgba(0,245,255,.5);background:rgba(0,245,255,.12);color:#00f5ff;border-radius:10px;padding:.45rem 1.2rem;font-size:.88rem;cursor:pointer;font-family:inherit}"+ 
".iwv{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);z-index:15;font-size:clamp(.95rem,3.8vw,1.6rem);font-weight:800;letter-spacing:.18em;color:#00f5ff;text-shadow:0 0 20px rgba(0,245,255,.5);opacity:0;pointer-events:none;transition:opacity .25s;text-align:center;max-width:90%}"+ 
".iwv.show{opacity:1}"+ 
".pad{position:absolute;bottom:max(.75rem,env(safe-area-inset-bottom));z-index:12;display:flex;gap:.55rem;pointer-events:none}"+ 
".pad-right{right:max(.75rem,env(safe-area-inset-right))}.pad-left{left:max(.75rem,env(safe-area-inset-left))}"+ 
".pad-btn{pointer-events:auto;width:4rem;height:4rem;border-radius:50%;border:2px solid rgba(0,245,255,.4);background:rgba(0,245,255,.1);color:#00f5ff;font-weight:800;font-size:.68rem;cursor:pointer;backdrop-filter:blur(6px);touch-action:manipulation;-webkit-tap-highlight-color:transparent}"+ 
".pad-btn:active,.pad-btn.active{transform:scale(.92);background:rgba(0,245,255,.28)}"+ 
".pad-bomb{border-color:rgba(255,45,149,.5);background:rgba(255,45,149,.12);color:#ff8cc8}"+ 
".pad-cycle{border-color:rgba(255,215,0,.45);background:rgba(255,215,0,.1);color:#ffd700}"+ 
"@media (min-width:900px){.pad{opacity:.45}.pad:hover{opacity:1}}";
document.head.appendChild(st);
}

document.body.appendChild(root);
document.body.style.overflow="hidden";

var cv=document.getElementById("ic"),ctx=cv.getContext("2d");
var W=0,H=0,dpr=1;
var running=true,paused=false,over=false,helpOpen=false;
var score=0,high=0,wave=1,lives=3,bomb=0;
var combo=0,bestCombo=0,cT=0,hyperT=0;
var ship={x:0,y:0,spd:0,vx:0,vy:0};
var bul=[],eb=[],en=[],pow=[],pt=[],floatTxt=[];
var boss=null;
var wepMode=0,unlocked=[1,0,0,0,0,0],wepLv=[1,1,1,1,1,1];
var rapidT=0,shieldT=0,slowT=0,invertT=0;
var fireCd=0,wavePause=0,shake=0,gravityFlip=0,hitStop=0;
var waveHit=0,nearMissCd=0,mod=null,shotsFired=0,shotsHit=0;
var keys=Object.create(null);
var pointer={active:0,x:0,y:0,fire:0};
var stars=[],animId=0,lastTs=0,hueTick=0;

var WEPS=[
  {id:"PEW",col:"#00f5ff",cd:16,dmg:1},
  {id:"SPREAD",col:"#a855f7",cd:20,dmg:1},
  {id:"LASER",col:"#ff2d95",cd:22,dmg:2},
  {id:"HOMING",col:"#7cff9a",cd:24,dmg:1},
  {id:"WAVE",col:"#ffd700",cd:18,dmg:1},
  {id:"ORBIT",col:"#ff6b9a",cd:21,dmg:1}
];
var EK={GRUNT:0,ZIG:1,TANK:2,SPLIT:3,PHANTOM:4,KAMI:5,TELE:6,HEAL:7,RAINBOW:8,SIDE:9};
var EK_COL=["#00f5ff","#a855f7","#8899aa","#ffd700","#c084fc","#ff2d95","#7cff9a","#4ade80","#ffffff","#f97316"];
var EK_PTS=[12,16,28,20,32,18,24,22,45,15];
var SPRITES=[
  [[0,0,1,0,0,0,0,0,1,0,0],[0,0,0,1,0,0,0,1,0,0,0],[0,0,1,1,1,1,1,1,1,0,0],[0,1,1,0,1,1,1,0,1,1,0],[1,1,1,1,1,1,1,1,1,1,1],[1,0,1,1,1,1,1,1,1,0,1],[1,0,1,0,0,0,0,0,1,0,1],[0,0,0,1,1,0,1,1,0,0,0]],
  [[0,0,0,1,1,0,1,1,0,0,0],[0,0,1,1,1,1,1,1,1,0,0],[0,1,1,1,1,1,1,1,1,1,0],[1,1,0,1,1,1,1,1,0,1,1],[1,1,1,1,1,1,1,1,1,1,1],[0,0,1,0,0,0,0,0,1,0,0],[0,1,0,1,1,0,1,1,0,1,0],[1,0,1,0,0,0,0,0,1,0,1]],
  [[0,0,0,0,1,1,1,0,0,0,0],[0,0,0,1,1,1,1,1,0,0,0],[0,0,1,1,1,1,1,1,1,0,0],[0,1,1,0,1,1,1,0,1,1,0],[0,1,1,1,1,1,1,1,1,1,0],[0,0,0,1,0,1,0,1,0,0,0],[0,0,1,0,0,0,0,0,1,0,0],[0,1,0,0,0,0,0,0,0,1,0]]
];
var POW_KINDS=[
  {id:"WPN",col:"#ffd700"},
  {id:"RAPID",col:"#00f5ff"},
  {id:"BOMB",col:"#ff6b9a"},
  {id:"SHIELD",col:"#7cff9a"},
  {id:"SLOW",col:"#a855f7"},
  {id:"LIFE",col:"#ff2d95"},
  {id:"LV+",col:"#ffffff"}
];
var MODS=[
  {id:"DOUBLE",label:"×2 SCORE",mul:2},
  {id:"FRENZY",label:"ENEMY FRENZY",frenzy:1},
  {id:"GLASS",label:"GLASS CANNON",glass:1},
  {id:"DENSE",label:"DENSE FORMATION",dense:1},
  {id:"GHOST",label:"PHANTOM WAVE",ghost:1}
];

try{high=parseInt(localStorage.getItem(HS_KEY)||"0",10)||0}catch(e){}
document.getElementById("ihs").textContent=high;

function scoreMul(){
  var m=1;
  if(mod&&mod.mul)m*=mod.mul;
  if(hyperT>0)m*=1.5;
  if(combo>=12)m*=1.25;
  else if(combo>=6)m*=1.1;
  return m;
}
function setMulUI(){
  var m=scoreMul(),el=document.getElementById("imul");
  if(m>1.01){el.textContent="×"+m.toFixed(2).replace(/\.?0+$/,"")}else el.textContent="";
}
function setWepUI(){
  var w=WEPS[wepMode],el=document.getElementById("iwep");
  var lv=wepLv[wepMode]||1;
  el.textContent=w.id+(lv>1?" Lv"+lv:"");
  el.style.color=w.col;el.style.borderColor=w.col+"66";el.style.background=w.col+"14";
}

function resize(){
  dpr=Math.min(window.devicePixelRatio||1,2);
  W=window.innerWidth;H=window.innerHeight;
  cv.width=Math.floor(W*dpr);cv.height=Math.floor(H*dpr);
  cv.style.width=W+"px";cv.style.height=H+"px";
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(!ship.x){ship.x=W/2;ship.y=H*0.82}
  else{ship.x=Math.max(20,Math.min(W-20,ship.x));ship.y=Math.max(H*0.55,Math.min(H-36,ship.y))}
  ship.spd=Math.max(5.8,Math.min(10.5,W*0.012));
  if(!stars.length){
    for(var i=0;i<80;i++)stars.push({x:Math.random()*W,y:Math.random()*H,z:0.25+Math.random()*1.4,s:0.5+Math.random()*1.5});
  }
}

function spk(x,y,c,n,sp){
  n=n||8;sp=sp||2.5;
  for(var i=0;i<n;i++){
    var a=Math.random()*6.2832,v=(0.35+Math.random())*sp;
    pt.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:14+(Math.random()*16)|0,max:30,c:c});
  }
}
function float(x,y,text,col){floatTxt.push({x:x,y:y,text:text,col:col||"#fff",vy:-1.05,life:52})}
function showWave(msg){
  var el=document.getElementById("iwv");
  el.textContent=msg;el.classList.add("show");
  setTimeout(function(){el.classList.remove("show")},1200);
}

function pickEnemyKind(r,waveN){
  var roll=Math.random();
  if(mod&&mod.ghost)return roll<0.55?EK.PHANTOM:EK.GRUNT;
  if(waveN<=1)return EK.GRUNT;
  if(waveN===2)return roll<0.28?EK.ZIG:EK.GRUNT;
  if(waveN===3){
    if(roll<0.15)return EK.SIDE;if(roll<0.38)return EK.ZIG;return EK.GRUNT;
  }
  if(waveN===4){
    if(roll<0.12)return EK.KAMI;if(roll<0.26)return EK.SPLIT;if(roll<0.45)return EK.ZIG;return EK.GRUNT;
  }
  if(waveN<=6){
    if(roll<0.1)return EK.TANK;if(roll<0.2)return EK.TELE;if(roll<0.3)return EK.PHANTOM;
    if(roll<0.4)return EK.KAMI;if(roll<0.5)return EK.SIDE;if(roll<0.6)return EK.SPLIT;
    return roll<0.8?EK.ZIG:EK.GRUNT;
  }
  if(roll<0.08)return EK.RAINBOW;if(roll<0.16)return EK.HEAL;if(roll<0.26)return EK.TANK;
  if(roll<0.36)return EK.PHANTOM;if(roll<0.46)return EK.TELE;if(roll<0.56)return EK.KAMI;
  if(roll<0.66)return EK.SPLIT;if(roll<0.76)return EK.SIDE;
  return roll<0.9?EK.ZIG:EK.GRUNT;
}

function makeEnemy(x,y,kind){
  var e={x:x,y:y,vx:0,vy:0,w:26,h:20,hp:1,kind:kind,fr:(Math.random()*50)|0,frame:0,si:kind%SPRITES.length,visible:1,armor:0,hue:Math.random()*360,splitGen:0,flash:0};
  if(kind===EK.TANK){e.hp=2+(wave>7?1:0);e.w=30;e.h=22;e.armor=1}
  if(kind===EK.SPLIT)e.hp=2;
  if(kind===EK.PHANTOM)e.hp=2;
  if(kind===EK.KAMI){e.hp=1;e.vy=0.4}
  if(kind===EK.TELE)e.hp=2;
  if(kind===EK.HEAL)e.hp=2;
  if(kind===EK.RAINBOW)e.hp=3;
  if(kind===EK.SIDE){e.vx=(Math.random()<0.5?1:-1)*(1.25+wave*0.06);e.vy=0.45+Math.random()*0.35}
  if(kind===EK.ZIG)e.vx=(Math.random()<0.5?1:-1)*(1.05+wave*0.05);
  if(kind===EK.GRUNT)e.vx=(Math.random()<0.5?1:-1)*(0.72+wave*0.04);
  if(mod&&mod.glass)e.hp=1;
  return e;
}

function chooseMod(){
  if(wave<4||wave%3!==0)return null;
  return MODS[(Math.random()*MODS.length)|0];
}

function spawnWave(){
  en=[];boss=null;wavePause=50;gravityFlip=0;waveHit=0;mod=chooseMod();
  document.getElementById("iw").textContent="WAVE "+wave;
  var msg="WAVE "+wave;
  if(mod)msg+="\n"+mod.label;
  showWave(msg);
  var pattern=wave%5;
  var cols,rows,gapX,startX,startY,r,c,kind,e;
  var dens=mod&&mod.dense?1.35:1;
  if(pattern===0){
    cols=Math.min(9,Math.floor((4+(wave/2)|0)*dens));
    rows=Math.min(5,Math.floor((2+(wave/4)|0)*dens));
    gapX=Math.min(46,(W-80)/Math.max(1,cols));
    startX=(W-(cols-1)*gapX)/2;startY=78+Math.min(24,wave*1.5);
    for(r=0;r<rows;r++)for(c=0;c<cols;c++){
      kind=pickEnemyKind(r,wave);
      e=makeEnemy(startX+c*gapX,startY+r*30,kind);
      if(kind!==EK.SIDE&&kind!==EK.KAMI)e.vx=(0.65+wave*0.05)*(wave%2?1:-1);
      en.push(e);
    }
  }else if(pattern===1){
    cols=Math.min(8,Math.floor((3+(wave/2)|0)*dens));startY=90;
    for(c=0;c<cols;c++){
      var off=Math.abs(c-(cols-1)/2)*28;
      e=makeEnemy(W/2+(c-(cols-1)/2)*42,startY+off*0.4,pickEnemyKind(0,wave));
      e.vx=(0.7+wave*0.05)*(c%2?1:-1);en.push(e);
    }
    if(wave>=3)for(c=0;c<3;c++)en.push(makeEnemy(W*0.2+c*W*0.3,startY+70,pickEnemyKind(1,wave)));
  }else if(pattern===2){
    rows=Math.min(6,Math.floor((2+(wave/3)|0)*dens));
    for(r=0;r<rows;r++){
      e=makeEnemy(40,90+r*34,pickEnemyKind(r,wave));e.vx=0.85+wave*0.04;en.push(e);
      e=makeEnemy(W-40,90+r*34,pickEnemyKind(r,wave));e.vx=-(0.85+wave*0.04);en.push(e);
    }
    if(wave>=4)for(c=0;c<4;c++)en.push(makeEnemy(W*0.25+c*W*0.15,70,EK.ZIG));
  }else if(pattern===3){
    cols=Math.min(7,Math.floor((3+(wave/3)|0)*dens));
    gapX=(W-100)/Math.max(1,cols-1);
    for(c=0;c<cols;c++){
      e=makeEnemy(50+c*gapX,85+((c%2)*28),pickEnemyKind(0,wave));
      e.vx=0.75*(c%2?1:-1);en.push(e);
    }
    if(wave>=3){
      var kn=Math.min(4,1+(wave/4)|0);
      for(var k=0;k<kn;k++){var km=makeEnemy(60+Math.random()*(W-120),-20-k*28,EK.KAMI);km.vy=1.25+wave*0.04;en.push(km)}
      showWave("⚠ DIVE");
    }
  }else{
    var n=Math.min(14,Math.floor((5+wave)*dens));
    for(var i=0;i<n;i++){
      var ang=(i/n)*Math.PI*2;
      e=makeEnemy(W/2+Math.cos(ang)*(70+wave*4),110+Math.sin(ang)*40,pickEnemyKind(i%3,wave));
      e.vx=Math.cos(ang+1)*0.95;en.push(e);
    }
  }
  if(wave>=3&&pattern!==2){
    var sideN=Math.min(3,1+(wave/4)|0);
    for(var s=0;s<sideN;s++)en.push(makeEnemy(s%2===0?-18:W+18,100+s*45+Math.random()*20,EK.SIDE));
  }
  if(wave>=6&&wave%5===0){
    for(var u=0;u<2;u++){var up=makeEnemy(W*0.3+u*W*0.4,H+20,EK.KAMI);up.vy=-(1.45+wave*0.03);up.vx=(Math.random()-0.5);en.push(up)}
    showWave("⚠ UNDER ATTACK");
  }
  if(wave%5===0&&wave>=5){
    boss={x:W/2,y:88,vx:1.25+wave*0.05,hp:26+wave*6,max:26+wave*6,fr:0,phase:0,hue:0};
    showWave("⚠ BOSS");
  }
  if(wave%7===0&&wave>=7){gravityFlip=1;showWave("↕ GRAVITY FLIP")}
  setMulUI();
}

function nearestEnemy(x,y){
  var best=null,bd=1e9;
  for(var i=0;i<en.length;i++){
    var e=en[i];if(e.kind===EK.PHANTOM&&!e.visible)continue;
    var d=(e.x-x)*(e.x-x)+(e.y-y)*(e.y-y);if(d<bd){bd=d;best=e}
  }
  if(boss){var d2=(boss.x-x)*(boss.x-x)+(boss.y-y)*(boss.y-y);if(d2<bd)best=boss}
  return best;
}

function fire(){
  if(fireCd>0)return;
  var w=WEPS[wepMode],lv=wepLv[wepMode]||1;
  var cd=w.cd;
  if(rapidT>0)cd=Math.max(5,(cd*0.48)|0);
  if(hyperT>0)cd=Math.max(5,(cd*0.85)|0);
  fireCd=cd;
  var dmg=w.dmg+(lv>=3?1:0);
  var col=w.col;
  shotsFired++;
  if(wepMode===0){
    bul.push({x:ship.x,y:ship.y-16,vx:0,vy:-11.5,dmg:dmg,c:col,kind:"pew",life:85,pierce:0});
    if(lv>=2)bul.push({x:ship.x-7,y:ship.y-10,vx:-0.3,vy:-11,dmg:1,c:col,kind:"pew",life:80,pierce:0});
  }else if(wepMode===1){
    var spr=lv>=2?2:1;
    for(var i=-spr;i<=spr;i++)bul.push({x:ship.x,y:ship.y-14,vx:i*2.0,vy:-10.5+Math.abs(i)*0.25,dmg:dmg,c:col,kind:"spread",life:75,pierce:0});
  }else if(wepMode===2){
    bul.push({x:ship.x,y:ship.y-18,vx:0,vy:-18,dmg:dmg,c:col,kind:"laser",life:60,pierce:1+lv,w:3+lv});
  }else if(wepMode===3){
    var tgt=nearestEnemy(ship.x,ship.y-40);
    bul.push({x:ship.x,y:ship.y-16,vx:0,vy:-9,dmg:dmg,c:col,kind:"homing",life:90,pierce:0,target:tgt});
    if(lv>=2)bul.push({x:ship.x+8,y:ship.y-12,vx:0.5,vy:-8.5,dmg:1,c:col,kind:"homing",life:85,pierce:0,target:tgt});
  }else if(wepMode===4){
    for(var j=-1;j<=1;j+=2)bul.push({x:ship.x,y:ship.y-14,vx:j*0.4,vy:-10.5,dmg:dmg,c:col,kind:"wave",life:80,pierce:0,phase:j>0?0:Math.PI,amp:2.4+lv*0.4});
  }else if(wepMode===5){
    var orbs=1+lv;
    for(var k=0;k<orbs;k++){
      var ang=(k/orbs)*Math.PI*2+hueTick*0.04;
      bul.push({x:ship.x+Math.cos(ang)*14,y:ship.y+Math.sin(ang)*8-6,vx:Math.cos(ang)*2.1,vy:-10+Math.sin(ang)*1.5,dmg:dmg,c:col,kind:"orbit",life:70,pierce:0});
    }
  }
  spk(ship.x,ship.y-12,col,2,0.9);
}

function cycleWep(dir){
  var n=WEPS.length;
  for(var t=0;t<n;t++){
    wepMode=(wepMode+(dir||1)+n)%n;
    if(unlocked[wepMode])break;
  }
  setWepUI();float(ship.x,ship.y-28,WEPS[wepMode].id,WEPS[wepMode].col);
}

function unlockNextWep(){
  for(var i=0;i<unlocked.length;i++){
    if(!unlocked[i]){
      unlocked[i]=1;wepMode=i;setWepUI();
      float(ship.x,ship.y-36,"UNLOCK "+WEPS[i].id,WEPS[i].col);return;
    }
  }
  rapidT=Math.max(rapidT,240);float(ship.x,ship.y-36,"RAPID BURST","#00f5ff");
}

function levelUpWep(){
  if(wepLv[wepMode]<3){
    wepLv[wepMode]++;setWepUI();
    float(ship.x,ship.y-36,WEPS[wepMode].id+" Lv"+wepLv[wepMode],WEPS[wepMode].col);
  }else{
    rapidT=Math.max(rapidT,180);float(ship.x,ship.y-36,"MAX — RAPID","#00f5ff");
  }
}

function doBomb(){
  if(bomb<=0||over)return;
  bomb--;document.getElementById("icb").textContent="💣×"+bomb;
  for(var i=en.length-1;i>=0;i--){
    score+=Math.floor(12*scoreMul());spk(en[i].x,en[i].y,"#ff2d95",10,3);en.splice(i,1);
  }
  if(boss){boss.hp-=14;spk(boss.x,boss.y,"#ff2d95",18,4)}
  eb=[];shake=16;float(W/2,H/2,"BOMB!","#ff2d95");
}

function damageEnemy(e,dmg,bulletCol){
  if(e.kind===EK.RAINBOW&&bulletCol){
    var bh=180;
    if(bulletCol==="#a855f7")bh=280;else if(bulletCol==="#ff2d95")bh=330;
    else if(bulletCol==="#7cff9a")bh=140;else if(bulletCol==="#ffd700")bh=50;
    else if(bulletCol==="#ff6b9a")bh=340;
    var diff=Math.abs(((e.hue-bh+540)%360)-180);
    if(diff>75){float(e.x,e.y-12,"RESIST","#aaa");return false}
  }
  if(e.kind===EK.PHANTOM&&!e.visible)return false;
  if(e.armor&&dmg<2){e.armor=0;spk(e.x,e.y,"#8899aa",5,1.8);float(e.x,e.y,"ARMOR","#8899aa");return true}
  e.hp-=dmg;return true;
}

function killEnemy(e,idx){
  var mul=scoreMul();
  var pts=((EK_PTS[e.kind]||10)*(1+Math.min(10,combo)*0.12)*mul+0.5)|0;
  score+=pts;combo++;if(combo>bestCombo)bestCombo=combo;cT=100;
  if(combo===8&&hyperT<=0){hyperT=240;float(ship.x,ship.y-40,"HYPER!","#ffd700");shake=6}
  if(combo>=8)hyperT=Math.max(hyperT,90);
  float(e.x,e.y,"+"+pts,combo>5?"#ffd700":EK_COL[e.kind]);
  spk(e.x,e.y,EK_COL[e.kind],7,2.2);hitStop=2;
  if(e.kind===EK.SPLIT&&e.splitGen<1){
    for(var s=-1;s<=1;s+=2){
      var child=makeEnemy(e.x+s*12,e.y+5,EK.GRUNT);
      child.splitGen=1;child.vx=s*1.6;child.hp=1;en.push(child);
    }
  }
  var dropChance=0.11+Math.min(0.14,wave*0.012);
  if(Math.random()<dropChance){
    var t;var r=Math.random();
    if(r<0.28)t=0;else if(r<0.4)t=6;else t=(1+Math.random()*5)|0;
    pow.push({x:e.x,y:e.y,t:t,vy:1.15+Math.random()*0.4});
  }
  en.splice(idx,1);setMulUI();
}

function takeHit(){
  if(shieldT>0){shieldT=0;spk(ship.x,ship.y,"#7cff9a",10,2.5);float(ship.x,ship.y-18,"BLOCK","#7cff9a");return false}
  lives--;document.getElementById("il").textContent="♥".repeat(Math.max(0,lives));
  spk(ship.x,ship.y,"#ff2d95",10,2.8);shake=10;combo=0;hyperT=0;waveHit=1;setMulUI();
  if(lives<=0)gameOver();
  return true;
}

function gameOver(){
  over=true;running=false;
  if(score>high){high=score;try{localStorage.setItem(HS_KEY,String(high))}catch(e){}document.getElementById("ihs").textContent=high}
  var acc=shotsFired?Math.round(100*shotsHit/shotsFired):0;
  var io=document.getElementById("io");
  io.classList.remove("hidden");
  io.innerHTML="<h2>GAME OVER</h2><p class=\"big\">"+score+"</p><p>WAVE "+wave+" · BEST COMBO ×"+bestCombo+" · ACC "+acc+"%</p><p>HI "+high+"</p><button type=\"button\" id=\"iretry\">RETRY</button><button type=\"button\" id=\"iquit\" style=\"margin-left:.5rem;border-color:rgba(255,45,149,.5);color:#ff8cc8;background:rgba(255,45,149,.1)\">EXIT</button>";
  document.getElementById("iretry").onclick=function(){io.classList.add("hidden");reset();running=true;over=false;lastTs=0;loop(performance.now())};
  document.getElementById("iquit").onclick=cleanup;
}

function showHelp(){
  helpOpen=true;paused=true;
  var hp=document.getElementById("ihelp-panel");
  hp.classList.remove("hidden");
  hp.innerHTML=
    "<h2>CONTROLS</h2>"+
    "<div class=\"help-grid\">"+
    "<span class=\"help-sec\">MOVE</span>Arrows/WASD · drag/touch (lower half)<br>"+
    "<span class=\"help-sec\">FIRE</span>Space/Z · FIRE btn · hold tap<br>"+
    "<span class=\"help-sec\">BOMB</span>B/X · BOMB btn<br>"+
    "<span class=\"help-sec\">WPN</span>Q/E/WPN cycle · 1-6 select · drops unlock/Lv<br>"+
    "<span class=\"help-sec\">SYS</span>P pause · H/? help · Esc quit<br>"+
    "<span class=\"help-sec\">SCORE</span>combo · perfect clear · near-miss · HYPER · mods<br>"+
    "</div>"+
    "<button type=\"button\" id=\"ihelp-close\">CLOSE</button>";
  document.getElementById("ihelp-close").onclick=function(){hp.classList.add("hidden");helpOpen=false;paused=false;lastTs=0;loop(performance.now())};
}

function reset(){
  score=0;wave=1;lives=3;bomb=0;combo=0;bestCombo=0;cT=0;hyperT=0;
  wepMode=0;unlocked=[1,0,0,0,0,0];wepLv=[1,1,1,1,1,1];
  rapidT=0;shieldT=0;slowT=0;invertT=0;fireCd=0;gravityFlip=0;waveHit=0;
  shotsFired=0;shotsHit=0;mod=null;nearMissCd=0;
  bul=[];eb=[];en=[];pow=[];pt=[];floatTxt=[];boss=null;over=false;paused=false;helpOpen=false;
  ship.x=W/2;ship.y=H*0.82;ship.vx=0;ship.vy=0;
  document.getElementById("is").textContent="0";
  document.getElementById("il").textContent="♥♥♥";
  document.getElementById("icb").textContent="💣×0";
  document.getElementById("iw").textContent="WAVE 1";
  document.getElementById("io").classList.add("hidden");
  document.getElementById("ihelp-panel").classList.add("hidden");
  setWepUI();setMulUI();spawnWave();
}

function drawInvader(e){
  if(e.kind===EK.PHANTOM&&!e.visible)ctx.globalAlpha=0.12;
  var grid=SPRITES[e.si%SPRITES.length];
  var px=e.kind===EK.TANK?2.6:2.3;
  var gw=grid[0].length*px,gh=grid.length*px;
  var ox=e.x-gw/2,oy=e.y-gh/2;
  var blink=((e.frame/12)|0)%2;
  var col=e.kind===EK.RAINBOW?("hsl("+(e.hue|0)+",95%,60%)"):EK_COL[e.kind];
  if(e.flash>0){col="#fff";e.flash--}
  ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=4;
  for(var r=0;r<grid.length;r++)for(var c=0;c<grid[r].length;c++){
    if(!grid[r][c])continue;
    if(blink&&r>=6&&(c<3||c>7))continue;
    ctx.fillRect(ox+c*px,oy+r*px,px+0.2,px+0.2);
  }
  ctx.shadowBlur=0;ctx.globalAlpha=1;
  if(e.kind===EK.TANK&&e.armor){
    ctx.strokeStyle="rgba(200,220,255,.45)";ctx.lineWidth=1.4;
    ctx.strokeRect(e.x-e.w/2-2,e.y-e.h/2-2,e.w+4,e.h+4);
  }
}

function drawBoss(){
  if(!boss)return;
  var b=boss;
  ctx.save();ctx.translate(b.x,b.y);
  ctx.shadowColor="#ff2d95";ctx.shadowBlur=14;
  ctx.fillStyle="#1a0520";
  ctx.beginPath();ctx.moveTo(-38,8);ctx.lineTo(-26,-16);ctx.lineTo(0,-26);ctx.lineTo(26,-16);ctx.lineTo(38,8);ctx.lineTo(22,20);ctx.lineTo(-22,20);ctx.closePath();ctx.fill();
  ctx.fillStyle="hsl("+(b.hue|0)+",90%,55%)";
  ctx.beginPath();ctx.arc(-12,-3,5,0,6.28);ctx.arc(12,-3,5,0,6.28);ctx.fill();
  ctx.fillStyle="#00f5ff";ctx.fillRect(-8,5,16,4);
  ctx.shadowBlur=0;ctx.restore();
  var bw=90;
  ctx.fillStyle="rgba(0,0,0,.55)";ctx.fillRect(b.x-bw/2,b.y-38,bw,5);
  ctx.fillStyle="#ff2d95";ctx.fillRect(b.x-bw/2,b.y-38,bw*Math.max(0,b.hp/b.max),5);
}

function tick(){
  if(wavePause>0){wavePause--;return}
  if(hitStop>0){hitStop--;return}
  hueTick++;
  var timeScale=slowT>0?0.5:1;
  var inv=invertT>0?-1:1;
  var ax=0,ay=0;
  if(keys["ArrowLeft"]||keys["a"]||keys["A"])ax-=1;
  if(keys["ArrowRight"]||keys["d"]||keys["D"])ax+=1;
  if(keys["ArrowUp"]||keys["w"]||keys["W"])ay-=1;
  if(keys["ArrowDown"]||keys["s"]||keys["S"])ay+=1;
  if(pointer.active){
    var tx=pointer.x,ty=Math.max(H*0.55,Math.min(H-36,pointer.y-6));
    ship.x+=(tx-ship.x)*0.4;ship.y+=(ty-ship.y)*0.36;
    ship.vx=0;ship.vy=0;
  }else{
    ship.vx+=(ax*ship.spd*0.35*inv-ship.vx)*0.28;
    ship.vy+=(ay*ship.spd*0.28*inv-ship.vy)*0.28;
    ship.x+=ship.vx;ship.y+=ship.vy;
  }
  ship.x=Math.max(18,Math.min(W-18,ship.x));
  ship.y=Math.max(H*0.55,Math.min(H-32,ship.y));

  var wantFire=keys[" "]||keys["z"]||keys["Z"]||pointer.fire||(pointer.active&&!keys["b"]);
  if(wantFire)fire();

  if((keys["b"]||keys["B"]||keys["x"]||keys["X"])&&bomb>0){
    keys["b"]=keys["B"]=keys["x"]=keys["X"]=false;doBomb();
  }
  if(keys["q"]||keys["Q"]){keys["q"]=keys["Q"]=false;cycleWep(-1)}
  if(keys["e"]||keys["E"]){keys["e"]=keys["E"]=false;cycleWep(1)}
  for(var n=1;n<=6;n++){
    if(keys[String(n)]){
      keys[String(n)]=false;
      if(unlocked[n-1]){wepMode=n-1;setWepUI();float(ship.x,ship.y-26,WEPS[wepMode].id,WEPS[wepMode].col)}
      else float(ship.x,ship.y-26,"LOCKED","#888");
    }
  }

  if(fireCd>0)fireCd--;
  if(rapidT>0)rapidT--;
  if(shieldT>0)shieldT--;
  if(slowT>0)slowT--;
  if(invertT>0)invertT--;
  if(hyperT>0)hyperT--;
  if(nearMissCd>0)nearMissCd--;
  setMulUI();

  var i,j,b,e,p;

  for(i=bul.length-1;i>=0;i--){
    b=bul[i];
    if(b.kind==="homing"&&b.target){
      if(b.target.hp!==undefined&&b.target.hp<=0)b.target=nearestEnemy(b.x,b.y);
      else{
        var ang=Math.atan2(b.target.y-b.y,b.target.x-b.x);
        b.vx+=Math.cos(ang)*0.48;b.vy+=Math.sin(ang)*0.48;
        var sp=Math.sqrt(b.vx*b.vx+b.vy*b.vy)||1;
        b.vx=(b.vx/sp)*9.5;b.vy=(b.vy/sp)*9.5;
      }
    }
    if(b.kind==="wave"){b.phase+=0.32;b.x+=Math.sin(b.phase)*b.amp}
    b.x+=b.vx*timeScale;b.y+=b.vy*timeScale;b.life--;
    if(b.life<=0||b.y<-30||b.y>H+30||b.x<-30||b.x>W+30){bul.splice(i,1);continue}
    var hit=false;
    for(j=en.length-1;j>=0;j--){
      e=en[j];
      var hw=(b.w||3)/2+e.w/2,hh=(b.w||7)/2+e.h/2;
      if(Math.abs(b.x-e.x)<hw&&Math.abs(b.y-e.y)<hh){
        var ok=damageEnemy(e,b.dmg,b.c);
        if(ok){
          shotsHit++;spk(e.x,e.y,b.c,3,1.5);e.flash=3;
          if(e.hp<=0)killEnemy(e,j);
          if(!b.pierce){hit=true;break}
          b.pierce--;if(b.pierce<0){hit=true;break}
        }
      }
    }
    if(!hit&&boss&&Math.abs(b.x-boss.x)<36&&Math.abs(b.y-boss.y)<26){
      boss.hp-=b.dmg;shotsHit++;spk(b.x,b.y,b.c,4,1.8);
      if(!b.pierce)hit=true;else{b.pierce--;if(b.pierce<0)hit=true}
      if(boss.hp<=0){
        score+=Math.floor((380+wave*25)*scoreMul());
        spk(boss.x,boss.y,"#ff2d95",32,6);float(boss.x,boss.y,"BOSS DOWN!","#ff2d95");
        bomb=Math.min(3,bomb+1);document.getElementById("icb").textContent="💣×"+bomb;
        boss=null;wave++;spawnWave();
      }
    }
    if(hit)bul.splice(i,1);
  }

  for(i=en.length-1;i>=0;i--){
    e=en[i];e.frame++;
    var spdMul=timeScale*(mod&&mod.frenzy?1.35:1);
    if(e.kind===EK.GRUNT){
      e.x+=e.vx*spdMul;
      if(e.x<18||e.x>W-18){e.vx*=-1;e.y+=gravityFlip?-12:10}
    }else if(e.kind===EK.ZIG){
      e.x+=e.vx*spdMul;e.y+=Math.sin(e.frame*0.1)*1.4*spdMul;
      if(e.x<16||e.x>W-16)e.vx*=-1;
    }else if(e.kind===EK.TANK){
      e.x+=e.vx*0.65*spdMul;
      if(e.x<22||e.x>W-22){e.vx*=-1;e.y+=8}
    }else if(e.kind===EK.KAMI){
      e.vx+=Math.sign(ship.x-e.x)*0.065;e.vx=Math.max(-2.5,Math.min(2.5,e.vx));
      e.x+=e.vx*spdMul;e.y+=(e.vy||1.3)*spdMul;
    }else if(e.kind===EK.TELE){
      e.x+=e.vx*spdMul;
      if(e.fr%100===0){e.x=50+Math.random()*(W-100);e.y=70+Math.random()*(H*0.28);spk(e.x,e.y,"#7cff9a",8,2)}
    }else if(e.kind===EK.PHANTOM){
      e.x+=e.vx*spdMul;
      if(e.x<18||e.x>W-18){e.vx*=-1;e.y+=8}
      e.visible=Math.sin(e.frame*0.07)>-0.15?1:0;
    }else if(e.kind===EK.HEAL){
      e.x+=e.vx*0.75*spdMul;
      if(e.x<20||e.x>W-20)e.vx*=-1;
      if(e.fr%55===0){
        for(var h=0;h<en.length;h++){
          if(h===i)continue;var ot=en[h];
          if(Math.abs(ot.x-e.x)<60&&Math.abs(ot.y-e.y)<45&&ot.hp<3){ot.hp++;float(ot.x,ot.y-8,"+HP","#4ade80")}
        }
      }
    }else if(e.kind===EK.RAINBOW){
      e.hue=(e.hue+2)%360;e.x+=e.vx*spdMul;e.y+=Math.sin(e.frame*0.05)*1;
      if(e.x<20||e.x>W-20)e.vx*=-1;
    }else if(e.kind===EK.SIDE){
      e.x+=e.vx*spdMul;e.y+=e.vy*spdMul;
      if(e.y>H*0.65)e.vy=-Math.abs(e.vy);if(e.y<55)e.vy=Math.abs(e.vy);
    }else if(e.kind===EK.SPLIT){
      e.x+=e.vx*spdMul;
      if(e.x<18||e.x>W-18){e.vx*=-1;e.y+=9}
    }
    e.fr++;
    var shootChance=(0.08+wave*0.012)*(mod&&mod.frenzy?1.5:1);
    if(e.fr>55+Math.random()*48){
      if(e.fr>70&&e.flash<=0&&Math.random()<shootChance*1.2)e.flash=8;
      if(e.fr>85){
        e.fr=0;
        if((e.kind!==EK.PHANTOM||e.visible)&&Math.random()<shootChance){
          var bvx=0,bvy=1.7+wave*0.04;
          if(e.kind===EK.KAMI){var a2=Math.atan2(ship.y-e.y,ship.x-e.x);bvx=Math.cos(a2)*2.2;bvy=Math.sin(a2)*2.2}
          else bvx=(Math.random()-0.5)*1.0;
          eb.push({x:e.x,y:e.y+8,vx:bvx,vy:bvy});
        }
      }
    }
    if(e.y>H+40||e.y<-70||e.x<-90||e.x>W+90){
      if(e.kind===EK.KAMI||e.kind===EK.SIDE){en.splice(i,1);continue}
    }
    if(Math.abs(e.x-ship.x)<16&&Math.abs(e.y-ship.y)<14){
      takeHit();en.splice(i,1);continue;
    }
    if(!gravityFlip&&e.y>H-18&&e.kind!==EK.SIDE&&e.kind!==EK.KAMI){
      takeHit();en.splice(i,1);
    }
  }

  if(boss){
    boss.x+=boss.vx*timeScale;boss.hue=(boss.hue+1.2)%360;
    if(boss.x<48||boss.x>W-48)boss.vx*=-1;
    boss.fr++;
    if(boss.fr>30){
      boss.fr=0;boss.phase=(boss.phase+1)%3;
      if(boss.phase===0){for(var k=-1;k<=1;k++)eb.push({x:boss.x+k*16,y:boss.y+20,vy:2.15,vx:k*0.45})}
      else if(boss.phase===1){var angB=Math.atan2(ship.y-boss.y,ship.x-boss.x);eb.push({x:boss.x,y:boss.y+12,vx:Math.cos(angB)*2.9,vy:Math.sin(angB)*2.9})}
      else{for(k=-1;k<=1;k+=2)eb.push({x:boss.x+k*22,y:boss.y+8,vy:1.55,vx:k*1.25})}
    }
  }

  for(i=eb.length-1;i>=0;i--){
    b=eb[i];b.x+=(b.vx||0)*timeScale;b.y+=b.vy*timeScale;
    if(b.y>H+16||b.y<-16||b.x<-24||b.x>W+24){eb.splice(i,1);continue}
    var dx=b.x-ship.x,dy=b.y-ship.y,dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<13){takeHit();eb.splice(i,1)}
    else if(dist<28&&nearMissCd<=0&&b.y>ship.y-40){
      nearMissCd=18;
      var nm=Math.floor(8*scoreMul());
      score+=nm;float(ship.x,ship.y-22,"NEAR +"+nm,"#7cff9a");
    }
  }

  for(i=pow.length-1;i>=0;i--){
    p=pow[i];p.y+=p.vy;
    if(p.y>H+10){pow.splice(i,1);continue}
    if(Math.abs(p.x-ship.x)<20&&Math.abs(p.y-ship.y)<18){
      var pk=POW_KINDS[p.t];
      if(p.t===0)unlockNextWep();
      else if(p.t===1){rapidT=380;float(p.x,p.y-12,"RAPID",pk.col)}
      else if(p.t===2){bomb=Math.min(3,bomb+1);document.getElementById("icb").textContent="💣×"+bomb;float(p.x,p.y-12,"BOMB +1",pk.col)}
      else if(p.t===3){shieldT=380;float(p.x,p.y-12,"SHIELD",pk.col)}
      else if(p.t===4){slowT=320;float(p.x,p.y-12,"SLOW",pk.col)}
      else if(p.t===5){if(lives<5){lives++;document.getElementById("il").textContent="♥".repeat(lives)}float(p.x,p.y-12,"LIFE +1",pk.col)}
      else if(p.t===6)levelUpWep();
      spk(p.x,p.y,pk.col,10,2.4);pow.splice(i,1);
    }
  }

  for(i=pt.length-1;i>=0;i--){
    p=pt[i];p.x+=p.vx;p.y+=p.vy;p.vx*=0.96;p.vy*=0.96;p.life--;
    if(p.life<=0)pt.splice(i,1);
  }
  for(i=floatTxt.length-1;i>=0;i--){
    var f=floatTxt[i];f.y+=f.vy;f.life--;
    if(f.life<=0)floatTxt.splice(i,1);
  }
  if(cT>0)cT--;else{combo=0;setMulUI()}

  if(en.length===0&&!boss&&wavePause<=0){
    var bonus=Math.floor((45+wave*14)*scoreMul());
    if(!waveHit){bonus=Math.floor(bonus*1.8);float(W/2,H*0.28,"PERFECT +"+bonus,"#ffd700");shake=5}
    else float(W/2,H*0.32,"CLEAR +"+bonus,"#00f5ff");
    score+=bonus;
    if(wave%4===0&&lives<5){lives++;document.getElementById("il").textContent="♥".repeat(lives);float(W/2,H*0.4,"LIFE +1","#ff6b9a")}
    wave++;spawnWave();
  }
  document.getElementById("is").textContent=score;
}

function update(dt){
  if(paused||over||helpOpen)return;
  var steps=Math.min(3,Math.max(1,Math.round(dt/16.67)));
  for(var s=0;s<steps;s++)tick();
}

function draw(){
  var ox=shake?(Math.random()-0.5)*shake:0,oy=shake?(Math.random()-0.5)*shake:0;
  if(shake>0)shake*=0.86;if(shake<0.3)shake=0;
  ctx.save();ctx.translate(ox,oy);
  ctx.fillStyle=hyperT>0?"#05020a":"#02040c";ctx.fillRect(-10,-10,W+20,H+20);
  for(var si=0;si<stars.length;si++){
    var st=stars[si];st.y+=st.z*(gravityFlip?-0.35:0.35)*(hyperT>0?1.4:1);
    if(st.y>H)st.y=0;if(st.y<0)st.y=H;
    ctx.globalAlpha=0.2+st.z*0.35;ctx.fillStyle=hyperT>0?"#ffe08a":"#c8e8ff";ctx.fillRect(st.x,st.y,st.s,st.s);
  }
  ctx.globalAlpha=1;
  var i,b,e,p,f;
  for(i=0;i<en.length;i++)drawInvader(en[i]);
  drawBoss();
  for(i=0;i<bul.length;i++){
    b=bul[i];ctx.fillStyle=b.c;ctx.shadowColor=b.c;ctx.shadowBlur=b.kind==="laser"?8:4;
    if(b.kind==="laser"){ctx.beginPath();ctx.arc(b.x,b.y,b.w||4,0,6.28);ctx.fill()}
    else if(b.kind==="homing"){ctx.beginPath();ctx.moveTo(b.x,b.y-5);ctx.lineTo(b.x-3.5,b.y+4);ctx.lineTo(b.x+3.5,b.y+4);ctx.fill()}
    else ctx.fillRect(b.x-2,b.y-6,4,10);
    ctx.shadowBlur=0;
  }
  for(i=0;i<eb.length;i++){
    b=eb[i];ctx.fillStyle="#ff6b9a";ctx.shadowColor="#ff2d95";ctx.shadowBlur=3;
    ctx.beginPath();ctx.arc(b.x,b.y,2.8,0,6.28);ctx.fill();ctx.shadowBlur=0;
  }
  for(i=0;i<pow.length;i++){
    p=pow[i];var pk=POW_KINDS[p.t];var pulse=6.5+Math.sin(performance.now()/120+i)*1.2;
    ctx.fillStyle=pk.col;ctx.shadowColor=pk.col;ctx.shadowBlur=9;
    ctx.beginPath();ctx.arc(p.x,p.y,pulse,0,6.28);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle="#02040c";ctx.font="bold 8px monospace";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText(pk.id[0]==="L"&&pk.id==="LV+"?"L":pk.id[0],p.x,p.y);
  }
  for(i=0;i<pt.length;i++){p=pt[i];ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,2.4,2.4)}
  ctx.globalAlpha=1;
  for(i=0;i<floatTxt.length;i++){
    f=floatTxt[i];ctx.globalAlpha=Math.min(1,f.life/14);ctx.fillStyle=f.col;
    ctx.font="bold 11px monospace";ctx.textAlign="center";ctx.fillText(f.text,f.x,f.y);
  }
  ctx.globalAlpha=1;
  if(shieldT>0){
    ctx.strokeStyle="rgba(124,255,154,"+(0.3+Math.sin(performance.now()/80)*0.15)+")";
    ctx.lineWidth=2;ctx.beginPath();ctx.arc(ship.x,ship.y,20,0,6.28);ctx.stroke();
  }
  if(hyperT>0){
    ctx.strokeStyle="rgba(255,215,0,"+(0.25+Math.sin(performance.now()/60)*0.2)+")";
    ctx.lineWidth=2;ctx.beginPath();ctx.arc(ship.x,ship.y,24,0,6.28);ctx.stroke();
  }
  ctx.shadowColor=shieldT>0?"#7cff9a":(hyperT>0?"#ffd700":WEPS[wepMode].col);ctx.shadowBlur=12;
  var g=ctx.createLinearGradient(ship.x,ship.y-14,ship.x,ship.y+11);
  g.addColorStop(0,"#fff");g.addColorStop(0.4,shieldT>0?"#7cff9a":(hyperT>0?"#ffd700":WEPS[wepMode].col));g.addColorStop(1,"rgba(0,100,160,.2)");
  ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(ship.x,ship.y-14);ctx.lineTo(ship.x-13,ship.y+10);ctx.lineTo(ship.x-4,ship.y+5);ctx.lineTo(ship.x+4,ship.y+5);ctx.lineTo(ship.x+13,ship.y+10);ctx.closePath();ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle="rgba(0,245,255,.55)";ctx.fillRect(ship.x-2,ship.y+8,4,2+Math.random()*4);
  if(combo>1){
    ctx.fillStyle=combo>7?"#ffd700":"#00f5ff";ctx.font="bold 11px monospace";ctx.textAlign="left";
    ctx.fillText("COMBO ×"+combo+(hyperT>0?" HYPER":""),12,H-14);
  }
  if(slowT>0||rapidT>0||gravityFlip||mod){
    ctx.textAlign="right";ctx.font="10px monospace";ctx.fillStyle="rgba(255,255,255,.55)";
    var buffs=[];
    if(mod)buffs.push(mod.id);if(slowT>0)buffs.push("SLOW");if(rapidT>0)buffs.push("RAPID");if(gravityFlip)buffs.push("FLIP-G");
    ctx.fillText(buffs.join(" · "),W-12,H-14);
  }
  if(paused&&!helpOpen){
    ctx.fillStyle="rgba(2,4,12,.55)";ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#00f5ff";ctx.font="bold 24px monospace";ctx.textAlign="center";ctx.fillText("PAUSED",W/2,H/2);
    ctx.font="11px monospace";ctx.fillStyle="rgba(255,255,255,.55)";
    ctx.fillText("H / ? = controls · unlock weapons from drops",W/2,H/2+24);
  }
  ctx.restore();
}

function loop(ts){
  if(!running&&!over)return;
  if(!lastTs)lastTs=ts;
  var dt=ts-lastTs;lastTs=ts;if(dt>50)dt=50;
  update(dt);draw();
  if(running||paused||helpOpen)animId=requestAnimationFrame(loop);
}

function cleanup(){
  running=false;cancelAnimationFrame(animId);
  window.removeEventListener("resize",resize);
  document.removeEventListener("keydown",onKeyDown);
  document.removeEventListener("keyup",onKeyUp);
  document.body.style.overflow="";
  var el=document.getElementById("g5-inv-root");if(el)el.remove();
}
function onKeyDown(e){
  keys[e.key]=true;
  if(e.key==="Escape"){e.preventDefault();if(helpOpen){document.getElementById("ihelp-panel").classList.add("hidden");helpOpen=false;paused=false;lastTs=0;loop(performance.now());return}cleanup();return}
  if(e.key==="p"||e.key==="P"){if(helpOpen)return;paused=!paused;if(!paused){lastTs=0;loop(performance.now())}e.preventDefault()}
  if(e.key==="h"||e.key==="H"||e.key==="?"){e.preventDefault();if(helpOpen){document.getElementById("ihelp-panel").classList.add("hidden");helpOpen=false;paused=false;lastTs=0;loop(performance.now())}else showHelp()}
  if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," "].indexOf(e.key)>=0)e.preventDefault();
}
function onKeyUp(e){keys[e.key]=false}

window.addEventListener("resize",resize);
document.addEventListener("keydown",onKeyDown);
document.addEventListener("keyup",onKeyUp);
cv.addEventListener("pointerdown",function(e){pointer.active=1;pointer.x=e.clientX;pointer.y=e.clientY;pointer.fire=1;try{cv.setPointerCapture(e.pointerId)}catch(err){}});
cv.addEventListener("pointermove",function(e){if(pointer.active){pointer.x=e.clientX;pointer.y=e.clientY}});
cv.addEventListener("pointerup",function(){pointer.active=0;pointer.fire=0});
cv.addEventListener("pointercancel",function(){pointer.active=0;pointer.fire=0});
document.getElementById("ix").onclick=cleanup;
document.getElementById("ipause").onclick=function(){if(helpOpen)return;paused=!paused;if(!paused){lastTs=0;loop(performance.now())}};
document.getElementById("ihelp").onclick=function(){if(helpOpen){document.getElementById("ihelp-panel").classList.add("hidden");helpOpen=false;paused=false;lastTs=0;loop(performance.now())}else showHelp()};
function bindHold(id,on,off){
  var el=document.getElementById(id);
  el.addEventListener("pointerdown",function(e){e.preventDefault();e.stopPropagation();on();el.classList.add("active")});
  el.addEventListener("pointerup",function(){off();el.classList.remove("active")});
  el.addEventListener("pointerleave",function(){off();el.classList.remove("active")});
}
bindHold("ifire",function(){pointer.fire=1},function(){pointer.fire=0});
document.getElementById("ibomb").addEventListener("pointerdown",function(e){e.preventDefault();e.stopPropagation();doBomb();this.classList.add("active")});
document.getElementById("ibomb").addEventListener("pointerup",function(){this.classList.remove("active")});
document.getElementById("icycle").addEventListener("pointerdown",function(e){e.preventDefault();e.stopPropagation();cycleWep(1);this.classList.add("active")});
document.getElementById("icycle").addEventListener("pointerup",function(){this.classList.remove("active")});
resize();setWepUI();reset();loop(performance.now());
}

window.G5Invaders={start:launch};

function isTrigger(v){
  if(!v)return false;
  v=String(v).trim().toLowerCase();
  return v==="invader"||v==="invaders"||v==="インベーダー"||v==="インベーダ"||v==="spaceinvaders"||v==="g5invaders";
}
function showHint(){
  var el=document.getElementById("toast");
  if(el){el.textContent="🚀 INVADERS 起動…";el.classList.remove("hidden");el.classList.add("show");setTimeout(function(){el.classList.remove("show")},1100)}
}
function boot(){
  var hex=document.getElementById("hex-input")||document.querySelector('input[type="text"]');
  if(hex){
    function onHex(){if(isTrigger(hex.value)){showHint();setTimeout(launch,80)}}
    hex.addEventListener("input",onHex);hex.addEventListener("change",onHex);
    hex.addEventListener("keydown",function(e){if(e.key==="Enter")onHex()});
  }
  document.addEventListener("click",function(){
    var t=document.getElementById("hex-input")||document.querySelector('input[type="text"]');
    if(t&&isTrigger(t.value))setTimeout(launch,60);
  });
  var sw=document.getElementById("swatch")||document.querySelector(".swatch");
  if(sw){
    var taps=0,t2;
    sw.addEventListener("click",function(){
      taps++;clearTimeout(t2);t2=setTimeout(function(){taps=0},900);
      if(taps>=5){taps=0;showHint();launch()}
    });
  }
  var buf="";
  document.addEventListener("keydown",function(e){
    if(e.key.length!==1)return;
    buf+=e.key.toLowerCase();if(buf.length>12)buf=buf.slice(-12);
    if(buf.indexOf("invader")>=0||buf.indexOf("invaders")>=0){buf="";showHint();setTimeout(launch,60)}
  });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
else boot();
})();
