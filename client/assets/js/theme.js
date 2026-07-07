function initTheme() {
  localStorage.setItem("theme", "light");
  document.body.classList.remove("dark");
}

function toggleTheme() {
  localStorage.setItem("theme", "light");
  document.body.classList.remove("dark");
}

document.addEventListener("DOMContentLoaded", initTheme);
