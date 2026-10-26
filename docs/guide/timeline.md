<script setup>
const timelineAccessCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Hello world", { by: "char", interval: 80 })
  .wait(500)
  .delete(-5);

await tw.play();`;

const timelineChainingCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Loading", { interval: 80 })
  .type("...", { interval: 300 })
  .wait(400)
  .delete(-6, { interval: 1 })
  .type("ed!", { by: "word" });

await tw.play();`;
</script>

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

<DocsPlayground :code="timelineAccessCode" />

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

<DocsPlayground :code="timelineChainingCode" />

## Commands

| Command | Method | Compiled timeline effect |
|---|---|---|
| [Type](/guide/commands/type) | `.type(text, options?)` | One event per step, advances clock |
| [Delete](/guide/commands/delete) | `.delete(value, options?)` | One event per step for numeric counts; one instant event for boundary strings |
| [Move](/guide/commands/move) | `.move(value, options?)` | One event per step per cursor for numeric offsets; one event per cursor for boundaries; advances clock |
| [Wait](/guide/commands/wait) | `.wait(duration)` | No events, advances clock |
| [Select](/guide/commands/select) | `.select(value, options?)` | One event per step per cursor for numeric counts; one event per cursor for boundaries; advances clock |
| [Unselect](/guide/commands/unselect) | `.unselect(options?)` | One instant event per cursor, does not advance clock |
| [Style](/guide/commands/style) | `.style(style, range, options?)` | One instant event; one per cursor when range is `"selection"`, does not advance clock |
| [Unstyle](/guide/commands/unstyle) | `.unstyle(range, options?)` | One instant event; one per cursor when range is `"selection"`, does not advance clock |
| [Call](/guide/commands/call) | `.call(fn, options?)` | A step without state events; the clock waits for its promise |

See the [Commands overview](/guide/commands/) for the full reference.

## Timing model

The compiler keeps a clock starting at `0 ms`. Each command starts when the previous one ends:

- `type` advances the clock by `steps × interval`.
- `delete`, `move` and `select` advance the clock by `steps × interval` for numeric counts, and by `interval` (50 ms by default) for string boundaries. Once a step has no effect because the cursor reached the edge of the text, the command's remaining steps are dropped and take no time.
- A zero `move` or `select` produces no state change and does not advance the clock.
- `wait` advances the clock by its `duration`. Durations must be finite and `0` or more.
- `unselect`, `style` and `unstyle` happen at the current time without advancing the clock.
- `call` happens at the current time. While its promise is pending, the clock is frozen.

The timeline's `duration` is the time of its last step, so a trailing `wait` counts.

## Playback

Every command compiles to **steps**. A step runs at its time and, in order: fires the `before` hook, runs the `call()` callback, applies its state change and renders, plays its sound, then fires the `after` hook. A single scheduler runs these steps for `play()`, `replay()`, resuming after `pause()`, and continuing after a `seek()` made while playing, so hooks, callbacks and sounds behave the same wherever playback starts.

- `pause()` keeps exactly what is on screen. Resuming continues the step that was interrupted without running its hooks or callback a second time.
- `seek()`, `stepForward()` and `stepBackward()` jump to a position by rebuilding the state from checkpoints (a snapshot every 50 steps). The steps they jump over are applied silently: their hooks, callbacks and sounds do not run.
- `getState().currentTime` follows the playhead live while playing.

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

Every command accepts optional `before` and `after` hooks. For segmented commands (`type`, and `delete`, `move` and `select` with a numeric count) they fire once per step. For all other commands they fire once around the single operation. `.move(0)` is a special case: no state change occurs and no clock advance happens, but hooks still fire once.

Hooks run whenever playback runs a step, including after a pause or a seek made while playing. They do not run for the steps that `seek()` or stepping jump over.

See [Hooks & Context](/guide/commands/#hooks-and-context) for the full reference.

## Type reference

- [`TimelineBuilder`](/api/classes/TimelineBuilder)
- [`TCommand`](/api/type-aliases/TCommand)
- [`TCommandHookOptions`](/api/type-aliases/TCommandHookOptions)
