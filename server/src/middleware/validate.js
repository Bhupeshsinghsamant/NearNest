import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Please provide a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  area: z.string().trim().optional().default(""),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createListingSchema = z.object({
  type: z.enum(["room", "vehicle", "lost_found", "service"], {
    errorMap: () => ({ message: "Type must be one of: room, vehicle, lost_found, service" }),
  }),
  title: z.string().trim().min(3, "Title must be at least 3 characters"),
  description: z.string().trim().optional().default(""),
  locality: z.string().trim().min(2, "Locality/Area is required"),
  status: z.enum(["active", "closed", "draft"]).optional().default("active"),
  photos: z.array(z.string()).optional().default([]),
  roomDetails: z
    .object({
      rent: z.number().nonnegative().optional(),
      period: z.string().optional().default("month"),
      amenities: z.array(z.string()).optional().default([]),
      verified: z.boolean().optional().default(false),
    })
    .optional(),
  vehicleDetails: z
    .object({
      vehicleType: z.enum(["Scooty", "Bike", "Car", "Other"]).optional().default("Bike"),
      rentalPrice: z.number().nonnegative().optional(),
      pricingPeriod: z.string().optional().default("hour"),
      available: z.boolean().optional().default(true),
    })
    .optional(),
  lostFoundDetails: z
    .object({
      kind: z.enum(["lost", "found"]).optional().default("found"),
      itemName: z.string().trim().optional(),
      incidentDate: z.string().or(z.date()).optional(),
    })
    .optional(),
  serviceDetails: z
    .object({
      serviceCategory: z
        .enum(["Electrician", "Mechanic", "Plumber", "Notes", "Other"])
        .optional()
        .default("Other"),
      pricingInfo: z.string().optional().default("Contact for quote"),
      rating: z.number().min(1).max(5).optional().default(5.0),
      jobsCount: z.number().nonnegative().optional().default(0),
      available: z.boolean().optional().default(true),
    })
    .optional(),
});

export const updateListingSchema = createListingSchema.partial().omit({ type: true });

export function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errorMessages = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
        return res.status(400).json({
          success: false,
          error: errorMessages.join(", "),
          details: err.errors,
        });
      }
      next(err);
    }
  };
}
