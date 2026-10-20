/**
 * G5 Bubble Shooter — on-demand module with Web Audio
 */
(function(){
"use strict";
if(window.__G5_BUBBLE_READY__)return;
window.__G5_BUBBLE_READY__=true;
var AudioCtx=window.AudioContext||window.webkitAudioContext,_actx=null;
function ensureAudio(){if(!AudioCtx)return null;if(!_actx)_actx=new AudioCtx();if(_actx.state==="suspended")_actx.resume();return _actx}
function tone(freq,dur,type,vol,when){var ctx=ensureAudio();if(!ctx)return;var t0=ctx.currentTime+(when||0);var o=ctx.createOscillator(),g=ctx.createGain();o.type=type||"sine";o.frequency.setValueAtTime(freq,t0);g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol||0.08,t0+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t0+(dur||0.12));o.connect(g);g.connect(ctx.destination);o.start(t0);o.stop(t0+(dur||0.12)+0.03)}
function noise(dur,vol,when){var ctx=ensureAudio();if(!ctx)return;var t0=ctx.currentTime+(when||0),n=Math.max(1,(ctx.sampleRate*(dur||0.08))|0),buf=ctx.createBuffer(1,n,ctx.sampleRate),d=buf.getChannelData(0);for(var i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);var s=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();f.type="bandpass";f.frequency.value=900;s.buffer=buf;g.gain.value=vol||0.12;s.connect(f);f.connect(g);g.connect(ctx.destination);s.start(t0)}

function startBubbleShooter(){
if(document.getElementById("g5-bubble-shell"))return;
var COLORS=[{fill:"#ff2d95"},{fill:"#00f5ff"},{fill:"#ffd700"},{fill:"#9b5de5"},{fill:"#2ecc71"},{fill:"#ff6b35"}];
var COLS=10,ROWS=12,R=18,HEX_H=R*Math.sqrt(3),W=Math.ceil(COLS*R*2+R),H=Math.ceil(ROWS*HEX_H+R*4+80),SCORE_KEY="g5_bubble_best";
var shell=document.createElement("div");shell.id="g5-bubble-shell";
shell.innerHTML='<div class="g5-game-bar"><span class="g5-game-title">BUBBLE</span><span class="g5-game-score" id="g5-bubble-score">0</span><button type="button" class="g5-game-close">×</button></div><canvas id="g5-bubble-cv" width="'+W+'" height="'+H+'"></canvas><p class="g5-game-hint">ドラッグで狙い · 離して発射 · Esc</p>';
document.body.appendChild(shell);
var cv=document.getElementById("g5-bubble-cv"),ctx=cv.getContext("2d"),scoreEl=document.getElementById("g5-bubble-score");
var score=0,best=0;try{best=+(localStorage.getItem(SCORE_KEY)||0)}catch(e){}
var grid=[],shooter={color:0,next:1,x:W/2,y:H-36},flying=null,aimAngle=-Math.PI/2,aiming=false,particles=[],alive=true,raf=0,gameOver=false,win=false,shots=0,rowOffset=0;

function cellX(c,r){return R+c*R*2+(((r+rowOffset)%2)?R:0)}
function cellY(r){return R+8+r*HEX_H}
function randColor(){var set={};for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++)if(grid[r]&&grid[r][c]>=0)set[grid[r][c]]=1;var k=Object.keys(set).map(Number);return k.length?k[(Math.random()*k.length)|0]:(Math.random()*5)|0}
function initGrid(){grid=[];for(var r=0;r<ROWS;r++){grid[r]=[];for(var c=0;c<COLS;c++)grid[r][c]=r<6?(Math.random()*5)|0:-1}shooter.color=randColor();shooter.next=randColor()}
function neighbors(c,r){var odd=((r+rowOffset)%2)===1;var d=odd?[[0,-1],[1,-1],[-1,0],[1,0],[0,1],[1,1]]:[[-1,-1],[0,-1],[-1,0],[1,0],[-1,1],[0,1]];var o=[];for(var i=0;i<d.length;i++){var nc=c+d[i][0],nr=r+d[i][1];if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS)o.push([nc,nr])}return o}
function findCluster(c,r,col,vis){var key=r+","+c;if(vis[key])return[];if(!grid[r]||grid[r][c]!==col)return[];vis[key]=true;var list=[[c,r]],nbs=neighbors(c,r);for(var i=0;i<nbs.length;i++)list=list.concat(findCluster(nbs[i][0],nbs[i][1],col,vis));return list}
function findFloating(){var conn={};function dfs(c,r){var key=r+","+c;if(conn[key])return;if(!grid[r]||grid[r][c]<0)return;conn[key]=true;var nbs=neighbors(c,r);for(var i=0;i<nbs.length;i++)dfs(nbs[i][0],nbs[i][1])}for(var c=0;c<COLS;c++)if(grid[0]&&grid[0][c]>=0)dfs(c,0);var fl=[];for(var r=0;r<ROWS;r++)for(var cc=0;cc<COLS;cc++)if(grid[r][cc]>=0&&!conn[r+","+cc])fl.push([cc,r]);return fl}
function spawnP(x,y,col,n){var C=COLORS[col]||COLORS[0];for(var i=0;i<n;i++){var a=Math.random()*Math.PI*2,sp=1.5+Math.random()*4;particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1,life:1,color:C.fill,r:2+Math.random()*3})}}
function popBubbles(list){for(var i=0;i<list.length;i++){var c=list[i][0],r=list[i][1];if(grid[r][c]<0)continue;spawnP(cellX(c,r),cellY(r),grid[r][c],10);grid[r][c]=-1}score+=list.length*10;if(list.length>=5)score+=list.length*5;scoreEl.textContent=score+(best?" · best "+best:"");tone(520+list.length*40,0.08,"triangle",0.1);if(list.length>=4){tone(660,0.1,"sine",0.08,0.06);tone(880,0.12,"sine",0.07,0.12)}noise(0.06,0.08)}
function snapToGrid(x,y){var bestD=1e9,bc=0,br=0;for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){if(grid[r][c]>=0)continue;var cx=cellX(c,r),cy=cellY(r),d=(cx-x)*(cx-x)+(cy-y)*(cy-y);if(d<bestD){bestD=d;bc=c;br=r}}return{c:bc,r:br}}
function placeBubble(c,r,color){if(r<0||r>=ROWS||c<0||c>=COLS)return;grid[r][c]=color;var cluster=findCluster(c,r,color,{});if(cluster.length>=3){popBubbles(cluster);var fl=findFloating();if(fl.length){for(var i=0;i<fl.length;i++){var fc=fl[i][0],fr=fl[i][1];spawnP(cellX(fc,fr),cellY(fr),grid[fr][fc],6);grid[fr][fc]=-1;score+=15}scoreEl.textContent=score+(best?" · best "+best:"");tone(330,0.15,"sine",0.09,0.05)}}else tone(180,0.06,"square",0.05);
var rem=0;for(var rr=0;rr<ROWS;rr++)for(var cc=0;cc<COLS;cc++)if(grid[rr][cc]>=0)rem++;
if(rem===0){win=true;gameOver=true;score+=500;scoreEl.textContent=score+" · CLEAR!";if(score>best){best=score;try{localStorage.setItem(SCORE_KEY,String(best))}catch(e){}}[523,659,784,1046].forEach(function(f,i){tone(f,0.15,"triangle",0.1,i*0.1)})}
shots++;if(shots%8===0&&!gameOver)dropCeiling();
for(var r2=ROWS-2;r2<ROWS;r2++)for(var c2=0;c2<COLS;c2++)if(grid[r2]&&grid[r2][c2]>=0){gameOver=true;if(score>best){best=score;try{localStorage.setItem(SCORE_KEY,String(best))}catch(e){}}tone(110,0.3,"sawtooth",0.1);return}}
function dropCeiling(){for(var r=ROWS-1;r>0;r--)for(var c=0;c<COLS;c++)grid[r][c]=grid[r-1][c];rowOffset=1-rowOffset;for(var c=0;c<COLS;c++)grid[0][c]=(Math.random()*5)|0;noise(0.1,0.1);tone(90,0.2,"sine",0.08)}
function fire(){if(flying||gameOver)return;ensureAudio();var speed=11;flying={x:shooter.x,y:shooter.y,vx:Math.cos(aimAngle)*speed,vy:Math.sin(aimAngle)*speed,color:shooter.color,r:R-1};shooter.color=shooter.next;shooter.next=randColor();tone(440,0.05,"square",0.06)}
function updateFlying(){if(!flying)return;flying.x+=flying.vx;flying.y+=flying.vy;
if(flying.x-flying.r<2){flying.x=flying.r+2;flying.vx=Math.abs(flying.vx)}if(flying.x+flying.r>W-2){flying.x=W-flying.r-2;flying.vx=-Math.abs(flying.vx)}
if(flying.y-flying.r<4){var sn=snapToGrid(flying.x,flying.y);placeBubble(sn.c,sn.r,flying.color);flying=null;return}
for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){if(grid[r][c]<0)continue;var cx=cellX(c,r),cy=cellY(r),dx=flying.x-cx,dy=flying.y-cy;if(Math.sqrt(dx*dx+dy*dy)<R*1.85){var s2=snapToGrid(flying.x,flying.y);placeBubble(s2.c,s2.r,flying.color);flying=null;return}}
if(flying.y>H+20)flying=null}
function drawBubble(x,y,col,sc){sc=sc||1;var C=COLORS[col]||COLORS[0],rad=R*sc;ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);var g=ctx.createRadialGradient(x-rad*0.3,y-rad*0.35,rad*0.1,x,y,rad);g.addColorStop(0,"#fff");g.addColorStop(0.25,C.fill);g.addColorStop(1,C.fill);ctx.fillStyle=g;ctx.fill();ctx.beginPath();ctx.arc(x-rad*0.28,y-rad*0.3,rad*0.28,0,Math.PI*2);ctx.fillStyle="rgba(255,255,255,0.35)";ctx.fill()}
function drawAim(){if(flying||gameOver)return;ctx.save();ctx.strokeStyle="rgba(255,255,255,0.35)";ctx.setLineDash([4,6]);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(shooter.x,shooter.y);var px=shooter.x,py=shooter.y,vx=Math.cos(aimAngle),vy=Math.sin(aimAngle);for(var i=0;i<80;i++){px+=vx*6;py+=vy*6;if(px<R||px>W-R)vx=-vx;if(py<4)break;var hit=false;for(var r=0;r<ROWS&&!hit;r++)for(var c=0;c<COLS;c++){if(grid[r][c]<0)continue;var dx=px-cellX(c,r),dy=py-cellY(r);if(dx*dx+dy*dy<R*R*3.2){hit=true;break}}if(hit)break;if(i%2===0)ctx.lineTo(px,py)}ctx.stroke();ctx.setLineDash([]);ctx.restore()}
function draw(){ctx.fillStyle="#0a0818";ctx.fillRect(0,0,W,H);for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++)if(grid[r][c]>=0)drawBubble(cellX(c,r),cellY(r),grid[r][c],1);
for(var i=particles.length-1;i>=0;i--){var p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vy+=0.15;p.life-=0.025;if(p.life<=0){particles.splice(i,1);continue}ctx.globalAlpha=p.life;ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();ctx.globalAlpha=1}
drawAim();if(flying)drawBubble(flying.x,flying.y,flying.color,1);
ctx.beginPath();ctx.arc(shooter.x,shooter.y+8,22,0,Math.PI*2);ctx.fillStyle="rgba(20,16,36,0.9)";ctx.fill();ctx.strokeStyle="rgba(0,245,255,0.35)";ctx.lineWidth=2;ctx.stroke();
drawBubble(shooter.x,shooter.y,shooter.color,0.95);drawBubble(W-36,H-36,shooter.next,0.7);
ctx.fillStyle="rgba(255,255,255,0.4)";ctx.font="10px monospace";ctx.textAlign="center";ctx.fillText("NEXT",W-36,H-10);
if(gameOver){ctx.fillStyle="rgba(5,4,14,0.72)";ctx.fillRect(0,H*0.3,W,100);ctx.fillStyle=win?"#00f5ff":"#ff2d95";ctx.font="bold 28px system-ui";ctx.textAlign="center";ctx.fillText(win?"CLEAR!":"GAME OVER",W/2,H*0.3+42);ctx.fillStyle="#ffd700";ctx.font="16px system-ui";ctx.fillText("Score "+score+(best?"  Best "+best:""),W/2,H*0.3+72);ctx.fillStyle="rgba(255,255,255,0.5)";ctx.font="12px system-ui";ctx.fillText("タップで再挑戦 · Esc",W/2,H*0.3+94)}}
function loop(){if(!alive)return;updateFlying();draw();raf=requestAnimationFrame(loop)}
function angFrom(e){var rect=cv.getBoundingClientRect(),sx=W/rect.width,sy=H/rect.height;var cx=((e.clientX!=null?e.clientX:e.touches[0].clientX)-rect.left)*sx,cy=((e.clientY!=null?e.clientY:e.touches[0].clientY)-rect.top)*sy;var ang=Math.atan2(cy-shooter.y,cx-shooter.x);var minA=-Math.PI+0.25,maxA=-0.25;if(ang>0)ang=ang>Math.PI/2?minA:maxA;return Math.max(minA,Math.min(maxA,ang))}
function onDown(e){e.preventDefault();if(gameOver){score=0;shots=0;rowOffset=0;gameOver=false;win=false;particles=[];flying=null;initGrid();scoreEl.textContent="0";return}aiming=true;aimAngle=angFrom(e)}
function onMove(e){if(!aiming)return;e.preventDefault();aimAngle=angFrom(e)}
function onUp(e){if(!aiming)return;aiming=false;e.preventDefault();fire()}
function cleanup(){alive=false;cancelAnimationFrame(raf);document.removeEventListener("keydown",onKey,true);if(shell.parentNode)shell.parentNode.removeChild(shell)}
function onKey(e){if(e.key==="Escape")cleanup();if(e.key===" "&&!flying&&!gameOver){e.preventDefault();fire()}if(e.key==="ArrowLeft")aimAngle=Math.max(-Math.PI+0.25,aimAngle-0.08);if(e.key==="ArrowRight")aimAngle=Math.min(-0.25,aimAngle+0.08)}
cv.addEventListener("mousedown",onDown);cv.addEventListener("mousemove",onMove);cv.addEventListener("mouseup",onUp);
cv.addEventListener("touchstart",onDown,{passive:false});cv.addEventListener("touchmove",onMove,{passive:false});cv.addEventListener("touchend",onUp,{passive:false});
document.addEventListener("keydown",onKey,true);shell.querySelector(".g5-game-close").addEventListener("click",cleanup);
function fit(){var maxW=Math.min(window.innerWidth,480),sc=maxW/W;cv.style.width=maxW+"px";cv.style.height=(H*sc)+"px"}
fit();window.addEventListener("resize",fit);initGrid();ensureAudio();tone(330,0.08,"sine",0.06);tone(440,0.08,"sine",0.06,0.08);loop();
}
window.__G5_START_BUBBLE__=startBubbleShooter;
})();
