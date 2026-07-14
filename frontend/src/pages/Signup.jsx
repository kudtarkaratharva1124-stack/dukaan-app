import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store, User, Mail, Phone, Lock } from "lucide-react";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { notify } from "../components/ui/Toast.jsx";
import "../styles/auth.css";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ shopName: "", name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await signup(form);
      notify.success("Shop created! Welcome to DukaanPro.");
      navigate("/dashboard");
    } catch (err) {
      notify.error(err.response?.data?.message || "Signup failed");
      setError(err.response?.data?.message || "");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-logo">
          <span className="sidebar-logo-mark">D</span>
          <span>DukaanPro</span>
        </div>
        <h1 className="auth-title">Set up your shop</h1>
        <p className="auth-subtitle text-muted">Takes less than a minute — no demo data, straight to your real inventory.</p>

        <Input label="Shop name" icon={Store} placeholder="Sharma Krishi Kendra" value={form.shopName} onChange={handleChange("shopName")} />
        <Input label="Your name" icon={User} placeholder="Ramesh Sharma" value={form.name} onChange={handleChange("name")} />
        <Input label="Email" type="email" icon={Mail} placeholder="you@shop.com" value={form.email} onChange={handleChange("email")} />
        <Input label="Phone (optional)" icon={Phone} placeholder="98765 43210" value={form.phone} onChange={handleChange("phone")} />
        <Input label="Password" type="password" icon={Lock} placeholder="At least 6 characters" value={form.password} onChange={handleChange("password")} />
        {error && <p className="auth-error">{error}</p>}

        <Button type="submit" loading={loading} className="auth-submit">Create shop account</Button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
