# Swatch Internet Time Clock Demo Examples


Examples for `swatch-clocks-demo`:

- `basic-clock-test.html` — minimal standalone HTML test
- `preact-auto`: Vite + Preact app that calls `autoInit()` after rendering.
- `preact-manual`: Vite + Preact app that disables auto-init and manually constructs/destroys a `Clock` instance.

How to run an example

1. Install dependencies:

```bash
cd swatch-clocks-demo/examples/preact-auto
npm install
npm run dev
# open http://localhost:5173
```

Or for the manual example:

```bash
cd swatch-clocks-demo/examples/preact-manual
npm install
npm run dev
# open http://localhost:5173
```

Notes

- Each example contains a `public/vendor` copy of the library ESM build (`clocks.esm.js`) and `clocks.css` so you can run them without publishing to npm or using the external CDN.
- If you prefer to test using the root demo's `vendor/` folder (the folder updated by your GitHub Actions), you can replace the `public/vendor` files or serve the example from the demo root instead of running Vite.

---

## Technical details

This file explains how the examples are wired and how to work with the library during development.

### Example structure

- `basic-clock-test.html` — minimal standalone HTML test that uses the browser bundle and data-attributes for quick manual testing. You can open this file directly in a browser or serve it from a simple static server:

```bash
# from repo root
python3 -m http.server --directory examples 8000
# then open http://localhost:8000/basic-clock-test.html
```

- `preact-auto` — Vite + Preact example. The app uses the demo bundle in `public/vendor` and relies on the library's auto-init behavior.

- `preact-manual` — Vite + Preact example. The app disables the library's auto-init and demonstrates manual construction / destruction of `Clock` instances.

### Run an example

1. Install dependencies and run dev server for an example:

```bash
cd examples/preact-auto
npm install
npm run dev
# open http://localhost:5173
```

2. If you are actively developing the library and want the examples to use the latest built artifacts from the library repository, copy the `dist/` files into the example `public/vendor` folders. From the library repository root (sibling folder to this demo) run:

```bash
# from the `swatch-clocks` repo root
npm run demo:copy
```

This command copies `dist/clocks.esm.js` and `dist/clocks.css` into each example's `public/vendor/` directory so the examples can run without publishing.

Note: `npm run demo:copy` reads files from the library's `dist/` directory. Run `npm run build` in the `swatch-clocks` repository first so the `dist/` artifacts are available.

### How the examples load the library

- The examples include a vendor module script in their `index.html`:

```html
<link rel="stylesheet" href="/vendor/clocks.css">
<script type="module" src="/vendor/clocks.esm.js"></script>
```

Loading the vendor module as a plain `<script type="module">` (before your app module) ensures the global runtime helpers are available on `window.SwatchClocks` and the `swatch-clock` web component is registered before your app code runs.

If you prefer to use pure ESM imports inside a bundler, import the named exports from `@swatchtime/clocks` (after publishing) or from a local path to `clocks.esm.js` during development.

### Manual initialization example

To disable automatic initialization and construct clocks programmatically:

1. Prevent auto-init by setting the global flag before loading the vendor script:

```html
<script>window.SwatchClocksAutoInit = false;</script>
<link rel="stylesheet" href="/vendor/clocks.css">
<script type="module" src="/vendor/clocks.esm.js"></script>
```

2. Create and destroy clocks from your app (examples show Preact usage):

```javascript
// using the global runtime helpers populated by the vendor script
const preset = window.SwatchClocks.getPreset('minimal-logo-medium');
const opts = window.SwatchClocks.buildOptionsForElement(el, preset);
const instance = new window.SwatchClocks.Clock(el, opts);

// later, to remove it:
instance.destroy();
```

Or, when using ESM in a bundler (published package):

```javascript
import { getPreset, buildOptionsForElement, Clock } from '@swatchtime/clocks';
const preset = getPreset('minimal-logo-medium');
const opts = buildOptionsForElement(el, preset);
const instance = new Clock(el, opts);
instance.destroy();
```

### Idempotency and teardown

- Calling `autoInit()` multiple times will not create duplicate visible clocks or start extra background timers. The library stores the active instance on the DOM element as `element.clock` and reuses it during repeated initializations.
- To fully remove an instance, call `element.clock.destroy()` before re-initializing that element.

### Troubleshooting

- If Vite reports errors about importing files from `/public` (for example `Cannot import non-asset file /vendor/clocks.css`), reference the CSS via a `<link>` in `index.html` rather than importing it from JS. The examples already use `<link>` for `clocks.css` and load `clocks.esm.js` as a module script before the app.
