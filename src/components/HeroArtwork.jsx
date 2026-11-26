import cameraFrame from "../assets/camera-frame.png";
import vinylRecord from "../assets/vinyl-record.png";

export default function HeroArtwork() {
  return (
    <div className="hero-artwork" role="img" aria-label="Retro digital camera in front of a vinyl record">
      <img className="hero-artwork-vinyl" src={vinylRecord} alt="" aria-hidden="true" draggable="false" />
      <span className="hero-artwork-lcd">thePhoto's</span>
      <img className="hero-artwork-camera" src={cameraFrame} alt="" aria-hidden="true" draggable="false" />
    </div>
  );
}
