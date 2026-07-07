async function uploadFile(file, folder = "enterprise-platform") {
  return {
    url: URL.createObjectURL(file),
    name: file.name,
    folder,
    provider: "local-preview",
  };
}
