const API = window.PORTAL_CONFIG.API_BASE_URL.replace(/\/$/, "");
const params = new URLSearchParams(location.search);
const slug = params.get("slug");
const root = document.getElementById("chapterContent");

let fontSize = 18;
let zoomLevel = 1;

document.getElementById("year").textContent = new Date().getFullYear();

function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

function setFont() {
  const p = document.querySelector(".prose-content");
  if (p) p.style.setProperty("--reader-font", fontSize + "px");
}

// =========================================
// IMAGE LIGHTBOX / FULL SCREEN VIEWER
// =========================================

function createImageViewer() {
  if (document.getElementById("imageViewer")) return;

  const viewer = document.createElement("div");
  viewer.id = "imageViewer";
  viewer.innerHTML = `
    <div class="image-viewer-toolbar">
      <button type="button" id="imageZoomOut" aria-label="Zoom out">−</button>
      <button type="button" id="imageZoomReset">Reset</button>
      <button type="button" id="imageZoomIn" aria-label="Zoom in">+</button>
      <button type="button" id="imageViewerClose" aria-label="Close viewer">✕</button>
    </div>
    <div class="image-viewer-stage">
      <img id="imageViewerImg" src="" alt="">
    </div>
    <div class="image-viewer-caption" id="imageViewerCaption"></div>
  `;

  document.body.appendChild(viewer);

  const image = document.getElementById("imageViewerImg");
  const stage = viewer.querySelector(".image-viewer-stage");

  function updateZoom() {
    image.style.transform = `scale(${zoomLevel})`;
  }

  function closeViewer() {
    viewer.classList.remove("active");
    image.src = "";
    zoomLevel = 1;
    updateZoom();
    document.body.classList.remove("image-viewer-open");
  }

  function openViewer(source, alt, caption) {
    image.src = source;
    image.alt = alt || "Chapter image";
    document.getElementById("imageViewerCaption").textContent =
      caption || alt || "";

    zoomLevel = 1;
    updateZoom();

    viewer.classList.add("active");
    document.body.classList.add("image-viewer-open");
  }

  document.getElementById("imageZoomIn").addEventListener("click", () => {
    zoomLevel = Math.min(4, zoomLevel + 0.25);
    updateZoom();
  });

  document.getElementById("imageZoomOut").addEventListener("click", () => {
    zoomLevel = Math.max(0.5, zoomLevel - 0.25);
    updateZoom();
  });

  document.getElementById("imageZoomReset").addEventListener("click", () => {
    zoomLevel = 1;
    updateZoom();
    stage.scrollTo({ left: 0, top: 0 });
  });

  document
    .getElementById("imageViewerClose")
    .addEventListener("click", closeViewer);

  viewer.addEventListener("click", (event) => {
    if (event.target === viewer || event.target === stage) {
      closeViewer();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!viewer.classList.contains("active")) return;

    if (event.key === "Escape") {
      closeViewer();
    }

    if (event.key === "+" || event.key === "=") {
      zoomLevel = Math.min(4, zoomLevel + 0.25);
      updateZoom();
    }

    if (event.key === "-") {
      zoomLevel = Math.max(0.5, zoomLevel - 0.25);
      updateZoom();
    }
  });

  // Mouse wheel zoom
  stage.addEventListener(
    "wheel",
    (event) => {
      if (!viewer.classList.contains("active")) return;

      event.preventDefault();

      zoomLevel =
        event.deltaY < 0
          ? Math.min(4, zoomLevel + 0.1)
          : Math.max(0.5, zoomLevel - 0.1);

      updateZoom();
    },
    { passive: false },
  );

  // Mobile pinch zoom
  let initialPinchDistance = 0;
  let initialZoom = 1;

  stage.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length === 2) {
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;

        initialPinchDistance = Math.hypot(dx, dy);
        initialZoom = zoomLevel;
      }
    },
    { passive: true },
  );

  stage.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length !== 2) return;

      event.preventDefault();

      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;

      const currentDistance = Math.hypot(dx, dy);

      if (initialPinchDistance > 0) {
        zoomLevel = Math.max(
          0.5,
          Math.min(4, (initialZoom * currentDistance) / initialPinchDistance),
        );

        updateZoom();
      }
    },
    { passive: false },
  );

  stage.addEventListener("touchend", (event) => {
    if (event.touches.length < 2) {
      initialPinchDistance = 0;
    }
  });

  return openViewer;
}

const openImageViewer = createImageViewer();

// =========================================
// LOAD CHAPTER
// =========================================

async function load() {
  if (!slug) {
    root.innerHTML = `
      <div class="empty-state">
        No chapter selected.
        <a href="index.html#library">Return to study library</a>.
      </div>`;
    return;
  }

  try {
    const r = await fetch(`${API}/api/chapters/${encodeURIComponent(slug)}`);

    if (!r.ok) {
      throw new Error(
        r.status === 404
          ? "This chapter could not be found."
          : "Unable to load chapter.",
      );
    }

    const { chapter: c } = await r.json();
    // =========================================
    // RECENTLY VIEWED CHAPTERS
    // =========================================

    function saveRecentlyViewed(chapter) {
      const key = "sarveshtwr_recent_chapters";

      try {
        let recent = JSON.parse(localStorage.getItem(key) || "[]");

        recent = recent.filter((item) => item.slug !== chapter.slug);

        recent.unshift({
          slug: chapter.slug,
          title: chapter.title,
          className: chapter.className,
          subject: chapter.subject,
          viewedAt: new Date().toISOString(),
        });

        localStorage.setItem(key, JSON.stringify(recent));
      } catch (error) {
        console.error("Unable to save reading history:", error);
      }
    }

    saveRecentlyViewed(c);
    document.title = `${c.title} | SARVESHTWR`;

    document.getElementById("breadcrumbs").textContent =
      `Class ${c.className} / ${c.subject} / ${c.title}`;

    root.innerHTML = `
      <article class="chapter-document">

        <header class="document-header">

          <div class="document-meta">
            <span>CLASS ${esc(c.className)}</span>
            <span>${esc(c.subject)}</span>
            <span>${esc(c.chapterNumber || "Study notes")}</span>
          </div>

          <h1>${esc(c.title)}</h1>

          <p>${esc(c.description || "")}</p>

          ${
            c.coverImage
              ? `<img class="document-cover" src="${esc(c.coverImage)}" alt="Chapter cover">`
              : ""
          }

        </header>

        <div class="prose-content" id="proseContent">
          ${c.contentHtml || ""}
        </div>

        <div class="chapter-end">
          <span>✦ Keep learning, keep growing.</span>
          <a href="index.html#library">Explore more chapters →</a>
        </div>

      </article>
    `;

    setFont();
    renderTableOfContents();
    createReadingProgress();
    createBookmarkButton();
    createShareButton(c);
    await renderChapterNavigation(c.slug);
  } catch (e) {
    root.innerHTML = `
      <div class="empty-state">
        <b>Unable to open chapter</b>
        <span>
          ${esc(e.message)}
          Make sure the backend is running and the chapter exists.
        </span>
        <a href="index.html#library">Back to study library →</a>
      </div>`;
  }
}

// =========================================
// IMAGE CLICK - OPEN FULL SCREEN
// =========================================

root.addEventListener("click", (event) => {
  const img = event.target.closest(".prose-content img, .document-cover");

  if (!img) return;

  // Do not open broken images
  if (!img.complete || !img.naturalWidth) {
    return;
  }

  event.preventDefault();

  const figure = img.closest("figure");

  const caption =
    figure?.querySelector("figcaption")?.textContent ||
    (img.classList.contains("document-cover")
      ? document.querySelector(".document-header h1")?.textContent +
        " - Cover Image"
      : "");

  openImageViewer(img.currentSrc || img.src, img.alt, caption);
});

// =========================================
// READING MODE
// =========================================

document.getElementById("readingToggle").addEventListener("click", (e) => {
  document.body.classList.toggle("reading-mode");

  e.currentTarget.textContent = document.body.classList.contains("reading-mode")
    ? "☷ Normal mode"
    : "☷ Reading mode";
});

// =========================================
// FONT SIZE CONTROLS
// =========================================

document.getElementById("fontDown").addEventListener("click", () => {
  fontSize = Math.max(14, fontSize - 1);
  setFont();
});

document.getElementById("fontUp").addEventListener("click", () => {
  fontSize = Math.min(26, fontSize + 1);
  setFont();
});

// =========================================
// PRINT
// =========================================

document.getElementById("printBtn").addEventListener("click", () => {
  window.print();
});

// =========================================
// START
// =========================================

// =========================================
// PREVIOUS / NEXT CHAPTER NAVIGATION
// =========================================

async function renderChapterNavigation(currentSlug) {
  try {
    const response = await fetch(`${API}/api/chapters`);

    if (!response.ok) return;

    const data = await response.json();
    const chapters = data.chapters || [];

    if (!chapters.length) return;

    const currentIndex = chapters.findIndex(
      (chapter) => chapter.slug === currentSlug,
    );

    if (currentIndex === -1) return;

    const previous = chapters[currentIndex - 1];
    const next = chapters[currentIndex + 1];

    const navigation = document.createElement("section");
    navigation.className = "chapter-navigation";

    navigation.innerHTML = `
      <div class="chapter-navigation-item previous">
        ${
          previous
            ? `
              <span>PREVIOUS CHAPTER</span>
              <button type="button" data-chapter-slug="${esc(previous.slug)}">
                ← ${esc(previous.title)}
              </button>
            `
            : `<span>YOU ARE AT THE FIRST CHAPTER</span>`
        }
      </div>

      <div class="chapter-navigation-item next">
        ${
          next
            ? `
              <span>NEXT CHAPTER</span>
              <button type="button" data-chapter-slug="${esc(next.slug)}">
                ${esc(next.title)} →
              </button>
            `
            : `<span>YOU HAVE COMPLETED THE LAST CHAPTER</span>`
        }
      </div>
    `;

    root.querySelector(".chapter-document")?.appendChild(navigation);

    navigation.querySelectorAll("[data-chapter-slug]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextSlug = button.dataset.chapterSlug;

        location.href = `chapter.html?slug=${encodeURIComponent(nextSlug)}`;
      });
    });
  } catch (error) {
    console.error("Chapter navigation error:", error);
  }
}

// =========================================
// AUTOMATIC TABLE OF CONTENTS
// =========================================

function renderTableOfContents() {
  const content = document.getElementById("proseContent");
  if (!content) return;

  const headings = content.querySelectorAll("h2, h3, h4");

  if (!headings.length) return;

  const toc = document.createElement("nav");
  toc.className = "chapter-toc";
  toc.setAttribute("aria-label", "Table of Contents");

  const title = document.createElement("h3");
  title.textContent = "Table of Contents";

  const list = document.createElement("ul");

  headings.forEach((heading, index) => {
    if (!heading.id) {
      heading.id = `chapter-topic-${index + 1}`;
    }

    const item = document.createElement("li");
    item.className = `toc-level-${heading.tagName.toLowerCase()}`;

    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent.trim();

    link.addEventListener("click", (event) => {
      event.preventDefault();

      heading.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      history.replaceState(null, "", `#${heading.id}`);
    });

    item.appendChild(link);
    list.appendChild(item);
  });

  toc.appendChild(title);
  toc.appendChild(list);

  const documentHeader = document.querySelector(".document-header");

  if (documentHeader) {
    documentHeader.insertAdjacentElement("afterend", toc);
  }
}

// =========================================
// READING PROGRESS BAR
// =========================================

function createReadingProgress() {
  if (document.getElementById("readingProgress")) return;

  const bar = document.createElement("div");
  bar.id = "readingProgress";

  bar.innerHTML = `
    <div id="readingProgressFill"></div>
    <span id="readingProgressText">0% Read</span>
  `;

  document.body.appendChild(bar);

  function updateProgress() {
    const content = document.querySelector(".chapter-document");

    if (!content) return;

    const scrollTop = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;

    const totalScrollable = documentHeight - windowHeight;

    let progress =
      totalScrollable > 0
        ? Math.round((scrollTop / totalScrollable) * 100)
        : 100;

    progress = Math.max(0, Math.min(100, progress));

    document.getElementById("readingProgressFill").style.width = progress + "%";

    document.getElementById("readingProgressText").textContent =
      progress + "% Read";
  }

  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);

  updateProgress();
}

// =========================================
// CHAPTER BOOKMARK SYSTEM
// =========================================

function createBookmarkButton() {
  if (!slug || document.getElementById("bookmarkChapterBtn")) return;

  const storageKey = "sarveshtwr_bookmarked_chapters";

  function getBookmarks() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      return [];
    }
  }

  function saveBookmarks(bookmarks) {
    localStorage.setItem(storageKey, JSON.stringify(bookmarks));
  }

  const button = document.createElement("button");
  button.id = "bookmarkChapterBtn";
  button.type = "button";
  button.className = "bookmark-chapter-btn";

  const isSaved = getBookmarks().includes(slug);

  button.innerHTML = isSaved ? "★ Bookmarked" : "☆ Bookmark Chapter";

  button.classList.toggle("bookmarked", isSaved);

  button.addEventListener("click", () => {
    let bookmarks = getBookmarks();
    const alreadySaved = bookmarks.includes(slug);

    if (alreadySaved) {
      bookmarks = bookmarks.filter((item) => item !== slug);
      button.innerHTML = "☆ Bookmark Chapter";
      button.classList.remove("bookmarked");
    } else {
      bookmarks.push(slug);
      button.innerHTML = "★ Bookmarked";
      button.classList.add("bookmarked");
    }

    saveBookmarks(bookmarks);
  });

  const header = document.querySelector(".document-header");

  if (header) {
    header.appendChild(button);
  }
}

// =========================================
// SHARE CHAPTER
// =========================================

function createShareButton(chapter) {
  if (document.getElementById("shareChapterBtn")) return;

  const button = document.createElement("button");

  button.id = "shareChapterBtn";
  button.type = "button";
  button.className = "share-chapter-btn";
  button.textContent = "↗ Share Chapter";

  button.addEventListener("click", async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: chapter.title,
      text: `Study ${chapter.title} - Class ${chapter.className} ${chapter.subject}`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        button.textContent = "✓ Link Copied";
        setTimeout(() => {
          button.textContent = "↗ Share Chapter";
        }, 2000);
      } else {
        window.prompt("Copy this chapter link:", shareUrl);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        window.prompt("Copy this chapter link:", shareUrl);
      }
    }
  });

  const header = document.querySelector(".document-header");

  if (header) {
    header.appendChild(button);
  }
}

load();
