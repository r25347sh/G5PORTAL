/**
 * 秘密鍵方式 暗号化・復号
 * Primary: AES-GCM (Web Crypto API)
 * Fallback: XOR + Base64
 */
(function () {
  "use strict";

  var mode = "enc";
  var useWebCrypto = !!(window.crypto && crypto.subtle);
  var secret = document.getElementById("secret");
  var plain = document.getElementById("plain");
  var result = document.getElementById("result");
  var msg = document.getElementById("msg");
  var labelIn = document.getElementById("label-in");
  var labelOut = document.getElementById("label-out");
  var btnRun = document.getElementById("btn-run");
  var algoNote = document.getElementById("algo-note");

  algoNote.textContent = useWebCrypto
    ? "\u65b9\u5f0f: AES-256-GCM\uff08Web Crypto API\uff09\u00b7 IV\u4ed8\u304d \u00b7 \u51fa\u529b\u306f Base64"
    : "\u65b9\u5f0f: XOR \u30d5\u30a9\u30fc\u30eb\u30d0\u30c3\u30af\uff08Web Crypto \u975e\u5bfe\u5fdc\uff09\u00b7 \u5f37\u5ea6\u306f\u4f4e\u3044\u3067\u3059";

  function setMsg(text, isError) {
    msg.textContent = text || "";
    msg.classList.toggle("error", !!isError);
  }

  function b64encode(buf) {
    var bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  function b64decode(str) {
    var bin = atob(str);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function strToBytes(str) {
    return new TextEncoder().encode(str);
  }

  function bytesToStr(bytes) {
    return new TextDecoder().decode(bytes);
  }

  async function deriveKey(password, salt) {
    var material = await crypto.subtle.importKey(
      "raw", strToBytes(password), "PBKDF2", false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptAes(text, password) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var key = await deriveKey(password, salt);
    var cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv }, key, strToBytes(text)
    );
    var ct = new Uint8Array(cipher);
    var packed = new Uint8Array(1 + 16 + 12 + ct.length);
    packed[0] = 1;
    packed.set(salt, 1);
    packed.set(iv, 17);
    packed.set(ct, 29);
    return b64encode(packed);
  }

  async function decryptAes(b64, password) {
    var packed = b64decode(b64);
    if (packed.length < 30 || packed[0] !== 1) {
      throw new Error("\u5f62\u5f0f\u304c\u7121\u52b9\u3067\u3059\uff08AES-GCM\uff09");
    }
    var salt = packed.slice(1, 17);
    var iv = packed.slice(17, 29);
    var ct = packed.slice(29);
    var key = await deriveKey(password, salt);
    var plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv }, key, ct
    );
    return bytesToStr(new Uint8Array(plainBuf));
  }

  function xorKeystream(password, len) {
    var out = new Uint8Array(len);
    var seed = strToBytes(password);
    var state = 0x811c9dc5;
    var si = 0;
    for (var i = 0; i < len; i++) {
      state ^= seed[si % seed.length];
      state = Math.imul(state, 0x01000193) >>> 0;
      out[i] = (state >>> 8) & 0xff;
      si++;
    }
    return out;
  }

  function encryptXor(text, password) {
    var data = strToBytes(text);
    var ks = xorKeystream(password, data.length);
    var out = new Uint8Array(data.length + 1);
    out[0] = 0;
    for (var i = 0; i < data.length; i++) out[i + 1] = data[i] ^ ks[i];
    return b64encode(out);
  }

  function decryptXor(b64, password) {
    var packed = b64decode(b64);
    if (packed[0] !== 0) {
      throw new Error("AES packet not supported without Web Crypto");
    }
    var data = packed.slice(1);
    var ks = xorKeystream(password, data.length);
    var out = new Uint8Array(data.length);
    for (var i = 0; i < data.length; i++) out[i] = data[i] ^ ks[i];
    return bytesToStr(out);
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll(".mode-tab").forEach(function (t) {
      var on = t.getAttribute("data-mode") === m;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (m === "enc") {
      labelIn.textContent = "\u5e73\u6587";
      labelOut.textContent = "\u6697\u53f7\u6587\uff08Base64\uff09";
      plain.placeholder = "\u6697\u53f7\u5316\u3059\u308b\u30c6\u30ad\u30b9\u30c8";
      btnRun.textContent = "\u6697\u53f7\u5316\u3059\u308b";
    } else {
      labelIn.textContent = "\u6697\u53f7\u6587\uff08Base64\uff09";
      labelOut.textContent = "\u5e73\u6587";
      plain.placeholder = "\u5fa9\u53f7\u3059\u308b Base64";
      btnRun.textContent = "\u5fa9\u53f7\u3059\u308b";
    }
    setMsg("");
  }

  document.querySelectorAll(".mode-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      setMode(tab.getAttribute("data-mode"));
    });
  });

  document.getElementById("btn-toggle-key").addEventListener("click", function () {
    secret.type = secret.type === "password" ? "text" : "password";
  });

  document.getElementById("btn-swap").addEventListener("click", function () {
    if (!result.value) return;
    plain.value = result.value;
    result.value = "";
    setMsg("\u7d50\u679c\u3092\u5165\u529b\u6b04\u3078");
  });

  document.getElementById("btn-copy").addEventListener("click", function () {
    if (!result.value) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(result.value).then(
        function () { setMsg("\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f"); },
        function () { setMsg("\u30b3\u30d4\u30fc\u5931\u6557", true); }
      );
    } else {
      result.select();
      try { document.execCommand("copy"); setMsg("\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f"); }
      catch (e) { setMsg("\u30b3\u30d4\u30fc\u5931\u6557", true); }
    }
  });

  btnRun.addEventListener("click", async function () {
    setMsg("");
    var pw = secret.value;
    var text = plain.value;
    if (!pw) { setMsg("\u79d8\u5bc6\u9375\u3092\u5165\u529b", true); return; }
    if (!text) { setMsg("\u30c6\u30ad\u30b9\u30c8\u3092\u5165\u529b", true); return; }
    btnRun.disabled = true;
    try {
      if (mode === "enc") {
        result.value = useWebCrypto ? await encryptAes(text, pw) : encryptXor(text, pw);
        setMsg(useWebCrypto ? "\u6697\u53f7\u5316\u5b8c\u4e86" : "\u6697\u53f7\u5316\u5b8c\u4e86 (XOR)");
      } else {
        result.value = useWebCrypto ? await decryptAes(text.trim(), pw) : decryptXor(text.trim(), pw);
        setMsg("\u5fa9\u53f7\u5b8c\u4e86");
      }
    } catch (e) {
      result.value = "";
      setMsg("\u5931\u6557: " + (e.message || e), true);
    }
    btnRun.disabled = false;
  });
})();
