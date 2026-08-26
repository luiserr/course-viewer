/**
 * Servicios del visor de curso.
 *
 * Modelo de progreso (Plan B, ver .cursor-plans/progress/analisis-progreso.md):
 * el porcentaje SIEMPRE lo calcula el servidor contando filas reales en
 * `persona_has_post_completo`. Este cliente nunca envía un `avance`: solo avisa
 * "recalcula el curso X" y vuelve a leer el árbol.
 */

import { API_ENDPOINTS } from '../config/api';
import { ApiError, apiGet, apiPost, buildQuery } from './http';
import { refreshSessionJWT } from './userService';

/**
 * Ejecuta una petición que se autentica por JWT y, si responde 401, renueva el
 * token contra `saberes/user` y reintenta una vez.
 *
 * Hace falta porque el JWT caduca a la hora (`exp = now + 3600`) mientras la
 * sesión PHP sigue viva: un alumno que pasa más de una hora en un curso vería
 * fallar el árbol sin este reintento. Solo se reintenta una vez — si el segundo
 * 401 llega, la sesión realmente terminó.
 *
 * @template T
 * @param {() => Promise<T>} request
 * @returns {Promise<T>}
 */
async function withFreshJWT(request) {
  try {
    return await request();
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    const jwt = await refreshSessionJWT();
    if (!jwt) throw err;

    console.info('[courseViewer] JWT renovado tras un 401, reintentando');
    return request();
  }
}

/**
 * Árbol de contenido del curso con el estado por nodo y el avance del servidor.
 *
 * Requiere JWT: el endpoint resuelve la persona desde `x-authentication` y
 * nunca desde la query, así que no se manda idPersona.
 *
 * @param {number|string} idGrupo
 * @param {{signal?: AbortSignal}} [options]
 * @returns {Promise<{tree: Array, progress: number, totalItems: number, completedItems: number}>}
 */
export async function fetchCourseTree(idGrupo, options = {}) {
  const data = await withFreshJWT(() =>
    apiGet(`${API_ENDPOINTS.COURSE_TREE}${buildQuery({ idGrupo })}`, options)
  );
  return {
    tree: data?.tree ?? [],
    progress: Number(data?.progress ?? 0),
    totalItems: Number(data?.totalItems ?? 0),
    completedItems: Number(data?.completedItems ?? 0)
  };
}

/**
 * Marca un ítem suelto (tipo `file`) como completado.
 *
 * No usar con TCU: sus slides las registra el propio tcu_actions.php dentro del
 * iframe. No devuelve avance — para eso está `syncCourseProgress`.
 *
 * @param {{idPost: number|string, idGrupo: number|string}} params
 * @returns {Promise<{is_complete: boolean, already_was_complete: boolean}>}
 */
export async function markPostComplete({ idPost, idGrupo }) {
  return withFreshJWT(() => apiPost(API_ENDPOINTS.MARK_COMPLETE, { idPost, idGrupo }));
}

/**
 * Pide al servidor recalcular el avance del curso (y finalizarlo si llegó a
 * 100%). Se llama al salir de un contenido, no en cada interacción.
 *
 * Falla de forma controlada: el endpoint responde 403 si el curso no es interno
 * o el alumno no está inscrito, y 429 si se llama en ráfaga. Ninguno de esos
 * casos debe romper la navegación, así que se devuelve `null` en vez de lanzar.
 *
 * @param {number|string} idGrupo
 * @returns {Promise<object|null>} datos del avance recalculado, o null si el
 *   servidor lo rechazó por reglas de negocio / rate limit
 */
export async function syncCourseProgress(idGrupo) {
  try {
    return await apiPost(API_ENDPOINTS.COURSE_PROGRESS, { course_id: idGrupo });
  } catch (err) {
    if (err instanceof ApiError && [401, 403, 429].includes(err.status)) {
      console.warn(`[courseViewer] avance no recalculado (${err.status}): ${err.message}`);
      return null;
    }
    throw err;
  }
}

/**
 * Datos del curso para la cabecera del panel lateral (nombre, foto, descripción).
 *
 * `visible_en_tienda=0` desactiva el filtro de catálogo: un alumno puede estar
 * inscrito en un curso que no se publica en la tienda.
 *
 * @param {number|string} idGrupo
 * @param {{signal?: AbortSignal}} [options]
 * @returns {Promise<object|null>} null si el curso no es visible por esta API
 */
export async function fetchCourseSummary(idGrupo, options = {}) {
  try {
    const data = await apiGet(
      `${API_ENDPOINTS.COURSE_DETAIL}${buildQuery({ id: idGrupo, visible_en_tienda: 0 })}`,
      options
    );
    // El endpoint puede devolver el curso directo o envuelto en { course: {...} }
    return data?.course ?? data ?? null;
  } catch (err) {
    console.warn('[courseViewer] no se pudo obtener el detalle del curso:', err.message);
    return null;
  }
}
