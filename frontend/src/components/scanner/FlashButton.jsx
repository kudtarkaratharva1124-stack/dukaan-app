import { Zap, ZapOff } from "lucide-react";

export default function FlashButton({ supported, on, onToggle }) {
  if (!supported) return null;
  return (
    <button
      type="button"
      className={`scanner-icon-btn${on ? " active" : ""}`}
      onClick={onToggle}
      aria-label={on ? "Turn off flashlight" : "Turn on flashlight"}
      title={on ? "Turn off flashlight" : "Turn on flashlight"}
    >
      {on ? <Zap size={18} /> : <ZapOff size={18} />}
    </button>
  );
}
