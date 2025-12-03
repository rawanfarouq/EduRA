// lib/api.js
import { getAccessToken } from './auth';
import { useAuthStore } from '../store/useAuthStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function refreshAccessToken() {
  const res = await fetch(`${API}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include', // send/receive HttpOnly cookie
  });
  if (!res.ok) throw new Error('Unable to refresh');
  const data = await res.json();
  useAuthStore.getState().setToken(data.accessToken);
  return data.accessToken;
}

export async function withAuthFetch(path, options = {}, retry = true) {
  const headers = { ...(options.headers || {}) };
  // only set content-type if sending JSON (FormData must not set it)
  if (
    options.method &&
    options.method !== 'GET' &&
    !(options.body instanceof FormData) &&
    !headers['Content-Type']
  ) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(`${API}${path}`, {
    ...options,
    headers,
    credentials: 'include', // important for cookies across ports
  });

  if (
    res.status === 401 &&
    retry &&
    path !== '/api/auth/refresh' && // avoid loops
    token // only try refresh if we had an access token to begin with
  ) {
    try {
      const newToken = await refreshAccessToken();
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
      return withAuthFetch(path, { ...options, headers: retryHeaders }, false);
    } catch {
      // optional: clear local auth state on failed refresh
      useAuthStore.getState().logout?.();
      throw new Error('Session expired. Please log in again.');
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

// JSON helpers that ALWAYS use the API base and include cookies
export async function postJSON(path, body, method = 'POST') {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text()) || 'Request failed');
  return res.json();
}

export async function getJSON(path) {
  return withAuthFetch(path, { method: 'GET' });
}

export async function del(path) {
  return withAuthFetch(path, { method: 'DELETE' });
}

export async function putJSON(path, body) {
  return withAuthFetch(path, { method: 'PUT', body: JSON.stringify(body) });
}

export { refreshAccessToken };

// lib/api.js (add these)
export async function postAuthJSON(path, body) {
  return withAuthFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getAuth(path) {
  return withAuthFetch(path, { method: 'GET' });
}

export async function putAuthJSON(path, body) {
  return withAuthFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function delAuth(path) {
  return withAuthFetch(path, { method: 'DELETE' });
}

// client/src/lib/api.js

export async function fetchNotifications() {
  return withAuthFetch('/api/notifications');
}

// ✅ FIXED
export async function markNotificationRead(id) {
  return withAuthFetch(`/api/notifications/${id}/read`, {
    method: "PATCH",
  });
}


export async function applyCourseNotification(id) {
  return withAuthFetch(`/api/notifications/${id}/apply-course`, {
    method: 'POST',
  });
}

export async function dismissNotification(id) {
  return withAuthFetch(`/api/notifications/${id}/dismiss`, {
    method: 'POST',
  });
}


// Ask a tutor a question during office hours
export async function sendOfficeHourQuestion(tutorId, payload) {
  return withAuthFetch(`/api/office-hours/tutor/${tutorId}/question`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Tutor: list my office-hour messages
export async function fetchMyOfficeHourMessages() {
  return withAuthFetch('/api/office-hours/me/messages', { method: 'GET' });
}

// Tutor: add resource link (while in office hours)
export async function addTutorResourceLink(payload) {
  return withAuthFetch('/api/office-hours/me/resources', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ❌ old version was probably just (tutorId) => getJSON(`/api/tutor/${tutorId}/resources`)
export async function fetchTutorResources(tutorId, courseId) {
  if (!tutorId) throw new Error("tutorId is required");

  let url = `/api/tutor/${tutorId}/resources`;
  if (courseId) {
    url += `?courseId=${encodeURIComponent(courseId)}`; // 🔥 pass courseId to backend
  }

  return getJSON(url);
}


export async function replyOfficeHourMessage(messageId, body) {
  return withAuthFetch(`/api/office-hours/${messageId}/reply`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchMyOfficeHourMessagesStudent() {
  return withAuthFetch("/api/office-hours/my-messages");
}

export async function submitReview(tutorId, data) {
  return postAuthJSON(`/api/reviews/${tutorId}`, data);
}

export async function fetchTutorReviews(tutorId) {
  return getJSON(`/api/reviews/tutor/${tutorId}`);
}

// 🧑‍🏫 tutor: fetch MY reviews
export async function fetchMyReviewsAsTutor() {
  return getJSON("/api/reviews/tutor/me");
}

// lib/api.js
export async function updateEnrollmentProgress(enrollmentId, body) {
  return withAuthFetch(`/api/enrollments/${enrollmentId}/progress`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}



