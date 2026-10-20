/**
 * G5 Easter patch v6 — mobile FAB + terminal expand + bubble
 */
(function(){
"use strict";
if(window.__G5_EASTER_PATCH__)return;
window.__G5_EASTER_PATCH__=true;
function isSub(){return (location.pathname||"").indexOf("/pages/")>=0}
function toast(m){var e=document.getElementById("g5-easter-toast");if(!e){e=document.createElement("div");e.id="g5-easter-toast";e.setAttribute("role","status");document.body.appendChild(e)}e.textContent=m;e.classList.add("show");clearTimeout(e._t);e._t=setTimeout(function(){e.classList.remove("show")},2600)}
function esc(s){return String(s).replace(/&/g,"&#38;").replace(/</g,"&#60;").replace(/>/g,"&#62;")}
function startBubble(){
if(window.__G5_START_BUBBLE__){window.__G5_START_BUBBLE__();return}
var b=(window.G5&&G5.asset)?G5.asset("src/js/easter-bubble.js"):((location.pathname||"").indexOf("/pages/")>=0?"../../":"./")+"src/js/easter-bubble.js";
var s=document.createElement("script");s.src=b;
s.onload=function(){if(window.__G5_START_BUBBLE__)window.__G5_START_BUBBLE__();else toast("bubble API missing")};
s.onerror=function(){toast("bubble load failed")};document.head.appendChild(s);
}
function calc(expr){var s=String(expr||"").replace(/\s+/g,"");if(!s||!/^[\d+\-*/().%]+$/.test(s))return "invalid";try{var v=Function("return ("+s+")")();return (typeof v==="number"&&isFinite(v))?String(v):"error"}catch(e){return "error"}}
function fab(){
if(document.getElementById("g5-console-fab"))return;
var f=document.createElement("button");f.type="button";f.id="g5-console-fab";f.setAttribute("aria-label","G5 Terminal");f.innerHTML="<span>>_</span>";
f.onclick=function(e){e.preventDefault();e.stopPropagation();
if(window.G5Easter&&G5Easter.console)G5Easter.console();
else{var el=document.getElementById("g5-console");if(el){el.classList.toggle("open");var i=document.getElementById("g5-console-input");if(i&&el.classList.contains("open"))setTimeout(function(){i.focus()},50)}}};
document.body.appendChild(f);
setInterval(function(){var c=document.getElementById("g5-console");f.classList.toggle("open",!!(c&&c.classList.contains("open")))},400);
}
function enhance(){
if(!window.G5Easter)return false;
var op=window.G5Easter.portal;
window.G5Easter.portal=function(){if(isSub()){toast("時は味方 · Calendar never ends");return}if(typeof op==="function")op()};
window.G5Easter.bubble=startBubble;window.G5Easter.bubbleshooter=startBubble;return true;
}
var CMDS=["help","about","version","neofetch","fortune","status","weather","theme","time","date","now","ls","whoami","echo","history","demo","sandbox","flow","fractal","games","snake","breakout","bubble","bubbleshooter","matrix","portal","roll","cal","clear","exit","pwd","id","calc","base64","uuid","hash","color","rgb","tip","dice","coin","open","screen","ua"];
var FORT=["時は味方 · Calendar never ends","右下 >_ でコンソール","bubble でバブルシューター","Ctrl+` でもOK","5Gは仲間の密度だ"];
function attach(){
var ce=document.getElementById("g5-console");
if(!ce||ce._g5v6){fab();return}ce._g5v6=true;fab();
var input=document.getElementById("g5-console-input"),out=document.getElementById("g5-console-out");
if(!input||!out)return;
input.setAttribute("enterkeyhint","send");input.setAttribute("autocapitalize","off");
var hist=[];try{var raw=localStorage.getItem("g5_console_hist");if(raw)hist=JSON.parse(raw)||[]}catch(e){}
function println(h){var d=document.createElement("div");d.className="g5-console-row";d.innerHTML=h;out.appendChild(d);out.scrollTop=out.scrollHeight}
function b64e(t){try{return btoa(unescape(encodeURIComponent(t)))}catch(e){return "err"}}
function b64d(t){try{return decodeURIComponent(escape(atob(t)))}catch(e){return "err"}}
var EXTRA={
fortune:function(){return FORT[(Math.random()*FORT.length)|0]},
neofetch:function(){var r=document.documentElement;return ["guest@g5portal","OS: G5 Portal","Path: "+(location.pathname||"/"),"Screen: "+innerWidth+"x"+innerHeight,"Shell: G5 Terminal v6"].join("\n")},
status:function(){return EXTRA.neofetch()},
version:function(){return "G5 Terminal v6.0 · mobile FAB · bubble"},
date:function(){return new Date().toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"long"})},
now:function(){return new Date().toLocaleString("ja-JP")},
echo:function(a){return (a||[]).join(" ")},
history:function(){return hist.length?hist.slice(-20).map(function(h,i){return (i+1)+"  "+h}).join("\n"):"(empty)"},
pwd:function(){return location.pathname||"/"},
id:function(){return "uid=0(guest) groups=5G"},
ua:function(){return navigator.userAgent},
screen:function(){return innerWidth+"x"+innerHeight+" dpr "+(devicePixelRatio||1)},
cal:function(){try{location.href=(isSub()?"../../":"./")+"pages/calendar/"}catch(e){}return "Opening calendar…"},
games:function(){return "snake · breakout · bubble · demo · sandbox"},
bubble:function(){startBubble();return "Launching Bubble Shooter…"},
bubbleshooter:function(){return EXTRA.bubble()},
calc:function(a){return calc((a||[]).join(""))},
base64:function(a){var m=(a[0]||"").toLowerCase(),r=a.slice(1).join(" ");if(m==="encode"||m==="e")return b64e(r);if(m==="decode"||m==="d")return b64d(r);return "usage: base64 encode|decode <text>"},
uuid:function(){return (crypto&&crypto.randomUUID)?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==="x"?r:(r&3)|8).toString(16)})},
hash:function(a){var s=(a||[]).join(" "),h=5381;for(var i=0;i<s.length;i++){h=((h<<5)+h)^s.charCodeAt(i);h>>>=0}return ("00000000"+h.toString(16)).slice(-8)},
color:function(a){var hex=(a[0]||"").replace(/^#/,"");if(!/^[0-9a-fA-F]{6}$/.test(hex))return "usage: color RRGGBB";return "#"+hex.toUpperCase()+" rgb("+parseInt(hex.slice(0,2),16)+","+parseInt(hex.slice(2,4),16)+","+parseInt(hex.slice(4,6),16)+")"},
rgb:function(a){if(a.length<3)return "usage: rgb R G B";function h(n){return ("0"+Math.max(0,Math.min(255,+n|0)).toString(16)).slice(-2)}return "#"+h(a[0])+h(a[1])+h(a[2])},
tip:function(){var t=["右下 >_ でターミナル","bubble で本格パズル","calc 1+2*3","Tab 補完"];return t[(Math.random()*t.length)|0]},
dice:function(a){var n=Math.max(1,Math.min(100,+(a[0]||6)|0));return "dice "+(1+((Math.random()*n)|0))+" (d"+n+")"},
coin:function(){return Math.random()<0.5?"heads":"tails"},
open:function(a){var m={calendar:"pages/calendar/",calc:"pages/calculator/",pdf:"pages/pdf-viewer/",quiz:"pages/multiquiz/",home:"index.html"};var n=(a[0]||"").toLowerCase();if(!m[n])return "usage: open calendar|calc|pdf|quiz|home";try{location.href=(isSub()?"../../":"./")+m[n]}catch(e){}return "Opening…"},
weather:function(){var r=document.documentElement;return "weather: "+(r.dataset.weather||"?")+" "+(r.dataset.temp||"?")+"C"},
help:function(){return ["G5 Terminal v6.0","  help neofetch fortune status weather version","  calc base64 uuid hash color rgb tip dice coin","  bubble snake breakout demo sandbox games","  open cal screen ua history pwd","  スマホ: 右下 >_ · Tab · Ctrl+`"].join("\n")}
};
input.addEventListener("keydown",function(e){
if(e.key==="Tab"){e.preventDefault();e.stopImmediatePropagation();var v=input.value,p=v.split(/\s+/);if(p.length>1)return;var pre=(p[0]||"").toLowerCase();if(!pre)return;var m=CMDS.filter(function(c){return c.indexOf(pre)===0});if(m.length===1)input.value=m[0];else if(m.length>1){println("<span class=\"g5-c-cmd\">"+m.join("  ")+"</span>");var c=m[0];for(var i=1;i<m.length;i++){while(c&&m[i].indexOf(c)!==0)c=c.slice(0,-1)}if(c&&c.length>pre.length)input.value=c}return}
if(e.key==="Enter"){var line=String(input.value||"").trim();if(!line)return;var parts=line.split(/\s+/),cmd=parts[0].toLowerCase(),args=parts.slice(1);hist.push(line);if(hist.length>80)hist=hist.slice(-80);try{localStorage.setItem("g5_console_hist",JSON.stringify(hist.slice(-40)))}catch(err){}
if(EXTRA[cmd]){e.preventDefault();e.stopImmediatePropagation();input.value="";println("<span class=\"g5-c-ps\">g5></span> "+esc(line));var o=EXTRA[cmd](args);if(o!=null)println(esc(o).replace(/\n/g,"<br>"))}}
},true);
}
function tick(n){enhance();attach();fab();if(n>100)return;setTimeout(function(){tick(n+1)},100)}
tick(0);
if(typeof MutationObserver!=="undefined"){new MutationObserver(function(){attach();fab()}).observe(document.documentElement,{childList:true,subtree:true})}
})();
