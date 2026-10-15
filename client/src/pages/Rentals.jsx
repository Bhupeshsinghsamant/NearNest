import { useState } from "react";
import { Bike, Car, LocateFixed } from "lucide-react";
import { Empty, Field, Modal, PageHead, Segmented } from "../components/ui.jsx";
import { useResource, useStore } from "../store.jsx";

const LATE_SURCHARGE = 30;

export default function Rentals() {
  const { radius, notify } = useStore();
  const [rentals] = useResource("rentals");
  const [type, setType] = useState("All");
  const [booking, setBooking] = useState(null);

  const list = rentals.filter((r) => r.km <= radius && (type === "All" || r.type === type));

  return (
    <>
      <PageHead title="Rentals" sub="Scooty, bike or car from someone nearby. Share your live location, or pay a small surcharge if you'd rather not." />
      <Segmented value={type} onChange={setType} options={["All", "Scooty", "Bike", "Car"].map((v) => ({ value: v, label: v }))} />
      <div className="list">
        {list.length === 0 && <Empty text="No vehicles in this radius." />}
        {list.map((r) => (
          <article key={r.id} className="card">
            <div className="card-top">
              <h3>{r.name}</h3>
              <strong className="price">Rs {r.rate}<small>/hr</small></strong>
            </div>
            <p className="meta">{r.type} · {r.owner} · {r.km} km away</p>
            <div className="card-actions">
              {r.available ? <button className="btn" onClick={() => setBooking(r)}>Request</button> : <span className="status bad">Out right now</span>}
            </div>
          </article>
        ))}
      </div>

      {booking && <Booking vehicle={booking} onClose={() => setBooking(null)} onDone={() => { setBooking(null); notify("Request sent to the owner."); }} />}
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
      <button className="btn primary wide" onClick={onDone}>Send request</button>
    </Modal>
  );
}
