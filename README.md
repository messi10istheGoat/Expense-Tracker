# Expense Tracker

Spendwise is a React + TypeScript personal finance dashboard built with Vite and Tailwind CSS. It runs entirely in the browser with generated demo data; no backend or environment variables are required.

## Run locally

Use Node.js 22.12 or newer (Node 22 LTS is pinned in `.nvmrc`).

```sh
nvm use
npm ci
npm run dev
```

## Verify the production build

```sh
npm run build
npm run preview
```

The build checks TypeScript and writes the deployable site to `dist/`. Publish **`dist/`**, not the repository root: browsers cannot run `src/main.tsx` directly. Asset URLs are relative so the build also works at `/Expense-Tracker/`.

## Deploy to GitHub Pages

1. In the repository, open **Settings → Pages → Build and deployment**.
2. Change **Source** from **Deploy from a branch** to **GitHub Actions**. This is a one-time setting; do not publish the raw `main` branch root.
3. Merge these changes into `main`. The **Deploy to GitHub Pages** workflow installs dependencies on Linux, checks TypeScript, builds the app, and deploys only `dist/`. Pull requests run the same build without deploying.
4. Check the workflow in the **Actions** tab. After it succeeds, visit https://messi10isthegoat.github.io/Expense-Tracker/.

If the changes are already on `main` when you change the Pages source, use **Actions → Deploy to GitHub Pages → Run workflow** and select `main`.

## Other static hosts

- Install command: `npm ci` (include development dependencies during the build).
- Build command: `npm run build`.
- Publish/output directory: `dist`.
- Node.js version: 22 LTS (22.12 or newer).

Never commit `node_modules/` or `dist/`. Dependencies must be installed on the build machine using `package-lock.json`; copying a Windows dependency directory to Linux can cause executable-permission errors or missing native Rollup/esbuild/Tailwind modules.
