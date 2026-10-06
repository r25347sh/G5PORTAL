(function () {
  "use strict";
  var fileInput = document.getElementById("pdf-file");
  var userPass = document.getElementById("user-pass");
  var ownerPass = document.getElementById("owner-pass");
  var btn = document.getElementById("btn-protect");
  var status = document.getElementById("status");
  var fileNameEl = document.getElementById("file-name");
  var selectedFile = null;

  function setStatus(msg) { status.textContent = msg || ""; }

  fileInput.addEventListener("change", function () {
    selectedFile = fileInput.files && fileInput.files[0] || null;
    fileNameEl.textContent = selectedFile ? selectedFile.name : "";
  });

  btn.addEventListener("click", async function () {
    if (typeof PDFLib === "undefined") {
      setStatus("pdf-lib の読み込みに失敗しました");
      return;
    }
    if (!selectedFile) {
      setStatus("PDFを選択してください");
      return;
    }
    var up = (userPass.value || "").trim();
    if (!up) {
      setStatus("閲覧パスワードを入力してください");
      return;
    }
    var op = (ownerPass.value || "").trim() || up;
    setStatus("処理中…");
    btn.disabled = true;
    try {
      var buf = await selectedFile.arrayBuffer();
      var pdfDoc = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
      var saved = await pdfDoc.save({
        userPassword: up,
        ownerPassword: op,
        permissions: {
          printing: "highResolution",
          modifying: false,
          copying: false,
          annotating: false,
          fillingForms: false,
          contentAccessibility: true,
          documentAssembly: false
        }
      });
      var blob = new Blob([saved], { type: "application/pdf" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      var base = selectedFile.name.replace(/\.pdf$/i, "") || "document";
      a.download = base + "_protected.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
      setStatus("完了: " + a.download + " を保存しました");
    } catch (err) {
      console.error(err);
      setStatus("失敗: " + (err && err.message ? err.message : "不明なエラー"));
    }
    btn.disabled = false;
  });
})();
