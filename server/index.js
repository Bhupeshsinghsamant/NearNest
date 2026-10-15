import express from "express";
import cors from "cors";
import { readFileSync } from "node:fs";
import { hashPassword, verifyPassword, signToken, requireAuth, requireAdmin } from "./auth.js";

const data = JSON.parse(readFileSync(new URL("./data.json", import.meta.url)));
const app = express();
app.use(cors());
app.use(express.json());

// ---- users (in memory; swap for a database in the real build) ----
const users = [
  { id: 1, name: "Demo User", email: "demo@localconnect.in", area: "Your area", role: "user", passwordHash: hashPassword("demo123") },
  { id: 2, name: "Admin", email: "admin@localconnect.in", area: "Safety team", role: "admin", passwordHash: hashPassword("admin123") },
];
const publicUser = ({ id, name, email, area, role }) => ({ id, name, email, area, role });

app.post("/api/auth/signup", (req, res) => {
  const { name = "", email = "", password = "", area = "" } = req.body;
  if (name.trim().length < 2) return res.status(400).json({ error: "Enter your full name." });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
  if (users.some((u) => u.email === email.toLowerCase())) {
    return res.status(409).json({ error: "An account with this email already exists. Try logging in." });
  }
  const user = { id: Date.now(), name: name.trim(), email: email.toLowerCase(), area: area.trim(), role: "user", passwordHash: hashPassword(password) };
  users.push(user);
  res.status(201).json({ user: publicUser(user), token: signToken({ id: user.id, role: user.role }) });
});

app.post("/api/auth/login", (req, res) => {
  const { email = "", password = "" } = req.body;
  const user = users.find((u) => u.email === email.toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  res.json({ user: publicUser(user), token: signToken({ id: user.id, role: user.role }) });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = users.find((u) => u.id === req.userId);
  if (!user) return res.status(401).json({ error: "Account not found." });
  res.json({ user: publicUser(user) });
});

// ---- app data ----
// Flagged accounts/areas are visible to admins only.
app.get("/api/flags", requireAuth, requireAdmin, (req, res) => res.json(data.flags));

// GET /api/:resource -> rooms | lostfound | rentals | services | alerts | flags
app.get("/api/:resource", (req, res) => {
  const list = data[req.params.resource];
  if (!list) return res.status(404).json({ error: "Unknown resource" });
  res.json(list);
});

// POST /api/:resource -> add a listing / post / alert (login required, kept in memory)
app.post("/api/:resource", requireAuth, (req, res) => {
  if (req.params.resource === "flags" && req.role !== "admin") return res.status(403).json({ error: "Admins only." });
  const list = data[req.params.resource];
  if (!list) return res.status(404).json({ error: "Unknown resource" });
  const item = { id: Date.now(), km: 0.2, ang: Math.round(Math.random() * 360), minsAgo: 0, ...req.body, userId: req.userId };
  list.unshift(item);
  res.status(201).json(item);
});

// PATCH /api/flags/:id -> restrict or clear a flagged account/region (admin only)
app.patch("/api/flags/:id", requireAuth, requireAdmin, (req, res) => {
  const flag = data.flags.find((f) => String(f.id) === req.params.id);
  if (!flag) return res.status(404).json({ error: "Not found" });
  flag.status = req.body.status;
  res.json(flag);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Local Connect API running on http://localhost:${PORT}`));
