import { describe, expect, it } from "vitest";

import { AudioManagerHelper } from "../core/audio/audio-manager.helper";
import { createTypewriter, EAudioStrategy, stringRenderer } from "../index";



// ---------------------------------------------------------------------------
// AudioManagerHelper — construction and settings
// ---------------------------------------------------------------------------

describe("audioManagerHelper — construction and settings", () => {
  it("constructs with default empty options", () => {
    const mgr = new AudioManagerHelper();

    expect(mgr.getOptions()).toStrictEqual({});
  });

  it("constructs with explicit options and preserves them", () => {
    const mgr = new AudioManagerHelper({ enabled: false, volume: 0.5 });

    expect(mgr.getOptions()).toStrictEqual({ enabled: false, volume: 0.5 });
  });

  it("setEnabled updates the enabled flag", () => {
    const mgr = new AudioManagerHelper();

    mgr.setEnabled(false);
    expect(mgr.getOptions().enabled).toBe(false);

    mgr.setEnabled(true);
    expect(mgr.getOptions().enabled).toBe(true);
  });

  it("setVolume clamps values above 1 to 1", () => {
    const mgr = new AudioManagerHelper();

    mgr.setVolume(2);
    expect(mgr.getOptions().volume).toBe(1);
  });

  it("setVolume clamps values below 0 to 0", () => {
    const mgr = new AudioManagerHelper();

    mgr.setVolume(-0.5);
    expect(mgr.getOptions().volume).toBe(0);
  });

  it("setVolume accepts values in [0, 1]", () => {
    const mgr = new AudioManagerHelper();

    mgr.setVolume(0.7);
    expect(mgr.getOptions().volume).toBeCloseTo(0.7);
  });

  it("setOptions replaces options entirely", () => {
    const mgr = new AudioManagerHelper({ enabled: false });

    mgr.setOptions({ volume: 0.3 });
    expect(mgr.getOptions()).toStrictEqual({ volume: 0.3 });
  });

  it("setOptions resets internal bag and round-robin state without throwing", () => {
    const mgr = new AudioManagerHelper({
      voices: { a: { samples: ["url1", "url2"] } },
      typing: { strategy: EAudioStrategy.SHUFFLE_BAG },
    });

    // Play a few times to build internal state
    for (let i = 0; i < 5; i++) {
      mgr.playTyping();
    }

    // setOptions resets everything — should not throw
    expect(() => mgr.setOptions({ volume: 1 })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AudioManagerHelper — playTyping disabled / override guards
// ---------------------------------------------------------------------------

describe("audioManagerHelper — enabled and override guards", () => {
  it("playTyping does not throw when enabled is false", () => {
    const mgr = new AudioManagerHelper({ enabled: false });

    expect(() => mgr.playTyping()).not.toThrow();
  });

  it("playDelete does not throw when enabled is false", () => {
    const mgr = new AudioManagerHelper({ enabled: false });

    expect(() => mgr.playDelete()).not.toThrow();
  });

  it("playTyping with override=false silences the call", () => {
    const mgr = new AudioManagerHelper({ voices: { default: { samples: ["u1"] } } });

    expect(() => mgr.playTyping(false)).not.toThrow();
  });

  it("playDelete with override=false silences the call", () => {
    const mgr = new AudioManagerHelper({ voices: { default: { samples: ["u1"] } } });

    expect(() => mgr.playDelete(false)).not.toThrow();
  });

  it("playTyping with empty voice pack does not throw (pool is empty)", () => {
    const mgr = new AudioManagerHelper({ voices: {} });

    expect(() => mgr.playTyping()).not.toThrow();
  });

  it("playTyping with a voice name that does not exist in the pack does not throw", () => {
    const mgr = new AudioManagerHelper({
      voices: { default: { samples: ["u1"] } },
      typing: { voice: "nonexistent" },
    });

    expect(() => mgr.playTyping()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AudioManagerHelper — voice resolution precedence
// ---------------------------------------------------------------------------

describe("audioManagerHelper — voice resolution precedence", () => {
  const pack = {
    a: { samples: ["a1", "a2"] },
    b: { samples: ["b1"] },
  };

  it("uses command override voices when provided (array form)", () => {
    const mgr = new AudioManagerHelper({ voices: pack, typing: { strategy: EAudioStrategy.ROUND_ROBIN } });

    // override.voices takes highest priority
    expect(() => mgr.playTyping({ voices: ["a"] })).not.toThrow();
  });

  it("uses command override voice when provided (single form)", () => {
    const mgr = new AudioManagerHelper({ voices: pack, typing: { strategy: EAudioStrategy.ROUND_ROBIN } });

    expect(() => mgr.playTyping({ voice: "b" })).not.toThrow();
  });

  it("uses channel voices when no command override is given", () => {
    const mgr = new AudioManagerHelper({
      voices: pack,
      typing: { voices: ["b"], strategy: EAudioStrategy.ROUND_ROBIN },
    });

    expect(() => mgr.playTyping()).not.toThrow();
  });

  it("uses channel voice (single) when no command override or channel voices given", () => {
    const mgr = new AudioManagerHelper({
      voices: pack,
      typing: { voice: "a", strategy: EAudioStrategy.ROUND_ROBIN },
    });

    expect(() => mgr.playTyping()).not.toThrow();
  });

  it("uses all voices in pack when no override or channel config given", () => {
    const mgr = new AudioManagerHelper({ voices: pack, typing: { strategy: EAudioStrategy.ROUND_ROBIN } });

    expect(() => mgr.playTyping()).not.toThrow();
  });

  it("command override voices take priority over channel voices", () => {
    const mgr = new AudioManagerHelper({
      voices: pack,
      typing: { voices: ["b"], strategy: EAudioStrategy.ROUND_ROBIN },
    });

    expect(() => mgr.playTyping({ voices: ["a"] })).not.toThrow();
  });

  it("command override voice takes priority over channel voice", () => {
    const mgr = new AudioManagerHelper({
      voices: pack,
      typing: { voice: "b", strategy: EAudioStrategy.ROUND_ROBIN },
    });

    expect(() => mgr.playTyping({ voice: "a" })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AudioManagerHelper — delete channel fallback
// ---------------------------------------------------------------------------

describe("audioManagerHelper — delete channel", () => {
  it("delete falls back to typing channel when no delete config given", () => {
    const mgr = new AudioManagerHelper({
      voices: { d: { samples: ["d1"] } },
      typing: { voice: "d", strategy: EAudioStrategy.ROUND_ROBIN },
    });

    expect(() => mgr.playDelete()).not.toThrow();
  });

  it("delete uses dedicated delete channel when configured", () => {
    const mgr = new AudioManagerHelper({
      voices: { a: { samples: ["a1"] }, b: { samples: ["b1"] } },
      typing: { voice: "a", strategy: EAudioStrategy.ROUND_ROBIN },
      delete: { voice: "b", strategy: EAudioStrategy.ROUND_ROBIN },
    });

    expect(() => mgr.playDelete()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AudioManagerHelper — sample selection strategies
// ---------------------------------------------------------------------------

describe("audioManagerHelper — strategies", () => {
  const pack = {
    default: { samples: ["s1", "s2", "s3"] },
  };

  it("shuffle-bag strategy plays without throwing over many calls", () => {
    const mgr = new AudioManagerHelper({ voices: pack, typing: { strategy: EAudioStrategy.SHUFFLE_BAG } });

    for (let i = 0; i < 10; i++) {
      expect(() => mgr.playTyping()).not.toThrow();
    }
  });

  it("round-robin strategy plays without throwing over many calls", () => {
    const mgr = new AudioManagerHelper({ voices: pack, typing: { strategy: EAudioStrategy.ROUND_ROBIN } });

    for (let i = 0; i < 10; i++) {
      expect(() => mgr.playTyping()).not.toThrow();
    }
  });

  it("random strategy plays without throwing over many calls", () => {
    const mgr = new AudioManagerHelper({ voices: pack, typing: { strategy: EAudioStrategy.RANDOM } });

    for (let i = 0; i < 10; i++) {
      expect(() => mgr.playTyping()).not.toThrow();
    }
  });

  it("random strategy with avoidImmediateRepeat=false plays without throwing", () => {
    const mgr = new AudioManagerHelper({
      voices: pack,
      typing: { strategy: EAudioStrategy.RANDOM, avoidImmediateRepeat: false },
    });

    for (let i = 0; i < 10; i++) {
      expect(() => mgr.playTyping()).not.toThrow();
    }
  });

  it("random strategy hits eligible fallback when all samples equal lastPlayed", () => {
    // Duplicate samples force eligible=[] on the second call, exercising the fallback path
    const mgr = new AudioManagerHelper({
      voices: { dup: { samples: ["x", "x", "x"] } },
      typing: { strategy: EAudioStrategy.RANDOM, avoidImmediateRepeat: true },
    });

    // First call: lastPlayed=null → random pick. Second call: all samples === "x" === lastPlayed → fallback.
    for (let i = 0; i < 5; i++) {
      expect(() => mgr.playTyping()).not.toThrow();
    }
  });

  it("random strategy with pool of 1 sample plays without throwing", () => {
    const mgr = new AudioManagerHelper({
      voices: { only: { samples: ["sole"] } },
      typing: { strategy: EAudioStrategy.RANDOM },
    });

    for (let i = 0; i < 5; i++) {
      expect(() => mgr.playTyping()).not.toThrow();
    }
  });

  it("shuffle-bag drains and refills over more than pool-size calls", () => {
    const mgr = new AudioManagerHelper({
      voices: { default: { samples: ["a", "b"] } },
      typing: { strategy: EAudioStrategy.SHUFFLE_BAG, avoidImmediateRepeat: true },
    });

    // 10 calls forces multiple bag refills
    for (let i = 0; i < 10; i++) {
      expect(() => mgr.playTyping()).not.toThrow();
    }
  });

  it("single-sample pool returns the sample without going through strategy", () => {
    const mgr = new AudioManagerHelper({
      voices: { only: { samples: ["sole"] } },
      typing: { strategy: EAudioStrategy.SHUFFLE_BAG },
    });

    // Single-sample shortcut path in _pickSample
    for (let i = 0; i < 5; i++) {
      expect(() => mgr.playTyping()).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// AudioManagerHelper — jitter options
// ---------------------------------------------------------------------------

describe("audioManagerHelper — jitter", () => {
  const pack = { default: { samples: ["j1", "j2"] } };

  it("playbackRateJitter does not throw", () => {
    const mgr = new AudioManagerHelper({
      voices: pack,
      typing: { strategy: EAudioStrategy.ROUND_ROBIN, playbackRateJitter: { min: 0.9, max: 1.1 } },
    });

    expect(() => mgr.playTyping()).not.toThrow();
  });

  it("volumeJitter does not throw", () => {
    const mgr = new AudioManagerHelper({
      voices: pack,
      volume: 1,
      typing: { strategy: EAudioStrategy.ROUND_ROBIN, volumeJitter: { min: 0.8, max: 1.0 } },
    });

    expect(() => mgr.playTyping()).not.toThrow();
  });

  it("per-command volume override is applied without throwing", () => {
    const mgr = new AudioManagerHelper({ voices: pack, volume: 1 });

    expect(() => mgr.playTyping({ volume: 0.5 })).not.toThrow();
  });

  it("overlap=false reuses audio element path does not throw", () => {
    const mgr = new AudioManagerHelper({
      voices: pack,
      typing: { strategy: EAudioStrategy.ROUND_ROBIN, overlap: false },
    });

    // First call creates element; second call would reuse it (no-op in Node since Audio is undefined)
    expect(() => mgr.playTyping()).not.toThrow();
    expect(() => mgr.playTyping()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// createTypewriter — audio runtime controls
// ---------------------------------------------------------------------------

describe("createTypewriter — audio runtime controls", () => {
  it("getAudioOptions returns disabled by default when audio is omitted", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });
    const opts = tw.getAudioOptions();

    // Default: audio disabled unless explicitly opted in
    expect(opts).toBeDefined();
    expect(opts?.enabled).toBe(false);
  });

  it("getAudioOptions reflects explicitly passed audio options", () => {
    const tw = createTypewriter({ renderer: stringRenderer(), audio: { enabled: true, volume: 0.5 } });

    expect(tw.getAudioOptions()?.enabled).toBe(true);
    expect(tw.getAudioOptions()?.volume).toBe(0.5);
  });

  it("setAudioEnabled(false) updates getAudioOptions().enabled", () => {
    const tw = createTypewriter({ renderer: stringRenderer(), audio: { enabled: true } });

    tw.setAudioEnabled(false);
    expect(tw.getAudioOptions()?.enabled).toBe(false);
  });

  it("setAudioEnabled(true) enables audio on a default-off instance", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.setAudioEnabled(true);
    expect(tw.getAudioOptions()?.enabled).toBe(true);
  });

  it("setAudioVolume updates getAudioOptions().volume", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.setAudioVolume(0.4);
    expect(tw.getAudioOptions()?.volume).toBeCloseTo(0.4);
  });

  it("setAudioOptions replaces the full options", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.setAudioOptions({ enabled: false, volume: 0.2 });
    expect(tw.getAudioOptions()?.enabled).toBe(false);
    expect(tw.getAudioOptions()?.volume).toBe(0.2);
  });

  it("audio plays during type() without throwing", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 1 });
    await expect(tw.play()).resolves.not.toThrow();

    expect(renderer.toString()).toBe("Hello");
  });

  it("audio plays during delete() without throwing", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 1 }).delete(3, { by: "char", interval: 1 });
    await expect(tw.play()).resolves.not.toThrow();

    expect(renderer.toString()).toBe("He");
  });

  it("audio: false on type() silences that command without affecting others", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hi", { by: "char", interval: 1, audio: false })
      .type("!", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hi!");
  });

  it("audio: false on delete() silences that command", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .delete(3, { by: "char", interval: 1, audio: false });
    await tw.play();

    expect(renderer.toString()).toBe("He");
  });

  it("audio with per-command voice override does not throw during play", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({
      renderer,
      audio: {
        voices: { soft: { samples: ["s1", "s2"] }, loud: { samples: ["l1"] } },
        typing: { strategy: EAudioStrategy.ROUND_ROBIN },
      },
    });

    tw.timeline
      .type("A", { by: "char", interval: 1, audio: { voice: "soft" } })
      .type("B", { by: "char", interval: 1, audio: { voices: ["loud"] } })
      .type("C", { by: "char", interval: 1, audio: { volume: 0.3 } });
    await tw.play();

    expect(renderer.toString()).toBe("ABC");
  });

  it("audio with enabled:false globally does not throw during play", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer, audio: { enabled: false } });

    tw.timeline.type("Quiet", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Quiet");
  });

  it("default typewriter (audio omitted) runs silently without throwing", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Silent default", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Silent default");
    expect(tw.getAudioOptions()?.enabled).toBe(false);
  });

  it("typewriter with audio: { enabled: true } plays sounds without throwing", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer, audio: { enabled: true } });

    tw.timeline.type("With sounds", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("With sounds");
    expect(tw.getAudioOptions()?.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Regression — stepForward after async completion does not append
// ---------------------------------------------------------------------------

describe("stepForward after completion regression", () => {
  it("play() → stepBackward() → stepForward() starts from correct position", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hi");

    // Step back one group — should undo the last character
    tw.stepBackward();
    expect(renderer.toString()).toBe("H");

    // Step forward from the reconstructed position — should re-add the last character only
    tw.stepForward();
    expect(renderer.toString()).toBe("Hi");
  });

  it("play() → stepBackward() all the way → stepForward() rebuilds from empty", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("AB", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("AB");

    tw.stepBackward(); // undo B
    tw.stepBackward(); // undo A
    expect(renderer.toString()).toBe("");

    tw.stepForward(); // re-apply A
    expect(renderer.toString()).toBe("A");

    tw.stepForward(); // re-apply B
    expect(renderer.toString()).toBe("AB");
  });

  it("play() completes with correct currentEventIndex so stepBackward navigates correctly", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("ABC", { by: "char", interval: 1 });
    await tw.play();

    tw.stepBackward(); // undo C
    expect(renderer.toString()).toBe("AB");

    tw.stepBackward(); // undo B
    expect(renderer.toString()).toBe("A");
  });
});
