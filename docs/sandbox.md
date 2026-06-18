---
title: Sandbox
---

# Interactive Sandbox

The sandbox is a standalone development playground where you can run custom typewriter snippets in real time directly against the library source — no build step required.

## Start the sandbox

```bash
pnpm sandbox
```

This opens the sandbox at **`http://localhost:5174`**.

## Features

- **Live preview** — rendered output appears in the DOM or String renderer panel as the animation plays
- **Transport controls** — Play, Pause, Stop, Replay, Step Forward, Step Backward, and a rate slider
- **Recipe picker** — categorised one-click examples covering every feature area
- **Code editor** — edit any snippet directly; `Ctrl+S` / `Ctrl+Enter` to run
- **Copy button** — copy the current editor content to clipboard
- **Error panel** — runtime and TypeScript errors surface inline

## Globals available in the editor

Every snippet has the following identifiers in scope — no imports needed:

| Identifier | Description |
|---|---|
| `createTypewriter` | Factory — create a `TTypewriter` instance |
| `renderer` | The currently selected sandbox renderer |
| `domRenderer` | Create a DOM renderer for an `HTMLElement` |
| `StringRenderer` | Headless plain-text renderer class |
| `TimelineBuilder` | Fluent timeline builder |
| `ECommandKind` | Command kind enum-like object |
| `EPlaybackStatus` | Playback status enum-like object |
| `ECursorKind` | Cursor kind enum-like object (`PIPE`, `BLOCK`, `UNDERSCORE`, …) |
| `EAudioStrategy` | Audio strategy enum-like object (`RANDOM`, `SHUFFLE`, `ROUND_ROBIN`) |

## Recipe categories

| Category | What it covers |
|---|---|
| **Basics** | Hello World, multiline, word-by-word typing |
| **Timing** | Intervals, waits, dramatic pauses |
| **Editing** | Delete, retype, typo correction, insert in middle |
| **Cursor** | `moveCursor()`, `select()`, cursor kinds, animations, runtime swap |
| **Styling** | `mark()`, highlights, layered marks, gradient banners |
| **Callbacks** | `call()`, async callbacks, `before`/`after` hooks, `cancel()` |
| **Audio** | Enabling sound, custom voices, strategies, per-command override |
| **Advanced** | Rate control, looping, combined multi-feature demos |

## Callback features

The sandbox fully supports the callback and cancel APIs introduced alongside the async command executor.

### `call()` command

Schedule an inline callback anywhere in the timeline:

```js
tw.timeline
  .type("Hello", { by: "char", interval: 80 })
  .call(({ state }) => {
    console.log("Typed so far:", state.document.text);
  })
  .type(" world", { by: "char", interval: 80 });

await tw.play();
```

Async callbacks are awaited before playback continues:

```js
tw.timeline
  .type("Fetching...", { by: "char", interval: 70 })
  .call(async () => {
    await fetch("/api/data");
  })
  .type(" Done!", { by: "char", interval: 70 });

await tw.play();
```

### `before` / `after` hooks

Every command accepts optional `before` and `after` hooks. Omit `unit` for a whole-command hook; include `unit` for a per-step hook:

```js
// Whole-command — fires once before/after the entire type command
tw.timeline.type("Hi", {
  by: "char",
  interval: 80,
  before: { callback: ({ state }) => console.log("start") },
  after: { callback: ({ state }) => console.log("done") },
});

// Per-unit — fires once per character
tw.timeline.type("Hi", {
  by: "char",
  interval: 80,
  after: {
    unit: "char",
    callback: ({ stepIndex, stepCount }) => {
      console.log(`${stepIndex + 1} / ${stepCount}`);
    },
  },
});
```

### `cancel()`

Stop playback at any point, preserving the current rendered output:

```js
tw.timeline.type("Long text...", { by: "char", interval: 120 });

setTimeout(() => tw.cancel(), 500);

await tw.play();
// Status is CANCELLED; partial text stays on screen
```

You can also cancel from inside a `call()` callback or a hook:

```js
tw.timeline
  .type("Stop here.", { by: "char", interval: 70 })
  .call(() => { tw.cancel(); })
  .type(" (never reached)", { by: "char", interval: 70 });

await tw.play();
```

## Runtime methods

All runtime methods are available on the `TTypewriter` instance returned by `createTypewriter()`:

| Method | Description |
|---|---|
| `tw.play()` | Start or resume playback — returns `Promise<void>` |
| `tw.pause()` | Pause at the current position |
| `tw.stop()` | Stop and reset to blank state |
| `tw.replay()` | Restart from the beginning — returns `Promise<void>` |
| `tw.cancel()` | Stop, preserving the current output — status → `CANCELLED` |
| `tw.seek(ms)` | Jump to an absolute timeline position in milliseconds |
| `tw.stepForward()` | Apply the next event group and pause |
| `tw.stepBackward()` | Undo the last event group and pause |
| `tw.setRate(n)` | Set playback speed multiplier (e.g. `2` = double speed) |
| `tw.getState()` | Returns `{ status, currentTime, duration, rate }` |
| `tw.getLiveState()` | Returns the current document, cursors, and selections |
| `tw.setAudioEnabled(bool)` | Toggle typing sounds on/off at runtime |
| `tw.setAudioVolume(n)` | Set master volume, clamped to `[0, 1]` |
| `tw.setAudioOptions(opts)` | Replace the full audio config at runtime |
| `tw.getAudioOptions()` | Current audio config snapshot, or `null` |
| `tw.setCursorVisible(bool, cursor?)` | Show or hide one or all cursors |
| `tw.setCursorOptions(opts, cursor?)` | Update render options for one or all cursors |

## Usage

1. Pick a **Recipe** from the side panel or write your own code in the editor
2. Press **▶ Run** or `Ctrl+Enter` / `Ctrl+S` to execute
3. Use the transport controls to **Play**, **Pause**, **Stop**, **Replay**, or step through events
4. Adjust the **Rate** slider to speed up or slow down playback
5. Switch between **DOM** and **String** renderer using the dropdown
