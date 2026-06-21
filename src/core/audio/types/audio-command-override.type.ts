/**
 * @description
 * Per-command audio override.
 * Set to `false` to silence audio for this specific command.
 * Set to an object to use a specific sfx or volume for this command.
 */
export type TAudioCommandOverride
  = | false
    | {
    /**
     * @description
     * Name of a single sfx from the sfx pack to use for this command.
     * Takes priority over the channel default.
     */
      readonly sfx?: string;

      /**
       * @description
       * Subset of sfx names to select from for this command.
       * When provided, the audio manager picks from only these sfxs.
       * Takes priority over `sfx` when both are set.
       */
      readonly sfxs?: readonly string[];

      /**
       * @description
       * Per-command volume override in the range [0, 1].
       * Multiplied against the master volume.
       */
      readonly volume?: number;
    };
