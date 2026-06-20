import type { AudioManagerHelper } from "../audio/audio-manager.helper";
import type { TCallCommand } from "../commands/call-command.type";
import type { TCallbackContext, TCallbackHook } from "../commands/callback-hook.type";
import type { TDeleteCommand } from "../commands/delete-command.type";
import type { TMoveCommand } from "../commands/move-command.type";
import type { TSelectCommand } from "../commands/select-command.type";
import type { TStyleCommand } from "../commands/style-command.type";
import type { TAdvanceModeInput, TTypeCommand } from "../commands/type-command.type";
import type { TUnselectCommand } from "../commands/unselect-command.type";
import type { TUnstyleCommand } from "../commands/unstyle-command.type";
import type { TWaitCommand } from "../commands/wait-command.type";
import type { TCommand } from "../compiler/compile.helper";
import type { TDeleteEvent } from "../events/delete-event.type";
import type { TInsertEvent } from "../events/insert-event.type";
import type { IRenderer } from "../renderer/renderer.interface";
import type { TTypewriterState } from "../state/typewriter-state.type";

import { ECommandKind } from "../commands/command-kind.enum";
import { normalizeCursors } from "../commands/normalize-cursors.helper";
import { compileMove } from "../compiler/compile-move.helper";
import { compileSelect } from "../compiler/compile-select.helper";
import { compileStyle } from "../compiler/compile-style.helper";
import { compileUnselect } from "../compiler/compile-unselect.helper";
import { compileUnstyle } from "../compiler/compile-unstyle.helper";
import { EEventKind } from "../events/event-kind.enum";
import { reduce } from "../reducer/reduce.helper";
import { chunkSteps } from "../stepping/chunk-steps.helper";
import { segmentText } from "../stepping/segment-text.helper";



const DEFAULT_INTERVAL = 50;
let _execEventCounter = 0;

/**
 * @description
 * Options passed to the command executor
 */
export type TExecuteCommandsOptions = {
  /**
   * @description
   * AbortSignal, when aborted, execution stops after the current awaited step
   */
  readonly signal: AbortSignal;

  /**
   * @description
   * Returns the current playback rate multiplier (> 0).
   * Delays are divided by this value, so rate=2 plays at double speed.
   */
  readonly getRate: () => number;

  /**
   * @description
   * Optional callback that returns the current live typewriter state from the
   * controller. When provided, executeCall() reads this back after each
   * callback fires so that runtime mutations made inside call() (e.g.
   * setCursorVisible, setCursorOptions) are reflected in subsequent commands.
   */
  readonly getLiveState?: () => TTypewriterState;

  /**
   * @description
   * Optional audio manager instance.
   * When provided, sounds are played on each step and on instant commands.
   */
  readonly getAudioManager?: () => AudioManagerHelper | null;
};

/**
 * @description
 * Result returned by executeCommands
 */
export type TExecuteCommandsResult = {
  /**
   * @description
   * The final typewriter state after executing all commands (or the state at
   * the point of interruption if the signal was aborted)
   */
  readonly state: TTypewriterState;

  /**
   * @description
   * The index of the next command that would have run if not interrupted.
   * Equals `commands.length` when all commands finished normally.
   */
  readonly nextCommandIndex: number;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * @description
 * Await a delay scaled by the current rate, and reject early if aborted
 *
 * @param ms - The nominal delay in milliseconds (at rate 1)
 * @param options - Executor options for rate and abort signal
 * @returns A promise that resolves after the scaled delay, or rejects with an AbortError
 */
function awaitDelay(ms: number, options: TExecuteCommandsOptions): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    /* v8 ignore next */
    const scaled = ms / Math.max(options.getRate(), Number.EPSILON);
    const timer = setTimeout(resolve, Math.max(0, scaled));

    options.signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/**
 * @description
 * Resolve a TAdvanceModeInput into unit and amount
 *
 * @param input - The raw advance mode input
 * @returns Resolved unit and amount
 */
function resolveAdvanceMode(input: TAdvanceModeInput | undefined): { unit: string; amount: number } {
  if (input === undefined) {
    return { unit: "char", amount: 1 };
  }

  if (typeof input === "string") {
    return { unit: input, amount: 1 };
  }

  return { unit: input.unit, amount: input.amount };
}

/**
 * @description
 * Build a TCallbackContext for a hook invocation
 *
 * @param state - Current typewriter state
 * @param stepIndex - Current step index within the command
 * @param stepCount - Total step count for the command
 * @param unit - The advance unit, or null for whole-command hooks
 * @param signal - The active AbortSignal
 * @returns A populated TCallbackContext
 */
function makeContext(
  state: TTypewriterState,
  stepIndex: number,
  stepCount: number,
  unit: string | null,
  signal: AbortSignal,
): TCallbackContext {
  return {
    state,
    stepIndex,
    stepCount,
    unit: unit as TCallbackContext["unit"],
    signal,
  };
}

/**
 * @description
 * Invoke a callback hook, awaiting any returned promise.
 * Does nothing if the hook is undefined.
 *
 * @param hook - The callback hook to invoke, or undefined
 * @param ctx - The context to pass to the callback
 * @returns A promise that resolves when the hook completes (or immediately if undefined)
 */
async function invokeHook(hook: TCallbackHook | undefined, ctx: TCallbackContext): Promise<void> {
  if (hook === undefined) {
    return;
  }

  await hook.callback(ctx);
}

/**
 * @description
 * Determine whether a hook is configured as per-unit (has a unit property).
 *
 * @param hook - The hook to inspect
 * @returns True if the hook should fire per-step
 */
function isPerUnitHook(hook: TCallbackHook | undefined): boolean {
  return hook !== undefined && hook.unit !== undefined;
}

// ---------------------------------------------------------------------------
// Per-command executors
// ---------------------------------------------------------------------------

/**
 * @description
 * Execute a type command, applying each chunk as an insert event and invoking
 * per-unit or whole-command hooks as configured.
 *
 * @param command - The type command to execute
 * @param state - The state before this command
 * @param renderer - The renderer to update after each step
 * @param options - Executor control options
 * @returns The state after all steps have been applied
 */
async function executeType(
  command: TTypeCommand,
  state: TTypewriterState,
  renderer: IRenderer,
  options: TExecuteCommandsOptions,
): Promise<TTypewriterState> {
  const mode = resolveAdvanceMode(command.by);
  const interval = command.interval ?? DEFAULT_INTERVAL;
  const steps = segmentText(command.text, mode.unit as Parameters<typeof segmentText>[1]);
  const chunks = chunkSteps(steps, mode.amount);
  const cursorIds = normalizeCursors(command.cursor);
  const stepCount = chunks.length;

  const perUnitBefore = isPerUnitHook(command.before) ? command.before : undefined;
  const perUnitAfter = isPerUnitHook(command.after) ? command.after : undefined;
  const wholeCommandBefore = !isPerUnitHook(command.before) ? command.before : undefined;
  const wholeCommandAfter = !isPerUnitHook(command.after) ? command.after : undefined;

  await invokeHook(wholeCommandBefore, makeContext(state, 0, 1, null, options.signal));

  if (options.signal.aborted) {
    return state;
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;

    /* v8 ignore next 3 */
    if (options.signal.aborted) {
      break;
    }

    if (perUnitBefore !== undefined) {
      await invokeHook(perUnitBefore, makeContext(state, i, stepCount, mode.unit, options.signal));

      if (options.signal.aborted) {
        break;
      }
    }

    options.getAudioManager?.()?.playTyping(command.audio);

    for (const cursorId of cursorIds) {
      const event: TInsertEvent = {
        id: `exec_ins_${++_execEventCounter}`,
        kind: EEventKind.INSERT,
        time: 0,
        cursorId,
        text: chunk,
        sourceCommandId: command.id,
        ...(command.style !== undefined ? { style: command.style } : {}),
      };

      state = reduce(state, event);
    }

    renderer.render(state);

    if (perUnitAfter !== undefined) {
      await invokeHook(perUnitAfter, makeContext(state, i, stepCount, mode.unit, options.signal));

      if (options.signal.aborted) {
        break;
      }
    }

    if (i < chunks.length - 1 && !options.signal.aborted) {
      await awaitDelay(interval, options);
    }
  }

  if (!options.signal.aborted) {
    await invokeHook(wholeCommandAfter, makeContext(state, 0, 1, null, options.signal));
  }

  return state;
}

/**
 * @description
 * Execute a delete command, applying each delete event and invoking per-unit or
 * whole-command hooks as configured.
 *
 * @param command - The delete command to execute
 * @param state - The state before this command
 * @param renderer - The renderer to update after each step
 * @param options - Executor control options
 * @returns The state after all steps have been applied
 */
async function executeDelete(
  command: TDeleteCommand,
  state: TTypewriterState,
  renderer: IRenderer,
  options: TExecuteCommandsOptions,
): Promise<TTypewriterState> {
  const mode = resolveAdvanceMode(command.by);
  const interval = command.interval ?? DEFAULT_INTERVAL;
  const amount = Math.max(1, mode.amount);
  const totalUnits = Math.max(0, command.count);
  const stepCount = Math.ceil(totalUnits / amount);
  const cursorIds = normalizeCursors(command.cursor);

  const perUnitBefore = isPerUnitHook(command.before) ? command.before : undefined;
  const perUnitAfter = isPerUnitHook(command.after) ? command.after : undefined;
  const wholeCommandBefore = !isPerUnitHook(command.before) ? command.before : undefined;
  const wholeCommandAfter = !isPerUnitHook(command.after) ? command.after : undefined;

  await invokeHook(wholeCommandBefore, makeContext(state, 0, 1, null, options.signal));

  if (options.signal.aborted) {
    return state;
  }

  for (let i = 0; i < stepCount; i++) {
    /* v8 ignore next 3 */
    if (options.signal.aborted) {
      break;
    }

    const remaining = totalUnits - i * amount;
    const stepUnits = Math.min(amount, remaining);

    if (perUnitBefore !== undefined) {
      await invokeHook(perUnitBefore, makeContext(state, i, stepCount, mode.unit, options.signal));

      if (options.signal.aborted) {
        break;
      }
    }

    options.getAudioManager?.()?.playDelete(command.audio);

    for (const cursorId of cursorIds) {
      const event: TDeleteEvent = {
        id: `exec_del_${++_execEventCounter}`,
        kind: EEventKind.DELETE,
        time: 0,
        cursorId,
        count: stepUnits,
        unit: mode.unit as TDeleteEvent["unit"],
        sourceCommandId: command.id,
      };

      state = reduce(state, event);
    }

    renderer.render(state);

    if (perUnitAfter !== undefined) {
      await invokeHook(perUnitAfter, makeContext(state, i, stepCount, mode.unit, options.signal));

      if (options.signal.aborted) {
        break;
      }
    }

    if (i < stepCount - 1 && !options.signal.aborted) {
      await awaitDelay(interval, options);
    }
  }

  if (!options.signal.aborted) {
    await invokeHook(wholeCommandAfter, makeContext(state, 0, 1, null, options.signal));
  }

  return state;
}

/**
 * @description
 * Execute a wait command, pausing for the given duration with before/after hooks.
 *
 * @param command - The wait command to execute
 * @param state - The current typewriter state (unchanged by wait)
 * @param options - Executor control options
 * @returns The unchanged state
 */
async function executeWait(
  command: TWaitCommand,
  state: TTypewriterState,
  options: TExecuteCommandsOptions,
): Promise<TTypewriterState> {
  await invokeHook(command.before, makeContext(state, 0, 1, null, options.signal));

  if (!options.signal.aborted) {
    options.getAudioManager?.()?.playTyping(command.audio);
    await awaitDelay(command.duration, options);
  }

  if (!options.signal.aborted) {
    await invokeHook(command.after, makeContext(state, 0, 1, null, options.signal));
  }

  return state;
}

/**
 * @description
 * Execute a move command (instant), invoking hooks around it.
 *
 * @param command - The move command to execute
 * @param state - The state before this command
 * @param renderer - The renderer to update
 * @param options - Executor control options
 * @returns The state after the cursor move
 */
async function executeMove(
  command: TMoveCommand,
  state: TTypewriterState,
  renderer: IRenderer,
  options: TExecuteCommandsOptions,
): Promise<TTypewriterState> {
  await invokeHook(command.before, makeContext(state, 0, 1, null, options.signal));

  if (options.signal.aborted) {
    return state;
  }

  const { events } = compileMove(command, 0);

  for (const event of events) {
    state = reduce(state, event);
  }

  options.getAudioManager?.()?.playTyping(command.audio);
  renderer.render(state);

  if (!options.signal.aborted) {
    await invokeHook(command.after, makeContext(state, 0, 1, null, options.signal));
  }

  return state;
}

/**
 * @description
 * Execute a select command (instant), invoking hooks around it.
 *
 * @param command - The select command to execute
 * @param state - The state before this command
 * @param renderer - The renderer to update
 * @param options - Executor control options
 * @returns The state after the selection
 */
async function executeSelect(
  command: TSelectCommand,
  state: TTypewriterState,
  renderer: IRenderer,
  options: TExecuteCommandsOptions,
): Promise<TTypewriterState> {
  await invokeHook(command.before, makeContext(state, 0, 1, null, options.signal));

  if (options.signal.aborted) {
    return state;
  }

  const { events } = compileSelect(command, 0);

  for (const event of events) {
    state = reduce(state, event);
  }

  options.getAudioManager?.()?.playTyping(command.audio);
  renderer.render(state);

  if (!options.signal.aborted) {
    await invokeHook(command.after, makeContext(state, 0, 1, null, options.signal));
  }

  return state;
}

/**
 * @description
 * Execute an unselect command (instant), invoking hooks around it.
 *
 * @param command - The unselect command to execute
 * @param state - The state before this command
 * @param renderer - The renderer to update
 * @param options - Executor control options
 * @returns The state after the selection is cleared
 */
async function executeUnselect(
  command: TUnselectCommand,
  state: TTypewriterState,
  renderer: IRenderer,
  options: TExecuteCommandsOptions,
): Promise<TTypewriterState> {
  await invokeHook(command.before, makeContext(state, 0, 1, null, options.signal));

  if (options.signal.aborted) {
    return state;
  }

  const { events } = compileUnselect(command, 0);

  for (const event of events) {
    state = reduce(state, event);
  }

  options.getAudioManager?.()?.playTyping(command.audio);
  renderer.render(state);

  if (!options.signal.aborted) {
    await invokeHook(command.after, makeContext(state, 0, 1, null, options.signal));
  }

  return state;
}

/**
 * @description
 * Execute a style command (instant), invoking hooks around it.
 *
 * @param command - The style command to execute
 * @param state - The state before this command
 * @param renderer - The renderer to update
 * @param options - Executor control options
 * @returns The state after the style is applied
 */
async function executeStyle(
  command: TStyleCommand,
  state: TTypewriterState,
  renderer: IRenderer,
  options: TExecuteCommandsOptions,
): Promise<TTypewriterState> {
  await invokeHook(command.before, makeContext(state, 0, 1, null, options.signal));

  if (options.signal.aborted) {
    return state;
  }

  const { events } = compileStyle(command, 0);

  for (const event of events) {
    state = reduce(state, event);
  }

  options.getAudioManager?.()?.playTyping(command.audio);
  renderer.render(state);

  if (!options.signal.aborted) {
    await invokeHook(command.after, makeContext(state, 0, 1, null, options.signal));
  }

  return state;
}

/**
 * @description
 * Execute an unstyle command (instant), invoking hooks around it.
 *
 * @param command - The unstyle command to execute
 * @param state - The state before this command
 * @param renderer - The renderer to update
 * @param options - Executor control options
 * @returns The state after styles are removed or clipped
 */
async function executeUnstyle(
  command: TUnstyleCommand,
  state: TTypewriterState,
  renderer: IRenderer,
  options: TExecuteCommandsOptions,
): Promise<TTypewriterState> {
  await invokeHook(command.before, makeContext(state, 0, 1, null, options.signal));

  if (options.signal.aborted) {
    return state;
  }

  const { events } = compileUnstyle(command, 0);

  for (const event of events) {
    state = reduce(state, event);
  }

  options.getAudioManager?.()?.playTyping(command.audio);
  renderer.render(state);

  if (!options.signal.aborted) {
    await invokeHook(command.after, makeContext(state, 0, 1, null, options.signal));
  }

  return state;
}

/**
 * @description
 * Execute a call command, invoke the callback with the current state context.
 * After the callback completes, if a getLiveState function is provided via options,
 * the live state is read back so that runtime mutations made inside the callback
 * (e.g. setCursorVisible, setCursorOptions) are reflected in subsequent commands.
 *
 * @param command - The call command to execute
 * @param state - The current typewriter state
 * @param options - Executor control options
 * @returns The state after the call, updated with any runtime mutations if getLiveState is set
 */
async function executeCall(
  command: TCallCommand,
  state: TTypewriterState,
  options: TExecuteCommandsOptions,
): Promise<TTypewriterState> {
  await invokeHook(command.before, makeContext(state, 0, 1, null, options.signal));

  if (!options.signal.aborted) {
    options.getAudioManager?.()?.playTyping(command.audio);
    await command.callback(makeContext(state, 0, 1, null, options.signal));
  }

  // Sync back any runtime mutations (setCursorVisible, setCursorOptions, etc.)
  // that the callback may have applied to the controller's live state.
  if (!options.signal.aborted && options.getLiveState !== undefined) {
    state = options.getLiveState();
  }

  if (!options.signal.aborted) {
    await invokeHook(command.after, makeContext(state, 0, 1, null, options.signal));
  }

  return state;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * @description
 * Execute an ordered list of commands sequentially, applying state mutations,
 * rendering after each step, invoking lifecycle hooks, and respecting abort signals.
 *
 * This is the runtime execution path used by play() and replay(). Seek, step,
 * and backward navigation continue to use the compiled-event + checkpoint model.
 *
 * @param commands - The ordered list of commands to execute
 * @param initialState - The typewriter state to start from
 * @param renderer - The renderer to update after each state-changing step
 * @param options - Execution control options (signal, rate)
 * @returns A result object with the final state and the next command index
 */
export async function executeCommands(
  commands: ReadonlyArray<TCommand>,
  initialState: TTypewriterState,
  renderer: IRenderer,
  options: TExecuteCommandsOptions,
): Promise<TExecuteCommandsResult> {
  let state = initialState;
  let i = 0;

  try {
    for (; i < commands.length; i++) {
      /* v8 ignore next 3 */
      if (options.signal.aborted) {
        break;
      }

      const command = commands[i]!;

      switch (command.kind) {
        case ECommandKind.TYPE:
          state = await executeType(command as TTypeCommand, state, renderer, options);
          break;

        case ECommandKind.DELETE:
          state = await executeDelete(command as TDeleteCommand, state, renderer, options);
          break;

        case ECommandKind.WAIT:
          state = await executeWait(command as TWaitCommand, state, options);
          break;

        case ECommandKind.MOVE:
          state = await executeMove(command as TMoveCommand, state, renderer, options);
          break;

        case ECommandKind.SELECT:
          state = await executeSelect(command as TSelectCommand, state, renderer, options);
          break;

        case ECommandKind.UNSELECT:
          state = await executeUnselect(command as TUnselectCommand, state, renderer, options);
          break;

        case ECommandKind.STYLE:
          state = await executeStyle(command as TStyleCommand, state, renderer, options);
          break;

        case ECommandKind.UNSTYLE:
          state = await executeUnstyle(command as TUnstyleCommand, state, renderer, options);
          break;

        case ECommandKind.CALL:
          state = await executeCall(command as TCallCommand, state, options);
          break;

        /* v8 ignore next 2 */
        default:
          break;
      }

      if (options.signal.aborted) {
        break;
      }
    }
  }
  catch (err) {
    // Swallow AbortError, any other error is re-thrown
    const isAbort = err instanceof DOMException && err.name === "AbortError";

    /* v8 ignore next 3 */
    if (!isAbort) {
      throw err;
    }
  }

  return { state, nextCommandIndex: i };
}
