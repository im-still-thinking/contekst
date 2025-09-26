# # Contekst Monorepo

A monorepo for the Contekst project using Bun workspaces.

## Structure

- `apps/frontend` - Frontend application
- `apps/backend` - Backend API
- `apps/extension` - Browser/VS Code extension  
- `packages/` - Shared packages and utilities

## Development

Install dependencies:
```bash
bun install
```

Run all apps in development mode:
```bash
bun run dev
```

Build all apps:
```bash
bun run build
```

Clean all build artifacts:
```bash
bun run clean
```

## Working with individual apps

Navigate to any app directory and run commands there:
```bash
cd apps/frontend
bun run dev
```install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.21. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
