import { Music2, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import favoriteTracks from "../lib/localMusicPlaylist.js";
import VinylPlayer from "./VinylPlayer.jsx";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return minutes + ":" + remainder;
}

export default function SoundtrackPanel() {
  const audioRef = useRef(null);
  const loadedTrackIndexRef = useRef(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState("");
  const currentTrack = favoriteTracks[trackIndex];
  const currentTitle =
    currentTrack.title.trim() || `Track ${String(trackIndex + 1).padStart(2, "0")}`;
  const currentArtist =
    currentTrack.artist.trim() || "Add artist details in playlist config";

  const reportPlaybackError = useCallback(() => {
    setIsPlaying(false);
    setAudioError(
      "Could not play this MP3. Check that the selected file exists under public/music/.",
    );
  }, []);

  const requestPlayback = useCallback(
    (audio) => {
      const request = audio.play();
      if (request && typeof request.catch === "function") {
        request.catch((error) => {
          if (error?.name !== "AbortError") reportPlaybackError();
        });
      }
    },
    [reportPlaybackError],
  );

  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  const loadTrack = (index) => {
    const audio = audioRef.current;
    const track = favoriteTracks[index];
    if (!audio || !track?.src.trim()) return null;
    if (loadedTrackIndexRef.current !== index) {
      audio.pause();
      audio.src = track.src;
      audio.load();
      loadedTrackIndexRef.current = index;
    }
    return audio;
  };

  const playTrack = (index) => {
    const track = favoriteTracks[index];
    const audio = audioRef.current;
    if (!track || !audio) return;
    audio.pause();
    setTrackIndex(index);
    setIsPlaying(false);
    setAudioError("");
    setCurrentTime(0);
    setDuration(0);
    if (!track.src.trim()) {
      loadedTrackIndexRef.current = null;
      setAudioError(
        "This track has no MP3 configured. Add its file under public/music/ and set its src in localMusicPlaylist.js.",
      );
      return;
    }

    const loadedAudio = loadTrack(index);
    if (!loadedAudio) return;
    loadedAudio.currentTime = 0;
    requestPlayback(loadedAudio);
  };

  const togglePlayback = () => {
    const audio = loadTrack(trackIndex);
    if (!audio) {
      setIsPlaying(false);
      setAudioError(
        "This track has no MP3 configured. Add its file under public/music/ and set its src in localMusicPlaylist.js.",
      );
      return;
    }
    setAudioError("");
    if (audio.paused) {
      if (audio.ended) audio.currentTime = 0;
      requestPlayback(audio);
    } else {
      audio.pause();
    }
  };

  const seek = (event) => {
    const audio = audioRef.current;
    const time = Number(event.target.value);
    if (!audio || !Number.isFinite(time)) return;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  return (
    <section className="soundtrack-panel" aria-labelledby="soundtrack-title">
      <div className="soundtrack-heading">
        <div>
          <div className="section-kicker">01 / SOUNDTRACK</div>
          <h2 id="soundtrack-title" className="panel-title">
            Set the mood<span>♪</span>
          </h2>
        </div>
        <div className="music-card local-music-card">
          <VinylPlayer isPlaying={isPlaying} />
          <div className="track-info">
            <span className="tiny-label">
              {isPlaying ? "NOW PLAYING" : "SELECTED TRACK"}
            </span>
            <strong>{currentTitle}</strong>
            <small>{currentArtist}</small>
          </div>
          <Music2 size={18} className="soundtrack-mark" />
        </div>
      </div>
      <div className="local-player-controls">
        <div className="local-player-transport">
          <button
            type="button"
            className="local-player-skip"
            onClick={() =>
              playTrack(
                (trackIndex - 1 + favoriteTracks.length) %
                  favoriteTracks.length,
              )
            }
            aria-label="Previous track"
          >
            <SkipBack size={18} />
          </button>
          <button
            type="button"
            className="local-player-play"
            onClick={togglePlayback}
            aria-label={isPlaying ? "Pause" : "Play"}
            aria-pressed={isPlaying}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            type="button"
            className="local-player-skip"
            onClick={() => playTrack((trackIndex + 1) % favoriteTracks.length)}
            aria-label="Next track"
          >
            <SkipForward size={18} />
          </button>
        </div>
        <div className="local-player-progress">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={Math.max(duration, 1)}
            step="1"
            value={Math.min(currentTime, duration || 0)}
            onChange={seek}
            aria-label="Track progress"
            disabled={!duration}
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      {audioError && (
        <p className="error-message local-player-error" role="alert">
          {audioError}
        </p>
      )}
      <ol
        className="local-track-list"
        aria-label="Favorite tracks"
        tabIndex={0}
      >
        {favoriteTracks.map((track, index) => (
          <li key={index}>
            <button
              type="button"
              className={
                "local-track-option" +
                (index === trackIndex ? " is-selected" : "")
              }
              onClick={() => playTrack(index)}
              aria-pressed={index === trackIndex}
            >
              <span className="local-track-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="local-track-copy">
                <strong>
                  {track.title.trim() ||
                    `Track ${String(index + 1).padStart(2, "0")}`}
                </strong>
                <small>
                  {track.artist.trim() || "Add artist details in playlist config"}
                </small>
              </span>
              <span className="local-track-state" aria-hidden="true">
                {index === trackIndex
                  ? isPlaying
                    ? "PLAYING"
                    : "SELECTED"
                  : <Play size={14} />}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => {
          setIsPlaying(true);
          setAudioError("");
        }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onLoadedMetadata={(event) =>
          setDuration(Number.isFinite(event.currentTarget.duration)
            ? event.currentTarget.duration
            : 0)
        }
        onDurationChange={(event) =>
          setDuration(Number.isFinite(event.currentTarget.duration)
            ? event.currentTarget.duration
            : 0)
        }
        onEnded={() => playTrack((trackIndex + 1) % favoriteTracks.length)}
        onError={reportPlaybackError}
      />
    </section>
  );
}
