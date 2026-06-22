# Best Practices

Patterns for writing maintainable, testable, and performant typewriter timelines.

## Structure timelines as builder functions

For anything beyond a trivial animation, extract timeline setup into a dedicated function. This keeps the construction logic reusable and easy to test:

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";
import type { TTypewriter } from "eo-typewriterjs";

function buildIntroScene(tw: TTypewriter): void {
  tw.timeline
    .type("Hello, World!", { by: "char", interval: 70 })
    .wait(800)
    .delete("whole")
    .type("Welcome.", { by: "char", interval: 70 });
}

const tw = createTypewriter({ renderer: domRenderer(el) });
buildIntroScene(tw);
await tw.play();
```

When scenes grow, split them into separate builder functions and compose them:

```ts
function buildLoadingScene(tw: TTypewriter): void {
  tw.timeline
    .type("Connecting", { by: "char", interval: 60 })
    .type("...", { by: "char", interval: 300 });
}

function buildSuccessScene(tw: TTypewriter): void {
  tw.timeline
    .delete("whole")
    .type("Connected!", { by: "char", interval: 60 });
}

buildLoadingScene(tw);
buildSuccessScene(tw);
await tw.play();
```

## Name cursors explicitly

The default `"main"` cursor is fine for simple animations. When you have multiple cursors or complex cursor logic, assign meaningful names:

```ts
tw.timeline
  .type("Hello", { cursor: "left" })
  .type("World", { cursor: "right" });
```

Named cursors make `getLiveState()` calls and hook logging easier to read, and they survive refactors better than undocumented string literals scattered through the code.

## Prefer explicit index ranges in `.style()`

Style ranges use absolute character indices in the document. If the document changes before a `.style()` fires (it always fires at the clock position it was added), the indices may drift. Use `.style("selection")` paired with `.select()` for dynamic ranges:

```ts
// Fragile: document length must be exactly right at compile time
tw.timeline
  .type("Hello")
  .style("greeting", { from: 0, to: 5 }); // fine here, but error-prone in long chains

// Safer: style whatever was just typed
tw.timeline
  .type("Hello")
  .move(-5)
  .select(5)
  .style("greeting", "selection");
```

## Use `.call()` for side effects, not control flow

`.call()` is designed for side effects: logging, fetching data, updating external state. Do not use it to decide what to type next within the same animation; use it to hand off to a follow-up typewriter or application logic after the current one finishes.

```ts
// Fine: fetch data between steps
tw.timeline
  .type("Checking status", { by: "char", interval: 60 })
  .call(async () => {
    await checkStatus();
  })
  .type("Done.", { by: "char", interval: 60 });

// Prefer a separate instance for conditional output
let result = "";
tw.timeline.call(async () => {
  result = await fetchResult();
});
await tw.play();

const tw2 = createTypewriter({ renderer: domRenderer(el) });
tw2.timeline.type(result, { by: "char", interval: 60 });
await tw2.play();
```

## Use `"grapheme"` by default for user-visible text

`"char"` is fine for ASCII-only strings. For any text that may contain emoji, accented characters, or non-Latin scripts, `"grapheme"` is safer and the performance difference is negligible:

```ts
tw.timeline.type(userInputText, { by: "grapheme", interval: 60 });
```

See [Unicode and Advance Modes](/guide/unicode-and-advance-modes) for details.

## Keep `interval` values consistent within a scene

Mixing wildly different `interval` values in a single scene can feel jarring. Pick a base interval and derive others from it:

```ts
const BASE = 70;

tw.timeline
  .type("Loading", { by: "char", interval: BASE })
  .type("...", { by: "char", interval: BASE * 4 })
  .wait(BASE * 10)
  .delete("whole", { interval: BASE / 2 });
```

## Avoid long synchronous work inside hooks and `.call()`

Hooks (`before`, `after`) and `.call()` run on the main thread. Long synchronous work inside them blocks the browser's rendering pipeline and produces visible jank. Defer heavy work or use async callbacks:

```ts
// OK: async callback yields to the event loop
tw.timeline.call(async () => {
  const data = await heavyAsyncOperation();
  updateUI(data);
});

// Avoid: blocks the main thread
tw.timeline.call(() => {
  const data = heavySynchronousComputation(); // bad
  updateUI(data);
});
```

## Test with `stringRenderer` and zero intervals

For unit tests, use `stringRenderer` with `interval: 0` and `by: "whole"` to produce deterministic, instant output without fake timers:

```ts
import { createTypewriter, stringRenderer } from "eo-typewriterjs";

test("types the correct text", async () => {
  const renderer = stringRenderer();
  const tw = createTypewriter({ renderer });

  tw.timeline.type("Hello", { by: "whole", interval: 0 });
  await tw.play();

  expect(renderer.toString()).toBe("Hello");
});
```

For tests that care about intermediate frames, use a frame-capture renderer. See [Debugging](/guide/debugging#collecting-all-frames) for the pattern.

## Handle cancellation in async `.call()` callbacks

When `tw.cancel()` is called while an async `.call()` is in progress, an `AbortSignal` on the context is aborted. Check it to avoid continuing work after cancellation:

```ts
tw.timeline.call(async ({ signal }) => {
  const response = await fetch("/api/data", { signal });
  const data = await response.json();
  updateUI(data);
});
```

Passing the signal directly to `fetch` causes the request to abort automatically when the typewriter is cancelled.

## Replay without rebuilding

`tw.replay()` reuses the compiled event stream if no new commands have been added since the last compile. Avoid rebuilding the typewriter instance on each loop iteration:

```ts
// Efficient: compile once, replay repeatedly
const tw = createTypewriter({ renderer: domRenderer(el) });
buildScene(tw);

await tw.play();
while (true) {
  await tw.replay();
}

// Inefficient: rebuilds and recompiles on every iteration
while (true) {
  const tw = createTypewriter({ renderer: domRenderer(el) });
  buildScene(tw);
  await tw.play();
}
```

## Use `setRate()` for speed controls, not interval changes

If you want to offer a "fast forward" or "slow motion" option in a UI, use `setRate()` rather than rebuilding the timeline with different intervals. `setRate()` affects all commands globally and takes effect immediately:

```ts
tw.setRate(2);   // double speed
tw.setRate(0.5); // half speed
tw.setRate(1);   // normal speed
```

Changing `interval` values requires rebuilding and recompiling the timeline.
