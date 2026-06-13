# Timeline & Commands

The `TimelineBuilder` is the primary interface for scheduling what the typewriter types and how.

## The `.type()` command

```ts
tw.timeline.type(text: string, options?: TTypeOptions): TimelineBuilder
```

Returns the builder so calls can be chained.

### `TTypeOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `by` | `TAdvanceModeInput` | `"char"` | How to segment the text into steps |
| `interval` | `number` | `100` | Milliseconds between each step |

---

## Advance modes (`by`)

### String shortcuts

```ts
tw.timeline.type("Hello", { by: "char" });      // per character (default)
tw.timeline.type("Hello", { by: "grapheme" });  // per grapheme cluster
tw.timeline.type("Hello world", { by: "word" }); // per word
tw.timeline.type("Line 1\nLine 2", { by: "line" }); // per line
tw.timeline.type("All at once", { by: "custom" }); // whole string as one step
```

### Object form (with `amount`)

Use `{ unit, amount }` to group multiple segments per step:

```ts
// 2 characters per step
tw.timeline.type("Hello!", { by: { unit: "char", amount: 2 } });
// → "He" → "Hell" → "Hello!"

// 3 words per step
tw.timeline.type("one two three four five", { by: { unit: "word", amount: 3 } });
// → "one two three " → "one two three four five"
```

---

## Unicode and emoji

Use `"grapheme"` to handle multi-codepoint sequences correctly:

```ts
// ✅ Correct — each flag emoji is one step
tw.timeline.type("🇺🇸🇬🇧🇲🇦", { by: "grapheme" });

// ⚠️  May split emoji — use grapheme instead
tw.timeline.type("🇺🇸🇬🇧🇲🇦", { by: "char" });
```

---

## The `.wait()` command

```ts
tw.timeline.wait(duration: number): TimelineBuilder
```

Inserts a pause of `duration` milliseconds before the next command starts. Returns the builder so calls can be chained.

```ts
tw.timeline
  .type("Hello", { by: "char", interval: 80 })
  .wait(500)
  .type(" world", { by: "char", interval: 80 });

await tw.play();
// types "Hello", pauses 500 ms, then types " world"
```

A `.wait()` command generates no playback events — it only advances the internal time cursor used during compilation. The player's existing timing loop handles the resulting gap automatically.

---

## Chaining multiple commands

```ts
tw.timeline
  .type("Loading", { by: "char", interval: 80 })
  .type("...", { by: "char", interval: 300 });

await tw.play();
// types "Loading" fast, then "..." slowly
```

Each `.type()` call appends a command. Commands are compiled into events in order when `play()` is called.

---

## Replaying

Because commands are stored in the builder and compiled fresh on each `play()` call, you can replay:

```ts
await tw.play(); // first run
await tw.play(); // plays the same animation again
```

---

## Accessing the command list

```ts
console.log(tw.timeline.commands);
// readonly TTypeCommand[]
```

This is the raw list that gets compiled. You can inspect or log it for debugging.

---

## Type reference

See the API reference for full details:

- [`TimelineBuilder`](/api/classes/TimelineBuilder)
- [`TTypeOptions`](/api/type-aliases/TTypeOptions)
- [`TAdvanceMode`](/api/type-aliases/TAdvanceMode)
- [`TAdvanceModeInput`](/api/type-aliases/TAdvanceModeInput)
- [`TAdvanceUnit`](/api/type-aliases/TAdvanceUnit)
- [`TTypeCommand`](/api/type-aliases/TTypeCommand)
- [`TWaitCommand`](/api/type-aliases/TWaitCommand)
