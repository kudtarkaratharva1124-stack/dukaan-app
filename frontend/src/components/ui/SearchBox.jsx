import { Search, X } from "lucide-react";

export default function SearchBox({ value, onChange, placeholder = "Search...", onClear }) {
  return (
    <div className="searchbox">
      <Search size={16} />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
      />
      {value && (
        <button
          className="searchbox-clear"
          onClick={() => (onClear ? onClear() : onChange?.(""))}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
