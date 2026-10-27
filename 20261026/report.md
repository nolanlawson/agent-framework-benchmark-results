# Pokédex framework benchmark

Run `20261026-stitched`, started 2026-10-25T14:37:12.976Z.
5 iteration(s) per framework; numbers are medians across iterations.
Lighthouse values are means over 6 URLs of each URL's median over 5 runs. Medians are
taken per metric, so one URL's LCP and TBT can come from different runs.
Sorted by total tokens.

## Building the app (agent)

Total tokens = cache reads + uncached input (input and cache writes) + output.

| Framework | Tests | Total tokens (M) | Cache read (M) | Uncached input (k) | Output (k) | Cost ($) | Time (min) | Turns |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| nuxt | 5/5 | 3.85 | 3.66 | 130 | 44 | 2.82 | 9.0 | 71 |
| astro | 5/5 | 4.13 | 3.96 | 129 | 46 | 2.76 | 8.2 | 73 |
| hono-htmx | 5/5 | 4.26 | 4.09 | 126 | 42 | 2.67 | 8.6 | 75 |
| next | 5/5 | 4.99 | 4.80 | 140 | 53 | 3.14 | 10.9 | 100 |
| vanilla | 5/5 | 5.00 | 4.82 | 136 | 53 | 2.98 | 10.1 | 85 |
| qwik | 5/5 | 5.64 | 5.45 | 139 | 51 | 3.27 | 10.7 | 89 |
| tanstack-start | 5/5 | 7.07 | 6.87 | 147 | 51 | 3.54 | 10.3 | 94 |
| solidstart | 5/5 | 7.13 | 6.91 | 153 | 56 | 3.79 | 11.2 | 108 |
| react-router | 5/5 | 7.58 | 7.36 | 145 | 53 | 3.81 | 12.5 | 98 |
| sveltekit | 5/5 | 8.53 | 8.28 | 181 | 56 | 4.28 | 10.8 | 103 |
| gracile | 5/5 | 9.04 | 8.77 | 188 | 65 | 4.65 | 12.1 | 107 |
| angular | 5/5 | 9.76 | 9.49 | 193 | 78 | 4.97 | 17.2 | 117 |

## Page loads (Lighthouse, mobile settings)

| Framework | Mobile perf | LCP (ms) | FCP (ms) | TBT (ms) | CLS | JS (KiB) | A11y |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| nuxt | 100 | 1715 | 1252 | 50 | 0.000 | 85 | 100 |
| astro | 100 | 1025 | 804 | 0 | 0.000 | 0 | 100 |
| hono-htmx | 100 | 1176 | 793 | 0 | 0.000 | 18 | 100 |
| next | 99 | 1982 | 859 | 65 | 0.000 | 142 | 100 |
| vanilla | 94 | 2087 | 762 | 19 | 0.111 | 7 | 100 |
| qwik | 100 | 1264 | 1036 | 1 | 0.000 | 41 | 100 |
| tanstack-start | 99 | 1953 | 799 | 3 | 0.000 | 118 | 100 |
| solidstart | 100 | 1342 | 1054 | 11 | 0.000 | 40 | 100 |
| react-router | 100 | 1679 | 1355 | 14 | 0.000 | 115 | 100 |
| sveltekit | 100 | 1292 | 1054 | 0 | 0.000 | 36 | 100 |
| gracile | 100 | 1088 | 808 | 0 | 0.000 | 3 | 100 |
| angular | 97 | 1855 | 1310 | 145 | 0.000 | 93 | 100 |

## Code

Non-blank lines in the app's source files (comments included). Not counted: JSON, lockfiles,
tests, generated files, and verbatim copies of the provided design files.

| Framework | Lines of code |
| --- | ---: |
| nuxt | 1415 |
| astro | 1461 |
| hono-htmx | 1370 |
| next | 1539 |
| vanilla | 1492 |
| qwik | 1744 |
| tanstack-start | 1697 |
| solidstart | 1630 |
| react-router | 1564 |
| sveltekit | 1611 |
| gracile | 1717 |
| angular | 1944 |

## Versions

Direct dependencies of each app, as installed for measurement, and the agent tooling.

- **angular-1**: `@angular/common@22.2.3`, `@angular/compiler@22.2.3`, `@angular/core@22.2.3`, `@angular/forms@22.2.3`, `@angular/platform-browser@22.2.3`, `@angular/router@22.2.3`, `rxjs@7.8.2`, `tslib@2.8.1`, `@angular/build@22.2.4`, `@angular/cli@22.2.4`, `@angular/compiler-cli@22.2.3`, `jsdom@30.1.3`, `prettier@3.9.10`, `typescript@6.0.3`, `vitest@5.0.5`
  - Tooling: MCP @angular/cli@22.2.4; skill angular/skills@3c880aa
  - MCP servers in the session: angular-cli:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **angular-2**: `@angular/common@22.2.3`, `@angular/compiler@22.2.3`, `@angular/core@22.2.3`, `@angular/forms@22.2.3`, `@angular/platform-browser@22.2.3`, `@angular/platform-server@22.2.3`, `@angular/router@22.2.3`, `@angular/ssr@22.2.4`, `express@5.3.0`, `rxjs@7.8.2`, `tslib@2.8.1`, `@angular/build@22.2.4`, `@angular/cli@22.2.4`, `@angular/compiler-cli@22.2.3`, `@types/express@5.0.6`, `@types/node@22.20.5`, `jsdom@30.1.3`, `prettier@3.9.10`, `typescript@6.0.3`, `vitest@5.0.5`
  - Tooling: MCP @angular/cli@22.2.4; skill angular/skills@3c880aa
  - MCP servers in the session: angular-cli:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **angular-3**: not measured
  - Tooling: MCP @angular/cli@22.2.4; skill angular/skills@3c880aa
  - MCP servers in the session: angular-cli:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **angular-4**: not measured
  - Tooling: MCP @angular/cli@22.2.4; skill angular/skills@4cc56a7
  - MCP servers in the session: angular-cli:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **angular-5**: `@angular/common@22.2.3`, `@angular/compiler@22.2.3`, `@angular/core@22.2.3`, `@angular/forms@22.2.3`, `@angular/platform-browser@22.2.3`, `@angular/platform-server@22.2.3`, `@angular/router@22.2.3`, `@angular/ssr@22.2.4`, `express@5.3.0`, `rxjs@7.8.2`, `tslib@2.8.1`, `@angular/build@22.2.4`, `@angular/cli@22.2.4`, `@angular/compiler-cli@22.2.3`, `@types/express@5.0.6`, `@types/node@22.20.5`, `prettier@3.9.10`, `typescript@6.0.3`
  - Tooling: MCP @angular/cli@22.2.4; skill angular/skills@4cc56a7
  - MCP servers in the session: angular-cli:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **astro-1**: `@astrojs/node@11.1.9`, `astro@7.4.2`
  - Tooling: MCP https://mcp.docs.astro.build/mcp (1 tools, sha256 aaaf70d4c3d1)
  - MCP servers in the session: astro-docs:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **astro-2**: `@astrojs/node@11.1.9`, `astro@7.4.2`
  - Tooling: MCP https://mcp.docs.astro.build/mcp (1 tools, sha256 aaaf70d4c3d1)
  - MCP servers in the session: astro-docs:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **astro-3**: `@astrojs/node@11.1.9`, `astro@7.4.2`
  - Tooling: MCP https://mcp.docs.astro.build/mcp (1 tools, sha256 aaaf70d4c3d1)
  - MCP servers in the session: astro-docs:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **astro-4**: `@astrojs/node@11.1.9`, `astro@7.4.2`
  - Tooling: MCP https://mcp.docs.astro.build/mcp (1 tools, sha256 aaaf70d4c3d1)
  - MCP servers in the session: astro-docs:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **astro-5**: `@astrojs/node@11.1.9`, `astro@7.4.2`
  - Tooling: MCP https://mcp.docs.astro.build/mcp (1 tools, sha256 aaaf70d4c3d1)
  - MCP servers in the session: astro-docs:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **gracile-1**: `@gracile/gracile@0.11.0`, `@lit-labs/ssr@4.1.0`, `@lit-labs/ssr-client@1.1.8`, `express@5.3.0`, `lit@3.3.3`, `vite@8.3.5`, `@types/express@5.0.6`, `@types/node@24.19.2`, `typescript@5.9.3`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **gracile-2**: `@gracile/gracile@0.11.0`, `express@5.3.0`, `lit@3.3.3`, `vite@8.3.5`, `@types/express@5.0.6`, `@types/node@24.19.2`, `typescript@7.0.2`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **gracile-3**: `@gracile/gracile@0.11.0`, `@lit-labs/ssr@4.1.0`, `@lit-labs/ssr-client@1.1.8`, `express@5.3.0`, `lit@3.3.3`, `@types/express@5.0.6`, `@types/node@24.19.2`, `typescript@7.0.2`, `vite@8.3.5`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **gracile-4**: `@gracile/gracile@0.11.0`, `@hono/node-server@2.1.5`, `hono@4.13.14`, `lit@3.3.3`, `vite@8.3.5`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **gracile-5**: `@gracile/gracile@0.11.0`, `lit@3.3.3`, `vite@8.3.5`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **hono-htmx-1**: `@hono/node-server@2.1.5`, `hono@4.13.14`, `htmx.org@2.0.11`, `@types/node@24.19.2`, `typescript@7.0.2`
  - Tooling: skill honojs/skills@e54ce51
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **hono-htmx-2**: `@hono/node-server@2.1.5`, `hono@4.13.14`, `htmx.org@2.0.11`, `@types/node@24.19.2`, `typescript@7.0.2`
  - Tooling: skill honojs/skills@e54ce51
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **hono-htmx-3**: `@hono/node-server@2.1.5`, `hono@4.13.14`, `htmx.org@2.0.11`, `@types/node@24.19.2`, `esbuild@0.28.2`, `typescript@7.0.2`
  - Tooling: skill honojs/skills@e54ce51
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **hono-htmx-4**: `@hono/node-server@2.1.5`, `hono@4.13.14`, `htmx.org@2.0.11`, `@types/node@24.19.2`, `typescript@7.0.2`
  - Tooling: skill honojs/skills@e54ce51
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **hono-htmx-5**: `@hono/node-server@2.1.5`, `hono@4.13.14`, `htmx.org@2.0.11`, `@types/node@26.6.5`, `esbuild@0.28.2`, `typescript@5.9.3`
  - Tooling: skill honojs/skills@e54ce51
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **next-1**: `next@16.4.3`, `react@19.3.1`, `react-dom@19.3.1`, `server-only@0.0.1`, `@types/node@24.19.2`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `typescript@7.0.2`
  - Tooling: MCP next-devtools-mcp@0.4.0; skill vercel/next.js@cbf49db (--skill next-dev-loop)
  - MCP servers in the session: next-devtools:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **next-2**: `next@16.4.3`, `react@19.3.1`, `react-dom@19.3.1`, `server-only@0.0.1`, `@types/node@24.19.2`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `typescript@5.9.3`
  - Tooling: MCP next-devtools-mcp@0.4.0; skill vercel/next.js@cbf49db (--skill next-dev-loop)
  - MCP servers in the session: next-devtools:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **next-3**: `next@16.4.3`, `react@19.3.1`, `react-dom@19.3.1`, `server-only@0.0.1`, `@types/node@20.19.43`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `typescript@5.9.3`
  - Tooling: MCP next-devtools-mcp@0.4.0; skill vercel/next.js@cbf49db (--skill next-dev-loop)
  - MCP servers in the session: next-devtools:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **next-4**: `next@16.4.3`, `react@19.3.1`, `react-dom@19.3.1`, `server-only@0.0.1`, `@types/node@26.6.5`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `typescript@5.9.3`
  - Tooling: MCP next-devtools-mcp@0.4.0; skill vercel/next.js@cbf49db (--skill next-dev-loop)
  - MCP servers in the session: next-devtools:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **next-5**: `next@16.4.3`, `react@19.3.1`, `react-dom@19.3.1`, `@types/node@24.19.2`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `typescript@5.9.3`
  - Tooling: MCP next-devtools-mcp@0.4.0; skill vercel/next.js@cbf49db (--skill next-dev-loop)
  - MCP servers in the session: next-devtools:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **nuxt-1**: `nuxt@4.6.2`, `vue@3.5.44`, `vue-router@5.4.0`
  - Tooling: MCP https://nuxt.com/mcp (12 tools, sha256 9bfa5394495b)
  - MCP servers in the session: nuxt:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **nuxt-2**: `nuxt@4.6.2`, `vue@3.5.44`, `vue-router@5.4.0`
  - Tooling: MCP https://nuxt.com/mcp (12 tools, sha256 9bfa5394495b)
  - MCP servers in the session: nuxt:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **nuxt-3**: `nuxt@4.6.2`, `vue@3.5.44`, `vue-router@5.4.0`, `@types/node@24.19.2`, `typescript@5.9.3`, `vue-tsc@3.3.13`
  - Tooling: MCP https://nuxt.com/mcp (12 tools, sha256 9bfa5394495b)
  - MCP servers in the session: nuxt:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **nuxt-4**: `nuxt@4.6.2`, `vue@3.5.44`, `vue-router@5.4.0`
  - Tooling: MCP https://nuxt.com/mcp (12 tools, sha256 9bfa5394495b)
  - MCP servers in the session: nuxt:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **nuxt-5**: `nuxt@4.6.2`, `vue@3.5.44`
  - Tooling: MCP https://nuxt.com/mcp (12 tools, sha256 9bfa5394495b)
  - MCP servers in the session: nuxt:connected
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **qwik-1**: `@builder.io/qwik@1.20.2`, `@builder.io/qwik-city@1.20.2`, `@types/node@24.19.2`, `typescript@5.4.5`, `undici@8.12.3`, `vite@7.3.1`, `vite-tsconfig-paths@4.3.2`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **qwik-2**: `@builder.io/qwik@1.20.3`, `@builder.io/qwik-city@1.20.3`, `@types/node@24.19.2`, `typescript@5.4.5`, `vite@7.3.1`, `vite-tsconfig-paths@4.3.2`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **qwik-3**: `@builder.io/qwik@1.20.3`, `@builder.io/qwik-city@1.20.3`, `@eslint/js@9.39.5`, `@types/node@20.19.0`, `eslint@9.32.0`, `eslint-plugin-qwik@1.20.3`, `globals@16.4.0`, `prettier@3.6.2`, `typescript@5.4.5`, `typescript-eslint@8.38.0`, `typescript-plugin-css-modules@5.3.0`, `undici@8.12.3`, `vite@7.3.1`, `vite-tsconfig-paths@4.3.2`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **qwik-4**: `@builder.io/qwik@1.20.3`, `@builder.io/qwik-city@1.20.3`, `@eslint/js@9.39.5`, `@types/node@20.19.0`, `eslint@9.32.0`, `eslint-plugin-qwik@1.20.3`, `globals@16.4.0`, `typescript@5.4.5`, `typescript-eslint@8.38.0`, `vite@7.3.1`, `vite-tsconfig-paths@4.3.2`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **qwik-5**: `@builder.io/qwik@1.20.3`, `@builder.io/qwik-city@1.20.3`, `@eslint/js@9.39.5`, `@types/node@20.19.0`, `eslint@9.32.0`, `eslint-plugin-qwik@1.20.3`, `globals@16.4.0`, `prettier@3.6.2`, `typescript@5.4.5`, `typescript-eslint@8.38.0`, `undici@8.12.3`, `vite@7.3.1`, `vite-tsconfig-paths@4.3.2`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **react-router-1**: `@react-router/node@8.5.0`, `@react-router/serve@8.5.0`, `isbot@5.2.2`, `react@19.3.1`, `react-dom@19.3.1`, `react-router@8.5.0`, `@react-router/dev@8.5.0`, `@types/node@24.19.2`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `typescript@5.9.3`, `vite@8.3.5`
  - Tooling: skill remix-run/react-router@bb7c1f0 (--skill react-router)
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **react-router-2**: `@react-router/express@8.5.0`, `@react-router/node@8.5.0`, `express@5.3.0`, `isbot@5.2.2`, `react@19.3.1`, `react-dom@19.3.1`, `react-router@8.5.0`, `@react-router/dev@8.5.0`, `@types/express@5.0.6`, `@types/node@26.6.5`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `typescript@7.0.2`, `vite@8.3.5`
  - Tooling: skill remix-run/react-router@bb7c1f0 (--skill react-router)
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **react-router-3**: `@react-router/node@8.5.0`, `@react-router/serve@8.5.0`, `isbot@5.2.2`, `react@19.3.1`, `react-dom@19.3.1`, `react-router@8.5.0`, `@react-router/dev@8.5.0`, `@types/node@24.19.2`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `typescript@5.9.3`, `vite@8.3.5`
  - Tooling: skill remix-run/react-router@bb7c1f0 (--skill react-router)
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **react-router-4**: `@react-router/node@8.5.0`, `@react-router/serve@8.5.0`, `isbot@5.2.2`, `react@19.3.1`, `react-dom@19.3.1`, `react-router@8.5.0`, `@react-router/dev@8.5.0`, `@types/node@24.19.2`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `typescript@5.9.3`, `vite@8.3.5`
  - Tooling: skill remix-run/react-router@bb7c1f0 (--skill react-router)
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **react-router-5**: `@react-router/node@8.5.0`, `isbot@5.2.2`, `react@19.3.1`, `react-dom@19.3.1`, `react-router@8.5.0`, `@react-router/dev@8.5.0`, `@types/node@24.19.2`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `typescript@6.0.3`, `vite@8.3.5`
  - Tooling: skill remix-run/react-router@bb7c1f0 (--skill react-router)
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **solidstart-1**: `@solidjs/meta@0.29.4`, `@solidjs/router@1.0.0`, `@solidjs/start@2.1.0`, `nitro@3.0.260903-beta`, `solid-js@1.9.17`, `vite@8.3.5`, `@types/node@24.19.2`, `typescript@5.9.3`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **solidstart-2**: `@solidjs/meta@0.29.4`, `@solidjs/router@1.0.0`, `@solidjs/start@2.1.0`, `nitro@3.0.260903-beta`, `solid-js@1.9.17`, `vite@8.3.5`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **solidstart-3**: `@solidjs/meta@0.29.4`, `@solidjs/router@1.0.0`, `@solidjs/start@2.1.0`, `nitro@3.0.260903-beta`, `solid-js@1.9.17`, `vite@8.3.5`, `typescript@7.0.2`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **solidstart-4**: `@solidjs/meta@0.29.4`, `@solidjs/router@1.0.0`, `@solidjs/start@2.1.0`, `nitro@3.0.260903-beta`, `solid-js@1.9.17`, `vite@8.3.5`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **solidstart-5**: `@solidjs/meta@0.29.4`, `@solidjs/router@1.0.0`, `@solidjs/start@2.1.0`, `nitro@3.0.260903-beta`, `solid-js@1.9.17`, `vite@8.3.5`, `@types/node@24.19.2`, `typescript@7.0.2`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **sveltekit-1**: `@sveltejs/adapter-node@6.0.0`, `@sveltejs/kit@3.1.0`, `@sveltejs/vite-plugin-svelte@7.3.1`, `@types/node@24.19.2`, `svelte@5.57.2`, `svelte-check@4.7.7`, `typescript@6.0.3`, `vite@8.3.5`
  - Tooling: plugin svelte@svelte@b2589f8 (@sveltejs/mcp@0.1.27)
  - MCP servers in the session: plugin:svelte:svelte:pending
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **sveltekit-2**: `@sveltejs/adapter-node@6.0.0`, `@sveltejs/kit@3.1.0`, `@sveltejs/vite-plugin-svelte@7.3.1`, `@types/node@24.19.2`, `svelte@5.57.2`, `svelte-check@4.7.7`, `typescript@6.0.3`, `vite@8.3.5`
  - Tooling: plugin svelte@svelte@b2589f8 (@sveltejs/mcp@0.1.27)
  - MCP servers in the session: plugin:svelte:svelte:pending
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **sveltekit-3**: `@sveltejs/adapter-node@6.0.0`, `@sveltejs/kit@3.1.0`, `@sveltejs/vite-plugin-svelte@7.3.1`, `@types/node@24.19.2`, `svelte@5.57.2`, `svelte-check@4.7.7`, `typescript@6.0.3`, `vite@8.3.5`
  - Tooling: plugin svelte@svelte@b2589f8 (@sveltejs/mcp@0.1.27)
  - MCP servers in the session: plugin:svelte:svelte:pending
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **sveltekit-4**: `@sveltejs/adapter-node@6.0.0`, `@sveltejs/kit@3.1.0`, `@sveltejs/vite-plugin-svelte@7.3.1`, `@types/node@24.19.2`, `svelte@5.57.2`, `svelte-check@4.7.7`, `typescript@6.0.3`, `vite@8.3.5`
  - Tooling: plugin svelte@svelte@7b72fc5 (@sveltejs/mcp@0.1.27)
  - MCP servers in the session: plugin:svelte:svelte:pending
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **sveltekit-5**: `@sveltejs/adapter-node@6.0.0`, `@sveltejs/kit@3.1.0`, `@sveltejs/vite-plugin-svelte@7.3.1`, `@types/node@24.19.2`, `svelte@5.57.2`, `svelte-check@4.7.7`, `typescript@6.0.3`, `vite@8.3.5`
  - Tooling: plugin svelte@svelte@7b72fc5 (@sveltejs/mcp@0.1.27)
  - MCP servers in the session: plugin:svelte:svelte:pending
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **tanstack-start-1**: `@tanstack/react-router@1.170.46`, `@tanstack/react-start@1.169.4`, `react@19.3.1`, `react-dom@19.3.1`, `srvx@1.0.7`, `@types/node@26.6.5`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `@vitejs/plugin-react@6.1.2`, `typescript@7.0.2`, `vite@8.3.5`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **tanstack-start-2**: `@tanstack/react-router@1.170.46`, `@tanstack/react-start@1.169.4`, `react@19.3.1`, `react-dom@19.3.1`, `srvx@1.0.7`, `@types/node@26.6.5`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `@vitejs/plugin-react@6.1.2`, `typescript@7.0.2`, `vite@8.3.5`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **tanstack-start-3**: `@tanstack/react-router@1.170.46`, `@tanstack/react-start@1.169.4`, `react@19.3.1`, `react-dom@19.3.1`, `srvx@1.0.7`, `@types/node@26.6.5`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `@vitejs/plugin-react@6.1.2`, `typescript@7.0.2`, `vite@8.3.5`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **tanstack-start-4**: `@tanstack/react-router@1.170.46`, `@tanstack/react-start@1.169.4`, `react@19.3.1`, `react-dom@19.3.1`, `srvx@1.0.7`, `@types/node@26.6.5`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `@vitejs/plugin-react@6.1.2`, `typescript@7.0.2`, `vite@8.3.5`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **tanstack-start-5**: `@tanstack/react-router@1.170.46`, `@tanstack/react-start@1.169.4`, `react@19.3.1`, `react-dom@19.3.1`, `srvx@1.0.7`, `@types/node@24.19.2`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `@vitejs/plugin-react@6.1.2`, `typescript@7.0.2`, `vite@8.3.5`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **vanilla-1**: `typescript@7.0.2`, `vite@8.3.5`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **vanilla-2**: `typescript@7.0.2`, `vite@8.3.5`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **vanilla-3**: `typescript@7.0.2`, `vite@8.3.5`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **vanilla-4**: `typescript@7.0.2`, `vite@8.3.5`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2
- **vanilla-5**: `typescript@7.0.2`, `vite@8.3.5`
  - Tooling: none
  - MCP servers in the session: none
  - Node v24.22.1, npm 11.19.1, Claude Code 2.1.310 (Claude Code), agent-browser agent-browser 0.39.2

## Iterations

| Iteration | Claude Code | Model | Node | Final tests | Problems |
| --- | --- | --- | --- | --- | --- |
| angular-1 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| angular-2 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| angular-3 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | measure container exited with 1; see measure/measure.log |
| angular-4 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | measure container exited with 1; see measure/measure.log |
| angular-5 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| astro-1 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| astro-2 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| astro-3 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| astro-4 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| astro-5 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| gracile-1 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| gracile-2 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| gracile-3 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| gracile-4 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| gracile-5 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| hono-htmx-1 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| hono-htmx-2 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| hono-htmx-3 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| hono-htmx-4 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| hono-htmx-5 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| next-1 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| next-2 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| next-3 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| next-4 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| next-5 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| nuxt-1 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| nuxt-2 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| nuxt-3 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| nuxt-4 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| nuxt-5 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| qwik-1 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| qwik-2 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| qwik-3 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| qwik-4 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| qwik-5 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| react-router-1 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| react-router-2 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| react-router-3 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| react-router-4 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| react-router-5 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| solidstart-1 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| solidstart-2 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| solidstart-3 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| solidstart-4 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| solidstart-5 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| sveltekit-1 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| sveltekit-2 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| sveltekit-3 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| sveltekit-4 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| sveltekit-5 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| tanstack-start-1 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| tanstack-start-2 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| tanstack-start-3 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| tanstack-start-4 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| tanstack-start-5 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| vanilla-1 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| vanilla-2 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| vanilla-3 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| vanilla-4 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
| vanilla-5 | 2.1.310 (Claude Code) | claude-opus-5-5 (high) | v24.22.1 | pass | — |
