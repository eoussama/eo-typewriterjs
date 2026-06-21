/**
 * @description
 * A named collection of audio sample sources (URL strings or data URLs)
 */
export type TAudioVoice = {
  /**
   * @description
   * One or more audio sample sources. Multiple samples enable
   * variance strategies (shuffle-bag, round-robin, random).
   * Each entry may be a relative/absolute URL or a base64 data URL.
   */
  readonly samples: readonly string[];
};

/**
 * @description
 * A dictionary of named voices.
 * The key is the voice name referenced by channel or command config.
 */
export type TAudioVoicePack = {
  readonly [name: string]: TAudioVoice;
};
