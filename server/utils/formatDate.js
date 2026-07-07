function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN");
}

module.exports = formatDate;
