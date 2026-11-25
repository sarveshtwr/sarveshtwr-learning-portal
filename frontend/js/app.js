const API = window.PORTAL_CONFIG.API_BASE_URL.replace(/\/$/, "");

const grid = document.getElementById("chapterGrid");
const search = document.getElementById("searchInput");
const cls = document.getElementById("classFilter");
const subject = document.getElementById("subjectFilter");

let chapters = [];
let showingBookmarks = false;

const BOOKMARK_KEY = "sarveshtwr_bookmarked_chapters";

document.getElementById("year").textContent = new Date().getFullYear();

const esc = (s) =>
  String(s ?? "").replace(
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

function toast(t) {
  const e = document.getElementById("toast");
  e.textContent = t;
  e.classList.add("show");
  setTimeout(() => e.classList.remove("show"), 2600);
}

// =========================================
// BOOKMARK STORAGE
// =========================================

function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks) {
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
  updateBookmarkCount();
}

function updateBookmarkCount() {
  const count = getBookmarks().length;
  const badge = document.getElementById("bookmarkCount");

  if (badge) {
    badge.textContent = count;
    badge.style.display = count ? "inline-flex" : "none";
  }
}

// =========================================
// CHAPTER CARD
// =========================================

function card(c) {
  const image = c.coverImage
    ? `<img src="${esc(c.coverImage)}" alt="" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="chapter-art art-${esc(c.className)}">
         <span>${esc(String(c.className).padStart(2, "0"))}</span>
         <i>✦</i>
       </div>`;

  const bookmarked = getBookmarks().includes(c.slug);

  return `
    <article class="chapter-card">

      <a class="chapter-cover"
         href="chapter.html?slug=${encodeURIComponent(c.slug)}">
        ${image}
      </a>

      <div class="chapter-card-body">

        <div class="card-meta">
          <span>CLASS ${esc(c.className)}</span>
          <span>${esc(c.subject)}</span>
        </div>

        <h3>
          <a href="chapter.html?slug=${encodeURIComponent(c.slug)}">
            ${esc(c.title)}
          </a>
        </h3>

        <p>
          ${esc(c.description || "Explore this chapter and strengthen your concepts.")}
        </p>

        <div class="card-bottom">
          <span>${esc(c.chapterNumber || "Study notes")}</span>
          <a href="chapter.html?slug=${encodeURIComponent(c.slug)}">
            Read chapter ↗
          </a>
        </div>

        <button
          type="button"
          class="library-bookmark-btn ${bookmarked ? "bookmarked" : ""}"
          data-bookmark-slug="${esc(c.slug)}"
        >
          ${bookmarked ? "★ Saved" : "☆ Save Chapter"}
        </button>

      </div>
    </article>
  `;
}

// =========================================
// RECENTLY VIEWED CHAPTERS
// =========================================

function renderRecentlyViewed() {
  const key = "sarveshtwr_recent_chapters";

  let recent = [];

  try {
    recent = JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    recent = [];
  }

  let section = document.getElementById("recentlyViewedSection");

  if (!section) {
    section = document.createElement("section");
    section.id = "recentlyViewedSection";
    section.className = "recently-viewed-section";

    grid.parentElement.insertBefore(section, grid);
  }

  if (!recent.length) {
    section.innerHTML = "";
    return;
  }

  const validRecent = recent
    .filter((item) => chapters.some((c) => c.slug === item.slug))
    .slice(0, 10);

  if (!validRecent.length) {
    section.innerHTML = "";
    return;
  }

  section.innerHTML = `
    <div class="recently-viewed-heading">
      <div>
        <h2>Recently Viewed</h2>
        <p>Continue where you left off</p>
      </div>

      <button type="button" id="clearRecentChapters">
        Clear History
      </button>
    </div>

    <div class="recently-viewed-list">
      ${validRecent
        .map((item) => {
          const chapter = chapters.find((c) => c.slug === item.slug);

          return `
          <a class="recently-viewed-item"
             href="chapter.html?slug=${encodeURIComponent(item.slug)}">

            <span class="recently-viewed-icon">📖</span>

            <span class="recently-viewed-info">
              <b>${esc(chapter.title)}</b>
              <small>
                Class ${esc(chapter.className)} ·
                ${esc(chapter.subject)}
              </small>
            </span>

            <span class="recently-viewed-arrow">→</span>

          </a>
        `;
        })
        .join("")}
    </div>
  `;

  document
    .getElementById("clearRecentChapters")
    .addEventListener("click", () => {
      if (!confirm("Clear your recently viewed history?")) return;

      localStorage.removeItem(key);
      renderRecentlyViewed();
      toast("Reading history cleared");
    });
}

// =========================================
// BOOKMARK SECTION UI
// =========================================

function createBookmarkSection() {
  if (document.getElementById("bookmarkLibrary")) return;

  const section = document.createElement("section");

  section.id = "bookmarkLibrary";
  section.className = "bookmark-library";

  section.innerHTML = `
    <div class="bookmark-library-heading">
      <div>
        <h2>My Bookmarks</h2>
        <p>Your saved study chapters</p>
      </div>

      <span id="bookmarkCount" class="bookmark-count">0</span>
    </div>

    <div class="bookmark-library-actions">
      <button type="button" id="showAllChapters">
        All Chapters
      </button>

      <button type="button" id="showBookmarkedChapters">
        ★ My Bookmarks
      </button>
    </div>
  `;

  grid.parentElement.insertBefore(section, grid);

  document.getElementById("showAllChapters").addEventListener("click", () => {
    showingBookmarks = false;
    updateBookmarkTabs();
    render();
  });

  document
    .getElementById("showBookmarkedChapters")
    .addEventListener("click", () => {
      showingBookmarks = true;
      updateBookmarkTabs();
      render();
    });

  updateBookmarkCount();
  updateBookmarkTabs();
}

function updateBookmarkTabs() {
  const allButton = document.getElementById("showAllChapters");
  const savedButton = document.getElementById("showBookmarkedChapters");

  if (!allButton || !savedButton) return;

  allButton.classList.toggle("active", !showingBookmarks);
  savedButton.classList.toggle("active", showingBookmarks);
}

// =========================================
// RENDER CHAPTERS
// =========================================

function render() {
  const q = search.value.toLowerCase().trim();
  const c = cls.value;
  const s = subject.value;

  const bookmarks = getBookmarks();

  let filtered = chapters.filter(
    (x) =>
      (!c || x.className === c) &&
      (!s || x.subject === s) &&
      (!q ||
        [x.title, x.subject, x.description, x.chapterNumber, x.className]
          .join(" ")
          .toLowerCase()
          .includes(q)),
  );

  if (showingBookmarks) {
    filtered = filtered.filter((x) => bookmarks.includes(x.slug));
  }

  grid.innerHTML = filtered.length
    ? filtered.map(card).join("")
    : `
      <div class="empty-state">
        <b>${showingBookmarks ? "No bookmarked chapters yet" : "No chapters found"}</b>
        <span>
          ${
            showingBookmarks
              ? "Open a chapter and click Bookmark Chapter to save it here."
              : "Try a different search or class filter."
          }
        </span>
      </div>
    `;

  document.getElementById("resultCount").textContent =
    `${filtered.length} chapter${filtered.length === 1 ? "" : "s"} ${
      showingBookmarks ? "bookmarked" : "available"
    }`;

  // Bookmark buttons
  grid.querySelectorAll("[data-bookmark-slug]").forEach((button) => {
    button.addEventListener("click", () => {
      const slug = button.dataset.bookmarkSlug;
      let saved = getBookmarks();

      if (saved.includes(slug)) {
        saved = saved.filter((item) => item !== slug);
        toast("Bookmark removed");
      } else {
        saved.push(slug);
        toast("Chapter bookmarked");
      }

      saveBookmarks(saved);
      render();
    });
  });

  updateBookmarkCount();
}

// =========================================
// LOAD CHAPTERS FROM API
// =========================================

async function load() {
  try {
    const r = await fetch(`${API}/api/chapters`);

    if (!r.ok) {
      throw new Error("API returned " + r.status);
    }

    const d = await r.json();
    chapters = d.chapters || [];

    const subjects = [
      ...new Set(chapters.map((x) => x.subject).filter(Boolean)),
    ].sort();

    subject.innerHTML =
      '<option value="">All subjects</option>' +
      subjects
        .map((s) => `<option value="${esc(s)}">${esc(s)}</option>`)
        .join("");

    renderRecentlyViewed();
    createBookmarkSection();
    render();
  } catch (e) {
    grid.innerHTML = `
      <div class="empty-state">
        <b>Study library is getting ready.</b>
        <span>
          Backend is not connected yet. Follow the README setup steps,
          then refresh this page.
        </span>
      </div>
    `;

    document.getElementById("resultCount").textContent = "";
  }
}

// =========================================
// SEARCH AND FILTERS
// =========================================

[search, cls, subject].forEach((x) => {
  x.addEventListener("input", render);
});

document.querySelectorAll("[data-class-link]").forEach((a) => {
  a.addEventListener("click", () => {
    cls.value = a.dataset.classLink;
    render();
  });
});

// =========================================
// MOBILE MENU
// =========================================

const toggle = document.getElementById("menuToggle");
const links = document.getElementById("navLinks");

toggle.addEventListener("click", () => {
  const open = links.classList.toggle("open");

  toggle.setAttribute("aria-expanded", String(open));
  toggle.textContent = open ? "✕" : "☰";
});

links.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => links.classList.remove("open"));
});

// =========================================
// UPDATE ON PAGE RETURN / STORAGE CHANGE
// =========================================

window.addEventListener("storage", (event) => {
  if (event.key === BOOKMARK_KEY) {
    updateBookmarkCount();
    render();
  }
});

window.addEventListener("pageshow", () => {
  if (chapters.length) {
    updateBookmarkCount();
    render();
  }
});

// =========================================
// START APPLICATION
// =========================================

load();
