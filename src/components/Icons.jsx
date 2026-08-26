/**
 * Iconos inline del visor.
 *
 * Se dibujan como SVG en lugar de depender de Font Awesome / Material Icons
 * (que el visor legacy carga desde CDN) para que el módulo no necesite webfonts
 * externos ni quede a merced de la CSP.
 */

/** Candado para contenidos con precondiciones pendientes */
export function LockIcon() {
  return (
    <svg className="cv-lock" viewBox="0 0 24 24" width="18" height="18" role="img" aria-label="Bloqueado">
      <path
        fill="currentColor"
        d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v3H9V6a3 3 0 0 1 3-3zm0 10a2 2 0 0 1 1 3.7V19h-2v-2.3A2 2 0 0 1 12 13z"
      />
    </svg>
  );
}

/** Chevron de los temas: apunta abajo cuando está expandido */
export function ChevronIcon({ expanded = false }) {
  return (
    <svg
      className={`cv-chevron${expanded ? ' cv-chevron--expanded' : ''}`}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path fill="currentColor" d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z" />
    </svg>
  );
}

/** Casita de la barra superior */
export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="currentColor" d="M12 3 2 12h3v8h6v-5h2v5h6v-8h3L12 3z" />
    </svg>
  );
}

/** Flecha para el botón "siguiente contenido" */
export function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M12 4l-1.4 1.4L16.2 11H4v2h12.2l-5.6 5.6L12 20l8-8-8-8z" />
    </svg>
  );
}

/** Cruz para cerrar el temario cuando se muestra como cajón */
export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 5.7 18.3l-1.4-1.4L9.2 12 4.3 7.1l1.4-1.4L10.6 10.6l6.3-6.3z"
      />
    </svg>
  );
}

/** Palomita suelta, para el círculo de completado del temario */
export function CheckIcon({ size = 12 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path fill="currentColor" d="M9.6 16.2 5.4 12l1.4-1.4 2.8 2.8 7-7L18 7.8z" />
    </svg>
  );
}

/**
 * Hamburguesa del mockup: tres barras redondeadas que heredan el color del
 * botón, en lugar del path de Material Icons.
 */
export function BurgerIcon() {
  return (
    <span className="cv-burger" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
