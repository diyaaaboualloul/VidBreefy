import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    // Check if user data exists in localStorage (set by login)
    const storedUser = localStorage.getItem('vidbreefy_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('vidbreefy_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const userData = res.data.user;
    const csrfToken = res.data.csrfToken;
    console.log('[Login] csrfToken from server:', csrfToken ? 'YES (' + csrfToken.slice(0,16) + '...)' : 'NO', '| full response:', JSON.stringify(res.data).slice(0, 200));
    if (csrfToken) localStorage.setItem('vidbreefy_csrf', csrfToken);
    localStorage.setItem('vidbreefy_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (email, password) => {
    const res = await authAPI.register({ email, password });
    const userData = res.data.user;
    const csrfToken = res.data.csrfToken;
    if (csrfToken) localStorage.setItem('vidbreefy_csrf', csrfToken);
    localStorage.setItem('vidbreefy_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    authAPI.logout?.();
    localStorage.removeItem('vidbreefy_user');
    localStorage.removeItem('vidbreefy_csrf');
    setUser(null);
  };

  const isAdmin = user?.is_admin === 1 || user?.is_admin === true;
  const isPro = user?.tier === 'pro';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin, isPro }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}