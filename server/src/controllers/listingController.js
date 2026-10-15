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

    // Apply updates
    Object.assign(listing, req.body);
    await listing.save();

    return res.json({
      success: true,
      data: listing.toFormattedJSON(),
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
