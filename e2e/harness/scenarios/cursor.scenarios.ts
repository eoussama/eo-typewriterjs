import type { TScenario } from "../scenario.type";

import { createTypewriter, domRenderer, ECursorKind } from "@eo-typewriterjs";



export const CURSOR_SCENARIOS: readonly TScenario[] = [
  {
    id: "cursor-exists",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("Hello", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "cursor-kind-pipe",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el), cursor: { kind: ECursorKind.PIPE } });

      tw.timeline.type("Hello", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "cursor-kind-block",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el), cursor: { kind: ECursorKind.BLOCK } });

      tw.timeline.type("Hello", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "cursor-hidden",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el), cursor: { visible: false } });

      tw.timeline.type("Hello", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "cursor-hidden-then-revealed",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el), cursor: { visible: false } });

      tw.timeline
        .type("Hello", { by: "char", interval: 1 })
        .call(() => { tw.setCursorVisible(true); });
      await tw.play();
    },
  },
  {
    id: "cursor-swap",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el), cursor: { kind: ECursorKind.PIPE } });

      tw.timeline
        .type("pipe", { by: "char", interval: 1 })
        .call(() => { tw.setCursorOptions({ kind: ECursorKind.BLOCK }); })
        .type(" block", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "move-cursor-type",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello World", { by: "char", interval: 1 })
        .moveCursor(5)
        .type(",", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "multi-cursor-mirror",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Name: \nRole: ", { by: "char", interval: 1 })
        .moveCursor(6, { cursor: "b" })
        .type("Alice", { cursor: ["main", "b"], by: "char", interval: 1 });
      await tw.play();
    },
  },
];
