import vinylRecord from "../assets/vinyl-record.png";

export default function DevelopingOverlay({ isExporting = false }) {
  return (
    <div className="developing-overlay" role="status" aria-live="polite">
      <div className="developing-card">
        <img className="developing-disc" src={vinylRecord} alt="" aria-hidden="true" />
        <span className="section-kicker">THE LITTLE PHOTO LAB</span>
        <h2>
          {isExporting ? "Preparing your" : "Developing your"}
          <br />
          <em>{isExporting ? "photo strip..." : "memories..."}</em>
        </h2>
        <p>
          {isExporting
            ? "Finishing your keepsake at print quality."
            : "Good things take a little time."}
        </p>
        <div className="developing-track">
          <i />
        </div>
        <span className="developing-foot">
          {isExporting ? "PREPARING YOUR PNG" : "PLEASE DON'T CLOSE THIS WINDOW"}
        </span>
      </div>
    </div>
  );
}