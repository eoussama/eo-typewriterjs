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
| `before` | `TCallbackHook` | Hook invoked before each step (or once for instant commands) |
| `after` | `TCallbackHook` | Hook invoked after each step (or once for instant commands) |
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

Every command accepts optional `before` and `after` lifecycle hooks. Both fire once per step for segmented commands (`type`, `delete`) and once total for instant commands (`move`, `select`, `style`, `wait`, `call`).

```ts
tw.timeline.type("Hello", {
  by: "char",
  interval: 80,
  before: ({ state, stepIndex, stepCount, unit }) => {
    console.log(`step ${stepIndex + 1}/${stepCount} (${unit}): "${state.document.text}"`);
  },
  after: ({ state }) => {
    console.log("after:", state.document.text);
  },
});
```

The hook function receives a `TCallbackContext`:

| Field | Type | Description |
|---|---|---|
| `state` | `TTypewriterState` | Current document and cursor snapshot |
| `stepIndex` | `number` | Zero-based index of the current step |
| `stepCount` | `number` | Total step count for the command |
| `unit` | `string \| null` | Advance unit for segmented commands, or `null` for instant commands |
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
