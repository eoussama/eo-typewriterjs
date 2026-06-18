import type { TScenario } from "../scenario.type";

import { createTypewriter, domRenderer } from "@eo-typewriterjs";



export const EDITING_SCENARIOS: readonly TScenario[] = [
  {
    id: "delete-chars",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello world", { by: "char", interval: 1 })
        .delete(6, { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "insert-in-middle",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("world", { by: "char", interval: 1 })
        .moveCursor(0)
        .type("Hello ", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "delete-by-word",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("one two three", { by: "char", interval: 1 })
        .delete(1, { by: "word", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "type-and-retype",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello", { by: "char", interval: 1 })
        .delete(5, { by: "char", interval: 1 })
        .type("World", { by: "char", interval: 1 });
      await tw.play();
    },
  },
];
