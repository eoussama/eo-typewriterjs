<script setup lang="ts">
import type { TLogEntry } from "../playground/use-playground";

import { formatTime } from "../playground/use-playground";



const props = defineProps<{
  entries: readonly TLogEntry[];
}>();
</script>

<template>
  <div class="pg-console" role="log" aria-label="Console" aria-live="polite" data-testid="console">
    <p v-if="props.entries.length === 0" class="pg-console__empty">
      console.log output appears here.
    </p>
    <div
      v-for="(entry, i) in props.entries"
      :key="i"
      class="pg-console__line"
      :class="`pg-console__line--${entry.level}`"
    >
      <span class="pg-console__time">{{ formatTime(entry.time) }}</span>
      <span class="pg-console__text">{{ entry.text }}</span>
    </div>
  </div>
</template>
