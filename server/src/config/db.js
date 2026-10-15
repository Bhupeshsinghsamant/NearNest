import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("⚠️  MONGODB_URI is not defined in server/.env. Database operations will fail until connected.");
    return null;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  } catch (err) {
    console.error("Error disconnecting MongoDB:", err.message);
  }
}
