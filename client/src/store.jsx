import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { get, login as apiLogin, signup as apiSignup } from "./api.js";

const Ctx = createContext(null);

const SESSION_KEY = "lc_session";
const readSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
};

export function StoreProvider({ children }) {
  const [radius, setRadius] = useState(3);
  const [toast, setToast] = useState(null);
  const [session, setSession] = useState(readSession);

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
    <Ctx.Provider value={{ radius, setRadius, notify, user: session?.user || null, login, signup, logout }}>
      {children}
      {toast && <div className="toast" role="status">{toast}</div>}
    </Ctx.Provider>
  );
}

export const useStore = () => useContext(Ctx);

export function useResource(name) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    get(name)
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
  }, [name]);
  return [items, setItems, loading];
}
