import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={{ padding: "80px 24px", textAlign: "center" }}>
      <h1 style={{ fontSize: 48, marginBottom: 8 }}>404</h1>
      <p className="text-muted" style={{ marginBottom: 24 }}>That page doesn't exist.</p>
      <Link to="/dashboard">Back to dashboard</Link>
    </div>
  );
}
