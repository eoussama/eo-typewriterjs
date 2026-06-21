import type { TTypewriter } from "@eo-typewriterjs";
import type { TSandboxCategory } from "./sandbox-recipes.const";
import type { TRendererKind } from "./sandbox-runner.helper";

import { EPlaybackStatus } from "@eo-typewriterjs";

import { createSandboxEditor } from "./sandbox-editor";
import { SANDBOX_RECIPES } from "./sandbox-recipes.const";
import { createSandboxRenderer, ERendererKind, runUserCode } from "./sandbox-runner.helper";



function $<T extends HTMLElement = HTMLElement>(sel: string): T {
  return document.querySelector<T>(sel)!;
}

const elRendererSelect = $<HTMLSelectElement>("#renderer-select");
const elPreviewDom = $("#preview-dom");
const elPreviewString = $("#preview-string");
const elRunBtn = $("#run-btn");
const elPlayBtn = $("#play-btn");
const elPauseBtn = $("#pause-btn");
const elStopBtn = $("#stop-btn");
const elReplayBtn = $("#replay-btn");
const elStepFwdBtn = $("#step-fwd-btn");
const elStepBwdBtn = $("#step-bwd-btn");
const elRateSlider = $<HTMLInputElement>("#rate-slider");
const elRateValue = $("#rate-value");
const elAudioMuteBtn = $("#audio-mute-btn");
const elAudioIconOn = $("#audio-icon-on");
const elAudioIconOff = $("#audio-icon-off");
const elVolumeSlider = $<HTMLInputElement>("#volume-slider");
const elVolumeValue = $("#volume-value");
const elErrorPanel = $("#error-panel");
const elErrorMsg = $("#error-msg");
const elCopyBtn = $("#copy-btn");
const elSearchInput = $<HTMLInputElement>("#recipe-search");
const elRecipeList = $("#recipe-list");
const elEditorContainer = $("#editor-container");
const elEditorShortcutHint = $("#editor-shortcut-hint");
const elApiHelpBtn = $("#api-help-btn");
const elHelpDialogBackdrop = $("#help-dialog-backdrop");
const elHelpDialogClose = $("#help-dialog-close");
const elHelpDialogBody = $("#help-dialog-body");
const elPkgVersion = $("#pkg-version");
const elRepoLink = $<HTMLAnchorElement>("#repo-link");


let activeRendererKind: TRendererKind = ERendererKind.DOM;
let activeTw: TTypewriter | null = null;
let activeCategory: TSandboxCategory = "all";
let rafId: number | null = null;
let sandboxAudioEnabled = false;
let sandboxAudioVolume = 1;

/**
 * Monotonically incrementing token used to discard results from stale runCode calls.
 * Whenever a new run starts, this counter is bumped; the async completion checks that
 * the token still matches before applying the result.
 */
let runToken = 0;

/**
 * The TTypewriter instance created inside the currently in-flight runUserCode call.
 * Set via the onCreated callback the instant createTypewriter() is called - before any
 * play() resolves - so that a subsequent recipe click can stop it immediately.
 */
let pendingTw: TTypewriter | null = null;


const initialRecipe = SANDBOX_RECIPES[0];

const editorView = createSandboxEditor(elEditorContainer, initialRecipe.code);


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


/**
 * @description
 * Sync the rate slider and display label with the active typewriter rate.
 * Resets to 1× when no typewriter is active.
 */
function syncRateUI(): void {
  const rate = activeTw?.getState().rate ?? 1;

  elRateSlider.value = String(rate);
  elRateValue.textContent = `${rate}×`;
}

/**
 * @description
 * Sync the audio mute button icon and volume display with current audio state
 */
function syncAudioUI(): void {
  elAudioIconOn.style.display = sandboxAudioEnabled ? "" : "none";
  elAudioIconOff.style.display = sandboxAudioEnabled ? "none" : "";
  elAudioMuteBtn.classList.toggle("transport-btn--active", !sandboxAudioEnabled);
  elVolumeSlider.value = String(sandboxAudioVolume);
  elVolumeSlider.disabled = !sandboxAudioEnabled;
  elVolumeValue.textContent = `${Math.round(sandboxAudioVolume * 100)}%`;
}

/**
 * @description
 * Sync transport button disabled states with current playback status
 */
function syncTransportState(): void {
  syncRateUI();

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
  const { status } = state;
  const isPlaying = status === EPlaybackStatus.PLAYING;
  const isPaused = status === EPlaybackStatus.PAUSED;
  const isStopped = status === EPlaybackStatus.STOPPED;
  const isCompleted = status === EPlaybackStatus.COMPLETED;
  const isIdle = status === EPlaybackStatus.IDLE;
  const isCancelled = status === EPlaybackStatus.CANCELLED;

  // Play: disabled while already playing; enabled when paused/stopped/completed/cancelled
  elPlayBtn.toggleAttribute("disabled", isPlaying);
  // Pause: only active while playing
  elPauseBtn.toggleAttribute("disabled", !isPlaying);
  // Stop: disabled when idle or already stopped
  elStopBtn.toggleAttribute("disabled", isIdle || isStopped);
  // Replay: disabled only when idle (nothing has run yet)
  elReplayBtn.toggleAttribute("disabled", isIdle);
  // Step fwd: disabled while playing or at end
  elStepFwdBtn.toggleAttribute("disabled", isPlaying || isCompleted);
  // Step bwd: disabled while playing or at start (idle)
  elStepBwdBtn.toggleAttribute("disabled", isPlaying || isIdle);

  elPlayBtn.classList.toggle("transport-btn--active", isPaused || isCancelled || isStopped);
  elPauseBtn.classList.toggle("transport-btn--active", isPaused);
  elStopBtn.classList.toggle("transport-btn--active", isStopped);
  elReplayBtn.classList.toggle("transport-btn--active", isCompleted);
}


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
 * Single tick - syncs transport state and loops while playing
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
 * Execute the code in the editor using the active renderer.
 *
 * Uses a monotonic token to discard results from stale runs superseded by a
 * newer recipe selection. Also passes an onCreated callback to runUserCode so
 * that the TTypewriter is bound to activeTw the instant createTypewriter() is
 * called - before any await tw.play() - making transport buttons responsive
 * immediately and allowing a subsequent recipe click to cancel any ongoing
 * animation without waiting for play() to resolve.
 *
 * @returns A promise that resolves when execution is complete, with the result or an error.
 */
async function runCode(): Promise<void> {
  // Increment token: any in-flight run with an older token will be ignored
  const token = ++runToken;

  hideError();
  stopTick();

  // Stop any in-flight animation immediately (pendingTw is set the moment
  // createTypewriter() is called, which is before play() starts)
  pendingTw?.stop();
  pendingTw = null;

  activeTw?.stop();
  activeTw = null;
  syncTransportState();

  elPreviewDom.innerHTML = "";
  elPreviewString.textContent = "";

  elRunBtn.setAttribute("disabled", "");

  const renderer = createSandboxRenderer(
    activeRendererKind,
    elPreviewDom,
    elPreviewString,
  );

  const code = getEditorCode();

  const result = await runUserCode(code, renderer, (tw) => {
    // Called synchronously the moment createTypewriter() runs inside user code,
    // before any await tw.play(), so we can immediately wire up transport.
    if (token !== runToken) {
      // A newer run already started, stop this tw right away
      tw.stop();

      return;
    }

    pendingTw = tw;
    activeTw = tw;

    // Sync sandbox toolbar state from the new typewriter's actual config
    // so recipe-level audio options are respected and the UI reflects them.
    const opts = tw.getAudioOptions();

    sandboxAudioEnabled = opts?.enabled !== false;
    sandboxAudioVolume = opts?.volume ?? sandboxAudioVolume;

    // Apply current sandbox volume (but preserve the recipe's enabled state)
    tw.setAudioVolume(sandboxAudioVolume);
    syncAudioUI();

    elRunBtn.removeAttribute("disabled");
    syncTransportState();
    startTick();
  });

  if (token !== runToken) {
    return;
  }

  elRunBtn.removeAttribute("disabled");

  if (!result.ok) {
    // runUserCode can fail if no createTypewriter() was called; in that case
    // activeTw is already null, so just show the error.
    activeTw = null;
    pendingTw = null;
    showError(result.error);
    syncTransportState();

    return;
  }

  // Play has finished (or was stopped), clean up pendingTw reference and
  // do a final sync so the transport buttons show the correct end state.
  pendingTw = null;
  activeTw = result.tw;
  syncTransportState();
}


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

  editorView.dispatch({
    changes: {
      from: 0,
      to: editorView.state.doc.length,
      insert: recipe.code,
    },
  });

  document.querySelectorAll(".recipe-item").forEach((el) => {
    el.classList.toggle("recipe-item--active", (el as HTMLElement).dataset.id === id);
  });

  await runCode();
}


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


/**
 * @description
 * A single section definition for the help dialog
 */
type THelpSection = {
  readonly id: string;
  readonly label: string;
  readonly title: string;
  readonly desc: string;
  readonly rows: ReadonlyArray<readonly [string, string]>;
};

const HELP_SECTIONS: readonly THelpSection[] = [
  {
    id: "globals",
    label: "Globals",
    title: "Sandbox Globals",
    desc: "Available automatically in every snippet - no imports needed.",
    rows: [
      ["createTypewriter({ renderer })", "Create a typewriter instance"],
      ["renderer", "The active sandbox renderer (DOM or String)"],
      ["domRenderer(el)", "Create a DOM renderer targeting an element"],
      ["StringRenderer", "Headless renderer - new StringRenderer()"],
      ["TimelineBuilder", "Fluent builder, normally used via tw.timeline"],
      ["ECommandKind", "Enum-like object of command kind values"],
      ["EPlaybackStatus", "Enum-like object of playback status values"],
      ["ECursorKind", "Cursor kinds: PIPE, BLOCK, UNDERSCORE, BLOCK_UNDERSCORE, CARET, CUSTOM"],
      ["EAudioStrategy", "Audio strategies: RANDOM, SHUFFLE_BAG, ROUND_ROBIN"],
    ],
  },
  {
    id: "type",
    label: "type()",
    title: ".type(text, opts)",
    desc: "Type a string step by step. Each step inserts one unit (char/word/line) and renders.",
    rows: [
      ["text", "The string to type"],
      ["by", "\"char\" | \"word\" | \"line\" | \"grapheme\" | \"whole\" - advance unit (default: \"char\")"],
      ["interval", "Delay in ms between each step (default: 50)"],
      ["cursor", "\"main\" or an array of cursor IDs to type on simultaneously"],
      ["style", "CSS class or TStyleObject applied to every inserted character"],
      ["before", "Hook - fires once before typing starts, or per step when unit is set"],
      ["after", "Hook - fires once after typing ends, or per step when unit is set"],
      ["audio", "false to silence, or { volume, sfx } to override audio for this command"],
    ],
  },
  {
    id: "delete",
    label: "delete()",
    title: ".delete(count, opts)",
    desc: "Delete text relative to the cursor. Use a number (positive = forward, negative = backward) or a boundary string (\"start\", \"end\", \"whole\").",
    rows: [
      ["count", "Number, or \"start\" | \"end\" | \"whole\" boundary string"],
      ["- number > 0", "Delete forward from cursor"],
      ["- number < 0", "Delete backward from cursor"],
      ["- \"start\"", "Delete from cursor back to document start"],
      ["- \"end\"", "Delete from cursor forward to document end"],
      ["- \"whole\"", "Delete the entire document"],
      ["by", "\"char\" | \"word\" | \"line\" | \"grapheme\" - unit per step (numeric counts only, default: \"char\")"],
      ["interval", "Delay in ms between each deletion step (numeric counts only, default: 50)"],
      ["cursor", "\"main\" or an array of cursor IDs"],
      ["before", "Hook - fires once before deletion starts, or per step when unit is set"],
      ["after", "Hook - fires once after deletion ends, or per step when unit is set"],
      ["audio", "false to silence, or { volume, sfx } to override audio for this command"],
    ],
  },
  {
    id: "wait",
    label: "wait()",
    title: ".wait(ms, opts?)",
    desc: "Pause the animation for the given number of milliseconds without changing the document.",
    rows: [
      ["ms", "Duration to wait in milliseconds"],
      ["before", "Hook fired immediately before the wait begins"],
      ["after", "Hook fired immediately after the wait ends"],
      ["audio", "Per-command audio override"],
    ],
  },
  {
    id: "move",
    label: "move()",
    title: ".move(offset, opts?)",
    desc: "Reposition a cursor. Use a number (positive = right, negative = left, 0 = no-op) or a boundary string (\"start\", \"end\").",
    rows: [
      ["offset", "Number or boundary string \"start\" | \"end\""],
      ["- number > 0", "Move right (forward)"],
      ["- number < 0", "Move left (backward)"],
      ["- 0", "No-op - cursor stays in place"],
      ["- \"start\"", "Jump to absolute document start (index 0)"],
      ["- \"end\"", "Jump to absolute document end"],
      ["by", "\"char\" | \"word\" | \"line\" | \"grapheme\" - unit (numeric offsets only, default: \"char\")"],
      ["cursor", "\"main\" or an array of cursor IDs to move (default: \"main\")"],
      ["before", "Hook fired before the cursor moves"],
      ["after", "Hook fired after the cursor has moved"],
      ["audio", "Per-command audio override"],
    ],
  },
  {
    id: "select",
    label: "select()",
    title: ".select(count, opts?)",
    desc: "Create a text selection. Use a number (positive = forward, negative = backward) or a boundary string (\"start\", \"end\", \"whole\").",
    rows: [
      ["count", "Number or boundary string \"start\" | \"end\" | \"whole\""],
      ["- number > 0", "Select forward from cursor"],
      ["- number < 0", "Select backward from cursor"],
      ["- \"start\"", "Select from cursor to document start"],
      ["- \"end\"", "Select from cursor to document end"],
      ["- \"whole\"", "Select the entire document"],
      ["by", "\"char\" | \"word\" | \"line\" | \"grapheme\" - selection unit (numeric counts only, default: \"char\")"],
      ["cursor", "\"main\" or an array of cursor IDs"],
      ["before", "Hook fired before the selection is applied"],
      ["after", "Hook fired after the selection is applied"],
      ["audio", "Per-command audio override"],
    ],
  },
  {
    id: "unselect",
    label: "unselect()",
    title: ".unselect(opts?)",
    desc: "Remove the active text selection from one or more cursors. If the cursor has no selection the state is left unchanged. Instant command - does not advance the clock.",
    rows: [
      ["cursor", "\"main\" or an array of cursor IDs (default: \"main\")"],
      ["before", "Hook fired before the selection is cleared"],
      ["after", "Hook fired after the selection is cleared"],
      ["audio", "Per-command audio override"],
    ],
  },
  {
    id: "style",
    label: "style()",
    title: ".style(style, range, opts?)",
    desc: "Apply a style to a range of text. style is a CSS class name or a TStyleObject. range is { from, to } or \"selection\".",
    rows: [
      ["style", "CSS class string or TStyleObject { className, css, attrs, ansi, meta }"],
      ["range", "{ from, to } - absolute indices, or \"selection\" to use the current selection"],
      ["cursor", "Whose selection to use when range is \"selection\" (default: \"main\")"],
      ["before", "Hook fired before the style is applied"],
      ["after", "Hook fired after the style is applied"],
      ["audio", "Per-command audio override"],
    ],
  },
  {
    id: "unstyle",
    label: "unstyle()",
    title: ".unstyle(range, opts?)",
    desc: "Remove text styles that overlap a range. Styles partially overlapping the range are clipped rather than fully removed. range is { from, to } or \"selection\". Instant command - does not advance the clock.",
    rows: [
      ["range", "{ from, to } - absolute indices, or \"selection\" to unstyle the cursor's active selection"],
      ["cursor", "Whose selection to use when range is \"selection\" (default: \"main\")"],
      ["before", "Hook fired before the styles are removed"],
      ["after", "Hook fired after the styles are removed"],
      ["audio", "Per-command audio override"],
      ["- clipping behavior", "Outside range: preserved. Inside range: removed. Partial overlap: clipped. Spanning range: split into two fragments."],
    ],
  },
  {
    id: "call",
    label: "call()",
    title: ".call(fn, opts?)",
    desc: "Schedule an inline callback. The callback receives a context object and may return a Promise - playback suspends until it settles.",
    rows: [
      ["fn", "The callback: ({ state, signal }) => void | Promise<void>"],
      ["- context: state", "Current TTypewriterState snapshot"],
      ["- context: signal", "AbortSignal - aborted when tw.cancel() is called"],
      ["before", "Hook fired before the callback runs"],
      ["after", "Hook fired after the callback completes"],
    ],
  },
  {
    id: "hooks",
    label: "Hooks & Context",
    title: "Lifecycle Hooks & Callback Context",
    desc: "All commands accept optional before and after hooks. Both fire once per step for segmented commands (type, delete) and once for instant commands.",
    rows: [
      ["before", "Fires before each step (or once for instant commands)"],
      ["after", "Fires after each step (or once for instant commands)"],
      ["- context: state", "Current TTypewriterState snapshot"],
      ["- context: stepIndex", "Zero-based index of the current step"],
      ["- context: stepCount", "Total step count for the command"],
      ["- context: unit", "\"char\" | \"word\" | ... or null for instant commands"],
      ["- context: signal", "AbortSignal - aborted when tw.cancel() is called"],
    ],
  },
  {
    id: "playback",
    label: "Playback",
    title: "Playback Methods",
    desc: "All playback methods are available on the TTypewriter instance returned by createTypewriter().",
    rows: [
      ["tw.play()", "Start or resume playback - returns Promise<void>"],
      ["tw.pause()", "Pause at the current position; call play() to resume"],
      ["tw.stop()", "Stop and reset to blank state"],
      ["tw.replay()", "Restart from the beginning - returns Promise<void>"],
      ["tw.cancel()", "Stop preserving current output - status → CANCELLED"],
      ["tw.seek(ms)", "Jump to an absolute timeline position in milliseconds"],
      ["tw.stepForward()", "Apply the next event group and pause"],
      ["tw.stepBackward()", "Undo the last event group and pause"],
      ["tw.setRate(n)", "Set playback speed multiplier (e.g. 2 = double speed)"],
      ["tw.getState()", "Returns { status, currentTime, duration, rate }"],
      ["tw.getLiveState()", "Returns the current document, cursors, and selections"],
    ],
  },
  {
    id: "audio",
    label: "Audio",
    title: "Audio Configuration",
    desc: "Audio is disabled by default. Pass audio: { enabled: true } to createTypewriter() to opt in. All options can also be changed at runtime.",
    rows: [
      ["audio: { enabled: true }", "Enable typing sounds in createTypewriter() options"],
      ["audio: { volume: 0.5 }", "Master volume, clamped to [0, 1]"],
      ["audio: { typing: { strategy: EAudioStrategy.SHUFFLE_BAG } }", "Per-channel sfx strategy: RANDOM, SHUFFLE_BAG, ROUND_ROBIN"],
      ["audio: { typing: { avoidImmediateRepeat: true } }", "Never play the same sample twice in a row within a channel"],
      ["audio: { typing: { playbackRateJitter: { min, max } } }", "Randomise pitch per step for a natural feel"],
      ["audio: { typing: { volumeJitter: { min, max } } }", "Randomise per-step volume within a range"],
      ["audio: { sfxs: { name: { samples: [\"...\"] } } }", "Named sfx pack; each sfx has a samples array of audio URLs"],
      ["audio: { typing: { sfx: \"name\" } }", "Target a named sfx for a specific channel"],
      ["tw.setAudioEnabled(bool)", "Toggle audio on/off at runtime without rebuilding"],
      ["tw.setAudioVolume(n)", "Set master volume at runtime, clamped to [0, 1]"],
      ["tw.setAudioOptions(opts)", "Replace the full audio config at runtime"],
      ["tw.getAudioOptions()", "Current audio config snapshot, or null if not configured"],
      ["type/delete: { audio: false }", "Silence a single command while audio is globally enabled"],
      ["type/delete: { audio: { volume: 0.2 } }", "Override volume for one command"],
      ["type/delete: { audio: { sfx: \"name\" } }", "Use a specific named sfx for one command"],
    ],
  },
  {
    id: "cursor",
    label: "Cursor",
    title: "Cursor Options",
    desc: "The default cursor is named \"main\". Customize it at creation time via the cursor option, or update it at runtime using the cursor methods.",
    rows: [
      ["cursor: { kind: ECursorKind.PIPE }", "Set cursor shape at creation time (PIPE, BLOCK, UNDERSCORE, BLOCK_UNDERSCORE, CARET, CUSTOM)"],
      ["cursor: { animation: \"blink\" }", "Cursor animation: \"blink\", \"none\", or a custom CSS animation name"],
      ["cursor: { visible: false }", "Hide the cursor initially"],
      ["cursor: { content: \"|\" }", "Custom cursor glyph (used when kind is CUSTOM)"],
      ["tw.setCursorVisible(bool)", "Show or hide all cursors at runtime"],
      ["tw.setCursorVisible(bool, \"main\")", "Show or hide a specific cursor by ID"],
      ["tw.setCursorOptions({ kind: ECursorKind.BLOCK })", "Update render options for all cursors at runtime"],
      ["tw.setCursorOptions(opts, \"main\")", "Update render options for a specific cursor by ID"],
    ],
  },
];

/**
 * @description
 * Build and inject the help dialog nav + content sections into the DOM,
 * then wire the nav button click handlers to switch active sections.
 */
function buildHelpDialog(): void {
  const nav = document.createElement("nav");

  nav.className = "help-dialog__nav";
  nav.setAttribute("aria-label", "Help sections");

  const content = document.createElement("div");

  content.className = "help-dialog__content";

  HELP_SECTIONS.forEach((section, idx) => {
    const btn = document.createElement("button");

    btn.className = `help-nav-btn${idx === 0 ? " help-nav-btn--active" : ""}`;
    btn.dataset.section = section.id;
    btn.textContent = section.label;
    nav.appendChild(btn);

    const panel = document.createElement("div");

    panel.className = `help-section${idx === 0 ? " help-section--active" : ""}`;
    panel.dataset.section = section.id;

    const title = document.createElement("p");

    title.className = "help-section__title";
    title.textContent = section.title;

    const desc = document.createElement("p");

    desc.className = "help-section__desc";
    desc.textContent = section.desc;

    const table = document.createElement("table");

    table.className = "help-table";

    const tbody = document.createElement("tbody");

    for (const [key, val] of section.rows) {
      const tr = document.createElement("tr");
      const td1 = document.createElement("td");
      const td2 = document.createElement("td");
      const code = document.createElement("code");

      code.textContent = key;
      td1.appendChild(code);
      td2.textContent = val;
      tr.appendChild(td1);
      tr.appendChild(td2);
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    panel.appendChild(title);
    panel.appendChild(desc);
    panel.appendChild(table);
    content.appendChild(panel);
  });

  elHelpDialogBody.appendChild(nav);
  elHelpDialogBody.appendChild(content);

  nav.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".help-nav-btn");

    if (btn === null || btn.dataset.section === undefined) {
      return;
    }

    const sectionId = btn.dataset.section;

    nav.querySelectorAll(".help-nav-btn").forEach(b =>
      b.classList.toggle("help-nav-btn--active", b === btn),
    );

    content.querySelectorAll(".help-section").forEach(p =>
      p.classList.toggle("help-section--active", (p as HTMLElement).dataset.section === sectionId),
    );
  });
}


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

  showRendererPanel(activeRendererKind);
  syncTransportState();
  syncAudioUI();

  // Renderer selector: switch pane and re-run so the new renderer gets live output
  elRendererSelect.addEventListener("change", () => {
    activeRendererKind = elRendererSelect.value as TRendererKind;
    showRendererPanel(activeRendererKind);
    void runCode();
  });

  elRunBtn.addEventListener("click", () => {
    void runCode();
  });

  // Keyboard shortcuts: Ctrl/Cmd+Enter or Ctrl/Cmd+S to run, only when editor has focus
  document.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey)) {
      return;
    }

    const isEnter = e.key === "Enter";
    const isSave = e.key === "s" || e.key === "S";

    if (!isEnter && !isSave) {
      return;
    }

    if (!editorView.hasFocus) {
      return;
    }

    e.preventDefault();
    void runCode();
  });

  editorView.dom.addEventListener("focusin", () => {
    elEditorShortcutHint.style.display = "";
  });

  editorView.dom.addEventListener("focusout", () => {
    elEditorShortcutHint.style.display = "none";
  });

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

  elRateSlider.addEventListener("input", () => {
    const rate = Number(elRateSlider.value);

    elRateValue.textContent = `${rate}×`;
    activeTw?.setRate(rate);
  });

  elAudioMuteBtn.addEventListener("click", () => {
    sandboxAudioEnabled = !sandboxAudioEnabled;
    activeTw?.setAudioEnabled(sandboxAudioEnabled);
    syncAudioUI();
  });

  elVolumeSlider.addEventListener("input", () => {
    sandboxAudioVolume = Number(elVolumeSlider.value);
    elVolumeValue.textContent = `${Math.round(sandboxAudioVolume * 100)}%`;
    activeTw?.setAudioVolume(sandboxAudioVolume);
  });

  elCopyBtn.addEventListener("click", () => {
    void navigator.clipboard.writeText(getEditorCode()).then(() => {
      const orig = elCopyBtn.textContent;

      elCopyBtn.textContent = "Copied!";
      setTimeout(() => {
        elCopyBtn.textContent = orig;
      }, 1500);
    });
  });

  elSearchInput.addEventListener("input", () => renderRecipes());

  buildHelpDialog();

  elApiHelpBtn.addEventListener("click", () => {
    elHelpDialogBackdrop.style.display = "";
    elHelpDialogClose.focus();
  });

  elHelpDialogClose.addEventListener("click", () => {
    elHelpDialogBackdrop.style.display = "none";
  });

  elHelpDialogBackdrop.addEventListener("click", (e) => {
    if (e.target === elHelpDialogBackdrop) {
      elHelpDialogBackdrop.style.display = "none";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && elHelpDialogBackdrop.style.display !== "none") {
      elHelpDialogBackdrop.style.display = "none";
    }
  });

  initCategoryChips();

  renderRecipes();
  void loadRecipe(initialRecipe.id);
}


document.addEventListener("DOMContentLoaded", init);
