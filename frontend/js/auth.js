// js/auth.js
// Powers both login.html and register.html. Only the form that exists
// on the current page will have its listener attached.

let selectedRole = "donor";

document.addEventListener("DOMContentLoaded", () => {
  // Pre-select role from a query param, e.g. register.html?role=requester
  const params = new URLSearchParams(window.location.search);
  const roleParam = params.get("role");
  if (roleParam === "requester" || roleParam === "donor") {
    selectedRole = roleParam;
  }

  const roleOptions = document.querySelectorAll(".role-option");
  const bloodGroupGroup = document.getElementById("bloodGroupGroup");

  function applyRoleUI() {
    roleOptions.forEach((opt) => opt.classList.toggle("active", opt.dataset.role === selectedRole));
    if (bloodGroupGroup) {
      bloodGroupGroup.style.display = selectedRole === "donor" ? "block" : "none";
      document.getElementById("bloodGroup").required = selectedRole === "donor";
    }
  }

  roleOptions.forEach((opt) => {
    opt.addEventListener("click", () => {
      selectedRole = opt.dataset.role;
      applyRoleUI();
    });
  });
  if (roleOptions.length) applyRoleUI();

  const registerForm = document.getElementById("registerForm");
  if (registerForm) registerForm.addEventListener("submit", handleRegister);

  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);
});

async function handleRegister(e) {
  e.preventDefault();
  const errorBox = document.getElementById("formError");
  const submitBtn = document.getElementById("submitBtn");
  errorBox.classList.remove("visible");

  const payload = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    phone: document.getElementById("phone").value.trim(),
    city: document.getElementById("city").value.trim(),
    area: document.getElementById("area").value.trim(),
    role: selectedRole,
    bloodGroup: selectedRole === "donor" ? document.getElementById("bloodGroup").value : undefined,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account...";

  try {
    const data = await apiRequest("/auth/register", { method: "POST", body: payload });
    Auth.setSession(data.token, data.user);
    window.location.href = data.user.role === "admin" ? "admin.html" : "dashboard.html";
  } catch (err) {
    showFormMessage(errorBox, err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = "Create account";
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const errorBox = document.getElementById("formError");
  const submitBtn = document.getElementById("submitBtn");
  errorBox.classList.remove("visible");

  const payload = {
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Logging in...";

  try {
    const data = await apiRequest("/auth/login", { method: "POST", body: payload });
    Auth.setSession(data.token, data.user);
    window.location.href = data.user.role === "admin" ? "admin.html" : "dashboard.html";
  } catch (err) {
    showFormMessage(errorBox, err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = "Log in";
  }
}
