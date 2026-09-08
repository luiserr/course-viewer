import { useEffect, useRef } from 'react';

/**
 * Puente con el TCU embebido en el iframe.
 *
 * `tcu.js` no navega solo entre contenidos: cuando la flecha "siguiente" está
 * en la última slide llama a `parent.goToResource(res_num + 1)`, y cuando
 * detecta que el TCU quedó completo llama a `parent.checkNum(res_num)`. Las dos
 * las define el visor legacy en `content_viewer/assets/js/script.js`; si el
 * padre no las tiene, la llamada revienta dentro del iframe y la flecha
 * simplemente no hace nada — que es justo lo que pasaba aquí.
 *
 * `res_num` es la posición 1-based del contenido en el temario. `course-tree`
 * devuelve `resNum: 1` fijo para todos los TCU, así que la numeración real la
 * pone este front con el índice en `flatContent` (ver CourseViewer) y por eso
 * `goToResource` puede resolverla contra esa misma lista.
 *
 * Los handlers se registran una sola vez y leen los datos frescos de un ref:
 * si se re-registraran en cada render, un TCU cargado podría quedarse llamando
 * a una versión vieja (o a ninguna, entre limpieza y alta del listener).
 *
 * @param {{
 *   flatContent: Array,
 *   currentNode: object|null,
 *   currentResNum: number,
 *   onSelectNode: (node: object) => void,
 *   onFinish?: () => void,
 *   onCheck?: (resNum: number) => void,
 *   onContentSeen?: (node: object) => void
 * }} params
 */
export function useTcuBridge({
  flatContent,
  currentNode,
  currentResNum = 0,
  onSelectNode,
  onFinish,
  onCheck,
  onContentSeen
}) {
  const latest = useRef(null);
  latest.current = { flatContent, currentNode, currentResNum, onSelectNode, onFinish, onCheck, onContentSeen };

  useEffect(() => {
    const previo = {
      goToResource: window.goToResource,
      checkNum: window.checkNum
    };

    /** Abre el contenido número `resNum` del temario (1-based). */
    window.goToResource = (resNum) => {
      const {
        flatContent: contenidos,
        onSelectNode: seleccionar,
        onFinish: terminar,
        onContentSeen: contenidoVisto,
        currentNode: actual,
        currentResNum: posicionActual
      } = latest.current;
      const indice = Number(resNum) - 1;
      if (!Number.isInteger(indice) || indice < 0) return;

      /*
       * Hacia delante = el alumno terminó el contenido.
       *
       * tcu.js solo pide el contenido siguiente desde la ÚLTIMA diapositiva
       * (nextModulo con cont === max); desde la primera pide el anterior, con
       * un resNum menor. Ese salto hacia delante es la única señal fiable de
       * "ya lo vio entero" que da el TCU: su propio aviso de completitud
       * (checkNum) exige que todos los módulos estén ya marcados, que es justo
       * lo que aquí falta.
       */
      if (actual && posicionActual > 0 && Number(resNum) > posicionActual) {
        contenidoVisto?.(actual);
      }

      const destino = contenidos[indice];
      // Fuera de rango es el final del temario: el TCU pide el siguiente y ya
      // no hay. El visor legacy abre ahí su modal de curso finalizado.
      if (!destino) {
        terminar?.();
        return;
      }
      seleccionar?.(destino);
    };

    /** El TCU avisa que el contenido `resNum` quedó completo. */
    window.checkNum = (resNum) => {
      latest.current.onCheck?.(Number(resNum));
    };

    return () => {
      window.goToResource = previo.goToResource;
      window.checkNum = previo.checkNum;
    };
  }, []);
}
