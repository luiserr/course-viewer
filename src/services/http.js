/**
 * Capa HTTP del proyecto.
 *
 * - Manejo del JWT en sessionStorage (header `x-authentication`).
 * - `fetchWithJWT`: fetch con JWT, cookies de sesión y headers por defecto.
 * - `apiRequest` + helpers (`apiGet`, `apiPost`, ...): construyen la URL según
 *   el entorno (local con proxy / pruebas / producción) y devuelven JSON parseado.
 */

import { buildApiUrl, API_ENDPOINTS, API_CONFIG } from '../config/api';

/** Clave para almacenar el JWT en sessionStorage */
const JWT_STORAGE_KEY = 'user_jwt_token';

/** Headers de respuesta donde el backend puede devolver un JWT renovado */
const JWT_RESPONSE_HEADERS = ['x-authentication', 'authorization', 'jwt', 'token'];

/**
 * Obtiene el JWT del sessionStorage
 * @returns {string|null}
 */
export function getJWTFromStorage() {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(JWT_STORAGE_KEY);
}

/**
 * Guarda el JWT en sessionStorage, o lo elimina si se pasa un valor vacío.
 * @param {string|null} jwt
 */
export function saveJWTToStorage(jwt) {
  if (typeof window === 'undefined') return;

  if (jwt) {
    sessionStorage.setItem(JWT_STORAGE_KEY, jwt);
  } else {
    sessionStorage.removeItem(JWT_STORAGE_KEY);
  }
}

/**
 * Extrae un JWT renovado de los headers de la respuesta (si el backend lo envía).
 * @param {Response} response
 * @returns {string|null}
 */
export function extractJWTFromHeaders(response) {
  for (const header of JWT_RESPONSE_HEADERS) {
    const value = response.headers?.get?.(header);
    if (value) return value.replace(/^Bearer\s+/i, '');
  }
  return null;
}

/**
 * Extrae el JWT del cuerpo de la respuesta (formatos aceptados por el backend).
 * @param {any} body
 * @returns {string|null}
 */
export function extractJWTFromBody(body) {
  if (!body || typeof body !== 'object') return null;
  return body.session_info?.jwt || body.jwt || body.token || body.accessToken || null;
}

/**
 * Error de API con el status y el cuerpo de la respuesta.
 */
export class ApiError extends Error {
  constructor(message, { status = 0, endpoint = null, body = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.endpoint = endpoint;
    this.body = body;
    this.isUnauthorized = status === 401;
    this.isForbidden = status === 403;
  }
}

/**
 * Petición HTTP con JWT automático.
 * - Agrega el header `x-authentication` si hay JWT en sessionStorage.
 * - Envía cookies de sesión PHP (`credentials: 'include'`).
 * - Serializa el body a JSON cuando es un objeto plano.
 *
 * @param {string} url - URL ya construida (usar buildApiUrl / apiRequest)
 * @param {RequestInit & {body?: any}} [options]
 * @returns {Promise<Response>}
 */
export async function fetchWithJWT(url, options = {}) {
  const jwt = getJWTFromStorage();
  const { headers: optionHeaders, body, ...restOptions } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    // FormData define su propio Content-Type (con boundary)
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(optionHeaders || {})
  };

  if (jwt) {
    headers['x-authentication'] = jwt;
  }

  const fetchOptions = {
    method: options.method || 'GET',
    mode: 'cors',
    credentials: 'include',
    ...restOptions,
    headers
  };

  if (body !== undefined && body !== null) {
    fetchOptions.body =
      isFormData || typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  // Si el backend renovó el JWT, guardarlo para las siguientes peticiones
  const refreshedJWT = extractJWTFromHeaders(response);
  if (refreshedJWT) {
    saveJWTToStorage(refreshedJWT);
  }

  return response;
}

/**
 * Lee el cuerpo de una respuesta como JSON cuando es posible, o como texto.
 * @param {Response} response
 * @returns {Promise<any>}
 */
async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!text) return null;

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  // Algunos endpoints PHP devuelven JSON sin el content-type correcto
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Petición a un endpoint de la API con manejo de entorno y errores.
 *
 * @param {string} endpoint - Ruta relativa (p.ej. `API_ENDPOINTS.USER`) o URL absoluta
 * @param {{method?: string, body?: any, headers?: Object, signal?: AbortSignal, raw?: boolean}} [options]
 *        raw: si es `true` devuelve la respuesta completa en lugar de `data`
 * @returns {Promise<any>} `data` de la respuesta (o el cuerpo completo si no hay wrapper)
 * @throws {ApiError}
 */
export async function apiRequest(endpoint, options = {}) {
  const { raw = false, ...fetchOptions } = options;
  const isAbsolute = /^https?:\/\//i.test(endpoint) || endpoint.startsWith('/api/');
  const url = isAbsolute ? endpoint : buildApiUrl(endpoint);

  let response;
  try {
    response = await fetchWithJWT(url, fetchOptions);
  } catch (error) {
    // Error de red / CORS: no hay respuesta HTTP
    throw new ApiError(handleApiError(error, endpoint).message, { endpoint });
  }

  const body = await parseResponseBody(response);

  if (!response.ok) {
    const message =
      body?.error?.message ||
      body?.message ||
      (typeof body === 'string' && body) ||
      `Error HTTP ${response.status}`;
    throw new ApiError(message, { status: response.status, endpoint, body });
  }

  // El backend puede responder `{ success: false, error: {...} }` con status 200
  if (body && typeof body === 'object' && body.success === false) {
    const message = body.error?.message || body.message || 'La petición no fue exitosa';
    throw new ApiError(message, { status: response.status, endpoint, body });
  }

  if (raw) return body;

  if (body && typeof body === 'object' && 'data' in body) {
    return body.data;
  }
  return body;
}

/** GET a un endpoint */
export function apiGet(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'GET' });
}

/** POST a un endpoint */
export function apiPost(endpoint, body, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'POST', body });
}

/** PUT a un endpoint */
export function apiPut(endpoint, body, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'PUT', body });
}

/** DELETE a un endpoint */
export function apiDelete(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'DELETE' });
}

/**
 * Construye un querystring a partir de un objeto, omitiendo valores vacíos.
 * @param {Record<string, any>} params
 * @returns {string} `?a=1&b=2` o cadena vacía
 */
export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, String(item)));
    } else {
      search.append(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

/**
 * Normaliza un error de API a un mensaje entendible + sugerencia de causa.
 * @param {unknown} error
 * @param {string} [endpoint]
 * @returns {{message: string, suggestion: string, status: number|null, endpoint: string|null}}
 */
export function handleApiError(error, endpoint = null) {
  const target = endpoint || 'la API';

  if (error instanceof ApiError) {
    return {
      message: error.message,
      suggestion:
        error.status === 401
          ? 'La sesión no es válida o expiró. Inicia sesión de nuevo.'
          : error.status === 403
            ? 'El usuario no tiene permisos para esta operación.'
            : error.status >= 500
              ? 'Error del servidor. Revisa los logs del backend PHP.'
              : 'Revisa los parámetros enviados al endpoint.',
      status: error.status,
      endpoint: error.endpoint
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  const isNetwork = error instanceof TypeError || /failed to fetch|networkerror/i.test(message);

  return {
    message: isNetwork ? `No se pudo conectar con ${target}` : message,
    suggestion: isNetwork
      ? API_CONFIG.isDevelopment
        ? `Verifica que el proxy de Vite apunte a un backend accesible (entorno: ${API_CONFIG.environment}).`
        : 'Verifica la conectividad y la configuración de CORS del backend.'
      : 'Revisa la consola del navegador para más detalle.',
    status: null,
    endpoint
  };
}

export { API_ENDPOINTS, buildApiUrl };
