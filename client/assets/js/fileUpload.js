async function uploadFile(file, endpoint = "/upload") {
  const formData = new FormData();
  formData.append("file", file);

  const result = await API.upload(endpoint, formData);
  return result.data;
}
