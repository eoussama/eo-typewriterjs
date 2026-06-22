<script setup lang="ts">
import type { TTypewriter } from "../../../../src/index";

import { onMounted, onUnmounted, ref } from "vue";

import { runSnippet } from "../../../../src/devtools/run-snippet.helper";
import { domRenderer, EPlaybackStatus } from "../../../../src/index";



const props = defineProps<{
  code: string;
  autorun?: boolean;
}>();

const previewEl = ref<HTMLElement | null>(null);
const playbackStatus = ref<string>(EPlaybackStatus.IDLE);
const errorMsg = ref<string | null>(null);
const isLoading = ref(false);

let tw: TTypewriter | null = null;
let rafId: number | null = null;

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

function tick(): void {
  if (tw === null) {
    return;
  }

  const s = tw.getState().status;

  playbackStatus.value = s;

  if (s === EPlaybackStatus.PLAYING) {
    rafId = requestAnimationFrame(tick);
  }
  else {
    rafId = null;
  }
}

async function rerun(): Promise<void> {
  if (previewEl.value === null) {
    return;
  }

  stopTick();
  tw?.stop();
  tw = null;
  previewEl.value.innerHTML = "";
  errorMsg.value = null;
  playbackStatus.value = EPlaybackStatus.IDLE;
  isLoading.value = true;

  const renderer = domRenderer(previewEl.value);

  const result = await runSnippet(props.code, renderer, (instance) => {
    tw = instance;
    playbackStatus.value = instance.getState().status;
    startTick();
  });

  isLoading.value = false;

  if (!result.ok) {
    errorMsg.value = result.error;

    return;
  }

  tw = result.tw;
  playbackStatus.value = tw.getState().status;
}

function play(): void {
  if (tw === null) {
    return;
  }

  startTick();
  tw.play().catch(() => null).finally(() => {
    stopTick();
    playbackStatus.value = tw?.getState().status ?? EPlaybackStatus.IDLE;
  });
}

function pause(): void {
  tw?.pause();
  stopTick();
  playbackStatus.value = tw?.getState().status ?? EPlaybackStatus.IDLE;
}

function stop(): void {
  tw?.stop();
  stopTick();

  if (previewEl.value !== null) {
    previewEl.value.innerHTML = "";
  }

  playbackStatus.value = EPlaybackStatus.IDLE;
}

function replay(): void {
  if (tw === null) {
    return;
  }

  startTick();
  tw.replay().catch(() => null).finally(() => {
    stopTick();
    playbackStatus.value = tw?.getState().status ?? EPlaybackStatus.IDLE;
  });
}

const isPlaying = () => playbackStatus.value === EPlaybackStatus.PLAYING;
const isPaused = () => playbackStatus.value === EPlaybackStatus.PAUSED;
const isStopped = () => playbackStatus.value === EPlaybackStatus.STOPPED;
const isIdle = () => playbackStatus.value === EPlaybackStatus.IDLE;
const isCompleted = () => playbackStatus.value === EPlaybackStatus.COMPLETED;

onMounted(() => {
  if (props.autorun !== false) {
    void rerun();
  }
});

onUnmounted(() => {
  stopTick();
  tw?.stop();
});
</script>

<template>
  <div class="docs-playground">
    <div class="docs-playground__header">
      <span class="docs-playground__label">Live Preview</span>
      <button
        class="docs-playground__rerun"
        title="Re-run snippet"
        :disabled="isLoading"
        @click="() => void rerun()"
      >
        ↺ Rerun
      </button>
    </div>

    <div ref="previewEl" class="docs-playground__preview" />

    <div v-if="errorMsg" class="docs-playground__error">
      {{ errorMsg }}
    </div>

    <div class="docs-playground__controls">
      <button
        class="docs-playground__btn"
        :class="{ 'docs-playground__btn--active': isPaused() || isStopped() }"
        :disabled="isPlaying() || isLoading || tw === null"
        title="Play"
        @click="play"
      >
        ▶
      </button>
      <button
        class="docs-playground__btn"
        :class="{ 'docs-playground__btn--active': isPaused() }"
        :disabled="!isPlaying() || isLoading"
        title="Pause"
        @click="pause"
      >
        ⏸
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
        ↩ Replay
      </button>
    </div>
  </div>
</template>

<style scoped>
.docs-playground {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  margin: 16px 0;
  background: var(--vp-c-bg-soft);
}

.docs-playground__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: var(--vp-c-bg-elv);
  border-bottom: 1px solid var(--vp-c-divider);
}

.docs-playground__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: var(--vp-font-family-mono);
}

.docs-playground__rerun {
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.docs-playground__rerun:hover:not(:disabled) {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.docs-playground__rerun:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.docs-playground__preview {
  min-height: 64px;
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

.docs-playground__controls {
  display: flex;
  gap: 6px;
  padding: 8px 14px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
}

.docs-playground__btn {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  font-family: var(--vp-font-family-mono);
  line-height: 1.4;
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
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
