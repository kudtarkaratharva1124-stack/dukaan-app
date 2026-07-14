import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CameraOff } from "lucide-react";
import CameraView from "./CameraView.jsx";
import ScanOverlay from "./ScanOverlay.jsx";
import FlashButton from "./FlashButton.jsx";
import CameraSelector from "./CameraSelector.jsx";
import Button from "../ui/Button.jsx";
import { useScanner } from "../../hooks/useScanner.js";

// Beep played on every successful decode (kept tiny + inline so no asset file is required).
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Audio isn't critical to scanning — ignore if the browser blocks autoplay.
  }
}

export default function BarcodeScanner({ onDetected, autoStart = true, continuous = true }) {
  const [history, setHistory] = useState([]);
  const startedRef = useRef(false);

  const handleResult = (text, result) => {
    playBeep();
    setHistory((h) => [{ text, format: result?.getBarcodeFormat?.() ?? null, at: Date.now() }, ...h].slice(0, 10));
    onDetected?.(text, result);
  };

  const {
    supported,
    videoRef,
    devices,
    deviceId,
    status,
    error,
    torchOn,
    torchSupported,
    start,
    stop,
    switchCamera,
    toggleTorch
  } = useScanner({ onResult: handleResult, continuous });

  useEffect(() => {
    if (!supported || !autoStart || startedRef.current) return;
    startedRef.current = true;
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, autoStart]);

  if (!supported) {
    return (
      <div className="scanner-unsupported">
        <CameraOff size={32} />
        <p>This browser or device doesn't support camera access.</p>
        <p className="text-muted">Try Chrome or Safari on a phone, or enter the barcode manually below.</p>
      </div>
    );
  }

  return (
    <div className="scanner-wrap">
      <div className="scanner-viewport">
        <CameraView videoRef={videoRef} active={status === "scanning"} />
        <ScanOverlay status={status} />

        <div className="scanner-controls-top">
          <CameraSelector devices={devices} deviceId={deviceId} onSwitch={switchCamera} />
          <FlashButton supported={torchSupported} on={torchOn} onToggle={toggleTorch} />
        </div>

        {status === "starting" && (
          <div className="scanner-status-banner">Starting camera…</div>
        )}
        {status === "error" && (
          <div className="scanner-status-banner scanner-status-error">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {status === "error" && (
        <Button variant="secondary" onClick={() => start()} className="scanner-retry-btn">
          Retry camera
        </Button>
      )}

      {history.length > 0 && (
        <div className="scanner-history">
          <div className="scanner-history-title">Recent scans</div>
          <ul>
            {history.map((h, i) => (
              <li key={h.at + i}>
                <span className="scanner-history-code">{h.text}</span>
                <span className="text-muted">{new Date(h.at).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
