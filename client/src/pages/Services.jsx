import { useState } from "react";
import { Star } from "lucide-react";
import { Empty, PageHead } from "../components/ui.jsx";
import { useResource, useStore } from "../store.jsx";

const TRADES = ["All", "Electrician", "Mechanic", "Plumber", "Notes"];

export default function Services() {
  const { radius, notify } = useStore();
  const [services] = useResource("services");
  const [trade, setTrade] = useState("All");
  const [q, setQ] = useState("");

  const list = services.filter(
    (s) => s.km <= radius && (trade === "All" || s.trade === trade) && s.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <PageHead title="Local services" sub="Electricians, mechanics, plumbers and study notes from people in your area." />
      <input className="search" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search services" />
      <div className="chips big">
        {TRADES.map((t) => (
          <button key={t} className={`chip ${trade === t ? "on" : ""}`} onClick={() => setTrade(t)}>{t}</button>
        ))}
      </div>
      <div className="list">
        {list.length === 0 && <Empty text="No matches. Try another trade or widen the radius." />}
        {list.map((s) => (
          <article key={s.id} className="card">
            <div className="card-top">
              <h3>{s.name}</h3>
              <strong className="price">{s.price}</strong>
            </div>
            <p className="meta">
              {s.trade} · {s.km} km away · <Star size={13} className="star" /> {s.rating} ({s.jobs} {s.trade === "Notes" ? "buyers" : "jobs"})
            </p>
            <div className="card-actions">
              {s.available ? (
                <button className="btn" onClick={() => notify(`${s.trade === "Notes" ? "Request" : "Booking request"} sent to ${s.name}.`)}>
                  {s.trade === "Notes" ? "Get notes" : "Book"}
                </button>
              ) : (
                <span className="status bad">Busy today</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
