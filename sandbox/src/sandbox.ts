import type { Completion, CompletionContext } from "@codemirror/autocomplete";
import type { TTypewriter } from "@eo-typewriterjs";
import type { TSandboxCategory } from "./sandbox-recipes.const";
import type { TRendererKind } from "./sandbox-runner.helper";

import { autocompletion, completeFromList } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EPlaybackStatus } from "@eo-typewriterjs";
import { basicSetup, EditorView } from "codemirror";

import { SANDBOX_RECIPES } from "./sandbox-recipes.const";

import { createSandboxRenderer, ERendererKind, runUserCode } from "./sandbox-runner.helper";



// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

function $<T extends HTMLElement = HTMLElement>(sel: string): T {
  return document.querySelector<T>(sel)!;
}

const elRendererSelect = $<HTMLSelectElement>("#renderer-select");
const elPreviewDom = $("#preview-dom");
const elPreviewString = $("#preview-string");
const elStatusBadge = $("#status-badge");
const elRunBtn = $("#run-btn");
const elPlayBtn = $("#play-btn");
const elPauseBtn = $("#pause-btn");
const elStopBtn = $("#stop-btn");
const elReplayBtn = $("#replay-btn");
const elStepFwdBtn = $("#step-fwd-btn");
const elStepBwdBtn = $("#step-bwd-btn");
const elRateSlider = $<HTMLInputElement>("#rate-slider");
const elRateValue = $("#rate-value");
const elErrorPanel = $("#error-panel");
const elErrorMsg = $("#error-msg");
const elCopyBtn = $("#copy-btn");
const elSearchInput = $<HTMLInputElement>("#recipe-search");
const elRecipeList = $("#recipe-list");
const elEditorContainer = $("#editor-container");
const elPkgVersion = $("#pkg-version");
const elRepoLink = $<HTMLAnchorElement>("#repo-link");

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let activeRendererKind: TRendererKind = ERendererKind.DOM;
let activeTw: TTypewriter | null = null;
let activeCategory: TSandboxCategory = "all";
let rafId: number | null = null;

// ---------------------------------------------------------------------------
// Sandbox globals for autocomplete
// ---------------------------------------------------------------------------

const SANDBOX_GLOBALS: Completion[] = [
  {
    label: "createTypewriter",
    type: "function",
    detail: "(opts: { renderer }) => TTypewriter",
    info: "Create a typewriter instance with the given renderer.",
  },
  {
    label: "renderer",
    type: "variable",
    detail: "IRenderer",
    info: "The currently selected sandbox renderer (DOM or String).",
  },
  {
    label: "domRenderer",
    type: "function",
    detail: "(target: HTMLElement) => IRenderer",
    info: "Create a DOM renderer targeting an HTML element.",
  },
  {
    label: "StringRenderer",
    type: "class",
    detail: "class StringRenderer",
    info: "Headless renderer that outputs a plain-text string.",
  },
  {
    label: "TimelineBuilder",
    type: "class",
    detail: "class TimelineBuilder",
    info: "Fluent builder for constructing command timelines.",
  },
  {
    label: "ECommandKind",
    type: "constant",
    detail: "enum-like object",
    info: "Enum-like object containing all command kind values.",
  },
  {
    label: "EPlaybackStatus",
    type: "constant",
    detail: "enum-like object",
    info: "Enum-like object containing all playback status values.",
  },
];

/**
 * @description
 * CodeMirror completion source for sandbox-injected globals
 *
 * @param context - The completion context
 * @returns A CompletionResult matching the sandbox globals, or null
 */
function sandboxCompletionSource(context: CompletionContext) {
  return completeFromList(SANDBOX_GLOBALS)(context);
}

// ---------------------------------------------------------------------------
// CodeMirror editor setup
// ---------------------------------------------------------------------------

const initialRecipe = SANDBOX_RECIPES[0];

const editorView = new EditorView({
  state: EditorState.create({
    doc: initialRecipe.code,
    extensions: [
      basicSetup,
      javascript(),
      oneDark,
      autocompletion({ override: [sandboxCompletionSource] }),
      EditorView.theme({
        "&": {
          height: "100%",
          fontSize: "13px",
          fontFamily: "\"Noto Sans Mono\", \"JetBrains Mono\", \"Fira Code\", monospace",
        },
        ".cm-scroller": { overflow: "auto" },
        ".cm-content": { padding: "12px 0" },
        ".cm-focused": { outline: "none" },
      }),
      EditorView.lineWrapping,
    ],
  }),
  parent: elEditorContainer,
});

// ---------------------------------------------------------------------------
// Renderer panel visibility
// ---------------------------------------------------------------------------

/**
 * @description
 * Show the correct preview panel for the active renderer kind
 *
 * @param kind - The renderer kind to show
 */
function showRendererPanel(kind: TRendererKind): void {
  elPreviewDom.style.display = kind === ERendererKind.DOM ? "" : "none";
  elPreviewString.style.display = kind === ERendererKind.STRING ? "" : "none";
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

/**
 * @description
 * Update the status badge text and data-status attribute
 *
 * @param status - The playback status string
 */
function setStatus(status: string): void {
  elStatusBadge.textContent = status.toUpperCase();
  elStatusBadge.dataset.status = status;
}

// ---------------------------------------------------------------------------
// Transport button states
// ---------------------------------------------------------------------------

/**
 * @description
 * Sync transport button disabled states with current playback status
 */
function syncTransportState(): void {
  if (activeTw === null) {
    elPlayBtn.setAttribute("disabled", "");
    elPauseBtn.setAttribute("disabled", "");
    elStopBtn.setAttribute("disabled", "");
    elReplayBtn.setAttribute("disabled", "");
    elStepFwdBtn.setAttribute("disabled", "");
    elStepBwdBtn.setAttribute("disabled", "");

    return;
  }

  const state = activeTw.getState();
  const isPlaying = state.status === EPlaybackStatus.PLAYING;
  const isStopped = state.status === EPlaybackStatus.STOPPED;
  const isCompleted = state.status === EPlaybackStatus.COMPLETED;
  const isIdle = state.status === EPlaybackStatus.IDLE;

  setStatus(state.status);

  elPlayBtn.toggleAttribute("disabled", isPlaying);
  elPauseBtn.toggleAttribute("disabled", !isPlaying);
  elStopBtn.toggleAttribute("disabled", isIdle || isStopped);
  elReplayBtn.toggleAttribute("disabled", isIdle);
  elStepFwdBtn.toggleAttribute("disabled", isPlaying || isCompleted);
  elStepBwdBtn.toggleAttribute("disabled", isPlaying || isIdle);
}

// ---------------------------------------------------------------------------
// RAF tick for live UI updates during playback
// ---------------------------------------------------------------------------

/**
 * @description
 * Start the animation-frame tick loop
 */
function startTick(): void {
  stopTick();
  rafId = requestAnimationFrame(tick);
}

/**
 * @description
 * Cancel the animation-frame tick loop
 */
function stopTick(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

/**
 * @description
 * Single tick — syncs transport state and loops while playing
 */
function tick(): void {
  syncTransportState();

  if (activeTw?.getState().status === EPlaybackStatus.PLAYING) {
    rafId = requestAnimationFrame(tick);
  }
  else {
    rafId = null;
    syncTransportState();
  }
}

// ---------------------------------------------------------------------------
// Error panel
// ---------------------------------------------------------------------------

/**
 * @description
 * Show the error panel with a message
 *
 * @param msg - The error message to display
 */
function showError(msg: string): void {
  elErrorMsg.textContent = msg;
  elErrorPanel.style.display = "";
}

/**
 * @description
 * Hide the error panel
 */
function hideError(): void {
  elErrorPanel.style.display = "none";
}

// ---------------------------------------------------------------------------
// Run user code
// ---------------------------------------------------------------------------

/**
 * @description
 * Get the current code from the editor
 *
 * @returns The raw string content of the editor document
 */
function getEditorCode(): string {
  return editorView.state.doc.toString();
}

/**
 * @description
 * Execute the code in the editor using the active renderer
 *
 * @returns A promise that resolves when execution is complete, with the result or an error.
 */
async function runCode(): Promise<void> {
  hideError();
  stopTick();

  // Stop any prior animation
  activeTw?.stop();
  activeTw = null;

  // Clear preview panels
  elPreviewDom.innerHTML = "";
  elPreviewString.textContent = "";

  setStatus("running");
  elRunBtn.setAttribute("disabled", "");

  const renderer = createSandboxRenderer(
    activeRendererKind,
    elPreviewDom,
    elPreviewString,
  );

  const code = getEditorCode();
  const result = await runUserCode(code, renderer);

  elRunBtn.removeAttribute("disabled");

  if (!result.ok) {
    showError(result.error);
    setStatus("error");
    syncTransportState();

    return;
  }

  activeTw = result.tw;
  startTick();
}

// ---------------------------------------------------------------------------
// Recipe picker
// ---------------------------------------------------------------------------

/**
 * @description
 * Render the recipe list filtered by search + category
 */
function renderRecipes(): void {
  const query = elSearchInput.value.trim().toLowerCase();

  const filtered = SANDBOX_RECIPES.filter((r) => {
    const matchCat = activeCategory === "all" || r.category === activeCategory;
    const matchSearch = query === ""
      || r.title.toLowerCase().includes(query)
      || r.description.toLowerCase().includes(query);

    return matchCat && matchSearch;
  });

  elRecipeList.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("p");

    empty.className = "recipe-empty";
    empty.textContent = "No recipes match your search.";
    elRecipeList.appendChild(empty);

    return;
  }

  for (const recipe of filtered) {
    const item = document.createElement("button");

    item.className = "recipe-item";
    item.dataset.id = recipe.id;

    item.innerHTML = `
      <span class="recipe-item__top">
        <span class="recipe-item__title">${recipe.title}</span>
        <span class="recipe-item__cat recipe-item__cat--${recipe.category}">${recipe.category}</span>
        <span class="recipe-item__diff recipe-item__diff--${recipe.difficulty}">${recipe.difficulty}</span>
      </span>
      <span class="recipe-item__desc">${recipe.description}</span>
    `;

    item.addEventListener("click", () => {
      void loadRecipe(recipe.id);
    });

    elRecipeList.appendChild(item);
  }
}

/**
 * @description
 * Load a recipe by ID into the editor and auto-run it
 *
 * @param id - The recipe ID to load
 * @returns A promise that resolves when the recipe has been loaded and run
 */
async function loadRecipe(id: string): Promise<void> {
  const recipe = SANDBOX_RECIPES.find(r => r.id === id);

  if (recipe === undefined) {
    return;
  }

  // Update editor content
  editorView.dispatch({
    changes: {
      from: 0,
      to: editorView.state.doc.length,
      insert: recipe.code,
    },
  });

  // Mark as active
  document.querySelectorAll(".recipe-item").forEach((el) => {
    el.classList.toggle("recipe-item--active", (el as HTMLElement).dataset.id === id);
  });

  // Auto-run
  await runCode();
}

// ---------------------------------------------------------------------------
// Category chips
// ---------------------------------------------------------------------------

/**
 * @description
 * Wire up category filter chip click events
 */
function initCategoryChips(): void {
  document.querySelectorAll<HTMLButtonElement>(".cat-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCategory = (chip.dataset.cat as TSandboxCategory) ?? "all";

      document.querySelectorAll(".cat-chip").forEach(c =>
        c.classList.toggle("cat-chip--active", c === chip),
      );

      renderRecipes();
    });
  });
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------

/**
 * @description
 * Wire all sandbox UI events
 */
function init(): void {
  // Inject version + repo link from build-time defines
  elPkgVersion.textContent = `v${__PKG_VERSION__}`;

  const repoUrl = __PKG_REPO__
    .replace(/^git\+/, "")
    .replace(/\.git$/, "");

  elRepoLink.href = repoUrl;

  // Initial renderer panel
  showRendererPanel(activeRendererKind);
  setStatus("idle");
  syncTransportState();

  // Renderer selector
  elRendererSelect.addEventListener("change", () => {
    activeRendererKind = elRendererSelect.value as TRendererKind;
    showRendererPanel(activeRendererKind);
  });

  // Run button
  elRunBtn.addEventListener("click", () => {
    void runCode();
  });

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to run
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void runCode();
    }
  });

  // Transport
  elPlayBtn.addEventListener("click", () => {
    if (activeTw === null) {
      return;
    }

    startTick();
    activeTw.play().catch(() => null).finally(() => syncTransportState());
  });

  elPauseBtn.addEventListener("click", () => {
    activeTw?.pause();
    stopTick();
    syncTransportState();
  });

  elStopBtn.addEventListener("click", () => {
    activeTw?.stop();
    stopTick();
    syncTransportState();
  });

  elReplayBtn.addEventListener("click", () => {
    if (activeTw === null) {
      return;
    }

    startTick();
    activeTw.replay().catch(() => null).finally(() => syncTransportState());
  });

  elStepFwdBtn.addEventListener("click", () => {
    activeTw?.stepForward();
    syncTransportState();
  });

  elStepBwdBtn.addEventListener("click", () => {
    activeTw?.stepBackward();
    syncTransportState();
  });

  // Rate slider
  elRateSlider.addEventListener("input", () => {
    const rate = Number(elRateSlider.value);

    elRateValue.textContent = `${rate}×`;
    activeTw?.setRate(rate);
  });

  // Copy button
  elCopyBtn.addEventListener("click", () => {
    void navigator.clipboard.writeText(getEditorCode()).then(() => {
      const orig = elCopyBtn.textContent;

      elCopyBtn.textContent = "Copied!";
      setTimeout(() => {
        elCopyBtn.textContent = orig;
      }, 1500);
    });
  });

  // Recipe search
  elSearchInput.addEventListener("input", () => renderRecipes());

  // Category chips
  initCategoryChips();

  // Initial recipe list + auto-run first recipe
  renderRecipes();
  void loadRecipe(initialRecipe.id);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", init);
