import type { TScenario } from "../scenario.type";

import { createTypewriter, domRenderer, EPlaybackStatus } from "@eo-typewriterjs";



export const CONTROLS_SCENARIOS: readonly TScenario[] = [
  {
    id: "stop-reset",
    async run({ el, setStatus }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("Hello", { by: "char", interval: 1 });
      await tw.play();
      tw.stop();
      setStatus(tw.getState().status);
    },
  },
  {
    id: "replay",
    async run({ el, setStatus }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("Hello", { by: "char", interval: 1 });
      await tw.play();
      await tw.replay();
      setStatus(tw.getState().status);
    },
  },
  {
    id: "seek-end",
    async run({ el, setStatus }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("Hello", { by: "char", interval: 100 });
      tw.seek(Infinity);
      setStatus(tw.getState().status);
    },
  },
  {
    id: "seek-middle",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("Hello", { by: "char", interval: 100 });
      tw.seek(250);
    },
  },
  {
    id: "step-forward",
    async run({ el, setStatus }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.wait(1).type("Hello", { by: "char", interval: 100 });
      tw.seek(0);
      tw.stepForward();
      setStatus(tw.getState().status);
    },
  },
  {
    id: "step-backward",
    async run({ el, setStatus }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.wait(1).type("Hello", { by: "char", interval: 100 });
      tw.seek(0);
      tw.stepForward();
      tw.stepForward();
      tw.stepBackward();
      setStatus(tw.getState().status);
    },
  },
  {
    id: "rate-control",
    async run({ el, setStatus }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("Hello", { by: "char", interval: 50 });
      tw.setRate(10);
      await tw.play();
      setStatus(tw.getState().status);
    },
  },
  {
    id: "pause-resume",
    async run({ el, setStatus }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("Hello world", { by: "char", interval: 20 });

      const playing = tw.play();

      await new Promise<void>(resolve => setTimeout(resolve, 10));
      tw.pause();

      const pausedStatus = tw.getState().status;

      setStatus(pausedStatus);

      if (pausedStatus === EPlaybackStatus.PAUSED) {
        await tw.play();
        setStatus(tw.getState().status);
      }

      await playing;
    },
  },
];
