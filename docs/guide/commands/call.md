# `.call()` - inline callback

Schedules a callback function as a step in the timeline.

```ts
tw.timeline.call(fn: TCallbackFn, options?: TCommandHookOptions): TimelineBuilder
```

`.call()` is an **instant command**. It does not produce playback events and does not advance the timeline clock. The callback fires at the current clock position - at the exact moment the preceding command finishes.

If the callback returns a `Promise`, playback is **suspended** until the promise settles before the next command starts. Synchronous callbacks execute in the same tick.

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `fn` | `TCallbackFn` | The function to invoke. Receives a `TCallbackContext`. |
| `options` | `TCommandHookOptions` | Optional `before`, `after`, and `audio` hooks |

## Callback context (`TCallbackContext`)

The callback receives a single context argument:

| Field | Type | Description |
|---|---|---|
| `state` | `TTypewriterState` | Read-only snapshot of the current document and cursor state |
| `stepIndex` | `number` | Always `0` for `.call()` - it has one step |
| `stepCount` | `number` | Always `1` for `.call()` |
| `unit` | `null` | Always `null` - `.call()` is not a segmented command |
| `signal` | `AbortSignal` | Aborted when `tw.cancel()` is called |

```ts
tw.timeline.call(({ state, signal }) => {
  console.log("text so far:", state.document.text);
  console.log("cursor index:", state.cursors["main"].index);
  console.log("cancelled:", signal.aborted);
});
```

## Synchronous callback

A synchronous callback runs inline and does not pause playback for longer than one tick:

```ts
tw.timeline
  .type("Hello", { by: "char", interval: 80 })
  .call(({ state }) => {
    console.log("Finished typing:", state.document.text);
    document.title = state.document.text;
  })
  .type(" world", { by: "char", interval: 80 });

await tw.play();
// logs "Hello" between the two type commands, then types " world"
```

## Async callback

Return a `Promise` to suspend playback until the operation completes. The next command does not start until the promise resolves:

```ts
tw.timeline
  .type("Fetching results", { by: "char", interval: 70 })
  .call(async ({ signal }) => {
    const response = await fetch("/api/data", { signal });
    const data = await response.json();
    console.log("data:", data);
  })
  .type(" - done!", { by: "char", interval: 70 });

await tw.play();
// playback waits for the fetch before " - done!" starts typing
```

## Cancellation

The `signal` is aborted when `tw.cancel()` is called. Pass it to cancellation-aware APIs to clean up in-flight work:

```ts
tw.timeline
  .type("Loading", { by: "char", interval: 80 })
  .call(async ({ signal }) => {
    try {
      const res = await fetch("/api/long-running", { signal });
      const data = await res.json();
      console.log("result:", data);
    } catch (err) {
      if (signal.aborted) {
        console.log("Cancelled mid-fetch - cleaning up");
      } else {
        throw err;
      }
    }
  })
  .type(" Done!", { by: "char", interval: 70 });

await tw.play();
```

You can also call `tw.cancel()` from inside the callback to stop playback at a precise point:

```ts
tw.timeline
  .type("Checking credentials", { by: "char", interval: 60 })
  .call(async ({ state }) => {
    const ok = await checkAuth();
    if (!ok) {
      tw.cancel(); // stop playback; current text stays on screen
    }
  })
  .type(" - Access granted!", { by: "char", interval: 60 });

await tw.play();
// If checkAuth() returns false, " - Access granted!" is never typed
```

## Modifying runtime state

Use the typewriter's runtime API inside a callback to change behavior mid-animation:

```ts
// Toggle cursor visibility
tw.timeline
  .type("Typing with cursor visible", { by: "char", interval: 60 })
  .call(() => tw.setCursorVisible(false))
  .wait(400)
  .call(() => tw.setCursorVisible(true))
  .type(" - cursor back", { by: "char", interval: 60 });

await tw.play();
```

```ts
// Adjust audio volume dynamically
tw.timeline
  .type("Quiet start", { by: "char", interval: 80 })
  .call(() => tw.setAudioVolume(0.8))
  .type(" - louder now", { by: "char", interval: 80 });

await tw.play();
```

## Reading and displaying state

```ts
tw.timeline
  .type("The quick brown fox", { by: "word", interval: 200 })
  .call(({ state }) => {
    const wordCount = state.document.text.split(" ").length;
    console.log(`Typed ${wordCount} words so far`);
  })
  .type(" jumps over the lazy dog", { by: "word", interval: 200 })
  .call(({ state }) => {
    const charCount = state.document.text.length;
    console.log(`Total characters: ${charCount}`);
  });

await tw.play();
```

## Sequencing async operations between timed commands

```ts
tw.timeline
  .type("Step 1: validating input", { by: "char", interval: 50 })
  .call(async ({ signal }) => {
    await validate(input, signal);
  })
  .type("\nStep 2: sending request", { by: "char", interval: 50 })
  .call(async ({ signal }) => {
    await sendRequest(payload, signal);
  })
  .type("\nStep 3: complete", { by: "char", interval: 50 });

await tw.play();
```

## Clock behavior

Because `.call()` does not advance the clock, the commands immediately before and after it share the same timestamp boundary. A timed command that follows `.call()` starts exactly when the callback settles:

```ts
tw.timeline
  .type("Hello", { interval: 80 })  // ends at 400 ms
  .call(() => { /* runs at 400 ms, synchronously */ })
  .type(" world", { interval: 80 }); // starts at 400 ms

await tw.play();
```

For async callbacks, the wall-clock time advances while the promise is pending, but the timeline's logical clock does not - subsequent commands still schedule from the same logical position.

## Edge cases

- **Throwing synchronously** - if the callback throws, playback stops and the error propagates from `tw.play()`.
- **Rejected promise** - if the returned promise rejects, playback stops and the rejection propagates from `tw.play()`.
- **Already cancelled before the callback fires** - the `signal` passed to the callback is already aborted. The callback still runs; check `signal.aborted` to skip work.
- **`tw.cancel()` called inside a synchronous callback** - playback stops cleanly after the callback returns.
- **No return value** - if the callback returns `undefined` (or nothing), playback continues immediately on the next tick.

## Type reference

- [`TCallCommand`](/api/type-aliases/TCallCommand)
- [`TCallbackFn`](/api/type-aliases/TCallbackFn)
- [`TCallbackContext`](/api/type-aliases/TCallbackContext)
- [`TCommandHookOptions`](/api/type-aliases/TCommandHookOptions)
