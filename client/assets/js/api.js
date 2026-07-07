const API_BASE_URL = `${window.location.origin}/api`;

function normalizeApiOptions(methodOrOptions = "GET", data = null, isFormData = false) {
  if (typeof methodOrOptions === "object" && methodOrOptions !== null) {
    const options = { ...methodOrOptions };

    if (options.body && typeof options.body === "string") {
      try {
        options.body = JSON.parse(options.body);
      } catch (error) {
        // Keep the original string body if it is not valid JSON.
      }
    }

    return {
      method: options.method || "GET",
      data: options.body || null,
      isFormData: Boolean(options.isFormData),
    };
  }

  return {
    method: methodOrOptions || "GET",
    data,
    isFormData,
  };
}

async function apiRequest(endpoint, methodOrOptions = "GET", data = null, isFormData = false) {
  return apiRequestInternal(endpoint, methodOrOptions, data, isFormData, true);
}

async function apiRequestInternal(endpoint, methodOrOptions = "GET", data = null, isFormData = false, allowRefresh = true) {
  const token = localStorage.getItem("token");
  const normalized = normalizeApiOptions(methodOrOptions, data, isFormData);
  const options = {
    method: normalized.method,
    headers: {},
  };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (normalized.data) {
    if (normalized.isFormData) {
      options.body = normalized.data;
    } else {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(normalized.data);
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const contentType = response.headers.get("content-type") || "";
  const result = contentType.includes("application/json")
    ? await response.json()
    : { success: response.ok, message: await response.text() };

  if (response.status === 401) {
    const refreshed = allowRefresh ? await tryRefreshSession() : false;
    if (refreshed) {
      return apiRequestInternal(endpoint, methodOrOptions, data, isFormData, false);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    if (!window.location.pathname.endsWith("/login.html") && !window.location.pathname.endsWith("/index.html")) {
      window.location.href = "/login.html";
    }
    throw new Error(result.message || "Session expired");
  }

  if (!response.ok) {
    console.error("API request failed", { endpoint, method: normalized.method, status: response.status, result });
    throw new Error(result.message || "API request failed");
  }

  return result;
}

async function tryRefreshSession() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    const result = await response.json();
    if (!response.ok || !result?.data?.token) {
      return false;
    }

    localStorage.setItem("token", result.data.token);
    if (result.data.refreshToken) {
      localStorage.setItem("refreshToken", result.data.refreshToken);
    }
    if (result.data.user) {
      localStorage.setItem("user", JSON.stringify(result.data.user));
    }
    return true;
  } catch (error) {
    return false;
  }
}

const API = {
  get: (url) => apiRequest(url),
  post: (url, data) => apiRequest(url, "POST", data),
  put: (url, data) => apiRequest(url, "PUT", data),
  delete: (url) => apiRequest(url, "DELETE"),
  upload: (url, formData) => apiRequest(url, "POST", formData, true),
};

window.apiRequest = apiRequest;
window.API = API;
