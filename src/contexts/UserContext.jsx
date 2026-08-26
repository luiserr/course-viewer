/**
 * UserContext - sesión global del usuario.
 *
 * Al montar, pide la sesión a `API_ENDPOINTS.USER` (cookie de sesión PHP + JWT si
 * ya existe en sessionStorage). Si el backend responde 401, la app queda en modo
 * guest: `user === null`, `isGuest === true`, sin mostrar error.
 *
 * El JWT viaja en el header `x-authentication` de toda petición hecha con
 * `fetchWithJWT` / `apiRequest`.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { ApiError, getJWTFromStorage, handleApiError, saveJWTToStorage } from '../services/http';
import { fetchSession } from '../services/userService';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jwt, setJwt] = useState(() => getJWTFromStorage());

  /**
   * Carga la sesión desde el backend. Un 401 no es error: significa modo guest.
   */
  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { user: userInfo, jwt: sessionJwt } = await fetchSession();

      if (!userInfo) {
        // Respuesta válida pero sin usuario -> guest
        saveJWTToStorage(null);
        setJwt(null);
        setUser(null);
        return;
      }

      if (sessionJwt) {
        saveJWTToStorage(sessionJwt);
        setJwt(sessionJwt);
      } else {
        setJwt(getJWTFromStorage());
      }

      setUser(userInfo);
    } catch (err) {
      // 401 -> guest silencioso
      if (err instanceof ApiError && err.status === 401) {
        saveJWTToStorage(null);
        setJwt(null);
        setUser(null);
        return;
      }

      const info = handleApiError(err, API_ENDPOINTS.USER);
      console.error('UserContext - error al obtener la sesión:', info.message, info.suggestion);
      setError(info.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  /**
   * Actualiza campos del usuario en memoria (no persiste en el backend).
   * @param {object} updatedUserData
   */
  const updateUser = useCallback((updatedUserData) => {
    setUser((current) => (current ? { ...current, ...updatedUserData } : current));
  }, []);

  /**
   * Guarda un JWT obtenido por otra vía y recarga la sesión.
   * @param {string} jwtToken
   */
  const login = useCallback(
    (jwtToken) => {
      saveJWTToStorage(jwtToken);
      setJwt(jwtToken);
      return fetchUser();
    },
    [fetchUser]
  );

  /** Limpia la sesión local (el logout real del backend es una página PHP) */
  const logout = useCallback(() => {
    saveJWTToStorage(null);
    setJwt(null);
    setUser(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      jwt,
      isAuthenticated: user !== null,
      isGuest: user === null,
      isAdmin: user?.isAdmin === true,
      userName: user?.fullName || user?.name || 'Usuario Guest',
      userEmail: user?.email ?? null,
      updateUser,
      login,
      logout,
      refreshUser: fetchUser,
      retryFetchUser: fetchUser
    }),
    [user, loading, error, jwt, updateUser, login, logout, fetchUser]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/**
 * Hook para acceder a la sesión del usuario.
 * Debe usarse dentro de `<UserProvider>`.
 */
export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser debe ser usado dentro de UserProvider');
  }
  return context;
}

// Re-exports por conveniencia (compatibilidad con las guías de .ai/)
export {
  ApiError,
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  apiRequest,
  fetchWithJWT,
  getJWTFromStorage,
  handleApiError,
  saveJWTToStorage
} from '../services/http';
