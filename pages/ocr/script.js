/**
 * OCR 文字認識 — Tesseract.js + 画像前処理で精度向上
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
  var preprocessSelect = document.getElementById("preprocess");
  var psmSelect = document.getElementById("psm");
  var resultEl = document.getElementById("result");
  var confidenceEl = document.getElementById("confidence");
  var progressWrap = document.getElementById("progress-wrap");
  var progressFill = document.getElementById("progress-fill");
  var progressText = document.getElementById("progress-text");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var currentFile = null;
  var running = false;
  var worker = null;
  var workerLang = null;

  var camModal = document.getElementById("cam-modal");
  var camVideo = document.getElementById("cam-video");
  var camCanvas = document.getElementById("cam-canvas");
  var camError = document.getElementById("cam-error");
  var camClose = document.getElementById("cam-close");
  var camShot = document.getElementById("cam-shot");
  var camSwitch = document.getElementById("cam-switch");
  var camStream = null;
  var facingMode = "environment";

  var MIN_LONG_SIDE = 1600;
  var MAX_LONG_SIDE = 3200;

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

  function loadImageFromFile(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("画像の読み込みに失敗しました"));
      };
      img.src = url;
    });
  }

  function otsuThreshold(gray, w, h) {
    var hist = new Array(256);
    for (var i = 0; i < 256; i++) hist[i] = 0;
    var n = w * h;
    for (i = 0; i < n; i++) hist[gray[i]]++;
    var sum = 0;
    for (i = 0; i < 256; i++) sum += i * hist[i];
    var sumB = 0, wB = 0, max = 0, thr = 128;
    for (i = 0; i < 256; i++) {
      wB += hist[i];
      if (wB === 0) continue;
      var wF = n - wB;
      if (wF === 0) break;
      sumB += i * hist[i];
      var mB = sumB / wB;
      var mF = (sum - sumB) / wF;
      var between = wB * wF * (mB - mF) * (mB - mF);
      if (between > max) {
        max = between;
        thr = i;
      }
    }
    return thr;
  }

  function preprocessImage(img, mode) {
    mode = mode || "auto";
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error("無効な画像サイズ");

    var longSide = Math.max(w, h);
    var scale = 1;
    if (longSide < MIN_LONG_SIDE) {
      scale = MIN_LONG_SIDE / longSide;
    } else if (longSide > MAX_LONG_SIDE) {
      scale = MAX_LONG_SIDE / longSide;
    }
    if (scale === 1 && longSide < 2200 && mode !== "raw") {
      scale = Math.min(1.5, 2200 / longSide);
    }

    var tw = Math.round(w * scale);
    var th = Math.round(h * scale);
    var canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, tw, th);

    if (mode === "raw") return canvas;

    var imageData = ctx.getImageData(0, 0, tw, th);
    var d = imageData.data;
    var n = tw * th;
    var gray = new Uint8Array(n);

    for (var i = 0, p = 0; i < n; i++, p += 4) {
      gray[i] = (0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2]) | 0;
    }

    var hist = new Array(256);
    for (i = 0; i < 256; i++) hist[i] = 0;
    for (i = 0; i < n; i++) hist[gray[i]]++;
    var loCount = Math.floor(n * 0.01);
    var hiCount = Math.floor(n * 0.99);
    var cum = 0, lo = 0, hi = 255;
    for (i = 0; i < 256; i++) {
      cum += hist[i];
      if (cum >= loCount) {
        lo = i;
        break;
      }
    }
    cum = 0;
    for (i = 0; i < 256; i++) {
      cum += hist[i];
      if (cum >= hiCount) {
        hi = i;
        break;
      }
    }
    if (hi <= lo) {
      lo = 0;
      hi = 255;
    }
    var range = hi - lo;

    var stretched = new Uint8Array(n);
    for (i = 0; i < n; i++) {
      var v = gray[i];
      if (v <= lo) stretched[i] = 0;
      else if (v >= hi) stretched[i] = 255;
      else stretched[i] = (((v - lo) / range) * 255) | 0;
    }

    var out;
    if (mode === "binary" || (mode === "auto" && isLikelyDocument(stretched, n))) {
      var thr = otsuThreshold(stretched, tw, th);
      thr = Math.min(200, Math.max(90, thr));
      out = new Uint8Array(n);
      for (i = 0; i < n; i++) {
        out[i] = stretched[i] > thr ? 255 : 0;
      }
    } else {
      out = new Uint8Array(n);
      for (i = 0; i < n; i++) {
        var x = stretched[i] / 255;
        var y = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
        out[i] = (y * 255) | 0;
      }
    }

    for (i = 0, p = 0; i < n; i++, p += 4) {
      d[p] = d[p + 1] = d[p + 2] = out[i];
      d[p + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  function isLikelyDocument(gray, n) {
    var bright = 0;
    for (var i = 0; i < n; i += 7) {
      if (gray[i] > 200) bright++;
    }
    var samples = Math.ceil(n / 7);
    return bright / samples > 0.45;
  }

  function ensureWorker(lang, onProgress) {
    if (worker && workerLang === lang) {
      return Promise.resolve(worker);
    }
    var term = worker
      ? worker.terminate().catch(function () {}).then(function () {
          worker = null;
          workerLang = null;
        })
      : Promise.resolve();

    return term.then(function () {
      if (typeof Tesseract === "undefined" || !Tesseract.createWorker) {
        return Promise.reject(new Error("OCRエンジン未読込"));
      }
      if (onProgress) onProgress("言語データ読み込み中…");
      return Tesseract.createWorker(lang, 1, {
        logger: function (m) {
          if (!onProgress) return;
          if (m.status === "recognizing text") {
            var pct = Math.round((m.progress || 0) * 100);
            onProgress("認識中… " + pct + "%", pct);
          } else if (m.status === "loading language traineddata") {
            onProgress("言語データ読み込み中…");
          } else if (m.status === "initializing api") {
            onProgress("初期化中…");
          } else if (m.status) {
            onProgress(statusLabel(m.status));
          }
        }
      }).then(function (w) {
        worker = w;
        workerLang = lang;
        return w;
      });
    });
  }

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

  function psmValue() {
    var v = psmSelect ? psmSelect.value : "6";
    var n = parseInt(v, 10);
    return isFinite(n) ? n : 6;
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
    progressText.textContent = "画像前処理中…";
    resultEl.value = "";
    confidenceEl.textContent = "";

    var lang = (langSelect && langSelect.value) || "jpn+eng";
    var mode = (preprocessSelect && preprocessSelect.value) || "auto";
    var psm = psmValue();

    loadImageFromFile(currentFile)
      .then(function (img) {
        progressText.textContent = "前処理中（拡大・コントラスト）…";
        progressFill.style.width = "8%";
        var canvas = preprocessImage(img, mode);
        progressFill.style.width = "15%";
        progressText.textContent = "エンジン準備中…";

        return ensureWorker(lang, function (msg, pct) {
          progressText.textContent = msg;
          if (typeof pct === "number") {
            progressFill.style.width = Math.min(98, 15 + pct * 0.8) + "%";
          }
        }).then(function (w) {
          return w.setParameters({
            tessedit_pageseg_mode: String(psm),
            preserve_interword_spaces: "1",
            user_defined_dpi: "300"
          }).then(function () {
            progressText.textContent = "認識中…";
            return w.recognize(canvas);
          });
        });
      })
      .then(function (res) {
        var text = (res.data && res.data.text) ? res.data.text.trim() : "";
        text = text
          .replace(/[ \t]+\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .replace(/[^\S\n]{2,}/g, " ");
        resultEl.value = text || "(文字が検出されませんでした)";
        var conf =
          res.data && typeof res.data.confidence === "number"
            ? res.data.confidence.toFixed(1)
            : null;
        confidenceEl.textContent = conf !== null ? "信頼度: " + conf + "%" : "";
        btnCopy.disabled = !text;
        progressFill.style.width = "100%";
        progressText.textContent = "完了";
        if (!text) {
          showToast("文字を検出できませんでした。前処理や領域設定を変えて再試行してください");
        } else if (conf !== null && parseFloat(conf) < 50) {
          showToast("認識完了（信頼度低め — 前処理の変更を推奨）");
        } else {
          showToast("認識完了");
        }
      })
      .catch(function (err) {
        console.error(err);
        resultEl.value = "";
        confidenceEl.textContent = "";
        progressText.textContent = "エラーが発生しました";
        showToast(err && err.message ? err.message : "認識に失敗しました");
      })
      .finally(function () {
        running = false;
        btnRun.disabled = !currentFile;
        setTimeout(function () {
          progressWrap.classList.add("hidden");
        }, 1200);
      });
  });

  function stopCamera() {
    if (camStream) {
      camStream.getTracks().forEach(function (t) {
        t.stop();
      });
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
        setTimeout(function () {
          fileInput.removeAttribute("capture");
        }, 500);
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
    navigator.mediaDevices
      .getUserMedia(constraints)
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
      camCanvas.toBlob(
        function (blob) {
          if (!blob) {
            showToast("撮影に失敗しました");
            return;
          }
          var file = new File([blob], "camera-" + Date.now() + ".jpg", {
            type: "image/jpeg"
          });
          setImage(file);
          closeCam();
          showToast("撮影しました");
        },
        "image/jpeg",
        0.95
      );
    });
  }

  btnClear.addEventListener("click", clearAll);

  btnCopy.addEventListener("click", function () {
    var t = resultEl.value;
    if (!t) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(
        function () {
          showToast("コピーしました");
        },
        function () {
          fallbackCopy(t);
        }
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

  window.addEventListener("pagehide", function () {
    stopCamera();
    if (worker) {
      worker.terminate().catch(function () {});
      worker = null;
      workerLang = null;
    }
  });
})();
