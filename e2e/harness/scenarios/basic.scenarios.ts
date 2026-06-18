import type { TScenario } from "../scenario.type";

import { createTypewriter, domRenderer } from "@eo-typewriterjs";



export const BASIC_SCENARIOS: readonly TScenario[] = [
  {
    id: "hello-world",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("Hello, World!", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "type-and-wait",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Loading", { by: "char", interval: 1 })
        .wait(0)
        .type(" Done!", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "type-by-word",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("Hello world", { by: "word", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "multiline",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Line one\n", { by: "char", interval: 1 })
        .type("Line two\n", { by: "char", interval: 1 })
        .type("Line three", { by: "char", interval: 1 });
      await tw.play();
    },
  },
];
