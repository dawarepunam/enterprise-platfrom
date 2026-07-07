function logger(message, meta = {}) {
  console.log(`[Enterprise] ${message}`, meta);
}

module.exports = logger;
