// js/search.js
// Powers search.html - anyone can use this, logged in or not.

let userLat = null;
let userLng = null;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    runSearch();
  });

  document.getElementById("useLocationBtn").addEventListener("click", useMyLocation);

  if (!Auth.isLoggedIn()) {
    document.getElementById("loginPrompt").style.display = "flex";
  }

  // Support being linked to with a pre-filled blood group, e.g.
  // index.html could someday link to search.html?bloodGroup=O+
  const params = new URLSearchParams(window.location.search);
  const presetGroup = params.get("bloodGroup");
  if (presetGroup) {
    document.getElementById("searchBloodGroup").value = presetGroup;
    runSearch();
  }
});

function useMyLocation() {
  const status = document.getElementById("locationStatus");
  if (!navigator.geolocation) {
    status.textContent = "Your browser doesn't support location sharing.";
    return;
  }

  status.textContent = "Getting your location...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;
      status.textContent = "Location added — results will be sorted by distance.";
      runSearch();
    },
    () => {
      status.textContent = "Couldn't get your location. You can still search by city.";
    }
  );
}

async function runSearch() {
  const results = document.getElementById("searchResults");
  results.innerHTML = `<div class="empty-state">Searching...</div>`;

  const bloodGroup = document.getElementById("searchBloodGroup").value;
  const city = document.getElementById("searchCity").value.trim();

  // IMPORTANT: blood groups contain "+" which a raw URL turns into a space -
  // encodeURIComponent avoids that (see CODE_EXPLAINED.md for the full story).
  const params = new URLSearchParams();
  if (bloodGroup) params.set("bloodGroup", bloodGroup);
  if (city) params.set("city", city);
  if (userLat != null) params.set("lat", userLat);
  if (userLng != null) params.set("lng", userLng);

  try {
    const data = await apiRequest(`/donors/search?${params.toString()}`, { auth: true });
    renderResults(data.donors || []);
  } catch (err) {
    results.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
  }
}

function renderResults(donors) {
  const results = document.getElementById("searchResults");

  if (!donors.length) {
    results.innerHTML = `<div class="empty-state">No available donors match that search yet.</div>`;
    return;
  }

  results.innerHTML = donors
    .map(
      (d) => `
    <div class="list-row">
      <div>
        <div class="title">${escapeHtml(d.name)} ${d.verified ? `<span class="badge badge-verified">Verified</span>` : ""}</div>
        <div class="meta">
          ${escapeHtml(d.area ? d.area + ", " : "")}${escapeHtml(d.city)}
          ${d.distanceKm != null ? ` · ${d.distanceKm} km away` : ""}
          ${d.phone ? ` · ${escapeHtml(d.phone)}` : " · log in to see contact number"}
        </div>
      </div>
      <span class="badge badge-blood">${escapeHtml(d.bloodGroup)}</span>
    </div>`
    )
    .join("");
}
