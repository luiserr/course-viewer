/**
 * Helpers del árbol de contenido que devuelve `mobile/course-tree`.
 *
 * Forma de un nodo:
 *   tema  → { id, type:'tema', title, children: [...] }
 *   hoja  → { id, type:'tcu'|'examen'|'sondeo'|'encuesta'|'tarea'|'scorm'|'file',
 *             title, is_complete, locked,
 *             idContenido?, resNum?, hasExam?, examId? }   (los 4 últimos: solo tcu)
 *
 * Ojo: la bandera de completitud es `is_complete`, no `completed`.
 */

/** Tipos de nodo que se abren como evaluación */
export const EXAM_TYPES = new Set(['examen', 'sondeo', 'encuesta']);

/** Etiqueta corta que se pinta junto al título de una evaluación */
export const EXAM_BADGES = {
  examen: 'Eval',
  sondeo: 'Sondeo',
  encuesta: 'Encuesta'
};

/**
 * IDs de exámenes que ya están enlazados a un TCU (`hasExam` + `examId`).
 * @param {Array} nodes
 * @param {Set<number>} [acc]
 * @returns {Set<number>}
 */
export function collectLinkedExamIds(nodes, acc = new Set()) {
  for (const n of nodes) {
    if (n.type === 'tcu' && n.hasExam && n.examId != null) acc.add(n.examId);
    if (n.children) collectLinkedExamIds(n.children, acc);
  }
  return acc;
}

/**
 * Quita del árbol los exámenes que ya se alcanzan desde su TCU, para no
 * listarlos dos veces (mismo criterio que la app móvil).
 * @param {Array} nodes
 * @param {Set<number>} linkedIds
 */
export function dedupeLinkedExams(nodes, linkedIds) {
  return nodes
    .filter((n) => !(EXAM_TYPES.has(n.type) && linkedIds.has(n.id)))
    .map((n) => (n.children ? { ...n, children: dedupeLinkedExams(n.children, linkedIds) } : n));
}

/** Árbol listo para pintar: sin exámenes duplicados. */
export function buildDisplayTree(tree) {
  if (!tree?.length) return tree || [];
  return dedupeLinkedExams(tree, collectLinkedExamIds(tree));
}

/**
 * Lista plana de contenidos (sin temas), en orden de navegación.
 * @param {Array} nodes
 * @param {Array} [acc]
 */
export function flattenContent(nodes, acc = []) {
  for (const n of nodes) {
    if (n.type === 'tema') flattenContent(n.children ?? [], acc);
    else acc.push(n);
  }
  return acc;
}

/**
 * Busca un nodo por id en cualquier nivel del árbol.
 * @returns {object|null}
 */
export function findNodeInTree(nodes, targetId) {
  for (const n of nodes) {
    if (n.id === targetId) return n;
    if (n.children) {
      const found = findNodeInTree(n.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Siguiente contenido después del nodo dado, o null si es el último.
 * @param {Array} flatList - salida de flattenContent
 * @param {object|null} node
 */
export function nextContentNode(flatList, node) {
  if (!node) return null;
  const idx = flatList.findIndex((n) => n.id === node.id);
  return idx >= 0 && idx < flatList.length - 1 ? flatList[idx + 1] : null;
}

/**
 * Cadena de temas que llevan hasta un nodo, para las migas de pan.
 * Devuelve solo los ancestros (sin el nodo), del más externo al más interno.
 * @param {Array} nodes
 * @param {number} targetId
 * @returns {Array<object>}
 */
export function findNodePath(nodes, targetId, trail = []) {
  for (const n of nodes) {
    if (n.id === targetId) return trail;
    if (n.children) {
      const found = findNodePath(n.children, targetId, [...trail, n]);
      if (found) return found;
    }
  }
  return null;
}
