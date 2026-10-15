// Auth helpers using only Node's built-in crypto (no extra packages).
// Passwords are hashed with scrypt; tokens are HMAC-signed and expire after 7 days.
import crypto from "node:crypto";

const SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const test = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), test);
}

const sign = (body) => crypto.createHmac("sha256", SECRET).update(body).digest("base64url");

export function signToken(payload, days = 7) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + days * 864e5 })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyToken(token) {
  try {
    if (!token) return null;
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const a = Buffer.from(sig);
    const b = Buffer.from(sign(body));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const payload = verifyToken(header.startsWith("Bearer ") ? header.slice(7) : null);
  if (!payload) return res.status(401).json({ error: "Please log in first." });
  req.userId = payload.id;
  req.role = payload.role || "user";
  next();
}

export function requireAdmin(req, res, next) {
  if (req.role !== "admin") return res.status(403).json({ error: "Admins only." });
  next();
}
