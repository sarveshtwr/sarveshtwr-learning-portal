const API = window.PORTAL_CONFIG.API_BASE_URL.replace(/\/$/, "");
const $ = (id) => document.getElementById(id);

let token = sessionStorage.getItem("portal_admin_token") || "";
let items = [];

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

function toast(t) {
  $("toast").textContent = t;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2600);
}

function msg(id, t, error = false) {
  $(id).textContent = t;
  $(id).className = "form-message " + (error ? "error" : "success");
}

async function request(path, opts = {}) {
  const r = await fetch(API + path, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const d = await r.json().catch(() => ({
    message: "Unexpected server response",
  }));

  if (!r.ok) throw new Error(d.message || "Request failed");
  return d;
}

function showDashboard() {
  $("loginPanel").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");
  loadItems();
}

function showLogin() {
  $("dashboard").classList.add("hidden");
  $("loginPanel").classList.remove("hidden");
  $("logoutBtn").classList.add("hidden");
}

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  msg("loginMessage", "Signing in…");

  try {
    const d = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: $("email").value.trim(),
        password: $("password").value,
      }),
    });

    token = d.token;
    sessionStorage.setItem("portal_admin_token", token);
    showDashboard();
  } catch (err) {
    msg("loginMessage", err.message, true);
  }
});

$("logoutBtn").addEventListener("click", () => {
  token = "";
  sessionStorage.removeItem("portal_admin_token");
  showLogin();
});

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

$("title").addEventListener("input", () => {
  if (!$("chapterId").value) {
    $("slug").value = slugify($("title").value);
  }
});

$("newChapterBtn").addEventListener("click", clearForm);
$("cancelBtn").addEventListener("click", clearForm);

function clearForm() {
  $("chapterForm").reset();
  $("chapterId").value = "";
  $("contentEditor").innerHTML = "";
  $("editorHeading").textContent = "Create a chapter";
  $("saveBtn").textContent = "Publish chapter →";
  msg("saveMessage", "");
  clearSelectedImage();
}

async function loadItems() {
  try {
    const d = await request("/api/chapters");
    items = d.chapters || [];
    $("chapterCount").textContent = items.length;

    $("adminChapterList").innerHTML = items.length
      ? items
          .map(
            (c) => `
          <div class="admin-item">
            <div>
              <b>${esc(c.title)}</b>
              <small>Class ${esc(c.className)} · ${esc(c.subject)}</small>
            </div>
            <div class="item-actions">
              <button data-edit="${c._id}">Edit</button>
              <button data-del="${c._id}" class="delete-action">Delete</button>
            </div>
          </div>
        `,
          )
          .join("")
      : '<p class="muted">No chapters yet. Create your first chapter.</p>';

    document.querySelectorAll("[data-edit]").forEach((b) => {
      b.addEventListener("click", () => editItem(b.dataset.edit));
    });

    document.querySelectorAll("[data-del]").forEach((b) => {
      b.addEventListener("click", () => deleteItem(b.dataset.del));
    });
  } catch (e) {
    $("adminChapterList").innerHTML =
      `<p class="form-message error">${esc(e.message)}</p>`;
  }
}

async function editItem(id) {
  const c = items.find((x) => x._id === id);
  if (!c) return;

  try {
    toast("Loading chapter...");
    const d = await request(`/api/chapters/${encodeURIComponent(c.slug)}`);
    const chapter = d.chapter;

    if (!chapter) throw new Error("Chapter content not found.");

    $("chapterId").value = chapter._id;
    $("title").value = chapter.title || "";
    $("slug").value = chapter.slug || "";
    $("className").value = chapter.className || "";
    $("subject").value = chapter.subject || "";
    $("chapterNumber").value = chapter.chapterNumber || "";
    $("coverImage").value = chapter.coverImage || "";
    $("description").value = chapter.description || "";
    $("contentEditor").innerHTML = chapter.contentHtml || "";

    $("editorHeading").textContent = "Edit chapter";
    $("saveBtn").textContent = "Save changes →";
    clearSelectedImage();

    $("chapterForm").scrollIntoView({ behavior: "smooth" });
    msg("saveMessage", "Chapter loaded successfully.");
  } catch (err) {
    toast(err.message);
  }
}

async function deleteItem(id) {
  const c = items.find((x) => x._id === id);
  if (!c || !confirm(`Delete "${c.title}" permanently?`)) return;

  try {
    await request(`/api/chapters/${id}`, { method: "DELETE" });
    toast("Chapter deleted");
    loadItems();
  } catch (e) {
    toast(e.message);
  }
}

// SAVE CHAPTER
$("chapterForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = $("saveBtn");
  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    const contentHtml = $("contentEditor").innerHTML.trim();
    if (!contentHtml) throw new Error("Please write the chapter content.");

    const payload = {
      title: $("title").value.trim(),
      slug: $("slug").value.trim() || slugify($("title").value),
      className: $("className").value,
      subject: $("subject").value.trim(),
      chapterNumber: $("chapterNumber").value.trim(),
      coverImage: $("coverImage").value.trim(),
      description: $("description").value.trim(),
      contentHtml,
    };

    const id = $("chapterId").value;

    await request(id ? `/api/chapters/${id}` : "/api/chapters", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    msg(
      "saveMessage",
      id ? "Chapter updated successfully." : "Chapter published successfully.",
    );

    toast("Your chapter has been saved.");
    clearForm();
    loadItems();
  } catch (err) {
    msg("saveMessage", err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = $("chapterId").value
      ? "Save changes →"
      : "Publish chapter →";
  }
});

// EDITOR
const editor = $("contentEditor");

function runCommand(command, value = null) {
  editor.focus();
  document.execCommand(command, false, value);
}

document.querySelectorAll("[data-command]").forEach((b) => {
  b.addEventListener("click", () => runCommand(b.dataset.command));
});

document.querySelectorAll("[data-block]").forEach((b) => {
  b.addEventListener("click", () => {
    runCommand("formatBlock", b.dataset.block);
  });
});

// LINK
$("linkBtn").addEventListener("click", () => {
  const url = prompt("Enter link URL (https://…)");

  if (url && /^https:\/\/|^mailto:/i.test(url)) {
    runCommand("createLink", url);
  } else if (url) {
    toast("Use a secure https:// link.");
  }
});

// IMAGE INSERT
$("imageBtn").addEventListener("click", () => {
  const url = prompt("Enter image URL (https://… or assets/your-image.webp)");
  if (!url) return;

  if (!/^(https:\/\/|assets\/)/i.test(url)) {
    toast("Use https:// or a local assets/ path.");
    return;
  }

  const html = `
    <figure>
      <img src="${esc(url)}" alt="Chapter illustration" style="width:100%;max-width:100%;height:auto">
      <figcaption>Illustration</figcaption>
    </figure>
    <p><br></p>
  `;

  runCommand("insertHTML", html);
});

// TABLE
$("tableBtn").addEventListener("click", () => {
  const html = `
    <table>
      <thead>
        <tr><th>Heading 1</th><th>Heading 2</th></tr>
      </thead>
      <tbody>
        <tr><td>Content</td><td>Content</td></tr>
        <tr><td>Content</td><td>Content</td></tr>
      </tbody>
    </table>
    <p><br></p>
  `;
  runCommand("insertHTML", html);
});

// QUOTE
$("quoteBtn").addEventListener("click", () => {
  runCommand("formatBlock", "blockquote");
});

// IMAGE SELECTION
let selectedEditorImage = null;

function clearSelectedImage() {
  if (selectedEditorImage) {
    selectedEditorImage.classList.remove("selected-editor-image");
  }
  selectedEditorImage = null;
}


// =========================================
// DRAG IMAGE RESIZE HANDLE
// =========================================

const imageResizeHandle = document.createElement("div");

imageResizeHandle.id = "imageResizeHandle";
imageResizeHandle.title = "Drag to resize image";

Object.assign(imageResizeHandle.style, {
  position: "fixed",
  width: "16px",
  height: "16px",
  background: "#2563eb",
  border: "2px solid white",
  borderRadius: "4px",
  zIndex: "99999",
  cursor: "nwse-resize",
  display: "none",
  boxShadow: "0 1px 5px rgba(0,0,0,.3)"
});

document.body.appendChild(imageResizeHandle);

function updateImageResizeHandle() {
  if (!selectedEditorImage || !editor.contains(selectedEditorImage)) {
    imageResizeHandle.style.display = "none";
    return;
  }

  const rect = selectedEditorImage.getBoundingClientRect();

  imageResizeHandle.style.display = "block";
  imageResizeHandle.style.left = `${rect.right - 8}px`;
  imageResizeHandle.style.top = `${rect.bottom - 8}px`;
}

editor.addEventListener("click", () => {
  requestAnimationFrame(updateImageResizeHandle);
});

window.addEventListener("scroll", updateImageResizeHandle, true);
window.addEventListener("resize", updateImageResizeHandle);

imageResizeHandle.addEventListener("pointerdown", event => {
  if (!selectedEditorImage) return;

  event.preventDefault();
  event.stopPropagation();

  const img = selectedEditorImage;
  const startX = event.clientX;
  const startWidth = img.getBoundingClientRect().width;
  const maxWidth = img.parentElement.getBoundingClientRect().width;

  imageResizeHandle.setPointerCapture(event.pointerId);

  function onMove(moveEvent) {
    const newWidth = Math.max(
      50,
      Math.min(maxWidth, startWidth + moveEvent.clientX - startX)
    );

    img.style.width = `${Math.round(newWidth)}px`;
    img.style.maxWidth = "100%";
    img.style.height = "auto";

    updateImageResizeHandle();
  }

  function onUp() {
    imageResizeHandle.removeEventListener("pointermove", onMove);
    imageResizeHandle.removeEventListener("pointerup", onUp);
    imageResizeHandle.removeEventListener("pointercancel", onUp);

    updateImageResizeHandle();
    toast("Image resized. Save the chapter to keep changes.");
  }

  imageResizeHandle.addEventListener("pointermove", onMove);
  imageResizeHandle.addEventListener("pointerup", onUp);
  imageResizeHandle.addEventListener("pointercancel", onUp);
});


// ADD ADVANCED TOOLBAR
function addAdvancedToolbar() {
  const toolbar = document.querySelector(".toolbar");
  if (!toolbar || document.getElementById("advancedToolbar")) return;

  const wrapper = document.createElement("div");
  wrapper.id = "advancedToolbar";
  wrapper.className = "advanced-toolbar";

  wrapper.innerHTML = `
    <span class="toolbar-divider">EDUCATIONAL BLOCKS</span>
    <button type="button" data-insert="definition">Definition</button>
    <button type="button" data-insert="note">Important Note</button>
    <button type="button" data-insert="example">Example</button>
    <button type="button" data-insert="question">Q & A</button>
    <button type="button" data-insert="assignment">Assignment</button>
    <button type="button" data-insert="activity">Activity</button>

    <span class="toolbar-divider">TEXT FORMATTING</span>
    <button type="button" data-action="textColor">Text Color</button>
    <button type="button" data-action="highlight">Highlight</button>

    <span class="toolbar-divider">IMAGE CONTROLS</span>
    <button type="button" data-image-action="25">25%</button>
    <button type="button" data-image-action="50">50%</button>
    <button type="button" data-image-action="75">75%</button>
    <button type="button" data-image-action="100">100%</button>
    <button type="button" data-image-action="left">Left</button>
    <button type="button" data-image-action="center">Center</button>
    <button type="button" data-image-action="right">Right</button>
    <button type="button" data-image-action="caption">Caption</button>

    <span class="toolbar-divider">EDITING</span>
    <button type="button" data-action="undo">↶ Undo</button>
    <button type="button" data-action="redo">↷ Redo</button>
    <button type="button" data-action="removeFormat">Clear Format</button>
    <button type="button" data-action="hr">Horizontal Line</button>
    <button type="button" data-action="h4">H4</button>
  `;

  toolbar.insertAdjacentElement("afterend", wrapper);

  const blocks = {
    definition: `
      <div class="definition-block">
        <h3>Definition</h3>
        <p>Write the definition here.</p>
      </div><p><br></p>
    `,
    note: `
      <blockquote class="important-note">
        <h3>Important Note</h3>
        <p>Write the important information here.</p>
      </blockquote><p><br></p>
    `,
    example: `
      <div class="example-block">
        <h3>Example</h3>
        <p>Write an example here.</p>
      </div><p><br></p>
    `,
    question: `
      <div class="question-block">
        <h3>Important Question</h3>
        <p><strong>Q.</strong> Write your question here.</p>
        <p><strong>Answer:</strong> Write the answer here.</p>
      </div><p><br></p>
    `,
    assignment: `
      <div class="assignment-block">
        <h3>Assignment</h3>
        <ol>
          <li>Write question one.</li>
          <li>Write question two.</li>
          <li>Write question three.</li>
        </ol>
      </div><p><br></p>
    `,
    activity: `
      <div class="activity-block">
        <h3>Class Activity</h3>
        <p>Activity instructions:</p>
        <ol><li>Write the first step.</li></ol>
      </div><p><br></p>
    `,
  };

  wrapper.querySelectorAll("[data-insert]").forEach((button) => {
    button.addEventListener("click", () => {
      editor.focus();
      document.execCommand("insertHTML", false, blocks[button.dataset.insert]);
    });
  });

  // Text formatting and editing actions
  wrapper.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("mousedown", (e) => e.preventDefault());
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      editor.focus();

      if (action === "h4") {
        document.execCommand("formatBlock", false, "h4");
      } else if (action === "hr") {
        document.execCommand("insertHorizontalRule", false, null);
      } else if (action === "textColor") {
        const color = prompt("Enter text color HEX code (example: #2563eb)");
        if (color && /^#[0-9a-fA-F]{6}$/.test(color)) {
          document.execCommand("foreColor", false, color);
        } else if (color) {
          toast("Please enter a valid HEX color.");
        }
      } else if (action === "highlight") {
        const color = prompt("Enter highlight HEX code (example: #fff59d)");
        if (color && /^#[0-9a-fA-F]{6}$/.test(color)) {
          document.execCommand("hiliteColor", false, color);
        } else if (color) {
          toast("Please enter a valid HEX color.");
        }
      } else {
        document.execCommand(action, false, null);
      }
    });
  });

  // Image toolbar actions
  wrapper.querySelectorAll("[data-image-action]").forEach((button) => {
    button.addEventListener("mousedown", (e) => e.preventDefault());

    button.addEventListener("click", () => {
      if (!selectedEditorImage || !editor.contains(selectedEditorImage)) {
        toast("First select an image inside the editor.");
        return;
      }

      const img = selectedEditorImage;
      const action = button.dataset.imageAction;

      if (["25", "50", "75", "100"].includes(action)) {
        img.style.width = action + "%";
        img.style.maxWidth = "100%";
        img.style.height = "auto";
      }

      if (["left", "center", "right"].includes(action)) {
        img.style.display = "block";
        img.style.marginLeft = action === "left" ? "0" : "auto";
        img.style.marginRight = action === "right" ? "0" : "auto";
      }

      if (action === "caption") {
        let figure = img.closest("figure");

        if (!figure) {
          figure = document.createElement("figure");
          img.parentNode.insertBefore(figure, img);
          figure.appendChild(img);
        }

        let caption = figure.querySelector("figcaption");
        if (!caption) {
          caption = document.createElement("figcaption");
          figure.appendChild(caption);
        }

        const value = prompt("Enter image caption:", caption.textContent);
        if (value !== null) caption.textContent = value;
      }

      toast("Image updated successfully.");
    });
  });
}

addAdvancedToolbar();

// PREVIEW
$("previewBtn").addEventListener("click", () => {
  $("previewBody").innerHTML =
    editor.innerHTML || "<p>Nothing to preview yet.</p>";
  $("previewModal").classList.remove("hidden");
});

$("closePreview").addEventListener("click", () => {
  $("previewModal").classList.add("hidden");
});

$("previewModal").addEventListener("click", (e) => {
  if (e.target === $("previewModal")) {
    $("previewModal").classList.add("hidden");
  }
});

// AUTH CHECK
(async () => {
  if (!token) {
    showLogin();
    return;
  }

  try {
    await request("/api/auth/me");
    showDashboard();
  } catch (e) {
    token = "";
    sessionStorage.removeItem("portal_admin_token");
    showLogin();
  }
})();
