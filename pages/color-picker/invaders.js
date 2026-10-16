(function () {
  "use strict";
  if (window.__G5_INV_V7__) return;
  window.__G5_INV_V7__ = true;

  function launch() {
    if (document.getElementById("g5-inv-root")) return;

    var root = document.createElement("div");
    root.id = "g5-inv-root";
    root.innerHTML =
      '<div class="ih">' +
      '<span class="it">G5 INVADERS</span>' +
      '<span class="is" id="is">0</span>' +
      '<span class="icb" id="icb"></span>' +
      '<span class="iw" id="iw">WAVE 1</span>' +
      '<span class="il" id="il">♥♥♥♥♥</span>' +
      '<button type="button" id="ix" class="ib" aria-label="close">×</button></div>' +
      '<canvas id="ic"></canvas>' +
      '<div id="io" class="io hidden"></div>' +
      '<div id="iwv" class="iwv"></div>';

    if (!document.getElementById("g5invcss")) {
      var st = document.createElement("style");
      st.id = "g5invcss";
      st.textContent =
        "#g5-inv-root{position:fixed;inset:0;z-index:100100;background:#010008;overflow:hidden;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}" +
        "#g5-inv-root::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:3;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,245,255,.025) 2px,rgba(0,245,255,.025) 4px),radial-gradient(ellipse at 50% 100%,rgba(255,45,149,.1),transparent 55%),radial-gradient(ellipse at 50% 0%,rgba(0,245,255,.07),transparent 40%)}" +
        ".ih{position:absolute;top:0;left:0;right:0;z-index:5;display:flex;align-items:center;gap:.45rem;padding:max(.45rem,env(safe-area-inset-top)) .8rem .35rem;background:linear-gradient(180deg,rgba(0,0,0,.88),transparent);flex-wrap:wrap}" +
        ".it{font-weight:900;letter-spacing:.2em;font-size:clamp(.9rem,2.8vw,1.15rem);margin-right:auto;background:linear-gradient(90deg,#ff2d95,#00f5ff,#ffd700,#a855f7,#ff2d95);background-size:240% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:ich 2.8s linear infinite;filter:drop-shadow(0 0 8px rgba(255,45,149,.35))}" +
        "@keyframes ich{to{background-position:240% center}}" +
        ".is,.iw,.il,.icb{font-size:.7rem;color:#00f5ff;text-shadow:0 0 8px rgba(0,245,255,.45)}.il{color:#ff6b9a}.icb{color:#ffd700;min-width:3.2rem}" +
        ".ib{border:1px solid rgba(255,45,149,.5);background:rgba(255,45,149,.12);color:#ff8cc8;border-radius:6px;padding:.15rem .5rem;cursor:pointer;font-size:.85rem}" +
        "#ic{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}" +
        ".io{position:absolute;inset:0;z-index:12;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(1,0,8,.93);backdrop-filter:blur(10px);text-align:center;color:#e8f7ff}" +
        ".io h2{letter-spacing:.25em;font-size:clamp(1.4rem,4.5vw,2.2rem);color:#00f5ff;text-shadow:0 0 28px #00f5ff,0 0 50px #ff2d95;margin:0 0 .4rem}" +
        ".io.hidden{display:none}" +
        ".io button{margin:.35rem;padding:.45rem 1.3rem;border:1px solid #00f5ff;background:rgba(0,245,255,.12);color:#00f5ff;border-radius:8px;cursor:pointer;font-family:inherit;letter-spacing:.08em;font-size:.95rem}" +
        ".iwv{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);z-index:8;font-size:clamp(1.1rem,3.8vw,1.9rem);letter-spacing:.28em;color:#00f5ff;text-shadow:0 0 18px #00f5ff;opacity:0;pointer-events:none;font-weight:900;transition:opacity .25s}" +
        ".iwv.show{opacity:1}";
      document.head.appendChild(st);
    }
    document.body.appendChild(root);

    var cv = document.getElementById("ic");
    var ctx = cv.getContext("2d");
    var W, H;
    var ship = { x: 0, y: 0, spd: 7.5 };
    var bul = [], eb = [], en = [], pow = [], pt = [], floatTxt = [];
    var score = 0, lives = 5, wave = 1, combo = 0, cT = 0, bestCombo = 0;
    var wep = 1, rapid = 0, shield = 0, bomb = 1, spread = 0, charge = 0, charging = 0;
    var keys = {}, mx = 0, my = 0, touch = 0, raf = 0, alive = 1, over = 0, boss = null, shake = 0, stars = [];
    var autoFire = 0, fireCd = 0, wavePause = 0;

    function resize() {
      W = cv.width = window.innerWidth;
      H = cv.height = window.innerHeight;
      if (!ship.x) { ship.x = W / 2; ship.y = H - 72; }
      stars = [];
      for (var i = 0; i < 80; i++) {
        stars.push({ x: Math.random() * W, y: Math.random() * H, s: 0.4 + Math.random() * 1.8, v: 0.2 + Math.random() * 1.3 });
      }
    }

    function spk(x, y, c, n, spd) {
      for (var i = 0; i < (n || 8); i++) {
        var a = Math.random() * 6.28;
        var s = (spd || 2) + Math.random() * 2.8;
        pt.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 14 + Math.random() * 20, max: 34, c: c || "#00f5ff" });
      }
    }

    function float(x, y, text, col) {
      floatTxt.push({ x: x, y: y, text: text, col: col || "#ffd700", life: 40, vy: -1.2 });
    }

    function spawnWave() {
      en = [];
      var rows = 2 + Math.min(3, Math.floor((wave - 1) / 2));
      var cols = 5 + Math.min(5, Math.floor(wave / 2));
      var gapX = W / (cols + 1);
      var gapY = 42;
      var baseSpd = 0.55 + wave * 0.08;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var t = r % 3;
          en.push({
            x: gapX * (c + 1),
            y: 55 + r * gapY,
            vx: baseSpd * (c % 2 === 0 ? 1 : -1) * 0.3 + baseSpd,
            baseVx: baseSpd,
            vy: 0,
            hp: 1 + (wave > 5 && t === 2 ? 1 : 0),
            t: t, w: 24, h: 17, fr: Math.random() * 40
          });
        }
      }
      if (wave > 0 && wave % 5 === 0) {
        boss = { x: W / 2, y: 75, hp: 12 + wave * 3, max: 12 + wave * 3, vx: 1.1, fr: 0 };
      }
      var wv = document.getElementById("iwv");
      if (wv) {
        wv.textContent = "WAVE " + wave;
        wv.classList.add("show");
        setTimeout(function () { wv.classList.remove("show"); }, 900);
      }
      var iw = document.getElementById("iw");
      if (iw) iw.textContent = "WAVE " + wave;
      wavePause = 45;
    }

    function fire() {
      if (over || fireCd > 0) return;
      fireCd = rapid ? 5 : (wep >= 2 ? 8 : 11);
      var n = spread ? 3 : 1;
      var sp = spread ? 14 : 0;
      for (var i = 0; i < n; i++) {
        var dx = (i - (n - 1) / 2) * sp;
        bul.push({ x: ship.x + dx, y: ship.y - 16, vx: dx * 0.08, vy: -11 - (wep > 1 ? 1.5 : 0), dmg: wep, c: wep > 1 ? "#ffd700" : "#00f5ff" });
      }
      if (wep >= 3) {
        bul.push({ x: ship.x - 10, y: ship.y - 10, vx: -1.5, vy: -9, dmg: 1, c: "#a855f7" });
        bul.push({ x: ship.x + 10, y: ship.y - 10, vx: 1.5, vy: -9, dmg: 1, c: "#a855f7" });
      }
    }

    function update() {
      if (over) return;
      if (wavePause > 0) { wavePause--; return; }

      if (keys["ArrowLeft"] || keys["a"] || keys["A"]) ship.x -= ship.spd;
      if (keys["ArrowRight"] || keys["d"] || keys["D"]) ship.x += ship.spd;
      if (touch) {
        ship.x += (mx - ship.x) * 0.22;
        ship.y = Math.max(H * 0.5, Math.min(H - 36, my));
      } else {
        ship.y = H - 72;
      }
      ship.x = Math.max(18, Math.min(W - 18, ship.x));

      if (keys[" "] || keys["ArrowUp"] || autoFire) {
        if (!charging) fire();
      }
      if (keys[" "] || keys["ArrowUp"]) {
        charge = Math.min(100, charge + 1.8);
        if (charge >= 100) {
          charge = 0;
          bul.push({ x: ship.x, y: ship.y - 22, vx: 0, vy: -15, dmg: 4, c: "#ffd700", big: 1 });
          spk(ship.x, ship.y - 22, "#ffd700", 14, 4);
          float(ship.x, ship.y - 40, "CHARGE!", "#ffd700");
        }
        charging = 1;
      } else {
        charge = Math.max(0, charge - 4);
        charging = 0;
      }

      if ((keys["b"] || keys["B"] || keys["x"] || keys["X"]) && bomb > 0) {
        bomb--;
        keys["b"] = keys["B"] = keys["x"] = keys["X"] = false;
        for (var i = en.length - 1; i >= 0; i--) {
          score += 25;
          spk(en[i].x, en[i].y, "#ff2d95", 12, 3.5);
          en.splice(i, 1);
        }
        if (boss) {
          boss.hp -= 10;
          spk(boss.x, boss.y, "#ff2d95", 20, 5);
        }
        shake = 16;
        float(W / 2, H / 2, "BOMB!", "#ff2d95");
      }

      if (fireCd > 0) fireCd--;

      var i, j, b, e, p;
      for (i = bul.length - 1; i >= 0; i--) {
        b = bul[i];
        b.x += b.vx; b.y += b.vy;
        if (b.y < -24 || b.x < -24 || b.x > W + 24) { bul.splice(i, 1); continue; }
        for (j = en.length - 1; j >= 0; j--) {
          e = en[j];
          if (Math.abs(b.x - e.x) < e.w / 2 + 5 && Math.abs(b.y - e.y) < e.h / 2 + 5) {
            e.hp -= b.dmg;
            bul.splice(i, 1);
            spk(e.x, e.y, e.t === 2 ? "#ff2d95" : "#00f5ff", 5, 2);
            if (e.hp <= 0) {
              var pts = 10 + combo * 2;
              score += pts;
              combo++;
              if (combo > bestCombo) bestCombo = combo;
              cT = 100;
              float(e.x, e.y, "+" + pts, combo > 4 ? "#ffd700" : "#00f5ff");
              en.splice(j, 1);
              if (Math.random() < 0.22) {
                pow.push({ x: e.x, y: e.y, t: Math.floor(Math.random() * 5), vy: 1.4 });
              }
            }
            break;
          }
        }
        if (boss && Math.abs(b.x - boss.x) < 30 && Math.abs(b.y - boss.y) < 24) {
          boss.hp -= b.dmg;
          bul.splice(i, 1);
          spk(b.x, b.y, "#ffd700", 6, 2.5);
          if (boss.hp <= 0) {
            score += 300 + wave * 20;
            spk(boss.x, boss.y, "#ff2d95", 30, 6);
            float(boss.x, boss.y, "BOSS DOWN +300", "#ff2d95");
            bomb = Math.min(3, bomb + 1);
            boss = null;
            wave++;
            score += 50;
            spawnWave();
          }
        }
      }

      for (i = en.length - 1; i >= 0; i--) {
        e = en[i];
        e.x += e.vx;
        if (e.x < 22 || e.x > W - 22) {
          e.vx *= -1;
          e.y += 10;
        }
        e.fr++;
        if (e.fr > 70 + Math.random() * 50) {
          e.fr = 0;
          if (Math.random() < 0.22 + wave * 0.02) {
            eb.push({ x: e.x, y: e.y + 8, vy: 1.8 + wave * 0.1, vx: (Math.random() - 0.5) * 0.8 });
          }
        }
        if (e.y > H - 50) {
          lives--;
          document.getElementById("il").textContent = "♥".repeat(Math.max(0, lives));
          en.splice(i, 1);
          spk(e.x, e.y, "#ff2d95", 8, 2.5);
          shake = 8;
          if (lives <= 0) gameOver();
        }
      }

      if (boss) {
        boss.x += boss.vx;
        if (boss.x < 45 || boss.x > W - 45) boss.vx *= -1;
        boss.fr++;
        if (boss.fr > 35) {
          boss.fr = 0;
          for (var k = -1; k <= 1; k++) {
            eb.push({ x: boss.x + k * 16, y: boss.y + 18, vy: 2.2, vx: k * 0.7 });
          }
        }
      }

      for (i = eb.length - 1; i >= 0; i--) {
        b = eb[i];
        b.x += b.vx || 0;
        b.y += b.vy;
        if (b.y > H + 12) { eb.splice(i, 1); continue; }
        if (Math.abs(b.x - ship.x) < 13 && Math.abs(b.y - ship.y) < 12) {
          if (shield) {
            shield = 0;
            spk(ship.x, ship.y, "#7cff9a", 12, 3);
            float(ship.x, ship.y - 20, "BLOCK", "#7cff9a");
          } else {
            lives--;
            document.getElementById("il").textContent = "♥".repeat(Math.max(0, lives));
            spk(ship.x, ship.y, "#ff2d95", 10, 3);
            shake = 10;
            combo = 0;
            if (lives <= 0) gameOver();
          }
          eb.splice(i, 1);
        }
      }

      for (i = pow.length - 1; i >= 0; i--) {
        p = pow[i];
        p.y += p.vy;
        if (p.y > H) { pow.splice(i, 1); continue; }
        if (Math.abs(p.x - ship.x) < 20 && Math.abs(p.y - ship.y) < 18) {
          var labels = ["WEAPON UP", "RAPID", "SPREAD", "BOMB +1", "SHIELD"];
          if (p.t === 0) wep = Math.min(3, wep + 1);
          else if (p.t === 1) { rapid = 1; setTimeout(function () { rapid = 0; }, 10000); }
          else if (p.t === 2) { spread = 1; setTimeout(function () { spread = 0; }, 12000); }
          else if (p.t === 3) bomb = Math.min(5, bomb + 1);
          else shield = 1;
          spk(p.x, p.y, "#ffd700", 10, 2.5);
          float(p.x, p.y - 15, labels[p.t], "#ffd700");
          pow.splice(i, 1);
        }
      }

      for (i = pt.length - 1; i >= 0; i--) {
        p = pt[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) pt.splice(i, 1);
      }
      for (i = floatTxt.length - 1; i >= 0; i--) {
        var f = floatTxt[i];
        f.y += f.vy; f.life--;
        if (f.life <= 0) floatTxt.splice(i, 1);
      }

      if (cT > 0) cT--; else combo = 0;

      if (en.length === 0 && !boss && wavePause <= 0) {
        score += 40 + wave * 10;
        float(W / 2, H * 0.35, "WAVE CLEAR +" + (40 + wave * 10), "#00f5ff");
        if (wave % 3 === 0 && lives < 5) {
          lives++;
          document.getElementById("il").textContent = "♥".repeat(lives);
          float(W / 2, H * 0.42, "LIFE +1", "#ff6b9a");
        }
        wave++;
        spawnWave();
      }

      document.getElementById("is").textContent = score;
      var cb = document.getElementById("icb");
      if (cb) cb.textContent = combo > 1 ? "×" + combo : "";
    }

    function draw() {
      ctx.save();
      if (shake > 0) {
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        shake *= 0.82;
      }
      ctx.fillStyle = "#010008";
      ctx.fillRect(0, 0, W, H);

      var i, s, e, b, p, f;
      for (i = 0; i < stars.length; i++) {
        s = stars[i];
        s.y += s.v;
        if (s.y > H) s.y = 0;
        ctx.fillStyle = "rgba(190,210,255," + (0.2 + s.s * 0.22) + ")";
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }

      for (i = 0; i < en.length; i++) {
        e = en[i];
        ctx.fillStyle = e.t === 0 ? "#00f5ff" : e.t === 1 ? "#a855f7" : "#ff2d95";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 7;
        ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.fillRect(e.x - 5, e.y - 3, 3, 3);
        ctx.fillRect(e.x + 2, e.y - 3, 3, 3);
      }

      if (boss) {
        ctx.fillStyle = "#ff2d95";
        ctx.shadowColor = "#ff2d95";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(boss.x, boss.y - 22);
        ctx.lineTo(boss.x - 32, boss.y + 16);
        ctx.lineTo(boss.x + 32, boss.y + 16);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.fillRect(boss.x - 13, boss.y - 8, 8, 6);
        ctx.fillRect(boss.x + 5, boss.y - 8, 8, 6);
        ctx.fillStyle = "rgba(255,45,149,.5)";
        ctx.fillRect(boss.x - 42, boss.y - 30, 84 * (boss.hp / boss.max), 5);
      }

      for (i = 0; i < bul.length; i++) {
        b = bul[i];
        ctx.fillStyle = b.c;
        ctx.shadowColor = b.c;
        ctx.shadowBlur = b.big ? 14 : 5;
        if (b.big) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, 7, 0, 6.28);
          ctx.fill();
        } else {
          ctx.fillRect(b.x - 2, b.y - 7, 4, 11);
        }
        ctx.shadowBlur = 0;
      }

      for (i = 0; i < eb.length; i++) {
        b = eb[i];
        ctx.fillStyle = "#ff6b9a";
        ctx.fillRect(b.x - 2, b.y, 4, 7);
      }

      var cols = ["#ffd700", "#a855f7", "#00f5ff", "#ff2d95", "#7cff9a"];
      for (i = 0; i < pow.length; i++) {
        p = pow[i];
        ctx.fillStyle = cols[p.t];
        ctx.shadowColor = cols[p.t];
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, 6.28);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      for (i = 0; i < pt.length; i++) {
        p = pt[i];
        ctx.globalAlpha = p.life / p.max;
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, 2.5, 2.5);
      }
      ctx.globalAlpha = 1;

      for (i = 0; i < floatTxt.length; i++) {
        f = floatTxt[i];
        ctx.globalAlpha = Math.min(1, f.life / 20);
        ctx.fillStyle = f.col;
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;

      ctx.shadowColor = shield ? "#7cff9a" : "#00f5ff";
      ctx.shadowBlur = 14;
      var g = ctx.createLinearGradient(ship.x, ship.y - 15, ship.x, ship.y + 12);
      g.addColorStop(0, "#fff");
      g.addColorStop(0.35, shield ? "#7cff9a" : "#00f5ff");
      g.addColorStop(1, "rgba(0,245,255,.15)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ship.x, ship.y - 15);
      ctx.lineTo(ship.x - 16, ship.y + 12);
      ctx.lineTo(ship.x - 5, ship.y + 7);
      ctx.lineTo(ship.x + 5, ship.y + 7);
      ctx.lineTo(ship.x + 16, ship.y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0,245,255,.55)";
      ctx.fillRect(ship.x - 3, ship.y + 9, 6, 3 + Math.random() * 5);

      if (charging && charge > 15) {
        ctx.strokeStyle = "rgba(255,215,0," + (charge / 100) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y - 22, 7 + charge / 18, 0, 6.28);
        ctx.stroke();
      }

      var hud = [];
      if (wep > 1) hud.push("W" + wep);
      if (rapid) hud.push("RAPID");
      if (spread) hud.push("SPREAD");
      if (bomb) hud.push("💣" + bomb);
      if (shield) hud.push("🛡");
      if (hud.length) {
        ctx.fillStyle = "rgba(0,245,255,.65)";
        ctx.font = "11px monospace";
        ctx.textAlign = "left";
        ctx.fillText(hud.join("  "), 10, H - 12);
      }
      ctx.restore();
    }

    function gameOver() {
      over = 1;
      var o = document.getElementById("io");
      o.classList.remove("hidden");
      o.innerHTML =
        "<h2>GAME OVER</h2>" +
        '<p style="color:rgba(232,247,255,.85);margin:.3rem 0">Score ' + score + " · Wave " + wave + "</p>" +
        '<p style="color:rgba(255,215,0,.7);font-size:.85rem">Best Combo ×' + bestCombo + "</p>" +
        '<button type="button" id="ir">RETRY</button>';
      document.getElementById("ir").onclick = function () {
        o.classList.add("hidden");
        reset();
      };
    }

    function reset() {
      score = 0; lives = 5; wave = 1; combo = 0; bestCombo = 0;
      wep = 1; rapid = 0; spread = 0; shield = 0; bomb = 1; charge = 0;
      over = 0; en = []; bul = []; eb = []; pow = []; boss = null; floatTxt = [];
      document.getElementById("is").textContent = "0";
      document.getElementById("iw").textContent = "WAVE 1";
      document.getElementById("il").textContent = "♥♥♥♥♥";
      document.getElementById("icb").textContent = "";
      spawnWave();
    }

    function loop() {
      if (!alive) return;
      update();
      draw();
      raf = requestAnimationFrame(loop);
    }

    function onKey(e) {
      keys[e.key] = e.type === "keydown";
      if (e.key === "Escape") { cleanup(); return; }
      if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) >= 0) e.preventDefault();
    }

    function cleanup() {
      alive = 0;
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKey);
      window.removeEventListener("resize", resize);
      if (root.parentNode) root.parentNode.removeChild(root);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKey);
    window.addEventListener("resize", resize);
    cv.addEventListener("pointerdown", function (e) {
      touch = 1; mx = e.clientX; my = e.clientY; autoFire = 1;
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener("pointermove", function (e) {
      if (touch) { mx = e.clientX; my = e.clientY; }
    });
    cv.addEventListener("pointerup", function () { touch = 0; autoFire = 0; });
    document.getElementById("ix").onclick = cleanup;
    resize();
    reset();
    loop();
  }

  window.G5Invaders = { start: launch };

  function isTrigger(v) {
    if (!v) return false;
    v = String(v).trim().toLowerCase();
    return (
      v === "invader" || v === "invaders" ||
      v === "インベーダー" || v === "インベーダ" ||
      v === "spaceinvaders" || v === "g5invaders"
    );
  }

  function showHint() {
    var el = document.getElementById("toast");
    if (el) {
      el.textContent = "🚀 INVADERS 起動…";
      el.classList.remove("hidden");
      el.classList.add("show");
      setTimeout(function () { el.classList.remove("show"); }, 1100);
    }
  }

  function boot() {
    var hex = document.getElementById("hex-input") || document.querySelector('input[type="text"]');
    if (hex) {
      function onHex() {
        if (isTrigger(hex.value)) {
          showHint();
          setTimeout(launch, 80);
        }
      }
      hex.addEventListener("input", onHex);
      hex.addEventListener("change", onHex);
      hex.addEventListener("keydown", function (e) {
        if (e.key === "Enter") onHex();
      });
    }
    document.addEventListener("click", function () {
      var t = document.getElementById("hex-input") || document.querySelector('input[type="text"]');
      if (t && isTrigger(t.value)) setTimeout(launch, 60);
    });
    var sw = document.getElementById("swatch") || document.querySelector(".swatch");
    if (sw) {
      var taps = 0, t2;
      sw.addEventListener("click", function () {
        taps++;
        clearTimeout(t2);
        t2 = setTimeout(function () { taps = 0; }, 900);
        if (taps >= 5) {
          taps = 0;
          showHint();
          launch();
        }
      });
    }
    var buf = "";
    document.addEventListener("keydown", function (e) {
      if (e.key.length !== 1) return;
      buf += e.key.toLowerCase();
      if (buf.length > 12) buf = buf.slice(-12);
      if (buf.indexOf("invader") >= 0 || buf.indexOf("invaders") >= 0) {
        buf = "";
        showHint();
        setTimeout(launch, 60);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
