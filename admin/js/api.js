// API Service Utility for Frontend Integration
class BabyFoodAPI {
  constructor(baseURL = (typeof window !== 'undefined' ? window.location.origin : 'https://baby8-lz4t.onrender.com') + '/api') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error: ${error.message}`);
      throw error;
    }
  }

  // Auth Methods
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email, password, name) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Baby Food Methods
  async getBabyFoods(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/baby-foods${params ? '?' + params : ''}`);
  }

  async getBabyFood(id) {
    return this.request(`/baby-foods/${id}`);
  }

  async createBabyFood(formData) {
    const headers = this.getHeaders();
    delete headers['Content-Type']; // Let browser set it for FormData

    const response = await fetch(`${this.baseURL}/baby-foods`, {
      method: 'POST',
      headers: {
        Authorization: headers['Authorization'],
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    return data;
  }

  async updateBabyFood(id, formData) {
    const headers = this.getHeaders();
    delete headers['Content-Type'];

    const response = await fetch(`${this.baseURL}/baby-foods/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: headers['Authorization'],
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    return data;
  }

  async deleteBabyFood(id) {
    return this.request(`/baby-foods/${id}`, {
      method: 'DELETE',
    });
  }

  // Blog Methods
  async getBlogs(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/blogs${params ? '?' + params : ''}`);
  }

  async getBlog(id) {
    return this.request(`/blogs/${id}`);
  }

  async createBlog(formData) {
    const headers = this.getHeaders();
    delete headers['Content-Type'];

    const response = await fetch(`${this.baseURL}/blogs`, {
      method: 'POST',
      headers: {
        Authorization: headers['Authorization'],
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    return data;
  }

  async updateBlog(id, formData) {
    const headers = this.getHeaders();
    delete headers['Content-Type'];

    const response = await fetch(`${this.baseURL}/blogs/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: headers['Authorization'],
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    return data;
  }

  async deleteBlog(id) {
    return this.request(`/blogs/${id}`, {
      method: 'DELETE',
    });
  }

  // Category Methods
  async getCategories(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/categories${params ? '?' + params : ''}`);
  }

  async getCategory(id) {
    return this.request(`/categories/${id}`);
  }

  async createCategory(formData) {
    const headers = this.getHeaders();
    delete headers['Content-Type'];

    const response = await fetch(`${this.baseURL}/categories`, {
      method: 'POST',
      headers: {
        Authorization: headers['Authorization'],
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    return data;
  }

  async updateCategory(id, formData) {
    const headers = this.getHeaders();
    delete headers['Content-Type'];

    const response = await fetch(`${this.baseURL}/categories/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: headers['Authorization'],
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    return data;
  }

  async deleteCategory(id) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE',
    });
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BabyFoodAPI;
}
