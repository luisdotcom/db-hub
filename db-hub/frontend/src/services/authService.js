const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

export const authService = {
  async login(username, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    return await response.json();
  },

  async checkSession() {
    try {
      const response = await fetch(`${API_URL}/auth/session`, {
        credentials: 'include',
      });

      if (!response.ok) {
        return { authenticated: false };
      }

      return await response.json();
    } catch (error) {
      console.error('Session check failed:', error);
      return { authenticated: false };
    }
  },

  async logout() {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Logout failed');
    }

    return await response.json();
  },
};
