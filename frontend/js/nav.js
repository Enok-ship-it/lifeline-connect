// js/nav.js
// Runs on every page. Swaps "Log in / Join now" for "Dashboard / Log out"
// when someone is already signed in, and wires up the mobile menu button.

document.addEventListener("DOMContentLoaded", () => {
  const actions = document.querySelector(".nav-actions");
  if (actions) {
    if (Auth.isLoggedIn()) {
      const user = Auth.getUser();
      const dashboardHref = user.role === "admin" ? "admin.html" : "dashboard.html";
      actions.innerHTML = `
        <a href="${dashboardHref}" class="btn btn-secondary">Dashboard</a>
        <button class="btn btn-primary" id="navLogoutBtn">Log out</button>
      `;
      document.getElementById("navLogoutBtn").addEventListener("click", () => {
        Auth.clearSession();
        window.location.href = "index.html";
      });
    }
  }

  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const isOpen = links.style.display === "flex";
      links.style.display = isOpen ? "none" : "flex";
      links.style.flexDirection = "column";
      links.style.position = "absolute";
      links.style.top = "72px";
      links.style.left = "0";
      links.style.right = "0";
      links.style.background = "var(--paper)";
      links.style.padding = "20px 24px";
      links.style.borderBottom = "1px solid var(--line)";
    });
  }
});
