import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { get, login as apiLogin, signup as apiSignup } from "./api.js";

const Ctx = createContext(null);

const SESSION_KEY = "lc_session";
const readSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
};

const DEFAULT_COORDS = { lat: 28.6139, lng: 77.2090 }; // Central default

export function StoreProvider({ children }) {
  const [radius, setRadius] = useState(10);
  const [userLocation, setUserLocation] = useState(() => {
    try {
      const saved = localStorage.getItem("lc_coords");
      return saved ? JSON.parse(saved) : DEFAULT_COORDS;
    } catch {
      return DEFAULT_COORDS;
    }
  });
  const [toast, setToast] = useState(null);
  const [session, setSession] = useState(readSession);

  // Auto-detect browser location once if available
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(coords);
          try {
            localStorage.setItem("lc_coords", JSON.stringify(coords));
          } catch {}
        },
        () => {
          // Keep default if permission denied
        },
        { timeout: 8000 }
      );
    }
  }, []);

  // Auto-sync authenticated user role & profile from MongoDB Atlas
  useEffect(() => {
    if (session?.token) {
      get("auth/me")
        .then((res) => {
          const freshUser = res?.user || res?.data || (res?.id ? res : null);
          if (freshUser && (freshUser.id || freshUser._id)) {
            setSession((prev) => {
              if (!prev) return prev;
              const updated = { ...prev, user: { ...prev.user, ...freshUser } };
              try { localStorage.setItem(SESSION_KEY, JSON.stringify(updated)); } catch {}
              return updated;
            });
          }
        })
        .catch(() => {});
    }
  }, []);

  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!session?.token) return;
    try {
      const data = await get("requests/unread-count");
      if (typeof data?.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // Ignore background poll errors
    }
  }, [session?.token]);

  // Periodic background unread count poller every 4.5s
  useEffect(() => {
    if (!session?.token) {
      setUnreadCount(0);
      return;
    }
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 4500);
    return () => clearInterval(interval);
  }, [session?.token, refreshUnreadCount]);

  const updateLocation = (coords) => {
    setUserLocation(coords);
    try {
      localStorage.setItem("lc_coords", JSON.stringify(coords));
    } catch {}
  };

  const notify = useCallback((message) => {
    setToast(message);
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => setToast(null), 3200);
  }, []);

  const start = (data, message) => {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch { /* storage blocked */ }
    setSession(data);
    notify(message);
  };
  const first = (u) => u.name.split(" ")[0];
  const login = async (creds) => {
    const data = await apiLogin(creds);
    start(data, `Welcome back, ${first(data.user)}.`);
  };
  const signup = async (info) => {
    const data = await apiSignup(info);
    start(data, `Account created. Welcome, ${first(data.user)}.`);
  };
  const logout = () => {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    setSession(null);
    notify("You're logged out.");
  };

  return (
    <Ctx.Provider
      value={{
        radius,
        setRadius,
        userLocation,
        setUserLocation: updateLocation,
        notify,
        user: session?.user || null,
        unreadCount,
        refreshUnreadCount,
        login,
        signup,
        logout,
      }}
    >
      {children}
      {toast && <div className="toast" role="status">{toast}</div>}
    </Ctx.Provider>
  );
}

export const useStore = () => useContext(Ctx);

export function useResource(name, extraParams = null) {
  const { userLocation, radius } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(() => {
    let live = true;
    const params = {
      lat: userLocation?.lat,
      lng: userLocation?.lng,
      radius,
      ...extraParams,
    };

    get(name, params)
      .then((d) => {
        if (live) {
          setItems(Array.isArray(d) ? d : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn(`[LocalConnect] Failed to fetch resource '${name}':`, err.message);
        if (live) {
          setItems([]);
          setLoading(false);
        }
      });

    return () => {
      live = false;
    };
  }, [name, userLocation?.lat, userLocation?.lng, radius]);

  useEffect(() => {
    return fetchItems();
  }, [fetchItems]);

  return [items, setItems, loading, fetchItems];
}
