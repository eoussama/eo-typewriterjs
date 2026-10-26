import dx from "@eoussama/dx";



export default dx().prepend({
  ignores: ["docs/guide/**", "docs/index.md", "test-results/**", "playwright-report/**"],
});
