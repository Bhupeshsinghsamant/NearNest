import { useState } from "react";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Empty, Field, Modal, PageHead, Segmented, ago } from "../components/ui.jsx";
import { useResource, useStore } from "../store.jsx";
import { post, del } from "../api.js";

export default function LostFound() {
  const { radius, notify, user } = useStore();
  const [items, setItems] = useResource("lostfound");
  const [tab, setTab] = useState("found");
  const [claiming, setClaiming] = useState(null);
  const [claimMessage, setClaimMessage] = useState("");
  const [posting, setPosting] = useState(false);

  const list = items.filter((i) => (i.kind === tab || (tab === "found" && !i.kind)) && (i.km == null || i.km <= radius));

  const submitPost = async (form) => {
    try {
      const item = await post("lostfound", { ...form, by: user.name });
      setItems((l) => [item, ...l]);
      setPosting(false);
      notify("Item posted to database. Visible to everyone nearby.");
    } catch (err) {
      notify(err.message || "Failed to post item.");
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to remove this post?")) return;
    try {
      await del("lostfound", id);
      setItems((l) => l.filter((x) => (x.id || x._id) !== id));
      notify("Post removed from database.");
    } catch (err) {
      notify(err.message || "Failed to remove post.");
    }
  };

  const handleClaim = async () => {
    if (!claiming) return;
    try {
      await post("requests", {
        listingId: claiming.id || claiming._id,
        message: `[Lost & Found inquiry for "${claiming.title}"]: ${claimMessage}`,
      });
      setClaiming(null);
      setClaimMessage("");
      notify("Inquiry sent to the person who posted this item.");
    } catch (err) {
      notify(err.message || "Failed to send claim message.");
    }
  };

  return (
    <>
      <PageHead
        title="Lost & found"
        sub="Found something? Post it. Lost something? Nearby people can contact you directly."
        action={<button className="btn primary" onClick={() => setPosting(true)}><Plus size={16} /> New post</button>}
      />
      <Segmented value={tab} onChange={setTab} options={[{ value: "found", label: "Found items" }, { value: "lost", label: "Lost items" }]} />
      <div className="list">
        {list.length === 0 && <Empty text={`Nothing ${tab} within ${radius} km.`} />}
        {list.map((i) => {
          const itemId = i.id || i._id;
          const isOwner = user && (i.ownerId === user.id || i.by === user.name);
          return (
            <article key={itemId} className="card">
              <div className="card-top">
                <h3>{i.title}</h3>
                <span className="meta">{ago(i.minsAgo)}</span>
              </div>
              <p className="meta">{i.where || i.locality || "Local Area"} {i.km != null ? `· ${i.km} km away` : ""} · posted by {i.by || i.ownerName}</p>
              <div className="card-actions">
                {isOwner ? (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span className="status ok"><CheckCircle2 size={13} style={{ marginRight: 4 }} /> Your post</span>
                    <button className="btn" style={{ borderColor: "#ef4444", color: "#ef4444" }} onClick={() => deleteItem(itemId)}>
                      <Trash2 size={13} style={{ marginRight: 4 }} /> Delete
                    </button>
                  </div>
                ) : (
                  <button className="btn" onClick={() => { setClaiming(i); setClaimMessage(""); }}>
                    {tab === "found" ? "This is mine" : "I found this"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {claiming && (
        <Modal title={claiming.kind === "found" ? "Prove it's yours" : "Tell them what you found"} onClose={() => setClaiming(null)}>
          <Field label={claiming.kind === "found" ? "Describe something only the owner would know" : "Where is it now?"}>
            <textarea
              rows="3"
              value={claimMessage}
              onChange={(e) => setClaimMessage(e.target.value)}
              placeholder={claiming.kind === "found" ? "Colour of the lining, what's inside, a mark on it..." : "I have it with me, call me..."}
            />
          </Field>
          <button className="btn primary wide" disabled={!claimMessage.trim()} onClick={handleClaim}>
            Send message to poster
          </button>
        </Modal>
      )}
      {posting && <PostModal onClose={() => setPosting(false)} onSave={submitPost} defaultKind={tab} defaultLocality={user?.area} />}
    </>
  );
}

function PostModal({ onClose, onSave, defaultKind, defaultLocality }) {
  const [form, setForm] = useState({ kind: defaultKind, title: "", where: defaultLocality || "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <Modal title="New lost & found post" onClose={onClose}>
      <Field label="Type">
        <select value={form.kind} onChange={set("kind")}>
          <option value="found">I found something</option>
          <option value="lost">I lost something</option>
        </select>
      </Field>
      <Field label="What is it?"><input value={form.title} onChange={set("title")} placeholder="Black wallet" /></Field>
      <Field label="Where?"><input value={form.where} onChange={set("where")} placeholder="Near the bus stop" /></Field>
      <button className="btn primary wide" disabled={!form.title || !form.where} onClick={() => onSave(form)}>Post and notify nearby</button>
    </Modal>
  );
}
