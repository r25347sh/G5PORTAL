(function () {
  "use strict";
  var mode = "host", peer = null, localStream = null, activeCall = null, hostId = null;
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var hostStatus = document.getElementById("host-status");
  var viewStatus = document.getElementById("view-status");
  var shareUrl = document.getElementById("share-url");
  var hostInfo = document.getElementById("host-info");
  var localPreview = document.getElementById("local-preview");
  var remoteVideo = document.getElementById("remote-video");
  var qrBox = document.getElementById("qr-box");
  var roomInput = document.getElementById("room-input");

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
    mode = m;
    document.querySelectorAll(".mode-tab").forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-mode") === m);
    });
    document.getElementById("panel-host").classList.toggle("hidden", m !== "host");
    document.getElementById("panel-view").classList.toggle("hidden", m !== "view");
  }
  document.querySelectorAll(".mode-tab").forEach(function (tab) {
    tab.addEventListener("click", function () { setMode(tab.getAttribute("data-mode")); });
  });
  (function () {
    var room = new URLSearchParams(location.search).get("room");
    if (room) { setMode("view"); roomInput.value = room; }
  })();

  function destroyPeer() {
    if (activeCall) { try { activeCall.close(); } catch (e) {} activeCall = null; }
    if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
    if (localStream) {
      localStream.getTracks().forEach(function (t) { t.stop(); });
      localStream = null;
    }
    localPreview.srcObject = null;
    localPreview.classList.add("hidden");
    remoteVideo.srcObject = null;
    remoteVideo.classList.add("hidden");
  }

  function makePeer(id) {
    if (typeof Peer === "undefined") throw new Error("PeerJS not loaded");
    var opts = {
      debug: 1,
      config: { iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]}
    };
    return id ? new Peer(id, opts) : new Peer(opts);
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

  document.getElementById("btn-host-start").addEventListener("click", async function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      showToast("screen share not supported");
      return;
    }
    destroyPeer();
    try {
      localStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false });
    } catch (e) {
      showToast("cancelled");
      return;
    }
    localStream.getVideoTracks()[0].addEventListener("ended", function () { stopHost(); });
    localPreview.srcObject = localStream;
    localPreview.classList.remove("hidden");
    try { peer = makePeer(); } catch (e) {
      setStatus(hostStatus, e.message, "err"); destroyPeer(); return;
    }
    peer.on("open", function (id) {
      hostId = id;
      var url = buildShareUrl(id);
      shareUrl.value = url;
      hostInfo.classList.remove("hidden");
      document.getElementById("btn-host-stop").classList.remove("hidden");
      document.getElementById("btn-host-start").classList.add("hidden");
      renderQr(url);
      setStatus(hostStatus, "sharing · room " + id, "ok");
    });
    peer.on("call", function (call) {
      activeCall = call;
      call.answer(localStream);
      setStatus(hostStatus, "viewer connected", "ok");
      call.on("close", function () { setStatus(hostStatus, "viewer left · waiting", "ok"); });
    });
    peer.on("error", function (err) { setStatus(hostStatus, "error: " + (err.type || err), "err"); });
  });

  function stopHost() {
    destroyPeer();
    hostInfo.classList.add("hidden");
    document.getElementById("btn-host-stop").classList.add("hidden");
    document.getElementById("btn-host-start").classList.remove("hidden");
    setStatus(hostStatus, "stopped");
  }
  document.getElementById("btn-host-stop").addEventListener("click", stopHost);

  document.getElementById("btn-copy-url").addEventListener("click", function () {
    var t = shareUrl.value;
    if (!t) return;
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(t).then(function () { showToast("copied"); });
  });

  document.getElementById("btn-join").addEventListener("click", function () {
    var room = (roomInput.value || "").trim();
    if (!room) { showToast("enter room id"); return; }
    destroyPeer();
    setStatus(viewStatus, "connecting...");
    try { peer = makePeer(); } catch (e) {
      setStatus(viewStatus, e.message, "err"); return;
    }
    peer.on("open", function () {
      var dummy = null;
      try {
        var ac = new (window.AudioContext || window.webkitAudioContext)();
        dummy = ac.createMediaStreamDestination().stream;
      } catch (e) {}
      var call = peer.call(room, dummy || undefined);
      if (!call) { setStatus(viewStatus, "call failed", "err"); return; }
      activeCall = call;
      call.on("stream", function (stream) {
        remoteVideo.srcObject = stream;
        remoteVideo.classList.remove("hidden");
        setStatus(viewStatus, "receiving", "ok");
        document.getElementById("btn-leave").classList.remove("hidden");
        document.getElementById("btn-join").classList.add("hidden");
      });
      call.on("close", function () { setStatus(viewStatus, "disconnected", "err"); leaveView(); });
      call.on("error", function (err) { setStatus(viewStatus, "call error: " + err, "err"); });
    });
    peer.on("error", function (err) { setStatus(viewStatus, "error: " + (err.type || err), "err"); });
  });

  function leaveView() {
    destroyPeer();
    document.getElementById("btn-leave").classList.add("hidden");
    document.getElementById("btn-join").classList.remove("hidden");
  }
  document.getElementById("btn-leave").addEventListener("click", function () {
    leaveView(); setStatus(viewStatus, "left");
  });

  if (roomInput.value) {
    setTimeout(function () {
      if (typeof Peer !== "undefined") document.getElementById("btn-join").click();
    }, 600);
  }
})();
