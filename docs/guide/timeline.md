# Timeline

The `TimelineBuilder` is the primary interface for scheduling what the typewriter produces. Commands are stored in declaration order and compiled into a flat, time-sorted list of playback events when `play()` is called.

## Accessing the timeline

Every typewriter instance exposes a `timeline` property:

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const tw = createTypewriter({ renderer: domRenderer(el) });

tw.timeline
  .type("Hello world", { by: "char", interval: 80 })
  .wait(500)
  .delete(5);

await tw.play();
```

## Chaining

All `TimelineBuilder` methods return `this`, so calls can be chained fluently:

```ts
tw.timeline
  .type("Loading", { interval: 80 })
  .type("...", { interval: 300 })
  .wait(400)
  .delete(3, { interval: 80 })
  .type("!", { interval: 1 });
```

Commands are appended in the order they are called.

## Commands

| Command | Method | Advances clock? |
|---|---|---|
| [Type](/guide/commands/type) | `.type(text, options?)` | ✅ yes |
| [Wait](/guide/commands/wait) | `.wait(duration)` | ✅ yes |
| [Delete](/guide/commands/delete) | `.delete(count, options?)` | ✅ yes |
| [Move Cursor](/guide/commands/move-cursor) | `.moveCursor(index, options?)` | ❌ instant |
| [Select](/guide/commands/select) | `.select(count, options?)` | ❌ instant |
| [Mark](/guide/commands/mark) | `.mark(style, range, options?)` | ❌ instant |
| [Call](/guide/commands/call) | `.call(fn, options?)` | ❌ instant |

See the [Commands overview](/guide/commands/) for the full reference.

## Timing model

- The timeline has an internal **clock cursor** that starts at `0 ms`.
- Commands that produce events (`type`, `delete`) advance the clock by `count × interval` ms.
- `.wait(duration)` advances the clock by `duration` ms without producing any events.
- Instant commands (`moveCursor`, `select`, `mark`, `call`) do **not** advance the clock — they execute at the current clock position.

Instant commands placed after a timed command fire at the exact timestamp of that command's last step.

## Compilation

When `play()` (or `replay()`) is called, the player calls `compile(tw.timeline.commands)` internally, which converts the command list into a flat, time-sorted array of `TTimelineEvent` objects. You do not need to trigger compilation manually.

The compiled events are cached and reused as long as the command list has not changed (tracked via the `version` counter on `TimelineBuilder`).

## Replaying

Because commands are stored in the builder, the same animation can be replayed without rebuilding the timeline:

```ts
await tw.play(); // first run
await tw.replay(); // replays the same sequence
```

## Inspecting commands

```ts
console.log(tw.timeline.commands);
// ReadonlyArray<TCommand>
```

The `commands` property exposes the raw ordered command list for debugging or introspection.

## Lifecycle hooks

Every command accepts optional `before` and `after` hooks. These are useful for observing or reacting to each step without scheduling a separate `.call()` command. See [Hooks & Context](/guide/commands/#hooks-and-context) for the full reference.

## Type reference

- [`TimelineBuilder`](/api/classes/TimelineBuilder)
- [`TCommand`](/api/type-aliases/TCommand)
- [`TCommandHookOptions`](/api/type-aliases/TCommandHookOptions)
