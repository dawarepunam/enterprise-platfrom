function setLanguage(lang) {
  localStorage.setItem("language", lang);
  location.reload();
}

function getLanguage() {
  return localStorage.getItem("language") || "en";
}
