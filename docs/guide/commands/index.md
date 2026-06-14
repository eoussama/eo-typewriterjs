# Commands

Commands are the building blocks of a typewriter animation. They are scheduled on the [`timeline`](/guide/timeline) and compiled into timed playback events when `play()` is called.

## Overview

| Command | Method | Advances clock? | Mutates document? |
|---|---|---|---|
| [Type](/guide/commands/type) | `.type(text, options?)` | ✅ yes | ✅ yes — inserts text |
| [Wait](/guide/commands/wait) | `.wait(duration)` | ✅ yes | ❌ no |
| [Delete](/guide/commands/delete) | `.delete(count, options?)` | ✅ yes | ✅ yes — removes text |
| [Move Cursor](/guide/commands/move-cursor) | `.moveCursor(index, options?)` | ❌ instant | ❌ no |
| [Select](/guide/commands/select) | `.select(count, options?)` | ❌ instant | ❌ no |
| [Mark](/guide/commands/mark) | `.mark(style, range, options?)` | ❌ instant | ✅ yes — applies style |

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

## Command pages

- [type](/guide/commands/type)
- [wait](/guide/commands/wait)
- [delete](/guide/commands/delete)
- [moveCursor](/guide/commands/move-cursor)
- [select](/guide/commands/select)
- [mark](/guide/commands/mark)
