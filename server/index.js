import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

import express from "express";
import cors from "cors";
import { connectDB } from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import listingRoutes from "./src/routes/listingRoutes.js";
import requestRoutes from "./src/routes/requestRoutes.js";
import { updateListing, deleteListing } from "./src/controllers/listingController.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { requireAuth, requireAdmin } from "./src/middleware/auth.js";
import { Listing } from "./src/models/Listing.js";

const app = express();
app.use(cors());
app.use(express.json());

// Initialize MongoDB Atlas Connection
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
app.use("/api/v1/requests", requestRoutes);

// -------------------------------------------------------------
// Real MongoDB Routes for Web Client (No Demo Fallbacks)
// -------------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);

// Flags (Admin only, empty array by default unless real flags exist)
app.get("/api/flags", requireAuth, requireAdmin, (req, res) => {
  res.json([]);
});

// Web Client: GET /api/:resource (rooms | rentals | lostfound | services)
app.get("/api/:resource", async (req, res, next) => {
  const resource = req.params.resource;
  const typeMap = {
    rooms: "room",
    rentals: "vehicle",
    lostfound: "lost_found",
    services: "service",
    alerts: "alert",
  };

  const targetType = typeMap[resource];
  if (!targetType) {
    return res.status(404).json({ error: `Unknown resource '${resource}'` });
  }

  try {
    // Read ONLY from real MongoDB Atlas database
    const items = await Listing.find({ type: targetType, status: "active" }).sort({ createdAt: -1 });

    const webFormatted = items.map((item) => {
      const base = {
        id: item._id.toString(),
        title: item.title,
        description: item.description,
        locality: item.locality,
        ownerId: item.ownerId.toString(),
        owner: item.ownerName,
        km: 0.8,
        ang: 45,
        ...item.toObject(),
      };

      if (targetType === "room") {
        base.rent = item.roomDetails?.rent || 0;
        base.amenities = item.roomDetails?.amenities || [];
        base.verified = item.roomDetails?.verified || false;
      } else if (targetType === "vehicle") {
        base.name = item.title;
        base.type = item.vehicleDetails?.vehicleType || "Bike";
        base.rate = item.vehicleDetails?.rentalPrice || 0;
        base.available = item.vehicleDetails?.available ?? true;
      } else if (targetType === "lost_found") {
        base.kind = item.lostFoundDetails?.kind || "found";
        base.where = item.locality;
        base.by = item.ownerName;
        base.minsAgo = Math.max(1, Math.round((Date.now() - new Date(item.createdAt).getTime()) / 60000));
      } else if (targetType === "service") {
        base.name = item.title;
        base.trade = item.serviceDetails?.serviceCategory || "Other";
        base.rating = item.serviceDetails?.rating || 5.0;
        base.jobs = item.serviceDetails?.jobsCount || 0;
        base.price = item.serviceDetails?.pricingInfo || "";
        base.available = item.serviceDetails?.available ?? true;
      } else if (targetType === "alert") {
        base.type = item.alertDetails?.alertType || "Stuck";
        base.helpers = item.alertDetails?.helpersCount || 0;
        base.minsAgo = Math.max(1, Math.round((Date.now() - new Date(item.createdAt).getTime()) / 60000));
        base.by = item.ownerName;
      }

      return base;
    });

    return res.json(webFormatted);
  } catch (err) {
    next(err);
  }
});

// Web Client: POST /api/:resource (rooms | rentals | lostfound | services)
// Authenticated user creates a persistent listing in MongoDB Atlas
app.post("/api/:resource", requireAuth, async (req, res, next) => {
  const resource = req.params.resource;
  const typeMap = {
    rooms: "room",
    rentals: "vehicle",
    lostfound: "lost_found",
    services: "service",
    alerts: "alert",
  };

  const targetType = typeMap[resource];
  if (!targetType) {
    return res.status(404).json({ error: `Cannot post to unknown resource '${resource}'` });
  }

  try {
    const body = req.body || {};
    const listingPayload = {
      ownerId: req.userId,
      ownerName: req.userName,
      type: targetType,
      title: body.title || body.name || "Untitled Listing",
      description: body.description || "",
      locality: body.locality || body.where || req.user?.area || "Local Area",
      status: "active",
      photos: [],
    };

    if (targetType === "room") {
      listingPayload.roomDetails = {
        rent: Number(body.rent) || 0,
        period: body.period || "month",
        amenities: Array.isArray(body.amenities) ? body.amenities : ["WiFi"],
        verified: false,
      };
    } else if (targetType === "vehicle") {
      listingPayload.vehicleDetails = {
        vehicleType: body.type || "Bike",
        rentalPrice: Number(body.rate) || 0,
        pricingPeriod: "hour",
        available: true,
      };
    } else if (targetType === "lost_found") {
      listingPayload.lostFoundDetails = {
        kind: body.kind === "lost" ? "lost" : "found",
        itemName: body.title || "",
        incidentDate: new Date(),
      };
    } else if (targetType === "service") {
      listingPayload.serviceDetails = {
        serviceCategory: body.trade || "Other",
        pricingInfo: body.price || "Contact for quote",
        rating: 5.0,
        jobsCount: 0,
        available: true,
      };
    } else if (targetType === "alert") {
      listingPayload.alertDetails = {
        alertType: body.type || "Stuck",
        helpersCount: 0,
      };
    }

    const created = await Listing.create(listingPayload);
    console.log(`✅ [MongoDB Atlas] New ${targetType} listing persisted: "${created.title}" by ${req.userName}`);

    // Return format expected by web client
    const webItem = {
      id: created._id.toString(),
      title: created.title,
      owner: created.ownerName,
      ownerId: created.ownerId.toString(),
      locality: created.locality,
      km: 0.5,
      ang: 30,
      rent: created.roomDetails?.rent,
      amenities: created.roomDetails?.amenities,
      verified: created.roomDetails?.verified,
      name: created.title,
      type: created.vehicleDetails?.vehicleType || created.alertDetails?.alertType,
      rate: created.vehicleDetails?.rentalPrice,
      available: created.vehicleDetails?.available,
      kind: created.lostFoundDetails?.kind,
      where: created.locality,
      by: created.ownerName,
      trade: created.serviceDetails?.serviceCategory,
      price: created.serviceDetails?.pricingInfo,
      rating: created.serviceDetails?.rating,
      jobs: created.serviceDetails?.jobsCount,
      helpers: created.alertDetails?.helpersCount || 0,
      minsAgo: 1,
    };

    return res.status(201).json(webItem);
  } catch (err) {
    next(err);
  }
});

// Web Client: PATCH & DELETE listing routes (Owner / Admin protected)
app.patch("/api/:resource/:id", requireAuth, updateListing);
app.delete("/api/:resource/:id", requireAuth, deleteListing);

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
export const server = app.listen(PORT, () => {
  console.log(`🚀 LocalConnect API Server listening on port ${PORT}`);
});

export default app;
