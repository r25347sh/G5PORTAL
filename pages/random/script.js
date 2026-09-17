(function () {
  "use strict";
  var mode = "coin", busy = false;
  function secureInt(max) {
    if (window.crypto && crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      var limit = Math.floor(0x100000000 / max) * max;
      var x;
      do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
      return x % max;
    }
    return Math.floor(Math.random() * max);
  }
  function setMode(m) {
    mode = m;
    document.querySelectorAll(".mode-tab").forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-mode") === m);
    });
    document.getElementById("panel-coin").classList.toggle("hidden", m !== "coin");
    document.getElementById("panel-dice").classList.toggle("hidden", m !== "dice");
    document.getElementById("panel-lotto").classList.toggle("hidden", m !== "lotto");
    document.getElementById("coin").classList.toggle("hidden", m !== "coin");
    document.getElementById("dice").classList.toggle("hidden", m !== "dice");
    document.getElementById("lotto-out").classList.toggle("hidden", m !== "lotto");
    document.getElementById("result").textContent = "";
  }
  document.querySelectorAll(".mode-tab").forEach(function (tab) {
    tab.addEventListener("click", function () { setMode(tab.getAttribute("data-mode")); });
  });
  var facesEl = document.getElementById("faces");
  var countEl = document.getElementById("dice-count");
  facesEl.addEventListener("input", function () { document.getElementById("faces-val").textContent = facesEl.value; });
  countEl.addEventListener("input", function () { document.getElementById("count-val").textContent = countEl.value; });
  var coin = document.getElementById("coin");
  var dice = document.getElementById("dice");
  var lottoOut = document.getElementById("lotto-out");
  var result = document.getElementById("result");
  function flipCoin() {
    if (busy) return;
    busy = true;
    var side = secureInt(2);
    coin.classList.remove("flipping"); void coin.offsetWidth; coin.classList.add("flipping");
    setTimeout(function () {
      coin.style.transform = side === 0 ? "rotateY(0deg)" : "rotateY(180deg)";
      coin.classList.remove("flipping");
      result.textContent = side === 0 ? "\u8868" : "\u88cf";
      busy = false;
    }, 1100);
  }
  function rollDice() {
    if (busy) return;
    busy = true;
    var faces = +facesEl.value || 6;
    var count = +countEl.value || 1;
    var rolls = [];
    dice.classList.add("shake");
    var steps = 12, i = 0;
    var iv = setInterval(function () {
      dice.textContent = String(secureInt(faces) + 1);
      i++;
      if (i >= steps) {
        clearInterval(iv);
        for (var n = 0; n < count; n++) rolls.push(secureInt(faces) + 1);
        dice.textContent = rolls.length === 1 ? String(rolls[0]) : rolls.join(" \u00b7 ");
        result.textContent = "\u5408\u8a08 " + rolls.reduce(function (a, b) { return a + b; }, 0);
        dice.classList.remove("shake");
        busy = false;
      }
    }, 40);
  }
  function drawLotto() {
    if (busy) return;
    var items = (document.getElementById("lotto-items").value || "").split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!items.length) { result.textContent = "\u5019\u88dc\u3092\u5165\u529b"; return; }
    var n = Math.min(+document.getElementById("lotto-n").value || 1, items.length);
    busy = true;
    var pool = items.slice(), won = [];
    for (var i = 0; i < n; i++) {
      var idx = secureInt(pool.length);
      won.push(pool.splice(idx, 1)[0]);
    }
    lottoOut.classList.remove("pop"); void lottoOut.offsetWidth;
    lottoOut.textContent = won.join(" \u00b7 ");
    lottoOut.classList.add("pop");
    result.textContent = n + "\u4ef6";
    busy = false;
  }
  function run() {
    if (mode === "coin") flipCoin();
    else if (mode === "dice") rollDice();
    else drawLotto();
  }
  document.getElementById("btn-roll").addEventListener("click", run);
  coin.addEventListener("click", function () { if (mode === "coin") flipCoin(); });
})();
