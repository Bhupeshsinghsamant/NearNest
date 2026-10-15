import { useResource, useStore } from "../store.jsx";
import { PageHead, Empty } from "../components/ui.jsx";
import { patch } from "../api.js";

export default function Admin() {
  const { notify } = useStore();
  const [flags, setFlags] = useResource("flags");

  const act = (f, status) => {
    patch("flags", f.id, { status });
    setFlags((l) => l.map((x) => (x.id === f.id ? { ...x, status } : x)));
    notify(status === "restricted" ? `${f.target} can no longer post until reviewed.` : `${f.target} cleared.`);
  };

  const waiting = flags.filter((f) => f.status === "review");
  const restricted = flags.filter((f) => f.status === "restricted").length;

  return (
    <>
      <PageHead title="Safety desk" sub="Admin only. Accounts and areas that suddenly post far more than normal are flagged here for review." />
      <div className="stats">
        <div><strong>{waiting.length}</strong><span>waiting for review</span></div>
        <div><strong>{restricted}</strong><span>restricted</span></div>
        <div><strong>{flags.reduce((n, f) => n + f.posts, 0)}</strong><span>suspicious posts caught</span></div>
      </div>
      <div className="list">
        {flags.length === 0 && <Empty text="Nothing flagged." />}
        {flags.map((f) => (
          <article key={f.id} className="card">
            <div className="card-top">
              <h3>{f.target}</h3>
              <span className="tag">{f.kind}</span>
            </div>
            <p className="meta">{f.reason} · {f.posts} posts</p>
            <div className="risk" aria-label={`Risk score ${f.score} out of 100`}>
              <div style={{ width: `${f.score}%` }} className={f.score > 80 ? "hi" : "mid"} />
              <span>{f.score}</span>
            </div>
            <div className="card-actions">
              {f.status === "review" ? (
                <>
                  <button className="btn alert" onClick={() => act(f, "restricted")}>Restrict posting</button>
                  <button className="btn" onClick={() => act(f, "cleared")}>Looks fine</button>
                </>
              ) : (
                <span className={`status ${f.status === "restricted" ? "bad" : "good"}`}>{f.status === "restricted" ? "Restricted" : "Cleared"}</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
