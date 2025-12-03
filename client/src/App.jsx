// App.jsx
import { Routes, Route } from "react-router-dom";
import RegisterRole from "./pages/RegisterRole";
import RegisterForm from "./pages/RegisterForm";
import Login from "./pages/Login";
import Home from "./pages/Home";
import TutorDashboard from "./pages/TutorDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import TutorBookingsPage from "./pages/TutorBookings";
import BrowseCourses from "./pages/BrowseCourses";
import StudentBookings from "./pages/StudentBookings";
import StudentEnrollments from "./pages/StudentEnrollments";
import StudentPayment from "./pages/StudentPayment";
import TutorAssignment from "./pages/TutorAssignment";
import StudentAssignment from "./pages/StudentAssignment.jsx";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import TutorApplyCourse from "./pages/TutorApplyCourse";
import StudentReview from "./pages/StudentReview";
import TutorReviews from "./pages/TutorReviews";

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<RegisterRole />} />
      <Route path="/register/:role" element={<RegisterForm />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* 🔓 Public Browse Courses (works with or without login) */}
      <Route path="/student/courses" element={<BrowseCourses />} />

      {/* Protected student routes */}
      <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/bookings" element={<StudentBookings />} />
        <Route path="/student/enrollments" element={<StudentEnrollments />} />
        <Route path="/student/pay/:bookingId" element={<StudentPayment />} />
        <Route
          path="/student/assignments/:assignmentId"
          element={<StudentAssignment />}
        />
        <Route
          path="/student/review/:tutorId/:courseId"
          element={<StudentReview />}
        />
      </Route>

      {/* Protected tutor routes */}
      <Route element={<ProtectedRoute allowedRoles={["tutor"]} />}>
        <Route path="/tutor/dashboard" element={<TutorDashboard />} />
        <Route path="/tutor/bookings" element={<TutorBookingsPage />} />
        <Route path="/tutor/reviews" element={<TutorReviews />} />
        <Route
          path="/tutor/courses/:courseId/apply"
          element={<TutorApplyCourse />}
        />
        <Route
          path="/tutor/bookings/:bookingId/assignment"
          element={<TutorAssignment />}
        />
      </Route>

      {/* Protected admin routes */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
