// Wraps the <video> element the ZXing reader attaches its stream to.
export default function CameraView({ videoRef, active }) {
  return (
    <div className="scanner-camera-frame">
      <video
        ref={videoRef}
        className="scanner-video"
        muted
        playsInline
        autoPlay
      />
      {!active && <div className="scanner-camera-placeholder" />}
    </div>
  );
}
