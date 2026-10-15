import { Request } from "../models/Request.js";
import { Listing } from "../models/Listing.js";

export async function createRequest(req, res, next) {
  try {
    const { listingId, message } = req.body;
    if (!listingId) {
      return res.status(400).json({ success: false, error: "listingId is required." });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, error: "Listing not found." });
    }

    // A user cannot send an inquiry to themselves
    if (listing.ownerId.toString() === req.userId) {
      return res.status(400).json({
        success: false,
        error: "You cannot send an enquiry on your own listing.",
      });
    }

    const newRequest = await Request.create({
      listingId: listing._id,
      listingTitle: listing.title,
      buyerId: req.userId,
      buyerName: req.userName,
      buyerEmail: req.user?.email || "",
      sellerId: listing.ownerId,
      message: message || "Hi, I am interested in this listing. Is it still available?",
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      data: newRequest,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInbox(req, res, next) {
  try {
    const requests = await Request.find({ sellerId: req.userId }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSentRequests(req, res, next) {
  try {
    const requests = await Request.find({ buyerId: req.userId }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRequestStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    let targetStatus = status;
    if (targetStatus === "rejected") targetStatus = "declined";

    if (!["accepted", "declined"].includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        error: "Status must be either 'accepted' or 'declined'.",
      });
    }

    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, error: "Request not found." });
    }

    // Only the seller (listing owner) can accept/decline
    if (request.sellerId.toString() !== req.userId && req.userRole !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Unauthorized: Only the listing owner can decide on this request.",
      });
    }

    request.status = targetStatus;
    await request.save();

    return res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    next(error);
  }
}
