import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchCourseSummary,
  fetchCourseTree,
  syncCourseProgress
} from '../services/courseViewerService';
import { handleApiError } from '../services/http';
import {
  buildDisplayTree,
  findNodeInTree,
  flattenContent,
  nextContentNode
} from '../utils/courseTree';

/**
 * Estado del visor de curso: árbol, avance, selección y sincronización.
 *
 * Cuándo se recalcula el avance:
 *   1. Al salir de un contenido, sea del tipo que sea (elegir otro, volver a la
 *      bienvenida, o cerrar la pestaña).
 *   2. Cuando el iframe del TCU avisa `CONTENT_COMPLETED` por postMessage.
 * En ambos casos se hace POST del curso (sin porcentaje) y se relee el árbol,
 * porque los checks y el % son los que devuelve el servidor.
 *
 * @param {number|string|null} idGrupo
 * @param {{enabled?: boolean}} [options] - enabled=false mientras no hay sesión
 */
export function useCourseTree(idGrupo, { enabled = true } = {}) {
  const [tree, setTree] = useState([]);
  const [progress, setProgress] = useState(0);
  const [totals, setTotals] = useState({ totalItems: 0, completedItems: 0 });
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [selection, setSelection] = useState(null);
  const [notice, setNotice] = useState(null);

  // El nodo seleccionado se re-resuelve contra el árbol vigente para heredar
  // is_complete/locked tras cada refresco. Si no está en el árbol (caso del
  // examen enlazado a un TCU, que se deduplica del temario) se usa tal cual.
  const displayTree = useMemo(() => buildDisplayTree(tree), [tree]);
  const flatContent = useMemo(() => flattenContent(displayTree), [displayTree]);
  const selectedNode = useMemo(
    () => (selection ? findNodeInTree(displayTree, selection.id) ?? selection : null),
    [displayTree, selection]
  );
  const upNext = useMemo(() => nextContentNode(flatContent, selectedNode), [flatContent, selectedNode]);

  // Ref para poder sincronizar al descargar la página sin recrear el listener.
  const selectedNodeRef = useRef(null);
  selectedNodeRef.current = selectedNode;

  const loadTree = useCallback(
    async ({ silent = false } = {}) => {
      if (!enabled || !idGrupo) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await fetchCourseTree(idGrupo);
        setTree(data.tree);
        setProgress(data.progress);
        setTotals({ totalItems: data.totalItems, completedItems: data.completedItems });
      } catch (err) {
        const info = handleApiError(err, 'course-tree');
        setError(info.message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [enabled, idGrupo]
  );

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Datos de cabecera del curso (nombre y foto). No bloquea el árbol.
  useEffect(() => {
    if (!enabled || !idGrupo) return;
    let active = true;
    fetchCourseSummary(idGrupo).then((data) => {
      if (active) setCourse(data);
    });
    return () => {
      active = false;
    };
  }, [enabled, idGrupo]);

  /**
   * Pide el recálculo del avance y relee el árbol. Silencioso: no debe
   * parpadear la UI ni romper la navegación si el servidor lo rechaza.
   *
   * Si ya hay un recálculo en vuelo se reutiliza en vez de lanzar otro: el TCU
   * encadena `checkNum` y `goToResource` en el mismo instante (completar la
   * última slide y pasar al siguiente contenido), y course-progress responde 429
   * a las ráfagas.
   */
  const syncInFlight = useRef(null);
  const syncProgress = useCallback(() => {
    if (!enabled || !idGrupo) return Promise.resolve();
    if (syncInFlight.current) return syncInFlight.current;

    setSyncing(true);
    const run = (async () => {
      try {
        await syncCourseProgress(idGrupo);
        await loadTree({ silent: true });
      } catch (err) {
        console.warn('[useCourseTree] no se pudo sincronizar el avance:', err.message);
      } finally {
        syncInFlight.current = null;
        setSyncing(false);
      }
    })();

    syncInFlight.current = run;
    return run;
  }, [enabled, idGrupo, loadTree]);

  /**
   * Selecciona un contenido. Si el anterior era un TCU, primero sincroniza su
   * avance (el TCU registró sus slides mientras el alumno lo recorría).
   */
  const selectNode = useCallback(
    (node) => {
      if (!node) return;
      setNotice(null);

      if (node.locked) {
        setNotice('Aún no puedes ver este contenido. Termina primero el anterior.');
        return;
      }

      // Se recalcula al salir de cualquier contenido, no solo de un TCU: la
      // completitud la registran las páginas embebidas (tcu_actions.php,
      // show_quiz.php, …) y este front no se entera hasta que vuelve a pedir el
      // cálculo. La guarda de syncProgress absorbe las ráfagas al navegar rápido.
      const previous = selectedNodeRef.current;
      if (previous && previous.id !== node.id) {
        syncProgress();
      }
      setSelection(node);
    },
    [syncProgress]
  );

  /** Vuelve a la pantalla de bienvenida del curso. */
  const clearSelection = useCallback(() => {
    const previous = selectedNodeRef.current;
    if (previous) syncProgress();
    setSelection(null);
    setNotice(null);
  }, [syncProgress]);

  // El TCU dentro del iframe avisa cuando el alumno termina el contenido.
  // Mismo contrato que la app móvil: { type: 'CONTENT_COMPLETED' }.
  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      const data = typeof event.data === 'string' ? safeParse(event.data) : event.data;
      if (data?.type === 'CONTENT_COMPLETED') syncProgress();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [syncProgress]);

  // Al cerrar o recargar la pestaña estando dentro de un TCU, avisar al
  // servidor para que el avance quede recalculado. sendBeacon no sirve aquí:
  // el endpoint necesita el header x-authentication, que beacon no permite.
  useEffect(() => {
    const onPageHide = () => {
      if (selectedNodeRef.current) syncProgress();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [syncProgress]);

  return {
    course,
    tree: displayTree,
    flatContent,
    progress,
    totalItems: totals.totalItems,
    completedItems: totals.completedItems,
    loading,
    error,
    syncing,
    notice,
    selectedNode,
    upNext,
    selectNode,
    clearSelection,
    notify: setNotice,
    dismissNotice: () => setNotice(null),
    refresh: loadTree,
    syncProgress
  };
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
