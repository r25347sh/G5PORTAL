(function () {
  "use strict";

  var CHUNK = 16 * 1024;
  var peer = null, conn = null;
  var myName = "Me", peerName = "Peer";
  var selectedFile = null;
  var recvChunks = [], recvMeta = null, recvGot = 0;
  var started = false;

  function el(id) { return document.getElementById(id); }

  function showToast(msg) {
    var t = el("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(showToast._tm);
    showToast._tm = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  function setStatus(node, text, cls) {
    if (!node) return;
    node.textContent = text || "";
    node.className = "status" + (cls ? " " + cls : "");
  }

  function gateOk() {
    if (window.__G5_PR_OK__) return true;
    if (typeof window.__G5_PR_CHECK__ === "function") return window.__G5_PR_CHECK__();
    try {
      var raw = sessionStorage.getItem("__g5_pr");
      if (!raw) return false;
      var o = JSON.parse(raw);
      return o && o.t && (Date.now() - o.t < 2 * 60 * 60 * 1000);
    } catch (e) { return false; }
  }

  function boot() {
    if (started) return;
    if (!gateOk()) return;
    started = true;
    initUI();
  }

  window.addEventListener("g5-pr-unlock", boot);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 50); });
  } else {
    setTimeout(boot, 50);
  }

  function initUI() {
    document.querySelectorAll(".mode-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var m = tab.getAttribute("data-mode");
        document.querySelectorAll(".mode-tab").forEach(function (t) {
          t.classList.toggle("active", t.getAttribute("data-mode") === m);
        });
        el("panel-host").classList.toggle("hidden", m !== "host");
        el("panel-join").classList.toggle("hidden", m !== "join");
      });
    });

    el("btn-host-start").addEventListener("click", startHost);
    el("btn-host-stop").addEventListener("click", stopHost);
    el("btn-join").addEventListener("click", function () { joinRoom(el("room-input").value); });
    el("btn-leave").addEventListener("click", leaveRoom);
    el("btn-copy-url").addEventListener("click", copyUrl);
    el("chat-form").addEventListener("submit", onSendChat);
    el("file-input").addEventListener("change", onFilePick);
    el("btn-file-send").addEventListener("click", sendFile);

    var params = new URLSearchParams(location.search);
    var room = params.get("r");
    if (room) {
      document.querySelectorAll(".mode-tab").forEach(function (t) {
        t.classList.toggle("active", t.getAttribute("data-mode") === "join");
      });
      el("panel-host").classList.add("hidden");
      el("panel-join").classList.remove("hidden");
      el("room-input").value = room;
      waitPeer(function () { joinRoom(room); });
    }
  }

  function waitPeer(cb) {
    var n = 0;
    (function tick() {
      if (typeof Peer !== "undefined") return cb();
      if (++n > 80) return setStatus(el("join-status"), "peerjs load failed", "err");
      setTimeout(tick, 100);
    })();
  }

  function makePeer() {
    if (typeof Peer === "undefined") throw new Error("peerjs missing");
    return new Peer({
      debug: 0,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      }
    });
  }

  function destroy() {
    if (conn) { try { conn.close(); } catch (e) {} conn = null; }
    if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
    setChatEnabled(false);
    var b = el("chat-conn-badge");
    if (b) { b.textContent = "offline"; b.classList.remove("on"); }
    if (el("chat-peer-label")) el("chat-peer-label").textContent = "—";
  }

  function buildShareUrl(id) {
    var u = new URL(location.href);
    u.search = "?r=" + encodeURIComponent(id);
    return u.toString();
  }

  function renderQr(url) {
    var box = el("qr-box");
    if (!box) return;
    box.innerHTML = "";
    if (typeof QRCode === "undefined") return;
    try {
      new QRCode(box, { text: url, width: 150, height: 150, correctLevel: QRCode.CorrectLevel.M });
    } catch (e) {}
  }

  function addMsg(text, kind, who) {
    var log = el("chat-log");
    if (!log) return;
    var div = document.createElement("div");
    div.className = "msg " + (kind || "sys");
    if (who && kind !== "sys") {
      var w = document.createElement("span");
      w.className = "who";
      w.textContent = who;
      div.appendChild(w);
    }
    div.appendChild(document.createTextNode(text));
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  function setChatEnabled(on) {
    var panel = el("chat-panel");
    if (panel) panel.classList.toggle("hidden", !on);
    if (el("chat-input")) el("chat-input").disabled = !on;
    if (el("btn-send")) el("btn-send").disabled = !on;
    if (el("btn-file-send")) el("btn-file-send").disabled = !on || !selectedFile;
    if (on && el("chat-input")) el("chat-input").focus();
  }

  function wireConn(c, role) {
    conn = c;
    c.on("open", function () {
      setChatEnabled(true);
      var b = el("chat-conn-badge");
      if (b) { b.textContent = "online"; b.classList.add("on"); }
      if (el("chat-peer-label")) el("chat-peer-label").textContent = peerName;
      addMsg("connected", "sys");
      try { c.send(JSON.stringify({ type: "hello", name: myName })); } catch (e) {}
      if (role === "host") setStatus(el("host-status"), "connected", "ok");
      else setStatus(el("join-status"), "connected", "ok");
    });
    c.on("data", function (raw) {
      handleData(raw);
    });
    c.on("close", function () {
      addMsg("peer disconnected", "sys");
      var b = el("chat-conn-badge");
      if (b) { b.textContent = "offline"; b.classList.remove("on"); }
      setChatEnabled(false);
      if (role === "host") setStatus(el("host-status"), "peer left · waiting", "wait");
      else setStatus(el("join-status"), "disconnected", "err");
    });
    c.on("error", function () {
      if (role === "host") setStatus(el("host-status"), "error", "err");
      else setStatus(el("join-status"), "error", "err");
    });
  }

  function handleData(raw) {
    if (raw instanceof ArrayBuffer || (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView && ArrayBuffer.isView(raw))) {
      if (!recvMeta) return;
      var buf = raw instanceof ArrayBuffer ? raw : raw.buffer;
      recvChunks.push(buf);
      recvGot += (buf.byteLength || raw.byteLength || 0);
      var pct = recvMeta.size ? Math.min(100, (recvGot / recvMeta.size) * 100) : 0;
      var bar = el("file-bar");
      var prog = el("file-progress");
      if (prog) prog.classList.remove("hidden");
      if (bar) bar.style.width = pct + "%";
      if (recvGot >= recvMeta.size) {
        var blob = new Blob(recvChunks, { type: recvMeta.mime || "application/octet-stream" });
        var url = URL.createObjectURL(blob);
        var a = el("download-link");
        if (a) {
          a.href = url;
          a.download = recvMeta.name || "file";
          a.textContent = "download " + (recvMeta.name || "file");
          a.classList.remove("hidden");
        }
        addMsg("file received: " + (recvMeta.name || "file"), "sys");
        recvChunks = [];
        recvMeta = null;
        recvGot = 0;
      }
      return;
    }

    var data = raw;
    try {
      if (typeof raw === "string") data = JSON.parse(raw);
    } catch (e) {
      data = { type: "chat", text: String(raw) };
    }
    if (!data || !data.type) return;

    if (data.type === "hello") {
      peerName = (data.name && String(data.name).trim()) || "Peer";
      if (el("chat-peer-label")) el("chat-peer-label").textContent = peerName;
      addMsg(peerName + " joined", "sys");
      return;
    }
    if (data.type === "chat") {
      var t = data.text != null ? String(data.text) : "";
      if (t) addMsg(t, "them", peerName);
      return;
    }
    if (data.type === "file-meta") {
      recvMeta = { name: data.name, size: data.size || 0, mime: data.mime };
      recvChunks = [];
      recvGot = 0;
      var prog2 = el("file-progress");
      var bar2 = el("file-bar");
      if (prog2) prog2.classList.remove("hidden");
      if (bar2) bar2.style.width = "0%";
      var a2 = el("download-link");
      if (a2) a2.classList.add("hidden");
      addMsg("receiving file: " + (data.name || "file"), "sys");
    }
  }

  function startHost() {
    destroy();
    if (el("chat-log")) el("chat-log").innerHTML = "";
    myName = (el("host-name").value && el("host-name").value.trim()) || "Host";
    peerName = "Guest";
    setStatus(el("host-status"), "starting…", "wait");
    el("host-info").classList.remove("hidden");
    el("btn-host-start").classList.add("hidden");
    el("btn-host-stop").classList.remove("hidden");
    try { peer = makePeer(); } catch (e) {
      setStatus(el("host-status"), e.message, "err");
      el("btn-host-start").classList.remove("hidden");
      el("btn-host-stop").classList.add("hidden");
      return;
    }
    peer.on("open", function (id) {
      var url = buildShareUrl(id);
      el("share-url").value = url;
      renderQr(url);
      setStatus(el("host-status"), "waiting for peer…", "wait");
      showToast("room open");
    });
    peer.on("connection", function (c) {
      if (conn && conn.open) { try { c.close(); } catch (e) {} return; }
      wireConn(c, "host");
    });
    peer.on("error", function (err) {
      setStatus(el("host-status"), (err && err.type) || "error", "err");
    });
  }

  function stopHost() {
    destroy();
    el("host-info").classList.add("hidden");
    el("btn-host-start").classList.remove("hidden");
    el("btn-host-stop").classList.add("hidden");
    setStatus(el("host-status"), "", "");
    if (el("chat-log")) el("chat-log").innerHTML = "";
    el("chat-panel").classList.add("hidden");
  }

  function joinRoom(roomId) {
    roomId = (roomId || "").trim();
    if (!roomId) {
      setStatus(el("join-status"), "room id required", "err");
      return;
    }
    destroy();
    if (el("chat-log")) el("chat-log").innerHTML = "";
    myName = (el("join-name").value && el("join-name").value.trim()) || "Guest";
    peerName = "Host";
    setStatus(el("join-status"), "connecting…", "wait");
    el("btn-join").classList.add("hidden");
    el("btn-leave").classList.remove("hidden");
    try { peer = makePeer(); } catch (e) {
      setStatus(el("join-status"), e.message, "err");
      el("btn-join").classList.remove("hidden");
      el("btn-leave").classList.add("hidden");
      return;
    }
    peer.on("open", function () {
      var c = peer.connect(roomId, { reliable: true });
      wireConn(c, "join");
    });
    peer.on("error", function (err) {
      setStatus(el("join-status"), (err && err.type) || "error", "err");
      el("btn-join").classList.remove("hidden");
      el("btn-leave").classList.add("hidden");
    });
  }

  function leaveRoom() {
    destroy();
    el("btn-join").classList.remove("hidden");
    el("btn-leave").classList.add("hidden");
    setStatus(el("join-status"), "left", "");
    if (el("chat-log")) el("chat-log").innerHTML = "";
    el("chat-panel").classList.add("hidden");
  }

  function copyUrl() {
    var v = el("share-url").value;
    if (!v) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(v).then(function () { showToast("copied"); })
        .catch(function () { el("share-url").select(); showToast("copy manually"); });
    } else {
      el("share-url").select();
      showToast("copy manually");
    }
  }

  function onSendChat(e) {
    e.preventDefault();
    var text = (el("chat-input").value || "").trim();
    if (!text || !conn || !conn.open) return;
    try {
      conn.send(JSON.stringify({ type: "chat", text: text }));
      addMsg(text, "me", myName);
      el("chat-input").value = "";
    } catch (err) {
      showToast("send failed");
    }
  }

  function onFilePick() {
    var f = el("file-input").files && el("file-input").files[0];
    selectedFile = f || null;
    el("file-meta").textContent = f ? (f.name + " · " + f.size + " B") : "";
    el("btn-file-send").disabled = !f || !conn || !conn.open;
  }

  function sendFile() {
    if (!selectedFile || !conn || !conn.open) return;
    var file = selectedFile;
    var prog = el("file-progress");
    var bar = el("file-bar");
    if (prog) prog.classList.remove("hidden");
    if (bar) bar.style.width = "0%";
    try {
      conn.send(JSON.stringify({
        type: "file-meta",
        name: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream"
      }));
    } catch (e) {
      showToast("send failed");
      return;
    }
    var offset = 0;
    var reader = new FileReader();
    function next() {
      if (offset >= file.size) {
        addMsg("file sent: " + file.name, "sys");
        if (bar) bar.style.width = "100%";
        return;
      }
      var slice = file.slice(offset, offset + CHUNK);
      reader.onload = function (ev) {
        try {
          conn.send(ev.target.result);
        } catch (err) {
          showToast("transfer error");
          return;
        }
        offset += CHUNK;
        if (bar) bar.style.width = Math.min(100, (offset / file.size) * 100) + "%";
        setTimeout(next, 0);
      };
      reader.readAsArrayBuffer(slice);
    }
    next();
  }
})();
