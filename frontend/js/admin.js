// js/admin.js
// Drives admin.html - only reachable by users with role "admin"
// (Auth.requireRole enforces this and also the backend re-checks the
// role server-side, since a client-side check alone can be bypassed).

let adminUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  Auth.requireRole("admin");
  adminUser = Auth.getUser();
  document.getElementById("sidebarName").textContent = adminUser.name;

  setupTabs();
  await loadStats();
  await loadAnalyticsCharts();
  await loadDonors();
  await loadAllRequests();
  await loadEvents();

  document.getElementById("eventForm").addEventListener("submit", handleCreateEvent);
});

function setupTabs() {
  const tabs = document.querySelectorAll(".nav-tab");
  const panels = document.querySelectorAll(".tab-panel");
  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      panels.forEach((p) => (p.style.display = "none"));
      document.getElementById(tab.dataset.tab).style.display = "block";
    });
  });
}

async function loadStats() {
  try {
    const stats = await apiRequest("/admin/stats", { auth: true });
    document.getElementById("statTotalDonors").textContent = stats.totalDonors;
    document.getElementById("statVerifiedDonors").textContent = stats.verifiedDonors;
    document.getElementById("statOpenReq").textContent = stats.openRequests;
    document.getElementById("statFulfilledReq").textContent = stats.fulfilledRequests;
  } catch (err) {
    showToast(err.message);
  }
}

// Design tokens match css/style.css so the charts don't look bolted-on.
const CHART_COLORS = {
  crimson: "#B91C3C",
  teal: "#146356",
  ink: "#201C1A",
  line: "#D8CFC2",
};

async function loadAnalyticsCharts() {
  try {
    const data = await apiRequest("/admin/analytics", { auth: true });
    renderBloodGroupChart(data.requestsByBloodGroup || {});
    renderDonationsChart(data.donationsByMonth || {});
  } catch (err) {
    console.warn("Could not load analytics:", err.message);
  }
}

function renderBloodGroupChart(dataObj) {
  const canvas = document.getElementById("bloodGroupChart");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = Object.keys(dataObj);
  const values = Object.values(dataObj);

  if (!labels.length) {
    canvas.replaceWith(Object.assign(document.createElement("div"), { className: "empty-state", textContent: "No requests yet to chart." }));
    return;
  }

  new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Requests", data: values, backgroundColor: CHART_COLORS.crimson, borderRadius: 4 }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function renderDonationsChart(dataObj) {
  const canvas = document.getElementById("donationsChart");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = Object.keys(dataObj).sort();
  const values = labels.map((k) => dataObj[k]);

  if (!labels.length) {
    canvas.replaceWith(Object.assign(document.createElement("div"), { className: "empty-state", textContent: "No completed donations yet to chart." }));
    return;
  }

  new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Completed donations",
          data: values,
          borderColor: CHART_COLORS.teal,
          backgroundColor: "rgba(20, 99, 86, 0.1)",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

async function loadDonors() {
  const list = document.getElementById("adminDonorsList");
  try {
    const { donors } = await apiRequest("/admin/donors", { auth: true });

    if (!donors.length) {
      list.innerHTML = `<div class="empty-state">No donors registered yet.</div>`;
      return;
    }

    list.innerHTML = donors
      .map(
        (d) => `
      <div class="list-row">
        <div>
          <div class="title">${escapeHtml(d.name)}</div>
          <div class="meta">${escapeHtml(d.email)} · ${escapeHtml(d.city)} · ${escapeHtml(d.bloodGroup || "—")}</div>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          ${d.verified ? `<span class="badge badge-verified">Verified</span>` : `<button class="btn btn-secondary" data-verify-id="${d._id}">Verify</button>`}
        </div>
      </div>`
      )
      .join("");

    list.querySelectorAll("[data-verify-id]").forEach((btn) => {
      btn.addEventListener("click", () => verifyDonor(btn.dataset.verifyId));
    });
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Couldn't load donors.</div>`;
  }
}

async function verifyDonor(id) {
  try {
    await apiRequest(`/admin/donors/${id}/verify`, { method: "PATCH", auth: true });
    showToast("Donor verified.");
    await loadDonors();
    await loadStats();
  } catch (err) {
    showToast(err.message);
  }
}

async function loadAllRequests() {
  const list = document.getElementById("adminRequestsList");
  try {
    const { requests } = await apiRequest("/admin/requests", { auth: true });

    if (!requests.length) {
      list.innerHTML = `<div class="empty-state">No requests posted yet.</div>`;
      return;
    }

    list.innerHTML = requests
      .map(
        (r) => `
      <div class="list-row">
        <div>
          <div class="title">${escapeHtml(r.patientName)} — ${escapeHtml(r.bloodGroup)}</div>
          <div class="meta">${escapeHtml(r.hospitalName)}, ${escapeHtml(r.city)} · by ${r.requester ? escapeHtml(r.requester.name) : "unknown"} · ${formatDate(r.createdAt)}</div>
        </div>
        <span class="badge ${r.status === "open" ? "badge-blood" : "badge-verified"}">${r.status}</span>
      </div>`
      )
      .join("");
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Couldn't load requests.</div>`;
  }
}

async function loadEvents() {
  const list = document.getElementById("adminEventsList");
  try {
    const { events } = await apiRequest("/events");
    list.innerHTML = events.length
      ? events
          .map(
            (ev) => `
        <div class="list-row">
          <div>
            <div class="title">${escapeHtml(ev.title)}</div>
            <div class="meta">${escapeHtml(ev.location)} · ${escapeHtml(ev.organizerName)}</div>
          </div>
          <div class="meta">${formatDate(ev.date)}</div>
        </div>`
          )
          .join("")
      : `<div class="empty-state">No events yet - add one above.</div>`;
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Couldn't load events.</div>`;
  }
}

async function handleCreateEvent(e) {
  e.preventDefault();
  const errorBox = document.getElementById("eventFormError");
  const successBox = document.getElementById("eventFormSuccess");
  errorBox.classList.remove("visible");
  successBox.classList.remove("visible");

  const payload = {
    title: document.getElementById("evTitle").value.trim(),
    date: document.getElementById("evDate").value,
    location: document.getElementById("evLocation").value.trim(),
    organizerName: document.getElementById("evOrganizer").value.trim(),
    description: document.getElementById("evDescription").value.trim(),
  };

  const btn = document.getElementById("eventSubmitBtn");
  btn.disabled = true;
  btn.textContent = "Adding...";

  try {
    await apiRequest("/admin/events", { method: "POST", auth: true, body: payload });
    showFormMessage(successBox, "Event added.", false);
    document.getElementById("eventForm").reset();
    await loadEvents();
  } catch (err) {
    showFormMessage(errorBox, err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Add event";
  }
}
