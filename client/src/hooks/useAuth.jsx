import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cj_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(u => setUser(u))
      .catch(() => localStorage.removeItem('cj_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const data = await api.post('/auth/login', { username, password });
    localStorage.setItem('cj_token', data.token);
    setUser({ username: data.username, user_type: data.user_type });
  };

  const logout = () => {
    localStorage.removeItem('cj_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
