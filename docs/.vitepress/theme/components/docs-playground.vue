<script setup lang="ts">
import type { TTypewriter } from "../../../../src/index";

import { computed, onMounted, onUnmounted, ref } from "vue";

import { runSnippet } from "../../../../src/devtools/run-snippet.helper";
import { domRenderer, EPlaybackStatus } from "../../../../src/index";



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

const previewEl = ref<HTMLElement | null>(null);
const playbackStatus = ref<string>(EPlaybackStatus.IDLE);
const currentTime = ref(0);
const duration = ref(0);
const errorMsg = ref<string | null>(null);
const isLoading = ref(false);
const isCollapsed = ref(false);
const isConsoleOpen = ref(false);

type TLogEntry = { level: string; text: string };

const logs = ref<TLogEntry[]>([]);

let tw: TTypewriter | null = null;
let rafId: number | null = null;

// Wall-clock baseline for estimating currentTime during async playback.
// Only set when play() / replay() is explicitly called from the UI.
let playStartWall = 0;
let playStartTimeline = 0;

function startTick(): void {
  stopTick();
  rafId = requestAnimationFrame(tick);
}

function stopTick(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function syncState(): void {
  if (tw === null) {
    return;
  }

  const s = tw.getState();

  playbackStatus.value = s.status;
  currentTime.value = s.currentTime;
  // Duration is monotonic: once the controller reports a positive value, keep it.
  if (s.duration > 0) {
    duration.value = s.duration;
  }
}

function tick(): void {
  if (tw === null) {
    return;
  }

  const s = tw.getState();

  playbackStatus.value = s.status;

  if (s.duration > 0) {
    duration.value = s.duration;
  }

  if (s.status === EPlaybackStatus.PLAYING) {
    // Estimate currentTime from wall clock because the async executor path
    // does not update _currentTime until completion.
    const elapsed = (Date.now() - playStartWall) * s.rate;

    currentTime.value = Math.min(playStartTimeline + elapsed, duration.value);
    rafId = requestAnimationFrame(tick);
  }
  else {
    currentTime.value = s.currentTime;
    rafId = null;
  }
}

async function boot(): Promise<void> {
  if (previewEl.value === null) {
    return;
  }

  stopTick();
  tw?.stop();
  tw = null;
  previewEl.value.innerHTML = "";
  errorMsg.value = null;
  playbackStatus.value = EPlaybackStatus.IDLE;
  currentTime.value = 0;
  duration.value = 0;
  logs.value = [];
  isLoading.value = true;

  const renderer = props.showPreview ? domRenderer(previewEl.value) : domRenderer(document.createElement("div"));

  const result = await runSnippet(
    props.code,
    renderer,
    undefined,
    (level, line) => {
      logs.value = [...logs.value, { level, text: line }];
      isConsoleOpen.value = true;
    },
  );

  isLoading.value = false;

  if (!result.ok) {
    errorMsg.value = result.error;

    return;
  }

  tw = result.tw;

  // The snippet has fully executed (including any await tw.play()).
  // Duration is now set. Sync once, then give the browser one more frame
  // to flush any in-flight state so the reactive values are accurate.
  syncState();

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      syncState();
      resolve();
    });
  });
}

function play(): void {
  if (tw === null) {
    return;
  }

  logs.value = [];

  const s = tw.getState();

  playStartWall = Date.now();
  playStartTimeline = s.currentTime;
  startTick();

  tw.play()
    .catch(() => null)
    .finally(() => {
      stopTick();
      syncState();
    });
}

function pause(): void {
  tw?.pause();
  stopTick();
  syncState();
}

function stop(): void {
  tw?.stop();
  stopTick();

  if (previewEl.value !== null) {
    previewEl.value.innerHTML = "";
  }

  playbackStatus.value = EPlaybackStatus.IDLE;
  currentTime.value = 0;
}

function replay(): void {
  if (tw === null) {
    return;
  }

  logs.value = [];

  playStartWall = Date.now();
  playStartTimeline = 0;
  startTick();

  tw.replay()
    .catch(() => null)
    .finally(() => {
      stopTick();
      syncState();
    });
}

function stepForward(): void {
  if (tw === null) {
    return;
  }

  tw.stepForward();
  syncState();
}

function stepBackward(): void {
  if (tw === null) {
    return;
  }

  tw.stepBackward();
  syncState();
}

function onSeek(e: Event): void {
  if (tw === null) {
    return;
  }

  const target = e.target as HTMLInputElement;
  const ms = Number(target.value);

  tw.seek(ms);

  if (tw.getState().status === EPlaybackStatus.PLAYING) {
    playStartWall = Date.now();
    playStartTimeline = ms;
  }

  syncState();
}

function formatTime(ms: number): string {
  const clamped = Math.max(0, ms);

  if (clamped < 1000) {
    return `${Math.round(clamped)}ms`;
  }

  const totalSec = clamped / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  const tenths = Math.floor((clamped % 1000) / 100);

  if (min === 0) {
    return `${sec}.${tenths}s`;
  }

  return `${min}:${String(sec).padStart(2, "0")}.${tenths}`;
}

const headerLabel = computed(() =>
  props.showPreview
    ? "Live Preview"
    : "Playback - string renderer writes to memory, not the DOM.",
);

const headerArrow = computed(() => (isCollapsed.value ? "▲" : "▼"));

const isPlaying = () => playbackStatus.value === EPlaybackStatus.PLAYING;
const isPaused = () => playbackStatus.value === EPlaybackStatus.PAUSED;
const isIdle = () => playbackStatus.value === EPlaybackStatus.IDLE;
const isStopped = () => playbackStatus.value === EPlaybackStatus.STOPPED;
const isCompleted = () => playbackStatus.value === EPlaybackStatus.COMPLETED;
const canStep = () => tw !== null && !isLoading.value && !isPlaying() && !isIdle();

onMounted(() => {
  void boot();
});

onUnmounted(() => {
  stopTick();
  tw?.stop();
});
</script>

<template>
  <div
    class="docs-playground"
    :class="{
      'docs-playground--attached': props.attached,
      'docs-playground--collapsed': isCollapsed,
    }"
  >
    <div
      class="docs-playground__header"
      :class="{ 'docs-playground__header--collapsible': props.collapsible }"
      :title="props.collapsible ? (isCollapsed ? 'Expand' : 'Collapse') : undefined"
      @click="props.collapsible && (isCollapsed = !isCollapsed)"
    >
      <span v-if="props.collapsible" class="docs-playground__header-arrow">{{ headerArrow }}</span>
      <span class="docs-playground__label">{{ headerLabel }}</span>
      <span class="docs-playground__header-spacer" />
      <span
        v-if="props.note"
        class="docs-playground__note"
        :title="props.note"
        @click.stop
      >?</span>
    </div>

    <div v-show="!isCollapsed">
      <div v-if="props.showPreview" ref="previewEl" class="docs-playground__preview" />
      <div v-else ref="previewEl" style="display:none" aria-hidden="true" />

      <div v-if="errorMsg" class="docs-playground__error">
        {{ errorMsg }}
      </div>

      <div v-if="logs.length > 0" class="docs-playground__console">
        <div class="docs-playground__console-header" @click="isConsoleOpen = !isConsoleOpen">
          <span class="docs-playground__console-label">Console ({{ logs.length }})</span>
          <span class="docs-playground__console-toggle">{{ isConsoleOpen ? '▼' : '▲' }}</span>
        </div>
        <div v-show="isConsoleOpen" class="docs-playground__console-body">
          <div
            v-for="(entry, i) in logs"
            :key="i"
            class="docs-playground__log"
            :class="`docs-playground__log--${entry.level}`"
          >
            <span class="docs-playground__log-level">{{ entry.level }}</span>
            <span class="docs-playground__log-text">{{ entry.text }}</span>
          </div>
        </div>
      </div>

      <div class="docs-playground__bar">
        <button
          class="docs-playground__btn"
          :disabled="!canStep()"
          title="Step backward"
          @click="stepBackward"
        >
          ⏮
        </button>
        <button
          class="docs-playground__btn"
          :class="{ 'docs-playground__btn--active': isPaused() || isStopped() }"
          :disabled="isLoading || tw === null || isCompleted()"
          :title="isPlaying() ? 'Pause' : 'Play'"
          @click="isPlaying() ? pause() : play()"
        >
          {{ isPlaying() ? '⏸' : '▶' }}
        </button>
        <button
          class="docs-playground__btn"
          :disabled="isIdle() || isStopped() || isLoading || tw === null"
          title="Stop"
          @click="stop"
        >
          ⏹
        </button>
        <button
          class="docs-playground__btn"
          :class="{ 'docs-playground__btn--active': isCompleted() }"
          :disabled="isIdle() || isLoading || tw === null"
          title="Replay from start"
          @click="replay"
        >
          ↩
        </button>
        <button
          class="docs-playground__btn"
          :disabled="!canStep()"
          title="Step forward"
          @click="stepForward"
        >
          ⏭
        </button>

        <input
          class="docs-playground__seek"
          type="range"
          :min="0"
          :max="duration || 1"
          :value="currentTime"
          :disabled="tw === null || isLoading || isIdle() || isStopped()"
          @input="onSeek"
        >

        <span class="docs-playground__time">
          {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style>
html:not(.dark) .docs-playground {
  border-color: #d1d5db;
  background: #f9fafb;
}

html:not(.dark) .docs-playground__header,
html:not(.dark) .docs-playground__bar,
html:not(.dark) .docs-playground__console-header {
  background: #edf0f4;
  border-color: #d1d5db;
}

html:not(.dark) .docs-playground__preview {
  background: #ffffff;
}

html:not(.dark) .docs-playground__label {
  color: var(--vp-c-brand-2, #3451b2);
}

html:not(.dark) .docs-playground__console-body {
  background: #ffffff;
}

html:not(.dark) .docs-playground__log {
  border-color: #e5e7eb;
}

html:not(.dark) .docs-playground__btn {
  background: #ffffff;
  border-color: #c8cdd5;
  color: #374151;
}

html:not(.dark) .docs-playground__btn:hover:not(:disabled) {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

html:not(.dark) .docs-playground__btn--active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

html:not(.dark) .docs-playground__time {
  color: #6b7280;
}

html:not(.dark) .docs-playground__console-label {
  color: #6b7280;
}

html:not(.dark) .docs-playground__header-arrow {
  color: #9ca3af;
}

html:not(.dark) .docs-playground__note {
  color: #9ca3af;
}
</style>

<style scoped>
.docs-playground {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  margin: 16px 0;
  background: var(--vp-c-bg-soft);
}

.docs-playground.docs-playground--attached {
  margin-top: 0;
}

.docs-playground__header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 10px;
  height: 36px;
  background: var(--vp-c-bg-elv);
  border-bottom: 1px solid var(--vp-c-divider);
  user-select: none;
}

.docs-playground--collapsed .docs-playground__header {
  border-bottom: none;
}

.docs-playground__header--collapsible {
  cursor: pointer;
}

.docs-playground__header--collapsible:hover .docs-playground__label {
  color: var(--vp-c-brand-1);
}

.docs-playground__header-arrow {
  font-size: 10px;
  color: var(--vp-c-text-3);
  margin-right: 6px;
  flex-shrink: 0;
  transition: color 0.15s;
}

.docs-playground__header--collapsible:hover .docs-playground__header-arrow {
  color: var(--vp-c-brand-1);
}

.docs-playground__label {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: var(--vp-font-family-mono);
  transition: color 0.15s;
}

.docs-playground__header-spacer {
  flex: 1;
}

.docs-playground__note {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 10px;
  font-weight: 700;
  font-family: var(--vp-font-family-base);
  border-radius: 50%;
  border: 1.5px solid var(--vp-c-text-3);
  color: var(--vp-c-text-3);
  cursor: help;
  flex-shrink: 0;
  transition: color 0.15s, border-color 0.15s;
  line-height: 1;
}

.docs-playground__note:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.docs-playground__preview {
  min-height: 60px;
  padding: 20px 24px;
  font-family: var(--vp-font-family-mono);
  font-size: 1rem;
  color: var(--vp-c-text-1);
  white-space: pre;
  word-break: break-all;
}

.docs-playground__error {
  padding: 10px 14px;
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-danger-1, #f43f5e);
  background: var(--vp-c-danger-soft, rgba(244, 63, 94, 0.08));
  border-top: 1px solid var(--vp-c-danger-2, rgba(244, 63, 94, 0.3));
}

.docs-playground__console {
  border-top: 1px solid var(--vp-c-divider);
}

.docs-playground__console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  height: 32px;
  background: var(--vp-c-bg-elv);
  cursor: pointer;
  user-select: none;
}

.docs-playground__console-header:hover .docs-playground__console-label {
  color: var(--vp-c-brand-1);
}

.docs-playground__console-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2);
  transition: color 0.15s;
}

.docs-playground__console-toggle {
  font-size: 10px;
  color: var(--vp-c-text-3);
}

.docs-playground__console-body {
  max-height: 160px;
  overflow-y: auto;
  background: var(--vp-c-bg);
}

.docs-playground__log {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 3px 14px;
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  border-bottom: 1px solid var(--vp-c-divider);
}

.docs-playground__log:last-child {
  border-bottom: none;
}

.docs-playground__log-level {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  min-width: 36px;
  opacity: 0.6;
}

.docs-playground__log--warn {
  background: var(--vp-c-warning-soft, rgba(234, 179, 8, 0.08));
  color: var(--vp-c-warning-1, #ca8a04);
}

.docs-playground__log--error {
  background: var(--vp-c-danger-soft, rgba(244, 63, 94, 0.08));
  color: var(--vp-c-danger-1, #f43f5e);
}

.docs-playground__log-text {
  flex: 1;
  color: var(--vp-c-text-2);
  word-break: break-all;
  white-space: pre-wrap;
}

.docs-playground__log--warn .docs-playground__log-text,
.docs-playground__log--error .docs-playground__log-text {
  color: inherit;
}

.docs-playground__bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  height: 44px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
}

.docs-playground__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 14px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  font-family: var(--vp-font-family-mono);
  flex-shrink: 0;
}

.docs-playground__btn:hover:not(:disabled) {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.docs-playground__btn--active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.docs-playground__btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.docs-playground__seek {
  flex: 1;
  height: 4px;
  cursor: pointer;
  accent-color: var(--vp-c-brand-1);
  margin: 0 8px;
}

.docs-playground__seek:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.docs-playground__time {
  font-size: 11px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
