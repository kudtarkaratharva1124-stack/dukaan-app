import clsx from "clsx";

export default function Card({ title, actions, children, className, padded = true }) {
  return (
    <div className={clsx("card", className)}>
      {(title || actions) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className={padded ? "card-body" : ""}>{children}</div>
    </div>
  );
}
