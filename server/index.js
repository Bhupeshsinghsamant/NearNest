import "dotenv/config";
import express from "express";
import cors from "cors";
import { readFileSync } from "node:fs";
import { connectDB } from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import listingRoutes from "./src/routes/listingRoutes.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { requireAuth, requireAdmin } from "./src/middleware/auth.js";
import { User } from "./src/models/User.js";
import { Listing } from "./src/models/Listing.js";

const app = express();
app.use(cors());
app.use(express.json());

// Initialize MongoDB Connection
connectDB().catch((err) => {
  console.warn("⚠️  Server started without database connection:", err.message);
});

// Health check endpoint
app.get("/api/v1/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    database: Listing.db?.readyState === 1 ? "connected" : "disconnected",
  });
});

// Modern Mobile API v1 Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/listings", listingRoutes);

// -------------------------------------------------------------
// Backwards-Compatibility Adapter for Existing React/Vite Web App
// -------------------------------------------------------------
const legacySeed = JSON.parse(readFileSync(new URL("./data.json", import.meta.url)));

// Forward legacy auth routes to v1 handlers
app.use("/api/auth", authRoutes);

// Legacy flags route (admin only)
app.get("/api/flags", requireAuth, requireAdmin, (req, res) => {
  res.json(legacySeed.flags || []);
});

// Legacy generic resource GET endpoint
app.get("/api/:resource", async (req, res, next) => {
  const resource = req.params.resource;
  const typeMap = {
    rooms: "room",
    rentals: "vehicle",
    lostfound: "lost_found",
    services: "service",
  };

  const targetType = typeMap[resource];
  if (!targetType) {
    if (legacySeed[resource]) return res.json(legacySeed[resource]);
    return res.status(404).json({ error: "Unknown resource" });
  }

  try {
    if (Listing.db?.readyState === 1) {
      const items = await Listing.find({ type: targetType, status: "active" }).sort({ createdAt: -1 });
      if (items.length > 0) {
        // Map to format expected by web client
        const webFormatted = items.map((item) => {
          const base = {
            id: item._id.toString(),
            title: item.title,
            km: 0.8,
            ang: 45,
            ...item.toObject(),
          };
          if (targetType === "room") {
            base.rent = item.roomDetails?.rent || 0;
            base.owner = item.ownerName;
            base.amenities = item.roomDetails?.amenities || [];
            base.verified = item.roomDetails?.verified || false;
          } else if (targetType === "vehicle") {
            base.name = item.title;
            base.type = item.vehicleDetails?.vehicleType || "Bike";
            base.rate = item.vehicleDetails?.rentalPrice || 0;
            base.owner = item.ownerName;
            base.available = item.vehicleDetails?.available ?? true;
          } else if (targetType === "lost_found") {
            base.kind = item.lostFoundDetails?.kind || "found";
            base.where = item.locality;
            base.by = item.ownerName;
            base.minsAgo = 10;
          } else if (targetType === "service") {
            base.name = item.title;
            base.trade = item.serviceDetails?.serviceCategory || "Other";
            base.rating = item.serviceDetails?.rating || 5.0;
            base.jobs = item.serviceDetails?.jobsCount || 0;
            base.price = item.serviceDetails?.pricingInfo || "";
            base.available = item.serviceDetails?.available ?? true;
          }
          return base;
        });
        return res.json(webFormatted);
      }
    }
    // Fallback to legacy seed if no db items yet
    return res.json(legacySeed[resource] || []);
  } catch (err) {
    next(err);
  }
});

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
export const server = app.listen(PORT, () => {
  console.log(`🚀 LocalConnect API Server listening on port ${PORT}`);
});

export default app;
