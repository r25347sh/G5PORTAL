/**
 * G5 Portal · PDF Viewer (view-only, advanced)
 * Continuous scroll · search · outline · facing · invert · present · text select
 */
(function () {
  "use strict";

  var pdfjsReady = typeof pdfjsLib !== "undefined";
  if (pdfjsReady) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  } else {
    var st0 = document.getElementById("status-text");
    if (st0) st0.textContent = "PDF.js 読込失敗 — 再読み込みしてください";
  }

  function ensurePdfjs() {
    if (typeof pdfjsLib !== "undefined") {
      pdfjsReady = true;
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      } catch (e) {}
      return true;
    }
    setStatus("PDF.js が未読込です。ページを再読み込みしてください");
    return false;
  }

  var pdfDoc = null;
  var currentPage = 1;
  var totalPages = 0;
  var scale = 1.2;
  var zoomMode = "auto";
  var rotation = 0;
  var pageRenders = {};
  var facing = false;
  var inverted = false;
  var presenting = false;
  var searchMatches = [];
  var searchIndex = -1;
  var pdfMeta = null;
  var downloadUrl = null;
  var renderToken = 0;

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    title: $("pdf-title"), fileInput: $("file-input"),
    btnOpen: $("btn-open"), btnOpenMain: $("btn-open-main"),
    btnPrev: $("btn-prev"), btnNext: $("btn-next"),
    pageNum: $("page-num"), pageCount: $("page-count"),
    btnZoomIn: $("btn-zoom-in"), btnZoomOut: $("btn-zoom-out"), zoomSelect: $("zoom-select"),
    btnRotate: $("btn-rotate"), btnSearch: $("btn-search"), btnSidebar: $("btn-sidebar"),
    btnLayout: $("btn-layout"), btnInvert: $("btn-invert"),
    btnPresent: $("btn-present"), btnFullscreen: $("btn-fullscreen"),
    btnDownload: $("btn-download"), btnPrint: $("btn-print"),
    searchBar: $("search-bar"), searchInput: $("search-input"), searchCount: $("search-count"),
    searchPrev: $("search-prev"), searchNext: $("search-next"), searchClose: $("search-close"),
    sidebar: $("pdf-sidebar"), thumbsPanel: $("thumbs-panel"),
    outlinePanel: $("outline-panel"), infoPanel: $("info-panel"),
    viewer: $("pdf-viewer"), pagesContainer: $("pages-container"), dropZone: $("drop-zone"),
    statusText: $("status-text"), viewStatus: $("view-status"),
    progressFill: $("progress-fill"),
    presentOverlay: $("present-overlay"), presentStage: $("present-stage"),
    presentPageLabel: $("present-page-label"), presentExit: $("present-exit")
  };

  function setStatus(msg) {
    if (el.statusText) el.statusText.textContent = msg || "";
  }
  function setViewStatus(msg) {
    if (el.viewStatus) el.viewStatus.textContent = msg || "";
  }
  function setControlsEnabled(on) {
    [el.btnPrev, el.btnNext, el.pageNum, el.btnZoomIn, el.btnZoomOut,
     el.zoomSelect, el.btnRotate, el.btnSearch, el.btnSidebar, el.btnLayout,
     el.btnInvert, el.btnPresent, el.btnPrint].forEach(function (b) {
      if (b) b.disabled = !on;
    });
  }
  function updateProgress() {
    if (!el.progressFill || !totalPages) {
      if (el.progressFill) el.progressFill.style.width = "0%";
      return;
    }
    el.progressFill.style.width = ((currentPage / totalPages) * 100) + "%";
  }
  function getQueryParam(name) {
    try { return new URL(location.href).searchParams.get(name); }
    catch (e) { return null; }
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&").replace(/</g, "<")
      .replace(/>/g, ">").replace(/"/g, """);
  }
  function computeScale(baseW, baseH) {
    var availW = el.viewer.clientWidth - 32;
    var availH = el.viewer.clientHeight - 32;
    if (availW < 80) availW = 320;
    if (facing) availW = Math.max(120, (availW - 24) / 2);
    if (zoomMode === "page-width") return availW / baseW;
    if (zoomMode === "page-fit") return Math.min(availW / baseW, availH / baseH);
    if (zoomMode === "auto") return Math.min(1.4, availW / baseW);
    var n = parseFloat(zoomMode);
    return isFinite(n) && n > 0 ? n : 1;
  }

  function loadPdfFromData(data, title) {
    if (!ensurePdfjs()) return;
    setStatus("読み込み中…");
    setControlsEnabled(false);
    if (pdfDoc) { try { pdfDoc.destroy(); } catch (e) {} pdfDoc = null; }
    pageRenders = {};
    el.pagesContainer.innerHTML = "";
    searchMatches = [];
    searchIndex = -1;
    rotation = 0;
    if (downloadUrl) { try { URL.revokeObjectURL(downloadUrl); } catch (e) {} downloadUrl = null; }

    var u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
    try {
      downloadUrl = URL.createObjectURL(new Blob([u8], { type: "application/pdf" }));
      if (el.btnDownload) {
        el.btnDownload.href = downloadUrl;
        el.btnDownload.download = (title || "document") + (/\.pdf$/i.test(title || "") ? "" : ".pdf");
        el.btnDownload.classList.remove("hidden");
      }
    } catch (e) {}

    pdfjsLib.getDocument({ data: u8 }).promise.then(function (doc) {
      pdfDoc = doc;
      totalPages = doc.numPages;
      currentPage = 1;
      el.pageCount.textContent = String(totalPages);
      el.pageNum.value = "1";
      el.pageNum.max = totalPages;
      if (el.title) el.title.textContent = title || "PDF";
      el.dropZone.classList.add("hidden");
      setControlsEnabled(true);
      setStatus(totalPages + " ページ · 閲覧専用");
      return doc.getMetadata().catch(function () { return null; });
    }).then(function (meta) {
      pdfMeta = meta;
      fillInfoPanel();
      return renderAllPages();
    }).then(function () {
      buildThumbnails();
      loadOutline();
      el.viewer.scrollTop = 0;
      updateProgress();
      updateViewStatus();
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

  function fillInfoPanel() {
    if (!el.infoPanel) return;
    el.infoPanel.innerHTML = "";
    var info = (pdfMeta && pdfMeta.info) || {};
    [
      ["タイトル", info.Title || (el.title && el.title.textContent) || "—"],
      ["作成者", info.Author || "—"],
      ["作成日", info.CreationDate || "—"],
      ["更新日", info.ModDate || "—"],
      ["作成アプリ", info.Creator || "—"],
      ["ページ数", String(totalPages)]
    ].forEach(function (r) {
      var div = document.createElement("div");
      div.className = "info-row";
      div.innerHTML = "<strong>" + r[0] + "</strong><span>" + escapeHtml(String(r[1])) + "</span>";
      el.infoPanel.appendChild(div);
    });
  }

  function renderAllPages() {
    if (!pdfDoc) return Promise.resolve();
    var token = ++renderToken;
    el.pagesContainer.innerHTML = "";
    pageRenders = {};

    return pdfDoc.getPage(1).then(function (page1) {
      if (token !== renderToken) return;
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
        var textLayer = document.createElement("div");
        textLayer.className = "text-layer";
        wrap.appendChild(canvas);
        wrap.appendChild(textLayer);
        frag.appendChild(wrap);
        pageRenders[i] = { wrap: wrap, canvas: canvas, textLayer: textLayer, rendered: false };
      }
      el.pagesContainer.appendChild(frag);
      var chain = Promise.resolve();
      for (var p = 1; p <= totalPages; p++) {
        (function (num) {
          chain = chain.then(function () {
            if (token !== renderToken) return;
            return renderPage(num, token);
          });
        })(p);
      }
      return chain;
    });
  }

  function renderPage(num, token) {
    var pr = pageRenders[num];
    if (!pdfDoc || !pr) return Promise.resolve();
    if (token != null && token !== renderToken) return Promise.resolve();

    return pdfDoc.getPage(num).then(function (page) {
      if (token != null && token !== renderToken) return;
      var viewport = page.getViewport({ scale: scale, rotation: rotation });
      var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      var canvas = pr.canvas;
      var ctx = canvas.getContext("2d", { alpha: false });
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = Math.floor(viewport.width) + "px";
      canvas.style.height = Math.floor(viewport.height) + "px";
      pr.textLayer.style.width = canvas.style.width;
      pr.textLayer.style.height = canvas.style.height;
      var transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;
      return page.render({ canvasContext: ctx, viewport: viewport, transform: transform }).promise
        .then(function () {
          pr.rendered = true;
          return page.getTextContent().then(function (textContent) {
            buildTextLayer(pr.textLayer, textContent, viewport);
          }).catch(function () {});
        });
    }).catch(function (err) {
      console.warn("[pdf] page " + num, err);
    });
  }

  function buildTextLayer(layerDiv, textContent, viewport) {
    layerDiv.innerHTML = "";
    var items = textContent.items || [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item.str) continue;
      var tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      var fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
      var span = document.createElement("span");
      span.textContent = item.str;
      span.style.left = tx[4] + "px";
      span.style.top = (tx[5] - fontHeight) + "px";
      span.style.fontSize = fontHeight + "px";
      span.style.fontFamily = "sans-serif";
      layerDiv.appendChild(span);
    }
  }

  function buildThumbnails() {
    if (!pdfDoc || !el.thumbsPanel) return;
    el.thumbsPanel.innerHTML = "";
    var max = Math.min(totalPages, 60);
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
            if (!item.dest) return;
            var destPromise = typeof item.dest === "string"
              ? pdfDoc.getDestination(item.dest)
              : Promise.resolve(item.dest);
            destPromise.then(function (dest) {
              if (!dest) return;
              return pdfDoc.getPageIndex(dest[0]).then(function (idx) {
                goToPage(idx + 1);
              });
            }).catch(function () {});
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
    highlightThumb(num);
    updateProgress();
    if (presenting) renderPresentPage(num);
  }

  function highlightThumb(num) {
    if (!el.thumbsPanel) return;
    el.thumbsPanel.querySelectorAll(".thumb-item").forEach(function (t) {
      t.classList.toggle("active", t.dataset.page === String(num));
    });
  }

  function onViewerScroll() {
    if (!pdfDoc || presenting) return;
    var y = el.viewer.scrollTop + el.viewer.clientHeight * 0.28;
    var best = 1;
    for (var i = 1; i <= totalPages; i++) {
      var w = document.getElementById("page-wrap-" + i);
      if (w && w.offsetTop <= y) best = i;
    }
    if (best !== currentPage) {
      currentPage = best;
      el.pageNum.value = String(best);
      highlightThumb(best);
      updateProgress();
    }
  }

  function applyZoom(mode) {
    zoomMode = String(mode);
    if (el.zoomSelect) {
      var opts = ["auto", "page-width", "page-fit"];
      if (opts.indexOf(zoomMode) >= 0) el.zoomSelect.value = zoomMode;
      else {
        var n = parseFloat(zoomMode);
        el.zoomSelect.value = isFinite(n) ? String(n) : "auto";
      }
    }
    if (!pdfDoc) return;
    setStatus("再描画中…");
    renderAllPages().then(function () {
      setStatus(totalPages + " ページ · 閲覧専用");
      goToPage(currentPage);
      updateViewStatus();
    });
  }

  function rotateClockwise() {
    rotation = (rotation + 90) % 360;
    if (!pdfDoc) return;
    setStatus("回転中…");
    renderAllPages().then(function () {
      buildThumbnails();
      setStatus(totalPages + " ページ · 回転 " + rotation + "°");
      goToPage(currentPage);
      updateViewStatus();
    });
  }

  function toggleFacing() {
    facing = !facing;
    el.viewer.classList.toggle("facing", facing);
    if (el.btnLayout) el.btnLayout.classList.toggle("active", facing);
    applyZoom(zoomMode);
    setStatus(facing ? "見開き表示" : "単ページ連続表示");
    updateViewStatus();
  }

  function toggleInvert() {
    inverted = !inverted;
    el.viewer.classList.toggle("inverted", inverted);
    if (el.btnInvert) el.btnInvert.classList.toggle("active", inverted);
    setStatus(inverted ? "反転表示 ON" : "反転表示 OFF");
    updateViewStatus();
  }

  function updateViewStatus() {
    var parts = [Math.round(scale * 100) + "%"];
    if (rotation) parts.push(rotation + "°");
    if (facing) parts.push("見開き");
    if (inverted) parts.push("反転");
    setViewStatus(parts.join(" · "));
  }

  function runSearch(query) {
    searchMatches = [];
    searchIndex = -1;
    el.searchCount.textContent = "";
    clearSearchHits();
    if (!pdfDoc || !query) return;
    setStatus("検索中…");
    query = query.toLowerCase();
    var i = 1;
    function next() {
      if (i > totalPages) {
        el.searchCount.textContent = searchMatches.length ? searchMatches.length + " 頁" : "0";
        setStatus(searchMatches.length ? "検索完了" : "見つかりません");
        if (searchMatches.length) { searchIndex = 0; goToSearchMatch(0); }
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

  function clearSearchHits() {
    Object.keys(pageRenders).forEach(function (k) {
      var pr = pageRenders[k];
      if (pr && pr.wrap) pr.wrap.classList.remove("search-hit");
    });
  }

  function goToSearchMatch(idx) {
    if (!searchMatches.length) return;
    searchIndex = ((idx % searchMatches.length) + searchMatches.length) % searchMatches.length;
    var page = searchMatches[searchIndex];
    clearSearchHits();
    var pr = pageRenders[page];
    if (pr && pr.wrap) pr.wrap.classList.add("search-hit");
    goToPage(page);
    el.searchCount.textContent = (searchIndex + 1) + " / " + searchMatches.length;
  }

  function searchStep(dir) {
    if (!searchMatches.length) return;
    goToSearchMatch(searchIndex + dir);
  }

  function enterPresent() {
    if (!pdfDoc) return;
    presenting = true;
    el.presentOverlay.classList.remove("hidden");
    renderPresentPage(currentPage);
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () {});
    } catch (e) {}
    setStatus("プレゼンテーションモード");
  }

  function exitPresent() {
    presenting = false;
    el.presentOverlay.classList.add("hidden");
    el.presentStage.innerHTML = "";
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
    setStatus(totalPages + " ページ · 閲覧専用");
  }

  function renderPresentPage(num) {
    if (!pdfDoc || !el.presentStage) return;
    el.presentStage.innerHTML = "";
    if (el.presentPageLabel) el.presentPageLabel.textContent = num + " / " + totalPages;
    pdfDoc.getPage(num).then(function (page) {
      var baseVp = page.getViewport({ scale: 1, rotation: rotation });
      var maxW = el.presentStage.clientWidth || window.innerWidth;
      var maxH = el.presentStage.clientHeight || window.innerHeight - 48;
      var s = Math.min(maxW / baseVp.width, maxH / baseVp.height) * 0.96;
      var viewport = page.getViewport({ scale: s, rotation: rotation });
      var canvas = document.createElement("canvas");
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = Math.floor(viewport.width) + "px";
      canvas.style.height = Math.floor(viewport.height) + "px";
      var ctx = canvas.getContext("2d", { alpha: false });
      var transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;
      el.presentStage.appendChild(canvas);
      return page.render({ canvasContext: ctx, viewport: viewport, transform: transform }).promise;
    }).catch(function (err) { console.warn(err); });
  }

  function printPdf() {
    if (!downloadUrl) { setStatus("印刷用データがありません"); return; }
    var w = window.open(downloadUrl);
    if (w) {
      w.addEventListener("load", function () { try { w.print(); } catch (e) {} });
    } else setStatus("ポップアップがブロックされました");
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  }

  function openFilePicker() {
    if (!el.fileInput) {
      setStatus("ファイル選択UIが見つかりません");
      return;
    }
    try {
      el.fileInput.value = "";
      el.fileInput.click();
    } catch (err) {
      console.error(err);
      setStatus("ファイル選択を開けませんでした");
    }
  }

  function bindUI() {
    if (el.btnOpen) el.btnOpen.addEventListener("click", function (e) {
      e.preventDefault();
      openFilePicker();
    });
    if (el.btnOpenMain) el.btnOpenMain.addEventListener("click", function (e) {
      e.preventDefault();
      openFilePicker();
    });
    if (el.fileInput) {
      el.fileInput.addEventListener("change", function () {
        var f = el.fileInput.files && el.fileInput.files[0];
        if (!f) {
          setStatus("ファイルが選ばれていません");
          return;
        }
        if (f.type && f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) {
          setStatus("PDFファイルを選んでください");
          return;
        }
        if (!ensurePdfjs()) return;
        setStatus("読込中: " + f.name);
        loadPdfFromFile(f);
        try { el.fileInput.value = ""; } catch (e) {}
      });
    }

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
      applyZoom(Math.max(0.25, (scale || 1) / 1.25));
    });
    el.zoomSelect.addEventListener("change", function () { applyZoom(el.zoomSelect.value); });
    el.btnRotate.addEventListener("click", rotateClockwise);
    el.btnLayout.addEventListener("click", toggleFacing);
    el.btnInvert.addEventListener("click", toggleInvert);
    el.btnPresent.addEventListener("click", function () {
      if (presenting) exitPresent(); else enterPresent();
    });
    el.presentExit.addEventListener("click", exitPresent);

    el.btnSearch.addEventListener("click", function () {
      el.searchBar.classList.toggle("hidden");
      if (!el.searchBar.classList.contains("hidden")) el.searchInput.focus();
    });
    el.searchClose.addEventListener("click", function () {
      el.searchBar.classList.add("hidden"); clearSearchHits();
    });
    el.searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        if (e.shiftKey) searchStep(-1);
        else if (searchMatches.length && el.searchInput.value.trim()) searchStep(1);
        else runSearch(el.searchInput.value.trim());
      }
    });
    el.searchPrev.addEventListener("click", function () { searchStep(-1); });
    el.searchNext.addEventListener("click", function () { searchStep(1); });

    el.btnSidebar.addEventListener("click", function () { el.sidebar.classList.toggle("hidden"); });
    document.querySelectorAll(".sidebar-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".sidebar-tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        var panel = tab.dataset.panel;
        el.thumbsPanel.classList.toggle("hidden", panel !== "thumbs");
        el.outlinePanel.classList.toggle("hidden", panel !== "outline");
        el.infoPanel.classList.toggle("hidden", panel !== "info");
      });
    });

    el.btnFullscreen.addEventListener("click", function () {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () {});
      else document.exitFullscreen();
    });
    el.btnPrint.addEventListener("click", printPdf);
    el.viewer.addEventListener("scroll", onViewerScroll, { passive: true });

    el.viewer.addEventListener("wheel", function (e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) applyZoom(Math.min(4, (scale || 1) * 1.1));
        else applyZoom(Math.max(0.25, (scale || 1) / 1.1));
      }
    }, { passive: false });

    document.addEventListener("keydown", function (e) {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) {
        if (e.key === "Escape" && !el.searchBar.classList.contains("hidden")) {
          el.searchBar.classList.add("hidden"); clearSearchHits();
        }
        return;
      }
      if (presenting) {
        if (e.key === "Escape") { e.preventDefault(); exitPresent(); }
        else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") {
          e.preventDefault(); goToPage(currentPage + 1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
          e.preventDefault(); goToPage(currentPage - 1);
        } else if (e.key === "Home") { e.preventDefault(); goToPage(1); }
        else if (e.key === "End") { e.preventDefault(); goToPage(totalPages); }
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); goToPage(currentPage - 1); }
      else if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); goToPage(currentPage + 1); }
      else if (e.key === " " && !e.shiftKey) { e.preventDefault(); goToPage(currentPage + 1); }
      else if (e.key === "Home") { e.preventDefault(); goToPage(1); }
      else if (e.key === "End") { e.preventDefault(); goToPage(totalPages); }
      else if (e.key === "+" || e.key === "=") { e.preventDefault(); el.btnZoomIn.click(); }
      else if (e.key === "-") { e.preventDefault(); el.btnZoomOut.click(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        el.searchBar.classList.remove("hidden");
        el.searchInput.focus(); el.searchInput.select();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault(); printPdf();
      } else if (e.key.toLowerCase() === "f" && pdfDoc && !e.ctrlKey && !e.metaKey) {
        e.preventDefault(); enterPresent();
      } else if (e.key.toLowerCase() === "r" && pdfDoc && !e.ctrlKey) {
        e.preventDefault(); rotateClockwise();
      } else if (e.key.toLowerCase() === "i" && pdfDoc && !e.ctrlKey) {
        e.preventDefault(); toggleInvert();
      } else if (e.key === "Escape") {
        if (!el.searchBar.classList.contains("hidden")) {
          el.searchBar.classList.add("hidden"); clearSearchHits();
        } else if (!el.sidebar.classList.contains("hidden")) {
          el.sidebar.classList.add("hidden");
        }
      }
    });

    window.addEventListener("resize", debounce(function () {
      if (!pdfDoc) return;
      if (zoomMode === "auto" || zoomMode === "page-width" || zoomMode === "page-fit") {
        applyZoom(zoomMode);
      }
      if (presenting) renderPresentPage(currentPage);
    }, 200));
  }

  function boot() {
    bindUI();
    setControlsEnabled(false);
    var src = getQueryParam("src") || getQueryParam("url") || getQueryParam("file");
    if (src) {
      try { loadPdfFromUrl(new URL(src, location.href).href, src.split("/").pop()); }
      catch (e) { setStatus("URL不正"); }
    } else {
      setStatus("PDFを開いてください · 閲覧専用");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
