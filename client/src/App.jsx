import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Home as HomeIcon, KeyRound, SearchCheck, Bike, Wrench, Siren, ShieldAlert, MapPinned, LogOut } from "lucide-react";
import { useStore } from "./store.jsx";
import Home from "./pages/Home.jsx";
import Rooms from "./pages/Rooms.jsx";
import LostFound from "./pages/LostFound.jsx";
import Rentals from "./pages/Rentals.jsx";
import Services from "./pages/Services.jsx";
import Alerts from "./pages/Alerts.jsx";
import Admin from "./pages/Admin.jsx";
import Auth from "./pages/Auth.jsx";

const NAV = [
  { to: "/", label: "Nearby", icon: HomeIcon, end: true },
  { to: "/rooms", label: "Rooms", icon: KeyRound },
  { to: "/lost-found", label: "Lost & found", icon: SearchCheck },
  { to: "/rentals", label: "Rentals", icon: Bike },
  { to: "/services", label: "Services", icon: Wrench },
  { to: "/alerts", label: "Alerts", icon: Siren },
  { to: "/admin", label: "Safety desk", icon: ShieldAlert, admin: true },
];

export default function App() {
  const { radius, setRadius, user, logout } = useStore();
  const { pathname } = useLocation();
  const section = pathname.split("/")[1] || "home";

  if (!user) {
    return (
      <Routes>
        <Route path="/signup" element={<Auth mode="signup" />} />
        <Route path="*" element={<Auth mode="login" />} />
      </Routes>
    );
  }

  const isAdmin = user.role === "admin";
  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <span className="brand-mark"><MapPinned size={22} /></span>
          <div>
            <strong>Local Connect</strong>
            <small>Your area, in one app</small>
          </div>
        </div>
        <nav>
          {NAV.filter((n) => !n.admin || isAdmin).map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "navlink on" : "navlink")}>
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="me">
          <span className="avatar" aria-hidden="true">{initials}</span>
          <div className="me-text">
            <strong>{user.name}{isAdmin && <em className="role">Admin</em>}</strong>
            <small>{user.area || user.email}</small>
          </div>
          <button className="icon-btn" onClick={logout} aria-label="Log out" title="Log out"><LogOut size={18} /></button>
        </div>
        <div className="radius">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label htmlFor="radius" style={{ fontSize: "0.85rem", fontWeight: "600" }}>Distance radius</label>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="number"
                min="0.5"
                max="100"
                step="0.5"
                value={radius}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0.1) setRadius(Math.min(100, Math.max(0.5, val)));
                }}
                style={{
                  width: "55px",
                  padding: "2px 6px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  textAlign: "right",
                  background: "var(--bg)",
                  color: "var(--fg)",
                }}
                aria-label="Distance radius in kilometers"
              />
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>km</span>
            </div>
          </div>
          <input
            id="radius"
            type="range"
            min="0.5"
            max="100"
            step="0.5"
            value={radius}
            onChange={(e) => setRadius(parseFloat(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
            {[1, 5, 10, 25, 50, 100].map((preset) => (
              <button
                key={preset}
                type="button"
                className={`chip ${radius === preset ? "on" : ""}`}
                style={{ fontSize: "0.72rem", padding: "2px 6px", cursor: "pointer" }}
                onClick={() => setRadius(preset)}
              >
                {preset}km
              </button>
            ))}
          </div>
        </div>
      </aside>
      <main className="main" data-section={section}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/lost-found" element={<LostFound />} />
          <Route path="/rentals" element={<Rentals />} />
          <Route path="/services" element={<Services />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/admin" element={isAdmin ? <Admin /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
