// js/effects.js
// Three small, dependency-free effects shared across pages. Each one is
// opt-in via a CSS class, so adding a new animated section anywhere just
// means adding the class - no new JS needed.

document.addEventListener("DOMContentLoaded", () => {
  setupScrollReveal();
  setupTilt();
  setupParticles();
});

// ---------- 1. Scroll reveal ----------
// Any element with class "reveal" or "reveal-stagger" fades/slides in the
// first time it enters the viewport. IntersectionObserver fires a callback
// when an element crosses a visibility threshold - far cheaper than
// checking scroll position by hand on every scroll event.
function setupScrollReveal() {
  const targets = document.querySelectorAll(".reveal, .reveal-stagger");
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    // Very old browser fallback - just show everything immediately.
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target); // only animate in once
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((el) => observer.observe(el));
}

// ---------- 2. 3D tilt on mouse move ----------
// Any element with class "tilt" gently rotates in 3D toward the cursor,
// like the card is a physical object catching the light. This is pure
// trigonometry on mouse position, no library needed.
function setupTilt() {
  const cards = document.querySelectorAll(".tilt");

  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; // mouse position inside the card
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // How far the mouse is from center, as a fraction (-1 to 1),
      // scaled down to a subtle 6-degree maximum tilt.
      const rotateY = ((x - centerX) / centerX) * 6;
      const rotateX = ((centerY - y) / centerY) * 6;

      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(800px) rotateX(0) rotateY(0) scale(1)";
    });
  });
}

// ---------- 3. Floating particles ----------
// Any element with class "particles" gets filled with small dots that
// drift upward and fade out, each with a randomized position, size,
// speed, and delay so they don't look mechanically identical.
function setupParticles() {
  const containers = document.querySelectorAll(".particles");

  containers.forEach((container) => {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const dot = document.createElement("span");
      dot.className = "particle";

      const left = Math.random() * 100; // % across the container
      const size = 3 + Math.random() * 5; // px
      const duration = 8 + Math.random() * 10; // seconds to float up
      const delay = Math.random() * 10; // seconds before starting
      const drift = -30 + Math.random() * 60; // sideways drift in px

      dot.style.left = `${left}%`;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.animationDuration = `${duration}s`;
      dot.style.animationDelay = `${delay}s`;
      dot.style.setProperty("--drift", `${drift}px`);

      container.appendChild(dot);
    }
  });
}
