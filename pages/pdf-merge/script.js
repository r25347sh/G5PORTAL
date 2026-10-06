(function () {
  "use strict";
  var files = [];
  var fileInput = document.getElementById("pdf-files");
  var listEl = document.getElementById("file-list");
  var status = document.getElementById("status");
  var dropHint = document.getElementById("drop-hint");
  var btnAdd = document.getElementById("btn-add");
  var btnClear = document.getElementById("btn-clear");
  var btnMerge = document.getElementById("btn-merge");

  function setStatus(msg) { status.textContent = msg || ""; }

  function renderList() {
    listEl.innerHTML = "";
    files.forEach(function (f, i) {
      var li = document.createElement("li");
      var ord = document.createElement("span");
      ord.className = "ord";
      ord.textContent = String(i + 1) + ".";
      var name = document.createElement("span");
      name.textContent = f.name;
      var up = document.createElement("button");
      up.type = "button";
      up.className = "btn btn-ghost btn-sm";
      up.textContent = "↑";
      up.disabled = i === 0;
      up.addEventListener("click", function () {
        if (i <= 0) return;
        var t = files[i - 1]; files[i - 1] = files[i]; files[i] = t;
        renderList();
      });
      var down = document.createElement("button");
      down.type = "button";
      down.className = "btn btn-ghost btn-sm";
      down.textContent = "↓";
      down.disabled = i === files.length - 1;
      down.addEventListener("click", function () {
        if (i >= files.length - 1) return;
        var t = files[i + 1]; files[i + 1] = files[i]; files[i] = t;
        renderList();
      });
      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "btn btn-ghost btn-sm";
      rm.textContent = "×";
      rm.addEventListener("click", function () {
        files.splice(i, 1);
        renderList();
      });
      li.appendChild(ord);
      li.appendChild(name);
      li.appendChild(up);
      li.appendChild(down);
      li.appendChild(rm);
      listEl.appendChild(li);
    });
  }

  function addFiles(fileList) {
    Array.prototype.forEach.call(fileList, function (f) {
      if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
        files.push(f);
      }
    });
    renderList();
  }

  btnAdd.addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function () {
    if (fileInput.files) addFiles(fileInput.files);
    fileInput.value = "";
  });
  btnClear.addEventListener("click", function () {
    files = [];
    renderList();
    setStatus("");
  });

  dropHint.addEventListener("click", function () { fileInput.click(); });
  ["dragenter", "dragover"].forEach(function (ev) {
    dropHint.addEventListener(ev, function (e) {
      e.preventDefault();
      dropHint.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    dropHint.addEventListener(ev, function (e) {
      e.preventDefault();
      dropHint.classList.remove("dragover");
    });
  });
  dropHint.addEventListener("drop", function (e) {
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });

  btnMerge.addEventListener("click", async function () {
    if (typeof PDFLib === "undefined") {
      setStatus("pdf-lib の読み込みに失敗しました");
      return;
    }
    if (files.length < 1) {
      setStatus("PDFを1つ以上追加してください");
      return;
    }
    setStatus("結合中…");
    btnMerge.disabled = true;
    try {
      var out = await PDFLib.PDFDocument.create();
      for (var i = 0; i < files.length; i++) {
        setStatus("読み込み中 (" + (i + 1) + "/" + files.length + ")…");
        var buf = await files[i].arrayBuffer();
        var src = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
        var idxs = src.getPageIndices();
        var copied = await out.copyPages(src, idxs);
        copied.forEach(function (p) { out.addPage(p); });
      }
      var saved = await out.save();
      var blob = new Blob([saved], { type: "application/pdf" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "merged.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
      setStatus("完了: merged.pdf（" + out.getPageCount() + " ページ）");
    } catch (err) {
      console.error(err);
      setStatus("失敗: " + (err && err.message ? err.message : "不明なエラー") +
        "（パスワード付きPDFは解除してからお試しください）");
    }
    btnMerge.disabled = false;
  });
})();
