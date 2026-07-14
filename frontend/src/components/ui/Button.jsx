import clsx from "clsx";

const VARIANTS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
  ghost: "btn-ghost"
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon,
  onClick,
  type = "button",
  className,
  ...rest
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx("btn", VARIANTS[variant], `btn-${size}`, className)}
      {...rest}
    >
      {loading ? <span className="btn-spinner" /> : Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}
