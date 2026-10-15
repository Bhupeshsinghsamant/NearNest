import { useState } from "react";
import { BadgeCheck, Plus } from "lucide-react";
import MapView from "../components/MapView.jsx";
import { Empty, Field, Modal, PageHead, Segmented } from "../components/ui.jsx";
import { useResource, useStore } from "../store.jsx";
import { post } from "../api.js";

export default function Rooms() {
  const { radius, notify, user } = useStore();
  const [rooms, setRooms] = useResource("rooms");
  const [mode, setMode] = useState("find");
  const [sel, setSel] = useState(null);
  const [sent, setSent] = useState({});
  const [adding, setAdding] = useState(false);
  const [inbox, setInbox] = useState([
    { id: 1, from: "Aman, B.Tech student", msg: "Is the room still available from 1 Nov?", state: "pending" },
    { id: 2, from: "Rohit", msg: "Can I visit this evening?", state: "pending" },
  ]);

  const list = rooms.filter((r) => r.km <= radius);
  const pins = list.map((r) => ({ ...r, kind: "rooms", label: r.title }));

  const request = (r) => {
    setSent((s) => ({ ...s, [r.id]: "pending" }));
    notify(`Request sent to ${r.owner}. You'll get a notification when they reply.`);
  };

  const decide = (id, state) => {
    setInbox((i) => i.map((x) => (x.id === id ? { ...x, state } : x)));
    notify(state === "accepted" ? "Accepted. Chat is now open." : "Declined. They won't be able to message you again.");
  };

  const addRoom = async (form) => {
    const item = await post("rooms", { title: form.title, rent: Number(form.rent), owner: user.name, amenities: ["New"], verified: false });
    setRooms((r) => [item, ...r]);
    setAdding(false);
    notify("Room published. It now shows on the map for people nearby.");
  };

  return (
    <>
      <PageHead
        title="Rooms"
        sub="Owners accept or decline each request, so nobody gets spammed."
        action={<button className="btn primary" onClick={() => setAdding(true)}><Plus size={16} /> List a room</button>}
      />
      <Segmented value={mode} onChange={setMode} options={[{ value: "find", label: "Find a room" }, { value: "owner", label: "Owner inbox" }]} />

      {mode === "find" ? (
        <div className="split">
          <div className="list">
            {list.length === 0 && <Empty text="No rooms in this radius. Widen it from the sidebar." />}
            {list.map((r) => (
              <article key={r.id} className={`card ${sel === r.id ? "sel" : ""}`} onClick={() => setSel(r.id)}>
                <div className="card-top">
                  <h3>{r.title}</h3>
                  <strong className="price">Rs {r.rent.toLocaleString("en-IN")}<small>/mo</small></strong>
                </div>
                <p className="meta">{r.owner} · {r.km} km away {r.verified && <span className="ok"><BadgeCheck size={14} /> Verified owner</span>}</p>
                <div className="chips">{r.amenities.map((a) => <span key={a} className="chip">{a}</span>)}</div>
                <div className="card-actions">
                  {sent[r.id] ? <span className="status wait">Waiting for {r.owner}</span> : <button className="btn" onClick={(e) => { e.stopPropagation(); request(r); }}>Request to contact</button>}
                </div>
              </article>
            ))}
          </div>
          <MapView pins={pins} radius={radius} selected={sel && `rooms-${sel}`} onSelect={(p) => setSel(p.id)} height={460} />
        </div>
      ) : (
        <div className="list narrow">
          {inbox.map((m) => (
            <article key={m.id} className="card">
              <h3>{m.from}</h3>
              <p className="meta">{m.msg}</p>
              {m.state === "pending" ? (
                <div className="card-actions">
                  <button className="btn primary" onClick={() => decide(m.id, "accepted")}>Accept</button>
                  <button className="btn" onClick={() => decide(m.id, "rejected")}>Decline</button>
                </div>
              ) : (
                <span className={`status ${m.state === "accepted" ? "good" : "bad"}`}>{m.state === "accepted" ? "Accepted" : "Declined"}</span>
              )}
            </article>
          ))}
        </div>
      )}

      {adding && <AddRoom onClose={() => setAdding(false)} onSave={addRoom} />}
    </>
  );
}

function AddRoom({ onClose, onSave }) {
  const [form, setForm] = useState({ title: "", rent: "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <Modal title="List a room" onClose={onClose}>
      <Field label="Title"><input value={form.title} onChange={set("title")} placeholder="Single room, attached bath" /></Field>
      <Field label="Rent per month (Rs)"><input type="number" value={form.rent} onChange={set("rent")} placeholder="5000" /></Field>
      <Field label="Photos"><div className="drop">Drop photos here (upload comes in the full build)</div></Field>
      <button className="btn primary wide" disabled={!form.title || !form.rent} onClick={() => onSave(form)}>Publish room</button>
    </Modal>
  );
}
