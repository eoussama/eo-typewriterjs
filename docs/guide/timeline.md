# Timeline

The `TimelineBuilder` is the central interface for defining what the typewriter produces. It works at two levels:

- **Commands**: an ordered list of typed instructions (`type`, `delete`, `wait`, etc.) stored on the builder. `play()` and `replay()` execute these sequentially through an async executor.
- **Compiled events**: a flat, time-sorted array of `TTimelineEvent` objects derived from the command list. `seek()`, `stepForward()`, and `stepBackward()` navigate this event stream using a checkpoint model.

The two levels are complementary. Commands carry lifecycle hooks and async callbacks that only run during sequential execution. Compiled events provide the positional data needed for instant, deterministic state reconstruction.

## Accessing the timeline

Every typewriter instance exposes a `timeline` property:

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";

const tw = createTypewriter({ renderer: domRenderer(el) });

tw.timeline
  .type("Hello world", { by: "char", interval: 80 })
  .wait(500)
  .delete(-5);

await tw.play();
```

## Chaining

All `TimelineBuilder` methods return `this`, so calls chain fluently:

```ts
tw.timeline
  .type("Loading", { interval: 80 })
  .type("...", { interval: 300 })
  .wait(400)
  .delete(-6, { interval: 1 })
  .type("ed!", { by: "word" });
```

Commands are appended in the order they are called.

## Commands

| Command | Method | Compiled timeline effect |
|---|---|---|
| [Type](/guide/commands/type) | `.type(text, options?)` | One event per step, advances clock |
| [Delete](/guide/commands/delete) | `.delete(value, options?)` | One event per step for numeric counts; one instant event for boundary strings |
| [Move](/guide/commands/move) | `.move(value, options?)` | One event per cursor, advances clock |
| [Wait](/guide/commands/wait) | `.wait(duration)` | No events, advances clock |
| [Select](/guide/commands/select) | `.select(value, options?)` | One event per cursor, advances clock |
| [Unselect](/guide/commands/unselect) | `.unselect(options?)` | One instant event per cursor, does not advance clock |
| [Style](/guide/commands/style) | `.style(style, range, options?)` | One instant event; one per cursor when range is `"selection"`, does not advance clock |
| [Unstyle](/guide/commands/unstyle) | `.unstyle(range, options?)` | One instant event; one per cursor when range is `"selection"`, does not advance clock |
| [Call](/guide/commands/call) | `.call(fn, options?)` | No compiled events, runtime only |

See the [Commands overview](/guide/commands/) for the full reference.

## Timing model

The compiler maintains an internal clock cursor starting at `0 ms`. Each command is placed relative to that cursor:

- `type` advances the clock by the total duration of all its steps.
- `delete` advances the clock when given a numeric count (`steps × interval`). When given a boundary string (`"start"`, `"end"`, `"whole"`), it compiles to a single instant event and does not advance the clock.
- `wait` advances the clock by its `duration` without producing any state-changing events.
- `move` and `select` each compile to one event per targeted cursor and advance the clock by `interval` (or the default 50 ms) once per command.
- `unselect`, `style`, and `unstyle` are compiled at the current clock position without advancing it. If one of these follows a timed command, its compiled event is placed at that command's ending timestamp.
- `call` has no compiled representation at all. It does not appear in the event stream and does not affect the clock.

## Playback paths

The player uses two distinct paths depending on the operation:

**Sequential execution**: used by `play()` and `replay()`

Commands are run one by one through an async executor. Each step applies a state mutation, calls `renderer.render()`, and honors any configured `before`/`after` hooks. Async `.call()` callbacks are awaited before the next command begins.

**Event-based navigation**: used by `seek()`, `stepForward()`, and `stepBackward()`

The player reconstructs state by replaying compiled events up to a target position. It uses a checkpoint system (a snapshot stored every 50 events) to avoid reprocessing the full event list on every operation.

Because `.call()` has no compiled events, it does not fire during event-based navigation. Lifecycle hooks also only run during sequential execution, not during seek or step reconstruction.

## Replaying

Commands are stored on the builder and the compiled output is cached. The same animation can be replayed without rebuilding or recompiling the timeline unless commands have been added since the last compile:

```ts
await tw.play();
await tw.replay();
```

## Inspecting commands

The `commands` property exposes the raw ordered command list:

```ts
console.log(tw.timeline.commands); // ReadonlyArray<TCommand>
```

## Lifecycle hooks

Every command accepts optional `before` and `after` hooks. For segmented commands (`type`, `delete`) they fire once per step. For all other commands they fire once around the single operation.

These hooks only execute during sequential playback (`play()`, `replay()`). They are not invoked during `seek()` or stepping.

See [Hooks & Context](/guide/commands/#hooks-and-context) for the full reference.

## Type reference

- [`TimelineBuilder`](/api/classes/TimelineBuilder)
- [`TCommand`](/api/type-aliases/TCommand)
- [`TCommandHookOptions`](/api/type-aliases/TCommandHookOptions)
