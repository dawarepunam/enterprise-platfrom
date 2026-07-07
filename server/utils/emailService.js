// Mock email service
const sendEmail = async (options) => {
  console.log(`[Email Mock] Sending email to: ${options.to}, Subject: ${options.subject}`);
  return true;
};

module.exports = { sendEmail };
