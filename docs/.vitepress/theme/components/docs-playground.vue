<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { usePlayground } from "../playground/use-playground";
import ConsolePanel from "./console-panel.vue";
import PlaybackBar from "./playback-bar.vue";



const props = withDefaults(defineProps<{
  code: string;
  attached?: boolean;
  collapsible?: boolean;
  showPreview?: boolean;
  note?: string;
}>(), {
  attached: true,
  collapsible: true,
  showPreview: true,
});

const root = ref<HTMLElement | null>(null);
const main = ref<HTMLElement | null>(null);
const extras = ref<HTMLElement | null>(null);
const collapsed = ref(false);
const pg = usePlayground({ main, extras, mode: ref("dom") });

// Logs appear as the playhead reaches the time they were written at.
const visibleLogs = computed(() => pg.logs.value.filter(entry => entry.time <= pg.currentTime.value || !pg.ready.value));
const label = computed(() => props.showPreview ? "Live preview" : "Playback (this example renders to a string, see the console)");

let observer: IntersectionObserver | null = null;

onMounted(() => {
  // Start playing once the example scrolls into view.
  observer = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) {
      observer?.disconnect();
      void pg.run(props.code);
    }
  }, { threshold: 0.25 });

  if (root.value !== null) {
    observer.observe(root.value);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<template>
  <div
    ref="root"
    class="pg-docs"
    :class="{ 'pg-docs--attached': props.attached, 'pg-docs--collapsed': collapsed }"
    data-testid="docs-playground"
  >
    <div class="pg-docs__header">
      <button
        v-if="props.collapsible"
        class="pg-docs__toggle"
        type="button"
        :aria-expanded="!collapsed"
        @click="collapsed = !collapsed"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5z" /></svg>
        {{ label }}
      </button>
      <span v-else class="pg-docs__title">{{ label }}</span>
      <span v-if="props.note" class="pg-docs__note" :title="props.note">{{ props.note }}</span>
    </div>

    <div v-show="!collapsed">
      <div v-show="props.showPreview" ref="main" class="pg-output pg-output--docs" data-testid="preview" />
      <div ref="extras" class="pg-extras" />

      <p v-if="pg.error.value" class="pg-error" role="alert">
        {{ pg.error.value.message }}
      </p>

      <ConsolePanel v-if="pg.logs.value.length > 0" :entries="visibleLogs" />

      <PlaybackBar :playground="pg" compact />
    </div>
  </div>
</template>
