import type { Theme } from "vitepress";

import DefaultTheme from "vitepress/theme";
import { h } from "vue";

import DocsPlayground from "./components/docs-playground.vue";
import SandboxApp from "./components/sandbox-app.vue";
import VersionBadge from "./version-badge.vue";
import "./playground.css";



const theme: Theme = {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      "nav-bar-title-after": () => h(VersionBadge),
    });
  },
  enhanceApp({ app }) {
    app.component("DocsPlayground", DocsPlayground);
    app.component("SandboxApp", SandboxApp);
  },
};

export default theme;
