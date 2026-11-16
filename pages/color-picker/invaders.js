/**
 * G⁵ INVADERS — Color Picker Easter Egg
 * Trigger: type "invader" / "インベーダー" in HEX, 5× tap swatch, or type invader anywhere
 * v8 — controls / design / fun overhaul
 */
(function () {
  "use strict";
  if (window.__G5_INV_V8__) return;
  window.__G5_INV_V8__ = true;

  var HS_KEY = "g5_invaders_hs";

  function launch() {
    if (document.getElementById("g5-inv-root")) return;

    var root = document.createElement("div");
    root.id = "g5-inv-root";
    root.innerHTML =
      '<div class="ih" id="ih">' +
      '  <div class="ih-left">' +
      '    <span class="it">G⁵ INVADERS</span>' +
      '    <span class="is-label">SCORE</span><span class="is" id="is">0</span>' +
      '    <span class="hs-label">HI</span><span class="hs" id="ihs">0</span>' +
      '  </div>' +
      '  <div class="ih-right">' +
      '    <span class="iw" id="iw">WAVE 1</span>' +
      '    <span class="icb" id="icb" title="Bomb">💣×0</span>' +
      '    <span class="il" id="il">♥♥♥</span>' +
      '    <button type="button" id="ipause" class="ib" aria-label="pause">❚❚</button>' +
      '    <button type="button" id="ix" class="ib" aria-label="close">×</button>' +
      "  </div>" +
      "</div>" +
      '<canvas id="ic"></canvas>' +
      '<div id="io" class="io hidden"></div>' +
      '<div id="iwv" class="iwv"></div>' +
      '<div class="pad" id="ipad">' +
      '  <button type="button" class="pad-btn pad-fire" id="ifire" aria-label="fire">FIRE</button>' +
      '  <button type="button" class="pad-btn pad-bomb" id="ibomb" aria-label="bomb">BOMB</button>' +
      "</div>";

    // NOTE: full v8 body continues in next commit if truncated - see artifacts
    if (!document.getElementById("g5invcss")) {
      var st = document.createElement("style");
      st.id = "g5invcss";
      st.textContent = "#g5-inv-root{position:fixed;inset:0;z-index:100100;background:#02040c;overflow:hidden;font-family:ui-monospace,monospace;color:#e8f7ff}" +
        "#ic{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}" +
        ".ih{position:absolute;top:0;left:0;right:0;z-index:10;display:flex;justify-content:space-between;padding:max(.5rem,env(safe-area-inset-top)) .75rem;background:linear-gradient(180deg,rgba(2,4,12,.95),transparent)}" +
        ".it{font-weight:900;letter-spacing:.18em;background:linear-gradient(90deg,#ff2d95,#00f5ff,#ffd700);-webkit-background-clip:text;background-clip:text;color:transparent}" +
        ".is{color:#00f5ff}.hs{color:#ffd700}.il{color:#ff6b9a}.ib{border:1px solid rgba(255,45,149,.45);background:rgba(255,45,149,.12);color:#ff8cc8;border-radius:8px;width:2rem;height:2rem;cursor:pointer}" +
        ".io{position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(2,4,12,.88);text-align:center}.io.hidden{display:none}" +
        ".io button{margin-top:1rem;border:1px solid rgba(0,245,255,.5);background:rgba(0,245,255,.12);color:#00f5ff;border-radius:10px;padding:.55rem 1.4rem;cursor:pointer;font-family:inherit}" +
        ".iwv{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);z-index:15;font-size:clamp(1.2rem,5vw,2rem);font-weight:800;letter-spacing:.25em;color:#00f5ff;opacity:0;pointer-events:none}.iwv.show{opacity:1}" +
        ".pad{position:absolute;bottom:max(.8rem,env(safe-area-inset-bottom));right:max(.8rem,env(safe-area-inset-right));z-index:12;display:flex;gap:.6rem}" +
        ".pad-btn{width:4.2rem;height:4.2rem;border-radius:50%;border:2px solid rgba(0,245,255,.4);background:rgba(0,245,255,.1);color:#00f5ff;font-weight:800;font-size:.72rem;cursor:pointer}" +
        ".pad-bomb{border-color:rgba(255,45,149,.5);background:rgba(255,45,149,.12);color:#ff8cc8}";
      document.head.appendChild(st);
    }

    document.body.appendChild(root);
    document.body.style.overflow = "hidden";

    var cv = document.getElementById("ic");
    var ctx = cv.getContext("2d");
    var W = 0, H = 0, dpr = 1;
    var running = true, paused = false, over = false;
    var score = 0, high = 0, wave = 1, lives = 3, bomb = 1;
    var combo = 0, bestCombo = 0, cT = 0;
    var ship = { x: 0, y: 0, spd: 0 };
    var bul = [], eb = [], en = [], pow = [], pt = [], floatTxt = [];
    var boss = null;
    var wep = 0, rapid = 0, spread = 0, shield = 0, shieldT = 0;
    var fireCd = 0, charge = 0, charging = 0, wavePause = 0, shake = 0;
    var keys = Object.create(null);
    var pointer = { active: 0, x: 0, y: 0, fire: 0 };
    var stars = [];
    var animId = 0, lastTs = 0;

    try { high = parseInt(localStorage.getItem(HS_KEY) || "0", 10) || 0; } catch (e) {}
    document.getElementById("ihs").textContent = high;

    var SPRITES = [
      [[0,0,1,0,0,0,0,0,1,0,0],[0,0,0,1,0,0,0,1,0,0,0],[0,0,1,1,1,1,1,1,1,0,0],[0,1,1,0,1,1,1,0,1,1,0],[1,1,1,1,1,1,1,1,1,1,1],[1,0,1,1,1,1,1,1,1,0,1],[1,0,1,0,0,0,0,0,1,0,1],[0,0,0,1,1,0,1,1,0,0,0]],
      [[0,0,0,1,1,0,1,1,0,0,0],[0,0,1,1,1,1,1,1,1,0,0],[0,1,1,1,1,1,1,1,1,1,0],[1,1,0,1,1,1,1,1,0,1,1],[1,1,1,1,1,1,1,1,1,1,1],[0,0,1,0,0,0,0,0,1,0,0],[0,1,0,1,1,0,1,1,0,1,0],[1,0,1,0,0,0,0,0,1,0,1]],
      [[0,0,0,0,1,1,1,0,0,0,0],[0,0,0,1,1,1,1,1,0,0,0],[0,0,1,1,1,1,1,1,1,0,0],[0,1,1,0,1,1,1,0,1,1,0],[0,1,1,1,1,1,1,1,1,1,0],[0,0,0,1,0,1,0,1,0,0,0],[0,0,1,0,0,0,0,0,1,0,0],[0,1,0,0,0,0,0,0,0,1,0]]
    ];
    var TYPE_COL = ["#00f5ff", "#a855f7", "#ff2d95"];
    var POW_COL = ["#ffd700", "#00f5ff", "#a855f7", "#ff6b9a", "#7cff9a"];
    var POW_LBL = ["WEAPON", "RAPID", "SPREAD", "BOMB", "SHIELD"];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!ship.x) { ship.x = W / 2; ship.y = H - 56; }
      else { ship.x = Math.max(24, Math.min(W - 24, ship.x)); ship.y = Math.max(H * 0.55, Math.min(H - 48, ship.y)); }
      ship.spd = Math.max(6.5, Math.min(11, W * 0.012));
      if (!stars.length) {
        for (var i = 0; i < 70; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 1.2, s: 0.6 + Math.random() * 1.4 });
      }
    }

    function spk(x, y, c, n, sp) {
      n = n || 8; sp = sp || 2.5;
      for (var i = 0; i < n; i++) {
        var a = Math.random() * 6.2832, v = (0.4 + Math.random()) * sp;
        pt.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 18 + (Math.random() * 16) | 0, max: 34, c: c });
      }
    }
    function float(x, y, text, col) { floatTxt.push({ x: x, y: y, text: text, col: col || "#fff", vy: -0.9, life: 48 }); }
    function showWave(msg) {
      var el = document.getElementById("iwv");
      el.textContent = msg; el.classList.add("show");
      setTimeout(function () { el.classList.remove("show"); }, 1100);
    }

    function spawnWave() {
      en = []; boss = null; wavePause = 70;
      document.getElementById("iw").textContent = "WAVE " + wave;
      showWave("WAVE " + wave);
      var cols = Math.min(9, 5 + (wave / 2) | 0);
      var rows = Math.min(5, 2 + (wave / 3) | 0);
      var gapX = Math.min(52, (W - 80) / cols);
      var startX = (W - (cols - 1) * gapX) / 2;
      var startY = 72 + Math.min(40, wave * 2);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var t = r === 0 ? 2 : r < rows - 1 ? 1 : 0;
          en.push({ x: startX + c * gapX, y: startY + r * 36, vx: (1.1 + wave * 0.12) * (c % 2 ? 1 : -1) * 0.15 + (wave % 2 ? 0.8 : -0.8), w: 28, h: 22, hp: 1 + (t === 2 ? 1 : 0) + (wave > 4 ? 1 : 0), t: t, fr: (Math.random() * 40) | 0, frame: 0, si: t });
        }
      }
      if (wave % 4 === 0) {
        boss = { x: W / 2, y: 90, vx: 1.6 + wave * 0.08, hp: 28 + wave * 6, max: 28 + wave * 6, fr: 0, phase: 0 };
        showWave("\u26a0 BOSS WAVE");
      }
    }

    function fire() {
      if (fireCd > 0) return;
      fireCd = rapid ? 5 : 11 - Math.min(4, wep);
      var dmg = 1 + (wep > 1 ? 1 : 0);
      var c = wep >= 2 ? "#ffd700" : "#00f5ff";
      bul.push({ x: ship.x, y: ship.y - 18, vx: 0, vy: -13 - wep, dmg: dmg, c: c, big: 0 });
      if (spread || wep >= 2) {
        bul.push({ x: ship.x - 10, y: ship.y - 12, vx: -2.2, vy: -11, dmg: 1, c: c, big: 0 });
        bul.push({ x: ship.x + 10, y: ship.y - 12, vx: 2.2, vy: -11, dmg: 1, c: c, big: 0 });
      }
      if (wep >= 3) bul.push({ x: ship.x, y: ship.y - 22, vx: 0, vy: -16, dmg: 2, c: "#ff2d95", big: 0 });
      spk(ship.x, ship.y - 14, c, 3, 1.2);
    }

    function doBomb() {
      if (bomb <= 0 || over) return;
      bomb--;
      document.getElementById("icb").textContent = "\ud83d\udca3\u00d7" + bomb;
      for (var i = en.length - 1; i >= 0; i--) { score += 20; spk(en[i].x, en[i].y, "#ff2d95", 14, 4); en.splice(i, 1); }
      if (boss) { boss.hp -= 14; spk(boss.x, boss.y, "#ff2d95", 22, 5); }
      eb = []; shake = 18; float(W / 2, H / 2, "BOMB!", "#ff2d95");
    }

    function gameOver() {
      over = true; running = false;
      if (score > high) {
        high = score;
        try { localStorage.setItem(HS_KEY, String(high)); } catch (e) {}
        document.getElementById("ihs").textContent = high;
      }
      var io = document.getElementById("io");
      io.classList.remove("hidden");
      io.innerHTML = "<h2>GAME OVER</h2><p class=\"big\">" + score + "</p><p>WAVE " + wave + " \u00b7 BEST COMBO \u00d7" + bestCombo + "</p><p>HI " + high + "</p><button type=\"button\" id=\"iretry\">RETRY</button><button type=\"button\" id=\"iquit\" style=\"margin-left:.5rem;border-color:rgba(255,45,149,.5);color:#ff8cc8;background:rgba(255,45,149,.1)\">EXIT</button>";
      document.getElementById("iretry").onclick = function () { io.classList.add("hidden"); reset(); running = true; over = false; lastTs = 0; loop(performance.now()); };
      document.getElementById("iquit").onclick = cleanup;
    }

    function reset() {
      score = 0; wave = 1; lives = 3; bomb = 1; combo = 0; bestCombo = 0; cT = 0;
      wep = 0; rapid = 0; spread = 0; shield = 0; shieldT = 0; charge = 0; charging = 0; fireCd = 0;
      bul = []; eb = []; en = []; pow = []; pt = []; floatTxt = []; boss = null; over = false; paused = false;
      ship.x = W / 2; ship.y = H - 56;
      document.getElementById("is").textContent = "0";
      document.getElementById("il").textContent = "\u2665\u2665\u2665";
      document.getElementById("icb").textContent = "\ud83d\udca3\u00d71";
      document.getElementById("iw").textContent = "WAVE 1";
      document.getElementById("io").classList.add("hidden");
      spawnWave();
    }

    function drawInvader(e) {
      var grid = SPRITES[e.si % SPRITES.length];
      var px = 2.4, gw = grid[0].length * px, gh = grid.length * px;
      var ox = e.x - gw / 2, oy = e.y - gh / 2;
      var blink = ((e.frame / 12) | 0) % 2;
      ctx.fillStyle = TYPE_COL[e.t]; ctx.shadowColor = TYPE_COL[e.t]; ctx.shadowBlur = 6;
      for (var r = 0; r < grid.length; r++) {
        for (var c = 0; c < grid[r].length; c++) {
          if (!grid[r][c]) continue;
          if (blink && r >= 6 && (c < 3 || c > 7)) continue;
          ctx.fillRect(ox + c * px, oy + r * px, px + 0.3, px + 0.3);
        }
      }
      ctx.shadowBlur = 0;
    }

    function drawBoss() {
      if (!boss) return;
      var b = boss;
      ctx.save(); ctx.translate(b.x, b.y);
      ctx.shadowColor = "#ff2d95"; ctx.shadowBlur = 18;
      ctx.fillStyle = "#1a0520";
      ctx.beginPath(); ctx.moveTo(-40, 8); ctx.lineTo(-28, -18); ctx.lineTo(0, -28); ctx.lineTo(28, -18); ctx.lineTo(40, 8); ctx.lineTo(22, 22); ctx.lineTo(-22, 22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ff2d95"; ctx.beginPath(); ctx.arc(-14, -4, 6, 0, 6.28); ctx.arc(14, -4, 6, 0, 6.28); ctx.fill();
      ctx.fillStyle = "#00f5ff"; ctx.fillRect(-8, 6, 16, 5);
      ctx.shadowBlur = 0; ctx.restore();
      var bw = 90;
      ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(b.x - bw / 2, b.y - 40, bw, 6);
      ctx.fillStyle = "#ff2d95"; ctx.fillRect(b.x - bw / 2, b.y - 40, bw * Math.max(0, b.hp / b.max), 6);
      ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.strokeRect(b.x - bw / 2, b.y - 40, bw, 6);
    }

    function update(dt) {
      if (paused || over) return;
      var steps = Math.min(3, Math.max(1, Math.round(dt / 16.67)));
      for (var s = 0; s < steps; s++) tick();
    }

    function tick() {
      if (wavePause > 0) { wavePause--; return; }
      var targetX = ship.x, targetY = ship.y;
      if (keys["ArrowLeft"] || keys["a"] || keys["A"]) targetX -= ship.spd;
      if (keys["ArrowRight"] || keys["d"] || keys["D"]) targetX += ship.spd;
      if (keys["ArrowUp"] || keys["w"] || keys["W"]) targetY -= ship.spd * 0.7;
      if (keys["ArrowDown"] || keys["s"] || keys["S"]) targetY += ship.spd * 0.7;
      if (pointer.active) {
        targetX = pointer.x; targetY = Math.max(H * 0.52, Math.min(H - 44, pointer.y - 8));
        ship.x += (targetX - ship.x) * 0.42; ship.y += (targetY - ship.y) * 0.38;
      } else {
        ship.x = Math.max(22, Math.min(W - 22, targetX)); ship.y = Math.max(H * 0.52, Math.min(H - 44, targetY));
      }
      ship.x = Math.max(22, Math.min(W - 22, ship.x)); ship.y = Math.max(H * 0.52, Math.min(H - 44, ship.y));

      var wantFire = keys[" "] || keys["ArrowUp"] || keys["z"] || keys["Z"] || pointer.fire || (pointer.active && !keys["b"]);
      if (wantFire) {
        if (!charging) fire();
        charge = Math.min(100, charge + 2.2);
        if (charge >= 100) {
          charge = 0;
          bul.push({ x: ship.x, y: ship.y - 24, vx: 0, vy: -17, dmg: 5, c: "#ffd700", big: 1 });
          spk(ship.x, ship.y - 24, "#ffd700", 16, 4.5); float(ship.x, ship.y - 44, "CHARGE!", "#ffd700"); shake = 6;
        }
        charging = 1;
      } else { charge = Math.max(0, charge - 5); charging = 0; }

      if ((keys["b"] || keys["B"] || keys["x"] || keys["X"]) && bomb > 0) {
        keys["b"] = keys["B"] = keys["x"] = keys["X"] = false; doBomb();
      }
      if (fireCd > 0) fireCd--;
      if (shieldT > 0) { shieldT--; if (shieldT <= 0) shield = 0; }

      var i, j, b, e, p;
      for (i = bul.length - 1; i >= 0; i--) {
        b = bul[i]; b.x += b.vx; b.y += b.vy;
        if (b.y < -30 || b.x < -30 || b.x > W + 30) { bul.splice(i, 1); continue; }
        var hit = false;
        for (j = en.length - 1; j >= 0; j--) {
          e = en[j];
          if (Math.abs(b.x - e.x) < e.w / 2 + 4 && Math.abs(b.y - e.y) < e.h / 2 + 4) {
            e.hp -= b.dmg; hit = true; spk(e.x, e.y, TYPE_COL[e.t], 5, 2);
            if (e.hp <= 0) {
              var pts = ((10 + e.t * 5) * (1 + Math.min(8, combo) * 0.15) + 0.5) | 0;
              score += pts; combo++; if (combo > bestCombo) bestCombo = combo; cT = 90;
              float(e.x, e.y, "+" + pts, combo > 5 ? "#ffd700" : TYPE_COL[e.t]);
              en.splice(j, 1);
              if (Math.random() < 0.2) pow.push({ x: e.x, y: e.y, t: (Math.random() * 5) | 0, vy: 1.5 });
            }
            break;
          }
        }
        if (!hit && boss && Math.abs(b.x - boss.x) < 36 && Math.abs(b.y - boss.y) < 26) {
          boss.hp -= b.dmg; hit = true; spk(b.x, b.y, "#ffd700", 6, 2.2);
          if (boss.hp <= 0) {
            score += 400 + wave * 25; spk(boss.x, boss.y, "#ff2d95", 36, 7); float(boss.x, boss.y, "BOSS DOWN!", "#ff2d95");
            bomb = Math.min(5, bomb + 1); document.getElementById("icb").textContent = "\ud83d\udca3\u00d7" + bomb;
            boss = null; wave++; spawnWave();
          }
        }
        if (hit) bul.splice(i, 1);
      }

      for (i = en.length - 1; i >= 0; i--) {
        e = en[i]; e.x += e.vx; e.frame++;
        if (e.x < 20 || e.x > W - 20) { e.vx *= -1; e.y += 14; e.x = Math.max(20, Math.min(W - 20, e.x)); }
        e.fr++;
        if (e.fr > 55 + Math.random() * 45) {
          e.fr = 0;
          if (Math.random() < 0.18 + wave * 0.025) eb.push({ x: e.x, y: e.y + 10, vy: 2 + wave * 0.08, vx: (Math.random() - 0.5) * 1.2 });
        }
        if (e.y > H - 40) {
          lives--; document.getElementById("il").textContent = "\u2665".repeat(Math.max(0, lives));
          en.splice(i, 1); spk(e.x, e.y, "#ff2d95", 10, 3); shake = 10; combo = 0;
          if (lives <= 0) gameOver();
        }
      }

      if (boss) {
        boss.x += boss.vx;
        if (boss.x < 50 || boss.x > W - 50) boss.vx *= -1;
        boss.fr++;
        if (boss.fr > 28) {
          boss.fr = 0; boss.phase = (boss.phase + 1) % 3;
          if (boss.phase === 0) { for (var k = -2; k <= 2; k++) eb.push({ x: boss.x + k * 14, y: boss.y + 20, vy: 2.4, vx: k * 0.55 }); }
          else if (boss.phase === 1) {
            var ang = Math.atan2(ship.y - boss.y, ship.x - boss.x);
            eb.push({ x: boss.x, y: boss.y + 16, vy: Math.sin(ang) * 3.2, vx: Math.cos(ang) * 3.2 });
          } else { for (k = -1; k <= 1; k += 2) eb.push({ x: boss.x + k * 24, y: boss.y + 10, vy: 1.6, vx: k * 1.8 }); }
        }
      }

      for (i = eb.length - 1; i >= 0; i--) {
        b = eb[i]; b.x += b.vx || 0; b.y += b.vy;
        if (b.y > H + 16 || b.x < -20 || b.x > W + 20) { eb.splice(i, 1); continue; }
        if (Math.abs(b.x - ship.x) < 14 && Math.abs(b.y - ship.y) < 13) {
          if (shield) { shield = 0; shieldT = 0; spk(ship.x, ship.y, "#7cff9a", 14, 3.5); float(ship.x, ship.y - 22, "BLOCK", "#7cff9a"); }
          else {
            lives--; document.getElementById("il").textContent = "\u2665".repeat(Math.max(0, lives));
            spk(ship.x, ship.y, "#ff2d95", 12, 3.5); shake = 12; combo = 0;
            if (lives <= 0) gameOver();
          }
          eb.splice(i, 1);
        }
      }

      for (i = pow.length - 1; i >= 0; i--) {
        p = pow[i]; p.y += p.vy;
        if (p.y > H + 10) { pow.splice(i, 1); continue; }
        if (Math.abs(p.x - ship.x) < 22 && Math.abs(p.y - ship.y) < 20) {
          if (p.t === 0) wep = Math.min(3, wep + 1);
          else if (p.t === 1) { rapid = 1; setTimeout(function () { rapid = 0; }, 9000); }
          else if (p.t === 2) { spread = 1; setTimeout(function () { spread = 0; }, 11000); }
          else if (p.t === 3) { bomb = Math.min(5, bomb + 1); document.getElementById("icb").textContent = "\ud83d\udca3\u00d7" + bomb; }
          else { shield = 1; shieldT = 420; }
          spk(p.x, p.y, POW_COL[p.t], 12, 2.8); float(p.x, p.y - 16, POW_LBL[p.t], POW_COL[p.t]);
          pow.splice(i, 1);
        }
      }

      for (i = pt.length - 1; i >= 0; i--) {
        p = pt[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.life--;
        if (p.life <= 0) pt.splice(i, 1);
      }
      for (i = floatTxt.length - 1; i >= 0; i--) {
        var f = floatTxt[i]; f.y += f.vy; f.life--;
        if (f.life <= 0) floatTxt.splice(i, 1);
      }
      if (cT > 0) cT--; else combo = 0;

      if (en.length === 0 && !boss && wavePause <= 0) {
        var bonus = 50 + wave * 15; score += bonus;
        float(W / 2, H * 0.32, "CLEAR +" + bonus, "#00f5ff");
        if (wave % 3 === 0 && lives < 5) {
          lives++; document.getElementById("il").textContent = "\u2665".repeat(lives);
          float(W / 2, H * 0.4, "LIFE +1", "#ff6b9a");
        }
        wave++; spawnWave();
      }
      document.getElementById("is").textContent = score;
    }

    function draw() {
      var ox = shake ? (Math.random() - 0.5) * shake : 0;
      var oy = shake ? (Math.random() - 0.5) * shake : 0;
      if (shake > 0) shake *= 0.85; if (shake < 0.4) shake = 0;
      ctx.save(); ctx.translate(ox, oy);
      ctx.fillStyle = "#02040c"; ctx.fillRect(-10, -10, W + 20, H + 20);
      for (var si = 0; si < stars.length; si++) {
        var st = stars[si]; st.y += st.z * 0.35;
        if (st.y > H) { st.y = 0; st.x = Math.random() * W; }
        ctx.globalAlpha = 0.25 + st.z * 0.35; ctx.fillStyle = "#c8e8ff"; ctx.fillRect(st.x, st.y, st.s, st.s);
      }
      ctx.globalAlpha = 1;
      var i, b, e, p, f;
      for (i = 0; i < en.length; i++) drawInvader(en[i]);
      drawBoss();
      for (i = 0; i < bul.length; i++) {
        b = bul[i]; ctx.fillStyle = b.c; ctx.shadowColor = b.c; ctx.shadowBlur = b.big ? 16 : 6;
        if (b.big) { ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, 6.28); ctx.fill(); }
        else ctx.fillRect(b.x - 2.2, b.y - 8, 4.4, 12);
        ctx.shadowBlur = 0;
      }
      for (i = 0; i < eb.length; i++) {
        b = eb[i]; ctx.fillStyle = "#ff6b9a"; ctx.shadowColor = "#ff2d95"; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.arc(b.x, b.y, 3.2, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0;
      }
      for (i = 0; i < pow.length; i++) {
        p = pow[i]; var pulse = 7 + Math.sin(performance.now() / 120 + i) * 1.5;
        ctx.fillStyle = POW_COL[p.t]; ctx.shadowColor = POW_COL[p.t]; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(p.x, p.y, pulse, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = "#02040c"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(POW_LBL[p.t][0], p.x, p.y);
      }
      for (i = 0; i < pt.length; i++) {
        p = pt[i]; ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 2.8, 2.8);
      }
      ctx.globalAlpha = 1;
      for (i = 0; i < floatTxt.length; i++) {
        f = floatTxt[i]; ctx.globalAlpha = Math.min(1, f.life / 18); ctx.fillStyle = f.col;
        ctx.font = "bold 13px monospace"; ctx.textAlign = "center"; ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
      if (shield) {
        ctx.strokeStyle = "rgba(124,255,154," + (0.35 + Math.sin(performance.now() / 80) * 0.2) + ")";
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ship.x, ship.y, 22, 0, 6.28); ctx.stroke();
      }
      ctx.shadowColor = shield ? "#7cff9a" : "#00f5ff"; ctx.shadowBlur = 16;
      var g = ctx.createLinearGradient(ship.x, ship.y - 16, ship.x, ship.y + 14);
      g.addColorStop(0, "#ffffff"); g.addColorStop(0.3, shield ? "#7cff9a" : "#00f5ff"); g.addColorStop(1, "rgba(0,120,180,.2)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(ship.x, ship.y - 16); ctx.lineTo(ship.x - 15, ship.y + 12); ctx.lineTo(ship.x - 5, ship.y + 7); ctx.lineTo(ship.x + 5, ship.y + 7); ctx.lineTo(ship.x + 15, ship.y + 12); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0,245,255,.7)"; ctx.fillRect(ship.x - 3, ship.y + 10, 6, 3 + Math.random() * 6);
      if (charging && charge > 12) {
        ctx.strokeStyle = "rgba(255,215,0," + charge / 100 + ")"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(ship.x, ship.y - 22, 6 + charge / 16, 0, 6.28); ctx.stroke();
      }
      if (combo > 1) {
        ctx.fillStyle = combo > 6 ? "#ffd700" : "#00f5ff"; ctx.font = "bold 12px monospace"; ctx.textAlign = "left";
        ctx.fillText("COMBO \u00d7" + combo, 12, H - 18);
      }
      if (paused) {
        ctx.fillStyle = "rgba(2,4,12,.55)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#00f5ff"; ctx.font = "bold 28px monospace"; ctx.textAlign = "center"; ctx.fillText("PAUSED", W / 2, H / 2);
        ctx.font = "13px monospace"; ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillText("Space / FIRE \u00b7 B bomb \u00b7 \u2190\u2192 move", W / 2, H / 2 + 28);
      }
      ctx.restore();
    }

    function loop(ts) {
      if (!running && !over) return;
      if (!lastTs) lastTs = ts;
      var dt = ts - lastTs; lastTs = ts; if (dt > 50) dt = 50;
      update(dt); draw();
      if (running || paused) animId = requestAnimationFrame(loop);
    }

    function cleanup() {
      running = false; cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.body.style.overflow = "";
      var el = document.getElementById("g5-inv-root"); if (el) el.remove();
    }

    function onKeyDown(e) {
      keys[e.key] = true;
      if (e.key === "Escape") { e.preventDefault(); cleanup(); return; }
      if (e.key === "p" || e.key === "P") { paused = !paused; if (!paused) { lastTs = 0; loop(performance.now()); } e.preventDefault(); }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].indexOf(e.key) >= 0) e.preventDefault();
    }
    function onKeyUp(e) { keys[e.key] = false; }

    window.addEventListener("resize", resize);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    cv.addEventListener("pointerdown", function (e) {
      pointer.active = 1; pointer.x = e.clientX; pointer.y = e.clientY; pointer.fire = 1;
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    });
    cv.addEventListener("pointermove", function (e) { if (pointer.active) { pointer.x = e.clientX; pointer.y = e.clientY; } });
    cv.addEventListener("pointerup", function () { pointer.active = 0; pointer.fire = 0; });
    cv.addEventListener("pointercancel", function () { pointer.active = 0; pointer.fire = 0; });

    document.getElementById("ix").onclick = cleanup;
    document.getElementById("ipause").onclick = function () { paused = !paused; if (!paused) { lastTs = 0; loop(performance.now()); } };
    document.getElementById("ifire").addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); pointer.fire = 1; this.classList.add("active"); });
    document.getElementById("ifire").addEventListener("pointerup", function () { pointer.fire = 0; this.classList.remove("active"); });
    document.getElementById("ifire").addEventListener("pointerleave", function () { pointer.fire = 0; this.classList.remove("active"); });
    document.getElementById("ibomb").addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); doBomb(); this.classList.add("active"); });
    document.getElementById("ibomb").addEventListener("pointerup", function () { this.classList.remove("active"); });

    resize(); reset(); loop(performance.now());
  }

  window.G5Invaders = { start: launch };

  function isTrigger(v) {
    if (!v) return false;
    v = String(v).trim().toLowerCase();
    return v === "invader" || v === "invaders" || v === "\u30a4\u30f3\u30d9\u30fc\u30c0\u30fc" || v === "\u30a4\u30f3\u30d9\u30fc\u30c0" || v === "spaceinvaders" || v === "g5invaders";
  }

  function showHint() {
    var el = document.getElementById("toast");
    if (el) {
      el.textContent = "\ud83d\ude80 INVADERS \u8d77\u52d5\u2026";
      el.classList.remove("hidden"); el.classList.add("show");
      setTimeout(function () { el.classList.remove("show"); }, 1100);
    }
  }

  function boot() {
    var hex = document.getElementById("hex-input") || document.querySelector('input[type="text"]');
    if (hex) {
      function onHex() { if (isTrigger(hex.value)) { showHint(); setTimeout(launch, 80); } }
      hex.addEventListener("input", onHex); hex.addEventListener("change", onHex);
      hex.addEventListener("keydown", function (e) { if (e.key === "Enter") onHex(); });
    }
    document.addEventListener("click", function () {
      var t = document.getElementById("hex-input") || document.querySelector('input[type="text"]');
      if (t && isTrigger(t.value)) setTimeout(launch, 60);
    });
    var sw = document.getElementById("swatch") || document.querySelector(".swatch");
    if (sw) {
      var taps = 0, t2;
      sw.addEventListener("click", function () {
        taps++; clearTimeout(t2); t2 = setTimeout(function () { taps = 0; }, 900);
        if (taps >= 5) { taps = 0; showHint(); launch(); }
      });
    }
    var buf = "";
    document.addEventListener("keydown", function (e) {
      if (e.key.length !== 1) return;
      buf += e.key.toLowerCase(); if (buf.length > 12) buf = buf.slice(-12);
      if (buf.indexOf("invader") >= 0 || buf.indexOf("invaders") >= 0) { buf = ""; showHint(); setTimeout(launch, 60); }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
