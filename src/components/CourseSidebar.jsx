import { DEFAULT_COURSE_BANNER, getAssetUrl } from '../config/api';
import { fixEncoding, resolveCourseImage } from '../utils/text';
import CourseTreeView from './CourseTreeView';
import { BurgerIcon, CloseIcon } from './Icons';
import './CourseSidebar.css';

/** Para comparar títulos sin que un espacio de más los haga distintos. */
const normalize = (value) => fixEncoding(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * El nivel 0 del árbol es el propio curso: un `tema` con su nombre que envuelve
 * a todo lo demás. Como ese nombre ya encabeza la tarjeta, se pinta a partir de
 * sus hijos para no repetirlo dos veces seguidas en el panel.
 *
 * Los hijos conservan `depth: 1` (el que tenían), así que ni la sangría ni los
 * pesos tipográficos del temario se mueven — LABEL_DEPTH de CourseTreeView
 * sigue cuadrando.
 *
 * @param {Array} tree
 * @param {string} courseName
 * @returns {{nodes: Array, baseDepth: number}}
 */
function unwrapCourseRoot(tree, courseName) {
  const roots = tree ?? [];
  const [root] = roots;
  const isCourseRoot =
    roots.length === 1 &&
    root?.type === 'tema' &&
    root.children?.length &&
    normalize(root.title) === normalize(courseName);

  return isCourseRoot ? { nodes: root.children, baseDepth: 1 } : { nodes: roots, baseDepth: 0 };
}

/**
 * Panel lateral del visor: tarjeta del curso (portada, nombre y avance) y
 * temario.
 *
 * El avance vive aquí, pegado a la identidad del curso, y no en una barra
 * propia: esa barra le restaba ~76 px de alto al contenido, que es lo que el
 * alumno viene a leer. La contrapartida es que, con el panel plegado al riel o
 * el cajón cerrado, el avance no está a la vista.
 *
 * El botón que despliega o pliega el panel vive aquí dentro (como en el
 * mockup); en compacto el panel es un cajón y en su lugar aparece el botón de
 * cierre, porque el de la barra queda debajo del velo.
 */
export default function CourseSidebar({
  course,
  courseName,
  tree,
  selectedId,
  loading,
  error,
  open = true,
  isCompact = false,
  progress = 0,
  totalItems = 0,
  completedItems = 0,
  syncing = false,
  onSelectNode,
  onToggle,
  onExpand,
  onClose,
  onRetry
}) {
  const banner = resolveCourseImage(course?.image) || getAssetUrl(DEFAULT_COURSE_BANNER);
  // En compacto el panel es un cajón: siempre va desplegado, nunca en riel.
  const showRail = !open && !isCompact;
  // courseName (el de la URL) cubre el hueco hasta que responde la API.
  const courseTitle = fixEncoding(course?.name || courseName || '');
  const pct = Math.min(100, Math.max(0, progress));
  const { nodes, baseDepth } = unwrapCourseRoot(tree, courseTitle);

  return (
    <aside className="cv-sidebar cv-scroll" aria-label="Menú del curso">
      <div className="cv-sidebar__head">
        {isCompact ? (
          <div className="cv-sidebar__drawerHead">
            <span className="cv-sidebar__drawerTitle">Temario</span>
            <button
              type="button"
              className="cv-sidebar__close"
              aria-label="Cerrar el temario"
              onClick={onClose}
            >
              <CloseIcon />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="cv-sidebar__toggle"
            aria-expanded={open}
            title={open ? 'Plegar el temario' : 'Desplegar el temario'}
            onClick={onToggle}
          >
            <BurgerIcon />
            {open && <span className="cv-sidebar__toggleLabel">Contenido del curso</span>}
          </button>
        )}

        {!showRail && (
          <div className="cv-sidebar__banner">
            <img src={banner} alt="" />
          </div>
        )}
      </div>

      {/*
        Fuera de la cabecera a propósito: así el bloque puede quedarse pegado
        arriba (position: sticky) mientras el temario corre por debajo. Dentro
        de .cv-sidebar__head no serviría de nada — un elemento pegajoso no pasa
        del borde de su contenedor, y la cabecera se va con el scroll.
      */}
      {!showRail && (courseTitle || totalItems > 0) && (
        <div className="cv-sidebar__course">
          {courseTitle && (
            <h1 className="cv-sidebar__title" title={courseTitle}>{courseTitle}</h1>
          )}

          {totalItems > 0 && (
            <div className="cv-sidebar__progress">
              <div className="cv-sidebar__progressTop">
                <span className="cv-sidebar__counts">
                  {completedItems} de {totalItems} contenidos
                  {syncing && <span className="cv-sidebar__syncing"> · actualizando…</span>}
                </span>
                <span className="cv-sidebar__percent">{progress}%</span>
              </div>
              <div
                className="cv-sidebar__track"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Avance del curso"
              >
                <div
                  className="cv-sidebar__trackBar"
                  style={{ width: pct > 0 ? `max(8px, ${pct}%)` : 0 }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {showRail ? (
        <button
          type="button"
          className="cv-rail"
          title="Desplegar el temario"
          onClick={onExpand}
        >
          <span className="cv-rail__label">Contenido del curso</span>
        </button>
      ) : (
        <div className="cv-sidebar__tree">
          {loading ? (
            <p className="cv-sidebar__state">Cargando temario…</p>
          ) : error ? (
            <div className="cv-sidebar__state cv-sidebar__state--error">
              <p>{error}</p>
              <button type="button" className="cv-btn cv-btn--sm" onClick={onRetry}>
                Reintentar
              </button>
            </div>
          ) : (
            <CourseTreeView
              tree={nodes}
              baseDepth={baseDepth}
              selectedId={selectedId}
              onSelect={onSelectNode}
            />
          )}
        </div>
      )}
    </aside>
  );
}
