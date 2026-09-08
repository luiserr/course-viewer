import { useEffect } from 'react';

/**
 * Bloquea el menú contextual en todo el visor.
 *
 * Réplica del predecesor directo, content_viewer_v2/index.php:
 *   <body class="lms-body" oncontextmenu="return false">
 * Es decir: incondicional y en silencio.
 *
 * El visor anterior a ese (content_viewer_old) lo hacía distinto — solo si la
 * sesión traía el módulo 807, y con un alert('No se permite esta acción'). v2
 * lo dejó siempre activo y sin aviso, y ese es el comportamiento que se copia.
 *
 * Alcance, que importa: la lección se sirve en un iframe, un documento aparte
 * que NO hereda este bloqueo. De esa parte se ocupa el propio TCU
 * (tcu/tcu_user.php), que lo aplica por su cuenta según id_universidad
 * (1175, 1420) y el módulo 807 de la sesión.
 *
 * `contextmenu` cubre también la tecla de menú y Shift+F10, no solo el ratón.
 */
export function useBlockContextMenu() {
  useEffect(() => {
    const onContextMenu = (event) => event.preventDefault();
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, []);
}
