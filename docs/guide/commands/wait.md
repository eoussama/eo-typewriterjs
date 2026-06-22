<script setup>
const pauseBetweenPhrasesCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Hello", { by: "char", interval: 80 })
  .wait(800)
  .type(", world!", { by: "char", interval: 80 });

await tw.play();`;

const loadingSequenceCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Connecting", { by: "char", interval: 70 })
  .wait(300)
  .type("...", { by: "char", interval: 400 })
  .wait(600)
  .delete("whole")
  .type("Connected!", { by: "char", interval: 60 });

await tw.play();`;

const pauseBetweenSentencesCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("The animation starts. ", { by: "char", interval: 60 })
  .wait(600)
  .type("Then it pauses. ", { by: "char", interval: 60 })
  .wait(600)
  .type("Then it continues.", { by: "char", interval: 60 });

await tw.play();`;

const hooksTimingCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Before the pause", { by: "char", interval: 60 })
  .wait(1000, {
    before: () => console.log("Pause starting"),
    after: () => console.log("Pause ended"),
  })
  .type(" - after the pause", { by: "char", interval: 60 });

await tw.play();`;
</script>

# `.wait()` - pause the timeline

Inserts a timed gap before the next command starts.

```ts
tw.timeline.wait(duration: number, options?: TWaitOptions): TimelineBuilder
```

`.wait()` is a **timing-only command**. It advances the internal timeline clock by `duration` milliseconds but produces no state-mutating events and causes no render update. The document text, cursor positions, selections, and styles remain unchanged. Subsequent commands simply start later.

## Parameters and options

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

- Advances the clock by exactly `duration` ms.
- No state mutations occur: no document, cursor, selection, or style changes are produced, and no render update is triggered.
- `before` fires once before the delay starts. `after` fires once after the delay ends.
- The `audio` option, if set, triggers playback through the typing audio channel at the start of the wait.
- Any command placed after `.wait()` begins `duration` ms later than it otherwise would.
- A duration of `0` is valid; the clock does not move and no delay is introduced.
- Negative durations are treated as zero at runtime; use only non-negative values.
- Multiple consecutive `.wait()` calls are additive: `.wait(300).wait(200)` is equivalent to `.wait(500)`.

## Examples

### Pause between two phrases

```ts
tw.timeline
  .type("Hello", { by: "char", interval: 80 })
  .wait(800)
  .type(", world!", { by: "char", interval: 80 });

await tw.play();
// types "Hello", pauses 800 ms, then types ", world!"
```

<DocsPlayground :code="pauseBetweenPhrasesCode" />

### Building a dramatic loading sequence

```ts
tw.timeline
  .type("Connecting", { by: "char", interval: 70 })
  .wait(300)
  .type("...", { by: "char", interval: 400 })
  .wait(600)
  .delete("whole")
  .type("Connected!", { by: "char", interval: 60 });

await tw.play();
```

<DocsPlayground :code="loadingSequenceCode" />

### Pause before a correction

```ts
tw.timeline
  .type("Tpying mistakes happen", { by: "char", interval: 70 })
  .wait(500)
  .move("start")
  .delete(7, { by: "char", interval: 50 })
  .type("Typing ", { by: "char", interval: 70 });

await tw.play();
// result: "Typing mistakes happen"
```

### Stepped instructions with a reading pause between each

```ts
tw.timeline
  .type("Step 1: Install the package", { by: "char", interval: 50 })
  .wait(1000)
  .type("\nStep 2: Import the library", { by: "char", interval: 50 })
  .wait(1000)
  .type("\nStep 3: Create a typewriter instance", { by: "char", interval: 50 })
  .wait(1000)
  .type("\nStep 4: Build a timeline and play", { by: "char", interval: 50 });

await tw.play();
```

### Brief pause between sentences

```ts
tw.timeline
  .type("The animation starts. ", { by: "char", interval: 60 })
  .wait(600)
  .type("Then it pauses. ", { by: "char", interval: 60 })
  .wait(600)
  .type("Then it continues.", { by: "char", interval: 60 });

await tw.play();
```

<DocsPlayground :code="pauseBetweenSentencesCode" />

### Using hooks to track timing

```ts
tw.timeline
  .type("Before the pause", { by: "char", interval: 60 })
  .wait(1000, {
    before: () => console.log("Pause starting"),
    after: () => console.log("Pause ended"),
  })
  .type(" - after the pause", { by: "char", interval: 60 });

await tw.play();
```

<DocsPlayground :code="hooksTimingCode" />

## Composition with instant commands

Instant commands (`move`, `select`, `style`, `call`, etc.) placed immediately after `.wait()` fire at the exact moment the wait ends, with no additional delay:

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(600)
  .move(-5)              // fires as soon as the wait ends
  .select(5)             // fires at the same instant
  .style("highlight", "selection") // fires at the same instant
  .move("end")           // fires at the same instant
  .wait(400)
  .type("!", { by: "char", interval: 80 }); // starts 400 ms after the previous wait ends

await tw.play();
```

## Edge cases

- **`duration = 0`** - valid no-op. No delay is introduced; the clock does not move. `before` and `after` hooks still fire.
- **`duration < 0`** - treated as zero at runtime. Use only non-negative values.
- **Multiple consecutive waits** - durations accumulate: `.wait(200).wait(300)` produces a 500 ms pause.
- **Wait followed by instant commands** - instant commands all fire at the same timestamp as the wait's end.

## Type reference

- [`TWaitCommand`](/api/type-aliases/TWaitCommand)
- [`TWaitOptions`](/api/type-aliases/TWaitOptions)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
