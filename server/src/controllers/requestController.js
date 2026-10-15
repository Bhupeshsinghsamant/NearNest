import { Request } from "../models/Request.js";
import { Listing } from "../models/Listing.js";
import { User } from "../models/User.js";

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

    const [buyer, seller] = await Promise.all([
      User.findById(req.userId),
      User.findById(listing.ownerId),
    ]);

    const initialText = message?.trim() || "Hi, I am interested in this listing. Is it still available?";

    const newRequest = await Request.create({
      listingId: listing._id,
      listingTitle: listing.title,
      buyerId: req.userId,
      buyerName: req.userName,
      buyerEmail: buyer?.email || req.user?.email || "",
      buyerPhone: buyer?.phone || "",
      sellerId: listing.ownerId,
      sellerEmail: seller?.email || "",
      sellerPhone: seller?.phone || listing.ownerPhone || "",
      message: initialText,
      status: "pending",
      messages: [
        {
          senderId: req.userId,
          senderName: req.userName,
          text: initialText,
          createdAt: new Date(),
        },
      ],
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

    // Refresh seller contact details if missing
    if (targetStatus === "accepted" && (!request.sellerPhone || !request.sellerEmail)) {
      const seller = await User.findById(request.sellerId);
      if (seller) {
        request.sellerEmail = seller.email || request.sellerEmail;
        request.sellerPhone = seller.phone || request.sellerPhone;
      }
    }

    await request.save();

    return res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMessages(req, res, next) {
  try {
    const { id } = req.params;
    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, error: "Request not found." });
    }

    const isParty =
      request.buyerId.toString() === req.userId ||
      request.sellerId.toString() === req.userId ||
      req.userRole === "admin";

    if (!isParty) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized to view this conversation.",
      });
    }

    return res.json({
      success: true,
      data: request.messages || [],
    });
  } catch (error) {
    next(error);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: "Message text cannot be empty." });
    }

    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, error: "Request not found." });
    }

    const isParty =
      request.buyerId.toString() === req.userId ||
      request.sellerId.toString() === req.userId ||
      req.userRole === "admin";

    if (!isParty) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized: You are not a participant in this conversation.",
      });
    }

    const msgObj = {
      senderId: req.userId,
      senderName: req.userName,
      text: text.trim(),
      createdAt: new Date(),
    };

    request.messages.push(msgObj);

    // Update sender's read timestamp and request activity timestamp
    if (request.buyerId.toString() === req.userId) {
      request.buyerLastReadAt = new Date();
    } else if (request.sellerId.toString() === req.userId) {
      request.sellerLastReadAt = new Date();
    }
    request.updatedAt = new Date();

    await request.save();

    return res.status(201).json({
      success: true,
      data: request.messages,
      newMessage: msgObj,
    });
  } catch (error) {
    next(error);
  }
}

export async function getConversations(req, res, next) {
  try {
    const requests = await Request.find({
      $or: [{ buyerId: req.userId }, { sellerId: req.userId }],
    })
      .populate("listingId", "title type locality photos roomDetails vehicleDetails serviceDetails lostFoundDetails alertDetails")
      .populate("buyerId", "name email phone area")
      .populate("sellerId", "name email phone area")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const formatted = requests.map((r) => {
      const isBuyer = r.buyerId?._id?.toString() === req.userId || r.buyerId?.toString() === req.userId;
      const myRole = isBuyer ? "buyer" : "seller";
      const partner = isBuyer
        ? {
            id: r.sellerId?._id?.toString() || r.sellerId?.toString(),
            name: r.sellerId?.name || "Seller",
            email: r.sellerEmail || r.sellerId?.email || "",
            phone: r.sellerPhone || r.sellerId?.phone || "",
            area: r.sellerId?.area || "",
            role: "seller",
          }
        : {
            id: r.buyerId?._id?.toString() || r.buyerId?.toString(),
            name: r.buyerId?.name || r.buyerName || "Buyer",
            email: r.buyerEmail || r.buyerId?.email || "",
            phone: r.buyerPhone || r.buyerId?.phone || "",
            area: r.buyerId?.area || "",
            role: "buyer",
          };

      const lastReadAt = isBuyer
        ? (r.buyerLastReadAt || new Date(0))
        : (r.sellerLastReadAt || new Date(0));

      const messages = Array.isArray(r.messages) ? r.messages : [];
      const unreadCount = messages.filter(
        (m) => m.senderId?.toString() !== req.userId && new Date(m.createdAt) > new Date(lastReadAt)
      ).length;

      const lastMessage = messages.length > 0
        ? messages[messages.length - 1]
        : { text: r.message || "Contact Inquiry", createdAt: r.createdAt, senderName: r.buyerName };

      let listingPrice = "";
      if (r.listingId?.type === "room") {
        listingPrice = r.listingId?.roomDetails?.rent ? `₹${Number(r.listingId.roomDetails.rent).toLocaleString("en-IN")}/mo` : "";
      } else if (r.listingId?.type === "vehicle") {
        listingPrice = r.listingId?.vehicleDetails?.rentalPrice ? `₹${r.listingId.vehicleDetails.rentalPrice}/hr` : "";
      } else if (r.listingId?.type === "service") {
        listingPrice = r.listingId?.serviceDetails?.pricingInfo || "";
      }

      const listingCover = Array.isArray(r.listingId?.photos) && r.listingId.photos.length > 0
        ? (typeof r.listingId.photos[0] === "string" ? r.listingId.photos[0] : r.listingId.photos[0].url)
        : null;

      return {
        id: r._id.toString(),
        _id: r._id.toString(),
        listingId: r.listingId?._id?.toString() || r.listingId?.toString() || "",
        listingTitle: r.listingId?.title || r.listingTitle || "Listing",
        listingType: r.listingId?.type || "room",
        listingLocality: r.listingId?.locality || "",
        listingPrice,
        listingCover,
        partner,
        myRole,
        status: r.status,
        unreadCount,
        lastMessage: {
          text: lastMessage.text,
          senderName: lastMessage.senderName,
          senderId: lastMessage.senderId?.toString(),
          createdAt: lastMessage.createdAt,
        },
        messageCount: messages.length,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    return res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const requests = await Request.find({
      $or: [{ buyerId: req.userId }, { sellerId: req.userId }],
    }, "buyerId sellerId buyerLastReadAt sellerLastReadAt messages").lean();

    let totalUnread = 0;
    for (const r of requests) {
      const isBuyer = r.buyerId?.toString() === req.userId;
      const lastReadAt = isBuyer
        ? (r.buyerLastReadAt || new Date(0))
        : (r.sellerLastReadAt || new Date(0));

      const messages = Array.isArray(r.messages) ? r.messages : [];
      const unread = messages.filter(
        (m) => m.senderId?.toString() !== req.userId && new Date(m.createdAt) > new Date(lastReadAt)
      ).length;

      totalUnread += unread;
    }

    return res.json({
      success: true,
      unreadCount: totalUnread,
    });
  } catch (error) {
    next(error);
  }
}

export async function markConversationAsRead(req, res, next) {
  try {
    const { id } = req.params;
    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, error: "Conversation not found." });
    }

    const isBuyer = request.buyerId.toString() === req.userId;
    const isSeller = request.sellerId.toString() === req.userId;

    if (!isBuyer && !isSeller && req.userRole !== "admin") {
      return res.status(403).json({ success: false, error: "Unauthorized." });
    }

    if (isBuyer) request.buyerLastReadAt = new Date();
    if (isSeller) request.sellerLastReadAt = new Date();

    await request.save();

    return res.json({
      success: true,
      message: "Conversation marked as read.",
    });
  } catch (error) {
    next(error);
  }
}
