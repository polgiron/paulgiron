# Paul Giron

Personal site, built with Vite, TypeScript and Three.js.

```bash
npm install
npm run dev
```

`npm run build` type-checks and writes the static site to `dist/`.

## Backups

Earlier versions live in `backup/` and are not part of the build:

- `backup/angular-2021/`: the Angular 11 site, as it was before this rewrite. Its `package.json` and `package-lock.json` have an `.archived` suffix, so dependency scanners skip them; remove the suffix to install it
- `backup/ribbon-experiment/`: an abandoned 3D ribbon direction, never shipped
- `backup/index.html`, `backup/space/`, `backup/static/`: older static versions
