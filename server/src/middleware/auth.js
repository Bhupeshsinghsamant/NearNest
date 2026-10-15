import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_dev_secret_localconnect_2026";

export function signToken(payload, expiresIn = "7d") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Please provide a valid Bearer token.",
    });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);

  if (!decoded || !decoded.id) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token. Please log in again.",
    });
  }

  try {
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User associated with this token no longer exists.",
      });
    }

    req.user = user;
    req.userId = user._id.toString();
    req.userName = user.name;
    req.userRole = user.role;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Authentication check failed.",
    });
  }
}

export function requireAdmin(req, res, next) {
  if (req.userRole !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Access denied. Administrator privileges required.",
    });
  }
  next();
}
