import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = axios.create({ baseURL: '/api' });

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('fd_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('fd_token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await API.get('/auth/me');
      if (data.success) setUser(data.user);
    } catch {
      localStorage.removeItem('fd_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    if (data.success) {
      localStorage.setItem('fd_token', data.token);
      setUser(data.user);
    }
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await API.post('/auth/register', { name, email, password });
    if (data.success) {
      localStorage.setItem('fd_token', data.token);
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('fd_token');
    setUser(null);
  };

  const generateApiKey = async () => {
    const { data } = await API.post('/auth/generate-api-key');
    if (data.success) setUser((u) => ({ ...u, apiKey: data.apiKey }));
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, generateApiKey, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export { API };
