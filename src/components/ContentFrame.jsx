import { useEffect, useMemo, useState } from 'react';
import {
  getCourseWelcomeUrl,
  getExamUrl,
  getLegacyViewerUrl,
  getTcuUrl
} from '../config/api';
import { getJWTFromStorage } from '../services/http';
import { EXAM_TYPES, findNodePath } from '../utils/courseTree';
import { fixEncoding, htmlToParagraphs } from '../utils/text';
import { ArrowRightIcon } from './Icons';
import './ContentFrame.css';

const UNSUPPORTED_COPY = {
  tarea: 'Las tareas se entregan en el visor clásico del curso.',
  scorm: 'Este contenido SCORM se abre en el visor clásico del curso.',
  file: 'Este recurso se abre en el visor clásico del curso.'
};

/**
 * URL que se carga en el iframe para un nodo del temario.
 *
 * Solo se resuelven los tipos cuya ruta es determinística (misma que usa el
 * visor legacy). Para `file`/`scorm`/`tarea` la ruta real vive en la BD
 * (`archivo.filepath`) y `course-tree` no la devuelve, así que no hay URL que
 * construir: esos nodos se derivan al visor clásico.
 *
 * El JWT se lee aquí, en el momento de resolver la URL, y no se recibe como
 * prop: si `src` cambiara al renovarse el token, el `key={src}` del iframe lo
 * remontaría a media lección y el alumno perdería su posición dentro del TCU.
 */
function contentUrlFor(node, idGrupo, resNum) {
  if (!node) return null;
  if (node.type === 'tcu') {
    // resNum manda sobre node.resNum: el del árbol siempre llega como 1, y con
    // ese valor el TCU no sabe a qué contenido saltar desde su última slide.
    return getTcuUrl(
      idGrupo,
      node.idContenido ?? node.id,
      resNum || node.resNum || 1,
      getJWTFromStorage()
    );
  }
  if (EXAM_TYPES.has(node.type)) {
    return getExamUrl(node.examId ?? node.id, idGrupo, getJWTFromStorage());
  }
  return null;
}

/**
 * Migas de pan del contenido abierto: los temas que lo contienen y su título.
 *
 * Se muestran los dos últimos ancestros como máximo — la ruta completa de un
 * curso de cinco unidades no cabe en una línea y el nivel raíz repite el
 * nombre del curso, que ya está en el panel lateral.
 */
function Breadcrumbs({ tree, node }) {
  const trail = useMemo(() => {
    const path = findNodePath(tree ?? [], node.id);
    return (path ?? []).slice(-2).map((t) => fixEncoding(t.title));
  }, [tree, node.id]);

  return (
    <nav className="cv-crumbs cv-scroll" aria-label="Ruta del contenido">
      {trail.map((title, index) => (
        <span className="cv-crumbs__group" key={`${title}-${index}`}>
          <span className="cv-crumbs__chip">{title}</span>
          <span className="cv-crumbs__sep" aria-hidden="true">›</span>
        </span>
      ))}
      <span className="cv-crumbs__chip cv-crumbs__chip--current" aria-current="page">
        {fixEncoding(node.title)}
      </span>
    </nav>
  );
}

/** Pantalla inicial del curso: descripción + botón Empezar. */
function WelcomePanel({ course, idGrupo, riesgo, firstContent, onStart }) {
  const paragraphs = useMemo(() => htmlToParagraphs(course?.description), [course?.description]);

  // Sin descripción en la API, se embebe la bienvenida del visor legacy.
  // Va dentro de .cv-frame para que ocupe todo el alto disponible.
  if (!paragraphs.length) {
    return (
      <div className="cv-frame">
        <iframe
          className="cv-frame__iframe"
          title="Bienvenida del curso"
          src={getCourseWelcomeUrl(idGrupo, riesgo)}
        />
      </div>
    );
  }

  return (
    <div className="cv-welcome cv-scroll">
      <div className="cv-welcome__inner">
        <h1 className="cv-welcome__title">{fixEncoding(course?.name || 'Bienvenida')}</h1>

        <div className="cv-welcome__card">
          <span className="cv-welcome__tag">Bienvenida</span>
          {paragraphs.map((text, index) => (
            <p key={index}>{text}</p>
          ))}
        </div>

        {firstContent && (
          <div className="cv-welcome__actions">
            <button type="button" className="cv-btn" onClick={() => onStart(firstContent)}>
              Empezar
              <ArrowRightIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Salto al siguiente contenido.
 *
 * Sin controles de inicio/anterior ni contador de posición a propósito: el TCU
 * ya pinta su propia navegación dentro del iframe, y un contador aquí
 * contradecía al del panel lateral (la lista plana no incluye los exámenes que
 * se abren desde su TCU, así que daba un total menor).
 *
 * Tampoco hay botón "Ir a la evaluación": `hasExam` sale de que el examen sea
 * un submódulo del TCU (`tcu_modulo` con fila en `examen`), o sea que ya viene
 * embebido como una de sus slides. El botón abría en el visor lo mismo que el
 * alumno tenía delante.
 */
function ContentNav({ upNext, onSelectNode }) {
  if (!upNext) return null;

  return (
    <div className="cv-nav">
      <button type="button" className="cv-nav__next" onClick={() => onSelectNode(upNext)}>
        <span className="cv-nav__nextLabel">Siguiente: {fixEncoding(upNext.title)}</span>
        <ArrowRightIcon />
      </button>
    </div>
  );
}

/**
 * Área principal del visor: bienvenida, contenido en iframe, o aviso cuando el
 * tipo de contenido no se puede embeber.
 */
export default function ContentFrame({
  idGrupo,
  socialId,
  riesgo,
  course,
  tree,
  node,
  resNum,
  upNext,
  firstContent,
  onSelectNode
}) {
  // Memorizado sobre el nodo, no sobre el JWT: el token se lee de
  // sessionStorage dentro de contentUrlFor y solo se refresca cuando el alumno
  // cambia de contenido, que es justo cuando el iframe se recarga de todas
  // formas. Ver la nota en contentUrlFor.
  const src = useMemo(() => contentUrlFor(node, idGrupo, resNum), [node, idGrupo, resNum]);
  const [frameLoading, setFrameLoading] = useState(Boolean(src));

  useEffect(() => {
    setFrameLoading(Boolean(src));
  }, [src]);

  if (!node) {
    return (
      <WelcomePanel
        course={course}
        idGrupo={idGrupo}
        riesgo={riesgo}
        firstContent={firstContent}
        onStart={onSelectNode}
      />
    );
  }

  if (!src) {
    return (
      <div className="cv-frame__notice cv-scroll">
        <h2>{fixEncoding(node.title)}</h2>
        <p>{UNSUPPORTED_COPY[node.type] || 'Este contenido se abre en el visor clásico del curso.'}</p>
        <a
          className="cv-btn"
          href={getLegacyViewerUrl(idGrupo, socialId)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir en el visor clásico
        </a>
      </div>
    );
  }

  return (
    <div className="cv-frame">
      <Breadcrumbs tree={tree} node={node} />

      <div className="cv-frame__stage">
        {frameLoading && (
          <div className="cv-frame__loader" role="status">
            <span className="cv-spinner" aria-hidden="true" />
            <span>Cargando contenido…</span>
          </div>
        )}

        <iframe
          key={src}
          // id="iframe" es el nombre que busca tcu.js para redirigir el frame
          // del padre en los contenidos tipo encuesta (window.parent.document…).
          id="iframe"
          className="cv-frame__iframe"
          title={fixEncoding(node.title)}
          src={src}
          allowFullScreen
          onLoad={() => setFrameLoading(false)}
        />
      </div>

      <ContentNav upNext={upNext} onSelectNode={onSelectNode} />
    </div>
  );
}
