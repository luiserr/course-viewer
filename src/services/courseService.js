/**
 * Servicios de cursos.
 *
 * Cada función usa `apiRequest`, por lo que la URL se resuelve automáticamente
 * según el entorno (proxy en local, URL absoluta en pruebas/producción) y el JWT
 * se envía en el header `x-authentication`.
 */

import { API_ENDPOINTS } from '../config/api';
import { apiGet, apiPost, buildQuery } from './http';

/** Campos obligatorios de registerCourse.php (ver .ai/api.md) */
const REQUIRED_COURSE_FIELDS = ['nombre', 'profesor', 'idperiodo', 'idclase', 'btnNombreInicio'];

/**
 * Valida que el payload traiga los campos obligatorios del registro de curso.
 * @param {Record<string, any>} courseData
 * @throws {Error} si falta algún campo obligatorio
 */
function assertRequiredCourseFields(courseData) {
  const missing = REQUIRED_COURSE_FIELDS.filter(
    (field) => courseData?.[field] === undefined || courseData?.[field] === null || courseData?.[field] === ''
  );
  if (missing.length > 0) {
    throw new Error(`Faltan campos obligatorios para registrar el curso: ${missing.join(', ')}`);
  }
}

/**
 * Registra un curso completo.
 * @param {Record<string, any>} courseData - payload documentado en .ai/api.md
 * @returns {Promise<{idGrupo: number, idMateria: number, idUsuarioSocial: number}>}
 */
export async function registerCourse(courseData) {
  assertRequiredCourseFields(courseData);
  return apiPost(API_ENDPOINTS.REGISTER_COURSE, courseData);
}

/**
 * Actualiza un curso existente.
 * @param {Record<string, any>} courseData
 */
export async function updateCourse(courseData) {
  return apiPost(API_ENDPOINTS.UPDATE_COURSE, courseData);
}

/**
 * Periodos disponibles para un departamento.
 * @param {number|string} idDepartamento
 */
export async function getPeriodosByDepartamento(idDepartamento) {
  return apiGet(`${API_ENDPOINTS.GET_PERIODOS}${buildQuery({ idDepartamento })}`);
}

/**
 * Cursos de un departamento en un periodo.
 * @param {{departmentId: number|string, periodId: number|string}} params
 */
export async function getCoursesByDepartmentPeriod({ departmentId, periodId }) {
  return apiGet(
    `${API_ENDPOINTS.COURSES_BY_DEPARTMENT_PERIOD}${buildQuery({ departmentId, periodId })}`
  );
}

/**
 * Detalle de un curso.
 * @param {number|string} courseId
 */
export async function getCourseDetail(courseId) {
  return apiGet(`${API_ENDPOINTS.COURSE_DETAIL}${buildQuery({ id: courseId })}`);
}

/**
 * Inscribe a un estudiante en un curso.
 * @param {{idGrupo: number|string, idUsuario: number|string}} params
 */
export async function enrollStudent({ idGrupo, idUsuario }) {
  return apiPost(API_ENDPOINTS.ENROLL_COURSE_STUDENT, { idGrupo, idUsuario });
}
