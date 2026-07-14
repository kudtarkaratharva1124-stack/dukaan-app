import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { notify } from "../components/ui/Toast.jsx";
import "../styles/auth.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!form.email || !form.password) {
      setErrors({ form: "Enter your email and password" });
      return;
    }
    setLoading(true);
    try {
      await login(form);
      notify.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      notify.error(err.response?.data?.message || "Login failed");
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
        <h1 className="auth-title">Log in to your shop</h1>
        <p className="auth-subtitle text-muted">Manage inventory, billing and khata in one place.</p>

        <Input label="Email" type="email" icon={Mail} placeholder="you@shop.com" value={form.email} onChange={handleChange("email")} />
        <Input label="Password" type="password" icon={Lock} placeholder="••••••••" value={form.password} onChange={handleChange("password")} />
        {errors.form && <p className="auth-error">{errors.form}</p>}

        <Button type="submit" loading={loading} className="auth-submit">Log in</Button>

        <p className="auth-switch">
          New to DukaanPro? <Link to="/signup">Create a shop account</Link>
        </p>
      </form>
    </div>
  );
}
