import clsx from "clsx";

const TONES = {
  default: "badge-default",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  info: "badge-info"
};

export default function Badge({ children, tone = "default" }) {
  return <span className={clsx("badge", TONES[tone])}>{children}</span>;
}
