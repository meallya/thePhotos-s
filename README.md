# thePhoto's — Phase 2

A retro-mix browser photobooth built with React and Vite.

## Included
- Live webcam preview with mirrored viewfinder
- Four-photo timed capture session (3-second countdown per shot)
- Camera flash and developing-room transition
- Six paper/frame palettes
- Four film finishes: Original, Warm Film, B&W, and Soft Glow
- Spotify Embed support for track, album, playlist, episode, and show links
- Editable photo-strip caption
- Decorative scalloped/lace-inspired paper edge and paper grain
- Photo strip preview and PNG export
- Responsive layout

## Run locally
Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Camera access works on `localhost` or a secure HTTPS origin. Allow camera permission when prompted.

## Spotify notes
Paste a Spotify share link or Spotify URI into the soundtrack field. The app converts supported links to Spotify's official embedded player. Playback is controlled inside that player and may require the listener to be signed in or have access to the content. This version does not use Spotify OAuth or the Web Playback SDK.

For fully custom playback controls (play/pause/next/progress in the app), a later phase can add Spotify OAuth and the Web Playback SDK. Spotify Premium is required for Web Playback SDK playback.

## Privacy
- Camera frames are processed in the browser and are not uploaded to a server.
- The Spotify player is served by Spotify and follows Spotify's own privacy and playback rules.
- Photos are held in memory until the page is refreshed.
