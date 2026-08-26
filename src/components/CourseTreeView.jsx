import { useState } from 'react';
import { EXAM_BADGES, EXAM_TYPES } from '../utils/courseTree';
import { fixEncoding } from '../utils/text';
import { CheckIcon, ChevronIcon, LockIcon } from './Icons';

/**
 * Profundidad a partir de la cual un tema se pinta como rótulo apagado en vez
 * de fila fuerte. En el árbol real el nivel 0 es el nombre del curso y el 1 son
 * las unidades (ambos van fuertes); del 2 en adelante son los temas internos
 * («Tema 1. …»), que en el mockup son rótulos tenues.
 */
const LABEL_DEPTH = 2;

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
          <span className="cv-tree__title">{fixEncoding(node.title)}</span>
          {hasChildren && <ChevronIcon expanded={expanded} />}
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
  const badge = EXAM_TYPES.has(node.type) ? EXAM_BADGES[node.type] : null;

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

        {badge && <span className="cv-tree__badge">{badge}</span>}
        {node.type === 'tcu' && node.hasExam && <span className="cv-tree__badge">Eval</span>}

        {node.locked ? (
          <LockIcon />
        ) : node.is_complete ? (
          <span
            className={`cv-tree__check${isSelected ? ' cv-tree__check--current' : ''}`}
            aria-label="Completado"
            role="img"
          >
            <CheckIcon />
          </span>
        ) : null}
      </button>
    </li>
  );
}

/**
 * Temario del curso. Los temas son carpetas expandibles; las hojas son los
 * contenidos, con su palomita de completitud a la derecha.
 *
 * Sin iconos por fila: el mockup ordena la jerarquía con sangría y peso
 * tipográfico, lo que además evita una petición por icono al backend.
 *
 * @param {{tree: Array, selectedId: number|null, onSelect: (node: object) => void}} props
 */
export default function CourseTreeView({ tree, selectedId, onSelect }) {
  if (!tree?.length) {
    return <p className="cv-tree__empty">Este curso todavía no tiene contenido publicado.</p>;
  }

  return (
    <ul className="cv-tree">
      {tree.map((node) => (
        <TreeNode
          key={`${node.type}-${node.id}`}
          node={node}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
