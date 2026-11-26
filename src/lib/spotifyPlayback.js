export function normalizeSpotifyPlayback(data) {
  if (!data || typeof data !== "object" || typeof data.isPaused !== "boolean") return null;

  const position = Number(data.position);
  const duration = Number(data.duration);
  const isEnded = Number.isFinite(duration) && duration > 0 && Number.isFinite(position) && position >= duration;
  const isBuffering = data.isBuffering === true;

  return {
    isPlaying: !data.isPaused && !isBuffering && !isEnded,
    isPaused: data.isPaused,
    isBuffering,
    isEnded,
    playingURI: typeof data.playingURI === "string" ? data.playingURI : "",
    position: Number.isFinite(position) ? position : 0,
    duration: Number.isFinite(duration) ? duration : 0,
  };
}

export function isSpotifyPlaybackActive(playback) {
  return playback?.isPlaying === true;
}

export function spotifyEntityUrl(embedUrl) {
  if (typeof embedUrl !== "string") return "";
  try {
    const url = new URL(embedUrl);
    if (url.hostname === "open.spotify.com" && url.pathname.startsWith("/embed/")) {
      url.pathname = url.pathname.slice("/embed".length);
    }
    return url.href;
  } catch {
    return embedUrl;
  }
}
