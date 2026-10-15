import { Router } from "express";
import {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
} from "../controllers/listingController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate, createListingSchema, updateListingSchema } from "../middleware/validate.js";

const router = Router();

router.get("/", getListings);
router.get("/:id", getListingById);
router.post("/", requireAuth, validate(createListingSchema), createListing);
router.patch("/:id", requireAuth, validate(updateListingSchema), updateListing);
router.delete("/:id", requireAuth, deleteListing);

export default router;
