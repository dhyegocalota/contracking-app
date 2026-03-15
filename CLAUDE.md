# CLAUDE.md

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## Monorepo Structure (Bun Workspaces)

This is a Bun workspaces monorepo. Single domain: contraction tracking.

- `apps/api/` — Cloudflare Worker (wrangler). D1 database, magic link auth (Resend + React Email).
- `apps/dashboard/` — React 19 app served by `Bun.serve()`. Tailwind CSS via CDN. Lucide icons.
- `libs/shared/` — Shared types, enums, constants.

### Running

```bash
cd apps/api && bunx wrangler dev       # Start API locally
cd apps/dashboard && bun run dev       # Start dashboard locally
bun test                               # Run all tests
bunx biome check .                     # Lint and format check
```

### Deploy

```bash
cd apps/api && bunx wrangler deploy                    # Deploy API to Cloudflare Workers
cd apps/api && bunx wrangler d1 migrations apply contracking --remote  # Run D1 migrations
cd apps/dashboard && bun run build && bunx wrangler pages deploy dist --project-name=contracking  # Deploy dashboard
```

### Import Aliases

```ts
import { Intensity, Position, type Contraction } from '@contracking/shared';
```

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- Cloudflare Workers API for the backend. Don't mix with Bun server APIs.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
  },
  development: {
    hmr: true,
    console: true,
  }
})
```
