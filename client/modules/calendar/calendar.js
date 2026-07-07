document.addEventListener("DOMContentLoaded", async () => {
  await loadComponent("navbar", "../../../components/navbar.html");
  document.getElementById("moduleTimestamp").textContent = new Date().toLocaleString("en-IN");
});

async function loadComponent(elementId, filePath) {
  const response = await fetch(filePath);
  const html = await response.text();
  document.getElementById(elementId).innerHTML = html;
}
