// js/dashboard.js
// Drives dashboard.html. The page has ONE html file for both donor and
// requester roles - this file shows/hides the right sections and wires
// up the right actions depending on who's logged in.

let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  Auth.requireLogin();
  currentUser = Auth.getUser();

  if (currentUser.role === "admin") {
    window.location.href = "admin.html";
    return;
  }

  setupRoleVisibility();
  setupTabs();
  populateSidebar();

  if (currentUser.role === "donor") {
    await loadDonorOverview();
    await loadMatchingRequests();
    await loadMyDonations();
    document.getElementById("toggleAvailabilityBtn").addEventListener("click", toggleAvailability);
  } else {
    await loadRequesterOverview();
    document.getElementById("requestForm").addEventListener("submit", handlePostRequest);
  }

  await loadLeaderboardTab();
});

function setupRoleVisibility() {
  document.querySelectorAll("[data-role]").forEach((el) => {
    if (el.dataset.role !== currentUser.role) {
      el.style.display = "none";
    }
  });
}

function populateSidebar() {
  document.getElementById("sidebarName").textContent = currentUser.name;
  document.getElementById("sidebarRole").textContent =
    currentUser.role === "donor" ? "Donor" : "Requester";
  document.getElementById("welcomeName").textContent = currentUser.name.split(" ")[0];
}

function setupTabs() {
  const tabs = document.querySelectorAll(".nav-tab");
  const panels = document.querySelectorAll(".tab-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      // Don't switch to a tab that's hidden for this role.
      if (tab.style.display === "none") return;

      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      panels.forEach((p) => (p.style.display = "none"));
      document.getElementById(tab.dataset.tab).style.display = "block";
    });
  });
}

// ---------- Donor view ----------

async function loadDonorOverview() {
  document.getElementById("statPoints").textContent = currentUser.points ?? 0;
  document.getElementById("statBloodGroup").textContent = currentUser.bloodGroup || "—";
  document.getElementById("statAvailability").textContent = currentUser.isAvailable ? "Available" : "Paused";
  document.getElementById("statVerified").textContent = currentUser.verified ? "Verified" : "Pending";

  const btn = document.getElementById("toggleAvailabilityBtn");
  btn.textContent = currentUser.isAvailable ? "Mark unavailable" : "Mark available";
}

async function toggleAvailability() {
  try {
    const data = await apiRequest("/donors/availability", {
      method: "PATCH",
      auth: true,
      body: { isAvailable: !currentUser.isAvailable },
    });
    currentUser = data.user;
    Auth.setSession(Auth.getToken(), currentUser);
    loadDonorOverview();
    showToast(currentUser.isAvailable ? "You're marked as available." : "You're marked as unavailable.");
  } catch (err) {
    showToast(err.message);
  }
}

async function loadMatchingRequests() {
  const list = document.getElementById("matchingRequestsList");
  try {
    const { requests } = await apiRequest(
      `/requests?status=open&bloodGroup=${encodeURIComponent(currentUser.bloodGroup)}`
    );

    if (!requests.length) {
      list.innerHTML = `<div class="empty-state">No open requests match your blood group right now. Check back soon.</div>`;
      return;
    }

    list.innerHTML = requests.map(requestRowHTML).join("");

    list.querySelectorAll("[data-pledge-id]").forEach((btn) => {
      btn.addEventListener("click", () => pledgeToRequest(btn.dataset.pledgeId, btn));
    });
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Couldn't load requests right now.</div>`;
  }
}

async function pledgeToRequest(requestId, btn) {
  btn.disabled = true;
  btn.textContent = "Pledging...";
  try {
    await apiRequest(`/requests/${requestId}/pledge`, { method: "POST", auth: true });
    showToast("Pledge recorded. Thank you for stepping up.");
    btn.textContent = "Pledged ✓";
  } catch (err) {
    showToast(err.message);
    btn.disabled = false;
    btn.textContent = "Pledge to donate";
  }
}

// ---------- Donor: donation history + certificates ----------

async function loadMyDonations() {
  const list = document.getElementById("myDonationsList");
  try {
    const { donations } = await apiRequest("/donations/mine", { auth: true });

    if (!donations.length) {
      list.innerHTML = `<div class="empty-state">You haven't pledged or completed a donation yet.</div>`;
      return;
    }

    list.innerHTML = donations
      .map((d) => {
        const req = d.request || {};
        return `
        <div class="list-row">
          <div>
            <div class="title">${escapeHtml(req.patientName || "Request removed")}${req.hospitalName ? " — " + escapeHtml(req.hospitalName) : ""}</div>
            <div class="meta">${escapeHtml(req.city || "")} · pledged ${formatDate(d.createdAt)}</div>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <span class="badge ${d.status === "completed" ? "badge-verified" : "badge-blood"}">${d.status}</span>
            ${d.status === "completed" ? `<button class="btn btn-secondary" data-cert-id="${d._id}">Download certificate</button>` : ""}
          </div>
        </div>`;
      })
      .join("");

    list.querySelectorAll("[data-cert-id]").forEach((btn) => {
      btn.addEventListener("click", () => downloadCertificate(btn.dataset.certId, btn));
    });
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Couldn't load your donation history.</div>`;
  }
}

// Certificates are PDF files behind a login-protected route, so we can't
// just link to them directly (a plain <a href> can't attach an auth
// header). Instead we fetch the file as a "blob" (raw binary data) with
// our token attached, then trigger a normal browser download from that.
async function downloadCertificate(donationId, btn) {
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Preparing...";

  try {
    const res = await fetch(`/api/donations/${donationId}/certificate`, {
      headers: { Authorization: `Bearer ${Auth.getToken()}` },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Could not download certificate.");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${donationId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    showToast(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

function requestRowHTML(req) {
  return `
    <div class="list-row">
      <div>
        <div class="title">${escapeHtml(req.patientName)} needs ${escapeHtml(req.bloodGroup)}</div>
        <div class="meta">${escapeHtml(req.hospitalName)}, ${escapeHtml(req.city)} · ${req.unitsNeeded} unit(s) ·
          <span class="urgency-${req.urgency}">${req.urgency} urgency</span>
        </div>
      </div>
      <button class="btn btn-primary" data-pledge-id="${req._id}">Pledge to donate</button>
    </div>`;
}

// ---------- Requester view ----------

async function loadRequesterOverview() {
  try {
    const { requests } = await apiRequest("/requests");
    const mine = requests.filter((r) => r.requester && r.requester._id === currentUser._id);

    document.getElementById("statOpenCount").textContent = mine.filter((r) => r.status === "open").length;
    document.getElementById("statFulfilledCount").textContent = mine.filter((r) => r.status === "fulfilled").length;

    const list = document.getElementById("myRequestsList");
    if (!mine.length) {
      list.innerHTML = `<div class="empty-state">You haven't posted a request yet.</div>`;
    } else {
      list.innerHTML = mine
        .map(
          (r) => `
        <div>
          <div class="list-row">
            <div>
              <div class="title">${escapeHtml(r.patientName)} — ${escapeHtml(r.bloodGroup)}</div>
              <div class="meta">${escapeHtml(r.hospitalName)}, ${escapeHtml(r.city)} · posted ${formatDate(r.createdAt)}</div>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
              <span class="badge ${r.status === "open" ? "badge-blood" : "badge-verified"}">${r.status}</span>
              ${r.status === "open" ? `<button class="btn btn-secondary" data-view-pledges="${r._id}">View pledges</button>` : ""}
            </div>
          </div>
          <div id="pledges-${r._id}" style="display:none; padding:0 0 16px 16px;"></div>
        </div>`
        )
        .join("");

      list.querySelectorAll("[data-view-pledges]").forEach((btn) => {
        btn.addEventListener("click", () => togglePledges(btn.dataset.viewPledges, btn));
      });
    }
  } catch (err) {
    showToast(err.message);
  }
}

async function togglePledges(requestId, btn) {
  const container = document.getElementById(`pledges-${requestId}`);
  const isOpen = container.style.display === "block";

  if (isOpen) {
    container.style.display = "none";
    btn.textContent = "View pledges";
    return;
  }

  container.style.display = "block";
  btn.textContent = "Hide pledges";
  container.innerHTML = `<div class="empty-state">Loading pledges...</div>`;

  try {
    const { pledges } = await apiRequest(`/requests/${requestId}/pledges`, { auth: true });

    if (!pledges.length) {
      container.innerHTML = `<div class="empty-state">No one has pledged yet.</div>`;
      return;
    }

    container.innerHTML = pledges
      .map(
        (p) => `
      <div class="list-row">
        <div>
          <div class="title">${escapeHtml(p.donor.name)} ${p.donor.verified ? `<span class="badge badge-verified">Verified</span>` : ""}</div>
          <div class="meta">${escapeHtml(p.donor.bloodGroup)} · ${escapeHtml(p.donor.phone)} · pledged ${formatDate(p.createdAt)}</div>
        </div>
        ${
          p.status === "pledged"
            ? `<button class="btn btn-primary" data-complete-donation="${p._id}" data-request-id="${requestId}">Mark donation complete</button>`
            : `<span class="badge badge-verified">Completed</span>`
        }
      </div>`
      )
      .join("");

    container.querySelectorAll("[data-complete-donation]").forEach((completeBtn) => {
      completeBtn.addEventListener("click", () =>
        markDonationComplete(completeBtn.dataset.requestId, completeBtn.dataset.completeDonation, completeBtn)
      );
    });
  } catch (err) {
    container.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
  }
}

async function markDonationComplete(requestId, donationId, btn) {
  btn.disabled = true;
  btn.textContent = "Confirming...";
  try {
    await apiRequest(`/requests/${requestId}/complete-donation`, {
      method: "PATCH",
      auth: true,
      body: { donationId },
    });
    showToast("Donation confirmed. The donor has been thanked and awarded points.");
    await loadRequesterOverview();
  } catch (err) {
    showToast(err.message);
    btn.disabled = false;
    btn.textContent = "Mark donation complete";
  }
}

async function handlePostRequest(e) {
  e.preventDefault();
  const errorBox = document.getElementById("requestFormError");
  const successBox = document.getElementById("requestFormSuccess");
  errorBox.classList.remove("visible");
  successBox.classList.remove("visible");

  const payload = {
    patientName: document.getElementById("patientName").value.trim(),
    bloodGroup: document.getElementById("reqBloodGroup").value,
    unitsNeeded: Number(document.getElementById("unitsNeeded").value),
    urgency: document.getElementById("urgency").value,
    hospitalName: document.getElementById("hospitalName").value.trim(),
    city: document.getElementById("reqCity").value.trim(),
    area: document.getElementById("reqArea").value.trim(),
    notes: document.getElementById("notes").value.trim(),
  };

  const btn = document.getElementById("requestSubmitBtn");
  btn.disabled = true;
  btn.textContent = "Posting...";

  try {
    await apiRequest("/requests", { method: "POST", auth: true, body: payload });
    showFormMessage(successBox, "Request posted. Nearby donors will now see it.", false);
    document.getElementById("requestForm").reset();
    await loadRequesterOverview();
  } catch (err) {
    showFormMessage(errorBox, err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Post request";
  }
}

// ---------- Shared: leaderboard tab ----------

async function loadLeaderboardTab() {
  const list = document.getElementById("dashboardLeaderboard");
  try {
    const { leaderboard } = await apiRequest("/donors/leaderboard");
    list.innerHTML = leaderboard.length
      ? leaderboard
          .map(
            (donor, i) => `
        <div class="lb-row ${i === 0 ? "rank-1" : ""}">
          <div class="lb-rank">${i + 1}</div>
          <div><div class="lb-name">${escapeHtml(donor.name)}</div><div class="lb-meta">${escapeHtml(donor.city)}</div></div>
          <span class="badge badge-blood">${escapeHtml(donor.bloodGroup || "—")}</span>
          <div class="lb-points">${donor.points} pts</div>
        </div>`
          )
          .join("")
      : `<div class="empty-state">No donors yet.</div>`;
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Couldn't load the leaderboard.</div>`;
  }
}
