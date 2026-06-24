/**
 * @description
 * Subpath entry for the built-in SFX pack.
 *
 * The pack is code-split from the main bundle so consumers who do not use
 * audio do not pay the byte cost.
 *
 * Usage:
 * ```ts
 * import { DEFAULT_SFX_PACK } from "eo-typewriterjs/audio-pack";
 * ```
 *
 * The audio engine uses this pack automatically at runtime when no custom
 * `sfxs` are provided in `TAudioOptions`. Import it here only if you need
 * to reference or extend it explicitly.
 */
export { DEFAULT_SFX_PACK } from "./core/audio/consts/default-sfx-pack.const";
export type { TAudioSfx, TAudioSfxPack } from "./core/audio/types/audio-sfx.type";
