export default function Loader({ size = 24, fullscreen = false, label }) {
  const spinner = (
    <div className="loader" style={{ width: size, height: size }}>
      <span />
    </div>
  );

  if (fullscreen) {
    return (
      <div className="loader-fullscreen">
        {spinner}
        {label && <p className="text-muted">{label}</p>}
      </div>
    );
  }

  return spinner;
}
