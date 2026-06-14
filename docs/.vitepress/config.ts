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
          text: "Types",
          items: [
            { text: "TTypewriter", link: "/api/type-aliases/TTypewriter" },
            { text: "TTypewriterOptions", link: "/api/type-aliases/TTypewriterOptions" },
            { text: "TTypewriterState", link: "/api/type-aliases/TTypewriterState" },
            { text: "TTypeCommand", link: "/api/type-aliases/TTypeCommand" },
            { text: "TTypeOptions", link: "/api/type-aliases/TTypeOptions" },
            { text: "TAdvanceMode", link: "/api/type-aliases/TAdvanceMode" },
            { text: "TAdvanceModeInput", link: "/api/type-aliases/TAdvanceModeInput" },
            { text: "TAdvanceUnit", link: "/api/type-aliases/TAdvanceUnit" },
            { text: "TCommandKind", link: "/api/type-aliases/TCommandKind" },
            { text: "TCursorSelector", link: "/api/type-aliases/TCursorSelector" },
            { text: "TCursorState", link: "/api/type-aliases/TCursorState" },
            { text: "TRichTextDocument", link: "/api/type-aliases/TRichTextDocument" },
            { text: "TStyleObject", link: "/api/type-aliases/TStyleObject" },
            { text: "TStyleRef", link: "/api/type-aliases/TStyleRef" },
            { text: "TTextMark", link: "/api/type-aliases/TTextMark" },
            { text: "TInsertEvent", link: "/api/type-aliases/TInsertEvent" },
            { text: "TTimelineEvent", link: "/api/type-aliases/TTimelineEvent" },
            { text: "TEventKind", link: "/api/type-aliases/TEventKind" },
          ],
        },
        {
          text: "Constants",
          items: [
            { text: "ECommandKind", link: "/api/variables/ECommandKind" },
            { text: "EEventKind", link: "/api/variables/EEventKind" },
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
      pattern: "https://github.com/eoussama/eo-typewriterjs/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    search: {
      provider: "local",
    },
  },
});
