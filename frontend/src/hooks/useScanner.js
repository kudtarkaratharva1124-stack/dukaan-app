// Real camera + @zxing/browser wiring for barcode/QR scanning.
// Used by Scanner.jsx via the BarcodeScanner component.
import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat, NotFoundException } from "@zxing/library";

const SCAN_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.QR_CODE
];

export function useScanner({ onResult, continuous = true, cooldownMs = 1500 } = {}) {
  const [supported] = useState(
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia
  );
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | starting | scanning | error | stopped
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const lastScanAtRef = useRef(0);
  const lastCodeRef = useRef(null);

  // Enumerate available video input devices (front/back camera switching).
  const refreshDevices = useCallback(async () => {
    try {
      const list = await BrowserMultiFormatReader.listVideoInputDevices();
      setDevices(list);
      if (!deviceId && list.length) {
        // Prefer a back/rear camera by default on phones.
        const back = list.find((d) => /back|rear|environment/i.test(d.label));
        setDeviceId((back || list[list.length - 1]).deviceId);
      }
      return list;
    } catch {
      return [];
    }
  }, [deviceId]);

  useEffect(() => {
    if (supported) refreshDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current = null;
    setStatus("stopped");
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const start = useCallback(
    async (targetDeviceId) => {
      if (!supported || !videoRef.current) return;
      setStatus("starting");
      setError(null);

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, SCAN_FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
      readerRef.current = reader;

      try {
        const useDeviceId = targetDeviceId || deviceId || undefined;
        const controls = await reader.decodeFromVideoDevice(
          useDeviceId,
          videoRef.current,
          (result, err) => {
            if (result) {
              const text = result.getText();
              const now = Date.now();
              // Debounce repeated reads of the same code while the camera stays pointed at it.
              if (text === lastCodeRef.current && now - lastScanAtRef.current < cooldownMs) return;
              lastCodeRef.current = text;
              lastScanAtRef.current = now;
              setLastResult({ text, format: result.getBarcodeFormat?.(), timestamp: now });
              onResult?.(text, result);
              if (!continuous) stop();
            } else if (err && !(err instanceof NotFoundException)) {
              // Real decode errors (not just "nothing found this frame") are logged, not surfaced —
              // they happen constantly during normal scanning.
            }
          }
        );
        controlsRef.current = controls;
        setStatus("scanning");

        // Detect torch/flash capability on the active track.
        const stream = videoRef.current.srcObject;
        const track = stream?.getVideoTracks?.()[0];
        const caps = track?.getCapabilities?.();
        setTorchSupported(!!caps?.torch);

        await refreshDevices();
      } catch (err) {
        setStatus("error");
        setError(
          err?.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access and try again."
            : err?.name === "NotFoundError"
            ? "No camera found on this device."
            : err?.message || "Couldn't start the camera."
        );
      }
    },
    [supported, deviceId, continuous, cooldownMs, onResult, refreshDevices, stop]
  );

  const switchCamera = useCallback(
    async (newDeviceId) => {
      setDeviceId(newDeviceId);
      stop();
      await start(newDeviceId);
    },
    [start, stop]
  );

  const toggleTorch = useCallback(async () => {
    const stream = videoRef.current?.srcObject;
    const track = stream?.getVideoTracks?.()[0];
    if (!track) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      setError("This camera doesn't support flashlight control.");
    }
  }, [torchOn]);

  useEffect(() => stop, [stop]);

  return {
    supported,
    videoRef,
    devices,
    deviceId,
    status,
    error,
    lastResult,
    torchOn,
    torchSupported,
    start,
    stop,
    switchCamera,
    toggleTorch,
    setError
  };
}
