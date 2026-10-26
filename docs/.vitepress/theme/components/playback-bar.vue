<script setup lang="ts">
import type { usePlayground } from "../playground/use-playground";

import { computed } from "vue";
import { EPlaybackStatus } from "../../../../src/index";
import { formatTime } from "../playground/use-playground";



const props = withDefaults(defineProps<{
  playground: ReturnType<typeof usePlayground>;
  compact?: boolean;
}>(), {
  compact: false,
});

const RATES = [0.25, 0.5, 1, 1.5, 2, 4] as const;

const pg = props.playground;
const playing = computed(() => pg.status.value === EPlaybackStatus.PLAYING);
const disabled = computed(() => !pg.ready.value);
const time = computed(() => `${formatTime(pg.currentTime.value)} / ${formatTime(pg.duration.value)}`);

function onSeek(event: Event): void {
  pg.seek(Number((event.target as HTMLInputElement).value));
}

function onRate(event: Event): void {
  pg.setRate(Number((event.target as HTMLSelectElement).value));
}
</script>

<template>
  <div class="pg-bar" :class="{ 'pg-bar--compact': props.compact }" role="toolbar" aria-label="Playback controls">
    <div class="pg-bar__buttons">
      <button class="pg-btn" type="button" aria-label="Step back" title="Step back" :disabled="disabled || playing" @click="pg.stepBackward()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9.5 12z" /></svg>
      </button>
      <button
        class="pg-btn pg-btn--primary"
        type="button"
        :aria-label="playing ? 'Pause' : 'Play'"
        :title="playing ? 'Pause' : 'Play'"
        :disabled="disabled"
        data-testid="play-toggle"
        @click="playing ? pg.pause() : pg.play()"
      >
        <svg v-if="playing" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
      </button>
      <button class="pg-btn" type="button" aria-label="Step forward" title="Step forward" :disabled="disabled || playing" @click="pg.stepForward()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l10.5-7z" /></svg>
      </button>
      <button class="pg-btn" type="button" aria-label="Replay" title="Replay from the start" :disabled="disabled" @click="pg.replay()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" /></svg>
      </button>
      <button class="pg-btn" type="button" aria-label="Stop" title="Stop" :disabled="disabled" @click="pg.stop()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12v12H6z" /></svg>
      </button>
    </div>

    <input
      class="pg-seek"
      type="range"
      min="0"
      step="1"
      aria-label="Seek"
      :max="pg.duration.value || 1"
      :value="pg.currentTime.value"
      :disabled="disabled"
      :aria-valuetext="time"
      data-testid="seek"
      @pointerdown="pg.scrubbing.value = true"
      @pointerup="pg.scrubbing.value = false"
      @blur="pg.scrubbing.value = false"
      @input="onSeek"
    >

    <span class="pg-time" data-testid="time">{{ time }}</span>

    <template v-if="!props.compact">
      <label class="pg-rate">
        <span class="pg-visually-hidden">Speed</span>
        <select :value="pg.rate.value" :disabled="disabled" @change="onRate">
          <option v-for="rate in RATES" :key="rate" :value="rate">{{ rate }}×</option>
        </select>
      </label>
      <button
        class="pg-btn"
        type="button"
        :aria-label="pg.muted.value ? 'Unmute' : 'Mute'"
        :title="pg.muted.value ? 'Unmute' : 'Mute'"
        :aria-pressed="pg.muted.value"
        @click="pg.setMuted(!pg.muted.value)"
      >
        <svg v-if="pg.muted.value" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9zm13.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z" /></svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" /></svg>
      </button>
    </template>
  </div>
</template>
