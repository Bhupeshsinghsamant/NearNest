import { Router } from "express";
import { Report } from "../models/Report.js";
import { Listing } from "../models/Listing.js";
import { User } from "../models/User.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { cleanupMediaFiles } from "./uploadRoutes.js";

const router = Router();

/**
 * POST /api/reports
 * Submit a community abuse/spam report on a listing or user
 */
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { targetType, targetId, reason, details } = req.body;

    if (!["listing", "user"].includes(targetType)) {
      return res.status(400).json({ success: false, error: "Invalid target type for report." });
    }

    if (!targetId) {
      return res.status(400).json({ success: false, error: "Target ID is required." });
    }

    const validReasons = ["fake", "duplicate", "misleading", "expired", "inappropriate", "scam", "other"];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        error: `Invalid report reason. Choose from: ${validReasons.join(", ")}`,
      });
    }

    // Check for duplicate report within last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const existing = await Report.findOne({
      reporterId: req.userId,
      targetId,
      createdAt: { $gte: oneDayAgo },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "You have already reported this item within the last 24 hours. Our moderation team is reviewing it.",
      });
    }

    let targetTitle = "";
    if (targetType === "listing") {
      const listing = await Listing.findById(targetId);
      if (!listing) {
        return res.status(404).json({ success: false, error: "Reported listing not found." });
      }
      targetTitle = listing.title;
    } else if (targetType === "user") {
      const user = await User.findById(targetId);
      if (!user) {
        return res.status(404).json({ success: false, error: "Reported user not found." });
      }
      targetTitle = user.name;
    }

    const report = await Report.create({
      reporterId: req.userId,
      reporterName: req.userName || "Neighbor",
      targetType,
      targetId,
      targetTitle,
      reason,
      details: details ? details.trim() : "",
      status: "pending",
    });

    console.log(`🚩 [Abuse Moderation] New ${reason.toUpperCase()} report filed by ${req.userName} for ${targetType} "${targetTitle}"`);

    return res.status(201).json({
      success: true,
      message: "Thank you for reporting. NearNest moderators will review this item to protect the community.",
      data: report,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/admin (or GET /api/reports with requireAdmin)
 * Fetch reports for administrator review
 */
router.get("/admin", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && status !== "all") {
      query.status = status;
    }

    const reports = await Report.find(query).sort({ createdAt: -1 }).limit(100).lean();

    return res.json({
      success: true,
      data: reports,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/reports/admin/:id
 * Admin moderation action on report (Dismiss, Hide Listing, Restore Listing, Delete Listing, Ban User)
 */
router.patch("/admin/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { action, notes } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found." });
    }

    const validActions = ["dismiss", "hide_listing", "restore_listing", "delete_listing", "ban_user"];
    if (!validActions.includes(action)) {
      return res.status(400).json({ success: false, error: `Invalid moderation action. Choose from: ${validActions.join(", ")}` });
    }

    let actionTakenDesc = "No destructive action taken.";

    if (action === "dismiss") {
      report.status = "dismissed";
      report.moderationAction = "none";
      actionTakenDesc = "Report dismissed as unfounded.";
    } else if (action === "hide_listing") {
      if (report.targetType === "listing") {
        const listing = await Listing.findById(report.targetId);
        if (listing) {
          listing.status = "hidden";
          await listing.save();
          actionTakenDesc = `Listing "${listing.title}" hidden from marketplace feeds.`;
        }
      }
      report.status = "action_taken";
      report.moderationAction = "listing_hidden";
    } else if (action === "restore_listing") {
      if (report.targetType === "listing") {
        const listing = await Listing.findById(report.targetId);
        if (listing) {
          listing.status = "active";
          await listing.save();
          actionTakenDesc = `Listing "${listing.title}" restored to active status.`;
        }
      }
      report.status = "reviewed";
      report.moderationAction = "none";
    } else if (action === "delete_listing") {
      if (report.targetType === "listing") {
        const listing = await Listing.findById(report.targetId);
        if (listing) {
          cleanupMediaFiles(listing.photos, listing.videos);
          await listing.deleteOne();
          actionTakenDesc = `Listing "${listing.title}" permanently deleted and media purged.`;
        }
      }
      report.status = "action_taken";
      report.moderationAction = "listing_deleted";
    } else if (action === "ban_user") {
      let userIdToBan = report.targetType === "user" ? report.targetId : null;
      if (report.targetType === "listing") {
        const listing = await Listing.findById(report.targetId);
        if (listing) userIdToBan = listing.ownerId;
      }

      if (userIdToBan) {
        const targetUser = await User.findById(userIdToBan);
        if (targetUser && targetUser.role !== "admin") {
          targetUser.isBanned = true;
          targetUser.banReason = notes || `Account banned following confirmed community abuse report (${report.reason})`;
          await targetUser.save();
          actionTakenDesc = `User "${targetUser.name}" banned from platform.`;
        }
      }
      report.status = "action_taken";
      report.moderationAction = "user_banned";
    }

    report.moderatedBy = req.userId;
    report.moderatorName = req.userName || "Admin";
    report.moderationNotes = notes || actionTakenDesc;
    report.reviewedAt = new Date();
    await report.save();

    console.log(`🛡️ [Admin Moderation] Report ${report._id} updated with action "${action}" by ${req.userName}. Outcome: ${actionTakenDesc}`);

    return res.json({
      success: true,
      message: actionTakenDesc,
      data: report,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
