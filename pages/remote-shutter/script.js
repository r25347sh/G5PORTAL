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

  var QUALITY_MAP = {
    "720":  { width: { ideal: 1280 }, height: { ideal: 720 },  frameRate: { ideal: 30 } },
    "1080": { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
    "1440": { width: { ideal: 2560 }, height: { ideal: 1440 }, frameRate: { ideal: 30 } },
    "max":  { width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 30 } }
  };

  var peer = null;
  var localStream = null;
  var hostId = null;
  var outboundCalls = {};
  var dataConns = {};
  var viewConn = null;
  var viewCall = null;
  var mediaRecorder = null;
  var recordedChunks = [];
  var isRecording = false;
  var recStartTime = 0;
  var recTimer = null;
  var facingMode = "environment";
  var useAudio = true;
  var useScreen = false;
  var mirror = true;
  var currentMode = "camera";

  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var camStatus = document.getElementById("cam-status");
  var remoteStatus = document.getElementById("remote-status");
  var shareUrl = document.getElementById("share-url");
  var camInfo = document.getElementById("cam-info");
  var hostRoomId = document.getElementById("host-room-id");
  var localPreview = document.getElementById("local-preview");
  var remoteVideo = document.getElementById("remote-video");
  var qrBox = document.getElementById("qr-box");
  var roomInput = document.getElementById("room-input");
  var appShell = document.getElementById("app-shell");
  var remoteStage = document.getElementById("remote-stage");
  var remoteConnecting = document.getElementById("remote-connecting");
  var remoteConnectingText = document.getElementById("remote-connecting-text");
  var remoteHud = document.getElementById("remote-hud");
  var captureCanvas = document.getElementById("capture-canvas");
  var gallery = document.getElementById("gallery");
  var countdownEl = document.getElementById("countdown");
  var recIndicator = document.getElementById("rec-indicator");
  var recTimeEl = document.getElementById("rec-time");
  var btnVideo = document.getElementById("btn-video");
  var camPreviewWrap = document.getElementById("cam-preview-wrap");
  var camBadge = document.getElementById("cam-badge");

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  function setStatus(el, text, cls) {
    if (!el) return;
    el.textContent = text || "";
    el.className = "status" + (cls ? " " + cls : "");
  }

  function setMode(m) {
    currentMode = m;
    document.querySelectorAll(".mode-tab").forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-mode") === m);
    });
    document.getElementById("panel-camera").classList.toggle("hidden", m !== "camera");
    document.getElementById("panel-remote").classList.toggle("hidden", m !== "remote");
  }

  document.querySelectorAll(".mode-tab").forEach(function (tab) {
    tab.addEventListener("click", function () { setMode(tab.getAttribute("data-mode")); });
  });

  function waitForPeerJs(timeout) {
    return new Promise(function (resolve, reject) {
      if (typeof Peer !== "undefined") return resolve();
      var start = Date.now();
      var t = setInterval(function () {
        if (typeof Peer !== "undefined") { clearInterval(t); resolve(); }
        else if (Date.now() - start > (timeout || 10000)) {
          clearInterval(t);
          reject(new Error("PeerJS の読み込みに失敗しました"));
        }
      }, 50);
    });
  }

  function waitPeerOpen(p) {
    return new Promise(function (resolve, reject) {
      if (p.open) return resolve(p.id);
      var to = setTimeout(function () { reject(new Error("Peer 接続タイムアウト")); }, 15000);
      p.on("open", function (id) { clearTimeout(to); resolve(id); });
      p.on("error", function (err) { clearTimeout(to); reject(err); });
    });
  }

  function sendJson(conn, obj) {
    if (!conn || !conn.open) return;
    try { conn.send(JSON.stringify(obj)); } catch (e) {}
  }

  function makePeer() {
    return new Peer({
      host: "0.peerjs.com",
      port: 443,
      path: "/",
      secure: true,
      config: ICE,
      debug: 0
    });
  }

  async function getMediaStream() {
    useAudio = document.getElementById("opt-audio").checked;
    useScreen = document.getElementById("opt-screen").checked;
    mirror = document.getElementById("opt-mirror").checked;
    facingMode = document.getElementById("facing-select").value;
    var q = document.getElementById("quality-select").value;
    var constraints = QUALITY_MAP[q] || QUALITY_MAP["1080"];

    if (useScreen) {
      var display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: useAudio });
      if (useAudio && !display.getAudioTracks().length) {
        try {
          var mic = await navigator.mediaDevices.getUserMedia({ audio: true });
          mic.getAudioTracks().forEach(function (t) { display.addTrack(t); });
        } catch (e) {}
      }
      return display;
    }

    return navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: constraints.width,
        height: constraints.height,
        frameRate: constraints.frameRate
      },
      audio: useAudio
    });
  }

  async function startCameraHost() {
    try {
      await waitForPeerJs();
      localStream = await getMediaStream();
    } catch (e) {
      setStatus(camStatus, e.message || "カメラ／画面の取得に失敗", "err");
      showToast("権限を許可してください");
      return;
    }

    localPreview.srcObject = localStream;
    localPreview.classList.toggle("mirror", mirror && !useScreen);
    camPreviewWrap.classList.remove("hidden");
    document.getElementById("btn-cam-start").classList.add("hidden");
    document.getElementById("btn-cam-stop").classList.remove("hidden");
    document.getElementById("btn-switch-cam").classList.toggle("hidden", useScreen);

    peer = makePeer();
    try {
      hostId = await waitPeerOpen(peer);
    } catch (e) {
      setStatus(camStatus, e.message || "Peer 失敗", "err");
      stopCameraHost();
      return;
    }

    hostRoomId.textContent = hostId;
    var url = location.origin + location.pathname + "?room=" + encodeURIComponent(hostId);
    shareUrl.value = url;
    camInfo.classList.remove("hidden");
    qrBox.innerHTML = "";
    try {
      new QRCode(qrBox, { text: url, width: 160, height: 160, correctLevel: QRCode.CorrectLevel.M });
    } catch (e) {}

    setStatus(camStatus, "接続待ち…", "ok");
    camBadge.textContent = useScreen ? "SCREEN" : "LIVE";

    peer.on("connection", function (conn) {
      dataConns[conn.peer] = conn;
      conn.on("open", function () {
        setStatus(camStatus, "リモコン接続: " + conn.peer.slice(0, 8) + "…", "ok");
        sendJson(conn, { type: "ready", facing: facingMode, audio: useAudio, screen: useScreen, mirror: mirror });
        setTimeout(function () {
          if (localStream && peer) {
            var call = peer.call(conn.peer, localStream);
            if (call) outboundCalls[conn.peer] = call;
          }
        }, 300);
      });
      conn.on("data", function (raw) { handleHostData(conn, raw); });
      conn.on("close", function () {
        delete dataConns[conn.peer];
        setStatus(camStatus, "リモコン切断", "warn");
      });
    });

    peer.on("call", function (call) {
      call.answer(localStream);
      outboundCalls[call.peer] = call;
    });

    localStream.getTracks().forEach(function (t) {
      t.onended = function () { if (useScreen) stopCameraHost(); };
    });
  }

  function handleHostData(conn, raw) {
    var msg;
    try { msg = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (e) { return; }
    if (!msg || !msg.type) return;

    if (msg.type === "photo") takePhotoOnHost(conn);
    else if (msg.type === "video-start") startRecordingOnHost(conn);
    else if (msg.type === "video-stop") stopRecordingOnHost(conn);
    else if (msg.type === "switch-camera") switchCameraOnHost();
    else if (msg.type === "toggle-audio") toggleAudioOnHost(msg.on);
    else if (msg.type === "toggle-screen") toggleScreenOnHost();
    else if (msg.type === "set-mirror") {
      mirror = !!msg.on;
      localPreview.classList.toggle("mirror", mirror && !useScreen);
      broadcast({ type: "mirror", on: mirror });
    }
  }

  function broadcast(obj) {
    Object.keys(dataConns).forEach(function (id) { sendJson(dataConns[id], obj); });
  }

  function replaceStreamTracks(newStream) {
    if (!localStream) { localStream = newStream; return; }
    localStream.getTracks().forEach(function (t) { t.stop(); });
    localStream = newStream;
    localPreview.srcObject = localStream;
    localPreview.classList.toggle("mirror", mirror && !useScreen);
    Object.keys(outboundCalls).forEach(function (peerId) {
      var oldCall = outboundCalls[peerId];
      try { oldCall.close(); } catch (e) {}
      if (peer) {
        var call = peer.call(peerId, localStream);
        if (call) outboundCalls[peerId] = call;
      }
    });
  }

  async function switchCameraOnHost() {
    if (useScreen) return;
    facingMode = facingMode === "environment" ? "user" : "environment";
    document.getElementById("facing-select").value = facingMode;
    try {
      var q = document.getElementById("quality-select").value;
      var constraints = QUALITY_MAP[q] || QUALITY_MAP["1080"];
      var newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: constraints.width,
          height: constraints.height,
          frameRate: constraints.frameRate
        },
        audio: useAudio
      });
      replaceStreamTracks(newStream);
      broadcast({ type: "facing", facing: facingMode });
      showToast(facingMode === "user" ? "前面カメラ" : "背面カメラ");
    } catch (e) {
      showToast("カメラ切替失敗");
    }
  }

  function toggleAudioOnHost(on) {
    useAudio = !!on;
    if (localStream) {
      localStream.getAudioTracks().forEach(function (t) { t.enabled = useAudio; });
    }
    broadcast({ type: "audio", on: useAudio });
  }

  async function toggleScreenOnHost() {
    useScreen = !useScreen;
    document.getElementById("opt-screen").checked = useScreen;
    try {
      var newStream = await getMediaStream();
      replaceStreamTracks(newStream);
      camBadge.textContent = useScreen ? "SCREEN" : "LIVE";
      document.getElementById("btn-switch-cam").classList.toggle("hidden", useScreen);
      broadcast({ type: "screen", on: useScreen });
      showToast(useScreen ? "画面共有" : "カメラ");
    } catch (e) {
      useScreen = !useScreen;
      document.getElementById("opt-screen").checked = useScreen;
      showToast("切替失敗");
    }
  }

  function takePhotoOnHost(conn) {
    if (!localStream) return;
    var video = localPreview;
    var w = video.videoWidth || 1280;
    var h = video.videoHeight || 720;
    captureCanvas.width = w;
    captureCanvas.height = h;
    var ctx = captureCanvas.getContext("2d");
    if (mirror && !useScreen) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, w, h);
    captureCanvas.toBlob(function (blob) {
      if (!blob) return;
      var reader = new FileReader();
      reader.onload = function () {
        sendJson(conn, { type: "photo-data", data: reader.result, ts: Date.now() });
      };
      reader.readAsDataURL(blob);
      downloadBlob(blob, "photo-" + Date.now() + ".jpg");
    }, "image/jpeg", 0.92);
  }

  function startRecordingOnHost(conn) {
    if (!localStream || isRecording) return;
    recordedChunks = [];
    var mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "video/mp4";
    try {
      mediaRecorder = new MediaRecorder(localStream, { mimeType: mime, videoBitsPerSecond: 4000000 });
    } catch (e) {
      try { mediaRecorder = new MediaRecorder(localStream); }
      catch (e2) { sendJson(conn, { type: "error", msg: "録画非対応" }); return; }
    }
    mediaRecorder.ondataavailable = function (ev) {
      if (ev.data && ev.data.size > 0) recordedChunks.push(ev.data);
    };
    mediaRecorder.onstop = function () {
      var blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || "video/webm" });
      var reader = new FileReader();
      reader.onload = function () {
        sendJson(conn, { type: "video-data", data: reader.result, ts: Date.now() });
      };
      reader.readAsDataURL(blob);
      downloadBlob(blob, "video-" + Date.now() + ".webm");
      isRecording = false;
      broadcast({ type: "recording", on: false });
    };
    mediaRecorder.start(1000);
    isRecording = true;
    broadcast({ type: "recording", on: true });
  }

  function stopRecordingOnHost(conn) {
    if (mediaRecorder && isRecording) mediaRecorder.stop();
  }

  function stopCameraHost() {
    if (localStream) {
      localStream.getTracks().forEach(function (t) { t.stop(); });
      localStream = null;
    }
    Object.keys(outboundCalls).forEach(function (id) { try { outboundCalls[id].close(); } catch (e) {} });
    outboundCalls = {};
    Object.keys(dataConns).forEach(function (id) { try { dataConns[id].close(); } catch (e) {} });
    dataConns = {};
    if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
    hostId = null;
    localPreview.srcObject = null;
    camPreviewWrap.classList.add("hidden");
    camInfo.classList.add("hidden");
    document.getElementById("btn-cam-start").classList.remove("hidden");
    document.getElementById("btn-cam-stop").classList.add("hidden");
    document.getElementById("btn-switch-cam").classList.add("hidden");
    setStatus(camStatus, "");
  }

  document.getElementById("btn-cam-start").addEventListener("click", startCameraHost);
  document.getElementById("btn-cam-stop").addEventListener("click", stopCameraHost);
  document.getElementById("btn-switch-cam").addEventListener("click", switchCameraOnHost);
  document.getElementById("btn-copy-url").addEventListener("click", function () {
    if (!shareUrl.value) return;
    navigator.clipboard.writeText(shareUrl.value).then(function () {
      showToast("URL をコピーしました");
    }).catch(function () {
      shareUrl.select();
      showToast("手動でコピーしてください");
    });
  });

  function enterRemoteStage(msg) {
    appShell.classList.add("hidden");
    remoteStage.hidden = false;
    if (remoteConnecting) {
      remoteConnecting.classList.remove("hidden");
      if (remoteConnectingText) remoteConnectingText.textContent = msg || "接続中…";
    }
    if (remoteHud) remoteHud.classList.add("hidden");
  }

  function leaveRemoteStage() {
    if (viewCall) { try { viewCall.close(); } catch (e) {} viewCall = null; }
    if (viewConn) { try { viewConn.close(); } catch (e) {} viewConn = null; }
    if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
    if (remoteVideo) remoteVideo.srcObject = null;
    remoteStage.hidden = true;
    appShell.classList.remove("hidden");
    if (remoteHud) remoteHud.classList.add("hidden");
    if (remoteConnecting) remoteConnecting.classList.add("hidden");
    setStatus(remoteStatus, "");
    stopRecUI();
  }

  function onRemoteStream(stream) {
    if (!remoteVideo) return;
    remoteVideo.srcObject = stream;
    remoteVideo.classList.toggle("mirror", mirror);
    if (remoteConnecting) remoteConnecting.classList.add("hidden");
    if (remoteHud) remoteHud.classList.remove("hidden");
    setStatus(remoteStatus, "接続完了", "ok");
  }

  function handleRemoteData(raw) {
    var msg;
    try { msg = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (e) { return; }
    if (!msg || !msg.type) return;

    if (msg.type === "ready") {
      if (typeof msg.mirror === "boolean") {
        mirror = msg.mirror;
        remoteVideo.classList.toggle("mirror", mirror);
        document.getElementById("btn-toggle-mirror").setAttribute("data-on", mirror ? "1" : "0");
      }
      if (typeof msg.audio === "boolean") {
        document.getElementById("btn-toggle-audio").setAttribute("data-on", msg.audio ? "1" : "0");
      }
    } else if (msg.type === "photo-data") {
      addToGallery(msg.data, "image");
      showToast("写真を受信");
    } else if (msg.type === "video-data") {
      addToGallery(msg.data, "video");
      showToast("動画を受信");
    } else if (msg.type === "recording") {
      if (msg.on) startRecUI(); else stopRecUI();
    } else if (msg.type === "mirror") {
      mirror = !!msg.on;
      remoteVideo.classList.toggle("mirror", mirror);
      document.getElementById("btn-toggle-mirror").setAttribute("data-on", mirror ? "1" : "0");
    } else if (msg.type === "audio") {
      document.getElementById("btn-toggle-audio").setAttribute("data-on", msg.on ? "1" : "0");
    } else if (msg.type === "facing" || msg.type === "screen") {
      showToast(msg.type === "screen" ? (msg.on ? "画面共有" : "カメラ") : (msg.facing === "user" ? "前面" : "背面"));
    } else if (msg.type === "error") {
      showToast(msg.msg || "エラー");
    }
  }

  function addToGallery(dataUrl, kind) {
    if (!gallery) return;
    var el;
    if (kind === "video") {
      el = document.createElement("video");
      el.src = dataUrl;
      el.muted = true;
      el.playsInline = true;
    } else {
      el = document.createElement("img");
      el.src = dataUrl;
    }
    el.title = "タップで保存";
    el.addEventListener("click", function () {
      var a = document.createElement("a");
      a.href = dataUrl;
      a.download = (kind === "video" ? "video-" : "photo-") + Date.now() + (kind === "video" ? ".webm" : ".jpg");
      a.click();
    });
    gallery.insertBefore(el, gallery.firstChild);
    while (gallery.children.length > 8) gallery.removeChild(gallery.lastChild);
  }

  function downloadBlob(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }

  function startRecUI() {
    isRecording = true;
    btnVideo.classList.add("recording");
    recIndicator.classList.remove("hidden");
    recStartTime = Date.now();
    recTimer = setInterval(function () {
      var s = Math.floor((Date.now() - recStartTime) / 1000);
      var m = Math.floor(s / 60);
      s = s % 60;
      recTimeEl.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
    }, 500);
  }

  function stopRecUI() {
    isRecording = false;
    btnVideo.classList.remove("recording");
    recIndicator.classList.add("hidden");
    if (recTimer) { clearInterval(recTimer); recTimer = null; }
    recTimeEl.textContent = "00:00";
  }

  async function joinAsRemote(room) {
    room = (room || "").trim();
    if (!room) {
      setStatus(remoteStatus, "ルーム ID を入力してください", "err");
      return;
    }
    enterRemoteStage("接続中…");
    try { await waitForPeerJs(); }
    catch (e) {
      if (remoteConnectingText) remoteConnectingText.textContent = e.message;
      setStatus(remoteStatus, e.message, "err");
      return;
    }
    peer = makePeer();
    var myId;
    try { myId = await waitPeerOpen(peer); }
    catch (e) {
      if (remoteConnectingText) remoteConnectingText.textContent = e.message || "Peer 失敗";
      setStatus(remoteStatus, e.message || "Peer 失敗", "err");
      return;
    }

    peer.on("call", function (call) {
      viewCall = call;
      if (remoteConnectingText) remoteConnectingText.textContent = "映像受信中…";
      try { call.answer(); } catch (e) {
        try { call.answer(new MediaStream()); } catch (e2) {}
      }
      call.on("stream", function (stream) { onRemoteStream(stream); });
      setTimeout(function () {
        if (remoteVideo && remoteVideo.srcObject) return;
        if (call.remoteStream) onRemoteStream(call.remoteStream);
      }, 600);
      call.on("close", function () {
        if (remoteConnecting) {
          remoteConnecting.classList.remove("hidden");
          if (remoteConnectingText) remoteConnectingText.textContent = "切断されました";
        }
        setStatus(remoteStatus, "切断", "err");
      });
    });

    if (remoteConnectingText) remoteConnectingText.textContent = "ホストに接続中…";
    viewConn = peer.connect(room, { reliable: true, metadata: { role: "remote" } });
    viewConn.on("data", handleRemoteData);
    viewConn.on("open", function () {
      sendJson(viewConn, { type: "hello", id: myId });
      setTimeout(function () {
        if (remoteVideo && remoteVideo.srcObject) return;
        try {
          var c = peer.call(room, new MediaStream());
          if (c) {
            viewCall = c;
            c.on("stream", function (s) { onRemoteStream(s); });
          }
        } catch (e) {}
      }, 1500);
    });
    viewConn.on("error", function () { setStatus(remoteStatus, "データ接続エラー", "err"); });
    viewConn.on("close", function () { setStatus(remoteStatus, "切断", "warn"); });

    setTimeout(function () {
      if (remoteVideo && remoteVideo.srcObject) return;
      if (remoteConnectingText && remoteConnecting && !remoteConnecting.classList.contains("hidden")) {
        remoteConnectingText.textContent = "タイムアウト";
      }
      setStatus(remoteStatus, "タイムアウト", "err");
    }, 25000);
  }

  document.getElementById("btn-join").addEventListener("click", function () {
    joinAsRemote(roomInput.value);
  });

  document.getElementById("btn-leave").addEventListener("click", leaveRemoteStage);
  document.getElementById("btn-fs").addEventListener("click", function () {
    if (!document.fullscreenElement) remoteStage.requestFullscreen && remoteStage.requestFullscreen();
    else document.exitFullscreen && document.exitFullscreen();
  });

  document.getElementById("btn-toggle-audio").addEventListener("click", function () {
    var btn = this;
    var on = btn.getAttribute("data-on") !== "1";
    btn.setAttribute("data-on", on ? "1" : "0");
    sendJson(viewConn, { type: "toggle-audio", on: on });
  });

  document.getElementById("btn-toggle-mirror").addEventListener("click", function () {
    var btn = this;
    var on = btn.getAttribute("data-on") !== "1";
    btn.setAttribute("data-on", on ? "1" : "0");
    mirror = on;
    remoteVideo.classList.toggle("mirror", mirror);
    sendJson(viewConn, { type: "set-mirror", on: on });
  });

  document.getElementById("btn-req-switch").addEventListener("click", function () {
    sendJson(viewConn, { type: "switch-camera" });
  });

  document.getElementById("btn-req-screen").addEventListener("click", function () {
    sendJson(viewConn, { type: "toggle-screen" });
  });

  function runWithTimer(cb) {
    var sec = parseInt(document.getElementById("timer-select").value, 10) || 0;
    if (sec <= 0) { cb(); return; }
    countdownEl.classList.remove("hidden");
    var left = sec;
    countdownEl.textContent = left;
    var iv = setInterval(function () {
      left--;
      if (left <= 0) {
        clearInterval(iv);
        countdownEl.classList.add("hidden");
        cb();
      } else {
        countdownEl.textContent = left;
        countdownEl.style.animation = "none";
        void countdownEl.offsetWidth;
        countdownEl.style.animation = "";
      }
    }, 1000);
  }

  document.getElementById("btn-photo").addEventListener("click", function () {
    runWithTimer(function () {
      sendJson(viewConn, { type: "photo" });
      showToast("撮影リクエスト");
    });
  });

  document.getElementById("btn-video").addEventListener("click", function () {
    if (isRecording) sendJson(viewConn, { type: "video-stop" });
    else runWithTimer(function () { sendJson(viewConn, { type: "video-start" }); });
  });

  (function () {
    var params = new URLSearchParams(location.search);
    var room = params.get("room");
    if (!room) return;
    setMode("remote");
    roomInput.value = room;
    function tryJoin() {
      waitForPeerJs(12000).then(function () { joinAsRemote(room); }).catch(function (e) {
        setStatus(remoteStatus, e.message, "err");
        enterRemoteStage(e.message);
      });
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { setTimeout(tryJoin, 120); });
    } else setTimeout(tryJoin, 120);
  })();
})();
