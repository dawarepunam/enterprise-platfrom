function openModalById(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("is-open");
}

function closeModalById(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("is-open");
}
