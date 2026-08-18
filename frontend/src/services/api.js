const API_BASE = 'http://localhost:5000/api';

/**
 * Get the stored access token
 */
export const getToken = () => localStorage.getItem('accessToken');

/**
 * Store the access token
 */
export const setToken = (token) => localStorage.setItem('accessToken', token);

/**
 * Remove the access token
 */
export const removeToken = () => localStorage.removeItem('accessToken');

/**
 * Core fetch wrapper with auth headers, error handling, and token refresh
 */
async function request(endpoint, options = {}) {
  const { body, method = 'GET', headers = {} } = options;

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include', // for httpOnly cookies (refresh token)
  };

  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    config.body = JSON.stringify(body);
  }

  let res = await fetch(`${API_BASE}${endpoint}`, config);

  // If 401, try to refresh the token once
  if (res.status === 401 && token) {
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      if (refreshData.success && refreshData.data.accessToken) {
        setToken(refreshData.data.accessToken);
        config.headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
        res = await fetch(`${API_BASE}${endpoint}`, config);
      }
    } else {
      // Refresh failed — clear token and redirect to login
      removeToken();
      window.location.href = '/admin/login';
      throw new Error('Session expired');
    }
  }

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data?.error?.message || 'Something went wrong');
    error.code = data?.error?.code;
    error.status = res.status;
    error.fields = data?.error?.fields;
    throw error;
  }

  return data;
}

// ─── Auth API ───

export const authAPI = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  register: (name, email, password, role) =>
    request('/auth/register', { method: 'POST', body: { name, email, password, role } }),

  me: () => request('/auth/me'),

  logout: () => request('/auth/logout', { method: 'POST' }),

  refresh: () => request('/auth/refresh', { method: 'POST' }),
};

// ─── Courses API ───

export const coursesAPI = {
  list: (params = '') => request(`/courses${params ? '?' + params : ''}`),

  create: (data) => request('/courses', { method: 'POST', body: data }),

  getById: (id) => request(`/courses/${id}`),

  update: (id, data) => request(`/courses/${id}`, { method: 'PATCH', body: data }),

  delete: (id) => request(`/courses/${id}`, { method: 'DELETE' }),
};

// ─── Classrooms API ───

export const classroomsAPI = {
  list: (params = '') => request(`/classrooms${params ? '?' + params : ''}`),

  create: (data) => request('/classrooms', { method: 'POST', body: data }),

  getById: (id) => request(`/classrooms/${id}`),

  update: (id, data) => request(`/classrooms/${id}`, { method: 'PATCH', body: data }),

  delete: (id) => request(`/classrooms/${id}`, { method: 'DELETE' }),

  join: (joinCode) => request('/classrooms/join', { method: 'POST', body: { joinCode } }),

  getStudents: (id, params = '') =>
    request(`/classrooms/${id}/students${params ? '?' + params : ''}`),

  regenerateCode: (id) =>
    request(`/classrooms/${id}/regenerate-code`, { method: 'POST' }),
};
