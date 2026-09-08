/**
 * Configuración centralizada de la API
 * Maneja detección de entorno (local / pruebas / producción), URLs base y endpoints.
 *
 * Reglas:
 * - En desarrollo (vite dev / localhost) las peticiones van al proxy `/api/*`
 *   configurado en vite.config.js, que reescribe hacia `{target}/...`.
 * - En pruebas y producción se usa la URL completa del dominio detectado.
 */

// Detección de entorno
const isDevelopment = import.meta.env.DEV;
const hostname =
  (typeof window !== 'undefined' ? window.location?.hostname : null) || 'localhost';
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

// Prefijo del proxy de desarrollo (debe coincidir con vite.config.js)
const DEV_PROXY_PREFIX = '/api';

// URLs base por entorno
const API_BASE_URLS = {
  development: 'http://saberesmx.pruebas.local/src',
  pruebas: 'https://saberesmx-pruebas.territorio.la/src',
  produccion: 'https://saberesmx.territorio.la/src',
  produccionGob: 'https://saberes.gob.mx/src',
  produccionUDG: 'https://udg.territorio.la/src'
};

// Hostname -> entorno. Añade aquí nuevos dominios de despliegue.
const HOSTNAME_ENVIRONMENTS = {
  'saberesmx.pruebas.local': 'development',
  'saberesmx-pruebas.territorio.la': 'pruebas',
  'saberesmx.territorio.la': 'produccion',
  'saberes.gob.mx': 'produccionGob',
  'udg.territorio.la': 'produccionUDG'
};

/**
 * Determina el entorno actual basándose en el hostname.
 * @returns {'development'|'pruebas'|'produccion'|'produccionGob'|'produccionUDG'}
 */
export function getEnvironment() {
  if (isLocalhost || isDevelopment) {
    return 'development';
  }
  return HOSTNAME_ENVIRONMENTS[hostname] || 'produccion';
}

/**
 * Indica si la app corre en modo desarrollo (usa proxy en lugar de URL absoluta).
 */
export function isDevEnvironment() {
  return isDevelopment || isLocalhost;
}

/**
 * Obtiene la URL base de la API (incluye `/src`) según el entorno actual.
 * Puede sobrescribirse con VITE_API_BASE_URL (útil para apuntar a otro backend).
 */
export function getApiBaseUrl() {
  const override = import.meta.env.VITE_API_BASE_URL;
  if (override) {
    return String(override).replace(/\/$/, '');
  }
  const environment = getEnvironment();
  return API_BASE_URLS[environment] || API_BASE_URLS.development;
}

/**
 * Dominio base (sin `/src`) para las URLs que no son de la API: login, iframes
 * del contenido, imágenes, perfil.
 *
 * En desarrollo devuelve cadena vacía a propósito: vite.config.js proxea las
 * rutas del backend (`/tcu`, `/images`, `/show_quiz.php`, …) hacia el host de
 * pruebas, así que todo queda en el mismo origen que la app. Eso mantiene la
 * cookie de sesión PHP válida dentro de los iframes, que es lo que se rompería
 * con URLs absolutas a otro dominio.
 */
export function getBaseDomain() {
  if (isDevEnvironment()) return '';
  return getApiBaseUrl().replace(/\/src$/, '');
}

/**
 * Construye la URL completa para un endpoint.
 * En desarrollo usa el proxy `/api`, en pruebas/producción la URL absoluta.
 * @param {string} endpoint - Ruta relativa del endpoint (sin barra inicial)
 */
export function buildApiUrl(endpoint) {
  const cleanEndpoint = String(endpoint || '').replace(/^\//, '');

  if (isDevEnvironment()) {
    return `${DEV_PROXY_PREFIX}/${cleanEndpoint}`;
  }
  return `${getApiBaseUrl()}/${cleanEndpoint}`;
}

/**
 * Endpoints disponibles de la API
 */
export const API_ENDPOINTS = {
  // Usuario / sesión
  USER: 'saberes/user',

  // Filtros y catálogos
  FILTERS: 'saberes/filters',
  GET_NIVELES: 'course-registration/niveles-academicos',
  GET_ETIQUETAS: 'course-registration/etiquetas',
  GET_DIFFICULT_LEVELS: 'course-registration/difficult-levels',
  GET_CATEGORY_GROUPS: 'saberes/category-groups',

  // Cursos
  COURSES: 'saberes/courses',
  COURSE_DETAIL: 'saberes/course',
  COURSES_BY_DEPARTMENT_PERIOD: 'saberes/courses-by-department-period',
  COURSES_WITH_LIKES: 'saberes/courses-with-likes',
  ENROLL: 'saberes/enrollment',

  // Visor de curso: árbol de contenido y progreso.
  //
  // COURSE_TREE y MARK_COMPLETE viven bajo `mobile/` porque son los únicos que
  // implementan el cálculo server-side del avance (Plan B). Resuelven la
  // identidad SOLO por JWT (header x-authentication), y App\Mobile\Support\Auth
  // acepta el claim `id` que emite saberes/user — el mismo token que guarda el
  // UserContext. No hay equivalente por sesión web.
  COURSE_TREE: 'mobile/course-tree',
  MARK_COMPLETE: 'mobile/mark-complete',

  // COURSE_PROGRESS sí es el de sesión web: recibe solo {course_id}, recalcula
  // el avance en el servidor desde persona_has_post_completo y finaliza el
  // curso si llega al 100%. Nunca se le manda un porcentaje.
  COURSE_PROGRESS: 'saberes/course-progress',

  // Registro / actualización de cursos (endpoints PHP directos)
  REGISTER_COURSE: 'App/CourseRegistration/endpoints/registerCourse.php',
  UPDATE_COURSE: 'App/CourseRegistration/endpoints/updateCourse.php',
  ENROLL_COURSE_STUDENT: 'App/CourseRegistration/endpoints/enrollCourseStudent.php',
  ENROLL_COURSE_PROFESSOR: 'App/CourseRegistration/endpoints/enrollCourseProfessor.php',
  GET_PERIODOS: 'App/CourseRegistration/endpoints/getPeriodosByDepartamento.php',

  // Rutas de formación
  STUDY_PLAN_ENROLLMENT: 'saberes/study-plan-enrollment',
  STUDY_GROUPS: 'saberes/study-groups',

  // Contenido social
  LIKES: 'saberes/likes',
  RECOMMENDATIONS: 'saberes/recommendations',
  LEARNING: 'saberes/learning',
  NEWS: 'saberes/news',

  // Universidades / departamentos
  UNIVERSITY: 'saberes/departments',
  UNIVERSITY_COURSES: 'saberes/departments',

  // Certificados
  CERTIFICATES: 'saberes/certificates',

  // Auth (páginas PHP, no JSON)
  LOGIN: 'index.php?login=true&redirect=catalog',
  REGISTER: 'registro_alumno.php'
};

/**
 * Obtiene la URL completa de un endpoint usando su clave de API_ENDPOINTS
 * @param {keyof typeof API_ENDPOINTS} endpointKey
 */
export function getApiEndpoint(endpointKey) {
  const endpoint = API_ENDPOINTS[endpointKey];
  if (!endpoint) {
    console.warn(`Endpoint no encontrado: ${endpointKey}`);
    return null;
  }
  return buildApiUrl(endpoint);
}

/**
 * URL de login. Vive en el dominio (no bajo `/src`), por eso no usa buildApiUrl.
 * @param {string} [redirect] - módulo al que regresar tras el login
 */
export function getLoginUrl(redirect = 'content_viewer') {
  return `${getBaseDomain()}/index.php?login=true&redirect=${encodeURIComponent(redirect)}`;
}

/**
 * URL de registro de alumno.
 */
export function getRegisterUrl() {
  return `${getBaseDomain()}/${API_ENDPOINTS.REGISTER}`;
}

/**
 * URL del visor de curso para el aprendiz — este mismo visor.
 *
 * `/content_viewer/` es ahora el shell de esta SPA (antes era el visor legacy,
 * que se movió a `/content_viewer_v2/`). Los parámetros no cambian: son los que
 * lee App.jsx, y los mismos que ya usan los enlaces de perfil.php, catalog y
 * courseManager.
 *
 * @param {string|number} socialId - socialId del curso → query idInit
 * @param {string|number} matterId - id de la materia → query idMateria
 */
export function URL_COURSE(socialId, matterId) {
  const base = getBaseDomain().replace(/\/$/, '');
  return `${base}/content_viewer/index.php?idInit=${encodeURIComponent(String(socialId))}&idMateria=${encodeURIComponent(String(matterId))}&fromMalla=1&riesgo=0`;
}

// ─── URLs del contenido del curso (páginas PHP embebidas en el iframe) ───────
//
// Son las mismas rutas que usa el visor legacy (content_viewer_v2/partials/config.php
// y assets/js/script.js). Salvo el TCU, se autentican con la cookie de sesión
// PHP: el módulo vive en el mismo dominio, así que no necesitan el
// `movilws`/`cr` de la app. El TCU además acepta el JWT (ver getTcuUrl), que es
// lo que permite abrirlo sin sesión web.

/**
 * Pantalla de bienvenida del curso (descripción + botón "Empezar").
 * Es la vista inicial del visor, antes de elegir un contenido.
 * @param {number|string} idGrupo
 * @param {number|string} [riesgo]
 */
export function getCourseWelcomeUrl(idGrupo, riesgo = 0) {
  return `${getBaseDomain()}/bienvenida_initdocs_grupos.php?idMateria=${encodeURIComponent(String(idGrupo))}&fromMalla=1&riesgo=${encodeURIComponent(String(riesgo))}`;
}

/**
 * Contenido interactivo (TCU). El propio TCU registra la completitud de cada
 * slide contra tcu_actions.php mientras el alumno navega.
 *
 * `jwt` hace que el visor no dependa de la cookie de sesión PHP. tcu_user.php
 * acepta el token en el header `x-authentication` o en `?jwt`, y con él hidrata
 * $_SESSION (persona, universidad, campus, módulos) antes de que corra el
 * control de acceso. Un iframe no puede mandar headers en su navegación, así
 * que aquí va por query string — igual que el `cr` de la app móvil.
 *
 * Sin `jwt` la página cae al control de sesión web y muestra el alert de
 * "No has iniciado sesión".
 *
 * @param {number|string} idGrupo
 * @param {number|string} idContenido - idPost del TCU (node.idContenido)
 * @param {number} [resNum]
 * @param {string|null} [jwt] - JWT de sessionStorage (services/http.js)
 */
export function getTcuUrl(idGrupo, idContenido, resNum = 1, jwt = null) {
  const url = `${getBaseDomain()}/tcu/tcu_user.php?idContenido=${encodeURIComponent(String(idContenido))}&idGrupo=${encodeURIComponent(String(idGrupo))}&res_num=${encodeURIComponent(String(resNum))}`;
  // JWT::generate() emite el token ya urlencoded; PHP decodifica $_GET una vez,
  // así que el servidor lo recibe en esa forma y su segundo intento
  // (JWT::decode($token, true, ...)) lo resuelve. Codificar es necesario de
  // todos modos: sin esto el `+` del base64 llegaría como espacio.
  return jwt ? `${url}&jwt=${encodeURIComponent(jwt)}` : url;
}

/**
 * Examen / sondeo / encuesta.
 *
 * `jwt` cumple el mismo papel que en getTcuUrl: show_quiz.php hidrata la sesión
 * PHP con el token antes de su control de acceso, así que el examen abre sin
 * depender de la cookie de sesión web. Solo se usa si no hay sesión válida ya
 * en el navegador — la que crea el TCU al abrirse manda sobre el token.
 *
 * Sin `jwt` la página cae al control de sesión web y muestra el alert de
 * "No has iniciado sesion".
 *
 * @param {number|string} idExamen - idPost del examen (node.examId ?? node.id)
 * @param {number|string} idGrupo
 * @param {string|null} [jwt] - JWT de sessionStorage (services/http.js)
 */
export function getExamUrl(idExamen, idGrupo, jwt = null) {
  const url = `${getBaseDomain()}/show_quiz.php?sinHeader=1&idExamen=${encodeURIComponent(String(idExamen))}&c=${encodeURIComponent(String(idGrupo))}`;
  // Mismo criterio de codificación que getTcuUrl: el token va urlencoded para
  // que el `+` del base64 no llegue como espacio.
  return jwt ? `${url}&jwt=${encodeURIComponent(jwt)}` : url;
}

/**
 * Visor legacy del curso. Fallback para los tipos de contenido cuya URL real
 * (`archivo.filepath`, SCORM, tareas) no viene en la respuesta de course-tree.
 *
 * Apunta a `/content_viewer_v2/`, que es donde quedó el visor legacy cuando esta
 * SPA tomó `/content_viewer/`. Es importante que no apunte a `/content_viewer/`:
 * el botón "Abrir en el visor clásico" reabriría esta misma SPA, y el alumno se
 * quedaría dando vueltas sin llegar nunca al contenido que no sabemos embeber.
 *
 * @param {number|string} idGrupo
 * @param {number|string} [socialId] - idInit del visor legacy
 */
export function getLegacyViewerUrl(idGrupo, socialId) {
  const base = `${getBaseDomain()}/content_viewer_v2/index.php?idMateria=${encodeURIComponent(String(idGrupo))}&fromMalla=1&riesgo=0`;
  return socialId ? `${base}&idInit=${encodeURIComponent(String(socialId))}` : base;
}

/** Página de inicio de la plataforma */
export function getHomeUrl() {
  return `${getBaseDomain()}/init.php`;
}

/** Perfil del alumno */
export function getProfileUrl(idPersona) {
  return `${getBaseDomain()}/perfil.php?persona=${encodeURIComponent(String(idPersona))}`;
}

/** Edición de perfil */
export function getEditProfileUrl() {
  return `${getBaseDomain()}/editar_perfil_saberes.php`;
}

/** Cierre de sesión de la plataforma */
export function getLogoutUrl() {
  return `${getBaseDomain()}/salir.php`;
}

/**
 * Recursos estáticos del dominio (logo, iconos del árbol, banner por defecto).
 * @param {string} path - ruta absoluta dentro del dominio, p.ej. '/images/...'
 */
export function getAssetUrl(path) {
  return `${getBaseDomain()}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Iconos del árbol, los mismos SVG que usa el visor legacy */
export const CONTENT_ICONS = {
  folderOpen: '/images/contenido/carpeta_abierta.svg',
  folderClosed: '/images/contenido/carpeta_cerrada.svg',
  document: '/images/contenido/documento.svg',
  scorm: '/images/contenido/scorm.svg'
};

/** Banner por defecto cuando el curso no tiene foto */
export const DEFAULT_COURSE_BANNER = '/images/contenido/banner_generico_contenidos_saberes.png';

/** Logo de SaberesMX para la barra superior */
export const SABERES_LOGO = '/images/saberes-logo-bla.png';

// Información del entorno, útil para debugging
export const API_CONFIG = {
  environment: getEnvironment(),
  baseUrl: getApiBaseUrl(),
  isDevelopment: isDevEnvironment(),
  proxyPrefix: DEV_PROXY_PREFIX,
  hostname
};
