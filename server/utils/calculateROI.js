function calculateROI(revenue = 0, spend = 0) {
  if (!spend) return 0;
  return Number((((revenue - spend) / spend) * 100).toFixed(2));
}

module.exports = calculateROI;
