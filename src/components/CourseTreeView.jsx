import { useState } from 'react';
import { EXAM_LABELS, EXAM_TYPES } from '../utils/courseTree';
import { fixEncoding } from '../utils/text';
import { CheckIcon, FolderIcon, LockIcon, QuizIcon } from './Icons';

/**
 * Profundidad a partir de la cual un tema se pinta como rótulo apagado en vez
 * de fila fuerte. En el árbol real el nivel 0 es el nombre del curso y el 1 son
 * las unidades (ambos van fuertes); del 2 en adelante son los temas internos
 * («Tema 1. …»), que en el mockup son rótulos tenues.
 */
const LABEL_DEPTH = 2;

/**
 * Marca de evaluación. Solo el icono: la palabra ("Eval") empujaba el título a
 * una línea más en casi todas las filas que la llevaban. El tipo concreto vive
 * en el nombre accesible y en el tooltip.
 */
function EvalBadge({ label }) {
  return (
    <span className="cv-tree__badge" role="img" aria-label={label} title={label}>
      <QuizIcon />
    </span>
  );
}

function TreeNode({ node, depth, selectedId, onSelect }) {
  const isTema = node.type === 'tema';
  // Los temas arrancan abiertos: el visor legacy despliega el temario completo.
  const [expanded, setExpanded] = useState(true);

  if (isTema) {
    const hasChildren = (node.children?.length ?? 0) > 0;
    const asLabel = depth >= LABEL_DEPTH;
    return (
      <li className="cv-tree__item">
        <button
          type="button"
          className={`cv-tree__row cv-tree__row--tema${asLabel ? ' cv-tree__row--label' : ''}`}
          style={{ '--cv-depth': depth }}
          aria-expanded={expanded}
          onClick={() => setExpanded((o) => !o)}
        >
          {/*
            La carpeta va delante del título, como en el visor legacy: abierta
            mientras el tema está desplegado y cerrada al plegarlo. El estado
            para lectores de pantalla lo da el aria-expanded del botón, así que
            el icono es decorativo.
          */}
          <span className="cv-tree__folder">
            <FolderIcon open={expanded && hasChildren} />
          </span>
          <span className="cv-tree__title">{fixEncoding(node.title)}</span>
        </button>

        {expanded && hasChildren && (
          <ul className="cv-tree__children">
            {node.children.map((child) => (
              <TreeNode
                key={`${child.type}-${child.id}`}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const isSelected = node.id === selectedId;
  const badge = EXAM_TYPES.has(node.type) ? EXAM_LABELS[node.type] : null;

  return (
    <li className="cv-tree__item">
      <button
        type="button"
        className={[
          'cv-tree__row',
          'cv-tree__row--leaf',
          isSelected ? 'cv-tree__row--selected' : '',
          node.locked ? 'cv-tree__row--locked' : ''
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ '--cv-depth': depth }}
        aria-current={isSelected ? 'true' : undefined}
        onClick={() => onSelect(node)}
      >
        <span className="cv-tree__title">{fixEncoding(node.title)}</span>

        {badge && <EvalBadge label={badge} />}
        {node.type === 'tcu' && node.hasExam && <EvalBadge label={EXAM_LABELS.examen} />}

        {/*
          La ranura de estado se pinta siempre y con ancho fijo: así las
          palomitas caen todas en la misma columna en vez de bailar según lleve
          o no etiqueta la fila.
        */}
        <span className="cv-tree__status">
          {node.locked ? (
            <LockIcon />
          ) : node.is_complete ? (
            <span className="cv-tree__check" aria-label="Completado" role="img">
              <CheckIcon size={13} />
            </span>
          ) : (
            /* Sin completar: la palomita va en hueco en todas las filas, no
               solo en la abierta. Así la columna de estado es una lista de
               casillas que se van llenando y el avance se lee de un golpe;
               con la marca únicamente en la fila activa parecía que el resto
               del temario no llevara control de completitud. */
            <span
              className="cv-tree__check cv-tree__check--pending"
              aria-label="Sin completar"
              role="img"
            >
              <CheckIcon size={13} />
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

/**
 * Temario del curso. Los temas son carpetas expandibles; las hojas son los
 * contenidos, con su palomita de completitud a la derecha.
 *
 * Solo los temas llevan icono (la carpeta, abierta o cerrada según estén
 * desplegados); las hojas se ordenan con sangría y peso tipográfico. Los dos
 * dibujos de carpeta van inline, así que el temario no pide ningún icono al
 * backend.
 *
 * `baseDepth` es el nivel con el que se pinta la primera fila: el panel se
 * salta el nodo raíz (el curso, que ya encabeza su tarjeta) y pasa sus hijos
 * con el nivel que tenían, para no mover sangrías ni pesos.
 *
 * @param {{tree: Array, baseDepth?: number, selectedId: number|null, onSelect: (node: object) => void}} props
 */
export default function CourseTreeView({ tree, baseDepth = 0, selectedId, onSelect }) {
  if (!tree?.length) {
    return <p className="cv-tree__empty">Este curso todavía no tiene contenido publicado.</p>;
  }

  return (
    <ul className="cv-tree">
      {tree.map((node) => (
        <TreeNode
          key={`${node.type}-${node.id}`}
          node={node}
          depth={baseDepth}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
