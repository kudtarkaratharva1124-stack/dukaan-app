import { SwitchCamera } from "lucide-react";

export default function CameraSelector({ devices, deviceId, onSwitch }) {
  if (!devices || devices.length < 2) return null;

  const handleClick = () => {
    const idx = devices.findIndex((d) => d.deviceId === deviceId);
    const next = devices[(idx + 1) % devices.length];
    onSwitch(next.deviceId);
  };

  return (
    <button
      type="button"
      className="scanner-icon-btn"
      onClick={handleClick}
      aria-label="Switch camera"
      title="Switch camera"
    >
      <SwitchCamera size={18} />
    </button>
  );
}
