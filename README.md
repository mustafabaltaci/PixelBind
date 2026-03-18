# PixelBind

[![PixelBind](https://img.shields.io/badge/PixelBind-Launch_Tool-6366f1?style=for-the-badge)](https://mustafabaltaci.github.io/PixelBind)
PixelBind is a browser-based sprite sheet generator, texture packer, and sprite atlas tool for pixel art workflows. It helps game developers clean sprite backgrounds, auto-trim assets, normalize them into grid cells, pack them into a single atlas, and export a Tiled-compatible `.tsx` descriptor without relying on a backend for the core image pipeline.

The application is built with React, Vite, Tailwind CSS, and the HTML5 Canvas API. Its primary goal is to turn raw sprite images into production-ready sprite sheets quickly while keeping the processing experience local to the browser.

## What It Does

- Imports sprite assets via drag and drop.
- Accepts PNG, JPG/JPEG, and saved workspace files (`.spack` / `.json`).
- Removes white backgrounds using tolerance-based color matching.
- Supports two white-cleaning modes:
  - edge-only flood fill to preserve internal white details
  - full-image cleanup for aggressively removing white pixels
- Auto-trims transparent space around each asset.
- Scales sprites with nearest-neighbor rendering to preserve pixel sharpness.
- Places sprites into configurable grid cells with per-asset width/height span and padding.
- Packs processed sprites into a single sheet using a shelf-packing layout.
- Exports:
  - main sprite sheet PNG
  - Tiled `.tsx` tileset definition
  - optional hover-outline PNG
- Saves and restores complete workspaces through `.spack` files.
- Includes English and Turkish UI support.
- Includes light and dark theme toggling.

## Product Highlights

### 1. Local-first image pipeline

The sprite processing flow runs in the browser through Canvas operations. Uploaded image files are not sent to an application backend for trimming, scaling, packing, or sheet generation.

### 2. Per-asset control

Each imported asset can be configured independently:

- custom display/name field
- grid span (`W`, `H`)
- internal padding (`PX`, `PY`)
- background removal toggle
- white-removal tolerance
- inner-white cleanup toggle

This makes the tool useful for mixed asset sets where props, tiles, decorations, and larger objects do not share the same footprint.

### 3. Tiled-ready output

PixelBind generates a `.tsx` file alongside the atlas image so the exported sheet can be imported directly into [Tiled](https://www.mapeditor.org/).

### 4. Workspace persistence

The `.spack` format captures package settings and asset data, allowing users to pause and resume work without rebuilding the sheet setup from scratch.

## Real Behavior and External Services

The core sprite pipeline is local, but the full app is not entirely offline-only:

- `Prompt Ideas` loads remote data from a published Google Apps Script endpoint.
- The contact form sends messages through the EmailJS API when environment variables are configured.
- Language and theme preferences are stored in `localStorage`.

This distinction matters if you want to describe the project accurately in production or privacy-sensitive contexts.

## Typical Workflow

1. Choose a base grid such as `16x16`, `32x32`, `48x48`, `64x64`, or a custom width/height.
2. Drag image assets into the drop zone.
3. Adjust asset-level settings:
   - rename the asset
   - define grid span
   - define X/Y padding
   - enable or disable background cleanup
   - tune cleanup tolerance
   - optionally remove inner white pixels
4. Enable outline generation if needed.
5. Save the workspace as `.spack` if you want a restorable project file.
6. Generate the sheet and review the preview modal.
7. Download the output files.

## Generated Outputs

### Main atlas

- File: `<package-name>.png`
- Contains all processed assets packed into one sprite sheet

### Tiled descriptor

- File: `<package-name>.tsx`
- Includes tile width, tile height, tile count, columns, and atlas image reference

### Optional outline sheet

- File: `<package-name>_outlines.png`
- Builds a 1-pixel green outline around opaque regions for hover/highlight use cases

### Workspace file

- File: `<package-name>_workspace.spack`
- Stores package settings and base64-encoded source assets for later restoration

## Tech Stack

- React 18
- Vite 8
- Tailwind CSS 3
- Lucide React
- react-dropzone
- HTML5 Canvas API
- GitHub Pages deployment workflow

## Project Structure

```text
src/
  App.jsx                     Main generator UI and app flow
  main.jsx                    React entrypoint
  assets/                     Static assets such as the PixelBind logo
  components/
    Toggles.jsx               Theme and language toggles
  context/
    LanguageContext.jsx       UI language state
    ThemeContext.jsx          UI theme state
  i18n/
    translations.js           English and Turkish translations
  pages/
    ContactPage.jsx           Contact / feedback screen
  styles/
    index.css                 Tailwind entry styles
  utils/
    canvasProcessor.js        Background cleanup, trimming, packing, export logic
```

## Local Development

### Requirements

- Node.js 20 recommended
- npm

### Install

```bash
npm install
```

### Start the dev server

```bash
npm run dev
```

### Start the local Windows-friendly server

```bash
npm run dev:local
```

You can also use `start-local-server.bat`, which:

- checks whether `npm` is installed
- installs dependencies if `node_modules` is missing
- starts Vite on `127.0.0.1:4173` when available
- opens the browser automatically

### Production build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Environment Variables

The contact form is optional and requires EmailJS configuration.

Create a local `.env` file based on `.env.example`:

```bash
VITE_EMAILJS_PUBLIC_KEY=your_public_key
VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxx
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

If these values are missing, the contact page remains visible but form submission is disabled and the UI shows a setup warning.

## Deployment

The repository includes a GitHub Actions workflow for GitHub Pages deployment:

- triggers on pushes to `main`
- installs dependencies
- runs `npm run build`
- uploads `dist/`
- deploys through GitHub Pages

Vite is configured with a relative base path (`./`), which makes the build compatible with subpath hosting scenarios such as GitHub Pages project sites.

## Implementation Notes

### Background removal

White removal is based on Euclidean distance from pure white. This is more flexible than checking exact `#FFFFFF` values and works better on anti-aliased edges.

### Trimming

After cleanup, the app scans alpha values to determine the tightest non-transparent bounds before scaling and placement.

### Packing

Processed sprites are sorted by height and arranged using a shelf-packing strategy. This keeps implementation complexity low while producing efficient atlas layouts for common sprite sets.

### Pixel integrity

The final render path explicitly disables image smoothing so scaled sprites preserve hard pixel edges.

## Known Scope Boundaries

- The project is focused on browser-side atlas generation, not full asset pipeline management.
- The generated `.tsx` describes the sheet image and grid metrics, but does not define custom tile metadata per asset.
- Prompt suggestions depend on an external endpoint and are separate from the local sprite-processing engine.

## Current Status

The codebase already includes:

- generator UI
- preview modal
- workspace save/load
- bilingual interface
- theme toggle
- optional contact page
- optional prompt-idea browser

`npm run build` completes successfully in the current project state.

## License

Add the license you intend to distribute this project under. If you plan to open-source it, MIT is a common default choice, but the repository currently does not include a license file.
