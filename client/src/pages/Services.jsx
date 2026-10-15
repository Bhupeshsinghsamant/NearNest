import { useState } from "react";
import { Star, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Empty, Field, Modal, PageHead } from "../components/ui.jsx";
import { useResource, useStore } from "../store.jsx";
import { post, del } from "../api.js";

const TRADES = ["All", "Electrician", "Mechanic", "Plumber", "Notes", "Other"];

export default function Services() {
  const { radius, notify, user } = useStore();
  const [services, setServices] = useResource("services");
  const [trade, setTrade] = useState("All");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  const list = services.filter(
    (s) =>
      (s.km == null || s.km <= radius) &&
      (trade === "All" || s.trade === trade) &&
      (s.name || "").toLowerCase().includes(q.toLowerCase())
  );

  const addService = async (form) => {
    try {
      const item = await post("services", {
        name: form.name,
        trade: form.trade,
        price: form.price,
        locality: form.locality || user?.area || "Local Area",
        available: true,
      });
      setServices((prev) => [item, ...prev]);
      setAdding(false);
      notify("Service listed successfully. Visible to locals nearby.");
    } catch (err) {
      notify(err.message || "Failed to list service.");
    }
  };

  const deleteService = async (id) => {
    if (!window.confirm("Are you sure you want to remove this service?")) return;
    try {
      await del("services", id);
      setServices((prev) => prev.filter((s) => (s.id || s._id) !== id));
      notify("Service removed from database.");
    } catch (err) {
      notify(err.message || "Failed to remove service.");
    }
  };

  const handleBook = async (s) => {
    try {
      await post("requests", {
        listingId: s.id || s._id,
        message: `Booking inquiry for ${s.name} (${s.trade}).`,
      });
      notify(`${s.trade === "Notes" ? "Request" : "Booking request"} sent to ${s.name}.`);
    } catch (err) {
      notify(err.message || "Failed to send booking request.");
    }
  };

  return (
    <>
      <PageHead
        title="Local services"
        sub="Electricians, mechanics, plumbers, tutors, and study notes from verified locals."
        action={<button className="btn primary" onClick={() => setAdding(true)}><Plus size={16} /> Offer a service</button>}
      />
      <input className="search" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search services" />
      <div className="chips big">
        {TRADES.map((t) => (
          <button key={t} className={`chip ${trade === t ? "on" : ""}`} onClick={() => setTrade(t)}>{t}</button>
        ))}
      </div>
      <div className="list">
        {list.length === 0 && <Empty text="No matches. Try another trade, widen the radius, or offer your own service!" />}
        {list.map((s) => {
          const sId = s.id || s._id;
          const isOwner = user && (s.ownerId === user.id || s.owner === user.name);
          return (
            <article key={sId} className="card">
              <div className="card-top">
                <h3>{s.name}</h3>
                <strong className="price">{s.price}</strong>
              </div>
              <p className="meta">
                {s.trade} {s.km != null ? `· ${s.km} km away` : ""} · <Star size={13} className="star" /> {s.rating || 5.0} ({s.jobs || 0} {s.trade === "Notes" ? "buyers" : "jobs"})
              </p>
              <div className="card-actions">
                {isOwner ? (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span className="status ok"><CheckCircle2 size={13} style={{ marginRight: 4 }} /> Your service</span>
                    <button className="btn" style={{ borderColor: "#ef4444", color: "#ef4444" }} onClick={() => deleteService(sId)}>
                      <Trash2 size={13} style={{ marginRight: 4 }} /> Delete
                    </button>
                  </div>
                ) : s.available ? (
                  <button className="btn" onClick={() => handleBook(s)}>
                    {s.trade === "Notes" ? "Get notes" : "Book"}
                  </button>
                ) : (
                  <span className="status bad">Busy today</span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {adding && (
        <AddService
          onClose={() => setAdding(false)}
          onSave={addService}
          defaultLocality={user?.area}
        />
      )}
    </>
  );
}

function AddService({ onClose, onSave, defaultLocality }) {
  const [form, setForm] = useState({ name: "", trade: "Electrician", price: "Rs 200 visit", locality: defaultLocality || "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <Modal title="Offer a service" onClose={onClose}>
      <Field label="Service / Provider Name">
        <input value={form.name} onChange={set("name")} placeholder="e.g. Ramesh Electrical Works / B.Tech Notes" />
      </Field>
      <Field label="Trade Category">
        <select value={form.trade} onChange={set("trade")}>
          <option value="Electrician">Electrician</option>
          <option value="Mechanic">Mechanic</option>
          <option value="Plumber">Plumber</option>
          <option value="Notes">Notes</option>
          <option value="Other">Other</option>
        </select>
      </Field>
      <Field label="Pricing Info">
        <input value={form.price} onChange={set("price")} placeholder="e.g. Rs 200 visit charge / Rs 100 PDF" />
      </Field>
      <Field label="Locality / Area">
        <input value={form.locality} onChange={set("locality")} placeholder="e.g. Sector 15" />
      </Field>
      <button className="btn primary wide" disabled={!form.name || !form.price} onClick={() => onSave(form)}>
        Publish service to database
      </button>
    </Modal>
  );
}
