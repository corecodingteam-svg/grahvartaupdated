import axios from 'axios';
import toast from 'react-hot-toast';

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
    // A failed login attempt is not an expired session: let the login page show
    // its error instead of reloading (which wiped the message).
    const isLoginCall = err.config?.url === '/login';
    const sessionInvalid = !isLoginCall && (status === 401 || (status === 403 && err.response?.data?.message === 'Admin access required'));
    if (sessionInvalid) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    } else if ((err.config?.method || 'get') === 'get' && (!err.response || status >= 500)) {
      // Page loads mostly swallow errors and render an empty table — say why.
      toast.error(err.response?.data?.message && status < 500 ? err.response.data.message : 'Could not load data. Please try again.', { id: 'api-load-error' });
    }
    return Promise.reject(err);
  }
);

export default api;
