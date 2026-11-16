import axios from 'axios';

const api = axios.create({
  baseURL: '/api/admin',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Log out only when the session itself is invalid. A 403 for a section a
    // sub-admin isn't permitted to use should just show an error.
    const status = err.response?.status;
    const sessionInvalid = status === 401 || (status === 403 && err.response?.data?.message === 'Admin access required');
    if (sessionInvalid) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  }
);

export default api;
