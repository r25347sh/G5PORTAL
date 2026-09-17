(function () {
  "use strict";
  var CHUNK = 16 * 1024;
  var peer = null, conn = null, selectedFile = null;
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var fileInput = document.getElementById("file-input");
  var fileMeta = document.getElementById("file-meta");
  var btnSendStart = document.getElementById("btn-send-start");
  var btnSendStop = document.getElementById("btn-send-stop");
  var sendInfo = document.getElementById("send-info");
  var shareUrl = document.getElementById("share-url");
  var qrBox = document.getElementById("qr-box");
  var sendStatus = document.getElementById("send-status");
  var sendBar = document.getElementById("send-bar");
  var roomInput = document.getElementById("room-input");
  var recvStatus = document.getElementById("recv-status");
  var recvBar = document.getElementById("recv-bar");
  var downloadLink = document.getElementById("download-link");

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }
  function setStatus(el, text, cls) {
    el.textContent = text || "";
    el.className = "status" + (cls ? " " + cls : "");
  }
  function setMode(m) {
    document.querySelectorAll(".mode-tab").forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-mode") === m);
    });
    document.getElementById("panel-send").classList.toggle("hidden", m !== "send");
    document.getElementById("panel-recv").classList.toggle("hidden", m !== "recv");
  }
  document.querySelectorAll(".mode-tab").forEach(function (tab) {
    tab.addEventListener("click", function () { setMode(tab.getAttribute("data-mode")); });
  });
  (function () {
    var room = new URLSearchParams(location.search).get("room");
    if (room) { setMode("recv"); roomInput.value = room; }
  })();

  function makePeer() {
    if (typeof Peer === "undefined") throw new Error("PeerJS not loaded");
    return new Peer({
      debug: 1,
      config: { iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]}
    });
  }
  function destroy() {
    if (conn) { try { conn.close(); } catch (e) {} conn = null; }
    if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
  }
  function buildShareUrl(id) {
    var u = new URL(location.href);
    u.search = "?room=" + encodeURIComponent(id);
    return u.toString();
  }
  function renderQr(url) {
    qrBox.innerHTML = "";
    if (typeof QRCode !== "undefined") {
      var div = document.createElement("div");
      qrBox.appendChild(div);
      new QRCode(div, { text: url, width: 180, height: 180, colorDark: "#07050f", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
    } else {
      var img = document.createElement("img");
      img.width = 180; img.height = 180; img.alt = "QR";
      img.src = "https://chart.googleapis.com/chart?cht=qr&chs=180x180&chl=" + encodeURIComponent(url);
      qrBox.appendChild(img);
    }
  }
  function fmtSize(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(2) + " MB";
  }

  fileInput.addEventListener("change", function () {
    selectedFile = fileInput.files && fileInput.files[0];
    if (selectedFile) {
      fileMeta.textContent = selectedFile.name + " \u00b7 " + fmtSize(selectedFile.size);
      btnSendStart.disabled = false;
    } else {
      fileMeta.textContent = "\u672a\u9078\u629e";
      btnSendStart.disabled = true;
    }
  });

  btnSendStart.addEventListener("click", function () {
    if (!selectedFile) { showToast("select file"); return; }
    destroy();
    try { peer = makePeer(); } catch (e) {
      setStatus(sendStatus, e.message, "err"); return;
    }
    peer.on("open", function (id) {
      var url = buildShareUrl(id);
      shareUrl.value = url;
      sendInfo.classList.remove("hidden");
      btnSendStop.classList.remove("hidden");
      btnSendStart.classList.add("hidden");
      renderQr(url);
      setStatus(sendStatus, "waiting \u00b7 room " + id, "ok");
    });
    peer.on("connection", function (c) {
      conn = c;
      setStatus(sendStatus, "connected \u00b7 sending", "ok");
      c.on("open", function () { sendFile(c, selectedFile); });
      c.on("close", function () { setStatus(sendStatus, "peer closed", "err"); });
    });
    peer.on("error", function (err) { setStatus(sendStatus, "error: " + (err.type || err), "err"); });
  });

  function sendFile(c, file) {
    c.send({ type: "meta", name: file.name, size: file.size, mime: file.type || "application/octet-stream" });
    var offset = 0;
    var reader = new FileReader();
    function next() {
      if (offset >= file.size) {
        c.send({ type: "done" });
        setStatus(sendStatus, "done", "ok");
        sendBar.style.width = "100%";
        return;
      }
      var slice = file.slice(offset, offset + CHUNK);
      reader.onload = function (e) {
        c.send(e.target.result);
        offset += slice.size;
        var pct = Math.min(100, Math.round((offset / file.size) * 100));
        sendBar.style.width = pct + "%";
        setStatus(sendStatus, "sending " + pct + "%", "ok");
        setTimeout(next, 0);
      };
      reader.readAsArrayBuffer(slice);
    }
    next();
  }

  btnSendStop.addEventListener("click", function () {
    destroy();
    sendInfo.classList.add("hidden");
    btnSendStop.classList.add("hidden");
    btnSendStart.classList.remove("hidden");
    sendBar.style.width = "0%";
    setStatus(sendStatus, "stopped");
  });

  document.getElementById("btn-copy-url").addEventListener("click", function () {
    var t = shareUrl.value;
    if (!t) return;
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(t).then(function () { showToast("copied"); });
  });

  var recvChunks = [], recvMeta = null, recvGot = 0;

  document.getElementById("btn-recv-start").addEventListener("click", function () {
    var room = (roomInput.value || "").trim();
    if (!room) { showToast("enter room id"); return; }
    destroy();
    recvChunks = []; recvMeta = null; recvGot = 0;
    recvBar.style.width = "0%";
    downloadLink.classList.add("hidden");
    setStatus(recvStatus, "connecting...");
    try { peer = makePeer(); } catch (e) {
      setStatus(recvStatus, e.message, "err"); return;
    }
    peer.on("open", function () {
      conn = peer.connect(room, { reliable: true });
      conn.on("open", function () {
        setStatus(recvStatus, "connected", "ok");
        document.getElementById("btn-recv-stop").classList.remove("hidden");
        document.getElementById("btn-recv-start").classList.add("hidden");
      });
      conn.on("data", function (data) {
        if (data && data.type === "meta") {
          recvMeta = data; recvChunks = []; recvGot = 0;
          setStatus(recvStatus, "receiving: " + data.name, "ok");
          return;
        }
        if (data && data.type === "done") { finishRecv(); return; }
        if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
          recvChunks.push(data);
          recvGot += data.byteLength || data.length;
          if (recvMeta) {
            var pct = Math.min(100, Math.round((recvGot / recvMeta.size) * 100));
            recvBar.style.width = pct + "%";
            setStatus(recvStatus, "receiving " + pct + "%", "ok");
          }
        }
      });
      conn.on("close", function () { setStatus(recvStatus, "closed", "err"); });
      conn.on("error", function (err) { setStatus(recvStatus, "error: " + err, "err"); });
    });
    peer.on("error", function (err) { setStatus(recvStatus, "error: " + (err.type || err), "err"); });
  });

  function finishRecv() {
    if (!recvMeta || !recvChunks.length) {
      setStatus(recvStatus, "no data", "err"); return;
    }
    var blob = new Blob(recvChunks, { type: recvMeta.mime || "application/octet-stream" });
    var url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = recvMeta.name || "download";
    downloadLink.textContent = "Download: " + recvMeta.name;
    downloadLink.classList.remove("hidden");
    recvBar.style.width = "100%";
    setStatus(recvStatus, "complete", "ok");
    showToast("received");
  }

  document.getElementById("btn-recv-stop").addEventListener("click", function () {
    destroy();
    document.getElementById("btn-recv-stop").classList.add("hidden");
    document.getElementById("btn-recv-start").classList.remove("hidden");
    setStatus(recvStatus, "disconnected");
  });

  if (roomInput.value) {
    setTimeout(function () {
      if (typeof Peer !== "undefined") document.getElementById("btn-recv-start").click();
    }, 600);
  }
})();
