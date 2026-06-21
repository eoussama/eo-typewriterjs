/**
 * @description
 * Enhanced CodeMirror editor factory for the sandbox.
 *
 * Provides:
 *  - Context-aware completions (globals, tw., tw.timeline., command options, hook shapes)
 *  - Snippet-based completions with placeholder tabstops
 *  - Lightweight sandbox diagnostics (missing createTypewriter, unknown keys, etc.)
 *  - Full editing UX: bracket closing, matching, folding, history, multiple cursor
 */

import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";

import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  snippetCompletion,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";



/**
 * @description
 * Build a snippet completion using CodeMirror's ${N:placeholder} syntax
 *
 * @param label - The label shown in the autocomplete list
 * @param template - The snippet template with ${N} tabstops
 * @param type - The completion type (method, function, property, etc.)
 * @param detail - Short detail string shown beside the label
 * @param info - Longer description shown in the info panel
 * @returns A CodeMirror Completion with snippet apply
 */
function snip(label: string, template: string, type: string, detail: string, info?: string): Completion {
  return snippetCompletion(template, { label, type, detail, info });
}


/**
 * @description
 * Top-level global completions injected by the sandbox runtime
 */
const GLOBAL_COMPLETIONS: Completion[] = [
  snip(
    "createTypewriter",
    // eslint-disable-next-line no-template-curly-in-string
    "const tw = createTypewriter({ renderer });\nawait tw.timeline\n  .type(\"${1:Hello, World!}\")\n  .build();\nawait tw.play();",
    "function",
    "(opts) => TTypewriter",
    "Scaffold a full typewriter - inserts complete boilerplate.",
  ),
  { label: "renderer", type: "variable", detail: "IRenderer", info: "The active sandbox renderer (DOM or String)." },
  { label: "domRenderer", type: "function", detail: "(el) => IRenderer", info: "Create a DOM renderer targeting an HTML element." },
  { label: "StringRenderer", type: "class", detail: "class StringRenderer", info: "Headless renderer - new StringRenderer(). Use .toString() for output." },
  { label: "TimelineBuilder", type: "class", detail: "class TimelineBuilder", info: "Fluent builder for constructing command timelines." },
  { label: "ECommandKind", type: "constant", detail: "enum-like object", info: "Contains all command kind string values." },
  { label: "EPlaybackStatus", type: "constant", detail: "enum-like object", info: "Contains all playback status string values." },
];

/**
 * @description
 * Members available on a TTypewriter instance (after tw.)
 */
/* eslint-disable no-template-curly-in-string */
const TW_MEMBERS: Completion[] = [
  snip("play", "play()", "method", "() => Promise<void>", "Start or resume playback."),
  snip("pause", "pause()", "method", "() => void", "Pause at current position."),
  snip("stop", "stop()", "method", "() => void", "Stop and reset to blank state."),
  snip("replay", "replay()", "method", "() => Promise<void>", "Restart from the beginning."),
  snip("cancel", "cancel()", "method", "() => void", "Stop preserving current output - status → CANCELLED."),
  snip("seek", "seek(${1:ms})", "method", "(ms: number) => void", "Jump to an absolute timeline position in ms."),
  snip("stepForward", "stepForward()", "method", "() => void", "Apply the next event group and pause."),
  snip("stepBackward", "stepBackward()", "method", "() => void", "Undo the last event group and pause."),
  snip("setRate", "setRate(${1:1})", "method", "(rate: number) => void", "Set playback speed multiplier."),
  snip("getState", "getState()", "method", "() => TPlaybackState", "Return a snapshot of current playback state."),
  { label: "timeline", type: "property", detail: "TimelineBuilder", info: "The timeline builder for this typewriter instance." },
];
/* eslint-enable no-template-curly-in-string */

/**
 * @description
 * Methods available on TimelineBuilder (after tw.timeline.)
 */
/* eslint-disable no-template-curly-in-string */
const TIMELINE_METHODS: Completion[] = [
  snip("type", "type(\"${1:text}\", { by: \"${2:char}\", interval: ${3:50} })", "method", "(text, opts?) => TimelineBuilder", "Type text step by step."),
  snip("delete", "delete(${1:1}, { by: \"${2:char}\", interval: ${3:50} })", "method", "(count, opts?) => TimelineBuilder", "Delete units from the cursor."),
  snip("wait", "wait(${1:500})", "method", "(ms, opts?) => TimelineBuilder", "Pause without changing the document."),
  snip("move", "move(${1:0})", "method", "(index, opts?) => TimelineBuilder", "Move cursor to an absolute index."),
  snip("select", "select(${1:5})", "method", "(delta, opts?) => TimelineBuilder", "Extend selection. Negative = backward."),
  snip("unselect", "unselect()", "method", "(opts?) => TimelineBuilder", "Remove the active selection from the cursor. Instant - no clock advance."),
  snip("style", "style(\"${1:tw-accent}\", { from: ${2:0}, to: ${3:5} })", "method", "(cls, range, opts?) => TimelineBuilder", "Apply a CSS class to a text range."),
  snip("unstyle", "unstyle({ from: ${1:0}, to: ${2:5} })", "method", "(range, opts?) => TimelineBuilder", "Remove styles overlapping the given range. Partial overlaps are clipped."),
  snip("call", "call(async ({ signal }) => {\n  ${1:// your code here}\n})", "method", "(fn, opts?) => TimelineBuilder", "Schedule an inline async callback."),
  snip("build", "build()", "method", "() => TTimeline", "Finalise and return the compiled timeline."),
];
/* eslint-enable no-template-curly-in-string */

/**
 * @description
 * Shared before/after/cursor options available on all commands
 */
/* eslint-disable no-template-curly-in-string */
const SHARED_HOOK_OPTS: Completion[] = [
  snip("before", "before: async (ctx) => {\n  ${1:// fires before each step}\n}", "property", "TCallbackHook", "Hook fired before each step."),
  snip("after", "after: async (ctx) => {\n  ${1:// fires after each step}\n}", "property", "TCallbackHook", "Hook fired after each step."),
  { label: "cursor", type: "property", detail: "\"main\" | string[]", info: "Target cursor ID(s). Defaults to \"main\"." },
];
/* eslint-enable no-template-curly-in-string */

/**
 * @description
 * Options for type()
 */
const TYPE_OPTS: Completion[] = [
  { label: "by", type: "property", detail: "\"char\" | \"word\" | \"line\"", info: "Stepping unit. Default: \"char\"." },
  { label: "interval", type: "property", detail: "number", info: "Delay in ms between each step. Default: 50." },
  { label: "style", type: "property", detail: "string", info: "CSS class applied to each inserted segment." },
  ...SHARED_HOOK_OPTS,
];

/**
 * @description
 * Options for delete()
 */
const DELETE_OPTS: Completion[] = [
  { label: "by", type: "property", detail: "\"char\" | \"word\" | \"line\"", info: "Deletion unit. Default: \"char\"." },
  { label: "interval", type: "property", detail: "number", info: "Delay in ms between each deletion step. Default: 50." },
  ...SHARED_HOOK_OPTS,
];

/**
 * @description
 * Options for wait()
 */
/* eslint-disable no-template-curly-in-string */
const WAIT_OPTS: Completion[] = [
  snip("before", "before: async (ctx) => {\n  ${1:// fires before wait}\n}", "property", "TCallbackHook", "Hook fired before the wait."),
  snip("after", "after: async (ctx) => {\n  ${1:// fires after wait}\n}", "property", "TCallbackHook", "Hook fired after the wait."),
];
/* eslint-enable no-template-curly-in-string */

/**
 * @description
 * Options for move()
 */
const MOVE_CURSOR_OPTS: Completion[] = [
  { label: "cursor", type: "property", detail: "\"main\" | string[]", info: "Target cursor ID(s). Defaults to \"main\"." },
  ...WAIT_OPTS,
];

/**
 * @description
 * Options for select()
 */
const SELECT_OPTS: Completion[] = [
  { label: "by", type: "property", detail: "\"char\" | \"word\" | \"line\"", info: "Selection unit. Default: \"char\"." },
  { label: "cursor", type: "property", detail: "\"main\" | string[]", info: "Target cursor ID(s). Defaults to \"main\"." },
  ...WAIT_OPTS,
];

/**
 * @description
 * Options for style()
 */
const MARK_OPTS: Completion[] = [
  { label: "cursor", type: "property", detail: "\"main\" | string[]", info: "Required when range is \"selection\" - which cursor's selection to use." },
  ...WAIT_OPTS,
];

/**
 * @description
 * Options for call()
 */
const CALL_OPTS: Completion[] = [...WAIT_OPTS];

/**
 * @description
 * Properties on a TCallbackContext inside hook callbacks
 */
const CALLBACK_CTX_PROPS: Completion[] = [
  { label: "state", type: "property", detail: "TTypewriterState", info: "Current typewriter state snapshot." },
  { label: "stepIndex", type: "property", detail: "number", info: "Zero-based index of the current per-unit step." },
  { label: "stepCount", type: "property", detail: "number", info: "Total number of steps for this command." },
  { label: "unit", type: "property", detail: "\"char\" | \"word\" | \"line\" | null", info: "Current step unit, or null for whole-command hooks." },
  { label: "signal", type: "property", detail: "AbortSignal", info: "Aborted when tw.cancel() is called." },
];

/**
 * @description
 * Properties inside hook option objects (before/after: { ... })
 */
/* eslint-disable no-template-curly-in-string */
const HOOK_PROPS: Completion[] = [
  snip(
    "callback",
    "callback: async ({ state, stepIndex, stepCount, signal }) => {\n  ${1:// hook body}\n}",
    "property",
    "(ctx: TCallbackContext) => void | Promise<void>",
    "The hook callback. Receives TCallbackContext.",
  ),
  { label: "unit", type: "property", detail: "\"char\" | \"word\" | \"line\"", info: "When set, fires once per step instead of once for the whole command." },
];
/* eslint-enable no-template-curly-in-string */

/**
 * @description
 * EPlaybackStatus member completions (after EPlaybackStatus.)
 */
const PLAYBACK_STATUS_MEMBERS: Completion[] = [
  { label: "IDLE", type: "constant", detail: "\"idle\"", info: "No playback has started yet." },
  { label: "PLAYING", type: "constant", detail: "\"playing\"", info: "Playback is currently running." },
  { label: "PAUSED", type: "constant", detail: "\"paused\"", info: "Playback is paused." },
  { label: "STOPPED", type: "constant", detail: "\"stopped\"", info: "Playback was stopped and reset." },
  { label: "COMPLETED", type: "constant", detail: "\"completed\"", info: "Playback finished naturally." },
  { label: "CANCELLED", type: "constant", detail: "\"cancelled\"", info: "Playback was cancelled via tw.cancel()." },
];

/**
 * @description
 * ECommandKind member completions (after ECommandKind.)
 */
const COMMAND_KIND_MEMBERS: Completion[] = [
  { label: "TYPE", type: "constant", detail: "\"type\"" },
  { label: "DELETE", type: "constant", detail: "\"delete\"" },
  { label: "WAIT", type: "constant", detail: "\"wait\"" },
  { label: "MOVE", type: "constant", detail: "\"move\"" },
  { label: "SELECT", type: "constant", detail: "\"select\"" },
  { label: "UNSELECT", type: "constant", detail: "\"unselect\"" },
  { label: "STYLE", type: "constant", detail: "\"style\"" },
  { label: "UNSTYLE", type: "constant", detail: "\"unstyle\"" },
  { label: "CALL", type: "constant", detail: "\"call\"" },
];


/**
 * @description
 * Extract the last dotted chain prefix immediately before the cursor.
 *
 * @param textBefore - Text from document start to cursor
 * @returns Lowercase chain string ending with "." e.g. "tw.timeline." or ""
 */
function getChainBefore(textBefore: string): string {
  const tail = textBefore.slice(-200);
  // Non-capturing group, we only need the full match prefix
  const m = tail.match(/\w[\w.]*\.\s*$/);

  return m !== null ? `${m[0].replace(/\.\s*$/, "").toLowerCase()}.` : "";
}

/**
 * @description
 * Detect which command-options context the cursor is inside.
 * Matches the nearest unclosed .commandName( ... { pattern.
 *
 * @param textBefore - Text from document start to cursor
 * @returns Appropriate options list or null
 */
function detectCommandOptsContext(textBefore: string): Completion[] | null {
  const tail = textBefore.slice(-400);
  // Extract command name via a separate simpler match to avoid capturing group warnings
  const hasOpenOpts = /\.\w+\s*\([^){]*\{[^)}]*(?:\}[^){]*\{[^)}]*)*(?:\)[^}]*)?$/.test(tail);

  if (!hasOpenOpts) {
    return null;
  }

  // Extract the command name from the last .name( before the open brace, slice off the leading dot
  const cmdMatches = tail.match(/\.\w+(?=\s*\()/g);
  const cmd = cmdMatches !== null ? cmdMatches[cmdMatches.length - 1]!.slice(1).toLowerCase() : "";

  switch (cmd) {
    case "type": return TYPE_OPTS;

    case "delete": return DELETE_OPTS;

    case "wait": return WAIT_OPTS;

    case "move": return MOVE_CURSOR_OPTS;

    case "select": return SELECT_OPTS;

    case "style": return MARK_OPTS;

    case "call": return CALL_OPTS;

    default: return null;
  }
}

/**
 * @description
 * Detect if the cursor is inside a hook object literal (before/after: { ... })
 *
 * @param textBefore - Text from document start to cursor
 * @returns True if inside a hook object
 */
function isInsideHookObject(textBefore: string): boolean {
  const tail = textBefore.slice(-300);

  return /\b(?:before|after)\s*:\s*\{[^}]*$/.test(tail);
}

/**
 * @description
 * Detect if the cursor is inside a callback context destructure or callback body.
 * Looks for patterns like `async ({ ... })` or `async (ctx)` etc.
 *
 * @param textBefore - Text from document start to cursor
 * @returns True if likely inside a callback context
 */
function isInsideCallbackBody(textBefore: string): boolean {
  const tail = textBefore.slice(-400);

  return /callback\s*:\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*$/.test(tail)
    || /call\s*\(\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*$/.test(tail);
}


/**
 * @description
 * Context-aware completion source for the sandbox editor.
 * Inspects the text before the cursor to decide which set of completions to offer.
 *
 * @param context - The CodeMirror CompletionContext
 * @returns A CompletionResult or null
 */
function sandboxCompletionSource(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/\w*/);

  if (word === null || (word.from === word.to && !context.explicit)) {
    return null;
  }

  const textBefore = context.state.doc.sliceString(0, context.pos);
  const chain = getChainBefore(textBefore);

  // Dot-triggered: tw.timeline.
  if (chain.endsWith("tw.timeline.") || chain.endsWith("timeline.")) {
    return { from: word.from, options: TIMELINE_METHODS, validFor: /^\w*$/ };
  }

  // Dot-triggered: tw.
  if (/\btw\.$/.test(chain) || chain === "tw.") {
    return { from: word.from, options: TW_MEMBERS, validFor: /^\w*$/ };
  }

  // Dot-triggered: EPlaybackStatus.
  if (chain.endsWith("eplaybaskstatus.") || chain === "eplaybackstatus.") {
    return { from: word.from, options: PLAYBACK_STATUS_MEMBERS, validFor: /^\w*$/ };
  }

  // Dot-triggered: ECommandKind.
  if (chain === "ecommandkind.") {
    return { from: word.from, options: COMMAND_KIND_MEMBERS, validFor: /^\w*$/ };
  }

  // Dot-triggered: ctx. (callback context)
  if (chain === "ctx." || chain === "context.") {
    return { from: word.from, options: CALLBACK_CTX_PROPS, validFor: /^\w*$/ };
  }

  // Inside a hook object { callback, unit }
  if (isInsideHookObject(textBefore)) {
    return { from: word.from, options: HOOK_PROPS, validFor: /^\w*$/ };
  }

  // Inside a callback body (ctx props available as locals)
  if (isInsideCallbackBody(textBefore)) {
    return { from: word.from, options: CALLBACK_CTX_PROPS, validFor: /^\w*$/ };
  }

  // Inside a command options object
  const cmdOpts = detectCommandOptsContext(textBefore);

  if (cmdOpts !== null) {
    return { from: word.from, options: cmdOpts, validFor: /^\w*$/ };
  }

  // Global scope
  return { from: word.from, options: GLOBAL_COMPLETIONS, validFor: /^\w*$/ };
}


/**
 * @description
 * Create the enhanced sandbox CodeMirror EditorView.
 * Replaces the old minimal setup with full editing UX.
 *
 * @param parent - The DOM element to mount the editor into
 * @param initialDoc - Initial document content
 * @returns The configured EditorView instance
 */
export function createSandboxEditor(parent: HTMLElement, initialDoc: string): EditorView {
  const extensions = [
    javascript(),
    oneDark,
    lineNumbers(),
    highlightActiveLineGutter(),
    foldGutter(),
    history(),
    closeBrackets(),
    bracketMatching(),
    indentOnInput(),
    drawSelection(),
    rectangularSelection(),
    highlightActiveLine(),
    autocompletion({
      override: [sandboxCompletionSource],
      defaultKeymap: true,
      activateOnTyping: true,
      activateOnTypingDelay: 120,
    }),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...closeBracketsKeymap,
      indentWithTab,
    ]),
    EditorView.theme({
      "&": {
        height: "100%",
        fontSize: "13px",
        fontFamily: "\"Noto Sans Mono\", \"JetBrains Mono\", \"Fira Code\", monospace",
      },
      ".cm-scroller": { overflow: "auto" },
      ".cm-content": { padding: "12px 0" },
      ".cm-focused": { outline: "none" },
      ".cm-foldGutter": { width: "14px" },
      ".cm-tooltip.cm-tooltip-autocomplete": {
        border: "1px solid #313d5c",
        borderRadius: "6px",
        background: "#141722",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      },
      ".cm-tooltip-autocomplete ul li[aria-selected]": {
        background: "color-mix(in srgb, #6c8ef5 18%, #141722)",
        color: "#dde4f0",
      },
      ".cm-completionLabel": { color: "#dde4f0" },
      ".cm-completionDetail": { color: "#7a8499", fontStyle: "normal" },
      ".cm-completionInfo": {
        background: "#1a1e2e",
        border: "1px solid #252c42",
        borderRadius: "6px",
        padding: "6px 10px",
        color: "#7a8499",
        fontSize: "0.72rem",
        maxWidth: "320px",
      },
    }),

    EditorView.lineWrapping,
  ];

  return new EditorView({
    state: EditorState.create({ doc: initialDoc, extensions }),
    parent,
  });
}
