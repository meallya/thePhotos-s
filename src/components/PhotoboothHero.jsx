import HeroArtwork from "./HeroArtwork.jsx";

export default function PhotoboothHero() {
  return (
    <section className="photobooth-hero" aria-labelledby="photobooth-title">
      <div className="hero-copy">
        <p className="eyebrow">YOUR VERY OWN LITTLE PHOTO STUDIO</p>
        <h1 id="photobooth-title">
          Four moments.
          <br />
          <em>One little keepsake.</em>
        </h1>
        <p className="intro">
          Set the mood, find your light, and let the camera roll.
        </p>
      </div>
      <HeroArtwork />
    </section>
  );
}
