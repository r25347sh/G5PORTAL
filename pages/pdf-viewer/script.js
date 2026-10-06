/**
 * G5 Portal · PDF Viewer
 * Simple + Undo + pen/finger toggle + text annotations
 * Export annotations as JSON (by design - annotations layer)
 */
(function () {
  "use strict";

  if (typeof pdfjsLib === "undefined") {
    var st = document.getElementById("status-text");
    if (st) st.textContent = "PDF.js 読込失敗";
    return;
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  var pdfDoc = null;
  var currentPage = 1;
  var totalPages = 0;
  var scale = 1.2;
  var zoomMode = "auto";
  var pageRenders = {};
  var annotations = {};
  var undoStack = [];
  var pdfFingerprint = "";
  var isWriteMode = false;
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
  var pendingTextPlace = null;

  try {
    var sm = localStorage.getItem("g5_pdf_input_mode");
    if (sm === "pen" || sm === "finger") inputMode = sm;
  } catch (e) {}

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    title: $("pdf-title"), fileInput: $("file-input"),
    btnOpen: $("btn-open"), btnOpenMain: $("btn-open-main"),
    btnPrev: $("btn-prev"), btnNext: $("btn-next"),
    pageNum: $("page-num"), pageCount: $("page-count"),
    btnZoomIn: $("btn-zoom-in"), btnZoomOut: $("btn-zoom-out"), zoomSelect: $("zoom-select"),
    btnSearch: $("btn-search"), btnSidebar: $("btn-sidebar"),
    btnWrite: $("btn-write"), btnFullscreen: $("btn-fullscreen"),
    searchBar: $("search-bar"), searchInput: $("search-input"), searchCount: $("search-count"),
    searchPrev: $("search-prev"), searchNext: $("search-next"), searchClose: $("search-close"),
    annotToolbar: $("annot-toolbar"), annotColor: $("annot-color"), annotSize: $("annot-size"),
    annotFontSize: $("annot-font-size"), annotUndo: $("annot-undo"),
    annotClearPage: $("annot-clear-page"), annotExport: $("annot-export"), penHint: $("pen-hint"),
    modePen: $("mode-pen"), modeFinger: $("mode-finger"),
    sidebar: $("pdf-sidebar"), thumbsPanel: $("thumbs-panel"), outlinePanel: $("outline-panel"),
    viewer: $("pdf-viewer"), pagesContainer: $("pages-container"), dropZone: $("drop-zone"),
    statusText: $("status-text"), penStatus: $("pen-status"),
    textPopup: $("text-editor-popup"), textInput: $("text-editor-input"),
    textOk: $("text-editor-ok"), textCancel: $("text-editor-cancel")
  };

  function setStatus(msg) {
    if (el.statusText) el.statusText.textContent = msg || "";
  }

  function setControlsEnabled(on) {
    [el.btnPrev, el.btnNext, el.pageNum, el.btnZoomIn, el.btnZoomOut,
     el.zoomSelect, el.btnSearch, el.btnSidebar, el.btnWrite].forEach(function (b) {
      if (b) b.disabled = !on;
    });
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
    setStatus(inputMode === "pen" ? "入力: ペンモード" : "入力: 指モード");
  }

  function updatePenStatus() {
    if (!el.penStatus) return;
    var parts = [];
    if (hasPenCapability) parts.push("電子ペン検知");
    if (isWriteMode) parts.push(inputMode === "pen" ? "ペン入力" : "指入力");
    el.penStatus.textContent = parts.join(" · ");
  }

  function storageKey() {
    return "g5_pdf_annot_" + (pdfFingerprint || "unknown").slice(0, 40);
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
  }

  function saveAnnotations() {
    try { localStorage.setItem(storageKey(), JSON.stringify(annotations)); }
    catch (e) {}
  }

  function snapshotAnnot() {
    return JSON.parse(JSON.stringify(annotations));
  }

  function pushUndo() {
    undoStack.push(snapshotAnnot());
    if (undoStack.length > 40) undoStack.shift();
  }

  function undo() {
    if (!undoStack.length) {
      setStatus("これ以上戻せません");
      return;
    }
    annotations = undoStack.pop();
    Object.keys(pageRenders).forEach(function (k) { redrawAnnotations(Number(k)); });
    saveAnnotations();
    setStatus("元に戻しました");
  }

  function getQueryParam(name) {
    try { return new URL(location.href).searchParams.get(name); }
    catch (e) { return null; }
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
    var availW = el.viewer.clientWidth - 32;
    var availH = el.viewer.clientHeight - 32;
    if (availW < 80) availW = 320;
    if (zoomMode === "page-width") return availW / baseW;
    if (zoomMode === "page-fit") return Math.min(availW / baseW, availH / baseH);
    if (zoomMode === "auto") return Math.min(1.35, availW / baseW);
    var n = parseFloat(zoomMode);
    return isFinite(n) && n > 0 ? n : 1;
  }

  function loadPdfFromData(data, title) {
    setStatus("読み込み中…");
    setControlsEnabled(false);
    if (pdfDoc) {
      try { pdfDoc.destroy(); } catch (e) {}
      pdfDoc = null;
    }
    pageRenders = {};
    el.pagesContainer.innerHTML = "";
    annotations = {};
    undoStack = [];

    pdfjsLib.getDocument({ data: data }).promise.then(function (doc) {
      pdfDoc = doc;
      totalPages = doc.numPages;
      currentPage = 1;
      pdfFingerprint = simpleHash(data instanceof Uint8Array ? data : new Uint8Array(data));
      loadAnnotations();
      el.pageCount.textContent = String(totalPages);
      el.pageNum.value = "1";
      el.pageNum.max = totalPages;
      if (el.title) el.title.textContent = title || "PDF";
      el.dropZone.classList.add("hidden");
      setControlsEnabled(true);
      setStatus(totalPages + " ページ");
      return renderAllPages();
    }).then(function () {
      buildThumbnails();
      loadOutline();
      el.viewer.scrollTop = 0;
    }).catch(function (err) {
      console.error(err);
      setStatus("読み込み失敗");
      setControlsEnabled(false);
      el.dropZone.classList.remove("hidden");
    });
  }

  function loadPdfFromUrl(url, title) {
    setStatus("取得中…");
    fetch(url, { cache: "force-cache" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.arrayBuffer();
    }).then(function (buf) {
      loadPdfFromData(new Uint8Array(buf), title || url.split("/").pop());
    }).catch(function (err) {
      console.error(err);
      setStatus("URL読み込み失敗");
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

    return pdfDoc.getPage(1).then(function (page1) {
      var baseVp = page1.getViewport({ scale: 1 });
      scale = computeScale(baseVp.width, baseVp.height);

      var frag = document.createDocumentFragment();
      for (var i = 1; i <= totalPages; i++) {
        var wrap = document.createElement("div");
        wrap.className = "page-wrap";
        wrap.id = "page-wrap-" + i;
        wrap.dataset.page = String(i);
        var canvas = document.createElement("canvas");
        canvas.className = "pdf-canvas";
        var annotCanvas = document.createElement("canvas");
        annotCanvas.className = "annot-layer";
        var htmlLayer = document.createElement("div");
        htmlLayer.className = "html-annot-layer";
        wrap.appendChild(canvas);
        wrap.appendChild(annotCanvas);
        wrap.appendChild(htmlLayer);
        frag.appendChild(wrap);
        pageRenders[i] = {
          wrap: wrap, canvas: canvas, annotCanvas: annotCanvas,
          htmlLayer: htmlLayer, rendered: false
        };
      }
      el.pagesContainer.appendChild(frag);

      var chain = Promise.resolve();
      for (var p = 1; p <= totalPages; p++) {
        (function (num) {
          chain = chain.then(function () { return renderPage(num); });
        })(p);
      }
      return chain;
    });
  }

  function renderPage(num) {
    var pr = pageRenders[num];
    if (!pdfDoc || !pr) return Promise.resolve();
    return pdfDoc.getPage(num).then(function (page) {
      var viewport = page.getViewport({ scale: scale });
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
      pr.htmlLayer.style.width = canvas.style.width;
      pr.htmlLayer.style.height = canvas.style.height;
      pr.outputScale = dpr;
      pr.annotCtx = pr.annotCanvas.getContext("2d");

      var transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;
      return page.render({ canvasContext: ctx, viewport: viewport, transform: transform }).promise.then(function () {
        pr.rendered = true;
        redrawAnnotations(num);
        bindAnnotEvents(num);
        syncPointerEvents();
      });
    }).catch(function (err) {
      console.warn("[pdf] page " + num, err);
    });
  }

  function syncPointerEvents() {
    Object.keys(pageRenders).forEach(function (k) {
      var pr = pageRenders[k];
      if (!pr) return;
      if (pr.annotCanvas) pr.annotCanvas.style.pointerEvents = isWriteMode ? "auto" : "none";
      if (pr.htmlLayer) pr.htmlLayer.style.pointerEvents = isWriteMode ? "auto" : "none";
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
      if (items[i].type === "text") continue;
      drawStroke(ctx, items[i], dpr);
    }
    renderHtmlAnnotations(num);
  }

  function renderHtmlAnnotations(num) {
    var pr = pageRenders[num];
    if (!pr || !pr.htmlLayer) return;
    pr.htmlLayer.innerHTML = "";
    var items = annotations[num] || [];
    items.forEach(function (item, idx) {
      if (item.type !== "text") return;
      var div = document.createElement("div");
      div.className = "text-annot";
      div.style.left = item.x + "px";
      div.style.top = item.y + "px";
      div.style.color = item.color || "#ff2d95";
      div.style.fontSize = (item.fontSize || 16) + "px";
      div.textContent = item.text || "";
      if (isWriteMode) {
        div.contentEditable = "true";
        div.spellcheck = false;
        div.addEventListener("blur", function () {
          pushUndo();
          item.text = div.textContent || "";
          saveAnnotations();
        });
        div.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
      }
      pr.htmlLayer.appendChild(div);
    });
  }

  function drawStroke(ctx, stroke, dpr) {
    if (!stroke || !stroke.points || !stroke.points.length) return;
    var pts = stroke.points;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (stroke.tool === "highlighter") {
      ctx.globalCompositeOperation = "multiply";
      ctx.strokeStyle = stroke.color || "#ffeb3b";
      ctx.lineWidth = (stroke.size || 12) * dpr;
      ctx.globalAlpha = 0.45;
    } else if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = (stroke.size || 16) * dpr;
      ctx.globalAlpha = 1;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color || "#ff2d95";
      ctx.lineWidth = (stroke.size || 3) * dpr;
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

  function shouldDraw(e) {
    if (!isWriteMode) return false;
    if (e.pointerType === "pen") {
      hasPenCapability = true;
      updatePenStatus();
      return true;
    }
    if (e.pointerType === "touch") return inputMode === "finger";
    return true;
  }

  function shouldPan(e) {
    if (!isWriteMode) return false;
    return e.pointerType === "touch" && inputMode === "pen";
  }

  function bindAnnotEvents(num) {
    var pr = pageRenders[num];
    if (!pr || pr._bound) return;
    pr._bound = true;
    var canvas = pr.annotCanvas;

    canvas.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "pen") { hasPenCapability = true; updatePenStatus(); }
      if (!isWriteMode) return;

      if (currentTool === "text") {
        if (!shouldDraw(e) && e.pointerType !== "mouse") return;
        e.preventDefault();
        var rect = canvas.getBoundingClientRect();
        openTextEditor(num, e.clientX - rect.left, e.clientY - rect.top);
        return;
      }

      if (e.pointerType === "touch" && inputMode === "finger") {
        var touchCount = 0;
        Object.keys(activePointers).forEach(function (id) {
          if (activePointers[id] === "draw" || activePointers[id] === "pan") touchCount++;
        });
        if (touchCount >= 1) {
          isDrawing = false;
          currentStroke = null;
          activePointers[e.pointerId] = "pan";
          panState = {
            id: e.pointerId, x: e.clientX, y: e.clientY,
            scrollLeft: el.viewer.scrollLeft, scrollTop: el.viewer.scrollTop
          };
          try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
          e.preventDefault();
          return;
        }
      }

      if (shouldPan(e)) {
        e.preventDefault();
        activePointers[e.pointerId] = "pan";
        panState = {
          id: e.pointerId, x: e.clientX, y: e.clientY,
          scrollLeft: el.viewer.scrollLeft, scrollTop: el.viewer.scrollTop
        };
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
        return;
      }

      if (!shouldDraw(e)) return;
      e.preventDefault();
      e.stopPropagation();
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      isDrawing = true;
      activePointers[e.pointerId] = "draw";
      pushUndo();
      var dpr = pr.outputScale || 1;
      var pt = pointerToLocal(e, canvas, dpr);
      currentStroke = {
        tool: currentTool,
        color: currentTool === "highlighter" ? (strokeColor || "#ffeb3b") : strokeColor,
        size: currentTool === "highlighter" ? Math.max(strokeSize * 3, 10)
          : (currentTool === "eraser" ? Math.max(strokeSize * 4, 12) : strokeSize),
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
      if (!isWriteMode || !isDrawing || activePointers[e.pointerId] !== "draw") return;
      e.preventDefault();
      if (!currentStroke) return;
      var dpr = pr.outputScale || 1;
      currentStroke.points.push(pointerToLocal(e, canvas, dpr));
      redrawAnnotations(num);
    }, { passive: false });

    function endStroke(e) {
      if (activePointers[e.pointerId] === "pan") {
        panState = null;
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      if (activePointers[e.pointerId] === "draw") {
        isDrawing = false;
        currentStroke = null;
        saveAnnotations();
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      delete activePointers[e.pointerId];
    }
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);
  }

  function openTextEditor(page, x, y) {
    pendingTextPlace = { page: page, x: x, y: y };
    el.textPopup.classList.remove("hidden");
    el.textInput.value = "";
    el.textInput.focus();
  }

  function commitTextEditor() {
    if (!pendingTextPlace) return;
    var text = (el.textInput.value || "").trim();
    el.textPopup.classList.add("hidden");
    if (!text) { pendingTextPlace = null; return; }
    var page = pendingTextPlace.page;
    pushUndo();
    if (!annotations[page]) annotations[page] = [];
    annotations[page].push({
      type: "text",
      x: pendingTextPlace.x,
      y: pendingTextPlace.y,
      text: text,
      color: strokeColor || "#ff2d95",
      fontSize: fontSize
    });
    saveAnnotations();
    redrawAnnotations(page);
    pendingTextPlace = null;
    setStatus("文字を配置しました");
  }

  function cancelTextEditor() {
    el.textPopup.classList.add("hidden");
    pendingTextPlace = null;
  }

  function buildThumbnails() {
    if (!pdfDoc || !el.thumbsPanel) return;
    el.thumbsPanel.innerHTML = "";
    var max = Math.min(totalPages, 40);
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
          var vp = page.getViewport({ scale: 0.18 });
          c.width = vp.width;
          c.height = vp.height;
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
    var wrap = document.getElementById("page-wrap-" + num);
    if (wrap) wrap.scrollIntoView({ behavior: "smooth", block: "start" });
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
    }
  }

  function applyZoom(mode) {
    zoomMode = String(mode);
    if (el.zoomSelect) {
      var opts = ["auto", "page-width", "page-fit"];
      el.zoomSelect.value = opts.indexOf(zoomMode) >= 0 ? zoomMode : (parseFloat(zoomMode) || 1);
    }
    if (!pdfDoc) return;
    setStatus("再描画中…");
    renderAllPages().then(function () {
      setStatus(totalPages + " ページ");
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
      pdfDoc.getPage(i).then(function (page) {
        return page.getTextContent();
      }).then(function (content) {
        var text = content.items.map(function (it) { return it.str; }).join(" ").toLowerCase();
        if (text.indexOf(query) >= 0) searchMatches.push(i);
        i++;
        next();
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

  function setWriteMode(on) {
    isWriteMode = !!on;
    document.body.classList.toggle("write-active", isWriteMode);
    el.viewer.classList.toggle("write-mode", isWriteMode);
    el.btnWrite.classList.toggle("active", isWriteMode);
    el.annotToolbar.classList.toggle("hidden", !isWriteMode);
    syncPointerEvents();
    updateInputModeUI();
    Object.keys(pageRenders).forEach(function (k) { redrawAnnotations(Number(k)); });
    setStatus(isWriteMode
      ? (inputMode === "pen" ? "書き込み（ペンモード）" : "書き込み（指モード）")
      : "閲覧モード");
  }

  function bindUI() {
    el.btnOpen.addEventListener("click", function () { el.fileInput.click(); });
    el.btnOpenMain.addEventListener("click", function () { el.fileInput.click(); });
    el.fileInput.addEventListener("change", function () {
      var f = el.fileInput.files && el.fileInput.files[0];
      if (f) loadPdfFromFile(f);
      el.fileInput.value = "";
    });

    ["dragenter", "dragover"].forEach(function (ev) {
      el.viewer.addEventListener(ev, function (e) {
        e.preventDefault();
        el.dropZone.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      el.viewer.addEventListener(ev, function (e) {
        e.preventDefault();
        el.dropZone.classList.remove("dragover");
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

    el.btnSidebar.addEventListener("click", function () {
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

    el.btnWrite.addEventListener("click", function () { setWriteMode(!isWriteMode); });

    if (el.modePen) el.modePen.addEventListener("click", function () { setInputMode("pen"); });
    if (el.modeFinger) el.modeFinger.addEventListener("click", function () { setInputMode("finger"); });

    document.querySelectorAll(".annot-tool").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".annot-tool").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        currentTool = btn.dataset.tool || "pen";
      });
    });
    el.annotColor.addEventListener("input", function () { strokeColor = el.annotColor.value; });
    el.annotSize.addEventListener("input", function () { strokeSize = parseInt(el.annotSize.value, 10) || 3; });
    if (el.annotFontSize) {
      el.annotFontSize.addEventListener("change", function () {
        fontSize = parseInt(el.annotFontSize.value, 10) || 16;
      });
    }
    if (el.annotUndo) el.annotUndo.addEventListener("click", undo);
    el.annotClearPage.addEventListener("click", function () {
      if (!currentPage) return;
      pushUndo();
      annotations[currentPage] = [];
      redrawAnnotations(currentPage);
      saveAnnotations();
      setStatus("ページ " + currentPage + " の書き込みを消去");
    });
    el.annotExport.addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(annotations, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "annotations.json";
      a.click();
      URL.revokeObjectURL(a.href);
      setStatus("注釈をJSONで書き出しました（描画レイヤー用）");
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

    document.addEventListener("keydown", function (e) {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) {
        if (e.key === "Escape" && pendingTextPlace) cancelTextEditor();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); goToPage(currentPage - 1); }
      else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); goToPage(currentPage + 1); }
      else if (e.key === "+" || e.key === "=") el.btnZoomIn.click();
      else if (e.key === "-") el.btnZoomOut.click();
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); el.btnSearch.click(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (isWriteMode) undo(); }
      else if (e.key.toLowerCase() === "w" && pdfDoc) setWriteMode(!isWriteMode);
      else if (e.key.toLowerCase() === "p" && isWriteMode) setInputMode("pen");
      else if (e.key.toLowerCase() === "t" && isWriteMode) setInputMode("finger");
    });

    window.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "pen") { hasPenCapability = true; updatePenStatus(); }
    }, { passive: true });
  }

  function boot() {
    updateInputModeUI();
    bindUI();
    setControlsEnabled(false);
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
