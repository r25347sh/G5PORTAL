/**
 * G5 Portal · Advanced PDF Viewer
 * Modes: view (read-only + text select) | write (annotate) | presentation
 * Text layer, text/note annotations, shapes, pen/finger toggle
 */
(function () {
  "use strict";

  if (typeof pdfjsLib === "undefined") {
    var st0 = document.getElementById("status-text");
    if (st0) st0.textContent = "PDF.js 読込失敗";
    return;
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  var pdfDoc = null;
  var pdfBytes = null;
  var currentPage = 1;
  var totalPages = 0;
  var scale = 1.2;
  var zoomMode = "auto";
  var rotation = 0;
  var invertColors = false;
  var pageRenders = {};
  var annotations = {};
  var undoStack = [];
  var redoStack = [];
  var pdfFingerprint = "";
  var viewerMode = "view";
  var inputMode = "pen";
  var currentTool = "pen";
  var strokeColor = "#ff2d95";
  var strokeSize = 3;
  var fontSize = 16;
  var searchMatches = [];
  var searchIndex = -1;
  var hasPenCapability = false;
  var isDrawing = false;
  var currentStroke = null;
  var activePointers = {};
  var panState = null;
  var pinchState = null;
  var shapePreview = null;
  var fileName = "document.pdf";
  var pendingTextPlace = null;
  var selectedText = "";

  try {
    var sm = localStorage.getItem("g5_pdf_input_mode");
    if (sm === "pen" || sm === "finger") inputMode = sm;
  } catch (e) {}

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    title: $("pdf-title"), fileInput: $("file-input"),
    btnOpen: $("btn-open"), btnOpenMain: $("btn-open-main"), btnDownload: $("btn-download"),
    btnPrev: $("btn-prev"), btnNext: $("btn-next"),
    pageNum: $("page-num"), pageCount: $("page-count"),
    btnZoomIn: $("btn-zoom-in"), btnZoomOut: $("btn-zoom-out"), zoomSelect: $("zoom-select"),
    btnRotate: $("btn-rotate"), btnInvert: $("btn-invert"),
    btnSearch: $("btn-search"), btnSidebar: $("btn-sidebar"),
    btnFullscreen: $("btn-fullscreen"),
    vmView: $("vm-view"), vmWrite: $("vm-write"), vmPres: $("vm-pres"),
    searchBar: $("search-bar"), searchInput: $("search-input"), searchCount: $("search-count"),
    searchPrev: $("search-prev"), searchNext: $("search-next"), searchClose: $("search-close"),
    btnCopySel: $("btn-copy-sel"),
    annotToolbar: $("annot-toolbar"), annotColor: $("annot-color"), annotSize: $("annot-size"),
    annotFontSize: $("annot-font-size"),
    annotUndo: $("annot-undo"), annotRedo: $("annot-redo"),
    annotClearPage: $("annot-clear-page"), annotExport: $("annot-export"), penHint: $("pen-hint"),
    modePen: $("mode-pen"), modeFinger: $("mode-finger"),
    sidebar: $("pdf-sidebar"), thumbsPanel: $("thumbs-panel"), outlinePanel: $("outline-panel"),
    viewer: $("pdf-viewer"), pagesContainer: $("pages-container"), dropZone: $("drop-zone"),
    statusText: $("status-text"), penStatus: $("pen-status"),
    selTextPreview: $("sel-text-preview"),
    progressBar: $("progress-bar"), progressFill: $("progress-fill"),
    presOverlay: $("pres-overlay"), presPageBadge: $("pres-page-badge"),
    textPopup: $("text-editor-popup"), textInput: $("text-editor-input"),
    textOk: $("text-editor-ok"), textCancel: $("text-editor-cancel")
  };

  function setStatus(msg) { if (el.statusText) el.statusText.textContent = msg || ""; }

  function setControlsEnabled(on) {
    [el.btnPrev, el.btnNext, el.pageNum, el.btnZoomIn, el.btnZoomOut, el.zoomSelect,
     el.btnRotate, el.btnInvert, el.btnSearch, el.btnSidebar, el.btnDownload,
     el.vmWrite, el.vmPres
    ].forEach(function (b) { if (b) b.disabled = !on; });
  }

  function setProgress(pct) {
    if (!el.progressBar || !el.progressFill) return;
    if (pct == null || pct >= 100) {
      el.progressBar.classList.add("hidden");
      el.progressFill.style.width = "0%";
      return;
    }
    el.progressBar.classList.remove("hidden");
    el.progressFill.style.width = Math.max(0, Math.min(100, pct)) + "%";
  }

  function updateInputModeUI() {
    if (el.modePen) el.modePen.classList.toggle("active", inputMode === "pen");
    if (el.modeFinger) el.modeFinger.classList.toggle("active", inputMode === "finger");
    if (el.penHint) {
      el.penHint.textContent = inputMode === "pen"
        ? "ペンモード: ペン＝描画 · 指＝移動"
        : "指モード: 指＝描画 · 2本指＝移動";
    }
    updatePenStatus();
  }

  function setInputMode(mode) {
    if (mode !== "pen" && mode !== "finger") return;
    inputMode = mode;
    try { localStorage.setItem("g5_pdf_input_mode", mode); } catch (e) {}
    updateInputModeUI();
    setStatus(inputMode === "pen" ? "入力: 電子ペンモード" : "入力: 指モード");
  }

  function updatePenStatus() {
    if (!el.penStatus) return;
    var parts = [];
    if (hasPenCapability) parts.push("電子ペン検知");
    if (viewerMode === "write") parts.push(inputMode === "pen" ? "ペン入力" : "指入力");
    else if (viewerMode === "pres") parts.push("プレゼン");
    else parts.push("閲覧");
    el.penStatus.textContent = parts.join(" · ");
    el.penStatus.classList.toggle("has-pen", hasPenCapability);
  }

  function storageKey() {
    return "g5_pdf_annot_v4_" + (pdfFingerprint || "unknown").slice(0, 40);
  }

  function loadAnnotations() {
    try {
      var raw = localStorage.getItem(storageKey());
      if (raw) {
        var obj = JSON.parse(raw);
        if (obj && typeof obj === "object") annotations = obj;
      }
    } catch (e) { annotations = {}; }
    undoStack = [];
    redoStack = [];
  }

  function saveAnnotations() {
    try { localStorage.setItem(storageKey(), JSON.stringify(annotations)); } catch (e) {}
  }

  function pushUndo(snapshot) {
    undoStack.push(snapshot);
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
  }
  function snapshotAnnot() { return JSON.parse(JSON.stringify(annotations)); }

  function getQueryParam(name) {
    try { return new URL(location.href).searchParams.get(name); } catch (e) { return null; }
  }

  function simpleHash(uint8) {
    var h = 2166136261 >>> 0;
    var step = Math.max(1, Math.floor(uint8.length / 4096));
    for (var i = 0; i < uint8.length; i += step) {
      h ^= uint8[i];
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16) + "_" + uint8.length;
  }

  function computeScale(baseW, baseH) {
    var availW = Math.max(280, el.viewer.clientWidth - 32);
    var availH = Math.max(200, el.viewer.clientHeight - 32);
    if (viewerMode === "pres") {
      return Math.min(availW / baseW, availH / baseH) * 0.92;
    }
    if (zoomMode === "page-width") return availW / baseW;
    if (zoomMode === "page-fit") return Math.min(availW / baseW, availH / baseH);
    if (zoomMode === "auto") return Math.min(1.35, availW / baseW);
    var n = parseFloat(zoomMode);
    return isFinite(n) && n > 0 ? n : 1;
  }

  function setViewerMode(mode) {
    if (mode !== "view" && mode !== "write" && mode !== "pres") return;
    var prev = viewerMode;
    viewerMode = mode;

    document.body.classList.remove("mode-view", "mode-write", "mode-pres", "write-active");
    document.body.classList.add("mode-" + mode);
    if (mode === "write") document.body.classList.add("write-active");

    if (el.vmView) el.vmView.classList.toggle("active", mode === "view");
    if (el.vmWrite) el.vmWrite.classList.toggle("active", mode === "write");
    if (el.vmPres) el.vmPres.classList.toggle("active", mode === "pres");

    el.viewer.classList.toggle("write-mode", mode === "write");
    el.annotToolbar.classList.toggle("hidden", mode !== "write");
    if (el.presOverlay) el.presOverlay.classList.toggle("hidden", mode !== "pres");
    if (el.sidebar && mode === "pres") el.sidebar.classList.add("hidden");
    if (el.searchBar && mode === "pres") el.searchBar.classList.add("hidden");

    syncAnnotPointerEvents();
    syncTextLayerPointerEvents();
    updatePenStatus();

    if (mode === "pres") {
      setStatus("プレゼンモード · ←→ でページ · Esc で終了");
      updatePresBadge();
      if (pdfDoc) {
        zoomMode = "page-fit";
        renderAllPages().then(function () { goToPage(currentPage); });
      }
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
      }
    } else if (prev === "pres") {
      setStatus(mode === "write" ? "編集モード" : "閲覧モード");
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(function () {});
      }
      if (pdfDoc) {
        zoomMode = "auto";
        if (el.zoomSelect) el.zoomSelect.value = "auto";
        renderAllPages().then(function () { goToPage(currentPage); });
      }
    } else {
      setStatus(mode === "write" ? "編集モード" : "閲覧モード（テキスト選択可）");
    }
  }

  function updatePresBadge() {
    if (el.presPageBadge) {
      el.presPageBadge.textContent = currentPage + " / " + (totalPages || "–");
    }
  }

  function loadPdfFromData(data, title) {
    setStatus("読み込み中…");
    setControlsEnabled(false);
    setProgress(5);
    if (pdfDoc) { try { pdfDoc.destroy(); } catch (e) {} pdfDoc = null; }
    pageRenders = {};
    el.pagesContainer.innerHTML = "";
    annotations = {};
    pdfBytes = data;
    fileName = title || "document.pdf";

    pdfjsLib.getDocument({ data: data }).promise.then(function (doc) {
      pdfDoc = doc;
      totalPages = doc.numPages;
      currentPage = 1;
      rotation = 0;
      pdfFingerprint = simpleHash(data instanceof Uint8Array ? data : new Uint8Array(data));
      loadAnnotations();
      el.pageCount.textContent = String(totalPages);
      el.pageNum.value = "1";
      el.pageNum.max = totalPages;
      if (el.title) el.title.textContent = fileName;
      el.dropZone.classList.add("hidden");
      setControlsEnabled(true);
      setStatus(totalPages + " ページ");
      setProgress(15);
      return renderAllPages();
    }).then(function () {
      setProgress(null);
      buildThumbnails();
      loadOutline();
      el.viewer.scrollTop = 0;
    }).catch(function (err) {
      console.error(err);
      setStatus("読み込み失敗");
      setProgress(null);
      setControlsEnabled(false);
      el.dropZone.classList.remove("hidden");
    });
  }

  function loadPdfFromUrl(url, title) {
    setStatus("取得中…");
    setProgress(3);
    fetch(url, { cache: "force-cache" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.arrayBuffer();
    }).then(function (buf) {
      loadPdfFromData(new Uint8Array(buf), title || url.split("/").pop());
    }).catch(function (err) {
      console.error(err);
      setStatus("URL読み込み失敗");
      setProgress(null);
      el.dropZone.classList.remove("hidden");
    });
  }

  function loadPdfFromFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      loadPdfFromData(new Uint8Array(reader.result), file.name);
    };
    reader.onerror = function () { setStatus("ファイル読込失敗"); };
    reader.readAsArrayBuffer(file);
  }

  function renderAllPages() {
    if (!pdfDoc) return Promise.resolve();
    el.pagesContainer.innerHTML = "";
    pageRenders = {};
    el.pagesContainer.classList.toggle("invert", invertColors);

    return pdfDoc.getPage(1).then(function (page1) {
      var baseVp = page1.getViewport({ scale: 1, rotation: rotation });
      scale = computeScale(baseVp.width, baseVp.height);

      var frag = document.createDocumentFragment();
      for (var i = 1; i <= totalPages; i++) {
        var wrap = document.createElement("div");
        wrap.className = "page-wrap";
        wrap.id = "page-wrap-" + i;
        wrap.dataset.page = String(i);

        var canvas = document.createElement("canvas");
        canvas.className = "pdf-canvas";

        var textLayerDiv = document.createElement("div");
        textLayerDiv.className = "textLayer";

        var annotCanvas = document.createElement("canvas");
        annotCanvas.className = "annot-layer";

        var htmlLayer = document.createElement("div");
        htmlLayer.className = "html-annot-layer";

        wrap.appendChild(canvas);
        wrap.appendChild(textLayerDiv);
        wrap.appendChild(annotCanvas);
        wrap.appendChild(htmlLayer);
        frag.appendChild(wrap);
        pageRenders[i] = {
          wrap: wrap, canvas: canvas, textLayer: textLayerDiv,
          annotCanvas: annotCanvas, htmlLayer: htmlLayer, rendered: false
        };
      }
      el.pagesContainer.appendChild(frag);

      var done = 0;
      var chain = Promise.resolve();
      for (var p = 1; p <= totalPages; p++) {
        (function (num) {
          chain = chain.then(function () {
            return renderPage(num).then(function () {
              done++;
              setProgress(15 + (done / totalPages) * 80);
            });
          });
        })(p);
      }
      return chain;
    });
  }

  function renderPage(num) {
    var pr = pageRenders[num];
    if (!pdfDoc || !pr) return Promise.resolve();
    return pdfDoc.getPage(num).then(function (page) {
      var viewport = page.getViewport({ scale: scale, rotation: rotation });
      var dpr = window.devicePixelRatio || 1;
      var canvas = pr.canvas;
      var ctx = canvas.getContext("2d", { alpha: false });
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = Math.floor(viewport.width) + "px";
      canvas.style.height = Math.floor(viewport.height) + "px";

      pr.annotCanvas.width = canvas.width;
      pr.annotCanvas.height = canvas.height;
      pr.annotCanvas.style.width = canvas.style.width;
      pr.annotCanvas.style.height = canvas.style.height;
      pr.outputScale = dpr;
      pr.annotCtx = pr.annotCanvas.getContext("2d");
      pr.viewport = viewport;

      pr.textLayer.style.width = canvas.style.width;
      pr.textLayer.style.height = canvas.style.height;
      pr.htmlLayer.style.width = canvas.style.width;
      pr.htmlLayer.style.height = canvas.style.height;

      var transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;
      return page.render({ canvasContext: ctx, viewport: viewport, transform: transform }).promise
        .then(function () {
          return page.getTextContent();
        })
        .then(function (textContent) {
          pr.textLayer.innerHTML = "";
          pr.textLayer.style.setProperty("--scale-factor", String(scale));
          textContent.items.forEach(function (item) {
            if (!item.str) return;
            var span = document.createElement("span");
            span.textContent = item.str + " ";
            span.style.left = (item.transform[4] * scale) + "px";
            span.style.top = (viewport.height - item.transform[5] * scale - (item.height || 10) * scale) + "px";
            span.style.fontSize = ((item.height || 10) * scale) + "px";
            span.style.fontFamily = "sans-serif";
            pr.textLayer.appendChild(span);
          });
          pr.rendered = true;
          redrawAnnotations(num);
          bindAnnotEvents(num);
          syncAnnotPointerEvents();
          syncTextLayerPointerEvents();
        });
    }).catch(function (err) { console.warn("[pdf] page " + num, err); });
  }

  function syncTextLayerPointerEvents() {
    Object.keys(pageRenders).forEach(function (k) {
      var pr = pageRenders[k];
      if (!pr || !pr.textLayer) return;
      if (viewerMode === "view") {
        pr.textLayer.style.pointerEvents = "auto";
        pr.textLayer.style.opacity = "1";
      } else {
        pr.textLayer.style.pointerEvents = "none";
        pr.textLayer.style.opacity = "0";
      }
    });
  }

  function syncAnnotPointerEvents() {
    Object.keys(pageRenders).forEach(function (k) {
      var pr = pageRenders[k];
      if (pr && pr.annotCanvas) {
        pr.annotCanvas.style.pointerEvents = viewerMode === "write" ? "auto" : "none";
      }
      if (pr && pr.htmlLayer) {
        pr.htmlLayer.style.pointerEvents = viewerMode === "write" ? "auto" : "none";
      }
    });
  }

  function redrawAnnotations(num) {
    var pr = pageRenders[num];
    if (!pr || !pr.annotCtx) return;
    var ctx = pr.annotCtx;
    var dpr = pr.outputScale || 1;
    ctx.clearRect(0, 0, pr.annotCanvas.width, pr.annotCanvas.height);
    var items = annotations[num] || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type === "text" || items[i].type === "note") continue;
      drawStroke(ctx, items[i], dpr);
    }
    if (shapePreview && shapePreview.page === num) drawStroke(ctx, shapePreview, dpr);
    renderHtmlAnnotations(num);
  }

  function renderHtmlAnnotations(num) {
    var pr = pageRenders[num];
    if (!pr || !pr.htmlLayer) return;
    pr.htmlLayer.innerHTML = "";
    var items = annotations[num] || [];
    items.forEach(function (item, idx) {
      if (item.type === "text") {
        var div = document.createElement("div");
        div.className = "text-annot";
        div.style.left = item.x + "px";
        div.style.top = item.y + "px";
        div.style.color = item.color || "#ff2d95";
        div.style.fontSize = (item.fontSize || 16) + "px";
        div.textContent = item.text || "";
        div.dataset.idx = String(idx);
        if (viewerMode === "write") {
          div.contentEditable = "true";
          div.spellcheck = false;
          div.addEventListener("blur", function () {
            pushUndo(snapshotAnnot());
            item.text = div.textContent || "";
            saveAnnotations();
          });
          div.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
          div.addEventListener("keydown", function (e) {
            if (e.key === "Delete" && !div.textContent.trim()) {
              pushUndo(snapshotAnnot());
              items.splice(idx, 1);
              saveAnnotations();
              redrawAnnotations(num);
            }
          });
        }
        pr.htmlLayer.appendChild(div);
      } else if (item.type === "note") {
        var note = document.createElement("div");
        note.className = "note-annot";
        note.style.left = item.x + "px";
        note.style.top = item.y + "px";
        note.style.background = item.color || "#fff59d";
        var body = document.createElement("div");
        body.className = "note-body";
        body.textContent = item.text || "";
        if (viewerMode === "write") {
          body.contentEditable = "true";
          body.spellcheck = false;
          body.addEventListener("blur", function () {
            pushUndo(snapshotAnnot());
            item.text = body.textContent || "";
            saveAnnotations();
          });
          body.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
        }
        note.appendChild(body);
        note.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
        pr.htmlLayer.appendChild(note);
      }
    });
  }

  function drawStroke(ctx, stroke, dpr) {
    if (!stroke) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.tool === "line" && stroke.points && stroke.points.length >= 2) {
      var a = stroke.points[0], b = stroke.points[stroke.points.length - 1];
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color || "#ff2d95";
      ctx.lineWidth = (stroke.size || 3) * dpr;
      ctx.globalAlpha = stroke.preview ? 0.55 : 1;
      ctx.beginPath();
      ctx.moveTo(a.x * dpr, a.y * dpr);
      ctx.lineTo(b.x * dpr, b.y * dpr);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (stroke.tool === "rect" && stroke.points && stroke.points.length >= 2) {
      var p0 = stroke.points[0], p1 = stroke.points[stroke.points.length - 1];
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color || "#ff2d95";
      ctx.lineWidth = (stroke.size || 3) * dpr;
      ctx.globalAlpha = stroke.preview ? 0.55 : 1;
      ctx.strokeRect(
        Math.min(p0.x, p1.x) * dpr, Math.min(p0.y, p1.y) * dpr,
        Math.abs(p1.x - p0.x) * dpr, Math.abs(p1.y - p0.y) * dpr
      );
      ctx.restore();
      return;
    }

    if (!stroke.points || !stroke.points.length) { ctx.restore(); return; }
    var pts = stroke.points;
    if (stroke.tool === "highlighter") {
      ctx.globalCompositeOperation = "multiply";
      ctx.strokeStyle = stroke.color || "#ffeb3b";
      ctx.lineWidth = (stroke.size || 12) * dpr;
      ctx.globalAlpha = 0.4;
    } else if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = (stroke.size || 16) * dpr;
      ctx.globalAlpha = 1;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color || "#ff2d95";
      ctx.lineWidth = (stroke.size || 3) * dpr * (stroke.pressure || 1);
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0].x * dpr, pts[0].y * dpr);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * dpr, pts[i].y * dpr);
    if (pts.length === 1) ctx.lineTo(pts[0].x * dpr + 0.5, pts[0].y * dpr);
    ctx.stroke();
    ctx.restore();
  }

  function pointerToLocal(e, canvas, dpr) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width) / dpr,
      y: (e.clientY - rect.top) * (canvas.height / rect.height) / dpr
    };
  }

  function shouldDrawWith(e) {
    if (viewerMode !== "write") return false;
    if (e.pointerType === "pen") {
      hasPenCapability = true;
      updatePenStatus();
      return true;
    }
    if (e.pointerType === "touch") return inputMode === "finger";
    return true;
  }

  function shouldPanWith(e) {
    if (viewerMode !== "write") return false;
    return e.pointerType === "touch" && inputMode === "pen";
  }

  function bindAnnotEvents(num) {
    var pr = pageRenders[num];
    if (!pr || pr._bound) return;
    pr._bound = true;
    var canvas = pr.annotCanvas;

    canvas.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "pen") { hasPenCapability = true; updatePenStatus(); }
      if (viewerMode !== "write") return;

      if (currentTool === "text" || currentTool === "note") {
        if (!shouldDrawWith(e) && e.pointerType !== "mouse") return;
        e.preventDefault();
        var rect = canvas.getBoundingClientRect();
        var cssX = e.clientX - rect.left;
        var cssY = e.clientY - rect.top;
        openTextEditor(num, cssX, cssY, currentTool);
        return;
      }

      if (e.pointerType === "touch" && inputMode === "finger") {
        var touchCount = 0;
        Object.keys(activePointers).forEach(function (id) {
          if (activePointers[id] === "draw" || activePointers[id] === "pan") touchCount++;
        });
        if (touchCount >= 1) {
          isDrawing = false; currentStroke = null; shapePreview = null;
          activePointers[e.pointerId] = "pan";
          panState = { id: e.pointerId, x: e.clientX, y: e.clientY,
            scrollLeft: el.viewer.scrollLeft, scrollTop: el.viewer.scrollTop };
          try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
          e.preventDefault();
          return;
        }
      }

      if (shouldPanWith(e)) {
        e.preventDefault();
        activePointers[e.pointerId] = "pan";
        panState = { id: e.pointerId, x: e.clientX, y: e.clientY,
          scrollLeft: el.viewer.scrollLeft, scrollTop: el.viewer.scrollTop };
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
        return;
      }

      if (!shouldDrawWith(e)) return;
      e.preventDefault();
      e.stopPropagation();
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}

      var dpr = pr.outputScale || 1;
      var pt = pointerToLocal(e, canvas, dpr);
      var pressure = (typeof e.pressure === "number" && e.pressure > 0) ? (0.4 + e.pressure * 0.9) : 1;

      if (currentTool === "line" || currentTool === "rect") {
        isDrawing = true;
        activePointers[e.pointerId] = "shape";
        pushUndo(snapshotAnnot());
        currentStroke = { tool: currentTool, color: strokeColor, size: strokeSize, points: [pt, pt], page: num };
        shapePreview = Object.assign({}, currentStroke, { preview: true });
        redrawAnnotations(num);
        return;
      }

      isDrawing = true;
      activePointers[e.pointerId] = "draw";
      pushUndo(snapshotAnnot());
      currentStroke = {
        tool: currentTool,
        color: currentTool === "highlighter" ? (strokeColor || "#ffeb3b") : strokeColor,
        size: currentTool === "highlighter" ? Math.max(strokeSize * 3, 10)
          : (currentTool === "eraser" ? Math.max(strokeSize * 4, 14) : strokeSize),
        pressure: pressure,
        points: [pt]
      };
      if (!annotations[num]) annotations[num] = [];
      annotations[num].push(currentStroke);
      redrawAnnotations(num);
    }, { passive: false });

    canvas.addEventListener("pointermove", function (e) {
      if (activePointers[e.pointerId] === "pan" && panState && panState.id === e.pointerId) {
        e.preventDefault();
        el.viewer.scrollLeft = panState.scrollLeft - (e.clientX - panState.x);
        el.viewer.scrollTop = panState.scrollTop - (e.clientY - panState.y);
        return;
      }
      if (activePointers[e.pointerId] === "shape" && currentStroke) {
        e.preventDefault();
        currentStroke.points[1] = pointerToLocal(e, canvas, pr.outputScale || 1);
        shapePreview = Object.assign({}, currentStroke, { preview: true, page: num });
        redrawAnnotations(num);
        return;
      }
      if (viewerMode !== "write" || !isDrawing || activePointers[e.pointerId] !== "draw") return;
      e.preventDefault();
      if (!currentStroke) return;
      currentStroke.points.push(pointerToLocal(e, canvas, pr.outputScale || 1));
      if (typeof e.pressure === "number" && e.pressure > 0) {
        currentStroke.pressure = 0.4 + e.pressure * 0.9;
      }
      redrawAnnotations(num);
    }, { passive: false });

    function endPointer(e) {
      if (activePointers[e.pointerId] === "pan") {
        panState = null;
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      if (activePointers[e.pointerId] === "shape" && currentStroke) {
        if (!annotations[num]) annotations[num] = [];
        annotations[num].push({
          tool: currentStroke.tool, color: currentStroke.color,
          size: currentStroke.size, points: currentStroke.points.slice()
        });
        shapePreview = null; currentStroke = null; isDrawing = false;
        saveAnnotations();
        redrawAnnotations(num);
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      if (activePointers[e.pointerId] === "draw") {
        isDrawing = false; currentStroke = null; saveAnnotations();
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      delete activePointers[e.pointerId];
    }
    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);
  }

  function openTextEditor(page, x, y, type) {
    pendingTextPlace = { page: page, x: x, y: y, type: type };
    el.textPopup.classList.remove("hidden");
    el.textInput.value = "";
    el.textInput.placeholder = type === "note" ? "付箋メモを入力…" : "テキストを入力…";
    el.textInput.focus();
  }

  function commitTextEditor() {
    if (!pendingTextPlace) return;
    var text = (el.textInput.value || "").trim();
    el.textPopup.classList.add("hidden");
    if (!text) { pendingTextPlace = null; return; }
    var page = pendingTextPlace.page;
    pushUndo(snapshotAnnot());
    if (!annotations[page]) annotations[page] = [];
    if (pendingTextPlace.type === "note") {
      annotations[page].push({
        type: "note", x: pendingTextPlace.x, y: pendingTextPlace.y,
        text: text, color: strokeColor || "#fff59d"
      });
    } else {
      annotations[page].push({
        type: "text", x: pendingTextPlace.x, y: pendingTextPlace.y,
        text: text, color: strokeColor || "#ff2d95", fontSize: fontSize
      });
    }
    saveAnnotations();
    redrawAnnotations(page);
    pendingTextPlace = null;
    setStatus("テキストを配置しました");
  }

  function cancelTextEditor() {
    el.textPopup.classList.add("hidden");
    pendingTextPlace = null;
  }

  function updateSelectionPreview() {
    var sel = window.getSelection();
    selectedText = sel && sel.toString ? sel.toString().trim() : "";
    if (el.selTextPreview) {
      if (selectedText) {
        var short = selectedText.length > 40 ? selectedText.slice(0, 40) + "…" : selectedText;
        el.selTextPreview.textContent = "選択: " + short;
      } else {
        el.selTextPreview.textContent = "";
      }
    }
  }

  function copySelectedText() {
    var t = selectedText || (window.getSelection() && window.getSelection().toString()) || "";
    t = t.trim();
    if (!t) { setStatus("コピーするテキストがありません"); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () {
        setStatus("コピーしました（" + t.length + "文字）");
      }).catch(function () { fallbackCopy(t); });
    } else {
      fallbackCopy(t);
    }
  }

  function fallbackCopy(t) {
    var ta = document.createElement("textarea");
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); setStatus("コピーしました"); }
    catch (e) { setStatus("コピー失敗"); }
    document.body.removeChild(ta);
  }

  function bindPinchZoom() {
    el.viewer.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) {
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchState = { dist: Math.hypot(dx, dy), scale: scale };
      }
    }, { passive: true });
    el.viewer.addEventListener("touchmove", function (e) {
      if (!pinchState || e.touches.length !== 2 || !pdfDoc) return;
      e.preventDefault();
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchState._pending = Math.max(0.35, Math.min(4, pinchState.scale * (Math.hypot(dx, dy) / (pinchState.dist || 1))));
    }, { passive: false });
    el.viewer.addEventListener("touchend", function () {
      if (pinchState && pinchState._pending && pdfDoc && viewerMode !== "pres") {
        applyZoom(pinchState._pending);
      }
      pinchState = null;
    });
  }

  function buildThumbnails() {
    if (!pdfDoc || !el.thumbsPanel) return;
    el.thumbsPanel.innerHTML = "";
    var max = Math.min(totalPages, 50);
    for (var i = 1; i <= max; i++) {
      (function (pageNum) {
        var item = document.createElement("button");
        item.type = "button";
        item.className = "thumb-item";
        item.dataset.page = String(pageNum);
        var c = document.createElement("canvas");
        item.appendChild(c);
        var lab = document.createElement("div");
        lab.className = "thumb-label";
        lab.textContent = String(pageNum);
        item.appendChild(lab);
        item.addEventListener("click", function () { goToPage(pageNum); });
        el.thumbsPanel.appendChild(item);
        pdfDoc.getPage(pageNum).then(function (page) {
          var vp = page.getViewport({ scale: 0.16, rotation: rotation });
          c.width = vp.width; c.height = vp.height;
          return page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
        }).catch(function () {});
      })(i);
    }
  }

  function loadOutline() {
    if (!pdfDoc || !el.outlinePanel) return;
    el.outlinePanel.innerHTML = "";
    pdfDoc.getOutline().then(function (outline) {
      if (!outline || !outline.length) {
        el.outlinePanel.innerHTML = '<p class="outline-empty">目次なし</p>';
        return;
      }
      function addItems(items, level) {
        items.forEach(function (item) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "outline-item";
          btn.dataset.level = String(level);
          btn.textContent = item.title || "(無題)";
          btn.addEventListener("click", function () {
            if (item.dest) {
              pdfDoc.getPageIndex(item.dest[0]).then(function (idx) {
                goToPage(idx + 1);
              }).catch(function () {});
            }
          });
          el.outlinePanel.appendChild(btn);
          if (item.items && item.items.length) addItems(item.items, level + 1);
        });
      }
      addItems(outline, 0);
    }).catch(function () {
      el.outlinePanel.innerHTML = '<p class="outline-empty">目次なし</p>';
    });
  }

  function goToPage(num) {
    num = Math.max(1, Math.min(totalPages, num | 0));
    currentPage = num;
    el.pageNum.value = String(num);
    updatePresBadge();
    var wrap = document.getElementById("page-wrap-" + num);
    if (wrap) wrap.scrollIntoView({ behavior: viewerMode === "pres" ? "auto" : "smooth", block: "start" });
    var thumbs = el.thumbsPanel && el.thumbsPanel.querySelectorAll(".thumb-item");
    if (thumbs) {
      thumbs.forEach(function (t) {
        t.classList.toggle("active", t.dataset.page === String(num));
      });
    }
  }

  function onViewerScroll() {
    if (!pdfDoc) return;
    var y = el.viewer.scrollTop + el.viewer.clientHeight * 0.25;
    var best = 1;
    for (var i = 1; i <= totalPages; i++) {
      var w = document.getElementById("page-wrap-" + i);
      if (w && w.offsetTop <= y) best = i;
    }
    if (best !== currentPage) {
      currentPage = best;
      el.pageNum.value = String(best);
      updatePresBadge();
    }
  }

  function applyZoom(mode) {
    zoomMode = String(mode);
    if (el.zoomSelect) {
      var opts = ["auto", "page-width", "page-fit"];
      el.zoomSelect.value = opts.indexOf(zoomMode) >= 0 ? zoomMode : String(parseFloat(zoomMode) || 1);
    }
    if (!pdfDoc) return;
    setStatus("再描画中…");
    setProgress(20);
    renderAllPages().then(function () {
      setProgress(null);
      setStatus(totalPages + " ページ · " + Math.round(scale * 100) + "%");
      goToPage(currentPage);
    });
  }

  function runSearch(query) {
    searchMatches = [];
    searchIndex = -1;
    el.searchCount.textContent = "";
    if (!pdfDoc || !query) return;
    setStatus("検索中…");
    query = query.toLowerCase();
    var i = 1;
    function next() {
      if (i > totalPages) {
        el.searchCount.textContent = searchMatches.length ? searchMatches.length + " 頁" : "0";
        setStatus(searchMatches.length ? "検索完了" : "見つかりません");
        if (searchMatches.length) { searchIndex = 0; goToPage(searchMatches[0]); }
        return;
      }
      pdfDoc.getPage(i).then(function (page) { return page.getTextContent(); })
        .then(function (content) {
          var text = content.items.map(function (it) { return it.str; }).join(" ").toLowerCase();
          if (text.indexOf(query) >= 0) searchMatches.push(i);
          i++; next();
        }).catch(function () { i++; next(); });
    }
    next();
  }

  function searchStep(dir) {
    if (!searchMatches.length) return;
    searchIndex = (searchIndex + dir + searchMatches.length) % searchMatches.length;
    goToPage(searchMatches[searchIndex]);
    el.searchCount.textContent = (searchIndex + 1) + " / " + searchMatches.length;
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshotAnnot());
    annotations = undoStack.pop();
    Object.keys(pageRenders).forEach(function (k) { redrawAnnotations(Number(k)); });
    saveAnnotations();
    setStatus("元に戻しました");
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshotAnnot());
    annotations = redoStack.pop();
    Object.keys(pageRenders).forEach(function (k) { redrawAnnotations(Number(k)); });
    saveAnnotations();
    setStatus("やり直しました");
  }

  function bindUI() {
    el.btnOpen.addEventListener("click", function () { el.fileInput.click(); });
    el.btnOpenMain.addEventListener("click", function () { el.fileInput.click(); });
    el.fileInput.addEventListener("change", function () {
      var f = el.fileInput.files && el.fileInput.files[0];
      if (f) loadPdfFromFile(f);
      el.fileInput.value = "";
    });

    el.btnDownload.addEventListener("click", function () {
      if (!pdfBytes) return;
      var blob = new Blob([pdfBytes], { type: "application/pdf" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName || "document.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    });

    ["dragenter", "dragover"].forEach(function (ev) {
      el.viewer.addEventListener(ev, function (e) {
        e.preventDefault(); el.dropZone.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      el.viewer.addEventListener(ev, function (e) {
        e.preventDefault(); el.dropZone.classList.remove("dragover");
      });
    });
    el.viewer.addEventListener("drop", function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && (f.type === "application/pdf" || /\.pdf$/i.test(f.name))) loadPdfFromFile(f);
    });

    el.btnPrev.addEventListener("click", function () { goToPage(currentPage - 1); });
    el.btnNext.addEventListener("click", function () { goToPage(currentPage + 1); });
    el.pageNum.addEventListener("change", function () {
      goToPage(parseInt(el.pageNum.value, 10) || 1);
    });

    el.btnZoomIn.addEventListener("click", function () {
      applyZoom(Math.min(4, (scale || 1) * 1.25));
    });
    el.btnZoomOut.addEventListener("click", function () {
      applyZoom(Math.max(0.3, (scale || 1) / 1.25));
    });
    el.zoomSelect.addEventListener("change", function () {
      applyZoom(el.zoomSelect.value);
    });

    el.btnRotate.addEventListener("click", function () {
      rotation = (rotation + 90) % 360;
      applyZoom(zoomMode);
    });
    el.btnInvert.addEventListener("click", function () {
      invertColors = !invertColors;
      el.btnInvert.classList.toggle("active", invertColors);
      el.pagesContainer.classList.toggle("invert", invertColors);
      setStatus(invertColors ? "色反転 ON" : "色反転 OFF");
    });

    el.btnSearch.addEventListener("click", function () {
      el.searchBar.classList.toggle("hidden");
      if (!el.searchBar.classList.contains("hidden")) el.searchInput.focus();
    });
    el.searchClose.addEventListener("click", function () { el.searchBar.classList.add("hidden"); });
    el.searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") runSearch(el.searchInput.value.trim());
    });
    el.searchPrev.addEventListener("click", function () { searchStep(-1); });
    el.searchNext.addEventListener("click", function () { searchStep(1); });
    if (el.btnCopySel) el.btnCopySel.addEventListener("click", copySelectedText);

    el.btnSidebar.addEventListener("click", function () {
      if (viewerMode === "pres") return;
      el.sidebar.classList.toggle("hidden");
    });
    document.querySelectorAll(".sidebar-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".sidebar-tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        var panel = tab.dataset.panel;
        el.thumbsPanel.classList.toggle("hidden", panel !== "thumbs");
        el.outlinePanel.classList.toggle("hidden", panel !== "outline");
      });
    });

    if (el.vmView) el.vmView.addEventListener("click", function () { setViewerMode("view"); });
    if (el.vmWrite) el.vmWrite.addEventListener("click", function () { if (pdfDoc) setViewerMode("write"); });
    if (el.vmPres) el.vmPres.addEventListener("click", function () { if (pdfDoc) setViewerMode("pres"); });

    if (el.modePen) el.modePen.addEventListener("click", function () { setInputMode("pen"); });
    if (el.modeFinger) el.modeFinger.addEventListener("click", function () { setInputMode("finger"); });

    document.querySelectorAll(".annot-tool").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".annot-tool").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        currentTool = btn.dataset.tool || "pen";
        setStatus("ツール: " + currentTool);
      });
    });
    el.annotColor.addEventListener("input", function () { strokeColor = el.annotColor.value; });
    el.annotSize.addEventListener("input", function () { strokeSize = parseInt(el.annotSize.value, 10) || 3; });
    if (el.annotFontSize) {
      el.annotFontSize.addEventListener("change", function () {
        fontSize = parseInt(el.annotFontSize.value, 10) || 16;
      });
    }
    el.annotUndo.addEventListener("click", undo);
    el.annotRedo.addEventListener("click", redo);
    el.annotClearPage.addEventListener("click", function () {
      if (!currentPage) return;
      pushUndo(snapshotAnnot());
      annotations[currentPage] = [];
      redrawAnnotations(currentPage);
      saveAnnotations();
      setStatus("ページ " + currentPage + " の注釈を消去");
    });
    el.annotExport.addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(annotations, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "annotations.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });

    el.btnFullscreen.addEventListener("click", function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
      } else {
        document.exitFullscreen();
      }
    });

    if (el.textOk) el.textOk.addEventListener("click", commitTextEditor);
    if (el.textCancel) el.textCancel.addEventListener("click", cancelTextEditor);
    if (el.textInput) {
      el.textInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) commitTextEditor();
        if (e.key === "Escape") cancelTextEditor();
      });
    }

    el.viewer.addEventListener("scroll", onViewerScroll, { passive: true });
    document.addEventListener("selectionchange", updateSelectionPreview);
    bindPinchZoom();

    document.addEventListener("keydown", function (e) {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) {
        if (e.key === "Escape" && pendingTextPlace) cancelTextEditor();
        return;
      }
      if (e.key === "Escape" && viewerMode === "pres") {
        setViewerMode("view");
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); goToPage(currentPage - 1); }
      else if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && viewerMode === "pres")) {
        e.preventDefault(); goToPage(currentPage + 1);
      }
      else if (e.key === "+" || e.key === "=") { if (viewerMode !== "pres") el.btnZoomIn.click(); }
      else if (e.key === "-") { if (viewerMode !== "pres") el.btnZoomOut.click(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); el.btnSearch.click(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (viewerMode === "write") undo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault(); if (viewerMode === "write") redo();
      }
      else if (e.key.toLowerCase() === "w" && pdfDoc) setViewerMode(viewerMode === "write" ? "view" : "write");
      else if (e.key.toLowerCase() === "v" && pdfDoc) setViewerMode("view");
      else if (e.key.toLowerCase() === "f" && pdfDoc) {
        if (viewerMode === "pres") setViewerMode("view");
        else setViewerMode("pres");
      }
      else if (e.key.toLowerCase() === "r" && pdfDoc && viewerMode !== "pres") el.btnRotate.click();
      else if (e.key.toLowerCase() === "i" && pdfDoc) el.btnInvert.click();
      else if (e.key.toLowerCase() === "p" && viewerMode === "write") setInputMode("pen");
      else if (e.key.toLowerCase() === "t" && viewerMode === "write") setInputMode("finger");
    });

    window.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "pen") { hasPenCapability = true; updatePenStatus(); }
    }, { passive: true });
  }

  function boot() {
    updateInputModeUI();
    bindUI();
    setControlsEnabled(false);
    setViewerMode("view");
    var src = getQueryParam("src") || getQueryParam("url") || getQueryParam("file");
    if (src) {
      try {
        loadPdfFromUrl(new URL(src, location.href).href, src.split("/").pop());
      } catch (e) {
        setStatus("URL不正");
      }
    } else {
      setStatus("PDFを開いてください");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
