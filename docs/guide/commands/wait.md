# `.wait()` — pause the timeline

Inserts a pause of `duration` milliseconds before the next command starts.

```ts
tw.timeline.wait(duration: number): TimelineBuilder
```

`.wait()` is a **timing-only command**. It does not produce any playback events and does not mutate the document. It advances the internal timeline clock by the given duration, so subsequent commands start later.

## Options

```ts
type TWaitOptions = {
  before?: TCallbackHook;
  after?: TCallbackHook;
  audio?: TAudioCommandOverride;
};
```

| Parameter / Option | Type | Description |
|---|---|---|
| `duration` | `number` | Pause length in milliseconds (required, positional) |
| `before` | `TCallbackHook` | Hook fired immediately before the wait begins |
| `after` | `TCallbackHook` | Hook fired immediately after the wait ends |
| `audio` | `TAudioCommandOverride` | Per-command audio override |

## Behavior

- Generates **no events** — the player's existing scheduler handles the resulting time gap naturally.
- Does **not** affect the document text, cursor positions, selections, or styles.
- Advances the clock, so any command after a `.wait()` fires `duration` ms later.
- A duration of `0` is valid and is effectively a no-op.

## Examples

### Basic pause between two type commands

```ts
tw.timeline
  .type("Hello", { by: "char", interval: 80 })
  .wait(600)
  .type(" world", { by: "char", interval: 80 });

await tw.play();
// types "Hello", pauses 600 ms, then types " world"
```

### Dramatic loading animation

```ts
tw.timeline
  .type("Loading", { by: "char", interval: 80 })
  .wait(400)
  .type(".")
  .wait(400)
  .type(".")
  .wait(400)
  .type(".")
  .wait(600)
  .type(" Done!", { by: "char", interval: 80 });

await tw.play();
```

### Pause before deletion

```ts
tw.timeline
  .type("Hmm, let me think...", { by: "char", interval: 60 })
  .wait(1200)
  .delete(20, { by: "char", interval: 40 })
  .type("Actually, never mind.", { by: "char", interval: 70 });

await tw.play();
```

### Pause between sentences for readability

```ts
tw.timeline
  .type("Step 1: open the file.", { by: "char", interval: 50 })
  .wait(800)
  .type("\nStep 2: save the file.", { by: "char", interval: 50 })
  .wait(800)
  .type("\nStep 3: close the file.", { by: "char", interval: 50 });

await tw.play();
```

## Composition with instant commands

Instant commands (`move`, `select`, `style`) placed immediately after `.wait()` fire at the moment the wait ends, with no further delay:

```ts
tw.timeline
  .type("Hello World")
  .wait(500)
  .move(6) // fires 500 ms after "Hello World" is typed
  .select(5) // fires at the same instant as move
  .type("there"); // starts immediately after the instant commands
```

## Edge cases

- **`duration = 0`** — valid; compiles to a zero-length pause. The clock does not move, so subsequent commands start at the same timestamp. Effectively a no-op but harmless.
- **`duration < 0`** — the behavior is undefined. Use only non-negative values.
- **Multiple consecutive waits** — their durations are summed:

  ```ts
  tw.timeline.wait(300).wait(200); // equivalent to .wait(500)
  ```

## Type reference

- [`TWaitCommand`](/api/type-aliases/TWaitCommand)
- [`TWaitOptions`](/api/type-aliases/TWaitOptions)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
