(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const htmlInput = $("htmlCode"), cssInput = $("cssCode"), jsInput = $("jsCode");
  const frame = $("previewFrame");
  const sample = {
    html: `<!DOCTYPE html>
<html>
<head>
  <title>My First Webpage</title>
</head>
<body>
  <main class="card">
    <h1>Welcome to HTML Lab!</h1>
    <p>I am learning HTML, CSS and JavaScript.</p>
    <button id="helloBtn">Click Me</button>
    <p id="message"></p>
  </main>
</body>
</html>`,
    css: `body {
  font-family: Arial, sans-serif;
  background: #eef4ff;
  min-height: 100vh;
  display: grid;
  place-items: center;
}
.card {
  background: white;
  padding: 32px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 10px 30px #1e3a8a20;
}
h1 { color: #2563eb; }
button {
  border: 0;
  border-radius: 8px;
  padding: 10px 18px;
  background: #2563eb;
  color: white;
  cursor: pointer;
}`,
    js: `document.getElementById("helloBtn").addEventListener("click", () => {
  document.getElementById("message").textContent =
    "Great! Your JavaScript is working.";
});`
  };
  let active = "html";
  let lastRun = "";
  function toast(message) {
    const el = $("labToast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  function getCode() { return { html: htmlInput.value, css: cssInput.value, js: jsInput.value }; }
  function makeDocument() {
    const c = getCode();
    const css = c.css.replace(/<\/style/gi, "<\\/style");
    const js = c.js.replace(/<\/script/gi, "<\\/script");
    let doc = c.html.trim();
    if (!doc) doc = "<!doctype html><html><head></head><body></body></html>";
    if (/<\/head>/i.test(doc)) doc = doc.replace(/<\/head>/i, `<style>${css}</style></head>`);
    else doc = `<style>${css}</style>${doc}`;
    const captureBridge = `window.addEventListener("message", function(event) {
      if (!event.data || event.data.type !== "SARVESHTWR_CAPTURE_OUTPUT") return;
      try {
        window.parent.postMessage({
          type: "SARVESHTWR_OUTPUT_CAPTURED",
          requestId: event.data.requestId,
          html: document.body ? document.body.innerHTML : ""
        }, "*");
      } catch (error) {}
    });`;
    if (/<\/body>/i.test(doc)) doc = doc.replace(/<\/body>/i, `<script>${captureBridge}<\/script><script>${js}<\/script></body>`);
    else doc += `<script>${captureBridge}<\/script><script>${js}<\/script>`;
    return doc;
  }
  function runCode() {
    frame.srcdoc = makeDocument();
    lastRun = makeDocument();
    $("runStatus").textContent = "Preview updated";
    document.querySelector(".preview-status").textContent = "Updated";
  }
  function setTab(name) {
    active = name;
    document.querySelectorAll(".editor-tab").forEach(btn => {
      const on = btn.dataset.editor === name;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", String(on));
    });
    [htmlInput, cssInput, jsInput].forEach(el => el.classList.toggle("active", el.id === name + "Code"));
    $("editorFileName").textContent = name === "js" ? "script.js" : name === "css" ? "style.css" : "index.html";
    updateLineCount();
  }
  function updateLineCount() {
    const count = ({"html":htmlInput,"css":cssInput,"js":jsInput}[active].value.match(/\n/g)||[]).length + 1;
    $("lineCount").textContent = count + (count === 1 ? " line" : " lines");
  }
  function loadSample() {
    htmlInput.value = sample.html; cssInput.value = sample.css; jsInput.value = sample.js;
    setTab("html"); runCode(); toast("Sample program loaded.");
  }
  function clearAll() {
    htmlInput.value = ""; cssInput.value = ""; jsInput.value = "";
    setTab("html"); runCode(); toast("All editors cleared.");
  }
  function safeName(s) { return (s || "html-practice").replace(/[^a-z0-9-_]+/gi,"-").slice(0,40); }
  async function captureElement(el, filename, background="#ffffff") {
    if (!window.html2canvas) { toast("Snapshot library could not load. Check your internet connection."); return; }
    const canvas = await window.html2canvas(el, {backgroundColor:background, scale:2, useCORS:true, logging:false, windowWidth:Math.max(el.scrollWidth, el.clientWidth)});
    const a = document.createElement("a"); a.download = filename; a.href = canvas.toDataURL("image/png"); a.click();
  }
  function makeCodeSnapshotNode() {
    const c = getCode();
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width:1100px;padding:28px;background:#101827;color:#dbeafe;font:15px/1.6 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere";
    const title = document.createElement("div");
    title.textContent = "SARVESHTWR HTML PRACTICE LAB  |  CODE";
    title.style.cssText = "font: bold 18px Arial;color:#93c5fd;padding-bottom:16px;margin-bottom:16px;border-bottom:1px solid #334155";
    wrapper.appendChild(title);
    [["HTML",c.html],["CSS",c.css],["JAVASCRIPT",c.js]].forEach(([label,value]) => {
      const h=document.createElement("div"); h.textContent=label; h.style.cssText="font:bold 14px Arial;color:#67e8f9;margin:14px 0 6px";
      const pre=document.createElement("pre"); pre.textContent=value || "(empty)"; pre.style.cssText="margin:0;padding:12px;background:#1e293b;border-radius:8px;color:#e2e8f0;white-space:pre-wrap;overflow-wrap:anywhere";
      wrapper.append(h,pre);
    });
    return wrapper;
  }
  function selectedSnapshotParts() {
    return {
      html: $("shotHtml").checked,
      css: $("shotCss").checked,
      js: $("shotJs").checked,
      output: $("shotOutput").checked
    };
  }

  function updateSnapshotSelection() {
    const parts = selectedSnapshotParts();
    const count = Object.values(parts).filter(Boolean).length;
    $("snapshotSelectionCount").textContent = count + (count === 1 ? " item selected" : " items selected");
    const labels = [];
    if (parts.html) labels.push("HTML Code");
    if (parts.css) labels.push("CSS Code");
    if (parts.js) labels.push("JavaScript Code");
    if (parts.output) labels.push("Output");
    const names = $("snapshotSelectedNames");
    if (names) names.textContent = labels.length ? labels.join(" + ") : "Nothing selected";
    $("downloadSelectedBtn").disabled = count === 0;
  }

  async function requestPreviewHtml() {
    if (!frame.contentWindow) throw new Error("Preview is not ready");
    const requestId = "select-" + Date.now() + "-" + Math.random().toString(16).slice(2);
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error("Preview capture timed out"));
      }, 5000);
      function onMessage(event) {
        if (event.source !== frame.contentWindow) return;
        const data = event.data;
        if (!data || data.type !== "SARVESHTWR_OUTPUT_CAPTURED" || data.requestId !== requestId) return;
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
        resolve(data.html || "");
      }
      window.addEventListener("message", onMessage);
      frame.contentWindow.postMessage({ type: "SARVESHTWR_CAPTURE_OUTPUT", requestId }, "*");
    });
  }

  async function downloadSelectedSnapshot() {
    const parts = selectedSnapshotParts();
    if (!Object.values(parts).some(Boolean)) {
      toast("Please select at least one item.");
      return;
    }

    let root;
    try {
      let outputHtml = "";
      if (parts.output) outputHtml = await requestPreviewHtml();

      const c = getCode();
      root = document.createElement("div");
      root.style.cssText = "width:1400px;padding:30px;background:#f1f5f9;font-family:Arial,sans-serif;color:#17243a";
      const heading = document.createElement("h1");
      heading.textContent = "SARVESHTWR · HTML PRACTICE LAB";
      heading.style.cssText = "margin:0 0 20px;font-size:26px";
      root.appendChild(heading);

      const grid = document.createElement("div");
      grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start";

      function addCodePanel(labelText, value, color) {
        const panel = document.createElement("section");
        panel.style.cssText = "min-width:0;padding:18px;border-radius:12px;background:#101827;color:#e2e8f0;white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.55 Consolas,monospace";
        const label = document.createElement("b");
        label.textContent = labelText;
        label.style.cssText = "display:block;margin-bottom:10px;color:" + color + ";font:bold 14px Arial";
        const pre = document.createElement("div");
        pre.textContent = value || "(empty)";
        panel.append(label, pre);
        grid.appendChild(panel);
      }

      if (parts.html) addCodePanel("HTML CODE", c.html, "#93c5fd");
      if (parts.css) addCodePanel("CSS CODE", c.css, "#fdba74");
      if (parts.js) addCodePanel("JAVASCRIPT CODE", c.js, "#fde68a");

      if (parts.output) {
        const panel = document.createElement("section");
        panel.style.cssText = "min-width:0;min-height:350px;padding:18px;border:1px solid #dbe2ea;border-radius:12px;background:#fff;overflow:hidden";
        const label = document.createElement("b");
        label.textContent = "LIVE OUTPUT";
        label.style.cssText = "display:block;margin-bottom:12px;color:#16804c;font:bold 14px Arial";
        panel.appendChild(label);

        const style = document.createElement("style");
        style.textContent = cssInput.value;
        panel.appendChild(style);

        const content = document.createElement("div");
        content.innerHTML = outputHtml;
        content.querySelectorAll("script").forEach(script => script.remove());
        content.querySelectorAll("*").forEach(el => {
          [...el.attributes].forEach(attr => {
            if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
          });
        });
        panel.appendChild(content);
        grid.appendChild(panel);
      }

      root.appendChild(grid);
      document.body.appendChild(root);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await captureElement(root, "sarveshtwr-selected-snapshot.png", "#f1f5f9");
      toast("Selected snapshot downloaded.");
    } catch (e) {
      console.error("Selected snapshot error:", e);
      toast(parts.output
        ? "Output is not ready. Click Run Code, wait for preview, then retry."
        : "Snapshot could not be created. Please retry.");
    } finally {
      if (root && root.parentNode) root.remove();
    }
  }

  document.querySelectorAll(".editor-tab").forEach(btn=>btn.addEventListener("click",()=>setTab(btn.dataset.editor)));
  [htmlInput,cssInput,jsInput].forEach(el=>el.addEventListener("input",updateLineCount));
  // Make the Tab key insert indentation inside code editors instead of
  // moving keyboard focus to the next page control.
  [htmlInput, cssInput, jsInput].forEach(editor => {
    editor.addEventListener("keydown", event => {
      if (event.key !== "Tab") return;
      event.preventDefault();

      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const indent = "  "; // two-space indentation

      if (start === end) {
        editor.setRangeText(indent, start, end, "end");
      } else {
        const selectedText = editor.value.slice(start, end);
        const indentedText = selectedText
          .split("\\n")
          .map(line => indent + line)
          .join("\\n");
        editor.setRangeText(indentedText, start, end, "select");
        editor.selectionStart = start;
        editor.selectionEnd = start + indentedText.length;
      }

      updateLineCount();
    });

    // Shift + Tab removes one indentation level from selected lines.
    editor.addEventListener("keydown", event => {
      if (event.key !== "Tab" || !event.shiftKey) return;
      event.preventDefault();

      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const lineStart = editor.value.lastIndexOf("\\n", start - 1) + 1;
      const selectedEnd = editor.value.indexOf("\\n", end);
      const lineEnd = selectedEnd === -1 ? editor.value.length : selectedEnd;
      const block = editor.value.slice(lineStart, lineEnd);
      const dedented = block.replace(/^(?: {1,2}|\\t)/gm, "");
      editor.setRangeText(dedented, lineStart, lineEnd, "select");
      editor.selectionStart = lineStart;
      editor.selectionEnd = lineStart + dedented.length;
      updateLineCount();
    });
  });

  $("runBtn").addEventListener("click",runCode);
  $("resetBtn").addEventListener("click",loadSample);
  $("sampleBtn").addEventListener("click",loadSample);
  $("clearBtn").addEventListener("click",clearAll);
  $("reminderClearBtn").addEventListener("click", clearAll);
  $("fullscreenBtn").addEventListener("click",async()=>{
    const panel=$("outputPanel");
    try { if(!document.fullscreenElement) await panel.requestFullscreen(); else await document.exitFullscreen(); }
    catch(e){toast("Full screen is not supported in this browser.");}
  });
  ["shotHtml","shotCss","shotJs","shotOutput"].forEach(id => $(id).addEventListener("change", updateSnapshotSelection));
  $("downloadSelectedBtn").addEventListener("click", downloadSelectedSnapshot);
  const menu=$("menuToggle"), nav=$("navLinks");
  if(menu && nav) menu.addEventListener("click",()=>{const open=nav.classList.toggle("open");menu.setAttribute("aria-expanded",String(open));});
  $("year").textContent=new Date().getFullYear();
  updateSnapshotSelection();
  loadSample();
})();
