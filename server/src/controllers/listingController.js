import { Listing } from "../models/Listing.js";
import { cleanupMediaFiles } from "../routes/uploadRoutes.js";

export async function getListings(req, res, next) {
  try {
    const {
      type,
      status = "active",
      search,
      page = 1,
      limit = 20,
      // Room filters
      maxRent,
      minRent,
      // Vehicle filters
      vehicleType,
      // Lost & Found filters
      kind,
      // Service filters
      serviceCategory,
    } = req.query;

    const query = {};

    if (type) {
      query.type = type;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [{ title: searchRegex }, { description: searchRegex }, { locality: searchRegex }];
    }

    // Category specific query filters
    if (type === "room") {
      if (minRent !== undefined || maxRent !== undefined) {
        query["roomDetails.rent"] = {};
        if (minRent !== undefined) query["roomDetails.rent"].$gte = Number(minRent);
        if (maxRent !== undefined) query["roomDetails.rent"].$lte = Number(maxRent);
      }
    } else if (type === "vehicle") {
      if (vehicleType && vehicleType !== "All") {
        query["vehicleDetails.vehicleType"] = vehicleType;
      }
    } else if (type === "lost_found") {
      if (kind && (kind === "lost" || kind === "found")) {
        query["lostFoundDetails.kind"] = kind;
      }
    } else if (type === "service") {
      if (serviceCategory && serviceCategory !== "All") {
        query["serviceDetails.serviceCategory"] = serviceCategory;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, listings] = await Promise.all([
      Listing.countDocuments(query),
      Listing.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    ]);

    return res.json({
      success: true,
      count: listings.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
      data: listings.map((l) => l.toFormattedJSON()),
    });
  } catch (error) {
    next(error);
  }
}

export async function getListingById(req, res, next) {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "Listing not found.",
      });
    }

    return res.json({
      success: true,
      data: listing.toFormattedJSON(),
    });
  } catch (error) {
    next(error);
  }
}

export async function createListing(req, res, next) {
  try {
    if (req.userRole === "admin") {
      return res.status(403).json({
        success: false,
        error: "Master Admin accounts cannot post consumer marketplace listings. Use a regular user account.",
      });
    }

    const listingData = {
      ...req.body,
      ownerId: req.userId,
      ownerName: req.userName,
    };

    const listing = await Listing.create(listingData);

    return res.status(201).json({
      success: true,
      data: listing.toFormattedJSON(),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateListing(req, res, next) {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "Listing not found.",
      });
    }

    // Strict ownership verification: only owner or admin can edit
    if (listing.ownerId.toString() !== req.userId && req.userRole !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Unauthorized: You can only edit your own listings.",
      });
    }

    const body = req.body || {};

    // Common fields
    if (body.title !== undefined) listing.title = body.title.trim();
    if (body.description !== undefined) listing.description = body.description.trim();
    if (body.locality !== undefined) listing.locality = body.locality.trim();
    if (body.status !== undefined) listing.status = body.status;

    // Media
    if (Array.isArray(body.photos)) listing.photos = body.photos;
    if (Array.isArray(body.videos)) listing.videos = body.videos;

    // Geo coordinates
    if (body.latitude !== undefined || body.longitude !== undefined) {
      const lat = body.latitude !== undefined ? Number(body.latitude) : listing.latitude;
      const lng = body.longitude !== undefined ? Number(body.longitude) : listing.longitude;
      listing.latitude = lat;
      listing.longitude = lng;
      listing.location = {
        type: "Point",
        coordinates: [lng, lat],
      };
    }

    // Category-specific details
    if (listing.type === "room") {
      if (!listing.roomDetails) listing.roomDetails = {};
      if (body.rent !== undefined) listing.roomDetails.rent = Number(body.rent);
      if (body.period !== undefined) listing.roomDetails.period = body.period;
      if (Array.isArray(body.amenities)) {
        listing.roomDetails.amenities = body.amenities;
      } else if (typeof body.amenities === "string") {
        listing.roomDetails.amenities = body.amenities.split(",").map((s) => s.trim()).filter(Boolean);
      }
      if (body.verified !== undefined && req.userRole === "admin") {
        listing.roomDetails.verified = Boolean(body.verified);
      }
    } else if (listing.type === "vehicle") {
      if (!listing.vehicleDetails) listing.vehicleDetails = {};
      if (body.rate !== undefined || body.rentalPrice !== undefined) {
        listing.vehicleDetails.rentalPrice = Number(body.rate ?? body.rentalPrice);
      }
      if (body.type !== undefined || body.vehicleType !== undefined) {
        listing.vehicleDetails.vehicleType = body.type ?? body.vehicleType;
      }
      if (body.available !== undefined) listing.vehicleDetails.available = Boolean(body.available);
    } else if (listing.type === "lost_found") {
      if (!listing.lostFoundDetails) listing.lostFoundDetails = {};
      if (body.kind !== undefined) listing.lostFoundDetails.kind = body.kind;
      if (body.title !== undefined) listing.lostFoundDetails.itemName = body.title;
    } else if (listing.type === "service") {
      if (!listing.serviceDetails) listing.serviceDetails = {};
      if (body.trade !== undefined || body.serviceCategory !== undefined) {
        listing.serviceDetails.serviceCategory = body.trade ?? body.serviceCategory;
      }
      if (body.price !== undefined || body.pricingInfo !== undefined) {
        listing.serviceDetails.pricingInfo = body.price ?? body.pricingInfo;
      }
      if (body.available !== undefined) listing.serviceDetails.available = Boolean(body.available);
    } else if (listing.type === "alert") {
      if (!listing.alertDetails) listing.alertDetails = {};
      if (body.type !== undefined || body.alertType !== undefined) {
        listing.alertDetails.alertType = body.type ?? body.alertType;
      }
    }

    await listing.save();

    // Format web object so frontend can update state seamlessly
    const webItem = {
      id: listing._id.toString(),
      _id: listing._id.toString(),
      title: listing.title,
      owner: listing.ownerName,
      ownerId: listing.ownerId.toString(),
      locality: listing.locality,
      latitude: listing.latitude,
      longitude: listing.longitude,
      location: listing.location,
      photos: listing.photos,
      videos: listing.videos,
      status: listing.status,
      rent: listing.roomDetails?.rent,
      amenities: listing.roomDetails?.amenities,
      verified: listing.roomDetails?.verified,
      name: listing.title,
      type: listing.vehicleDetails?.vehicleType || listing.alertDetails?.alertType,
      rate: listing.vehicleDetails?.rentalPrice,
      available: listing.vehicleDetails?.available,
      kind: listing.lostFoundDetails?.kind,
      where: listing.locality,
      by: listing.ownerName,
      trade: listing.serviceDetails?.serviceCategory,
      price: listing.serviceDetails?.pricingInfo,
      rating: listing.serviceDetails?.rating,
      jobs: listing.serviceDetails?.jobsCount,
      helpers: listing.alertDetails?.helpersCount || 0,
      description: listing.description,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      km: 0.1,
      ang: 30,
    };

    return res.json({
      success: true,
      data: webItem,
      ...webItem,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteListing(req, res, next) {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "Listing not found.",
      });
    }

    // Strict ownership verification: only owner or admin can delete
    if (listing.ownerId.toString() !== req.userId && req.userRole !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Unauthorized: You can only delete your own listings.",
      });
    }

    // Clean up persistent media from disk
    cleanupMediaFiles(listing.photos, listing.videos);

    await listing.deleteOne();

    return res.json({
      success: true,
      message: "Listing deleted successfully.",
      deletedId: req.params.id,
    });
  } catch (error) {
    next(error);
  }
}
