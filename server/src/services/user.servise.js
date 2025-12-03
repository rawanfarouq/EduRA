// server/src/services/user.service.js
import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import Tutor from '../models/Tutor.js';
import Course from "../models/Course.js";


/**
 * Returns a normalized user object with role-specific profile embedded.
 * Never returns passwordHash.
 */
export async function buildUserResponse(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return null;


  if (user.role === "student") {
    const profile = await StudentProfile.findOne({ userId }).lean();
    return {
      id: user._id, name: user.name, email: user.email, role: user.role,
      birthdate: user.birthdate, gender: user.gender,
      student: profile ? {
        schoolOrUniversity: profile.schoolOrUniversity || "", grade: profile.grade || ""
      } : null
    };
  }

  if (user.role === "tutor") {
    const profile = await Tutor.findOne({ userId }).lean();
    // derive courses taught
    const courses = await Course.find({ instructorId: profile?._id })
      .select("title")
      .lean();

    return {
      id: user._id, name: user.name, email: user.email, role: user.role,
      birthdate: user.birthdate, gender: user.gender,
      tutor: profile ? {
        bio: profile.bio || "",
        courses: courses.map(c => ({ id: c._id, title: c.title })),
        experienceYears: profile.experienceYears || 0,
        achievements: profile.achievements || [],
        languages: profile.languages || [],
        hourlyRate: profile.hourlyRate || 0,
        ratingAvg: profile.ratingAvg || 0,
        reviewsCount: profile.reviewsCount || 0,
        availability: profile.availability || [],
        timezone: profile.timezone || "UTC"
      } : null
    };
  }
  // admin
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    birthdate: user.birthdate,
    gender: user.gender,
  };
}
