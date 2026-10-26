# FAQ

Answers to common questions and issues.

## Installation and setup

### Which environments does it run in?

The library targets ES2022: it works in any modern browser and in Node.js 24 or later. The DOM renderer requires a browser environment (or a DOM emulation layer). The string renderer works anywhere.

### Does it support CommonJS?

Yes. The package ships an ES module (`dist/index.mjs`) and a CommonJS build (`dist/index.cjs`); Node.js and bundlers pick the right one through the `exports` field in `package.json`. Browser bundles (`index.iife.js`, `index.umd.js` and `index.browser.mjs`) are included for use without a bundler.

### Can I use it without TypeScript?

Yes. The distribution includes compiled JavaScript. TypeScript declarations (`.d.mts` and `.d.cts`) ship alongside and are picked up automatically if you are using TypeScript. Plain JavaScript projects can import and use the library without any type configuration.

## Playback behavior

### Why does text appear all at once instead of animating character by character?

The most common cause is a missing or zero `interval`. The default interval when omitted is **50 ms**, but if you pass `interval: 0` or use `by: "whole"`, the entire text renders in one step.

```ts
// animates, one character per 80 ms
tw.timeline.type("Hello", { by: "char", interval: 80 });

// renders instantly (single step, no delay)
tw.timeline.type("Hello", { by: "whole" });
```

### Why doesn't `\n` render as a visible line break?

The `\n` character is typed into the document as a literal newline, but HTML collapses whitespace by default. To preserve newlines, use a `<pre>` tag or add `white-space: pre` to the output element:

```css
#output {
  white-space: pre;
}
```

Alternatively, use `<br>` elements, but note the library works with plain text, not HTML.

### Why does `delete(-5)` remove a different number of characters than expected?

If a selection is active on the targeted cursor when `.delete()` runs, the entire selected range is deleted and the numeric count is ignored. Call `.unselect()` before `.delete()` if you want to delete by count.

```ts
tw.timeline
  .select("whole")
  .unselect()         // clear the selection first
  .delete(-3);        // now deletes 3 characters to the left
```

### `play()` resolved but I can't call `replay()` immediately?

`play()` resolves when all commands finish. You can call `replay()` immediately after:

```ts
await tw.play();
await tw.replay(); // safe to call right away
```

### Can I run two typewriters simultaneously on the same element?

No. Each `DomRenderer` targets one element and rewrites its `innerHTML` on every render call. Running two typewriters on the same element would cause them to overwrite each other's output. Use separate elements or implement a custom renderer that merges multiple state streams.

## Unicode and text

### Which `by` mode should I use for emoji?

Any of them. The default `"char"` mode and its alias `"grapheme"` both step one user-perceived character at a time, so flags, ZWJ sequences and skin tone modifiers are never split, whether you type, delete, move or select.

```ts
tw.timeline.type("Hello 🚀", { by: "grapheme", interval: 80 });
```

### Does the library support RTL text?

The library does not reorder text. It inserts text in the order you provide it and moves the cursor by character count. Bidirectional rendering is handled by the browser's text rendering engine when using the DOM renderer. For RTL layouts, set `dir="rtl"` on the output element.

### Can I type HTML tags?

No. The library works with plain text. The DOM renderer escapes content before setting `innerHTML`, so typed text cannot inject HTML. Use `.style()` with class names or `TStyleObject` to apply visual formatting. See [Styling](/guide/styling).

## Styling

### My class names are applied but the style doesn't show

The renderer adds the class to a `<span>`, but the class itself must have matching CSS rules in your stylesheet. The library does not inject any styles except the built-in cursor blink animation.

```css
/* You must provide this rule */
.highlight {
  background: yellow;
}
```

### How do I make the selected text visible?

The selection span gets the class `typewriter-selection`. Add a background color rule:

```css
.typewriter-selection {
  background: rgba(59, 130, 246, 0.35);
}
```

### How do I remove all styles from the document?

Select the whole document, then pass `"selection"` to `.unstyle()`:

```ts
tw.timeline
  .select("whole")
  .unstyle("selection");
```

Or use an explicit range if you know the document length:

```ts
tw.timeline.unstyle({ from: 0, to: tw.getLiveState().document.text.length });
```

## Audio

### Audio is enabled but I hear nothing

Check that:
1. The page has received a user gesture (click, key press) before `play()` is called. Browsers block audio playback until the user interacts with the page; the library ignores the blocked attempts silently.
2. The volume is above `0`.
3. The `sfxs` sample URLs are reachable and the audio files are in a format the browser supports.

4. The command makes sound: only typing, deleting and moving the cursor do by default. Give other commands an `audio` override to hear them.

If no custom `sfxs` are provided, the audio engine uses the built-in keyboard-click samples. They are downloaded the first time audio is enabled, so the first keystrokes right after enabling it can be silent. To reference or extend the pack in your own code, import it from the dedicated subpath:

```ts
import { DEFAULT_SFX_PACK } from "eo-typewriterjs/audio-pack";
```

### How do I silence one command while keeping audio on globally?

Pass `audio: false` on the command:

```ts
tw.timeline
  .type("Audible", { interval: 80 })
  .type("Silent",  { interval: 80, audio: false });
```

## Testing

### How do I test a timeline without waiting for real timer delays?

Use `stringRenderer` with `interval: 0` (or `by: "whole"`) to produce a deterministic, instant animation:

```ts
import { createTypewriter, stringRenderer } from "eo-typewriterjs";

const renderer = stringRenderer();
const tw = createTypewriter({ renderer });

tw.timeline.type("Hello", { by: "whole", interval: 0 });
await tw.play();

assert(renderer.toString() === "Hello");
```

For testing intermediate frames, use a frame-capture renderer:

```ts
class FrameCapture implements IRenderer {
  readonly frames: string[] = [];
  mount(s: TTypewriterState) { this.frames.push(s.document.text); }
  render(s: TTypewriterState) { this.frames.push(s.document.text); }
  unmount() {}
}
```

### How do I test with real intervals in a Vitest / Jest environment?

Use fake timers. Set `interval` to a predictable value, advance fake time after each expected step, and assert state between advances.

## Custom renderers

### Can I use multiple renderers at the same time?

Not directly, since `createTypewriter()` accepts a single `renderer`. However, you can compose multiple renderers in a wrapper:

```ts
const multiRenderer: IRenderer = {
  mount(state) {
    domRend.mount?.(state);
    logRend.mount?.(state);
  },
  render(state) {
    domRend.render(state);
    logRend.render(state);
  },
  unmount() {
    domRend.unmount?.();
    logRend.unmount?.();
  },
};

const tw = createTypewriter({ renderer: multiRenderer });
```

## Miscellaneous

### Can I add more commands after `play()` has started?

Commands added after playback started are picked up the next time you call `play()`, `replay()`, `seek()` or a step method: the timeline is recompiled and starts over from the beginning. They are not appended to an animation that is already running.

### What happens if I call `play()` while already playing?

It returns the promise of the playback already in progress. `play()` resumes from the current position when paused, and replays from the beginning once completed.

### How do I get the final text without running the animation?

Seek to the end. Seeking applies every step instantly, without waiting (hooks and callbacks of the skipped steps do not run):

```ts
const renderer = stringRenderer();
const tw = createTypewriter({ renderer });

tw.timeline.type("Hello, World!", { interval: 80 }).wait(500);
tw.seek(Infinity);

console.log(renderer.toString()); // "Hello, World!"
