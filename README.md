<p align="center">
    <a href="https://eo-typewriterjs.ouss.es">
      <img src="https://raw.githubusercontent.com/eoussama/eo-typewriterjs/refs/heads/master/assets/logo.svg" alt="Logo" width="200px">
      <h1 align="center">eo-typewriterjs</h1>
    </a>
    <p align="center">Build rich typewriter animations with a composable timeline, full Unicode support, and a renderer-agnostic architecture that works in the browser and on the server.</p>
    <p align="center">
        <img src="https://img.shields.io/npm/v/eo-typewriterjs.svg" alt="npm version">
        <img src="https://img.shields.io/npm/dm/eo-typewriterjs.svg" alt="npm downloads">
        <img src="https://img.shields.io/github/actions/workflow/status/eoussama/eo-typewriterjs/ci.yml?branch=master&label=CI" alt="CI status">
        <img src="https://img.shields.io/github/license/eoussama/eo-typewriterjs.svg" alt="License">
    </p>
</p>

---

## Install

```bash
pnpm add eo-typewriterjs
# or: npm install eo-typewriterjs / yarn add eo-typewriterjs
```

The package is also published to GitHub Packages as `@eoussama/eo-typewriterjs`, and ships browser bundles for a plain `<script>` tag:

```html
<script src="https://cdn.jsdelivr.net/npm/eo-typewriterjs@6/dist/index.iife.js"></script>
<script>
  const { createTypewriter, domRenderer } = EOTypewriterJS;
</script>
```

## Why eo-typewriterjs

- **Composable timeline**: chain type, delete, wait, move, select, unselect, style, unstyle, and call commands in any order.
- **Full playback control**: play, pause, resume, seek, step, change speed, replay or cancel at any point; hooks, callbacks and sounds keep firing wherever playback resumes.
- **Flexible advance modes**: type by grapheme, word, line, the whole text, or a custom chunk size.
- **Full Unicode**: emoji, flags, ZWJ sequences and accented text are never split.
- **Rich text**: style ranges while typing or afterwards, with nested styles and selections.
- **Typing sounds**: opt-in audio with distinct sounds for typing, deleting and moving the cursor.
- **Renderer-agnostic**: built-in DOM and string renderers; implement `IRenderer` to target anything.
- **TypeScript-first**: fully typed public API, ESM and CommonJS builds with type declarations.

## Quick start

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const tw = createTypewriter({
  renderer: domRenderer("#output"),
});

tw.timeline
  .type("Hello, ")
  .type("world!", { by: "word", interval: 120 })
  .wait(400)
  .delete(-6)
  .type("EO TypewriterJS.");

await tw.play();
```

## Documentation

Full documentation, guides, and the API reference are available on the docs site.

- [Docs site](https://eo-typewriterjs.ouss.es/)
- [Getting started](https://eo-typewriterjs.ouss.es/guide/getting-started)
- [Core concepts](https://eo-typewriterjs.ouss.es/guide/core-concepts)
- [Timeline](https://eo-typewriterjs.ouss.es/guide/timeline)
- [Renderers](https://eo-typewriterjs.ouss.es/guide/renderers)
- [Recipes](https://eo-typewriterjs.ouss.es/guide/recipes)
- [API reference](https://eo-typewriterjs.ouss.es/api/)

## Sandbox

Try the library live in the interactive [sandbox](https://eo-typewriterjs.ouss.es/sandbox), write timelines, run them, and see output in real time without any setup.

## Testing

- **Unit and integration tests** (`pnpm test`): Vitest, with a 100% coverage threshold.
- **Smoke tests** (`pnpm test:smoke`): import the built ESM and CommonJS packages.
- **End-to-end tests** (`pnpm test:e2e`): Playwright, covering a browser harness of playback scenarios, the docs site and every sandbox recipe. Build the docs first with `pnpm docs:build`.
- **Mutation tests** (`pnpm test:mutation`): Stryker, failing below a 95% mutation score.

## Development

Requires Node.js 24 or later and pnpm 12.15.0. Recent pnpm versions switch to the pinned version from `package.json` on their own; npm is refused.

```bash
pnpm install
pnpm dev           # rebuild the library on change
pnpm build         # build the library
pnpm typecheck     # type check with TypeScript 7
pnpm lint          # lint
pnpm test          # run unit and integration tests with coverage
pnpm docs:dev      # start the docs site, sandbox included (/sandbox)
pnpm check         # run every check CI runs
```

## License

MIT
