import type { TTypewriter } from "@eo-typewriterjs";
import type { TRecipe, TRecipeVariant } from "./recipes.const";

import { createTypewriter, domRenderer, EPlaybackStatus } from "@eo-typewriterjs";
import { RECIPES } from "./recipes.const";



// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _tw: TTypewriter | null = null;
let _rafId: number | null = null;
let _isScrubbing = false;

/**
 * @description
 * The currently selected recipe and variant indices
 */
let _recipeIndex = 0;
let _variantIndex = 0;

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function outputEl(): HTMLElement {
  return el("typewriter-output");
}

// ---------------------------------------------------------------------------
// Control readback
// ---------------------------------------------------------------------------

function readDefaults() {
  const unit = (el<HTMLSelectElement>("ctrl-unit").value || "char") as "char" | "grapheme" | "word" | "line";
  const amount = Math.max(1, Number.parseInt(el<HTMLInputElement>("ctrl-amount").value, 10) || 1);
  const interval = Math.max(0, Number.parseInt(el<HTMLInputElement>("ctrl-interval").value, 10) || 80);
  const rate = Math.max(0.1, Number.parseFloat(el<HTMLInputElement>("ctrl-rate").value) || 1);

  return { unit, amount, interval, rate };
}

// ---------------------------------------------------------------------------
// Apply variant defaults to the control panel
// ---------------------------------------------------------------------------

function applyDefaults(variant: TRecipeVariant): void {
  const d = variant.defaults ?? {};

  if (d.unit !== undefined) {
    el<HTMLSelectElement>("ctrl-unit").value = d.unit;
  }

  if (d.amount !== undefined) {
    el<HTMLInputElement>("ctrl-amount").value = String(d.amount);
  }

  if (d.interval !== undefined) {
    el<HTMLInputElement>("ctrl-interval").value = String(d.interval);
  }

  if (d.rate !== undefined) {
    el<HTMLInputElement>("ctrl-rate").value = String(d.rate);
    el("ctrl-rate-label").textContent = `${d.rate}×`;
  }
}

// ---------------------------------------------------------------------------
// Playback UI sync
// ---------------------------------------------------------------------------

/**
 * @description
 * Update every piece of playback UI from the current tw state (called in rAF loop)
 */
function syncPlaybackUI(): void {
  if (_tw === null) {
    return;
  }

  const state = _tw.getState();
  const { status, currentTime, duration, rate } = state;

  // Status badge
  const badge = el("status-badge");

  badge.textContent = status;
  badge.dataset.status = status;

  // Time / duration
  el("time-current").textContent = formatMs(currentTime);
  el("time-duration").textContent = formatMs(duration);

  // Seek slider — only update when user is not scrubbing
  if (!_isScrubbing) {
    const slider = el<HTMLInputElement>("seek-slider");

    slider.max = String(Math.max(1, duration));
    slider.value = String(currentTime);
  }

  // Rate label
  el("ctrl-rate-label").textContent = `${rate}×`;

  // Button states
  const playing = status === EPlaybackStatus.PLAYING;
  const paused = status === EPlaybackStatus.PAUSED;
  const idle = status === EPlaybackStatus.IDLE;
  const stopped = status === EPlaybackStatus.STOPPED;
  const completed = status === EPlaybackStatus.COMPLETED;

  el<HTMLButtonElement>("btn-play").disabled = playing;
  el<HTMLButtonElement>("btn-pause").disabled = !playing;
  el<HTMLButtonElement>("btn-stop").disabled = idle || stopped;
  el<HTMLButtonElement>("btn-replay").disabled = idle;
  el<HTMLButtonElement>("btn-step-back").disabled = playing || (idle && !paused && !completed);
  el<HTMLButtonElement>("btn-step-fwd").disabled = playing || completed;

  // Continue rAF while playing
  if (playing) {
    _rafId = requestAnimationFrame(syncPlaybackUI);
  }
  else {
    _rafId = null;
  }
}

function startRaf(): void {
  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
  }

  _rafId = requestAnimationFrame(syncPlaybackUI);
}

function formatMs(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  return `${(ms / 1000).toFixed(1)}s`;
}

// ---------------------------------------------------------------------------
// Build the typewriter for the active recipe+variant
// ---------------------------------------------------------------------------

function buildTypewriter(): TTypewriter {
  const recipe = RECIPES[_recipeIndex];
  const variant = recipe?.variants[_variantIndex];

  const tw = createTypewriter({ renderer: domRenderer(outputEl()) });

  if (recipe !== undefined && variant !== undefined) {
    const defaults = {
      unit: readDefaults().unit,
      amount: readDefaults().amount,
      interval: readDefaults().interval,
      rate: readDefaults().rate,
    };

    tw.setRate(defaults.rate);
    variant.build(tw, defaults);
  }

  return tw;
}

// ---------------------------------------------------------------------------
// Playback controls
// ---------------------------------------------------------------------------

/**
 * @description
 * Create a fresh typewriter from the active recipe+variant and play it.
 * Stops any currently playing instance first.
 */
function loadAndPlay(): void {
  stopCurrent();
  _tw = buildTypewriter();
  startRaf();
  void _tw.play().then(() => syncPlaybackUI());
}

function stopCurrent(): void {
  if (_tw !== null) {
    _tw.stop();
    _tw = null;
  }

  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }
}

function ensureTw(): TTypewriter {
  if (_tw === null) {
    _tw = buildTypewriter();
  }

  return _tw;
}

// ---------------------------------------------------------------------------
// Source panel
// ---------------------------------------------------------------------------

function updateSourcePanel(): void {
  const recipe = RECIPES[_recipeIndex];
  const variant = recipe?.variants[_variantIndex];

  el("source-code").textContent = variant?.source ?? "";
}

// ---------------------------------------------------------------------------
// Recipe list rendering
// ---------------------------------------------------------------------------

const CATEGORY_ORDER: TRecipe["category"][] = ["basics", "timing", "editing", "cursor", "styling", "advanced"];
const CATEGORY_LABELS: Record<TRecipe["category"], string> = {
  basics: "Basics",
  timing: "Timing",
  editing: "Editing",
  cursor: "Cursor",
  styling: "Styling",
  advanced: "Advanced",
};

/**
 * @description
 * Render the recipe list, optionally filtered by category and search term
 *
 * @param filterCategory - Active category filter or null for all
 * @param search - Search query string (lowercased)
 */
function renderRecipeList(filterCategory: TRecipe["category"] | null, search: string): void {
  const list = el("recipe-list");

  list.innerHTML = "";

  const filtered = RECIPES.filter((r, i) => {
    const matchCat = filterCategory === null || r.category === filterCategory;
    const matchSearch = search === "" || r.title.toLowerCase().includes(search) || r.description.toLowerCase().includes(search);

    return matchCat && matchSearch ? (i >= 0) : false;
  });

  if (filtered.length === 0) {
    const empty = document.createElement("p");

    empty.className = "recipe-empty";
    empty.textContent = "No recipes match your search.";
    list.appendChild(empty);

    return;
  }

  for (const recipe of filtered) {
    const realIndex = RECIPES.indexOf(recipe);
    const item = document.createElement("button");

    item.className = "recipe-item";
    item.dataset.id = recipe.id;

    if (realIndex === _recipeIndex) {
      item.classList.add("recipe-item--active");
    }

    const title = document.createElement("span");

    title.className = "recipe-item__title";
    title.textContent = recipe.title;

    const desc = document.createElement("span");

    desc.className = "recipe-item__desc";
    desc.textContent = recipe.description;

    const catBadge = document.createElement("span");

    catBadge.className = `recipe-item__cat recipe-item__cat--${recipe.category}`;
    catBadge.textContent = CATEGORY_LABELS[recipe.category];

    item.appendChild(title);
    item.appendChild(catBadge);
    item.appendChild(desc);

    item.addEventListener("click", () => {
      _recipeIndex = realIndex;
      _variantIndex = 0;
      applyDefaults(RECIPES[_recipeIndex]!.variants[0]!);
      renderRecipeList(filterCategory, search);
      renderVariantChips();
      updateSourcePanel();
      loadAndPlay();
    });

    list.appendChild(item);
  }
}

/**
 * @description
 * Render the variant chip strip for the active recipe
 */
function renderVariantChips(): void {
  const strip = el("variant-chips");

  strip.innerHTML = "";

  const recipe = RECIPES[_recipeIndex];

  if (recipe === undefined) {
    return;
  }

  recipe.variants.forEach((variant, i) => {
    const chip = document.createElement("button");

    chip.className = "variant-chip";
    chip.textContent = variant.label;

    if (i === _variantIndex) {
      chip.classList.add("variant-chip--active");
    }

    chip.addEventListener("click", () => {
      _variantIndex = i;
      applyDefaults(variant);
      renderVariantChips();
      updateSourcePanel();
      loadAndPlay();
    });

    strip.appendChild(chip);
  });
}

// ---------------------------------------------------------------------------
// Custom editor
// ---------------------------------------------------------------------------

function runCustomEditor(): void {
  const text = el<HTMLTextAreaElement>("editor").value.trim();

  if (text === "") {
    return;
  }

  stopCurrent();
  _recipeIndex = -1;

  const tw = createTypewriter({ renderer: domRenderer(outputEl()) });
  const defaults = readDefaults();

  tw.setRate(defaults.rate);
  tw.timeline.type(text, {
    by: defaults.amount === 1 ? defaults.unit : { unit: defaults.unit, amount: defaults.amount },
    interval: defaults.interval,
  });

  _tw = tw;
  startRaf();
  void tw.play().then(() => syncPlaybackUI());
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

/**
 * @description
 * Bootstrap the sandbox — wire up all UI elements and start the first recipe
 */
export function boot(): void {
  let activeCategory: TRecipe["category"] | null = null;
  let searchQuery = "";

  // ── Category filter chips ──────────────────────────────────────────────
  const filterBar = el("category-filter");

  const allChip = document.createElement("button");

  allChip.className = "cat-chip cat-chip--active";
  allChip.textContent = "All";
  allChip.addEventListener("click", () => {
    activeCategory = null;
    filterBar.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("cat-chip--active"));
    allChip.classList.add("cat-chip--active");
    renderRecipeList(activeCategory, searchQuery);
  });
  filterBar.appendChild(allChip);

  for (const cat of CATEGORY_ORDER) {
    const chip = document.createElement("button");

    chip.className = "cat-chip";
    chip.textContent = CATEGORY_LABELS[cat];
    chip.addEventListener("click", () => {
      activeCategory = cat;
      filterBar.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("cat-chip--active"));
      chip.classList.add("cat-chip--active");
      renderRecipeList(activeCategory, searchQuery);
    });
    filterBar.appendChild(chip);
  }

  // ── Search ─────────────────────────────────────────────────────────────
  el<HTMLInputElement>("recipe-search").addEventListener("input", (e) => {
    searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
    renderRecipeList(activeCategory, searchQuery);
  });

  // ── Playback buttons ───────────────────────────────────────────────────
  el("btn-play").addEventListener("click", () => {
    const tw = ensureTw();

    _tw = tw;
    startRaf();
    void tw.play().then(() => syncPlaybackUI());
  });

  el("btn-pause").addEventListener("click", () => {
    _tw?.pause();
    syncPlaybackUI();
  });

  el("btn-stop").addEventListener("click", () => {
    stopCurrent();
    _tw = buildTypewriter();
    syncPlaybackUI();
  });

  el("btn-replay").addEventListener("click", () => {
    const tw = ensureTw();

    _tw = tw;
    startRaf();
    void tw.replay().then(() => syncPlaybackUI());
  });

  el("btn-step-back").addEventListener("click", () => {
    const tw = ensureTw();

    _tw = tw;
    tw.stepBackward();
    syncPlaybackUI();
  });

  el("btn-step-fwd").addEventListener("click", () => {
    const tw = ensureTw();

    _tw = tw;
    tw.stepForward();
    syncPlaybackUI();
  });

  // ── Seek slider ────────────────────────────────────────────────────────
  const seekSlider = el<HTMLInputElement>("seek-slider");

  seekSlider.addEventListener("mousedown", () => {
    _isScrubbing = true;
  });

  seekSlider.addEventListener("touchstart", () => {
    _isScrubbing = true;
  });

  seekSlider.addEventListener("input", () => {
    const tw = ensureTw();

    _tw = tw;
    tw.seek(Number(seekSlider.value));
    el("time-current").textContent = formatMs(Number(seekSlider.value));
  });

  seekSlider.addEventListener("mouseup", () => {
    _isScrubbing = false;
    syncPlaybackUI();
  });

  seekSlider.addEventListener("touchend", () => {
    _isScrubbing = false;
    syncPlaybackUI();
  });

  // ── Rate slider ────────────────────────────────────────────────────────
  el<HTMLInputElement>("ctrl-rate").addEventListener("input", (e) => {
    const rate = Number.parseFloat((e.target as HTMLInputElement).value);

    el("ctrl-rate-label").textContent = `${rate}×`;
    _tw?.setRate(rate);
  });

  // ── Custom editor ──────────────────────────────────────────────────────
  el("btn-run").addEventListener("click", runCustomEditor);
  el("btn-clear").addEventListener("click", () => {
    stopCurrent();
    (el<HTMLTextAreaElement>("editor")).value = "";
    syncPlaybackUI();
  });

  el<HTMLTextAreaElement>("editor").addEventListener("keydown", (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runCustomEditor();
    }
  });

  // ── Initial render ─────────────────────────────────────────────────────
  applyDefaults(RECIPES[0]!.variants[0]!);
  renderRecipeList(null, "");
  renderVariantChips();
  updateSourcePanel();
  loadAndPlay();
}
