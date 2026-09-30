/**
 * G5 Portal - Materials
 * files/ 配下の PDF を GitHub API で自動取得して表示
 * サブフォルダ名 = カテゴリ、ファイル名 = タイトル
 * script への手動登録は不要
 */
(function () {
  "use strict";

  var GH_OWNER = "r25347sh";
  var GH_REPO = "G5PORTAL";
  var FILES_API_PATH = "pages/materials/files";
  var FILES_BASE = "files/";
  var ALLOWED_EXT = /\.pdf$/i;

  var materials = [];

  var listEl = document.getElementById("list-view");
  var galleryEl = document.getElementById("gallery-view");
  var emptyEl = document.getElementById("empty-state");
  var countEl = document.getElementById("file-count");
  var tabs = document.querySelectorAll(".view-tab");

  var modal = document.getElementById("preview-modal");
  var previewTitle = document.getElementById("preview-title");
  var previewFrame = document.getElementById("preview-frame");
  var previewDownload = document.getElementById("preview-download");
  var previewOpen = document.getElementById("preview-open");

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "\u0026amp;")
      .replace(/</g, "\u0026lt;")
      .replace(/>/g, "\u0026gt;")
      .replace(/"/g, "\u0026quot;");
  }

  function encodePath(relPath) {
    return String(relPath)
      .split("/")
      .map(function (seg) {
        return encodeURIComponent(seg);
      })
      .join("/");
  }

  function fileUrl(relPath) {
    return FILES_BASE + encodePath(relPath);
  }

  function formatSize(bytes) {
    if (typeof bytes !== "number" || bytes < 0) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function titleFromName(name) {
    return name.replace(/\.pdf$/i, "");
  }

  /** GitHub Contents API を再帰的に辿って PDF 一覧を取得 */
  function fetchDir(apiPath, folderLabel) {
    var url =
      "https://api.github.com/repos/" +
      GH_OWNER +
      "/" +
      GH_REPO +
      "/contents/" +
      encodePath(apiPath);

    return fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    }).then(function (res) {
      if (!res.ok) throw new Error("API " + res.status + ": " + apiPath);
      return res.json();
    }).then(function (items) {
      if (!Array.isArray(items)) return [];

      var tasks = items.map(function (item) {
        if (item.type === "dir") {
          var nextLabel = folderLabel
            ? folderLabel + " / " + item.name
            : item.name;
          return fetchDir(item.path, nextLabel);
        }

        if (item.type === "file" && ALLOWED_EXT.test(item.name)) {
          // pages/materials/files/ 以降の相対パス
          var prefix = FILES_API_PATH + "/";
          var rel =
            item.path.indexOf(prefix) === 0
              ? item.path.slice(prefix.length)
              : item.name;

          return [
            {
              id: item.sha || rel,
              title: titleFromName(item.name),
              relPath: rel,
              filename: item.name,
              category: folderLabel || "",
              size: formatSize(item.size),
              sizeBytes: item.size || 0,
            },
          ];
        }

        return [];
      });

      return Promise.all(tasks).then(function (chunks) {
        return chunks.reduce(function (acc, c) {
          return acc.concat(c);
        }, []);
      });
    });
  }

  function renderList() {
    if (!listEl) return;
    listEl.innerHTML = materials
      .map(function (m) {
        var url = fileUrl(m.relPath);
        var meta = "";
        if (m.category) {
          meta +=
            '<span class="mat-tag">' +
            escapeHtml(m.category) +
            "</span>";
        }
        if (m.size) {
          meta += "<span>" + escapeHtml(m.size) + "</span>";
        }
        return (
          '<article class="mat-row" data-id="' +
          escapeHtml(m.id) +
          '">' +
          '<div class="mat-icon" aria-hidden="true">PDF</div>' +
          '<div class="mat-body">' +
          '<h3 class="mat-title">' +
          escapeHtml(m.title) +
          "</h3>" +
          '<div class="mat-meta">' +
          meta +
          "</div></div>" +
          '<div class="mat-actions">' +
          '<button type="button" class="btn btn-primary btn-sm" data-preview="' +
          escapeHtml(m.id) +
          '">プレビュー</button>' +
          '<a class="btn btn-ghost btn-sm" href="' +
          url +
          '" download="' +
          escapeHtml(m.filename) +
          '">ダウンロード</a>' +
          '<a class="btn btn-ghost btn-sm" href="' +
          url +
          '" target="_blank" rel="noopener">開く</a>' +
          "</div></article>"
        );
      })
      .join("");
  }

  function renderGallery() {
    if (!galleryEl) return;
    galleryEl.innerHTML = materials
      .map(function (m) {
        var url = fileUrl(m.relPath);
        var meta = "";
        if (m.category) {
          meta +=
            '<span class="mat-tag">' +
            escapeHtml(m.category) +
            "</span>";
        }
        if (m.size) {
          meta += "<span>" + escapeHtml(m.size) + "</span>";
        }
        return (
          '<article class="mat-card" data-id="' +
          escapeHtml(m.id) +
          '">' +
          '<div class="mat-icon" aria-hidden="true">PDF</div>' +
          '<h3 class="mat-title">' +
          escapeHtml(m.title) +
          "</h3>" +
          '<div class="mat-meta">' +
          meta +
          "</div>" +
          '<div class="mat-actions">' +
          '<button type="button" class="btn btn-primary btn-sm" data-preview="' +
          escapeHtml(m.id) +
          '">プレビュー</button>' +
          '<a class="btn btn-ghost btn-sm" href="' +
          url +
          '" download="' +
          escapeHtml(m.filename) +
          '">DL</a>' +
          "</div></article>"
        );
      })
      .join("");
  }

  function setView(view) {
    var isList = view === "list";
    if (listEl) listEl.classList.toggle("hidden", !isList);
    if (galleryEl) galleryEl.classList.toggle("hidden", isList);
    tabs.forEach(function (tab) {
      var active = tab.getAttribute("data-view") === view;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    try {
      localStorage.setItem("g5-materials-view", view);
    } catch (e) {}
  }

  function openPreview(id) {
    var m = null;
    for (var i = 0; i < materials.length; i++) {
      if (materials[i].id === id) {
        m = materials[i];
        break;
      }
    }
    if (!m || !modal) return;
    var url = fileUrl(m.relPath);
    if (previewTitle) previewTitle.textContent = m.title;
    if (previewFrame) previewFrame.src = url;
    if (previewDownload) {
      previewDownload.href = url;
      previewDownload.setAttribute("download", m.filename);
    }
    if (previewOpen) previewOpen.href = url;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closePreview() {
    if (!modal) return;
    modal.classList.add("hidden");
    if (previewFrame) previewFrame.src = "";
    document.body.style.overflow = "";
  }

  function bindEvents() {
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        setView(tab.getAttribute("data-view"));
      });
    });

    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-preview]");
      if (btn) {
        e.preventDefault();
        openPreview(btn.getAttribute("data-preview"));
        return;
      }
      if (e.target.closest("[data-close]")) {
        closePreview();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (
        e.key === "Escape" &&
        modal &&
        !modal.classList.contains("hidden")
      ) {
        closePreview();
      }
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

  function showLoading() {
    if (countEl) countEl.textContent = "読込中…";
  }

  function init() {
    bindEvents();
    showLoading();

    fetchDir(FILES_API_PATH, "")
      .then(function (list) {
        materials = list.sort(function (a, b) {
          var ca = a.category || "";
          var cb = b.category || "";
          if (ca !== cb) return ca < cb ? -1 : 1;
          return a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
        });

        if (materials.length === 0) {
          showEmpty(
            "PDF がありません。pages/materials/files/ に配置してください。"
          );
          return;
        }

        if (emptyEl) emptyEl.classList.add("hidden");
        renderList();
        renderGallery();
        if (countEl) countEl.textContent = materials.length + " 件";

        var saved = "list";
        try {
          saved = localStorage.getItem("g5-materials-view") || "list";
        } catch (e) {}
        setView(saved === "gallery" ? "gallery" : "list");
      })
      .catch(function (err) {
        console.error("[materials]", err);
        showEmpty(
          "教材一覧の取得に失敗しました。しばらくしてから再読み込みしてください。"
        );
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
