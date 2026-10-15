import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
    },
    area: {
      type: String,
      default: "",
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify candidate password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to return safe public object
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    area: this.area,
    role: this.role,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model("User", userSchema);
