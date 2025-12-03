// server/src/scripts/fixOrphanTutors.js
import mongoose from "mongoose";
import dotenv from "dotenv";

import Tutor from "../models/Tutor.js";
import User from "../models/User.js";

dotenv.config(); // loads MONGO_URI from server/.env

async function main() {
  try {
    console.log("Connecting to Mongo...");
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to:", mongoose.connection.host);
    console.log("DB name:", mongoose.connection.name);

    // 1) Delete tutors with null / missing userId
    const res1 = await Tutor.deleteMany({
      $or: [{ userId: null }, { userId: { $exists: false } }],
    });
    console.log("Deleted tutors with null/missing userId:", res1.deletedCount);

    // 2) Delete tutors whose userId points to a non-existing user
    const tutors = await Tutor.find().select("_id userId").lean();
    const userIds = tutors
      .map((t) => t.userId)
      .filter((id) => id); // remove null/undefined

    if (userIds.length === 0) {
      console.log("No tutors with userId left after first cleanup.");
      await mongoose.disconnect();
      return;
    }

    const users = await User.find({ _id: { $in: userIds } })
      .select("_id")
      .lean();
    const existingUserIdSet = new Set(users.map((u) => u._id.toString()));

    const orphanTutorIds = tutors
      .filter(
        (t) => t.userId && !existingUserIdSet.has(t.userId.toString())
      )
      .map((t) => t._id);

    if (orphanTutorIds.length > 0) {
      const res2 = await Tutor.deleteMany({ _id: { $in: orphanTutorIds } });
      console.log("Deleted tutors with dead user references:", res2.deletedCount);
    } else {
      console.log("No tutors with dead user references found.");
    }

    await mongoose.disconnect();
    console.log("Done. Disconnected.");
  } catch (err) {
    console.error("Error while fixing tutors:", err);
    process.exitCode = 1;
  }
}

main();
