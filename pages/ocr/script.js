/**
 * OCR 文字認識 — Tesseract.js client-side
 */
(function () {
  "use strict";

  var dropZone = document.getElementById("drop-zone");
  var fileInput = document.getElementById("file-input");
  var uploadPrompt = document.getElementById("upload-prompt");
  var preview = document.getElementById("preview");
  var btnRun = document.getElementById("btn-run");
  var btnClear = document.getElementById("btn-clear");
  var btnCopy = document.getElementById("btn-copy");
  var btnCamera = document.getElementById("btn-camera");
  var langSelect = document.getElementById("lang");
  var resultEl = document.getElementById("result");
  var confidenceEl = document.getElementById("confidence");
  var progressWrap = document.getElementById("progress-wrap");
  var progressFill = document.getElementById("progress-fill");
  var progressText = document.getElementById("progress-text");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var currentFile = null;
  var running = false;

  var camModal = document.getElementById("cam-modal");
  var camVideo = document.getElementById("cam-video");
  var camCanvas = document.getElementById("cam-canvas");
  var camError = document.getElementById("cam-error");
  var camClose = document.getElementById("cam-close");
  var camShot = document.getElementById("cam-shot");
  var camSwitch = document.getElementById("cam-switch");
  var camStream = null;
  var facingMode = "environment";

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
      setTimeout(function () {
        toastEl.classList.add("hidden");
      }, 280);
    }, 1800);
  }

  function setImage(file) {
    if (!file || !file.type.match(/^image\//)) {
      showToast("画像ファイルを選択してください");
      return;
    }
    currentFile = file;
    var url = URL.createObjectURL(file);
    preview.src = url;
    preview.classList.remove("hidden");
    uploadPrompt.classList.add("hidden");
    btnRun.disabled = false;
    resultEl.value = "";
    confidenceEl.textContent = "";
    btnCopy.disabled = true;
  }

  function clearAll() {
    currentFile = null;
    preview.src = "";
    preview.classList.add("hidden");
    uploadPrompt.classList.remove("hidden");
    btnRun.disabled = true;
    resultEl.value = "";
    confidenceEl.textContent = "";
    btnCopy.disabled = true;
    progressWrap.classList.add("hidden");
    progressFill.style.width = "0%";
    fileInput.value = "";
  }

  dropZone.addEventListener("click", function (e) {
    if (e.target === preview) return;
    fileInput.click();
  });

  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) {
      setImage(fileInput.files[0]);
    }
  });

  dropZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", function () {
    dropZone.classList.remove("dragover");
  });
  dropZone.addEventListener("drop", function (e) {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setImage(e.dataTransfer.files[0]);
    }
  });

  function stopCamera() {
    if (camStream) {
      camStream.getTracks().forEach(function (t) { t.stop(); });
      camStream = null;
    }
    if (camVideo) camVideo.srcObject = null;
  }

  function closeCam() {
    stopCamera();
    if (camModal) {
      camModal.classList.add("hidden");
      camModal.setAttribute("aria-hidden", "true");
    }
    if (camError) {
      camError.classList.add("hidden");
      camError.textContent = "";
    }
  }

  function openCam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      try {
        fileInput.setAttribute("capture", "environment");
        fileInput.click();
        setTimeout(function () { fileInput.removeAttribute("capture"); }, 500);
      } catch (e) {
        fileInput.click();
      }
      showToast("この端末ではカメラAPIが使えません。ファイル選択に切り替えました");
      return;
    }
    if (camModal) {
      camModal.classList.remove("hidden");
      camModal.setAttribute("aria-hidden", "false");
    }
    if (camError) camError.classList.add("hidden");
    startStream();
  }

  function startStream() {
    stopCamera();
    var constraints = {
      audio: false,
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };
    navigator.mediaDevices.getUserMedia(constraints)
      .then(function (stream) {
        camStream = stream;
        camVideo.srcObject = stream;
        camVideo.play().catch(function () {});
      })
      .catch(function (err) {
        console.error(err);
        var msg = "カメラを起動できませんでした";
        if (err && err.name === "NotAllowedError") {
          msg = "カメラの許可が必要です。ブラウザ設定を確認してください";
        } else if (err && err.name === "NotFoundError") {
          msg = "カメラが見つかりません";
        }
        if (camError) {
          camError.textContent = msg;
          camError.classList.remove("hidden");
        }
        showToast(msg);
      });
  }

  btnCamera.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    openCam();
  });

  if (camClose) camClose.addEventListener("click", closeCam);
  if (camModal) {
    camModal.addEventListener("click", function (e) {
      if (e.target === camModal) closeCam();
    });
  }

  if (camSwitch) {
    camSwitch.addEventListener("click", function () {
      facingMode = facingMode === "environment" ? "user" : "environment";
      startStream();
    });
  }

  if (camShot) {
    camShot.addEventListener("click", function () {
      if (!camStream || !camVideo.videoWidth) {
        showToast("カメラの準備ができていません");
        return;
      }
      var w = camVideo.videoWidth;
      var h = camVideo.videoHeight;
      camCanvas.width = w;
      camCanvas.height = h;
      var ctx = camCanvas.getContext("2d");
      ctx.drawImage(camVideo, 0, 0, w, h);
      camCanvas.toBlob(function (blob) {
        if (!blob) {
          showToast("撮影に失敗しました");
          return;
        }
        var file = new File([blob], "camera-" + Date.now() + ".jpg", { type: "image/jpeg" });
        setImage(file);
        closeCam();
        showToast("撮影しました");
      }, "image/jpeg", 0.92);
    });
  }

  btnClear.addEventListener("click", clearAll);

  btnCopy.addEventListener("click", function () {
    var t = resultEl.value;
    if (!t) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(
        function () { showToast("コピーしました"); },
        function () { fallbackCopy(t); }
      );
    } else {
      fallbackCopy(t);
    }
  });

  function fallbackCopy(t) {
    resultEl.select();
    try {
      document.execCommand("copy");
      showToast("コピーしました");
    } catch (e) {
      showToast("コピーに失敗しました");
    }
  }

  btnRun.addEventListener("click", function () {
    if (!currentFile || running) return;
    if (typeof Tesseract === "undefined") {
      showToast("OCRエンジンの読み込みに失敗しました");
      return;
    }
    running = true;
    btnRun.disabled = true;
    progressWrap.classList.remove("hidden");
    progressFill.style.width = "0%";
    progressText.textContent = "エンジン初期化中…";
    resultEl.value = "";
    confidenceEl.textContent = "";

    var lang = langSelect.value || "jpn+eng";

    Tesseract.recognize(currentFile, lang, {
      logger: function (m) {
        if (m.status === "recognizing text") {
          var pct = Math.round((m.progress || 0) * 100);
          progressFill.style.width = pct + "%";
          progressText.textContent = "認識中… " + pct + "%";
        } else if (m.status) {
          progressText.textContent = statusLabel(m.status);
        }
      }
    }).then(function (res) {
      var text = (res.data && res.data.text) ? res.data.text.trim() : "";
      resultEl.value = text || "(文字が検出されませんでした)";
      var conf = res.data && typeof res.data.confidence === "number"
        ? res.data.confidence.toFixed(1)
        : null;
      confidenceEl.textContent = conf !== null
        ? "信頼度: " + conf + "%"
        : "";
      btnCopy.disabled = !text;
      progressFill.style.width = "100%";
      progressText.textContent = "完了";
      showToast(text ? "認識完了" : "文字を検出できませんでした");
    }).catch(function (err) {
      console.error(err);
      resultEl.value = "";
      confidenceEl.textContent = "";
      progressText.textContent = "エラーが発生しました";
      showToast("認識に失敗しました");
    }).finally(function () {
      running = false;
      btnRun.disabled = !currentFile;
      setTimeout(function () {
        progressWrap.classList.add("hidden");
      }, 1200);
    });
  });

  function statusLabel(s) {
    var map = {
      "loading tesseract core": "コア読み込み中…",
      "initializing tesseract": "初期化中…",
      "loading language traineddata": "言語データ読み込み中…",
      "initializing api": "API 初期化中…",
      "recognizing text": "認識中…"
    };
    return map[s] || s;
  }

  window.addEventListener("pagehide", stopCamera);
})();
