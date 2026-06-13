import { clearOutput, runAnimation, stopAnimation } from "./sandbox";
import { SNIPPETS } from "./snippets.const";



/**
 * @description
 * Bootstrap the sandbox UI — wire up buttons and populate the snippet list
 */
function boot(): void {
  const editor = document.getElementById("editor") as HTMLTextAreaElement;
  const btnRun = document.getElementById("btn-run") as HTMLButtonElement;
  const btnStop = document.getElementById("btn-stop") as HTMLButtonElement;
  const btnClear = document.getElementById("btn-clear") as HTMLButtonElement;
  const snippetList = document.getElementById("snippet-list") as HTMLDivElement;

  // Populate snippet buttons
  for (const snippet of SNIPPETS) {
    const btn = document.createElement("button");

    btn.className = "snippet-btn";
    btn.textContent = snippet.label;

    btn.addEventListener("click", () => {
      editor.value = snippet.text;
    });

    snippetList.appendChild(btn);
  }

  // Run button
  btnRun.addEventListener("click", () => {
    void runAnimation(editor.value);
  });

  // Stop button
  btnStop.addEventListener("click", () => {
    stopAnimation();
  });

  // Clear button
  btnClear.addEventListener("click", () => {
    stopAnimation();
    clearOutput();
    editor.value = "";
  });

  // Keyboard shortcut: Ctrl/Cmd + Enter to run
  editor.addEventListener("keydown", (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void runAnimation(editor.value);
    }
  });
}

boot();
