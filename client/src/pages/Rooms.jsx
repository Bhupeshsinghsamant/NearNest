import { useState, useEffect, useRef } from "react";
import {
  BadgeCheck,
  Plus,
  Trash2,
  CheckCircle2,
  Camera,
  Video,
  Image as ImageIcon,
  Film,
  Star,
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  Eye,
  X,
} from "lucide-react";
import MapView from "../components/MapView.jsx";
import { Empty, Field, Modal, PageHead, Segmented } from "../components/ui.jsx";
import { useResource, useStore } from "../store.jsx";
import { post, get, patch, del, uploadMedia } from "../api.js";

export default function Rooms() {
  const { radius, notify, user, userLocation } = useStore();
  const [rooms, setRooms, loadingRooms] = useResource("rooms");
  const [mode, setMode] = useState("find");
  const [sel, setSel] = useState(null);
  const [sent, setSent] = useState({});
  const [adding, setAdding] = useState(false);
  const [inbox, setInbox] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [viewingMedia, setViewingMedia] = useState(null);

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
  const pins = list.map((r) => ({
    ...r,
    kind: "rooms",
    label: r.title,
    latitude: r.latitude,
    longitude: r.longitude,
  }));

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
        latitude: form.latitude || userLocation?.lat || 28.6139,
        longitude: form.longitude || userLocation?.lng || 77.2090,
        amenities: form.amenities ? form.amenities.split(",").map((s) => s.trim()) : ["Attached Bath", "WiFi"],
        photos: form.photos || [],
        videos: form.videos || [],
        verified: false,
      });
      setRooms((r) => [item, ...r]);
      setAdding(false);
      notify("Room successfully saved to database with persistent media. Visible to all nearby users.");
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
      notify("Room listing and attached media removed from database.");
    } catch (err) {
      notify(err.message || "Failed to delete room listing.");
    }
  };

  return (
    <>
      <PageHead
        title="Rooms"
        sub="Direct from verified owners with genuine photos, video tours, and live map locations."
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
              const photos = r.photos || [];
              const videos = r.videos || [];
              const coverPhoto = photos.find((p) => p.isCover) || photos[0];
              const coverUrl = typeof coverPhoto === "string" ? coverPhoto : coverPhoto?.url;

              return (
                <article key={roomId} className={`card ${sel === roomId ? "sel" : ""}`} onClick={() => setSel(roomId)}>
                  {coverUrl && (
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "170px",
                        marginBottom: "12px",
                        borderRadius: "10px",
                        overflow: "hidden",
                        background: "#0F172A",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingMedia(r);
                      }}
                    >
                      <img
                        src={coverUrl}
                        alt={r.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: "8px",
                          right: "8px",
                          background: "rgba(0,0,0,0.75)",
                          color: "#FFFFFF",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 600,
                          display: "flex",
                          gap: "6px",
                          alignItems: "center",
                        }}
                      >
                        <Eye size={12} />
                        <span>{photos.length} photos</span>
                        {videos.length > 0 && <span>· 🎥 {videos.length}</span>}
                      </div>
                    </div>
                  )}

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
                    {photos.length > 0 && (
                      <button
                        className="btn"
                        style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingMedia(r);
                        }}
                      >
                        <Eye size={13} style={{ marginRight: 4 }} /> View Media ({photos.length + videos.length})
                      </button>
                    )}

                    {isOwner ? (
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "auto" }}>
                        <span className="status ok"><CheckCircle2 size={13} style={{ marginRight: 4 }} /> Your room</span>
                        <button className="btn" style={{ borderColor: "#ef4444", color: "#ef4444" }} onClick={(e) => { e.stopPropagation(); deleteRoom(roomId); }}>
                          <Trash2 size={13} style={{ marginRight: 4 }} /> Delete
                        </button>
                      </div>
                    ) : sent[roomId] ? (
                      <span className="status wait" style={{ marginLeft: "auto" }}>Inquiry sent to {r.owner}</span>
                    ) : (
                      <button className="btn primary" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); request(r); }}>
                        Request to contact
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <MapView
            pins={pins}
            radius={radius}
            selected={sel && `rooms-${sel}`}
            onSelect={(p) => setSel(p.id)}
            height={520}
          />
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

      {adding && (
        <AddRoomModal
          onClose={() => setAdding(false)}
          onSave={addRoom}
          defaultLocality={user?.area}
          defaultCoords={userLocation}
          notify={notify}
        />
      )}

      {viewingMedia && (
        <MediaViewerModal
          listing={viewingMedia}
          onClose={() => setViewingMedia(null)}
        />
      )}
    </>
  );
}

/**
 * Modal to list a new room with Camera, Gallery Media Upload, Cover Photo, and Map Pin
 */
function AddRoomModal({ onClose, onSave, defaultLocality, defaultCoords, notify }) {
  const [form, setForm] = useState({
    title: "",
    rent: "",
    locality: defaultLocality || "",
    amenities: "Attached Bath, WiFi, Balcony",
    latitude: defaultCoords?.lat || 28.6139,
    longitude: defaultCoords?.lng || 77.2090,
  });

  const [photos, setPhotos] = useState([]); // [{ url, name, size, isCover }]
  const [videos, setVideos] = useState([]); // [{ url, name, size }]
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const camPhotoRef = useRef(null);
  const camVideoRef = useRef(null);
  const galPhotoRef = useRef(null);
  const galVideoRef = useRef(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Handle media file selection & upload to persistent server
  const handleFiles = async (e, type) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;

    // Check limits
    if (type === "photo" && photos.length + fileList.length > 10) {
      notify("Maximum 10 photos allowed per listing.");
      return;
    }
    if (type === "video" && videos.length + fileList.length > 2) {
      notify("Maximum 2 videos allowed per listing.");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(`Uploading ${fileList.length} file(s)...`);

      const uploaded = await uploadMedia(fileList);

      const newPhotos = [];
      const newVideos = [];

      for (const f of uploaded) {
        if (f.type === "video") {
          newVideos.push(f);
        } else {
          newPhotos.push({
            ...f,
            isCover: photos.length === 0 && newPhotos.length === 0, // Cover if first
          });
        }
      }

      setPhotos((prev) => [...prev, ...newPhotos]);
      setVideos((prev) => [...prev, ...newVideos]);
      notify(`Uploaded ${uploaded.length} file(s) successfully.`);
    } catch (err) {
      notify(err.message || "Upload failed. Please check file format and sizes.");
    } finally {
      setUploading(false);
      setUploadProgress("");
      e.target.value = "";
    }
  };

  const setCover = (index) => {
    setPhotos((prev) =>
      prev.map((p, idx) => ({ ...p, isCover: idx === index }))
    );
  };

  const removePhoto = (index) => {
    setPhotos((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (next.length > 0 && !next.some((p) => p.isCover)) {
        next[0].isCover = true;
      }
      return next;
    });
  };

  const removeVideo = (index) => {
    setVideos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const movePhoto = (index, direction) => {
    setPhotos((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm((prev) => ({
            ...prev,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }));
          notify("Current GPS coordinates applied.");
        },
        () => notify("Unable to get current GPS location.")
      );
    }
  };

  return (
    <Modal title="List a Room for Rent" onClose={onClose}>
      <Field label="Title / Description">
        <input
          value={form.title}
          onChange={set("title")}
          placeholder="e.g. 2 floor house (4 rooms + 2 bathroom)"
        />
      </Field>

      <Field label="Rent per month (Rs)">
        <input
          type="number"
          value={form.rent}
          onChange={set("rent")}
          placeholder="50000"
        />
      </Field>

      <Field label="Locality / Area">
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            style={{ flex: 1 }}
            value={form.locality}
            onChange={set("locality")}
            placeholder="e.g. Sector 15, Near City Center"
          />
          <button
            type="button"
            className="btn"
            onClick={detectLocation}
            title="Use current GPS location"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <LocateFixed size={14} /> GPS
          </button>
        </div>
      </Field>

      <Field label="Amenities (comma separated)">
        <input
          value={form.amenities}
          onChange={set("amenities")}
          placeholder="Attached Bath, WiFi, Balcony, Parking"
        />
      </Field>

      {/* Media Upload Section */}
      <div style={{ margin: "16px 0", padding: "14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <label style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--fg)" }}>
            Photos & Videos ({photos.length}/10 photos, {videos.length}/2 videos)
          </label>
          {uploading && <span style={{ fontSize: "0.8rem", color: "#2563EB", fontWeight: 600 }}>{uploadProgress}</span>}
        </div>

        {/* Hidden inputs */}
        <input type="file" accept="image/*" capture="environment" ref={camPhotoRef} style={{ display: "none" }} onChange={(e) => handleFiles(e, "photo")} />
        <input type="file" accept="video/*" capture="environment" ref={camVideoRef} style={{ display: "none" }} onChange={(e) => handleFiles(e, "video")} />
        <input type="file" accept="image/*" multiple ref={galPhotoRef} style={{ display: "none" }} onChange={(e) => handleFiles(e, "photo")} />
        <input type="file" accept="video/*" multiple ref={galVideoRef} style={{ display: "none" }} onChange={(e) => handleFiles(e, "video")} />

        {/* Action Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
          <button type="button" className="btn" disabled={uploading || photos.length >= 10} onClick={() => camPhotoRef.current?.click()} style={{ justifyContent: "center", gap: 6 }}>
            <Camera size={15} /> Take Photo
          </button>
          <button type="button" className="btn" disabled={uploading || photos.length >= 10} onClick={() => galPhotoRef.current?.click()} style={{ justifyContent: "center", gap: 6 }}>
            <ImageIcon size={15} /> Upload Photos
          </button>
          <button type="button" className="btn" disabled={uploading || videos.length >= 2} onClick={() => camVideoRef.current?.click()} style={{ justifyContent: "center", gap: 6 }}>
            <Video size={15} /> Record Video
          </button>
          <button type="button" className="btn" disabled={uploading || videos.length >= 2} onClick={() => galVideoRef.current?.click()} style={{ justifyContent: "center", gap: 6 }}>
            <Film size={15} /> Upload Video
          </button>
        </div>

        {/* Photo Previews */}
        {photos.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "8px", marginBottom: "10px" }}>
            {photos.map((p, idx) => (
              <div key={idx} style={{ position: "relative", height: "85px", borderRadius: "8px", overflow: "hidden", border: p.isCover ? "2px solid #2563EB" : "1px solid var(--border)" }}>
                <img src={p.url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {p.isCover && (
                  <span style={{ position: "absolute", top: 3, left: 3, background: "#2563EB", color: "white", fontSize: "9px", padding: "1px 4px", borderRadius: 4, fontWeight: 700 }}>
                    Cover
                  </span>
                )}
                <div style={{ position: "absolute", bottom: 2, left: 2, right: 2, display: "flex", justifyContent: "space-between", background: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "1px 2px" }}>
                  <button type="button" onClick={() => movePhoto(idx, -1)} disabled={idx === 0} style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: 0 }}>
                    <ChevronLeft size={13} />
                  </button>
                  {!p.isCover && (
                    <button type="button" onClick={() => setCover(idx)} title="Make Cover Photo" style={{ background: "none", border: "none", color: "#FBBF24", cursor: "pointer", padding: 0 }}>
                      <Star size={12} />
                    </button>
                  )}
                  <button type="button" onClick={() => movePhoto(idx, 1)} disabled={idx === photos.length - 1} style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: 0 }}>
                    <ChevronRight size={13} />
                  </button>
                  <button type="button" onClick={() => removePhoto(idx)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: 0 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Video Previews */}
        {videos.length > 0 && (
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            {videos.map((v, idx) => (
              <div key={idx} style={{ position: "relative", width: "140px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)", background: "#000" }}>
                <video src={v.url} controls style={{ width: "100%", height: "80px", objectFit: "cover" }} />
                <button
                  type="button"
                  onClick={() => removeVideo(idx)}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    background: "rgba(0,0,0,0.7)",
                    color: "#EF4444",
                    border: "none",
                    borderRadius: "50%",
                    padding: 3,
                    cursor: "pointer",
                  }}
                  title="Remove video"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        className="btn primary wide"
        disabled={!form.title || !form.rent || uploading}
        onClick={() => onSave({ ...form, photos, videos })}
      >
        {uploading ? "Uploading media..." : "Publish Room to Database"}
      </button>
    </Modal>
  );
}

/**
 * High-Res Media Viewer Modal for published listing photos and videos
 */
function MediaViewerModal({ listing, onClose }) {
  const photos = listing.photos || [];
  const videos = listing.videos || [];
  const [tab, setTab] = useState(photos.length > 0 ? "photos" : "videos");
  const [photoIndex, setPhotoIndex] = useState(0);

  const currentPhoto = photos[photoIndex];
  const photoUrl = typeof currentPhoto === "string" ? currentPhoto : currentPhoto?.url;

  return (
    <Modal title={`${listing.title} — Media Gallery`} onClose={onClose}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        {photos.length > 0 && (
          <button
            className={`btn ${tab === "photos" ? "primary" : ""}`}
            onClick={() => setTab("photos")}
            style={{ fontSize: "0.85rem", padding: "4px 12px" }}
          >
            Photos ({photos.length})
          </button>
        )}
        {videos.length > 0 && (
          <button
            className={`btn ${tab === "videos" ? "primary" : ""}`}
            onClick={() => setTab("videos")}
            style={{ fontSize: "0.85rem", padding: "4px 12px" }}
          >
            Video Tours ({videos.length})
          </button>
        )}
      </div>

      {tab === "photos" && photos.length > 0 && (
        <div>
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "280px",
              background: "#0F172A",
              borderRadius: "10px",
              overflow: "hidden",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              src={photoUrl}
              alt="Room view"
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setPhotoIndex((i) => (i > 0 ? i - 1 : photos.length - 1))}
                  style={{
                    position: "absolute",
                    left: 8,
                    background: "rgba(0,0,0,0.6)",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoIndex((i) => (i < photos.length - 1 ? i + 1 : 0))}
                  style={{
                    position: "absolute",
                    right: 8,
                    background: "rgba(0,0,0,0.6)",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail row */}
          {photos.length > 1 && (
            <div style={{ display: "flex", gap: "6px", marginTop: "10px", overflowX: "auto", paddingBottom: "4px" }}>
              {photos.map((p, idx) => {
                const u = typeof p === "string" ? p : p?.url;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoIndex(idx)}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 6,
                      overflow: "hidden",
                      border: idx === photoIndex ? "2px solid #2563EB" : "1px solid var(--border)",
                      padding: 0,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "videos" && videos.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {videos.map((v, idx) => (
            <div key={idx} style={{ borderRadius: "10px", overflow: "hidden", background: "#000" }}>
              <video
                src={v.url}
                controls
                style={{ width: "100%", maxHeight: "280px" }}
              />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
