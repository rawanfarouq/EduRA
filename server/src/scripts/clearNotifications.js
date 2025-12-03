// scripts/clearNotifications.js
import mongoose from "mongoose";
import dotenv from "dotenv";

import Notification from "../models/Notification.js"; // ⬅️ adjust path if needed

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not set in environment variables");
  process.exit(1);
}

async function clearNotifications() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);

    console.log("Deleting ALL notifications...");
    const result = await Notification.deleteMany({});

    console.log(`✅ Done. Deleted ${result.deletedCount} notifications.`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error while clearing notifications:", err);
    process.exit(1);
  }
}

clearNotifications();
