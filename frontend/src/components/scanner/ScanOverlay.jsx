// Visual targeting reticle + scan-line animation drawn over the live camera feed.
export default function ScanOverlay({ status }) {
  return (
    <div className="scan-overlay" aria-hidden="true">
      <div className={`scan-frame scan-frame-${status}`}>
        <span className="scan-corner scan-corner-tl" />
        <span className="scan-corner scan-corner-tr" />
        <span className="scan-corner scan-corner-bl" />
        <span className="scan-corner scan-corner-br" />
        {status === "scanning" && <div className="scan-line" />}
      </div>
    </div>
  );
}
