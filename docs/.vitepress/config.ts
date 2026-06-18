import { defineConfig } from "vitepress";



/**
 * @description
 * VitePress site configuration for eo-typewriterjs documentation
 */
export default defineConfig({
  title: "EO TypewriterJS",
  description: "JavaScript utility for advanced typewriter-like animations.",
  base: "/eo-typewriterjs/",
  cleanUrls: true,

  head: [["link", { rel: "icon", href: "/eo-typewriterjs/logo.svg" }]],

  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "EO TypewriterJS",

    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API Reference", link: "/api/" },
      { text: "Sandbox", link: "/sandbox" },
      {
        text: "GitHub",
        link: "https://github.com/eoussama/eo-typewriterjs",
      },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "Core Concepts", link: "/guide/core-concepts" },
          ],
        },
        {
          text: "Usage",
          items: [
            { text: "Renderers", link: "/guide/renderers" },
            { text: "Timeline", link: "/guide/timeline" },
            { text: "Recipes", link: "/guide/recipes" },
          ],
        },
        {
          text: "Commands",
          items: [
            { text: "Overview", link: "/guide/commands/" },
            { text: "type", link: "/guide/commands/type" },
            { text: "wait", link: "/guide/commands/wait" },
            { text: "delete", link: "/guide/commands/delete" },
            { text: "moveCursor", link: "/guide/commands/move-cursor" },
            { text: "select", link: "/guide/commands/select" },
            { text: "mark", link: "/guide/commands/mark" },
          ],
        },
      ],
      "/api/": [
        {
          text: "API Reference",
          items: [{ text: "Overview", link: "/api/" }],
        },
        {
          text: "Factory",
          items: [{ text: "createTypewriter", link: "/api/functions/createTypewriter" }],
        },
        {
          text: "Timeline",
          items: [{ text: "TimelineBuilder", link: "/api/classes/TimelineBuilder" }],
        },
        {
          text: "Renderers",
          items: [
            { text: "domRenderer", link: "/api/functions/domRenderer" },
            { text: "stringRenderer", link: "/api/functions/stringRenderer" },
            { text: "DomRenderer", link: "/api/classes/DomRenderer" },
            { text: "StringRenderer", link: "/api/classes/StringRenderer" },
            { text: "IRenderer", link: "/api/interfaces/IRenderer" },
          ],
        },
        {
          text: "State Utilities",
          items: [
            { text: "segmentRichText", link: "/api/functions/segmentRichText" },
            { text: "mergeStyles", link: "/api/functions/mergeStyles" },
            { text: "resolveStyleRef", link: "/api/functions/resolveStyleRef" },
            { text: "getSelection", link: "/api/functions/getSelection" },
            { text: "withCursor", link: "/api/functions/withCursor" },
            { text: "withSelection", link: "/api/functions/withSelection" },
            { text: "withSelectionCleared", link: "/api/functions/withSelectionCleared" },
            { text: "normalizeCursors", link: "/api/functions/normalizeCursors" },
          ],
        },
        {
          text: "Typewriter Types",
          items: [
            { text: "TTypewriter", link: "/api/type-aliases/TTypewriter" },
            { text: "TTypewriterOptions", link: "/api/type-aliases/TTypewriterOptions" },
            { text: "TTypewriterState", link: "/api/type-aliases/TTypewriterState" },
          ],
        },
        {
          text: "Command Types",
          items: [
            { text: "TCommand", link: "/api/type-aliases/TCommand" },
            { text: "TCommandKind", link: "/api/type-aliases/TCommandKind" },
            { text: "TBaseCommand", link: "/api/type-aliases/TBaseCommand" },
            { text: "TCursorSelector", link: "/api/type-aliases/TCursorSelector" },
            { text: "TTypeCommand", link: "/api/type-aliases/TTypeCommand" },
            { text: "TTypeOptions", link: "/api/type-aliases/TTypeOptions" },
            { text: "TAdvanceMode", link: "/api/type-aliases/TAdvanceMode" },
            { text: "TAdvanceModeInput", link: "/api/type-aliases/TAdvanceModeInput" },
            { text: "TAdvanceUnit", link: "/api/type-aliases/TAdvanceUnit" },
            { text: "TDeleteCommand", link: "/api/type-aliases/TDeleteCommand" },
            { text: "TDeleteOptions", link: "/api/type-aliases/TDeleteOptions" },
            { text: "TMoveCursorCommand", link: "/api/type-aliases/TMoveCursorCommand" },
            { text: "TMoveCursorOptions", link: "/api/type-aliases/TMoveCursorOptions" },
            { text: "TSelectCommand", link: "/api/type-aliases/TSelectCommand" },
            { text: "TSelectOptions", link: "/api/type-aliases/TSelectOptions" },
            { text: "TMarkCommand", link: "/api/type-aliases/TMarkCommand" },
            { text: "TMarkOptions", link: "/api/type-aliases/TMarkOptions" },
            { text: "TMarkRange", link: "/api/type-aliases/TMarkRange" },
            { text: "TWaitCommand", link: "/api/type-aliases/TWaitCommand" },
          ],
        },
        {
          text: "Event Types",
          items: [
            { text: "TTimelineEvent", link: "/api/type-aliases/TTimelineEvent" },
            { text: "TBaseEvent", link: "/api/type-aliases/TBaseEvent" },
            { text: "TEventKind", link: "/api/type-aliases/TEventKind" },
            { text: "TInsertEvent", link: "/api/type-aliases/TInsertEvent" },
            { text: "TDeleteEvent", link: "/api/type-aliases/TDeleteEvent" },
            { text: "TMoveCursorEvent", link: "/api/type-aliases/TMoveCursorEvent" },
            { text: "TSelectEvent", link: "/api/type-aliases/TSelectEvent" },
            { text: "TMarkEvent", link: "/api/type-aliases/TMarkEvent" },
          ],
        },
        {
          text: "State Types",
          items: [
            { text: "TCursorState", link: "/api/type-aliases/TCursorState" },
            { text: "TSelectionState", link: "/api/type-aliases/TSelectionState" },
            { text: "TRichTextDocument", link: "/api/type-aliases/TRichTextDocument" },
            { text: "TRichTextSegment", link: "/api/type-aliases/TRichTextSegment" },
            { text: "TTextMark", link: "/api/type-aliases/TTextMark" },
            { text: "TStyleObject", link: "/api/type-aliases/TStyleObject" },
            { text: "TStyleRef", link: "/api/type-aliases/TStyleRef" },
          ],
        },
        {
          text: "Playback Types",
          items: [
            { text: "TCheckpoint", link: "/api/type-aliases/TCheckpoint" },
            { text: "TPlaybackControllerState", link: "/api/type-aliases/TPlaybackControllerState" },
            { text: "TPlaybackStatus", link: "/api/type-aliases/TPlaybackStatus" },
          ],
        },
        {
          text: "Constants",
          items: [
            { text: "ECommandKind", link: "/api/variables/ECommandKind" },
            { text: "EEventKind", link: "/api/variables/EEventKind" },
            { text: "EPlaybackStatus", link: "/api/variables/EPlaybackStatus" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/eoussama/eo-typewriterjs" }],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © EOussama",
    },

    editLink: {
      pattern: "https://github.com/eoussama/eo-typewriterjs/edit/master/docs/:path",
      text: "Edit this page on GitHub",
    },

    search: {
      provider: "local",
    },
  },
});
