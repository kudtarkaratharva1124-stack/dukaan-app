export default function Header({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-header-title">{title}</h1>
        {subtitle && <p className="page-header-subtitle text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}
