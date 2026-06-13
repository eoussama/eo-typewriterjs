---
title: Sandbox
---

# Interactive Sandbox

The sandbox is a standalone development playground where you can run custom typewriter snippets in real time.

It runs on a separate Vite dev server and imports directly from the library source — no build step required.

## Start the sandbox

```bash
pnpm sandbox
```

This opens the sandbox at **`http://localhost:5174`**.

## Features

- **Preview** panel — shows the live typewriter animation
- **Controls** — change advance unit, amount, and interval on the fly
- **Snippet presets** — one-click examples (Hello World, emoji, multiline, etc.)
- **Custom text editor** — type or paste any text; press **Ctrl + Enter** to run
- **Stop / Clear** — cancel the animation at any time

## Usage

1. Pick an advance unit from the **Controls** panel (e.g. `word`, `char`)
2. Set the interval in milliseconds
3. Click a **Snippet** or write your own text in the editor
4. Press **▶ Run** or `Ctrl+Enter`
