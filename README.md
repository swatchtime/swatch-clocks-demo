# Embeddable Web Site Clocks Demo Site

This is the Demo Site which uses the Swatch Internet Time Clocks library: 

https://www.npmjs.com/package/@swatchtime/clocks

https://github.com/swatchtime/swatch-clocks

This repository contains a tool to view all the clock styles available in the Swatch Internet Time Clocks library. This tool allows you to customize each clock style and also to get the source code needed to embed the clock on your web site. This repository also contains some sample code showing you how to import the library in a Javascript framework (Preact) and display a Swatch Internet Time clock in a component.

## Live demo

The live demo that shows all available clock styles (with a small customization tool) is available at:

https://clocks.swatchtime.online

The demo site is built from these files in this repository:
- `index.html` — demo landing page
- `clockdemo.js` — demo JavaScript that powers the preview and customization UI
- `clockdemo.css` — demo site styles

## Examples included

This repository contains three example variants you can run locally:

- **Plain HTML** — `basic-clock-test.html` is a minimal standalone page that uses the browser bundle (UMD/ESM) and data attributes to mount clocks without a build step.
- **Preact — Auto Initialization** — `examples/preact-auto` is a Vite + Preact app that relies on the library's auto-init behavior after the app renders.
- **Preact — Manual Initialization** — `examples/preact-manual` is a Vite + Preact app that disables auto-init and demonstrates programmatic construction and teardown of `Clock` instances.

## Running the examples locally

Each example contains a `public/vendor` copy of the library ESM build (`clocks.esm.js`) and `clocks.css` so you can run them without publishing the library to npm.

1. Install dependencies (example):

```bash
cd examples/preact-auto
npm install
npm run dev
# open http://localhost:5173
```

2. If you are developing both the library and the demo side-by-side and want to copy the latest `dist/` artifacts from the library into the examples' `public/vendor` folders, run the copy helper from the library repo root:

```bash
# from the `swatch-clocks` repo root (sibling folder to `swatch-clocks-demo`)
npm run demo:copy
```

Note: `npm run demo:copy` copies files from the library's `dist/` directory. Run `npm run build` in the `swatch-clocks` repository first so `dist/` exists.

3. Start the example dev server:

```bash
cd examples/preact-auto
npm run dev
```

## Technical notes

- The examples load `vendor/clocks.esm.js` as a module script before the application code so the runtime helpers (the `window.SwatchClocks` object and the web component) are available to the app.
- If you intend to import code directly into a bundler (ESM), import the named exports from the package entry (for published installs) or from the `clocks.esm.js` module when running locally.

## Where to look next

- `examples/` — example apps and a minimal HTML test file.
- `src/` (library) — clock implementation, presets, and web component.

#### Additional Links 

- Main project site: https://github.com/swatchtime
- Library repo: https://github.com/swatchtime/swatch-clocks
- Demo repo: https://github.com/swatchtime/swatch-clocks-demo
- npm library: https://www.npmjs.com/package/@swatchtime/clocks
- PreactJS: https://preactjs.com

## License

[MIT](LICENSE)
