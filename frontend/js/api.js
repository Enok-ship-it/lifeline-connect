// js/api.js
//
// One small helper file that every page includes. It centralizes:
//   - talking to the backend API
//   - reading/writing the logged-in user's token
//   - small reusable UI helpers (toast messages, counters)
//
// Keeping this in one file means if the API's base URL ever changes,
// we only change it here instead of in ten different pages.

const API_BASE = "/api"; // same-origin, since Express also serves the frontend

const Auth = {
  getToken() {
    return localStorage.getItem("ll_token");
  },
  getUser() {
    const raw = localStorage.getItem("ll_user");
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem("ll_token", token);
    localStorage.setItem("ll_user", JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem("ll_token");
    localStorage.removeItem("ll_user");
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  // Call this at the top of any page that requires login.
  // Sends the visitor to the login page if they're not signed in.
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = "login.html";
    }
  },
  // Call this at the top of admin-only pages.
  requireRole(role) {
    const user = this.getUser();
    if (!this.isLoggedIn() || !user || user.role !== role) {
      window.location.href = "index.html";
    }
  },
};

// A thin wrapper around fetch() that:
//  - prefixes the API base url
//  - attaches the login token automatically when present
//  - parses JSON and throws a readable error on failure
async function apiRequest(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = Auth.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Every controller sends { message: "..." } on error - surface that
    // to the UI instead of a generic "something broke".
    throw new Error(data.message || "Something went wrong. Please try again.");
  }

  return data;
}

// ---------- Small reusable UI helpers ----------

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("visible"), 3200);
}

function showFormMessage(el, message, isError = true) {
  el.textContent = message;
  el.classList.remove("form-error", "form-success");
  el.classList.add(isError ? "form-error" : "form-success", "visible");
}

// Animates a number counting up from 0 - used on the hero and impact stats.
// This is the "one orchestrated motion moment" for the landing page.
function animateCount(el, target, duration = 1400) {
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    // ease-out cubic - starts fast, settles gently, feels less mechanical
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
