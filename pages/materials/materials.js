/**
 * G5 Portal - Materials
 * PDF opens in high-performance PDF viewer
 */
(function () {
  "use strict";

  var GH_OWNER = "r25347sh";
  var GH_REPO = "G5PORTAL";
  var FILES_API_PATH = "pages/materials/files";
  var FILES_BASE = "files/";

  var EXT_KIND = {
    pdf: "pdf", png: "image", jpg: "image", jpeg: "image", gif: "image",
    webp: "image", bmp: "image", svg: "image",
    mp4: "video", mov: "video", webm: "video", m4v: "video",
    mp3: "audio", wav: "audio", ogg: "audio", m4a: "audio", aac: "audio"
  };
  var KIND_LABEL = { pdf: "PDF", image: "画像", video: "動画", audio: "音声" };
  var KIND_ICON = { pdf: "PDF", image: "IMG", video: "VID", audio: "AUD" };

  var materials = [];
  var listEl = document.getElementById("list-view");
  var galleryEl = document.getElementById("gallery-view");
  var emptyEl = document.getElementById("empty-state");
  var countEl = document.getElementById("file-count");
  var tabs = document.querySelectorAll(".view-tab");
  var modal = document.getElementById("preview-modal");
  var previewTitle = document.getElementById("preview-title");
  var previewBody = document.getElementById("preview-body");
  var previewDownload = document.getElementById("preview-download");
  var previewOpen = document.getElementById("preview-open");

  function escapeHtml(str) {
    var s = String(str), out = "";
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (c === "&") out += "&amp;";
      else if (c === "<") out += "&lt;";
      else if (c === ">") out += "&gt;";
      else if (c === '"') out += "&quot;";
      else out += c;
    }
    return out;
  }

  function encodePath(relPath) {
    return String(relPath).split("/").map(function (seg) {
      return encodeURIComponent(seg);
    }).join("/");
  }

  function fileUrl(relPath) {
    return FILES_BASE + encodePath(relPath);
  }

  function pdfViewerUrl(relPath) {
    return "../pdf-viewer/index.html?src=" + encodeURIComponent("../materials/files/" + encodePath(relPath));
  }

  function formatSize(bytes) {
    if (typeof bytes !== "number" || bytes < 0) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function extOf(name) {
    var m = String(name).match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : "";
  }

  function kindOf(name) {
    return EXT_KIND[extOf(name)] || null;
  }

  function titleFromName(name) {
    return name.replace(/\.[a-z0-9]+$/i, "");
  }

  function fetchDir(apiPath, folderLabel) {
    var url = "https://api.github.com/repos/" + GH_OWNER + "/" + GH_REPO + "/contents/" + encodePath(apiPath);
    return fetch(url, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("API " + res.status + ": " + apiPath);
        return res.json();
      })
      .then(function (items) {
        if (!Array.isArray(items)) return [];
        var tasks = items.map(function (item) {
          if (item.type === "dir") {
            var nextLabel = folderLabel ? folderLabel + " / " + item.name : item.name;
            return fetchDir(item.path, nextLabel);
          }
          if (item.type === "file") {
            var kind = kindOf(item.name);
            if (!kind) return [];
            var prefix = FILES_API_PATH + "/";
            var rel = item.path.indexOf(prefix) === 0 ? item.path.slice(prefix.length) : item.name;
            return [{
              id: item.sha || rel,
              title: titleFromName(item.name),
              relPath: rel,
              filename: item.name,
              category: folderLabel || "",
              size: formatSize(item.size),
              sizeBytes: item.size || 0,
              kind: kind,
              ext: extOf(item.name)
            }];
          }
          return [];
        });
        return Promise.all(tasks).then(function (chunks) {
          var acc = [];
          for (var i = 0; i < chunks.length; i++) acc = acc.concat(chunks[i]);
          return acc;
        });
      });
  }

  function kindBadge(m) {
    return '<span class="mat-kind mat-kind-' + escapeHtml(m.kind) + '">' +
      escapeHtml(KIND_LABEL[m.kind] || m.ext.toUpperCase()) + "</span>";
  }

  function metaHtml(m) {
    var meta = kindBadge(m);
    if (m.category) meta += '<span class="mat-tag">' + escapeHtml(m.category) + "</span>";
    if (m.size) meta += "<span>" + escapeHtml(m.size) + "</span>";
    return meta;
  }

  function iconHtml(m) {
    return '<div class="mat-icon mat-icon-' + escapeHtml(m.kind) + '" aria-hidden="true">' +
      escapeHtml(KIND_ICON[m.kind] || "FILE") + "</div>";
  }

  function actionButtons(m, compact) {
    var url = fileUrl(m.relPath);
    var previewBtn;
    if (m.kind === "pdf") {
      var viewer = pdfViewerUrl(m.relPath);
      previewBtn = '<a class="btn btn-primary btn-sm" href="' + escapeHtml(viewer) + '">ビューアーで開く</a>';
    } else {
      previewBtn = '<button type="button" class="btn btn-primary btn-sm" data-preview="' +
        escapeHtml(m.id) + '">プレビュー</button>';
    }
    var dlLabel = compact ? "DL" : "ダウンロード";
    return previewBtn +
      '<a class="btn btn-ghost btn-sm" href="' + url + '" download="' +
      escapeHtml(m.filename) + '">' + dlLabel + "</a>" +
      (compact ? "" : '<a class="btn btn-ghost btn-sm" href="' + url +
        '" target="_blank" rel="noopener">開く</a>');
  }

  function renderList() {
    if (!listEl) return;
    var html = "";
    for (var i = 0; i < materials.length; i++) {
      var m = materials[i];
      html += '<article class="mat-row" data-id="' + escapeHtml(m.id) + '">' +
        iconHtml(m) +
        '<div class="mat-body"><h3 class="mat-title">' + escapeHtml(m.title) + "</h3>" +
        '<div class="mat-meta">' + metaHtml(m) + "</div></div>" +
        '<div class="mat-actions">' + actionButtons(m, false) + "</div></article>";
    }
    listEl.innerHTML = html;
  }

  function renderGallery() {
    if (!galleryEl) return;
    var html = "";
    for (var i = 0; i < materials.length; i++) {
      var m = materials[i];
      var url = fileUrl(m.relPath);
      var thumb = m.kind === "image"
        ? '<div class="mat-thumb"><img src="' + url + '" alt="" loading="lazy"></div>'
        : iconHtml(m);
      html += '<article class="mat-card" data-id="' + escapeHtml(m.id) + '">' +
        thumb + '<h3 class="mat-title">' + escapeHtml(m.title) + "</h3>" +
        '<div class="mat-meta">' + metaHtml(m) + "</div>" +
        '<div class="mat-actions">' + actionButtons(m, true) + "</div></article>";
    }
    galleryEl.innerHTML = html;
  }

  function setView(view) {
    var isList = view === "list";
    if (listEl) listEl.classList.toggle("hidden", !isList);
    if (galleryEl) galleryEl.classList.toggle("hidden", isList);
    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      var active = tab.getAttribute("data-view") === view;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    }
    try { localStorage.setItem("g5-materials-view", view); } catch (e) {}
  }

  function clearPreviewMedia() {
    if (!previewBody) return;
    var media = previewBody.querySelectorAll("video, audio");
    for (var i = 0; i < media.length; i++) {
      try { media[i].pause(); } catch (e) {}
    }
    previewBody.innerHTML = "";
  }

  function openPreview(id) {
    var m = null;
    for (var i = 0; i < materials.length; i++) {
      if (materials[i].id === id) { m = materials[i]; break; }
    }
    if (!m || !modal) return;
    if (m.kind === "pdf") {
      location.href = pdfViewerUrl(m.relPath);
      return;
    }
    var url = fileUrl(m.relPath);
    if (previewTitle) previewTitle.textContent = m.title;
    if (previewDownload) {
      previewDownload.href = url;
      previewDownload.setAttribute("download", m.filename);
    }
    if (previewOpen) previewOpen.href = url;
    clearPreviewMedia();
    if (!previewBody) return;
    var elNode;
    if (m.kind === "image") {
      elNode = document.createElement("img");
      elNode.className = "preview-media preview-image";
      elNode.src = url;
      elNode.alt = m.title;
    } else if (m.kind === "video") {
      elNode = document.createElement("video");
      elNode.className = "preview-media preview-video";
      elNode.src = url;
      elNode.controls = true;
      elNode.playsInline = true;
    } else if (m.kind === "audio") {
      var wrap = document.createElement("div");
      wrap.className = "preview-audio-wrap";
      var label = document.createElement("p");
      label.className = "preview-audio-label";
      label.textContent = m.filename;
      elNode = document.createElement("audio");
      elNode.className = "preview-media preview-audio";
      elNode.src = url;
      elNode.controls = true;
      wrap.appendChild(label);
      wrap.appendChild(elNode);
      previewBody.appendChild(wrap);
      elNode = null;
    } else {
      elNode = document.createElement("iframe");
      elNode.className = "preview-media preview-frame";
      elNode.src = url;
      elNode.title = "プレビュー";
    }
    if (elNode) previewBody.appendChild(elNode);
    var fallback = document.createElement("p");
    fallback.className = "preview-fallback";
    fallback.textContent = "プレビューが表示されない場合は「新しいタブで開く」またはダウンロードしてください。";
    previewBody.appendChild(fallback);
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closePreview() {
    if (!modal) return;
    modal.classList.add("hidden");
    clearPreviewMedia();
    document.body.style.overflow = "";
  }

  function bindEvents() {
    for (var i = 0; i < tabs.length; i++) {
      (function (tab) {
        tab.addEventListener("click", function () {
          setView(tab.getAttribute("data-view"));
        });
      })(tabs[i]);
    }
    document.addEventListener("click", function (e) {
      var t = e.target;
      while (t && t !== document) {
        if (t.getAttribute && t.getAttribute("data-preview")) {
          e.preventDefault();
          openPreview(t.getAttribute("data-preview"));
          return;
        }
        if (t.getAttribute && t.getAttribute("data-close") !== null) {
          closePreview();
          return;
        }
        t = t.parentNode;
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) closePreview();
    });
  }

  function showEmpty(msg) {
    if (emptyEl) {
      emptyEl.classList.remove("hidden");
      var p = emptyEl.querySelector("p");
      if (p && msg) p.textContent = msg;
    }
    if (listEl) listEl.classList.add("hidden");
    if (galleryEl) galleryEl.classList.add("hidden");
    if (countEl) countEl.textContent = "0 件";
  }

  function init() {
    bindEvents();
    if (countEl) countEl.textContent = "読込中…";
    fetchDir(FILES_API_PATH, "")
      .then(function (list) {
        materials = list.sort(function (a, b) {
          var ca = a.category || "", cb = b.category || "";
          if (ca !== cb) return ca < cb ? -1 : 1;
          if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
          return a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
        });
        if (materials.length === 0) {
          showEmpty("教材がありません。pages/materials/files/ に PDF 等を配置してください。");
          return;
        }
        if (emptyEl) emptyEl.classList.add("hidden");
        renderList();
        renderGallery();
        if (countEl) countEl.textContent = materials.length + " 件";
        var saved = "list";
        try { saved = localStorage.getItem("g5-materials-view") || "list"; } catch (e) {}
        setView(saved === "gallery" ? "gallery" : "list");
      })
      .catch(function (err) {
        console.error("[materials]", err);
        showEmpty("教材一覧の取得に失敗しました。");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
