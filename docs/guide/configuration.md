# Configuration

All configuration is passed to `createTypewriter(options)`. This page covers every option and its default value.

## `createTypewriter(options)`

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";

const tw = createTypewriter({
  renderer: domRenderer(el),
  cursor: { kind: "pipe", animation: "blink" },
  audio: { enabled: false },
});
```

### `renderer` (required)

An object implementing [`IRenderer`](/api/interfaces/IRenderer). The two built-in factories are `domRenderer(target)` and `stringRenderer()`. See [Renderers](/guide/renderers) for details.

```ts
import { domRenderer, stringRenderer } from "eo-typewriterjs";

// browser
const tw = createTypewriter({ renderer: domRenderer("#output") });

// server / test
const tw = createTypewriter({ renderer: stringRenderer() });
```

### `cursor`

Controls the appearance and initial state of the `"main"` cursor. Cursors created later (for example by `{ cursor: "b" }` on a command) start with the main cursor's options.

| Field | Type | Default | Description |
|---|---|---|---|
| `kind` | `TCursorKind` | `"pipe"` | Cursor shape. See [cursor kinds](#cursor-kinds) below. |
| `content` | `string` | _(kind default)_ | Custom glyph string; overrides the kind's default character. |
| `animation` | `"blink" \| "none" \| TCursorAnimationOptions` | `"blink"` | The built-in blink, no animation, or a custom CSS animation (`{ name, duration, timingFunction, delay, iterationCount, direction, fillMode, playState }`). |
| `visible` | `boolean` | `true` | Whether the cursor is visible. |
| `className` | `string` | `""` | Extra classes added to the cursor `<span>`, next to `typewriter-cursor`. |
| `attrs` | `Record<string, string>` | `{}` | Extra attributes on the cursor `<span>`. Event handler attributes (`on*`) are ignored. |

```ts
import { createTypewriter, domRenderer, ECursorKind } from "eo-typewriterjs";

const tw = createTypewriter({
  renderer: domRenderer(el),
  cursor: {
    kind: ECursorKind.BLOCK,
    animation: "blink",
    visible: true,
  },
});
```

#### Cursor kinds

| Kind constant | String value | Default glyph |
|---|---|---|
| `ECursorKind.PIPE` | `"pipe"` | `\|` |
| `ECursorKind.UNDERSCORE` | `"underscore"` | `_` |
| `ECursorKind.BLOCK` | `"block"` | `▋` |
| `ECursorKind.BLOCK_UNDERSCORE` | `"block-underscore"` | `▄` |
| `ECursorKind.CARET` | `"caret"` | `^` |
| `ECursorKind.CUSTOM` | `"custom"` | _(empty)_ |

Pass `content: ""` to create a CSS-only cursor with no rendered glyph, controlled entirely via CSS on `.typewriter-cursor`.

#### Changing cursor options at runtime

```ts
tw.setCursorOptions({ kind: ECursorKind.UNDERSCORE }); // all cursors
tw.setCursorVisible(false);                             // hide all cursors
tw.setCursorVisible(true, "main");                      // show a specific cursor
```

Both accept an optional cursor selector (an id or an array of ids) and take effect immediately without stopping playback. Called from inside a hook or `call()` callback, a change only applies to the current run; called anywhere else, it also applies to replays and seeks.

### `audio`

Controls the built-in audio engine. Audio is **disabled when the `audio` field is omitted**; passing any `audio` object turns it on unless it sets `enabled: false`.

| Field | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Master switch. |
| `volume` | `number` | `1` | Master volume, clamped to `[0, 1]`. |
| `sfxs` | `Record<string, TAudioSfx>` | built-in pack | Named sound effects, each with a `samples` array of URLs or data URLs. |
| `typing` | `TAudioChannelOptions` | | Options of the typing channel. |
| `delete` | `TAudioChannelOptions` | | Options of the delete channel. |
| `move` | `TAudioChannelOptions` | | Options of the cursor move channel. |

Typing, deleting and moving each play on their own channel. Other commands are silent unless they set an `audio` override. Every channel draws from the same samples by default but varies their pitch and volume differently: typing sounds natural, deleting lower and heavier, moving is a light, quiet tick. The delete and move channels reuse the typing channel's sample selection (`sfx`, `sfxs`, `strategy`, `avoidImmediateRepeat`, `overlap`) unless they set their own.

| Channel option | Type | Default | Description |
|---|---|---|---|
| `sfx` | `string` | | The sfx to play. |
| `sfxs` | `string[]` | | Several sfxs to pick from; wins over `sfx`. When neither is set, every sfx in the pack is used. |
| `strategy` | `TAudioStrategy` | `"shuffleBag"` | How the next sample is picked. |
| `avoidImmediateRepeat` | `boolean` | `true` | Never play the same sample twice in a row (applies to `"random"` and across shuffle-bag rounds). |
| `playbackRateJitter` | `{ min, max }` | per channel | Random playback rate; it shifts the pitch too. Typing: 0.92–1.08, delete: 0.72–0.82, move: 1.3–1.45. Set it to `undefined` to disable. |
| `volumeJitter` | `{ min, max }` | per channel | Random volume factor. Typing: 0.85–1, delete: 0.8–0.95, move: 0.4–0.55. |
| `overlap` | `boolean` | `true` | Let rapid sounds overlap instead of cutting the previous one off. |

```ts
import { createTypewriter, domRenderer, EAudioStrategy } from "eo-typewriterjs";

const tw = createTypewriter({
  renderer: domRenderer(el),
  audio: {
    volume: 0.7,
    sfxs: {
      key: { samples: ["/sounds/key1.mp3", "/sounds/key2.mp3"] },
    },
    typing: { sfx: "key", strategy: EAudioStrategy.SHUFFLE_BAG },
    move: { volumeJitter: { min: 0.2, max: 0.3 } },
  },
});
```

#### Audio strategies

| Constant | Value | Behavior |
|---|---|---|
| `EAudioStrategy.SHUFFLE_BAG` | `"shuffleBag"` | Default. Plays every sample once in a shuffled order, then reshuffles. |
| `EAudioStrategy.ROUND_ROBIN` | `"roundRobin"` | Cycles through samples in order. |
| `EAudioStrategy.RANDOM` | `"random"` | Picks a random sample each time. |

#### Built-in SFX pack

The library ships a built-in pack of keyboard-click samples, used when `sfxs` is not provided. It lives in its own chunk that is only downloaded the first time a typewriter enables audio without custom sfxs; sounds requested before it arrives are skipped. To reference or extend it in your own code, import it from the subpath entry:

```ts
import { DEFAULT_SFX_PACK } from "eo-typewriterjs/audio-pack";

const tw = createTypewriter({
  renderer: domRenderer(el),
  audio: {
    enabled: true,
    sfxs: {
      ...DEFAULT_SFX_PACK,
      mykey: { samples: ["/sounds/custom.mp3"] },
    },
  },
});
```

#### Changing audio options at runtime

```ts
tw.setAudioEnabled(false);         // mute without stopping playback
tw.setAudioEnabled(true);          // unmute
tw.setAudioVolume(0.5);            // master volume [0, 1]
tw.setAudioOptions({ volume: 0.3 }); // replaces the whole audio configuration
tw.getAudioOptions();              // read the current configuration
```

#### Per-command audio override

Each command accepts an `audio` option that overrides the global config for that command only. An object also makes a normally silent command (such as `wait` or `select`) play the typing sound:

```ts
tw.timeline
  .type("Audible line", { interval: 80 })
  .type("Silent line",  { interval: 80, audio: false })
  .type("Quieter line", { interval: 80, audio: { volume: 0.3 } })
  .type("Other sound",  { interval: 80, audio: { sfx: "key" } })
  .wait(500, { audio: { volume: 1 } });
```

## Runtime controls reference

The `TTypewriter` object returned by `createTypewriter()` exposes these methods:

| Method | Returns | Description |
|---|---|---|
| `play()` | `Promise<void>` | Start, resume a pause, or replay once completed. Resolves when playback completes or is paused, stopped or cancelled; rejects when a hook or callback throws. |
| `pause()` | `void` | Pause on exactly what is rendered. |
| `stop()` | `void` | Stop and reset to the initial state. |
| `cancel()` | `void` | Stop and keep the current output on screen. |
| `replay()` | `Promise<void>` | Restart from the beginning. |
| `seek(ms)` | `void` | Jump to a time, clamped to the timeline. Keeps playing if playing; otherwise pauses there. |
| `stepForward()` | `void` | Apply the next step and pause. |
| `stepBackward()` | `void` | Undo the last step and pause. |
| `setRate(n)` | `void` | Set the speed multiplier (e.g. `2` for double speed); the playhead stays in place. |
| `destroy()` | `void` | Stop playback and unmount the renderer. |
| `getState()` | `TPlaybackControllerState` | `status`, live `currentTime`, `duration` and `rate`. |
| `getLiveState()` | `TTypewriterState` | Current document, cursor positions, and selections. |
| `setCursorVisible(visible, cursor?)` | `void` | Show or hide cursors (all of them when no selector is given). |
| `setCursorOptions(opts, cursor?)` | `void` | Update cursor appearance (all cursors when no selector is given). |
| `setAudioEnabled(enabled)` | `void` | Toggle audio without stopping playback. |
| `setAudioVolume(volume)` | `void` | Set master volume `[0, 1]`. |
| `setAudioOptions(opts)` | `void` | Replace audio configuration. |
| `getAudioOptions()` | `TAudioOptions` | Read current audio configuration. |

## Full example

```ts
import { createTypewriter, domRenderer, ECursorKind, EAudioStrategy } from "eo-typewriterjs";

const el = document.getElementById("output")!;

const tw = createTypewriter({
  renderer: domRenderer(el),
  cursor: {
    kind: ECursorKind.PIPE,
    animation: "blink",
    visible: true,
  },
  audio: {
    volume: 0.6,
    typing: { strategy: EAudioStrategy.RANDOM },
  },
});

tw.timeline
  .type("Configuration demo", { by: "char", interval: 70 })
  .wait(500)
  .delete(-4, { by: "char", interval: 40 })
  .type("reference.", { by: "char", interval: 70 });

await tw.play();
```

## Type reference

- [`createTypewriter`](/api/functions/createTypewriter)
- [`TTypewriterOptions`](/api/type-aliases/TTypewriterOptions)
- [`TAudioOptions`](/api/type-aliases/TAudioOptions)
- [`TAudioChannelOptions`](/api/type-aliases/TAudioChannelOptions)
- [`EAudioStrategy`](/api/variables/EAudioStrategy)
- [`ECursorKind`](/api/variables/ECursorKind)
- [`IRenderer`](/api/interfaces/IRenderer)
