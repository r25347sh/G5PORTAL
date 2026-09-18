(function () {
  "use strict";

  var ICE = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
      { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
      { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
    ]
  };

  var peer = null;
  var localStream = null;
  var hostId = null;
  var outboundCalls = {};
  var viewConn = null;
  var viewCall = null;
  var joinTimeout = null;

  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var hostStatus = document.getElementById("host-status");
  var viewStatus = document.getElementById("view-status");
  var shareUrl = document.getElementById("share-url");
  var hostInfo = document.getElementById("host-info");
  var hostRoomId = document.getElementById("host-room-id");
  var localPreview = document.getElementById("local-preview");
  var remoteVideo = document.getElementById("remote-video");
  var qrBox = document.getElementById("qr-box");
  var roomInput = document.getElementById("room-input");
  var appShell = document.getElementById("app-shell");
  var viewerStage = document.getElementById("viewer-stage");
  var viewerConnecting = document.getElementById("viewer-connecting");
  var viewerConnectingText = document.getElementById("viewer-connecting-text");

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }
  function setStatus(el, text, cls) {
    if (!el) return;
    el.textContent = text || "";
    el.className = "status" + (cls ? " " + cls : "");
  }
  function setMode(m) {
    document.querySelectorAll(".mode-tab").forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-mode") === m);
    });
    document.getElementById("panel-host").classList.toggle("hidden", m !== "host");
    document.getElementById("panel-view").classList.toggle("hidden", m !== "view");
  }
  document.querySelectorAll(".mode-tab").forEach(function (tab) {
    tab.addEventListener("click", function () { setMode(tab.getAttribute("data-mode")); });
  });

  function enterViewerStage(msg) {
    document.body.classList.add("viewer-mode");
    if (appShell) appShell.hidden = true;
    if (viewerStage) { viewerStage.hidden = false; viewerStage.removeAttribute("hidden"); }
    if (viewerConnecting) {
      viewerConnecting.classList.remove("hidden");
      if (viewerConnectingText) viewerConnectingText.textContent = msg || "\u63a5\u7d9a\u4e2d\u2026";
    }
  }
  function showVideoOnly() {
    if (viewerConnecting) viewerConnecting.classList.add("hidden");
    if (remoteVideo) {
      remoteVideo.muted = true;
      var p = remoteVideo.play();
      if (p && p.catch) p.catch(function () {});
    }
  }
  function exitViewerStage() {
    document.body.classList.remove("viewer-mode");
    if (appShell) appShell.hidden = false;
    if (viewerStage) { viewerStage.hidden = true; viewerStage.setAttribute("hidden", ""); }
    if (remoteVideo) remoteVideo.srcObject = null;
  }

  function waitForPeerJs(timeoutMs) {
    return new Promise(function (resolve, reject) {
      if (typeof Peer !== "undefined") { resolve(); return; }
      var start = Date.now();
      var id = setInterval(function () {
        if (typeof Peer !== "undefined") { clearInterval(id); resolve(); }
        else if (Date.now() - start > (timeoutMs || 10000)) {
          clearInterval(id);
          reject(new Error("PeerJS load failed"));
        }
      }, 50);
    });
  }
  function makePeer() {
    if (typeof Peer === "undefined") throw new Error("PeerJS not loaded");
    return new Peer({ debug: 1, config: ICE });
  }
  function waitPeerOpen(p) {
    return new Promise(function (resolve, reject) {
      if (p.open && p.id) { resolve(p.id); return; }
      var done = false;
      function ok(id) { if (done) return; done = true; resolve(id); }
      function fail(err) { if (done) return; done = true; reject(err || new Error("peer open failed")); }
      p.on("open", ok);
      p.on("error", fail);
      setTimeout(function () { if (!done) fail(new Error("signaling timeout")); }, 15000);
    });
  }

  function destroyAll() {
    clearTimeout(joinTimeout);
    Object.keys(outboundCalls).forEach(function (k) {
      try { outboundCalls[k].close(); } catch (e) {}
    });
    outboundCalls = {};
    if (viewCall) { try { viewCall.close(); } catch (e) {} viewCall = null; }
    if (viewConn) { try { viewConn.close(); } catch (e) {} viewConn = null; }
    if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
    if (localStream) {
      localStream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
      localStream = null;
    }
    if (localPreview) { localPreview.srcObject = null; localPreview.classList.add("hidden"); }
    if (remoteVideo) remoteVideo.srcObject = null;
  }

  function buildShareUrl(id) {
    var u = new URL(location.href);
    u.hash = "";
    u.search = "?room=" + encodeURIComponent(id);
    return u.toString();
  }

  function renderQr(url) {
    if (!qrBox) return;
    qrBox.innerHTML = "";
    if (typeof QRCode !== "undefined") {
      var div = document.createElement("div");
      qrBox.appendChild(div);
      try {
        new QRCode(div, { text: url, width: 180, height: 180, colorDark: "#07050f", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
        return;
      } catch (e) {}
    }
    var img = document.createElement("img");
    img.width = 180; img.height = 180; img.alt = "QR";
    img.src = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(url);
    qrBox.appendChild(img);
  }

  function callViewer(viewerPeerId) {
    if (!peer || !localStream || !viewerPeerId) return;
    if (outboundCalls[viewerPeerId]) {
      try { outboundCalls[viewerPeerId].close(); } catch (e) {}
      delete outboundCalls[viewerPeerId];
    }
    setStatus(hostStatus, "calling viewer...", "ok");
    var call = peer.call(viewerPeerId, localStream, { metadata: { type: "screen" } });
    if (!call) { setStatus(hostStatus, "call failed", "err"); return; }
    outboundCalls[viewerPeerId] = call;
    call.on("close", function () {
      delete outboundCalls[viewerPeerId];
      setStatus(hostStatus, "viewer left · waiting · " + (hostId || ""), "ok");
    });
    call.on("error", function (err) {
      delete outboundCalls[viewerPeerId];
      setStatus(hostStatus, "call error: " + (err.message || err), "err");
    });
    setStatus(hostStatus, "streaming · viewers " + Object.keys(outboundCalls).length + " · " + hostId, "ok");
  }

  document.getElementById("btn-host-start").addEventListener("click", async function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      showToast("screen share not supported");
      return;
    }
    destroyAll();
    exitViewerStage();
    try { await waitForPeerJs(12000); } catch (e) {
      setStatus(hostStatus, e.message, "err"); showToast(e.message); return;
    }
    try {
      localStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 30 }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
    } catch (e) { showToast("cancelled"); return; }

    var vTrack = localStream.getVideoTracks()[0];
    if (vTrack) vTrack.addEventListener("ended", function () { stopHost(); });
    localPreview.srcObject = localStream;
    localPreview.classList.remove("hidden");
    localPreview.play().catch(function () {});

    try { peer = makePeer(); } catch (e) {
      setStatus(hostStatus, e.message, "err"); destroyAll(); return;
    }

    peer.on("error", function (err) {
      var msg = err && (err.type || err.message) ? err.type || err.message : String(err);
      setStatus(hostStatus, "error: " + msg, "err");
    });

    peer.on("connection", function (conn) {
      conn.on("data", function (data) {
        var payload = data;
        try { if (typeof data === "string") payload = JSON.parse(data); } catch (e) {}
        if (payload === "ready" || (payload && payload.type === "ready")) {
          callViewer(conn.peer);
        }
      });
    });

    peer.on("call", function (call) {
      if (!localStream) { call.close(); return; }
      call.answer(localStream);
      outboundCalls[call.peer] = call;
      setStatus(hostStatus, "streaming · viewers " + Object.keys(outboundCalls).length + " · " + hostId, "ok");
      call.on("close", function () { delete outboundCalls[call.peer]; });
    });

    try { hostId = await waitPeerOpen(peer); } catch (e) {
      setStatus(hostStatus, e.message || "peer failed", "err"); destroyAll(); return;
    }

    var url = buildShareUrl(hostId);
    shareUrl.value = url;
    if (hostRoomId) hostRoomId.textContent = hostId;
    hostInfo.classList.remove("hidden");
    document.getElementById("btn-host-stop").classList.remove("hidden");
    document.getElementById("btn-host-start").classList.add("hidden");
    renderQr(url);
    setStatus(hostStatus, "waiting · room " + hostId, "ok");
  });

  function stopHost() {
    destroyAll();
    hostInfo.classList.add("hidden");
    document.getElementById("btn-host-stop").classList.add("hidden");
    document.getElementById("btn-host-start").classList.remove("hidden");
    setStatus(hostStatus, "stopped");
  }
  document.getElementById("btn-host-stop").addEventListener("click", stopHost);

  document.getElementById("btn-copy-url").addEventListener("click", function () {
    var t = shareUrl.value;
    if (!t) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { showToast("copied"); });
    }
  });

  function onRemoteStream(stream) {
    clearTimeout(joinTimeout);
    if (!stream) {
      setStatus(viewStatus, "empty stream", "err");
      if (viewerConnectingText) viewerConnectingText.textContent = "no stream";
      return;
    }
    var tracks = stream.getVideoTracks();
    if (!tracks || !tracks.length) {
      setStatus(viewStatus, "no video track", "err");
      if (viewerConnectingText) viewerConnectingText.textContent = "no video track";
      return;
    }
    remoteVideo.srcObject = stream;
    remoteVideo.muted = true;
    showVideoOnly();
    setStatus(viewStatus, "receiving", "ok");
    stream.getTracks().forEach(function (t) {
      t.addEventListener("ended", function () {
        if (viewerConnecting) {
          viewerConnecting.classList.remove("hidden");
          if (viewerConnectingText) viewerConnectingText.textContent = "share ended";
        }
      });
    });
  }

  function fallbackViewerCall(room) {
    if (!peer || (remoteVideo && remoteVideo.srcObject)) return;
    var canvas = document.createElement("canvas");
    canvas.width = 2; canvas.height = 2;
    var ctx = canvas.getContext("2d");
    if (ctx) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 2, 2); }
    var dummyStream = null;
    try { dummyStream = canvas.captureStream(1); }
    catch (e) {
      try {
        var ac = new (window.AudioContext || window.webkitAudioContext)();
        dummyStream = ac.createMediaStreamDestination().stream;
      } catch (e2) { dummyStream = new MediaStream(); }
    }
    try {
      var call = peer.call(room, dummyStream, { metadata: { type: "viewer-fallback" } });
      if (!call) return;
      viewCall = call;
      call.on("stream", function (stream) { onRemoteStream(stream); });
      call.on("error", function () {
        if (viewerConnectingText) viewerConnectingText.textContent = "fallback failed";
      });
    } catch (e) {
      if (viewerConnectingText) viewerConnectingText.textContent = "fallback failed";
    }
  }

  async function joinAsViewer(room) {
    room = (room || "").trim();
    if (!room) { showToast("enter room id"); return; }
    destroyAll();
    enterViewerStage("connecting...");
    setStatus(viewStatus, "connecting...");
    try { await waitForPeerJs(12000); } catch (e) {
      if (viewerConnectingText) viewerConnectingText.textContent = e.message;
      setStatus(viewStatus, e.message, "err"); return;
    }
    try { peer = makePeer(); } catch (e) {
      if (viewerConnectingText) viewerConnectingText.textContent = e.message;
      setStatus(viewStatus, e.message, "err"); return;
    }

    peer.on("error", function (err) {
      var msg = err && (err.type || err.message) ? err.type || err.message : String(err);
      if (viewerConnectingText) viewerConnectingText.textContent = "error: " + msg;
      setStatus(viewStatus, "error: " + msg, "err");
    });

    peer.on("call", function (call) {
      viewCall = call;
      if (viewerConnectingText) viewerConnectingText.textContent = "receiving video...";
      try { call.answer(); }
      catch (e) {
        try { call.answer(new MediaStream()); }
        catch (e2) {
          if (viewerConnectingText) viewerConnectingText.textContent = "answer failed";
          return;
        }
      }
      call.on("stream", function (stream) { onRemoteStream(stream); });
      setTimeout(function () {
        if (remoteVideo && remoteVideo.srcObject) return;
        if (call.remoteStream) onRemoteStream(call.remoteStream);
      }, 500);
      call.on("close", function () {
        if (viewerConnecting) {
          viewerConnecting.classList.remove("hidden");
          if (viewerConnectingText) viewerConnectingText.textContent = "disconnected";
        }
        setStatus(viewStatus, "disconnected", "err");
      });
      call.on("error", function (err) {
        if (viewerConnectingText) viewerConnectingText.textContent = "call error";
        setStatus(viewStatus, "call error: " + err, "err");
      });
    });

    var myId;
    try { myId = await waitPeerOpen(peer); }
    catch (e) {
      if (viewerConnectingText) viewerConnectingText.textContent = e.message || "peer failed";
      setStatus(viewStatus, e.message || "peer failed", "err"); return;
    }

    if (viewerConnectingText) viewerConnectingText.textContent = "connecting to host...";

    viewConn = peer.connect(room, { reliable: true, metadata: { role: "viewer" } });

    function sendReady() {
      if (!viewConn) return;
      try { viewConn.send(JSON.stringify({ type: "ready", id: myId })); }
      catch (e) {
        try { viewConn.send("ready"); } catch (e2) {}
      }
      if (viewerConnectingText) viewerConnectingText.textContent = "waiting for host video...";
    }

    viewConn.on("open", function () {
      sendReady();
      setTimeout(sendReady, 400);
      setTimeout(sendReady, 1200);
    });
    viewConn.on("error", function () {
      setStatus(viewStatus, "data connection error", "err");
      if (viewerConnectingText) viewerConnectingText.textContent = "data connection error — check room id";
    });

    joinTimeout = setTimeout(function () {
      if (remoteVideo && remoteVideo.srcObject) return;
      if (viewerConnectingText) viewerConnectingText.textContent = "trying fallback...";
      fallbackViewerCall(room);
    }, 8000);

    setTimeout(function () {
      if (remoteVideo && remoteVideo.srcObject) return;
      if (viewerConnectingText && viewerConnecting && !viewerConnecting.classList.contains("hidden")) {
        viewerConnectingText.textContent = "timeout — is host still sharing?";
      }
      setStatus(viewStatus, "timeout", "err");
    }, 25000);
  }

  document.getElementById("btn-join").addEventListener("click", function () {
    joinAsViewer(roomInput.value);
  });

  (function () {
    var params = new URLSearchParams(location.search);
    var room = params.get("room");
    if (!room) return;
    setMode("view");
    roomInput.value = room;
    function tryJoin() {
      waitForPeerJs(12000).then(function () { joinAsViewer(room); }).catch(function (e) {
        setStatus(viewStatus, e.message, "err");
        enterViewerStage(e.message);
      });
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { setTimeout(tryJoin, 100); });
    } else {
      setTimeout(tryJoin, 100);
    }
  })();
})();
