import vinylRecord from "../assets/vinyl-record.png";

export default function VinylPlayer({ isPlaying = false }) {
  const stateLabel = isPlaying ? "rotating while music is playing" : "stationary while music is paused";
  return (
    <span className={"vinyl-player " + (isPlaying ? "is-playing" : "")} role="img" aria-label={"Vinyl record " + stateLabel}>
      <img className="vinyl-player-image" src={vinylRecord} alt="" aria-hidden="true" draggable="false" />
    </span>
  );
}
