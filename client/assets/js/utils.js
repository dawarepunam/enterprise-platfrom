function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

function formatDateTime(date) {
  return new Date(date).toLocaleString();
}

function capitalize(text = "") {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
