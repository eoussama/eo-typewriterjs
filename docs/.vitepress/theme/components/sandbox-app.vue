<script setup lang="ts">
import type { EditorView } from "@codemirror/view";
import type { TRecipe, TRecipeCategory } from "../playground/recipe.type";
import type { TPreviewMode } from "../playground/use-playground";

import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { EPlaybackStatus } from "../../../../src/index";
import { createEditor, revealLine, setEditorCode } from "../playground/editor";
import { RECIPES } from "../playground/recipes";
import { usePlayground } from "../playground/use-playground";
import ConsolePanel from "./console-panel.vue";
import PlaybackBar from "./playback-bar.vue";



const DRAFT_KEY = "eo-typewriterjs:sandbox:draft";

const CATEGORIES: readonly { readonly id: TRecipeCategory | "all"; readonly label: string }[] = [
  { id: "all", label: "All" },
  { id: "basics", label: "Basics" },
  { id: "timing", label: "Timing" },
  { id: "editing", label: "Editing" },
  { id: "cursor", label: "Cursor" },
  { id: "styling", label: "Styling" },
  { id: "callbacks", label: "Callbacks" },
  { id: "audio", label: "Audio" },
];

const editorEl = ref<HTMLElement | null>(null);
const main = ref<HTMLElement | null>(null);
const extras = ref<HTMLElement | null>(null);
const mode = ref<TPreviewMode>("dom");
const pg = usePlayground({ main, extras, mode });

const editor = shallowRef<EditorView | null>(null);
const code = ref("");
const active = ref<TRecipe | null>(null);
const query = ref("");
const category = ref<TRecipeCategory | "all">("all");
const drawerOpen = ref(false);
const notice = ref("");
const shortcut = ref("Ctrl+Enter");

const recipes = computed(() => {
  const needle = query.value.trim().toLowerCase();

  return RECIPES.filter(recipe => (category.value === "all" || recipe.category === category.value)
    && (needle === "" || `${recipe.title} ${recipe.description}`.toLowerCase().includes(needle)));
});

const edited = computed(() => active.value !== null && code.value !== active.value.code);
const statusText = computed(() => {
  if (pg.error.value !== null) {
    return "Error";
  }

  if (pg.running.value && pg.status.value !== EPlaybackStatus.PLAYING) {
    return "Running";
  }

  return pg.status.value.charAt(0).toUpperCase() + pg.status.value.slice(1);
});

/**
 * @description
 * Encode code for the URL hash
 *
 * @param text - The code
 * @returns A base64url string
 */
function encode(text: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * @description
 * Decode code from the URL hash
 *
 * @param value - A base64url string
 * @returns The code, or null when it is not valid
 */
function decode(value: string): string | null {
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));

    return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
  }
  catch {
    return null;
  }
}

function flash(message: string): void {
  notice.value = message;
  setTimeout(() => {
    if (notice.value === message) {
      notice.value = "";
    }
  }, 2500);
}

function run(): void {
  void pg.run(code.value);
}

function setCode(next: string): void {
  code.value = next;

  if (editor.value !== null) {
    setEditorCode(editor.value, next);
  }
}

function loadRecipe(recipe: TRecipe, force = false): void {
  // A native confirm is accessible and blocks until answered, which is what this guard needs.
  // eslint-disable-next-line no-alert
  if (!force && edited.value && !window.confirm("Replace your changes with this recipe?")) {
    return;
  }

  active.value = recipe;
  drawerOpen.value = false;
  setCode(recipe.code);
  history.replaceState(null, "", `#recipe=${recipe.id}`);
  run();
}

function resetRecipe(): void {
  if (active.value !== null) {
    loadRecipe(active.value, true);
  }
}

async function share(): Promise<void> {
  const url = `${location.origin}${location.pathname}#code=${encode(code.value)}`;

  history.replaceState(null, "", url);

  try {
    await navigator.clipboard.writeText(url);
    flash("Link copied to the clipboard");
  }
  catch {
    flash("Copy failed: the link is in the address bar");
  }
}

watch(code, (value) => {
  try {
    localStorage.setItem(DRAFT_KEY, value);
  }
  catch {
    // Storage can be unavailable (private mode); the draft is only a convenience.
  }
});

watch(() => pg.error.value, (error) => {
  if (error?.line !== null && error?.line !== undefined && editor.value !== null) {
    revealLine(editor.value, error.line);
  }
});

function onKey(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    drawerOpen.value = false;
  }
}

onMounted(() => {
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  shortcut.value = mac ? "⌘ Enter" : "Ctrl+Enter";

  const hash = new URLSearchParams(location.hash.slice(1));
  const shared = hash.has("code") ? decode(hash.get("code")!) : null;
  const linked = RECIPES.find(recipe => recipe.id === hash.get("recipe"));
  let draft: string | null = null;

  try {
    draft = localStorage.getItem(DRAFT_KEY);
  }
  catch {
    draft = null;
  }

  active.value = linked ?? RECIPES[0]!;
  code.value = shared ?? (linked !== undefined ? linked.code : draft ?? RECIPES[0]!.code);

  if (editorEl.value !== null) {
    editor.value = createEditor({
      parent: editorEl.value,
      doc: code.value,
      label: "Snippet editor",
      onChange: (value) => {
        code.value = value;
      },
      onRun: run,
    });
  }

  window.addEventListener("keydown", onKey);
  run();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
  editor.value?.destroy();
});
</script>

<template>
  <div class="sb" :class="{ 'sb--drawer-open': drawerOpen }">
    <aside id="sb-recipes" class="sb-recipes" aria-label="Recipes">
      <div class="sb-recipes__head">
        <h2 class="sb-recipes__title">
          Recipes
        </h2>
        <label class="sb-search">
          <span class="pg-visually-hidden">Search recipes</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4a6 6 0 0 1 4.9 9.5l5.3 5.3-1.4 1.4-5.3-5.3A6 6 0 1 1 10 4zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" /></svg>
          <input v-model="query" type="search" placeholder="Search recipes" data-testid="recipe-search">
        </label>
        <div class="sb-chips" role="group" aria-label="Categories">
          <button
            v-for="item in CATEGORIES"
            :key="item.id"
            type="button"
            class="sb-chip"
            :aria-pressed="category === item.id"
            @click="category = item.id"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <ul class="sb-recipe-list">
        <li v-for="recipe in recipes" :key="recipe.id">
          <button
            type="button"
            class="sb-recipe"
            :aria-current="active?.id === recipe.id ? 'true' : undefined"
            :data-recipe="recipe.id"
            @click="loadRecipe(recipe)"
          >
            <span class="sb-recipe__title">{{ recipe.title }}</span>
            <span class="sb-recipe__desc">{{ recipe.description }}</span>
          </button>
        </li>
        <li v-if="recipes.length === 0" class="sb-recipe-list__empty">
          No recipe matches “{{ query }}”.
        </li>
      </ul>
    </aside>

    <button v-if="drawerOpen" class="sb-scrim" type="button" aria-label="Close recipes" @click="drawerOpen = false" />

    <section class="sb-workspace">
      <header class="sb-toolbar">
        <button
          class="sb-tool sb-tool--drawer"
          type="button"
          aria-controls="sb-recipes"
          :aria-expanded="drawerOpen"
          @click="drawerOpen = !drawerOpen"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" /></svg>
          <span>Recipes</span>
        </button>

        <div class="sb-toolbar__title">
          <strong>{{ active?.title ?? "Sandbox" }}</strong>
          <span v-if="edited" class="sb-badge">edited</span>
        </div>

        <span class="sb-status" :data-status="pg.error.value ? 'error' : pg.status.value" role="status" data-testid="status">{{ statusText }}</span>

        <button v-if="edited" class="sb-tool" type="button" title="Restore the recipe's code" @click="resetRecipe">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" /></svg>
          <span>Reset</span>
        </button>
        <button class="sb-tool" type="button" title="Copy a link to this code" @click="share">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7l-6.7 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1z" /></svg>
          <span>Share</span>
        </button>
        <button class="sb-tool sb-tool--run" type="button" :title="`Run (${shortcut})`" data-testid="run" @click="run">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          <span>Run</span>
          <kbd>{{ shortcut }}</kbd>
        </button>
      </header>

      <div class="sb-panes">
        <div class="sb-editor">
          <div ref="editorEl" class="sb-editor__host" data-testid="editor" />
        </div>

        <div class="sb-stage">
          <div class="sb-card">
            <div class="sb-card__head">
              <span class="sb-card__title">Preview</span>
              <div class="sb-segmented" role="group" aria-label="Renderer">
                <button type="button" :aria-pressed="mode === 'dom'" @click="mode = 'dom'; run()">
                  DOM
                </button>
                <button type="button" :aria-pressed="mode === 'text'" @click="mode = 'text'; run()">
                  Text
                </button>
              </div>
            </div>
            <div ref="main" class="pg-output pg-output--stage" :class="{ 'pg-output--text': mode === 'text' }" data-testid="preview" />
            <div ref="extras" class="pg-extras" :class="{ 'pg-extras--text': mode === 'text' }" data-testid="extras" />
            <p v-if="pg.error.value" class="pg-error" role="alert" data-testid="error">
              <span v-if="pg.error.value.line !== null">Line {{ pg.error.value.line }}: </span>{{ pg.error.value.message }}
            </p>
          </div>

          <PlaybackBar :playground="pg" />

          <div class="sb-card sb-card--console">
            <div class="sb-card__head">
              <span class="sb-card__title">Console</span>
            </div>
            <ConsolePanel :entries="pg.logs.value" />
          </div>
        </div>
      </div>
    </section>

    <p class="pg-visually-hidden" aria-live="polite">
      {{ notice }}
    </p>
    <div v-if="notice" class="sb-toast" aria-hidden="true">
      {{ notice }}
    </div>
  </div>
</template>
