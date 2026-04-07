# TVpuls Converter (Cloud Edition)

A high-performance video converter that runs entirely in your browser using **FFmpeg.WASM**. No software installation required.

## Features
- **Browser-Powered**: Converts files using your local CPU power, but inside the browser window.
- **Privacy First**: Files never leave your computer. Everything stays local.
- **Smart Conversion**: 
  - Attempts `c:v copy` (Stream Copy) first for lightning-fast conversion if compatible.
  - Automatically falls back to `libx264` (H.264) encoding if needed.
- **Batch Processing**: Select a single file or an entire folder.

## Hosting on GitHub
1. Upload all files from the `web/` directory to a new GitHub repository.
2. Go to **Settings > Pages**.
3. Set the source to the `main` branch (root or `/web` folder).
4. Save and wait for the URL to be generated.

> [!IMPORTANT]
> This app requires a **Cross-Origin Isolated** environment to use `SharedArrayBuffer` (required by FFmpeg.wasm). 
> The included `coi-serviceworker.js` handles this automatically for you on GitHub Pages!

## Technologies
- HTML5 / Vanilla CSS / Modern JS
- [FFmpeg.wasm](https://ffmpegwasm.netlify.app/)
- Service Workers (for COOP/COEP headers)
- Google Fonts (Outfit)
