import { DEFAULT_COURSE_BANNER, getAssetUrl } from '../config/api';
import { fixEncoding, resolveCourseImage } from '../utils/text';
import CourseTreeView from './CourseTreeView';
import { BurgerIcon, CloseIcon } from './Icons';
import './CourseSidebar.css';

/**
 * Panel lateral del visor: banner del curso y temario. El nombre y el avance
 * viven en la barra del curso (.cv-header), no aquí.
 *
 * El botón que despliega o pliega el panel vive aquí dentro (como en el
 * mockup); en compacto el panel es un cajón y en su lugar aparece el botón de
 * cierre, porque el de la barra queda debajo del velo.
 */
export default function CourseSidebar({
  course,
  tree,
  selectedId,
  loading,
  error,
  open = true,
  isCompact = false,
  onSelectNode,
  onToggle,
  onExpand,
  onClose,
  onRetry
}) {
  const banner = resolveCourseImage(course?.image) || getAssetUrl(DEFAULT_COURSE_BANNER);
  // En compacto el panel es un cajón: siempre va desplegado, nunca en riel.
  const showRail = !open && !isCompact;

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
            <CourseTreeView tree={tree} selectedId={selectedId} onSelect={onSelectNode} />
          )}
        </div>
      )}
    </aside>
  );
}
