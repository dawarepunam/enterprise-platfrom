class ProductAPI {
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
      const response = await fetch(`/api/product${endpoint}`, options);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'API Error');
      }
      return result.data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      if (window.UI) window.UI.toast(error.message, 'error');
      throw error;
    }
  }

  // Dashboard
  static getDashboardStats() { return this.request('/dashboard-stats'); }
  
  // PM Queue
  static getQueue() { return this.request('/queue'); }
  
  // Requirements CRUD
  static getRequirement(id) { return this.request(`/requirement/${id}`); }
  static updateRequirement(id, data) { return this.request(`/requirement/${id}`, 'PUT', data); }
  
  // Requirement Freeze & Project Gen
  static freezeRequirement(id) { return this.request(`/requirement/${id}/freeze`, 'POST'); }
  static generateProject(id) { return this.request(`/requirement/${id}/generate-project`, 'POST'); }
  static assignPM(id, pmId) { return this.request(`/requirement/${id}/assign-pm`, 'POST', { pmId }); }

  // Sub-documents operations helper
  static addSubdoc(reqId, type, data) { return this.request(`/requirement/${reqId}/${type}`, 'POST', data); }
  static updateSubdoc(reqId, type, itemId, data) { return this.request(`/requirement/${reqId}/${type}/${itemId}`, 'PUT', data); }
  static deleteSubdoc(reqId, type, itemId) { return this.request(`/requirement/${reqId}/${type}/${itemId}`, 'DELETE'); }
}

window.ProductAPI = ProductAPI;
