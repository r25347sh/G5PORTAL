(function () {
  "use strict";
  var input = document.getElementById("input");
  var size = document.getElementById("size");
  var sizeVal = document.getElementById("size-val");
  var mode = document.getElementById("mode");
  var theme = document.getElementById("theme");
  var preview = document.getElementById("preview");
  function render() {
    var text = input.value;
    var px = +size.value || 96;
    sizeVal.textContent = px + "px";
    preview.className = "preview theme-" + theme.value + " mode-" + mode.value;
    if (!text) {
      preview.innerHTML = '<p class="preview-hint">\u4e0a\u306b\u6587\u5b57\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044</p>';
      return;
    }
    if (mode.value === "together") {
      var span = document.createElement("span");
      span.className = "mag-char";
      span.style.fontSize = px + "px";
      span.textContent = text;
      preview.innerHTML = "";
      preview.appendChild(span);
      return;
    }
    var chars = Array.from(text);
    preview.innerHTML = "";
    chars.forEach(function (ch, i) {
      var el = document.createElement("span");
      el.className = "mag-char";
      el.style.fontSize = px + "px";
      el.style.animationDelay = i * 0.04 + "s";
      el.textContent = ch === " " ? "\u00A0" : ch;
      preview.appendChild(el);
    });
  }
  input.addEventListener("input", render);
  size.addEventListener("input", render);
  mode.addEventListener("change", render);
  theme.addEventListener("change", render);
  render();
})();
