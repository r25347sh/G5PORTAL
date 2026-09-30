/**
 * G⁵ Portal · 副教材
 * files/ 配下の PDF をリスト / ギャラリーで表示し、プレビュー・ダウンロードを提供
 * 新しい PDF を追加したら MATERIALS 配列に1件追加するだけ
 */
(function () {
  "use strict";

  /** @type {{ id: string, title: string, filename: string, description?: string, category?: string, size?: string }[]} */
  const MATERIALS = [
    {
      id: "buildup-diff-basic",
      title: "Build Up! ドリル 〜微分基礎〜",
      filename: "Build Up! ドリル ~微分基礎~ 無骨var.pdf",
      description: "微分の基礎を固めるドリル教材",
      category: "数学",
      size: "約227 KB",
    },
  ];

  const FILES_BASE = "files/";

  const listEl = document.getElementById("list-view");
  const galleryEl = document.getElementById("gallery-view");
  const emptyEl = document.getElementById("empty-state");
  const countEl = document.getElementById("file-count");
  const tabs = document.querySelectorAll(".view-tab");

  const modal = document.getElementById("preview-modal");
  const previewTitle = document.getElementById("preview-title");
  const previewFrame = document.getElementById("preview-frame");
  const previewDownload = document.getElementById("preview-download");
  const previewOpen = document.getElementById("preview-open");

  function fileUrl(filename) {
    return FILES_BASE + encodeURIComponent(filename);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function renderList() {
    if (!listEl) return;
    listEl.innerHTML = MATERIALS.map((m) => {
      const url = fileUrl(m.filename);
      return (
        `<article class="mat-row" data-id="${escapeHtml(m.id)}">` +
        `<div class="mat-icon" aria-hidden="true">📄</div>` +
        `<div class="mat-body">` +
        `<h3 class="mat-title">${escapeHtml(m.title)}</h3>` +
        `<div class="mat-meta">` +
        (m.category ? `<span class="mat-tag">${escapeHtml(m.category)}</span>` : "") +
        (m.size ? `<span>${escapeHtml(m.size)}</span>` : "") +
        (m.description ? `<span>${escapeHtml(m.description)}</span>` : "") +
        `</div></div>` +
        `<div class="mat-actions">` +
        `<button type="button" class="btn btn-primary btn-sm" data-preview="${escapeHtml(m.id)}">プレビュー</button>` +
        `<a class="btn btn-ghost btn-sm" href="${url}" download="${escapeHtml(m.filename)}">ダウンロード</a>` +
        `<a class="btn btn-ghost btn-sm" href="${url}" target="_blank" rel="noopener">開く</a>` +
        `</div></article>`
      );
    }).join("");
  }

  function renderGallery() {
    if (!galleryEl) return;
    galleryEl.innerHTML = MATERIALS.map((m) => {
      const url = fileUrl(m.filename);
      return (
        `<article class="mat-card" data-id="${escapeHtml(m.id)}">` +
        `<div class="mat-icon" aria-hidden="true">📄</div>` +
        `<h3 class="mat-title">${escapeHtml(m.title)}</h3>` +
        `<div class="mat-meta">` +
        (m.category ? `<span class="mat-tag">${escapeHtml(m.category)}</span>` : "") +
        (m.size ? `<span>${escapeHtml(m.size)}</span>` : "") +
        `</div>` +
        `<div class="mat-actions">` +
        `<button type="button" class="btn btn-primary btn-sm" data-preview="${escapeHtml(m.id)}">プレビュー</button>` +
        `<a class="btn btn-ghost btn-sm" href="${url}" download="${escapeHtml(m.filename)}">DL</a>` +
        `</div></article>`
      );
    }).join("");
  }

  function setView(view) {
    const isList = view === "list";
    listEl.classList.toggle("hidden", !isList);
    galleryEl.classList.toggle("hidden", isList);
    tabs.forEach((tab) => {
      const active = tab.dataset.view === view;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    try {
      localStorage.setItem("g5-materials-view", view);
    } catch (_) {}
  }

  function openPreview(id) {
    const m = MATERIALS.find((x) => x.id === id);
    if (!m || !modal) return;
    const url = fileUrl(m.filename);
    previewTitle.textContent = m.title;
    previewFrame.src = url;
    previewDownload.href = url;
    previewDownload.setAttribute("download", m.filename);
    previewOpen.href = url;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closePreview() {
    if (!modal) return;
    modal.classList.add("hidden");
    previewFrame.src = "";
    document.body.style.overflow = "";
  }

  function bindEvents() {
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => setView(tab.dataset.view));
    });

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-preview]");
      if (btn) {
        e.preventDefault();
        openPreview(btn.getAttribute("data-preview"));
        return;
      }
      if (e.target.closest("[data-close]")) {
        closePreview();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) {
        closePreview();
      }
    });
  }

  function init() {
    if (MATERIALS.length === 0) {
      emptyEl.classList.remove("hidden");
      listEl.classList.add("hidden");
      galleryEl.classList.add("hidden");
      if (countEl) countEl.textContent = "0 件";
      return;
    }

    renderList();
    renderGallery();
    if (countEl) countEl.textContent = MATERIALS.length + " 件";

    let saved = "list";
    try {
      saved = localStorage.getItem("g5-materials-view") || "list";
    } catch (_) {}
    setView(saved === "gallery" ? "gallery" : "list");
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
