// main.js - site-wide custom JS

document.addEventListener('DOMContentLoaded', function() {
  // AOS animation init
  if (window.AOS) {
    AOS.init({ duration: 800, once: true });
  }

  // Dark mode toggle logic
  const toggle = document.getElementById("darkModeToggle");
  const icon = document.getElementById("darkModeIcon");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const storedTheme = localStorage.getItem("theme");
  function setTheme(dark) {
    document.body.classList.toggle("dark-mode", dark);
    icon.className = dark ? "bi bi-sun" : "bi bi-moon";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }
  // Initial theme
  setTheme(storedTheme === "dark" || (!storedTheme && prefersDark));
  if (toggle) {
    toggle.addEventListener("click", () => {
      setTheme(!document.body.classList.contains("dark-mode"));
    });
  }
});
