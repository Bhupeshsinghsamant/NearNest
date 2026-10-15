import seed from "./data.json";

export const DEMO = { email: "demo@localconnect.in", password: "demo123" };
export const ADMIN_DEMO = { email: "admin@localconnect.in", password: "admin123" };

function authHeaders() {
  try {
    const s = JSON.parse(localStorage.getItem("lc_session") || "null");
    return s?.token ? { Authorization: `Bearer ${s.token}` } : {};
  } catch {
    return {};
  }
}

// Tries the Node API first. If the server is not running, falls back to the
// bundled sample data so the UI always works in a demo.
export async function get(resource) {
  try {
    const res = await fetch(`/api/${resource}`, { headers: authHeaders() });
    if (!res.ok) throw new Error("bad response");
    return await res.json();
  } catch {
    return seed[resource];
  }
}

export async function post(resource, body) {
  const fallback = { id: Date.now(), km: 0.2, ang: Math.round(Math.random() * 360), minsAgo: 0, ...body };
  try {
    const res = await fetch(`/api/${resource}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("bad response");
    return await res.json();
  } catch {
    return fallback;
  }
}

export async function patch(resource, id, body) {
  try {
    await fetch(`/api/${resource}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
  } catch {
    /* demo mode: local state is enough */
  }
}

// ---------- auth ----------
// Calls the Node API. Returns null when the server can't be reached, so the
// app can fall back to browser-only demo accounts.
async function callAuth(path, body) {
  let res;
  try {
    res = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return null;
  }
  if (res.status >= 500) return null; // dev proxy returns 5xx when the API is down
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data;
}

// Offline demo accounts live in this browser only (not secure, demo use only).
const USERS_KEY = "lc_demo_users";
const readUsers = () => {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; }
};
async function sha(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const strip = ({ id, name, email, area }) => ({ id, name, email, area, role: "user" });

async function localSignup({ name, email, area, password }) {
  const users = readUsers();
  if (users.some((u) => u.email === email) || email === DEMO.email || email === ADMIN_DEMO.email) {
    throw new Error("An account with this email already exists. Try logging in.");
  }
  const user = { id: Date.now(), name, email, area, hash: await sha(password) };
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
  return { user: strip(user), token: "demo-offline" };
}

async function localLogin({ email, password }) {
  if (email === DEMO.email && password === DEMO.password) {
    return { user: { id: 0, name: "Demo User", email, area: "Your area", role: "user" }, token: "demo-offline" };
  }
  if (email === ADMIN_DEMO.email && password === ADMIN_DEMO.password) {
    return { user: { id: -1, name: "Admin", email, area: "Safety team", role: "admin" }, token: "demo-offline" };
  }
  const user = readUsers().find((u) => u.email === email);
  if (!user || user.hash !== (await sha(password))) throw new Error("Email or password is incorrect.");
  return { user: strip(user), token: "demo-offline" };
}

export async function signup(body) {
  return (await callAuth("signup", body)) ?? (await localSignup(body));
}

export async function login(body) {
  return (await callAuth("login", body)) ?? (await localLogin(body));
}
