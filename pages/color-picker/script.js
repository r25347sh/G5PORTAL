(function () {
  "use strict";
  var swatch = document.getElementById("swatch");
  var vHex = document.getElementById("v-hex");
  var vRgb = document.getElementById("v-rgb");
  var vHsl = document.getElementById("v-hsl");
  var colorInput = document.getElementById("color-input");
  var hexInput = document.getElementById("hex-input");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var canvas = document.getElementById("img-canvas");
  var ctx = canvas.getContext("2d", { willReadFrequently: true });
  var current = { r: 255, g: 45, b: 149 };

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1600);
  }
  function toHex(n) { return n.toString(16).padStart(2, "0"); }
  function rgbToHex(r, g, b) { return "#" + toHex(r) + toHex(g) + toHex(b); }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        default: h = ((r - g) / d + 4) / 6;
      }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }
  function parseHex(str) {
    str = (str || "").trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(str))
      str = str[0]+str[0]+str[1]+str[1]+str[2]+str[2];
    if (!/^[0-9a-fA-F]{6}$/.test(str)) return null;
    return { r: parseInt(str.slice(0,2),16), g: parseInt(str.slice(2,4),16), b: parseInt(str.slice(4,6),16) };
  }
  function setColor(r, g, b) {
    r = Math.max(0, Math.min(255, r|0));
    g = Math.max(0, Math.min(255, g|0));
    b = Math.max(0, Math.min(255, b|0));
    current = { r: r, g: g, b: b };
    var hex = rgbToHex(r, g, b);
    var hsl = rgbToHsl(r, g, b);
    swatch.style.background = hex;
    swatch.classList.add("flash");
    setTimeout(function () { swatch.classList.remove("flash"); }, 250);
    vHex.textContent = hex;
    vRgb.textContent = r + ", " + g + ", " + b;
    vHsl.textContent = hsl[0] + "\u00b0, " + hsl[1] + "%, " + hsl[2] + "%";
    colorInput.value = hex;
    hexInput.value = hex;
  }
  colorInput.addEventListener("input", function () {
    var p = parseHex(colorInput.value);
    if (p) setColor(p.r, p.g, p.b);
  });
  hexInput.addEventListener("change", function () {
    var p = parseHex(hexInput.value);
    if (p) setColor(p.r, p.g, p.b);
    else showToast("invalid HEX");
  });
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(text).then(function () { showToast("copied"); });
  }
  document.getElementById("btn-copy-hex").addEventListener("click", function () { copy(vHex.textContent); });
  document.getElementById("btn-copy-rgb").addEventListener("click", function () { copy("rgb(" + vRgb.textContent + ")"); });

  document.getElementById("btn-eyedrop").addEventListener("click", async function () {
    if (window.EyeDropper) {
      try {
        var ed = new EyeDropper();
        var res = await ed.open();
        var p = parseHex(res.sRGBHex);
        if (p) setColor(p.r, p.g, p.b);
        return;
      } catch (e) { if (e.name === "AbortError") return; }
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      showToast("no eyedropper");
      return;
    }
    try {
      var stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      var video = document.createElement("video");
      video.srcObject = stream; video.muted = true;
      await video.play();
      await new Promise(function (r) { setTimeout(r, 200); });
      var c = document.createElement("canvas");
      c.width = video.videoWidth || 1; c.height = video.videoHeight || 1;
      c.getContext("2d").drawImage(video, 0, 0);
      stream.getTracks().forEach(function (t) { t.stop(); });
      var data = c.getContext("2d").getImageData((c.width/2)|0, (c.height/2)|0, 1, 1).data;
      setColor(data[0], data[1], data[2]);
      showToast("center pixel (fallback)");
    } catch (e) { showToast("capture cancelled"); }
  });

  document.getElementById("img-file").addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var maxW = 480;
      var scale = Math.min(1, maxW / img.naturalWidth);
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
  canvas.addEventListener("click", function (e) {
    if (!canvas.width) return;
    var rect = canvas.getBoundingClientRect();
    var x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    var y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
    var data = ctx.getImageData(x, y, 1, 1).data;
    setColor(data[0], data[1], data[2]);
  });
  setColor(255, 45, 149);
})();
