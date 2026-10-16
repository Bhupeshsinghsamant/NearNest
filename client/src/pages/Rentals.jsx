import { useState } from "react";
import { Bike, Car, LocateFixed, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Empty, Field, Modal, PageHead, Segmented } from "../components/ui.jsx";
import { useResource, useStore } from "../store.jsx";
import { post, del } from "../api.js";

const LATE_SURCHARGE = 30;

export default function Rentals() {
  const { radius, setRadius, notify, user, userLocation } = useStore();
  const [rentals, setRentals] = useResource("rentals");
  const [type, setType] = useState("All");
  const [booking, setBooking] = useState(null);
  const [adding, setAdding] = useState(false);

  const list = rentals.filter((r) => (radius >= 9999 || r.km == null || r.km <= radius) && (type === "All" || r.type === type));

  const addVehicle = async (form) => {
    try {
      const item = await post("rentals", {
        name: form.name,
        type: form.type,
        rate: Number(form.rate),
        locality: form.locality || userLocation?.area || user?.area || "Local Area",
        latitude: form.latitude || userLocation?.lat,
        longitude: form.longitude || userLocation?.lng,
        available: true,
      });
      setRentals((prev) => [item, ...prev]);
      setAdding(false);
      notify("Vehicle listed successfully. It is now visible to nearby riders.");
    } catch (err) {
      notify(err.message || "Failed to list vehicle.");
    }
  };

  const deleteVehicle = async (id) => {
    if (!window.confirm("Are you sure you want to remove this vehicle listing?")) return;
    try {
      await del("rentals", id);
      setRentals((prev) => prev.filter((r) => (r.id || r._id) !== id));
      notify("Vehicle removed from database.");
    } catch (err) {
      notify(err.message || "Failed to remove vehicle.");
    }
  };

  const handleBooking = async (vehicle, hours) => {
    try {
      await post("requests", {
        listingId: vehicle.id || vehicle._id,
        message: `Rental request for ${hours} hours (${vehicle.name}).`,
      });
      setBooking(null);
      notify(`Booking request sent to ${vehicle.owner}.`);
    } catch (err) {
      notify(err.message || "Failed to send booking request.");
    }
  };

  return (
    <>
      <PageHead
        title="Rentals"
        sub="Scooty, bike or car from verified locals nearby. Pay per hour with flexible pickup."
        action={<button className="btn primary" onClick={() => setAdding(true)}><Plus size={16} /> List a vehicle</button>}
      />
      <Segmented value={type} onChange={setType} options={["All", "Scooty", "Bike", "Car"].map((v) => ({ value: v, label: v }))} />
      <div className="list">
        {list.length === 0 && <Empty text="No vehicles in this radius. Widen it or list your own ride!" />}
        {list.map((r) => {
          const vId = r.id || r._id;
          const isOwner = user && (r.ownerId === user.id || r.owner === user.name);
          return (
            <article key={vId} className="card">
              <div className="card-top">
                <h3>{r.name}</h3>
                <strong className="price">Rs {r.rate}<small>/hr</small></strong>
              </div>
              <p className="meta">{r.type} · {r.owner} {r.km != null ? `· ${r.km} km away` : ""}</p>
              <div className="card-actions">
                {isOwner ? (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span className="status ok"><CheckCircle2 size={13} style={{ marginRight: 4 }} /> Your vehicle</span>
                    <button className="btn" style={{ borderColor: "#ef4444", color: "#ef4444" }} onClick={() => deleteVehicle(vId)}>
                      <Trash2 size={13} style={{ marginRight: 4 }} /> Delete
                    </button>
                  </div>
                ) : r.available ? (
                  <button className="btn" onClick={() => setBooking(r)}>Request</button>
                ) : (
                  <span className="status bad">Out right now</span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {booking && (
        <Booking
          vehicle={booking}
          onClose={() => setBooking(null)}
          onDone={(hours) => handleBooking(booking, hours)}
        />
      )}

      {adding && (
        <AddVehicle
          onClose={() => setAdding(false)}
          onSave={addVehicle}
          defaultLocality={user?.area}
        />
      )}
    </>
  );
}

function Booking({ vehicle, onClose, onDone }) {
  const [hours, setHours] = useState(3);
  const [share, setShare] = useState(true);
  const total = vehicle.rate * hours + (share ? 0 : LATE_SURCHARGE);
  const Icon = vehicle.type === "Car" ? Car : Bike;
  return (
    <Modal title={`Rent ${vehicle.name}`} onClose={onClose}>
      <Field label="For how many hours?">
        <input type="number" min="1" max="72" value={hours} onChange={(e) => setHours(Math.max(1, Number(e.target.value)))} />
      </Field>
      <div className="choice-group" role="radiogroup" aria-label="Location sharing">
        <button role="radio" aria-checked={share} className={`choice ${share ? "on" : ""}`} onClick={() => setShare(true)}>
          <LocateFixed size={18} />
          <span><b>Share live location</b><small>Owner sees when you'll be back and can plan the next booking.</small></span>
        </button>
        <button role="radio" aria-checked={!share} className={`choice ${!share ? "on" : ""}`} onClick={() => setShare(false)}>
          <Icon size={18} />
          <span><b>Don't share</b><small>The owner may add Rs {LATE_SURCHARGE} in case of a late return.</small></span>
        </button>
      </div>
      <div className="total"><span>Total</span><strong>Rs {total}</strong></div>
      <button className="btn primary wide" onClick={() => onDone(hours)}>Send request</button>
    </Modal>
  );
}

function AddVehicle({ onClose, onSave, defaultLocality }) {
  const [form, setForm] = useState({ name: "", type: "Scooty", rate: "60", locality: defaultLocality || "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <Modal title="List a vehicle for rent" onClose={onClose}>
      <Field label="Vehicle Name & Model">
        <input value={form.name} onChange={set("name")} placeholder="e.g. Honda Activa 6G / Royal Enfield" />
      </Field>
      <Field label="Vehicle Type">
        <select value={form.type} onChange={set("type")}>
          <option value="Scooty">Scooty</option>
          <option value="Bike">Bike</option>
          <option value="Car">Car</option>
        </select>
      </Field>
      <Field label="Hourly Rate (Rs/hr)">
        <input type="number" value={form.rate} onChange={set("rate")} placeholder="60" />
      </Field>
      <Field label="Locality / Pickup Area">
        <input value={form.locality} onChange={set("locality")} placeholder="e.g. Metro Station Gate 2" />
      </Field>
      <button className="btn primary wide" disabled={!form.name || !form.rate} onClick={() => onSave(form)}>
        Publish vehicle to database
      </button>
    </Modal>
  );
}
