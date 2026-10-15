import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner ID is required"],
      index: true,
    },
    ownerName: {
      type: String,
      required: [true, "Owner name is required"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Listing type is required"],
      enum: {
        values: ["room", "vehicle", "lost_found", "service", "alert"],
        message: "{VALUE} is not a supported listing category",
      },
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    locality: {
      type: String,
      required: [true, "Locality/Area is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "closed", "draft"],
      default: "active",
      index: true,
    },
    photos: {
      type: [String],
      default: [],
    },

    // Category 1: Room Rent
    roomDetails: {
      rent: { type: Number, min: 0 },
      period: { type: String, default: "month" },
      amenities: { type: [String], default: [] },
      verified: { type: Boolean, default: false },
    },

    // Category 2: Vehicle Rent
    vehicleDetails: {
      vehicleType: {
        type: String,
        enum: ["Scooty", "Bike", "Car", "Other"],
        default: "Bike",
      },
      rentalPrice: { type: Number, min: 0 },
      pricingPeriod: { type: String, default: "hour" },
      available: { type: Boolean, default: true },
    },

    // Category 3: Lost & Found
    lostFoundDetails: {
      kind: {
        type: String,
        enum: ["lost", "found"],
        default: "found",
      },
      itemName: { type: String, trim: true },
      incidentDate: { type: Date, default: Date.now },
    },

    // Category 4: Civil Help / Local Services
    serviceDetails: {
      serviceCategory: {
        type: String,
        enum: ["Electrician", "Mechanic", "Plumber", "Notes", "Other"],
        default: "Other",
      },
      pricingInfo: { type: String, default: "Contact for quote" },
      rating: { type: Number, default: 5.0, min: 1, max: 5 },
      jobsCount: { type: Number, default: 0, min: 0 },
      available: { type: Boolean, default: true },
    },

    // Category 5: Local Alerts / Emergency
    alertDetails: {
      alertType: {
        type: String,
        enum: ["Stuck", "Medical", "Blood", "Safety", "Other"],
        default: "Stuck",
      },
      helpersCount: { type: Number, default: 0, min: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast retrieval
listingSchema.index({ type: 1, createdAt: -1 });
listingSchema.index({ type: 1, status: 1 });

listingSchema.methods.toFormattedJSON = function () {
  return {
    id: this._id.toString(),
    ownerId: this.ownerId.toString(),
    ownerName: this.ownerName,
    type: this.type,
    title: this.title,
    description: this.description,
    locality: this.locality,
    status: this.status,
    photos: this.photos,
    roomDetails: this.roomDetails,
    vehicleDetails: this.vehicleDetails,
    lostFoundDetails: this.lostFoundDetails,
    serviceDetails: this.serviceDetails,
    alertDetails: this.alertDetails,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Listing = mongoose.model("Listing", listingSchema);
