import { useEffect, useRef, useState } from "react";
import { normalizeSpotifyPlayback, spotifyEntityUrl } from "../lib/spotifyPlayback.js";

let spotifyIframeApi = null;
let spotifyIframeApiPromise = null;

function loadSpotifyIframeApi() {
  if (spotifyIframeApi) return Promise.resolve(spotifyIframeApi);
  if (spotifyIframeApiPromise) return spotifyIframeApiPromise;

  spotifyIframeApiPromise = new Promise((resolve, reject) => {
    const previousReadyCallback = window.onSpotifyIframeApiReady;
    const script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    script.dataset.thephotosSpotifyIframeApi = "true";

    const handleReady = (api) => {
      spotifyIframeApi = api;
      if (window.onSpotifyIframeApiReady === handleReady) {
        window.onSpotifyIframeApiReady = previousReadyCallback;
      }
      resolve(api);
      try {
        previousReadyCallback?.(api);
      } catch {
        // A separate integration's callback should not block this player.
      }
    };
    const handleError = () => {
      if (window.onSpotifyIframeApiReady === handleReady) {
        window.onSpotifyIframeApiReady = previousReadyCallback;
      }
      script.remove();
      spotifyIframeApiPromise = null;
      reject(new Error("Spotify playback status could not be loaded."));
    };

    window.onSpotifyIframeApiReady = handleReady;
    script.addEventListener("error", handleError, { once: true });
    document.body.appendChild(script);
  });

  return spotifyIframeApiPromise;
}

export default function SpotifyEmbed({ embed, onPlaybackStateChange }) {
  const hostRef = useRef(null);
  const controllerRef = useRef(null);
  const controllerCreatingRef = useRef(false);
  const loadedEmbedRef = useRef("");
  const latestEmbedRef = useRef(embed);
  const requestRef = useRef(0);
  const mountedRef = useRef(false);
  const onPlaybackStateChangeRef = useRef(onPlaybackStateChange);
  const [controllerReady, setControllerReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [embedError, setEmbedError] = useState("");

  latestEmbedRef.current = embed;
  onPlaybackStateChangeRef.current = onPlaybackStateChange;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      const entry = controllerRef.current;
      controllerRef.current = null;
      if (!entry) return;
      entry.controller.removeListener?.("playback_update");
      entry.controller.removeListener?.("playback_started");
      entry.controller.removeListener?.("ready");
      entry.controller.destroy?.();
    };
  }, []);

  useEffect(() => {
    const requestId = ++requestRef.current;
    onPlaybackStateChangeRef.current?.(null);
    setControllerReady(false);
    setFallback(false);
    setEmbedError("");
    loadedEmbedRef.current = "";

    if (!embed) return undefined;

    loadSpotifyIframeApi().then((api) => {
      if (!mountedRef.current || requestId !== requestRef.current) return;

      const current = controllerRef.current;
      if (current) {
        if (loadedEmbedRef.current !== embed) {
          current.controller.loadEntity(spotifyEntityUrl(embed));
          loadedEmbedRef.current = embed;
        }
        setControllerReady(true);
        return;
      }
      if (controllerCreatingRef.current) return;

      const host = hostRef.current;
      if (!host) return;
      controllerCreatingRef.current = true;

      try {
        const embedHeight = embed.includes("/embed/playlist/") ? "352" : "152";
        api.createController(host, { url: spotifyEntityUrl(embed), width: "100%", height: embedHeight }, (controller) => {
          controllerCreatingRef.current = false;
          if (!mountedRef.current) {
            controller.destroy?.();
            return;
          }

          const handlePlaybackUpdate = (event) => {
            onPlaybackStateChangeRef.current?.(normalizeSpotifyPlayback(event?.data));
          };
          const handlePlaybackStarted = (event) => {
            onPlaybackStateChangeRef.current?.({
              isPlaying: true,
              isPaused: false,
              isBuffering: false,
              isEnded: false,
              playingURI: event?.data?.playingURI ?? "",
              position: 0,
              duration: 0,
            });
          };
          const handleReady = () => setControllerReady(true);

          try {
            controller.addListener("playback_update", handlePlaybackUpdate);
            controller.addListener("playback_started", handlePlaybackStarted);
            controller.addListener("ready", handleReady);
            controllerRef.current = {
              controller,
              handlePlaybackUpdate,
              handlePlaybackStarted,
              handleReady,
            };
            loadedEmbedRef.current = embed;
            setControllerReady(true);

            const latestEmbed = latestEmbedRef.current;
            if (latestEmbed && latestEmbed !== embed) {
              controller.loadEntity(spotifyEntityUrl(latestEmbed));
              loadedEmbedRef.current = latestEmbed;
            }
          } catch {
            controller.destroy?.();
            controllerRef.current = null;
            setFallback(true);
            setEmbedError("Playback status is unavailable. The standard Spotify player is still available below.");
          }
        });
      } catch {
        controllerCreatingRef.current = false;
        setFallback(true);
        setEmbedError("Playback status is unavailable. The standard Spotify player is still available below.");
      }
    }).catch(() => {
      if (mountedRef.current && requestId === requestRef.current) {
        const entry = controllerRef.current;
        controllerRef.current = null;
        if (entry) {
          entry.controller.removeListener?.("playback_update");
          entry.controller.removeListener?.("playback_started");
          entry.controller.removeListener?.("ready");
          entry.controller.destroy?.();
        }
        setFallback(true);
        setEmbedError("Playback status is unavailable. The standard Spotify player is still available below.");
      }
    });

    return undefined;
  }, [embed]);

  if (!embed) {
    return <p className="micro-copy">Paste a Spotify playlist link to browse and choose a song in Spotify's player.</p>;
  }

  const isPlaylistEmbed = embed.includes("/embed/playlist/");
  const embedHeight = isPlaylistEmbed ? 352 : 152;

  return (
    <div className="spotify-embed">
      {fallback
        ? <iframe title={isPlaylistEmbed ? "Spotify playlist player" : "Spotify player"} src={embed} width="100%" height={embedHeight} frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
        : <div ref={hostRef} className={"spotify-embed-host" + (isPlaylistEmbed ? " is-playlist" : "")} />}
      {embedError && <p className="spotify-embed-note" role="status">{embedError}</p>}
      {!fallback && !controllerReady && !embedError && <p className="spotify-embed-note" role="status">Connecting to Spotify...</p>}
    </div>
  );
}
