/**
 * G⁵ Portal - Login (ID/Pass + QR) — same UX as asobiseminar
 */
(function () {
  "use strict";

  const BASE = (window.G5 && G5.BASE) || ".";
  let users = [];
  let html5Qr = null;
  let facingMode = "environment";

  async function loadUsers() {
    const res = await fetch(BASE + "/src/data/users.json?t=" + Date.now());
    if (!res.ok) throw new Error("users.json load failed");
    users = await res.json();
  }

  function findUser(id, pass) {
    id = String(id || "").trim();
    pass = String(pass || "");
    return users.find(function (u) {
      return u.id === id && u.pass === pass;
    }) || null;
  }

  function doLogin(user) {
    if (!user) return false;
    G5.setSession(user);
    const next = new URLSearchParams(location.search).get("next") || "index.html";
    location.href = next;
    return true;
  }

  function setMsg(text, isError) {
    const el = document.getElementById("login-msg");
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("error", !!isError);
  }

  async function onLoginClick() {
    setMsg("");
    const id = document.getElementById("uid").value;
    const pass = document.getElementById("pw").value;
    try {
      if (!users.length) await loadUsers();
      const user = findUser(id, pass);
      if (!user) {
        setMsg("IDまたはパスワードが違います", true);
        return;
      }
      doLogin(user);
    } catch (e) {
      setMsg("読み込みエラー: " + e.message, true);
    }
  }

  function parseQrPayload(text) {
    text = (text || "").trim();
    try {
      const obj = JSON.parse(text);
      if (obj && obj.id != null && obj.pass != null) return obj;
    } catch (e) {}
    const m = text.match(/^([^:]+):(.+)$/);
    if (m) return { id: m[1].trim(), pass: m[2] };
    return null;
  }

  async function onQrSuccess(decoded) {
    const payload = parseQrPayload(decoded);
    if (!payload) {
      setMsg("QR形式が無効です ({id,pass})", true);
      return;
    }
    try {
      if (!users.length) await loadUsers();
      const user = findUser(payload.id, payload.pass);
      if (!user) {
        setMsg("QRの認証に失敗しました", true);
        return;
      }
      stopQr();
      doLogin(user);
    } catch (e) {
      setMsg("読み込みエラー: " + e.message, true);
    }
  }

  function stopQr() {
    const panel = document.getElementById("qr-panel");
    if (panel) panel.classList.add("hidden");
    if (html5Qr) {
      html5Qr.stop().catch(function () {});
      html5Qr.clear();
      html5Qr = null;
    }
  }

  async function startQr() {
    const panel = document.getElementById("qr-panel");
    if (!panel) return;
    panel.classList.remove("hidden");
    setMsg("");

    if (typeof Html5Qrcode === "undefined") {
      setMsg("QRライブラリの読み込みに失敗しました", true);
      return;
    }

    if (html5Qr) stopQr();
    html5Qr = new Html5Qrcode("qr-reader");
    try {
      await html5Qr.start(
        { facingMode: facingMode },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        onQrSuccess,
        function () {}
      );
    } catch (e) {
      setMsg("カメラ起動失敗: " + (e.message || e), true);
    }
  }

  function flipCamera() {
    facingMode = facingMode === "environment" ? "user" : "environment";
    if (html5Qr) {
      stopQr();
      startQr();
    }
  }

  async function boot() {
    if (window.G5 && G5.getSession && G5.getSession()) {
      location.href = "index.html";
      return;
    }
    try {
      await loadUsers();
    } catch (e) {
      setMsg("ユーザーデータの読み込みに失敗", true);
    }

    document.getElementById("btn-login").addEventListener("click", onLoginClick);
    document.getElementById("pw").addEventListener("keydown", function (e) {
      if (e.key === "Enter") onLoginClick();
    });
    document.getElementById("btn-qr-login").addEventListener("click", startQr);
    document.getElementById("btn-qr-stop").addEventListener("click", stopQr);
    document.getElementById("btn-qr-flip").addEventListener("click", flipCamera);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
