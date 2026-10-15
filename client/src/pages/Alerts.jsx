import { useState } from "react";
import { Siren } from "lucide-react";
import MapView from "../components/MapView.jsx";
import { Empty, Field, Modal, PageHead, ago } from "../components/ui.jsx";
import { useResource, useStore } from "../store.jsx";
import { post } from "../api.js";

export default function Alerts() {
  const { radius, notify, user } = useStore();
  const [alerts, setAlerts] = useResource("alerts");
  const [open, setOpen] = useState(false);
  const [helped, setHelped] = useState({});

  const list = alerts.filter((a) => a.km <= radius);
  const pins = list.map((a) => ({ ...a, kind: "alerts", label: a.title }));

  const help = (a) => {
    setHelped((h) => ({ ...h, [a.id]: true }));
    setAlerts((l) => l.map((x) => (x.id === a.id ? { ...x, helpers: x.helpers + 1 } : x)));
    notify(`${a.by} has been told you're on the way.`);
  };

  const send = async (form) => {
    const item = await post("alerts", { ...form, by: user.name, helpers: 0 });
    setAlerts((l) => [item, ...l]);
    setOpen(false);
    notify(`Alert sent to everyone within ${radius} km.`);
  };

  return (
    <>
      <PageHead
        title="Local alerts"
        sub="Stuck on the road, need blood, spotted something unsafe? Tell the people closest to you."
        action={<button className="btn alert" onClick={() => setOpen(true)}><Siren size={16} /> Send urgent alert</button>}
      />
      <div className="split">
        <div className="list">
          {list.length === 0 && <Empty text="All quiet within this radius." />}
          {list.map((a) => (
            <article key={a.id} className="card alert-card">
              <div className="card-top">
                <span className="tag">{a.type}</span>
                <span className="meta">{ago(a.minsAgo)} · {a.km} km</span>
              </div>
              <h3>{a.title}</h3>
              <p className="meta">Posted by {a.by} · {a.helpers} {a.helpers === 1 ? "person" : "people"} responding</p>
              <div className="card-actions">
                {helped[a.id] ? <span className="status good">You're responding</span> : <button className="btn" onClick={() => help(a)}>I can help</button>}
              </div>
            </article>
          ))}
        </div>
        <MapView pins={pins} radius={radius} height={420} />
      </div>
      {open && <SendAlert onClose={() => setOpen(false)} onSend={send} radius={radius} />}
    </>
  );
}

function SendAlert({ onClose, onSend, radius }) {
  const [form, setForm] = useState({ type: "Stuck", title: "" });
  return (
    <Modal title="Send urgent alert" onClose={onClose}>
      <Field label="What kind of help?">
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option>Stuck</option>
          <option>Medical</option>
          <option>Blood</option>
          <option>Safety</option>
        </select>
      </Field>
      <Field label="What's happening?">
        <textarea rows="3" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Where you are and what you need" />
      </Field>
      <p className="note">For emergencies, call 112 first. This alert goes to neighbours within {radius} km.</p>
      <button className="btn alert wide" disabled={!form.title} onClick={() => onSend(form)}>Send to neighbours</button>
    </Modal>
  );
}
