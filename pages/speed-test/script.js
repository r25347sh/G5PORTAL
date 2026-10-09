/**
 * 速度チェッカー — ping / download / upload (client-side approx)
 */
(function () {
  "use strict";

  var btnStart = document.getElementById("btn-start");
  var gaugeValue = document.getElementById("gauge-value");
  var gaugeUnit = document.getElementById("gauge-unit");
  var gaugeLabel = document.getElementById("gauge-label");
  var gaugeArc = document.getElementById("gauge-arc");
  var phaseDots = document.getElementById("phase-dots");
  var mPing = document.getElementById("m-ping");
  var mDl = document.getElementById("m-dl");
  var mUl = document.getElementById("m-ul");
  var mJitter = document.getElementById("m-jitter");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var running = false;

  var ARC_LEN = 251.3;
  var MAX_GAUGE_MBPS = 200;

  var DL_URLS = [
    "https://speed.cloudflare.com/__down?bytes=2500000",
    "https://speed.cloudflare.com/__down?bytes=5000000",
    "https://speed.cloudflare.com/__down?bytes=10000000"
  ];
  var PING_URL = "https://speed.cloudflare.com/__down?bytes=0";
  var UL_URL = "https://speed.cloudflare.com/__up";

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
      setTimeout(function () {
        toastEl.classList.add("hidden");
      }, 280);
    }, 2000);
  }

  function setPhase(name) {
    var dots = phaseDots.querySelectorAll(".dot");
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      d.classList.remove("active");
      if (d.getAttribute("data-phase") === name) {
        d.classList.add("active");
      }
    }
  }

  function markDone(name) {
    var d = phaseDots.querySelector('[data-phase="' + name + '"]');
    if (d) {
      d.classList.remove("active");
      d.classList.add("done");
    }
  }

  function resetPhases() {
    var dots = phaseDots.querySelectorAll(".dot");
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.remove("active", "done");
    }
  }

  function setGauge(mbps, label, unit) {
    var v = Math.max(0, mbps);
    var pct = Math.min(1, v / MAX_GAUGE_MBPS);
    gaugeArc.style.strokeDashoffset = String(ARC_LEN * (1 - pct));
    gaugeValue.textContent = isFinite(v) ? (v < 10 ? v.toFixed(1) : Math.round(v)) : "—";
    gaugeUnit.textContent = unit || "Mbps";
    gaugeLabel.textContent = label || "";
  }

  function formatMs(ms) {
    if (!isFinite(ms)) return "—";
    return ms < 10 ? ms.toFixed(1) : Math.round(ms);
  }

  function formatMbps(mbps) {
    if (!isFinite(mbps)) return "—";
    return mbps < 10 ? mbps.toFixed(2) : mbps.toFixed(1);
  }

  function measurePing(count) {
    count = count || 5;
    var times = [];
    var i = 0;

    function one() {
      var t0 = performance.now();
      return fetch(PING_URL + "&t=" + Date.now() + "&r=" + Math.random(), {
        method: "GET",
        cache: "no-store",
        mode: "cors"
      }).then(function () {
        times.push(performance.now() - t0);
      }).catch(function () {
        times.push(NaN);
      });
    }

    function next() {
      if (i >= count) {
        var valid = times.filter(function (t) { return isFinite(t); });
        if (!valid.length) return Promise.resolve({ ping: NaN, jitter: NaN });
        valid.sort(function (a, b) { return a - b; });
        var median = valid[Math.floor(valid.length / 2)];
        var mean = valid.reduce(function (s, v) { return s + v; }, 0) / valid.length;
        var jitter = 0;
        for (var j = 0; j < valid.length; j++) jitter += Math.abs(valid[j] - mean);
        jitter = jitter / valid.length;
        return Promise.resolve({ ping: median, jitter: jitter });
      }
      i++;
      return one().then(next);
    }
    return next();
  }

  function measureDownload() {
    var results = [];
    var idx = 0;

    function one(url) {
      var t0 = performance.now();
      return fetch(url + "&t=" + Date.now() + "&r=" + Math.random(), {
        method: "GET",
        cache: "no-store",
        mode: "cors"
      }).then(function (res) {
        return res.blob().then(function (blob) {
          var dt = (performance.now() - t0) / 1000;
          var mbps = ((blob.size * 8) / dt) / 1e6;
          results.push(mbps);
          setGauge(mbps, "ダウンロード中", "Mbps");
        });
      }).catch(function () {
        results.push(NaN);
      });
    }

    function next() {
      if (idx >= DL_URLS.length) {
        var valid = results.filter(function (v) { return isFinite(v) && v > 0; });
        if (!valid.length) return Promise.resolve(NaN);
        valid.sort(function (a, b) { return a - b; });
        return Promise.resolve(valid[Math.floor(valid.length / 2)]);
      }
      return one(DL_URLS[idx++]).then(next);
    }
    return next();
  }

  function measureUpload() {
    var sizes = [256 * 1024, 512 * 1024, 1024 * 1024];
    var results = [];
    var idx = 0;

    function makePayload(bytes) {
      var arr = new Uint8Array(bytes);
      for (var i = 0; i < bytes; i += 4096) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    }

    function one(size) {
      var payload = makePayload(size);
      var t0 = performance.now();
      return fetch(UL_URL + "?t=" + Date.now(), {
        method: "POST",
        cache: "no-store",
        mode: "cors",
        body: payload,
        headers: { "Content-Type": "application/octet-stream" }
      }).then(function () {
        var dt = (performance.now() - t0) / 1000;
        var mbps = ((size * 8) / dt) / 1e6;
        results.push(mbps);
        setGauge(mbps, "アップロード中", "Mbps");
      }).catch(function () {
        results.push(NaN);
      });
    }

    function next() {
      if (idx >= sizes.length) {
        var valid = results.filter(function (v) { return isFinite(v) && v > 0; });
        if (!valid.length) return Promise.resolve(NaN);
        valid.sort(function (a, b) { return a - b; });
        return Promise.resolve(valid[Math.floor(valid.length / 2)]);
      }
      return one(sizes[idx++]).then(next);
    }
    return next();
  }

  function run() {
    if (running) return;
    running = true;
    btnStart.disabled = true;
    btnStart.textContent = "計測中…";
    resetPhases();
    mPing.textContent = "—";
    mDl.textContent = "—";
    mUl.textContent = "—";
    mJitter.textContent = "—";
    setGauge(0, "開始…", "Mbps");

    setPhase("ping");
    gaugeLabel.textContent = "Ping 計測中";
    measurePing(6)
      .then(function (r) {
        mPing.textContent = formatMs(r.ping);
        mJitter.textContent = formatMs(r.jitter);
        markDone("ping");
        setPhase("download");
        return measureDownload();
      })
      .then(function (dl) {
        mDl.textContent = formatMbps(dl);
        markDone("download");
        setGauge(isFinite(dl) ? dl : 0, "DL 完了", "Mbps");
        setPhase("upload");
        return measureUpload();
      })
      .then(function (ul) {
        mUl.textContent = formatMbps(ul);
        markDone("upload");
        var finalVal = isFinite(ul) ? ul : (parseFloat(mDl.textContent) || 0);
        setGauge(finalVal, "完了", "Mbps");
        gaugeLabel.textContent = "計測完了";
        showToast("計測が完了しました");
      })
      .catch(function (err) {
        console.error(err);
        gaugeLabel.textContent = "エラー";
        showToast("計測に失敗しました。ネットワークを確認してください");
      })
      .finally(function () {
        running = false;
        btnStart.disabled = false;
        btnStart.textContent = "再計測";
      });
  }

  btnStart.addEventListener("click", run);
  setGauge(0, "待機中", "Mbps");
})();
