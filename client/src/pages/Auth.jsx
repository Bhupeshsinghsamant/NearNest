import { useState } from "react";
import { Link } from "react-router-dom";
import { Bike, Eye, EyeOff, KeyRound, MapPinned, SearchCheck, Siren, Wrench } from "lucide-react";
import { useStore } from "../store.jsx";
import { ADMIN_DEMO, DEMO } from "../api.js";
import { Field } from "../components/ui.jsx";

const POINTS = [
  { icon: KeyRound, text: "Find a room from owners who actually reply" },
  { icon: SearchCheck, text: "Get your lost things back, or return what you found" },
  { icon: Bike, text: "Rent a scooty, bike or car from someone nearby" },
  { icon: Wrench, text: "Book an electrician or mechanic you can trust" },
  { icon: Siren, text: "Call for help from neighbours when it's urgent" },
];

export default function Auth({ mode }) {
  const isSignup = mode === "signup";
  const { login, signup } = useStore();
  const [form, setForm] = useState({ name: "", email: "", area: "", password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    if (isSignup && form.name.trim().length < 2) return "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter a valid email address.";
    if (isSignup && !form.area.trim()) return "Tell us your area so we can show things nearby.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    if (isSignup && form.password !== form.confirm) return "Passwords don't match.";
    return "";
  };

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) return setError(problem);
    const email = form.email.trim().toLowerCase();
    run(() =>
      isSignup
        ? signup({ name: form.name.trim(), email, area: form.area.trim(), password: form.password })
        : login({ email, password: form.password })
    );
  };

  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="brand">
          <span className="brand-mark"><MapPinned size={22} /></span>
          <div>
            <strong>Local Connect</strong>
            <small>Your area, in one app</small>
          </div>
        </div>
        <h1>Everything around you, one login away</h1>
        <ul className="auth-points">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text}><Icon size={18} /><span>{text}</span></li>
          ))}
        </ul>
      </aside>

      <main className="auth-main">
        <form className="auth-card" onSubmit={submit} noValidate>
          <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
          <p className="sub">{isSignup ? "It takes less than a minute." : "Log in to see what's happening near you."}</p>

          {isSignup && (
            <Field label="Full name">
              <input value={form.name} onChange={set("name")} autoComplete="name" placeholder="Lavish Bhatt" />
            </Field>
          )}
          <Field label="Email">
            <input type="email" value={form.email} onChange={set("email")} autoComplete="email" placeholder="you@example.com" />
          </Field>
          {isSignup && (
            <Field label="Your area">
              <input value={form.area} onChange={set("area")} placeholder="Locality or colony" />
            </Field>
          )}
          <Field label="Password">
            <div className="pw">
              <input type={show ? "text" : "password"} value={form.password} onChange={set("password")} autoComplete={isSignup ? "new-password" : "current-password"} placeholder="At least 6 characters" />
              <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          {isSignup && (
            <Field label="Confirm password">
              <input type={show ? "text" : "password"} value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
            </Field>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="btn primary wide" type="submit" disabled={busy}>
            {busy ? "Please wait..." : isSignup ? "Create account" : "Log in"}
          </button>
          {!isSignup && (
            <button className="btn wide" type="button" disabled={busy} onClick={() => run(() => login(DEMO))}>
              Try the demo account
            </button>
          )}
          {!isSignup && (
            <button className="btn wide" type="button" disabled={busy} onClick={() => run(() => login(ADMIN_DEMO))}>
              Try the admin account
            </button>
          )}

          <p className="switch">
            {isSignup ? "Already have an account? " : "New here? "}
            <Link to={isSignup ? "/login" : "/signup"}>{isSignup ? "Log in" : "Create an account"}</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
