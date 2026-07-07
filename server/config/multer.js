function getUploadConfig() {
  return {
    limits: { fileSize: 10 * 1024 * 1024 },
  };
}

module.exports = { getUploadConfig };
