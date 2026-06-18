# `.call()` — inline callback

Schedules a callback function as a named step in the timeline.

```ts
tw.timeline.call(fn: TCallbackFn, options?: TCommandHookOptions): TimelineBuilder
```

The callback receives a context object and may return a `Promise`. Playback is **suspended** until the returned promise settles before the next command starts. Synchronous callbacks are also supported and execute in the same tick.

`.call()` does **not** produce any playback events and does **not** advance the timeline clock. It fires at the current clock position, between whatever commands precede and follow it.

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `fn` | `TCallbackFn` | The function to invoke. Receives a `TCallbackContext`. |
| `options` | `TCommandHookOptions` | Optional `before`, `after`, and `audio` hooks |

## Callback context

The callback receives a single `TCallbackContext` argument:

| Field | Type | Description |
|---|---|---|
| `state` | `TTypewriterState` | A snapshot of the current document and cursor state |
| `signal` | `AbortSignal` | Aborted when `tw.cancel()` is called during playback |

```ts
tw.timeline.call(({ state, signal }) => {
  console.log("text so far:", state.document.text);
});
```

## Synchronous callback

```ts
tw.timeline
  .type("Hello")
  .call(({ state }) => {
    console.log("typed:", state.document.text);
  })
  .type(" world");

await tw.play();
// logs "Hello" between the two type commands
```

## Async callback

Return a `Promise` to suspend playback until the operation completes:

```ts
tw.timeline
  .type("Fetching data", { by: "char", interval: 70 })
  .call(async ({ signal }) => {
    const res = await fetch("/api/ping", { signal });
    const data = await res.json();

    console.log("response:", data);
  })
  .type(" — done!", { by: "char", interval: 70 });

await tw.play();
// playback waits for the fetch before typing " — done!"
```

## Cancelling from inside a callback

Call `tw.cancel()` inside a `call()` to stop playback at a specific point, preserving the current rendered output:

```ts
tw.timeline
  .type("Important text.", { by: "char", interval: 80 })
  .call(() => {
    tw.cancel();
  })
  .type(" (never reached)", { by: "char", interval: 80 });

await tw.play();
// status → CANCELLED; "Important text." stays on screen
```

You can also react to external signals by checking `signal.aborted`:

```ts
tw.timeline.call(async ({ signal }) => {
  await someWork(signal);
});
```

## Modifying state from a callback

Use `tw.setCursorVisible()`, `tw.setCursorOptions()`, `tw.setAudioEnabled()`, or `tw.setAudioVolume()` inside a callback to change runtime state mid-animation:

```ts
tw.timeline
  .type("Typed with cursor", { by: "char", interval: 60 })
  .call(() => {
    tw.setCursorVisible(false);
  })
  .wait(400)
  .call(() => {
    tw.setCursorVisible(true);
  });

await tw.play();
```

## Edge cases

- **Throwing** — if the callback throws or the returned promise rejects, playback stops and the error propagates from `tw.play()`.
- **Already cancelled** — if `tw.cancel()` was called before the callback fires, the `signal` passed to the callback is already aborted. The callback still runs, but you can check `signal.aborted` to skip work.
- **Clock position** — `.call()` fires at the same clock position as the preceding command's last event. It does not delay subsequent commands.

## Type reference

- [`TCallCommand`](/api/type-aliases/TCallCommand)
- [`TCallbackFn`](/api/type-aliases/TCallbackFn)
- [`TCallbackContext`](/api/type-aliases/TCallbackContext)
- [`TCommandHookOptions`](/api/type-aliases/TCommandHookOptions)
