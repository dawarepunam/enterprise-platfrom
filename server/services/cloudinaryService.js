const cloudinary = require("cloudinary").v2;
const { getCloudinaryConfig } = require("../config/cloudinary");

function hasConfig(config) {
  return Boolean(config.cloudName && config.apiKey && config.apiSecret);
}

function configureCloudinary() {
  const config = getCloudinaryConfig();
  if (!hasConfig(config)) {
    return false;
  }

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
  });

  return true;
}

async function uploadToCloudinary(file = {}, options = {}) {
  const source = file.dataUri || file.url || file.path || "";
  if (!source) {
    throw new Error("File source is required for upload");
  }

  const configured = configureCloudinary();
  if (!configured) {
    return {
      provider: "direct-url",
      secure_url: file.url || file.dataUri || "",
      public_id: "",
      bytes: Number(file.size || 0),
      resource_type: file.resourceType || "auto",
      original_filename: file.name || "proof-file",
    };
  }

  return cloudinary.uploader.upload(source, {
    folder: options.folder || "enterprise-platform",
    resource_type: options.resourceType || "auto",
    public_id: options.publicId,
    overwrite: options.overwrite !== false,
  });
}

module.exports = { uploadToCloudinary };
