import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Listing } from "../models/Listing.js";
import { Request } from "../models/Request.js";
import { cleanupMediaFiles } from "../routes/uploadRoutes.js";
import { signToken } from "../middleware/auth.js";

export async function signup(req, res, next) {
  try {
    const { name, email, password, area, phone } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists. Try logging in.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      area: area || "",
      phone: phone || "",
      role: "user",
    });

    const token = signToken({ id: user._id.toString(), role: user.role });

    return res.status(201).json({
      success: true,
      user: user.toPublicJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Email or password is incorrect.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Email or password is incorrect.",
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        error: `Your account has been suspended by administration.${user.banReason ? ` Reason: ${user.banReason}` : " Please contact platform support."}`,
      });
    }

    const token = signToken({ id: user._id.toString(), role: user.role });

    return res.json({
      success: true,
      user: user.toPublicJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res) {
  return res.json({
    success: true,
    user: req.user.toPublicJSON(),
  });
}

/**
 * DELETE /api/auth/me
 * DPDP Act 2023 Section 12: Right to Correction and Erasure of Personal Data
 * Permanently deletes user account, active listings, media files, inquiries, and alerts.
 */
export async function deleteMe(req, res, next) {
  try {
    const { password } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User account not found." });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        error: "Master Admin accounts cannot be self-deleted. Contact system owner.",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        error: "Please provide your current password to confirm permanent account deletion.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Incorrect password. Account deletion aborted.",
      });
    }

    // 1. Clean up user's listings and disk media files
    const userListings = await Listing.find({ ownerId: user._id });
    for (const l of userListings) {
      cleanupMediaFiles(l.photos, l.videos);
      await l.deleteOne();
    }

    // 2. Clean up user's buyer and seller requests / chats
    await Request.deleteMany({ $or: [{ buyerId: user._id }, { sellerId: user._id }] });

    // 3. Clean up user document
    await user.deleteOne();

    console.log(`🔒 [DPDP Compliance] User account "${user.email}" and all associated personal data permanently erased by user.`);

    return res.json({
      success: true,
      message: "Your account and all associated personal data have been permanently erased in compliance with the Digital Personal Data Protection Act, 2023.",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me/export
 * DPDP Act 2023 Section 11: Right to Access Information About Personal Data & Portability
 * Returns full readable data dump of the user's personal identifiers, listings, and messages.
 */
export async function exportMe(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User account not found." });
    }

    const listings = await Listing.find({ ownerId: user._id }).lean();
    const sentRequests = await Request.find({ buyerId: user._id }).lean();
    const receivedRequests = await Request.find({ sellerId: user._id }).lean();

    const dataDump = {
      exportMetadata: {
        platform: "NearNest Hyperlocal Community",
        legalBasis: "Digital Personal Data Protection Act (DPDP), 2023",
        exportedAt: new Date().toISOString(),
      },
      profile: user.toPublicJSON(),
      personalIdentifiers: {
        name: user.name,
        email: user.email,
        phone: user.phone || "Not provided",
        registeredArea: user.area || "Not provided",
      },
      listingsCount: listings.length,
      listings,
      inquiries: {
        sentCount: sentRequests.length,
        sent: sentRequests,
        receivedCount: receivedRequests.length,
        received: receivedRequests,
      },
    };

    return res.json({
      success: true,
      data: dataDump,
    });
  } catch (error) {
    next(error);
  }
}
