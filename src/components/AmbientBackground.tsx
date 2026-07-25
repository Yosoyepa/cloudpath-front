export function AmbientBackground() {
  return (
    <div className="ambient-background" aria-hidden="true">
      <div className="ambient-background__glow" />
      <div className="ambient-background__grid" />
      <div className="ambient-background__particles" />
      <video autoPlay loop muted playsInline preload="metadata" tabIndex={-1}>
        <source src="/media/bg-mission-control.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
