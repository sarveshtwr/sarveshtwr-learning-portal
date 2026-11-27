(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const editor = $("pythonCode"), output = $("pythonOutput");
  let pyodide = null, loading = null, busy = false;
  const examples = {
    hello: `print("Hello, World!")\nprint("Welcome to Python programming!")`,
    variables: `name = input("Enter your name: ")\nage = int(input("Enter your age: "))\nprint("Name:", name)\nprint("Age:", age)\nprint("Next year, you will be", age + 1)`,
    calculator: `a = float(input("Enter first number: "))\nb = float(input("Enter second number: "))\nprint("Addition:", a + b)\nprint("Subtraction:", a - b)\nprint("Multiplication:", a * b)\nif b != 0:\n    print("Division:", a / b)\nelse:\n    print("Cannot divide by zero.")`,
    ifelse: `number = int(input("Enter a number: "))\nif number % 2 == 0:\n    print(number, "is even")\nelse:\n    print(number, "is odd")`,
    loop: `number = int(input("Enter a number: "))\nprint("Multiplication table of", number)\nfor i in range(1, 11):\n    print(number, "x", i, "=", number * i)`,
    function: `def greet(name):\n    return "Hello, " + name + "!"\n\nstudent = input("Enter student name: ")\nprint(greet(student))`,
    list: `fruits = ["Apple", "Banana", "Mango", "Orange"]\nprint("Fruit list:")\nfor fruit in fruits:\n    print("-", fruit)\nprint("Total fruits:", len(fruits))`,
    string: `text = input("Enter a sentence: ")\nprint("Uppercase:", text.upper())\nprint("Lowercase:", text.lower())\nprint("Characters:", len(text))\nprint("Words:", len(text.split()))`
  };
  function toast(message) {
    const el = $("pythonToast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  function setStatus(text) { $("runtimeStatus").textContent = text; }
  function updateLines() {
    const n = (editor.value.match(/\n/g) || []).length + 1;
    $("lineCount").textContent = n + (n === 1 ? " line" : " lines");
  }
  function writeOutput(text, cls) {
    const span = document.createElement("span");
    if (cls) span.className = cls;
    span.textContent = text;
    output.appendChild(span);
    output.scrollTop = output.scrollHeight;
  }
  function clearOutput() {
    output.replaceChildren();
    $("executionStatus").textContent = "Ready";
    $("executionTime").textContent = "—";
  }
  async function loadRuntime() {
    if (pyodide) return pyodide;
    if (loading) return loading;
    loading = (async () => {
      setStatus("Downloading Python runtime…");
      try {
        if (typeof loadPyodide !== "function") throw new Error("Pyodide could not be loaded. Check your internet connection.");
        pyodide = await loadPyodide({
          stdout: text => writeOutput(text + "\n"),
          stderr: text => writeOutput(text + "\n", "output-error"),
          stdin: () => {
            const answer = window.prompt("Python input() is waiting. Enter a value:");
            return answer === null ? "" : answer;
          }
        });
        $("runBtn").disabled = false;
        setStatus("Python 3 runtime ready");
        $("executionStatus").textContent = "Ready";
        return pyodide;
      } catch (err) {
        loading = null; setStatus("Runtime failed to load"); throw err;
      }
    })();
    return loading;
  }
  async function runPython() {
    if (busy) return;
    busy = true; $("runBtn").disabled = true; clearOutput();
    const started = performance.now();
    $("executionStatus").textContent = "Running";
    try {
      const runtime = await loadRuntime();
      await runtime.runPythonAsync(editor.value);
      if (!output.textContent) writeOutput("(Program executed successfully. No output.)\n");
      $("executionStatus").textContent = "Completed";
      $("executionTime").textContent = Math.round(performance.now() - started) + " ms";
    } catch (err) {
      writeOutput(String(err), "output-error");
      $("executionStatus").textContent = "Error";
      $("executionTime").textContent = Math.round(performance.now() - started) + " ms";
    } finally {
      busy = false; $("runBtn").disabled = !pyodide;
    }
  }
  function clearAll() {
    editor.value = ""; updateLines(); clearOutput();
    writeOutput("Workspace cleared. Write a new Python program and click Run Python.\n", "console-welcome");
    toast("Python editor and output cleared.");
  }
  function loadExample(name) {
    editor.value = examples[name] || examples.hello; updateLines();
    $("examplesPanel").hidden = true; clearOutput();
    writeOutput("Example loaded. Click Run Python to execute it.\n", "console-welcome");
    toast("Practice example loaded.");
  }
  function selectedParts() { return { code: $("shotCode").checked, output: $("shotOutput").checked }; }
  function updateSnapshot() {
    const p = selectedParts(), labels = [];
    if (p.code) labels.push("Python Code");
    if (p.output) labels.push("Output");
    $("snapshotSelectedNames").textContent = "Selected: " + (labels.join(" + ") || "Nothing");
    $("snapshotSelectionCount").textContent = labels.length + (labels.length === 1 ? " item selected" : " items selected") + " · Combined into one image";
    $("downloadSnapshotBtn").disabled = !labels.length;
  }
  async function downloadSnapshot() {
    const p = selectedParts();
    if (!p.code && !p.output) return toast("Select at least one section.");
    if (!window.html2canvas) return toast("Snapshot tool unavailable. Check your internet connection.");
    const root = document.createElement("div");
    root.style.cssText = "position:fixed;left:-10000px;top:0;width:1100px;padding:30px;background:#f1f6ff;color:#17243a;font-family:Arial,sans-serif;z-index:-1";
    const title = document.createElement("h1");
    title.textContent = "SARVESHTWR · PYTHON PRACTICE LAB";
    title.style.cssText = "margin:0 0 20px;color:#145fc2;font-size:25px";
    root.appendChild(title);
    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start";
    function panel(label, value, bg, color) {
      const box = document.createElement("section");
      box.style.cssText = "min-width:0;padding:18px;border:1px solid #d9e5f5;border-radius:12px;background:"+bg+";color:"+color;
      const h = document.createElement("b"); h.textContent = label; h.style.cssText = "display:block;margin-bottom:12px;font-size:14px";
      const pre = document.createElement("pre"); pre.textContent = value || "(empty)"; pre.style.cssText = "margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.6 Consolas,monospace";
      box.append(h, pre); grid.appendChild(box);
    }
    if (p.code) panel("PYTHON CODE", editor.value, "#ffffff", "#17365f");
    if (p.output) panel("PROGRAM OUTPUT", output.textContent || "(No output yet. Run your program first.)", "#ffffff", "#17365f");
    root.appendChild(grid); document.body.appendChild(root);
    try {
      const canvas = await html2canvas(root, {backgroundColor:"#f1f6ff",scale:2,logging:false});
      const a = document.createElement("a"); a.download = "sarveshtwr-python-snapshot.png"; a.href = canvas.toDataURL("image/png"); a.click();
      toast("Snapshot downloaded.");
    } catch (e) { toast("Could not create snapshot. Please try again."); }
    finally { root.remove(); }
  }
  editor.addEventListener("input", updateLines);
  editor.addEventListener("keydown", event => {
    if (event.key === "Tab") {
      event.preventDefault();
      const start = editor.selectionStart, end = editor.selectionEnd, value = editor.value;
      if (event.shiftKey) {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        if (value.slice(lineStart, lineStart + 4) === "    ") {
          editor.value = value.slice(0, lineStart) + value.slice(lineStart + 4);
          editor.selectionStart = editor.selectionEnd = Math.max(lineStart, start - 4);
        }
      } else {
        editor.value = value.slice(0, start) + "    " + value.slice(end);
        editor.selectionStart = editor.selectionEnd = start + 4;
      }
      updateLines();
    }
    if (event.ctrlKey && event.key === "Enter") runPython();
  });
  $("runBtn").addEventListener("click", runPython);
  $("clearBtn").addEventListener("click", clearAll);
  $("reminderClearBtn").addEventListener("click", clearAll);
  $("clearOutputBtn").addEventListener("click", clearOutput);
  $("resetBtn").addEventListener("click", () => loadExample("hello"));
  $("examplesBtn").addEventListener("click", () => { $("examplesPanel").hidden = !$("examplesPanel").hidden; });
  $("closeExamplesBtn").addEventListener("click", () => $("examplesPanel").hidden = true);
  document.querySelectorAll("[data-example]").forEach(btn => btn.addEventListener("click", () => loadExample(btn.dataset.example)));
  $("shotCode").addEventListener("change", updateSnapshot);
  $("shotOutput").addEventListener("change", updateSnapshot);
  $("downloadSnapshotBtn").addEventListener("click", downloadSnapshot);
  $("year").textContent = new Date().getFullYear();
  updateLines(); updateSnapshot();
  // Preload runtime after the page becomes interactive; the Run button stays disabled until ready.
  loadRuntime().catch(err => { writeOutput(err.message + "\n", "output-error"); toast("Python runtime could not load."); });
  // Match the existing portal mobile navigation behaviour.
  const menu = $("menuToggle"), nav = $("navLinks");
  if (menu && nav) menu.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  });
})();