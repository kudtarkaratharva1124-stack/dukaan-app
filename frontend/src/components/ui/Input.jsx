import { forwardRef } from "react";
import clsx from "clsx";

const Input = forwardRef(function Input(
  { label, error, icon: Icon, className, wrapperClassName, ...rest },
  ref
) {
  return (
    <div className={clsx("input-wrapper", wrapperClassName)}>
      {label && <label className="input-label">{label}</label>}
      <div className={clsx("input-field", { "input-error": error })}>
        {Icon && <Icon size={16} className="input-icon" />}
        <input ref={ref} className={clsx("input", className)} {...rest} />
      </div>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
});

export default Input;
