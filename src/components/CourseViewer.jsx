import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { getLoginUrl } from '../config/api';
import { useCourseTree } from '../hooks/useCourseTree';
import { useTcuBridge } from '../hooks/useTcuBridge';
import { fixEncoding } from '../utils/text';
import ContentFrame from './ContentFrame';
import CourseSidebar from './CourseSidebar';
import Navbar from './Navbar';
import { BurgerIcon } from './Icons';
import './CourseViewer.css';

/**
 * Punto en el que el temario deja de caber acolchado y pasa a cajón.
 * Espejo del media query de CourseViewer.css — mantener los dos en sinc.
 */
const COMPACT_QUERY = '(max-width: 1023.98px)';

const matchesCompact = () =>
  typeof window !== 'undefined' && window.matchMedia(COMPACT_QUERY).matches;

/**
 * Sigue el breakpoint en vivo. Con la comprobación solo al montar, al angostar
 * la ventana el temario se quedaba abierto tapando el contenido y su botón de
 * cierre quedaba debajo del velo.
 */
function useIsCompact() {
  const [isCompact, setIsCompact] = useState(matchesCompact);

  useEffect(() => {
    const mql = window.matchMedia(COMPACT_QUERY);
    const onChange = (event) => setIsCompact(event.matches);
    mql.addEventListener('change', onChange);
    setIsCompact(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isCompact;
}

/**
 * Visor de curso completo: barra superior, temario lateral y contenido.
 *
 * Parámetros de la URL (los mismos del visor legacy):
 *   idMateria — id del grupo/curso (obligatorio)
 *   idInit    — socialId del curso, solo para enlazar al visor clásico
 *   riesgo    — se propaga a la pantalla de bienvenida legacy
 *
 * @param {{idGrupo: number|string|null, socialId?: string|null, riesgo?: string|number, courseName?: string}} props
 */
export default function CourseViewer({ idGrupo, socialId, riesgo = 0, courseName }) {
  const { loading: sessionLoading, isAuthenticated, error: sessionError, retryFetchUser } = useUser();
  const isCompact = useIsCompact();
  // En pantallas chicas el temario arranca cerrado (se muestra como cajón).
  const [sidebarOpen, setSidebarOpen] = useState(() => !matchesCompact());

  const {
    course,
    tree,
    flatContent,
    progress,
    totalItems,
    completedItems,
    loading,
    error,
    syncing,
    notice,
    selectedNode,
    upNext,
    selectNode,
    notify,
    dismissNotice,
    refresh,
    syncProgress
  } = useCourseTree(idGrupo, { enabled: isAuthenticated });

  // Al cruzar el breakpoint se reajusta: cajón cerrado en compacto, panel
  // desplegado en escritorio.
  useEffect(() => {
    setSidebarOpen(!isCompact);
  }, [isCompact]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const isDrawer = isCompact && sidebarOpen;

  // Con el cajón abierto: sin scroll de fondo y Escape para cerrar.
  useEffect(() => {
    if (!isDrawer) return;
    const onKey = (event) => {
      if (event.key === 'Escape') closeSidebar();
    };
    document.body.classList.add('cv-scroll-locked');
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('cv-scroll-locked');
      document.removeEventListener('keydown', onKey);
    };
  }, [isDrawer, closeSidebar]);

  const handleSelectNode = useCallback(
    (node) => {
      selectNode(node);
      if (matchesCompact()) setSidebarOpen(false);
    },
    [selectNode]
  );

  /**
   * Numeración `res_num` que se le pasa al TCU: la posición 1-based del
   * contenido en el temario, la misma que usa el visor legacy. `course-tree`
   * devuelve `resNum: 1` fijo, así que sin esto el TCU pedía siempre el
   * contenido 2 al llegar a su última slide.
   *
   * 0 cuando el nodo no está en el temario (el examen enlazado a un TCU, que se
   * deduplica): con `res_num=0` el propio TCU desactiva sus flechas de salto.
   */
  const resNum = useMemo(() => {
    if (!selectedNode) return 0;
    return flatContent.findIndex((item) => item.id === selectedNode.id) + 1;
  }, [flatContent, selectedNode]);

  // Las flechas del TCU navegan por el temario llamando a funciones del padre.
  useTcuBridge({
    flatContent,
    onSelectNode: handleSelectNode,
    onFinish: () => notify('Ya viste el último contenido del temario.'),
    onCheck: syncProgress
  });

  /**
   * Abre la evaluación enlazada a un TCU. Ese examen se deduplica del temario
   * (para no listarlo dos veces), así que se arma un nodo sintético con su id.
   */
  const handleOpenLinkedExam = useCallback(
    (node) => {
      if (!node?.examId) return;
      selectNode({
        id: node.examId,
        examId: node.examId,
        type: 'examen',
        title: `Evaluación · ${node.title}`,
        is_complete: false,
        locked: false
      });
    },
    [selectNode]
  );

  if (!idGrupo) {
    return (
      <div className="cv-shell">
        <Navbar />
        <div className="cv-guard">
          <h2>Falta el curso a mostrar</h2>
          <p>
            Abre el visor con el parámetro <code>idMateria</code> en la URL, por ejemplo{' '}
            <code>?idMateria=942891</code>.
          </p>
        </div>
      </div>
    );
  }

  if (sessionLoading) {
    return (
      <div className="cv-shell">
        <Navbar />
        <div className="cv-guard">
          <p>Verificando tu sesión…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="cv-shell">
        <Navbar />
        <div className="cv-guard">
          <h2>Necesitas iniciar sesión</h2>
          <p>{sessionError || 'Inicia sesión en SaberesMX para ver el contenido de este curso.'}</p>
          <div className="cv-guard__actions">
            <a className="cv-btn" href={getLoginUrl('courseViewer')}>Iniciar sesión</a>
            {sessionError && (
              <button type="button" className="cv-btn cv-btn--ghost" onClick={retryFetchUser}>
                Reintentar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, progress));
  const courseTitle = fixEncoding(course?.name || courseName || 'Contenido del curso');

  return (
    <div className="cv-shell">
      <Navbar />

      {/*
        Barra del curso: título y avance. Va fuera del panel lateral para que el
        avance no se pierda de vista al bajar por el temario, y en compacto suma
        la hamburguesa, porque allí el botón del panel queda bajo el velo.
      */}
      <div className="cv-header">
        {isCompact && (
          <button
            type="button"
            className="cv-header__toggle"
            aria-expanded={sidebarOpen}
            aria-controls="cv-sidebar"
            aria-label="Mostrar u ocultar el temario"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <BurgerIcon />
          </button>
        )}

        <h1 className="cv-header__title" title={courseTitle}>{courseTitle}</h1>

        {totalItems > 0 && (
          <div className="cv-header__progress">
            <span className="cv-header__counts">
              {completedItems} de {totalItems} contenidos
              {syncing && <span className="cv-header__syncing"> · actualizando…</span>}
            </span>
            <div
              className="cv-progress"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Avance del curso"
            >
              <div
                className="cv-progress__bar"
                style={{ width: pct > 0 ? `max(8px, ${pct}%)` : 0 }}
              />
            </div>
            <span className="cv-header__percent">{progress}%</span>
          </div>
        )}
      </div>

      {notice && (
        <div className="cv-notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={dismissNotice} aria-label="Cerrar aviso">×</button>
        </div>
      )}

      <div className={`cv-layout${sidebarOpen ? '' : ' cv-layout--collapsed'}`}>
        <div className="cv-layout__sidebar" id="cv-sidebar">
          <CourseSidebar
            course={course}
            tree={tree}
            selectedId={selectedNode?.id ?? null}
            loading={loading}
            error={error}
            open={sidebarOpen}
            isCompact={isCompact}
            onSelectNode={handleSelectNode}
            onToggle={() => setSidebarOpen((o) => !o)}
            onExpand={openSidebar}
            onClose={closeSidebar}
            onRetry={refresh}
          />
        </div>

        {isDrawer && (
          <button
            type="button"
            className="cv-layout__overlay"
            aria-label="Cerrar el temario"
            onClick={closeSidebar}
          />
        )}

        <main className="cv-layout__content" aria-label="Área principal de contenido">
          <ContentFrame
            idGrupo={idGrupo}
            socialId={socialId}
            riesgo={riesgo}
            course={course}
            tree={tree}
            node={selectedNode}
            resNum={resNum}
            upNext={upNext}
            firstContent={flatContent[0] ?? null}
            onSelectNode={handleSelectNode}
            onOpenLinkedExam={handleOpenLinkedExam}
          />

          <footer className="cv-footer">
            SaberesMX {new Date().getFullYear()} © Todos los derechos reservados.
          </footer>
        </main>
      </div>
    </div>
  );
}
