<p align="center">
    <a href="http://eoussama.github.io/eo-typewriterjs">
      <img src="https://raw.githubusercontent.com/eoussama/eo-typewriterjs/refs/heads/master/assets/logo.svg" alt="Logo" width="200px">
      <h1 align="center">eo-typewriterjs</h1>
    </a>
    <p align="center">Build rich typewriter animations with a composable timeline, full Unicode support, and a renderer-agnostic architecture that works in the browser and on the server.</p>
    <p align="center">
        <img src="https://img.shields.io/github/release/EOussama/typewriterjs.svg">
        <img src="https://img.shields.io/github/downloads/EOussama/typewriterjs/latest/total.svg">
        <img src="https://img.shields.io/github/languages/code-size/EOussama/typewriterjs.svg">
        <img src="https://img.shields.io/github/license/EOussama/typewriterjs.svg">
    </p>
</p>

---

## Install

```bash
pnpm add eo-typewriterjs
```

## Why eo-typewriterjs

- **Composable timeline**: chain type, delete, wait, move, select, unselect, style, unstyle, and call commands in any order.
- **Flexible advance modes**: type by character, word, line, grapheme, or custom chunk size.
- **Rich text support**: apply styles to ranges during playback.
- **Full Unicode**: handles emoji, accented characters, and complex grapheme clusters correctly.
- **Renderer-agnostic**: built-in DOM and string renderers; implement `IRenderer` to target anything.
- **TypeScript-first**: fully typed public API with no `any`.
- **Playback controls**: play, pause, stop, replay, and cancel from any point.

## Quick start

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const el = document.getElementById("output")!;

const tw = createTypewriter({
  renderer: domRenderer(el),
});

tw.timeline
  .type("Hello, ")
  .type("world!", { by: "word", interval: 120 })
  .wait(400)
  .delete(6)
  .type("EO TypewriterJS.");

await tw.play();
```

## Documentation

Full documentation, guides, and the API reference are available on the docs site.

- [Docs site](https://ouss.es/eo-typewriterjs/)
- [Getting started](https://ouss.es/eo-typewriterjs/guide/getting-started)
- [Core concepts](https://ouss.es/eo-typewriterjs/guide/core-concepts)
- [Timeline](https://ouss.es/eo-typewriterjs/guide/timeline)
- [Renderers](https://ouss.es/eo-typewriterjs/guide/renderers)
- [Recipes](https://ouss.es/eo-typewriterjs/guide/recipes)
- [API reference](https://ouss.es/eo-typewriterjs/api/)

## Sandbox

Try the library live in the interactive [sandbox](https://ouss.es/eo-typewriterjs/sandbox/), write timelines, run them, and see output in real time without any setup.

## Testing

The library is covered by two test layers:

- **Unit tests** (`pnpm test`): Vitest suite covering core logic, reducers, renderers, and edge cases.
- **End-to-end tests** (`pnpm e2e`): Playwright suite running real playback scenarios in a browser harness, including typing flows, waiting, multiline output, cursor movement, selection, editing, and callbacks.

## Development

```bash
pnpm dev           # start dev server
pnpm build         # build the library
pnpm test          # run unit tests
pnpm e2e           # run end-to-end tests
pnpm lint          # lint
pnpm sandbox       # start the sandbox
pnpm docs:dev      # start the docs site
```

## License

MIT
