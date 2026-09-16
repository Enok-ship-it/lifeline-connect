// js/home.js
// Populates the landing page with real data from the API:
// donor count, leaderboard, upcoming events, and impact numbers.

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([loadHeroStats(), loadLeaderboard(), loadEvents()]);
});

async function loadHeroStats() {
  try {
    const [donorsRes, requestsRes] = await Promise.all([
      apiRequest("/donors/search"),
      apiRequest("/requests?status=open"),
    ]);

    const donors = donorsRes.donors || [];
    const openRequests = requestsRes.requests || [];
    const cities = new Set(donors.map((d) => d.city));

    animateCount(document.getElementById("heroDonorCount"), donors.length);
    animateCount(document.getElementById("heroRequestCount"), openRequests.length);
    animateCount(document.getElementById("heroCityCount"), cities.size);

    animateCount(document.getElementById("impactDonors"), donors.length);
    animateCount(document.getElementById("impactRequests"), openRequests.length);
    animateCount(document.getElementById("impactCities"), cities.size);

    const allRequestsRes = await apiRequest("/requests");
    const fulfilled = (allRequestsRes.requests || []).filter((r) => r.status === "fulfilled");
    animateCount(document.getElementById("impactFulfilled"), fulfilled.length);
  } catch (err) {
    // If the backend isn't running yet, fail quietly on the landing page -
    // no need to alarm a first-time visitor with an error toast.
    console.warn("Could not load live stats:", err.message);
  }
}

async function loadLeaderboard() {
  const list = document.getElementById("leaderboardList");
  try {
    const { leaderboard } = await apiRequest("/donors/leaderboard");

    if (!leaderboard.length) {
      list.innerHTML = `<div class="empty-state">No donors yet — be the first to register.</div>`;
      return;
    }

    list.innerHTML = leaderboard
      .map(
        (donor, i) => `
      <div class="lb-row ${i === 0 ? "rank-1" : ""}">
        <div class="lb-rank">${i + 1}</div>
        <div>
          <div class="lb-name">${escapeHtml(donor.name)}</div>
          <div class="lb-meta">${escapeHtml(donor.city)}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <span class="badge badge-blood">${escapeHtml(donor.bloodGroup || "—")}</span>
          ${donor.verified ? `<span class="badge badge-verified">Verified</span>` : ""}
        </div>
        <div class="lb-points">${donor.points} pts</div>
      </div>`
      )
      .join("");
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Couldn't load the leaderboard right now.</div>`;
  }
}

async function loadEvents() {
  const list = document.getElementById("eventsList");
  try {
    const { events } = await apiRequest("/events");

    if (!events.length) {
      list.innerHTML = `<div class="empty-state">No camps scheduled right now — check back soon.</div>`;
      return;
    }

    list.innerHTML = events
      .map(
        (ev) => `
      <div class="list-row">
        <div>
          <div class="title">${escapeHtml(ev.title)}</div>
          <div class="meta">${escapeHtml(ev.location)} · organized by ${escapeHtml(ev.organizerName)}</div>
        </div>
        <div class="meta">${formatDate(ev.date)}</div>
      </div>`
      )
      .join("");
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Couldn't load events right now.</div>`;
  }
}
