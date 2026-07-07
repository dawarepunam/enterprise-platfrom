class HRAPI {
  static getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  static async request(endpoint, method = 'GET', data = null) {
    try {
      const options = {
        method,
        headers: this.getHeaders()
      };
      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }
      const response = await fetch(`/api/hr${endpoint}`, options);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'API Error');
      }
      return result.data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      if (window.UI && window.UI.toast) window.UI.toast(error.message, 'error');
      throw error;
    }
  }

  // Define HR specific endpoints here as we build them out
  static getDashboardStats() { return this.request('/dashboard-stats'); }
  static getEmployees() { return this.request('/employees'); }
}

window.HRAPI = HRAPI;
