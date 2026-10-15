import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare,
  Send,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Search,
  Check,
  CheckCheck,
  MapPin,
  ExternalLink,
  Tag,
  Clock,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "../store.jsx";
import { get, post, patch } from "../api.js";

const QUICK_CHIPS = [
  "📍 Can I visit today?",
  "💰 Is the rent/price negotiable?",
  "📞 Please call me directly",
  "🤝 Ready to finalize!",
  "✅ When can I move in / pick up?",
];

export default function Messages() {
  const { user, notify, refreshUnreadCount } = useStore();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // 'all' | 'buying' | 'selling' | 'unread'

  const feedRef = useRef(null);
  const pollTimerRef = useRef(null);

  // Fetch all user conversations
  const fetchConversations = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await get("requests/conversations");
      const list = Array.isArray(res) ? res : res.data || [];
      setConversations(list);

      // Auto-select first conversation on initial load if none selected
      setSelectedId((curr) => {
        if (!curr && list.length > 0 && window.innerWidth > 768) {
          return list[0].id || list[0]._id;
        }
        return curr;
      });
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (convId, silent = false) => {
    if (!convId) return;
    try {
      if (!silent) setLoadingMessages(true);
      const res = await get(`requests/${convId}/messages`);
      const msgList = Array.isArray(res) ? res : res.data || [];
      setMessages(msgList);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  // Mark conversation as read
  const markAsRead = useCallback(async (convId) => {
    if (!convId) return;
    try {
      await patch("requests", `${convId}/read`, {});
      setConversations((prev) =>
        prev.map((c) => ((c.id === convId || c._id === convId) ? { ...c, unreadCount: 0 } : c))
      );
      if (refreshUnreadCount) refreshUnreadCount();
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  }, [refreshUnreadCount]);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // When selected conversation changes
  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
      markAsRead(selectedId);
    }
  }, [selectedId, fetchMessages, markAsRead]);

  // Real-time live polling (every 3.5 seconds)
  useEffect(() => {
    pollTimerRef.current = setInterval(() => {
      fetchConversations(true);
      if (selectedId) {
        fetchMessages(selectedId, true);
      }
    }, 3500);

    return () => clearInterval(pollTimerRef.current);
  }, [selectedId, fetchConversations, fetchMessages]);

  // Auto-scroll message feed to bottom
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  // Send a message
  const handleSend = async (messageText = null) => {
    const toSend = (typeof messageText === "string" ? messageText : text).trim();
    if (!toSend || !selectedId || sending) return;

    try {
      setSending(true);
      const res = await post(`requests/${selectedId}/messages`, { text: toSend });
      const updatedList = Array.isArray(res) ? res : res.data || [];

      if (updatedList.length > 0) {
        setMessages(updatedList);
      } else if (res.newMessage) {
        setMessages((prev) => [...prev, res.newMessage]);
      }

      setText("");
      fetchConversations(true);
    } catch (err) {
      notify(err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  // Seller decides on request (Accept/Decline) right from chat header
  const handleDecide = async (decision) => {
    if (!selectedId) return;
    try {
      const updated = await patch("requests", selectedId, { status: decision });
      notify(decision === "accepted" ? "Inquiry accepted! Contact details revealed." : "Inquiry declined.");
      fetchConversations(true);
    } catch (err) {
      notify(err.message || "Failed to update inquiry.");
    }
  };

  const selectedConv = conversations.find((c) => (c.id === selectedId || c._id === selectedId));

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchPartner = c.partner?.name?.toLowerCase().includes(q);
      const matchListing = c.listingTitle?.toLowerCase().includes(q);
      const matchLastMsg = c.lastMessage?.text?.toLowerCase().includes(q);
      if (!matchPartner && !matchListing && !matchLastMsg) return false;
    }

    // Role / Unread Filter
    if (filter === "buying") return c.myRole === "buyer";
    if (filter === "selling") return c.myRole === "seller";
    if (filter === "unread") return (c.unreadCount || 0) > 0;
    return true;
  });

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const mins = Math.max(0, Math.round((Date.now() - new Date(dateStr).getTime()) / 60000));
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  };

  return (
    <>
      {user?.role === "admin" && (
        <div
          style={{
            background: "#EFF6FF",
            border: "1.5px solid #BFDBFE",
            borderRadius: "12px",
            padding: "10px 16px",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldCheck size={20} color="#2563EB" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "0.85rem", color: "#1E40AF" }}>
              <strong>Platform Administrator Mode:</strong> You are managing platform safety. To inspect and moderate community inquiries across all users, open Admin Control.
            </span>
          </div>
          <Link
            to="/admin"
            className="btn primary"
            style={{ fontSize: "0.78rem", padding: "5px 12px", borderRadius: "8px", textDecoration: "none", whiteSpace: "nowrap" }}
          >
            Open Admin Inspector →
          </Link>
        </div>
      )}
      <div className="messenger-container">
      {/* 1. LEFT PANEL: CONVERSATIONS LIST */}
      <aside className={`messenger-sidebar ${selectedId ? "hide-on-mobile" : ""}`}>
        <div className="messenger-sidebar-head">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: "1.25rem", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <MessageSquare size={20} color="#2563EB" /> Messages
            </h2>
            <span style={{ fontSize: "0.8rem", color: "var(--mute)", fontWeight: 600 }}>
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--mute)" }} />
            <input
              className="search"
              style={{ margin: 0, paddingLeft: 30, fontSize: "0.85rem", height: "36px" }}
              placeholder="Search chats by name or listing..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter Pills */}
          <div className="chips" style={{ gap: 4 }}>
            {[
              { val: "all", label: "All" },
              { val: "buying", label: "Buying" },
              { val: "selling", label: "Selling" },
              { val: "unread", label: "Unread" },
            ].map((f) => (
              <button
                key={f.val}
                type="button"
                className={`chip ${filter === f.val ? "on" : ""}`}
                style={{ fontSize: "0.75rem", padding: "3px 10px" }}
                onClick={() => setFilter(f.val)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations Scrollable List */}
        <div className="messenger-conversations-list">
          {loading && conversations.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--mute)", padding: 20 }}>Loading your conversations...</p>
          ) : filteredConversations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 16px", color: "var(--mute)" }}>
              <p style={{ margin: "0 0 6px", fontWeight: 600 }}>No conversations found</p>
              <small>Browse rooms, rentals or services to start connecting with locals.</small>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const convId = c.id || c._id;
              const isSelected = selectedId === convId;
              const partnerName = c.partner?.name || "Neighbor";
              const initials = partnerName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
              const hasUnread = (c.unreadCount || 0) > 0;

              return (
                <div
                  key={convId}
                  className={`messenger-conv-item ${isSelected ? "selected" : ""} ${hasUnread ? "unread" : ""}`}
                  onClick={() => setSelectedId(convId)}
                >
                  {/* Avatar with status indicator */}
                  <div className="conv-avatar">
                    <span>{initials}</span>
                    <span className="online-indicator" />
                  </div>

                  {/* Conversation Details */}
                  <div className="conv-body">
                    <div className="conv-top-row">
                      <strong className="conv-name">{partnerName}</strong>
                      <span className="conv-time">{timeAgo(c.lastMessage?.createdAt || c.updatedAt)}</span>
                    </div>

                    {/* Listing context pill */}
                    <div className="conv-listing-pill">
                      <span className="listing-tag">{c.listingTitle}</span>
                      {c.listingPrice && <span className="listing-price">{c.listingPrice}</span>}
                    </div>

                    {/* Message snippet */}
                    <div className="conv-bottom-row">
                      <p className="conv-snippet">
                        {c.lastMessage?.senderId === user?.id ? "You: " : ""}
                        {c.lastMessage?.text || "Started inquiry"}
                      </p>
                      {hasUnread && <span className="unread-badge">{c.unreadCount}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* 2. RIGHT PANEL: ACTIVE CHAT CONVERSATION */}
      <main className={`messenger-chat-pane ${!selectedId ? "hide-on-mobile" : ""}`}>
        {selectedConv ? (
          <>
            {/* Chat Room Header */}
            <header className="messenger-chat-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Back button for mobile view */}
                <button
                  type="button"
                  className="icon-btn mobile-back-btn"
                  onClick={() => setSelectedId(null)}
                  title="Back to all chats"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="chat-partner-avatar">
                  {selectedConv.partner?.name?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <h3 style={{ fontSize: "1.05rem", margin: 0 }}>{selectedConv.partner?.name}</h3>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "1px 6px",
                        borderRadius: 4,
                        fontWeight: 700,
                        background: selectedConv.myRole === "seller" ? "#DCFCE7" : "#DBEAFE",
                        color: selectedConv.myRole === "seller" ? "#166534" : "#1E40AF",
                      }}
                    >
                      {selectedConv.myRole === "seller" ? "Buyer Inquiry" : "Listing Owner"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "var(--mute)", marginTop: 2 }}>
                    <span>Listing: <strong>{selectedConv.listingTitle}</strong></span>
                    {selectedConv.listingPrice && <span style={{ color: "#2563EB", fontWeight: 700 }}>{selectedConv.listingPrice}</span>}
                    {selectedConv.listingLocality && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <MapPin size={11} /> {selectedConv.listingLocality}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status and Direct Shortcuts in Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {selectedConv.status === "accepted" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="status ok" style={{ fontSize: "0.75rem", padding: "3px 8px" }}>
                      <CheckCircle2 size={12} style={{ marginRight: 3 }} /> Connected
                    </span>
                    {selectedConv.partner?.phone && (
                      <>
                        <a
                          href={`tel:${selectedConv.partner.phone}`}
                          className="btn"
                          style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                          title="Call phone"
                        >
                          <Phone size={13} style={{ marginRight: 4 }} /> Call
                        </a>
                        <a
                          href={`https://wa.me/${selectedConv.partner.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn"
                          style={{ padding: "4px 8px", fontSize: "0.75rem", background: "#10B981", color: "white", borderColor: "#10B981" }}
                          title="Chat on WhatsApp"
                        >
                          WhatsApp
                        </a>
                      </>
                    )}
                  </div>
                ) : selectedConv.status === "pending" ? (
                  selectedConv.myRole === "seller" ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn primary"
                        style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                        onClick={() => handleDecide("accepted")}
                      >
                        <CheckCircle2 size={13} style={{ marginRight: 4 }} /> Accept Request
                      </button>
                      <button
                        className="btn"
                        style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                        onClick={() => handleDecide("declined")}
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <span className="status wait" style={{ fontSize: "0.75rem", padding: "3px 8px" }}>
                      Inquiry Pending
                    </span>
                  )
                ) : (
                  <span className="status bad" style={{ fontSize: "0.75rem", padding: "3px 8px" }}>
                    Declined
                  </span>
                )}
              </div>
            </header>

            {/* Chat Messages Stream */}
            <div className="messenger-chat-feed" ref={feedRef}>
              <div style={{ textAlign: "center", margin: "10px 0" }}>
                <span
                  style={{
                    background: "#E2E8F0",
                    color: "#475569",
                    fontSize: "0.75rem",
                    padding: "3px 10px",
                    borderRadius: 999,
                    fontWeight: 600,
                  }}
                >
                  Direct messaging for: {selectedConv.listingTitle}
                </span>
              </div>

              {messages.length === 0 ? (
                <div style={{ textAlign: "center", padding: 36, color: "var(--mute)" }}>
                  <p>No messages yet. Say hello to {selectedConv.partner?.name}!</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMe = m.senderId === user?.id || m.senderName === user?.name;
                  const time = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                  return (
                    <div key={idx} className={`msg-row ${isMe ? "me" : "them"}`}>
                      <div className={`msg-bubble ${isMe ? "me" : "them"}`}>
                        {!isMe && (
                          <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: 2, color: "#2563EB" }}>
                            {m.senderName}
                          </span>
                        )}
                        <span className="msg-text">{m.text}</span>
                        <div className="msg-meta">
                          <span>{time}</span>
                          {isMe && <CheckCheck size={12} color="#93C5FD" style={{ marginLeft: 4 }} />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Negotiation Chips */}
            <div className="messenger-quick-chips">
              <span style={{ fontSize: "0.75rem", color: "var(--mute)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                <Sparkles size={12} color="#F59E0B" /> Quick replies:
              </span>
              {QUICK_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="quick-chip"
                  onClick={() => handleSend(chip)}
                  disabled={sending}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Message Input Bar */}
            <form
              className="messenger-input-bar"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <input
                className="messenger-input"
                placeholder={`Message ${selectedConv.partner?.name}... (Enter to send)`}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button
                type="submit"
                className="btn primary"
                disabled={!text.trim() || sending}
                style={{ padding: "8px 16px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Send size={15} />
                <span>Send</span>
              </button>
            </form>
          </>
        ) : (
          <div className="messenger-empty-state">
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#EFF6FF", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
              <MessageSquare size={32} color="#2563EB" />
            </div>
            <h3 style={{ fontSize: "1.2rem", margin: "0 0 6px" }}>Your Local Messages</h3>
            <p style={{ margin: 0, color: "var(--mute)", maxWidth: "340px", fontSize: "0.9rem" }}>
              Select a conversation from the left to chat in real time with room owners, vehicle hosts, and neighbors.
            </p>
          </div>
        )}
      </main>
    </div>
    </>
  );
}
