import { useState, useEffect } from "react";
import { BadgeCheck, Plus, Trash2, CheckCircle2 } from "lucide-react";
import MapView from "../components/MapView.jsx";
import { Empty, Field, Modal, PageHead, Segmented } from "../components/ui.jsx";
import { useResource, useStore } from "../store.jsx";
import { post, get, patch, del } from "../api.js";

export default function Rooms() {
  const { radius, notify, user } = useStore();
  const [rooms, setRooms, loadingRooms] = useResource("rooms");
  const [mode, setMode] = useState("find");
  const [sel, setSel] = useState(null);
  const [sent, setSent] = useState({});
  const [adding, setAdding] = useState(false);
  const [inbox, setInbox] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(false);

  // Fetch real seller inbox from MongoDB Atlas
  const fetchInbox = async () => {
    try {
      setLoadingInbox(true);
      const data = await get("requests/inbox");
      setInbox(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching inbox:", err);
    } finally {
      setLoadingInbox(false);
    }
  };

  useEffect(() => {
    if (mode === "owner") {
      fetchInbox();
    }
  }, [mode]);

  const list = rooms.filter((r) => r.km == null || r.km <= radius);
  const pins = list.map((r) => ({ ...r, kind: "rooms", label: r.title }));

  // Send real inquiry to listing owner
  const request = async (r) => {
    const listingId = r.id || r._id;
    try {
      await post("requests", {
        listingId,
        message: "Hi, I am interested in this room. Is it still available?",
      });
      setSent((s) => ({ ...s, [listingId]: "pending" }));
      notify(`Contact request sent to ${r.owner}. You'll see their response once accepted.`);
    } catch (err) {
      notify(err.message || "Failed to send request.");
    }
  };

  // Listing owner accepts or declines inquiry
  const decide = async (id, state) => {
    try {
      await patch("requests", id, { status: state });
      setInbox((i) => i.map((x) => ((x._id === id || x.id === id) ? { ...x, status: state, state } : x)));
      notify(state === "accepted" ? "Accepted. Contact details shared with buyer." : "Declined request.");
    } catch (err) {
      notify(err.message || "Failed to update request.");
    }
  };

  // Create persistent listing in MongoDB Atlas
  const addRoom = async (form) => {
    try {
      const item = await post("rooms", {
        title: form.title,
        rent: Number(form.rent),
        locality: form.locality || user?.area || "Local Area",
        amenities: form.amenities ? form.amenities.split(",").map((s) => s.trim()) : ["Attached Bath", "WiFi"],
        verified: false,
      });
      setRooms((r) => [item, ...r]);
      setAdding(false);
      notify("Room successfully saved to database. It is now visible to all users.");
    } catch (err) {
      notify(err.message || "Failed to publish room.");
    }
  };

  // Delete persistent listing from MongoDB Atlas
  const deleteRoom = async (id) => {
    if (!window.confirm("Are you sure you want to delete this room listing?")) return;
    try {
      await del("rooms", id);
      setRooms((r) => r.filter((item) => (item.id || item._id) !== id));
      notify("Room listing removed from database.");
    } catch (err) {
      notify(err.message || "Failed to delete room listing.");
    }
  };

  return (
    <>
      <PageHead
        title="Rooms"
        sub="Direct from verified owners. Send inquiries and get replies in real time."
        action={<button className="btn primary" onClick={() => setAdding(true)}><Plus size={16} /> List a room</button>}
      />
      <Segmented value={mode} onChange={setMode} options={[{ value: "find", label: "Find a room" }, { value: "owner", label: "Owner inbox" }]} />

      {mode === "find" ? (
        <div className="split">
          <div className="list">
            {list.length === 0 && <Empty text="No rooms found in this radius. Widen it from the sidebar or list the first one!" />}
            {list.map((r) => {
              const roomId = r.id || r._id;
              const isOwner = user && (r.ownerId === user.id || r.owner === user.name);
              return (
                <article key={roomId} className={`card ${sel === roomId ? "sel" : ""}`} onClick={() => setSel(roomId)}>
                  <div className="card-top">
                    <h3>{r.title}</h3>
                    <strong className="price">Rs {Number(r.rent || 0).toLocaleString("en-IN")}<small>/mo</small></strong>
                  </div>
                  <p className="meta">
                    {r.owner} · {r.locality || "Local Area"} {r.km != null ? `· ${r.km} km away` : ""}
                    {r.verified && <span className="ok"><BadgeCheck size={14} /> Verified owner</span>}
                  </p>
                  <div className="chips">
                    {(r.amenities || []).map((a) => <span key={a} className="chip">{a}</span>)}
                  </div>
                  <div className="card-actions">
                    {isOwner ? (
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span className="status ok"><CheckCircle2 size={13} style={{ marginRight: 4 }} /> Your room</span>
                        <button className="btn" style={{ borderColor: "#ef4444", color: "#ef4444" }} onClick={(e) => { e.stopPropagation(); deleteRoom(roomId); }}>
                          <Trash2 size={13} style={{ marginRight: 4 }} /> Delete
                        </button>
                      </div>
                    ) : sent[roomId] ? (
                      <span className="status wait">Inquiry sent to {r.owner}</span>
                    ) : (
                      <button className="btn" onClick={(e) => { e.stopPropagation(); request(r); }}>
                        Request to contact
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <MapView pins={pins} radius={radius} selected={sel && `rooms-${sel}`} onSelect={(p) => setSel(p.id)} height={460} />
        </div>
      ) : (
        <div className="list narrow">
          {loadingInbox && <p className="meta" style={{ textAlign: "center", padding: 24 }}>Loading inquiries from database...</p>}
          {!loadingInbox && inbox.length === 0 && (
            <Empty text="No inquiries yet. When people request to contact you about your rooms, their messages will appear here." />
          )}
          {inbox.map((m) => {
            const reqId = m._id || m.id;
            const reqStatus = m.status || m.state || "pending";
            return (
              <article key={reqId} className="card">
                <div className="card-top">
                  <h3>{m.buyerName || m.from || "Interested Buyer"}</h3>
                  {m.buyerEmail && <span className="meta">{m.buyerEmail}</span>}
                </div>
                {m.listingTitle && (
                  <p style={{ margin: "4px 0", fontSize: "0.85rem", color: "#2563eb", fontWeight: "600" }}>
                    Listing: {m.listingTitle}
                  </p>
                )}
                <p className="meta">{m.message || m.msg}</p>
                {reqStatus === "pending" ? (
                  <div className="card-actions">
                    <button className="btn primary" onClick={() => decide(reqId, "accepted")}>Accept</button>
                    <button className="btn" onClick={() => decide(reqId, "declined")}>Decline</button>
                  </div>
                ) : (
                  <span className={`status ${reqStatus === "accepted" ? "good" : "bad"}`}>
                    {reqStatus === "accepted" ? "Accepted" : "Declined"}
                  </span>
                )}
              </article>
            );
          })}
        </div>
      )}

      {adding && <AddRoom onClose={() => setAdding(false)} onSave={addRoom} defaultLocality={user?.area} />}
    </>
  );
}

function AddRoom({ onClose, onSave, defaultLocality }) {
  const [form, setForm] = useState({ title: "", rent: "", locality: defaultLocality || "", amenities: "Attached Bath, WiFi" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <Modal title="List a room" onClose={onClose}>
      <Field label="Title / Description">
        <input value={form.title} onChange={set("title")} placeholder="e.g. 2 floor house (4 rooms + 2 bathroom)" />
      </Field>
      <Field label="Rent per month (Rs)">
        <input type="number" value={form.rent} onChange={set("rent")} placeholder="50000" />
      </Field>
      <Field label="Locality / Area">
        <input value={form.locality} onChange={set("locality")} placeholder="e.g. Sector 15, Near City Center" />
      </Field>
      <Field label="Amenities (comma separated)">
        <input value={form.amenities} onChange={set("amenities")} placeholder="Attached Bath, WiFi, Balcony" />
      </Field>
      <button className="btn primary wide" disabled={!form.title || !form.rent} onClick={() => onSave(form)}>
        Publish room to database
      </button>
    </Modal>
  );
}
