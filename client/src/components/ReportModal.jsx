import { useState } from "react";
import { Flag, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Modal, Field } from "./ui.jsx";
import { post } from "../api.js";
import { useStore } from "../store.jsx";

const REPORT_REASONS = [
  { value: "fake", label: "Fake Listing", desc: "Property/item does not exist or owner cannot be contacted" },
  { value: "scam", label: "Suspicious / Scam", desc: "Demanding advance payment or token without in-person visit" },
  { value: "misleading", label: "Misleading Information", desc: "Incorrect pricing, photos, or false locality details" },
  { value: "expired", label: "No Longer Available", desc: "Already rented out, sold, or expired" },
  { value: "duplicate", label: "Duplicate / Spam", desc: "Posted repeatedly by the same provider" },
  { value: "inappropriate", label: "Inappropriate Content", desc: "Offensive language, abusive photos, or harassment" },
  { value: "other", label: "Other Concern", desc: "Any other issue violating community safety" },
];

export default function ReportModal({ target, targetType = "listing", onClose }) {
  const { notify } = useStore();
  const [reason, setReason] = useState("scam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setError("Please select a reason for reporting.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await post("reports", {
        targetType,
        targetId: target.id || target._id,
        reason,
        details: details.trim(),
      });
      setDone(true);
      notify("Report submitted. Our moderation team will investigate.");
    } catch (err) {
      setError(err.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Report Listing to NearNest Safety Team" onClose={onClose}>
      {done ? (
        <div style={{ textAlign: "center", padding: "24px 12px" }}>
          <CheckCircle2 size={44} color="#10B981" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "1.1rem", marginBottom: 6 }}>Report Received</h3>
          <p style={{ color: "var(--mute)", fontSize: "0.88rem", maxWidth: 420, margin: "0 auto 18px" }}>
            Thank you for helping keep NearNest safe. Our moderation team reviews reports systematically.
            If a violation is confirmed, appropriate action will be taken.
          </p>
          <button className="btn primary" onClick={onClose}>
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div
            style={{
              background: "#FEF3C7",
              border: "1px solid #FDE68A",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: "0.85rem",
              color: "#92400E",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>Reporting:</strong> "{target.title || target.name || "This item"}"
              <div style={{ fontSize: "0.78rem", marginTop: 2, color: "#78350F" }}>
                NearNest enforces fair, defensible review before restricting any account.
              </div>
            </div>
          </div>

          <Field label="Reason for Report">
            <div style={{ display: "grid", gap: 6 }}>
              {REPORT_REASONS.map((r) => {
                const isSelected = reason === r.value;
                return (
                  <label
                    key={r.value}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: isSelected ? "1.5px solid #2563EB" : "1px solid var(--line)",
                      background: isSelected ? "#EFF6FF" : "#FFFFFF",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.value}
                      checked={isSelected}
                      onChange={() => setReason(r.value)}
                      style={{ marginTop: 3, width: "auto" }}
                    />
                    <div>
                      <strong style={{ color: isSelected ? "#1E40AF" : "var(--ink)" }}>{r.label}</strong>
                      <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--mute)" }}>{r.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </Field>

          <Field label="Additional Details (Optional)">
            <textarea
              rows={3}
              placeholder="Provide specific details (e.g. 'Asked for 5000 advance before visit', 'Different address on call')..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              style={{ fontSize: "0.85rem" }}
            />
          </Field>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="button" className="btn" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn primary"
              style={{ flex: 1, background: "#DC2626", borderColor: "#DC2626" }}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
