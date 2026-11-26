import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isSpotifyPlaybackActive, normalizeSpotifyPlayback, spotifyEntityUrl } from "../src/lib/spotifyPlayback.js";
import favoriteTracks from "../src/lib/localMusicPlaylist.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("retro camera uses the existing camera stream, countdown, capture flash, and captured photos", () => {
  const app = read("src/App.jsx");
  const page = read("src/components/PhotoboothPage.jsx");
  const camera = read("src/components/RetroCamera.jsx");
  const styles = read("src/styles/retroCamera.css");
  const asset = fs.readFileSync(path.join(root, "src/assets/camera-frame.png"));

  assert.equal(asset.toString("ascii", 1, 4), "PNG");
  assert.equal(asset.readUInt32BE(16), 659);
  assert.equal(asset.readUInt32BE(20), 379);
  assert.equal(asset[25], 6, "camera frame must retain its alpha channel");
  assert.match(app, /<PhotoboothPage/);
  assert.match(page, /<RetroCamera/);
  assert.match(page, /filterStyle=\{filterStyle\}/);
  assert.match(page, /onClick=\{onCameraAction\}/);
  assert.match(app, /onCameraAction=\{runSession\}/);
  assert.match(app, /onCustomize=\{\(\) => setPage\("customize"\)\}/);
  assert.match(camera, /src=\{cameraFrame\}/);
  assert.match(camera, /ref=\{videoRef\}/);
  assert.match(camera, /capturedPreview\.original/);
  assert.match(camera, /setTimeout\(\(\) => setBriefPreview\(null\), 620\)/);
  assert.match(styles, /aspect-ratio:\s*659\s*\/\s*379/);
  assert.match(styles, /object-fit:\s*cover/);
  assert.match(styles, /\.retro-camera\.is-flashing \.retro-camera-screen::after/);
  assert.match(app, /const completed = await runPhotoSession\(\s*videoRef\.current,\s*selectedPhotoCount,?\s*\)/);
  assert.match(app, /stopCamera\(\)/);
});

test("captured photo results are hidden until capture and retake activity finish", () => {
  const page = read("src/components/PhotoboothPage.jsx");

  assert.match(page, /const completedResultsVisible = showResult && !busy && retakeIndex === null/);
  assert.match(page, /\{completedResultsVisible && shots\.length > 0 && \([\s\S]*?className="captured-row"/);
  assert.match(page, /\{completedResultsVisible && \([\s\S]*?className="photobooth-return-actions"/);
});

test("camera opens in a closable popup while keeping one mounted video element", () => {
  const page = read("src/components/PhotoboothPage.jsx");
  const styles = read("src/styles/photobooth.css");
  const camera = read("src/components/RetroCamera.jsx");

  assert.match(page, /createPortal\([\s\S]*?className="camera-popup-backdrop" hidden=\{!cameraPopupOpen\}[\s\S]*?<RetroCamera/);
  assert.match(page, /setCameraPopupOpen\(true\);\s*onCameraAction\(\);/);
  assert.match(page, /if \(retakeIndex !== null\) onCancelRetake\(\);\s*else onStopCamera\(\);/);
  assert.match(page, /aria-modal="true"/);
  assert.match(page, /event\.key === "Escape"/);
  assert.match(styles, /\.camera-popup-backdrop \{ position: fixed/);
  assert.match(camera, /ref=\{videoRef\}/);
});

test("paper swatches stay square and frame selection uses one outer card", () => {
  const customization = read("src/components/PhotoCustomizationPage.jsx");
  const paperSettings = read("src/components/FramePaperSettings.jsx");
  const styles = read("src/styles/photobooth.css");

  assert.match(customization, /className="swatch" aria-hidden="true" \/>/);
  assert.match(customization, /className="frame-selected-mark"/);
  assert.match(paperSettings, /className="paper-color-swatch"/);
  assert.match(paperSettings, /aria-pressed=\{isSelected\}/);
  assert.match(styles, /\.app-shell \.swatch \{[^}]*width: 18px; height: 24px; display: block; border: 0;[^}]*box-shadow: none/);
  assert.match(styles, /\.customization-page \.frame-option\.selected \{[^}]*border: 2px solid #[a-f0-9]+;[^}]*box-shadow: none/);
  assert.match(styles, /\.frame-selected-mark \{[^}]*border: 0; background: transparent/);
  assert.match(styles, /\.paper-color-swatch \{[^}]*border-radius: 0/);
  assert.match(styles, /\.paper-color-option\.selected::after \{[^}]*content: "✓"/);
});

test("captured photo previews preserve their full aspect ratio across layouts", () => {
  const page = read("src/components/PhotoCustomizationPage.jsx");
  const styles = read("src/styles/photobooth.css");
  const retroCamera = read("src/styles/retroCamera.css");

  assert.match(page, /gridTemplateColumns:[\s\S]*?photoCount === 1[\s\S]*?repeat\(\$\{photoCount\}/);
  assert.match(page, /src=\{photo\.original\}/);
  assert.match(page, /onRetake\(photo\.id\)/);
  assert.match(styles, /\.photo-contact-sheet-grid img \{[^}]*object-fit: contain; background: #e9ddce;/);
  assert.match(styles, /\.photo-editor-thumbnail img \{[^}]*object-fit: contain; background: #e9ddce;/);
  assert.match(styles, /\.photobooth-layout \.captured-row img \{[^}]*object-fit: contain; background: #e9ddce;/);
  assert.match(retroCamera, /\.retro-camera-captured \{ object-fit: contain; background: #292527; \}/);
});

test("paper surfaces use subtle grain and avoid repetitive decorative patterns", () => {
  const renderer = read("src/lib/photobooth.js");
  const styles = read("src/styles/photobooth.css");
  const resultSurface = styles.match(/\.result-section \{([^}]*)\}/)?.[1] ?? "";

  assert.match(renderer, /const grainStrength = 0\.035 \* paper\.texture \/ 100/);
  assert.doesNotMatch(resultSurface, /repeating-|radial-gradient/);
  assert.match(styles, /\.photo-strip-preview img \{[^}]*drop-shadow/);
});

test("export uses the provided vinyl and keeps direct delivery marked as coming soon", () => {
  const app = read("src/App.jsx");
  const overlay = read("src/components/DevelopingOverlay.jsx");
  const page = read("src/components/PhotoCustomizationPage.jsx");
  const styles = read("src/styles/photobooth.css");
  const baseStyles = read("src/styles.css");
  const vinyl = fs.readFileSync(path.join(root, "src/assets/vinyl-record.png"));

  assert.equal(vinyl.toString("ascii", 1, 4), "PNG");
  assert.match(overlay, /import vinylRecord from "\.\.\/assets\/vinyl-record\.png"/);
  assert.match(overlay, /<img className="developing-disc" src=\{vinylRecord\}/);
  assert.match(baseStyles, /\.developing-disc\{[^}]*animation:spin 3s linear infinite/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(app, /\(developing \|\| exporting\) && \([\s\S]*?isExporting=\{exporting\}/);
  assert.match(app, /renderStripBlob\(stripConfig\.exportScale\)/);
  assert.match(app, /downloadBlob\(result\.blob, fileName\)/);
  assert.match(app, /setExportedBlob\(result\.blob\)/);
  assert.match(app, /downloadBlob\(exportedBlob, exportedFileName\)/);
  assert.match(page, /exportReady && \([\s\S]*?className="export-success"/);
  assert.match(page, /export-delivery-coming-soon/);
  assert.match(page, /WHATSAPP/);
  assert.match(page, /EMAIL/);
  assert.match(page, /COMING SOON/);
  assert.doesNotMatch(page, /type="tel"|type="email"|onSendExport/);
  assert.doesNotMatch(page, /https:\/\/wa\.me\/|mailto:/);
});

test("Spotify playback activity comes only from iFrame API playback events", () => {
  assert.equal(isSpotifyPlaybackActive(null), false);
  assert.equal(isSpotifyPlaybackActive({ isPlaying: true }), true);
  assert.equal(isSpotifyPlaybackActive({ isPlaying: false }), false);

  assert.deepEqual(normalizeSpotifyPlayback({
    isPaused: false, isBuffering: false, position: 420, duration: 6000, playingURI: "spotify:track:abc",
  }), {
    isPlaying: true, isPaused: false, isBuffering: false, isEnded: false,
    playingURI: "spotify:track:abc", position: 420, duration: 6000,
  });
  assert.equal(normalizeSpotifyPlayback({ isPaused: true, isBuffering: false, position: 10, duration: 6000 }).isPlaying, false);
  assert.equal(normalizeSpotifyPlayback({ isPaused: false, isBuffering: true, position: 10, duration: 6000 }).isPlaying, false);
  const ended = normalizeSpotifyPlayback({ isPaused: false, isBuffering: false, position: 6000, duration: 6000 });
  assert.equal(ended.isPlaying, false);
  assert.equal(ended.isEnded, true);
  assert.equal(normalizeSpotifyPlayback({ position: 1 }), null);
  assert.equal(spotifyEntityUrl("https://open.spotify.com/embed/track/abc?theme=0"), "https://open.spotify.com/track/abc?theme=0");
  assert.equal(spotifyEntityUrl("not-a-url"), "not-a-url");
});

test("Spotify Embed subscribes to playback events, cleans up, and never polls", () => {
  const embed = read("src/components/SpotifyEmbed.jsx");
  const app = read("src/App.jsx");
  const soundtrack = read("src/components/SoundtrackPanel.jsx");
  const player = read("src/components/VinylPlayer.jsx");
  const styles = read("src/styles/vinylPlayer.css");

  assert.match(embed, /open\.spotify\.com\/embed\/iframe-api\/v1/);
  assert.match(embed, /addListener\("playback_update"/);
  assert.match(embed, /addListener\("playback_started"/);
  assert.match(embed, /spotifyEntityUrl\(embed\)/);
  assert.match(embed, /embed\.includes\("\/embed\/playlist\/"\) \? "352" : "152"/);
  assert.match(embed, /height=\{embedHeight\}/);
  assert.equal((embed.match(/addListener\("playback_update"/g) ?? []).length, 1);
  assert.equal((embed.match(/addListener\("playback_started"/g) ?? []).length, 1);
  assert.match(embed, /removeListener\?\.\("playback_update"/);
  assert.match(embed, /controller\.destroy\?\.\(\)/);
  assert.doesNotMatch(embed, /setInterval|setTimeout/);
  assert.match(app, /<SoundtrackPanel/);
  assert.doesNotMatch(soundtrack, /<SpotifyEmbed/);
  assert.match(soundtrack, /<VinylPlayer isPlaying=\{isPlaying\} \/>/);
  assert.match(player, /isPlaying \? "is-playing"/);
  assert.match(player, /rotating while music is playing/);
  assert.match(styles, /animation:\s*vinyl-player-rotation 5s linear infinite/);
  assert.match(styles, /animation-play-state:\s*paused/);
  assert.match(styles, /\.vinyl-player\.is-playing \.vinyl-player-image \{ animation-play-state: running; \}/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});

test("homepage hero uses layered camera and vinyl artwork without replacing the photobooth camera", () => {
  const app = read("src/App.jsx");
  const photoboothPage = read("src/components/PhotoboothPage.jsx");
  const heroCopy = read("src/components/PhotoboothHero.jsx");
  const hero = read("src/components/HeroArtwork.jsx");
  const styles = read("src/styles/photobooth.css");

  assert.ok(app.indexOf("<PhotoboothHero />") < app.indexOf("<SoundtrackPanel"));
  assert.ok(app.indexOf("<SoundtrackPanel") < app.indexOf("<PhotoboothPage"));
  assert.match(app, /key="shared-soundtrack"/);
  assert.doesNotMatch(app, /homepage-artwork-panel|<HeroArtwork/);
  assert.match(heroCopy, /Four moments\./);
  assert.match(heroCopy, /One little keepsake\./);
  assert.match(heroCopy, /<HeroArtwork\s*\/>/);
  assert.match(hero, /assets\/camera-frame\.png/);
  assert.match(hero, /assets\/vinyl-record\.png/);
  assert.match(hero, /thePhoto's/);
  assert.match(styles, /\.hero-artwork-vinyl[\s\S]*z-index:\s*0/);
  assert.match(styles, /\.hero-artwork-camera[\s\S]*z-index:\s*2/);
  assert.match(styles, /\.shared-soundtrack\.is-studio-split\s*\{[^}]*grid-template-columns:\s*minmax\(0,1\.05fr\)\s+minmax\(0,\.95fr\)/);
  assert.match(styles, /@media\(max-width:850px\)[\s\S]*?\.shared-soundtrack\.is-studio-split \{ grid-template-columns: minmax\(0,1fr\);/);
  assert.match(styles, /\.photobooth-hero\s*\{[^}]*grid-template-columns:\s*minmax\(0,1\.15fr\)\s+minmax\(0,\.85fr\)/);
  assert.match(styles, /@media\(max-width:650px\)[\s\S]*?\.photobooth-hero \.hero-artwork \{ display: none; \}/);
  assert.match(photoboothPage, /<RetroCamera/);
});

test("local music player uses seven available MP3 tracks and matching covers", () => {
  const app = read("src/App.jsx");
  const soundtrack = read("src/components/SoundtrackPanel.jsx");
  const styles = read("src/styles/vinylPlayer.css");

  assert.equal(favoriteTracks.length, 7);
  assert.ok(favoriteTracks.every((track) =>
    typeof track.title === "string" &&
    typeof track.artist === "string" &&
    typeof track.src === "string" &&
    typeof track.cover === "string" &&
    fs.existsSync(path.join(root, "public", track.src.replace(/^\/+/, ""))) &&
    fs.existsSync(path.join(root, "public", track.cover.replace(/^\/+/, "")))
  ));
  assert.equal((soundtrack.match(/<audio\b/g) ?? []).length, 1);
  assert.match(soundtrack, /aria-label="Previous track"/);
  assert.match(soundtrack, /aria-label="Next track"/);
  assert.match(soundtrack, /aria-label="Track progress"/);
  assert.match(soundtrack, /aria-label="Favorite tracks"/);
  assert.match(soundtrack, /const request = audio\.play\(\)/);
  assert.match(soundtrack, /onEnded=\{\(\) => playTrack\(\(trackIndex \+ 1\) % favoriteTracks\.length\)\}/);
  assert.match(soundtrack, /This track has no MP3 configured/);
  assert.match(soundtrack, /<VinylPlayer isPlaying=\{isPlaying\} \/>/);
  assert.match(app, /<SoundtrackPanel \/>/);
  assert.doesNotMatch(app, /spotifyInput|spotifyEmbed|setSpotifyPlayback/);
  assert.doesNotMatch(soundtrack, /SpotifyEmbed|spotifyInput|Spotify playlist/);
  assert.match(styles, /animation:\s*vinyl-player-rotation 5s linear infinite/);
});

test("music playlist is vertical on desktop and horizontally scrollable on mobile", () => {
  const soundtrack = read("src/components/SoundtrackPanel.jsx");
  const styles = read("src/styles/photobooth.css");

  assert.match(soundtrack, /className="local-track-list"[\s\S]*?tabIndex=\{0\}/);
  assert.match(styles, /\.local-track-list \{ display:\s*grid; grid-template-columns:\s*minmax\(0,1fr\)/);
  assert.match(styles, /@media\(max-width:650px\)[\s\S]*?\.local-track-list \{ display:\s*flex;[^}]*overflow-x:\s*auto/);
  assert.match(styles, /@media\(max-width:650px\)[\s\S]*?\.local-track-list li \{ flex:\s*0 0 calc\(\(100% - 16px\) \/ 3\)/);
  assert.match(styles, /@media\(max-width:650px\)[\s\S]*?\.local-track-list::-webkit-scrollbar \{ display:\s*block/);
  assert.match(styles, /@media\(max-width:650px\)[\s\S]*?scrollbar-width:\s*thin/);
});

test("home page reserves bottom spacing after its cards and footer", () => {
  const styles = read("src/styles/photobooth.css");

  assert.match(styles, /\.shared-soundtrack\.is-studio-split \{[^}]*padding-bottom:\s*clamp\(32px,4vw,56px\)/);
  assert.match(styles, /\.app-shell \{ padding-bottom:\s*clamp\(32px,4vw,56px\); \}/);
});
