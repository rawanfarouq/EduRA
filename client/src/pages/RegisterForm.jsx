// src/pages/RegisterForm.jsx
import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { getJSON } from "../lib/api";
import { useAuthStore } from "../store/useAuthStore";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function RegisterForm() {
  const { role } = useParams(); // "student" or "tutor"
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const validRole = role === "student" || role === "tutor";
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 🔧 AI courses: suggested IDs (we'll derive titles from `courses`)
  const [suggestedIds, setSuggestedIds] = useState([]);
  const [aiBusy, setAiBusy] = useState(false);

  // base fields
  const [base, setBase] = useState({
    name: "",
    email: "",
    password: "",
    birthdate: "",
    gender: "prefer_not_say",
  });

  // student-only
  const [student, setStudent] = useState({
    schoolOrUniversity: "",
    grade: "",
  });

  // tutor-only
  const [tutor, setTutor] = useState({
    bio: "",
    hourlyRate: "",
    experienceYears: "",
    achievementsText: "", // CSV → array
    languagesText: "", // CSV → array
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    availability: [], // [{date, day, startMin, endMin}]
    cvFile: null, // 🔧 keep file here
  });

  // add-availability mini-form
  const [slot, setSlot] = useState({
    day: "1", // default Monday
    start: "09:00", // HH:MM
    end: "10:00",
  });

  // COURSES: we keep the array only to be able to map IDs → titles after AI suggests
  const [courses, setCourses] = useState([]); // [{_id,title}]
  // eslint-disable-next-line no-unused-vars
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState([]); // ✅ ONLY these get sent

  // fetch all courses once (to label AI suggestions with titles)
  useEffect(() => {
    let ignore = false;
    async function load() {
      if (role !== "tutor") return;
      setCoursesLoading(true);
      setCoursesError("");
      try {
        const data = await getJSON("/api/courses?all=1");
        const list = Array.isArray(data) ? data : data?.courses || [];
        if (!ignore) setCourses(list);
      } catch (e) {
        if (!ignore) setCoursesError(e.message || "Failed to load courses");
      } finally {
        if (!ignore) setCoursesLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [role]);

  const title = useMemo(
    () => (role === "tutor" ? "Register as Tutor" : "Register as Student"),
    [role]
  );

  function handleLogout() {
    logout();
    navigate("/");
  }

  function timeToMin(t) {
    const [hh, mm] = (t || "00:00").split(":").map((x) => parseInt(x, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
    return hh * 60 + mm;
  }

  function csvToArray(s) {
    return (s || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  // 🔹 helper: get next calendar date for a given weekday (0–6, Sun–Sat)
  function nextDateForDay(dayNum) {
    const now = new Date();
    const result = new Date(now);
    const currentDay = result.getDay(); // 0–6
    let diff = dayNum - currentDay;
    if (diff < 0) diff += 7;
    if (diff === 0) diff = 7; // always in the future (next week same day)
    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function addAvailabilitySlot() {
    const startMin = timeToMin(slot.start);
    const endMin = timeToMin(slot.end);
    const dayNum = parseInt(slot.day, 10);

    if (!(dayNum >= 0 && dayNum <= 6)) {
      setErr("Invalid day.");
      return;
    }
    if (endMin <= startMin) {
      setErr("End time must be after start time.");
      return;
    }

    // 🔹 create a date so it matches Tutor model: { date, day, startMin, endMin }
    const dateObj = nextDateForDay(dayNum);

    setTutor((prev) => ({
      ...prev,
      availability: [
        ...prev.availability,
        {
          date: dateObj.toISOString(), // Mongoose will cast to Date
          day: dayNum,
          startMin,
          endMin,
        },
      ],
    }));
  }

  function removeAvailabilityIndex(idx) {
    setTutor((prev) => ({
      ...prev,
      availability: prev.availability.filter((_, i) => i !== idx),
    }));
  }

  // 🔧 helper: toggle a course ID in selectedCourseIds
  function toggleSelectedCourse(id) {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // 🔧 AI action: suggest courses from current CV
  async function suggestFromCV() {
    if (!tutor.cvFile) {
      setErr("Please upload your CV first, then click AI Suggest.");
      return;
    }
    setAiBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("cv", tutor.cvFile);
      const res = await fetch(`${API}/api/ai/suggest-courses`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json(); // { suggested: [ids] }

      const ids = Array.isArray(data.suggested) ? data.suggested : [];
      setSuggestedIds(ids); // ✅ AI suggestions
      setSelectedCourseIds([]); // ✅ let the tutor choose manually
    } catch (e) {
      setSuggestedIds([]);
      setSelectedCourseIds([]);
      setErr(e.message || "Failed to analyze CV");
    } finally {
      setAiBusy(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const isTutor = role === "tutor";
      let res;

      if (isTutor) {
        // --- Tutor: use multipart/form-data so we can upload a file ---
        const fd = new FormData();

        // Base fields
        fd.append("name", base.name);
        fd.append("email", base.email);
        fd.append("password", base.password);
        fd.append("role", role);
        if (base.birthdate) fd.append("birthdate", base.birthdate);
        if (base.gender) fd.append("gender", base.gender);

        // Tutor-only fields
        fd.append("bio", tutor.bio || "");
        fd.append("timezone", tutor.timezone || "UTC");
        fd.append("hourlyRate", String(Number(tutor.hourlyRate) || 0));
        fd.append(
          "experienceYears",
          String(Number(tutor.experienceYears) || 0)
        );

        // arrays
        csvToArray(tutor.achievementsText).forEach((v) =>
          fd.append("achievements", v)
        );
        csvToArray(tutor.languagesText).forEach((v) =>
          fd.append("languages", v)
        );

        // ✅ ONLY the manually selected IDs are sent
        (selectedCourseIds || []).forEach((id) => fd.append("courses", id));

        // availability (now includes date, day, startMin, endMin)
        fd.append("availability", JSON.stringify(tutor.availability || []));

        // CV file
        if (tutor.cvFile) fd.append("cv", tutor.cvFile);

        res = await fetch(`${API}/api/auth/register`, {
          method: "POST",
          body: fd,
          credentials: "include",
        });
      } else {
        // --- Student: JSON is fine ---
        const payload = {
          ...base,
          role,
          schoolOrUniversity: student.schoolOrUniversity,
          grade: student.grade,
        };

        res = await fetch(`${API}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Registration failed");
      }

      const data = await res.json();
      const { setUser, setToken } = useAuthStore.getState();
      setUser(data.user);
      setToken(data.accessToken);

      const me = data.user;
      if (me?.role === "tutor") navigate("/tutor/dashboard");
      else if (me?.role === "student") navigate("/student/dashboard");
      else navigate("/");
    } catch (e) {
      setErr(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (!validRole) {
    return (
      <>
        <header className="text-white bg-slate-900">
          <div className="flex items-center justify-between px-6 py-3 mx-auto max-w-7xl">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2">
                <img
                  src="/img/logo.png"
                  alt="EduRA"
                  style={{ width: "90px", height: "auto" }}
                />
              </Link>
              <div className="hidden text-sm text-slate-200 sm:block">
                <div className="font-semibold">Registration</div>
                <div className="text-xs text-slate-300">
                  Choose a valid role to continue.
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="grid min-h-[60vh] place-items-center bg-slate-50">
          <div className="text-center">
            <p className="mb-2 text-gray-600">Unknown role.</p>
            <Link to="/register" className="text-indigo-600 hover:underline">
              Go back
            </Link>
          </div>
        </main>

        <footer
          className="footer"
          style={{
            background: "#232637",
            padding: "18px 0",
            textAlign: "center",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#B2B2B2",
              fontSize: "14px",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            © {new Date().getFullYear()} EduRA — All Rights Reserved
          </p>
        </footer>
      </>
    );
  }

  return (
    <>
      {/* HEADER – same style as tutor pages */}
      <header className="text-white bg-slate-900">
        <div className="flex items-center justify-between px-6 py-3 mx-auto max-w-7xl">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/img/logo.png"
                alt="EduRA"
                style={{ width: "90px", height: "auto" }}
              />
            </Link>
            <div className="hidden text-sm text-slate-200 sm:block">
              <div className="font-semibold">Create your account</div>
              <div className="text-xs text-slate-300">
                {role === "tutor"
                  ? "Join as a tutor and start teaching."
                  : "Join as a student and book great tutors."}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-300 md:inline">
              eduteam.app@gmail.com
            </span>
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-4xl px-4 py-10 mx-auto">
          {/* Title + back link */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3">
                <Link
                  to="/register"
                  className="text-sm text-slate-500 hover:underline"
                >
                  ← Back
                </Link>
                <h1 className="text-2xl font-semibold text-slate-900">
                  {title}
                </h1>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Fill in your details to create a new{" "}
                <span className="font-semibold">{role}</span> account.
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="max-w-3xl mx-auto p-8 bg-white border border-slate-200 rounded-2xl shadow-sm shadow-slate-100 transform transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg">
            {err && (
              <div className="px-4 py-2 mb-4 text-sm text-red-700 border border-red-200 rounded-md bg-red-50">
                {err}
              </div>
            )}

            <form onSubmit={onSubmit} className="grid gap-4">
              {/* Base fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    className="w-full mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    value={base.name}
                    onChange={(e) =>
                      setBase({ ...base, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    value={base.email}
                    onChange={(e) =>
                      setBase({ ...base, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    type="password"
                    className="w-full mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    value={base.password}
                    onChange={(e) =>
                      setBase({ ...base, password: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Birthdate
                  </label>
                  <input
                    type="date"
                    className="w-full mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    value={base.birthdate}
                    onChange={(e) =>
                      setBase({ ...base, birthdate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <select
                  className="w-full mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={base.gender}
                  onChange={(e) =>
                    setBase({ ...base, gender: e.target.value })
                  }
                >
                  <option value="prefer_not_say">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Student-only */}
              {role === "student" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      School / University
                    </label>
                    <input
                      className="w-full mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      value={student.schoolOrUniversity}
                      onChange={(e) =>
                        setStudent({
                          ...student,
                          schoolOrUniversity: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Grade / Year
                    </label>
                    <input
                      className="w-full mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      value={student.grade}
                      onChange={(e) =>
                        setStudent({ ...student, grade: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              {/* Tutor-only */}
              {role === "tutor" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Bio
                    </label>
                    <textarea
                      className="w-full mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      rows={3}
                      value={tutor.bio}
                      onChange={(e) =>
                        setTutor({ ...tutor, bio: e.target.value })
                      }
                    />
                  </div>

                  {/* CV upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Upload CV (PDF or Word)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="w-full mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setTutor((prev) => ({ ...prev, cvFile: file }));
                        // Clear old AI results if CV changes
                        setSuggestedIds([]);
                        setSelectedCourseIds([]);
                      }}
                    />
                  </div>

                  {/* 🔧 AI: Suggest courses button + results */}
                  <div className="p-4 border rounded-md bg-slate-50">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={suggestFromCV}
                        disabled={!tutor.cvFile || aiBusy}
                        className="px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {aiBusy ? "Analyzing CV…" : "AI: Suggest courses from CV"}
                      </button>
                      {!tutor.cvFile && (
                        <span className="text-xs text-gray-500">
                          Upload your CV first
                        </span>
                      )}
                    </div>

                    {coursesError && (
                      <p className="mt-2 text-sm text-red-600">
                        {coursesError}
                      </p>
                    )}

                    {suggestedIds.length > 0 && (
                      <div className="mt-3">
                        <div className="mb-1 text-xs text-gray-500 uppercase">
                          Suggested Courses (click to select)
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {suggestedIds.map((id) => {
                            const course = courses.find(
                              (c) => String(c._id) === String(id)
                            );
                            if (!course) return null;
                            const isSelected = selectedCourseIds.includes(id);
                            return (
                              <button
                                key={String(id)}
                                type="button"
                                onClick={() => toggleSelectedCourse(id)}
                                className={
                                  "px-2 py-1 text-xs rounded-full border transition-colors " +
                                  (isSelected
                                    ? "bg-indigo-600 text-white border-indigo-700"
                                    : "bg-indigo-100 text-indigo-700 border-indigo-200")
                                }
                              >
                                {course.title}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {suggestedIds.length === 0 && !aiBusy && tutor.cvFile && (
                      <p className="mt-2 text-sm text-gray-500">
                        No suggestions yet. Click the button to analyze your CV.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Hourly Rate (USD)
                      </label>
                      <input
                        type="number"
                        className="w-full mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        value={tutor.hourlyRate}
                        onChange={(e) =>
                          setTutor({ ...tutor, hourlyRate: e.target.value })
                        }
                        min={0}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Experience (years)
                      </label>
                      <input
                        type="number"
                        className="w-full mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        value={tutor.experienceYears}
                        onChange={(e) =>
                          setTutor({
                            ...tutor,
                            experienceYears: e.target.value,
                          })
                        }
                        min={0}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Timezone
                      </label>
                      <input
                        className="w-full mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        value={tutor.timezone}
                        onChange={(e) =>
                          setTutor({ ...tutor, timezone: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Achievements (comma separated)
                      </label>
                      <input
                        placeholder="Top tutor 2023, Olympiad mentor"
                        className="w-full mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        value={tutor.achievementsText}
                        onChange={(e) =>
                          setTutor({
                            ...tutor,
                            achievementsText: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Languages (comma separated)
                      </label>
                      <input
                        placeholder="English, Arabic"
                        className="w-full mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        value={tutor.languagesText}
                        onChange={(e) =>
                          setTutor({
                            ...tutor,
                            languagesText: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Availability builder */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Availability
                    </label>
                    <div className="flex flex-wrap items-end gap-3 mt-2">
                      <div>
                        <span className="block text-xs text-gray-500">Day</span>
                        <select
                          className="mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                          value={slot.day}
                          onChange={(e) =>
                            setSlot({ ...slot, day: e.target.value })
                          }
                        >
                          {DAY_LABEL.map((d, i) => (
                            <option key={d} value={i}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className="block text-xs text-gray-500">
                          Start
                        </span>
                        <input
                          type="time"
                          className="mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                          value={slot.start}
                          onChange={(e) =>
                            setSlot({ ...slot, start: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <span className="block text-xs text-gray-500">End</span>
                        <input
                          type="time"
                          className="mt-1 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                          value={slot.end}
                          onChange={(e) =>
                            setSlot({ ...slot, end: e.target.value })
                          }
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addAvailabilitySlot}
                        className="px-3 py-2 text-sm text-white bg-gray-800 rounded-md hover:bg-gray-900"
                      >
                        Add
                      </button>
                    </div>

                    {tutor.availability.length > 0 && (
                      <ul className="mt-3 text-sm text-gray-700">
                        {tutor.availability.map((s, idx) => (
                          <li
                            key={idx}
                            className="flex items-center justify-between py-1"
                          >
                            <span>
                              {DAY_LABEL[s.day]} —{" "}
                              {String(Math.floor(s.startMin / 60)).padStart(
                                2,
                                "0"
                              )}
                              :
                              {String(s.startMin % 60).padStart(2, "0")} →{" "}
                              {String(Math.floor(s.endMin / 60)).padStart(
                                2,
                                "0"
                              )}
                              :
                              {String(s.endMin % 60).padStart(2, "0")}
                            </span>
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:underline"
                              onClick={() => removeAvailabilityIndex(idx)}
                            >
                              remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center py-2 mt-2 font-medium text-white transition-colors bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer
        className="footer"
        style={{
          background: "#232637",
          padding: "18px 0",
          textAlign: "center",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#B2B2B2",
            fontSize: "14px",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          © {new Date().getFullYear()} EduRA — All Rights Reserved
        </p>

        <div style={{ marginTop: "6px" }}>
          <a
            href="#"
            style={{ color: "#fff", margin: "0 8px", fontSize: "14px" }}
          >
            <i className="fa fa-facebook" />
          </a>
          <a
            href="#"
            style={{ color: "#fff", margin: "0 8px", fontSize: "14px" }}
          >
            <i className="fa fa-twitter" />
          </a>
          <a
            href="#"
            style={{ color: "#fff", margin: "0 8px", fontSize: "14px" }}
          >
            <i className="fa fa-linkedin" />
          </a>
        </div>
      </footer>
    </>
  );
}
