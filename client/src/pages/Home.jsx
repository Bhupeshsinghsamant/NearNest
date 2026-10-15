import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, SearchCheck, Bike, Wrench, Siren } from "lucide-react";
import MapView, { KIND_COLOR } from "../components/MapView.jsx";
import { ago } from "../components/ui.jsx";
import { useResource, useStore } from "../store.jsx";

export default function Home() {
  const { radius, user } = useStore();
  const [rooms] = useResource("rooms");
  const [lf] = useResource("lostfound");
  const [rentals] = useResource("rentals");
  const [services] = useResource("services");
  const [alerts] = useResource("alerts");
  const [sel, setSel] = useState(null);

  const pins = [
    ...rooms.map((r) => ({ ...r, kind: "rooms", label: r.title })),
    ...lf.map((r) => ({ ...r, kind: "lostfound", label: `${r.kind === "found" ? "Found" : "Lost"}: ${r.title}` })),
    ...rentals.map((r) => ({ ...r, kind: "rentals", label: r.name })),
    ...services.map((r) => ({ ...r, kind: "services", label: r.name })),
    ...alerts.map((r) => ({ ...r, kind: "alerts", label: r.title })),
  ];
  const near = (list) => list.filter((x) => x.km <= radius).length;
  const tiles = [
    { to: "/rooms", label: "Rooms for rent", n: near(rooms), icon: KeyRound, kind: "rooms" },
    { to: "/lost-found", label: "Lost & found", n: near(lf), icon: SearchCheck, kind: "lostfound" },
    { to: "/rentals", label: "Scooty, bike, car", n: near(rentals), icon: Bike, kind: "rentals" },
    { to: "/services", label: "Local services", n: near(services), icon: Wrench, kind: "services" },
  ];
  const liveAlerts = alerts.filter((a) => a.km <= radius).slice(0, 2);

  return (
    <>
      <section className="hero">
        <div>
          <p className="greet">Hi, {user.name.split(" ")[0]}</p>
          <h1>Everything around you, in one place</h1>
          <p className="sub">Rooms, lost items, rides, helpers and alerts, all within walking distance.</p>
        </div>
        <div className="quick">
          <Link className="btn alert" to="/alerts"><Siren size={16} /> Urgent alert</Link>
          <Link className="btn" to="/rooms">List a room</Link>
          <Link className="btn" to="/lost-found">Post a found item</Link>
        </div>
      </section>
      {liveAlerts.length > 0 && (
        <Link to="/alerts" className="banner">
          <Siren size={20} />
          <div>
            <strong>{liveAlerts.length} urgent {liveAlerts.length === 1 ? "alert" : "alerts"} nearby</strong>
            <span>{liveAlerts[0].title}</span>
          </div>
          <em>{ago(liveAlerts[0].minsAgo)}</em>
        </Link>
      )}
      <div className="home-grid">
        <section>
          <MapView pins={pins} radius={radius} selected={sel && `${sel.kind}-${sel.id}`} onSelect={setSel} height={430} />
          <p className="map-caption">
            {sel ? <><b>{sel.label}</b> · {sel.km} km away</> : "Tap a pin to see what it is. Change the radius from the sidebar."}
          </p>
        </section>
        <section className="tiles">
          {tiles.map(({ to, label, n, icon: Icon, kind }) => (
            <Link key={to} to={to} className="tile">
              <span className="tile-ic" style={{ background: KIND_COLOR[kind] }}><Icon size={18} /></span>
              <span className="tile-n">{n}</span>
              <span className="tile-l">{label}</span>
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
