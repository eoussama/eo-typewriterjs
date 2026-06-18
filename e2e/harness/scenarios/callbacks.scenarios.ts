import type { TScenario } from "../scenario.type";

import { createTypewriter, domRenderer } from "@eo-typewriterjs";



export const CALLBACKS_SCENARIOS: readonly TScenario[] = [
  {
    id: "call-fires",
    async run({ el, log }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello", { by: "char", interval: 1 })
        .call(({ state }) => {
          log(`text:${state.document.text}`);
        })
        .type("!", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "async-call",
    async run({ el, log }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Before", { by: "char", interval: 1 })
        .call(async () => {
          await new Promise<void>(resolve => setTimeout(resolve, 10));
          log("async-done");
        })
        .type(" After", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "cancel-from-callback",
    async run({ el, log, setStatus }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Partial", { by: "char", interval: 1 })
        .call(() => { tw.cancel(); })
        .type(" never", { by: "char", interval: 1 });
      await tw.play();
      setStatus(tw.getState().status);
      log(`text:${tw.getLiveState().document.text}`);
    },
  },
  {
    id: "before-after-hooks",
    async run({ el, log }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("Hello", {
        by: "char",
        interval: 1,
        before: {
          callback: () => { log("before"); },
        },
        after: {
          callback: () => { log("after"); },
        },
      });
      await tw.play();
    },
  },
  {
    id: "per-char-hook",
    async run({ el, log }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("Hi", {
        by: "char",
        interval: 1,
        after: {
          unit: "char",
          callback: ({ stepIndex }) => { log(`step:${stepIndex}`); },
        },
      });
      await tw.play();
    },
  },
  {
    id: "per-char-before-hook",
    async run({ el, log }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("Hi", {
        by: "char",
        interval: 1,
        before: {
          unit: "char",
          callback: ({ stepIndex }) => { log(`before:${stepIndex}`); },
        },
      });
      await tw.play();
    },
  },
  {
    id: "cancel-from-type-before",
    async run({ el, log, setStatus }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Never", {
          by: "char",
          interval: 1,
          before: {
            callback: () => {
              log("before-fired");
              tw.cancel();
            },
          },
        })
        .type(" also-never", { by: "char", interval: 1 });
      await tw.play();
      setStatus(tw.getState().status);
    },
  },
  {
    id: "cancel-from-wait-before",
    async run({ el, log, setStatus }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Before", { by: "char", interval: 1 })
        .wait(5000, {
          before: {
            callback: () => {
              log("wait-before-fired");
              tw.cancel();
            },
          },
          after: {
            callback: () => { log("wait-after-fired"); },
          },
        })
        .type(" After", { by: "char", interval: 1 });
      await tw.play();
      setStatus(tw.getState().status);
    },
  },
  {
    id: "cancel-from-call-before",
    async run({ el, log, setStatus }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      let callbackFired = false;

      tw.timeline
        .type("Hello", { by: "char", interval: 1 })
        .call(
          () => { callbackFired = true; },
          {
            before: {
              callback: () => {
                log("call-before-fired");
                tw.cancel();
              },
            },
          },
        )
        .type(" world", { by: "char", interval: 1 });
      await tw.play();
      setStatus(tw.getState().status);
      log(`callback:${callbackFired}`);
    },
  },
  {
    id: "delete-per-unit-hooks",
    async run({ el, log }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello", { by: "char", interval: 1 })
        .delete(3, {
          by: "char",
          interval: 1,
          before: {
            unit: "char",
            callback: ({ stepIndex }) => { log(`del-before:${stepIndex}`); },
          },
          after: {
            unit: "char",
            callback: ({ stepIndex }) => { log(`del-after:${stepIndex}`); },
          },
        });
      await tw.play();
    },
  },
  {
    id: "whole-command-before-after",
    async run({ el, log }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.delete(2, {
        by: "char",
        interval: 1,
        before: { callback: () => { log("whole-before"); } },
        after: { callback: () => { log("whole-after"); } },
      });

      tw.timeline.type("Hi", { by: "char", interval: 1 });
      await tw.play();
    },
  },
];
