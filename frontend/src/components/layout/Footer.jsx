export default function Footer() {
  return (
    <footer className="app-footer text-muted">
      <span>© {new Date().getFullYear()} DukaanPro. All rights reserved.</span>
      <span className="app-footer-version">v2.0.0</span>
    </footer>
  );
}
