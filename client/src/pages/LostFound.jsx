import { useState } from "react";
import { Plus } from "lucide-react";
import { Empty, Field, Modal, PageHead, Segmented, ago } from "../components/ui.jsx";
import { useResource, useStore } from "../store.jsx";
import { post } from "../api.js";

export default function LostFound() {
  const { radius, notify, user } = useStore();
  const [items, setItems] = useResource("lostfound");
  const [tab, setTab] = useState("found");
  const [claiming, setClaiming] = useState(null);
  const [posting, setPosting] = useState(false);

  const list = items.filter((i) => i.kind === tab && i.km <= radius);

  const submitPost = async (form) => {
    const item = await post("lostfound", { ...form, by: user.name });
    setItems((l) => [item, ...l]);
    setPosting(false);
    notify(`Posted. ${Math.max(3, Math.round(radius * 6))} people nearby were notified.`);
  };

  return (
    <>
      <PageHead
        title="Lost & found"
        sub="Found something? Post it. Lost something? Nearby people get notified straight away."
        action={<button className="btn primary" onClick={() => setPosting(true)}><Plus size={16} /> New post</button>}
      />
      <Segmented value={tab} onChange={setTab} options={[{ value: "found", label: "Found items" }, { value: "lost", label: "Lost items" }]} />
      <div className="list">
        {list.length === 0 && <Empty text={`Nothing ${tab} within ${radius} km.`} />}
        {list.map((i) => (
          <article key={i.id} className="card">
            <div className="card-top">
              <h3>{i.title}</h3>
              <span className="meta">{ago(i.minsAgo)}</span>
            </div>
            <p className="meta">{i.where} · {i.km} km away · posted by {i.by}</p>
            <div className="card-actions">
              <button className="btn" onClick={() => setClaiming(i)}>{tab === "found" ? "This is mine" : "I found this"}</button>
            </div>
          </article>
        ))}
      </div>

      {claiming && (
        <Modal title={claiming.kind === "found" ? "Prove it's yours" : "Tell them what you found"} onClose={() => setClaiming(null)}>
          <Field label={claiming.kind === "found" ? "Describe something only the owner would know" : "Where is it now?"}>
            <textarea rows="3" placeholder={claiming.kind === "found" ? "Colour of the lining, what's inside, a mark on it..." : "I have it with me, call me..."} />
          </Field>
          <button className="btn primary wide" onClick={() => { setClaiming(null); notify("Sent. The poster will review your message."); }}>Send message</button>
        </Modal>
      )}
      {posting && <PostModal onClose={() => setPosting(false)} onSave={submitPost} defaultKind={tab} />}
    </>
  );
}

function PostModal({ onClose, onSave, defaultKind }) {
  const [form, setForm] = useState({ kind: defaultKind, title: "", where: "" });
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
