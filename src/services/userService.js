/**
 * Servicio de sesión / usuario.
 *
 * Aísla la forma en que el backend devuelve la sesión, para que el UserContext
 * solo maneje estado. Si cambia el contrato de la API, se ajusta aquí.
 */

import { API_ENDPOINTS } from '../config/api';
import { apiRequest, extractJWTFromBody, saveJWTToStorage } from './http';

/**
 * Normaliza la respuesta del endpoint de usuario al objeto `user` del contexto.
 * Acepta `{ success, data: {...} }`, `{ success, ...datos }` y `{ ...datos }`.
 *
 * @param {any} payload - cuerpo completo de la respuesta
 * @returns {object|null} usuario normalizado, o null si la respuesta no trae usuario
 */
export function normalizeUser(payload) {
  if (!payload || typeof payload !== 'object') return null;

  let data = null;
  if (payload.data && typeof payload.data === 'object') {
    data = payload.data;
  } else {
    const { success: _success, session_info: _si, timestamp: _ts, ...rest } = payload;
    data = Object.keys(rest).length > 0 ? rest : null;
  }

  if (!data || data.id === undefined || data.id === null) return null;

  const sessionInfo = payload.session_info || payload.sessionInfo || null;
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();

  return {
    id: data.id,
    firstName: data.firstName ?? null,
    lastName: data.lastName ?? null,
    surName: data.surName ?? null,
    uid: data.uid ?? null,
    email: data.email ?? null,
    // `persona.foto` (alias `photo` en Infrastructure\Repositories\Users::findUser):
    // es la misma foto que el navbar legacy saca de $_SESSION['fotuca'].
    photo: data.photo ?? null,
    name: data.name || fullName || null,
    fullName: fullName || data.name || null,

    // Departamento (varios endpoints filtran contenido por él)
    departmentId: data.departmentId ?? null,
    department: data.department ?? null,

    // Permisos
    adminId: data.adminId ?? null,
    isAdmin: data.isAdmin ?? (data.adminId !== undefined && data.adminId !== null),

    // Sesión
    sessionInfo,
    jwt: extractJWTFromBody(payload),
    timestamp: payload.timestamp ?? null
  };
}

/**
 * Obtiene la sesión actual del backend.
 * Lanza `ApiError` con `status === 401` cuando no hay sesión (modo guest).
 *
 * @param {{signal?: AbortSignal}} [options]
 * @returns {Promise<{user: object|null, jwt: string|null, payload: any}>}
 */
export async function fetchSession(options = {}) {
  const payload = await apiRequest(API_ENDPOINTS.USER, { ...options, raw: true });
  const user = normalizeUser(payload);
  return { user, jwt: user?.jwt ?? extractJWTFromBody(payload), payload };
}

/**
 * Vuelve a pedir la sesión para obtener un JWT nuevo y lo guarda.
 *
 * `Auth\JWT::generate()` emite los tokens con `exp = now + 3600`, así que el JWT
 * de `saberes/user` caduca a la hora — antes que la sesión PHP. Los endpoints
 * `mobile/*` (que solo aceptan JWT) empiezan a responder 401 aunque el alumno
 * siga logueado. Como la cookie de sesión sigue siendo válida, basta con volver
 * a llamar a `saberes/user` para renovarlo.
 *
 * @returns {Promise<string|null>} el JWT nuevo, o null si ya no hay sesión
 */
export async function refreshSessionJWT() {
  try {
    const { jwt } = await fetchSession();
    if (jwt) saveJWTToStorage(jwt);
    return jwt ?? null;
  } catch (err) {
    console.warn('[userService] no se pudo renovar el JWT:', err.message);
    return null;
  }
}
