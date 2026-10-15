import { Router } from "express";
import {
  createRequest,
  getInbox,
  getSentRequests,
  updateRequestStatus,
} from "../controllers/requestController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, createRequest);
router.get("/inbox", requireAuth, getInbox);
router.get("/sent", requireAuth, getSentRequests);
router.patch("/:id", requireAuth, updateRequestStatus);

export default router;
