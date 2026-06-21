import type { TCallCommand } from "../../commands/types/call-command.type";
import type { TCallbackContext, TCallbackHook } from "../../commands/types/callback-hook.type";
import type { TDeleteCommand } from "../../commands/types/delete-command.type";
import type { TMoveCommand } from "../../commands/types/move-command.type";
import type { TSelectCommand } from "../../commands/types/select-command.type";
import type { TStyleCommand } from "../../commands/types/style-command.type";
import type { TTypeCommand } from "../../commands/types/type-command.type";
import type { TUnselectCommand } from "../../commands/types/unselect-command.type";
import type { TUnstyleCommand } from "../../commands/types/unstyle-command.type";
import type { TWaitCommand } from "../../commands/types/wait-command.type";
import type { TCommand } from "../../compiler/helpers/compile.helper";
import type { TDeleteEvent } from "../../events/types/delete-event.type";
import type { TInsertEvent } from "../../events/types/insert-event.type";
import type { IRenderer } from "../../renderer/interfaces/renderer.interface";
import type { TTypewriterState } from "../../state/types/typewriter-state.type";
import type { TExecuteCommandsOptions, TExecuteCommandsResult } from "../types/execute-commands.type";

import { ECommandKind } from "../../commands/enums/command-kind.enum";
import { normalizeCursors } from "../../commands/helpers/normalize-cursors.helper";
import { DEFAULT_INTERVAL } from "../../compiler/consts/compiler.const";
import { compileDelete } from "../../compiler/helpers/compile-delete.helper";
import { compileMove } from "../../compiler/helpers/compile-move.helper";
import { compileSelect } from "../../compiler/helpers/compile-select.helper";
import { compileStyle } from "../../compiler/helpers/compile-style.helper";
import { compileUnselect } from "../../compiler/helpers/compile-unselect.helper";
import { compileUnstyle } from "../../compiler/helpers/compile-unstyle.helper";
import { nextEventId } from "../../compiler/helpers/event-id.helper";
import { resolveMotionAdvanceMode, resolveTypeAdvanceMode } from "../../compiler/helpers/resolve-advance-mode.helper";
import { EEventKind } from "../../events/enums/event-kind.enum";
import { reduce } from "../../reducer/helpers/reduce.helper";
import { chunkSteps } from "../../stepping/helpers/chunk-steps.helper";
import { segmentText } from "../../stepping/helpers/segment-text.helper";



export type { TExecuteCommandsOptions, TExecuteCommandsResult } from "../types/execute-commands.type";


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

async function invokeHook(hook: TCallbackHook | undefined, ctx: TCallbackContext): Promise<void> {
  if (hook === undefined) {
    return;
  }

  await hook(ctx);
}

async function executeType(
  command: TTypeCommand,
  state: TTypewriterState,
  renderer: IRenderer,
  options: TExecuteCommandsOptions,
): Promise<TTypewriterState> {
  const mode = resolveTypeAdvanceMode(command.by);
  const interval = command.interval ?? DEFAULT_INTERVAL;
  const steps = segmentText(command.text, mode.unit);
  const chunks = chunkSteps(steps, mode.amount);
  const cursorIds = normalizeCursors(command.cursor);

  for (let i = 0; i < chunks.length; i++) {
    /* v8 ignore next 3 */
    if (options.signal.aborted) {
      break;
    }

    await invokeHook(command.before, makeContext(state, i, chunks.length, mode.unit, options.signal));

    if (options.signal.aborted) {
      break;
    }

    options.getAudioManager?.()?.playTyping(command.audio);

    for (const cursorId of cursorIds) {
      const event: TInsertEvent = {
        id: nextEventId("exec_ins"),
        kind: EEventKind.INSERT,
        time: 0,
        cursorId,
        text: chunks[i]!,
        sourceCommandId: command.id,
        ...(command.style !== undefined ? { style: command.style } : {}),
      };

      state = reduce(state, event);
    }

    renderer.render(state);

    await invokeHook(command.after, makeContext(state, i, chunks.length, mode.unit, options.signal));

    if (options.signal.aborted) {
      break;
    }

    if (i < chunks.length - 1 && !options.signal.aborted) {
      await awaitDelay(interval, options);
    }
  }

  return state;
}

async function executeDelete(
  command: TDeleteCommand,
  state: TTypewriterState,
  renderer: IRenderer,
  options: TExecuteCommandsOptions,
): Promise<TTypewriterState> {
  if (typeof command.count === "string") {
    await invokeHook(command.before, makeContext(state, 0, 1, null, options.signal));

    /* v8 ignore next 3 */
    if (options.signal.aborted) {
      return state;
    }

    options.getAudioManager?.()?.playDelete(command.audio);

    const { events } = compileDelete(command, 0);

    for (const event of events) {
      state = reduce(state, event);
    }

    renderer.render(state);

    /* v8 ignore next 3 */
    if (!options.signal.aborted) {
      await invokeHook(command.after, makeContext(state, 0, 1, null, options.signal));
    }

    return state;
  }

  const mode = resolveMotionAdvanceMode(command.by, "delete");
  const interval = command.interval ?? DEFAULT_INTERVAL;
  const amount = Math.max(1, mode.amount);
  const cursorIds = normalizeCursors(command.cursor);

  const direction: 1 | -1 = command.count >= 0 ? 1 : -1;
  const totalUnits = Math.abs(command.count);
  const stepCount = Math.ceil(totalUnits / amount);

  for (let i = 0; i < stepCount; i++) {
    /* v8 ignore next 3 */
    if (options.signal.aborted) {
      break;
    }

    const remaining = totalUnits - i * amount;
    const stepUnits = Math.min(amount, remaining);

    await invokeHook(command.before, makeContext(state, i, stepCount, mode.unit, options.signal));

    if (options.signal.aborted) {
      break;
    }

    options.getAudioManager?.()?.playDelete(command.audio);

    for (const cursorId of cursorIds) {
      const event: TDeleteEvent = {
        id: nextEventId("exec_del"),
        kind: EEventKind.DELETE,
        time: 0,
        cursorId,
        count: stepUnits,
        unit: mode.unit as TDeleteEvent["unit"],
        direction,
        sourceCommandId: command.id,
      };

      state = reduce(state, event);
    }

    renderer.render(state);

    await invokeHook(command.after, makeContext(state, i, stepCount, mode.unit, options.signal));

    if (options.signal.aborted) {
      break;
    }

    if (i < stepCount - 1 && !options.signal.aborted) {
      await awaitDelay(interval, options);
    }
  }

  return state;
}

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

async function executeMove(
  command: TMoveCommand,
  state: TTypewriterState,
  renderer: IRenderer,
  options: TExecuteCommandsOptions,
): Promise<TTypewriterState> {
  if (typeof command.offset === "string") {
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

    /* v8 ignore next 3 */
    if (!options.signal.aborted) {
      await invokeHook(command.after, makeContext(state, 0, 1, null, options.signal));
    }

    return state;
  }

  if (command.offset === 0) {
    await invokeHook(command.before, makeContext(state, 0, 1, null, options.signal));

    if (!options.signal.aborted) {
      await invokeHook(command.after, makeContext(state, 0, 1, null, options.signal));
    }

    return state;
  }

  const mode = resolveMotionAdvanceMode(command.by, "move");
  const interval = command.interval ?? DEFAULT_INTERVAL;
  const amount = Math.max(1, mode.amount);
  const direction: 1 | -1 = command.offset > 0 ? 1 : -1;
  const totalUnits = Math.abs(command.offset);
  const stepCount = Math.ceil(totalUnits / amount);
  const cursorIds = normalizeCursors(command.cursor);

  for (let i = 0; i < stepCount; i++) {
    /* v8 ignore next 3 */
    if (options.signal.aborted) {
      break;
    }

    const remaining = totalUnits - i * amount;
    const stepUnits = Math.min(amount, remaining);

    await invokeHook(command.before, makeContext(state, i, stepCount, mode.unit, options.signal));

    /* v8 ignore next 3 */
    if (options.signal.aborted) {
      break;
    }

    options.getAudioManager?.()?.playTyping(command.audio);

    const prevState = state;

    for (const cursorId of cursorIds) {
      const event = {
        id: nextEventId("exec_move"),
        kind: EEventKind.MOVE,
        time: 0,
        cursorId,
        offset: direction,
        by: { unit: mode.unit, amount: stepUnits },
        sourceCommandId: command.id,
      } as const;

      state = reduce(state, event);
    }

    const anyCursorMoved = cursorIds.some(id => state.cursors[id]?.index !== prevState.cursors[id]?.index);

    renderer.render(state);

    await invokeHook(command.after, makeContext(state, i, stepCount, mode.unit, options.signal));

    if (!anyCursorMoved || options.signal.aborted) {
      break;
    }

    /* v8 ignore next 3 */
    if (i < stepCount - 1 && !options.signal.aborted) {
      await awaitDelay(interval, options);
    }
  }

  return state;
}

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

  if (!options.signal.aborted && options.getLiveState !== undefined) {
    state = options.getLiveState();
  }

  if (!options.signal.aborted) {
    await invokeHook(command.after, makeContext(state, 0, 1, null, options.signal));
  }

  return state;
}

/**
 * @description
 * Execute an ordered list of commands sequentially, applying state mutations,
 * rendering after each step, invoking lifecycle hooks, and respecting abort signals.
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
    const isAbort = err instanceof DOMException && err.name === "AbortError";

    /* v8 ignore next 3 */
    if (!isAbort) {
      throw err;
    }
  }

  return { state, nextCommandIndex: i };
}
