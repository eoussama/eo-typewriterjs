import type { TScenario } from "../scenario.type";

import { createTypewriter, domRenderer } from "@eo-typewriterjs";



export const STYLING_SCENARIOS: readonly TScenario[] = [
  {
    id: "mark-after-typing",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello world", { by: "char", interval: 1 })
        .mark("tw-highlight", { from: 0, to: 5 });
      await tw.play();
    },
  },
  {
    id: "inline-style",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Plain ", { by: "char", interval: 1 })
        .type("styled", { by: "char", interval: 1, style: "tw-accent" });
      await tw.play();
    },
  },
  {
    id: "layered-marks",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Error | Ok", { by: "char", interval: 1 })
        .mark("tw-danger", { from: 0, to: 5 })
        .mark("tw-success", { from: 8, to: 10 });
      await tw.play();
    },
  },
  {
    id: "selection-mark",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello world", { by: "char", interval: 1 })
        .select(-5, { by: "char" })
        .mark("tw-highlight", "selection");
      await tw.play();
    },
  },
  {
    id: "style-object-mark",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Styled", { by: "char", interval: 1 })
        .mark({ css: { color: "red" } }, { from: 0, to: 6 });
      await tw.play();
    },
  },
];
