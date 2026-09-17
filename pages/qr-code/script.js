(function () {
  "use strict";
  var mode = "create";
  var qrHost = document.getElementById("qr-out");
  var textEl = document.getElementById("qr-text");
  var sizeEl = document.getElementById("qr-size");
  var sizeVal = document.getElementById("size-val");
  var fgEl = document.getElementById("qr-fg");
  var bgEl = document.getElementById("qr-bg");
  var btnExport = document.getElementById("btn-export");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var stream = null;
  var scanRaf = null;
  var lastQr = null;

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll(".mode-tab").forEach(function (t) {
      var on = t.getAttribute("data-mode") === m;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.getElementById("panel-create").classList.toggle("hidden", m !== "create");
    document.getElementById("panel-read").classList.toggle("hidden", m !== "read");
    if (m !== "read") stopCam();
  }

  document.querySelectorAll(".mode-tab").forEach(function (tab) {
    tab.addEventListener("click", function () { setMode(tab.getAttribute("data-mode")); });
  });

  sizeEl.addEventListener("input", function () { sizeVal.textContent = sizeEl.value; });

  function generate() {
    var text = (textEl.value || "").trim();
    if (!text) { showToast("\u30c6\u30ad\u30b9\u30c8\u3092\u5165\u529b"); return; }
    var size = +sizeEl.value || 256;
    qrHost.innerHTML = "";
    btnExport.disabled = true;
    lastQr = null;

    if (typeof QRCode === "undefined") {
      var img = document.createElement("img");
      img.alt = "QR";
      img.width = size;
      img.height = size;
      img.src = "https://chart.googleapis.com/chart?cht=qr&chs=" + size + "x" + size + "&chl=" + encodeURIComponent(text) + "&chld=M|1";
      img.onload = function () { lastQr = img; btnExport.disabled = false; };
      img.onerror = function () { showToast("QR fallback failed"); };
      qrHost.appendChild(img);
      return;
    }

    try {
      var div = document.createElement("div");
      qrHost.appendChild(div);
      new QRCode(div, {
        text: text, width: size, height: size,
        colorDark: fgEl.value, colorLight: bgEl.value,
        correctLevel: QRCode.CorrectLevel.M
      });
      setTimeout(function () {
        var canvas = div.querySelector("canvas");
        var img = div.querySelector("img");
        lastQr = canvas || img;
        btnExport.disabled = !lastQr;
      }, 50);
    } catch (e) {
      showToast("gen fail: " + (e.message || e));
    }
  }

  function exportPng() {
    if (!lastQr) return;
    var a = document.createElement("a");
    a.download = "g5-qr-" + Date.now() + ".png";
    if (lastQr.tagName === "CANVAS") {
      a.href = lastQr.toDataURL("image/png");
    } else if (lastQr.tagName === "IMG") {
      try {
        var c = document.createElement("canvas");
        c.width = lastQr.naturalWidth || lastQr.width;
        c.height = lastQr.naturalHeight || lastQr.height;
        c.getContext("2d").drawImage(lastQr, 0, 0);
        a.href = c.toDataURL("image/png");
      } catch (e) {
        a.href = lastQr.src;
        a.target = "_blank";
      }
    } else return;
    a.click();
    showToast("PNG saved");
  }

  document.getElementById("btn-gen").addEventListener("click", generate);
  btnExport.addEventListener("click", exportPng);

  var fileEl = document.getElementById("qr-file");
  var preview = document.getElementById("qr-preview");
  var resultEl = document.getElementById("read-result");
  var btnCopy = document.getElementById("btn-copy-read");
  var video = document.getElementById("qr-video");
  var canvas = document.getElementById("qr-canvas");
  var ctx = canvas.getContext("2d", { willReadFrequently: true });

  function setResult(text) {
    resultEl.textContent = text || "";
    btnCopy.classList.toggle("hidden", !text);
  }

  function decodeImageData(imageData) {
    if (typeof jsQR === "undefined") {
      setResult("jsQR not loaded");
      return null;
    }
    var code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
    return code ? code.data : null;
  }

  function decodeFromFile(file) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      preview.src = url;
      preview.classList.remove("hidden");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var text = decodeImageData(data);
      setResult(text || "QR not found");
      if (text) showToast("OK");
    };
    img.src = url;
  }

  fileEl.addEventListener("change", function () {
    if (fileEl.files && fileEl.files[0]) decodeFromFile(fileEl.files[0]);
  });

  function stopCam() {
    if (scanRaf) { cancelAnimationFrame(scanRaf); scanRaf = null; }
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    video.classList.add("hidden");
    video.srcObject = null;
    document.getElementById("btn-stop-cam").classList.add("hidden");
  }

  function scanFrame() {
    if (!stream || video.readyState !== video.HAVE_ENOUGH_DATA) {
      scanRaf = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var text = decodeImageData(data);
    if (text) {
      setResult(text);
      showToast("OK");
      stopCam();
      return;
    }
    scanRaf = requestAnimationFrame(scanFrame);
  }

  document.getElementById("btn-cam").addEventListener("click", function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast("no camera");
      return;
    }
    stopCam();
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(function (s) {
        stream = s;
        video.srcObject = s;
        video.classList.remove("hidden");
        document.getElementById("btn-stop-cam").classList.remove("hidden");
        video.play();
        scanRaf = requestAnimationFrame(scanFrame);
      })
      .catch(function () { showToast("camera fail"); });
  });

  document.getElementById("btn-stop-cam").addEventListener("click", stopCam);

  btnCopy.addEventListener("click", function () {
    var t = resultEl.textContent;
    if (!t) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { showToast("copied"); });
    }
  });
})();
