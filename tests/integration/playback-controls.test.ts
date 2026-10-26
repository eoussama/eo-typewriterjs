import { describe, expect, it } from "vitest";
import { createTypewriter, EPlaybackStatus, stringRenderer } from "../../src/index";



describe("playback controls, status", () => {
  it("starts in idle status", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    expect(tw.getState().status).toBe(EPlaybackStatus.IDLE);
  });

  it("transitions to playing while playing", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 20 });

    const playing = tw.play();

    expect(tw.getState().status).toBe(EPlaybackStatus.PLAYING);
    await playing;
  });

  it("pause() when not playing is a no-op", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("Hello", { by: "char", interval: 1 });
    // status is IDLE, pause should do nothing
    tw.pause();

    expect(tw.getState().status).toBe(EPlaybackStatus.IDLE);
  });

  it("calling play() while already playing returns immediately (no-op)", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 20 });
    const first = tw.play();
    const second = tw.play(); // already playing, no-op

    await Promise.all([first, second]);

    expect(renderer.toString()).toBe("Hello");
  });

  it("transitions to completed after natural finish", async () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("Hi", { by: "char", interval: 1 });
    await tw.play();

    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
  });

  it("transitions to paused after pause()", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: "char", interval: 20 });
    const playing = tw.play();

    tw.pause();

    expect(tw.getState().status).toBe(EPlaybackStatus.PAUSED);
    await playing;
  });

  it("transitions to stopped after stop()", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: "char", interval: 20 });
    const playing = tw.play();

    tw.stop();

    expect(tw.getState().status).toBe(EPlaybackStatus.STOPPED);
    await playing;
  });

  it("stop() resets rendered output to empty", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 1 });
    await tw.play();

    tw.stop();

    expect(renderer.toString()).toBe("");
  });

  it("replay() restarts from empty and completes with full text", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hi");
    await tw.replay();

    expect(renderer.toString()).toBe("Hi");
    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
  });

  it("calling play() again after completed replays from start", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 });
    await tw.play();
    await tw.play();

    expect(renderer.toString()).toBe("Hi");
    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
  });

  it("pause() then play() resumes and completes", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 10 });
    const firstPlay = tw.play();

    await new Promise(r => setTimeout(r, 5));
    tw.pause();
    await firstPlay;

    await tw.play();

    expect(renderer.toString()).toBe("Hello");
    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
  });
});


describe("playback controls, rate", () => {
  it("getState() reports default rate of 1", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    expect(tw.getState().rate).toBe(1);
  });

  it("setRate() updates the rate", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.setRate(2);

    expect(tw.getState().rate).toBe(2);
  });

  it("setRate(0) is ignored", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.setRate(0);

    expect(tw.getState().rate).toBe(1);
  });

  it("setRate(-1) is ignored", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.setRate(-1);

    expect(tw.getState().rate).toBe(1);
  });

  it("setRate while playing reschedules and completes correctly", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 50 });
    const playing = tw.play();

    await new Promise(r => setTimeout(r, 10));
    tw.setRate(10); // speed up dramatically

    await playing;

    expect(renderer.toString()).toBe("Hello");
  });
});


describe("playback controls, seek", () => {
  it("seek to 0 applies the t=0 event (first char)", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 100 });
    tw.seek(0);

    expect(renderer.toString()).toBe("H");
  });

  it("seek to duration shows full text", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 100 });
    tw.seek(Infinity);

    expect(renderer.toString()).toBe("Hello");
  });

  it("seek to middle shows partial text", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 100 });
    tw.seek(250);

    expect(renderer.toString()).toBe("Hel");
  });

  it("seek clamps negative values to 0 and applies t=0 event", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 100 });
    tw.seek(-999);

    expect(renderer.toString()).toBe("H");
  });

  it("seek marks completed when seeking to the end", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("Hi", { by: "char", interval: 100 });
    tw.seek(Infinity);

    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
  });

  it("getState().duration reflects the total timeline duration", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("Hi", { by: "char", interval: 100 });
    tw.seek(0);

    expect(tw.getState().duration).toBe(100);
  });

  it("seek while playing reschedules from the new position", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 50 });
    const playing = tw.play();

    await new Promise(r => setTimeout(r, 10));
    tw.seek(300); // jump forward

    await playing;

    expect(renderer.toString()).toBe("Hello");
  });
});


describe("playback controls, stepping", () => {
  it("stepForward applies one event group and pauses", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 100 });
    tw.stepForward();

    expect(renderer.toString()).toBe("H");
    expect(tw.getState().status).toBe(EPlaybackStatus.PAUSED);
  });

  it("stepForward all the way completes the animation", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 100 });
    tw.stepForward();
    tw.stepForward();

    expect(renderer.toString()).toBe("Hi");
    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
  });

  it("stepForward past the end stays completed", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("X", { by: "char", interval: 1 });
    tw.stepForward();
    tw.stepForward();

    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
  });

  it("stepBackward from beginning stays at index 0 and pauses", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("Hello", { by: "char", interval: 100 });
    tw.stepBackward();

    expect(tw.getState().status).toBe(EPlaybackStatus.PAUSED);
  });

  it("stepForward then stepBackward returns to empty state", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 100 });
    tw.stepForward();

    expect(renderer.toString()).toBe("H");

    tw.stepBackward();

    expect(renderer.toString()).toBe("");
    expect(tw.getState().status).toBe(EPlaybackStatus.PAUSED);
  });

  it("step forward multiple times then backward ends up at correct state", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 100 });
    tw.stepForward();
    tw.stepForward();
    tw.stepForward();
    tw.stepBackward();

    expect(renderer.toString()).toBe("He");
    expect(tw.getState().status).toBe(EPlaybackStatus.PAUSED);
  });

  it("stepBackward walks back through multi-event group at same timestamp", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // Multi-cursor: both "a" and "b" produce events at t=0 (same timestamp)
    tw.timeline.type("H", { cursor: ["a", "b"], by: "char", interval: 100 });
    tw.stepForward(); // applies all events at t=0 (2 events: a→H, b→H), currentEventIndex=2

    // stepBackward: lastAppliedTime=0, groupStart=1
    // while: groupStart(1) > 0 && events[0].time(0) === 0 → TRUE → groupStart-- → groupStart=0
    // if(groupStart===0) → TRUE → reset to initialState
    tw.stepBackward();

    expect(renderer.toString()).toBe("");
    expect(tw.getState().status).toBe(EPlaybackStatus.PAUSED);
  });
});
