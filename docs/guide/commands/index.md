# Commands

Commands are the building blocks of a typewriter animation. They are scheduled on the [`timeline`](/guide/timeline) and compiled into timed playback events when `play()` is called.

## Overview

| Command | Method | Advances clock? | Mutates document? |
|---|---|---|---|
| [Type](/guide/commands/type) | `.type(text, options?)` | ✅ yes | ✅ yes — inserts text |
| [Wait](/guide/commands/wait) | `.wait(duration)` | ✅ yes | ❌ no |
| [Delete](/guide/commands/delete) | `.delete(count, options?)` | ✅ yes | ✅ yes — removes text |
| [Move](/guide/commands/move) | `.move(index, options?)` | ❌ instant | ❌ no |
| [Select](/guide/commands/select) | `.select(count, options?)` | ❌ instant | ❌ no |
| [Unselect](/guide/commands/unselect) | `.unselect(options?)` | ❌ instant | ❌ no |
| [Style](/guide/commands/style) | `.style(style, range, options?)` | ❌ instant | ✅ yes — applies style |
| [Unstyle](/guide/commands/unstyle) | `.unstyle(range, options?)` | ❌ instant | ✅ yes — removes style |
| [Call](/guide/commands/call) | `.call(fn, options?)` | ❌ instant | ❌ no |

## Shared options

All commands accept the following options in addition to their own:

| Option | Type | Description |
|---|---|---|
| `before` | `TCallbackHook` | Hook invoked before the command (or before each step when `unit` is set) |
| `after` | `TCallbackHook` | Hook invoked after the command (or after each step when `unit` is set) |
| `audio` | `TAudioCommandOverride` | Per-command audio override — `false` to silence, or an object with voice/volume settings |

See [Hooks & Context](#hooks-and-context) below for the full hook shape.

## Timed vs instant commands

**Timed commands** produce one or more playback events spread over time. Each event fires at a scheduled timestamp and advances the document state one step at a time.

**Instant commands** produce a single event at the current clock position. They do not add any delay — if one follows a timed command, it fires at the exact moment the last step of that command completes.

## Cursor targeting

Most commands accept a `cursor` option (default: `"main"`) to target a specific cursor. Passing an array targets multiple cursors simultaneously.

```ts
// drives cursors "a" and "b" in parallel
tw.timeline.type("Hello", { cursor: ["a", "b"] });
```

See [Multi-cursor](/guide/commands/type#multi-cursor) in the type command docs for details.

## Hooks and context

Every command accepts optional `before` and `after` lifecycle hooks. Omit `unit` for a whole-command hook; set `unit` for a per-step hook that fires once per character, word, or other advance unit:

```ts
// Whole-command — fires once before/after the entire type command
tw.timeline.type("Hello", {
  by: "char",
  interval: 80,
  before: { callback: ({ state }) => console.log("start") },
  after:  { callback: ({ state }) => console.log("done") },
});

// Per-step — fires once per character
tw.timeline.type("Hello", {
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

The `callback` function receives a `TCallbackContext`:

| Field | Type | Description |
|---|---|---|
| `state` | `TTypewriterState` | Current document and cursor snapshot |
| `stepIndex` | `number` | Zero-based index of the current step (per-unit hooks only) |
| `stepCount` | `number` | Total step count for the command |
| `unit` | `string \| null` | Advance unit string, or `null` for whole-command hooks |
| `signal` | `AbortSignal` | Aborted when `tw.cancel()` is called |

## Command pages

- [type](/guide/commands/type)
- [wait](/guide/commands/wait)
- [delete](/guide/commands/delete)
- [move](/guide/commands/move)
- [select](/guide/commands/select)
- [unselect](/guide/commands/unselect)
- [style](/guide/commands/style)
- [unstyle](/guide/commands/unstyle)
- [call](/guide/commands/call)
