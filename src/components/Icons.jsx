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

/**
 * Carpeta de los temas: cerrada cuando el tema está plegado y abierta (con la
 * tapa volcada) cuando está desplegado. Sustituye al chevron en el temario —
 * el estado abierto/cerrado se lee igual y además dice "aquí dentro hay más
 * contenido", que es lo que hace el visor legacy con carpeta_abierta.svg /
 * carpeta_cerrada.svg. Se dibuja inline para no pedir los dos SVG al backend
 * por cada fila.
 */
export function FolderIcon({ open = false }) {
  return (
    <svg
      className={`cv-folder${open ? ' cv-folder--open' : ''}`}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
    >
      {open ? (
        <>
          {/* Panel de atrás con la pestaña */}
          <path
            fill="currentColor"
            d="M2.5 6.6A1.6 1.6 0 0 1 4.1 5h4l1.7 2h7.6A1.6 1.6 0 0 1 19 8.6V10H7.2c-.85 0-1.6.5-1.92 1.28L2.5 17.7V6.6z"
          />
          {/* Tapa volcada hacia adelante */}
          <path
            fill="currentColor"
            d="M6.85 11.7A1.4 1.4 0 0 1 8.15 11h12.4a1.2 1.2 0 0 1 1.12 1.63l-1.9 5.05A1.9 1.9 0 0 1 18 18.9H4.2a1.2 1.2 0 0 1-1.11-1.66l3.76-5.54z"
          />
        </>
      ) : (
        <path
          fill="currentColor"
          d="M2.5 6.6A1.6 1.6 0 0 1 4.1 5h4l1.7 2h9.7A1.6 1.6 0 0 1 21 8.6v8.8a1.6 1.6 0 0 1-1.5 1.6H4.1a1.6 1.6 0 0 1-1.6-1.6V6.6z"
        />
      )}
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
 * Portapapeles con palomita: marca las filas que son evaluación (examen,
 * sondeo o encuesta).
 *
 * Va en trazo y no macizo como el resto: a 13 px un icono relleno se ve como
 * una mancha, y aquí convive con el texto de la etiqueta.
 */
export function QuizIcon({ size = 13 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="m9 13.5 2 2 4-4" />
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
