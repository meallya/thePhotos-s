export default function PhotoStripPreview({ src, loading, orientation = "vertical" }) {
  return (
    <div className={"photo-strip-preview " + (orientation === "horizontal" ? "is-horizontal" : "is-vertical")} aria-busy={loading}>
      {src ? <img src={src} alt="thePhoto's photobooth strip preview" /> : (
        <div className="photo-strip-loading" role="status">
          {loading ? "Preparing your strip..." : "Your strip will appear here."}
        </div>
      )}
    </div>
  );
}
