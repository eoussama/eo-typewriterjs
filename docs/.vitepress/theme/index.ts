import type { Theme } from "vitepress";

import DefaultTheme from "vitepress/theme";
import { h } from "vue";

import DocsPlayground from "./components/docs-playground.vue";
import VersionBadge from "./version-badge.vue";



const theme: Theme = {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      "nav-bar-title-after": () => h(VersionBadge),
    });
  },
  enhanceApp({ app }) {
    app.component("DocsPlayground", DocsPlayground);
  },
};

export default theme;
