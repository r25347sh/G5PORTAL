(function () {
  "use strict";

  var peer = null;
  var conn = null;
  var myName = "Me";
  var peerName = "Peer";
  var toastEl = document.getElementById("toast");
  var toastTimer = null;

  var hostName = document.getElementById("host-name");
  var joinName = document.getElementById("join-name");
  var btnHostStart = document.getElementById("btn-host-start");
  var btnHostStop = document.getElementById("btn-host-stop");
  var hostInfo = document.getElementById("host-info");
  var shareUrl = document.getElementById("share-url");
  var qrBox = document.getElementById("qr-box");
  var hostStatus = document.getElementById("host-status");
  var roomInput = document.getElementById("room-input");
  var btnJoin = document.getElementById("btn-join");
  var btnLeave = document.getElementById("btn-leave");
  var joinStatus = document.getElementById("join-status");
  var chatPanel = document.getElementById("chat-panel");
  var chatLog = document.getElementById("chat-log");
  var chatForm = document.getElementById("chat-form");
  var chatInput = document.getElementById("chat-input");
  var btnSend = document.getElementById("btn-send");
  var peerLabel = document.getElementById("chat-peer-label");
  var connBadge = document.getElementById("chat-conn-badge");

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
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
    document.getElementById("panel-join").classList.toggle("hidden", m !== "join");
  }

  document.querySelectorAll(".mode-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      setMode(tab.getAttribute("data-mode"));
    });
  });

  function makePeer() {
    if (typeof Peer === "undefined") throw new Error("PeerJS の読み込みに失敗しました");
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
    if (conn) {
      try { conn.close(); } catch (e) {}
      conn = null;
    }
    if (peer) {
      try { peer.destroy(); } catch (e) {}
      peer = null;
    }
    setChatEnabled(false);
    connBadge.textContent = "オフライン";
    connBadge.classList.remove("on");
    peerLabel.textContent = "未接続";
  }

  function buildShareUrl(id) {
    var u = new URL(location.href);
    u.search = "?room=" + encodeURIComponent(id);
    return u.toString();
  }

  function renderQr(url) {
    qrBox.innerHTML = "";
    if (typeof QRCode === "undefined") return;
    try {
      new QRCode(qrBox, { text: url, width: 160, height: 160, correctLevel: QRCode.CorrectLevel.M });
    } catch (e) {}
  }

  function addMsg(text, kind, who) {
    var div = document.createElement("div");
    div.className = "msg " + (kind || "sys");
    if (who && kind !== "sys") {
      var w = document.createElement("span");
      w.className = "who";
      w.textContent = who;
      div.appendChild(w);
    }
    div.appendChild(document.createTextNode(text));
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function setChatEnabled(on) {
    chatPanel.classList.toggle("hidden", !on);
    chatInput.disabled = !on;
    btnSend.disabled = !on;
    if (on) chatInput.focus();
  }

  function wireConn(c, role) {
    conn = c;
    c.on("open", function () {
      setChatEnabled(true);
      connBadge.textContent = "接続中";
      connBadge.classList.add("on");
      peerLabel.textContent = peerName;
      addMsg("接続しました", "sys");
      try {
        c.send(JSON.stringify({ type: "hello", name: myName }));
      } catch (e) {}
      if (role === "host") setStatus(hostStatus, "接続済み", "ok");
      else setStatus(joinStatus, "接続済み", "ok");
    });
    c.on("data", function (raw) {
      var data = raw;
      try {
        if (typeof raw === "string") data = JSON.parse(raw);
      } catch (e) {
        data = { type: "chat", text: String(raw) };
      }
      if (data && data.type === "hello") {
        peerName = (data.name && String(data.name).trim()) || "Peer";
        peerLabel.textContent = peerName;
        addMsg(peerName + " が参加しました", "sys");
        return;
      }
      if (data && data.type === "chat") {
        var t = data.text != null ? String(data.text) : "";
        if (!t) return;
        addMsg(t, "them", peerName);
      }
    });
    c.on("close", function () {
      addMsg("相手が切断しました", "sys");
      connBadge.textContent = "オフライン";
      connBadge.classList.remove("on");
      setChatEnabled(false);
      if (role === "host") setStatus(hostStatus, "相手が切断 · 再接続待ち", "wait");
      else setStatus(joinStatus, "切断されました", "err");
    });
    c.on("error", function () {
      if (role === "host") setStatus(hostStatus, "接続エラー", "err");
      else setStatus(joinStatus, "接続エラー", "err");
    });
  }

  function startHost() {
    destroy();
    chatLog.innerHTML = "";
    myName = (hostName.value && hostName.value.trim()) || "Host";
    peerName = "Guest";
    setStatus(hostStatus, "準備中…", "wait");
    hostInfo.classList.remove("hidden");
    btnHostStart.classList.add("hidden");
    btnHostStop.classList.remove("hidden");
    try {
      peer = makePeer();
    } catch (e) {
      setStatus(hostStatus, e.message, "err");
      btnHostStart.classList.remove("hidden");
      btnHostStop.classList.add("hidden");
      return;
    }
    peer.on("open", function (id) {
      var url = buildShareUrl(id);
      shareUrl.value = url;
      renderQr(url);
      setStatus(hostStatus, "待機中 · 相手の参加を待っています", "wait");
      showToast("部屋を作成しました");
    });
    peer.on("connection", function (c) {
      if (conn && conn.open) {
        try { c.close(); } catch (e) {}
        return;
      }
      wireConn(c, "host");
    });
    peer.on("error", function (err) {
      setStatus(hostStatus, (err && err.type) || "エラー", "err");
    });
    peer.on("disconnected", function () {
      setStatus(hostStatus, "シグナリング切断", "err");
    });
  }

  function stopHost() {
    destroy();
    hostInfo.classList.add("hidden");
    btnHostStart.classList.remove("hidden");
    btnHostStop.classList.add("hidden");
    setStatus(hostStatus, "", "");
    chatLog.innerHTML = "";
    chatPanel.classList.add("hidden");
  }

  function joinRoom(roomId) {
    roomId = (roomId || "").trim();
    if (!roomId) {
      setStatus(joinStatus, "ルーム ID を入力してください", "err");
      return;
    }
    destroy();
    chatLog.innerHTML = "";
    myName = (joinName.value && joinName.value.trim()) || "Guest";
    peerName = "Host";
    setStatus(joinStatus, "接続中…", "wait");
    btnJoin.classList.add("hidden");
    btnLeave.classList.remove("hidden");
    try {
      peer = makePeer();
    } catch (e) {
      setStatus(joinStatus, e.message, "err");
      btnJoin.classList.remove("hidden");
      btnLeave.classList.add("hidden");
      return;
    }
    peer.on("open", function () {
      var c = peer.connect(roomId, { reliable: true });
      wireConn(c, "join");
    });
    peer.on("error", function (err) {
      setStatus(joinStatus, (err && err.type) || "エラー", "err");
      btnJoin.classList.remove("hidden");
      btnLeave.classList.add("hidden");
    });
  }

  function leaveRoom() {
    destroy();
    btnJoin.classList.remove("hidden");
    btnLeave.classList.add("hidden");
    setStatus(joinStatus, "退出しました", "");
    chatLog.innerHTML = "";
    chatPanel.classList.add("hidden");
  }

  btnHostStart.addEventListener("click", startHost);
  btnHostStop.addEventListener("click", stopHost);
  btnJoin.addEventListener("click", function () { joinRoom(roomInput.value); });
  btnLeave.addEventListener("click", leaveRoom);

  document.getElementById("btn-copy-url").addEventListener("click", function () {
    if (!shareUrl.value) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl.value).then(function () {
        showToast("URL をコピーしました");
      }).catch(function () {
        shareUrl.select();
        showToast("手動でコピーしてください");
      });
    } else {
      shareUrl.select();
      showToast("手動でコピーしてください");
    }
  });

  chatForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = (chatInput.value || "").trim();
    if (!text || !conn || !conn.open) return;
    try {
      conn.send(JSON.stringify({ type: "chat", text: text }));
      addMsg(text, "me", myName);
      chatInput.value = "";
    } catch (err) {
      showToast("送信に失敗しました");
    }
  });

  (function () {
    var params = new URLSearchParams(location.search);
    var room = params.get("room");
    if (room) {
      setMode("join");
      roomInput.value = room;
      function tryJoin() {
        if (typeof Peer === "undefined") {
          setTimeout(tryJoin, 150);
          return;
        }
        joinRoom(room);
      }
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { setTimeout(tryJoin, 100); });
      } else {
        setTimeout(tryJoin, 100);
      }
    }
  })();
})();
