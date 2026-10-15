import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { signToken } from "../middleware/auth.js";

export async function signup(req, res, next) {
  try {
    const { name, email, password, area } = req.body;

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
