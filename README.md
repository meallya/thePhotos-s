# thePhoto's — Phase 3

A retro-mix browser photobooth built with React and Vite.

## Included
- Live webcam preview with mirrored viewfinder
- Configurable one-to-four-photo timed capture session (count locks after the first shot; 3-second countdown per shot)
- Camera flash and developing-room transition
- Six paper/frame palettes
- Four film finishes: Original, Warm Film, B&W, and Soft Glow
- Local soundtrack player with seven included tracks and synchronized vinyl
- Editable photo-strip caption
- Configurable vertical and horizontal strips with caption, date, spacing, size, and crop controls
- High-resolution PNG export at 1×, 2×, or 3×
- Final-review photo preview lightbox and PNG export
- Responsive layout

## Run locally
Requires Node.js 24.x, matching the Vercel runtime selected for this release.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Camera access works on `localhost` or a secure HTTPS origin. Allow camera permission when prompted.

## Local soundtrack
Seven MP3 tracks and their matching JPEG artwork are included in `public/music/` and `public/music/covers/`. Their exact public paths are configured in `src/lib/localMusicPlaylist.js`; keep filenames and path capitalization synchronized when replacing assets.

Playback starts only after user interaction. The single HTML audio player remains mounted while navigating between the photobooth and customization pages, and the vinyl follows actual audio playback events.

## Final photo preview
The final-review `VIEW PHOTO` lightbox shows the current rendered strip, switching to the exact exported PNG after export. Its download action reuses the saved export when available, or invokes the existing export action once.

## Interactive tutorial
The seven-step tutorial opens automatically until completed or skipped. Use `HOW TO USE` in the top bar to open it again. Completion is stored in browser `localStorage` under `thephotos:tutorial-completed:v1`.

## WhatsApp & email delivery
WhatsApp and email are marked `COMING SOON`. No recipient details are requested, and direct `POST` requests to both delivery routes are rejected with `410 Gone` for this release, regardless of environment variables or configured credentials. No delivery credentials are needed to build or deploy. Re-enabling delivery requires an intentional code change and a separately reviewed release; environment configuration alone cannot enable it.

## Vercel deployment
Vercel builds with `npm run build` and serves the static output in `dist/`. The root `vercel.json` configures the SPA fallback while excluding `/api/*`, so the delivery routes still return their explicit disabled response. No environment secrets are required for this release.

## Privacy
- Camera frames and exports stay in the browser; direct delivery is disabled at the server route for this release.
- Local MP3 playback is handled by the browser and the files remain served from this app.
- Photos are held in memory until the page is refreshed.
